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
import { FENCE, GATE_X } from "./Enclosure";
import { GlbModel } from "./GlbModel";
import { PLAZA_CENTRE, PLAZA_RADIUS, plazaRing } from "./Plaza";
import { WORKSHOP_CENTRE, WORK_ORDER_CORNER } from "./Workshop";
import { mulberry32 } from "./rand";

// The ring buildings + workshop yard, precomputed once — scatter must not grow through floors.
const RING = plazaRing();

/** Keep vegetation off the plaza, the approach path, the buildings and the workshop yard. */
function blocked(x: number, z: number): boolean {
  const dPlaza = Math.hypot(x - PLAZA_CENTRE[0], z - PLAZA_CENTRE[1]);
  if (dPlaza < PLAZA_RADIUS + 3) return true; // plaza + a little breathing room
  if (Math.abs(x) < 8 && z > 8 && z < PLAZA_CENTRE[1] - PLAZA_RADIUS + 2) return true; // approach path
  if (Math.abs(x) < GATE_X + 3 && z < 20) return true; // the gate threshold
  for (const b of RING) {
    if (Math.hypot(x - b.pos[0], z - b.pos[2]) < 8.5) return true; // inside a ring building
  }
  if (Math.hypot(x - WORKSHOP_CENTRE[0], z - WORKSHOP_CENTRE[1]) < 9) return true; // workshop yard
  for (const w of WORK_ORDER_CORNER) {
    if (Math.hypot(x - w.pos[0], z - w.pos[2]) < 3.5) return true; // the yard's work-order corner
  }
  return false;
}

/** Clumped scatter (patches of vegetation, not a uniform carpet) within the camp bounds — the
 *  bounds derive from FENCE so compaction moves the living layer with the world's edge. */
function scatter(seed: number, clumps: number, perClump: number, spread: number): THREE.Vector3[] {
  const rnd = mulberry32(seed);
  const out: THREE.Vector3[] = [];
  const w = FENCE.x1 - FENCE.x0 + 12;
  const d = FENCE.z1 - FENCE.z0 + 18;
  for (let i = 0; i < clumps; i++) {
    const cx = FENCE.x0 - 6 + rnd() * w;
    const cz = FENCE.z0 - 8 + rnd() * d;
    const n = 1 + Math.floor(rnd() * perClump);
    for (let j = 0; j < n; j++) {
      const x = cx + (rnd() - 0.5) * spread;
      const z = cz + (rnd() - 0.5) * spread;
      if (
        x < FENCE.x0 - 10 ||
        x > FENCE.x1 + 10 ||
        z < FENCE.z0 - 12 ||
        z > FENCE.z1 + 16 ||
        blocked(x, z)
      )
        continue;
      out.push(new THREE.Vector3(x, 0, z));
    }
  }
  return out;
}

/** Grass tufts hugging every ring-building base — softens the hard wall/ground seam. */
function baseTufts(): THREE.Vector3[] {
  const rnd = mulberry32(606);
  const out: THREE.Vector3[] = [];
  for (const b of RING) {
    for (let i = 0; i < 12; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 8.8 + rnd() * 1.6;
      out.push(new THREE.Vector3(b.pos[0] + Math.cos(a) * r, 0, b.pos[2] + Math.sin(a) * r));
    }
  }
  return out.filter((p) => !blocked(p.x, p.z));
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
    const rnd = mulberry32(303);
    for (let i = 0; i < 7; i++) {
      const bx = 6 + rnd() * (S - 12);
      const g = x.createLinearGradient(bx, S, bx, S * 0.1);
      g.addColorStop(0, "#3f6a2e");
      g.addColorStop(1, "#7fb04a");
      x.strokeStyle = g;
      x.lineWidth = 2 + rnd() * 2;
      x.beginPath();
      x.moveTo(bx, S);
      x.quadraticCurveTo(bx + (rnd() - 0.5) * 14, S * 0.5, bx + (rnd() - 0.5) * 20, S * 0.08);
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

/** Mushroom clusters ringing the hero trees (Zelda forest-floor detail): stems + caps, two
 *  instanced draws. Deterministic ring offsets around the same shared tree positions. */
function mushroomPoints(): { pos: THREE.Vector3; scale: number }[] {
  const rnd = mulberry32(909);
  const out: { pos: THREE.Vector3; scale: number }[] = [];
  for (const [tx, tz] of heroTreePositions().slice(0, 10)) {
    const n = 4 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 1.1 + rnd() * 1.3;
      out.push({
        pos: new THREE.Vector3(tx + Math.cos(a) * r, 0, tz + Math.sin(a) * r),
        scale: 0.5 + rnd() * 0.9,
      });
    }
  }
  return out;
}

function Mushrooms() {
  const stemRef = useRef<THREE.InstancedMesh>(null);
  const capRef = useRef<THREE.InstancedMesh>(null);
  const points = useMemo(mushroomPoints, []);
  const stemGeo = useMemo(() => new THREE.CylinderGeometry(0.05, 0.07, 0.22, 5), []);
  const capGeo = useMemo(() => new THREE.SphereGeometry(0.14, 7, 5, 0, Math.PI * 2, 0, 1.35), []);
  const stemMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d8cdb4", roughness: 1 }),
    [],
  );
  const capMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 }),
    [],
  );
  useLayoutEffect(() => {
    const stem = stemRef.current;
    const cap = capRef.current;
    if (!stem || !cap) return;
    const rnd = mulberry32(910);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const caps = ["#b5533c", "#a05a32", "#8a6f3c", "#b5533c", "#7a4a2c"];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p) continue;
      s.set(p.scale, p.scale, p.scale);
      m.compose(new THREE.Vector3(p.pos.x, 0.11 * p.scale, p.pos.z), q, s);
      stem.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(p.pos.x, 0.2 * p.scale, p.pos.z), q, s);
      cap.setMatrixAt(i, m);
      cap.setColorAt(i, new THREE.Color(caps[Math.floor(rnd() * caps.length)] ?? "#b5533c"));
    }
    stem.instanceMatrix.needsUpdate = true;
    cap.instanceMatrix.needsUpdate = true;
    if (cap.instanceColor) cap.instanceColor.needsUpdate = true;
  }, [points]);
  return (
    <group>
      <instancedMesh args={[stemGeo, stemMat, points.length]} ref={stemRef} />
      <instancedMesh args={[capGeo, capMat, points.length]} castShadow ref={capRef} />
    </group>
  );
}

const FIREFLY_COUNT = 40;

/** Dusk fireflies drifting over the grass: ONE instanced emissive mesh, seeded orbits around
 *  scattered base points, soft blink via scale pulse. No light, no shadow — pure mood. */
function Fireflies() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const bases = useMemo(() => scatter(777, FIREFLY_COUNT, 1, 3).slice(0, FIREFLY_COUNT), []);
  const orbits = useMemo(() => {
    const rnd = mulberry32(778);
    return bases.map(() => ({
      r: 0.8 + rnd() * 2.2,
      speed: 0.25 + rnd() * 0.5,
      phase: rnd() * Math.PI * 2,
      blink: 0.6 + rnd() * 1.2,
    }));
  }, [bases]);
  const geo = useMemo(() => new THREE.SphereGeometry(0.05, 5, 4), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffe28a",
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < bases.length; i++) {
      const b = bases[i];
      const o = orbits[i];
      if (!b || !o) continue;
      const a = t * o.speed + o.phase;
      const pulse = 0.55 + 0.45 * Math.sin(t * o.blink * 2 + o.phase * 3);
      s.set(pulse, pulse, pulse);
      m.compose(
        new THREE.Vector3(
          b.x + Math.cos(a) * o.r,
          0.7 + Math.sin(a * 1.7 + o.phase) * 0.5 + 0.6,
          b.z + Math.sin(a * 0.8) * o.r,
        ),
        q,
        s,
      );
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh args={[geo, mat, bases.length]} frustumCulled={false} ref={ref} />;
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
  const grass = useMemo(() => [...scatter(1337, 560, 16, 5.5), ...baseTufts()], []);
  const flowers = useMemo(() => scatter(99, 150, 5, 4), []);
  const rocks = useMemo(() => scatter(7, 55, 3, 6), []);
  const bushes = useMemo(() => scatter(4242, 70, 2, 5), []);
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
      <Mushrooms />
      <Fireflies />
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
