import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type Phase1RelayAction,
  type Phase1RelayState,
  reducePhase1Relay,
} from "../src/meaningverse/phase1Relay";
import {
  type Phase1RelayTransport,
  createPhase1RelayLifecycleGate,
} from "../src/net/phase1RelayTransport";
import { Phase1RelayOverlay } from "../src/ui/Phase1RelayOverlay";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const attemptId = "werkstattgasse:z1:relay:attempt-1";
const inactive: Phase1RelayState = { status: "inactive" };

const openedAttempts: string[] = [];
const transport: Phase1RelayTransport = {
  openRelay(acceptedAttemptId) {
    openedAttempts.push(acceptedAttemptId);
  },
  dispose() {},
};
const lifecycle = createPhase1RelayLifecycleGate(transport);

lifecycle.apply(inactive);
assert.deepEqual(openedAttempts, [], "the relay transport stays inert before app acceptance");

const pending = reducePhase1Relay(inactive, {
  type: "activation_requested",
  attemptId,
});
assert.equal(pending.status, "pending");
lifecycle.apply(pending);
assert.deepEqual(openedAttempts, [], "pending intent is not transport authority");

const accepted = reducePhase1Relay(pending, {
  type: "activation_accepted",
  attemptId,
});
assert.equal(accepted.status, "accepted");
lifecycle.apply(accepted);
assert.deepEqual(openedAttempts, [attemptId], "accepted app truth opens the transport exactly once");

const acceptedMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, { state: accepted }),
);
assert.match(acceptedMarkup, /aria-live="polite"/);
assert.match(acceptedMarkup, /role="status"/);
assert.match(acceptedMarkup, />OPEN</, "accepted app truth exposes restrained semantic OPEN");

const pendingMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, { state: pending }),
);
assert.match(pendingMarkup, /Securing relay…/);
assert.doesNotMatch(pendingMarkup, />OPEN</);

const failed = reducePhase1Relay(pending, {
  type: "activation_failed",
  attemptId,
});
const failedMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, { state: failed }),
);
assert.match(failedMarkup, /The relay did not secure\. Try the socket again\./);
assert.doesNotMatch(failedMarkup, />OPEN</);

const cancelled = reducePhase1Relay(pending, {
  type: "activation_cancelled",
  attemptId,
});
const cancelledMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, { state: cancelled }),
);
assert.doesNotMatch(cancelledMarkup, />OPEN</);

const forgedSocialAction = {
  type: "activation_accepted",
  attemptId,
  participantCount: 2,
  peer: "ghost-session",
} as unknown as Phase1RelayAction;
assert.equal(
  reducePhase1Relay(pending, forgedSocialAction),
  pending,
  "extra peer/social fields cannot become acceptance authority",
);
assert.equal(
  reducePhase1Relay(pending, null as unknown as Phase1RelayAction),
  pending,
  "an unknown action shape is a no-op rather than an exception",
);

const forgedAccept = reducePhase1Relay(inactive, {
  type: "activation_accepted",
  attemptId,
});
assert.equal(forgedAccept, inactive, "acceptance without pending truth is inert");
const staleAccept = reducePhase1Relay(pending, {
  type: "activation_accepted",
  attemptId: "werkstattgasse:z1:relay:stale",
});
assert.equal(staleAccept, pending, "stale attempt acceptance is inert");
const duplicateAccept = reducePhase1Relay(accepted, {
  type: "activation_accepted",
  attemptId,
});
assert.equal(duplicateAccept, accepted, "accepted truth is monotonic");
const failedAfterAccept = reducePhase1Relay(accepted, {
  type: "activation_failed",
  attemptId,
});
assert.equal(failedAfterAccept, accepted, "failure cannot demote accepted truth");
const acceptAfterCancel = reducePhase1Relay(cancelled, {
  type: "activation_accepted",
  attemptId,
});
assert.equal(acceptAfterCancel, cancelled, "cancellation cannot be resurrected");

const palaceSceneSource = readFileSync(resolve(webRoot, "src/scene/PalaceScene.tsx"), "utf8");
const phase1RelaySource = readFileSync(
  resolve(webRoot, "src/meaningverse/phase1Relay.ts"),
  "utf8",
);
const phase1TransportSource = readFileSync(
  resolve(webRoot, "src/net/phase1RelayTransport.ts"),
  "utf8",
);
const phase1OverlaySource = readFileSync(
  resolve(webRoot, "src/ui/Phase1RelayOverlay.tsx"),
  "utf8",
);
assert.ok(palaceSceneSource.includes("reducePhase1Relay"));
assert.ok(palaceSceneSource.includes("Phase1RelayOverlay"));
assert.ok(palaceSceneSource.includes("createPhase1RelayLifecycleGate"));
assert.ok(palaceSceneSource.includes('phase1RelayState.status !== "accepted"'));
assert.ok(palaceSceneSource.includes("phase1RelayLifecycle.apply(phase1RelayState)"));
assert.ok(palaceSceneSource.includes('type: "activation_requested"'));
assert.ok(palaceSceneSource.includes('type: "activation_accepted"'));
assert.ok(!palaceSceneSource.includes('data-relay-socket="werkstattgasse:z1:relay:1"'));
assert.ok(!palaceSceneSource.includes("@nostr-dev-kit/ndk"));
assert.ok(!palaceSceneSource.includes("nostr-tools"));
assert.ok(!palaceSceneSource.includes("from \"nostr-tools\""));

for (const forbidden of [
  "fake peer",
  "ambient",
  "backlog",
  "loopback",
  "participantCount",
  "participant count",
  "Kerni",
  "timer",
  "animation",
]) {
  assert.equal(
    phase1RelaySource.toLowerCase().includes(forbidden.toLowerCase()),
    false,
    `reducer source must not encode ${forbidden} as authority`,
  );
  assert.equal(
    phase1TransportSource.toLowerCase().includes(forbidden.toLowerCase()),
    false,
    `transport source must not encode ${forbidden} as authority`,
  );
}
assert.ok(!phase1OverlaySource.includes("BuilderHud"));
assert.ok(!phase1OverlaySource.includes("grid"));
assert.ok(!phase1OverlaySource.includes("free placement"));
assert.ok(phase1OverlaySource.includes('data-relay-socket="werkstattgasse:z1:relay:1"'));
assert.ok(phase1OverlaySource.includes('aria-live="polite"'));

lifecycle.dispose();
console.log("\nPHASE 1 RELAY TRACER GREEN");
