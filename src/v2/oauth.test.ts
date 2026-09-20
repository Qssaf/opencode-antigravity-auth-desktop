import { beforeEach, describe, expect, it, vi } from "vitest";
import { OAUTH_METHOD_ID } from "./credentials";
import { createOAuthMethod } from "./oauth";
import type { OAuthFlowHelpers, OAuthMethodDeps } from "./oauth";
import type { PluginClient } from "../plugin/types";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth?state=abc123";

function helpers(overrides: Partial<OAuthFlowHelpers> = {}): OAuthFlowHelpers {
  return {
    shouldSkipLocalServer: () => false,
    getStateFromAuthorizationUrl: (url) => new URL(url).searchParams.get("state") ?? "",
    extractOAuthCallbackParams: (url) => {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      return code && state ? { code, state } : null;
    },
    parseOAuthCallbackInput: (value, fallbackState) =>
      value ? { code: value, state: fallbackState } : { error: "Missing authorization code" },
    persistAccountPool: vi.fn(async () => {}),
    ...overrides,
  };
}

function deps(overrides: Partial<OAuthMethodDeps> = {}): OAuthMethodDeps {
  return {
    integrationID: "google",
    client: {} as PluginClient,
    helpers: helpers(),
    startListener: async () => ({
      waitForCallback: async () => new URL("http://localhost:51121/oauth-callback?code=CODE&state=abc123"),
      close: async () => {},
    }),
    createAuthorization: async () => ({ url: AUTH_URL, verifier: "v", projectId: "" }),
    exchangeCode: async () => ({
      type: "success",
      refresh: "r|p|m",
      access: "a",
      expires: 4242,
      email: "a@example.com",
      projectId: "p",
    }),
    refreshToken: async (auth) => ({ ...auth, access: "fresh-access", expires: 9999 }),
    ...overrides,
  };
}

beforeEach(() => {
  delete process.env.OPENCODE_HEADLESS;
});

describe("createOAuthMethod", () => {
  it("registers an oauth method on the google integration", () => {
    const registration = createOAuthMethod(deps());
    expect(registration.integrationID).toBe("google");
    expect(registration.method).toMatchObject({ id: OAUTH_METHOD_ID, type: "oauth" });
  });

  it("hides every field of a first login, so a non-interactive sign-in is not blocked", () => {
    // With nothing stored there is nothing to manage, and a visible field could
    // break `opencode auth login` in scripts and remote shells.
    for (const field of createOAuthMethod(deps()).method.form ?? []) {
      expect(field).toHaveProperty("hidden", true);
    }
  });

  it("shows the account menu once accounts are stored", () => {
    const registration = createOAuthMethod(
      deps({ accounts: [{ value: "1", label: "1. a@example.com" }, { value: "all", label: "All accounts" }] }),
    );
    const action = registration.method.form?.find((field) => field.key === "action");

    expect(action).toBeDefined();
    expect(action).not.toHaveProperty("hidden", true);
    // Defaulted, never required: a login that cannot prompt still signs in.
    expect(action).toHaveProperty("default", "add");
    expect(action).not.toHaveProperty("required", true);
  });
});

describe("authorize", () => {
  it("still signs in when the menu is answered with add", async () => {
    const authorization = await createOAuthMethod(deps()).authorize({ action: "add" });
    expect(authorization.mode).toBe("auto");
    expect(authorization.url).toBe(AUTH_URL);
  });

  it("runs a management action instead of signing in, and reports its result", async () => {
    const createAuthorization = vi.fn(async () => ({ url: AUTH_URL, verifier: "v", projectId: "" }));
    const authorization = await createOAuthMethod(
      deps({
        createAuthorization,
        management: {
          verify: async () => ({ status: "ok", message: "ok" }),
          live: { setEnabled: () => {}, remove: () => {} },
          invalidate: () => {},
        },
      }),
    ).authorize({ action: "list" });

    // No OAuth round-trip is started for a management action.
    expect(createAuthorization).not.toHaveBeenCalled();
    expect(authorization.url).toBe("");
    expect(authorization.instructions.length).toBeGreaterThan(0);
  });

  it("uses auto mode and the local listener by default", async () => {
    const authorization = await createOAuthMethod(deps()).authorize({});
    expect(authorization.mode).toBe("auto");
    expect(authorization.url).toBe(AUTH_URL);
    expect(authorization.expiresAt).toBeGreaterThan(Date.now());
  });

  it("completes the login from the redirect the listener receives", async () => {
    const persistAccountPool = vi.fn(async () => {});
    const authorization = await createOAuthMethod(
      deps({ helpers: helpers({ persistAccountPool }) }),
    ).authorize({});
    if (authorization.mode !== "auto") throw new Error("expected auto mode");

    await expect(authorization.callback).resolves.toEqual({
      type: "oauth",
      methodID: OAUTH_METHOD_ID,
      refresh: "r|p|m",
      access: "a",
      expires: 4242,
      metadata: { email: "a@example.com", projectId: "p" },
    });
    // Adds to the pool rather than replacing accounts from earlier logins.
    expect(persistAccountPool).toHaveBeenCalledWith([expect.objectContaining({ type: "success" })], false);
  });

  it("closes the listener after the callback resolves", async () => {
    const close = vi.fn(async () => {});
    const authorization = await createOAuthMethod(
      deps({
        startListener: async () => ({
          waitForCallback: async () => new URL("http://localhost:51121/oauth-callback?code=CODE&state=abc123"),
          close,
        }),
      }),
    ).authorize({});
    if (authorization.mode !== "auto") throw new Error("expected auto mode");

    await authorization.callback;
    expect(close).toHaveBeenCalled();
  });

  it("closes the listener when building the authorization URL fails", async () => {
    const close = vi.fn(async () => {});
    await expect(
      createOAuthMethod(
        deps({
          startListener: async () => ({ waitForCallback: async () => new URL("http://x"), close }),
          createAuthorization: async () => {
            throw new Error("no network");
          },
        }),
      ).authorize({}),
    ).rejects.toThrow("no network");
    expect(close).toHaveBeenCalled();
  });

  it("falls back to code mode when the noBrowser answer is set", async () => {
    const authorization = await createOAuthMethod(deps()).authorize({ noBrowser: true });
    expect(authorization.mode).toBe("code");
  });

  it("falls back to code mode when the listener cannot start", async () => {
    const authorization = await createOAuthMethod(
      deps({
        startListener: async () => {
          throw new Error("EADDRINUSE");
        },
      }),
    ).authorize({});
    expect(authorization.mode).toBe("code");
  });

  it("falls back to code mode in a headless environment", async () => {
    process.env.OPENCODE_HEADLESS = "1";
    expect((await createOAuthMethod(deps()).authorize({})).mode).toBe("code");
  });

  it("falls back to code mode when a local server would not be reachable", async () => {
    const authorization = await createOAuthMethod(
      deps({ helpers: helpers({ shouldSkipLocalServer: () => true }) }),
    ).authorize({});
    expect(authorization.mode).toBe("code");
  });

  it("exchanges a pasted code in code mode", async () => {
    const authorization = await createOAuthMethod(deps()).authorize({ noBrowser: true });
    if (authorization.mode !== "code") throw new Error("expected code mode");
    await expect(authorization.callback("PASTED")).resolves.toMatchObject({ refresh: "r|p|m" });
  });

  it("reports a malformed pasted code as an error", async () => {
    const authorization = await createOAuthMethod(deps()).authorize({ noBrowser: true });
    if (authorization.mode !== "code") throw new Error("expected code mode");
    await expect(authorization.callback("")).rejects.toThrow("Missing authorization code");
  });

  it("reports a failed token exchange as an error", async () => {
    const authorization = await createOAuthMethod(
      deps({ exchangeCode: async () => ({ type: "failed", error: "bad code" }) }),
    ).authorize({ noBrowser: true });
    if (authorization.mode !== "code") throw new Error("expected code mode");
    await expect(authorization.callback("CODE")).rejects.toThrow("bad code");
  });

  it("still returns the credential when saving to the account pool fails", async () => {
    const authorization = await createOAuthMethod(
      deps({
        helpers: helpers({
          persistAccountPool: async () => {
            throw new Error("disk full");
          },
        }),
      }),
    ).authorize({ noBrowser: true });
    if (authorization.mode !== "code") throw new Error("expected code mode");
    await expect(authorization.callback("CODE")).resolves.toMatchObject({ refresh: "r|p|m" });
  });

  it("passes a project id answer through to the authorization request", async () => {
    const createAuthorization = vi.fn(async () => ({ url: AUTH_URL, verifier: "v", projectId: "my-project" }));
    await createOAuthMethod(deps({ createAuthorization })).authorize({ projectId: " my-project " });
    expect(createAuthorization).toHaveBeenCalledWith("my-project");
  });
});

describe("refresh", () => {
  it("returns the refreshed access token", async () => {
    const registration = createOAuthMethod(deps());
    const refreshed = await registration.refresh?.({
      type: "oauth",
      methodID: OAUTH_METHOD_ID,
      refresh: "r|p|m",
      access: "stale",
      expires: 1,
      metadata: { email: "a@example.com" },
    });
    expect(refreshed).toMatchObject({ access: "fresh-access", expires: 9999, metadata: { email: "a@example.com" } });
  });

  it("does not throw when the refresh fails, so requests keep using the account pool", async () => {
    const registration = createOAuthMethod(
      deps({
        refreshToken: async () => {
          throw new Error("invalid_grant");
        },
      }),
    );
    const credential = {
      type: "oauth" as const,
      methodID: OAUTH_METHOD_ID,
      refresh: "r|p|m",
      access: "stale",
      expires: 1,
    };

    const refreshed = await registration.refresh?.(credential);
    expect(refreshed).toMatchObject({ refresh: "r|p|m", access: "stale" });
    // Short expiry so OpenCode retries instead of treating it as valid for an hour.
    expect(refreshed?.expires).toBeGreaterThan(Date.now());
    expect(refreshed?.expires).toBeLessThan(Date.now() + 5 * 60 * 1000);
  });

  it("retries later when the refresh returns nothing", async () => {
    const registration = createOAuthMethod(deps({ refreshToken: async () => undefined }));
    const refreshed = await registration.refresh?.({
      type: "oauth",
      methodID: OAUTH_METHOD_ID,
      refresh: "r|p|m",
      access: "stale",
      expires: 1,
    });
    expect(refreshed?.expires).toBeGreaterThan(Date.now());
  });
});
