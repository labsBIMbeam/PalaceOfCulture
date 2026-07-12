/**
 * GlbModel — a shared loader for CC0 GLB assets: clones (so one GLB serves many), casts/receives
 * shadows, seats the model on y=0, and either fits it to a target height or applies a raw scale.
 * The source assets span ~4:1 native scales (SI/imperial mix), so prefer `fitHeight`.
 */

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export function GlbModel({
  url,
  position,
  rotationY = 0,
  fitHeight,
  scale = 1,
}: {
  url: string;
  position: [number, number, number];
  rotationY?: number;
  /** Target height in metres; uniform scale preserves proportions. Overrides `scale`. */
  fitHeight?: number;
  scale?: number;
}) {
  const { scene } = useGLTF(url);
  const { object, s, posY } = useMemo(() => {
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
    const sc = fitHeight ? fitHeight / h : scale;
    return { object: o, s: sc, posY: -box.min.y * sc };
  }, [scene, fitHeight, scale]);
  return (
    <group position={position} rotation-y={rotationY}>
      <primitive object={object} position={[0, posY, 0]} scale={s} />
    </group>
  );
}
