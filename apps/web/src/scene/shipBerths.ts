// Ship berths — where a confirmed module becomes a findable place on the assembly ring. The server
// assigns the slot; these pure helpers only translate that fact into a deterministic ring position
// and a role colour. Nothing here awards, invents, or reorders state (the app owns the truth), and
// nothing is baked into the GLB (art is static, berth lights are data).

import type { ShipModuleRole } from "@600b/multiplayer";
import { SHIP_MODULE_CAPACITY } from "../meaningverse/model";
import { SHIP_RING_RADIUS } from "./streetLayout";

/** Role → light colour, matching the picker order Shape/Glow/Hangout/Noise. Copper and cyan stay
 *  reserved for the own/peer signal language, so no role colour reuses either. */
export const SHIP_ROLE_COLORS: Readonly<Record<ShipModuleRole, string>> = {
  structure: "#e0824a",
  energy: "#ffd166",
  habitat: "#7fd8a0",
  signal: "#c792ea",
} as const;

/** Total over any string so a future server-side role can never crash the scene. */
export function shipRoleColor(role: string): string {
  return SHIP_ROLE_COLORS[role as ShipModuleRole] ?? "#e0824a";
}

const BERTH_STEP_DEG = 360 / SHIP_MODULE_CAPACITY;
/** First berth sits beside the south dock (bearing 270°), half a step off it, so the earliest
 *  placements land in front of the player at the boarding point without ever sitting on the
 *  dock bearing itself. */
const BERTH_FIRST_DEG = 270 + BERTH_STEP_DEG / 2;

/** Deterministic plaza bearing (degrees, [0..360)) for a 1-based slot; wraps degenerate slots. */
export function shipBerthAngleDeg(slot: number): number {
  const safeSlot = Number.isFinite(slot) ? Math.trunc(slot) : 1;
  const index =
    (((safeSlot - 1) % SHIP_MODULE_CAPACITY) + SHIP_MODULE_CAPACITY) % SHIP_MODULE_CAPACITY;
  return (BERTH_FIRST_DEG + index * BERTH_STEP_DEG) % 360;
}

/** Berth position on the glowing ring, in the ship group's local frame (its origin is the plaza
 *  centre, so local bearing equals plaza bearing). */
export function shipBerthLocalPosition(slot: number, y = 0.18): [number, number, number] {
  const radians = (shipBerthAngleDeg(slot) * Math.PI) / 180;
  return [Math.cos(radians) * SHIP_RING_RADIUS, y, Math.sin(radians) * SHIP_RING_RADIUS];
}
