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
  acceptedPlacement = false,
  position,
  presenceAccepted = false,
  reducedEffects = false,
  rotationY = 0,
}: {
  /** Presentation-only projection of an accepted app-owned placement fact. */
  acceptedPlacement?: boolean;
  position: [number, number, number];
  /** Presentation-only settled-presence legibility hint. */
  presenceAccepted?: boolean;
  /** Presentation-only effects preference. */
  reducedEffects?: boolean;
  rotationY?: number;
}) {
  const { scene } = useGLTF(KERNI_URL);
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const lensLight = useRef<THREE.PointLight>(null);
  const lastAcceptedPlacement = useRef(false);
  const reactionStartedAt = useRef<number | null>(null);

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

  // Idle hover plus one bounded, nonverbal accepted-placement acknowledgement. The prop is read-only:
  // no animation callback dispatches an application action.
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    if (acceptedPlacement && !lastAcceptedPlacement.current) reactionStartedAt.current = t;
    lastAcceptedPlacement.current = acceptedPlacement;
    const started = reactionStartedAt.current;
    const reactionWindow = reducedEffects ? 1.2 : 0.6;
    const reactionElapsed = started === null ? Number.POSITIVE_INFINITY : t - started;
    const reactionActive = acceptedPlacement && reactionElapsed >= 0 && reactionElapsed < reactionWindow;
    g.position.y = HOVER_Y + Math.sin(t * 0.9) * 0.08;
    g.rotation.x = reactionActive && !reducedEffects ? Math.PI / 18 : 0;
    g.rotation.y = rotationY + Math.sin(t * 0.23) * 0.35;
    g.rotation.z = Math.sin(t * 0.51) * 0.03;
    if (lensLight.current) {
      lensLight.current.intensity = (presenceAccepted ? 1.05 : 0.9) + (reactionActive ? 0.35 : 0);
    }
    if (ring.current) {
      ring.current.scale.setScalar(reactionActive ? 1 + Math.min(reactionElapsed / 0.6, 1) * 0.15 : 1);
      ring.current.visible = acceptedPlacement;
    }
  });

  return (
    <group position={position}>
      <group position={[0, HOVER_Y, 0]} ref={group} rotation-y={rotationY}>
        <primitive object={object} position={centreOffset} scale={scale} />
        <mesh ref={ring} rotation-x={-Math.PI / 2} visible={acceptedPlacement}>
          <torusGeometry args={[0.48, 0.018, 8, 24]} />
          <meshBasicMaterial color="#e7b23c" opacity={0.48} transparent />
        </mesh>
        {/* the amber lens reads at dusk — one warm, tiny glow, no shadow cost */}
        <pointLight
          castShadow={false}
          color="#ffb347"
          distance={4}
          intensity={presenceAccepted ? 1.05 : 0.9}
          ref={lensLight}
        />
      </group>
    </group>
  );
}

useGLTF.preload(KERNI_URL);
