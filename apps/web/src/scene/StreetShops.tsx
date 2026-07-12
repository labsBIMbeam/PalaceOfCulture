/**
 * Walk-in buildings for Street, mixed in front of the tall procedural facades:
 *  - HeroShop: a ready-made furnished interior (CC-BY "The Corner Store", credited in
 *    public/buildings/CREDITS.md) — the showcase you can walk into.
 *  - CozyShell: a lightweight CC0 building we build from primitives (walls + a door opening + roof),
 *    furnished with the CC0 furniture we already ship (table / chairs / lamp).
 * Decorative for now (no wall collider yet — you can walk in; making the walls solid is a follow-up
 * that needs these moved inside <Physics>). Seated on y=0.
 */

import { Clone, useGLTF } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";

const HERO_URL = "/buildings/corner-store.glb";
const FURN = {
  table: "/furniture/table-1.glb",
  chair: "/furniture/chair-1.glb",
  lamp: "/furniture/lamp-1.glb",
};

/** The CC-BY hero shop — measured and seated so its base rests on y=0; shadows on. */
function HeroShop({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const { scene } = useGLTF(HERO_URL);
  const { object, posY } = useMemo(() => {
    const o = scene.clone(true);
    o.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(o);
    return { object: o, posY: -box.min.y };
  }, [scene]);
  return (
    <group position={position} rotation-y={rotationY}>
      <primitive object={object} position={[0, posY, 0]} />
    </group>
  );
}

/** CC0 furniture (metric, authored on y=0) for a cozy interior — a table, two chairs and a lamp. */
function ShellFurniture() {
  const table = useGLTF(FURN.table);
  const chair = useGLTF(FURN.chair);
  const lamp = useGLTF(FURN.lamp);
  return (
    <group position={[0, 0.08, 0]}>
      <Clone object={table.scene} position={[0, 0, 0]} />
      <Clone object={chair.scene} position={[0, 0, 0.8]} rotation-y={Math.PI} />
      <Clone object={chair.scene} position={[0, 0, -0.8]} />
      <Clone object={lamp.scene} position={[2.2, 0, -1.8]} />
    </group>
  );
}

/** A small CC0 building from primitives: four walls with a door opening, floor, roof, furnished. */
function CozyShell({
  position,
  rotationY = 0,
  accent,
}: {
  position: [number, number, number];
  rotationY?: number;
  accent: string;
}) {
  const W = 7;
  const D = 6;
  const H = 3.2;
  const t = 0.25;
  const doorW = 1.7;
  const seg = (W - doorW) / 2;
  const wall = "#e8dcc4";
  return (
    <group position={position} rotation-y={rotationY}>
      {/* floor */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[W, 0.1, D]} />
        <meshStandardMaterial color="#caa777" roughness={0.95} />
      </mesh>
      {/* back + sides */}
      <mesh castShadow position={[0, H / 2, -D / 2]} receiveShadow>
        <boxGeometry args={[W, H, t]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[-W / 2, H / 2, 0]} receiveShadow>
        <boxGeometry args={[t, H, D]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[W / 2, H / 2, 0]} receiveShadow>
        <boxGeometry args={[t, H, D]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      {/* front wall with a door opening (two segments + lintel) */}
      <mesh castShadow position={[-(doorW / 2 + seg / 2), H / 2, D / 2]} receiveShadow>
        <boxGeometry args={[seg, H, t]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[doorW / 2 + seg / 2, H / 2, D / 2]} receiveShadow>
        <boxGeometry args={[seg, H, t]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, H - 0.45, D / 2]}>
        <boxGeometry args={[doorW, 0.9, t]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      {/* roof */}
      <mesh castShadow position={[0, H + 0.15, 0]}>
        <boxGeometry args={[W + 0.5, 0.35, D + 0.5]} />
        <meshStandardMaterial color="#b8542f" roughness={0.85} />
      </mesh>
      {/* cypherpunk neon sign over the door */}
      <mesh position={[0, H + 0.1, D / 2 + 0.12]}>
        <boxGeometry args={[doorW + 0.6, 0.5, 0.12]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.3} />
      </mesh>
      <Suspense fallback={null}>
        <ShellFurniture />
      </Suspense>
    </group>
  );
}

/** The walk-in buildings, placed nearer the lane than the tall facade row (the "mix" layout). */
export function StreetShops() {
  return (
    <group>
      <Suspense fallback={null}>
        <HeroShop position={[-10, 0, 72]} rotationY={Math.PI / 2} />
      </Suspense>
      <CozyShell accent="#ff8a3d" position={[10, 0, 58]} rotationY={-Math.PI / 2} />
      <CozyShell accent="#7cff6b" position={[10, 0, 96]} rotationY={-Math.PI / 2} />
    </group>
  );
}

useGLTF.preload(HERO_URL);
