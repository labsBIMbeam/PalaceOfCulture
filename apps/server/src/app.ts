import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";

import {
  DEFAULT_FEED_FETCH_OPTIONS,
  type FeedFetchOptions,
  PodcastFetchError,
  type PodcastShow,
  fetchFeed,
  searchPodcasts,
} from "./api/podcasts.js";
import { resolveAuditDatabasePath } from "./db/auditStore.js";
import { type RateLimitDecision, TokenBucketRateLimiter, resolveClientIp } from "./rateLimit.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;
const HEADERS_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 15_000;
const SOCKET_TIMEOUT_MS = 30_000;
const MAX_REQUESTS_PER_SOCKET = 100;
const MAX_HEADERS_COUNT = 100;

export interface FeedRateLimitConfig {
  limit: number;
  windowMs: number;
  maxEntries: number;
  maxConcurrentPerIp: number;
  maxConcurrentGlobal: number;
}

export interface ServerConfig {
  host: string;
  port: number;
  corsOrigins: ReadonlySet<string>;
  auditDbPath: string;
  trustedProxyHops: number;
  maxConnections: number;
  shutdownGraceMs: number;
  feedFetch: FeedFetchOptions;
  feedRateLimit: FeedRateLimitConfig;
}

export interface ServerDependencies {
  fetchFeed?: (feedUrl: string, options: FeedFetchOptions, signal?: AbortSignal) => Promise<string>;
  searchPodcasts?: (query: string) => Promise<PodcastShow[]>;
}

interface FeedConcurrencyState {
  activeTotal: number;
  activeByClient: Map<string, number>;
}

type FeedSlot =
  | { acquired: false; reason: "global" | "per_ip" }
  | { acquired: true; release: () => void };

/** Load and validate network and feed-proxy settings from the process environment. */
export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const host = env.HOST?.trim() || DEFAULT_HOST;
  if (/\s/.test(host)) throw new Error("HOST cannot contain whitespace.");

  const maxConcurrentPerIp = parseIntegerSetting(
    env.PODCAST_FEED_MAX_CONCURRENT_PER_IP,
    2,
    "PODCAST_FEED_MAX_CONCURRENT_PER_IP",
    1,
    32,
  );
  const maxConcurrentGlobal = parseIntegerSetting(
    env.PODCAST_FEED_MAX_CONCURRENT_GLOBAL,
    32,
    "PODCAST_FEED_MAX_CONCURRENT_GLOBAL",
    1,
    512,
  );
  if (maxConcurrentGlobal < maxConcurrentPerIp) {
    throw new Error(
      "PODCAST_FEED_MAX_CONCURRENT_GLOBAL must be at least the per-IP concurrency limit.",
    );
  }

  return {
    host,
    port: parseIntegerSetting(env.PORT, DEFAULT_PORT, "PORT", 1, 65_535),
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS),
    auditDbPath: resolveAuditDatabasePath(env.AUDIT_DB_PATH, env),
    trustedProxyHops: parseIntegerSetting(env.TRUST_PROXY_HOPS, 0, "TRUST_PROXY_HOPS", 0, 10),
    maxConnections: parseIntegerSetting(
      env.SERVER_MAX_CONNECTIONS,
      256,
      "SERVER_MAX_CONNECTIONS",
      16,
      10_000,
    ),
    shutdownGraceMs: parseIntegerSetting(
      env.SERVER_SHUTDOWN_GRACE_MS,
      10_000,
      "SERVER_SHUTDOWN_GRACE_MS",
      100,
      60_000,
    ),
    feedFetch: {
      timeoutMs: parseIntegerSetting(
        env.PODCAST_FEED_TIMEOUT_MS,
        DEFAULT_FEED_FETCH_OPTIONS.timeoutMs,
        "PODCAST_FEED_TIMEOUT_MS",
        100,
        60_000,
      ),
      maxBytes: parseIntegerSetting(
        env.PODCAST_FEED_MAX_BYTES,
        DEFAULT_FEED_FETCH_OPTIONS.maxBytes,
        "PODCAST_FEED_MAX_BYTES",
        1_024,
        10 * 1024 * 1024,
      ),
      maxRedirects: parseIntegerSetting(
        env.PODCAST_FEED_MAX_REDIRECTS,
        DEFAULT_FEED_FETCH_OPTIONS.maxRedirects,
        "PODCAST_FEED_MAX_REDIRECTS",
        0,
        10,
      ),
    },
    feedRateLimit: {
      limit: parseIntegerSetting(
        env.PODCAST_FEED_RATE_LIMIT,
        12,
        "PODCAST_FEED_RATE_LIMIT",
        1,
        10_000,
      ),
      windowMs: parseIntegerSetting(
        env.PODCAST_FEED_RATE_WINDOW_MS,
        60_000,
        "PODCAST_FEED_RATE_WINDOW_MS",
        1_000,
        3_600_000,
      ),
      maxEntries: parseIntegerSetting(
        env.PODCAST_FEED_RATE_MAX_ENTRIES,
        10_000,
        "PODCAST_FEED_RATE_MAX_ENTRIES",
        100,
        100_000,
      ),
      maxConcurrentPerIp,
      maxConcurrentGlobal,
    },
  };
}

/** Create the HTTP server without binding a port, so startup and routes remain testable. */
export function createPodcastServer(
  config: ServerConfig = loadServerConfig(),
  dependencies: ServerDependencies = {},
): Server {
  const fetchPodcastFeed =
    dependencies.fetchFeed ??
    ((feedUrl: string, options: FeedFetchOptions, signal?: AbortSignal) =>
      fetchFeed(feedUrl, options, {}, signal));
  const searchPodcastCatalog = dependencies.searchPodcasts ?? searchPodcasts;
  const feedRateLimiter = new TokenBucketRateLimiter(config.feedRateLimit);
  const feedConcurrency: FeedConcurrencyState = {
    activeTotal: 0,
    activeByClient: new Map(),
  };

  const server = createServer(
    {
      connectionsCheckingInterval: 1_000,
      headersTimeout: HEADERS_TIMEOUT_MS,
      keepAliveTimeout: 5_000,
      maxHeaderSize: 16 * 1024,
      requestTimeout: REQUEST_TIMEOUT_MS,
    },
    (request, response) => {
      void handleRequest(request, response).catch(() => {
        if (!canWriteResponse(response)) return;
        if (response.headersSent) {
          response.destroy();
          return;
        }
        sendError(response, 500, "internal_error", "The server could not process the request.");
      });
    },
  );
  server.maxConnections = config.maxConnections;
  server.maxHeadersCount = MAX_HEADERS_COUNT;
  server.maxRequestsPerSocket = MAX_REQUESTS_PER_SOCKET;
  server.setTimeout(SOCKET_TIMEOUT_MS, (socket) => socket.destroy());
  return server;

  async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    setCommonHeaders(response);
    if (!applyCors(request, response, config.corsOrigins)) {
      sendError(response, 403, "origin_not_allowed", "The request origin is not allowed.");
      return;
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method !== "GET") {
      response.setHeader("allow", "GET, OPTIONS");
      sendError(response, 405, "method_not_allowed", "Only GET requests are allowed.");
      return;
    }

    let url: URL;
    try {
      url = new URL(request.url ?? "/", "http://server.invalid");
    } catch {
      sendError(response, 400, "invalid_request_url", "The request URL is invalid.");
      return;
    }

    if (url.pathname === "/api/health") {
      response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      response.end("ok");
      return;
    }

    if (url.pathname === "/api/podcasts/search") {
      try {
        const shows = await searchPodcastCatalog(url.searchParams.get("q") ?? "");
        sendJson(response, 200, { shows });
      } catch {
        sendError(response, 502, "podcast_search_failed", "The podcast catalog is unavailable.");
      }
      return;
    }

    if (url.pathname === "/api/podcasts/feed") {
      await handleFeedRequest(request, response, url);
      return;
    }

    sendError(response, 404, "not_found", "The requested route does not exist.");
  }

  async function handleFeedRequest(
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
  ): Promise<void> {
    response.setHeader("cache-control", "no-store");
    const forwardedFor = request.headers["x-forwarded-for"];
    const clientIp = resolveClientIp(
      request.socket.remoteAddress,
      Array.isArray(forwardedFor) ? forwardedFor.join(",") : forwardedFor,
      config.trustedProxyHops,
    );
    const rateDecision = feedRateLimiter.consume(clientIp);
    setRateLimitHeaders(response, rateDecision);
    if (!rateDecision.allowed) {
      response.setHeader("retry-after", String(rateDecision.retryAfterSeconds));
      sendError(response, 429, "rate_limit_exceeded", "Too many podcast feed requests.");
      return;
    }

    const slot = acquireFeedSlot(feedConcurrency, config.feedRateLimit, clientIp);
    if (!slot.acquired) {
      response.setHeader("retry-after", "1");
      if (slot.reason === "per_ip") {
        sendError(
          response,
          429,
          "feed_concurrency_exceeded",
          "Too many concurrent podcast feed requests.",
        );
      } else {
        sendError(response, 503, "feed_capacity_exceeded", "Podcast feed capacity is busy.");
      }
      return;
    }

    const abortController = new AbortController();
    const abortIfDisconnected = (): void => {
      if (!response.writableEnded) abortController.abort();
    };
    request.once("aborted", abortIfDisconnected);
    response.once("close", abortIfDisconnected);

    try {
      const xml = await fetchPodcastFeed(
        url.searchParams.get("url") ?? "",
        config.feedFetch,
        abortController.signal,
      );
      if (!canWriteResponse(response)) return;
      response.writeHead(200, { "content-type": "application/rss+xml; charset=utf-8" });
      response.end(xml);
    } catch (error) {
      if (!canWriteResponse(response)) return;
      if (error instanceof PodcastFetchError) {
        if (error.code === "request_aborted") {
          response.destroy();
          return;
        }
        sendError(response, error.statusCode, error.code, error.message);
        return;
      }
      sendError(response, 502, "feed_fetch_failed", "The podcast feed is unavailable.");
    } finally {
      request.off("aborted", abortIfDisconnected);
      response.off("close", abortIfDisconnected);
      slot.release();
    }
  }
}

function acquireFeedSlot(
  state: FeedConcurrencyState,
  config: FeedRateLimitConfig,
  clientIp: string,
): FeedSlot {
  const activeForClient = state.activeByClient.get(clientIp) ?? 0;
  if (activeForClient >= config.maxConcurrentPerIp) {
    return { acquired: false, reason: "per_ip" };
  }
  if (state.activeTotal >= config.maxConcurrentGlobal) {
    return { acquired: false, reason: "global" };
  }

  state.activeTotal += 1;
  state.activeByClient.set(clientIp, activeForClient + 1);
  let released = false;
  return {
    acquired: true,
    release: () => {
      if (released) return;
      released = true;
      state.activeTotal -= 1;
      const remainingForClient = (state.activeByClient.get(clientIp) ?? 1) - 1;
      if (remainingForClient <= 0) state.activeByClient.delete(clientIp);
      else state.activeByClient.set(clientIp, remainingForClient);
    },
  };
}

function parseIntegerSetting(
  value: string | undefined,
  fallback: number,
  name: string,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function parseCorsOrigins(value: string | undefined): ReadonlySet<string> {
  const origins = new Set<string>();
  if (!value?.trim()) return origins;

  for (const candidate of value.split(",")) {
    const configuredOrigin = candidate.trim();
    if (!configuredOrigin || configuredOrigin === "*") {
      throw new Error("CORS_ORIGINS must contain explicit HTTP or HTTPS origins.");
    }

    let url: URL;
    try {
      url = new URL(configuredOrigin);
    } catch {
      throw new Error(`Invalid CORS origin: ${configuredOrigin}`);
    }
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error(`Invalid CORS origin: ${configuredOrigin}`);
    }
    origins.add(url.origin);
  }
  return origins;
}

function setCommonHeaders(response: ServerResponse): void {
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
}

function setRateLimitHeaders(response: ServerResponse, decision: RateLimitDecision): void {
  response.setHeader("x-ratelimit-limit", String(decision.limit));
  response.setHeader("x-ratelimit-remaining", String(decision.remaining));
}

function applyCors(
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: ReadonlySet<string>,
): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;

  response.setHeader("vary", "Origin");
  if (Array.isArray(origin) || !allowedOrigins.has(origin)) return false;

  response.setHeader("access-control-allow-origin", origin);
  response.setHeader("access-control-allow-methods", "GET, OPTIONS");
  response.setHeader(
    "access-control-expose-headers",
    "Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining",
  );
  response.setHeader("access-control-max-age", "600");
  return true;
}

function canWriteResponse(response: ServerResponse): boolean {
  return !response.destroyed && !response.writableEnded;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function sendError(
  response: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
): void {
  sendJson(response, statusCode, { error: { code, message } });
}
