import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import type { AddressInfo, Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { afterEach, describe, expect, it } from "vitest";

import { GO_HTTP1_USER_AGENT, googleHttp1Fetch } from "./google-http1";

interface SeenRequest {
  /** The request line and headers exactly as they arrived. */
  head: string;
  body: string;
  connection: number;
}

describe("googleHttp1Fetch", () => {
  let close: (() => void) | undefined;
  afterEach(() => close?.());

  /** A raw TCP server: `reply` writes whatever bytes it wants for each request. */
  async function serve(reply: (socket: Socket, request: SeenRequest, index: number) => void) {
    const seen: SeenRequest[] = [];
    const sockets = new Set<Socket>();
    let connections = 0;
    const server = createServer((socket) => {
      const connection = ++connections;
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
      socket.on("error", () => {});
      let buffer = Buffer.alloc(0);
      socket.on("data", (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        for (;;) {
          const end = buffer.indexOf("\r\n\r\n");
          if (end < 0) return;
          const head = buffer.subarray(0, end).toString("latin1");
          const length = Number(/^content-length: (\d+)$/im.exec(head)?.[1] ?? 0);
          if (buffer.length < end + 4 + length) return;
          const request = { head, body: buffer.subarray(end + 4, end + 4 + length).toString("utf8"), connection };
          buffer = buffer.subarray(end + 4 + length);
          seen.push(request);
          reply(socket, request, seen.length - 1);
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    close = () => {
      for (const socket of sockets) socket.destroy();
      server.close();
    };
    const { port } = server.address() as AddressInfo;
    return { origin: `http://127.0.0.1:${port}`, host: `127.0.0.1:${port}`, seen, connections: () => connections };
  }

  const ok = (body: string, extra = "") =>
    `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n${extra}Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;

  it("writes a request with a body byte for byte as agy's Go client does", async () => {
    const { origin, host, seen } = await serve((socket) => socket.write(ok('{"ok":true}')));

    const response = await googleHttp1Fetch(`${origin}/v1internal:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "content-type": "application/json", "User-Agent": "antigravity/cli/9.9.9 (x)", authorization: "Bearer t" },
      body: '{"é":1}',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(seen[0]!.body).toBe('{"é":1}');
    expect(seen[0]!.head.split("\r\n")).toEqual([
      "POST /v1internal:streamGenerateContent?alt=sse HTTP/1.1",
      `Host: ${host}`,
      "User-Agent: antigravity/cli/9.9.9 (x)",
      "Content-Length: 8",
      "Authorization: Bearer t",
      "Content-Type: application/json",
      "Accept-Encoding: gzip",
    ]);
  });

  it("writes a request without a body as Go does, with Go's own User-Agent when none is given", async () => {
    const { origin, host, seen } = await serve((socket) => socket.write(ok("{}")));

    await (await googleHttp1Fetch(`${origin}/v1internal/cascadeNuxes?page_size=1000`, {
      headers: { "x-goog-user-project": "p", Authorization: "Bearer t" },
    })).text();
    await (await googleHttp1Fetch(`${origin}/empty`, { method: "POST" })).text();

    expect(seen[0]!.head.split("\r\n")).toEqual([
      "GET /v1internal/cascadeNuxes?page_size=1000 HTTP/1.1",
      `Host: ${host}`,
      `User-Agent: ${GO_HTTP1_USER_AGENT}`,
      "Authorization: Bearer t",
      "X-Goog-User-Project: p",
      "Accept-Encoding: gzip",
    ]);
    expect(seen[1]!.head.split("\r\n")).toEqual([
      "POST /empty HTTP/1.1",
      `Host: ${host}`,
      `User-Agent: ${GO_HTTP1_USER_AGENT}`,
      "Content-Length: 0",
      "Accept-Encoding: gzip",
    ]);
  });

  it("delivers a chunked, gzipped stream as it arrives", async () => {
    const gz = gzipSync("data: one\n\ndata: two\n\n");
    const chunk = (bytes: Buffer) => Buffer.concat([Buffer.from(`${bytes.length.toString(16)}\r\n`), bytes, Buffer.from("\r\n")]);
    let finishAnswer = () => {};
    const { origin } = await serve((socket) => {
      socket.write("HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nContent-Encoding: gzip\r\nTransfer-Encoding: chunked\r\n\r\n");
      // Split in the middle of a chunk and of the gzip stream.
      const framed = chunk(gz);
      socket.write(framed.subarray(0, 7));
      finishAnswer = () => socket.write(Buffer.concat([framed.subarray(7), Buffer.from("0\r\n\r\n")]));
    });

    const response = await googleHttp1Fetch(`${origin}/stream`, { method: "POST", body: "{}" });
    // The response is there before the body is complete.
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("content-encoding")).toBeNull();
    finishAnswer();
    expect(await response.text()).toBe("data: one\n\ndata: two\n\n");
  });

  it("hands over plain chunks before the answer ends", async () => {
    let finishAnswer = () => {};
    const { origin } = await serve((socket) => {
      socket.write("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n5\r\nfirst\r\n");
      finishAnswer = () => socket.write("6\r\nsecond\r\n0\r\n\r\n");
    });

    const response = await googleHttp1Fetch(`${origin}/stream`, { method: "POST", body: "{}" });
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("first");
    finishAnswer();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("second");
    expect((await reader.read()).done).toBe(true);
  });

  it("keeps a connection per account and opens another for a request made meanwhile", async () => {
    const waiting: Array<() => void> = [];
    const { origin, seen, connections } = await serve((socket, request) => {
      if (request.head.includes("/slow")) waiting.push(() => socket.write(ok("slow")));
      else socket.write(ok("fast"));
    });
    const a = { Authorization: "Bearer a" };

    await (await googleHttp1Fetch(`${origin}/1`, { headers: a })).text();
    await (await googleHttp1Fetch(`${origin}/2`, { headers: a })).text();
    expect(connections()).toBe(1);

    await (await googleHttp1Fetch(`${origin}/3`, { headers: { Authorization: "Bearer b" } })).text();
    expect(connections()).toBe(2);

    const slow = googleHttp1Fetch(`${origin}/slow`, { headers: a });
    await expect.poll(() => waiting.length).toBe(1);
    await (await googleHttp1Fetch(`${origin}/4`, { headers: a })).text();
    expect(connections()).toBe(3);
    waiting[0]!();
    expect(await (await slow).text()).toBe("slow");
    expect(seen.map((request) => request.connection)).toEqual([1, 1, 2, 1, 3]);
  });

  it("does not reuse a connection the server said it would close, or one asked for without reuse", async () => {
    const { origin, connections } = await serve((socket) => socket.write(ok("{}", "Connection: close\r\n")));
    await (await googleHttp1Fetch(`${origin}/1`)).text();
    await (await googleHttp1Fetch(`${origin}/2`)).text();
    expect(connections()).toBe(2);

    await (await googleHttp1Fetch(`${origin}/3`, {}, false)).text();
    await (await googleHttp1Fetch(`${origin}/4`, {}, false)).text();
    expect(connections()).toBe(4);
  });

  it("sends a GET again on a new connection when the kept one was closed before any answer", async () => {
    const { origin, seen, connections } = await serve((socket, _request, index) => {
      if (index === 0) socket.write(ok("first"));
      // The second request arrives on the kept connection: drop it unanswered.
      else if (index === 1) socket.destroy();
      else socket.write(ok("third"));
    });

    expect(await (await googleHttp1Fetch(`${origin}/1`)).text()).toBe("first");
    expect(await (await googleHttp1Fetch(`${origin}/2`)).text()).toBe("third");
    expect(connections()).toBe(2);
    expect(seen.map((request) => request.head.split(" ")[1])).toEqual(["/1", "/2", "/2"]);
  });

  it("never sends a POST twice: the server may have run it before the connection dropped", async () => {
    const { origin, seen } = await serve((socket, _request, index) => {
      if (index === 0) socket.write(ok("first"));
      else setTimeout(() => socket.destroy(), 20);
    });

    expect(await (await googleHttp1Fetch(`${origin}/1`, { method: "POST", body: "a" })).text()).toBe("first");
    await expect(googleHttp1Fetch(`${origin}/2`, { method: "POST", body: "b" })).rejects.toThrow(/closed/i);
    expect(seen.map((request) => request.body)).toEqual(["a", "b"]);
  });

  it("ends a gzipped answer that states its length, and keeps the connection", async () => {
    const gz = gzipSync('{"error":{"code":429}}');
    const { origin, connections } = await serve((socket, request) => {
      if (request.head.includes("/empty")) socket.write("HTTP/1.1 200 OK\r\nContent-Encoding: gzip\r\nContent-Length: 0\r\n\r\n");
      else socket.write(Buffer.concat([Buffer.from(`HTTP/1.1 429 Too Many Requests\r\nContent-Encoding: gzip\r\nContent-Length: ${gz.length}\r\n\r\n`), gz]));
    });

    const limited = await googleHttp1Fetch(`${origin}/limited`, { method: "POST", body: "{}" });
    expect(await limited.text()).toBe('{"error":{"code":429}}');
    expect(await (await googleHttp1Fetch(`${origin}/empty`, { method: "POST", body: "{}" })).text()).toBe("");
    expect(connections()).toBe(1);
  });

  it("rejects an answer it cannot read instead of throwing inside the socket", async () => {
    const { origin } = await serve((socket, request) => {
      socket.write(request.head.includes("/status") ? "HTTP/1.1 999 Odd\r\nContent-Length: 0\r\n\r\n" : "HTTP/1.1 200 OK\r\nX Bad: 1\r\nContent-Length: 0\r\n\r\n");
    });
    await expect(googleHttp1Fetch(`${origin}/status`)).rejects.toThrow();
    await expect(googleHttp1Fetch(`${origin}/header`)).rejects.toThrow();
  });

  it("stops receiving a gzipped stream once it turns out corrupt", async () => {
    let closedByClient = false;
    const { origin } = await serve((socket) => {
      socket.on("close", () => (closedByClient = true));
      // A stream that would go on: no final chunk.
      socket.write("HTTP/1.1 200 OK\r\nContent-Encoding: gzip\r\nTransfer-Encoding: chunked\r\n\r\n9\r\nnot gzip!\r\n");
    });
    await expect((await googleHttp1Fetch(`${origin}/bad`, { method: "POST", body: "{}" })).text()).rejects.toThrow();
    await expect.poll(() => closedByClient).toBe(true);
  });

  it("errors an answer without a length that a reset cut short", async () => {
    const { origin } = await serve((socket) => {
      socket.write("HTTP/1.1 200 OK\r\n\r\npartial-");
      setTimeout(() => socket.resetAndDestroy(), 20);
    });
    await expect((await googleHttp1Fetch(`${origin}/1`)).text()).rejects.toThrow();
  });

  it("does not keep a connection that still has request bytes to write", async () => {
    let connections = 0;
    const sockets = new Set<Socket>();
    const server = createServer((socket) => {
      connections += 1;
      sockets.add(socket);
      socket.on("error", () => {});
      // Answer on the first bytes and stop reading: most of the body never leaves the client.
      socket.once("data", () => {
        socket.pause();
        socket.write("HTTP/1.1 400 Bad Request\r\nContent-Length: 3\r\n\r\nbad");
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    close = () => {
      for (const socket of sockets) socket.destroy();
      server.close();
    };
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const early = await googleHttp1Fetch(`${origin}/big`, { method: "POST", body: Buffer.alloc(32 * 1024 * 1024, 97) });
    expect(await early.text()).toBe("bad");
    const next = await googleHttp1Fetch(`${origin}/next`, { method: "POST", body: "{}" });
    expect(await next.text()).toBe("bad");
    expect(connections).toBe(2);
  });

  it("fails, without sending again, when a new connection is closed before any answer", async () => {
    const { origin, seen } = await serve((socket) => socket.destroy());
    await expect(googleHttp1Fetch(`${origin}/1`, { method: "POST", body: "a" }, false)).rejects.toThrow(/closed/i);
    expect(seen).toHaveLength(1);
  });

  it("errors the body when the connection drops mid-answer", async () => {
    const { origin } = await serve((socket) => {
      socket.write("HTTP/1.1 200 OK\r\nContent-Length: 100\r\n\r\npartial");
      setTimeout(() => socket.destroy(), 20);
    });
    const response = await googleHttp1Fetch(`${origin}/1`);
    await expect(response.text()).rejects.toThrow(/closed/i);
  });

  it("reads an answer that only ends when the connection closes", async () => {
    const { origin, connections } = await serve((socket) => socket.end("HTTP/1.1 200 OK\r\n\r\nuntil close"));
    expect(await (await googleHttp1Fetch(`${origin}/1`)).text()).toBe("until close");
    expect(await (await googleHttp1Fetch(`${origin}/2`)).text()).toBe("until close");
    expect(connections()).toBe(2);
  });

  it("returns error statuses and bodiless answers, and keeps the connection", async () => {
    const { origin, connections } = await serve((socket, request) => {
      if (request.head.includes("/gone")) socket.write("HTTP/1.1 204 No Content\r\n\r\n");
      else socket.write('HTTP/1.1 429 Too Many Requests\r\nContent-Length: 9\r\n\r\n{"e":429}');
    });
    const empty = await googleHttp1Fetch(`${origin}/gone`, { method: "POST", body: "{}" });
    expect(empty.status).toBe(204);
    expect(empty.body).toBeNull();
    const limited = await googleHttp1Fetch(`${origin}/limited`, { method: "POST", body: "{}" });
    expect(limited.status).toBe(429);
    expect(await limited.text()).toBe('{"e":429}');
    expect(connections()).toBe(1);
  });

  it("rejects when aborted, before and during the answer", async () => {
    const { origin } = await serve((socket, request) => {
      if (request.head.includes("/partial")) socket.write("HTTP/1.1 200 OK\r\nContent-Length: 100\r\n\r\npartial");
    });
    const early = new AbortController();
    early.abort(new Error("stop early"));
    await expect(googleHttp1Fetch(`${origin}/x`, { signal: early.signal })).rejects.toThrow("stop early");

    const waiting = new AbortController();
    const pending = googleHttp1Fetch(`${origin}/silent`, { signal: waiting.signal });
    setTimeout(() => waiting.abort(new Error("stop waiting")), 20);
    await expect(pending).rejects.toThrow("stop waiting");

    const reading = new AbortController();
    const response = await googleHttp1Fetch(`${origin}/partial`, { signal: reading.signal });
    setTimeout(() => reading.abort(new Error("stop reading")), 20);
    await expect(response.text()).rejects.toThrow("stop reading");
  });

  it("fails at once when no connection can be made", async () => {
    const { origin } = await serve(() => {});
    close?.();
    close = undefined;
    await expect(googleHttp1Fetch(`${origin}/x`)).rejects.toThrow();
  });

  it("keeps a short-lived process alive for the answer and lets it exit with the connection still open", async () => {
    const { origin } = await serve((socket) => setTimeout(() => socket.write(ok('{"late":true}')), 150));
    // Bundled to plain JavaScript first: Node 20 (CI, and the engines floor) cannot import a .ts file.
    const dir = await mkdtemp(join(tmpdir(), "google-http1-"));
    const outfile = join(dir, "google-http1.mjs");
    await build({
      entryPoints: [fileURLToPath(new URL("./google-http1.ts", import.meta.url))],
      bundle: true, format: "esm", platform: "node", outfile, logLevel: "silent",
    });
    const script = `import(${JSON.stringify(pathToFileURL(outfile).href)}).then(({ googleHttp1Fetch }) =>
      googleHttp1Fetch(${JSON.stringify(`${origin}/x`)}, { method: "POST", body: "{}" }))
      .then((res) => res.text()).then((text) => console.log("answer:" + text));`;
    // The server never closes the kept connection; the timeout fails the test if that holds the process.
    const stdout = await new Promise<string>((resolve, reject) =>
      execFile(process.execPath, ["--input-type=module", "-e", script], { timeout: 5_000 }, (error, out) =>
        error ? reject(error) : resolve(out)))
      .finally(() => rm(dir, { recursive: true, force: true }));

    expect(stdout).toContain('answer:{"late":true}');
  });
});
