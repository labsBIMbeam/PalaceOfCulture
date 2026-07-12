import { schnorr } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

import { JsonEncodingError, type JsonObject, canonicalizeJson } from "@600b/shared";

const SIGNING_DOMAIN = "600b:ownership:sign:v1";
const EVENT_HASH_DOMAIN = "600b:ownership:event:v1";
const EVENT_KEYS = [
  "assetId",
  "ownerPubkey",
  "payload",
  "prevHash",
  "revision",
  "signature",
] as const;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const PUBKEY_PATTERN = /^[0-9a-f]{64}$/;
const SIGNATURE_PATTERN = /^[0-9a-f]{128}$/;

/** The stable wire-format version used for hashing and signing ownership events. */
export const OWNERSHIP_PROTOCOL_VERSION = 1;

/** A single event in an asset's ownership branch. */
export interface OwnershipEvent {
  /** The immutable object-instance identifier. */
  readonly assetId: string;
  /** A zero-based counter increasing by exactly one. */
  readonly revision: number;
  /** SHA-256 hash of the previous signed event; null only at revision zero. */
  readonly prevHash: string | null;
  /** The owner after this event, as a lowercase 32-byte Nostr x-only public key. */
  readonly ownerPubkey: string;
  /** Transfer metadata restricted to deterministic JSON values. */
  readonly payload: JsonObject;
  /** Lowercase 64-byte BIP-340 Schnorr signature. */
  readonly signature: string;
}

/** The fields signed by a genesis owner or the previous event's owner. */
export type UnsignedOwnershipEvent = Omit<OwnershipEvent, "signature">;

/** Stable machine-readable failure codes for UI, API, and audit-log consumers. */
export type VerifyErrorCode =
  | "asset_mismatch"
  | "empty_branch"
  | "invalid_event"
  | "invalid_genesis"
  | "invalid_signature"
  | "prev_hash_mismatch"
  | "revision_mismatch";

export interface ValidVerifyResult {
  readonly valid: true;
  readonly head: OwnershipEvent;
  readonly headHash: string;
  readonly code?: never;
  readonly eventIndex?: never;
  readonly reason?: never;
}

export interface InvalidVerifyResult {
  readonly valid: false;
  readonly code: VerifyErrorCode;
  readonly eventIndex?: number;
  readonly head?: never;
  readonly headHash?: never;
  readonly reason: string;
}

export type VerifyResult = InvalidVerifyResult | ValidVerifyResult;

/** Raised when a value cannot be represented by the canonical JSON subset. */
export class OwnershipEncodingError extends Error {
  override readonly name = "OwnershipEncodingError";
}

/**
 * Return the domain-separated SHA-256 digest that a BIP-340 signer must sign.
 *
 * The signature itself is deliberately excluded. Object keys are sorted recursively, so payload
 * insertion order cannot change the digest.
 */
export function getOwnershipSigningHash(event: UnsignedOwnershipEvent): string {
  const canonical = canonicalize({
    assetId: event.assetId,
    ownerPubkey: event.ownerPubkey,
    payload: event.payload,
    prevHash: event.prevHash,
    revision: event.revision,
  });
  return hashCanonical(SIGNING_DOMAIN, canonical);
}

/** Return the domain-separated SHA-256 hash used by the next event's `prevHash`. */
export function getOwnershipEventHash(event: OwnershipEvent): string {
  const canonical = canonicalize({
    assetId: event.assetId,
    ownerPubkey: event.ownerPubkey,
    payload: event.payload,
    prevHash: event.prevHash,
    revision: event.revision,
    signature: event.signature,
  });
  return hashCanonical(EVENT_HASH_DOMAIN, canonical);
}

/** Verify one event against the public key that was authorized to transfer it. */
export function verifyOwnershipSignature(event: OwnershipEvent, signerPubkey: string): boolean {
  if (!PUBKEY_PATTERN.test(signerPubkey) || !SIGNATURE_PATTERN.test(event.signature)) {
    return false;
  }

  try {
    return schnorr.verify(
      hexToBytes(event.signature),
      hexToBytes(getOwnershipSigningHash(event)),
      hexToBytes(signerPubkey),
    );
  } catch {
    return false;
  }
}

/**
 * Verify one ordered ownership branch without trusting a relay.
 *
 * Genesis is self-signed by its initial owner. Every later event is signed by the previous owner.
 * This proves branch validity, but intentionally does not choose between two independently valid
 * forks. Canonical acceptance/finality belongs to the transactional truth tier.
 */
export function verifyBranch(events: readonly OwnershipEvent[]): VerifyResult {
  if (!Array.isArray(events) || events.length === 0) {
    return failure("empty_branch", "An ownership branch must contain a genesis event.");
  }

  const genesis = events[0];
  if (!genesis) {
    return failure("empty_branch", "An ownership branch must contain a genesis event.");
  }

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (!event) {
      return failure("invalid_event", "The branch contains a missing event.", index);
    }

    const shapeError = validateEvent(event);
    if (shapeError) {
      return failure("invalid_event", shapeError, index);
    }

    if (event.assetId !== genesis.assetId) {
      return failure("asset_mismatch", "Every event must reference the genesis asset.", index);
    }

    const previous = index > 0 ? events[index - 1] : undefined;
    if (!previous) {
      if (event.revision !== 0 || event.prevHash !== null) {
        return failure(
          "invalid_genesis",
          "Genesis must have revision 0 and a null prevHash.",
          index,
        );
      }
    } else {
      if (event.revision !== previous.revision + 1) {
        return failure("revision_mismatch", "Each revision must increase by exactly one.", index);
      }

      if (event.prevHash !== getOwnershipEventHash(previous)) {
        return failure(
          "prev_hash_mismatch",
          "prevHash does not match the previous signed event.",
          index,
        );
      }
    }

    const signerPubkey = previous?.ownerPubkey ?? event.ownerPubkey;
    if (!verifyOwnershipSignature(event, signerPubkey)) {
      return failure(
        "invalid_signature",
        index === 0
          ? "Genesis must be signed by its initial owner."
          : "A transfer must be signed by the previous owner.",
        index,
      );
    }
  }

  const head = events.at(-1);
  if (!head) {
    return failure("empty_branch", "An ownership branch must contain a genesis event.");
  }
  return { valid: true, head, headHash: getOwnershipEventHash(head) };
}

/** Backwards-compatible name for callers that already use `verifyChain`. */
export function verifyChain(events: readonly OwnershipEvent[]): VerifyResult {
  return verifyBranch(events);
}

function validateEvent(event: OwnershipEvent): string | undefined {
  if (!isPlainObject(event)) {
    return "An ownership event must be a plain object.";
  }

  const keys = Object.keys(event).sort();
  if (keys.length !== EVENT_KEYS.length || EVENT_KEYS.some((key, index) => key !== keys[index])) {
    return "An ownership event contains missing or unknown fields.";
  }

  if (
    typeof event.assetId !== "string" ||
    event.assetId.trim() !== event.assetId ||
    !event.assetId
  ) {
    return "assetId must be a non-empty string without surrounding whitespace.";
  }
  if (!Number.isSafeInteger(event.revision) || event.revision < 0) {
    return "revision must be a non-negative safe integer.";
  }
  if (event.prevHash !== null && !HASH_PATTERN.test(event.prevHash)) {
    return "prevHash must be null or a lowercase 32-byte hex digest.";
  }
  if (!PUBKEY_PATTERN.test(event.ownerPubkey)) {
    return "ownerPubkey must be a lowercase 32-byte x-only public key.";
  }
  if (!SIGNATURE_PATTERN.test(event.signature)) {
    return "signature must be a lowercase 64-byte Schnorr signature.";
  }

  try {
    canonicalize(event.payload);
  } catch (error) {
    return error instanceof Error ? error.message : "payload is not canonical JSON.";
  }
  return undefined;
}

function failure(code: VerifyErrorCode, reason: string, eventIndex?: number): InvalidVerifyResult {
  return eventIndex === undefined
    ? { valid: false, code, reason }
    : { valid: false, code, eventIndex, reason };
}

function hashCanonical(domain: string, canonical: string): string {
  return bytesToHex(sha256(utf8ToBytes(`${domain}\u0000${canonical}`)));
}

function canonicalize(value: unknown): string {
  try {
    return canonicalizeJson(value);
  } catch (error) {
    if (error instanceof OwnershipEncodingError) {
      throw error;
    }
    throw new OwnershipEncodingError(
      error instanceof JsonEncodingError
        ? error.message
        : "Value cannot be encoded as canonical JSON.",
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}
