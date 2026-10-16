import { beforeAll, describe, expect, it, vi } from "vitest";
import type { HeaderStyle, ModelFamily } from "./accounts";
import { resetAgySdkCredentialStateForTests } from "./api-key";
import type { AgySdkCredential } from "./api-key";

/** Promise.withResolvers stand-in: that API needs Node 22, and CI runs Node 20. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

type ResolveHeaderRoutingDecision = (urlString: string) => {
  preferredHeaderStyle: HeaderStyle;
  explicitQuota: boolean;
};

type CreateSoftQuotaBlockedResponse = (input: {
  accountCount: number;
  family: ModelFamily;
  threshold: number;
  waitMs: number | null;
  requestedModel?: string;
}) => Response;

type VerifyAccountAccess = (
  account: {
    refreshToken: string;
    email?: string;
    projectId?: string;
    managedProjectId?: string;
  },
  client: unknown,
  providerId: string,
) => Promise<{ status: string; message: string; verifyUrl?: string }>;

type TryFetchWithAgySdkCredentials = (
  input: RequestInfo,
  init: RequestInit | undefined,
  credentials: AgySdkCredential[],
  fallbackRetryAfterMs: number,
) => Promise<Response | null>;

let resolveHeaderRoutingDecision: ResolveHeaderRoutingDecision | undefined;
let createSoftQuotaBlockedResponse: CreateSoftQuotaBlockedResponse | undefined;
let tryFetchWithAgySdkCredentials: TryFetchWithAgySdkCredentials | undefined;
let verifyAccountAccess: VerifyAccountAccess | undefined;

beforeAll(async () => {
  vi.mock("@opencode-ai/plugin", () => ({
    tool: vi.fn(),
  }));

  const { __testExports } = await import("../plugin");
  resolveHeaderRoutingDecision = (__testExports as {
    resolveHeaderRoutingDecision?: ResolveHeaderRoutingDecision;
  }).resolveHeaderRoutingDecision;
  createSoftQuotaBlockedResponse = (__testExports as {
    createSoftQuotaBlockedResponse?: CreateSoftQuotaBlockedResponse;
  }).createSoftQuotaBlockedResponse;
  tryFetchWithAgySdkCredentials = (__testExports as {
    tryFetchWithAgySdkCredentials?: TryFetchWithAgySdkCredentials;
  }).tryFetchWithAgySdkCredentials;
  verifyAccountAccess = (__testExports as {
    verifyAccountAccess?: VerifyAccountAccess;
  }).verifyAccountAccess;
});

describe("API-key fallback credentials", () => {
  it("tries a later API key when the first credential is forbidden", async () => {
    resetAgySdkCredentialStateForTests();
    const fetchMock = vi.fn(async (_input: RequestInfo, init?: RequestInit) => {
      const apiKey = new Headers(init?.headers).get("x-goog-api-key");
      return apiKey === "bad-key"
        ? new Response("forbidden", { status: 403 })
        : new Response("ok", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      const response = await tryFetchWithAgySdkCredentials?.(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",
        { method: "POST", body: "{}" },
        [
          { label: "bad", apiKey: "bad-key" },
          { label: "good", apiKey: "good-key" },
        ],
        60_000,
      );

      expect(response?.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("tries every available key when concurrent requests advance the shared cursor", async () => {
    resetAgySdkCredentialStateForTests();
    const badRequestStarted = deferred();
    const releaseBadRequest = deferred();
    const fetchMock = vi.fn(async (_input: RequestInfo, init?: RequestInit) => {
      const apiKey = new Headers(init?.headers).get("x-goog-api-key");
      if (apiKey === "bad-key") {
        badRequestStarted.resolve();
        await releaseBadRequest.promise;
        return new Response("forbidden", { status: 403 });
      }
      return new Response("ok", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const credentials = [
      { label: "bad", apiKey: "bad-key" },
      { label: "good", apiKey: "good-key" },
    ];

    try {
      const firstResponsePromise = tryFetchWithAgySdkCredentials?.(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",
        { method: "POST", body: "{}" },
        credentials,
        60_000,
      );
      await badRequestStarted.promise;

      const secondResponse = await tryFetchWithAgySdkCredentials?.(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",
        { method: "POST", body: "{}" },
        credentials,
        60_000,
      );
      releaseBadRequest.resolve();
      const firstResponse = await firstResponsePromise;

      expect(secondResponse?.status).toBe(200);
      expect(firstResponse?.status).toBe(200);
    } finally {
      releaseBadRequest.resolve();
      vi.unstubAllGlobals();
    }
  });
});

describe("header routing decision", () => {
  // Google deprecated the Gemini CLI quota: every model uses Antigravity's.
  it.each([
    ["gemini-3.8-flash", false],
    ["gemini-3-flash", false],
    ["gemini-3.1-pro", false],
    ["antigravity-gemini-3.8-flash", true],
    ["antigravity-gemini-4-argon", true],
    ["gemini-3-pro-image", true],
    ["claude-opus-4-6-thinking", false],
  ])("routes %s to the Antigravity quota (explicit: %s)", (model, explicitQuota) => {
    const decision = resolveHeaderRoutingDecision?.(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent`,
    );
    expect(decision).toEqual({ preferredHeaderStyle: "antigravity", explicitQuota });
  });
});

describe("quota blocked responses", () => {
  it("returns a synthetic stream instead of throwing when API-key fallback is disabled", async () => {
    const response = createSoftQuotaBlockedResponse?.({
      accountCount: 2,
      family: "gemini",
      threshold: 90,
      waitMs: null,
      requestedModel: "antigravity-gemini-3-pro",
    });

    expect(response).toBeInstanceOf(Response);
    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toContain("text/event-stream");

    const body = await response!.text();
    expect(body).toContain("Quota protection: All 2 account(s) are over 90% usage for gemini.");
    expect(body).toContain("Quota resets in unknown.");
    expect(body).toContain("api_key_fallback");
    expect(body).toContain("antigravity-gemini-3-pro");
  });

  it("emits Gemini-format SSE (not Claude-format) for a Gemini request", async () => {
    const response = createSoftQuotaBlockedResponse?.({
      accountCount: 2,
      family: "gemini",
      threshold: 90,
      waitMs: null,
      requestedModel: "antigravity-gemini-3-pro",
    });

    const body = await response!.text();
    // OpenCode parses Gemini responses as { candidates: [...] }; a Claude-shaped
    // SSE stream (content_block_delta) is unparseable for a Gemini request and
    // leaves the request hanging.
    expect(body).toContain("candidates");
    expect(body).toContain("finishReason");
    expect(body).not.toContain("content_block_delta");
    expect(body).not.toContain("message_start");
  });
});

describe("account verification probe", () => {
  it("does not send x-goog-user-project when probing Antigravity access", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = input.toString();
      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "access-token", expires_in: 3600 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("", { status: 200 });
    });

    const client = {
      auth: {
        get: vi.fn().mockResolvedValue({
          data: {
            type: "oauth",
            refresh: "refresh-token|user-project|managed-project",
            access: "access-token",
            expires: Date.now() + 3_600_000,
          },
        }),
      },
    };

    try {
      const result = await verifyAccountAccess?.(
        {
          refreshToken: "refresh-token",
          projectId: "user-project",
          managedProjectId: "managed-project",
        },
        client,
        "google",
      );

      expect(result?.status).toBe("ok");
      const [url, init] = fetchMock.mock.calls[1]!;
      expect(url.toString()).toContain("daily-cloudcode-pa.googleapis.com");
      const headers = new Headers(init?.headers);
      expect(headers.get("x-goog-user-project")).toBeNull();
      expect(JSON.parse(String(init?.body))).toMatchObject({
        project: "managed-project",
      });
    } finally {
      fetchMock.mockRestore();
    }
  });
});
