import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";

import { PALACE_ROOM_NAME } from "@600b/multiplayer";

import { PalaceRoom } from "./PalaceRoom.js";
import { MatchmakingHttpGuard } from "./httpGuard.js";

const DEFAULT_MULTIPLAYER_HOST = "127.0.0.1";
const DEFAULT_MULTIPLAYER_PORT = 2567;
const MAX_WEBSOCKET_PAYLOAD_BYTES = 4 * 1024;
const PING_INTERVAL_MS = 5_000;
const PING_MAX_RETRIES = 2;

export interface MultiplayerConfig {
  host: string;
  port: number;
  allowedOrigins: ReadonlySet<string>;
  trustedProxyHops: number;
}

/** Load and validate the independently bound multiplayer listener configuration. */
export function loadMultiplayerConfig(env: NodeJS.ProcessEnv = process.env): MultiplayerConfig {
  const host = env.MULTIPLAYER_HOST?.trim() || DEFAULT_MULTIPLAYER_HOST;
  if (/\s/.test(host)) throw new Error("MULTIPLAYER_HOST cannot contain whitespace.");
  return {
    host,
    port: parsePort(env.MULTIPLAYER_PORT),
    allowedOrigins: parseExactOrigins(env.MULTIPLAYER_ORIGINS),
    trustedProxyHops: parseTrustedProxyHops(env.MULTIPLAYER_TRUST_PROXY_HOPS),
  };
}

/** One Colyseus listener containing only the volatile public palace room type. */
export class MultiplayerServer {
  readonly gameServer: Server;
  readonly matchmakingHttpGuard: MatchmakingHttpGuard;
  readonly transport: WebSocketTransport;
  readonly config: MultiplayerConfig;
  #listening = false;
  #shutdownPromise: Promise<void> | undefined;

  constructor(config: MultiplayerConfig) {
    this.config = config;
    PalaceRoom.configureAllowedOrigins(config.allowedOrigins);
    configureMatchmakerCors(config.allowedOrigins);
    this.matchmakingHttpGuard = new MatchmakingHttpGuard(
      config.allowedOrigins,
      config.trustedProxyHops,
    );

    this.transport = new WebSocketTransport({
      maxPayload: MAX_WEBSOCKET_PAYLOAD_BYTES,
      perMessageDeflate: false,
      pingInterval: PING_INTERVAL_MS,
      pingMaxRetries: PING_MAX_RETRIES,
      verifyClient: (info, callback) => {
        const origin = info.origin;
        const allowed = !origin || config.allowedOrigins.has(origin);
        callback(allowed, allowed ? undefined : 403, allowed ? undefined : "Origin not allowed");
      },
    });
    const listener = this.transport.server;
    if (!listener) throw new Error("Colyseus WebSocket transport did not create an HTTP server.");
    listener.headersTimeout = 5_000;
    listener.requestTimeout = 10_000;
    listener.keepAliveTimeout = 5_000;
    listener.maxHeadersCount = 50;
    listener.maxRequestsPerSocket = 100;
    listener.maxConnections = 128;
    listener.setTimeout(30_000, (socket) => socket.destroy());

    this.gameServer = new Server({
      transport: this.transport,
      gracefullyShutdown: false,
      greet: false,
    });
    this.gameServer.define(PALACE_ROOM_NAME, PalaceRoom).filterBy(["worldId"]);
  }

  /** Bind the dedicated multiplayer listener. */
  async listen(): Promise<void> {
    if (this.#listening) return;
    await this.gameServer.listen(this.config.port, this.config.host);
    const listener = this.transport.server;
    if (!listener) throw new Error("Colyseus listener disappeared during startup.");
    this.matchmakingHttpGuard.install(listener);
    this.#listening = true;
  }

  /** Actual bound address, including an OS-assigned port when configured with port zero. */
  get address(): AddressInfo | null {
    const address = this.transport.server?.address();
    return address && typeof address !== "string" ? address : null;
  }

  /** Drain rooms and close WebSocket plus matchmaking HTTP transports exactly once. */
  shutdown(): Promise<void> {
    if (this.#shutdownPromise) return this.#shutdownPromise;
    this.#shutdownPromise = this.#shutdown();
    return this.#shutdownPromise;
  }

  async #shutdown(): Promise<void> {
    const listener = this.transport.server;
    const closed = listener?.listening ? once(listener, "close").then(() => undefined) : undefined;
    await this.gameServer.gracefullyShutdown(false);
    if (closed) await closed;
    this.#listening = false;
  }
}

function configureMatchmakerCors(allowedOrigins: ReadonlySet<string>): void {
  Reflect.deleteProperty(matchMaker.controller.DEFAULT_CORS_HEADERS, "Access-Control-Allow-Origin");
  Reflect.deleteProperty(
    matchMaker.controller.DEFAULT_CORS_HEADERS,
    "Access-Control-Allow-Credentials",
  );
  matchMaker.controller.getCorsHeaders = (headers: Headers): Record<string, string> => {
    const origin = headers.get("origin");
    if (!origin || !allowedOrigins.has(origin)) return { Vary: "Origin" };
    return {
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
    };
  };
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return DEFAULT_MULTIPLAYER_PORT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error("MULTIPLAYER_PORT must be an integer between 0 and 65535.");
  }
  return parsed;
}

function parseTrustedProxyHops(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10) {
    throw new Error("MULTIPLAYER_TRUST_PROXY_HOPS must be an integer between 0 and 10.");
  }
  return parsed;
}

function parseExactOrigins(value: string | undefined): ReadonlySet<string> {
  const origins = new Set<string>();
  if (!value?.trim()) return origins;
  for (const item of value.split(",")) {
    const candidate = item.trim();
    if (!candidate || candidate === "*") {
      throw new Error("MULTIPLAYER_ORIGINS must contain explicit HTTP or HTTPS origins.");
    }
    let url: URL;
    try {
      url = new URL(candidate);
    } catch {
      throw new Error(`Invalid multiplayer origin: ${candidate}`);
    }
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error(`Invalid multiplayer origin: ${candidate}`);
    }
    origins.add(url.origin);
  }
  return origins;
}
