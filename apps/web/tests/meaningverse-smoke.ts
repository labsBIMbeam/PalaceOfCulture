import assert from "node:assert/strict";
import {
  GAME_NAME,
  GAME_SHORT_NAME,
  PROJECT_SCALE,
  SHIP_MODULE_CAPACITY,
  SHIP_NAME,
  TUESDAY_CONTRIBUTOR_TARGET,
  buildMeaningverseInvite,
  createShipModuleNostrDraft,
  hasCoCreated,
} from "../src/meaningverse/model";
import {
  INTRO_CARDS,
  INTRO_SEQUENCE,
  TUTORIAL,
  tutorialStageFor,
} from "../src/meaningverse/onboardingStory";
import type { ShipModuleSnapshot } from "../src/net/multiplayer";

const module = (
  authorSessionId: string,
  slot: number,
  label = "Music for the crossing",
): ShipModuleSnapshot => ({
  id: `${authorSessionId}:module-${slot}`,
  slot,
  authorSessionId,
  authorHandle: authorSessionId,
  label,
  role: "signal",
  createdAt: slot,
});

assert.equal(GAME_NAME, "Meaningverse of Culture");
assert.equal(GAME_SHORT_NAME, "MoC");
assert.equal(PROJECT_SCALE, "x600billion");
assert.equal(SHIP_NAME, "Leviathan");
assert.equal(SHIP_MODULE_CAPACITY, 36);
assert.equal(TUESDAY_CONTRIBUTOR_TARGET, 30);
assert.equal(
  buildMeaningverseInvite("https://moc.example/home?old=state#noise"),
  "https://moc.example/home?join=street",
);
assert.equal(hasCoCreated([], "alice"), false);
assert.equal(hasCoCreated([module("alice", 1)], "alice"), false);
assert.equal(hasCoCreated([module("bob", 1)], "alice"), false);
assert.equal(hasCoCreated([module("alice", 1), module("bob", 2)], "alice"), true);

const draft = createShipModuleNostrDraft(module("alice", 7, "A room for play"), 1234);
assert.equal(draft.kind, 30078);
assert.equal(draft.created_at, 1234);
assert.deepEqual(JSON.parse(draft.content), {
  authorHandle: "alice",
  label: "A room for play",
  role: "signal",
  slot: 7,
  source: "human",
  world: "street",
});
assert.deepEqual(draft.tags[0], ["d", "moc:leviathan:module:7"]);
assert.ok(!("pubkey" in draft), "the draft is unsigned and carries no invented authority");

assert.deepEqual(
  INTRO_SEQUENCE.map((beat) => beat.id),
  ["intro_video", "card_bite", "card_wake", "card_street"],
);
assert.equal(INTRO_CARDS.length, 3);
const introFallback = INTRO_CARDS.map((card) => card.fallbackText).join(" ");
for (const fact of ["raccoon", "Kaiserwarte", "Kerni", "Locktard Street"]) {
  assert.ok(introFallback.includes(fact), `intro fallback must preserve ${fact}`);
}
assert.ok(introFallback.includes("Kerni was the raccoon"), "Kerni and the raccoon are one being");

for (const [id, stage] of Object.entries(TUTORIAL)) {
  assert.ok(stage.objective.length <= 48, `${id} objective exceeds the 370px panel budget`);
  assert.ok(stage.optionalKerniLine.length <= 115, `${id} Kerni line exceeds the speech budget`);
  assert.ok(!stage.offlineFallback.toLowerCase().includes("auto-complete"), `${id} fakes progress`);
}
assert.equal(
  tutorialStageFor({
    connected: false,
    label: "",
    hasOwnModule: false,
    inviteCopied: false,
    coCreated: false,
  }),
  "enter",
);
assert.equal(
  tutorialStageFor({
    connected: true,
    label: "A room for play",
    hasOwnModule: false,
    inviteCopied: false,
    coCreated: false,
  }),
  "place",
);
assert.equal(
  tutorialStageFor({
    connected: true,
    label: "",
    hasOwnModule: true,
    inviteCopied: true,
    coCreated: false,
  }),
  "co_create",
);
assert.equal(
  tutorialStageFor({
    connected: true,
    label: "",
    hasOwnModule: true,
    inviteCopied: true,
    coCreated: true,
  }),
  "co_create",
);

console.log("\nMEANINGVERSE SMOKE TESTS GREEN");
