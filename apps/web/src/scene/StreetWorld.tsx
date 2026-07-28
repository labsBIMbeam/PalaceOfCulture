/**
 * Locktard Street — the Palace of Culture workshop camp / first playable district.
 * A walkable beta world: a south gate arch, a short staged approach, and a round civic PLAZA
 * (Plaza.tsx) whose centre holds the Palace teaser site (released soon · date TBA) —
 * ringed by walkable buildings, with the WORKSHOP yard (forge + chimney smoke) on the west ring. A
 * palisade + forest band (Enclosure.tsx) holds it all close. Primitives + procedural canvas textures +
 * a few CC0 GLB props. Art is static, state is data: nothing here reads or writes game state.
 */

import { useGLTF } from "@react-three/drei";
import { Component, type ReactNode, Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Enclosure, GATE_ARCH } from "./Enclosure";
import { KerniFamiliar } from "./KerniFamiliar";
import { LampPost } from "./LampPost";
import { PLAZA_CENTRE, PLAZA_RADIUS, Plaza, type SolidSpec, YOUNG_TREE } from "./Plaza";
import { Signpost } from "./Signpost";
import { Vegetation } from "./Vegetation";
import { Workshop } from "./Workshop";
import { mulberry32 } from "./rand";
import type { AssemblyState, PlacementState, SignalLens } from "../meaningverse/phase1Relay";

/** Keeps a failed asset fetch (404/renamed GLB) from white-screening the whole engine — the street
 *  just renders without that prop. Suspense does not catch fetch errors, so we need this boundary. */
class PropBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const STREET_SPAWN: [number, number, number] = [0, 3, 30];
/** Half-extents + centre of the flat walk collider under the whole camp (covers the forest band). */
export const STREET_GROUND: {
  half: [number, number, number];
  center: [number, number, number];
} = { half: [72, 5, 92], center: [0, -5, 74] };

/** Rustic packed-earth ground: warm dirt with soft patches of lighter/darker soil and scattered
 *  gravel — the tiling texture. The worn centre path is a separate overlay plane in the render (baking
 *  it here would tile into stripes). Seeded — the ground must not reroll on remount. */
function dirtTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d");
  const fallback = new THREE.CanvasTexture(c);
  if (!x) return fallback;
  const rnd = mulberry32(404);
  x.fillStyle = "#6b5843"; // warm earth base
  x.fillRect(0, 0, S, S);
  const patches = ["#5a4835", "#7a6650", "#4f4030", "#75604a"];
  for (let i = 0; i < 130; i++) {
    x.globalAlpha = 0.3;
    x.fillStyle = patches[i % patches.length] ?? "#5a4835";
    x.beginPath();
    x.ellipse(
      rnd() * S,
      rnd() * S,
      8 + rnd() * 22,
      (8 + rnd() * 22) * 0.7,
      rnd() * Math.PI,
      0,
      Math.PI * 2,
    );
    x.fill();
  }
  x.globalAlpha = 1;
  for (let i = 0; i < 90; i++) {
    const pr = 1 + rnd() * 2.2;
    x.fillStyle = rnd() > 0.5 ? "#8a8074" : "#5c5346"; // gravel
    x.beginPath();
    x.ellipse(rnd() * S, rnd() * S, pr, pr * 0.8, 0, 0, Math.PI * 2);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(18, 24);
  t.anisotropy = 4;
  return t;
}

/** A lighter worn-path texture for the centre lane overlay (dustier packed earth). Seeded. */
function pathTexture(): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d");
  const fallback = new THREE.CanvasTexture(c);
  if (!x) return fallback;
  const rnd = mulberry32(505);
  x.fillStyle = "#9a8468";
  x.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) {
    x.globalAlpha = 0.28;
    x.fillStyle = rnd() > 0.5 ? "#8a745a" : "#a89279";
    x.beginPath();
    x.ellipse(rnd() * S, rnd() * S, 4 + rnd() * 12, 3 + rnd() * 8, 0, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 14);
  t.anisotropy = 4;
  return t;
}

function GateArch() {
  const { z, halfSpan, height: H, postHalf } = GATE_ARCH;
  return (
    <group position={[0, 0, z]}>
      {[-halfSpan, halfSpan].map((px) => (
        <mesh castShadow key={px} position={[px, H / 2, 0]} receiveShadow>
          <boxGeometry args={[postHalf * 2, H, postHalf * 2]} />
          <meshStandardMaterial color="#d8cdb4" roughness={0.9} />
        </mesh>
      ))}
      <mesh castShadow position={[0, H + 0.6, 0]}>
        <boxGeometry args={[halfSpan * 2 + 3, 1.6, 2.4]} />
        <meshStandardMaterial color="#cfc3a6" roughness={0.9} />
      </mesh>
      <mesh position={[0, H + 0.6, 1.25]}>
        <boxGeometry args={[halfSpan * 2 - 2, 0.7, 0.1]} />
        <meshStandardMaterial
          color="#ffca70"
          emissive="#ffb347"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// --- Real CC0 props (Quaternius / Kenney via Poly Pizza — see public/props/CREDITS.md) ---

const propUrl = (name: string) => `/props/${name}.glb`;

/** A CC0 GLB prop: cloned (so one GLB serves many), shadowed, seated on y=0, uniform-scaled to fit. */
function Prop({
  name,
  position,
  rotationY = 0,
  fitHeight,
}: {
  name: string;
  position: [number, number, number];
  rotationY?: number;
  /** Target height in metres; uniform scale preserves the model's proportions. */
  fitHeight: number;
}) {
  const { scene } = useGLTF(propUrl(name));
  const { object, scale, posY } = useMemo(() => {
    const o = scene.clone(true);
    o.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(o);
    const h = box.max.y - box.min.y || 1;
    const s = fitHeight / h;
    return { object: o, scale: s, posY: -box.min.y * s };
  }, [scene, fitHeight]);
  return (
    <group position={position} rotation-y={rotationY}>
      <primitive object={object} position={[0, posY, 0]} scale={scale} />
    </group>
  );
}

type PropSpec = { name: string; pos: [number, number, number]; fit: number; rotY?: number };

// The approach path runs from the gate to the plaza edge; the plaza is the round civic centre.
const APPROACH_Z0 = GATE_ARCH.z - 2;
const APPROACH_Z1 = PLAZA_CENTRE[1] - PLAZA_RADIUS;
const APPROACH_MID = (APPROACH_Z0 + APPROACH_Z1) / 2;
// Depot clutter hugging the approach edges (a beta staging camp) + a parked cart by the gate.
const DEPOT: PropSpec[] = [
  { name: "cart", pos: [-13, 0, 26], fit: 1.7, rotY: 0.4 },
  { name: "crate-1", pos: [-8.5, 0, 38], fit: 0.9 },
  { name: "barrel-1", pos: [-10, 0, 40.5], fit: 1.1 },
  { name: "sack", pos: [9.5, 0, 43], fit: 0.6 },
  { name: "crate-2", pos: [10.5, 0, 45], fit: 0.9, rotY: 0.4 },
  { name: "log", pos: [-11, 0, 55], fit: 0.6, rotY: 0.5 },
  { name: "barrel-2", pos: [11, 0, 57], fit: 1.0 },
];
/** Solid depot props (the cart) — consumed by StreetColliders. */
export function depotSolids(): SolidSpec[] {
  return [{ pos: [-13, 0.75, 26], half: [1.1, 0.75, 1.7], rotY: 0.4 }];
}
// Approach lamps, staggered L/R (asymmetric on purpose); both carry a real light pool.
const APPROACH_LAMPS: [number, number][] = [
  [-7.5, 44],
  [7.5, 54],
];

// Lamp posts on the plaza rim; the garland strings hang between them. South stays open.
const RIM_LAMP_DEGS = [330, 30, 90, 150, 210];
const RIM_LAMP_R = PLAZA_RADIUS + 2;
function rimLampPositions(): [number, number, number][] {
  const [cx, cz] = PLAZA_CENTRE;
  return RIM_LAMP_DEGS.map((d) => {
    const a = (d * Math.PI) / 180;
    return [cx + Math.cos(a) * RIM_LAMP_R, 0, cz + Math.sin(a) * RIM_LAMP_R];
  });
}

/** Worn stepping stones snaking along the approach path — one instanced draw. */
function SteppingStones() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const stones = useMemo(() => {
    const rnd = mulberry32(212);
    const out: { x: number; z: number; r: number; a: number }[] = [];
    let z = APPROACH_Z0 + 6;
    while (z < APPROACH_Z1 - 2) {
      out.push({
        x: Math.sin(z * 0.32) * 2 + (rnd() - 0.5) * 2.4,
        z,
        r: 0.45 + rnd() * 0.3,
        a: rnd() * Math.PI,
      });
      z += 2.8 + rnd() * 1.6;
    }
    return out;
  }, []);
  const geo = useMemo(() => new THREE.CylinderGeometry(1, 1.06, 0.09, 7), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#a99e8c", flatShading: true, roughness: 1 }),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < stones.length; i++) {
      const st = stones[i];
      if (!st) continue;
      q.setFromAxisAngle(up, st.a);
      s.set(st.r, 1, st.r * (0.8 + (i % 3) * 0.12));
      m.compose(new THREE.Vector3(st.x, 0.045, st.z), q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [stones]);
  return <instancedMesh args={[geo, mat, stones.length]} receiveShadow ref={ref} />;
}

const PENNANT_COLOURS = ["#e8735a", "#e7b23c", "#23806f", "#efe6d2"]; // brand festival palette

/** A festive pennant string between two points: instanced cable segments + coloured triangle
 *  flags (two draws per string). Static + deterministic. */
function PennantString({
  from,
  to,
  sag = 0.8,
}: {
  from: [number, number, number];
  to: [number, number, number];
  sag?: number;
}) {
  const SEGS = 10;
  const FLAGS = 9;
  const cableRef = useRef<THREE.InstancedMesh>(null);
  const flagRef = useRef<THREE.InstancedMesh>(null);
  const cableGeo = useMemo(() => new THREE.CylinderGeometry(0.018, 0.018, 1, 4), []);
  const cableMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2c2620", roughness: 0.9 }),
    [],
  );
  const flagGeo = useMemo(() => new THREE.CircleGeometry(0.22, 3), []);
  const flagMat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }),
    [],
  );
  useLayoutEffect(() => {
    const cable = cableRef.current;
    const flag = flagRef.current;
    if (!cable || !flag) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const at = (t: number) =>
      new THREE.Vector3(
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t - Math.sin(Math.PI * t) * sag,
        from[2] + (to[2] - from[2]) * t,
      );
    for (let k = 0; k < SEGS; k++) {
      const p0 = at(k / SEGS);
      const p1 = at((k + 1) / SEGS);
      dir.subVectors(p1, p0);
      const len = dir.length();
      q.setFromUnitVectors(up, dir.normalize());
      s.set(1, len, 1);
      m.compose(p0.add(p1).multiplyScalar(0.5), q, s);
      cable.setMatrixAt(k, m);
    }
    // flags hang point-down, facing along the walk direction (z)
    q.setFromEuler(new THREE.Euler(0, 0, Math.PI));
    s.set(1, 1, 1);
    for (let k = 0; k < FLAGS; k++) {
      const p = at((k + 1) / (FLAGS + 1));
      p.y -= 0.24;
      m.compose(p, q, s);
      flag.setMatrixAt(k, m);
      flag.setColorAt(k, new THREE.Color(PENNANT_COLOURS[k % PENNANT_COLOURS.length]));
    }
    cable.instanceMatrix.needsUpdate = true;
    flag.instanceMatrix.needsUpdate = true;
    if (flag.instanceColor) flag.instanceColor.needsUpdate = true;
  }, [from, to, sag]);
  return (
    <group>
      <instancedMesh args={[cableGeo, cableMat, SEGS]} ref={cableRef} />
      <instancedMesh args={[flagGeo, flagMat, FLAGS]} ref={flagRef} />
    </group>
  );
}

const GARLAND_SEGS = 12; // cable segments per span
const GARLAND_LANTERNS = 7; // lanterns per span
const GARLAND_TOP = 4.32; // lamp-head height the cable hangs from
const GARLAND_SAG = 1.15;

/** Lantern strings between consecutive posts: ONE instanced cable mesh + ONE instanced emissive
 *  lantern mesh for all spans (two draw calls). Static + deterministic. */
function Garland({ posts }: { posts: [number, number, number][] }) {
  const cableRef = useRef<THREE.InstancedMesh>(null);
  const lanternRef = useRef<THREE.InstancedMesh>(null);
  const spans = posts.length - 1;
  const cableGeo = useMemo(() => new THREE.CylinderGeometry(0.022, 0.022, 1, 4), []);
  const cableMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2c2620", roughness: 0.9 }),
    [],
  );
  const lanternGeo = useMemo(() => new THREE.BoxGeometry(0.18, 0.26, 0.18), []);
  const lanternMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffdca0",
        emissive: "#ffc26a",
        emissiveIntensity: 1.6,
        toneMapped: false,
      }),
    [],
  );
  useLayoutEffect(() => {
    const cable = cableRef.current;
    const lantern = lanternRef.current;
    if (!cable || !lantern) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const at = (a: [number, number, number], b: [number, number, number], t: number) =>
      new THREE.Vector3(
        a[0] + (b[0] - a[0]) * t,
        GARLAND_TOP - Math.sin(Math.PI * t) * GARLAND_SAG,
        a[2] + (b[2] - a[2]) * t,
      );
    for (let p = 0; p < spans; p++) {
      const a = posts[p];
      const b = posts[p + 1];
      if (!a || !b) continue;
      for (let k = 0; k < GARLAND_SEGS; k++) {
        const p0 = at(a, b, k / GARLAND_SEGS);
        const p1 = at(a, b, (k + 1) / GARLAND_SEGS);
        dir.subVectors(p1, p0);
        const len = dir.length();
        q.setFromUnitVectors(up, dir.normalize());
        s.set(1, len, 1);
        m.compose(p0.add(p1).multiplyScalar(0.5), q, s);
        cable.setMatrixAt(p * GARLAND_SEGS + k, m);
      }
      q.identity();
      s.set(1, 1, 1);
      for (let k = 0; k < GARLAND_LANTERNS; k++) {
        const point = at(a, b, (k + 1) / (GARLAND_LANTERNS + 1));
        point.y -= 0.16;
        m.compose(point, q, s);
        lantern.setMatrixAt(p * GARLAND_LANTERNS + k, m);
      }
    }
    cable.instanceMatrix.needsUpdate = true;
    lantern.instanceMatrix.needsUpdate = true;
  }, [posts, spans]);
  return (
    <group>
      <instancedMesh args={[cableGeo, cableMat, spans * GARLAND_SEGS]} ref={cableRef} />
      <instancedMesh args={[lanternGeo, lanternMat, spans * GARLAND_LANTERNS]} ref={lanternRef} />
    </group>
  );
}

function RelayWorkbench({
  acceptedPlacement,
  acceptedLens,
  assembly,
  placement,
}: {
  acceptedPlacement: boolean;
  acceptedLens: SignalLens | null;
  assembly: AssemblyState;
  placement: PlacementState;
}) {
  const seated = new Set(assembly.seatedParts);
  const carried = assembly.carriedPart;
  const parts = [
    { id: "foot", color: "#b56d3d", position: [-1.2, 0.52, 0] as [number, number, number] },
    { id: "coil", color: "#d9d0c2", position: [0, 0.68, 0] as [number, number, number] },
    { id: "aperture", color: "#f3b64d", position: [1.2, 0.58, 0] as [number, number, number] },
  ] as const;
  return (
    <group name="RelayWorkbench" position={[-27.5, 0, 91.2]}>
      <mesh castShadow receiveShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[4.6, 0.22, 1.6]} />
        <meshStandardMaterial color="#4e3427" roughness={0.92} />
      </mesh>
      {parts.map((part) => (
        <group key={part.id} name={`relay-${part.id}`} position={part.position}>
          <mesh receiveShadow position={[0, -0.22, 0]}>
            <torusGeometry args={[0.32, 0.035, 8, 20]} />
            <meshStandardMaterial color={seated.has(part.id) ? "#49c6b2" : "#6f5c4c"} />
          </mesh>
          <mesh castShadow position={[0, seated.has(part.id) ? 0.22 : 0.58, 0]} visible={!seated.has(part.id) || carried === part.id}>
            {part.id === "coil" ? <torusGeometry args={[0.24, 0.09, 12, 24]} /> : <cylinderGeometry args={[0.2, 0.26, 0.32, 12]} />}
            <meshStandardMaterial color={part.color} emissive={part.id === "aperture" ? "#8b4b10" : "#000000"} emissiveIntensity={acceptedPlacement ? 0.8 : 0} />
          </mesh>
        </group>
      ))}
      <group name="z1-relay-socket" position={[0, 0.62, 0.62]}>
        <mesh receiveShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.08, 16]} />
          <meshStandardMaterial color={acceptedPlacement ? "#e7b23c" : "#8f7964"} emissive={acceptedPlacement ? "#8b4b10" : "#000000"} emissiveIntensity={acceptedPlacement ? 1.2 : 0} />
        </mesh>
        {acceptedPlacement ? <pointLight color="#ffbf55" distance={1.4} intensity={0.45} position={[0, 0.34, 0]} /> : null}
      </group>
      {acceptedLens ? (
        <group name="signal-lens" position={[0, 1.18, 0.62]}>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.28, 0.055, 10, 24]} />
            <meshStandardMaterial color="#5cd8ff" emissive="#15546a" emissiveIntensity={0.9} />
          </mesh>
          <pointLight color="#5cd8ff" distance={1.1} intensity={0.22} />
        </group>
      ) : null}
      <mesh name="relay-status-plate" position={[0, 0.8, -0.72]}>
        <boxGeometry args={[2.8, 0.16, 0.05]} />
        <meshStandardMaterial color={placement.status === "accepted" ? "#d8a944" : "#6f5c4c"} />
      </mesh>
    </group>
  );
}

/** Locktard Street beta sandbox: gate → staged approach → round plaza with Palace teaser,
 *  workshop yard on the west ring, all held by the palisade + forest. */
export function StreetWorld({
  acceptedPlacement = false,
  acceptedLens = null,
  assembly = { status: "parts_0", seatedParts: [], carriedPart: null },
  placement = { status: "idle", socketId: null, attemptId: null, acceptedSocketId: null },
  presenceAccepted = false,
  reducedEffects = false,
}: {
  /** Presentation-only: the app-owned placement fact has been accepted. */
  acceptedPlacement?: boolean;
  /** Presentation-only: one additive lens from reducer-authorized accepted evidence. */
  acceptedLens?: SignalLens | null;
  /** Presentation-only projection of the bounded assembly reducer state. */
  assembly?: AssemblyState;
  /** Presentation-only projection of the bounded placement reducer state. */
  placement?: PlacementState;
  /** Presentation-only: settled presence improves local legibility. */
  presenceAccepted?: boolean;
  /** Presentation-only effects preference. */
  reducedEffects?: boolean;
}) {
  const dirt = useMemo(dirtTexture, []);
  const path = useMemo(pathTexture, []);
  const rimLamps = useMemo(rimLampPositions, []);
  return (
    <group>
      {/* rustic packed-earth ground */}
      <mesh position={[0, 0.02, STREET_GROUND.center[2]]} receiveShadow rotation-x={-Math.PI / 2}>
        <planeGeometry args={[STREET_GROUND.half[0] * 2, STREET_GROUND.half[2] * 2]} />
        <meshStandardMaterial map={dirt} roughness={1} />
      </mesh>
      {/* the round plaza floor (packed, paler) */}
      <mesh
        position={[PLAZA_CENTRE[0], 0.04, PLAZA_CENTRE[1]]}
        receiveShadow
        rotation-x={-Math.PI / 2}
      >
        <circleGeometry args={[PLAZA_RADIUS, 48]} />
        <meshStandardMaterial map={path} roughness={1} />
      </mesh>
      {/* the approach path from the gate to the plaza */}
      <mesh position={[0, 0.03, APPROACH_MID]} receiveShadow rotation-x={-Math.PI / 2}>
        <planeGeometry args={[13, APPROACH_Z1 - APPROACH_Z0]} />
        <meshStandardMaterial map={path} opacity={0.9} roughness={1} transparent />
      </mesh>

      <GateArch />
      {/* festive pennants: across the gate arch + diagonally over the approach lamps */}
      <PennantString
        from={[-GATE_ARCH.halfSpan, GATE_ARCH.height + 0.1, GATE_ARCH.z]}
        sag={0.7}
        to={[GATE_ARCH.halfSpan, GATE_ARCH.height + 0.1, GATE_ARCH.z]}
      />
      <PennantString from={[-7.5, 4.3, 44]} sag={0.9} to={[7.5, 4.3, 54]} />
      {/* worn stepping stones along the walk */}
      <SteppingStones />
      {/* waypost just inside the gate */}
      <Signpost
        boards={[
          { text: "Plaza", angle: -1.57 },
          { text: "Forge", angle: -2.1 },
        ]}
        position={[6.5, 0, 20]}
      />

      {/* the world's edge — a palisade fence + a dense forest band enclosing the camp */}
      <Enclosure />

      {/* the living layer — Zelda-style grass, rocks, bushes, flowers & trees around the camp */}
      <PropBoundary>
        <Vegetation />
      </PropBoundary>

      {/* the workshop yard (forge, chimney smoke, stations) — the second focal point */}
      <PropBoundary>
        <Workshop />
      </PropBoundary>

      {/* Kerni, the floating workshop familiar — hovers at the yard edge, no collider by canon */}
      <PropBoundary>
        <Suspense fallback={null}>
          <KerniFamiliar
            acceptedPlacement={acceptedPlacement}
            presenceAccepted={presenceAccepted}
            position={[-27.5, 0, 93]}
            reducedEffects={reducedEffects}
            rotationY={-2.16}
          />
        </Suspense>
      </PropBoundary>

      <RelayWorkbench acceptedPlacement={acceptedPlacement} acceptedLens={acceptedLens} assembly={assembly} placement={placement} />

      {/* the plaza: staged site + the young tree, benches + well, ringed by walkable buildings */}
      <PropBoundary>
        <Plaza />
      </PropBoundary>

      {/* The civic centre now holds the live MoC ship assembly, mounted by PalaceScene. */}

      {/* approach lamps — the guiding light pools between gate and plaza */}
      {APPROACH_LAMPS.map(([lx, lz]) => (
        <group key={`${lx},${lz}`}>
          <LampPost position={[lx, 0, lz]} />
          <pointLight
            color="#ffc36a"
            decay={2}
            distance={26}
            intensity={60}
            position={[lx, 4.4, lz]}
          />
        </group>
      ))}
      {/* plaza rim lamps + the lantern garland between them (emissive; two carry real light) */}
      {rimLamps.map((p) => (
        <LampPost key={`${p[0].toFixed(1)},${p[2].toFixed(1)}`} position={p} />
      ))}
      <Garland posts={rimLamps} />
      {[rimLamps[2], rimLamps[4]].map((p) =>
        p ? (
          <pointLight
            color="#ffc36a"
            decay={2}
            distance={24}
            intensity={45}
            key={`l-${p[0].toFixed(1)},${p[2].toFixed(1)}`}
            position={[p[0], 4.4, p[2]]}
          />
        ) : null,
      )}
      {/* a warm lantern glow over the plaza site + the young tree */}
      <pointLight
        color="#ffb86a"
        decay={2}
        distance={40}
        intensity={70}
        position={[PLAZA_CENTRE[0], 6, PLAZA_CENTRE[1]]}
      />
      <pointLight
        color="#ffcf87"
        decay={2}
        distance={22}
        intensity={30}
        position={[YOUNG_TREE[0] + 1.5, 4, YOUNG_TREE[1] + 1]}
      />

      {/* beta-camp depot clutter hugging the approach */}
      <PropBoundary>
        <Suspense fallback={null}>
          {DEPOT.map((p) => (
            <Prop
              fitHeight={p.fit}
              key={p.pos.join(",")}
              name={p.name}
              position={p.pos}
              rotationY={p.rotY ?? 0}
            />
          ))}
        </Suspense>
      </PropBoundary>
    </group>
  );
}

for (const name of [...new Set(DEPOT.map((p) => p.name))]) useGLTF.preload(propUrl(name));
