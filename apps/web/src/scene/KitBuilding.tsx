/**
 * KitHouse — a modular house assembled from the CC0 Kenney City/House kit (public/housekit, see its
 * CREDITS.md). The kit is authored on a 2-metre grid: `wall`/`wall-window-round` panels are 2.0 long ×
 * 2.4 tall, `floor`/`roof-center` are 2×2 tiles (dimensions measured from the GLBs). Pieces are placed
 * at native scale so they snap; nothing here reads game state — pure scenery. A missing kit piece is
 * swallowed by the boundary in StreetWorld, so the house just renders without it.
 */

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type * as THREE from "three";

const CELL = 2; // kit grid: one cell is 2 m
const WALL_H = 2.4; // wall panel height → roof sits here

const kitUrl = (name: string) => `/housekit/${name}.glb`;

const KIT_PIECES = ["wall", "wall-window-round", "floor", "roof-center", "door"] as const;
type KitName = (typeof KIT_PIECES)[number];

/** One kit GLB, cloned + shadowed, placed at native scale (the kit is grid-authored). */
function KitPiece({
  name,
  position,
  rotationY = 0,
  scale = 1,
}: {
  name: KitName;
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
}) {
  const { scene } = useGLTF(kitUrl(name));
  const object = useMemo(() => {
    const o = scene.clone(true);
    o.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return o;
  }, [scene]);
  return (
    <group position={position} rotation-y={rotationY} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

type Piece = { name: KitName; pos: [number, number, number]; rotY?: number; scale?: number };

/** Assemble the perimeter walls + floor + flat roof of a cx×cz-cell house. */
function assemble(cx: number, cz: number): Piece[] {
  const out: Piece[] = [];
  const cellX = (i: number) => (i - (cx - 1) / 2) * CELL;
  const cellZ = (j: number) => (j - (cz - 1) / 2) * CELL;
  const xEdge = (cx * CELL) / 2;
  const zEdge = (cz * CELL) / 2;
  const midX = Math.floor(cx / 2);
  const midZ = Math.floor(cz / 2);

  for (let i = 0; i < cx; i++) {
    for (let j = 0; j < cz; j++) {
      out.push({ name: "floor", pos: [cellX(i), 0, cellZ(j)] });
      out.push({ name: "roof-center", pos: [cellX(i), WALL_H, cellZ(j)] });
    }
  }
  // north/south edges run along X (panel's long axis is Z natively → rotate 90°)
  for (let i = 0; i < cx; i++) {
    out.push({ name: "wall", pos: [cellX(i), 0, -zEdge], rotY: Math.PI / 2 }); // front (door goes on top)
    out.push({
      name: i === midX ? "wall-window-round" : "wall",
      pos: [cellX(i), 0, zEdge],
      rotY: Math.PI / 2,
    });
  }
  // east/west edges run along Z (native orientation, no rotation)
  for (let j = 0; j < cz; j++) {
    out.push({ name: j === midZ ? "wall-window-round" : "wall", pos: [-xEdge, 0, cellZ(j)] });
    out.push({ name: j === midZ ? "wall-window-round" : "wall", pos: [xEdge, 0, cellZ(j)] });
  }
  // Door leaf on the middle of the front (south) face. The leaf is edge-pivoted (spans x[-0.49,0])
  // and faces +z natively, so rotate 180° to face outward (−z) and shift x by half its scaled width
  // to centre it on the wall. Native height 1.01 → scale to ~2 m.
  const doorScale = 1.98;
  out.push({
    name: "door",
    pos: [cellX(midX) - 0.245 * doorScale, 0, -zEdge - 0.02],
    rotY: Math.PI,
    scale: doorScale,
  });
  return out;
}

/** A finished modular house. `cells` is its footprint in 2 m grid cells. */
export function KitHouse({
  position,
  cells = [2, 2],
  rotationY = 0,
}: {
  position: [number, number, number];
  cells?: [number, number];
  rotationY?: number;
}) {
  const pieces = useMemo(() => assemble(cells[0], cells[1]), [cells[0], cells[1]]);
  return (
    <group position={position} rotation-y={rotationY}>
      {pieces.map((p, i) => (
        <KitPiece
          key={`${p.name}-${p.pos.join(",")}-${i}`}
          name={p.name}
          position={p.pos}
          rotationY={p.rotY ?? 0}
          scale={p.scale ?? 1}
        />
      ))}
    </group>
  );
}

for (const name of KIT_PIECES) useGLTF.preload(kitUrl(name));
