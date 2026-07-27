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

const overlaySource = readFileSync(resolve(webRoot, "src/ui/Phase1RelayOverlay.tsx"), "utf8");
const palaceSceneSource = readFileSync(resolve(webRoot, "src/scene/PalaceScene.tsx"), "utf8");
const onboardingSource = readFileSync(
  resolve(webRoot, "src/meaningverse/onboardingStory.ts"),
  "utf8",
);
const frontendCss = readFileSync(resolve(webRoot, "src/frontend/frontend.css"), "utf8");

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

console.log("\nPHASE 1 PRESENCE SMOKE TASK 1 GREEN");
