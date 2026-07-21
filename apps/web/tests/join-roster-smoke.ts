// Run: pnpm --filter @600b/web test
// The game roster stays in sync with the live 600.wtf council (join.600.wtf/members.json snapshot),
// and the street ships Kerni as a valid NPC asset.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MEMBERS } from "../src/ui/members";

// Snapshot of the 600.wtf roles for the members added/corrected from the July 2026 roster.
const EXPECTED_ROLES: Record<string, string> = {
  gadaj: "CKO",
  leon: "CHO",
  madmunkey: "CDJ",
  morgs: "CFR",
  tonichina: "CCN",
  tal: "CNO",
  bk: "CUO",
  mtoshi: "CHR",
  cuddy: "CLO",
};

for (const [name, role] of Object.entries(EXPECTED_ROLES)) {
  const member = MEMBERS.find((m) => m.name === name);
  assert.ok(member, `${name} must be in the roster`);
  assert.equal(member.role, role, `${name} carries the 600.wtf role ${role}`);
}

// The four newest members have no rigged model yet — they wear the shared placeholder.
for (const name of ["tal", "bk", "mtoshi", "cuddy"]) {
  const member = MEMBERS.find((m) => m.name === name);
  assert.equal(
    member?.avatar.modelUrl,
    "/avatar/imported/placeholder.glb",
    `${name} wears the placeholder until the rig pipeline runs`,
  );
}

// Kerni is a street NPC, not a pickable member.
assert.equal(
  MEMBERS.find((m) => m.name.toLowerCase() === "kerni"),
  undefined,
  "Kerni stays out of the pickable roster",
);

// The NPC asset ships, is a valid GLB, and stays inside the web budget.
const kerni = resolve("public", "npc/kerni.glb");
assert.ok(existsSync(kerni), "public/npc/kerni.glb must exist");
const bytes = readFileSync(kerni);
assert.equal(bytes.subarray(0, 4).toString("ascii"), "glTF", "kerni.glb must be binary glTF");
assert.ok(bytes.length < 4_000_000, "kerni.glb stays under 4 MB (mobile budget)");

console.log("JOIN ROSTER SMOKE TESTS GREEN");
