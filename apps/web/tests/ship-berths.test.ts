// Ship berths: the seam that makes a placed module a findable, role-coloured place on the assembly
// ring. Positions must be deterministic pure functions of the server-assigned slot, all 36 berths
// distinct on the ring, none sitting on the dock bearing, and the role→colour map total + injective.

import { SHIP_MODULE_CAPACITY } from "../src/meaningverse/model";
import {
  SHIP_ROLE_COLORS,
  shipBerthAngleDeg,
  shipBerthLocalPosition,
  shipRoleColor,
} from "../src/scene/shipBerths";
import { PLAZA_CENTRE, SHIP_DOCK, SHIP_RING_RADIUS } from "../src/scene/streetLayout";

function assert(name: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`ok: ${name}`);
}

const slots = Array.from({ length: SHIP_MODULE_CAPACITY }, (_, i) => i + 1);
const angles = slots.map(shipBerthAngleDeg);

assert(
  "every launch slot gets a distinct berth bearing",
  new Set(angles.map((a) => a.toFixed(6))).size === SHIP_MODULE_CAPACITY,
);
assert(
  "berth bearings are deterministic",
  JSON.stringify(slots.map(shipBerthAngleDeg)) === JSON.stringify(angles),
);
assert(
  "all berths sit exactly on the glowing ring",
  slots.every((slot) => {
    const [x, , z] = shipBerthLocalPosition(slot);
    return Math.abs(Math.hypot(x, z) - SHIP_RING_RADIUS) < 1e-9;
  }),
);

// The dock sits at plaza bearing 270° (street-layout tests pin this); no berth may sit on that
// bearing, and the first berth must open beside the dock where the placing player is standing.
const dockBearing =
  ((Math.atan2(SHIP_DOCK[1] - PLAZA_CENTRE[1], SHIP_DOCK[0] - PLAZA_CENTRE[0]) * 180) / Math.PI +
    360) %
  360;
assert(
  "no berth sits on the dock bearing",
  angles.every((angle) => Math.abs(angle - dockBearing) > 1),
);
assert("the first berth opens beside the dock", Math.abs(shipBerthAngleDeg(1) - dockBearing) <= 10);

assert(
  "degenerate slots wrap onto the ring instead of exploding",
  [0, -3, 37, 400, Number.NaN, Number.POSITIVE_INFINITY].every((slot) => {
    const [x, y, z] = shipBerthLocalPosition(slot);
    return [x, y, z].every(Number.isFinite);
  }),
);

const roleIds = ["structure", "energy", "habitat", "signal"] as const;
assert(
  "role colour map is total over the four picker roles",
  roleIds.every((role) => /^#[0-9a-f]{6}$/i.test(SHIP_ROLE_COLORS[role])),
);
assert(
  "role colours are injective (four distinguishable lights)",
  new Set(roleIds.map((role) => SHIP_ROLE_COLORS[role])).size === roleIds.length,
);
assert(
  "unknown future roles fall back to a colour instead of crashing the scene",
  /^#[0-9a-f]{6}$/i.test(shipRoleColor("mystery-role")),
);
assert(
  "the fallback never collides with the reserved own/peer signal colours",
  !["#f7b04a", "#5cd8ff"].includes(shipRoleColor("mystery-role")) &&
    roleIds.every((role) => !["#f7b04a", "#5cd8ff"].includes(SHIP_ROLE_COLORS[role])),
);

console.log("\nSHIP BERTH TESTS GREEN");
