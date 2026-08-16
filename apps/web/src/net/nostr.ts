import NDK, { type NDKEvent, type NDKFilter, type NDKSigner } from "@nostr-dev-kit/ndk";
import { RELAYS, resolveRuntimeRelayUrls } from "./nostrConfig";

// The shared Nostr client is now NDK (@nostr-dev-kit/ndk) — the higher-level FOSS toolkit — replacing
// the hand-rolled nostr-tools SimplePool. One NDK instance owns the relay pool + connection lifecycle;
// `queryEvents()` keeps the same "collect until EOSE or timeout, return partial" shape the adapters
// already rely on (so a quiet relay just yields the mock fallback, never a hang). The win: NDK also
// gives us NIP wrapper classes (NDKArticle for NIP-23, NDKClassified for NIP-99), `event.encode()` for
// naddr deeplinks, and a signer seam for the later read→write (NIP-07 / per-seal key, ADR 0002).

export { RELAYS } from "./nostrConfig";

let ndk: NDK | null = null;
let connected: Promise<void> | null = null;

/** The shared NDK instance (lazy). Adapters that want NIP wrapper classes import this. */
export function getNdk(): NDK {
  if (!ndk) ndk = new NDK({ explicitRelayUrls: [...RELAYS] });
  return ndk;
}

/**
 * Connect once; the promise is memoised so concurrent callers share a single handshake.
 *
 * Relay resolution happens here rather than at module load because detecting a FIPS mesh relay means
 * probing a loopback socket, which is async. Deferring the first NDK construction until the probe
 * settles is what lets one clearnet bundle serve mesh and non-mesh players from the same build.
 */
function ready(): Promise<void> {
  if (!connected) {
    connected = resolveRuntimeRelayUrls()
      .then((relayUrls) => {
        // First construction wins: a caller that already touched getNdk() holds a pool built from
        // the public defaults, and swapping it mid-flight would drop live subscriptions.
        if (!ndk) ndk = new NDK({ explicitRelayUrls: relayUrls });
        return ndk.connect(3000);
      })
      .catch(() => {});
  }
  return connected;
}

/** Ensure the shared NDK is connected to the relay pool (memoised). Call before publishing. */
export function connect(): Promise<void> {
  return ready();
}

export type { NDKEvent, NDKFilter };
/** Back-compat alias: adapters still import `Event` — it's an NDKEvent now (richer, same core fields). */
export type Event = NDKEvent;

/** One-shot query: collect events across relays until EOSE or `timeoutMs`, then resolve (partial ok). */
// NDKFilter<number> (not the default NDKKind enum) so callers can pass any kind int (30311, 31337, …).
export async function queryEvents(
  filter: NDKFilter<number>,
  timeoutMs = 4500,
): Promise<NDKEvent[]> {
  await ready();
  return new Promise((resolve) => {
    const events: NDKEvent[] = [];
    let done = false;
    const sub = getNdk().subscribe(filter, { closeOnEose: true });
    const finish = () => {
      if (done) return;
      done = true;
      sub.stop();
      resolve(events);
    };
    // Listeners attach synchronously right after subscribe; relay events arrive async, so none are missed.
    sub.on("event", (event: NDKEvent) => events.push(event));
    sub.on("eose", finish);
    setTimeout(finish, timeoutMs);
  });
}

/** First value of a tag (e.g. `tag(event, "streaming")`), or undefined — NDK's tagValue under the hood. */
export function tag(event: NDKEvent, name: string): string | undefined {
  return event.tagValue(name);
}

/** Set the active signer so writes get signed (the demo signer now; NIP-07 / bunker later). */
export function setSigner(signer: NDKSigner): void {
  getNdk().signer = signer;
}

/** npub of the active signer, or null if none is set. */
export async function currentUserNpub(): Promise<string | null> {
  const signer = getNdk().signer;
  if (!signer) return null;
  const user = await signer.user();
  return user.npub ?? null;
}
