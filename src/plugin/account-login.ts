/**
 * Adding a Google account to the pool, shared by the login menu's "add" action
 * and the standalone CLI.
 *
 * The sign-in helpers live in `plugin.ts` (they are also used by the OAuth
 * login methods), so they are injected rather than imported, which keeps this
 * module free of a cycle back to the runtime.
 */

import { authorizeAntigravity, exchangeAntigravity } from "../antigravity/oauth";
import type { AntigravityTokenExchangeResult } from "../antigravity/oauth";
import { loadAccountPool } from "./account-admin";

type TokenExchangeSuccess = Extract<AntigravityTokenExchangeResult, { type: "success" }>;

export interface LoginHelpers {
  openBrowser(url: string): Promise<boolean>;
  getStateFromAuthorizationUrl(authorizationUrl: string): string;
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
 * Google returning an account that is already stored replaces that account's
 * refresh token, which is how a revoked sign-in is renewed. It can also mean
 * the chooser was skipped, so the message says how to add a different one.
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
      : `Signed in again${result.email ? ` as ${result.email}` : ""}: its saved sign-in was renewed. ${total} account(s) stored. ` +
        "To add a different account, pick it in Google's chooser.",
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

/** Completes a login from the pasted code (or the full redirect URL). */
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
