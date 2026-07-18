import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(webRoot, "../..");

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

const menuBackgrounds = ["title.webp", "home.webp", "market.webp"];
for (const filename of menuBackgrounds) {
  const asset = resolve(webRoot, "public/frontend/bg", filename);
  assert.ok(existsSync(asset), `${filename} menu keyart must ship`);
  const size = statSync(asset).size;
  assert.ok(size >= 100_000 && size <= 500_000, `${filename} must stay within the web menu budget`);
}
const frontendCss = readFileSync(resolve(webRoot, "src/frontend/frontend.css"), "utf8");
for (const filename of menuBackgrounds) {
  assert.ok(
    frontendCss.includes(`/frontend/bg/${filename}`),
    `${filename} must be wired to a menu`,
  );
}
assert.ok(frontendCss.includes(".screen--workshop::before"), "market keyart covers Workshop");
assert.ok(
  readFileSync(resolve(webRoot, "src/scene/furnitureCatalog.ts"), "utf8").includes(
    'DEFAULT_FRAME_IMAGE = "/frontend/bg/home.webp"',
  ),
  "placed frames use the approved Home keyart",
);
for (const obsolete of ["title.png", "home.png", "pleb.png", "style.png"]) {
  assert.equal(
    existsSync(resolve(webRoot, "public/frontend/bg", obsolete)),
    false,
    `${obsolete} giant-palace keyart must stay removed`,
  );
}
const godotMenu = readFileSync(resolve(repositoryRoot, "godot/scripts/ui/main_menu.gd"), "utf8");
assert.ok(godotMenu.includes('preload("res://assets/ui/title.webp")'), "Godot shares title keyart");
assert.ok(
  existsSync(resolve(repositoryRoot, "godot/assets/ui/title.webp")),
  "Godot title keyart ships",
);

console.log("\nMEANINGVERSE SMOKE TESTS GREEN");
