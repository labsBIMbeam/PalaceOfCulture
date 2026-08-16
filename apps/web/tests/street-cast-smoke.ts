// Street cast smoke — the mentor crews stay true to docs/design/mentor-dialogues.md:
// all 31 roster members stand in five crews, one lead each teaching four lines, every
// other member one comment, Kerni bridging to the table. Layout keeps clear of the
// authored street furniture. Wiring (interactables/world/dialog) is checked at source
// level so this test needs no GL context.

import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CREW_STATIONS, KERNI_BRIDGE_LINES, STREET_CAST } from "../src/scene/streetCast";
import { MEMBERS } from "../src/ui/members";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// --- roster parity: everyone is in the world, nobody is invented ------------------------------
const castNames = STREET_CAST.map((entry) => entry.member);
assert.equal(new Set(castNames).size, castNames.length, "cast members must be unique");
const rosterNames = new Set(MEMBERS.map((member) => member.name));
for (const name of castNames) {
  assert.ok(rosterNames.has(name), `cast member ${name} must exist in the roster`);
}
assert.equal(castNames.length, MEMBERS.length, "every roster member stands in the world");

// --- crews: one lead each, four teaching lines; crew comments are single lines ----------------
const crews = new Map<string, typeof STREET_CAST>(); // crew id → entries
for (const entry of STREET_CAST) {
  crews.set(entry.crew, [...(crews.get(entry.crew) ?? []), entry]);
}
assert.equal(crews.size, 5, "five crews");
assert.deepEqual(
  [...crews.values()].map((list) => list.length).sort((a, b) => a - b),
  [6, 6, 6, 6, 7],
  "crew sizes are 7+6+6+6+6",
);
for (const [crew, list] of crews) {
  const leads = list.filter((entry) => entry.role === "lead");
  assert.equal(leads.length, 1, `${crew} has exactly one lead`);
  const lead = leads[0];
  assert.ok(lead, `${crew} lead exists`);
  assert.equal(lead.lines.length, 4, `${crew} lead teaches in four lines`);
  for (const entry of list) {
    if (entry.role === "crew") {
      assert.equal(entry.lines.length, 1, `${entry.member} drops exactly one comment`);
    }
    for (const line of entry.lines) {
      assert.ok(line.trim().length > 0, `${entry.member} has no empty lines`);
      assert.ok(line.length <= 200, `${entry.member} keeps lines readable`);
    }
  }
}

// --- canon spot checks: the script's teaching beats survive transcription ---------------------
const allLines = STREET_CAST.flatMap((entry) => entry.lines).join(" ");
for (const beat of [
  "I carry the signal",
  "ledger nobody can quietly rewrite",
  "Not your keys, not your name, not your sats",
  "energy voting for honesty",
  "delaying the easy move",
  "21 hours",
  "Watch the lamps",
  "YOLO, but verify",
]) {
  assert.ok(allLines.includes(beat), `canon beat present: ${beat}`);
}
assert.equal(KERNI_BRIDGE_LINES.length, 3, "Kerni bridges in three lines");
assert.ok(
  KERNI_BRIDGE_LINES[2]?.includes("no standing, no stake"),
  "Kerni quotes the practice-mode contract",
);

// --- layout: readable clusters, clear of the authored street furniture ------------------------
const OBSTACLES: Array<[string, number, number, number]> = [
  ["approach lamp", -7.5, 44, 1.5],
  ["approach lamp", 7.5, 54, 1.5],
  ["well", 13.02, 98.93, 2.0],
  ["young tree", 9, 84, 2.0],
  ["ship dock", 0, 76.2, 3.0],
  ["kerni table", 17.02, 101.93, 2.5],
  ["kerni perch", -27.5, 93, 2.0],
];
const stationAt = new Map(CREW_STATIONS.map((station) => [station.id, station.position]));
for (const entry of STREET_CAST) {
  const [x, , z] = entry.position;
  assert.ok(Math.abs(x) <= 45 && z >= 25 && z <= 110, `${entry.member} stands inside the camp`);
  const station = stationAt.get(entry.crew);
  assert.ok(station, `${entry.member} has a station`);
  const toStation = Math.hypot(x - station[0], z - station[1]);
  assert.ok(toStation <= 8, `${entry.member} stays near the ${entry.crew} station`);
  for (const [what, ox, oz, min] of OBSTACLES) {
    const d = Math.hypot(x - ox, z - oz);
    assert.ok(d >= min, `${entry.member} keeps ${min} m from the ${what} (is ${d.toFixed(2)})`);
  }
}
for (let i = 0; i < STREET_CAST.length; i++) {
  for (let j = i + 1; j < STREET_CAST.length; j++) {
    const a = STREET_CAST[i];
    const b = STREET_CAST[j];
    if (!a || !b) continue;
    const d = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
    assert.ok(d >= 1.1, `${a.member} and ${b.member} don't overlap (${d.toFixed(2)} m)`);
  }
}

// --- voice: every canon line ships its generated take (tooling/street-cast-vo) ----------------
const voDir = resolve(webRoot, "public/vo/cast");
const takeOf = (stem: string): number => statSync(resolve(voDir, `${stem}.mp3`)).size;
for (const entry of STREET_CAST) {
  entry.lines.forEach((_line, index) => {
    const stem = `${entry.member.toLowerCase()}-${index + 1}`;
    assert.ok(takeOf(stem) > 1000, `${stem}.mp3 is a real take`);
  });
}
KERNI_BRIDGE_LINES.forEach((_line, index) => {
  assert.ok(takeOf(`kerni-${index + 1}`) > 1000, `kerni-${index + 1}.mp3 is a real take`);
});

// --- staging: sitters are rare (1–2 per crew, per the script's staging notes) -----------------
for (const [crew, list] of crews) {
  const sitters = list.filter((entry) => entry.pose === "sit").length;
  assert.ok(sitters <= 2, `${crew} keeps the cluster mostly standing (${sitters} sitting)`);
}

// --- wiring: interactables carry the cast, the world mounts it, the dialog steps --------------
const interactablesSource = readFileSync(resolve(webRoot, "src/scene/interactables.ts"), "utf8");
assert.ok(
  interactablesSource.includes("...STREET_CAST.map"),
  "interactables are generated from the cast data",
);
assert.ok(interactablesSource.includes('id: "kerni-bridge"'), "Kerni's bridge speech is talkable");
assert.ok(
  interactablesSource.includes('action: "open-tcg-table"'),
  "the TCG table stays untouched",
);
const streetWorldSource = readFileSync(resolve(webRoot, "src/scene/StreetWorld.tsx"), "utf8");
assert.ok(streetWorldSource.includes("<StreetCastView />"), "the street mounts the cast");
const sceneSource = readFileSync(resolve(webRoot, "src/scene/PalaceScene.tsx"), "utf8");
assert.ok(sceneSource.includes("advanceDialog"), "the dialog steps through lead lines");
assert.ok(
  sceneSource.includes("dialog.lines[dialog.index]"),
  "the dialog renders the current line",
);
assert.ok(sceneSource.includes("/vo/cast/"), "the dialog speaks its generated line");

console.log("STREET CAST SMOKE TESTS GREEN");
