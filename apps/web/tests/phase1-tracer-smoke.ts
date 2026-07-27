import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
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

const palaceSceneSource = readFileSync(resolve(webRoot, "src/scene/PalaceScene.tsx"), "utf8");
assert.ok(palaceSceneSource.includes("reducePhase1Relay"));
assert.ok(palaceSceneSource.includes("Phase1RelayOverlay"));
assert.ok(palaceSceneSource.includes("createPhase1RelayLifecycleGate"));
assert.ok(!palaceSceneSource.includes("@nostr-dev-kit/ndk"));
assert.ok(!palaceSceneSource.includes("nostr-tools"));

lifecycle.dispose();
