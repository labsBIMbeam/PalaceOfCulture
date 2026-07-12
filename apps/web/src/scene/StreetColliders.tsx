/**
 * StreetColliders — the street world's SOLID collision, kept separate from its visuals. The scenery
 * (buildings, trees) renders OUTSIDE <Physics> (its many lazy GLB loads must not churn the physics
 * tree), so here we place matching lightweight fixed colliders INSIDE <Physics>: building walls (with
 * the door left open) and tree trunks. The flat ground collider lives in PalaceScene. No colliders for
 * remote players — they are visual markers, never rigid bodies, so players never collide with players.
 */

import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { buildingWallColliders } from "./Building";
import { FENCE, GATE_X } from "./Enclosure";
import { plazaRing } from "./Plaza";
import { heroTreePositions } from "./Vegetation";

/** Invisible barrier walls along the palisade perimeter, with a gap at the south gate. Half-extents
 *  + centre, height ~2 m (the fence height). Keeps the player inside the camp. */
function fenceColliders(): { half: [number, number, number]; pos: [number, number, number] }[] {
  const { x0, x1, z0, z1 } = FENCE;
  const hy = 1.1;
  const t = 0.3; // barrier thickness half-extent
  const zHalf = (z1 - z0) / 2;
  const zMid = (z0 + z1) / 2;
  const southW = (x1 - GATE_X) / 2; // half-length of each south segment beside the gate
  return [
    { half: [t, hy, zHalf], pos: [x0, hy, zMid] }, // west
    { half: [t, hy, zHalf], pos: [x1, hy, zMid] }, // east
    { half: [(x1 - x0) / 2, hy, t], pos: [(x0 + x1) / 2, hy, z1] }, // north
    { half: [southW, hy, t], pos: [-(GATE_X + southW), hy, z0] }, // south, left of gate
    { half: [southW, hy, t], pos: [GATE_X + southW, hy, z0] }, // south, right of gate
  ];
}

export function StreetColliders() {
  const ring = plazaRing();
  const trees = heroTreePositions();
  return (
    <group>
      {/* the palisade fence — an invisible boundary the player can't cross (gate stays open) */}
      <RigidBody colliders={false} type="fixed">
        {fenceColliders().map((c) => (
          <CuboidCollider args={c.half} key={c.pos.join(",")} position={c.pos} />
        ))}
      </RigidBody>
      {ring.map((b) => (
        <RigidBody
          colliders={false}
          key={`b-${b.pos[0].toFixed(1)},${b.pos[2].toFixed(1)}`}
          position={b.pos}
          rotation={[0, b.rotY, 0]}
          type="fixed"
        >
          {buildingWallColliders(b.rooms).map((c) => (
            <CuboidCollider args={c.half} key={c.pos.join(",")} position={c.pos} />
          ))}
        </RigidBody>
      ))}
      {trees.map(([x, z]) => (
        <RigidBody colliders={false} key={`t-${x.toFixed(1)},${z.toFixed(1)}`} type="fixed">
          <CylinderCollider args={[2, 0.5]} position={[x, 2, z]} />
        </RigidBody>
      ))}
    </group>
  );
}
