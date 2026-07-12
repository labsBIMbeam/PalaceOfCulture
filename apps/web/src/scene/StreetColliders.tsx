/**
 * StreetColliders — the street world's SOLID collision, kept separate from its visuals. The scenery
 * (buildings, trees) renders OUTSIDE <Physics> (its many lazy GLB loads must not churn the physics
 * tree), so here we place matching lightweight fixed colliders INSIDE <Physics>: building walls (with
 * the door left open) and tree trunks. The flat ground collider lives in PalaceScene. No colliders for
 * remote players — they are visual markers, never rigid bodies, so players never collide with players.
 */

import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { buildingWallColliders } from "./Building";
import { plazaRing } from "./Plaza";
import { heroTreePositions } from "./Vegetation";

export function StreetColliders() {
  const ring = plazaRing();
  const trees = heroTreePositions();
  return (
    <group>
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
