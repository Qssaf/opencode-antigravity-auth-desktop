import { createServer } from "node:http2";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";

// test-setup.ts routes googleRequest through fetch for every other test.
const { googleFetch, googleRequest, GO_HTTP2_USER_AGENT } =
  await vi.importActual<typeof import("./google-http")>("./google-http");

describe("googleRequest", () => {
  let close: (() => void) | undefined;
  afterEach(() => close?.());

  async function serve(reply: (body: string) => { status: number; body: Buffer; headers?: Record<string, string> }) {
    const seen: Array<{ headers: Record<string, unknown>; body: string }> = [];
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        seen.push({ headers: { ...req.headers }, body });
        const answer = reply(body);
        res.writeHead(answer.status, answer.headers ?? {});
        res.end(answer.body);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    close = () => server.close();
    return { origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, seen };
  }

  it("sends exactly the headers Go's HTTP/2 client sends, and decodes gzip", async () => {
    const { origin, seen } = await serve(() => ({
      status: 200,
      body: gzipSync('{"access_token":"a"}'),
      headers: { "content-type": "application/json", "content-encoding": "gzip" },
    }));

    const response = await googleRequest(`${origin}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "a=1&b=2",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ access_token: "a" });
    const { headers, body } = seen[0]!;
    expect(body).toBe("a=1&b=2");
    expect(Object.keys(headers).filter((name) => !name.startsWith(":")).sort()).toEqual([
      "accept-encoding", "content-length", "content-type", "user-agent",
    ]);
    expect(headers["user-agent"]).toBe(GO_HTTP2_USER_AGENT);
    expect(headers["accept-encoding"]).toBe("gzip");
    expect(headers[":method"]).toBe("POST");
    expect(headers[":path"]).toBe("/token");
    expect(headers[":authority"]).toBe(new URL(origin).host);
  });

  it("returns error statuses as responses", async () => {
    const { origin } = await serve(() => ({ status: 400, body: Buffer.from('{"error":"invalid_grant"}') }));
    const response = await googleRequest(`${origin}/token`, { method: "POST", body: "x=1" });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("invalid_grant");
  });

  it("rejects when aborted", async () => {
    const { origin } = await serve(() => ({ status: 200, body: Buffer.from("{}") }));
    const controller = new AbortController();
    controller.abort(new Error("stop"));
    await expect(googleRequest(`${origin}/x`, { method: "GET", signal: controller.signal })).rejects.toThrow("stop");
  });

  it("streams the body as it arrives and keeps one connection per account", async () => {
    const sessions = new Map<string, Set<unknown>>();
    const server = createServer((req, res) => {
      const auth = String(req.headers.authorization);
      if (!sessions.has(auth)) sessions.set(auth, new Set());
      sessions.get(auth)!.add(req.stream.session);
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write("data: first\n\n");
      setTimeout(() => res.end("data: second\n\n"), 50);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    close = () => server.close();
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const read = async (auth: string) => {
      const response = await googleFetch(`${origin}/stream`, { method: "POST", headers: { Authorization: auth }, body: "{}" });
      const reader = response.body!.getReader();
      const first = new TextDecoder().decode((await reader.read()).value);
      let rest = "";
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) rest += new TextDecoder().decode(chunk.value);
      return { first, rest };
    };

    // The first event is readable before the server finishes.
    expect(await read("Bearer a")).toEqual({ first: "data: first\n\n", rest: "data: second\n\n" });
    await read("Bearer a");
    await read("Bearer b");
    expect(sessions.get("Bearer a")?.size).toBe(1);
    expect(sessions.get("Bearer b")?.size).toBe(1);
    expect([...sessions.get("Bearer a")!][0]).not.toBe([...sessions.get("Bearer b")!][0]);
  });

  it("errors the body when the server resets the stream mid-answer", async () => {
    const server = createServer((req, res) => {
      res.writeHead(200);
      res.write("data: partial\n\n");
      setTimeout(() => req.stream.close(8), 20);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    close = () => server.close();
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const response = await googleFetch(`${origin}/x`, { method: "POST", body: "{}" });
    await expect(response.text()).rejects.toThrow();
  });

  it("retries on a new connection only a request the server refused unprocessed", async () => {
    let hits = 0;
    const server = createServer((req, res) => {
      hits += 1;
      if (hits === 2) {
        // Received and then failed: Go does not send it again.
        req.stream.close(2);
        return;
      }
      if (hits === 3) {
        // REFUSED_STREAM: not processed, safe to send again.
        req.stream.close(7);
        return;
      }
      res.writeHead(200);
      res.end("ok");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    close = () => server.close();
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const send = () => googleFetch(`${origin}/x`, { method: "POST", headers: { Authorization: "Bearer r" }, body: "{}" });

    expect(await (await send()).text()).toBe("ok");
    await expect(send()).rejects.toThrow();
    expect(hits).toBe(2);
    expect(await (await send()).text()).toBe("ok");
    expect(hits).toBe(4);
  });

  it("keeps a short-lived process (the accounts CLI) alive until the answer arrives", async () => {
    const server = createServer((_req, res) => {
      setTimeout(() => res.end("ok"), 300);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    close = () => server.close();
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const module = new URL("./google-http.ts", import.meta.url).href;
    const script = `import(${JSON.stringify(module)}).then(({ googleRequest }) =>
      googleRequest(${JSON.stringify(`${origin}/token`)}, { method: "POST", body: "{}" }))
      .then((res) => res.text()).then((text) => console.log("answer:" + text));`;
    const { execFile } = await import("node:child_process");
    const stdout = await new Promise<string>((resolve, reject) =>
      execFile(process.execPath, ["--input-type=module", "-e", script], { timeout: 10_000 }, (error, out) =>
        error ? reject(error) : resolve(out)));

    expect(stdout).toContain("answer:ok");
  });

  it("fails at once when no connection can be made", async () => {
    const server = createServer(() => {});
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    await new Promise<void>((resolve) => server.close(() => resolve()));

    const started = Date.now();
    await expect(googleFetch(`http://127.0.0.1:${port}/x`, { method: "POST", body: "{}" })).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

