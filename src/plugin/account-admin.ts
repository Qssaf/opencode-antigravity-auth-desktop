/**
 * Account-pool administration, rendered as plain text.
 *
 * One implementation serves both surfaces that manage accounts outside the
 * request path: the `/antigravity` command registered on OpenCode 2.x
 * (`src/v2/command.ts`) and the standalone CLI (`src/cli/accounts.ts`). Every
 * operation returns text the caller prints or posts, with no ANSI escapes, so
 * it reads the same in a terminal and in a chat message.
 */

import { checkAccountsQuota } from "./quota";
import { loadAccounts, removeAccountFromStorage, saveAccounts } from "./storage";
import type { AccountMetadataV3, AccountStorageV4 } from "./storage";
import type { PluginClient } from "./types";

/** What an account is currently able to do, derived from its stored state. */
export type AccountState = "active" | "rate-limited" | "verification-required";

export interface AccountAdminResult {
  /** False when the account did not exist or the pool was empty. */
  readonly ok: boolean;
  readonly message: string;
  /** Set when a stored account was changed, for syncing the live pool. */
  readonly index?: number;
}

export interface VerificationOutcome {
  readonly status: "ok" | "blocked" | "error";
  readonly message: string;
  readonly verifyUrl?: string;
}

/** Probe used by `renderVerification`, supplied by the caller to avoid a cycle. */
export type VerifyAccount = (
  account: AccountMetadataV3,
  client: PluginClient,
  providerId: string,
) => Promise<VerificationOutcome>;

export function accountLabel(account: AccountMetadataV3 | undefined, index: number): string {
  return account?.email || `Account ${index + 1}`;
}

export function accountState(account: AccountMetadataV3, now = Date.now()): AccountState {
  if (account.verificationRequired) {
    return "verification-required";
  }
  if (account.coolingDownUntil && account.coolingDownUntil > now) {
    return "rate-limited";
  }
  const limits = account.rateLimitResetTimes;
  if (limits && Object.values(limits).some((reset) => typeof reset === "number" && reset > now)) {
    return "rate-limited";
  }
  return "active";
}

/** The stored pool, or null when nothing usable is stored yet. */
export async function loadAccountPool(): Promise<AccountStorageV4 | null> {
  const storage = await loadAccounts();
  return storage && storage.accounts.length > 0 ? storage : null;
}

export const NO_ACCOUNTS_MESSAGE =
  "No Google accounts are stored. Run `opencode auth login` (or `/antigravity add`) to sign in.";

export function renderAccountList(storage: AccountStorageV4 | null): string {
  if (!storage || storage.accounts.length === 0) {
    return NO_ACCOUNTS_MESSAGE;
  }

  const now = Date.now();
  const lines = storage.accounts.map((account, index) => {
    const flags = [
      index === (storage.activeIndex ?? 0) ? "current" : "",
      account.enabled === false ? "disabled" : "",
      accountState(account, now) === "active" ? "" : accountState(account, now),
    ].filter(Boolean);
    const suffix = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
    return `  ${index + 1}. ${accountLabel(account, index)}${suffix}`;
  });

  return [`${storage.accounts.length} account(s):`, ...lines].join("\n");
}

export async function renderAccounts(): Promise<string> {
  return renderAccountList(await loadAccountPool());
}

export async function setAccountEnabled(index: number, enabled: boolean): Promise<AccountAdminResult> {
  const storage = await loadAccountPool();
  const account = storage?.accounts[index];
  if (!storage || !account) {
    return { ok: false, message: `No account ${index + 1}. ${await renderAccounts()}` };
  }

  account.enabled = enabled;
  await saveAccounts(storage);
  return {
    ok: true,
    index,
    message: `${accountLabel(account, index)} ${enabled ? "enabled" : "disabled"}.`,
  };
}

export async function deleteAccount(index: number): Promise<AccountAdminResult> {
  const storage = await loadAccountPool();
  const account = storage?.accounts[index];
  if (!storage || !account) {
    return { ok: false, message: `No account ${index + 1}. ${await renderAccounts()}` };
  }

  await removeAccountFromStorage(account.refreshToken);
  return { ok: true, index, message: `Deleted ${accountLabel(account, index)}.` };
}

// -- quota -------------------------------------------------------------------

function formatResetTime(resetTime?: string): string {
  if (!resetTime) return "";
  const ms = Date.parse(resetTime) - Date.now();
  if (!Number.isFinite(ms)) return "";
  if (ms <= 0) return " (resetting)";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return ` (resets in ${minutes}m)`;
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return days > 0 ? ` (resets in ${days}d ${hours % 24}h)` : ` (resets in ${hours}h)`;
}

function formatRemaining(remaining?: number): string {
  return typeof remaining === "number" ? `${Math.round(remaining * 100)}%` : "unknown";
}

export async function renderQuota(client: PluginClient, providerId: string): Promise<string> {
  const storage = await loadAccountPool();
  if (!storage) {
    return NO_ACCOUNTS_MESSAGE;
  }

  const results = await checkAccountsQuota(storage.accounts, client, providerId);
  const blocks: string[] = [];

  for (const result of results) {
    const label = result.email || `Account ${result.index + 1}`;
    const lines = [`${label}${result.disabled ? " [disabled]" : ""}`];

    if (result.status === "error") {
      lines.push(`  error: ${result.error}`);
      blocks.push(lines.join("\n"));
      continue;
    }

    const groups = result.quota?.groups ?? {};
    const rows: Array<[string, { remainingFraction?: number; resetTime?: string } | undefined]> = [
      ["Claude", groups.claude],
      ["Gemini 3 Pro", groups["gemini-pro"]],
      ["Gemini 3 Flash", groups["gemini-flash"]],
    ];
    const known = rows.filter(([, data]) => data);
    if (known.length === 0) {
      lines.push(`  Antigravity: ${result.quota?.error ?? "no quota information"}`);
    } else {
      for (const [name, data] of known) {
        lines.push(`  ${name.padEnd(16)} ${formatRemaining(data?.remainingFraction)}${formatResetTime(data?.resetTime)}`);
      }
    }

    for (const model of result.geminiCliQuota?.models ?? []) {
      lines.push(
        `  ${`CLI ${model.modelId}`.padEnd(16)} ${formatRemaining(model.remainingFraction)}${formatResetTime(model.resetTime)}`,
      );
    }

    blocks.push(lines.join("\n"));
  }

  return blocks.join("\n\n");
}

// -- verification ------------------------------------------------------------

export async function renderVerification(
  indices: readonly number[],
  verify: VerifyAccount,
  client: PluginClient,
  providerId: string,
): Promise<string> {
  const storage = await loadAccountPool();
  if (!storage) {
    return NO_ACCOUNTS_MESSAGE;
  }

  const lines: string[] = [];
  for (const index of indices) {
    const account = storage.accounts[index];
    if (!account) {
      lines.push(`No account ${index + 1}.`);
      continue;
    }

    const label = accountLabel(account, index);
    const verification = await verify(account, client, providerId);
    if (verification.status === "ok") {
      lines.push(`${label}: ok`);
      continue;
    }
    if (verification.status === "blocked") {
      lines.push(`${label}: needs Google verification`);
      lines.push(`  ${verification.message}`);
      if (verification.verifyUrl) {
        lines.push(`  ${verification.verifyUrl}`);
      }
      continue;
    }
    lines.push(`${label}: error - ${verification.message}`);
  }

  return lines.join("\n");
}

/** Every stored account's index, for "all accounts" operations. */
export async function allAccountIndices(): Promise<number[]> {
  const storage = await loadAccountPool();
  return storage ? storage.accounts.map((_, index) => index) : [];
}

/**
 * Parses a 1-based account number as typed by a user. Returns null when it is
 * not a positive integer.
 */
export function parseAccountNumber(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed - 1 : null;
}
