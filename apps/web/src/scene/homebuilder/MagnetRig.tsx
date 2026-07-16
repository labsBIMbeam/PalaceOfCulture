// Free-fly magnet builder — a 1:1 port of godot/scripts/magnet_controller.gd for r3f. Own camera
// (pointer-locked mouse look, WASD fly, Space/Shift hover), a translucent grid-snapped ghost, and
// place/absorb through the shared BuildSystem. Left click places, right click absorbs. When the
// pointer is not captured, BuilderWorld's click-placement fallback takes over (both controls).

import { useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { type MutableRefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BrushSize, BuildSystem, Cell } from "../../builder/buildState";
import { getObject } from "../../builder/catalog";

const FLY_SPEED = 12;
const MOUSE_SENSITIVITY = 0.003;
const RAY_LENGTH = 60;
const PITCH_MIN = -1.4;
const PITCH_MAX = 1.4;
const GOLD = "#e7b23c";
const CORAL = "#e8735a"; // decorate-only worlds tint the ghost coral (godot parity)
const GHOST_ALPHA = 0.35;

/** Where the magnet wakes up over the home plot (godot spawns at (6, 8, 24) over its ground). */
const MAGNET_SPAWN = new THREE.Vector3(6, 8, 52);

type Aim = {
  valid: boolean;
  /** Cell the 3x3x1 block footprint centers on. */
  cell: Cell;
  /** Exact surface point for furniture. */
  point: THREE.Vector3;
  /** Cell to clear when absorbing a block. */
  absorbCell: Cell;
  /** "block" | decor uid | null — what sits under the crosshair. */
  absorbTarget: string | null;
};

export function MagnetRig({
  system,
  selected,
  brush,
  targetsRef,
}: {
  /** The world under the magnet — homeBuild (blocks allowed) or palaceBuild (decorate-only). */
  system: BuildSystem;
  selected: string;
  /** Block brush size: 1 single cell, 2 = 2x2, 3 = 3x3. */
  brush: BrushSize;
  targetsRef: MutableRefObject<THREE.Group | null>;
}) {
  const { camera, gl } = useThree();
  const [, getKeys] = useKeyboardControls();
  const yaw = useRef(Math.PI); // face -z … toward the plot from the spawn
  const pitch = useRef(-0.5);
  const aim = useRef<Aim>({
    valid: false,
    cell: [0, 0, 0],
    point: new THREE.Vector3(),
    absorbCell: [0, 0, 0],
    absorbTarget: null,
  });
  const ghostRef = useRef<THREE.Mesh>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  // Q/E turn the furniture ghost relative to the camera yaw (kept across placements, like decorate).
  const ghostYawOffset = useRef(0);
  // Q/E on a block selection: quarter-turns for shaped blocks (door facing, roof slope direction).
  const blockRot = useRef(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const brushRef = useRef<BrushSize>(brush);
  brushRef.current = brush;

  const selectedDef = getObject(selected);
  const isBlock = selectedDef?.kind === "block";
  const ghostSize: [number, number, number] = isBlock
    ? [brush, 1, brush]
    : (selectedDef?.size ?? [1, 1, 1]);

  // Camera takeover: jump to the magnet perch on entry; restore nothing on exit (the walk/orbit
  // views reset the camera themselves).
  useEffect(() => {
    camera.position.copy(MAGNET_SPAWN);
    camera.rotation.set(0, 0, 0, "YXZ");
    yaw.current = Math.PI * 0.98;
    pitch.current = -0.5;
  }, [camera]);

  // Pointer lock + mouse look + place/absorb. Clicking the canvas captures the mouse (the user
  // gesture the browser demands); Esc releases it — then the fallback click-placement is live.
  useEffect(() => {
    const canvas = gl.domElement;
    const requestLock = () => {
      if (!document.pointerLockElement) canvas.requestPointerLock();
    };
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw.current -= event.movementX * MOUSE_SENSITIVITY;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - event.movementY * MOUSE_SENSITIVITY,
        PITCH_MIN,
        PITCH_MAX,
      );
    };
    const onMouseDown = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      const current = aim.current;
      if (event.button === 0) {
        // place (godot magnet _place)
        const id = selectedRef.current;
        if (!current.valid || !id) return;
        const def = getObject(id);
        if (!def) return;
        if (def.kind === "block" && system.allowBlocks) {
          // Shift+LMB repaints existing blocks in the footprint (replace_blocks); plain LMB stamps.
          if (event.shiftKey) {
            system.replaceBlocks(system.footprintCells(current.absorbCell, brushRef.current), id);
          } else {
            system.placeBlocks(
              system.footprintCells(current.cell, brushRef.current),
              id,
              blockRot.current,
            );
          }
        } else if (def.kind === "furniture") {
          system.placeDecor(
            id,
            [current.point.x, current.point.y, current.point.z],
            yaw.current + ghostYawOffset.current,
          );
        }
      } else if (event.button === 2) {
        // absorb (godot magnet _absorb)
        if (current.absorbTarget === "block") system.absorbBlock(current.absorbCell);
        else if (current.absorbTarget) system.absorbDecor(current.absorbTarget);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.pointerLockElement !== canvas) return;
      const turningBlock = getObject(selectedRef.current)?.kind === "block";
      if (event.code === "KeyQ") {
        if (turningBlock) blockRot.current = (blockRot.current + 3) % 4;
        else ghostYawOffset.current -= Math.PI / 4;
      } else if (event.code === "KeyE") {
        if (turningBlock) blockRot.current = (blockRot.current + 1) % 4;
        else ghostYawOffset.current += Math.PI / 4;
      }
    };
    const onContextMenu = (event: Event) => event.preventDefault();
    canvas.addEventListener("click", requestLock);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      canvas.removeEventListener("click", requestLock);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    };
  }, [gl, system]);

  useFrame((_, delta) => {
    // fly (godot magnet _physics_process)
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    const keys = getKeys() as Record<string, boolean>;
    const locked = Boolean(document.pointerLockElement);
    const input = new THREE.Vector3(
      (keys.rightward ? 1 : 0) - (keys.leftward ? 1 : 0),
      0,
      (keys.backward ? 1 : 0) - (keys.forward ? 1 : 0),
    );
    input.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
    input.y = (keys.hop ? 1 : 0) - (keys.run ? 1 : 0); // Space up · Shift down ("hop" = Space; see KEYBOARD_MAP)
    if (input.lengthSq() > 1) input.normalize();
    if (locked || input.y !== 0) camera.position.addScaledVector(input, FLY_SPEED * delta);
    camera.position.y = Math.max(0.6, camera.position.y);

    // aim (godot magnet _update_aim): camera ray -> hit surface, else the y=0 ground plane
    const current = aim.current;
    current.valid = false;
    current.absorbTarget = null;
    const dir = camera.getWorldDirection(new THREE.Vector3());
    raycaster.set(camera.position, dir);
    raycaster.far = RAY_LENGTH;
    const targets = targetsRef.current;
    const hits = targets ? raycaster.intersectObjects(targets.children, true) : [];
    const hit = hits.find((entry) => entry.object.visible !== false);
    if (hit) {
      const normal = hit.face
        ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
        : new THREE.Vector3(0, 1, 0);
      const p = hit.point.clone().addScaledVector(normal, 0.5);
      current.cell = [Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)];
      const q = hit.point.clone().addScaledVector(normal, -0.5);
      current.absorbCell = [Math.floor(q.x), Math.floor(q.y), Math.floor(q.z)];
      current.point.copy(hit.point);
      current.valid = true;
      if (hit.object.userData.builderBlockId) current.absorbTarget = "block";
      else {
        const uid = findDecorUid(hit.object);
        if (uid) current.absorbTarget = uid;
      }
    } else if (dir.y < -0.001) {
      const t = -camera.position.y / dir.y;
      if (t > 0 && t < RAY_LENGTH) {
        current.point.copy(camera.position).addScaledVector(dir, t);
        current.cell = [Math.floor(current.point.x), 0, Math.floor(current.point.z)];
        current.valid = true;
      }
    }
    current.cell[1] = Math.max(current.cell[1], 0);

    // ghost (godot magnet _update_ghost)
    const ghost = ghostRef.current;
    if (ghost) {
      const show = current.valid && selectedRef.current !== "";
      ghost.visible = show;
      if (show) {
        if (isBlock) {
          // Even brushes (2x2) grow toward +x/+z from the aimed cell — the ghost centers on that.
          const centerOffset = brushRef.current === 2 ? 1 : 0.5;
          ghost.position.set(
            current.cell[0] + centerOffset,
            current.cell[1] + 0.5,
            current.cell[2] + centerOffset,
          );
          ghost.rotation.set(0, (blockRot.current * Math.PI) / 2, 0);
        } else {
          ghost.position.set(
            current.point.x,
            current.point.y + ghostSize[1] * 0.5,
            current.point.z,
          );
          ghost.rotation.set(0, yaw.current + ghostYawOffset.current, 0);
        }
      }
    }
  });

  return (
    <mesh ref={ghostRef} visible={false}>
      <boxGeometry args={ghostSize} />
      <meshBasicMaterial color={GOLD} depthWrite={false} opacity={GHOST_ALPHA} transparent />
    </mesh>
  );
}

function findDecorUid(object: THREE.Object3D): string | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (typeof node.userData?.decorUid === "string") return node.userData.decorUid;
    node = node.parent;
  }
  return null;
}
