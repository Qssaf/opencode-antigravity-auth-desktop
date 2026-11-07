import { createHash } from "node:crypto";
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

  it("builds the sign-in URL the way the Antigravity CLI does", async () => {
    const { url } = await authorizeAntigravity();
    const parsed = new URL(url);

    expect(`${parsed.origin}${parsed.pathname}`).toBe("https://accounts.google.com/o/oauth2/auth");
    // Go's url.Values.Encode: keys in alphabetical order.
    expect([...parsed.searchParams.keys()]).toEqual([
      "access_type", "client_id", "code_challenge", "code_challenge_method", "prompt",
      "redirect_uri", "response_type", "scope", "state",
    ]);
    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("redirect_uri")).toBe("https://antigravity.google/oauth-callback");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe(
      "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email " +
        "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/cclog " +
        "https://www.googleapis.com/auth/experimentsandconfigs https://www.googleapis.com/auth/aicode openid",
    );
    // 16 random bytes, as agy sends; the PKCE verifier no longer rides in it.
    expect(parsed.searchParams.get("state")).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(url).toContain("&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcloud-platform+https");
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

  it("exchanges the code as the Antigravity CLI does, with the verifier kept in the process", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      if (String(input).includes("/token")) {
        return new Response(JSON.stringify({ access_token: "access", refresh_token: "refresh", expires_in: 3600 }));
      }
      if (String(input).includes("userinfo")) return new Response(JSON.stringify({ email: "a@example.com" }));
      return new Response(JSON.stringify({ cloudaicompanionProject: "managed-project" }));
    }));

    const { url } = await authorizeAntigravity("my-project");
    const params = new URL(url).searchParams;
    const result = await exchangeAntigravity("4/0Acode", params.get("state") ?? "");
    expect(result).toMatchObject({ type: "success", email: "a@example.com", projectId: "my-project" });

    const token = calls.find((call) => call.url === "https://oauth2.googleapis.com/token");
    expect(token?.init?.headers).toEqual({ "Content-Type": "application/x-www-form-urlencoded" });
    const form = new URLSearchParams(String(token?.init?.body));
    expect([...form.keys()]).toEqual(["client_id", "client_secret", "code", "code_verifier", "grant_type", "redirect_uri"]);
    expect(form.get("redirect_uri")).toBe("https://antigravity.google/oauth-callback");
    const verifier = form.get("code_verifier") ?? "";
    // Go's oauth2.GenerateVerifier: 32 random bytes, base64url.
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createHash("sha256").update(verifier).digest("base64url")).toBe(params.get("code_challenge"));
    expect(calls.some((call) => call.url === "https://www.googleapis.com/oauth2/v2/userinfo")).toBe(true);

    // A state is good for one sign-in only.
    expect(await exchangeAntigravity("4/0Acode", params.get("state") ?? "")).toMatchObject({ type: "failed" });
  });

  it("refuses a code for a sign-in this process did not start", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await exchangeAntigravity("4/0Acode", "AAAAAAAAAAAAAAAAAAAAAA");
    expect(result).toMatchObject({ type: "failed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
