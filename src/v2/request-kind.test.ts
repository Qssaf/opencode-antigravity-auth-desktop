import { describe, expect, it, vi } from "vitest";

vi.mock("@opencode-ai/plugin", () => ({
  tool: Object.assign((definition: unknown) => definition, {
    schema: {
      string: () => ({ describe: () => ({}) }),
      boolean: () => ({ optional: () => ({ default: () => ({ describe: () => ({}) }) }) }),
      array: () => ({ optional: () => ({ describe: () => ({}) }) }),
    },
  }),
}));

import { prepareAntigravityRequest } from "../plugin/request";
import { registerProxyRoute } from "./proxy";
import { respondWithoutPipeline } from "./runtime";
import { applyRequestKind, REQUEST_KIND_HEADER } from "./request-kind";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/antigravity-gemini-3.8-flash:streamGenerateContent?alt=sse";
const CLAUDE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/antigravity-claude-opus-4-6-thinking:streamGenerateContent?alt=sse";

function titleInit(kind: string, generationConfig?: Record<string, unknown>): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json", [REQUEST_KIND_HEADER]: kind },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "hi" }] }],
      ...(generationConfig ? { generationConfig } : {}),
    }),
  };
}

function bodyOf(init: RequestInit): Record<string, any> {
  return JSON.parse(init.body as string);
}

describe("applyRequestKind", () => {
  it("caps a Gemini title request at low thinking without thoughts", () => {
    const out = applyRequestKind(
      GEMINI_URL,
      titleInit("title", { maxOutputTokens: 100, thinkingConfig: { thinkingLevel: "high", includeThoughts: true } }),
    );
    expect(bodyOf(out).generationConfig).toEqual({
      maxOutputTokens: 100,
      thinkingConfig: { thinkingLevel: "low", includeThoughts: false },
    });
    expect(new Headers(out.headers).has(REQUEST_KIND_HEADER)).toBe(false);
  });

  it("adds the cap when the title request carries no thinking settings", () => {
    const out = applyRequestKind(GEMINI_URL, titleInit("title"));
    expect(bodyOf(out).generationConfig).toEqual({ thinkingConfig: { thinkingLevel: "low", includeThoughts: false } });
  });

  it("drops a thinking budget, which the pipeline would turn back into a level", () => {
    const out = applyRequestKind(GEMINI_URL, titleInit("title", { thinkingConfig: { thinkingBudget: 32768 } }));
    expect(bodyOf(out).generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low", includeThoughts: false });
  });

  it("leaves primary requests and Claude titles alone apart from the tag", () => {
    const primary = titleInit("primary", { thinkingConfig: { thinkingLevel: "high" } });
    const primaryOut = applyRequestKind(GEMINI_URL, primary);
    expect(primaryOut.body).toBe(primary.body);
    expect(new Headers(primaryOut.headers).has(REQUEST_KIND_HEADER)).toBe(false);

    const claude = titleInit("title", { thinkingConfig: { thinkingBudget: 32768 } });
    expect(applyRequestKind(CLAUDE_URL, claude).body).toBe(claude.body);
  });

  it("returns an untagged request unchanged", () => {
    const init: RequestInit = { method: "POST", headers: { "content-type": "application/json" }, body: "{}" };
    expect(applyRequestKind(GEMINI_URL, init)).toBe(init);
  });

  it("makes the pipeline pick the low 3.8 Flash backend for a title", async () => {
    const out = applyRequestKind(GEMINI_URL, titleInit("title", { thinkingConfig: { thinkingLevel: "high", includeThoughts: true } }));
    const prepared = await prepareAntigravityRequest(GEMINI_URL, out, "token", "project");
    const sent = JSON.parse(prepared.init.body as string);
    expect(sent.model).toBe("gemini-3.8-flash-low");
    expect(sent.request.generationConfig.thinkingConfig).toMatchObject({ thinkingLevel: "low", includeThoughts: false });
  });

  it("receives the tag through the loopback proxy, and strips it", async () => {
    let received: RequestInit | undefined;
    const route = await registerProxyRoute(async (url, init) => {
      received = applyRequestKind(url, init);
      return new Response("{}", { headers: { "content-type": "application/json" } });
    });
    try {
      await fetch(`${route.baseURL}/models/antigravity-gemini-3.8-flash:streamGenerateContent?alt=sse`, titleInit("title"));
    } finally {
      await route.dispose();
    }
    expect(new Headers(received?.headers).has(REQUEST_KIND_HEADER)).toBe(false);
    expect(bodyOf(received!).generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low", includeThoughts: false });
  });
});

describe("respondWithoutPipeline", () => {
  it("explains instead of sending a keyless request to Google", async () => {
    const send = vi.fn(async () => new Response("unexpected"));
    const response = await respondWithoutPipeline(GEMINI_URL, titleInit("primary"), send);
    expect(send).not.toHaveBeenCalled();
    const text = await response.text();
    expect(text).toContain("No usable Google credential");
    expect(text).not.toContain("API key not valid");
  });

  it("still forwards a request that carries the user's own API key, untagged", async () => {
    const send = vi.fn(async (_url: string, _init?: RequestInit) => new Response("ok"));
    const init = titleInit("primary");
    (init.headers as Record<string, string>)["x-goog-api-key"] = "user-key";
    expect(await (await respondWithoutPipeline(GEMINI_URL, init, send)).text()).toBe("ok");
    const forwarded = new Headers(send.mock.calls[0]?.[1]?.headers);
    expect(forwarded.get("x-goog-api-key")).toBe("user-key");
    expect(forwarded.has(REQUEST_KIND_HEADER)).toBe(false);
  });
});
