import type { AvatarConfig } from "@600b/shared";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

// Normalise any rigged character to a known height with feet at the group origin.
const TARGET_HEIGHT = 1.7;
const ELDER_HAIR = "#d9d2c4";
const EMPTY: string[] = [];

// Horizontal-speed thresholds (m/s) that pick the locomotion clip. Derived from velocity rather than
// ecctrl's animation state, which depends on flaky ground-ray detection in a big trimesh world.
const WALK_SPEED = 0.6;
const RUN_SPEED = 5;
const JUMP_VY = 1.2; // vertical speed (m/s) above which the avatar is treated as airborne

type Gait = "idle" | "walk" | "run" | "sit" | "sleep" | "jump";

function asStandard(material: THREE.Material): THREE.MeshStandardMaterial | null {
  return "color" in material ? (material as THREE.MeshStandardMaterial) : null;
}

function improveTextureSampling(material: THREE.MeshStandardMaterial, anisotropy: number): void {
  for (const texture of [
    material.map,
    material.normalMap,
    material.roughnessMap,
    material.metalnessMap,
    material.aoMap,
    material.emissiveMap,
  ]) {
    if (!texture) continue;
    if (texture.anisotropy < anisotropy) {
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
    }
  }

  // Six legacy exports use their albedo as a full-strength emissive map. That flattens all scene
  // lighting and washes out the texture; it is exporter residue, not authored glow.
  if (material.map && material.emissiveMap === material.map) {
    material.emissiveMap = null;
    material.emissive.set(0x000000);
    material.emissiveIntensity = 0;
    material.needsUpdate = true;
  }

  if (material instanceof THREE.MeshPhysicalMaterial) {
    material.specularColor.r = Math.min(1, material.specularColor.r);
    material.specularColor.g = Math.min(1, material.specularColor.g);
    material.specularColor.b = Math.min(1, material.specularColor.b);
  }
}

/** Find the clip name for a gait, tolerating per-pack naming (Quaternius "Walk", Meshy "walking_man"…). */
function clipFor(gait: Gait, names: string[], idleFallback: string): string {
  const find = (sub: string) => names.find((n) => n.toLowerCase().includes(sub));
  const idle = find("idle") ?? find("clip0") ?? find("clip") ?? idleFallback ?? names[0];
  if (gait === "walk") return find("walk") ?? idle;
  if (gait === "run") return find("run") ?? find("walk") ?? idle;
  // Pose/airborne clips: fall back to idle until the clip GLB is present on the rig.
  if (gait === "jump") return find("jump") ?? idle;
  if (gait === "sit") return find("sit") ?? idle;
  if (gait === "sleep") return find("sleep") ?? find("lie") ?? idle;
  return idle;
}

/**
 * Renders a rigged glTF character and drives its locomotion. Geometry comes from `url`; models whose
 * walk/run clips ship as separate files (`clipUrls`, the Meshy rig export) get those clips merged onto
 * the same skeleton (bound by bone name). The active clip follows the controller's **horizontal
 * speed** (`bodyRef`) — idle / walk / run with a cross-fade — so the avatar actually steps while
 * moving; with no body (builder preview) it rests on idle. Named materials are tinted from the
 * `AvatarConfig` (`Skin` ← skinTone, `Hair*` ← hair), cloned per instance so tinting never leaks into
 * the cached glTF. Behind `AvatarView`.
 */
export function RiggedAvatar({
  url,
  config,
  clipUrls = EMPTY,
  bodyRef,
  pose,
}: {
  url: string;
  config: AvatarConfig;
  clipUrls?: string[];
  bodyRef?: RefObject<RapierRigidBody | null>;
  /** When set, the avatar holds this pose clip (sit/sleep) instead of speed-driven locomotion. */
  pose?: "sit" | "sleep";
}) {
  const group = useRef<THREE.Group>(null);
  const anisotropy = useThree((state) => Math.min(8, state.gl.capabilities.getMaxAnisotropy()));
  const { scene, animations } = useGLTF(url);
  // Extra GLBs loaded only for their clips (same rig → the mixer binds them by bone name).
  const extra = useGLTF(clipUrls) as unknown as Array<{ animations: THREE.AnimationClip[] }>;

  const clips = useMemo(() => {
    const extraClips = (Array.isArray(extra) ? extra : []).flatMap((g) => g?.animations ?? []);
    return [...animations, ...extraClips];
  }, [animations, extra]);

  const { root, ownedMats, skinMats, hairMats, hips } = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene);
    cloned.updateMatrixWorld(true);
    const height = new THREE.Box3().setFromObject(cloned).getSize(new THREE.Vector3()).y || 1;
    cloned.scale.setScalar(TARGET_HEIGHT / height);
    cloned.updateMatrixWorld(true);
    cloned.position.y -= new THREE.Box3().setFromObject(cloned).min.y;

    const skin: THREE.MeshStandardMaterial[] = [];
    const hair: THREE.MeshStandardMaterial[] = [];
    const ownedMaterials: THREE.Material[] = [];
    let hipBone: THREE.Object3D | null = null;
    cloned.traverse((object) => {
      object.castShadow = true;
      // Skinned meshes get culled by a stale bind-pose bounds when animated — keep them drawn.
      object.frustumCulled = false;
      // The hip/root bone carries the body-moving translation track — grab it to plant the avatar.
      if (!hipBone && /^(hips|hip|pelvis|root)$/i.test(object.name)) hipBone = object;
      const mesh = object as THREE.Mesh;
      if (!mesh.material) return;
      const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // Clone materials so per-instance tinting can't mutate the shared cached glTF.
      const copies = source.map((material) => {
        const copy = material.clone();
        ownedMaterials.push(copy);
        const standard = asStandard(copy);
        if (standard) {
          improveTextureSampling(standard, anisotropy);
          if (standard.name === "Skin") skin.push(standard);
          else if (/hair/i.test(standard.name)) hair.push(standard);
        }
        return copy;
      });
      mesh.material = Array.isArray(mesh.material) ? copies : (copies[0] as THREE.Material);
    });
    return {
      root: cloned,
      ownedMats: ownedMaterials,
      skinMats: skin,
      hairMats: hair,
      hips: hipBone as THREE.Object3D | null,
    };
  }, [anisotropy, scene]);

  useEffect(
    () => () => {
      for (const material of ownedMats) material.dispose();
    },
    [ownedMats],
  );

  useEffect(() => {
    for (const material of skinMats) material.color.set(config.skinTone);
  }, [skinMats, config.skinTone]);

  useEffect(() => {
    const color = config.age === "elder" ? ELDER_HAIR : config.hair;
    for (const material of hairMats) material.color.set(color);
  }, [hairMats, config.hair, config.age]);

  const { actions, names } = useAnimations(clips, group);
  const idleFallback = animations[0]?.name ?? "";

  // Cross-fade helper + current gait, driven below from the body's speed.
  const current = useRef<THREE.AnimationAction | null>(null);
  const gait = useRef<Gait>("idle");

  const playGait = useMemo(() => {
    return (next: Gait) => {
      const name = clipFor(next, names, idleFallback);
      const action = name ? actions[name] : null;
      if (!action || action === current.current) return;
      action.reset().fadeIn(0.2).play();
      current.current?.fadeOut(0.2);
      current.current = action;
      gait.current = next;
    };
  }, [actions, names, idleFallback]);

  // Start on the pose (if any) or idle once the actions exist; re-fire when the pose changes.
  useEffect(() => {
    current.current = null;
    playGait(pose ?? "idle");
  }, [playGait, pose]);

  const hipLock = useRef<THREE.Vector3 | null>(null);
  useFrame(() => {
    // While holding a pose (sit/sleep) stay on its clip; otherwise pick the gait from speed.
    if (!pose) {
      const body = bodyRef?.current;
      if (body) {
        const v = body.linvel();
        const speed = Math.hypot(v.x, v.z);
        const next: Gait =
          Math.abs(v.y) > JUMP_VY
            ? "jump"
            : speed > RUN_SPEED
              ? "run"
              : speed > WALK_SPEED
                ? "walk"
                : "idle";
        if (next !== gait.current) playGait(next);
      }
    }
    // Foot-plant: the baked clips translate the hip bone, popping/drifting the body relative to the
    // capsule. Run after the mixer (this useFrame is registered after useAnimations) and pin the hip's
    // local position to its first animated value — limbs/spine still animate (so it reads as
    // walking-in-place while the controller carries the body); only the body-move + bob are removed.
    // Foot-plant only for locomotion. Pose clips (sit/sleep) deliberately move the hips down onto the
    // seat/bed — pinning the hip there would float the avatar at standing height above the object.
    if (hips && !pose) {
      if (!hipLock.current) hipLock.current = hips.position.clone();
      else hips.position.copy(hipLock.current);
    } else if (pose) {
      hipLock.current = null;
    }
  });

  return (
    <group ref={group}>
      <primitive object={root} />
    </group>
  );
}
