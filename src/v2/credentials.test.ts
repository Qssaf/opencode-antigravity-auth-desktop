import { describe, expect, it } from "vitest";
import {
  authSignature,
  credentialLabel,
  credentialToAuth,
  OAUTH_METHOD_ID,
  tokenResultToCredential,
} from "./credentials";
import type { ConnectionInfo, OAuthCredential } from "./types";

const connection: ConnectionInfo = { type: "credential", id: "cred_1", label: "a@example.com" };

const oauth: OAuthCredential = {
  type: "oauth",
  methodID: OAUTH_METHOD_ID,
  refresh: "refresh-token|project|managed",
  access: "access-token",
  expires: 1234,
  metadata: { email: "a@example.com" },
};

describe("credentialToAuth", () => {
  it("maps an OAuth credential to the 1.x oauth auth shape", () => {
    expect(credentialToAuth(oauth)).toEqual({
      type: "oauth",
      refresh: "refresh-token|project|managed",
      access: "access-token",
      expires: 1234,
    });
  });

  it("maps a key credential to the 1.x api auth shape", () => {
    expect(credentialToAuth({ type: "key", key: "AIza..." })).toEqual({ type: "api", key: "AIza..." });
  });

  it("reports no credential as an unauthenticated auth", () => {
    expect(credentialToAuth(undefined)).toEqual({ type: "none" });
  });
});

describe("authSignature", () => {
  it("is stable across access token rotation", () => {
    const rotated = { ...oauth, access: "new-access-token", expires: 9999 };
    expect(authSignature(connection, rotated)).toBe(authSignature(connection, oauth));
  });

  it("changes when the refresh token changes", () => {
    const other = { ...oauth, refresh: "other-refresh|project|managed" };
    expect(authSignature(connection, other)).not.toBe(authSignature(connection, oauth));
  });

  it("changes when the connection changes", () => {
    const other: ConnectionInfo = { type: "credential", id: "cred_2", label: "b@example.com" };
    expect(authSignature(other, oauth)).not.toBe(authSignature(connection, oauth));
  });

  it("distinguishes an env connection from a stored credential", () => {
    const env: ConnectionInfo = { type: "env", name: "GEMINI_API_KEY" };
    const key = { type: "key", key: "AIza..." } as const;
    expect(authSignature(env, key)).toContain("env:GEMINI_API_KEY");
    expect(authSignature(env, key)).not.toBe(authSignature(connection, key));
  });

  it("never contains the secret itself", () => {
    expect(authSignature(connection, oauth)).not.toContain("refresh-token");
  });

  it("reports a missing credential or connection as none", () => {
    expect(authSignature(undefined, undefined)).toBe("none");
    expect(authSignature(connection, undefined)).toBe("none");
    expect(authSignature(undefined, oauth)).toBe("none");
  });
});

describe("tokenResultToCredential", () => {
  it("builds an OAuth credential carrying the email and project", () => {
    expect(
      tokenResultToCredential({
        type: "success",
        refresh: "r|p|m",
        access: "a",
        expires: 42,
        email: "a@example.com",
        projectId: "p",
      }),
    ).toEqual({
      type: "oauth",
      methodID: OAUTH_METHOD_ID,
      refresh: "r|p|m",
      access: "a",
      expires: 42,
      metadata: { email: "a@example.com", projectId: "p" },
    });
  });

  it("omits metadata fields the exchange did not return", () => {
    const credential = tokenResultToCredential({
      type: "success",
      refresh: "r|p|m",
      access: "a",
      expires: 42,
      projectId: "",
    });
    expect(credential.metadata).toEqual({});
  });
});

describe("credentialLabel", () => {
  it("uses the email when present", () => {
    expect(credentialLabel(oauth)).toBe("a@example.com");
  });

  it("returns undefined without an email", () => {
    expect(credentialLabel({ ...oauth, metadata: {} })).toBeUndefined();
    expect(credentialLabel({ ...oauth, metadata: undefined })).toBeUndefined();
  });
});
