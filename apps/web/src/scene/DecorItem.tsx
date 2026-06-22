// Renders one placed decoration. Three kinds (see furnitureCatalog.ts): a normalised CC0 GLB, a
// picture frame (drei <Image>, image = data URL), or a video screen (drei useVideoTexture, clip =
// data URL). The outer group applies the placed transform (position / yaw / scale); each kind is
// authored with its base on y=0 so it sits on the deck. In decorate mode the group is clickable and
// shows a selection ring.

import { Image, useGLTF, useVideoTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import type { PlacedItem } from "./decorStore";
import {
  CATALOG,
  DEFAULT_FRAME_IMAGE,
  DEFAULT_SCREEN_VIDEO,
  type DecorDef,
} from "./furnitureCatalog";

/**
 * A CC0 GLB kept at its authored real-world scale (times an optional per-asset correction), centred
 * on XZ and seated on the floor (y=0). We deliberately do NOT force a uniform height — the Kenney /
 * Quaternius models are already in metres, so a stool stays a stool and a coffee table stays low.
 */
function FurnitureModel({ url, modelScale = 1 }: { url: string; modelScale?: number }) {
  const { scene } = useGLTF(url);
  const object = useMemo(() => {
    const clone = scene.clone(true);
    clone.scale.setScalar(modelScale);
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
    clone.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
      }
    });
    return clone;
  }, [scene, modelScale]);
  return <primitive object={object} />;
}

const FRAME_W = 1.6;
const FRAME_H = 1.0;
const FRAME_LIFT = 1.05;

/** A framed picture standing on a slim post — the image is a data URL (drei <Image>). */
function PictureFrame({ url }: { url: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[0.5, 0.1, 0.25]} />
        <meshStandardMaterial color="#5a3d22" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, FRAME_LIFT / 2, 0]}>
        <boxGeometry args={[0.08, FRAME_LIFT, 0.08]} />
        <meshStandardMaterial color="#5a3d22" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, FRAME_LIFT + FRAME_H / 2, -0.03]}>
        <boxGeometry args={[FRAME_W + 0.18, FRAME_H + 0.18, 0.08]} />
        <meshStandardMaterial color="#e7b23c" metalness={0.45} roughness={0.4} />
      </mesh>
      <Suspense fallback={null}>
        <Image
          position={[0, FRAME_LIFT + FRAME_H / 2, 0.025]}
          scale={[FRAME_W, FRAME_H]}
          toneMapped={false}
          url={url}
        />
      </Suspense>
    </group>
  );
}

const SCREEN_W = 1.78;
const SCREEN_H = 1.0;
const SCREEN_LIFT = 0.9;

function ScreenSurface({ url }: { url: string }) {
  const texture = useVideoTexture(url, {
    crossOrigin: "anonymous",
    loop: true,
    muted: true,
    start: true,
  });
  return (
    <mesh position={[0, SCREEN_LIFT + SCREEN_H / 2, 0.03]}>
      <planeGeometry args={[SCREEN_W, SCREEN_H]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/** A video screen on a stand — the clip is a data URL (drei useVideoTexture; muted autoplay loop). */
function VideoScreen({ url }: { url: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[0.7, 0.1, 0.3]} />
        <meshStandardMaterial color="#26201a" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, SCREEN_LIFT / 2, 0]}>
        <boxGeometry args={[0.1, SCREEN_LIFT, 0.1]} />
        <meshStandardMaterial color="#26201a" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, SCREEN_LIFT + SCREEN_H / 2, -0.03]}>
        <boxGeometry args={[SCREEN_W + 0.14, SCREEN_H + 0.14, 0.08]} />
        <meshStandardMaterial color="#15110c" metalness={0.3} roughness={0.6} />
      </mesh>
      <Suspense fallback={null}>
        <ScreenSurface url={url} />
      </Suspense>
    </group>
  );
}

function SelectionRing() {
  return (
    <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.85, 1.05, 44]} />
      <meshBasicMaterial color="#f3d27a" opacity={0.85} side={THREE.DoubleSide} transparent />
    </mesh>
  );
}

export function DecorItem({
  item,
  def,
  selected,
  editing,
  onSelect,
}: {
  item: PlacedItem;
  def: DecorDef;
  selected: boolean;
  editing: boolean;
  onSelect: (uid: string) => void;
}) {
  const media = item.mediaUrl ?? def.defaultMedia ?? "";
  const handleClick = editing
    ? (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect(item.uid);
      }
    : undefined;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: r3f group in the canvas, not a DOM element
    <group
      onClick={handleClick}
      position={item.position}
      rotation-y={item.rotationY}
      scale={item.scale}
    >
      {def.kind === "model" && def.url ? (
        <Suspense fallback={null}>
          <FurnitureModel modelScale={def.modelScale} url={def.url} />
        </Suspense>
      ) : def.kind === "frame" ? (
        <PictureFrame url={media || DEFAULT_FRAME_IMAGE} />
      ) : (
        <VideoScreen url={media || DEFAULT_SCREEN_VIDEO} />
      )}
      {editing && selected ? <SelectionRing /> : null}
    </group>
  );
}

// Preload the furniture GLBs so placing one is instant.
for (const def of CATALOG) {
  if (def.kind === "model" && def.url) useGLTF.preload(def.url);
}
