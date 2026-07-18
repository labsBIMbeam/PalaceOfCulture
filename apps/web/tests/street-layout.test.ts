import { WORK_ORDER_CORNER, workshopSolids } from "../src/scene/Workshop";
import {
  PLAZA_CENTRE,
  PLAZA_WAYPOST,
  RING_PLACES,
  plazaRing,
  plazaWayfinding,
} from "../src/scene/streetLayout";

function assert(name: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`ok: ${name}`);
}

const ring = plazaRing();
const ids = ring.map(({ id }) => id);

assert("every ring frontage has a stable place id", ids.length === 6);
assert("ring place ids are unique", new Set(ids).size === ids.length);
assert("layout order follows the declared places", ids.join(",") === RING_PLACES.join(","));
assert(
  "semantic places keep their authored bearings",
  ring.map(({ id, angle }) => `${id}@${angle}`).join(",") ===
    "place:market:ring@318,place:commons:citadel-wire@350,place:guild:culture@22," +
      "place:arcade:portal@58,place:guild:shelter@94,place:guild:craft@130",
);
const bearingOf = (pos: [number, number, number]): number =>
  ((Math.atan2(pos[2] - PLAZA_CENTRE[1], pos[0] - PLAZA_CENTRE[0]) * 180) / Math.PI + 360) % 360;

assert(
  "declared angles match the built positions",
  ring.every(({ angle, pos }) => Math.abs(bearingOf(pos) - angle) < 0.01),
);
assert(
  "south approach remains open",
  ring.every(({ pos }) => {
    const bearing = bearingOf(pos);
    return bearing < 230 || bearing > 310;
  }),
);
assert(
  "ring buildings stay clear of the plaza floor (radius 24)",
  ring.every(({ pos }) => Math.hypot(pos[0] - PLAZA_CENTRE[0], pos[2] - PLAZA_CENTRE[1]) > 24),
);
assert("layout generation is deterministic", JSON.stringify(plazaRing()) === JSON.stringify(ring));

assert(
  "bakery work order has one readable manual-to-finite-target chain",
  WORK_ORDER_CORNER.map(({ role }) => role).join(",") === "board,input,manual",
);
assert(
  "bakery work order stays clustered in the workshop yard",
  WORK_ORDER_CORNER.every(({ pos }) => Math.hypot(pos[0] + 35, pos[2] - 88) < 12),
);
const yardSolids = workshopSolids();
assert(
  "work-order board and input rack are solid, not walk-through",
  WORK_ORDER_CORNER.every(({ pos }) =>
    yardSolids.some((s) => Math.hypot(s.pos[0] - pos[0], s.pos[2] - pos[2]) < 0.01),
  ),
);

const wayfinding = plazaWayfinding();
assert(
  "approach waypost names the three demo destinations",
  wayfinding.map(({ text }) => text).join(",") === "Market,Culture,Workshop",
);
assert(
  "each waypost arrow points toward its semantic frontage",
  wayfinding.every(({ angle, placeId }) => {
    const target = ring.find(({ id }) => id === placeId);
    if (!target) return false;
    // Signpost's arrow tip sits on the board's local +X; rotating +X by the board's Y angle
    // gives world (cos a, -sin a). That world direction must match the bearing to the frontage.
    const arrow: [number, number] = [Math.cos(angle), -Math.sin(angle)];
    const dx = target.pos[0] - PLAZA_WAYPOST[0];
    const dz = target.pos[2] - PLAZA_WAYPOST[2];
    const len = Math.hypot(dx, dz);
    return arrow[0] * (dx / len) + arrow[1] * (dz / len) > 0.9999;
  }),
);

console.log("\nSTREET LAYOUT TESTS GREEN");
