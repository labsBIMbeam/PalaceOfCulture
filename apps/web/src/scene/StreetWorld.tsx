/**
 * Werkstattgasse — the Palace of Culture workshop street. A walkable demo world (PC): a cobbled lane
 * running out from the palace gate, lined with the tall Gründerzeit/cypherpunk facades (LocktardStreet)
 * and walk-in shops (StreetShops), with open-air WORKSHOP STALLS along the centre — the crafts that feed
 * the economy (sawmill, kiln, weaver, forge, lantern-maker, print) — plus market props and warm evening
 * lantern light. Everything is primitives + procedural canvas textures, so it loads offline with no asset
 * fetch. Art is static, state is data: nothing here reads or writes game state; it is pure scenery.
 */

import { useGLTF } from "@react-three/drei";
import { Component, type ReactNode, Suspense, useMemo } from "react";
import * as THREE from "three";
import { Enclosure } from "./Enclosure";
import { PLAZA_CENTRE, PLAZA_RADIUS, Plaza } from "./Plaza";
import { Vegetation } from "./Vegetation";

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
/** Half-extents + centre of the flat walk collider under the whole lane (z runs 0→256). */
export const STREET_GROUND: {
  half: [number, number, number];
  center: [number, number, number];
} = { half: [70, 5, 150], center: [0, -5, 132] };

/** Rustic packed-earth ground: warm dirt with soft patches of lighter/darker soil and scattered
 *  gravel — the tiling texture. The worn centre path is a separate overlay plane in the render (baking
 *  it here would tile into stripes). */
function dirtTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d");
  const fallback = new THREE.CanvasTexture(c);
  if (!x) return fallback;
  x.fillStyle = "#6b5843"; // warm earth base
  x.fillRect(0, 0, S, S);
  const patches = ["#5a4835", "#7a6650", "#4f4030", "#75604a"];
  for (let i = 0; i < 130; i++) {
    x.globalAlpha = 0.3;
    x.fillStyle = patches[i % patches.length] ?? "#5a4835";
    x.beginPath();
    x.ellipse(
      Math.random() * S,
      Math.random() * S,
      8 + Math.random() * 22,
      (8 + Math.random() * 22) * 0.7,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    x.fill();
  }
  x.globalAlpha = 1;
  for (let i = 0; i < 90; i++) {
    const pr = 1 + Math.random() * 2.2;
    x.fillStyle = Math.random() > 0.5 ? "#8a8074" : "#5c5346"; // gravel
    x.beginPath();
    x.ellipse(Math.random() * S, Math.random() * S, pr, pr * 0.8, 0, 0, Math.PI * 2);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(20, 60);
  t.anisotropy = 4;
  return t;
}

/** A lighter worn-path texture for the centre lane overlay (dustier packed earth). */
function pathTexture(): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d");
  const fallback = new THREE.CanvasTexture(c);
  if (!x) return fallback;
  x.fillStyle = "#9a8468";
  x.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) {
    x.globalAlpha = 0.28;
    x.fillStyle = Math.random() > 0.5 ? "#8a745a" : "#a89279";
    x.beginPath();
    x.ellipse(
      Math.random() * S,
      Math.random() * S,
      4 + Math.random() * 12,
      3 + Math.random() * 8,
      0,
      0,
      Math.PI * 2,
    );
    x.fill();
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 60);
  t.anisotropy = 4;
  return t;
}

/** A cast-iron lamppost with a warm glowing head (emissive only — real lights are rationed for perf). */
function LampPost({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 2.1, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 4.2, 8]} />
        <meshStandardMaterial color="#2a2e34" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 4.3, 0]}>
        <boxGeometry args={[0.4, 0.5, 0.4]} />
        <meshStandardMaterial
          color="#ffdca0"
          emissive="#ffca70"
          emissiveIntensity={1.7}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function GateArch() {
  const H = 7;
  const span = 18;
  return (
    <group position={[0, 0, 14]}>
      {[-span / 2, span / 2].map((px) => (
        <mesh castShadow key={px} position={[px, H / 2, 0]} receiveShadow>
          <boxGeometry args={[2, H, 2]} />
          <meshStandardMaterial color="#d8cdb4" roughness={0.9} />
        </mesh>
      ))}
      <mesh castShadow position={[0, H + 0.6, 0]}>
        <boxGeometry args={[span + 3, 1.6, 2.4]} />
        <meshStandardMaterial color="#cfc3a6" roughness={0.9} />
      </mesh>
      <mesh position={[0, H + 0.6, 1.25]}>
        <boxGeometry args={[span - 2, 0.7, 0.1]} />
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
const APPROACH_Z0 = 12;
const APPROACH_Z1 = PLAZA_CENTRE[1] - PLAZA_RADIUS;
const APPROACH_MID = (APPROACH_Z0 + APPROACH_Z1) / 2;
// A little depot clutter beside the walkable shells (a beta staging camp).
const DEPOT: PropSpec[] = [
  { name: "crate-1", pos: [-9, 0, 40], fit: 0.9 },
  { name: "barrel-1", pos: [-11, 0, 42], fit: 1.1 },
  { name: "sack", pos: [10, 0, 44], fit: 0.6 },
  { name: "crate-2", pos: [11, 0, 46], fit: 0.9, rotY: 0.4 },
  { name: "log", pos: [-13, 0, 92], fit: 0.6, rotY: 0.5 },
  { name: "barrel-2", pos: [13, 0, 96], fit: 1.0 },
];
const DEPOT_LAMPS: [number, number][] = [
  [-8, APPROACH_MID],
  [8, APPROACH_MID],
  [-8, APPROACH_Z1 - 4],
  [8, APPROACH_Z1 - 4],
];

/** The Werkstattgasse beta sandbox: a round plaza whose centre births the rocket + Palace, an approach
 *  path from the gate, and walkable shells ringing the plaza (see Plaza.tsx). */
export function StreetWorld() {
  const dirt = useMemo(dirtTexture, []);
  const path = useMemo(pathTexture, []);
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
        <meshStandardMaterial map={path} roughness={1} transparent opacity={0.9} />
      </mesh>

      <GateArch />

      {/* the world's edge — a palisade fence + a dense forest band enclosing the camp */}
      <Enclosure />

      {/* the living layer — Zelda-style grass, rocks, bushes, flowers & trees around the camp */}
      <Vegetation />

      {/* the plaza: prepared site + the young tree, ringed by walkable buildings */}
      <PropBoundary>
        <Plaza />
      </PropBoundary>

      {/* warm lamps — the key light source at dusk (bright glow heads + real pools of light) */}
      {DEPOT_LAMPS.map(([lx, lz]) => (
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
      {/* a warm lantern glow over the plaza site + the young tree */}
      <pointLight color="#ffb86a" decay={2} distance={40} intensity={70} position={[0, 6, 120]} />
      <pointLight color="#ffcf87" decay={2} distance={22} intensity={30} position={[11, 4, 122]} />

      {/* beta-camp depot clutter beside the approach */}
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
