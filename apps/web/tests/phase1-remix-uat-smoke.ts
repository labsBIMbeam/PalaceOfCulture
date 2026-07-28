import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PHASE1_EVENT_KIND,
  parsePhase1RelayEvent,
  reducePhase1Evidence,
  verifyAndAuthorizePhase1Event,
  Phase1RelayEvidenceGuard,
} from "../src/net/phase1RelayTransport";
import {
  PHASE1_RELAY_ID,
  createPhase1RelayState,
  createPhase1AuthorizedEvidenceAction,
  diffPhase1AcceptedEvidence,
  getPhase1Attributions,
  reducePhase1Relay,
} from "../src/meaningverse/phase1Relay";
import { Phase1RelayOverlay } from "../src/ui/Phase1RelayOverlay";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { finalizeEvent, getPublicKey } from "nostr-tools";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path: string) => readFileSync(resolve(webRoot, path), "utf8");
const relaySource = source("src/meaningverse/phase1Relay.ts");
const overlaySource = source("src/ui/Phase1RelayOverlay.tsx");
const palaceSource = source("src/scene/PalaceScene.tsx");
const streetSource = source("src/scene/StreetWorld.tsx");
const cssSource = source("src/frontend/frontend.css");
const transportSource = source("src/net/phase1RelayTransport.ts");

const creatorSecret = new Uint8Array(32).fill(31);
const witnessSecret = new Uint8Array(32).fill(32);
const creatorPubkey = getPublicKey(creatorSecret);
const witnessPubkey = getPublicKey(witnessSecret);
const activationId = "a".repeat(64);
const witnessId = "b".repeat(64);
const lensId = "c".repeat(64);
const now = 1_800_000_000;

const baseState = createPhase1RelayState();
const activationState = reducePhase1Relay(baseState, {
  type: "activation_imported",
  activationId,
  creatorPubkey,
  createdAt: now,
  origin: "verified-invite-capability",
});

const witnessTemplate = {
  kind: PHASE1_EVENT_KIND,
  created_at: now,
  content: "",
  tags: [
    ["t", "palace-phase-1"],
    ["action", "touch-relay-witness"],
    ["relay", PHASE1_RELAY_ID],
    ["e", activationId],
    ["p", creatorPubkey],
  ],
};
const witnessEvent = finalizeEvent(witnessTemplate, witnessSecret);
const witnessGuard = new Phase1RelayEvidenceGuard();
const authorizedWitness = verifyAndAuthorizePhase1Event(witnessEvent, {
  state: activationState,
  now,
  guard: witnessGuard,
});
assert.ok(authorizedWitness, "Plan 04 must authorize the network-free witness fixture first");
const witnessAction = createPhase1AuthorizedEvidenceAction(authorizedWitness);
assert.ok(witnessAction, "Plan 05 accepts only the typed Plan-04 authorized action seam");
const witnessedState = reducePhase1Relay(activationState, witnessAction);
assert.equal(witnessedState.acceptedWitness?.eventId, witnessEvent.id);
assert.equal(reducePhase1Relay(witnessedState, witnessAction), witnessedState);

const lensTemplate = {
  kind: PHASE1_EVENT_KIND,
  created_at: now,
  content: "",
  tags: [
    ["t", "palace-phase-1"],
    ["action", "attach-signal-lens"],
    ["relay", PHASE1_RELAY_ID],
    ["e", activationId],
    ["p", creatorPubkey],
    ["w", witnessEvent.id],
  ],
};
const lensEvent = finalizeEvent(lensTemplate, witnessSecret);
const authorizedLens = verifyAndAuthorizePhase1Event(lensEvent, {
  state: witnessedState,
  now,
  guard: new Phase1RelayEvidenceGuard(),
});
assert.ok(authorizedLens, "Plan 04 must authorize the exact lens contract first");
const lensAction = createPhase1AuthorizedEvidenceAction(authorizedLens);
assert.ok(lensAction);
const creatorBeforeLens = witnessedState.activation;
const lensState = reducePhase1Relay(witnessedState, lensAction);
assert.equal(lensState.acceptedLens?.eventId, lensEvent.id);
assert.deepEqual(lensState.activation, creatorBeforeLens, "lens acceptance cannot mutate creator truth");
assert.equal(lensState.acceptedLens?.pubkey, lensState.acceptedWitness?.pubkey);
assert.deepEqual(getPhase1Attributions(lensState), [
  { kind: "creator", pubkey: creatorPubkey },
  { kind: "signal-lens", eventId: lensEvent.id, pubkey: witnessPubkey, witnessEventId: witnessEvent.id, createdAt: now },
]);
assert.deepEqual(reducePhase1Relay(lensState, lensAction), lensState, "second lens is a no-op");

const initial = diffPhase1AcceptedEvidence(null, witnessedState);
assert.deepEqual(initial.delta, null, "initial accepted evidence is a silent baseline");
const live = diffPhase1AcceptedEvidence(initial.baseline, lensState);
assert.equal(live.delta?.kind, "lens");
const duplicate = diffPhase1AcceptedEvidence(live.baseline, lensState);
assert.equal(duplicate.delta, null);
const reconnect = diffPhase1AcceptedEvidence(null, lensState);
assert.equal(reconnect.delta, null, "reconnect history is silent");

const noAnswerMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, { state: activationState }),
);
assert.match(noAnswerMarkup, /Relay is OPEN/);
assert.match(noAnswerMarkup, /No answer yet\. The light stays on\./);
assert.match(noAnswerMarkup, /open-circle|◯|steady/i);
assert.doesNotMatch(noAnswerMarkup, /online|participant|people nearby|deadline|penalty|count/i);
const lensMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, { state: lensState }),
);
assert.match(lensMarkup, /Lens added\./);
assert.match(lensMarkup, /RELAY · BUILT BY/);
assert.match(lensMarkup, /SIGNAL LENS · ADDED BY/);
assert.match(lensMarkup, new RegExp(witnessPubkey));
assert.doesNotMatch(lensMarkup, /verified human|Palace handle|dangerouslySetInnerHTML/i);

assert.match(palaceSource, /SignedPulseEffect/);
assert.match(palaceSource, /900/);
assert.match(palaceSource, /createPhase1AuthorizedEvidenceAction/);
assert.doesNotMatch(palaceSource, /dispatchPhase1Relay\(\{\s*type:\s*"(?:witness_verified|lens_verified)"/s);
assert.match(streetSource, /SignalLens/);
assert.match(streetSource, /acceptedLens/);
assert.match(cssSource, /phase1-signed-pulse/);
assert.match(cssSource, /900ms/);
assert.match(cssSource, /overflow-wrap:\s*anywhere/);
assert.match(overlaySource, /No answer yet\. The light stays on\./);
assert.match(overlaySource, /Reduced effects/);
assert.match(overlaySource, /Muted/);
assert.match(overlaySource, /aria-live="polite"/);
assert.doesNotMatch(overlaySource, /dangerouslySetInnerHTML/);
assert.doesNotMatch(relaySource, /signPhase1|publishPhase1|createPhase1RelaySubscription|parsePhase1RelayEvent|verifyEvent/);
assert.doesNotMatch(relaySource, /participant count|fake avatar|townsfolk|ghost session|ambient evidence/i);
assert.doesNotMatch(palaceSource, /from ["'](?:nostr-tools|@nostr-dev-kit\/ndk)/);
assert.match(transportSource, /createPhase1LiveEvidenceGate/);

for (const decision of [
  "D-01", "D-02", "D-03", "D-04", "D-05", "D-06", "D-07", "D-08", "D-09", "D-10",
  "D-11", "D-12", "D-13", "D-14", "D-15", "D-16", "D-17", "D-18", "D-19", "D-20",
  "D-21", "D-22", "D-23", "D-24", "D-25", "D-26",
]) {
  assert.ok(
    source("../../.planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md").includes(`**${decision}:**`),
    `${decision} must remain locked in the phase context`,
  );
}

console.log("PHASE 1 REMIX UAT SMOKE RED/GREEN CONTRACT");
