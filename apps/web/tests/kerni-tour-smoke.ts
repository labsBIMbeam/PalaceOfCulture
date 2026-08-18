// Locks Kerni's crew tour (FLX 2026-08-17: "man redet mit kerni und der rest ist automatisch"):
// one talk introduces every crew in demo-route order, each crew step names its real lead from
// the street cast, the affinity philosophies stay in the rulebook's words, and the tour ends on
// the practice-table bridge. The interactable carries the script verbatim and is marked `tour`.

import { INTERACTABLES } from "../src/scene/interactables";
import { CREW_STATIONS, type CrewId, KERNI_CREW_TOUR, STREET_CAST } from "../src/scene/streetCast";

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
const kerni = INTERACTABLES.find((item) => item.id === "kerni-bridge");
assert("Kerni's perch interactable exists", Boolean(kerni));
assert("the Kerni talk is a scripted tour", kerni?.tour === true);
assert(
  "the interactable carries the tour script verbatim",
  JSON.stringify(kerni?.lines) === JSON.stringify(KERNI_CREW_TOUR.map((step) => step.line)),
);

console.log("kerni-tour-smoke: all assertions passed");
