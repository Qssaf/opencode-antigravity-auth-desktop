/**
 * Loopback proxy that lets OpenCode 2.x send Gemini requests through the
 * Antigravity request pipeline.
 *
 * OpenCode 1.x let the plugin supply a custom `fetch` for the provider.
 * OpenCode 2.x's native Google provider has no such hook: the plugin can
 * change the request's base URL (`model.request`) or replace a request or
 * response (`http.request` / `http.response`), but cannot return a response
 * without sending something. The Antigravity pipeline has to be able to return
 * synthetic responses (quota-blocked, wrong-model errors) and to retry across
 * accounts and endpoints, so requests are pointed at this proxy, which runs the
 * pipeline's `fetch` and streams its response back.
 *
 * The listener is bound to 127.0.0.1 on an ephemeral port and every route sits
 * under a random path token, so nothing else on the machine can use it.
 */

import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { createLogger } from "../plugin/logger";

const log = createLogger("v2-proxy");

/** Where the Antigravity pipeline expects Gemini requests to be addressed. */
export const GEMINI_UPSTREAM_ORIGIN = "https://generativelanguage.googleapis.com";

/** Gemini request bodies carry inline images and PDFs; refuse anything absurd. */
const MAX_REQUEST_BODY_BYTES = 256 * 1024 * 1024;

const CLOSE_GRACE_MS = 2000;

const SKIPPED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-length",
  // fetch negotiates its own encoding; the upstream Response is already decoded.
  "accept-encoding",
]);

const SKIPPED_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-length",
  // The body handed back by fetch is already decoded.
  "content-encoding",
]);

/**
 * Same call shape the Antigravity pipeline receives from the AI SDK on
 * OpenCode 1.x: a URL string plus an init with a string body and a plain
 * headers object.
 */
export type UpstreamFetch = (url: string, init: RequestInit) => Promise<Response>;

export interface ProxyRoute {
  /** Value for the provider's `baseURL`, e.g. `http://127.0.0.1:41234/<token>/v1beta`. */
  readonly baseURL: string;
  dispose(): Promise<void>;
}

interface SharedProxy {
  readonly server: Server;
  readonly port: number;
  readonly routes: Map<string, UpstreamFetch>;
}

let sharedProxy: Promise<SharedProxy> | undefined;

class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body too large");
  }
}

function isLoopbackHost(host: string | undefined): boolean {
  return !!host && /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(host);
}

function sendJsonError(res: ServerResponse, status: number, message: string, statusText: string): void {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  const body = JSON.stringify({ error: { code: status, message, status: statusText } });
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

async function readRequestBody(req: IncomingMessage): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > MAX_REQUEST_BODY_BYTES) {
      throw new RequestBodyTooLargeError();
    }
    chunks.push(buffer);
  }
  return method(req) === "GET" || method(req) === "HEAD" ? undefined : Buffer.concat(chunks);
}

function method(req: IncomingMessage): string {
  return (req.method ?? "GET").toUpperCase();
}

function toRequestHeaders(req: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined || SKIPPED_REQUEST_HEADERS.has(name.toLowerCase())) continue;
    headers[name] = Array.isArray(value) ? value.join(", ") : value;
  }
  return headers;
}

function toResponseHeaders(response: Response): Record<string, string | string[]> {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((value, name) => {
    if (SKIPPED_RESPONSE_HEADERS.has(name.toLowerCase()) || name.toLowerCase() === "set-cookie") return;
    headers[name] = value;
  });
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length > 0) {
    headers["set-cookie"] = cookies;
  }
  return headers;
}

function waitForDrainOrClose(res: ServerResponse): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      res.off("drain", done);
      res.off("close", done);
      resolve();
    };
    res.once("drain", done);
    res.once("close", done);
  });
}

async function pipeBody(response: Response, res: ServerResponse): Promise<void> {
  if (!response.body) {
    res.end();
    return;
  }

  const reader = response.body.getReader();
  const cancelOnClose = () => {
    reader.cancel().catch(() => {});
  };
  res.once("close", cancelOnClose);

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (res.destroyed) break;
      if (!res.write(value)) {
        await waitForDrainOrClose(res);
      }
    }
    if (!res.destroyed) res.end();
  } finally {
    res.off("close", cancelOnClose);
  }
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  routes: ReadonlyMap<string, UpstreamFetch>,
): Promise<void> {
  const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
  const match = /^\/([0-9a-f]{32})(\/.*)?$/.exec(requestUrl.pathname);
  const upstream = match?.[1] ? routes.get(match[1]) : undefined;
  if (!match || !upstream) {
    sendJsonError(res, 404, "Not found", "NOT_FOUND");
    return;
  }
  if (!isLoopbackHost(req.headers.host)) {
    sendJsonError(res, 403, "Forbidden", "PERMISSION_DENIED");
    return;
  }

  const controller = new AbortController();
  res.once("close", () => {
    if (!res.writableFinished) controller.abort();
  });

  let body: Buffer | undefined;
  try {
    body = await readRequestBody(req);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      sendJsonError(res, 413, error.message, "INVALID_ARGUMENT");
    } else {
      sendJsonError(res, 400, "Could not read the request body", "INVALID_ARGUMENT");
    }
    return;
  }

  const targetUrl = `${GEMINI_UPSTREAM_ORIGIN}${match[2] ?? "/"}${requestUrl.search}`;
  let response: Response;
  try {
    response = await upstream(targetUrl, {
      method: method(req),
      headers: toRequestHeaders(req),
      body: body && body.length > 0 ? body.toString("utf8") : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) return;
    const message = error instanceof Error ? error.message : String(error);
    log.warn("Antigravity request failed", { error: message });
    sendJsonError(res, 502, message, "UNAVAILABLE");
    return;
  }

  if (controller.signal.aborted) {
    response.body?.cancel().catch(() => {});
    return;
  }

  res.writeHead(response.status, response.statusText, toResponseHeaders(response));
  res.flushHeaders();
  try {
    await pipeBody(response, res);
  } catch (error) {
    if (!controller.signal.aborted) {
      log.warn("Antigravity response stream failed", { error: String(error) });
    }
    res.destroy();
  }
}

async function startSharedProxy(): Promise<SharedProxy> {
  const routes = new Map<string, UpstreamFetch>();
  const server = createServer((req, res) => {
    handleRequest(req, res, routes).catch((error) => {
      log.error("Unhandled proxy error", { error: String(error) });
      sendJsonError(res, 500, "Internal proxy error", "INTERNAL");
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  // The proxy must never keep OpenCode alive on its own.
  server.unref();

  const address = server.address() as AddressInfo;
  log.debug("Antigravity loopback proxy listening", { port: address.port });
  return { server, port: address.port, routes };
}

async function stopSharedProxy(proxy: SharedProxy): Promise<void> {
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      proxy.server.closeAllConnections?.();
      resolve();
    }, CLOSE_GRACE_MS);
    timer.unref?.();
    proxy.server.close(() => {
      clearTimeout(timer);
      resolve();
    });
    proxy.server.closeIdleConnections?.();
  });
}

/**
 * Registers `upstream` behind a fresh, unguessable path on the shared loopback
 * proxy. The proxy starts with the first route and stops with the last.
 */
export async function registerProxyRoute(upstream: UpstreamFetch): Promise<ProxyRoute> {
  const pending = (sharedProxy ??= startSharedProxy());
  let proxy: SharedProxy;
  try {
    proxy = await pending;
  } catch (error) {
    if (sharedProxy === pending) sharedProxy = undefined;
    throw error;
  }

  const token = randomBytes(16).toString("hex");
  proxy.routes.set(token, upstream);

  let disposed = false;
  return {
    baseURL: `http://127.0.0.1:${proxy.port}/${token}/v1beta`,
    async dispose() {
      if (disposed) return;
      disposed = true;
      proxy.routes.delete(token);
      if (proxy.routes.size === 0) {
        if (sharedProxy === pending) sharedProxy = undefined;
        await stopSharedProxy(proxy);
      }
    },
  };
}
