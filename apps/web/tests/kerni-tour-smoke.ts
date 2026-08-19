// Locks Kerni's crew tour (FLX 2026-08-17: "man redet mit kerni und der rest ist automatisch"):
// one talk introduces every crew in demo-route order, each crew step names its real lead from
// the street cast, the affinity philosophies stay in the rulebook's words, and the tour ends on
// the practice-table bridge. The interactable carries the script verbatim and is marked `tour`.

import { INTERACTABLES } from "../src/scene/interactables";
import {
  type ArrivalStep,
  CREW_STATIONS,
  type CrewId,
  KERNI_ARRIVAL_SCRIPT,
  KERNI_CREW_TOUR,
  STREET_CAST,
} from "../src/scene/streetCast";

function assert(name: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`ok: ${name}`);
}

const ROUTE: CrewId[] = ["signal", "bitcoin", "keys", "power", "timelock"];

// Every crew appears, in demo-route order, with at least two lines each.
const crewOrder = KERNI_CREW_TOUR.map((step) => step.crew).filter(
  (crew): crew is CrewId => crew !== null,
);
assert(
  "the tour walks the five crews in demo-route order",
  JSON.stringify([...new Set(crewOrder)]) === JSON.stringify(ROUTE),
);
for (const crew of ROUTE) {
  const lines = KERNI_CREW_TOUR.filter((step) => step.crew === crew);
  if (lines.length < 2) throw new Error(`FAIL: crew ${crew} has fewer than two tour lines`);
}
console.log("ok: every crew gets at least two lines");

// Each crew's tour lines name the crew's REAL lead from the street cast — the script can
// never drift from the staging.
for (const crew of ROUTE) {
  const lead = STREET_CAST.find((entry) => entry.crew === crew && entry.role === "lead");
  if (!lead) throw new Error(`FAIL: no lead staged for crew ${crew}`);
  const named = KERNI_CREW_TOUR.some(
    (step) => step.crew === crew && step.line.includes(lead.member),
  );
  if (!named) throw new Error(`FAIL: tour never names ${lead.member} for crew ${crew}`);
}
console.log("ok: every crew step names its staged lead");

// The rulebook stays canon: the Timelock and Bitcoin philosophies appear in its words.
const script = KERNI_CREW_TOUR.map((step) => step.line).join(" ");
assert(
  "the Timelock law is quoted in the rulebook's words",
  script.includes("delays the easy move to preserve the stronger move"),
);
assert(
  "the Bitcoin philosophy is quoted in the rulebook's words",
  script.includes("Patient verification into durable coordination"),
);

// The tour opens to camera and closes on the practice-table bridge (no dead end).
assert("the tour opens off-station", KERNI_CREW_TOUR[0]?.crew === null);
const last = KERNI_CREW_TOUR[KERNI_CREW_TOUR.length - 1];
assert(
  "the tour ends on the practice-table bridge",
  last?.crew === null && /practice/i.test(last?.line ?? ""),
);

// Every named crew has a real station for its beacon.
for (const crew of ROUTE) {
  if (!CREW_STATIONS.some((station) => station.id === crew)) {
    throw new Error(`FAIL: no station for crew ${crew}`);
  }
}
console.log("ok: every toured crew has a beacon station");

// The Kerni interactable carries the script verbatim, hands-free.
// The arrival conversation: Kerni announces, the staged lead answers with their own first
// cast line, Kerni lands the philosophy. Generated from tour + cast, so drift is impossible.
assert(
  "the conversation is the tour plus one lead greeting per crew",
  KERNI_ARRIVAL_SCRIPT.length === KERNI_CREW_TOUR.length + ROUTE.length,
);
for (const crew of ROUTE) {
  const lead = STREET_CAST.find((entry) => entry.crew === crew && entry.role === "lead");
  if (!lead) throw new Error(`FAIL: no lead for ${crew}`);
  const step = KERNI_ARRIVAL_SCRIPT.find((s) => s.speaker === lead.member);
  if (!step) throw new Error(`FAIL: ${lead.member} never speaks in the arrival`);
  if (step.line !== lead.lines[0]) {
    throw new Error(`FAIL: ${lead.member} must speak their own first cast line`);
  }
  if (step.vo !== `${lead.member.toLowerCase()}-1`) {
    throw new Error(`FAIL: ${lead.member}'s VO stem must be their first line`);
  }
  const at = KERNI_ARRIVAL_SCRIPT.indexOf(step);
  const before = KERNI_ARRIVAL_SCRIPT[at - 1];
  const after = KERNI_ARRIVAL_SCRIPT[at + 1];
  if (before?.speaker !== "Kerni" || after?.speaker !== "Kerni") {
    throw new Error(`FAIL: Kerni must frame ${lead.member}'s greeting`);
  }
}
console.log("ok: every crew lead answers inside Kerni's frame, voiced by their own line");
// Kerni's VO numbering follows the TOUR order (the files tooling/street-cast-vo generated).
const kerniSteps = KERNI_ARRIVAL_SCRIPT.filter((s: ArrivalStep) => s.speaker === "Kerni");
assert(
  "Kerni's VO stems stay aligned with the generated files",
  kerniSteps.every((s, i) => s.vo === `kerni-${i + 1}`) &&
    kerniSteps.length === KERNI_CREW_TOUR.length,
);

const kerni = INTERACTABLES.find((item) => item.id === "kerni-bridge");
assert("Kerni's perch interactable exists", Boolean(kerni));
assert("the Kerni talk is a scripted tour", kerni?.tour === true);
assert(
  "the interactable carries the conversation verbatim",
  JSON.stringify(kerni?.lines) === JSON.stringify(KERNI_ARRIVAL_SCRIPT.map((s) => s.line)) &&
    JSON.stringify(kerni?.speakers) ===
      JSON.stringify(KERNI_ARRIVAL_SCRIPT.map((s) => s.speaker)) &&
    JSON.stringify(kerni?.voFiles) === JSON.stringify(KERNI_ARRIVAL_SCRIPT.map((s) => s.vo)),
);

// Arrival is scripted: the street's first visit hands the camera to Kerni automatically —
// once per device behind the arrival key — and the workshop perch keeps the rerun.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KERNI_ARRIVAL_SEEN_KEY } from "../src/scene/streetCast";

assert("the arrival key is versioned", KERNI_ARRIVAL_SEEN_KEY === "600b:kerniArrival:v1");
const sceneSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../src/scene/PalaceScene.tsx"),
  "utf8",
);
assert(
  "arrival starts the conversation behind the once-per-device key",
  sceneSource.includes("KERNI_ARRIVAL_SEEN_KEY") &&
    /setDialog\(\{\s*speaker: "Kerni",\s*lines: KERNI_ARRIVAL_SCRIPT/.test(sceneSource),
);

console.log("kerni-tour-smoke: all assertions passed");
