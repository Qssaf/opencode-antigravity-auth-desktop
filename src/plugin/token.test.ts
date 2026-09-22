import { beforeEach, describe, expect, it, vi } from "vitest";

import { ANTIGRAVITY_PROVIDER_ID } from "../constants";
import {
  getInvalidGrantStrikes,
  isRevokedRefreshToken,
  refreshAccessToken,
  resetTokenRefreshStateForTests,
  TOKEN_REFRESH_TIMEOUT_MS,
} from "./token";
import type { OAuthAuthDetails, PluginClient } from "./types";

const baseAuth: OAuthAuthDetails = {
  type: "oauth",
  refresh: "refresh-token|project-123",
  access: "old-access",
  expires: Date.now() - 1000,
};

function createClient() {
  return {
    auth: {
      set: vi.fn(async () => {}),
    },
  } as PluginClient & {
    auth: { set: ReturnType<typeof vi.fn> };
  };
}

describe("refreshAccessToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetTokenRefreshStateForTests();
  });

  it("gives up on a refresh that never answers, instead of hanging every request", async () => {
    vi.useFakeTimers();
    try {
      // Answers only by rejecting once its signal aborts, like a stalled socket.
      global.fetch = vi.fn(
        (_input: unknown, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          }),
      ) as unknown as typeof fetch;

      const pending = refreshAccessToken(baseAuth, createClient(), ANTIGRAVITY_PROVIDER_ID);
      await vi.advanceTimersByTimeAsync(TOKEN_REFRESH_TIMEOUT_MS);

      await expect(pending).resolves.toBeUndefined();
      // Not an invalid_grant: the account must not be counted as revoked.
      expect(getInvalidGrantStrikes("refresh-token")).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("updates the caller when refresh token is unchanged", async () => {
    const client = createClient();
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          access_token: "new-access",
          expires_in: 3600,
        }),
        { status: 200 },
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await refreshAccessToken(baseAuth, client, ANTIGRAVITY_PROVIDER_ID);

    expect(result?.access).toBe("new-access");
    expect(client.auth.set.mock.calls.length).toBe(0);
  });

  it("handles Google refresh token rotation", async () => {
    const client = createClient();
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          access_token: "next-access",
          expires_in: 3600,
          refresh_token: "rotated-token",
        }),
        { status: 200 },
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await refreshAccessToken(baseAuth, client, ANTIGRAVITY_PROVIDER_ID);

    expect(result?.access).toBe("next-access");
    expect(result?.refresh).toContain("rotated-token");
    expect(client.auth.set.mock.calls.length).toBe(0);
  });

  it("throws a typed error on invalid_grant", async () => {
    const client = createClient();
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Refresh token revoked",
        }),
        { status: 400, statusText: "Bad Request" },
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(refreshAccessToken(baseAuth, client, ANTIGRAVITY_PROVIDER_ID)).rejects.toMatchObject({
      name: "AntigravityTokenRefreshError",
      code: "invalid_grant",
    });
  });

  it("coalesces concurrent refreshes of the same token into one request", async () => {
    const client = createClient();
    let resolveResponse: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn(async () => {
      await gate;
      return new Response(
        JSON.stringify({ access_token: "shared-access", expires_in: 3600 }),
        { status: 200 },
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const calls = [
      refreshAccessToken(baseAuth, client, ANTIGRAVITY_PROVIDER_ID),
      refreshAccessToken(baseAuth, client, ANTIGRAVITY_PROVIDER_ID),
      refreshAccessToken({ ...baseAuth, access: "other" }, client, ANTIGRAVITY_PROVIDER_ID),
    ];
    resolveResponse?.();
    const results = await Promise.all(calls);

    // Google rejects concurrent refreshes of one token with invalid_grant, so
    // every caller has to share a single request.
    expect(fetchMock.mock.calls.length).toBe(1);
    for (const result of results) {
      expect(result?.access).toBe("shared-access");
    }
  });

  it("keeps the caller's project ids when it adopts a shared refresh", async () => {
    const client = createClient();
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({ access_token: "shared-access", expires_in: 3600 }),
        { status: 200 },
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const [plain, managed] = await Promise.all([
      refreshAccessToken(baseAuth, client, ANTIGRAVITY_PROVIDER_ID),
      refreshAccessToken(
        { ...baseAuth, refresh: "refresh-token|project-123|managed-456" },
        client,
        ANTIGRAVITY_PROVIDER_ID,
      ),
    ]);

    expect(fetchMock.mock.calls.length).toBe(1);
    expect(plain?.refresh).toBe("refresh-token|project-123");
    expect(managed?.refresh).toBe("refresh-token|project-123|managed-456");
  });

  it("treats a single invalid_grant as unconfirmed and a repeat as revoked", async () => {
    const client = createClient();
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({ error: "invalid_grant", error_description: "Bad Request" }),
        { status: 400, statusText: "Bad Request" },
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(refreshAccessToken(baseAuth, client, ANTIGRAVITY_PROVIDER_ID)).rejects.toThrow();
    expect(getInvalidGrantStrikes("refresh-token")).toBe(1);
    expect(isRevokedRefreshToken("refresh-token")).toBe(false);

    await expect(refreshAccessToken(baseAuth, client, ANTIGRAVITY_PROVIDER_ID)).rejects.toThrow();
    expect(isRevokedRefreshToken("refresh-token")).toBe(true);
  });

  it("forgets invalid_grant strikes once a refresh succeeds", async () => {
    const client = createClient();
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({ error: "invalid_grant" }),
        { status: 400, statusText: "Bad Request" },
      );
    }) as unknown as typeof fetch;
    await expect(refreshAccessToken(baseAuth, client, ANTIGRAVITY_PROVIDER_ID)).rejects.toThrow();
    expect(getInvalidGrantStrikes("refresh-token")).toBe(1);

    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({ access_token: "fresh", expires_in: 3600 }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    await refreshAccessToken(baseAuth, client, ANTIGRAVITY_PROVIDER_ID);

    expect(getInvalidGrantStrikes("refresh-token")).toBe(0);
    expect(isRevokedRefreshToken("refresh-token")).toBe(false);
  });
});
