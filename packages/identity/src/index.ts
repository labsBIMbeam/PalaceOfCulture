// Server-side Nostr identities for palaces, guilds and system actors. Callers supply key material
// from their secret store; this package deliberately contains no seed, demo or otherwise.

import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";
import * as nip19 from "nostr-tools/nip19";
import { getPublicKey } from "nostr-tools/pure";

export interface EntityKey {
  /** 32-byte secp256k1 private key, hex. Server-side only; never log or ship to clients. */
  privHex: string;
  /** x-only public key, hex. */
  pubHex: string;
  /** bech32 npub (public, shareable). */
  npub: string;
}

/** Stable entity ids — the things that get their own Nostr identity. */
export type EntityId = `palace:${string}` | `guild:${string}` | `system:${string}`;

const ENTITY_ID_PATTERN = /^(palace|guild|system):[a-z0-9][a-z0-9:_-]{0,127}$/;

/**
 * Deterministically derive an entity's Nostr key from a master seed + its stable id. Same (seed, id)
 * → same key, always (recoverable from the seed alone). Domain-separated HMAC-SHA256; a counter
 * rejection-samples the astronomically rare out-of-range scalar so the output is always a valid key.
 */
export function deriveEntityKey(seed: string, entityId: EntityId): EntityKey {
  const key = utf8ToBytes(seed);
  if (key.length < 32)
    throw new Error("deriveEntityKey: master seed must contain at least 32 bytes");
  if (!ENTITY_ID_PATTERN.test(entityId)) throw new Error("deriveEntityKey: invalid entity id");
  for (let counter = 0; counter < 256; counter += 1) {
    const priv = hmac(sha256, key, utf8ToBytes(`600b:entity:${entityId}:${counter}`));
    try {
      const pubHex = getPublicKey(priv); // throws if the 32 bytes aren't a valid secp256k1 scalar
      return { privHex: bytesToHex(priv), pubHex, npub: nip19.npubEncode(pubHex) };
    } catch {
      /* invalid scalar (vanishingly rare) — bump the counter and re-derive */
    }
  }
  throw new Error(`deriveEntityKey: exhausted derivation for ${entityId}`);
}

/** Just the public npub for an entity (no private material) — what clients use. */
export function entityNpub(seed: string, entityId: EntityId): string {
  return deriveEntityKey(seed, entityId).npub;
}

/** Stable service identity ids; deployments derive their keys from a secret server-side seed. */
export const ENTITY_IDS = {
  hqPalace: "palace:hq",
  foundersGuild: "guild:founders",
  worldAgent: "system:world-agent",
} as const satisfies Record<string, EntityId>;
