/**
 * Plaza — the heart of the Werkstattgasse BETA sandbox: a round civic plaza whose centre is where the
 * 21-year ROCKET (the starship timelock growable) and the PALACE OF CULTURE construction both begin.
 * Ringed by WALKABLE shells (walls + a real door opening you can enter, roof), cleanly aligned facing
 * the plaza — no generic closed boxes. See memory: street-is-beta-sandbox-plaza.
 */

import { useMemo } from "react";
import * as THREE from "three";
import { GrowableObject } from "./GrowableObject";

/** Game-space centre of the round plaza (x, z). */
export const PLAZA_CENTRE: [number, number] = [0, 120];
export const PLAZA_RADIUS = 24;

/** A walkable shell — four timber walls with a real door opening + a roof; you can walk inside.
 *  Adapted from StreetShops' CozyShell so it stays a proper interior, not a decorative box. */
function WalkShell({
  position,
  rotationY = 0,
  wall = "#caa877",
  accent = "#ff8a3d",
}: {
  position: [number, number, number];
  rotationY?: number;
  wall?: string;
  accent?: string;
}) {
  const W = 6;
  const D = 5.5;
  const H = 3.4;
  const t = 0.22;
  const doorW = 1.8;
  const seg = (W - doorW) / 2;
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[W, 0.1, D]} />
        <meshStandardMaterial color="#8a6a44" roughness={0.95} />
      </mesh>
      {/* back + two sides */}
      <mesh castShadow position={[0, H / 2, -D / 2]} receiveShadow>
        <boxGeometry args={[W, H, t]} />
        <meshStandardMaterial color={wall} roughness={0.92} />
      </mesh>
      {[-W / 2, W / 2].map((sx) => (
        <mesh castShadow key={sx} position={[sx, H / 2, 0]} receiveShadow>
          <boxGeometry args={[t, H, D]} />
          <meshStandardMaterial color={wall} roughness={0.92} />
        </mesh>
      ))}
      {/* front wall with a door opening (front faces +z → toward the plaza when rotated) */}
      {[-(doorW / 2 + seg / 2), doorW / 2 + seg / 2].map((sx) => (
        <mesh castShadow key={sx} position={[sx, H / 2, D / 2]} receiveShadow>
          <boxGeometry args={[seg, H, t]} />
          <meshStandardMaterial color={wall} roughness={0.92} />
        </mesh>
      ))}
      <mesh castShadow position={[0, H - 0.45, D / 2]}>
        <boxGeometry args={[doorW, 0.9, t]} />
        <meshStandardMaterial color={wall} roughness={0.92} />
      </mesh>
      {/* pitched-ish roof slab */}
      <mesh castShadow position={[0, H + 0.18, 0]}>
        <boxGeometry args={[W + 0.6, 0.36, D + 0.6]} />
        <meshStandardMaterial color="#7a4a2c" roughness={0.9} />
      </mesh>
      {/* one warm sign over the door (the sparse cyber retrofit) */}
      <mesh position={[0, H + 0.05, D / 2 + 0.14]}>
        <boxGeometry args={[doorW + 0.5, 0.4, 0.1]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** The palace-of-culture construction: a foundation slab, scaffolding posts and a couple of raised
 *  beams around the rocket pad — "the build has just started". */
function PalaceScaffold({ centre }: { centre: [number, number] }) {
  const posts = useMemo(() => {
    const out: [number, number][] = [];
    const r = 7;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      out.push([centre[0] + Math.cos(a) * r, centre[1] + Math.sin(a) * r]);
    }
    return out;
  }, [centre]);
  return (
    <group>
      {/* foundation slab under the whole build */}
      <mesh position={[centre[0], 0.15, centre[1]]} receiveShadow>
        <cylinderGeometry args={[8.5, 8.5, 0.3, 24]} />
        <meshStandardMaterial color="#6f5a42" roughness={1} />
      </mesh>
      {posts.map(([px, pz]) => (
        <group key={`${px},${pz}`} position={[px, 0, pz]}>
          <mesh castShadow position={[0, 2.4, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 4.8, 6]} />
            <meshStandardMaterial color="#4f3d29" roughness={0.95} />
          </mesh>
        </group>
      ))}
      {/* two scaffold rings (horizontal beams) */}
      {[2.2, 4.4].map((y) => (
        <mesh key={y} position={[centre[0], y, centre[1]]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[7, 0.06, 6, 24]} />
          <meshStandardMaterial color="#5a4530" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** The whole plaza: the rocket + palace construction at the centre, ringed by walkable shells. */
export function Plaza({ rocketProgress = 0.32 }: { rocketProgress?: number }) {
  const [cx, cz] = PLAZA_CENTRE;
  // Walkable shells around the ring, facing the plaza centre; a clean gap on the south (gate) side.
  const shells = useMemo(() => {
    const R = 32;
    const accents = ["#ff8a3d", "#39d6ff", "#ffb454", "#ff6f91", "#7cff9e", "#c9a0ff"];
    const degs = [12, 56, 100, 144, 216, 260, 304, 348]; // skip ~180±... keep south (≈270 gate) open
    return degs
      .filter((d) => d < 200 || d > 250) // leave the gate-side arc clear for the approach
      .map((d, i) => {
        const a = (d * Math.PI) / 180;
        const x = cx + Math.cos(a) * R;
        const z = cz + Math.sin(a) * R;
        // front (+z local) must face the centre: rotate so +z points inward
        const rotY = Math.atan2(cx - x, cz - z);
        return { x, z, rotY, accent: accents[i % accents.length] ?? "#ff8a3d" };
      });
  }, [cx, cz]);

  return (
    <group>
      {/* rocket — the 21-year timelock, construction just begun (low progress) */}
      <group position={[cx, 0, cz]}>
        <GrowableObject
          fitHeight={24}
          glbUrl="/growables/starship-stack.glb"
          manifestUrl="/growables/starship-stack.growth.json"
          progress={rocketProgress}
        />
      </group>
      <PalaceScaffold centre={PLAZA_CENTRE} />
      {shells.map((s) => (
        <WalkShell
          accent={s.accent}
          key={`${s.x.toFixed(1)},${s.z.toFixed(1)}`}
          position={[s.x, 0, s.z]}
          rotationY={s.rotY}
        />
      ))}
    </group>
  );
}
