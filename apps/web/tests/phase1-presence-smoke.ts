import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FICTIONAL_WIRE_CARDS,
  INTRO_CARDS,
  INTRO_SEQUENCE,
  STREET_GLIMPSE_MS,
  introSkipTarget,
} from "../src/meaningverse/onboardingStory";
import {
  ATTENTIVE_FRAME_MAX_MS,
  ATTENTIVE_PRESENCE_THRESHOLD_MS,
  type AttentivePresenceAction,
  type AttentivePresenceState,
  createAttentivePresenceState,
  createRelayHandoffState,
  deriveRelayAssemblyEligible,
  reduceAttentivePresence,
  reduceRelayHandoff,
} from "../src/meaningverse/phase1Relay";
import { Phase1RelayOverlay } from "../src/ui/Phase1RelayOverlay";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inactive = { status: "inactive" } as const;

assert.deepEqual(
  INTRO_SEQUENCE.map((beat) => beat.id),
  ["intro_video", "card_bite", "card_wake", "card_street"],
  "canonical entry remains video then the three story cards",
);
assert.equal(INTRO_CARDS.length, 3);
assert.equal(introSkipTarget("video"), "cards");
assert.equal(introSkipTarget("cards"), "complete");
assert.equal(STREET_GLIMPSE_MS, 2400);

assert.deepEqual(
  FICTIONAL_WIRE_CARDS,
  [
    {
      kicker: "WORKSHOP NOTE",
      body: "The mushroom sorter has rejected one perfectly ordinary spoon.",
    },
    {
      kicker: "STREET WEATHER",
      body: "Copper dust after dusk. The framed windows remain opinionated.",
    },
    {
      kicker: "LOCAL STATUS",
      body: "A small machine is still humming beside a bench nobody reserved.",
    },
  ],
  "Wire copy is fixed, local, fictional, and ordered",
);

const wireMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, {
    state: inactive,
    wireOpen: true,
    onWireDismiss: () => {},
    onWireReopen: () => {},
  }),
);
assert.match(wireMarkup, /THE NEARBY WIRE/);
assert.match(wireMarkup, /FICTIONAL/);
assert.match(wireMarkup, /Put away/);
for (const card of FICTIONAL_WIRE_CARDS) {
  assert.match(wireMarkup, new RegExp(card.kicker));
  assert.match(wireMarkup, new RegExp(card.body.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.match(wireMarkup, /data-phase1-wire="open"/);
assert.match(wireMarkup, /role="dialog"/);
assert.match(wireMarkup, /aria-modal="true"/);
assert.match(wireMarkup, /Escape/);

const closedMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, {
    state: inactive,
    wireOpen: false,
    onWireDismiss: () => {},
    onWireReopen: () => {},
  }),
);
assert.match(closedMarkup, />Wire</);
assert.doesNotMatch(closedMarkup, /THE NEARBY WIRE/);
assert.doesNotMatch(closedMarkup, /WORKSHOP NOTE/);

assert.equal(ATTENTIVE_PRESENCE_THRESHOLD_MS, 36_000);
assert.equal(ATTENTIVE_FRAME_MAX_MS, 250);
const validFrame = (
  state: AttentivePresenceState,
  deltaMs: number,
  overrides: Partial<Extract<AttentivePresenceAction, { type: "active_frame_sampled" }>> = {},
) =>
  reduceAttentivePresence(state, {
    type: "active_frame_sampled",
    deltaMs,
    foregroundFocused: true,
    documentVisible: true,
    ...overrides,
  });

let presence = createAttentivePresenceState();
assert.equal(presence.feed, "away");
for (let index = 0; index < 143; index += 1) {
  presence = validFrame(presence, ATTENTIVE_FRAME_MAX_MS);
}
presence = validFrame(presence, 249);
assert.equal(presence.accumulatedMs, 35_999);
assert.equal(presence.presenceAccepted, false);
presence = validFrame(presence, 1);
assert.equal(presence.accumulatedMs, 36_000);
assert.equal(presence.presenceAccepted, true);
const acceptedPresence = validFrame(presence, 200);
assert.equal(acceptedPresence.presenceAccepted, true);
assert.equal(acceptedPresence.accumulatedMs, 36_200);

const afterForeground = reduceAttentivePresence(presence, {
  type: "feed_changed",
  feed: "foreground",
});
assert.equal(afterForeground.accumulatedMs, 36_000);
assert.equal(validFrame(afterForeground, 250).accumulatedMs, 36_000);
const afterReopened = reduceAttentivePresence(afterForeground, {
  type: "feed_changed",
  feed: "reopened",
});
assert.equal(validFrame(afterReopened, 250).accumulatedMs, 36_000);
const resumed = reduceAttentivePresence(afterReopened, { type: "feed_changed", feed: "away" });
assert.equal(validFrame(resumed, 250).accumulatedMs, 36_250);

const bounded = validFrame(createAttentivePresenceState(), 999);
assert.equal(bounded.accumulatedMs, ATTENTIVE_FRAME_MAX_MS);
for (const malformed of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
  assert.equal(
    validFrame(createAttentivePresenceState(), malformed).accumulatedMs,
    0,
    `malformed frame ${String(malformed)} must fail closed`,
  );
}
assert.equal(
  validFrame(createAttentivePresenceState(), 250, { foregroundFocused: false }).accumulatedMs,
  0,
);
assert.equal(
  validFrame(createAttentivePresenceState(), 250, { documentVisible: false }).accumulatedMs,
  0,
);
assert.equal(
  reduceAttentivePresence(
    createAttentivePresenceState(),
    null as unknown as AttentivePresenceAction,
  ).accumulatedMs,
  0,
);
assert.equal(
  reduceAttentivePresence(
    createAttentivePresenceState(),
    {
      type: "active_frame_sampled",
      deltaMs: 250,
      foregroundFocused: true,
      documentVisible: true,
      forged: true,
    } as unknown as AttentivePresenceAction,
  ).accumulatedMs,
  0,
  "extra elapsed authority fields must be ignored rather than trusted",
);
assert.ok(presence.accumulatedMs <= acceptedPresence.accumulatedMs);
assert.equal(
  reduceAttentivePresence(acceptedPresence, { type: "feed_changed", feed: "foreground" })
    .presenceAccepted,
  true,
);

const orientationLine =
  "Welcome. No rush — the Palace gets better when people leave something useful behind. Start with one small thing.";
let handoff = createRelayHandoffState();
assert.equal(deriveRelayAssemblyEligible(handoff), false);
assert.equal(
  reduceRelayHandoff(handoff, {
    type: "workbench_choice_requested",
    intent: "connect-with-others",
    origin: "player",
  }),
  handoff,
  "the workbench choice cannot precede the memory fragment",
);
const sceneOnly = reduceRelayHandoff(handoff, {
  type: "kerni_interaction_requested",
  origin: "scene",
  proximity: true,
  worldFocusOwned: true,
} as never);
assert.equal(sceneOnly, handoff, "scene callbacks cannot open an authoritative Kerni interaction");
handoff = reduceRelayHandoff(handoff, {
  type: "kerni_interaction_requested",
  origin: "player",
  proximity: true,
  worldFocusOwned: true,
});
assert.equal(handoff.orientationInteractionAccepted, true);
assert.equal(handoff.memoryFragment, null);
const syntheticMemory = reduceRelayHandoff(handoff, {
  type: "kerni_orientation_acknowledged",
  origin: "scene",
} as never);
assert.equal(syntheticMemory, handoff, "synthetic origins cannot create the memory fragment");
handoff = reduceRelayHandoff(handoff, {
  type: "kerni_orientation_acknowledged",
  origin: "player",
});
assert.deepEqual(handoff.memoryFragment, {
  source: "kerni-orientation",
  meaning: "leave-one-small-useful-thing",
});
const memoryAgain = reduceRelayHandoff(handoff, {
  type: "kerni_orientation_acknowledged",
  origin: "player",
});
assert.deepEqual(memoryAgain, handoff, "memory fragment creation is idempotent");
assert.equal(deriveRelayAssemblyEligible(handoff), false);
handoff = reduceRelayHandoff(handoff, {
  type: "workbench_choice_requested",
  intent: "connect-with-others",
  origin: "player",
});
assert.deepEqual(handoff.inspirationChoice, { intent: "connect-with-others" });
assert.equal(deriveRelayAssemblyEligible(handoff), true);
const choiceAgain = reduceRelayHandoff(handoff, {
  type: "workbench_choice_requested",
  intent: "connect-with-others",
  origin: "player",
});
assert.deepEqual(choiceAgain, handoff, "inspiration choice creation is idempotent");
const presentationOnly = reduceRelayHandoff(handoff, {
  type: "presentation_completed",
  origin: "animation",
} as never);
assert.deepEqual(presentationOnly, handoff, "presentation cannot alter the accepted handoff facts");

const overlaySource = readFileSync(resolve(webRoot, "src/ui/Phase1RelayOverlay.tsx"), "utf8");
const palaceSceneSource = readFileSync(resolve(webRoot, "src/scene/PalaceScene.tsx"), "utf8");
const kerniSource = readFileSync(resolve(webRoot, "src/scene/KerniFamiliar.tsx"), "utf8");
const onboardingSource = readFileSync(
  resolve(webRoot, "src/meaningverse/onboardingStory.ts"),
  "utf8",
);
const frontendCss = readFileSync(resolve(webRoot, "src/frontend/frontend.css"), "utf8");

const kerniMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, {
    handoffState: {
      ...createRelayHandoffState(),
      orientationInteractionAccepted: true,
    },
    kerniDialogueOpen: true,
    kerniInRange: true,
    onBeginRelay: () => {},
    onKerniAcknowledge: () => {},
    onKerniClose: () => {},
    onKerniInteract: () => {},
    state: inactive,
  }),
);
assert.match(kerniMarkup, /KERNI · WORLD AGENT · SUGGESTION ONLY/);
assert.match(kerniMarkup, /Listen to Kerni/);
assert.equal((kerniMarkup.match(new RegExp(orientationLine, "g")) ?? []).length, 1);
assert.match(kerniMarkup, /role="dialog"/);
assert.match(kerniMarkup, /aria-modal="true"/);

assert.ok(onboardingSource.includes("INTRO_SEQUENCE"));
assert.ok(onboardingSource.includes("INTRO_CARDS"));
assert.ok(onboardingSource.includes("STREET_GLIMPSE_MS = 2400"));
assert.ok(!onboardingSource.includes("The room connects on its own"));
assert.ok(!onboardingSource.includes("Name one part of the ship"));
assert.ok(overlaySource.includes("document.activeElement"));
assert.ok(overlaySource.includes("focus"));
assert.ok(overlaySource.includes("onWireDismiss"));
assert.ok(overlaySource.includes("Put away"));
assert.ok(overlaySource.includes("Escape"));
assert.ok(palaceSceneSource.includes("STREET_GLIMPSE_MS"));
assert.ok(palaceSceneSource.includes("setTimeout"));
assert.ok(palaceSceneSource.includes("wireOpen"));
assert.ok(palaceSceneSource.includes("releaseMovementKeys"));
assert.ok(frontendCss.includes(".phase1-wire"));
assert.ok(frontendCss.includes("overflow: auto"));
assert.ok(frontendCss.includes("prefers-reduced-motion"));
assert.ok(frontendCss.includes("overflow-x: hidden"));
assert.ok(kerniSource.includes("acceptedPlacement"));
assert.ok(kerniSource.includes("reactionWindow"));
assert.ok(kerniSource.includes("Math.PI / 18"));
assert.ok(kerniSource.includes("0.6"));
assert.ok(kerniSource.includes("1.2"));
assert.ok(palaceSceneSource.includes("reduceRelayHandoff"));
assert.ok(palaceSceneSource.includes("acknowledgeKerniOrientation"));
assert.ok(palaceSceneSource.includes("beginRelay"));
assert.ok(palaceSceneSource.includes("onKerniProximity"));
assert.ok(overlaySource.includes("KERNI · WORLD AGENT · SUGGESTION ONLY"));
assert.ok(overlaySource.includes("connect-with-others"));

console.log("\nPHASE 1 PRESENCE SMOKE TASK 3 GREEN");
