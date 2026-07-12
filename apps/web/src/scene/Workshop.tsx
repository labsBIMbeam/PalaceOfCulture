/**
 * Workshop — the working heart of the beta sandbox: this is a Werkstatt, so it needs TOOLS and a
 * FORGE. The craft stations cluster into one yard on the plaza's west ring (where a guild building
 * would stand), anchored by a stone forge chimney with an ember glow + drifting smoke — the camp's
 * second focal vertical after the build site. Kenney workbenches + hand tools (CC0, public/tools).
 * Placement data that needs collision (STATIONS, workshopSolids) is exported for StreetColliders.
 */

import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { GlbModel } from "./GlbModel";
import { LampPost } from "./LampPost";
import type { SolidSpec } from "./Plaza";

const tool = (name: string) => `/tools/${name}.glb`;

/** Yard centre on the plaza's west ring (shared with vegetation avoidance + interactables). */
export const WORKSHOP_CENTRE: [number, number] = [-35, 88];
/** The forge chimney — the yard's dominant vertical (shared with its collider + the smoke). */
export const FORGE_CHIMNEY: [number, number] = [-39.5, 86];

export type StationSpec = {
  pos: [number, number, number];
  rotY: number;
  kind: "smith" | "carpenter" | "bench";
};

/** The craft stations, clustered into the yard and facing its centre. */
export const STATIONS: StationSpec[] = [
  { pos: [-36, 0, 82], rotY: 1.1, kind: "smith" },
  { pos: [-38, 0, 91], rotY: 1.6, kind: "carpenter" },
  { pos: [-32, 0, 96], rotY: 2.3, kind: "bench" },
  { pos: [-31, 0, 79], rotY: 0.6, kind: "carpenter" },
];

/** Everything solid in the yard — consumed by StreetColliders so visuals + collision line up. */
export function workshopSolids(): SolidSpec[] {
  const out: SolidSpec[] = [
    // the forge chimney
    { pos: [FORGE_CHIMNEY[0], 3.25, FORGE_CHIMNEY[1]], half: [0.85, 3.25, 0.85] },
    // the log pile behind the carpenter
    { pos: [-41, 0.5, 94], half: [0.6, 0.5, 1.4] },
  ];
  for (const s of STATIONS) {
    out.push({ pos: [s.pos[0], 0.55, s.pos[2]], half: [1.3, 0.55, 0.7], rotY: s.rotY });
  }
  return out;
}

/** One work station: benches + a few tools leaning/lying around. */
function Station({ pos, rotY, kind }: StationSpec) {
  return (
    <group position={pos} rotation-y={rotY}>
      {kind === "smith" ? (
        <>
          <GlbModel fitHeight={1.0} position={[0, 0, 0]} url={tool("workbench-anvil")} />
          <GlbModel
            fitHeight={1.1}
            position={[1.6, 0, 0.2]}
            rotationY={0.3}
            url={tool("workbench-grind")}
          />
          <GlbModel
            fitHeight={1.5}
            position={[-1.2, 0, 0.6]}
            rotationY={-0.4}
            url={tool("sledgehammer")}
          />
          <GlbModel
            fitHeight={1.6}
            position={[-1.5, 0, -0.4]}
            rotationY={0.5}
            url={tool("pickaxe")}
          />
        </>
      ) : kind === "carpenter" ? (
        <>
          <GlbModel fitHeight={1.0} position={[0, 0, 0]} url={tool("workbench")} />
          <GlbModel
            fitHeight={1.5}
            position={[1.4, 0, 0.3]}
            rotationY={-0.3}
            url={tool("handsaw")}
          />
          <GlbModel
            fitHeight={1.7}
            position={[-1.3, 0, 0.4]}
            rotationY={0.4}
            url={tool("woodaxe")}
          />
          <GlbModel fitHeight={0.5} position={[1.2, 0, -0.7]} url={tool("toolbox")} />
        </>
      ) : (
        <>
          <GlbModel fitHeight={1.0} position={[0, 0, 0]} url={tool("workbench")} />
          <GlbModel
            fitHeight={1.3}
            position={[1.3, 0, 0.2]}
            rotationY={0.6}
            url={tool("crowbar")}
          />
          <GlbModel fitHeight={0.9} position={[-1.2, 0, 0.3]} rotationY={-0.5} url={tool("axe")} />
        </>
      )}
    </group>
  );
}

const SMOKE_COUNT = 6;
const SMOKE_TOP = 6.5; // chimney mouth height
const FOG_GREY = new THREE.Color("#6a5a70"); // matches the street fog — smoke fades into the dusk

/** Soft smoke drifting from the chimney mouth: one instanced mesh, puffs rise, swell and fade
 *  toward the fog colour on a looping cycle. */
function ChimneySmoke() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(0.5, 1), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#9a8fa0",
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    [],
  );
  const m = useMemo(() => new THREE.Matrix4(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const t = (clock.elapsedTime * 0.16 + i / SMOKE_COUNT) % 1;
      const y = SMOKE_TOP + 0.4 + t * 6.5;
      const drift = t * t * 2.2; // wind pushes the older puffs east
      const sc = 0.5 + t * 2.4;
      s.set(sc, sc * 0.9, sc);
      m.compose(
        new THREE.Vector3(
          FORGE_CHIMNEY[0] + drift + Math.sin(t * 9 + i) * 0.25,
          y,
          FORGE_CHIMNEY[1] + Math.cos(t * 7 + i * 2) * 0.3,
        ),
        q,
        s,
      );
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.set("#a89bab").lerp(FOG_GREY, t));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return <instancedMesh args={[geo, mat, SMOKE_COUNT]} frustumCulled={false} ref={ref} />;
}

/** The forge: a tapered stone chimney with a glowing hearth facing the yard — the vertical that
 *  reads from across the camp — plus its warm light. */
function Forge() {
  const [fx, fz] = FORGE_CHIMNEY;
  return (
    <group position={[fx, 0, fz]}>
      {/* tapered stone stack */}
      <mesh castShadow position={[0, 2, 0]} receiveShadow>
        <boxGeometry args={[1.7, 4, 1.7]} />
        <meshStandardMaterial color="#8a8073" roughness={1} />
      </mesh>
      <mesh castShadow position={[0, 5.25, 0]}>
        <boxGeometry args={[1.2, 2.5, 1.2]} />
        <meshStandardMaterial color="#7d7469" roughness={1} />
      </mesh>
      <mesh position={[0, SMOKE_TOP + 0.05, 0]}>
        <boxGeometry args={[1.3, 0.24, 1.3]} />
        <meshStandardMaterial color="#5d554c" roughness={1} />
      </mesh>
      {/* the hearth mouth facing the yard (+x), with the ember glow */}
      <mesh position={[0.86, 0.75, 0]}>
        <boxGeometry args={[0.06, 1.1, 1.2]} />
        <meshStandardMaterial
          color="#ff8a3c"
          emissive="#ff6a1e"
          emissiveIntensity={2.2}
          toneMapped={false}
        />
      </mesh>
      {/* ember light — the yard's warm pool (one of the few real lights) */}
      <pointLight color="#ff7a30" decay={2} distance={22} intensity={55} position={[1.4, 1.2, 0]} />
      <ChimneySmoke />
    </group>
  );
}

/** The workshop yard on the west ring: forge + clustered stations, sawdust, logs and a lamp. */
export function Workshop() {
  return (
    <group>
      <Suspense fallback={null}>
        {STATIONS.map((s) => (
          <Station key={s.kind + s.pos.join(",")} {...s} />
        ))}
      </Suspense>
      <Forge />
      {/* sawdust patch under the carpenter's bench */}
      <mesh position={[-38, 0.035, 91]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[2.4, 24]} />
        <meshStandardMaterial color="#b99b6b" roughness={1} transparent opacity={0.85} />
      </mesh>
      {/* the log pile (matching collider in workshopSolids) */}
      <group position={[-41, 0, 94]}>
        {[
          [0.25, 0.28, -0.5],
          [-0.2, 0.28, 0.45],
          [0.02, 0.78, 0],
        ].map(([lx, ly, lz]) => (
          <mesh
            castShadow
            key={`${lx},${ly}`}
            position={[lx ?? 0, ly ?? 0, lz ?? 0]}
            rotation-x={Math.PI / 2}
          >
            <cylinderGeometry args={[0.26, 0.26, 2.4, 8]} />
            <meshStandardMaterial color="#5a3f27" roughness={1} />
          </mesh>
        ))}
      </group>
      {/* a lamp where the yard meets the street ring */}
      <LampPost position={[-29, 0, 87]} />
    </group>
  );
}
