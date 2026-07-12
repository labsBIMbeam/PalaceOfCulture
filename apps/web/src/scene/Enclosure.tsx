/**
 * Enclosure — the world's edge: a rustic PALISADE fence ringing the camp and a dense FOREST band just
 * outside it, so the settlement feels held and you never see the empty horizon. Both instanced (three
 * draw calls total). Frontier feel; leaves a gap at the south gate for the approach.
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// fence rectangle + the south gate gap (the approach passes through here)
export const FENCE = { x0: -52, x1: 52, z0: 2, z1: 188 };
export const GATE_X = 11; // half-width of the south gap

/** Palisade post positions along the fence perimeter (skipping the gate gap). */
function palisadePosts(step: number): [number, number][] {
  const out: [number, number][] = [];
  for (let x = FENCE.x0; x <= FENCE.x1; x += step) {
    if (Math.abs(x) > GATE_X) out.push([x, FENCE.z0]); // south (gap in the middle)
    out.push([x, FENCE.z1]); // north
  }
  for (let z = FENCE.z0 + step; z < FENCE.z1; z += step) {
    out.push([FENCE.x0, z]); // west
    out.push([FENCE.x1, z]); // east
  }
  return out;
}

/** Forest positions in the band just outside the fence (denser = a solid green wall). */
function forestBand(seed: number, count: number): THREE.Vector3[] {
  const rnd = mulberry32(seed);
  const out: THREE.Vector3[] = [];
  const outer = { x0: -76, x1: 76, z0: -20, z1: 212 };
  let tries = 0;
  while (out.length < count && tries < count * 8) {
    tries++;
    const x = outer.x0 + rnd() * (outer.x1 - outer.x0);
    const z = outer.z0 + rnd() * (outer.z1 - outer.z0);
    const insideFence =
      x > FENCE.x0 - 2 && x < FENCE.x1 + 2 && z > FENCE.z0 - 2 && z < FENCE.z1 + 2;
    if (insideFence) continue; // keep the camp interior clear
    if (Math.abs(x) < GATE_X + 3 && z < FENCE.z0) continue; // keep the gate approach clear
    out.push(new THREE.Vector3(x, 0, z));
  }
  return out;
}

/** Instanced palisade: rough vertical posts of varied height, tips slightly pointed via scale. */
function Palisade() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const posts = useMemo(() => palisadePosts(0.82), []);
  const geo = useMemo(() => new THREE.CylinderGeometry(0.12, 0.16, 1, 6), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#4f3d29", roughness: 0.95 }),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rnd = mulberry32(31);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < posts.length; i++) {
      const [x, z] = posts[i] ?? [0, 0];
      const h = 1.9 + rnd() * 0.5;
      q.setFromAxisAngle(up, rnd() * 0.3);
      s.set(1, h, 1);
      m.compose(new THREE.Vector3(x, h / 2, z), q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [posts]);
  return <instancedMesh args={[geo, mat, posts.length]} castShadow receiveShadow ref={ref} />;
}

/** Instanced forest: trunks + rounded foliage blobs (two meshes) forming the outer wall of trees. */
function Forest({ seed, count }: { seed: number; count: number }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const trees = useMemo(() => forestBand(seed, count), [seed, count]);
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.32, 1, 6), []);
  const leafGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const trunkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#5a3f27", roughness: 1 }),
    [],
  );
  const leafMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#3f6a34", roughness: 1, flatShading: true }),
    [],
  );
  useLayoutEffect(() => {
    const trunk = trunkRef.current;
    const leaf = leafRef.current;
    if (!trunk || !leaf) return;
    const rnd = mulberry32(seed + 1);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < trees.length; i++) {
      const p = trees[i];
      if (!p) continue;
      const height = 4.5 + rnd() * 4;
      q.setFromAxisAngle(up, rnd() * Math.PI * 2);
      s.set(1, height, 1);
      m.compose(new THREE.Vector3(p.x, height / 2, p.z), q, s);
      trunk.setMatrixAt(i, m);
      const rad = 2.2 + rnd() * 1.8;
      s.set(rad, rad * (0.9 + rnd() * 0.4), rad);
      m.compose(new THREE.Vector3(p.x, height + rad * 0.4, p.z), q, s);
      leaf.setMatrixAt(i, m);
      leaf.setColorAt(i, new THREE.Color().setHSL(0.29 + rnd() * 0.05, 0.4, 0.24 + rnd() * 0.1));
    }
    trunk.instanceMatrix.needsUpdate = true;
    leaf.instanceMatrix.needsUpdate = true;
    if (leaf.instanceColor) leaf.instanceColor.needsUpdate = true;
  }, [trees, seed]);
  return (
    <group>
      <instancedMesh args={[trunkGeo, trunkMat, trees.length]} castShadow ref={trunkRef} />
      <instancedMesh args={[leafGeo, leafMat, trees.length]} castShadow ref={leafRef} />
    </group>
  );
}

export function Enclosure() {
  return (
    <group>
      <Palisade />
      <Forest count={220} seed={71} />
    </group>
  );
}
