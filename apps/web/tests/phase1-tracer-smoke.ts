import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type Phase1RelayAction,
  type Phase1RelayState,
  RELAY_PART_ORDER,
  RELAY_SOCKET_ID,
  createPhase1RelayState,
  reducePhase1Relay,
} from "../src/meaningverse/phase1Relay";
import {
  type Phase1RelayTransport,
  createPhase1RelayLifecycleGate,
} from "../src/net/phase1RelayTransport";
import { Phase1RelayOverlay } from "../src/ui/Phase1RelayOverlay";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const attemptId = "werkstattgasse:z1:relay:attempt-1";
const memory = { source: "kerni-orientation", meaning: "leave-one-small-useful-thing" } as const;
const inspiration = { intent: "connect-with-others" } as const;
const physical = { origin: "player-physical" as const };
const createReady = () =>
  createPhase1RelayState({ memoryFragment: memory, inspirationChoice: inspiration });
const createCompleted = () => {
  let state = createReady();
  for (const part of RELAY_PART_ORDER) {
    state = reducePhase1Relay(state, { type: "pickup_part", part, ...physical });
    state = reducePhase1Relay(state, { type: "seat_part", part, cradleId: part, ...physical });
  }
  return state;
};

const openedAttempts: string[] = [];
const transport: Phase1RelayTransport = {
  openRelay(acceptedAttemptId) {
    openedAttempts.push(acceptedAttemptId);
  },
  dispose() {},
};
const lifecycle = createPhase1RelayLifecycleGate(transport);
const inactive = createPhase1RelayState();
lifecycle.apply(inactive);
assert.deepEqual(openedAttempts, [], "transport stays inert before app acceptance");

const assembled = createCompleted();
const pending = reducePhase1Relay(
  reducePhase1Relay(assembled, {
    type: "preview_placement",
    socketId: RELAY_SOCKET_ID,
    ...physical,
  }),
  { type: "place_requested", socketId: RELAY_SOCKET_ID, attemptId, ...physical },
);
assert.equal(pending.placement.status, "pending");
lifecycle.apply(pending);
assert.deepEqual(openedAttempts, [], "pending intent is not transport authority");

const accepted = reducePhase1Relay(pending, {
  type: "placement_accepted",
  socketId: RELAY_SOCKET_ID,
  attemptId,
  origin: "fixed-socket-completion",
});
assert.equal(accepted.placement.status, "accepted");
assert.equal(accepted.acceptedPlacement, true);
lifecycle.apply(accepted);
assert.deepEqual(openedAttempts, [attemptId], "accepted app truth opens transport exactly once");
lifecycle.apply(accepted);
assert.deepEqual(openedAttempts, [attemptId], "duplicate accepted state does not reopen transport");

const acceptedMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, { state: accepted }),
);
assert.match(acceptedMarkup, /aria-live="polite"/);
assert.match(acceptedMarkup, /role="status"/);
assert.match(acceptedMarkup, />OPEN</);
assert.match(acceptedMarkup, /z1-relay-socket/);
assert.match(acceptedMarkup, /foot/);
assert.match(acceptedMarkup, /coil/);
assert.match(acceptedMarkup, /aperture/);

const failed = reducePhase1Relay(pending, {
  type: "placement_failed",
  attemptId,
  origin: "fixed-socket-completion",
});
assert.equal(failed.placement.status, "failed");
assert.equal(failed.acceptedPlacement, false);
assert.equal(failed.assembly.carriedPart, "completed-relay");
assert.doesNotMatch(
  renderToStaticMarkup(React.createElement(Phase1RelayOverlay, { state: failed })),
  />OPEN</,
);

const forged = reducePhase1Relay(pending, {
  type: "activation_accepted",
  attemptId,
} as unknown as Phase1RelayAction);
assert.deepEqual(forged, pending, "removed generic activation is a permanent no-op");
assert.deepEqual(
  reducePhase1Relay(inactive, {
    type: "placement_accepted",
    socketId: RELAY_SOCKET_ID,
    attemptId,
    origin: "fixed-socket-completion",
  }),
  inactive,
  "acceptance without pending truth is inert",
);
assert.deepEqual(reducePhase1Relay(pending, null as unknown as Phase1RelayAction), pending);

const palaceSceneSource = readFileSync(resolve(webRoot, "src/scene/PalaceScene.tsx"), "utf8");
const phase1RelaySource = readFileSync(resolve(webRoot, "src/meaningverse/phase1Relay.ts"), "utf8");
const phase1TransportSource = readFileSync(
  resolve(webRoot, "src/net/phase1RelayTransport.ts"),
  "utf8",
);
const phase1OverlaySource = readFileSync(resolve(webRoot, "src/ui/Phase1RelayOverlay.tsx"), "utf8");
assert.ok(palaceSceneSource.includes("reducePhase1Relay"));
assert.ok(palaceSceneSource.includes("Phase1RelayOverlay"));
assert.ok(palaceSceneSource.includes("createPhase1RelayLifecycleGate"));
assert.ok(palaceSceneSource.includes("phase1RelayLifecycle.apply(phase1RelayState)"));
assert.ok(!palaceSceneSource.includes('type: "activation_requested"'));
assert.ok(!palaceSceneSource.includes('type: "activation_accepted"'));
assert.ok(!palaceSceneSource.includes("@nostr-dev-kit/ndk"));
assert.ok(!palaceSceneSource.includes("nostr-tools"));
for (const forbidden of ["fake peer", "loopback", "participantCount", "participant count"]) {
  assert.equal(phase1RelaySource.toLowerCase().includes(forbidden.toLowerCase()), false);
  assert.equal(phase1TransportSource.toLowerCase().includes(forbidden.toLowerCase()), false);
}
assert.ok(!phase1OverlaySource.includes("BuilderHud"));
assert.ok(!phase1OverlaySource.includes("grid"));
assert.ok(!phase1OverlaySource.includes("free placement"));
assert.ok(phase1OverlaySource.includes('data-relay-socket="werkstattgasse:z1:relay:1"'));
assert.ok(phase1OverlaySource.includes("data-placement-socket={RELAY_SOCKET_ID}"));
assert.ok(phase1OverlaySource.includes('aria-live="polite"'));

lifecycle.dispose();
console.log("\nPHASE 1 RELAY TRACER GREEN");
