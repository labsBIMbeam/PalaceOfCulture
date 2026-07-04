/**
 * The reserved-corner timelock shelf: a plinth holding the player's timelock assets, one slot per tier
 * (21D → 21Y, left to right). Three tiers have canonical forms — the Siegelfliese (21 days,
 * seal-patterned azulejo that also skins furniture; 3D form still to build, renders sealed for now),
 * the Tree (21 months) and the Spaceship (21 years). The two open "special" tiers (2100H/210D) are
 * team-authored assets handed to holders as content (themes open, see TIMELOCK-TIER-IDEAS.md),
 * shown here as sealed placeholders. Later those slots may also take user-created content (the
 * Roblox-style goal). Built from primitives like the character; decorative
 * for the pilot (not in the collider). Tier → form mapping lives in timelockAssets.ts. See plan / ADR 0001.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { TIER_ASSETS, TIER_ORDER, type TierAsset } from "./timelockAssets";

/** On the open plaza in front of the palace, framed as you walk out toward +z. Adjust freely. */
export const RESERVED_CORNER: [number, number, number] = [0, 0, 52];
const SHELF_SCALE = 1.2;
const SLOT_GAP = 2.6;
const ASSET_LIFT = 0.4; // sit on top of the plinth

function Plinth({ width }: { width: number }) {
  return (
    <mesh castShadow position={[0, 0.2, 0]} receiveShadow>
      <boxGeometry args={[width, 0.4, 3]} />
      <meshStandardMaterial color="#6e6e73" roughness={0.92} />
    </mesh>
  );
}

const CANOPY: Array<{ p: [number, number, number]; r: number; c: string }> = [
  { p: [0, 3.3, 0], r: 1.55, c: "#23806f" },
  { p: [-1.05, 2.85, 0.4], r: 1.15, c: "#1f6b62" },
  { p: [1.0, 2.95, -0.35], r: 1.2, c: "#2b9079" },
  { p: [0.25, 4.25, 0.15], r: 1.05, c: "#2bd07a" },
  { p: [-0.45, 3.95, -0.55], r: 0.9, c: "#23806f" },
  { p: [0.6, 3.55, 0.7], r: 0.85, c: "#2b9079" },
];

/** 21 months — the Tree ("let it grow"). Gold annual-ring base = the Ringed Oak motif. */
function Tree() {
  return (
    <group>
      <mesh position={[0, 0.08, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.95, 0.11, 14, 40]} />
        <meshStandardMaterial
          color="#e7b23c"
          emissive="#e7b23c"
          emissiveIntensity={0.3}
          metalness={0.5}
          roughness={0.35}
        />
      </mesh>
      <mesh castShadow position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.18, 0.34, 2.4, 14]} />
        <meshStandardMaterial color="#5a3d22" roughness={0.95} />
      </mesh>
      {[1, -1].map((dir) => (
        <mesh castShadow key={dir} position={[dir * 0.45, 2.1, 0]} rotation={[0, 0, dir * 0.7]}>
          <cylinderGeometry args={[0.08, 0.14, 1.1, 8]} />
          <meshStandardMaterial color="#5a3d22" roughness={0.95} />
        </mesh>
      ))}
      {CANOPY.map((clump, index) => (
        <mesh castShadow key={`${clump.c}-${index}`} position={clump.p}>
          <icosahedronGeometry args={[clump.r, 1]} />
          <meshStandardMaterial color={clump.c} flatShading roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** 21 years — the 21-year Spaceship ("time builds legend"). Nose + wings carry the player's aura. */
function Spaceship({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.18, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.62, 0.12, 12, 30]} />
        <meshStandardMaterial
          color="#e8704f"
          emissive="#f08a55"
          emissiveIntensity={0.9}
          roughness={0.4}
        />
      </mesh>
      <mesh castShadow position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.5, 0.78, 1.7, 24]} />
        <meshStandardMaterial color="#e9e2d2" metalness={0.35} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 2.35, 0]}>
        <cylinderGeometry args={[0.34, 0.5, 1.2, 24]} />
        <meshStandardMaterial color="#f4eedd" metalness={0.35} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 3.5, 0]}>
        <coneGeometry args={[0.34, 1.3, 24]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.25}
          metalness={0.4}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 2.55, 0.34]}>
        <sphereGeometry args={[0.3, 18, 14]} />
        <meshStandardMaterial
          color="#2a3a4a"
          emissive="#9fd0ff"
          emissiveIntensity={0.35}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
      {[0, 1, 2].map((index) => {
        const angle = (index * Math.PI * 2) / 3;
        return (
          <mesh
            castShadow
            key={angle}
            position={[Math.sin(angle) * 0.62, 0.85, Math.cos(angle) * 0.62]}
            rotation={[0.35, -angle, 0]}
          >
            <boxGeometry args={[0.09, 1.3, 0.85]} />
            <meshStandardMaterial color={accent} metalness={0.35} roughness={0.45} />
          </mesh>
        );
      })}
      {[0, 1, 2].map((index) => {
        const angle = (index * Math.PI * 2) / 3 + Math.PI / 3;
        return (
          <mesh
            key={`n-${angle}`}
            position={[Math.sin(angle) * 0.32, 0.16, Math.cos(angle) * 0.32]}
            rotation-x={Math.PI}
          >
            <coneGeometry args={[0.16, 0.4, 12]} />
            <meshStandardMaterial color="#3a3a40" metalness={0.6} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

/** A special (UGC) tier with no form yet — a sealed crate with the player's accent seam; "yours to fill". */
function SealedSlot({ accent }: { accent: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[1.1, 1.1, 1.1]} />
        <meshStandardMaterial color="#4b4540" metalness={0.2} roughness={0.85} />
      </mesh>
      {/* accent seam ring on top — the seal */}
      <mesh position={[0, 1.27, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.52, 0.06, 10, 28]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.5}
          roughness={0.4}
        />
      </mesh>
      {/* floating accent shard — "something will grow here" */}
      <mesh position={[0, 1.95, 0]} rotation={[0.4, 0.4, 0]}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function TierAssetMesh({ asset, accent }: { asset: TierAsset; accent: string }) {
  return (
    <group position={[0, ASSET_LIFT, 0]}>
      {asset.kind === "tree" ? (
        <Tree />
      ) : asset.kind === "spaceship" ? (
        <Spaceship accent={accent} />
      ) : (
        <SealedSlot accent={accent} />
      )}
    </group>
  );
}

/**
 * A Tree that GROWS IN 3D — scales from a sprout to a full oak by the lock's progress (0..1), easing in
 * on mount so entering your plot shows it grow. The personal hero timelock asset standing in the Home
 * world (the Tamagotchi made physical — concept §, BUILD-BRIEF §6.14). Cosmetic, never a signal.
 */
export function GrowingTree({
  progress,
  position,
}: {
  progress: number;
  position: [number, number, number];
}) {
  const ref = useRef<Group>(null);
  const target = 0.5 + Math.max(0, Math.min(1, progress)) * 1.8;
  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const next = group.scale.x + (target - group.scale.x) * Math.min(1, delta * 1.4);
    group.scale.setScalar(next);
  });
  return (
    <group position={position} ref={ref} scale={0.06}>
      <Tree />
    </group>
  );
}

/** The reserved-corner shelf: a plinth + one slot per timelock tier (21D → 21Y), on the plaza. */
export function PlotAssets({ accent }: { accent: string }) {
  const start = -((TIER_ORDER.length - 1) * SLOT_GAP) / 2;
  const width = (TIER_ORDER.length - 1) * SLOT_GAP + 2.4;
  return (
    <group position={RESERVED_CORNER} scale={SHELF_SCALE}>
      <Plinth width={width} />
      {TIER_ORDER.map((tier, index) => (
        <group key={tier} position={[start + index * SLOT_GAP, 0, 0]}>
          <TierAssetMesh accent={accent} asset={TIER_ASSETS[tier]} />
        </group>
      ))}
    </group>
  );
}
