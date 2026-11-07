/**
 * HTTP/2 requests to Google, sent the way the Antigravity CLI sends them.
 *
 * Antigravity is a Go program: every request it makes (OAuth, project and
 * quota lookups, model calls) goes over HTTP/2 with Go's client, which adds
 * only `Accept-Encoding: gzip` (and `User-Agent: Go-http-client/2.0` when the
 * caller sets none). `fetch` in Bun and Node speaks HTTP/1.1 and adds `Accept`
 * and `Connection`, so requests to Google use `node:http2` instead.
 *
 * Connections are reused per origin and credential, so two accounts never
 * share one (a single agy install only ever carries one account), and closed
 * after Go's default idle time.
 */

import { connect, constants } from "node:http2";
import type { ClientHttp2Session, IncomingHttpHeaders, OutgoingHttpHeaders } from "node:http2";
import { createGunzip } from "node:zlib";

/** What Go's HTTP/2 client sends when the caller sets no User-Agent. */
export const GO_HTTP2_USER_AGENT = "Go-http-client/2.0";

/** Go's `http.DefaultTransport` IdleConnTimeout. */
const IDLE_CLOSE_MS = 90_000;

/** Never sent: HTTP/2 forbids connection headers, and the client sets these itself. */
const DROPPED_HEADERS = new Set([
  "connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade",
  "host", "content-length", "accept-encoding",
]);

/** The `fetch` options this client honours: method, headers, a string or byte body, signal. */
export type GoogleRequestInit = Pick<RequestInit, "method" | "headers" | "body" | "signal">;

function toPayload(body: RequestInit["body"]): Buffer | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return Buffer.from(body, "utf8");
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  throw new TypeError("Unsupported request body for an HTTP/2 request to Google");
}

interface PooledSession {
  session: ClientHttp2Session;
  active: number;
  idleTimer?: ReturnType<typeof setTimeout>;
}

const pool = new Map<string, PooledSession>();

/** A request the server never processed, so it is safe to send again. */
class UnsentRequestError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UnsentRequestError";
  }
}

function openSession(origin: string, key: string | undefined): PooledSession {
  const session = connect(origin);
  session.unref();
  const entry: PooledSession = { session, active: 0 };
  const forget = () => {
    clearTimeout(entry.idleTimer);
    if (key && pool.get(key) === entry) pool.delete(key);
  };
  session.on("close", forget);
  session.on("goaway", forget);
  session.on("error", forget);
  if (key) pool.set(key, entry);
  return entry;
}

function release(entry: PooledSession, pooled: boolean): void {
  entry.active -= 1;
  if (!pooled) {
    entry.session.close();
    return;
  }
  if (entry.active > 0) return;
  clearTimeout(entry.idleTimer);
  entry.idleTimer = setTimeout(() => entry.session.close(), IDLE_CLOSE_MS);
  entry.idleTimer.unref?.();
}

function toHeaderList(headers: HeadersInit | undefined): Array<[string, string]> {
  const list: Array<[string, string]> = [];
  new Headers(headers).forEach((value, name) => {
    if (!DROPPED_HEADERS.has(name)) list.push([name, value]);
  });
  return list;
}

function responseHeaders(raw: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(raw)) {
    if (name.startsWith(":") || value === undefined) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : String(value));
  }
  return headers;
}

function attempt(
  url: URL,
  init: GoogleRequestInit,
  payload: Buffer | undefined,
  entry: PooledSession,
  pooled: boolean,
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const signal = init.signal ?? undefined;
    entry.active += 1;
    clearTimeout(entry.idleTimer);

    const outgoing: OutgoingHttpHeaders = {
      ":method": (init.method ?? "GET").toUpperCase(),
      // Without the default port, as Go sends it (node:http2 would add ":443").
      ":authority": url.host,
      ":path": `${url.pathname}${url.search}`,
    };
    for (const [name, value] of toHeaderList(init.headers)) outgoing[name] = value;
    // agy streams the body of a model call (no length up front) and sends the
    // length on every other request.
    if (payload && !url.pathname.endsWith(":streamGenerateContent")) outgoing["content-length"] = String(payload.length);
    outgoing["accept-encoding"] = "gzip";
    outgoing["user-agent"] ??= GO_HTTP2_USER_AGENT;

    let stream: ReturnType<ClientHttp2Session["request"]>;
    try {
      stream = entry.session.request(outgoing);
    } catch (error) {
      // The connection would not take another request (it is closing).
      release(entry, pooled);
      reject(new UnsentRequestError("HTTP/2 connection unusable", { cause: error }));
      return;
    }

    let settled = false;
    let finished = false;
    // Set once the response arrives: hands the body's end or error to its reader.
    let body: { end(): void; error(reason: unknown): void } | undefined;
    let sourceEnded = false;
    let streamClosed = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener("abort", onAbort);
      release(entry, pooled);
    };
    const fail = (error: unknown) => {
      finish();
      if (body) body.error(error);
      else if (!settled) {
        settled = true;
        reject(error);
      }
    };
    // The body ends only when the data is done AND the stream closed cleanly:
    // a reset mid-answer (code other than NO_ERROR) still delivers an end of data.
    const endIfDone = () => {
      if (sourceEnded && streamClosed) {
        finish();
        body?.end();
      }
    };
    const onAbort = () => {
      stream.close(constants.NGHTTP2_CANCEL);
      fail(signal?.reason ?? new Error("Aborted"));
    };
    stream.on("error", (error) =>
      fail(
        !settled && stream.rstCode === constants.NGHTTP2_REFUSED_STREAM
          ? new UnsentRequestError("HTTP/2 stream refused", { cause: error })
          : error,
      ));
    stream.on("close", () => {
      streamClosed = true;
      if (!settled || (stream.rstCode ?? 0) !== constants.NGHTTP2_NO_ERROR) {
        const message = `HTTP/2 stream closed early (code ${stream.rstCode})`;
        fail(!settled && stream.rstCode === constants.NGHTTP2_REFUSED_STREAM ? new UnsentRequestError(message) : new Error(message));
        return;
      }
      endIfDone();
    });
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });

    stream.on("response", (raw) => {
      settled = true;
      const status = Number(raw[":status"]);
      const headers = responseHeaders(raw);
      const gzipped = headers.get("content-encoding") === "gzip";
      if (gzipped) headers.delete("content-encoding");
      const source = gzipped ? stream.pipe(createGunzip()) : stream;

      if (status === 204 || status === 304 || init.method === "HEAD") {
        stream.resume();
        resolve(new Response(null, { status, headers }));
        return;
      }
      const responseBody = new ReadableStream<Uint8Array>({
        start(controller) {
          body = {
            end: () => {
              try {
                controller.close();
              } catch {
                // Cancelled by the reader.
              }
            },
            error: (reason) => {
              try {
                controller.error(reason);
              } catch {
                // Already closed or cancelled.
              }
            },
          };
          source.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
          source.on("end", () => {
            sourceEnded = true;
            endIfDone();
          });
          source.on("error", (error) => fail(error));
        },
        cancel() {
          stream.close(constants.NGHTTP2_CANCEL);
          finish();
        },
      });
      resolve(new Response(responseBody, { status, headers }));
    });

    stream.end(payload);
  });
}

/**
 * `fetch` over HTTP/2, as Go's client sends it. With `reuse`, the connection is
 * kept for later requests with the same origin and `Authorization`; without,
 * each request gets its own.
 */
export async function googleFetch(
  input: string | URL | Request,
  init: GoogleRequestInit = {},
  reuse = true,
): Promise<Response> {
  init.signal?.throwIfAborted();
  const url = new URL(input instanceof Request ? input.url : input);
  const body = toPayload(init.body);
  const key = reuse ? `${url.origin}\n${new Headers(init.headers).get("authorization") ?? ""}` : undefined;
  const reused = key ? pool.get(key) : undefined;
  const live = reused && !reused.session.closed && !reused.session.destroyed ? reused : undefined;

  const entry = live ?? openSession(url.origin, key);
  try {
    return await attempt(url, init, body, entry, reuse);
  } catch (error) {
    // Like Go's transport, send again (once, on a new connection) only a
    // request the server never processed: anything else could run twice.
    if (!(error instanceof UnsentRequestError) || init.signal?.aborted) throw error;
    if (key && pool.get(key) === entry) pool.delete(key);
    entry.session.close();
    return attempt(url, init, body, openSession(url.origin, key), reuse);
  }
}

/** One request to Google's OAuth endpoints, on its own connection. */
export function googleRequest(url: string, init: GoogleRequestInit): Promise<Response> {
  return googleFetch(url, init, false);
}
