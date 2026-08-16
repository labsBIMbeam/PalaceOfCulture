// The mentor crews in the world: 31 static member avatars clustered at the five affinity
// stations, plus the Set-1 signature piece per station as an MVP primitive (a real Meshy prop
// slots in with the 21-day set cadence without touching this file's layout). NPCs are static
// presences, not room players â€” a live member walking the street appears additionally, and that
// is fine and funny. `locomotion={false}` keeps them on their baked idle without fetching the
// walk/run/pose clip GLBs, so the whole cast costs 31 idle meshes and nothing else.

import { Suspense } from "react";
import { MEMBERS } from "../ui/members";
import { AvatarView } from "./AvatarView";
import { CREW_STATIONS, type CrewStation, STREET_CAST } from "./streetCast";

const MEMBER_BY_NAME = new Map(MEMBERS.map((member) => [member.name, member]));

const STEEL = "#2a2c31";
const TIMBER = "#6b4a2e";

/** Signal â€” a guyed antenna mast with two crossbars and a violet tip light. */
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

/** Bitcoin â€” a humming node rack: stacked units with an orange LED strip. */
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

/** Keys â€” a timber key cabinet, drawers shut, one warm cream keyhole glow. */
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

/** Power â€” a tilted solar panel on a timber A-frame, cells glinting gold. */
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

/** Timelock â€” the block clock: a slab with a teal display that the crew keeps quiet around. */
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
        return (
          <group key={entry.member} position={entry.position} rotation-y={entry.rotationY}>
            <Suspense fallback={null}>
              <AvatarView config={member.avatar} locomotion={false} />
            </Suspense>
          </group>
        );
      })}
    </group>
  );
}
