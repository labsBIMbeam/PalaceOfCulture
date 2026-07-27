import {
  NDKEvent,
  NDKNip07Signer,
  NDKPublishError,
  type NDKFilter,
  type NDKRelay,
  type NDKSubscription,
} from "@nostr-dev-kit/ndk";
import { verifyEvent, type Event as NostrEvent, type EventTemplate } from "nostr-tools";
import {
  PHASE1_RELAY_ID,
  acceptPhase1Lens,
  acceptPhase1Witness,
  type Phase1ActivationCapability,
  type Phase1LensFact,
  type Phase1RelayState,
  type Phase1WitnessFact,
} from "../meaningverse/phase1Relay";
import { getNdk } from "./nostr";

export const PHASE1_EVENT_KIND = 9127 as const;
export const PHASE1_MAX_EVENT_BYTES = 4096;
export const PHASE1_MAX_TAG_KEY_BYTES = 16;
export const PHASE1_MAX_TAG_VALUE_BYTES = 128;
export const PHASE1_LIVE_MAX_AGE_SECONDS = 300;
export const PHASE1_FUTURE_SKEW_SECONDS = 60;
export const PHASE1_INVITE_MAX_AGE_SECONDS = 900;
export const PHASE1_RATE_WINDOW_SECONDS = 60;
export const PHASE1_RATE_PER_PUBKEY = 4;
export const PHASE1_RATE_GLOBAL = 16;
export const PHASE1_DEDUP_MAX = 64;

export type Phase1Action =
  | "activate-relay-invite"
  | "touch-relay-witness"
  | "attach-signal-lens";

export type Phase1EventTemplate = EventTemplate & { readonly kind: typeof PHASE1_EVENT_KIND };

export type Phase1ParsedEvent = {
  readonly id: string;
  readonly pubkey: string;
  readonly created_at: number;
  readonly kind: typeof PHASE1_EVENT_KIND;
  readonly tags: string[][];
  readonly content: "";
  readonly sig: string;
  readonly action: Phase1Action;
};

export type Phase1Evidence = Phase1ParsedEvent;

export type Phase1EvidenceContext = {
  readonly state: Phase1RelayState;
  readonly now?: number;
  readonly guard?: Phase1RelayEvidenceGuard;
};

export type Phase1SignerAttempt = {
  readonly isCurrent?: () => boolean;
};

export type Phase1SignedEvent = {
  readonly raw: Phase1ParsedEvent;
};

export type Phase1PublishResult = {
  readonly acknowledged: boolean;
  readonly relayCount: number;
};

export type Phase1LiveEventMeta = {
  readonly relayBacked: boolean;
  readonly fromCache: boolean;
  readonly optimisticPublish: boolean;
};

export interface Phase1RelayTransport {
  openRelay(attemptId: string): void;
  dispose(): void;
}

export interface Phase1RelayLifecycleGate {
  apply(state: Phase1RelayState): void;
  dispose(): void;
}

/**
 * Convert the accepted application-state delta into one bounded transport effect. The adapter sees
 * only the attempt identifier and cannot write relay truth back into the reducer.
 */
export function createPhase1RelayLifecycleGate(
  transport: Phase1RelayTransport,
): Phase1RelayLifecycleGate {
  let previous: Phase1RelayState = {
    // The placement-only lifecycle is retained for the phase-03 compatibility seam. Kind-9127
    // subscription lifetime is owned by createPhase1RelaySubscription below and is activation-gated.
    status: "idle",
    assembly: { status: "parts_0", seatedParts: [], carriedPart: null },
    placement: { status: "idle", socketId: null, attemptId: null, acceptedSocketId: null },
    memoryFragment: null,
    inspirationChoice: null,
    activationEpoch: 0,
    acceptedPlacement: false,
    relayId: null,
    activation: null,
    acceptedWitness: null,
    acceptedLens: null,
    acceptedEventIds: [],
    creatorIdentity: null,
  };
  let disposed = false;
  let openedAttemptId: string | null = null;

  return {
    apply(next) {
      if (disposed) return;
      if (
        previous.placement.status === "pending" &&
        next.placement.status === "accepted" &&
        previous.placement.attemptId === next.placement.attemptId &&
        next.placement.attemptId !== null &&
        openedAttemptId !== next.placement.attemptId
      ) {
        openedAttemptId = next.placement.attemptId;
        transport.openRelay(next.placement.attemptId);
      }
      previous = next;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      transport.dispose();
    },
  };
}

const utf8Bytes = (value: string): number => new TextEncoder().encode(value).byteLength;
const isHex = (value: unknown, length: number): value is string =>
  typeof value === "string" && new RegExp(`^[0-9a-f]{${length}}$`).test(value);

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function actionFromTags(tags: readonly string[][]): Phase1Action | null {
  const action = tags[1]?.[1];
  return action === "activate-relay-invite" ||
    action === "touch-relay-witness" ||
    action === "attach-signal-lens"
    ? action
    : null;
}

function exactActionTags(tags: readonly string[][], action: Phase1Action, pubkey: string): boolean {
  const common =
    tags[0]?.[0] === "t" &&
    tags[0]?.[1] === "palace-phase-1" &&
    tags[1]?.[0] === "action" &&
    tags[1]?.[1] === action &&
    tags[2]?.[0] === "relay" &&
    tags[2]?.[1] === PHASE1_RELAY_ID;
  if (!common) return false;
  if (action === "activate-relay-invite") {
    return tags.length === 4 && tags[3]?.[0] === "creator" && tags[3]?.[1] === pubkey;
  }
  if (action === "touch-relay-witness") {
    return (
      tags.length === 5 &&
      tags[3]?.[0] === "e" &&
      isHex(tags[3]?.[1], 64) &&
      tags[4]?.[0] === "p" &&
      isHex(tags[4]?.[1], 64)
    );
  }
  return (
    tags.length === 6 &&
    tags[3]?.[0] === "e" &&
    isHex(tags[3]?.[1], 64) &&
    tags[4]?.[0] === "p" &&
    isHex(tags[4]?.[1], 64) &&
    tags[5]?.[0] === "w" &&
    isHex(tags[5]?.[1], 64)
  );
}

function readBoundedUnknown(input: unknown): Record<string, unknown> | null {
  let serialized: string;
  try {
    serialized = typeof input === "string" ? input : JSON.stringify(input);
  } catch {
    return null;
  }
  if (typeof serialized !== "string" || utf8Bytes(serialized) > PHASE1_MAX_EVENT_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(serialized);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Structural parser. Signature verification is intentionally a separate later gate. */
export function parsePhase1RelayEvent(input: unknown): Phase1ParsedEvent | null {
  const value = readBoundedUnknown(input);
  if (!value || !exactKeys(value, ["id", "pubkey", "created_at", "kind", "tags", "content", "sig"])) {
    return null;
  }
  if (
    !isHex(value.id, 64) ||
    !isHex(value.pubkey, 64) ||
    !isHex(value.sig, 128) ||
    !Number.isSafeInteger(value.created_at) ||
    (value.created_at as number) < 0 ||
    value.kind !== PHASE1_EVENT_KIND ||
    value.content !== "" ||
    !Array.isArray(value.tags)
  ) return null;
  const tags = value.tags as unknown[];
  if (tags.length < 4 || tags.length > 6) return null;
  const boundedTags: string[][] = [];
  for (const tag of tags) {
    if (!Array.isArray(tag) || tag.length !== 2 || typeof tag[0] !== "string" || typeof tag[1] !== "string") {
      return null;
    }
    if (utf8Bytes(tag[0]) > PHASE1_MAX_TAG_KEY_BYTES || utf8Bytes(tag[1]) > PHASE1_MAX_TAG_VALUE_BYTES) {
      return null;
    }
    boundedTags.push([tag[0], tag[1]]);
  }
  const action = actionFromTags(boundedTags);
  if (!action || !exactActionTags(boundedTags, action, value.pubkey)) return null;
  return {
    id: value.id,
    pubkey: value.pubkey,
    created_at: value.created_at as number,
    kind: PHASE1_EVENT_KIND,
    tags: boundedTags,
    content: "",
    sig: value.sig,
    action,
  };
}

function verifyFreshEvent(
  input: unknown,
  now: number,
  maxAge: number,
): Phase1ParsedEvent | null {
  const parsed = parsePhase1RelayEvent(input);
  if (!parsed || parsed.created_at < now - maxAge || parsed.created_at > now + PHASE1_FUTURE_SKEW_SECONDS) return null;
  return verifyEvent(parsed as NostrEvent) ? parsed : null;
}

export function verifyPhase1ActivationCapability(
  input: unknown,
  now = Math.floor(Date.now() / 1000),
): Phase1ActivationCapability | null {
  const parsed = verifyFreshEvent(input, now, PHASE1_INVITE_MAX_AGE_SECONDS);
  if (!parsed || parsed.action !== "activate-relay-invite" || parsed.tags[3]?.[1] !== parsed.pubkey) return null;
  return {
    relayId: PHASE1_RELAY_ID,
    activationId: parsed.id,
    creatorPubkey: parsed.pubkey,
    createdAt: parsed.created_at,
    source: "verified-invite-capability",
  };
}

export function createPhase1ActivationTemplate(
  state: Phase1RelayState,
  creatorPubkey: string,
  createdAt = Math.floor(Date.now() / 1000),
): Phase1EventTemplate {
  if (!state.acceptedPlacement || state.relayId !== PHASE1_RELAY_ID || !isHex(creatorPubkey, 64)) {
    throw new Error("accepted local relay placement is required");
  }
  return {
    kind: PHASE1_EVENT_KIND,
    created_at: createdAt,
    content: "",
    tags: [["t", "palace-phase-1"], ["action", "activate-relay-invite"], ["relay", PHASE1_RELAY_ID], ["creator", creatorPubkey]],
  };
}

export function createPhase1WitnessTemplate(
  state: Phase1RelayState,
  witnessPubkey: string,
  createdAt = Math.floor(Date.now() / 1000),
): Phase1EventTemplate {
  const activation = state.activation;
  if (!activation || !isHex(witnessPubkey, 64) || witnessPubkey === activation.creatorPubkey) {
    throw new Error("accepted activation and distinct witness signer are required");
  }
  return {
    kind: PHASE1_EVENT_KIND,
    created_at: createdAt,
    content: "",
    tags: [["t", "palace-phase-1"], ["action", "touch-relay-witness"], ["relay", PHASE1_RELAY_ID], ["e", activation.activationId], ["p", activation.creatorPubkey]],
  };
}

export function createPhase1LensTemplate(
  state: Phase1RelayState,
  lensPubkey: string,
  createdAt = Math.floor(Date.now() / 1000),
): Phase1EventTemplate {
  const activation = state.activation;
  const witness = state.acceptedWitness;
  if (!activation || !witness || lensPubkey !== witness.pubkey) {
    throw new Error("accepted witness and its signer are required");
  }
  return {
    kind: PHASE1_EVENT_KIND,
    created_at: createdAt,
    content: "",
    tags: [["t", "palace-phase-1"], ["action", "attach-signal-lens"], ["relay", PHASE1_RELAY_ID], ["e", activation.activationId], ["p", activation.creatorPubkey], ["w", witness.eventId]],
  };
}

export function createPhase1Filter(activationId: string, activationCreatedAt: number): NDKFilter<number> {
  return { kinds: [PHASE1_EVENT_KIND], "#e": [activationId], since: activationCreatedAt - 60, limit: 16 };
}

export class Phase1RelayEvidenceGuard {
  private readonly seen = new Map<string, number>();
  private readonly attempts: Array<{ pubkey: string; createdAt: number }> = [];

  canAccept(event: Phase1ParsedEvent, now: number): boolean {
    if (this.seen.has(event.id) || this.seen.size >= PHASE1_DEDUP_MAX) return false;
    while (this.attempts[0] && this.attempts[0].createdAt < now - PHASE1_RATE_WINDOW_SECONDS) this.attempts.shift();
    const perPubkey = this.attempts.filter((attempt) => attempt.pubkey === event.pubkey).length;
    return perPubkey < PHASE1_RATE_PER_PUBKEY && this.attempts.length < PHASE1_RATE_GLOBAL;
  }

  record(event: Phase1ParsedEvent, now: number): void {
    if (!this.canAccept(event, now)) return;
    this.seen.set(event.id, now);
    this.attempts.push({ pubkey: event.pubkey, createdAt: now });
  }

  get size(): number {
    return this.seen.size;
  }
}

function bindingAllows(event: Phase1ParsedEvent, state: Phase1RelayState): boolean {
  const activation = state.activation;
  if (!activation || state.relayId !== PHASE1_RELAY_ID) return false;
  if (event.action === "touch-relay-witness") {
    return (
      !state.acceptedWitness &&
      event.pubkey !== activation.creatorPubkey &&
      event.tags[3]?.[1] === activation.activationId &&
      event.tags[4]?.[1] === activation.creatorPubkey
    );
  }
  if (event.action === "attach-signal-lens") {
    return (
      Boolean(state.acceptedWitness) &&
      !state.acceptedLens &&
      event.pubkey === state.acceptedWitness?.pubkey &&
      event.tags[3]?.[1] === activation.activationId &&
      event.tags[4]?.[1] === activation.creatorPubkey &&
      event.tags[5]?.[1] === state.acceptedWitness?.eventId
    );
  }
  return false;
}

export function verifyAndAuthorizePhase1Event(
  input: unknown,
  context: Phase1EvidenceContext,
): Phase1Evidence | null {
  const now = context.now ?? Math.floor(Date.now() / 1000);
  const event = verifyFreshEvent(input, now, PHASE1_LIVE_MAX_AGE_SECONDS);
  if (!event || event.action === "activate-relay-invite" || !bindingAllows(event, context.state)) return null;
  const guard = context.guard ?? new Phase1RelayEvidenceGuard();
  if (!guard.canAccept(event, now)) return null;
  guard.record(event, now);
  return event;
}

/** Convert one accepted evidence event into application-owned reducer truth. */
export function reducePhase1Evidence(state: Phase1RelayState, event: Phase1Evidence): Phase1RelayState {
  if (event.action === "touch-relay-witness") {
    const evidence: Phase1WitnessFact = { eventId: event.id, pubkey: event.pubkey, createdAt: event.created_at };
    return acceptPhase1Witness(state, evidence, state.activation?.creatorPubkey ?? "");
  }
  if (event.action === "attach-signal-lens") {
    const evidence: Phase1LensFact = {
      eventId: event.id,
      pubkey: event.pubkey,
      witnessEventId: event.tags[5]?.[1] ?? "",
      createdAt: event.created_at,
    };
    return acceptPhase1Lens(state, evidence);
  }
  return state;
}

function phase1NostrAvailable(): boolean {
  const candidate = (globalThis as { window?: { nostr?: unknown } }).window?.nostr;
  if (!candidate || typeof candidate !== "object") return false;
  const methods = candidate as Record<string, unknown>;
  return typeof methods.getPublicKey === "function" && typeof methods.signEvent === "function";
}

export function isPhase1Nip07Available(): boolean {
  return phase1NostrAvailable();
}

export class Phase1AttemptCancelled extends Error {
  constructor() {
    super("Phase-1 signer attempt was cancelled");
    this.name = "Phase1AttemptCancelled";
  }
}

/**
 * Sign one bounded event through a fresh NIP-07 signer. The returned object contains no SDK object.
 * Every continuation checks the app-owned attempt token before it can produce a result.
 */
export async function signPhase1Event(
  template: Phase1EventTemplate,
  attempt: Phase1SignerAttempt = {},
): Promise<Phase1SignedEvent | null> {
  if (!phase1NostrAvailable()) return null;
  const current = () => attempt.isCurrent?.() ?? true;
  const signer = new NDKNip07Signer(1000, getNdk());
  await signer.blockUntilReady();
  if (!current()) throw new Phase1AttemptCancelled();
  const event = new NDKEvent(getNdk(), template);
  await event.sign(signer, { skipContentTagging: true });
  if (!current()) throw new Phase1AttemptCancelled();
  let raw: unknown;
  try {
    raw = JSON.parse(JSON.stringify(event.rawEvent())) as unknown;
  } catch {
    return null;
  }
  const parsed = verifyFreshEvent(
    raw,
    Math.floor(Date.now() / 1000),
    template.tags[1]?.[1] === "activate-relay-invite"
      ? PHASE1_INVITE_MAX_AGE_SECONDS
      : PHASE1_LIVE_MAX_AGE_SECONDS,
  );
  return parsed ? { raw: parsed } : null;
}

export async function publishPhase1Event(signed: Phase1SignedEvent): Promise<Phase1PublishResult> {
  if (signed.raw.action === "activate-relay-invite") return { acknowledged: false, relayCount: 0 };
  const event = new NDKEvent(getNdk(), signed.raw);
  try {
    const relays = await event.publish(undefined, 3000, 1, { skipContentTagging: true });
    return { acknowledged: relays.size > 0, relayCount: relays.size };
  } catch (error) {
    if (error instanceof NDKPublishError || error instanceof Error) return { acknowledged: false, relayCount: 0 };
    return { acknowledged: false, relayCount: 0 };
  }
}

export interface Phase1RelaySubscription {
  stop(): void;
}

/** Open only the narrow activation-scoped receive path; EOSE/reconnect history is presentation-silent. */
export function createPhase1RelaySubscription(
  activationId: string,
  activationCreatedAt: number,
  onLiveEvent: (raw: unknown, meta: Phase1LiveEventMeta) => void,
): Phase1RelaySubscription {
  let stopped = false;
  let subscription: NDKSubscription | null = null;
  const filter = createPhase1Filter(activationId, activationCreatedAt);
  subscription = getNdk().subscribe(filter, {
    onEose: () => {},
    onEvent: (event, relay, _sub, fromCache = false, optimisticPublish = false) => {
      if (stopped || fromCache || optimisticPublish || !relay) return;
      const raw = typeof event.rawEvent === "function" ? event.rawEvent() : event;
      onLiveEvent(raw, { relayBacked: true, fromCache: false, optimisticPublish: false });
    },
  });
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      subscription?.stop();
      subscription = null;
    },
  };
}

export function createPhase1LiveEvidenceGate(
  getState: () => Phase1RelayState,
  setState: (state: Phase1RelayState) => void,
  onAccepted: (event: Phase1Evidence) => void,
  guard = new Phase1RelayEvidenceGuard(),
): (raw: unknown, meta: Phase1LiveEventMeta) => void {
  return (raw, meta) => {
    if (!meta.relayBacked || meta.fromCache || meta.optimisticPublish) return;
    const evidence = verifyAndAuthorizePhase1Event(raw, { state: getState(), guard });
    if (!evidence) return;
    const next = reducePhase1Evidence(getState(), evidence);
    if (next === getState()) return;
    setState(next);
    onAccepted(evidence);
  };
}
