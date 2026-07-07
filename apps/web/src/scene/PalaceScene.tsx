import { KeyboardControls, OrbitControls, useKeyboardControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CuboidCollider, Physics, type RapierRigidBody, RigidBody } from "@react-three/rapier";
import Ecctrl from "ecctrl";
import { Leva } from "leva";
import {
  type MutableRefObject,
  type RefObject,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { homeBuild, palaceBuild } from "../builder/buildState";
import { timelocks } from "../frontend/data";
import { lockProgress } from "../frontend/growth";
import { Icon } from "../frontend/icons";
import type { Character, EngineTarget } from "../frontend/types";
import { BuilderHud } from "../ui/BuilderHud";
import { ChatPanel } from "../ui/ChatPanel";
import { DecorPicker } from "../ui/DecorPicker";
import { MediaPlayer } from "../ui/MediaPlayer";
import { AvatarView } from "./AvatarView";
import { DecorItem } from "./DecorItem";
import { Palace } from "./Palace";
import { GrowingTree, PlotAssets } from "./PlotAssets";
import { Atmosphere, PostFx } from "./SceneFx";
import { type PlacedItem, loadDecor, newUid, saveDecor } from "./decorStore";
import { CATALOG, type DecorDef, defById } from "./furnitureCatalog";
import { BuilderWorld } from "./homebuilder/BuilderWorld";
import { MagnetRig } from "./homebuilder/MagnetRig";
import { INTERACTABLES, type Interactable } from "./interactables";

type PalaceSceneProps = {
  target: EngineTarget;
  onExit: () => void;
  character: Character;
  /** Home "Build" button: skip walk mode and wake up holding the magnet. */
  startInBuild?: boolean;
};

type ViewMode = "orbit" | "walk" | "decorate" | "build";

type PoseKind = "sit" | "sleep";
/** A piece the avatar can use (chair/bed) and where it is (proximity point). */
type PosePoint = { uid: string; position: [number, number, number]; pose: PoseKind };
/** The active posed state: which piece, where the avatar is, the facing, the pose, and a y-lift so
 *  the body rests on the object surface (a bed sits the sleeper above the floor). */
type Posed = {
  uid: string;
  position: [number, number, number];
  yaw: number;
  pose: PoseKind;
  lift: number;
};

const ORBIT_POSITION = new THREE.Vector3(150, 110, 150);
// On the plaza just short of the asset shelf (RESERVED_CORNER ~[0,0,52]); the default camera looks
// +z, so the tree + spaceship sit ahead in view on spawn. Tune freely with RESERVED_CORNER.
const SPAWN: [number, number, number] = [6, 4, 44];

// drei KeyboardControls map — ecctrl reads these named actions. Full WASD; Decorate is on "B".
const KEYBOARD_MAP = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
];

/** Orbit/overview camera — resets the rig on entry so toggling back from walk isn't jarring. */
function OrbitView() {
  const { camera } = useThree();
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    camera.position.copy(ORBIT_POSITION);
    camera.lookAt(0, 0, 0);
    if (perspective.isPerspectiveCamera) {
      perspective.fov = 42;
      perspective.updateProjectionMatrix();
    }
  }, [camera]);
  return <OrbitControls enableDamping makeDefault maxPolarAngle={Math.PI / 2.05} />;
}

const GHOST_ITEM: PlacedItem = {
  uid: "ghost",
  defId: "",
  position: [0, 0, 0],
  rotationY: 0,
  scale: 1,
};
const NOOP = () => {};

/**
 * First-person placement preview: a live ghost of the piece being placed, sitting where the camera's
 * centre ray meets the floor in front of the player. Walk/look to aim it; its world position is
 * written to `posRef` so the Place control can drop the real piece there. No top-down clicking.
 */
function PlacementGhost({
  def,
  posRef,
  bodyRef,
  yaw,
}: {
  def: DecorDef;
  posRef: MutableRefObject<[number, number, number] | null>;
  bodyRef: RefObject<RapierRigidBody>;
  yaw: number;
}) {
  const camera = useThree((state) => state.camera);
  const group = useRef<THREE.Group>(null);
  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const node = group.current;
    if (!node) return;
    // Place a fixed distance in front of the player, on the floor, in the direction the camera faces.
    // Robust regardless of camera pitch (a screen-centre floor ray misses when you look near level).
    camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) return;
    dir.normalize();
    const body = bodyRef.current;
    const base = body ? body.translation() : camera.position;
    const x = base.x + dir.x * 2.8;
    const z = base.z + dir.z * 2.8;
    node.position.set(x, 0, z);
    posRef.current = [x, 0, z];
  });
  return (
    <group ref={group} rotation-y={yaw}>
      <Suspense fallback={null}>
        <DecorItem def={def} editing={false} item={GHOST_ITEM} onSelect={NOOP} selected={false} />
      </Suspense>
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.7, 0.95, 40]} />
        <meshBasicMaterial color="#f3d27a" opacity={0.7} side={THREE.DoubleSide} transparent />
      </mesh>
    </group>
  );
}

/** Seated camera — frames the avatar at the chair while ecctrl is parked; orbit to look around. */
function SeatedView({ at }: { at: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(at[0] + 4.5, at[1] + 3, at[2] + 5.5);
    camera.lookAt(at[0], at[1] + 1, at[2]);
  }, [camera, at]);
  return (
    <OrbitControls
      enableDamping
      makeDefault
      maxPolarAngle={Math.PI / 2.05}
      target={[at[0], at[1] + 1, at[2]]}
    />
  );
}

/**
 * In-canvas probe (walk mode): each frame reads the keyboard + the player rigidbody to drive (a) the
 * jump (our own, since ecctrl's canJump is unreliable on the invisible floor) and (b) interact
 * proximity — the nearest interactable within range, reported up only when it changes.
 */
// Bloom + vignette. Off by default: it's wired and standard, but the preview GPU can't be
// screenshot-verified here — flip to true and confirm on real hardware (set false again if a weak
// GPU shows a blank scene).
// Enabled via URL flag (?postfx=1) so real hardware can verify without a code flip; a weak GPU
// showing a blank scene just drops the flag.
const POSTFX_ENABLED =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("postfx");
const USE_RADIUS = 2.6; // metres: how close you must be to a chair/bed for the "Sit"/"Sleep" prompt
const SLEEP_SURFACE = 0.4; // metres: mattress height a sleeper rests on, at the bed's default scale

function WalkSystems({
  bodyRef,
  poseables,
  onActive,
  onNearPose,
}: {
  bodyRef: RefObject<RapierRigidBody>;
  poseables: PosePoint[];
  onActive: (item: Interactable | null) => void;
  onNearPose: (point: PosePoint | null) => void;
}) {
  const [, getKeys] = useKeyboardControls();
  const lastId = useRef<string | null>(null);
  const lastPose = useRef<string | null>(null);
  const jumpPrev = useRef(false);
  useFrame(() => {
    const keys = getKeys() as Record<string, boolean>;
    const body = bodyRef.current;
    if (!body) return;
    const linvel = body.linvel();
    const pos = body.translation();

    // Safety net: if the controller ever tunnels through the floor, lift it back to the entry point
    // instead of falling forever.
    if (pos.y < -6) {
      body.setTranslation({ x: SPAWN[0], y: 3, z: SPAWN[2] }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    // Our own jump (ecctrl's canJump is unreliable on the invisible floor, so ecctrl's own jump is
    // disabled via jumpVel={0} to avoid a double-jump; this is the single source). On a fresh press
    // while roughly grounded, set an upward velocity. Edge-detected so holding Space doesn't repeat;
    // |vy| gate blocks air jumps. Kept modest so it reads as a hop, not a leap.
    const jumpNow = Boolean(keys.jump);
    if (jumpNow && !jumpPrev.current && Math.abs(linvel.y) < 2) {
      body.setLinvel({ x: linvel.x, y: 4.5, z: linvel.z }, true);
    }
    jumpPrev.current = jumpNow;

    let best: Interactable | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const item of INTERACTABLES) {
      const dist = Math.hypot(pos.x - item.position[0], pos.z - item.position[2]);
      if (dist <= item.radius && dist < bestDist) {
        best = item;
        bestDist = dist;
      }
    }
    const id = best?.id ?? null;
    if (id !== lastId.current) {
      lastId.current = id;
      onActive(best);
    }

    // Nearest usable piece (chair/bed) within range — reported up only when it changes.
    let near: PosePoint | null = null;
    let nearDist = USE_RADIUS;
    for (const point of poseables) {
      const dist = Math.hypot(pos.x - point.position[0], pos.z - point.position[2]);
      if (dist < nearDist) {
        near = point;
        nearDist = dist;
      }
    }
    const nearId = near?.uid ?? null;
    if (nearId !== lastPose.current) {
      lastPose.current = nearId;
      onNearPose(near);
    }
  });
  return null;
}

/** The 3D game view, launched from the frontend UI. */
export function PalaceScene({ target, onExit, character, startInBuild }: PalaceSceneProps) {
  const [mode, setMode] = useState<ViewMode>(startInBuild && target === "home" ? "build" : "walk");
  const accent = character.avatar.aura;
  const handle = character.handle;
  const playerBody = useRef<RapierRigidBody>(null);

  // Decoration: placed pieces are DATA, persisted per room (decorStore). `pendingDefId` = a catalog
  // piece chosen but not yet stamped; `selectedUid` = a placed piece being edited.
  // ONE world, two modes (godot parity): `world` starts at the launch target and can be swapped
  // in-engine (Travel) — same character, same assets. Private Home = full magnet (homeBuild);
  // public Palace = decorate-only magnet (palaceBuild). Design law, not a tech limit.
  const [world, setWorld] = useState<EngineTarget>(target);
  const canBuild = world === "home";
  const activeBuild = world === "home" ? homeBuild : palaceBuild;
  const [builderSelected, setBuilderSelected] = useState("");
  const builderTargets = useRef<THREE.Group | null>(null);
  useEffect(() => {
    void homeBuild.setup();
    void palaceBuild.setup();
  }, []);
  // "M" (magnet) toggles Build mode in both worlds; ignored while typing in chat.
  useEffect(() => {
    const onMagnetKey = (event: KeyboardEvent) => {
      if (event.code !== "KeyM") return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      setMode((value) => (value === "build" ? "walk" : "build"));
      setPendingDefId(null);
      setSelectedUid(null);
      setPosed(null);
    };
    window.addEventListener("keydown", onMagnetKey);
    return () => window.removeEventListener("keydown", onMagnetKey);
  }, []);

  const [items, setItems] = useState<PlacedItem[]>([]);
  const [pendingDefId, setPendingDefId] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadDecor(world));
    setPendingDefId(null);
    setSelectedUid(null);
  }, [world]);

  const persistItems = (next: PlacedItem[]) => {
    setItems(next);
    saveDecor(world, next);
  };
  const addItem = (defId: string, position: [number, number, number]) => {
    const uid = newUid();
    persistItems([...items, { uid, defId, position, rotationY: 0, scale: 1 }]);
    setSelectedUid(uid);
  };
  const updateItem = (uid: string, patch: Partial<PlacedItem>) =>
    persistItems(items.map((item) => (item.uid === uid ? { ...item, ...patch } : item)));
  const selectItem = (uid: string) => {
    setSelectedUid(uid);
    setPendingDefId(null);
  };
  const selectedItem = items.find((item) => item.uid === selectedUid) ?? null;
  const selectedDef = selectedItem ? defById(selectedItem.defId) : undefined;
  const pendingDef = pendingDefId ? defById(pendingDefId) : undefined;

  // Live `items` through a ref, so handlers bound once (Place key, interact key) don't see a stale list.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // First-person placement: the ghost writes its floor position here each frame; Place drops the
  // pending piece there. Keeps `pendingDefId` set so you can walk on and stamp several. Reads through
  // refs so the Place key handler (bound once) and the button both see live state.
  const ghostRef = useRef<[number, number, number] | null>(null);
  const pendingRef = useRef<string | null>(null);
  pendingRef.current = pendingDefId;
  // Rotation applied to the ghost (and the piece it drops). Kept across placements so you can stamp a
  // row at the same facing; ref so the Place key handler reads it live.
  const [ghostYaw, setGhostYaw] = useState(0);
  const ghostYawRef = useRef(0);
  ghostYawRef.current = ghostYaw;
  const rotateGhost = (delta: number) => setGhostYaw((yaw) => yaw + delta);
  const placeAtGhost = () => {
    const defId = pendingRef.current;
    const point = ghostRef.current;
    if (!defId || !point) return;
    const uid = newUid();
    persistItems([
      ...itemsRef.current,
      { uid, defId, position: point, rotationY: ghostYawRef.current, scale: 1 },
    ]);
  };

  const [activeInteract, setActiveInteract] = useState<Interactable | null>(null);
  const [dialog, setDialog] = useState<string | null>(null);
  const activeRef = useRef<Interactable | null>(null);
  activeRef.current = activeInteract;

  // Cozy poses: walk up to a chair/bed and sit/sleep. The pose clip plays if present on the rig, else
  // idle (placeholder). The mechanic — snap to the piece, park the controller, posed camera — is real.
  const [posed, setPosed] = useState<Posed | null>(null);
  const [standPos, setStandPos] = useState<[number, number, number]>(SPAWN);
  const [nearPose, setNearPose] = useState<PosePoint | null>(null);
  const posedRef = useRef<Posed | null>(null);
  posedRef.current = posed;
  const nearPoseRef = useRef<PosePoint | null>(null);
  nearPoseRef.current = nearPose;

  const poseables: PosePoint[] = items.flatMap((item) => {
    const pose = defById(item.defId)?.pose;
    return pose ? [{ uid: item.uid, position: item.position, pose }] : [];
  });

  const enterPose = (point: PosePoint) => {
    const item = itemsRef.current.find((entry) => entry.uid === point.uid);
    if (!item) return;
    // Sleepers rest on the mattress (the bed raises them off the floor); sitters stay at floor level
    // (the sit clip already lowers them onto the seat). Scales with the piece's own scale.
    const lift = point.pose === "sleep" ? SLEEP_SURFACE * item.scale : 0;
    setPosed({
      uid: point.uid,
      position: item.position,
      yaw: item.rotationY,
      pose: point.pose,
      lift,
    });
    setNearPose(null);
    setActiveInteract(null);
  };
  const getUp = () => {
    const seat = posedRef.current;
    if (seat) setStandPos([seat.position[0], 2, seat.position[2]]);
    setPosed(null);
  };

  // Interact (E key, or the on-screen button): get up if posed, else sit/sleep if near a piece, else
  // fire the nearest interactable's action.
  // biome-ignore lint/correctness/useExhaustiveDependencies: listener is bound once per mode; enterPose/getUp read live state via refs
  useEffect(() => {
    if (mode !== "walk") return;
    const onInteractKey = (event: KeyboardEvent) => {
      if (event.code !== "KeyE") return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (posedRef.current) getUp();
      else if (nearPoseRef.current) enterPose(nearPoseRef.current);
      else if (activeRef.current) setDialog(activeRef.current.message);
    };
    window.addEventListener("keydown", onInteractKey);
    return () => {
      window.removeEventListener("keydown", onInteractKey);
      setActiveInteract(null);
      setDialog(null);
      setNearPose(null);
    };
  }, [mode]);

  // Decorate mode: F places the pending piece at the ghost; Q/E rotate it before dropping. (Buttons
  // in the picker do the same.)
  // biome-ignore lint/correctness/useExhaustiveDependencies: bound once per mode; placeAtGhost reads live state via refs
  useEffect(() => {
    if (mode !== "decorate") return;
    const onDecorateKey = (event: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (event.code === "KeyF") placeAtGhost();
      else if (event.code === "KeyQ") setGhostYaw((yaw) => yaw - Math.PI / 4);
      else if (event.code === "KeyE") setGhostYaw((yaw) => yaw + Math.PI / 4);
    };
    window.addEventListener("keydown", onDecorateKey);
    return () => window.removeEventListener("keydown", onDecorateKey);
  }, [mode]);

  // "B" (build) toggles Decorate from anywhere in the engine (uses only stable setters, so a
  // once-bound listener is safe). Ignored while typing in chat. Not D — that's WASD right-strafe.
  useEffect(() => {
    const onDecorateKey = (event: KeyboardEvent) => {
      if (event.code !== "KeyB") return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      setMode((value) => (value === "build" ? value : value === "decorate" ? "walk" : "decorate"));
      setPendingDefId(null);
      setSelectedUid(null);
      setPosed(null);
    };
    window.addEventListener("keydown", onDecorateKey);
    return () => window.removeEventListener("keydown", onDecorateKey);
  }, []);

  // Make jump reliable in walk mode. In the browser, Space's default is to scroll the page or "click"
  // the focused HUD button (which toggles you back to Overview and reads as "jump is broken"). So while
  // walking we claim Space for jumping: blur the focused button on entry, and preventDefault every Space
  // keydown (except when typing in chat). drei's KeyboardControls still receives the event → ecctrl jumps.
  useEffect(() => {
    if (mode !== "walk" && mode !== "decorate" && mode !== "build") return;
    (document.activeElement as HTMLElement | null)?.blur();
    const claimSpaceForJump = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return; // let chat type
      event.preventDefault();
    };
    window.addEventListener("keydown", claimSpaceForJump);
    return () => window.removeEventListener("keydown", claimSpaceForJump);
  }, [mode]);

  // The personal growing tree on the Home plot: a 21-month (Tree) lock drives its 3D growth by age.
  const homeLock =
    timelocks.find((lock) => lock.tier === "21M") ??
    timelocks.find((lock) => lock.status === "growing") ??
    timelocks[0];
  const homeProgress = homeLock ? lockProgress(homeLock) : 0.5;

  const title = world === "hq" ? "Palace of Culture HQ" : "Home Plot";
  const subtitle =
    mode === "build"
      ? "build — magnet captured, blocks + crafted decor"
      : mode === "decorate"
        ? "decorate — walk up, aim, and place"
        : mode === "walk"
          ? world === "hq"
            ? "public — walk the palace"
            : "private — your plot"
          : world === "hq"
            ? "3D engine — global palace"
            : "3D engine — private plot";

  const toggleDecorate = () => {
    setMode((value) => (value === "decorate" ? "walk" : "decorate"));
    setPendingDefId(null);
    setSelectedUid(null);
    setPosed(null);
  };
  const toggleBuild = () => {
    setMode((value) => (value === "build" ? "walk" : "build"));
    setPendingDefId(null);
    setSelectedUid(null);
    setPosed(null);
  };
  // Travel: swap the world without leaving the engine — same character, same assets.
  const travel = () => {
    setWorld((value) => (value === "home" ? "hq" : "home"));
    setMode("walk");
    setBuilderSelected("");
    setPendingDefId(null);
    setSelectedUid(null);
    setPosed(null);
    setStandPos(SPAWN);
  };

  return (
    <div className="engine-shell">
      <KeyboardControls map={KEYBOARD_MAP}>
        <Canvas camera={{ position: [150, 110, 150], fov: 42, near: 0.5, far: 6000 }} shadows>
          {/* Sky (in <Atmosphere/>) is the background now. No fog — it sits in front of the sky dome
              and washes it out to a flat colour. */}
          <ambientLight intensity={0.4} />
          {/* sky-tinted fill (cheap stand-in for IBL): cool sky above, warm bounce below */}
          <hemisphereLight args={["#bcd4e6", "#b09a6a", 0.7]} />
          <directionalLight
            castShadow
            color="#ffe6ad"
            intensity={2.8}
            position={[200, 350, 120]}
            shadow-camera-bottom={-200}
            shadow-camera-far={1200}
            shadow-camera-left={-200}
            shadow-camera-right={200}
            shadow-camera-top={200}
            shadow-mapSize={[2048, 2048]}
          />
          <Atmosphere />
          <Suspense fallback={null}>
            <Physics timeStep="vary">
              <Palace />
              {/* Invisible flat floor at the deck level (y=0): the palace trimesh has gaps/glass the
                  ecctrl ground ray misses, leaving the controller stuck in "fall" so it never walks.
                  A guaranteed ground plane keeps the player grounded across the whole plaza. */}
              <RigidBody type="fixed" colliders={false}>
                {/* Thick (10 m) so the capsule can't tunnel through it on spawn/respawn. Top at y=0. */}
                <CuboidCollider args={[300, 5, 300]} position={[0, -5, 0]} />
              </RigidBody>
              {/* Walking (and decorating, which is walk + a build overlay): the controller. Parked
                  while posed (re-spawns at the piece on get-up, so `position` is keyed to force a
                  fresh mount when standPos changes). */}
              {(mode === "walk" || mode === "decorate") && !posed ? (
                <Ecctrl
                  camInitDis={-7}
                  camMaxDis={-14}
                  camMinDis={-1.5}
                  capsuleHalfHeight={0.5}
                  capsuleRadius={0.4}
                  floatHeight={0.3}
                  jumpVel={0}
                  key={standPos.join(",")}
                  maxVelLimit={4}
                  position={standPos}
                  // Widen ecctrl's ground detection so "canJump" is reliably true on the deck — the
                  // default forgiveness (0.1) gave a tight 0.8 window vs the 0.7 float, so jump often
                  // never fired. 0.5 keeps canJump solid while grounded without making mid-air jumps.
                  rayHitForgiveness={0.5}
                  ref={playerBody}
                  sprintMult={2}
                >
                  <group position={[0, -0.9, 0]}>
                    <AvatarView bodyRef={playerBody} config={character.avatar} />
                  </group>
                </Ecctrl>
              ) : null}
            </Physics>
            {/* Posed: a static avatar at the chair/bed. Holds the sit/sleep clip if present on the rig,
                else idle (placeholder) until the pose clip lands. */}
            {mode === "walk" && posed ? (
              <group
                position={[posed.position[0], posed.lift, posed.position[2]]}
                rotation-y={posed.yaw}
              >
                <AvatarView config={character.avatar} pose={posed.pose} />
              </group>
            ) : null}
            <PlotAssets accent={accent} />
            {/* The homebuilder world: placed blocks + crafted decor, walkable in every mode.
                Home renders your private blueprint, the Palace its shared decorate-only set. */}
            <BuilderWorld
              building={mode === "build"}
              key={world}
              selected={builderSelected}
              system={activeBuild}
              targetsRef={builderTargets}
            />
            {/* Home plot only: your personal Tree, grown in 3D to its current age (Tamagotchi). */}
            {world === "home" ? (
              <GrowingTree position={[-7, 0, 40]} progress={homeProgress} />
            ) : null}
            {/* Player-placed decoration — visible in every mode; editable only while decorating. */}
            <group>
              {items.map((item) => {
                const def = defById(item.defId);
                if (!def) return null;
                return (
                  <DecorItem
                    def={def}
                    editing={mode === "decorate"}
                    item={item}
                    key={item.uid}
                    onSelect={selectItem}
                    selected={item.uid === selectedUid}
                  />
                );
              })}
            </group>
            {mode === "decorate" && pendingDef ? (
              <PlacementGhost
                bodyRef={playerBody}
                def={pendingDef}
                posRef={ghostRef}
                yaw={ghostYaw}
              />
            ) : null}
            {(mode === "walk" || mode === "decorate") && !posed ? (
              <WalkSystems
                bodyRef={playerBody}
                onActive={setActiveInteract}
                onNearPose={setNearPose}
                poseables={poseables}
              />
            ) : null}
          </Suspense>
          {mode === "orbit" ? <OrbitView /> : null}
          {mode === "build" ? (
            <MagnetRig
              selected={builderSelected}
              system={activeBuild}
              targetsRef={builderTargets}
            />
          ) : null}
          {mode === "walk" && posed ? <SeatedView at={posed.position} /> : null}
          {POSTFX_ENABLED ? <PostFx /> : null}
        </Canvas>
      </KeyboardControls>
      <Leva hidden />
      <div className="engine-hud">
        <button className="nav-pill nav-pill--engine" onClick={onExit} type="button">
          <Icon name="chevron" size={16} />
          <span>Back to UI</span>
        </button>
        <div className="engine-title">
          <span>{title}</span>
          <small>{subtitle}</small>
        </div>
        <div className="engine-actions">
          {mode !== "decorate" && mode !== "build" ? (
            <button
              className="nav-pill nav-pill--engine"
              onClick={() => {
                setPosed(null);
                setNearPose(null);
                setMode((value) => (value === "walk" ? "orbit" : "walk"));
              }}
              type="button"
            >
              <Icon name={mode === "walk" ? "globe" : "play"} size={16} />
              <span>{mode === "walk" ? "Overview" : "Walk"}</span>
            </button>
          ) : null}
          {mode !== "build" ? (
            <button className="nav-pill nav-pill--engine" onClick={toggleDecorate} type="button">
              <Icon name="brush" size={16} />
              <span>{mode === "decorate" ? "Done (B)" : "Decorate (B)"}</span>
            </button>
          ) : null}
          {mode !== "decorate" ? (
            <button className="nav-pill nav-pill--engine" onClick={toggleBuild} type="button">
              <Icon name="sprout" size={16} />
              <span>
                {mode === "build" ? "Done (M)" : canBuild ? "Builder (M)" : "Decorate-Magnet (M)"}
              </span>
            </button>
          ) : null}
          {mode !== "decorate" && mode !== "build" ? (
            <button className="nav-pill nav-pill--engine" onClick={travel} type="button">
              <Icon name="globe" size={16} />
              <span>{world === "home" ? "Travel: Palace" : "Travel: Home"}</span>
            </button>
          ) : null}
        </div>
      </div>
      {mode === "walk" ? (
        <div className="fp-hint">
          <strong>
            {posed
              ? posed.pose === "sleep"
                ? "You are resting"
                : "You are seated"
              : "Drag to look around"}
          </strong>
          <span>
            {posed
              ? "E (or the button) to get up"
              : "Move WASD / arrows · Shift run · Space jump · E sit/interact · B build"}
          </span>
        </div>
      ) : null}
      {mode === "walk" && posed ? (
        <button className="interact-prompt" onClick={getUp} type="button">
          <span className="interact-key">E</span>
          {posed.pose === "sleep" ? "Get up" : "Stand up"}
        </button>
      ) : mode === "walk" && nearPose ? (
        <button className="interact-prompt" onClick={() => enterPose(nearPose)} type="button">
          <span className="interact-key">E</span>
          {nearPose.pose === "sleep" ? "Lie down" : "Sit down"}
        </button>
      ) : mode === "walk" && activeInteract ? (
        <button
          className="interact-prompt"
          onClick={() => setDialog(activeInteract.message)}
          type="button"
        >
          <span className="interact-key">E</span>
          {activeInteract.label}
        </button>
      ) : null}
      {dialog ? (
        <div className="interact-dialog">
          <p>{dialog}</p>
          <button className="interact-close" onClick={() => setDialog(null)} type="button">
            Close
          </button>
        </div>
      ) : null}
      {mode === "decorate" ? (
        <DecorPicker
          catalog={CATALOG}
          count={items.length}
          onClearPending={() => setPendingDefId(null)}
          onDelete={() => {
            if (selectedItem) {
              persistItems(items.filter((item) => item.uid !== selectedItem.uid));
              setSelectedUid(null);
            }
          }}
          onDeselect={() => setSelectedUid(null)}
          onPick={(defId) => {
            setPendingDefId(defId);
            setSelectedUid(null);
          }}
          onPlace={placeAtGhost}
          onRotatePending={rotateGhost}
          onRotate={(delta) => {
            if (selectedItem)
              updateItem(selectedItem.uid, { rotationY: selectedItem.rotationY + delta });
          }}
          onScale={(factor) => {
            if (selectedItem) {
              const next = Math.min(5, Math.max(0.3, selectedItem.scale * factor));
              updateItem(selectedItem.uid, { scale: next });
            }
          }}
          onSetMedia={(url) => {
            if (selectedItem) updateItem(selectedItem.uid, { mediaUrl: url || undefined });
          }}
          pendingDefId={pendingDefId}
          selected={selectedItem && selectedDef ? { def: selectedDef, item: selectedItem } : null}
        />
      ) : null}
      {mode === "build" ? (
        <BuilderHud
          onExit={toggleBuild}
          onSelect={setBuilderSelected}
          selected={builderSelected}
          system={activeBuild}
        />
      ) : null}
      {mode !== "decorate" && mode !== "build" ? <ChatPanel handle={handle} /> : null}
      {mode !== "decorate" && mode !== "build" ? <MediaPlayer /> : null}
    </div>
  );
}
