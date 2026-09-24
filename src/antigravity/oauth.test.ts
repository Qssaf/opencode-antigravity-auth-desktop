import { afterEach, describe, expect, it, vi } from "vitest";

import { authorizeAntigravity, exchangeAntigravity } from "./oauth";

describe("authorizeAntigravity", () => {
  it("asks Google to show the account chooser so another account can be added", async () => {
    const { url } = await authorizeAntigravity();
    const prompt = new URL(url).searchParams.get("prompt")?.split(" ") ?? [];

    // Without `select_account`, Google silently reuses the browser's current
    // session and a second login returns the account already in the pool.
    expect(prompt).toContain("select_account");
    // `consent` still has to be there, or Google may not issue a refresh token.
    expect(prompt).toContain("consent");
  });

  it("keeps PKCE and offline access on the authorization URL", async () => {
    const authorization = await authorizeAntigravity("my-project");
    const params = new URL(authorization.url).searchParams;

    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("code_challenge")).toBeTruthy();
    expect(params.get("access_type")).toBe("offline");

    const state = JSON.parse(Buffer.from(params.get("state") ?? "", "base64url").toString("utf8"));
    expect(state.verifier).toBe(authorization.verifier);
    expect(state.projectId).toBe("my-project");
  });
});

describe("exchangeAntigravity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("finds the project with a request the backend accepts", async () => {
    const loadBodies: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "access", refresh_token: "refresh", expires_in: 3600 }));
      }
      if (url.includes("userinfo")) {
        return new Response(JSON.stringify({ email: "a@example.com" }));
      }
      if (url.includes(":loadCodeAssist")) {
        const body = JSON.parse(String(init?.body)) as { metadata?: Record<string, unknown> };
        loadBodies.push(body);
        // What the live backend does with a platform field.
        if (body.metadata && "platform" in body.metadata) {
          return new Response("Invalid value at 'metadata.platform'", { status: 400 });
        }
        return new Response(JSON.stringify({ cloudaicompanionProject: "managed-project" }));
      }
      return new Response("unexpected", { status: 500 });
    }));

    const { url } = await authorizeAntigravity();
    const state = new URL(url).searchParams.get("state") ?? "";
    const result = await exchangeAntigravity("code", state);

    expect(result).toMatchObject({ type: "success", projectId: "managed-project" });
    expect(loadBodies[0]).toEqual({ metadata: { ideType: "ANTIGRAVITY" } });
  });
});
