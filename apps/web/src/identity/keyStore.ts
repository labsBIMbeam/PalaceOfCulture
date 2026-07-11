// ⚠️ DEMO key store — the player's Nostr identity for the DEMO PHASE ONLY.
//
// A single throwaway nsec, generated once and kept in sessionStorage in PLAINTEXT. It exists so the whole
// write path (posting, reactions, zaps, chat) can be built and tested with a REAL signature today,
// without the NIP-07/bunker/encryption ceremony. It is NOT secure: anything with the device/JS context
// can read it. The secure model (NIP-07 / NIP-46 bunker, encrypted store + backup) replaces this behind
// the SAME surface later — see the approved plan. nsec is never logged, never sent to our server, never
// put in a URL. Keys are throwaway test identities on test infra (signet / mock LNbits), holding no value.

import { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { DEMO_WRITES_ENABLED } from "../config/safety";

const SESSION_KEY = "600b:demo:nsec";

let cached: NDKPrivateKeySigner | null = null;

function readNsec(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeNsec(nsec: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, nsec);
  } catch {
    /* storage disabled — the key stays in memory for this session only */
  }
}

/** Get (or lazily generate + persist) the demo player signer. ⚠️ throwaway plaintext key. */
export function getOrCreateDemoSigner(): NDKPrivateKeySigner {
  if (!DEMO_WRITES_ENABLED) {
    throw new Error("demo signer disabled; set VITE_ENABLE_DEMO_WRITES=true in local development");
  }
  if (cached) return cached;
  const existing = readNsec();
  if (existing) {
    try {
      cached = new NDKPrivateKeySigner(existing);
      return cached;
    } catch {
      /* corrupt stored key — fall through and regenerate */
    }
  }
  const generated = NDKPrivateKeySigner.generate();
  writeNsec(generated.nsec);
  cached = generated;
  return cached;
}

/** The demo player's npub (sync). */
export function demoNpub(): string {
  return getOrCreateDemoSigner().npub;
}

/** Forget the throwaway signer immediately (for logout/reset and test isolation). */
export function clearDemoSigner(): void {
  cached = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage disabled — clearing the in-memory signer is sufficient */
  }
}

// --- Deferred secure paths (stubs so the real upgrade is drop-in) -----------------------------------

/** Connect a NIP-07 browser-extension signer. Not in the demo phase — the secure key flow lands later. */
export function connectNip07(): never {
  throw new Error("connectNip07: NIP-07 signer is part of the secure key phase, not the demo");
}

/** Connect a NIP-46 remote signer (bunker). Not in the demo phase — the secure key flow lands later. */
export function connectBunker(): never {
  throw new Error("connectBunker: NIP-46 bunker is part of the secure key phase, not the demo");
}
