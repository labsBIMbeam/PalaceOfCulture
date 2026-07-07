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
import { type BuildSystem, type Cell, useBuildSystem } from "../../builder/buildState";
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
const MAX_INSTANCES = 4096;

/** All cells of one block type as a single InstancedMesh; userData maps instanceId -> cell. */
function BlockInstances({ blockId, cells }: { blockId: string; cells: Cell[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const def = getObject(blockId);
  const material = useMemo(() => flatMaterial(def?.color ?? "#ffffff"), [def?.color]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    cells.forEach((cell, index) => {
      matrix.setPosition(cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.count = cells.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.userData = { builderBlockId: blockId, cells };
  }, [cells, blockId]);

  return (
    <instancedMesh
      args={[UNIT_BOX, material, MAX_INSTANCES]}
      castShadow
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
  targetsRef,
}: {
  /** Which world's placement state this renders (homeBuild or palaceBuild). */
  system: BuildSystem;
  /** true while the magnet/build mode is active (enables the click-placement fallback). */
  building: boolean;
  /** Selected hotbar object id ("" = none). */
  selected: string;
  /** The magnet raycasts against this group (blocks + decor + ground). */
  targetsRef: MutableRefObject<THREE.Group | null>;
}) {
  useBuildSystem(system);
  const entries = system.entries();
  const decor = system.decorItems();

  const byBlock = useMemo(() => {
    const map = new Map<string, Cell[]>();
    for (const id of blockIds()) map.set(id, []);
    for (const { cell, id } of entries) map.get(id)?.push(cell);
    return map;
  }, [entries]);

  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const buildingRef = useRef(building);
  buildingRef.current = building;

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
      system.placeBlocks(system.footprintCells(cell), id);
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
        {Array.from(byBlock.entries(), ([blockId, cells]) =>
          cells.length > 0 ? (
            <BlockInstances blockId={blockId} cells={cells} key={blockId} />
          ) : null,
        )}
        {decor.map((item) => (
          <DecorPiece id={item.id} key={item.uid} pos={item.pos} rotY={item.rotY} uid={item.uid} />
        ))}
      </group>
      {/* Physics: the avatar walks on placed blocks + furniture. */}
      <RigidBody colliders={false} type="fixed">
        {entries.map(({ cell }) => (
          <CuboidCollider
            args={[0.5, 0.5, 0.5]}
            key={`${cell[0]},${cell[1]},${cell[2]}`}
            position={[cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5]}
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
