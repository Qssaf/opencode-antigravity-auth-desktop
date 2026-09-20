/**
 * Adding a Google account to the pool, shared by the login menu's "add" action
 * and the standalone CLI.
 *
 * The browser-callback helpers live in `plugin.ts` (they are also used by the
 * OAuth login methods), so they are injected rather than imported, which keeps
 * this module free of a cycle back to the runtime.
 */

import { authorizeAntigravity, exchangeAntigravity } from "../antigravity/oauth";
import type { AntigravityTokenExchangeResult } from "../antigravity/oauth";
import { loadAccountPool } from "./account-admin";
import { createLogger } from "./logger";
import { startOAuthListener } from "./server";
import type { OAuthListener } from "./server";

const log = createLogger("account-login");

type TokenExchangeSuccess = Extract<AntigravityTokenExchangeResult, { type: "success" }>;

export interface LoginHelpers {
  openBrowser(url: string): Promise<boolean>;
  shouldSkipLocalServer(): boolean;
  getStateFromAuthorizationUrl(authorizationUrl: string): string;
  extractOAuthCallbackParams(url: URL): { code: string; state: string } | null;
  parseOAuthCallbackInput(
    value: string,
    fallbackState: string,
  ): { code: string; state: string } | { error: string };
  persistAccountPool(results: TokenExchangeSuccess[], replaceAll?: boolean): Promise<void>;
}

export type AccountLoginResult =
  | { readonly ok: true; readonly email?: string; readonly added: boolean; readonly total: number; readonly message: string }
  | { readonly ok: false; readonly message: string };

async function accountCount(): Promise<number> {
  return (await loadAccountPool())?.accounts.length ?? 0;
}

/**
 * Stores a completed exchange and describes what it did to the pool.
 *
 * Google returning an account that is already stored is the common "nothing
 * happened" case (its chooser was skipped, or the same account was picked), so
 * it is reported as such instead of as a successful add.
 */
async function persist(helpers: LoginHelpers, result: TokenExchangeSuccess, before: number): Promise<AccountLoginResult> {
  await helpers.persistAccountPool([result], false);
  const total = await accountCount();
  const who = result.email ? ` (${result.email})` : "";
  const added = total > before;

  return {
    ok: true,
    email: result.email,
    added,
    total,
    message: added
      ? `Added account${who}. ${total} account(s) stored.`
      : `Signed in${who}, but the pool still holds ${total} account(s) — Google returned an account that was already stored. ` +
        "Pick a different account in the Google chooser to add another one.",
  };
}

/** Builds an authorization URL plus the state to fall back on when pasting. */
export async function createAuthorization(
  helpers: LoginHelpers,
  projectId = "",
): Promise<{ url: string; state: string }> {
  const authorization = await authorizeAntigravity(projectId);
  return { url: authorization.url, state: helpers.getStateFromAuthorizationUrl(authorization.url) };
}

/** Completes a login from a pasted redirect URL (or bare code). */
export async function completePastedLogin(
  helpers: LoginHelpers,
  pasted: string,
  fallbackState: string,
): Promise<AccountLoginResult> {
  const before = await accountCount();
  const params = helpers.parseOAuthCallbackInput(pasted, fallbackState);
  if ("error" in params) {
    return { ok: false, message: params.error };
  }

  const result = await exchangeAntigravity(params.code, params.state);
  if (result.type === "failed") {
    return { ok: false, message: result.error };
  }
  return persist(helpers, result, before);
}

export interface BrowserLoginOptions {
  /** Called with the authorization URL as soon as the callback listener is up. */
  onAuthorizationUrl?: (url: string) => Promise<void> | void;
  projectId?: string;
}

/**
 * Runs the whole browser login: local callback listener, authorization URL,
 * browser, exchange and storage. Resolves with what happened to the pool.
 *
 * Used where there is no stdin to paste a code into (the OpenCode 2.x command)
 * and as the default path in the CLI.
 */
export async function addAccountViaBrowser(
  helpers: LoginHelpers,
  options: BrowserLoginOptions = {},
): Promise<AccountLoginResult> {
  if (helpers.shouldSkipLocalServer()) {
    return {
      ok: false,
      message:
        "This environment cannot receive the OAuth redirect (no local callback listener). " +
        "Run `opencode auth login` in a terminal, or the account CLI with `--no-browser`, and paste the redirect URL.",
    };
  }

  const before = await accountCount();

  let listener: OAuthListener;
  try {
    listener = await startOAuthListener();
  } catch (error) {
    log.debug("Could not start the OAuth callback listener", { error: String(error) });
    return {
      ok: false,
      message:
        "Could not start the local OAuth callback listener — another sign-in may be in progress. " +
        "Finish or cancel it and try again.",
    };
  }

  try {
    const { url } = await createAuthorization(helpers, options.projectId ?? "");
    await options.onAuthorizationUrl?.(url);
    await helpers.openBrowser(url);

    const callbackUrl = await listener.waitForCallback();
    const params = helpers.extractOAuthCallbackParams(callbackUrl);
    if (!params) {
      return { ok: false, message: "The redirect back from Google carried no code or state." };
    }

    const result = await exchangeAntigravity(params.code, params.state);
    if (result.type === "failed") {
      return { ok: false, message: `Sign-in failed: ${result.error}` };
    }
    return persist(helpers, result, before);
  } catch (error) {
    return { ok: false, message: `Sign-in failed: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    await listener.close().catch(() => {});
  }
}
