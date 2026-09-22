import { ANTIGRAVITY_CLIENT_ID, ANTIGRAVITY_CLIENT_SECRET } from "../constants";
import { formatRefreshParts, parseRefreshParts, calculateTokenExpiry } from "./auth";
import { clearCachedAuth, storeCachedAuth } from "./cache";
import { createLogger } from "./logger";
import { invalidateProjectContextCache } from "./project";
import type { OAuthAuthDetails, PluginClient, RefreshParts } from "./types";

const log = createLogger("token");

interface OAuthErrorPayload {
  error?:
    | string
    | {
        code?: string;
        status?: string;
        message?: string;
      };
  error_description?: string;
}

/**
 * Parses OAuth error payloads returned by Google token endpoints, tolerating varied shapes.
 */
function parseOAuthErrorPayload(text: string | undefined): { code?: string; description?: string } {
  if (!text) {
    return {};
  }

  try {
    const payload = JSON.parse(text) as OAuthErrorPayload;
    if (!payload || typeof payload !== "object") {
      return { description: text };
    }

    let code: string | undefined;
    if (typeof payload.error === "string") {
      code = payload.error;
    } else if (payload.error && typeof payload.error === "object") {
      code = payload.error.status ?? payload.error.code;
      if (!payload.error_description && payload.error.message) {
        return { code, description: payload.error.message };
      }
    }

    const description = payload.error_description;
    if (description) {
      return { code, description };
    }

    if (payload.error && typeof payload.error === "object" && payload.error.message) {
      return { code, description: payload.error.message };
    }

    return { code };
  } catch {
    return { description: text };
  }
}

export class AntigravityTokenRefreshError extends Error {
  code?: string;
  description?: string;
  status: number;
  statusText: string;

  constructor(options: {
    message: string;
    code?: string;
    description?: string;
    status: number;
    statusText: string;
  }) {
    super(options.message);
    this.name = "AntigravityTokenRefreshError";
    this.code = options.code;
    this.description = options.description;
    this.status = options.status;
    this.statusText = options.statusText;
  }
}

/**
 * Refreshes in flight, keyed by refresh token.
 *
 * Long agent runs refresh the same account from several places at once (the
 * request path, the proactive refresh queue, project context resolution, quota
 * checks and, on OpenCode 2.x, OpenCode's own credential refresh). Google
 * answers concurrent refreshes of one token with `invalid_grant`, which the
 * caller reads as "revoked" and acts on by dropping the account. Coalescing
 * them means one network refresh per token, shared by every caller.
 */
const inFlightRefreshes = new Map<string, Promise<OAuthAuthDetails | undefined>>();

/**
 * Consecutive `invalid_grant` responses per refresh token. A genuinely revoked
 * token fails every time; a transient failure does not, so callers use this to
 * avoid deleting an account on a single bad response.
 */
const invalidGrantStrikes = new Map<string, number>();

/**
 * Upper bound on one refresh, body included. Every request for the account
 * waits on the shared refresh, so a stalled connection to Google would
 * otherwise hang them all indefinitely.
 */
export const TOKEN_REFRESH_TIMEOUT_MS = 30_000;

/** How many consecutive `invalid_grant` responses mean the token is really gone. */
export const INVALID_GRANT_STRIKES_BEFORE_REMOVAL = 2;

/** Consecutive `invalid_grant` responses seen for this refresh token. */
export function getInvalidGrantStrikes(refreshToken: string): number {
  return invalidGrantStrikes.get(refreshToken) ?? 0;
}

/**
 * Whether `invalid_grant` for this token has been confirmed often enough to
 * treat the account as revoked rather than transiently unhappy.
 */
export function isRevokedRefreshToken(refreshToken: string): boolean {
  return getInvalidGrantStrikes(refreshToken) >= INVALID_GRANT_STRIKES_BEFORE_REMOVAL;
}

export function clearInvalidGrantStrikes(refreshToken: string): void {
  invalidGrantStrikes.delete(refreshToken);
}

export function resetTokenRefreshStateForTests(): void {
  inFlightRefreshes.clear();
  invalidGrantStrikes.clear();
}

/**
 * Refreshes an Antigravity OAuth access token, updates persisted credentials, and handles revocation.
 *
 * Concurrent calls for the same refresh token share a single network refresh.
 */
export async function refreshAccessToken(
  auth: OAuthAuthDetails,
  client: PluginClient,
  providerId: string,
): Promise<OAuthAuthDetails | undefined> {
  const parts = parseRefreshParts(auth.refresh);
  if (!parts.refreshToken) {
    return undefined;
  }

  let shared = inFlightRefreshes.get(parts.refreshToken);
  if (!shared) {
    shared = performRefresh(auth, parts.refreshToken).finally(() => {
      inFlightRefreshes.delete(parts.refreshToken);
    });
    inFlightRefreshes.set(parts.refreshToken, shared);
  }

  return adoptRefreshResult(auth, parts, await shared);
}

/**
 * Rebuilds a shared refresh result for this caller.
 *
 * The in-flight map is keyed by refresh token alone, so a caller may receive a
 * result produced from a differently packed `refresh` string (same account,
 * different project ids). The tokens are shared; the caller's own project ids
 * are not, so they are carried over.
 */
function adoptRefreshResult(
  auth: OAuthAuthDetails,
  parts: RefreshParts,
  result: OAuthAuthDetails | undefined,
): OAuthAuthDetails | undefined {
  if (!result) {
    return undefined;
  }

  const resultParts = parseRefreshParts(result.refresh);
  const refresh = formatRefreshParts({
    refreshToken: resultParts.refreshToken || parts.refreshToken,
    projectId: parts.projectId ?? resultParts.projectId,
    managedProjectId: parts.managedProjectId ?? resultParts.managedProjectId,
  });

  if (refresh === result.refresh) {
    return result;
  }

  const adopted: OAuthAuthDetails = {
    ...auth,
    access: result.access,
    expires: result.expires,
    refresh,
  };
  storeCachedAuth(adopted);
  return adopted;
}

async function performRefresh(
  auth: OAuthAuthDetails,
  refreshTokenValue: string,
): Promise<OAuthAuthDetails | undefined> {
  const parts = parseRefreshParts(auth.refresh);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOKEN_REFRESH_TIMEOUT_MS);

  try {
    const startTime = Date.now();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: parts.refreshToken,
        client_id: ANTIGRAVITY_CLIENT_ID,
        client_secret: ANTIGRAVITY_CLIENT_SECRET,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorText: string | undefined;
      try {
        errorText = await response.text();
      } catch {
        errorText = undefined;
      }

      const { code, description } = parseOAuthErrorPayload(errorText);
      const details = [code, description ?? errorText].filter(Boolean).join(": ");
      const baseMessage = `Antigravity token refresh failed (${response.status} ${response.statusText})`;
      const message = details ? `${baseMessage} - ${details}` : baseMessage;
      log.warn("Token refresh failed", { status: response.status, code, details });

      if (code === "invalid_grant") {
        const strikes = (invalidGrantStrikes.get(refreshTokenValue) ?? 0) + 1;
        invalidGrantStrikes.set(refreshTokenValue, strikes);
        log.warn("Google rejected the stored refresh token with invalid_grant", {
          strikes,
          revoked: strikes >= INVALID_GRANT_STRIKES_BEFORE_REMOVAL,
        });
        invalidateProjectContextCache(auth.refresh);
        clearCachedAuth(auth.refresh);
      }

      throw new AntigravityTokenRefreshError({
        message,
        code,
        description: description ?? errorText,
        status: response.status,
        statusText: response.statusText,
      });
    }

    const payload = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    const refreshedParts: RefreshParts = {
      refreshToken: payload.refresh_token ?? parts.refreshToken,
      projectId: parts.projectId,
      managedProjectId: parts.managedProjectId,
    };

    const updatedAuth: OAuthAuthDetails = {
      ...auth,
      access: payload.access_token,
      expires: calculateTokenExpiry(startTime, payload.expires_in),
      refresh: formatRefreshParts(refreshedParts),
    };

    storeCachedAuth(updatedAuth);
    invalidateProjectContextCache(auth.refresh);
    invalidGrantStrikes.delete(refreshTokenValue);

    return updatedAuth;
  } catch (error) {
    if (error instanceof AntigravityTokenRefreshError) {
      throw error;
    }
    log.error("Unexpected token refresh error", {
      error: controller.signal.aborted ? `timed out after ${TOKEN_REFRESH_TIMEOUT_MS}ms` : String(error),
    });
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

