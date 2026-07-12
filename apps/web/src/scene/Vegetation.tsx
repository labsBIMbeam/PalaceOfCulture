/**
 * Vegetation — the world's living layer, in a stylised Zelda-BotW key: lush but simple. Instanced
 * grass tufts that sway in the wind, scattered rounded rocks, bushes, wildflowers and a few soft
 * low-poly trees. All procedural primitives (no assets, no scale issues), all instanced (a handful of
 * draw calls). Scattered in clumps around the camp, avoiding the plaza, the approach path and shells,
 * so the ground reads alive instead of dead. Pure scenery — no game state.
 */

import { useFrame } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GlbModel } from "./GlbModel";
import { PLAZA_CENTRE, PLAZA_RADIUS } from "./Plaza";

/** Small deterministic PRNG so the scatter is stable across reloads. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Keep vegetation off the plaza, the approach path and the immediate camp centre. */
function blocked(x: number, z: number): boolean {
  const dPlaza = Math.hypot(x - PLAZA_CENTRE[0], z - PLAZA_CENTRE[1]);
  if (dPlaza < PLAZA_RADIUS + 3) return true; // plaza + a little breathing room
  if (Math.abs(x) < 8 && z > 8 && z < PLAZA_CENTRE[1] - PLAZA_RADIUS + 2) return true; // approach path
  return false;
}

/** Clumped scatter (patches of vegetation, not a uniform carpet) within the camp bounds. */
function scatter(seed: number, clumps: number, perClump: number, spread: number): THREE.Vector3[] {
  const rnd = mulberry32(seed);
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < clumps; i++) {
    const cx = -58 + rnd() * 116;
    const cz = -8 + rnd() * 220;
    const n = 1 + Math.floor(rnd() * perClump);
    for (let j = 0; j < n; j++) {
      const x = cx + (rnd() - 0.5) * spread;
      const z = cz + (rnd() - 0.5) * spread;
      if (Math.abs(x) > 62 || z < -10 || z > 232 || blocked(x, z)) continue;
      out.push(new THREE.Vector3(x, 0, z));
    }
  }
  return out;
}

/** The hero-tree positions (same deterministic scatter as the visuals) — for trunk colliders. */
export function heroTreePositions(): [number, number][] {
  return scatter(88, 18, 1, 2)
    .slice(0, 16)
    .map((v) => [v.x, v.z] as [number, number]);
}

/** A grass tuft: two crossed tapered quads (uv.y 0 at base → 1 at tip, so wind sways only the top). */
function tuftGeometry(w: number, h: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const hw = w / 2;
  const pos = [
    -hw,
    0,
    0,
    hw,
    0,
    0,
    hw * 0.4,
    h,
    0,
    -hw * 0.4,
    h,
    0,
    0,
    0,
    -hw,
    0,
    0,
    hw,
    0,
    h,
    hw * 0.4,
    0,
    h,
    -hw * 0.4,
  ];
  const uv = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  g.computeVertexNormals();
  return g;
}

/** Canvas texture of a few green blades on transparent — the grass/flower cutout. */
function bladeTexture(kind: "grass" | "flower"): THREE.CanvasTexture {
  const S = 64;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d");
  const t = new THREE.CanvasTexture(c);
  if (!x) return t;
  if (kind === "grass") {
    for (let i = 0; i < 7; i++) {
      const bx = 6 + Math.random() * (S - 12);
      const g = x.createLinearGradient(bx, S, bx, S * 0.1);
      g.addColorStop(0, "#3f6a2e");
      g.addColorStop(1, "#7fb04a");
      x.strokeStyle = g;
      x.lineWidth = 2 + Math.random() * 2;
      x.beginPath();
      x.moveTo(bx, S);
      x.quadraticCurveTo(
        bx + (Math.random() - 0.5) * 14,
        S * 0.5,
        bx + (Math.random() - 0.5) * 20,
        S * 0.08,
      );
      x.stroke();
    }
  } else {
    // a small blade + a bright blossom dot at the tip (colour comes from instanceColor)
    x.strokeStyle = "#4f7a34";
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(S / 2, S);
    x.lineTo(S / 2, S * 0.35);
    x.stroke();
    x.fillStyle = "#ffffff";
    x.beginPath();
    x.arc(S / 2, S * 0.28, S * 0.2, 0, Math.PI * 2);
    x.fill();
  }
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Adds a wind sway to a MeshStandardMaterial: the tip (uv.y≈1) drifts on a per-instance phase. */
function makeWindMaterial(map: THREE.Texture, amount: number): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    map,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uAmount = { value: amount };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;\nuniform float uAmount;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         float ph = instanceMatrix[3][0] * 0.25 + instanceMatrix[3][2] * 0.25;
         float sway = sin(uTime * 1.6 + ph) * uAmount * uv.y;
         transformed.x += sway;
         transformed.z += sway * 0.5;`,
      );
    m.userData.shader = shader;
  };
  return m;
}

/** An instanced field of grass tufts (or flowers) with wind + per-instance colour variation. */
function InstancedField({
  points,
  geometry,
  material,
  scaleRange,
  colours,
  seed,
}: {
  points: THREE.Vector3[];
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  scaleRange: [number, number];
  colours: THREE.Color[];
  seed: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rnd = mulberry32(seed);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p) continue;
      q.setFromAxisAngle(up, rnd() * Math.PI * 2);
      const sc = scaleRange[0] + rnd() * (scaleRange[1] - scaleRange[0]);
      s.set(sc, sc * (0.85 + rnd() * 0.4), sc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(
        i,
        colours[Math.floor(rnd() * colours.length)] ?? colours[0] ?? new THREE.Color(),
      );
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [points, scaleRange, colours, seed]);
  useFrame((state) => {
    const sh = material.userData.shader as { uniforms: { uTime: { value: number } } } | undefined;
    if (sh) sh.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return <instancedMesh args={[geometry, material, points.length]} castShadow ref={ref} />;
}

/** A soft low-poly rock (a squashed icosphere, flat-shaded). Instanced. */
function Rocks({ points, seed }: { points: THREE.Vector3[]; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 0);
    return g;
  }, []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#8b8577", roughness: 1, flatShading: true }),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rnd = mulberry32(seed);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p) continue;
      e.set(rnd() * 0.6, rnd() * Math.PI * 2, rnd() * 0.6);
      q.setFromEuler(e);
      const sc = 0.5 + rnd() * 1.6;
      s.set(sc, sc * (0.5 + rnd() * 0.4), sc);
      m.compose(new THREE.Vector3(p.x, s.y * 0.35, p.z), q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [points, seed]);
  return <instancedMesh args={[geo, mat, points.length]} castShadow receiveShadow ref={ref} />;
}

/** A rounded bush (a green icosphere blob). Instanced. */
function Bushes({ points, seed }: { points: THREE.Vector3[]; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#5b8f42", roughness: 1, flatShading: true }),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rnd = mulberry32(seed);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p) continue;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
      const sc = 0.8 + rnd() * 1.1;
      s.set(sc * (1 + rnd() * 0.3), sc * 0.8, sc * (1 + rnd() * 0.3));
      m.compose(new THREE.Vector3(p.x, sc * 0.55, p.z), q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new THREE.Color().setHSL(0.28 + rnd() * 0.06, 0.45, 0.34 + rnd() * 0.1));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [points, seed]);
  return <instancedMesh args={[geo, mat, points.length]} castShadow receiveShadow ref={ref} />;
}

const nature = (n: string) => `/nature/${n}.glb`;
// nicer CC0 trees (Quaternius), cycled for variety, with a fitted height
const TREE_KINDS: { name: string; fit: number }[] = [
  { name: "oak", fit: 8 },
  { name: "pine", fit: 10 },
  { name: "birch", fit: 6.5 },
  { name: "oak-2", fit: 7.5 },
  { name: "pine-2", fit: 11 },
  { name: "oak", fit: 6.5 },
];

export function Vegetation() {
  const grass = useMemo(() => scatter(1337, 520, 16, 5.5), []);
  const flowers = useMemo(() => scatter(99, 90, 5, 4), []);
  const rocks = useMemo(() => scatter(7, 55, 3, 6), []);
  const bushes = useMemo(() => scatter(4242, 60, 2, 5), []);
  const trees = useMemo(() => scatter(88, 18, 1, 2).slice(0, 16), []);
  const detail = useMemo(() => scatter(303, 30, 2, 7).slice(0, 30), []);

  const grassGeo = useMemo(() => tuftGeometry(0.7, 0.85), []);
  const flowerGeo = useMemo(() => tuftGeometry(0.4, 0.7), []);
  const grassMat = useMemo(() => makeWindMaterial(bladeTexture("grass"), 0.28), []);
  const flowerMat = useMemo(() => makeWindMaterial(bladeTexture("flower"), 0.18), []);

  const grassColours = useMemo(
    () => ["#6ca046", "#7fb04a", "#5c9a42", "#8ab84f", "#9fae52"].map((c) => new THREE.Color(c)),
    [],
  );
  const flowerColours = useMemo(
    () =>
      ["#ff5d6c", "#ffd23f", "#ffffff", "#7cc4ff", "#ff8fd0", "#c77dff"].map(
        (c) => new THREE.Color(c),
      ),
    [],
  );

  return (
    <group>
      <InstancedField
        colours={grassColours}
        geometry={grassGeo}
        material={grassMat}
        points={grass}
        scaleRange={[0.7, 1.5]}
        seed={2}
      />
      <InstancedField
        colours={flowerColours}
        geometry={flowerGeo}
        material={flowerMat}
        points={flowers}
        scaleRange={[0.8, 1.3]}
        seed={5}
      />
      <Rocks points={rocks} seed={11} />
      <Bushes points={bushes} seed={23} />
      {/* nicer GLB trees + nature detail (ferns, stumps, big rocks) near the camp */}
      <Suspense fallback={null}>
        {trees.map((p, i) => {
          const k = TREE_KINDS[i % TREE_KINDS.length] ?? TREE_KINDS[0];
          return (
            <GlbModel
              fitHeight={k?.fit ?? 8}
              key={`t-${p.x.toFixed(1)},${p.z.toFixed(1)}`}
              position={[p.x, 0, p.z]}
              rotationY={(i * 1.7) % (Math.PI * 2)}
              url={nature(k?.name ?? "oak")}
            />
          );
        })}
        {detail.map((p, i) => {
          const kinds = ["fern", "stump", "rock-large", "bush-flowers", "hedge", "bush-berries"];
          const fits = [1.4, 0.6, 2.6, 1.4, 1.5, 1.1];
          const j = i % kinds.length;
          return (
            <GlbModel
              fitHeight={fits[j] ?? 1.2}
              key={`d-${p.x.toFixed(1)},${p.z.toFixed(1)}`}
              position={[p.x, 0, p.z]}
              rotationY={(i * 2.3) % (Math.PI * 2)}
              url={nature(kinds[j] ?? "fern")}
            />
          );
        })}
      </Suspense>
    </group>
  );
}
