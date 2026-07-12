/**
 * Village — the old-town quarter at the end of Werkstattgasse, in the 600 Billion blend: medieval +
 * wild-west timber/stone buildings (CC0 Quaternius Fantasy Town — inn/tavern, blacksmith, sawmill,
 * stable, houses, huts, watch tower, windmill) fused with a CYBERPUNK layer — neon signs, glowing
 * strips and rooftop beacons bolted onto the old walls, plus a couple of tech towers behind. Buildings
 * are CC0 GLBs (public/village, see CREDITS.md); the neon is primitives. Pure scenery, no game state.
 */

import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";

const villageUrl = (name: string) => `/village/${name}.glb`;

const BUILDINGS = [
  "inn",
  "house-a",
  "house-b",
  "house-c",
  "house-small",
  "blacksmith",
  "sawmill",
  "stable",
  "hut-a",
  "hut-b",
  "tower",
  "windmill",
  "market-stand",
  "tech-tower",
  "tech-block",
] as const;
type BuildingName = (typeof BUILDINGS)[number];

/** A CC0 building GLB, cloned + shadowed, seated on y=0 and uniform-scaled to a target height. */
function Building({
  name,
  position,
  rotationY = 0,
  fitHeight,
}: {
  name: BuildingName;
  position: [number, number, number];
  rotationY?: number;
  fitHeight: number;
}) {
  const { scene } = useGLTF(villageUrl(name));
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

/** A glowing neon bar (thin emissive box) — the cyberpunk layer bolted onto the old walls. */
function Neon({
  position,
  size = [1.6, 0.28, 0.12],
  color = "#39d6ff",
  rotationY = 0,
}: {
  position: [number, number, number];
  size?: [number, number, number];
  color?: string;
  rotationY?: number;
}) {
  return (
    <mesh position={position} rotation-y={rotationY}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2.2}
        toneMapped={false}
      />
    </mesh>
  );
}

/** A cyberpunk rooftop beacon on a mast (bolted onto a medieval roof). */
function Beacon({
  position,
  color = "#ff4fd8",
}: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1.8, 6]} />
        <meshStandardMaterial color="#2a2e36" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

type Placement = { name: BuildingName; pos: [number, number, number]; fit: number; rotY?: number };

// The old-town square at the far end of the lane (z 218–278). Medieval/western buildings ring a
// central market; tech towers rise behind as the cyberpunk skyline. Fronts face roughly toward the
// approaching player (−z) or the square centre.
const TOWN: Placement[] = [
  { name: "inn", pos: [-15, 0, 236], fit: 8.5, rotY: Math.PI * 0.75 }, // the tavern/saloon — hero
  { name: "blacksmith", pos: [15, 0, 232], fit: 6, rotY: -Math.PI * 0.7 },
  { name: "sawmill", pos: [17, 0, 260], fit: 6, rotY: -Math.PI * 0.6 },
  { name: "stable", pos: [-17, 0, 264], fit: 5.5, rotY: Math.PI * 0.6 },
  { name: "house-a", pos: [-7, 0, 222], fit: 6.5, rotY: Math.PI },
  { name: "house-b", pos: [7, 0, 221], fit: 5, rotY: Math.PI },
  { name: "house-c", pos: [-22, 0, 246], fit: 4.5, rotY: Math.PI / 2 },
  { name: "house-small", pos: [22, 0, 242], fit: 4, rotY: -Math.PI / 2 },
  { name: "hut-a", pos: [-5, 0, 274], fit: 3.5, rotY: 0.3 },
  { name: "hut-b", pos: [6, 0, 272], fit: 3.5, rotY: -0.4 },
  { name: "market-stand", pos: [0, 0, 250], fit: 3.2 },
  { name: "tower", pos: [24, 0, 276], fit: 13, rotY: 0.2 }, // watch tower (medieval vertical)
  { name: "windmill", pos: [-25, 0, 273], fit: 9 },
  { name: "tech-tower", pos: [29, 0, 282], fit: 17 }, // cyberpunk skyline behind
  { name: "tech-block", pos: [-30, 0, 280], fit: 9 },
];

/** Cyberpunk neon accents bolted onto the old town (positions tuned to sit on/near the buildings). */
function NeonLayer() {
  return (
    <group>
      <Neon
        color="#ff8a3d"
        position={[-14, 5.2, 233]}
        rotationY={Math.PI * 0.75}
        size={[2.4, 0.4, 0.14]}
      />
      <Neon color="#39d6ff" position={[15, 3.4, 232]} rotationY={-Math.PI * 0.7} />
      <Neon color="#7cff6b" position={[17, 3.6, 260]} rotationY={-Math.PI * 0.6} />
      <Neon color="#ff4fd8" position={[-7, 4.4, 224.4]} size={[1.8, 0.3, 0.12]} />
      <Neon color="#39d6ff" position={[0, 2.6, 251.2]} size={[1.2, 0.24, 0.1]} />
      <Beacon color="#ff4fd8" position={[-16, 8, 236]} />
      <Beacon color="#39d6ff" position={[24, 13, 276]} />
      <Beacon color="#7cff6b" position={[-25, 9, 273]} />
      {/* the tech tower reads cyberpunk on its own — crown it with a beacon */}
      <Beacon color="#39d6ff" position={[29, 17, 282]} />
    </group>
  );
}

/** The whole old-town quarter: medieval/western buildings + cyberpunk neon, at the end of the lane. */
export function Village() {
  return (
    <group>
      <Suspense fallback={null}>
        {TOWN.map((b) => (
          <Building
            fitHeight={b.fit}
            key={b.name}
            name={b.name}
            position={b.pos}
            rotationY={b.rotY ?? 0}
          />
        ))}
      </Suspense>
      <NeonLayer />
    </group>
  );
}

for (const name of BUILDINGS) useGLTF.preload(villageUrl(name));
