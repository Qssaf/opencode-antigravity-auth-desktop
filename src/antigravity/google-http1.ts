/**
 * HTTP/1.1 requests to the Antigravity backend, written the way agy writes them.
 *
 * agy 1.5.18 offers only `http/1.1` when it connects to `daily-cloudcode-pa`
 * (captured 2026-11-27 from its TLS handshake and its requests), and Go's
 * HTTP/1.1 client writes a fixed head: `Host`, `User-Agent`, `Content-Length`,
 * the caller's headers sorted by name, then `Accept-Encoding: gzip`. Neither
 * `fetch` nor `node:http` can send that (they add `Connection` and `Accept` and
 * order headers their own way), so the request is written to the socket here.
 *
 * Connections are kept per origin and credential, one request at a time, and
 * closed after Go's default idle time.
 */

import { connect as connectTcp } from "node:net";
import type { Socket } from "node:net";
import { connect as connectTls } from "node:tls";
import { createGunzip } from "node:zlib";

import { toPayload } from "./google-http";
import type { GoogleRequestInit } from "./google-http";

/** What Go's HTTP/1.1 client sends when the caller sets no User-Agent. */
export const GO_HTTP1_USER_AGENT = "Go-http-client/1.1";

/** Go's `http.DefaultTransport` IdleConnTimeout. */
const IDLE_CLOSE_MS = 90_000;
const MAX_HEAD_BYTES = 256 * 1024;

/** Written by this client itself, or meaningless on a request. */
const OWN_HEADERS = new Set([
  "host", "user-agent", "content-length", "accept-encoding",
  "connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade",
]);

interface Connection {
  socket: Socket;
  /** It has answered a request, so the server may have closed it since. */
  used: boolean;
  /** Takes it out of the idle list. */
  forget?: () => void;
}

const idleConnections = new Map<string, Connection[]>();

/**
 * A GET or HEAD on a kept connection that the server closed before answering:
 * safe to send again. Go resends no POST after writing it, since the server
 * may have run it before the connection dropped.
 */
class StaleConnectionError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Kept connection closed before any answer", options);
    this.name = "StaleConnectionError";
  }
}

/** Go's canonical form: `x-goog-user-project` becomes `X-Goog-User-Project`. */
function canonicalHeaderName(name: string): string {
  return name.toLowerCase().replace(/(^|-)([a-z])/g, (_match, dash: string, letter: string) => dash + letter.toUpperCase());
}

function requestHead(url: URL, method: string, headers: Headers, payloadLength: number | undefined): string {
  const lines = [
    `${method} ${url.pathname}${url.search} HTTP/1.1`,
    `Host: ${url.host}`,
    `User-Agent: ${headers.get("user-agent") ?? GO_HTTP1_USER_AGENT}`,
  ];
  // Go sends a zero length for a bodiless POST, PUT or PATCH and nothing for a GET.
  const length = payloadLength ?? (method === "POST" || method === "PUT" || method === "PATCH" ? 0 : undefined);
  if (length !== undefined) lines.push(`Content-Length: ${length}`);
  const rest: Array<[string, string]> = [];
  headers.forEach((value, name) => {
    if (!OWN_HEADERS.has(name)) rest.push([canonicalHeaderName(name), value]);
  });
  rest.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [name, value] of rest) lines.push(`${name}: ${value}`);
  lines.push("Accept-Encoding: gzip");
  return `${lines.join("\r\n")}\r\n\r\n`;
}

interface AnswerEvents {
  head(status: number, headers: Headers, hasBody: boolean): void;
  data(chunk: Buffer): void;
  /** The answer is complete; `reusable` when the connection can take another request. */
  end(reusable: boolean): void;
  fail(error: Error): void;
}

type AnswerState = "head" | "length" | "chunk-size" | "chunk-data" | "chunk-end" | "trailers" | "until-close" | "done";

/** Splits what the server sends into one answer's head and body. */
class AnswerReader {
  private buffer: Buffer = Buffer.alloc(0);
  private state: AnswerState = "head";
  private remaining = 0;
  private keepAlive = false;
  /** Any byte of the answer has arrived. */
  started = false;

  constructor(private readonly method: string, private readonly events: AnswerEvents) {}

  push(chunk: Buffer): void {
    this.started = true;
    this.buffer = this.buffer.length > 0 ? Buffer.concat([this.buffer, chunk]) : chunk;
    while (this.step()) {
      // Each step consumes what it can.
    }
  }

  /** The connection closed. */
  closed(error: Error | undefined): void {
    if (this.state === "done") return;
    if (this.state === "until-close" && !error) {
      this.state = "done";
      this.events.end(false);
      return;
    }
    this.state = "done";
    this.events.fail(error ?? new Error("Connection closed before the answer was complete"));
  }

  private finish(): void {
    this.state = "done";
    this.events.end(this.keepAlive && this.buffer.length === 0);
  }

  private takeLine(): string | undefined {
    const end = this.buffer.indexOf("\r\n");
    if (end < 0) return undefined;
    const line = this.buffer.subarray(0, end).toString("latin1");
    this.buffer = this.buffer.subarray(end + 2);
    return line;
  }

  /** Hands over up to `remaining` body bytes; true once they are all through. */
  private takeBody(): boolean {
    const size = Math.min(this.buffer.length, this.remaining);
    if (size > 0) {
      this.events.data(this.buffer.subarray(0, size));
      this.buffer = this.buffer.subarray(size);
      this.remaining -= size;
    }
    return this.remaining === 0;
  }

  /** Returns false when it needs more bytes or the answer is over. */
  private step(): boolean {
    switch (this.state) {
      case "head":
        return this.readHead();
      case "length":
        if (!this.takeBody()) return false;
        this.finish();
        return false;
      case "chunk-size": {
        const line = this.takeLine();
        if (line === undefined) return false;
        const size = Number.parseInt(line.split(";")[0]!.trim(), 16);
        if (!Number.isInteger(size) || size < 0) {
          this.state = "done";
          this.events.fail(new Error(`Malformed chunk size in the answer: ${line.slice(0, 40)}`));
          return false;
        }
        this.remaining = size;
        this.state = size === 0 ? "trailers" : "chunk-data";
        return true;
      }
      case "chunk-data":
        if (!this.takeBody()) return false;
        this.state = "chunk-end";
        return true;
      case "chunk-end":
        if (this.buffer.length < 2) return false;
        this.buffer = this.buffer.subarray(2);
        this.state = "chunk-size";
        return true;
      case "trailers": {
        const line = this.takeLine();
        if (line === undefined) return false;
        if (line.length > 0) return true;
        this.finish();
        return false;
      }
      case "until-close":
        if (this.buffer.length > 0) {
          this.events.data(this.buffer);
          this.buffer = Buffer.alloc(0);
        }
        return false;
      case "done":
        return false;
    }
  }

  private readHead(): boolean {
    const end = this.buffer.indexOf("\r\n\r\n");
    if (end < 0) {
      if (this.buffer.length > MAX_HEAD_BYTES) {
        this.state = "done";
        this.events.fail(new Error("The answer's headers are too large"));
      }
      return false;
    }
    const [statusLine = "", ...headerLines] = this.buffer.subarray(0, end).toString("latin1").split("\r\n");
    this.buffer = this.buffer.subarray(end + 4);
    const match = /^HTTP\/(1\.[01]) (\d{3})/.exec(statusLine);
    if (!match) {
      this.state = "done";
      this.events.fail(new Error(`Not an HTTP/1.1 answer: ${statusLine.slice(0, 60)}`));
      return false;
    }
    const status = Number(match[2]);
    // An interim answer (100 Continue, 103 Early Hints): the real one follows.
    if (status < 200) return true;

    const headers = new Headers();
    for (const line of headerLines) {
      const colon = line.indexOf(":");
      if (colon > 0) headers.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
    }
    const connection = headers.get("connection")?.toLowerCase() ?? "";
    this.keepAlive = match[1] === "1.1" ? !connection.includes("close") : connection.includes("keep-alive");

    if (this.method === "HEAD" || status === 204 || status === 304) {
      this.events.head(status, headers, false);
      this.finish();
      return false;
    }
    // Read before the head is handed over: its receiver may edit the headers.
    const chunked = headers.get("transfer-encoding")?.toLowerCase().includes("chunked") ?? false;
    const length = headers.get("content-length");
    this.events.head(status, headers, true);
    if (chunked) {
      this.state = "chunk-size";
    } else if (length !== null && /^\d+$/.test(length)) {
      this.remaining = Number(length);
      this.state = "length";
    } else {
      this.state = "until-close";
    }
    return true;
  }
}

function openConnection(url: URL): Connection {
  const secure = url.protocol === "https:";
  const port = Number(url.port) || (secure ? 443 : 80);
  const socket = secure
    ? connectTls({ host: url.hostname, port, servername: url.hostname, ALPNProtocols: ["http/1.1"] })
    : connectTcp({ host: url.hostname, port });
  socket.setNoDelay(true);
  return { socket, used: false };
}

function takeIdle(key: string): Connection | undefined {
  const list = idleConnections.get(key);
  while (list && list.length > 0) {
    const connection = list.pop()!;
    connection.forget?.();
    if (!connection.socket.destroyed && connection.socket.writable) return connection;
    connection.socket.destroy();
  }
  return undefined;
}

/** Keeps a connection for the next request. It is unreferenced, so it never holds a process open. */
function keepIdle(key: string, connection: Connection): void {
  const { socket } = connection;
  const list = idleConnections.get(key) ?? [];
  idleConnections.set(key, list);
  const drop = () => {
    connection.forget?.();
    socket.destroy();
  };
  const timer = setTimeout(drop, IDLE_CLOSE_MS);
  timer.unref?.();
  // Anything an idle connection does (the server closing it, stray bytes) ends it.
  socket.on("close", drop);
  socket.on("end", drop);
  socket.on("error", drop);
  socket.on("data", drop);
  connection.forget = () => {
    connection.forget = undefined;
    clearTimeout(timer);
    socket.off("close", drop);
    socket.off("end", drop);
    socket.off("error", drop);
    socket.off("data", drop);
    const index = list.indexOf(connection);
    if (index >= 0) list.splice(index, 1);
    if (list.length === 0 && idleConnections.get(key) === list) idleConnections.delete(key);
  };
  connection.used = true;
  list.push(connection);
  socket.unref();
}

function attempt(
  head: string,
  method: string,
  payload: Buffer | undefined,
  connection: Connection,
  key: string | undefined,
  signal: AbortSignal | undefined,
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const { socket } = connection;
    socket.ref();

    let settled = false;
    let finished = false;
    let socketError: Error | undefined;
    // Set once the answer's head arrives: hands the body to its reader.
    let body: { data(chunk: Buffer): void; end(): void; error(reason: unknown): void } | undefined;

    const finish = (reusable: boolean) => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener("abort", onAbort);
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
      // Like Go, never reuse a connection whose request was not fully written.
      if (reusable && key && !socket.destroyed && socket.writableLength === 0) keepIdle(key, connection);
      else socket.destroy();
    };
    const fail = (error: unknown) => {
      finish(false);
      body?.error(error);
      if (!settled) {
        settled = true;
        reject(error);
      }
    };

    const reader = new AnswerReader(method, {
      head(status, headers, hasBody) {
        // `Response` throws on a status it does not allow: only a built one settles the request.
        const answer = (responseBody: ReadableStream<Uint8Array> | null) => {
          const response = new Response(responseBody, { status, headers });
          settled = true;
          resolve(response);
        };
        if (!hasBody) {
          answer(null);
          return;
        }
        const gunzip = headers.get("content-encoding")?.toLowerCase() === "gzip" ? createGunzip() : undefined;
        if (gunzip) {
          // As Go does for an answer it decompresses itself.
          headers.delete("content-encoding");
          headers.delete("content-length");
        }
        const responseBody = new ReadableStream<Uint8Array>({
          start(controller) {
            const close = () => {
              try {
                controller.close();
              } catch {
                // Cancelled by the reader.
              }
            };
            const error = (reason: unknown) => {
              try {
                controller.error(reason);
              } catch {
                // Already closed or cancelled.
              }
            };
            let received = false;
            if (gunzip) {
              gunzip.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
              gunzip.on("end", close);
              // The rest of the answer is unreadable: stop receiving it.
              gunzip.on("error", fail);
            }
            body = {
              data: (chunk) => {
                received = true;
                if (gunzip) gunzip.write(chunk);
                else controller.enqueue(new Uint8Array(chunk));
              },
              // An empty body is not a gzip stream.
              end: () => (gunzip && received ? gunzip.end() : close()),
              error: (reason) => {
                gunzip?.destroy();
                error(reason);
              },
            };
          },
          cancel() {
            gunzip?.destroy();
            finish(false);
          },
        });
        answer(responseBody);
      },
      data: (chunk) => body?.data(chunk),
      end(reusable) {
        finish(reusable);
        body?.end();
      },
      fail,
    });

    const onData = (chunk: Buffer) => {
      try {
        reader.push(chunk);
      } catch (error) {
        // A status or header `Response` and `Headers` refuse.
        fail(error);
      }
    };
    const onError = (error: Error) => {
      socketError = error;
    };
    const onClose = () => {
      if (finished) return;
      const replayable = method === "GET" || method === "HEAD";
      if (replayable && connection.used && !reader.started && !signal?.aborted) fail(new StaleConnectionError({ cause: socketError }));
      else reader.closed(socketError);
    };
    const onAbort = () => fail(signal?.reason ?? new Error("Aborted"));

    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });

    const headBytes = Buffer.from(head, "latin1");
    socket.write(payload ? Buffer.concat([headBytes, payload]) : headBytes);
  });
}

/**
 * `fetch` over HTTP/1.1, as agy's Go client sends it. With `reuse`, the
 * connection is kept for later requests with the same origin and
 * `Authorization`; without, each request gets its own.
 */
export async function googleHttp1Fetch(
  input: string | URL,
  init: GoogleRequestInit = {},
  reuse = true,
): Promise<Response> {
  init.signal?.throwIfAborted();
  const url = new URL(input);
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  const payload = toPayload(init.body);
  const head = requestHead(url, method, headers, payload?.length);
  const key = reuse ? `${url.origin}\n${headers.get("authorization") ?? ""}` : undefined;
  const signal = init.signal ?? undefined;

  const kept = key ? takeIdle(key) : undefined;
  try {
    return await attempt(head, method, payload, kept ?? openConnection(url), key, signal);
  } catch (error) {
    if (!(error instanceof StaleConnectionError)) throw error;
    return attempt(head, method, payload, openConnection(url), key, signal);
  }
}
