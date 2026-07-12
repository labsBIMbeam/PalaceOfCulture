import { PALACE_SPAWN } from "@600b/multiplayer";
import { DEFAULT_AVATAR } from "@600b/shared";
import { Html, KeyboardControls, OrbitControls, useKeyboardControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CuboidCollider,
  Physics,
  type RapierRigidBody,
  RigidBody,
  useRapier,
} from "@react-three/rapier";
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
import { homeBuild } from "../builder/buildState";
import { timelocks } from "../frontend/data";
import { lockProgress } from "../frontend/growth";
import { Icon } from "../frontend/icons";
import type { Character, EngineTarget } from "../frontend/types";
import {
  type MultiplayerViewState,
  OFFLINE_MULTIPLAYER_STATE,
  PalaceMultiplayerTransport,
  type RemotePlayerSnapshot,
  getMultiplayerUrl,
  horizontalYawFromQuaternion,
} from "../net/multiplayer";
import { BuilderHud } from "../ui/BuilderHud";
import { ChatPanel } from "../ui/ChatPanel";
import { DecorPicker } from "../ui/DecorPicker";
import { MediaPlayer } from "../ui/MediaPlayer";
import { AvatarView } from "./AvatarView";
import { DecorItem } from "./DecorItem";
import { GrowableObject } from "./GrowableObject";
import { Palace } from "./Palace";
import { streetPoseTargets } from "./Plaza";
import { GrowingTree, PlotAssets } from "./PlotAssets";
import { Atmosphere, PostFx } from "./SceneFx";
import { StreetColliders } from "./StreetColliders";
import { STREET_GROUND, STREET_SPAWN as STREET_SPAWN_POINT, StreetWorld } from "./StreetWorld";
import { findImport, importUrl } from "./avatarImports";
import { type PlacedItem, loadDecor, newUid, saveDecor } from "./decorStore";
import { CATALOG, type DecorDef, defById } from "./furnitureCatalog";
import { BuilderWorld } from "./homebuilder/BuilderWorld";
import { MagnetRig } from "./homebuilder/MagnetRig";
import { INTERACTABLES, type Interactable } from "./interactables";

// The street's built-in seats/beds, computed once (deterministic layout data).
const STREET_POSES: PosePoint[] = streetPoseTargets();

type PalaceSceneProps = {
  target: EngineTarget;
  onExit: () => void;
  character: Character;
  /** Home "Build" button: skip walk mode and wake up holding the magnet. */
  startInBuild?: boolean;
};

type ViewMode = "orbit" | "walk" | "decorate" | "build";

type PoseKind = "sit" | "sleep";
/** A piece the avatar can use (chair/bed) and where it is (proximity point). Player-placed decor
 *  resolves yaw/lift from the placed item; static scenery spots (street benches/beds) carry their
 *  own `yaw`/`lift` since no decor item backs them. */
type PosePoint = {
  uid: string;
  position: [number, number, number];
  pose: PoseKind;
  yaw?: number;
  lift?: number;
};
/** The active posed state: which piece, where the avatar is, the facing, the pose, and a y-lift so
 *  the body rests on the object surface (a bed sits the sleeper above the floor). */
type Posed = {
  uid: string;
  position: [number, number, number];
  yaw: number;
  pose: PoseKind;
  lift: number;
};

// Public palace: how many pieces ONE player may place — an anti-spam cap, not a creativity cap.
// 21, of course. The private Home plot is uncapped (it is yours).
const PALACE_DECOR_LIMIT = 21;

// Overview camera per world — the street camp sits around z≈88 inside a 200 m fog, so the shared
// HQ vantage (looking at the origin from 196 m out) would show nothing but haze there.
const ORBIT_FOR: Record<
  EngineTarget,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  hq: { position: [150, 110, 150], target: [0, 0, 0] },
  home: { position: [80, 60, 80], target: [0, 0, 0] },
  street: { position: [62, 52, 16], target: [0, 0, 88] },
};
// On the plaza just short of the asset shelf (RESERVED_CORNER ~[0,0,52]); the default camera looks
// +z, so the tree + spaceship sit ahead in view on spawn. Tune freely with RESERVED_CORNER.
const SPAWN: [number, number, number] = [PALACE_SPAWN.x, PALACE_SPAWN.y, PALACE_SPAWN.z];
const STREET_SPAWN: [number, number, number] = STREET_SPAWN_POINT;

// The private Home is its OWN empty map (godot home_world parity): cream ground, cream fog,
// nothing but what you build. Palace assets never load here.
const HOME_SPAWN: [number, number, number] = [6, 3, 24];
const HOME_GROUND_SIZE = 128;
const HOME_CREAM = "#efe6d2";

// Per-world knobs (spawn, title, travel order/label) in one place, so adding a world is data, not
// another scattered ternary. Travel cycles the worlds in WORLD_ORDER.
const SPAWN_FOR: Record<EngineTarget, [number, number, number]> = {
  hq: SPAWN,
  home: HOME_SPAWN,
  street: STREET_SPAWN,
};
const WORLD_TITLE: Record<EngineTarget, string> = {
  hq: "Palace of Culture HQ",
  home: "Home — your map",
  street: "Werkstattgasse — the culture street",
};
const WORLD_ORDER: EngineTarget[] = ["hq", "street", "home"];
// Atmospheric distance fog per world (the Valheim depth trick): distant geometry fades into a
// horizon-matched haze so simple models read as a deep, real place. Fog never touches the sky
// background, so the skybox stays crisp behind the haze.
const WORLD_FOG: Record<EngineTarget, { color: string; near: number; far: number }> = {
  hq: { color: "#c4d1db", near: 55, far: 470 },
  home: { color: HOME_CREAM, near: 30, far: 120 },
  // the compact camp: haze starts just past the plaza and swallows the forest edge
  street: { color: "#6a5a70", near: 26, far: 200 },
};
const TRAVEL_LABEL: Record<EngineTarget, string> = {
  hq: "Travel: Palace",
  home: "Travel: Home",
  street: "Travel: Street",
};
const WORLD_WALK_SUBTITLE: Record<EngineTarget, string> = {
  hq: "public — walk the palace",
  home: "private — your plot",
  street: "public — the workshop street",
};
const WORLD_IDLE_SUBTITLE: Record<EngineTarget, string> = {
  hq: "3D engine — global palace",
  home: "3D engine — private plot",
  street: "3D engine — workshop street",
};
/** How long the travel curtain stays down (world swap happens under it). */
const TRAVEL_SWAP_MS = 300;
const TRAVEL_TOTAL_MS = 1500;

// drei KeyboardControls map — ecctrl reads these named actions. Full WASD; Decorate is on "B".
const KEYBOARD_MAP = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
];
const MOVEMENT_CODES = KEYBOARD_MAP.flatMap((entry) => entry.keys);

/** Synthetically release every movement key on window. drei's KeyboardControls only sees real
 *  keyups on window — when the chat input steals focus mid-run (its handlers stopPropagation so
 *  typing never moves you) or the window blurs, the real keyup never arrives and the character
 *  runs forever. Dispatching keyups resets the control state; holding the key re-triggers keydown. */
function releaseMovementKeys() {
  for (const code of MOVEMENT_CODES) {
    window.dispatchEvent(new KeyboardEvent("keyup", { code }));
  }
}

/** Orbit/overview camera — resets the rig on entry so toggling back from walk isn't jarring. */
function OrbitView({ world }: { world: EngineTarget }) {
  const { camera } = useThree();
  const view = ORBIT_FOR[world];
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    camera.position.set(...view.position);
    camera.lookAt(...view.target);
    if (perspective.isPerspectiveCamera) {
      perspective.fov = 42;
      perspective.updateProjectionMatrix();
    }
  }, [camera, view]);
  return (
    <OrbitControls enableDamping makeDefault maxPolarAngle={Math.PI / 2.05} target={view.target} />
  );
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
// Post-processing (fog-friendly color grade + bloom + vignette) is ON by default now that the look
// depends on it; `?postfx=0` disables it as an escape hatch for a weak GPU that renders it blank.
const POSTFX_ENABLED =
  typeof window === "undefined" ||
  new URLSearchParams(window.location.search).get("postfx") !== "0";
const USE_RADIUS = 2.6; // metres: how close you must be to a chair/bed for the "Sit"/"Sleep" prompt
const SLEEP_SURFACE = 0.4; // metres: mattress height a sleeper rests on, at the bed's default scale

// Capsule half height (0.5) + radius (0.4) + float (0.3) + slack: how far below the body centre
// the ground may be and still count as "standing on it".
const GROUND_RAY_LENGTH = 1.45;

function WalkSystems({
  bodyRef,
  poseables,
  spawn,
  activeWorld,
  onActive,
  onNearPose,
}: {
  bodyRef: RefObject<RapierRigidBody>;
  poseables: PosePoint[];
  /** Where the safety net puts a fallen controller — the active world's spawn. */
  spawn: [number, number, number];
  /** The active engine world — only its own interactables may prompt. */
  activeWorld: EngineTarget;
  onActive: (item: Interactable | null) => void;
  onNearPose: (point: PosePoint | null) => void;
}) {
  const [, getKeys] = useKeyboardControls();
  const { world, rapier } = useRapier();
  const lastId = useRef<string | null>(null);
  const lastPose = useRef<string | null>(null);
  const jumpPrev = useRef(false);
  useFrame(() => {
    const keys = getKeys() as Record<string, boolean>;
    const body = bodyRef.current;
    if (!body) return;
    const linvel = body.linvel();
    const pos = body.translation();

    // Read-only probe for headless verification (drive-to-target scripts read it). Never game state.
    (window as unknown as Record<string, unknown>).__playerPos = [pos.x, pos.y, pos.z];

    // Safety net: if the controller ever tunnels through the floor, lift it back to the entry point
    // instead of falling forever.
    if (pos.y < -6) {
      body.setTranslation({ x: spawn[0], y: spawn[1], z: spawn[2] }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    // Our own jump (ecctrl's canJump is unreliable on the invisible floor, so ecctrl's own jump is
    // disabled via jumpVel={0}; this is the single source). Grounded = a real downward raycast that
    // hits something within reach of the capsule (excluding the player itself) — the old |vy| gate
    // allowed an air jump at the arc's apex. Edge-detected so holding Space doesn't repeat.
    const jumpNow = Boolean(keys.jump);
    if (jumpNow && !jumpPrev.current) {
      const ray = new rapier.Ray(pos, { x: 0, y: -1, z: 0 });
      const grounded =
        world.castRay(ray, GROUND_RAY_LENGTH, true, undefined, undefined, undefined, body) !== null;
      if (grounded) body.setLinvel({ x: linvel.x, y: 4.5, z: linvel.z }, true);
    }
    jumpPrev.current = jumpNow;

    let best: Interactable | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const item of INTERACTABLES) {
      if (item.world !== activeWorld) continue;
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

/** Read the local Rapier controller every frame; the transport itself enforces the 10 Hz wire rate. */
function MultiplayerMovementSync({
  bodyRef,
  transportRef,
}: {
  bodyRef: RefObject<RapierRigidBody>;
  transportRef: RefObject<PalaceMultiplayerTransport | null>;
}) {
  useFrame(() => {
    const body = bodyRef.current;
    const transport = transportRef.current;
    if (!body || !transport) return;
    const correction = transport.consumeCorrection();
    if (correction) {
      const halfYaw = correction.rotationY / 2;
      body.setTranslation({ x: correction.x, y: correction.y, z: correction.z }, true);
      body.setRotation({ x: 0, y: Math.sin(halfYaw), z: 0, w: Math.cos(halfYaw) }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }
    const position = body.translation();
    const rotation = body.rotation();
    // Ecctrl's default auto-balance turns the rigid body toward its model indicator. Project the
    // body's local +Z axis onto the ground so remote facing follows the visible avatar, even while
    // it is standing still or sliding in a different direction.
    const rotationY = horizontalYawFromQuaternion(rotation);
    transport.sendMovement({
      x: position.x,
      y: position.y,
      z: position.z,
      rotationY,
    });
  });
  return null;
}

function remoteColor(sessionId: string): string {
  const palette = ["#e7b23c", "#e8704f", "#67c5b3", "#8bb8e8", "#c49be8"];
  let hash = 0;
  for (let index = 0; index < sessionId.length; index += 1) {
    hash = (hash * 31 + sessionId.charCodeAt(index)) >>> 0;
  }
  return palette[hash % palette.length] ?? palette[0] ?? "#e7b23c";
}

function dampAngle(current: number, target: number, alpha: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * alpha;
}

/** Pure Three visual: never enters Rapier, so remote players cannot collide or separate each other. */
function RemotePlayerMarker({
  detailed,
  player,
  labelStack,
}: {
  detailed: boolean;
  player: RemotePlayerSnapshot;
  labelStack: number;
}) {
  const group = useRef<THREE.Group>(null);
  const target = useMemo(
    () => new THREE.Vector3(player.x, player.y - 0.9, player.z),
    [player.x, player.y, player.z],
  );
  const color = useMemo(() => remoteColor(player.sessionId), [player.sessionId]);
  const avatarConfig = useMemo(
    () => ({
      ...DEFAULT_AVATAR,
      aura: color,
      modelUrl: importUrl(player.avatarAssetId) ?? importUrl("placeholder"),
    }),
    [color, player.avatarAssetId],
  );
  const opacity = player.connected ? 0.88 : 0.28;

  useFrame((_state, delta) => {
    const node = group.current;
    if (!node) return;
    const alpha = 1 - Math.exp(-10 * Math.min(delta, 0.1));
    node.position.lerp(target, alpha);
    node.rotation.y = dampAngle(node.rotation.y, player.rotationY, alpha);
  });

  return (
    <group
      position={[player.x, player.y - 0.9, player.z]}
      ref={group}
      rotation-y={player.rotationY}
    >
      {detailed ? (
        <AvatarView config={avatarConfig} locomotion={false} />
      ) : (
        <>
          <mesh position={[0, 0.72, 0]}>
            <capsuleGeometry args={[0.28, 0.78, 4, 8]} />
            <meshStandardMaterial color={color} opacity={opacity} roughness={0.72} transparent />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <sphereGeometry args={[0.29, 12, 10]} />
            <meshStandardMaterial color={color} opacity={opacity} roughness={0.72} transparent />
          </mesh>
        </>
      )}
      <mesh position={[0, 0.025, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.36, 0.48, 24]} />
        <meshBasicMaterial color={color} opacity={opacity * 0.75} transparent />
      </mesh>
      <Html center position={[0, 2.08 + labelStack * 0.32, 0]} style={{ pointerEvents: "none" }}>
        <span
          className={
            player.connected
              ? "remote-player-label"
              : "remote-player-label remote-player-label--dim"
          }
        >
          {player.handle}
        </span>
      </Html>
    </group>
  );
}

function RemotePlayers({ players }: { players: RemotePlayerSnapshot[] }) {
  const camera = useThree((state) => state.camera);
  const [detailedIds, setDetailedIds] = useState<ReadonlySet<string>>(() => new Set());
  const lastDetailUpdate = useRef(Number.NEGATIVE_INFINITY);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - lastDetailUpdate.current < 0.5) return;
    lastDetailUpdate.current = clock.elapsedTime;
    const distances = players
      .filter((player) => player.connected)
      .map((player) => ({
        id: player.sessionId,
        distanceSquared:
          (camera.position.x - player.x) ** 2 +
          (camera.position.y - (player.y - 0.9)) ** 2 +
          (camera.position.z - player.z) ** 2,
      }))
      .sort((a, b) => a.distanceSquared - b.distanceSquared);
    setDetailedIds((current) => {
      // Keep already-detailed players until 48 m, but admit new detail models only inside 40 m.
      // The hysteresis prevents repeated skeleton/material rebuilds around the distance boundary.
      const next = new Set(
        distances
          .filter((entry) => current.has(entry.id) && entry.distanceSquared <= 48 ** 2)
          .slice(0, 4)
          .map((entry) => entry.id),
      );
      for (const entry of distances) {
        if (next.size >= 4 || entry.distanceSquared > 40 ** 2) break;
        next.add(entry.id);
      }
      if (current.size === next.size && [...next].every((id) => current.has(id))) return current;
      return next;
    });
  });
  const positionCounts = new Map<string, number>();
  return (
    <group name="remote-player-visuals">
      {players.map((player) => {
        const positionKey = `${player.x.toFixed(3)}:${player.y.toFixed(3)}:${player.z.toFixed(3)}`;
        const labelStack = positionCounts.get(positionKey) ?? 0;
        positionCounts.set(positionKey, labelStack + 1);
        return (
          <RemotePlayerMarker
            detailed={detailedIds.has(player.sessionId)}
            key={player.sessionId}
            labelStack={labelStack}
            player={player}
          />
        );
      })}
    </group>
  );
}

type MultiplayerSession = {
  transport: PalaceMultiplayerTransport | null;
  detail?: string;
};

function useMultiplayerView(
  transport: PalaceMultiplayerTransport | null,
  detail?: string,
): MultiplayerViewState {
  const [view, setView] = useState<MultiplayerViewState>(() => ({
    ...OFFLINE_MULTIPLAYER_STATE,
    detail,
  }));
  useEffect(() => {
    if (!transport) {
      setView({ ...OFFLINE_MULTIPLAYER_STATE, detail });
      return;
    }
    return transport.subscribe(setView);
  }, [detail, transport]);
  return view;
}

function MultiplayerLayer({
  bodyRef,
  session,
  transportRef,
}: {
  bodyRef: RefObject<RapierRigidBody>;
  session: MultiplayerSession;
  transportRef: RefObject<PalaceMultiplayerTransport | null>;
}) {
  const view = useMultiplayerView(session.transport, session.detail);
  return (
    <>
      <MultiplayerMovementSync bodyRef={bodyRef} transportRef={transportRef} />
      <RemotePlayers players={view.players} />
    </>
  );
}

function MultiplayerStatus({ session }: { session: MultiplayerSession }) {
  const view = useMultiplayerView(session.transport, session.detail);
  const label =
    view.status === "connected"
      ? `connected · ${view.players.filter((player) => player.connected).length + 1} online`
      : view.status;
  return (
    <output
      aria-live="polite"
      className="multiplayer-status"
      data-status={view.status}
      title={view.detail}
    >
      <span className="multiplayer-status-dot" />
      {label}
    </output>
  );
}

/** The 3D game view, launched from the frontend UI. */
export function PalaceScene({ target, onExit, character, startInBuild }: PalaceSceneProps) {
  const [mode, setMode] = useState<ViewMode>(startInBuild && target === "home" ? "build" : "walk");
  const accent = character.avatar.aura;
  const handle = character.handle;
  const avatarAssetId = findImport(character.avatar.modelUrl)?.id ?? "placeholder";
  const playerBody = useRef<RapierRigidBody>(null);

  // Decoration: placed pieces are DATA, persisted per room (decorStore). `pendingDefId` = a catalog
  // piece chosen but not yet stamped; `selectedUid` = a placed piece being edited.
  // ONE world, two modes: `world` starts at the launch target and can be swapped in-engine
  // (Travel) — same character, same assets. Private Home = the magnet builder (homeBuild).
  // Public Palace = plain decorate placement only (B), capped against spam — no magnet there.
  const [world, setWorld] = useState<EngineTarget>(target);
  const canBuild = world === "home";
  const multiplayerTransportRef = useRef<PalaceMultiplayerTransport | null>(null);
  const [multiplayerSession, setMultiplayerSession] = useState<MultiplayerSession>({
    transport: null,
  });
  const [builderSelected, setBuilderSelected] = useState("");
  const builderTargets = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (world !== "hq") {
      multiplayerTransportRef.current = null;
      setMultiplayerSession({ transport: null });
      return;
    }

    let transport: PalaceMultiplayerTransport;
    try {
      transport = new PalaceMultiplayerTransport(
        getMultiplayerUrl(),
        handle,
        undefined,
        avatarAssetId,
      );
    } catch (error) {
      setMultiplayerSession({
        transport: null,
        detail: error instanceof Error ? error.message : "Invalid multiplayer configuration",
      });
      return;
    }

    multiplayerTransportRef.current = transport;
    setMultiplayerSession({ transport });
    transport.connect();
    return () => {
      if (multiplayerTransportRef.current === transport) multiplayerTransportRef.current = null;
      void transport.leave();
    };
  }, [avatarAssetId, handle, world]);

  useEffect(() => {
    void homeBuild.setup();
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
    if (itemsRef.current.length >= decorLimit) return;
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
  // Anti-spam cap in the public palace; Number.POSITIVE_INFINITY = uncapped at home.
  const decorLimit = world === "hq" ? PALACE_DECOR_LIMIT : Number.POSITIVE_INFINITY;
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
    if (itemsRef.current.length >= decorLimit) return;
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
  const [standPos, setStandPos] = useState<[number, number, number]>(SPAWN_FOR[target]);
  const [nearPose, setNearPose] = useState<PosePoint | null>(null);
  const posedRef = useRef<Posed | null>(null);
  posedRef.current = posed;
  const nearPoseRef = useRef<PosePoint | null>(null);
  nearPoseRef.current = nearPose;

  const poseables: PosePoint[] = [
    ...items.flatMap((item): PosePoint[] => {
      const pose = defById(item.defId)?.pose;
      return pose ? [{ uid: item.uid, position: item.position, pose }] : [];
    }),
    // The street scenery ships its own usable seats/beds (plaza benches, hut interiors).
    ...(world === "street" ? STREET_POSES : []),
  ];

  const enterPose = (point: PosePoint) => {
    const item = itemsRef.current.find((entry) => entry.uid === point.uid);
    if (item) {
      // Sleepers rest on the mattress (the bed raises them off the floor); sitters stay at floor
      // level (the sit clip already lowers them onto the seat). Scales with the piece's own scale.
      const lift = point.pose === "sleep" ? SLEEP_SURFACE * item.scale : 0;
      setPosed({
        uid: point.uid,
        position: item.position,
        yaw: item.rotationY,
        pose: point.pose,
        lift,
      });
    } else {
      // Static scenery spot — yaw/lift travel with the point itself.
      setPosed({
        uid: point.uid,
        position: point.position,
        yaw: point.yaw ?? 0,
        pose: point.pose,
        lift: point.lift ?? (point.pose === "sleep" ? SLEEP_SURFACE : 0),
      });
    }
    setNearPose(null);
    setActiveInteract(null);
  };
  const getUp = () => {
    const seat = posedRef.current;
    if (seat) setStandPos([seat.position[0], 2, seat.position[2]]);
    setPosed(null);
  };

  // "M" (magnet) toggles Build mode — private Home only; ignored while typing in chat.
  // biome-ignore lint/correctness/useExhaustiveDependencies: getUp reads the current seat through posedRef
  useEffect(() => {
    if (!canBuild) return;
    const onMagnetKey = (event: KeyboardEvent) => {
      if (event.code !== "KeyM") return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      getUp();
      setMode((value) => (value === "build" ? "walk" : "build"));
      setPendingDefId(null);
      setSelectedUid(null);
    };
    window.addEventListener("keydown", onMagnetKey);
    return () => window.removeEventListener("keydown", onMagnetKey);
  }, [canBuild]);

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

  // "B" toggles Decorate from anywhere in the engine. Ignored while typing in chat. Not D —
  // that's WASD right-strafe. Leaving a chair first preserves its position across the mode switch.
  // biome-ignore lint/correctness/useExhaustiveDependencies: getUp reads the current seat through posedRef
  useEffect(() => {
    const onDecorateKey = (event: KeyboardEvent) => {
      if (event.code !== "KeyB") return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      getUp();
      setMode((value) => (value === "build" ? value : value === "decorate" ? "walk" : "decorate"));
      setPendingDefId(null);
      setSelectedUid(null);
    };
    window.addEventListener("keydown", onDecorateKey);
    return () => window.removeEventListener("keydown", onDecorateKey);
  }, []);

  // Stuck-run guard: if focus moves into a text input (Enter opens chat while W is held — its
  // handlers stopPropagation, so the real keyup never reaches window) or the window/tab blurs,
  // release every movement key so the character stops instead of running forever.
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        releaseMovementKeys();
      }
    };
    window.addEventListener("blur", releaseMovementKeys);
    window.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("blur", releaseMovementKeys);
      window.removeEventListener("focusin", onFocusIn);
    };
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

  // Your growables anchor the empty Home map: the 21M lock grows the Tree, the 21Y lock builds
  // the Rocket at the fog's edge — the first inhabitants of the future town. Everything that will
  // produce resources here follows the same law: it arrives and grows by WAITING, never by grind.
  const treeLock = timelocks.find((lock) => lock.tier === "21M");
  const rocketLock = timelocks.find((lock) => lock.tier === "21Y");
  const treeProgress = treeLock ? lockProgress(treeLock) : 0.4;
  const rocketProgress = rocketLock ? lockProgress(rocketLock) : 0.2;

  const title = WORLD_TITLE[world];
  const subtitle =
    mode === "build"
      ? "build — magnet captured, blocks + crafted decor"
      : mode === "decorate"
        ? "decorate — walk up, aim, and place"
        : mode === "walk"
          ? WORLD_WALK_SUBTITLE[world]
          : WORLD_IDLE_SUBTITLE[world];
  const toggleDecorate = () => {
    getUp();
    setMode((value) => (value === "decorate" ? "walk" : "decorate"));
    setPendingDefId(null);
    setSelectedUid(null);
  };
  const toggleBuild = () => {
    if (!canBuild) return;
    getUp();
    setMode((value) => (value === "build" ? "walk" : "build"));
    setPendingDefId(null);
    setSelectedUid(null);
  };
  const toggleOverview = () => {
    if (mode === "walk") {
      const bodyPosition = playerBody.current?.translation();
      if (bodyPosition) setStandPos([bodyPosition.x, bodyPosition.y, bodyPosition.z]);
      else if (posedRef.current) getUp();
      setPosed(null);
      setNearPose(null);
      setMode("orbit");
      return;
    }
    setMode("walk");
  };
  // Travel: swap the world behind a short loading curtain — Home is its own empty map, so the
  // swap (unmount palace / mount ground) happens while the screen is covered.
  const [traveling, setTraveling] = useState<EngineTarget | null>(null);
  const nextWorld: EngineTarget =
    WORLD_ORDER[(WORLD_ORDER.indexOf(world) + 1) % WORLD_ORDER.length] ?? "hq";
  const travel = () => {
    if (traveling) return;
    const next = nextWorld;
    setTraveling(next);
    setMode("walk");
    setBuilderSelected("");
    setPendingDefId(null);
    setSelectedUid(null);
    setPosed(null);
    window.setTimeout(() => {
      setWorld(next);
      setStandPos(SPAWN_FOR[next]);
    }, TRAVEL_SWAP_MS);
    window.setTimeout(() => setTraveling(null), TRAVEL_TOTAL_MS);
  };

  return (
    <div className="engine-shell">
      <KeyboardControls map={KEYBOARD_MAP}>
        <Canvas
          camera={{ position: [150, 110, 150], fov: 42, near: 0.5, far: 6000 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          shadows="soft"
        >
          {/* Low flat fill so shadows + the warm key carry the contrast (Nordic-overcast look); the
              skybox IBL (SceneFx) supplies most of the soft ambient, so ambient/hemi stay gentle. */}
          <ambientLight intensity={0.14} />
          {/* dusk fill: cool violet sky above, dim warm bounce below */}
          <hemisphereLight args={["#3f4a72", "#5a4530", 0.3]} />
          {/* low, dim, warm key — the sun just set; lamps + glowing windows carry the scene */}
          <directionalLight
            castShadow
            color="#ff9a5a"
            intensity={1.9}
            position={[210, 90, 90]}
            shadow-bias={-0.0004}
            shadow-camera-bottom={-200}
            shadow-camera-far={1200}
            shadow-camera-left={-200}
            shadow-camera-right={200}
            shadow-camera-top={200}
            shadow-mapSize={[2048, 2048]}
            shadow-normalBias={0.03}
            shadow-radius={3}
          />
          {world !== "home" ? <Atmosphere /> : null}
          {world === "home" ? <color args={[HOME_CREAM]} attach="background" /> : null}
          {/* horizon-matched distance fog for depth (never fogs the sky background) */}
          <fog
            args={[WORLD_FOG[world].color, WORLD_FOG[world].near, WORLD_FOG[world].far]}
            attach="fog"
          />
          <Suspense fallback={null}>
            <Physics key={world} timeStep={1 / 60}>
              {world === "hq" ? <Palace /> : null}
              {/* Invisible flat floor at the deck level (y=0): the palace trimesh has gaps/glass the
                  ecctrl ground ray misses, leaving the controller stuck in "fall" so it never walks.
                  A guaranteed ground plane keeps the player grounded across the whole plaza.
                  The Home map gets its own (smaller) slab under the visible cream ground; the Street
                  gets a long slab under its lane. */}
              <RigidBody type="fixed" colliders={false}>
                {/* Thick (10 m) so the capsule can't tunnel through it on spawn/respawn. Top at y=0. */}
                <CuboidCollider
                  args={
                    world === "hq"
                      ? [300, 5, 300]
                      : world === "street"
                        ? STREET_GROUND.half
                        : [HOME_GROUND_SIZE / 2, 5, HOME_GROUND_SIZE / 2]
                  }
                  position={world === "street" ? STREET_GROUND.center : [0, -5, 0]}
                />
              </RigidBody>
              {/* solid collision for the street's buildings + tree trunks (visuals are outside Physics) */}
              {world === "street" ? <StreetColliders /> : null}
              {world === "home" ? (
                <>
                  <mesh receiveShadow rotation-x={-Math.PI / 2}>
                    <planeGeometry args={[HOME_GROUND_SIZE, HOME_GROUND_SIZE]} />
                    <meshStandardMaterial color="#e5dabf" metalness={0} roughness={0.95} />
                  </mesh>
                  {/* Your timelocks, living on the map: Tree (21M) near the spawn, Rocket (21Y)
                      rising out of the fog at the far corner. Both grow purely by waiting. */}
                  <GrowingTree position={[-14, 0, 8]} progress={treeProgress} />
                  <group position={[-38, 0, -34]}>
                    <GrowableObject
                      fitHeight={26}
                      glbUrl="/growables/starship-stack.glb"
                      manifestUrl="/growables/starship-stack.growth.json"
                      progress={rocketProgress}
                    />
                  </group>
                </>
              ) : null}
              {/* Walking (and decorating, which is walk + a build overlay): the controller. Parked
                  while posed (re-spawns at the piece on get-up, so `position` is keyed to force a
                  fresh mount when standPos changes). */}
              {(mode === "walk" || mode === "decorate") && !posed ? (
                <Ecctrl
                  // Snappy ground feel: reach max speed quickly (accDeltaTime 8→4), keep momentum
                  // through turns (turnVelMultiplier 0.2→0.8, turnSpeed 15→22) and stop crisply
                  // (dragDampingC 0.15→0.22) — the defaults read as icy/sticky.
                  accDeltaTime={4}
                  camInitDis={-7}
                  ccd
                  camMaxDis={-14}
                  camMinDis={-1.5}
                  capsuleHalfHeight={0.5}
                  capsuleRadius={0.4}
                  dragDampingC={0.22}
                  floatHeight={0.3}
                  jumpVel={0}
                  key={standPos.join(",")}
                  maxVelLimit={4}
                  // Ecctrl applies the move impulse at moveImpulsePointY (default 0.5, ABOVE the
                  // body centre) — under a sustained sprint that torque settles the capsule at a
                  // ~45° forward lean. Apply the impulse at the centre (no pitch torque) and
                  // stiffen the upright spring so bumps recover quickly without wobble.
                  autoBalanceDampingC={0.08}
                  autoBalanceSpringK={1.2}
                  moveImpulsePointY={0}
                  position={standPos}
                  // Widen ecctrl's ground detection so "canJump" is reliably true on the deck — the
                  // default forgiveness (0.1) gave a tight 0.8 window vs the 0.7 float, so jump often
                  // never fired. 0.5 keeps canJump solid while grounded without making mid-air jumps.
                  rayHitForgiveness={0.5}
                  ref={playerBody}
                  sprintMult={2}
                  turnSpeed={22}
                  turnVelMultiplier={0.8}
                >
                  <group position={[0, -0.9, 0]}>
                    <AvatarView bodyRef={playerBody} config={character.avatar} />
                  </group>
                </Ecctrl>
              ) : null}
              {/* The homebuilder world (private Home only): blocks + crafted decor, walkable.
                  Lives INSIDE <Physics> — its RigidBody/colliders need the context. */}
              {canBuild ? (
                <BuilderWorld
                  building={mode === "build"}
                  selected={builderSelected}
                  system={homeBuild}
                  targetsRef={builderTargets}
                />
              ) : null}
              {/* In-canvas walk probe — inside <Physics> for the grounded raycast (useRapier). */}
              {(mode === "walk" || mode === "decorate") && !posed ? (
                <WalkSystems
                  activeWorld={world}
                  bodyRef={playerBody}
                  onActive={setActiveInteract}
                  onNearPose={setNearPose}
                  poseables={poseables}
                  spawn={SPAWN_FOR[world]}
                />
              ) : null}
            </Physics>
            {/* The street is pure scenery (no colliders) — rendered OUTSIDE <Physics> so its many
                lazy GLB loads don't churn the physics tree on mount (kept the world walkable via the
                street ground collider inside Physics above). */}
            {world === "street" ? <StreetWorld /> : null}
            {world === "hq" ? (
              <MultiplayerLayer
                bodyRef={playerBody}
                session={multiplayerSession}
                transportRef={multiplayerTransportRef}
              />
            ) : null}
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
            {world === "hq" ? <PlotAssets accent={accent} /> : null}
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
          </Suspense>
          {mode === "orbit" ? <OrbitView world={world} /> : null}
          {mode === "build" ? (
            <MagnetRig selected={builderSelected} system={homeBuild} targetsRef={builderTargets} />
          ) : null}
          {mode === "walk" && posed ? <SeatedView at={posed.position} /> : null}
          {POSTFX_ENABLED ? <PostFx /> : null}
        </Canvas>
      </KeyboardControls>
      <Leva hidden />
      {traveling ? (
        <div className="travel-screen">
          <Icon name={traveling === "home" ? "home" : "globe"} size={44} />
          <strong>{traveling === "home" ? "Coming home…" : "Traveling to the Palace…"}</strong>
          <small>
            {traveling === "home"
              ? "your own empty map — build slowly"
              : "the shared plaza — decorate, don't spam"}
          </small>
        </div>
      ) : null}
      <div className="engine-hud">
        <button className="nav-pill nav-pill--engine" onClick={onExit} type="button">
          <Icon name="chevron" size={16} />
          <span>Back to UI</span>
        </button>
        <div className="engine-title">
          <span>{title}</span>
          <small>{subtitle}</small>
        </div>
        {world === "hq" ? <MultiplayerStatus session={multiplayerSession} /> : null}
        <div className="engine-actions">
          {mode !== "decorate" && mode !== "build" ? (
            <button className="nav-pill nav-pill--engine" onClick={toggleOverview} type="button">
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
          {canBuild && mode !== "decorate" ? (
            <button className="nav-pill nav-pill--engine" onClick={toggleBuild} type="button">
              <Icon name="sprout" size={16} />
              <span>{mode === "build" ? "Done (M)" : "Builder (M)"}</span>
            </button>
          ) : null}
          {mode !== "decorate" && mode !== "build" ? (
            <button className="nav-pill nav-pill--engine" onClick={travel} type="button">
              <Icon name="globe" size={16} />
              <span>{TRAVEL_LABEL[nextWorld]}</span>
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
          limit={world === "hq" ? PALACE_DECOR_LIMIT : undefined}
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
          system={homeBuild}
        />
      ) : null}
      {mode !== "decorate" && mode !== "build" ? <ChatPanel handle={handle} /> : null}
      {mode !== "decorate" && mode !== "build" ? <MediaPlayer /> : null}
    </div>
  );
}
