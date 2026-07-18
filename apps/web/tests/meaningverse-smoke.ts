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

console.log("\nMEANINGVERSE SMOKE TESTS GREEN");
