/**
 * Conversions between OpenCode 2.x credentials and the auth shapes the
 * shared Antigravity runtime (written for OpenCode 1.x) understands.
 */

import { createHash } from "node:crypto";
import type { AntigravityTokenExchangeResult } from "../antigravity/oauth";
import type { AuthDetails } from "../plugin/types";
import type { ConnectionInfo, Credential, OAuthCredential } from "./types";

/** Method ID registered on the `google` integration. */
export const OAUTH_METHOD_ID = "antigravity";

type TokenExchangeSuccess = Extract<AntigravityTokenExchangeResult, { type: "success" }>;

/**
 * Maps the active 2.x credential to the 1.x `getAuth()` result.
 * `refresh` keeps the packed `refreshToken|projectId|managedProjectId` form.
 */
export function credentialToAuth(credential: Credential | undefined): AuthDetails {
  if (!credential) return { type: "none" };
  if (credential.type === "oauth") {
    return {
      type: "oauth",
      refresh: credential.refresh,
      access: credential.access,
      expires: credential.expires,
    };
  }
  return { type: "api", key: credential.key };
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/**
 * Identifies which login the runtime was built for. Access token rotation must
 * not change it; a different account or key must.
 */
export function authSignature(connection: ConnectionInfo | undefined, credential: Credential | undefined): string {
  if (!connection || !credential) return "none";
  const source = connection.type === "credential" ? connection.id : `env:${connection.name}`;
  const secret = credential.type === "oauth" ? credential.refresh : credential.key;
  return `${credential.type}:${source}:${digest(secret)}`;
}

/** Signature for an account promoted from the on-disk account pool. */
export function poolAuthSignature(refresh: string): string {
  return `pool:${digest(refresh)}`;
}

/** Builds the 2.x OAuth credential for a completed Antigravity login. */
export function tokenResultToCredential(result: TokenExchangeSuccess): OAuthCredential {
  return {
    type: "oauth",
    methodID: OAUTH_METHOD_ID,
    refresh: result.refresh,
    access: result.access,
    expires: result.expires,
    metadata: {
      ...(result.email ? { email: result.email } : {}),
      ...(result.projectId ? { projectId: result.projectId } : {}),
    },
  };
}

/** Label shown by `opencode auth list` and the account switcher. */
export function credentialLabel(credential: OAuthCredential): string | undefined {
  const email = credential.metadata?.email;
  return typeof email === "string" && email.length > 0 ? email : undefined;
}
