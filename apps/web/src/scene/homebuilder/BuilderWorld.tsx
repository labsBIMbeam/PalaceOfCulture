// The placed home, rendered — blocks as one InstancedMesh per block type (the GridMap analog:
// data-driven instancing, not thousands of components) plus decor as toon-flat boxes on plinths
// (godot build_system._spawn_decor 1:1). Physics: one fixed RigidBody with a CuboidCollider per
// cell/piece so the avatar walks on what the magnet built.
//
// Raycast fallback ("both" controls): while the pointer is NOT locked, clicking a surface places
// the selection at the hit cell (left) or absorbs (right) — the mobile/no-capture path. The
// locked magnet path lives in MagnetRig.tsx and raycasts against this same targets group.

import type { ThreeEvent } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { type MutableRefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  type BrushSize,
  type BuildSystem,
  type Cell,
  type PlacedBlock,
  useBuildSystem,
} from "../../builder/buildState";
import { blockIds, getObject } from "../../builder/catalog";

const PLINTH_COLOR = "#d8cdb4"; // plinth cream (godot PLINTH_COLOR)
const PLINTH_HEIGHT = 0.06;
const PLINTH_MARGIN = 0.15;

/** Shared toon-flat material cache (godot Catalog.make_material analog). */
const materialCache = new Map<string, THREE.MeshStandardMaterial>();
export function flatMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = materialCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
    materialCache.set(color, mat);
  }
  return mat;
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
// Door: a panel standing in the cell — no collider, so the doorway is walkable.
const DOOR_PANEL = new THREE.BoxGeometry(0.85, 0.96, 0.12);

/** Glass material cache — windows render as translucent panes (still solid to walk against). */
const glassCache = new Map<string, THREE.MeshStandardMaterial>();
function glassMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = glassCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.15,
      metalness: 0,
      transparent: true,
      opacity: 0.45,
    });
    glassCache.set(color, mat);
  }
  return mat;
}

/** Unit roof wedge: flat at the cell floor toward -z, rising to the full cell height at +z. */
function createWedgeGeometry(): THREE.BufferGeometry {
  // Triangle soup (non-indexed); DoubleSide material below forgives winding, normals computed.
  const p = (x: number, y: number, z: number) => [x, y, z];
  const tris = [
    // bottom
    ...p(-0.5, -0.5, -0.5),
    ...p(0.5, -0.5, 0.5),
    ...p(0.5, -0.5, -0.5),
    ...p(-0.5, -0.5, -0.5),
    ...p(-0.5, -0.5, 0.5),
    ...p(0.5, -0.5, 0.5),
    // back wall (z = +0.5)
    ...p(-0.5, -0.5, 0.5),
    ...p(-0.5, 0.5, 0.5),
    ...p(0.5, 0.5, 0.5),
    ...p(-0.5, -0.5, 0.5),
    ...p(0.5, 0.5, 0.5),
    ...p(0.5, -0.5, 0.5),
    // slope (front-bottom edge up to back-top edge)
    ...p(-0.5, -0.5, -0.5),
    ...p(0.5, 0.5, 0.5),
    ...p(-0.5, 0.5, 0.5),
    ...p(-0.5, -0.5, -0.5),
    ...p(0.5, -0.5, -0.5),
    ...p(0.5, 0.5, 0.5),
    // side triangles
    ...p(-0.5, -0.5, -0.5),
    ...p(-0.5, 0.5, 0.5),
    ...p(-0.5, -0.5, 0.5),
    ...p(0.5, -0.5, -0.5),
    ...p(0.5, -0.5, 0.5),
    ...p(0.5, 0.5, 0.5),
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(tris, 3));
  geometry.computeVertexNormals();
  return geometry;
}
const WEDGE = createWedgeGeometry();

/** Merges axis-aligned boxes ([sx, sy, sz, tx, ty, tz] each) into one flat-shaded geometry. */
function mergeBoxes(parts: Array<[number, number, number, number, number, number]>) {
  const positions: number[] = [];
  for (const [sx, sy, sz, tx, ty, tz] of parts) {
    const box = new THREE.BoxGeometry(sx, sy, sz).translate(tx, ty, tz).toNonIndexed();
    positions.push(...Array.from(box.getAttribute("position").array));
    box.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Half-height block filling the bottom of the cell — floors, ledges, wide steps. */
const SLAB = mergeBoxes([[1, 0.5, 1, 0, -0.25, 0]]);
/** Two-step stairs rising toward +z (same orientation as the roof wedge, same rot semantics). */
const STAIRS = mergeBoxes([
  [1, 0.5, 1, 0, -0.25, 0],
  [1, 0.5, 0.5, 0, 0.25, 0.25],
]);
/** Two posts + two rails spanning the cell along x; thin along z, rot turns it. */
const FENCE = mergeBoxes([
  [0.12, 1, 0.12, -0.44, 0, 0],
  [0.12, 1, 0.12, 0.44, 0, 0],
  [1, 0.1, 0.08, 0, 0.35, 0],
  [1, 0.1, 0.08, 0, 0.8, 0],
]);

/** Roof material renders both faces so the wedge never shows through from below. */
const roofCache = new Map<string, THREE.MeshStandardMaterial>();
function roofMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = roofCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    roofCache.set(color, mat);
  }
  return mat;
}

/** One merged physics box: a w×1×d slab of cells starting at (x, y, z). */
interface ColliderRect {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
}

/**
 * Greedy meshing per y-layer: merge occupied cells into the fewest axis-aligned rectangles.
 * Walking across a merged slab is seamless — per-cell colliders expose internal edges that
 * catch the capsule mid-stride — and the collider count drops by an order of magnitude.
 */
function mergeCellsToRects(cells: Cell[]): ColliderRect[] {
  const layers = new Map<number, Set<string>>();
  for (const [x, y, z] of cells) {
    let layer = layers.get(y);
    if (!layer) {
      layer = new Set();
      layers.set(y, layer);
    }
    layer.add(`${x},${z}`);
  }
  const rects: ColliderRect[] = [];
  for (const [y, layer] of layers) {
    const open = new Set(layer);
    for (const key of layer) {
      if (!open.has(key)) continue;
      const parts = key.split(",").map(Number);
      const x0 = parts[0] ?? 0;
      const z0 = parts[1] ?? 0;
      // grow along x…
      let w = 1;
      while (open.has(`${x0 + w},${z0}`)) w += 1;
      // …then along z while the whole row is present
      let d = 1;
      let rowFull = true;
      while (rowFull) {
        for (let dx = 0; dx < w; dx += 1) {
          if (!open.has(`${x0 + dx},${z0 + d}`)) {
            rowFull = false;
            break;
          }
        }
        if (rowFull) d += 1;
      }
      for (let dx = 0; dx < w; dx += 1) {
        for (let dz = 0; dz < d; dz += 1) {
          open.delete(`${x0 + dx},${z0 + dz}`);
        }
      }
      rects.push({ x: x0, y, z: z0, w, d });
    }
  }
  return rects;
}
const MAX_INSTANCES = 4096;

/** Geometry + material for a block type, by shape (cube / window glass / door panel / roof wedge). */
function shapeParts(blockId: string): { geometry: THREE.BufferGeometry; material: THREE.Material } {
  const def = getObject(blockId);
  const color = def?.color ?? "#ffffff";
  switch (def?.shape) {
    case "window":
      return { geometry: UNIT_BOX, material: glassMaterial(color) };
    case "door":
      return { geometry: DOOR_PANEL, material: flatMaterial(color) };
    case "roof":
      return { geometry: WEDGE, material: roofMaterial(color) };
    case "slab":
      return { geometry: SLAB, material: flatMaterial(color) };
    case "stairs":
      return { geometry: STAIRS, material: flatMaterial(color) };
    case "fence":
      return { geometry: FENCE, material: flatMaterial(color) };
    default:
      return { geometry: UNIT_BOX, material: flatMaterial(color) };
  }
}

/** All cells of one block type as a single InstancedMesh; userData maps instanceId -> cell. */
function BlockInstances({ blockId, blocks }: { blockId: string; blocks: PlacedBlock[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const def = getObject(blockId);
  const { geometry, material } = useMemo(() => shapeParts(blockId), [blockId]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const euler = new THREE.Euler();
    blocks.forEach(({ cell, rot }, index) => {
      pos.set(cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5);
      quat.setFromEuler(euler.set(0, (rot * Math.PI) / 2, 0));
      matrix.compose(pos, quat, one);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.count = blocks.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.userData = { builderBlockId: blockId, cells: blocks.map((entry) => entry.cell) };
  }, [blocks, blockId]);

  return (
    <instancedMesh
      args={[geometry, material, MAX_INSTANCES]}
      castShadow={def?.shape !== "window"}
      frustumCulled={false}
      key={blockId}
      receiveShadow
      ref={meshRef}
    />
  );
}

/** Furniture visual: colored box of the object's size on a small label-free plinth. */
function DecorPiece({
  uid,
  id,
  pos,
  rotY,
}: {
  uid: string;
  id: string;
  pos: [number, number, number];
  rotY: number;
}) {
  const def = getObject(id);
  if (!def) return null; // stale save: object id no longer in Catalog — skip, never crash
  const size = def.size ?? [1, 1, 1];
  return (
    <group position={pos} rotation-y={rotY} userData={{ decorUid: uid }}>
      <mesh
        castShadow
        material={flatMaterial(def.color)}
        position={[0, PLINTH_HEIGHT + size[1] * 0.5, 0]}
        receiveShadow
        userData={{ decorUid: uid }}
      >
        <boxGeometry args={size} />
      </mesh>
      <mesh
        material={flatMaterial(PLINTH_COLOR)}
        position={[0, PLINTH_HEIGHT * 0.5, 0]}
        receiveShadow
        userData={{ decorUid: uid }}
      >
        <boxGeometry args={[size[0] + PLINTH_MARGIN, PLINTH_HEIGHT, size[2] + PLINTH_MARGIN]} />
      </mesh>
    </group>
  );
}

export function BuilderWorld({
  system,
  building,
  selected,
  brush = 3,
  targetsRef,
}: {
  /** Which world's placement state this renders (homeBuild or palaceBuild). */
  system: BuildSystem;
  /** true while the magnet/build mode is active (enables the click-placement fallback). */
  building: boolean;
  /** Selected hotbar object id ("" = none). */
  selected: string;
  /** Block brush size (1 / 2x2 / 3x3) for the click-placement fallback. */
  brush?: BrushSize;
  /** The magnet raycasts against this group (blocks + decor + ground). */
  targetsRef: MutableRefObject<THREE.Group | null>;
}) {
  useBuildSystem(system);
  const entries = system.entries();
  const decor = system.decorItems();

  const byBlock = useMemo(() => {
    const map = new Map<string, PlacedBlock[]>();
    for (const id of blockIds()) map.set(id, []);
    for (const entry of entries) map.get(entry.id)?.push(entry);
    return map;
  }, [entries]);

  // Physics: full cells (cubes + windows) greedy-merge into slabs; doors are open (no collider);
  // roof wedges + stairs share the walkable ramp; slabs merge half-height; fences are thin walls.
  const solidRects = useMemo(
    () =>
      mergeCellsToRects(
        entries
          .filter((entry) => {
            const shape = getObject(entry.id)?.shape ?? "cube";
            return shape === "cube" || shape === "window";
          })
          .map((entry) => entry.cell),
      ),
    [entries],
  );
  const slabRects = useMemo(
    () =>
      mergeCellsToRects(
        entries.filter((entry) => getObject(entry.id)?.shape === "slab").map((entry) => entry.cell),
      ),
    [entries],
  );
  const rampEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const shape = getObject(entry.id)?.shape;
        return shape === "roof" || shape === "stairs";
      }),
    [entries],
  );
  const fenceEntries = useMemo(
    () => entries.filter((entry) => getObject(entry.id)?.shape === "fence"),
    [entries],
  );

  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const buildingRef = useRef(building);
  buildingRef.current = building;
  const brushRef = useRef<BrushSize>(brush);
  brushRef.current = brush;

  /** Click-placement fallback: only while building and NOT pointer-locked. */
  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!buildingRef.current || document.pointerLockElement) return;
    event.stopPropagation();
    const object = event.object;
    const normal = event.face?.normal
      ? event.face.normal.clone().transformDirection(object.matrixWorld)
      : new THREE.Vector3(0, 1, 0);
    const point = event.point;
    if (event.button === 2) {
      // absorb: block cell behind the surface, or the decor piece hit
      const decorUid = findDecorUid(object);
      if (decorUid) system.absorbDecor(decorUid);
      else if (object.userData.builderBlockId) {
        const q = point.clone().addScaledVector(normal, -0.5);
        system.absorbBlock([Math.floor(q.x), Math.floor(q.y), Math.floor(q.z)]);
      }
      return;
    }
    if (event.button !== 0) return;
    const id = selectedRef.current;
    if (!id) return;
    const def = getObject(id);
    if (!def) return;
    if (def.kind === "block") {
      const p = point.clone().addScaledVector(normal, 0.5);
      const cell: Cell = [Math.floor(p.x), Math.max(0, Math.floor(p.y)), Math.floor(p.z)];
      system.placeBlocks(system.footprintCells(cell, brushRef.current), id);
    } else {
      system.placeDecor(id, [point.x, point.y, point.z], 0);
    }
  };

  return (
    <>
      <group onPointerDown={onPointerDown} ref={targetsRef}>
        {/* Invisible aim plane at y=0 — the magnet's ground-plane fallback, made explicit. */}
        <mesh position={[0, 0, 0]} rotation-x={-Math.PI / 2} userData={{ builderGround: true }}>
          <planeGeometry args={[600, 600]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </mesh>
        {Array.from(byBlock.entries(), ([blockId, blocks]) =>
          blocks.length > 0 ? (
            <BlockInstances blockId={blockId} blocks={blocks} key={blockId} />
          ) : null,
        )}
        {decor.map((item) => (
          <DecorPiece id={item.id} key={item.uid} pos={item.pos} rotY={item.rotY} uid={item.uid} />
        ))}
      </group>
      {/* Ramp shapes (roof wedges + stairs): one thin ramp slab per cell, oriented by the
          quarter-turn. The outer RigidBody carries the yaw so the inner x-tilt composes cleanly. */}
      {rampEntries.map(({ cell, rot }) => (
        <RigidBody
          colliders={false}
          key={`ramp-${cell.join(",")}`}
          position={[cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5]}
          rotation={[0, (rot * Math.PI) / 2, 0]}
          type="fixed"
        >
          <CuboidCollider args={[0.5, 0.04, 0.72]} rotation={[-Math.PI / 4, 0, 0]} />
        </RigidBody>
      ))}
      {/* Fences: a thin solid wall per cell, turned with the fence. */}
      {fenceEntries.map(({ cell, rot }) => (
        <RigidBody
          colliders={false}
          key={`fence-${cell.join(",")}`}
          position={[cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5]}
          rotation={[0, (rot * Math.PI) / 2, 0]}
          type="fixed"
        >
          <CuboidCollider args={[0.5, 0.5, 0.08]} />
        </RigidBody>
      ))}
      {/* Physics: the avatar walks on placed blocks + furniture (blocks greedy-merged into slabs). */}
      <RigidBody colliders={false} type="fixed">
        {solidRects.map((rect) => (
          <CuboidCollider
            args={[rect.w / 2, 0.5, rect.d / 2]}
            key={`${rect.x},${rect.y},${rect.z}`}
            position={[rect.x + rect.w / 2, rect.y + 0.5, rect.z + rect.d / 2]}
          />
        ))}
        {slabRects.map((rect) => (
          <CuboidCollider
            args={[rect.w / 2, 0.25, rect.d / 2]}
            key={`slab-${rect.x},${rect.y},${rect.z}`}
            position={[rect.x + rect.w / 2, rect.y + 0.25, rect.z + rect.d / 2]}
          />
        ))}
        {decor.map((item) => {
          const size = getObject(item.id)?.size ?? [1, 1, 1];
          return (
            <CuboidCollider
              args={[size[0] / 2, (size[1] + PLINTH_HEIGHT) / 2, size[2] / 2]}
              key={item.uid}
              position={[item.pos[0], item.pos[1] + (size[1] + PLINTH_HEIGHT) / 2, item.pos[2]]}
              rotation={[0, item.rotY, 0]}
            />
          );
        })}
      </RigidBody>
    </>
  );
}

/** Walks up the parent chain for the decor uid (the hit mesh may be a child of the piece group). */
function findDecorUid(object: THREE.Object3D): string | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (typeof node.userData?.decorUid === "string") return node.userData.decorUid;
    node = node.parent;
  }
  return null;
}
