import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIRST_RAID,
  RAID_SPECIALTIES,
  inviteShareComplete,
  inviteStateAfterManualCopy,
  raidCompleteFor,
} from "../src/meaningverse/firstRaid";
import {
  GAME_NAME,
  GAME_SHORT_NAME,
  PROJECT_SCALE,
  SHIP_MODULE_CAPACITY,
  SHIP_NAME,
  TUESDAY_CONTRIBUTOR_TARGET,
  buildMeaningverseInvite,
  createShipModuleNostrDraft,
  diffShipPlacementEpoch,
  diffShipPlacements,
  hasCoCreated,
  newestShipModule,
} from "../src/meaningverse/model";
import {
  INTRO_CARDS,
  INTRO_SEQUENCE,
  TUTORIAL,
  TUTORIAL_STAGE_LABELS,
  TUTORIAL_STAGE_ORDER,
  introSkipTarget,
  tutorialStageFor,
  tutorialStepNumber,
} from "../src/meaningverse/onboardingStory";
import type { ShipModuleSnapshot } from "../src/net/multiplayer";
import { connectedParticipantCount } from "../src/net/multiplayer";
import { ROSTER } from "../src/ui/members";

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
  source: "session",
  world: "street",
});
assert.deepEqual(draft.tags[0], ["d", "moc:leviathan:module:7"]);
assert.ok(!("pubkey" in draft), "the draft is unsigned and carries no invented authority");

// Placement feedback derives only from confirmed snapshot diffs: the initial room sync is silent,
// and only genuinely new modules pulse — attributed to the local player or a peer, never invented.
assert.deepEqual(diffShipPlacements(null, [module("alice", 1)], "alice"), []);
assert.deepEqual(diffShipPlacements([module("alice", 1)], [module("alice", 1)], "alice"), []);
assert.deepEqual(diffShipPlacements([], [module("alice", 1)], "alice"), [
  { module: module("alice", 1), byLocalPlayer: true },
]);
assert.deepEqual(
  diffShipPlacements([module("alice", 1)], [module("alice", 1), module("bob", 2)], "alice"),
  [{ module: module("bob", 2), byLocalPlayer: false }],
);
assert.deepEqual(diffShipPlacements([], [module("bob", 1)], undefined), [
  { module: module("bob", 1), byLocalPlayer: false },
]);

// Reconnect is a new observation epoch: the authoritative room resync is a silent baseline, not a
// burst of fake placement feedback, even when Colyseus preserves the same session id.
const initialEpoch = diffShipPlacementEpoch(null, [module("alice", 1)], "connected", "alice");
assert.deepEqual(initialEpoch.events, []);
assert.equal(initialEpoch.reset, true);
const livePlacement = diffShipPlacementEpoch(
  initialEpoch.baseline,
  [module("alice", 1), module("bob", 2)],
  "connected",
  "alice",
);
assert.equal(livePlacement.reset, false);
assert.deepEqual(livePlacement.events, [{ module: module("bob", 2), byLocalPlayer: false }]);
const disconnectedEpoch = diffShipPlacementEpoch(
  livePlacement.baseline,
  [],
  "reconnecting",
  undefined,
);
assert.equal(disconnectedEpoch.baseline, null);
assert.equal(disconnectedEpoch.reset, true);
const resyncedEpoch = diffShipPlacementEpoch(
  disconnectedEpoch.baseline,
  [module("alice", 1), module("bob", 2)],
  "connected",
  "alice",
);
assert.deepEqual(resyncedEpoch.events, [], "authoritative reconnect snapshot must stay silent");

assert.equal(connectedParticipantCount([]), 1);
assert.equal(connectedParticipantCount([{ connected: true }, { connected: false }]), 2);
assert.equal(inviteStateAfterManualCopy(null), "idle", "cancelled prompt must not advance Invite");
assert.equal(inviteStateAfterManualCopy(""), "shown", "manual-copy prompt acknowledged with OK");
assert.equal(inviteShareComplete("idle"), false);
assert.equal(inviteShareComplete("shown"), false, "displaying a link does not prove sharing");
assert.equal(inviteShareComplete("copied"), true);
assert.equal(inviteShareComplete("confirmed"), true);
assert.equal(raidCompleteFor("shown", true), false, "co-create cannot bypass Invite");
assert.equal(raidCompleteFor("confirmed", true), true);

assert.equal(newestShipModule([]), undefined);
const older = { ...module("alice", 4), createdAt: 10 };
const newer = { ...module("bob", 2), createdAt: 20 };
assert.deepEqual(newestShipModule([newer, older]), newer);
assert.deepEqual(newestShipModule([older, newer]), newer);
// Equal timestamps (server clock granularity): the higher slot is the later acceptance.
assert.deepEqual(newestShipModule([module("alice", 3), module("bob", 9)]), module("bob", 9));

assert.deepEqual(
  INTRO_SEQUENCE.map((beat) => beat.id),
  ["intro_video", "card_bite", "card_wake", "card_street"],
);
assert.equal(INTRO_CARDS.length, 3);
const introFallback = INTRO_CARDS.map((card) => card.fallbackText).join(" ");
for (const fact of ["raccoon", "blood", "Kerni", "Locktard Street", "culture"]) {
  assert.ok(introFallback.includes(fact), `intro fallback must preserve ${fact}`);
}
assert.ok(introFallback.includes("Kerni was the raccoon"), "Kerni and the raccoon are one being");
assert.ok(
  INTRO_CARDS[0]?.line.includes("faint"),
  "the bite must land on the family-slapstick faint",
);
assert.ok(
  INTRO_CARDS[2]?.line.includes("not a cult"),
  "the culture line must survive runtime copy",
);

// Video skip never erases the canon. Story cards have no second skip control, so a click racing
// the video-ended transition cannot leave the intro.
assert.equal(introSkipTarget("video"), "cards");
const introScreenSource = readFileSync(resolve(webRoot, "src/frontend/IntroScreen.tsx"), "utf8");
assert.ok(
  introScreenSource.includes("onClick={openCards}"),
  "the only intro skip control must open the canonical story cards",
);
assert.ok(
  !introScreenSource.includes('"Skip story"'),
  "story cards must not reuse the video-skip button and permit a transition-race bypass",
);
assert.ok(
  !introScreenSource.includes("onClick={onComplete}"),
  "no intro button may exit the intro directly and bypass the story cards",
);

const godotIntroSource = readFileSync(
  resolve(repositoryRoot, "godot/scripts/ui/intro_screen.gd"),
  "utf8",
);
const gdString = (value: string) => value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
for (const card of INTRO_CARDS) {
  for (const key of ["kicker", "caption", "line"] as const) {
    assert.ok(
      godotIntroSource.includes(`"${key}": "${gdString(card[key])}"`),
      `Godot intro ${key} must exactly match Web card ${card.id}`,
    );
  }
}

assert.equal(FIRST_RAID.id, "light-the-street");
assert.equal(FIRST_RAID.checkpoints.length, TUTORIAL_STAGE_ORDER.length);
assert.deepEqual(
  FIRST_RAID.checkpoints.map((checkpoint) => checkpoint.stage),
  TUTORIAL_STAGE_ORDER,
  "raid progress must reuse truthful tutorial facts",
);
assert.ok(FIRST_RAID.v4v.includes("No entry fee"), "V4V is contribution, not mandatory payment");
assert.ok(FIRST_RAID.v4v.includes("moves no money"), "the visible raid copy states no payment");
assert.ok(
  !FIRST_RAID.premise.includes("real person"),
  "session evidence must not claim identity proof",
);
assert.ok(
  FIRST_RAID.paymentBoundary.includes("never moves money"),
  "the first raid is payment-free",
);
assert.equal(RAID_SPECIALTIES.benarc, "Hardware Thinker");
assert.equal(RAID_SPECIALTIES.michael1011, "Node Operator");
for (const member of ROSTER) {
  assert.notEqual(member.specialty, "Open Contributor", `${member.name} needs a raid specialty`);
  const approved = member.name === "benarc" || member.name === "michael1011";
  assert.equal(
    member.specialtyStatus,
    approved ? "approved" : "draft",
    `${member.name} needs a truthful specialty status`,
  );
}

for (const [id, stage] of Object.entries(TUTORIAL)) {
  assert.ok(stage.objective.length <= 48, `${id} objective exceeds the 370px panel budget`);
  assert.ok(stage.optionalKerniLine.length <= 115, `${id} Kerni line exceeds the speech budget`);
  assert.ok(!stage.offlineFallback.toLowerCase().includes("auto-complete"), `${id} fakes progress`);
}
// The step rail and the objective header derive from one canonical stage order, so the
// "you are here" marker can never drift from the objective copy.
assert.deepEqual(TUTORIAL_STAGE_ORDER, ["enter", "create", "place", "invite", "co_create"]);
assert.deepEqual([...TUTORIAL_STAGE_ORDER].sort(), Object.keys(TUTORIAL).sort());
assert.equal(tutorialStepNumber("enter"), 1);
assert.equal(tutorialStepNumber("place"), 3);
assert.equal(tutorialStepNumber("co_create"), 5);
for (const stage of TUTORIAL_STAGE_ORDER) {
  assert.ok(TUTORIAL_STAGE_LABELS[stage], `${stage} needs a human-readable step label`);
  assert.ok(!TUTORIAL_STAGE_LABELS[stage].includes("_"), `${stage} label leaks a machine slug`);
}

assert.equal(
  tutorialStageFor({
    connected: false,
    label: "",
    hasOwnModule: false,
    inviteShared: false,
    coCreated: false,
  }),
  "enter",
);
assert.equal(
  tutorialStageFor({
    connected: true,
    label: "A room for play",
    hasOwnModule: false,
    inviteShared: false,
    coCreated: false,
  }),
  "place",
);
assert.equal(
  tutorialStageFor({
    connected: false,
    label: "A room for play",
    hasOwnModule: false,
    inviteShared: false,
    coCreated: false,
  }),
  "enter",
  "a typed name while disconnected must not advance the header past Enter",
);
assert.equal(
  tutorialStageFor({
    connected: false,
    label: "",
    hasOwnModule: true,
    inviteShared: true,
    coCreated: true,
  }),
  "enter",
  "no signal advances the stage while the live room is disconnected",
);
assert.equal(
  tutorialStageFor({
    connected: true,
    label: "",
    hasOwnModule: true,
    inviteShared: true,
    coCreated: false,
  }),
  "co_create",
);
assert.equal(
  tutorialStageFor({
    connected: true,
    label: "",
    hasOwnModule: true,
    inviteShared: false,
    coCreated: true,
  }),
  "invite",
  "co-create evidence cannot bypass the unfinished Invite checkpoint",
);
assert.equal(
  tutorialStageFor({
    connected: true,
    label: "",
    hasOwnModule: true,
    inviteShared: true,
    coCreated: true,
  }),
  "co_create",
);

const meaningShip = readFileSync(resolve(webRoot, "src/scene/MeaningShip.tsx"), "utf8");
assert.ok(
  meaningShip.includes("diffShipPlacementEpoch"),
  "the ship's placement pulse must derive from connected-epoch snapshot diffs",
);
assert.ok(
  meaningShip.includes("newestShipModule"),
  "the ship label must credit the newest session module",
);

assert.ok(
  meaningShip.includes("PLAZA_CENTRE"),
  "the ship hovers over the shared plaza centre, never a hand-copied coordinate",
);

const meaningPath = readFileSync(resolve(webRoot, "src/ui/MeaningPath.tsx"), "utf8");
assert.ok(
  meaningPath.includes("TUTORIAL_STAGE_ORDER"),
  "the step rail must render from the canonical stage order",
);
assert.ok(
  meaningPath.includes('aria-current={stage === tutorialStage ? "step" : undefined}'),
  "the current tutorial step must be exposed as aria-current",
);
assert.ok(
  meaningPath.includes("focusNonce") && meaningPath.includes("labelInput"),
  "the ship dock's action must land focus in the Name-your-part field",
);

const palaceScene = readFileSync(resolve(webRoot, "src/scene/PalaceScene.tsx"), "utf8");
assert.ok(
  palaceScene.includes('"open-ship-panel"'),
  "PalaceScene must route the dock action to the creation panel instead of a dialog",
);
assert.ok(
  palaceScene.includes("open={mocOpen}"),
  "the creation panel's open state lives in the scene so mode switches never reset it",
);

// Entering the street no longer connects the old room on sight. The live multiplayer surface is
// gated on the accepted Phase-1 relay, so solitude before activation is a structural guarantee.
assert.match(
  palaceScene,
  /world === "street" && phase1RelayState\.status === "accepted" \? \(\s*<MultiplayerLayer/,
  "MultiplayerLayer must mount only in the street behind an accepted relay",
);
assert.equal(
  (palaceScene.match(/<MultiplayerLayer/g) ?? []).length,
  1,
  "one MultiplayerLayer mount site only, so the accepted-relay gate cannot be bypassed",
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
// One signal language: maker actions carry the same amber as the own-placement pulse in
// MeaningShip (#f7b04a); the magenta gradient must not come back.
assert.ok(frontendCss.includes("#f7b04a"), "maker actions must use the copper/amber signal");
assert.ok(!frontendCss.toLowerCase().includes("ff45c8"), "magenta maker button must stay gone");
assert.ok(meaningShip.includes('"#f7b04a"'), "own-placement pulse shares the amber signal");
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
