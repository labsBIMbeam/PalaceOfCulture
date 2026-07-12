/**
 * Plaza — the heart of the Werkstattgasse BETA sandbox: a round civic plaza. The ROCKET is NOT built
 * yet — only the prepared site (a foundation marker) waits at the centre for the 21-year timelock. The
 * young TREE (a shorter timelock) is already growing beside it. Ringed by complex single-storey
 * walkable buildings (Building.tsx). See memory: street-is-beta-sandbox-plaza.
 */

import { useMemo } from "react";
import { Building } from "./Building";
import { GrowableObject } from "./GrowableObject";

/** Game-space centre of the round plaza (x, z). */
export const PLAZA_CENTRE: [number, number] = [0, 120];
export const PLAZA_RADIUS = 24;

/** The prepared build site at the plaza centre: a low foundation ring + a surveyor's stake with a
 *  small flag — "here the rocket + Palace of Culture will rise", not built yet. */
function FoundationSite({ centre }: { centre: [number, number] }) {
  return (
    <group position={[centre[0], 0, centre[1]]}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[5.5, 5.8, 0.3, 32]} />
        <meshStandardMaterial color="#6f5a42" roughness={1} />
      </mesh>
      <mesh position={[0, 0.32, 0]} receiveShadow>
        <cylinderGeometry args={[4.6, 4.6, 0.06, 32]} />
        <meshStandardMaterial color="#8a7355" roughness={1} />
      </mesh>
      {/* surveyor's stake + a small marker flag */}
      <mesh castShadow position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2, 6]} />
        <meshStandardMaterial color="#3a2c1c" roughness={0.9} />
      </mesh>
      <mesh position={[0.35, 1.75, 0]}>
        <boxGeometry args={[0.7, 0.4, 0.03]} />
        <meshStandardMaterial color="#e8563d" roughness={0.8} />
      </mesh>
    </group>
  );
}

type Ringed = { pos: [number, number, number]; rotY: number; rooms: 1 | 2 | 3 | 4; wall: string };

/** The whole plaza: the prepared site + the young tree beside it, ringed by complex buildings. */
export function Plaza({ treeProgress = 0.42 }: { treeProgress?: number }) {
  const [cx, cz] = PLAZA_CENTRE;
  // Complex walkable buildings around the ring, facing the plaza; a clean gap on the gate (south) side.
  const ring = useMemo<Ringed[]>(() => {
    const R = 35;
    const walls = ["#cbb083", "#c7a271", "#d0c0a0", "#c2ab86", "#cbb083", "#bfa47c"];
    const roomPlan: (1 | 2 | 3 | 4)[] = [2, 1, 3, 2, 4, 1];
    const degs = [16, 62, 108, 300, 344]; // south arc (≈180±) kept open for the approach
    return degs.map((d, i) => {
      const a = (d * Math.PI) / 180;
      const x = cx + Math.cos(a) * R;
      const z = cz + Math.sin(a) * R;
      const rotY = Math.atan2(cx - x, cz - z); // front (+z) faces the centre
      return {
        pos: [x, 0, z],
        rotY,
        rooms: roomPlan[i] ?? 1,
        wall: walls[i % walls.length] ?? "#cbb083",
      };
    });
  }, [cx, cz]);

  return (
    <group>
      <FoundationSite centre={PLAZA_CENTRE} />
      {/* the young tree — a shorter timelock, already growing beside the site */}
      <group position={[cx + 9, 0, cz - 4]}>
        <GrowableObject
          fitHeight={8}
          glbUrl="/growables/apple-tree.glb"
          manifestUrl="/growables/apple-tree.growth.json"
          progress={treeProgress}
        />
      </group>
      {ring.map((b) => (
        <Building
          key={`${b.pos[0].toFixed(1)},${b.pos[2].toFixed(1)}`}
          lit="#ffcf87"
          position={b.pos}
          rooms={b.rooms}
          rotationY={b.rotY}
          wall={b.wall}
        />
      ))}
    </group>
  );
}
