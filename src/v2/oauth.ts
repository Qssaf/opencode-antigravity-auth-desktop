/**
 * OpenCode 2.x login for the `google` integration ("OAuth with Google
 * (Antigravity)").
 *
 * OpenCode 2.x owns the login UI: `opencode auth login` and the TUI show the
 * URL and open the browser themselves, and ask for a pasted code in `code`
 * mode. The OpenCode 1.x flow prompted on stdin and opened the browser from
 * the plugin, neither of which works inside the OpenCode 2.x server process,
 * so this module produces the authorization and completes the exchange.
 *
 * What OpenCode 2.x does prompt is the method's own `form`, which is how the
 * 1.x account menu comes back: see `login-menu.ts`. Picking anything other than
 * "Add a Google account" runs that action and ends the flow with its result.
 */

import { authorizeAntigravity, exchangeAntigravity } from "../antigravity/oauth";
import type { AntigravityTokenExchangeResult } from "../antigravity/oauth";
import { createLogger } from "../plugin/logger";
import { refreshAccessToken } from "../plugin/token";
import type { PluginClient } from "../plugin/types";
import { credentialLabel, OAUTH_METHOD_ID, tokenResultToCredential } from "./credentials";
import {
  activeAccountCredential,
  answeredAccounts,
  answeredAction,
  buildLoginForm,
  runManagementAction,
  withKeepOpenHint,
} from "./login-menu";
import type { ManagementDeps } from "./login-menu";
import type { FormAnswer, FormOption, OAuthAuthorization, OAuthCredential, OAuthMethodRegistration } from "./types";

const log = createLogger("v2-oauth");

/** How long OpenCode waits for the pasted code. */
export const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

/** When a background refresh fails, ask OpenCode to try again after this long. */
const FAILED_REFRESH_RETRY_MS = 60 * 1000;

type TokenExchangeSuccess = Extract<AntigravityTokenExchangeResult, { type: "success" }>;

export interface OAuthFlowHelpers {
  getStateFromAuthorizationUrl(authorizationUrl: string): string;
  parseOAuthCallbackInput(
    value: string,
    fallbackState: string,
  ): { code: string; state: string } | { error: string };
  persistAccountPool(results: TokenExchangeSuccess[], replaceAll?: boolean): Promise<void>;
}

export interface OAuthMethodDeps {
  integrationID: string;
  client: PluginClient;
  helpers: OAuthFlowHelpers;
  /**
   * Accounts offered by the login menu, read from the pool when the method is
   * registered. Empty (or one account) collapses the menu to a plain sign-in.
   */
  accounts?: readonly FormOption[];
  /** Everything the management actions need; without it the menu is sign-in only. */
  management?: Omit<ManagementDeps, "client" | "integrationID">;
  createAuthorization?: typeof authorizeAntigravity;
  exchangeCode?: typeof exchangeAntigravity;
  refreshToken?: typeof refreshAccessToken;
}

export function createOAuthMethod(deps: OAuthMethodDeps): OAuthMethodRegistration {
  const { helpers, client, integrationID, management } = deps;
  const createAuthorization = deps.createAuthorization ?? authorizeAntigravity;
  const exchangeCode = deps.exchangeCode ?? exchangeAntigravity;
  const refreshToken = deps.refreshToken ?? refreshAccessToken;

  async function completeLogin(code: string, state: string): Promise<OAuthCredential> {
    const result = await exchangeCode(code, state);
    if (result.type !== "success") {
      throw new Error(result.error);
    }
    try {
      // Adds to the account pool without replacing accounts from earlier logins.
      await helpers.persistAccountPool([result], false);
      // The menu's account list is fixed when the method is registered, so
      // without this the new account is missing from it until a restart.
      management?.invalidate();
    } catch (error) {
      log.warn("Could not save the account to the Antigravity account pool", { error: String(error) });
    }
    return tokenResultToCredential(result);
  }

  /**
   * Ends the login flow on a management action: OpenCode expects a credential,
   * so it gets the account that is already active, and the result of the action
   * is carried in `instructions`.
   */
  async function completeManagement(text: string): Promise<OAuthAuthorization> {
    const credential = await activeAccountCredential();
    if (!credential) {
      // Nothing left to hand back (the last account was just removed), so the
      // flow ends on the message rather than on a credential that does not exist.
      throw new Error(text);
    }
    return {
      mode: "auto",
      url: "",
      instructions: text,
      expiresAt: Date.now() + LOGIN_TIMEOUT_MS,
      callback: Promise.resolve(credential),
    };
  }

  async function authorize(answer: FormAnswer): Promise<OAuthAuthorization> {
    const action = answeredAction(answer);
    if (action !== "add") {
      if (!management) {
        return completeManagement(
          "Account management is not available on this OpenCode build. Use the `antigravity-accounts` CLI.",
        );
      }
      const outcome = await runManagementAction(action, answeredAccounts(answer), {
        ...management,
        client,
        integrationID,
      });
      return completeManagement(withKeepOpenHint(outcome.text));
    }

    const projectId = typeof answer.projectId === "string" ? answer.projectId.trim() : "";
    // As in the Antigravity CLI, Google sends the browser to Antigravity's
    // page, which shows the authorization code to paste back here.
    const authorization = await createAuthorization(projectId);
    const fallbackState = helpers.getStateFromAuthorizationUrl(authorization.url);

    return {
      mode: "code",
      url: authorization.url,
      instructions:
        "Open the URL and sign in with Google. Antigravity's page then shows an authorization code: copy it and paste it here.",
      expiresAt: Date.now() + LOGIN_TIMEOUT_MS,
      callback: async (input: string): Promise<OAuthCredential> => {
        const params = helpers.parseOAuthCallbackInput(input, fallbackState);
        if ("error" in params) {
          throw new Error(params.error);
        }
        return completeLogin(params.code, params.state);
      },
    };
  }

  /**
   * OpenCode calls this when it wants a fresh access token for the credential.
   * It must not throw: requests are served from the account pool, so a revoked
   * or unreachable token here must not block them. On failure the credential is
   * returned unchanged with a short expiry so OpenCode retries later.
   */
  async function refresh(credential: OAuthCredential): Promise<OAuthCredential> {
    try {
      const refreshed = await refreshToken(
        {
          type: "oauth",
          refresh: credential.refresh,
          access: credential.access,
          expires: credential.expires,
        },
        client,
        integrationID,
      );
      if (!refreshed) {
        return { ...credential, expires: Date.now() + FAILED_REFRESH_RETRY_MS };
      }
      return {
        ...credential,
        refresh: refreshed.refresh,
        access: refreshed.access ?? credential.access,
        expires: refreshed.expires ?? credential.expires,
      };
    } catch (error) {
      log.warn("Antigravity credential refresh failed", { error: String(error) });
      return { ...credential, expires: Date.now() + FAILED_REFRESH_RETRY_MS };
    }
  }

  return {
    integrationID,
    method: {
      id: OAUTH_METHOD_ID,
      type: "oauth",
      label: "OAuth with Google (Antigravity)",
      // The menu OpenCode prompts before calling `authorize`. Hidden fields are
      // never prompted; pass them with `--answer key=value`.
      form: buildLoginForm(deps.accounts ?? []),
    },
    authorize,
    refresh,
    label: credentialLabel,
  };
}
