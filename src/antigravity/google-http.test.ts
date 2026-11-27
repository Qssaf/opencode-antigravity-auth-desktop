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

    // Bundled to plain JavaScript first: Node 20 (CI, and the engines floor) cannot import a .ts file.
    const { build } = await import("esbuild");
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { fileURLToPath, pathToFileURL } = await import("node:url");
    const dir = await mkdtemp(join(tmpdir(), "google-http-"));
    const outfile = join(dir, "google-http.mjs");
    await build({
      entryPoints: [fileURLToPath(new URL("./google-http.ts", import.meta.url))],
      bundle: true, format: "esm", platform: "node", outfile, logLevel: "silent",
    });
    const script = `import(${JSON.stringify(pathToFileURL(outfile).href)}).then(({ googleRequest }) =>
      googleRequest(${JSON.stringify(`${origin}/token`)}, { method: "POST", body: "{}" }))
      .then((res) => res.text()).then((text) => console.log("answer:" + text));`;
    const { execFile } = await import("node:child_process");
    const stdout = await new Promise<string>((resolve, reject) =>
      execFile(process.execPath, ["--input-type=module", "-e", script], { timeout: 10_000 }, (error, out) =>
        error ? reject(error) : resolve(out)))
      .finally(() => rm(dir, { recursive: true, force: true }));

    expect(stdout).toContain("answer:ok");
  });

  it("lets a short-lived process exit when the server never closes its side of the connection", async () => {
    const server = createServer((_req, res) => res.end("ok"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const upstreamPort = (server.address() as AddressInfo).port;
    // A middlebox that swallows the client's FIN: the client's socket stays
    // half-closed (FIN-WAIT-2), as seen on a hung `antigravity-accounts quota`.
    const { connect, createServer: createTcpServer } = await import("node:net");
    const proxy = createTcpServer({ allowHalfOpen: true }, (client) => {
      const upstream = connect(upstreamPort, "127.0.0.1");
      client.on("data", (chunk) => upstream.write(chunk));
      upstream.on("data", (chunk) => client.write(chunk));
      client.on("error", () => upstream.destroy());
      upstream.on("error", () => client.destroy());
      client.on("close", () => upstream.destroy());
    });
    await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
    close = () => {
      proxy.close();
      server.close();
    };
    const origin = `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`;

    const { build } = await import("esbuild");
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { fileURLToPath, pathToFileURL } = await import("node:url");
    const dir = await mkdtemp(join(tmpdir(), "google-http-"));
    const outfile = join(dir, "google-http.mjs");
    await build({
      entryPoints: [fileURLToPath(new URL("./google-http.ts", import.meta.url))],
      bundle: true, format: "esm", platform: "node", outfile, logLevel: "silent",
    });
    const script = `import(${JSON.stringify(pathToFileURL(outfile).href)}).then(({ googleRequest }) =>
      googleRequest(${JSON.stringify(`${origin}/token`)}, { method: "POST", body: "{}" }))
      .then((res) => res.text()).then((text) => console.log("answer:" + text));`;
    const { execFile } = await import("node:child_process");
    const started = Date.now();
    const result = await new Promise<{ killed: boolean; stdout: string }>((resolve) =>
      execFile(process.execPath, ["--input-type=module", "-e", script], { timeout: 6_000 }, (error, stdout) =>
        resolve({ killed: Boolean(error?.killed), stdout })))
      .finally(() => rm(dir, { recursive: true, force: true }));

    expect(result.stdout).toContain("answer:ok");
    expect(result.killed).toBe(false);
    expect(Date.now() - started).toBeLessThan(5_000);
  }, 15_000);

  it("drops a closed connection whose server never closes its side", async () => {
    const server = createServer((_req, res) => res.end("ok"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const upstreamPort = (server.address() as AddressInfo).port;
    const { connect, createServer: createTcpServer } = await import("node:net");
    // Swallows the client's FIN, then writes to it later: the write only fails
    // (the socket closes with an error) once the client has really let go.
    let dropped: Promise<boolean> | undefined;
    const proxy = createTcpServer({ allowHalfOpen: true }, (client) => {
      const upstream = connect(upstreamPort, "127.0.0.1");
      client.on("data", (chunk) => upstream.write(chunk));
      upstream.on("data", (chunk) => client.write(chunk));
      upstream.on("error", () => client.destroy());
      client.on("close", () => upstream.destroy());
      dropped = new Promise<boolean>((resolve) => {
        client.on("error", () => resolve(true));
        client.on("end", () => {
          setTimeout(() => client.write("x"), 1_800);
          setTimeout(() => client.write("x"), 2_000);
          setTimeout(() => resolve(false), 2_600);
        });
      });
    });
    await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
    close = () => {
      proxy.close();
      server.close();
    };

    const response = await googleRequest(`http://127.0.0.1:${(proxy.address() as AddressInfo).port}/token`, {
      method: "POST",
      body: "{}",
    });
    expect(await response.text()).toBe("ok");
    expect(await dropped).toBe(true);
  }, 10_000);

  it("lets a short-lived process exit after an answer without a body", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(204);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    close = () => server.close();
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const { build } = await import("esbuild");
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { fileURLToPath, pathToFileURL } = await import("node:url");
    const dir = await mkdtemp(join(tmpdir(), "google-http-"));
    const outfile = join(dir, "google-http.mjs");
    await build({
      entryPoints: [fileURLToPath(new URL("./google-http.ts", import.meta.url))],
      bundle: true, format: "esm", platform: "node", outfile, logLevel: "silent",
    });
    const script = `import(${JSON.stringify(pathToFileURL(outfile).href)}).then(({ googleRequest }) =>
      googleRequest(${JSON.stringify(`${origin}/revoke`)}, { method: "POST", body: "{}" }))
      .then((res) => console.log("status:" + res.status));`;
    const { execFile } = await import("node:child_process");
    const result = await new Promise<{ killed: boolean; stdout: string }>((resolve) =>
      execFile(process.execPath, ["--input-type=module", "-e", script], { timeout: 6_000 }, (error, stdout) =>
        resolve({ killed: Boolean(error?.killed), stdout })))
      .finally(() => rm(dir, { recursive: true, force: true }));

    expect(result.stdout).toContain("status:204");
    expect(result.killed).toBe(false);
  }, 15_000);

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

