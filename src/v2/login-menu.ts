/**
 * The account menu inside `opencode auth login` on OpenCode 2.x.
 *
 * OpenCode 1.x let the plugin prompt on stdin, which is how the upstream menu
 * (add / list / enable / disable / remove / quota / verify) lived inside the
 * login flow. OpenCode 2.x runs plugins in a server process with no stdin, but
 * it prompts the login method's own `form` in whatever UI the person is using
 * — terminal, TUI or desktop — and hands the answers to `authorize()`. A
 * `string` field carrying `options` is rendered as a select, and `when` hides a
 * field until an earlier answer calls for it, which is enough to rebuild the
 * menu natively:
 *
 *   opencode auth login → Google → "OAuth with Google (Antigravity)"
 *     → What do you want to do?   [Add an account / List / Disable / ...]
 *     → Which account?            [1. you@gmail.com / 2. other@gmail.com]
 *
 * Only "add" continues into an OAuth exchange. The other actions run here and
 * report back through the authorization's `instructions`, which OpenCode shows
 * when the flow completes.
 */

import {
  allAccountIndices,
  deleteAccounts,
  loadAccountPool,
  renderAccountList,
  renderQuota,
  renderVerification,
  setAccountsEnabled,
  accountLabel,
  accountState,
} from "../plugin/account-admin";
import type { VerifyAccount } from "../plugin/account-admin";
import { formatRefreshParts } from "../plugin/auth";
import type { PluginClient } from "../plugin/types";
import { OAUTH_METHOD_ID } from "./credentials";
import type { FormAnswer, FormField, FormOption, OAuthCredential } from "./types";

/** Menu entries. `add` is the only one that continues into an OAuth login. */
export type LoginAction = "add" | "list" | "enable" | "disable" | "remove" | "quota" | "verify";

const ACTION_OPTIONS: readonly FormOption[] = [
  { value: "add", label: "Add a Google account", description: "Sign in and add it to the rotation pool" },
  { value: "list", label: "List accounts", description: "Show every stored account and its state" },
  { value: "enable", label: "Enable an account", description: "Put an account back into rotation" },
  { value: "disable", label: "Disable an account", description: "Keep an account stored but out of rotation" },
  { value: "remove", label: "Remove an account", description: "Delete an account from the pool" },
  { value: "quota", label: "Check quotas", description: "Remaining Antigravity and Gemini CLI quota" },
  { value: "verify", label: "Verify access", description: "Check accounts against the Antigravity backend" },
];

/** Actions that need an account picked; the others hide the second field. */
const ACTIONS_WITHOUT_ACCOUNT: readonly LoginAction[] = ["add", "list", "quota"];

export const ALL_ACCOUNTS_VALUE = "all";

export function isLoginAction(value: unknown): value is LoginAction {
  return (
    typeof value === "string" &&
    ACTION_OPTIONS.some((option) => option.value === value)
  );
}

/** Reads the pool into the select options the login form offers. */
export async function accountOptions(): Promise<FormOption[]> {
  const storage = await loadAccountPool();
  if (!storage) return [];

  const now = Date.now();
  const options = storage.accounts.map((account, index) => {
    const state = accountState(account, now);
    const flags = [
      index === (storage.activeIndex ?? 0) ? "current" : "",
      account.enabled === false ? "disabled" : "",
      state === "active" ? "" : state,
    ].filter(Boolean);
    return {
      value: String(index + 1),
      label: `${index + 1}. ${accountLabel(account, index)}`,
      description: flags.length > 0 ? flags.join(", ") : "active",
    };
  });

  options.push({
    value: ALL_ACCOUNTS_VALUE,
    label: "All accounts",
    description: "Every stored account (not for remove)",
  });
  return options;
}

/**
 * Builds the login form. `accounts` comes from `accountOptions()`; with no
 * accounts stored the menu collapses to the sign-in, since nothing else applies.
 */
export function buildLoginForm(accounts: readonly FormOption[]): readonly [FormField, ...FormField[]] {
  const fields: FormField[] = [];

  if (accounts.length > 1) {
    fields.push({
      key: "action",
      type: "string",
      title: "Antigravity accounts",
      description: "Add an account, or manage the ones already signed in.",
      options: ACTION_OPTIONS,
      // Defaulted rather than required: a login that cannot prompt (a script,
      // a remote shell) falls through to the sign-in instead of failing.
      default: "add",
    });
    fields.push({
      key: "account",
      // Multiselect: OpenCode ends the login flow after one action, so picking
      // several accounts at once is the difference between one login and four.
      type: "multiselect",
      title: "Which account(s)?",
      options: accounts,
      // `when` is an AND of conditions, so "needs an account" is spelled out as
      // "not one of the actions that does not".
      when: ACTIONS_WITHOUT_ACCOUNT.map((action) => ({
        key: "action",
        op: "neq" as const,
        value: action,
      })),
    });
  }

  fields.push({
    key: "noBrowser",
    type: "boolean",
    title: "Enter the authorization code manually",
    description: "Skip the local callback listener (for SSH, containers and WSL).",
    default: false,
    hidden: true,
  });
  fields.push({
    key: "projectId",
    type: "string",
    title: "Google Cloud project ID",
    description: "Optional. Leave empty to use the managed Antigravity project.",
    default: "",
    hidden: true,
  });

  // `fields` always holds the two hidden entries, so the cast is sound.
  return fields as unknown as readonly [FormField, ...FormField[]];
}

export function answeredAction(answer: FormAnswer): LoginAction {
  const value = answer.action;
  return isLoginAction(value) ? value : "add";
}

/**
 * The accounts the person picked, as 0-based indices, or "all". A multiselect
 * answers with an array; a single string is still accepted, since the form was
 * a plain select before and `--answer account=2` still sends one.
 */
export function answeredAccounts(answer: FormAnswer): number[] | "all" | null {
  const value = answer.account;
  const picked = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
  if (picked.length === 0) return null;
  if (picked.includes(ALL_ACCOUNTS_VALUE)) return "all";

  const indices = picked
    .map((entry) => Number.parseInt(String(entry), 10))
    .filter((parsed) => Number.isInteger(parsed) && parsed >= 1)
    .map((parsed) => parsed - 1);
  return indices.length > 0 ? indices : null;
}

export interface ManagementDeps {
  client: PluginClient;
  integrationID: string;
  verify: VerifyAccount;
  /** Mirrors the change into the pool the request path is holding, by refresh token. */
  live: {
    setEnabled(refreshToken: string, enabled: boolean): void;
    remove(refreshToken: string): void;
  };
  /** Makes the next request rebuild the pool from disk. */
  invalidate(): void;
}

export interface ManagementOutcome {
  readonly text: string;
  /** False when nothing was changed, so the caller can skip a pool reload. */
  readonly changed: boolean;
}

/**
 * Runs a management action and describes the result. Never throws for a user
 * mistake (an action needing an account, with none picked) — it explains.
 */
/**
 * OpenCode prompts the login form once and ends the flow with a credential, so
 * this menu runs one action per `auth login`. The looping menu is the CLI.
 */
const KEEP_OPEN_HINT =
  "One action per login. For a menu that stays open, run `antigravity-accounts` in a terminal.";

export async function runManagementAction(
  action: Exclude<LoginAction, "add">,
  target: number[] | "all" | null,
  deps: ManagementDeps,
): Promise<ManagementOutcome> {
  const list = async () => renderAccountList(await loadAccountPool());

  if (action === "list") {
    return { text: await list(), changed: false };
  }

  if (action === "quota") {
    return { text: await renderQuota(deps.client, deps.integrationID), changed: false };
  }

  if (action === "verify") {
    const indices = target === "all" || target === null ? await allAccountIndices() : target;
    if (indices.length === 0) {
      return { text: await list(), changed: false };
    }
    return {
      text: await renderVerification(indices, deps.verify, deps.client, deps.integrationID),
      changed: false,
    };
  }

  if (target === null) {
    return {
      text: `Pick at least one account for "${action}".\n\n${await list()}`,
      changed: false,
    };
  }

  // The form cannot ask "are you sure?", so wiping the pool in one pick is
  // left to the CLI, where it is spelled out.
  if (action === "remove" && target === "all") {
    return {
      text: `"All accounts" is not offered for remove. Pick the accounts, or run \`antigravity-accounts remove --all\`.\n\n${await list()}`,
      changed: false,
    };
  }

  const indices = target === "all" ? await allAccountIndices() : target;
  if (indices.length === 0) {
    return { text: await list(), changed: false };
  }

  if (action === "remove") {
    const result = await deleteAccounts(indices);
    for (const refreshToken of result.applied) {
      deps.live.remove(refreshToken);
    }
    if (result.ok) deps.invalidate();
    return { text: `${result.message}\n\n${await list()}`, changed: result.ok };
  }

  const enabled = action === "enable";
  const result = await setAccountsEnabled(indices, enabled);
  for (const refreshToken of result.applied) {
    deps.live.setEnabled(refreshToken, enabled);
  }
  if (result.ok) deps.invalidate();
  return { text: `${result.message}\n\n${await list()}`, changed: result.ok };
}

/** Adds the "this menu is one-shot" note to what the login flow reports back. */
export function withKeepOpenHint(text: string): string {
  return `${text}\n\n${KEEP_OPEN_HINT}`;
}

/**
 * The credential a management action hands back, so OpenCode's login flow ends
 * on the account that is actually active rather than on an error. Null when the
 * pool is empty, which the caller reports as a failure instead.
 */
export async function activeAccountCredential(): Promise<OAuthCredential | null> {
  const storage = await loadAccountPool();
  if (!storage) return null;

  const index = storage.activeIndex ?? 0;
  const account =
    storage.accounts[index]?.refreshToken && storage.accounts[index]?.enabled !== false
      ? storage.accounts[index]
      : storage.accounts.find((candidate) => candidate?.refreshToken);
  if (!account?.refreshToken) return null;

  return {
    type: "oauth",
    methodID: OAUTH_METHOD_ID,
    refresh: formatRefreshParts({
      refreshToken: account.refreshToken,
      projectId: account.projectId,
      managedProjectId: account.managedProjectId,
    }),
    // Left empty on purpose: the refresh callback mints a fresh access token.
    access: "",
    expires: 0,
    metadata: account.email ? { email: account.email } : {},
  };
}
