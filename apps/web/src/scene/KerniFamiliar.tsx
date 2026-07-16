/**
 * Kerni — the Palace's floating workshop familiar (CIVO, "Chief Invisible Hand Officer").
 * Canon: join.600.wtf/lore.html — obsidian ceramic, copper rings, one amber lens; hovers at the
 * workshop edge, present when useful, never in the way. The model is the project's own character
 * art from join.600.wtf, repacked for the web budget (tooling/scripts/repack_join_character.py).
 * Unrigged by design: a familiar floats, so the motion is a gentle code-driven bob + drift.
 */

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const KERNI_URL = "/npc/kerni.glb";
/** Familiar body height (m) — small enough to read as a helper, not a person. */
const BODY_HEIGHT = 0.85;
/** Hover height of the body centre above ground (m). */
const HOVER_Y = 1.35;

export function KerniFamiliar({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const { scene } = useGLTF(KERNI_URL);
  const group = useRef<THREE.Group>(null);

  const { object, scale, centreOffset } = useMemo(() => {
    const o = scene.clone(true);
    o.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });
    const box = new THREE.Box3().setFromObject(o);
    const size = box.getSize(new THREE.Vector3());
    const s = BODY_HEIGHT / (size.y || 1);
    const centre = box.getCenter(new THREE.Vector3()).multiplyScalar(-s);
    return { object: o, scale: s, centreOffset: centre };
  }, [scene]);

  // Idle hover: slow bob + a faint sway/yaw, phase-locked to the clock so it never pops.
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.position.y = HOVER_Y + Math.sin(t * 0.9) * 0.08;
    g.rotation.y = rotationY + Math.sin(t * 0.23) * 0.35;
    g.rotation.z = Math.sin(t * 0.51) * 0.03;
  });

  return (
    <group position={position}>
      <group position={[0, HOVER_Y, 0]} ref={group} rotation-y={rotationY}>
        <primitive object={object} position={centreOffset} scale={scale} />
        {/* the amber lens reads at dusk — one warm, tiny glow, no shadow cost */}
        <pointLight castShadow={false} color="#ffb347" distance={4} intensity={0.9} />
      </group>
    </group>
  );
}

useGLTF.preload(KERNI_URL);
