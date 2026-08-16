// The mentor crews in the world: all 31 member avatars clustered at the five affinity
// stations, plus the Set-1 signature piece per station as an MVP primitive (a real Meshy prop
// slots in with the 21-day set cadence without touching this file's layout). NPCs are ambient
// presences, not room players — leads anchor their station, sitters keep their crate, and the
// rest of each crew wanders small seeded loops (pausing to face a player who walks up). A live
// member walking the street appears additionally, and that is fine and funny. The idle/walk
// clips are baked into the member GLBs, so the whole cast still costs 31 meshes and nothing else.

import { useFrame } from "@react-three/fiber";
import { Suspense, useRef, useState } from "react";
import type * as THREE from "three";
import { MEMBERS } from "../ui/members";
import { AvatarView } from "./AvatarView";
import { mulberry32 } from "./rand";
import { CREW_STATIONS, type CastEntry, type CrewStation, STREET_CAST } from "./streetCast";

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

// Ambient wander: crew members pace small seeded loops around their spot, pause, look around —
// and when the player walks up they stop and turn to face them. Leads and sitters hold their
// staging; the interact zone stays at the authored spot (radius 2.6 covers the whole loop).
const WANDER_RADIUS = 2.1;
const WANDER_SPEED = 1.15; // m/s — an unhurried street pace
const ATTEND_RADIUS = 4.0;
const STATION_XZ = Object.fromEntries(
  CREW_STATIONS.map((station) => [station.id, station.position]),
) as Record<CrewStation["id"], [number, number]>;

function seedOf(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
  const state = useRef({
    rng: mulberry32(seedOf(entry.member)),
    mode: "pause" as "pause" | "walk" | "attend",
    wait: 2 + idleOffset(entry.member) * 0.8, // staggered first steps across the crowd
    target: [entry.position[0], entry.position[2]] as [number, number],
    yaw: entry.rotationY,
  });

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    const px = g.position.x;
    const pz = g.position.z;

    // Attentive pause: someone walked up — stop pacing and face them (the read-only probe
    // WalkSystems publishes; absent outside walk mode, which simply keeps the wander running).
    const player = (window as unknown as Record<string, unknown>).__playerPos as
      | [number, number, number]
      | undefined;
    if (player) {
      const toPlayer = Math.hypot(player[0] - px, player[2] - pz);
      if (toPlayer < ATTEND_RADIUS) {
        s.mode = "attend";
        s.yaw = Math.atan2(player[0] - px, player[2] - pz);
      } else if (s.mode === "attend") {
        s.mode = "pause";
        s.wait = 1 + s.rng() * 3;
      }
    }

    if (s.mode === "attend" || s.mode === "pause") {
      if (gait !== "idle") setGait("idle");
      if (s.mode === "pause") {
        s.wait -= delta;
        if (s.wait <= 0) {
          const station = STATION_XZ[entry.crew];
          for (let tries = 0; tries < 8; tries++) {
            const angle = s.rng() * Math.PI * 2;
            const radius = 0.6 + s.rng() * WANDER_RADIUS;
            const tx = entry.position[0] + Math.cos(angle) * radius;
            const tz = entry.position[2] + Math.sin(angle) * radius;
            if (Math.hypot(tx - station[0], tz - station[1]) < 1.2) continue; // not into the piece
            s.target = [tx, tz];
            break;
          }
          s.mode = "walk";
          setGait("walk");
        }
      }
    } else {
      const dx = s.target[0] - px;
      const dz = s.target[1] - pz;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.08) {
        s.mode = "pause";
        s.wait = 3 + s.rng() * 6;
        setGait("idle");
      } else {
        const step = Math.min(dist, WANDER_SPEED * delta);
        g.position.x += (dx / dist) * step;
        g.position.z += (dz / dist) * step;
        s.yaw = Math.atan2(dx, dz);
      }
    }

    // smooth the turn — no snapping heads
    const turn = ((s.yaw - g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    g.rotation.y += turn * Math.min(1, delta * 6);
  });

  return (
    <group position={entry.position} ref={group} rotation-y={entry.rotationY}>
      <Suspense fallback={null}>
        <AvatarView
          animationOffset={idleOffset(entry.member)}
          config={config}
          gaitOverride={gait}
          gaitSpeed={WANDER_SPEED}
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
        // Crew on their feet wanders; leads anchor their station and sitters keep the crate.
        if (entry.role === "crew" && !entry.pose) {
          return <WanderingMember config={member.avatar} entry={entry} key={entry.member} />;
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
