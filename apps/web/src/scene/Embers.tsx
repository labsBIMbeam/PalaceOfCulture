/**
 * Embers — a column of tiny glowing sparks rising from a point (forge hearth, fire bowl). ONE
 * instanced mesh; per-frame loop moves each spark up a seeded path, shrinking and cooling from
 * bright ember orange toward the dusk fog. Emissive-only: no light, no shadow — cheap Zelda warmth.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "./rand";

const COOL = new THREE.Color("#4a2a30"); // cooled spark, sinks into the dusk

export function Embers({
  position,
  count = 10,
  height = 1.8,
  spread = 0.35,
}: {
  position: [number, number, number];
  count?: number;
  height?: number;
  spread?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.035, 5, 4), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const phases = useMemo(() => {
    const rnd = mulberry32(count * 97 + Math.round(position[0] * 7 + position[2] * 13));
    return Array.from({ length: count }, () => ({
      off: rnd(),
      speed: 0.35 + rnd() * 0.3,
      dx: (rnd() - 0.5) * 2,
      dz: (rnd() - 0.5) * 2,
    }));
  }, [count, position]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      if (!p) continue;
      const t = (clock.elapsedTime * p.speed + p.off) % 1;
      const sc = 1 - t * 0.7;
      s.set(sc, sc, sc);
      m.compose(
        new THREE.Vector3(
          position[0] + p.dx * spread * t + Math.sin(t * 14 + i) * 0.06,
          position[1] + t * height,
          position[2] + p.dz * spread * t,
        ),
        q,
        s,
      );
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.set("#ffb054").lerp(COOL, t * t));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return <instancedMesh args={[geo, mat, count]} frustumCulled={false} ref={ref} />;
}
