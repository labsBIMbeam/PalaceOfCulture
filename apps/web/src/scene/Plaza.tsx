/**
 * Plaza — the heart of the Werkstattgasse BETA sandbox: a round civic plaza. The ROCKET is NOT built
 * yet — only the prepared site (a foundation ring staged with scaffolding, materials and a surveyor's
 * tripod) waits at the centre for the 21-year timelock. The young TREE (a shorter timelock) is already
 * growing beside it, tended with a stone ring. Benches + a well ring the space so it reads as a
 * gathering place. Ringed by walkable single-storey buildings (Building.tsx). All placement data that
 * needs collision is exported (plazaRing, PLAZA_SOLIDS, YOUNG_TREE) so StreetColliders stays in
 * lockstep. See memory: street-is-beta-sandbox-plaza.
 */

import { Suspense, useMemo } from "react";
import { BUILDING_DEPTH, Building, buildingDoorX } from "./Building";
import { Embers } from "./Embers";
import { GlbModel } from "./GlbModel";
import { GrowableObject } from "./GrowableObject";
import { Signpost } from "./Signpost";
import { mulberry32 } from "./rand";

/** Game-space centre of the round plaza (x, z). */
export const PLAZA_CENTRE: [number, number] = [0, 88];
export const PLAZA_RADIUS = 24;
/** The young apple tree beside the prepared site (shared with its trunk collider + interactable). */
export const YOUNG_TREE: [number, number] = [PLAZA_CENTRE[0] + 9, PLAZA_CENTRE[1] - 4];
/** The well on the plaza's east rim (shared with its collider + interactable). */
export const PLAZA_WELL: [number, number] = [
  PLAZA_CENTRE[0] + Math.cos((40 * Math.PI) / 180) * 17,
  PLAZA_CENTRE[1] + Math.sin((40 * Math.PI) / 180) * 17,
];

/** A solid prop the player should bump into: world position + half-extents (+ optional yaw). */
export type SolidSpec = {
  pos: [number, number, number];
  half: [number, number, number];
  rotY?: number;
};

const TIMBER = "#6b4a2e";

/** Benches ringing the plaza, facing the centre (south arc left open for the approach). */
const BENCH_DEGS = [335, 20, 65, 110, 155, 200];
const BENCH_R = 21;

function benchPlacements(): { pos: [number, number, number]; rotY: number }[] {
  const [cx, cz] = PLAZA_CENTRE;
  return BENCH_DEGS.map((d) => {
    const a = (d * Math.PI) / 180;
    const x = cx + Math.cos(a) * BENCH_R;
    const z = cz + Math.sin(a) * BENCH_R;
    return { pos: [x, 0, z], rotY: Math.atan2(cx - x, cz - z) };
  });
}

/** Two market stalls flanking the approach mouth (outside the clear centre walk-lane). */
const STALL_DEGS = [243, 297];
const STALL_R = 30;

function stallPlacements(): { pos: [number, number, number]; rotY: number }[] {
  const [cx, cz] = PLAZA_CENTRE;
  return STALL_DEGS.map((d, i) => {
    const a = (d * Math.PI) / 180;
    const x = cx + Math.cos(a) * STALL_R;
    const z = cz + Math.sin(a) * STALL_R;
    return { pos: [x, 0, z], rotY: Math.atan2(cx - x, cz - z) + (i === 0 ? 0.15 : -0.2) };
  });
}

/** One small prop beside every ring-building door (a lived-in threshold, never a bare front). */
const DOOR_PROPS = ["barrel-1", "crate-1", "plant-1", "vase", "barrel-2", "crate-2"];
const DOOR_PROP_FITS = [1.05, 0.9, 1.0, 0.7, 1.0, 0.9];

function doorDressing(): {
  pos: [number, number, number];
  url: string;
  fit: number;
  rotY: number;
}[] {
  return plazaRing().map((b, i) => {
    const lx = buildingDoorX(b.rooms) + 2.3;
    const lz = BUILDING_DEPTH / 2 + 1.0;
    const cos = Math.cos(b.rotY);
    const sin = Math.sin(b.rotY);
    return {
      pos: [b.pos[0] + lx * cos + lz * sin, 0, b.pos[2] - lx * sin + lz * cos],
      url: `/props/${DOOR_PROPS[i % DOOR_PROPS.length]}.glb`,
      fit: DOOR_PROP_FITS[i % DOOR_PROP_FITS.length] ?? 0.9,
      rotY: b.rotY + 0.4,
    };
  });
}

/** The fire bowl by the north benches — a warm gathering accent (emissive only, no extra light). */
const FIRE_BOWL: [number, number] = [
  PLAZA_CENTRE[0] + Math.cos((88 * Math.PI) / 180) * 19,
  PLAZA_CENTRE[1] + Math.sin((88 * Math.PI) / 180) * 19,
];

function FireBowl() {
  const [fx, fz] = FIRE_BOWL;
  return (
    <group position={[fx, 0, fz]}>
      <mesh castShadow position={[0, 0.28, 0]} receiveShadow>
        <cylinderGeometry args={[0.55, 0.4, 0.56, 10]} />
        <meshStandardMaterial color="#7d7469" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.57, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.42, 10]} />
        <meshStandardMaterial
          color="#ff8a3c"
          emissive="#ff6a1e"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      {[0.5, -0.6].map((r) => (
        <mesh castShadow key={r} position={[r * 0.5, 0.62, r * 0.3]} rotation-z={r}>
          <cylinderGeometry args={[0.06, 0.06, 0.7, 5]} />
          <meshStandardMaterial color="#3a2c1c" roughness={1} />
        </mesh>
      ))}
      <Embers count={8} height={1.3} position={[0, 0.6, 0]} spread={0.22} />
    </group>
  );
}

/** Everything solid on the plaza floor — consumed by StreetColliders so visuals + collision line up. */
export function plazaSolids(): SolidSpec[] {
  const [cx, cz] = PLAZA_CENTRE;
  const out: SolidSpec[] = [
    // the well
    { pos: [PLAZA_WELL[0], 0.9, PLAZA_WELL[1]], half: [1.0, 0.9, 1.0] },
    // staged build materials west of the foundation (crates + barrel as one block)
    { pos: [cx - 8, 0.7, cz + 3.9], half: [1.7, 0.7, 1.7] },
    // the plank stack (low — steppable, but not walk-through)
    { pos: [cx - 7, 0.25, cz - 1.8], half: [1.2, 0.25, 0.8] },
    // the fire bowl by the north benches
    { pos: [FIRE_BOWL[0], 0.3, FIRE_BOWL[1]], half: [0.6, 0.3, 0.6] },
  ];
  for (const b of benchPlacements()) {
    out.push({ pos: [b.pos[0], 0.35, b.pos[2]], half: [1.05, 0.35, 0.4], rotY: b.rotY });
  }
  for (const s of stallPlacements()) {
    out.push({ pos: [s.pos[0], 1.0, s.pos[2]], half: [1.4, 1.0, 1.1], rotY: s.rotY });
  }
  for (const d of doorDressing()) {
    out.push({ pos: [d.pos[0], 0.45, d.pos[2]], half: [0.45, 0.45, 0.45] });
  }
  return out;
}

/** The prepared build site at the plaza centre: a foundation ring + surveyor's stake, now visibly
 *  STAGED — scaffold frame, stacked materials, a tripod — "the build is coming", not built yet. */
function FoundationSite({ centre }: { centre: [number, number] }) {
  const posts: [number, number][] = [
    [6.6, 6.6],
    [-6.6, 6.6],
    [-6.6, -6.6],
    [6.6, -6.6],
  ];
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
      {/* scaffold frame around the site — four posts + top beams (a build is being prepared) */}
      {posts.map(([px, pz]) => (
        <mesh castShadow key={`${px},${pz}`} position={[px, 1.7, pz]}>
          <boxGeometry args={[0.18, 3.4, 0.18]} />
          <meshStandardMaterial color={TIMBER} roughness={0.95} />
        </mesh>
      ))}
      {posts.map(([px, pz], i) => {
        const [nx, nz] = posts[(i + 1) % posts.length] ?? [px, pz];
        const mx = (px + nx) / 2;
        const mz = (pz + nz) / 2;
        const alongX = Math.abs(px - nx) > Math.abs(pz - nz);
        return (
          <mesh castShadow key={`beam-${px},${pz}`} position={[mx, 3.3, mz]}>
            <boxGeometry args={alongX ? [13.2, 0.14, 0.14] : [0.14, 0.14, 13.2]} />
            <meshStandardMaterial color={TIMBER} roughness={0.95} />
          </mesh>
        );
      })}
      {/* surveyor's tripod on the approach side — the first thing an arriving player reads */}
      <group position={[2.5, 0, -7.5]}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh
              castShadow
              key={a}
              position={[Math.cos(a) * 0.4, 0.75, Math.sin(a) * 0.4]}
              rotation={[Math.sin(a) * 0.42, 0, -Math.cos(a) * 0.42]}
            >
              <cylinderGeometry args={[0.035, 0.05, 1.6, 5]} />
              <meshStandardMaterial color="#4a3722" roughness={0.9} />
            </mesh>
          );
        })}
        <mesh castShadow position={[0, 1.55, 0]}>
          <boxGeometry args={[0.3, 0.22, 0.3]} />
          <meshStandardMaterial color="#8a6f3c" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>
      {/* staged materials west of the ring: crates, a barrel, a plank stack */}
      <Suspense fallback={null}>
        <GlbModel
          fitHeight={0.9}
          position={[-7.5, 0, 3.2]}
          rotationY={0.3}
          url="/props/crate-1.glb"
        />
        <GlbModel
          fitHeight={0.9}
          position={[-8.8, 0, 4.6]}
          rotationY={-0.5}
          url="/props/crate-2.glb"
        />
        <GlbModel fitHeight={1.05} position={[-8.1, 0, 1.6]} url="/props/barrel-1.glb" />
      </Suspense>
      {[0, 1, 2].map((i) => (
        <mesh
          castShadow
          key={`plank-${i}`}
          position={[-7, 0.09 + i * 0.16, -1.8]}
          rotation-y={i * 0.06}
        >
          <boxGeometry args={[2.2, 0.14, 1.4]} />
          <meshStandardMaterial color="#9c7a4e" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

export type Ringed = {
  pos: [number, number, number];
  rotY: number;
  rooms: 1 | 2 | 3 | 4;
  wall: string;
  roof: string;
};

/** The ring building placements (shared by the visuals and the colliders so they line up).
 *  Six fronts spread around the whole ring — only the south arc stays open for the approach —
 *  with a seeded per-building yaw jitter so the row never reads machine-placed. */
export function plazaRing(): Ringed[] {
  const [cx, cz] = PLAZA_CENTRE;
  const R = 35;
  const walls = ["#cbb083", "#c7a271", "#d0c0a0", "#c2ab86", "#cbb083", "#bfa47c"];
  const roofs = ["#7a4a2c", "#6d4530", "#7f5433", "#71452a", "#7a4e36", "#684026"];
  const roomPlan: (1 | 2 | 3 | 4)[] = [2, 1, 3, 2, 4, 1];
  const degs = [318, 350, 22, 58, 94, 130]; // south arc (≈270°±) kept open for the approach
  const rnd = mulberry32(517);
  return degs.map((d, i) => {
    const a = (d * Math.PI) / 180;
    const x = cx + Math.cos(a) * R;
    const z = cz + Math.sin(a) * R;
    const rotY = Math.atan2(cx - x, cz - z) + (rnd() - 0.5) * 0.12; // front faces centre, jittered
    return {
      pos: [x, 0, z],
      rotY,
      rooms: roomPlan[i] ?? 1,
      wall: walls[i % walls.length] ?? "#cbb083",
      roof: roofs[i % roofs.length] ?? "#7a4a2c",
    };
  });
}

/** The whole plaza: the staged site + the tended young tree, benches + well on the rim, ringed by
 *  walkable buildings. */
export function Plaza({ treeProgress = 0.42 }: { treeProgress?: number }) {
  const ring = useMemo(plazaRing, []);
  const benches = useMemo(benchPlacements, []);
  const stalls = useMemo(stallPlacements, []);
  const dressing = useMemo(doorDressing, []);

  return (
    <group>
      <FoundationSite centre={PLAZA_CENTRE} />
      {/* the young tree — a shorter timelock, already growing beside the site, visibly tended */}
      <group position={[YOUNG_TREE[0], 0, YOUNG_TREE[1]]}>
        <GrowableObject
          fitHeight={8}
          glbUrl="/growables/apple-tree.glb"
          manifestUrl="/growables/apple-tree.growth.json"
          progress={treeProgress}
        />
        {/* a ring of tending stones + a water bucket at its foot */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh castShadow key={a} position={[Math.cos(a) * 1.7, 0.14, Math.sin(a) * 1.7]}>
              <dodecahedronGeometry args={[0.24, 0]} />
              <meshStandardMaterial color="#8b8577" flatShading roughness={1} />
            </mesh>
          );
        })}
        <Suspense fallback={null}>
          <GlbModel fitHeight={0.42} position={[1.6, 0, 1.3]} url="/props/bucket.glb" />
        </Suspense>
      </group>
      {/* benches + the well on the rim — the plaza is a place to gather, not a bare disc */}
      <Suspense fallback={null}>
        {benches.map((b) => (
          <GlbModel
            fitHeight={0.85}
            key={`${b.pos[0].toFixed(1)},${b.pos[2].toFixed(1)}`}
            position={b.pos}
            rotationY={b.rotY}
            url="/props/bench.glb"
          />
        ))}
        <GlbModel
          fitHeight={2.1}
          position={[PLAZA_WELL[0], 0, PLAZA_WELL[1]]}
          rotationY={-0.6}
          url="/props/well.glb"
        />
        {/* two market stalls flanking the approach mouth */}
        {stalls.map((s) => (
          <GlbModel
            fitHeight={2.4}
            key={`stall-${s.pos[0].toFixed(1)}`}
            position={s.pos}
            rotationY={s.rotY}
            url="/props/stall.glb"
          />
        ))}
        {/* a small prop beside every door — lived-in thresholds */}
        {dressing.map((d) => (
          <GlbModel
            fitHeight={d.fit}
            key={`door-${d.pos[0].toFixed(1)},${d.pos[2].toFixed(1)}`}
            position={d.pos}
            rotationY={d.rotY}
            url={d.url}
          />
        ))}
      </Suspense>
      <FireBowl />
      {/* waypost where the approach meets the plaza */}
      <Signpost
        boards={[
          { text: "Build Site", angle: -1.95 },
          { text: "Forge", angle: 2.4 },
        ]}
        position={[10, 0, 64]}
      />
      {ring.map((b) => (
        <Building
          key={`${b.pos[0].toFixed(1)},${b.pos[2].toFixed(1)}`}
          lit="#ffcf87"
          position={b.pos}
          roof={b.roof}
          rooms={b.rooms}
          rotationY={b.rotY}
          wall={b.wall}
        />
      ))}
    </group>
  );
}
