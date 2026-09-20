import { afterEach, describe, expect, it } from "vitest";
import { GEMINI_UPSTREAM_ORIGIN, registerProxyRoute } from "./proxy";
import type { ProxyRoute, UpstreamFetch } from "./proxy";

const routes: ProxyRoute[] = [];

async function route(upstream: UpstreamFetch): Promise<ProxyRoute> {
  const created = await registerProxyRoute(upstream);
  routes.push(created);
  return created;
}

afterEach(async () => {
  await Promise.all(routes.splice(0).map((r) => r.dispose()));
});

function sse(text: string): Response {
  return new Response(`data: ${JSON.stringify({ text })}\r\n\r\n`, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

describe("registerProxyRoute", () => {
  it("hands the upstream the original Gemini URL, method, headers and body", async () => {
    const seen: { url?: string; init?: RequestInit } = {};
    const proxied = await route(async (url, init) => {
      seen.url = url;
      seen.init = init;
      return sse("ok");
    });

    const response = await fetch(`${proxied.baseURL}/models/antigravity-gemini-3-pro:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": "antigravity" },
      body: JSON.stringify({ contents: [] }),
    });

    expect(response.status).toBe(200);
    expect(seen.url).toBe(
      `${GEMINI_UPSTREAM_ORIGIN}/v1beta/models/antigravity-gemini-3-pro:streamGenerateContent?alt=sse`,
    );
    expect(seen.init?.method).toBe("POST");
    expect(seen.init?.body).toBe(JSON.stringify({ contents: [] }));
    const headers = seen.init?.headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe("antigravity");
    // Hop-by-hop headers must not reach the pipeline.
    expect(headers).not.toHaveProperty("host");
    expect(headers).not.toHaveProperty("connection");
  });

  it("returns the upstream status, headers and body", async () => {
    const proxied = await route(async () =>
      new Response(JSON.stringify({ error: { code: 429 } }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "30" },
      }),
    );

    const response = await fetch(`${proxied.baseURL}/models/m:generateContent`, { method: "POST", body: "{}" });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(await response.json()).toEqual({ error: { code: 429 } });
  });

  it("streams a chunked response through as it arrives", async () => {
    const proxied = await route(async () => {
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          async start(controller) {
            controller.enqueue(encoder.encode("data: one\r\n\r\n"));
            await new Promise((resolve) => setTimeout(resolve, 10));
            controller.enqueue(encoder.encode("data: two\r\n\r\n"));
            controller.close();
          },
        }),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      );
    });

    const response = await fetch(`${proxied.baseURL}/models/m:streamGenerateContent?alt=sse`, {
      method: "POST",
      body: "{}",
    });
    expect(await response.text()).toBe("data: one\r\n\r\ndata: two\r\n\r\n");
  });

  it("serves a synthetic response the pipeline produced without any network call", async () => {
    const proxied = await route(async () =>
      new Response(JSON.stringify({ error: { message: "quota blocked" } }), {
        status: 429,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await fetch(`${proxied.baseURL}/models/m:generateContent`, { method: "POST", body: "{}" });
    expect((await response.json()).error.message).toBe("quota blocked");
  });

  it("reports an upstream failure as a 502 rather than hanging", async () => {
    const proxied = await route(async () => {
      throw new Error("pipeline exploded");
    });

    const response = await fetch(`${proxied.baseURL}/models/m:generateContent`, { method: "POST", body: "{}" });
    expect(response.status).toBe(502);
    expect((await response.json()).error.message).toContain("pipeline exploded");
  });

  it("rejects an unknown path token with 404", async () => {
    const proxied = await route(async () => sse("ok"));
    const base = new URL(proxied.baseURL);
    const response = await fetch(`${base.origin}/${"0".repeat(32)}/v1beta/models/m:generateContent`, {
      method: "POST",
      body: "{}",
    });
    expect(response.status).toBe(404);
  });

  it("keeps routes isolated from each other", async () => {
    const first = await route(async () => new Response("first", { status: 200 }));
    const second = await route(async () => new Response("second", { status: 200 }));

    expect(await (await fetch(`${first.baseURL}/x`, { method: "POST", body: "{}" })).text()).toBe("first");
    expect(await (await fetch(`${second.baseURL}/x`, { method: "POST", body: "{}" })).text()).toBe("second");
    // Routes share one listener, so they share an origin.
    expect(new URL(first.baseURL).origin).toBe(new URL(second.baseURL).origin);
  });

  it("stops serving a disposed route but keeps the others alive", async () => {
    const first = await route(async () => new Response("first", { status: 200 }));
    const second = await route(async () => new Response("second", { status: 200 }));

    await first.dispose();
    expect((await fetch(`${first.baseURL}/x`, { method: "POST", body: "{}" })).status).toBe(404);
    expect((await fetch(`${second.baseURL}/x`, { method: "POST", body: "{}" })).status).toBe(200);
  });

  it("is safe to dispose twice", async () => {
    const proxied = await route(async () => sse("ok"));
    await proxied.dispose();
    await expect(proxied.dispose()).resolves.toBeUndefined();
  });

  it("listens only on loopback", async () => {
    const proxied = await route(async () => sse("ok"));
    expect(new URL(proxied.baseURL).hostname).toBe("127.0.0.1");
  });

  it("aborts the pipeline when the caller goes away", async () => {
    let aborted = false;
    const proxied = await route(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          });
        }),
    );

    const controller = new AbortController();
    const pending = fetch(`${proxied.baseURL}/models/m:generateContent`, {
      method: "POST",
      body: "{}",
      signal: controller.signal,
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    controller.abort();
    await pending.catch(() => {});

    await expect.poll(() => aborted, { timeout: 2000 }).toBe(true);
  });
});
