import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMeaningverseInvite,
  createPhase1InviteAttempt,
  isPhase1SignerCapability,
  type Phase1InviteState,
} from "../src/meaningverse/model";
import { finalizeEvent, getPublicKey } from "nostr-tools";
import {
  PHASE1_EVENT_KIND,
  PHASE1_MAX_EVENT_BYTES,
  createPhase1ActivationTemplate,
  createPhase1Filter,
  createPhase1LensTemplate,
  createPhase1WitnessTemplate,
  parsePhase1RelayEvent,
  verifyAndAuthorizePhase1Event,
  verifyPhase1ActivationCapability,
  Phase1RelayEvidenceGuard,
} from "../src/net/phase1RelayTransport";
import {
  PHASE1_RELAY_ID,
  createPhase1RelayState,
  importVerifiedActivationCapability,
  reducePhase1Relay,
} from "../src/meaningverse/phase1Relay";

const phase1State = createPhase1RelayState({
  memoryFragment: { source: "kerni-orientation", meaning: "leave-one-small-useful-thing" },
  inspirationChoice: { intent: "connect-with-others" },
});

let assembled = phase1State;
for (const part of ["foot", "coil", "aperture"] as const) {
  assembled = reducePhase1Relay(assembled, {
    type: "pickup_part",
    part,
    origin: "player-physical",
  });
  assembled = reducePhase1Relay(assembled, {
    type: "seat_part",
    part,
    cradleId: part,
    origin: "player-physical",
  });
}
assembled = reducePhase1Relay(assembled, {
  type: "preview_placement",
  socketId: "z1-relay-socket",
  origin: "player-physical",
});
assembled = reducePhase1Relay(assembled, {
  type: "place_requested",
  socketId: "z1-relay-socket",
  attemptId: "attempt-1",
  origin: "player-physical",
});
assembled = reducePhase1Relay(assembled, {
  type: "placement_accepted",
  socketId: "z1-relay-socket",
  attemptId: "attempt-1",
  origin: "fixed-socket-completion",
});
assert.equal(assembled.relayId, PHASE1_RELAY_ID);
assert.equal(assembled.status, "accepted");

const creatorHref = "https://palace.example/play?noise=drop&join=wrong#old";
assert.equal(
  buildMeaningverseInvite(creatorHref),
  "https://palace.example/play?join=street",
  "the legacy invite remains the canonical bare Street invite",
);
assert.equal(
  buildMeaningverseInvite(creatorHref, "signed-capability"),
  "https://palace.example/play?join=street&activation=signed-capability",
);

const initialAttempt = createPhase1InviteAttempt();
assert.equal(initialAttempt.state, "idle");
assert.ok(initialAttempt.token.length > 0);
assert.ok(isPhase1SignerCapability({ getPublicKey() {}, signEvent() {} }));
assert.equal(isPhase1SignerCapability({ getPublicKey: "nope", signEvent() {} }), false);
const states: Phase1InviteState[] = [
  "idle",
  "consent",
  "signer_pending",
  "copied",
  "manual",
  "failed",
  "cancelled",
];
assert.equal(new Set(states).size, states.length);

const routeOnly = createPhase1RelayState();
const unchanged = importVerifiedActivationCapability(routeOnly, {
  relayId: PHASE1_RELAY_ID,
  activationId: "not-a-verified-event",
  creatorPubkey: "f".repeat(64),
  source: "route",
});
assert.equal(unchanged, routeOnly, "route-shaped data cannot create activation truth");

const now = 1_800_000_000;
const creatorSecret = new Uint8Array(32).fill(7);
const witnessSecret = new Uint8Array(32).fill(8);
const creatorPubkey = getPublicKey(creatorSecret);
const witnessPubkey = getPublicKey(witnessSecret);
const creatorState = {
  ...assembled,
  activation: null,
};
const activationTemplate = createPhase1ActivationTemplate(creatorState, creatorPubkey, now);
assert.equal(activationTemplate.kind, PHASE1_EVENT_KIND);
assert.equal(activationTemplate.content, "");
assert.deepEqual(activationTemplate.tags, [
  ["t", "palace-phase-1"],
  ["action", "activate-relay-invite"],
  ["relay", PHASE1_RELAY_ID],
  ["creator", creatorPubkey],
]);
const activationEvent = finalizeEvent(activationTemplate, creatorSecret);
const activation = verifyPhase1ActivationCapability(activationEvent, now);
assert.ok(activation);
assert.equal(activation?.activationId, activationEvent.id);
assert.equal(activation?.creatorPubkey, creatorPubkey);
assert.equal(verifyPhase1ActivationCapability({ ...activationEvent, content: "published" }, now), null);
assert.equal(verifyPhase1ActivationCapability(activationEvent, now + 901), null);
assert.equal(verifyPhase1ActivationCapability(activationEvent, now - 61), null);

const signedState = importVerifiedActivationCapability(routeOnly, activation);
assert.equal(signedState.relayId, PHASE1_RELAY_ID);
const witnessTemplate = createPhase1WitnessTemplate(signedState, witnessPubkey, now);
assert.deepEqual(witnessTemplate.tags, [
  ["t", "palace-phase-1"],
  ["action", "touch-relay-witness"],
  ["relay", PHASE1_RELAY_ID],
  ["e", activationEvent.id],
  ["p", creatorPubkey],
]);
const witnessEvent = finalizeEvent(witnessTemplate, witnessSecret);
const witnessEvidence = verifyAndAuthorizePhase1Event(witnessEvent, {
  state: signedState,
  now,
  guard: new Phase1RelayEvidenceGuard(),
});
assert.equal(witnessEvidence?.action, "touch-relay-witness");
assert.equal(verifyAndAuthorizePhase1Event(witnessEvent, { state: signedState, now }), null);
const lensTemplate = createPhase1LensTemplate(
  { ...signedState, acceptedWitness: { eventId: witnessEvent.id, pubkey: witnessPubkey, createdAt: now } },
  witnessPubkey,
  now,
);
assert.deepEqual(lensTemplate.tags, [
  ["t", "palace-phase-1"],
  ["action", "attach-signal-lens"],
  ["relay", PHASE1_RELAY_ID],
  ["e", activationEvent.id],
  ["p", creatorPubkey],
  ["w", witnessEvent.id],
]);
const lensEvent = finalizeEvent(lensTemplate, witnessSecret);
assert.equal(parsePhase1RelayEvent(lensEvent)?.action, "attach-signal-lens");
assert.equal(
  verifyAndAuthorizePhase1Event(lensEvent, {
    state: { ...signedState, acceptedWitness: { eventId: witnessEvent.id, pubkey: witnessPubkey, createdAt: now } },
    now,
  })?.action,
  "attach-signal-lens",
);
assert.deepEqual(createPhase1Filter(activationEvent.id, activationEvent.created_at), {
  kinds: [PHASE1_EVENT_KIND],
  "#e": [activationEvent.id],
  since: activationEvent.created_at - 60,
  limit: 16,
});
assert.ok(PHASE1_MAX_EVENT_BYTES >= 4096);
assert.equal(parsePhase1RelayEvent({ ...activationEvent, extra: true }), null);
assert.equal(parsePhase1RelayEvent({ ...activationEvent, tags: activationEvent.tags.slice().reverse() }), null);
assert.equal(parsePhase1RelayEvent(JSON.stringify({ ...activationEvent, content: "x" })), null);

const modelSource = readFileSync(new URL("../src/meaningverse/model.ts", import.meta.url), "utf8");
const relaySource = readFileSync(new URL("../src/meaningverse/phase1Relay.ts", import.meta.url), "utf8");
const overlaySource = readFileSync(new URL("../src/ui/Phase1RelayOverlay.tsx", import.meta.url), "utf8");
const sceneSource = readFileSync(new URL("../src/scene/PalaceScene.tsx", import.meta.url), "utf8");
assert.doesNotMatch(modelSource, /dangerouslySetInnerHTML/);
assert.doesNotMatch(overlaySource, /dangerouslySetInnerHTML/);
assert.match(overlaySource, /Copy invite/);
assert.match(overlaySource, /Copy the invite manually/);
assert.match(overlaySource, /Not now/);
assert.match(overlaySource, /aria-live="polite"/);
assert.match(sceneSource, /domOwnsWorldFocus/);
assert.match(relaySource, /importVerifiedActivationCapability/);
assert.doesNotMatch(sceneSource, /from ["'](?:nostr-tools|@nostr-dev-kit\/ndk)/);

console.log("PHASE1 WITNESS SECURITY SMOKE RED/GREEN TASK 1: assertions loaded");
