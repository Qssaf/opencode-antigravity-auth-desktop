import { createHash, randomBytes } from "node:crypto";

import {
  ANTIGRAVITY_CLIENT_ID,
  ANTIGRAVITY_CLIENT_SECRET,
  ANTIGRAVITY_REDIRECT_URI,
  ANTIGRAVITY_SCOPES,
  ANTIGRAVITY_ENDPOINT_FALLBACKS,
  ANTIGRAVITY_CLI_USER_AGENT,
} from "../constants";
import { createLogger } from "../plugin/logger";
import { calculateTokenExpiry } from "../plugin/auth";
import { googleFetch, googleRequest } from "./google-http";

const log = createLogger("oauth");

interface PendingAuthorization {
  verifier: string;
  projectId: string;
  createdAt: number;
}

/** A sign-in not completed within this long has to be started again. */
const AUTHORIZATION_TTL_MS = 30 * 60 * 1000;

/**
 * Sign-ins waiting for their code, keyed by `state`. The PKCE verifier never
 * leaves the process (it used to travel inside `state`, where anyone who saw
 * the redirect had both halves). On globalThis because OpenCode 2.x imports
 * this module once per location, and a sign-in started in one completes in
 * whichever module instance handles the pasted code.
 */
const pendingAuthorizations = ((globalThis as Record<symbol, unknown>)[
  Symbol.for("opencode-antigravity-auth/pending-authorizations")
] ??= new Map<string, PendingAuthorization>()) as Map<string, PendingAuthorization>;

/** Takes the sign-in `state` belongs to; each one can be completed once. */
function takePendingAuthorization(state: string): PendingAuthorization | undefined {
  const now = Date.now();
  for (const [key, pending] of pendingAuthorizations) {
    if (now - pending.createdAt > AUTHORIZATION_TTL_MS) pendingAuthorizations.delete(key);
  }
  const pending = pendingAuthorizations.get(state);
  pendingAuthorizations.delete(state);
  return pending;
}

/** Go's `oauth2.GenerateVerifier`: 32 random bytes, base64url without padding. */
function generateVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Result returned to the caller after constructing an OAuth authorization URL.
 */
export interface AntigravityAuthorization {
  url: string;
  projectId: string;
}

interface AntigravityTokenExchangeSuccess {
  type: "success";
  refresh: string;
  access: string;
  expires: number;
  email?: string;
  projectId: string;
}

interface AntigravityTokenExchangeFailure {
  type: "failed";
  error: string;
}

export type AntigravityTokenExchangeResult =
  | AntigravityTokenExchangeSuccess
  | AntigravityTokenExchangeFailure;

interface AntigravityTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

interface AntigravityUserInfo {
  email?: string;
}

/**
 * Builds the sign-in URL the way the Antigravity CLI does (Go's
 * `oauth2.Config.AuthCodeURL`): the v1 endpoint, parameters in alphabetical
 * order, a 16-byte random `state` and an S256 PKCE challenge. Google then
 * sends the browser to Antigravity's page, which shows the code to paste back.
 */
export async function authorizeAntigravity(projectId = ""): Promise<AntigravityAuthorization> {
  const verifier = generateVerifier();
  const state = randomBytes(16).toString("base64url");
  pendingAuthorizations.set(state, { verifier, projectId: projectId || "", createdAt: Date.now() });

  const params = new URLSearchParams({
    access_type: "offline",
    client_id: ANTIGRAVITY_CLIENT_ID,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    // Antigravity sends `consent` alone. `select_account` is kept because with
    // `consent` alone Google silently reuses the browser's current session,
    // so a second login returns the account already in the pool.
    prompt: "select_account consent",
    redirect_uri: ANTIGRAVITY_REDIRECT_URI,
    response_type: "code",
    scope: ANTIGRAVITY_SCOPES.join(" "),
    state,
  });

  return {
    url: `https://accounts.google.com/o/oauth2/auth?${params}`,
    projectId: projectId || "",
  };
}

const FETCH_TIMEOUT_MS = 10000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await googleFetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchProjectID(accessToken: string): Promise<string> {
  const errors: string[] = [];
  // Same request the runtime makes in `plugin/project.ts`: the Antigravity CLI
  // user agent and metadata carrying `ideType` only. The backend rejects
  // `metadata.platform` with HTTP 400, which made this lookup fail on every login.
  const loadHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "User-Agent": ANTIGRAVITY_CLI_USER_AGENT,
  };

  for (const baseEndpoint of ANTIGRAVITY_ENDPOINT_FALLBACKS) {
    try {
      const url = `${baseEndpoint}/v1internal:loadCodeAssist`;
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: loadHeaders,
        body: JSON.stringify({
          metadata: {
            ideType: "ANTIGRAVITY",
          },
        }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        errors.push(
          `loadCodeAssist ${response.status} at ${baseEndpoint}${
            message ? `: ${message}` : ""
          }`,
        );
        continue;
      }

      const data = await response.json();
      if (typeof data.cloudaicompanionProject === "string" && data.cloudaicompanionProject) {
        return data.cloudaicompanionProject;
      }
      if (
        data.cloudaicompanionProject &&
        typeof data.cloudaicompanionProject.id === "string" &&
        data.cloudaicompanionProject.id
      ) {
        return data.cloudaicompanionProject.id;
      }

      errors.push(`loadCodeAssist missing project id at ${baseEndpoint}`);
    } catch (e) {
      errors.push(
        `loadCodeAssist error at ${baseEndpoint}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  if (errors.length) {
    log.warn("Failed to resolve Antigravity project via loadCodeAssist", { errors: errors.join("; ") });
  }
  return "";
}

/**
 * Exchange an authorization code for Antigravity CLI access and refresh tokens.
 */
export async function exchangeAntigravity(
  code: string,
  state: string,
): Promise<AntigravityTokenExchangeResult> {
  try {
    const pending = takePendingAuthorization(state);
    if (!pending) {
      return {
        type: "failed",
        error: "This sign-in is unknown or expired. Start the login again and paste the code it shows.",
      };
    }
    const { verifier, projectId } = pending;

    const startTime = Date.now();
    // Go's oauth2 token request: form fields in alphabetical order.
    const tokenResponse = await googleRequest("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: ANTIGRAVITY_CLIENT_ID,
        client_secret: ANTIGRAVITY_CLIENT_SECRET,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: ANTIGRAVITY_REDIRECT_URI,
      }).toString(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return { type: "failed", error: errorText };
    }

    const tokenPayload = (await tokenResponse.json()) as AntigravityTokenResponse;

    const userInfoResponse = await googleRequest("https://www.googleapis.com/oauth2/v2/userinfo", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const userInfo = userInfoResponse.ok
      ? ((await userInfoResponse.json()) as AntigravityUserInfo)
      : {};

    const refreshToken = tokenPayload.refresh_token;
    if (!refreshToken) {
      return { type: "failed", error: "Missing refresh token in response" };
    }

    let effectiveProjectId = projectId;
    if (!effectiveProjectId) {
      effectiveProjectId = await fetchProjectID(tokenPayload.access_token);
    }

    const storedRefresh = `${refreshToken}|${effectiveProjectId || ""}`;

    return {
      type: "success",
      refresh: storedRefresh,
      access: tokenPayload.access_token,
      expires: calculateTokenExpiry(startTime, tokenPayload.expires_in),
      email: userInfo.email,
      projectId: effectiveProjectId || "",
    };
  } catch (error) {
    return {
      type: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
