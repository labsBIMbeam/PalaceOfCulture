/** Public relay defaults are pure configuration so the UI can show status without loading NDK. */
export const PUBLIC_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.nostr.band",
  "wss://relay.zap.stream",
] as const;

/** The relay list adapters tag events with and the HUD counts. Mesh relays are additive, not a swap. */
export const RELAYS = PUBLIC_RELAYS;

// One bundle is served from clearnet to everyone, so a FIPS mesh relay cannot be selected at build
// time the way VITE_MULTIPLAYER_URL is — the same JS runs for players who have a mesh and players who
// do not. The relay list is therefore resolved at runtime: probe a loopback endpoint, prepend it when
// it answers, and fall back to the public relays otherwise. Everyone stays connected either way.
const DEFAULT_MESH_RELAY_URL = "ws://localhost:7777";
const DEFAULT_PROBE_TIMEOUT_MS = 600;
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export interface RelayResolutionOptions {
  meshRelayUrl?: string | null;
  probe?: (url: string, timeoutMs: number) => Promise<boolean>;
  timeoutMs?: number;
}

/**
 * Validate a configured mesh relay endpoint, returning null when mesh routing is switched off.
 *
 * Insecure `ws://` is confined to loopback on purpose. A page served over HTTPS is refused by the
 * browser when it opens a plaintext socket to anything else — reaching a mesh address such as
 * `ws://[fd97::1]:7777` directly throws a SecurityError before a connection is attempted. Routing
 * through a local FIPS forward keeps the socket on `localhost`, which browsers treat as trustworthy.
 */
export function resolveMeshRelayUrl(configured: unknown): string | null {
  if (configured === undefined) return DEFAULT_MESH_RELAY_URL;
  if (configured === null) return null;
  if (typeof configured !== "string") throw new Error("VITE_MESH_RELAY_URL must be a string");

  const candidate = configured.trim();
  if (!candidate) return null;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("VITE_MESH_RELAY_URL must be an absolute ws:// or wss:// URL");
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error("VITE_MESH_RELAY_URL only supports ws:// or wss://");
  }
  if (url.username || url.password) {
    throw new Error("VITE_MESH_RELAY_URL must not contain credentials");
  }
  if (url.protocol === "ws:" && !LOOPBACK_HOSTNAMES.has(url.hostname)) {
    throw new Error(
      "VITE_MESH_RELAY_URL must use loopback for ws://; an HTTPS page cannot open a plaintext " +
        "socket to a mesh address. Point it at a local FIPS port forward instead.",
    );
  }
  return url.toString().replace(/\/$/, "");
}

/** Open a socket and report whether it reached OPEN before the timeout. Never throws. */
export function probeRelay(url: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof WebSocket === "undefined") {
      resolve(false);
      return;
    }

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      resolve(false);
      return;
    }

    let settled = false;
    const settle = (reachable: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Close after resolving so a reachable relay is not left holding an extra idle socket; NDK
      // opens its own connection to the same URL immediately afterwards.
      try {
        socket.close();
      } catch {
        // A socket that never opened has nothing to close.
      }
      resolve(reachable);
    };
    const timer = setTimeout(() => settle(false), timeoutMs);
    socket.onopen = () => settle(true);
    socket.onerror = () => settle(false);
    socket.onclose = () => settle(false);
  });
}

/**
 * The relay URLs NDK should dial: the mesh relay first when it answers, then the public relays.
 *
 * Keeping the public relays in the list rather than replacing them means a player whose FIPS node
 * drops mid-session degrades to clearnet instead of going silent.
 */
export async function resolveRelayUrls(options: RelayResolutionOptions = {}): Promise<string[]> {
  const publicRelays = [...PUBLIC_RELAYS];
  const meshRelayUrl = resolveMeshRelayUrl(options.meshRelayUrl);
  if (!meshRelayUrl) return publicRelays;

  const probe = options.probe ?? probeRelay;
  const timeoutMs = options.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  let reachable = false;
  try {
    reachable = await probe(meshRelayUrl, timeoutMs);
  } catch {
    reachable = false;
  }
  return reachable ? [meshRelayUrl, ...publicRelays] : publicRelays;
}

/** Runtime entry point: read the configured endpoint from the environment, then resolve. */
export function resolveRuntimeRelayUrls(): Promise<string[]> {
  const env = import.meta.env;
  return resolveRelayUrls({ meshRelayUrl: env?.VITE_MESH_RELAY_URL });
}
