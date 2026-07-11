import type { IncomingMessage, RequestListener, Server, ServerResponse } from "node:http";

import { TokenBucketRateLimiter, resolveClientIp } from "../rateLimit.js";

const MATCHMAKE_ROUTE_PREFIX = "/matchmake/";
const MAX_MATCHMAKE_BODY_BYTES = 4 * 1024;
const MATCHMAKE_BODY_TIMEOUT_MS = 3_000;
const MAX_ACTIVE_MATCHMAKE_GLOBAL = 8;
const MAX_ACTIVE_MATCHMAKE_PER_IP = 4;
const MATCHMAKE_GLOBAL_RATE_LIMIT = 32;
const MATCHMAKE_PER_IP_RATE_LIMIT = 8;
const MATCHMAKE_RATE_WINDOW_MS = 5_000;
const MAX_RETAINED_IPS = 1_024;

interface BufferedIncomingMessage extends IncomingMessage {
  body?: string;
}

/** Guard Colyseus' raw matchmaking listener before its unbounded request adapter runs. */
export class MatchmakingHttpGuard {
  readonly #allowedOrigins: ReadonlySet<string>;
  readonly #trustedProxyHops: number;
  readonly #globalRateLimiter = new TokenBucketRateLimiter({
    limit: MATCHMAKE_GLOBAL_RATE_LIMIT,
    windowMs: MATCHMAKE_RATE_WINDOW_MS,
    maxEntries: 1,
  });
  readonly #ipRateLimiter = new TokenBucketRateLimiter({
    limit: MATCHMAKE_PER_IP_RATE_LIMIT,
    windowMs: MATCHMAKE_RATE_WINDOW_MS,
    maxEntries: MAX_RETAINED_IPS,
  });
  readonly #activeByIp = new Map<string, number>();
  #activeGlobal = 0;
  #installed = false;

  constructor(allowedOrigins: ReadonlySet<string>, trustedProxyHops: number) {
    this.#allowedOrigins = new Set(allowedOrigins);
    this.#trustedProxyHops = trustedProxyHops;
  }

  /** Number of requests currently reading a body or awaiting a matchmaking response. */
  get activeRequestCount(): number {
    return this.#activeGlobal;
  }

  /** Wrap the handlers installed by Colyseus after Server.listen() binds its routes. */
  install(server: Server): void {
    if (this.#installed) return;
    const downstreamListeners = server.listeners("request") as RequestListener[];
    if (downstreamListeners.length === 0) {
      throw new Error("Colyseus did not install its matchmaking HTTP handler.");
    }

    server.removeAllListeners("request");
    server.on("request", (request, response) => {
      void this.#handle(request, response, downstreamListeners, server).catch(() => {
        if (!response.writableEnded && !response.destroyed) {
          replyJson(request, response, 500, "matchmaking_failed", this.#allowedOrigins, true);
        }
      });
    });
    this.#installed = true;
  }

  async #handle(
    request: BufferedIncomingMessage,
    response: ServerResponse,
    downstreamListeners: RequestListener[],
    server: Server,
  ): Promise<void> {
    if (!isMatchmakingRoute(request.url)) {
      dispatch(server, downstreamListeners, request, response);
      return;
    }

    const origin = request.headers.origin;
    if (origin && !this.#allowedOrigins.has(origin)) {
      replyJson(
        request,
        response,
        403,
        "origin_not_allowed",
        this.#allowedOrigins,
        request.method === "POST",
      );
      return;
    }

    if (request.method !== "POST") {
      dispatch(server, downstreamListeners, request, response);
      return;
    }

    const forwardedFor = request.headers["x-forwarded-for"];
    const clientIp = resolveClientIp(
      request.socket.remoteAddress,
      typeof forwardedFor === "string" ? forwardedFor : undefined,
      this.#trustedProxyHops,
    );
    const ipRate = this.#ipRateLimiter.consume(clientIp);
    if (!ipRate.allowed) {
      response.setHeader("Retry-After", String(ipRate.retryAfterSeconds));
      replyJson(request, response, 429, "matchmaking_rate_exceeded", this.#allowedOrigins, true);
      return;
    }
    const globalRate = this.#globalRateLimiter.consume("global");
    if (!globalRate.allowed) {
      response.setHeader("Retry-After", String(globalRate.retryAfterSeconds));
      replyJson(request, response, 429, "matchmaking_rate_exceeded", this.#allowedOrigins, true);
      return;
    }

    const activeForIp = this.#activeByIp.get(clientIp) ?? 0;
    if (
      this.#activeGlobal >= MAX_ACTIVE_MATCHMAKE_GLOBAL ||
      activeForIp >= MAX_ACTIVE_MATCHMAKE_PER_IP
    ) {
      response.setHeader("Retry-After", "1");
      replyJson(
        request,
        response,
        429,
        "matchmaking_capacity_exceeded",
        this.#allowedOrigins,
        true,
      );
      return;
    }

    this.#activeGlobal += 1;
    this.#activeByIp.set(clientIp, activeForIp + 1);
    const release = once(() => {
      this.#activeGlobal = Math.max(0, this.#activeGlobal - 1);
      const remaining = (this.#activeByIp.get(clientIp) ?? 1) - 1;
      if (remaining <= 0) this.#activeByIp.delete(clientIp);
      else this.#activeByIp.set(clientIp, remaining);
    });
    response.once("finish", release);
    response.once("close", release);

    const body = await readBoundedBody(
      request,
      response,
      MAX_MATCHMAKE_BODY_BYTES,
      this.#allowedOrigins,
    );
    if (body === undefined) return;
    request.body = body;
    dispatch(server, downstreamListeners, request, response);
  }
}

function isMatchmakingRoute(url: string | undefined): boolean {
  return (url?.split("?", 1)[0] ?? "").startsWith(MATCHMAKE_ROUTE_PREFIX);
}

function dispatch(
  server: Server,
  listeners: RequestListener[],
  request: IncomingMessage,
  response: ServerResponse,
): void {
  for (const listener of listeners) listener.call(server, request, response);
}

function readBoundedBody(
  request: IncomingMessage,
  response: ServerResponse,
  maximumBytes: number,
  allowedOrigins: ReadonlySet<string>,
): Promise<string | undefined> {
  const declaredLength = request.headers["content-length"];
  if (declaredLength !== undefined) {
    if (!/^\d+$/.test(declaredLength)) {
      replyJson(request, response, 400, "invalid_content_length", allowedOrigins, true);
      return Promise.resolve(undefined);
    }
    if (Number(declaredLength) > maximumBytes) {
      replyJson(request, response, 413, "matchmaking_body_too_large", allowedOrigins, true);
      return Promise.resolve(undefined);
    }
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    const cleanup = (): void => {
      clearTimeout(bodyTimeout);
      request.off("aborted", onAborted);
      request.off("data", onData);
      request.off("end", onEnd);
      request.off("error", onError);
    };
    const settle = (body: string | undefined): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(body);
    };
    const onAborted = (): void => settle(undefined);
    const onError = (): void => {
      if (!response.writableEnded && !response.destroyed) {
        replyJson(request, response, 400, "invalid_matchmaking_body", allowedOrigins, true);
      }
      settle(undefined);
    };
    const onTimeout = (): void => {
      request.pause();
      replyJson(request, response, 408, "matchmaking_body_timeout", allowedOrigins, true);
      settle(undefined);
    };
    const onData = (chunk: Buffer | string): void => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.byteLength;
      if (size > maximumBytes) {
        request.pause();
        replyJson(request, response, 413, "matchmaking_body_too_large", allowedOrigins, true);
        settle(undefined);
        return;
      }
      chunks.push(bytes);
    };
    const onEnd = (): void => settle(Buffer.concat(chunks, size).toString("utf8"));

    request.once("aborted", onAborted);
    request.on("data", onData);
    request.once("end", onEnd);
    request.once("error", onError);
    const bodyTimeout = setTimeout(onTimeout, MATCHMAKE_BODY_TIMEOUT_MS);
    bodyTimeout.unref();
    request.resume();
  });
}

function replyJson(
  request: IncomingMessage,
  response: ServerResponse,
  status: number,
  code: string,
  allowedOrigins: ReadonlySet<string>,
  closeConnection: boolean,
): void {
  if (response.writableEnded || response.destroyed) return;
  const origin = request.headers.origin;
  response.setHeader("Vary", "Origin");
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
  }
  const body = JSON.stringify({ error: { code } });
  response.statusCode = status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", String(Buffer.byteLength(body)));
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (closeConnection) {
    response.shouldKeepAlive = false;
    response.setHeader("Connection", "close");
    response.end(body, () => request.socket.destroy());
  } else {
    response.end(body);
  }
}

function once(callback: () => void): () => void {
  let called = false;
  return () => {
    if (called) return;
    called = true;
    callback();
  };
}
