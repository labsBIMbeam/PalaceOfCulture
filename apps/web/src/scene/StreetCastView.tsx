// The mentor crews in the world: all 31 member avatars clustered at the five affinity
// stations, plus the Set-1 signature piece per station as an MVP primitive (a real Meshy prop
// slots in with the 21-day set cadence without touching this file's layout). NPCs are ambient
// presences, not room players — leads anchor their station, sitters keep their crate, and the
// rest of each crew wanders small seeded loops (pausing to face a player who walks up). A live
// member walking the street appears additionally, and that is fine and funny. The idle/walk
// clips are baked into the member GLBs, so the whole cast still costs 31 meshes and nothing else.

import { useFrame } from "@react-three/fiber";
import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { MEMBERS } from "../ui/members";
import { AvatarView } from "./AvatarView";
import { mulberry32 } from "./rand";
import {
  CREW_STATIONS,
  type CastEntry,
  type CrewId,
  type CrewStation,
  STREET_CAST,
} from "./streetCast";

const MEMBER_BY_NAME = new Map(MEMBERS.map((member) => [member.name, member]));

const STEEL = "#2a2c31";
const TIMBER = "#6b4a2e";
/** Seat height the shared sit clip was authored for (chair-height crate). */
const CRATE_SEAT = 0.45;

/** Deterministic per-name phase offset (seconds) so the crowd never idles in lockstep. */
function idleOffset(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 100; // 0.00 … 9.99 s
}

/** The sitter's crate — plain street timber, no markings. */
function Crate() {
  return (
    <mesh castShadow position={[0, CRATE_SEAT / 2, 0]}>
      <boxGeometry args={[0.62, CRATE_SEAT, 0.62]} />
      <meshStandardMaterial color={TIMBER} roughness={0.85} />
    </mesh>
  );
}

// Ambient life: crew members pace seeded loops around their spot — turn first, then walk with
// accel/decel ramps (the clip rate follows real speed, so no foot-sliding), sometimes visiting
// a crewmate and standing with them a while. When the player walks up they finish the thought,
// turn over (staggered, not in unison) and face them — and lose interest again if nothing
// happens. Leads attend in place; sitters hold the crate. The interact zone stays at the
// authored spot (radius 2.6 covers the whole loop).
const WANDER_RADIUS = 2.1;
const ACCEL = 2.4; // m/s²
const TURN_RATE = 2.6; // rad/s while standing; slightly quicker mid-walk
const STATION_XZ = Object.fromEntries(
  CREW_STATIONS.map((station) => [station.id, station.position]),
) as Record<CrewStation["id"], [number, number]>;
const CREWMATES = new Map<string, CastEntry[]>();
for (const entry of STREET_CAST) {
  CREWMATES.set(entry.crew, [...(CREWMATES.get(entry.crew) ?? []), entry]);
}

function seedOf(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function playerPos(): [number, number, number] | undefined {
  return (window as unknown as Record<string, unknown>).__playerPos as
    | [number, number, number]
    | undefined;
}

/** Shortest signed angle from the group's yaw to `to`. */
function yawError(g: THREE.Group, to: number): number {
  return ((to - g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

/** Constant-rate turn with a soft landing; returns the remaining error. */
function turnToward(g: THREE.Group, to: number, rate: number, delta: number): number {
  const err = yawError(g, to);
  const step = Math.min(Math.abs(err), rate * delta * (0.35 + Math.abs(err)));
  g.rotation.y += Math.sign(err) * step;
  return yawError(g, to);
}

function WanderingMember({
  entry,
  config,
}: {
  entry: CastEntry;
  config: (typeof MEMBERS)[number]["avatar"];
}) {
  const group = useRef<THREE.Group>(null);
  const [gait, setGait] = useState<"idle" | "walk">("idle");
  const speedRef = useRef(0);
  const state = useRef(
    (() => {
      const rng = mulberry32(seedOf(entry.member));
      return {
        rng,
        mode: "pause" as "pause" | "turn" | "walk" | "attend",
        wait: 2 + idleOffset(entry.member) * 0.8, // staggered first steps across the crowd
        target: [entry.position[0], entry.position[2]] as [number, number],
        faceAfter: null as number | null, // yaw to settle into on arrival (visiting a mate)
        // personality, seeded once: pace, personal space, reaction lag, attention span
        walkSpeed: 0.9 + rng() * 0.45,
        attendRadius: 2.6 + rng() * 1.2,
        reactDelay: 0.1 + rng() * 0.4,
        reactIn: 0,
        interest: 0,
        lastPlayer: [0, 0] as [number, number],
      };
    })(),
  );

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    const px = g.position.x;
    const pz = g.position.z;

    const player = playerPos();
    const near = player ? Math.hypot(player[0] - px, player[2] - pz) < s.attendRadius : false;
    if (near && player) {
      const moved = Math.hypot(player[0] - s.lastPlayer[0], player[2] - s.lastPlayer[1]) > 0.5;
      if (moved) {
        s.interest = 7 + s.rng() * 5;
        s.lastPlayer = [player[0], player[2]];
      }
      if (s.mode !== "attend") {
        s.reactIn -= delta;
        if (s.reactIn <= 0 && s.interest <= 0) s.interest = 7 + s.rng() * 5;
        if (s.reactIn <= 0 && s.interest > 0) s.mode = "attend";
      }
    } else {
      s.reactIn = s.reactDelay;
      if (s.mode === "attend") {
        s.mode = "pause";
        s.wait = 1 + s.rng() * 3;
      }
    }

    if (s.mode === "attend") {
      s.interest -= delta;
      speedRef.current = Math.max(0, speedRef.current - ACCEL * delta);
      if (gait !== "idle") setGait("idle");
      if (player) turnToward(g, Math.atan2(player[0] - px, player[2] - pz), TURN_RATE, delta);
      if (s.interest <= 0) {
        s.mode = "pause"; // politely drift back to their own business
        s.wait = 2 + s.rng() * 4;
      }
    } else if (s.mode === "pause") {
      speedRef.current = Math.max(0, speedRef.current - ACCEL * delta);
      if (gait !== "idle") setGait("idle");
      if (s.faceAfter !== null) turnToward(g, s.faceAfter, TURN_RATE * 0.8, delta);
      s.wait -= delta;
      if (s.wait <= 0) {
        const station = STATION_XZ[entry.crew];
        const mates = (CREWMATES.get(entry.crew) ?? []).filter((m) => m.member !== entry.member);
        s.faceAfter = null;
        // a third of the time: walk over to a crewmate and stand with them a moment
        if (mates.length > 0 && s.rng() < 0.34) {
          const mate = mates[Math.floor(s.rng() * mates.length)];
          if (mate) {
            const dx = mate.position[0] - entry.position[0];
            const dz = mate.position[2] - entry.position[2];
            const d = Math.max(Math.hypot(dx, dz), 1e-6);
            const stop = 1.15 + s.rng() * 0.3;
            s.target = [mate.position[0] - (dx / d) * stop, mate.position[2] - (dz / d) * stop];
            s.faceAfter = Math.atan2(
              mate.position[0] - s.target[0],
              mate.position[2] - s.target[1],
            );
          }
        } else {
          for (let tries = 0; tries < 8; tries++) {
            const angle = s.rng() * Math.PI * 2;
            const radius = 0.6 + s.rng() * WANDER_RADIUS;
            const tx = entry.position[0] + Math.cos(angle) * radius;
            const tz = entry.position[2] + Math.sin(angle) * radius;
            if (Math.hypot(tx - station[0], tz - station[1]) < 1.2) continue; // not into the piece
            s.target = [tx, tz];
            break;
          }
        }
        s.mode = "turn";
      }
    } else if (s.mode === "turn") {
      // face where you're going before the first step
      speedRef.current = Math.max(0, speedRef.current - ACCEL * delta);
      if (gait !== "idle") setGait("idle");
      const want = Math.atan2(s.target[0] - px, s.target[1] - pz);
      if (Math.abs(turnToward(g, want, TURN_RATE, delta)) < 0.3) s.mode = "walk";
    } else {
      const dx = s.target[0] - px;
      const dz = s.target[1] - pz;
      const dist = Math.hypot(dx, dz);
      // ease out: start braking at the stopping distance for the current speed
      const brake = (speedRef.current * speedRef.current) / (2 * ACCEL);
      const wantSpeed =
        dist <= brake ? Math.max(0.18, Math.sqrt(2 * ACCEL * dist) * 0.8) : s.walkSpeed;
      speedRef.current = Math.min(
        wantSpeed,
        speedRef.current + ACCEL * delta * (speedRef.current < wantSpeed ? 1 : -1),
      );
      if (dist < 0.1) {
        s.mode = "pause";
        s.wait = s.faceAfter !== null ? 6 + s.rng() * 6 : 3 + s.rng() * 6;
        speedRef.current = 0;
        setGait("idle");
      } else {
        if (gait !== "walk" && speedRef.current > 0.12) setGait("walk");
        const step = Math.min(dist, speedRef.current * delta);
        g.position.x += (dx / dist) * step;
        g.position.z += (dz / dist) * step;
        turnToward(g, Math.atan2(dx, dz), TURN_RATE * 1.5, delta);
      }
    }
  });

  return (
    <group position={entry.position} ref={group} rotation-y={entry.rotationY}>
      <Suspense fallback={null}>
        <AvatarView
          animationOffset={idleOffset(entry.member)}
          config={config}
          gaitOverride={gait}
          gaitSpeed={state.current.walkSpeed}
          locomotion={false}
          speedRef={speedRef}
        />
      </Suspense>
    </group>
  );
}

/** Leads hold their post but still turn to a visitor — and settle back afterwards. */
function AttendingMember({
  entry,
  config,
}: {
  entry: CastEntry;
  config: (typeof MEMBERS)[number]["avatar"];
}) {
  const group = useRef<THREE.Group>(null);
  const seeded = useRef(mulberry32(seedOf(entry.member)));
  const reactIn = useRef(0.1 + seeded.current() * 0.3);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const player = playerPos();
    const near = player
      ? Math.hypot(player[0] - g.position.x, player[2] - g.position.z) < 3.6
      : false;
    if (near && player) {
      reactIn.current -= delta;
      if (reactIn.current <= 0) {
        turnToward(
          g,
          Math.atan2(player[0] - g.position.x, player[2] - g.position.z),
          TURN_RATE,
          delta,
        );
      }
    } else {
      reactIn.current = 0.1;
      turnToward(g, entry.rotationY, TURN_RATE * 0.6, delta);
    }
  });

  return (
    <group position={entry.position} ref={group} rotation-y={entry.rotationY}>
      <Suspense fallback={null}>
        <AvatarView
          animationOffset={idleOffset(entry.member)}
          config={config}
          gaitOverride="idle"
          locomotion={false}
        />
      </Suspense>
    </group>
  );
}

/** Signal — a guyed antenna mast with two crossbars and a violet tip light. */
function AntennaMast({ accent }: { accent: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.07, 0.12, 5.2, 8]} />
        <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.5} />
      </mesh>
      {[3.6, 4.5].map((y, i) => (
        <mesh castShadow key={y} position={[0, y, 0]} rotation-y={i * 0.6}>
          <boxGeometry args={[1.5 - i * 0.5, 0.06, 0.06]} />
          <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 5.3, 0]}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} />
      </mesh>
    </group>
  );
}

/** Bitcoin — a humming node rack: stacked units with an orange LED strip. */
function NodeRack({ accent }: { accent: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.95, 0]}>
        <boxGeometry args={[1.1, 1.9, 0.7]} />
        <meshStandardMaterial color={STEEL} metalness={0.4} roughness={0.6} />
      </mesh>
      {[0.4, 0.85, 1.3].map((y) => (
        <mesh key={y} position={[0, y, 0.36]}>
          <boxGeometry args={[0.9, 0.08, 0.02]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}

/** Keys — a timber key cabinet, drawers shut, one warm cream keyhole glow. */
function KeyCabinet({ accent }: { accent: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.8, 0]}>
        <boxGeometry args={[1.2, 1.6, 0.55]} />
        <meshStandardMaterial color={TIMBER} roughness={0.8} />
      </mesh>
      {[0.45, 0.8, 1.15].map((y) => (
        <mesh key={y} position={[0, y, 0.29]}>
          <boxGeometry args={[1.0, 0.02, 0.02]} />
          <meshStandardMaterial color="#3d2a1a" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0.35, 0.98, 0.29]}>
        <sphereGeometry args={[0.045, 8, 6]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

/** Power — a tilted solar panel on a timber A-frame, cells glinting gold. */
function SolarPanel({ accent }: { accent: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 1.1, -0.25]} rotation-x={-0.6}>
        <boxGeometry args={[1.9, 1.3, 0.07]} />
        <meshStandardMaterial
          color="#1c2438"
          emissive={accent}
          emissiveIntensity={0.18}
          metalness={0.5}
          roughness={0.35}
        />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh castShadow key={x} position={[x, 0.45, 0]} rotation-x={0.35}>
          <boxGeometry args={[0.09, 1.0, 0.09]} />
          <meshStandardMaterial color={TIMBER} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Timelock — the block clock: a slab with a teal display that the crew keeps quiet around. */
function BlockClock({ accent }: { accent: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[0.9, 1.8, 0.45]} />
        <meshStandardMaterial color="#171310" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.35, 0.24]}>
        <boxGeometry args={[0.62, 0.34, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0, 0.62, 0.24]}>
        <boxGeometry args={[0.62, 0.05, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

const STATION_PIECES: Record<CrewStation["id"], (props: { accent: string }) => JSX.Element> = {
  signal: AntennaMast,
  bitcoin: NodeRack,
  keys: KeyCabinet,
  power: SolarPanel,
  timelock: BlockClock,
};

export function StreetCastView() {
  return (
    <group>
      {CREW_STATIONS.map((station) => {
        const Piece = STATION_PIECES[station.id];
        return (
          <group
            key={station.id}
            position={[station.position[0], 0, station.position[1]]}
            rotation-y={station.rotationY}
          >
            <Piece accent={station.accent} />
          </group>
        );
      })}
      {STREET_CAST.map((entry) => {
        const member = MEMBER_BY_NAME.get(entry.member);
        if (!member) return null;
        // Crew on their feet wanders; leads attend their station; sitters keep the crate.
        if (entry.role === "crew" && !entry.pose) {
          return <WanderingMember config={member.avatar} entry={entry} key={entry.member} />;
        }
        if (entry.role === "lead") {
          return <AttendingMember config={member.avatar} entry={entry} key={entry.member} />;
        }
        return (
          <group key={entry.member} position={entry.position} rotation-y={entry.rotationY}>
            {entry.pose === "sit" ? <Crate /> : null}
            <Suspense fallback={null}>
              <AvatarView
                animationOffset={idleOffset(entry.member)}
                config={member.avatar}
                locomotion={false}
                pose={entry.pose}
              />
            </Suspense>
          </group>
        );
      })}
    </group>
  );
}

/** The tour spotlight: while Kerni introduces a crew, its station carries a pulsing ring +
 *  a soft light column in the affinity accent (brand-fixed colors, 600b-design-laws). Pure
 *  presence-layer VFX — additive, no shadows, no state. */
export function TourBeacon({ crew }: { crew: CrewId }) {
  const station = CREW_STATIONS.find((entry) => entry.id === crew);
  const ringRef = useRef<THREE.Mesh>(null);
  const columnRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const pulse = 0.72 + Math.sin(clock.elapsedTime * 3.2) * 0.28;
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + (1 - pulse) * 0.35);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * pulse;
    }
    if (columnRef.current) {
      (columnRef.current.material as THREE.MeshBasicMaterial).opacity = 0.16 * pulse;
    }
  });
  if (!station) return null;
  return (
    <group position={[station.position[0], 0, station.position[1]]}>
      <mesh position={[0, 0.06, 0]} ref={ringRef} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.7, 2.15, 40]} />
        <meshBasicMaterial color={station.accent} depthWrite={false} transparent />
      </mesh>
      <mesh position={[0, 3.1, 0]} ref={columnRef}>
        <cylinderGeometry args={[1.05, 1.45, 6.2, 20, 1, true]} />
        <meshBasicMaterial
          color={station.accent}
          depthWrite={false}
          side={THREE.DoubleSide}
          transparent
        />
      </mesh>
    </group>
  );
}
