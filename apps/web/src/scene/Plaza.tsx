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
import { Building, buildingBayX, buildingDoorX } from "./Building";
import { Embers } from "./Embers";
import { GlbModel } from "./GlbModel";
import { GrowableObject } from "./GrowableObject";
import { Signpost } from "./Signpost";
import {
  PLAZA_CENTRE,
  PLAZA_WAYPOST,
  type Ringed,
  plazaRing,
  plazaWayfinding,
} from "./streetLayout";

export { PLAZA_CENTRE, PLAZA_RADIUS, plazaRing, type Ringed } from "./streetLayout";
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
/** Waypost boards are pure layout math — computed once, stable across renders. Three boards need
 *  a tighter stack than the Signpost default, or the lowest lands at knee height. */
const WAYPOST_BOARDS = plazaWayfinding().map((board, i) => ({ ...board, height: 1.9 - i * 0.38 }));

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

/** Local (x,z) of a building → world, honouring the building's yaw. */
function toWorld(b: Ringed, lx: number, lz: number): [number, number, number] {
  const cos = Math.cos(b.rotY);
  const sin = Math.sin(b.rotY);
  return [b.pos[0] + lx * cos + lz * sin, 0, b.pos[2] - lx * sin + lz * cos];
}

function doorDressing(): {
  pos: [number, number, number];
  url: string;
  fit: number;
  rotY: number;
}[] {
  return plazaRing().map((b, i) => ({
    pos: toWorld(b, buildingDoorX(b.rooms) + 2.3, b.depth / 2 + 1.0),
    url: `/props/${DOOR_PROPS[i % DOOR_PROPS.length]}.glb`,
    fit: DOOR_PROP_FITS[i % DOOR_PROP_FITS.length] ?? 0.9,
    rotY: b.rotY + 0.4,
  }));
}

/** One furnished-room kit: pieces in bay-local space + the solid blocks worth colliding with.
 *  Pieces with a `pose` are usable — the player can sit on chairs / sleep in beds (E). */
type FurnitureKit = {
  pieces: {
    url: string;
    fit: number;
    dx: number;
    dz: number;
    rot: number;
    pose?: "sit" | "sleep";
  }[];
  solids: { dx: number; dz: number; half: [number, number, number] }[];
};

// Room kits cycle around the ring: dining, sleeping, work, storage, cozy. Everything sits against
// the back wall (dz is measured from the back wall inward) so the door path stays clear.
const KITS: FurnitureKit[] = [
  {
    pieces: [
      { url: "/props/table-a.glb", fit: 0.95, dx: 0, dz: 1.9, rot: 0 },
      { url: "/props/chair-a.glb", fit: 0.95, dx: -1.05, dz: 1.5, rot: 0.9, pose: "sit" },
      { url: "/props/chair-b.glb", fit: 0.95, dx: 1.05, dz: 2.2, rot: -2.2, pose: "sit" },
    ],
    solids: [{ dx: 0, dz: 1.9, half: [0.7, 0.45, 0.7] }],
  },
  {
    pieces: [
      { url: "/furniture/bed_single_A.glb", fit: 0.65, dx: -0.4, dz: 1.6, rot: 0, pose: "sleep" },
      { url: "/props/crate-1.glb", fit: 0.7, dx: 1.2, dz: 1.2, rot: 0.4 },
    ],
    solids: [{ dx: -0.4, dz: 1.6, half: [0.6, 0.3, 1.0] }],
  },
  {
    pieces: [
      { url: "/props/desk.glb", fit: 1.05, dx: 0, dz: 1.3, rot: Math.PI },
      { url: "/props/chair-b.glb", fit: 0.95, dx: 0, dz: 2.3, rot: Math.PI, pose: "sit" },
      { url: "/props/plant-1.glb", fit: 0.9, dx: 1.3, dz: 1.1, rot: 0 },
    ],
    solids: [{ dx: 0, dz: 1.3, half: [0.8, 0.5, 0.45] }],
  },
  {
    pieces: [
      { url: "/props/barrel-2.glb", fit: 1.0, dx: -0.9, dz: 1.3, rot: 0 },
      { url: "/props/crate-2.glb", fit: 0.8, dx: 0.4, dz: 1.2, rot: 0.5 },
      { url: "/props/sack.glb", fit: 0.55, dx: 1.3, dz: 1.6, rot: 1.2 },
      { url: "/props/box.glb", fit: 0.55, dx: -0.2, dz: 2.2, rot: 0.2 },
    ],
    solids: [{ dx: 0, dz: 1.5, half: [1.0, 0.5, 0.9] }],
  },
  {
    pieces: [
      { url: "/props/table-round.glb", fit: 0.95, dx: 0, dz: 1.8, rot: 0 },
      { url: "/props/vase.glb", fit: 0.5, dx: 1.0, dz: 1.3, rot: 0 },
      { url: "/props/lamp-stand.glb", fit: 1.5, dx: -1.35, dz: 1.2, rot: 0 },
    ],
    solids: [{ dx: 0, dz: 1.8, half: [0.6, 0.45, 0.6] }],
  },
];

/** A static usable spot in the street scenery: sit on benches/chairs, sleep in the hut beds. */
export type StreetPose = {
  uid: string;
  position: [number, number, number];
  pose: "sit" | "sleep";
  yaw: number;
  /** y-lift so a sleeper rests on the mattress (sitters stay at floor level). */
  lift: number;
};

/** Bed mattress height at the street bed's fitHeight (0.65) — the sleeper rests on it. */
const STREET_BED_LIFT = 0.42;

/** Furniture for every room around the ring (door bays only in 1-room huts, where the kit still
 *  hugs the back wall). Deterministic kit cycle; positions in world space. Pieces flagged with a
 *  pose also come back as usable spots (sit/sleep). */
function interiorFurnishings(): {
  pieces: { pos: [number, number, number]; url: string; fit: number; rotY: number }[];
  solids: SolidSpec[];
  poses: StreetPose[];
} {
  const pieces: { pos: [number, number, number]; url: string; fit: number; rotY: number }[] = [];
  const solids: SolidSpec[] = [];
  const poses: StreetPose[] = [];
  let kitIndex = 0;
  for (const b of plazaRing()) {
    const doorBay = Math.floor(b.rooms / 2);
    for (let i = 0; i < b.rooms; i++) {
      if (i === doorBay && b.rooms > 1) continue; // multi-room: keep the entrance hall open
      const kit = KITS[kitIndex % KITS.length];
      kitIndex++;
      if (!kit) continue;
      const bx = buildingBayX(b.rooms, i);
      const backZ = -b.depth / 2;
      for (const p of kit.pieces) {
        const pos = toWorld(b, bx + p.dx, backZ + p.dz);
        pieces.push({ pos, url: p.url, fit: p.fit, rotY: b.rotY + p.rot });
        if (p.pose) {
          poses.push({
            uid: `street-pose-${poses.length}`,
            position: pos,
            pose: p.pose,
            yaw: b.rotY + p.rot,
            lift: p.pose === "sleep" ? STREET_BED_LIFT : 0,
          });
        }
      }
      for (const s of kit.solids) {
        const [wx, , wz] = toWorld(b, bx + s.dx, backZ + s.dz);
        solids.push({ pos: [wx, s.half[1], wz], half: s.half, rotY: b.rotY });
      }
    }
  }
  return { pieces, solids, poses };
}

/** Every usable seat/bed the street scenery ships: plaza benches + the furnished-room chairs and
 *  beds. Derived from the SAME placement data as the visuals, so the prompt always matches. */
export function streetPoseTargets(): StreetPose[] {
  return [
    ...benchPlacements().map(
      (b, i): StreetPose => ({
        uid: `street-bench-${i}`,
        position: b.pos,
        pose: "sit",
        yaw: b.rotY,
        lift: 0,
      }),
    ),
    ...interiorFurnishings().poses,
  ];
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
    // the sawing rig NE of the foundation (two sawhorses + plank)
    { pos: [cx + 6.8, 0.42, cz + 7.0], half: [1.8, 0.42, 0.45], rotY: 0.3 },
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
  out.push(...interiorFurnishings().solids);
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
      {/* sawing rig NE of the ring: two sawhorses carrying a plank mid-cut (this street BUILDS) */}
      <group position={[6.8, 0, 7.0]} rotation-y={0.3}>
        {[-1.25, 1.25].map((hx) => (
          <group key={hx} position={[hx, 0, 0]}>
            <mesh castShadow position={[0, 0.72, 0]}>
              <boxGeometry args={[1.05, 0.09, 0.11]} />
              <meshStandardMaterial color={TIMBER} roughness={0.95} />
            </mesh>
            {[
              [-0.42, 0.28],
              [-0.42, -0.28],
              [0.42, 0.28],
              [0.42, -0.28],
            ].map(([lx, lz]) => (
              <mesh
                castShadow
                key={`${lx},${lz}`}
                position={[lx ?? 0, 0.36, (lz ?? 0) / 2]}
                rotation-x={(lz ?? 0) > 0 ? 0.36 : -0.36}
              >
                <boxGeometry args={[0.08, 0.78, 0.08]} />
                <meshStandardMaterial color={TIMBER} roughness={0.95} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh castShadow position={[0, 0.81, 0]}>
          <boxGeometry args={[3.4, 0.07, 0.5]} />
          <meshStandardMaterial color="#9c7a4e" roughness={0.95} />
        </mesh>
      </group>
      <Suspense fallback={null}>
        <GlbModel
          fitHeight={0.5}
          position={[5.2, 0, 5.4]}
          rotationY={1.9}
          url="/props/tool-hammer.glb"
        />
        <GlbModel fitHeight={0.42} position={[8.6, 0, 5.9]} url="/props/bucket.glb" />
      </Suspense>
    </group>
  );
}

/** The whole plaza: the staged site + the tended young tree, benches + well on the rim, ringed by
 *  walkable buildings. */
export function Plaza({ treeProgress = 0.42 }: { treeProgress?: number }) {
  const ring = useMemo(plazaRing, []);
  const benches = useMemo(benchPlacements, []);
  const stalls = useMemo(stallPlacements, []);
  const dressing = useMemo(doorDressing, []);
  const interior = useMemo(interiorFurnishings, []);

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
        {/* furnished rooms — visible through the glass windows and walk-in doors */}
        {interior.pieces.map((p) => (
          <GlbModel
            fitHeight={p.fit}
            key={`int-${p.pos[0].toFixed(2)},${p.pos[2].toFixed(2)}`}
            position={p.pos}
            rotationY={p.rotY}
            url={p.url}
          />
        ))}
      </Suspense>
      <FireBowl />
      {/* waypost where the approach meets the plaza */}
      <Signpost boards={WAYPOST_BOARDS} position={PLAZA_WAYPOST} />
      {ring.map((b) => (
        <Building
          depth={b.depth}
          height={b.height}
          key={b.id}
          porch={b.porch}
          position={b.pos}
          roof={b.roof}
          roofStyle={b.roofStyle}
          rooms={b.rooms}
          rotationY={b.rotY}
          wall={b.wall}
        />
      ))}
    </group>
  );
}
