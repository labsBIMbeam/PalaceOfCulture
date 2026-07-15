/**
 * Signpost — a Zelda-style wooden waypost: a pole with one or two arrow boards, each carrying a
 * short carved label (tiny cached CanvasTexture). Boards yaw independently so an arrow can point
 * at its destination. Primitives only; the label keeps orientation playable without a minimap.
 */

import { useMemo } from "react";
import * as THREE from "three";

const labelCache = new Map<string, THREE.CanvasTexture>();

/** A small wooden board texture with a light carved label. Cached per text. */
function signTexture(text: string): THREE.CanvasTexture {
  const hit = labelCache.get(text);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const x = c.getContext("2d");
  const t = new THREE.CanvasTexture(c);
  if (x) {
    x.fillStyle = "#5a4632";
    x.fillRect(0, 0, 256, 64);
    x.strokeStyle = "#4a3826";
    x.lineWidth = 4;
    x.strokeRect(3, 3, 250, 58);
    x.fillStyle = "#e8dcc0";
    x.font = "bold 30px Georgia, serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, 128, 34);
  }
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  labelCache.set(text, t);
  return t;
}

export type SignBoard = { text: string; angle: number; height?: number };

export function Signpost({
  position,
  boards,
}: {
  position: [number, number, number];
  boards: SignBoard[];
}) {
  const textures = useMemo(() => boards.map((b) => signTexture(b.text)), [boards]);
  return (
    <group position={position}>
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 2.2, 6]} />
        <meshStandardMaterial color="#4a3722" roughness={0.95} />
      </mesh>
      {boards.map((b, i) => (
        <group key={b.text} position={[0, b.height ?? 1.7 - i * 0.42, 0]} rotation-y={b.angle}>
          <mesh castShadow>
            <boxGeometry args={[1.35, 0.34, 0.06]} />
            <meshStandardMaterial map={textures[i]} roughness={0.9} />
          </mesh>
          {/* arrow tip on the pointing end */}
          <mesh position={[0.78, 0, 0]} rotation-z={Math.PI / 4}>
            <boxGeometry args={[0.24, 0.24, 0.06]} />
            <meshStandardMaterial color="#5a4632" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
