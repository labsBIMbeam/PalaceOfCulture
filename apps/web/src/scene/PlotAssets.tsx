/**
 * The palace plaza assets. The two grown timelock heroes are rendered GLB growables (assets-incoming):
 * the apple Tree (21 months) centred in front of the palace, and the Starship-stack Rocket (21 years)
 * as a 210 m giant set far back with room to tower. The "special" tiers (21D/210D/210M) are sealed
 * placeholder crates lining one side of the central street. Decorative (not in the collider). Tier →
 * form mapping lives in timelockAssets.ts. See plan / ADR 0001.
 */

import { useMemo } from "react";
import { GrowableObject } from "./GrowableObject";
import { stoneTexture } from "./stoneTextures";
import { TIER_ASSETS, TIER_ORDER } from "./timelockAssets";

const ASSET_LIFT = 0.4; // sit on top of the plinth

// The rendered growable assets (from assets-incoming → public/growables).
const GROWABLES = {
  tree: {
    glb: "/growables/apple-tree.glb",
    manifest: "/growables/apple-tree.growth.json",
    height: 3, // the personal Home tree
  },
  spaceship: {
    glb: "/growables/starship-stack.glb",
    manifest: "/growables/starship-stack.growth.json",
  },
} as const;

// Palace plaza layout (player exits the palace at +z and looks out across the plaza). The Tree is the
// centred hero right in front; the Rocket is a 210 m giant set far back so it has room to tower; the
// timelock placeholder crates line one side of the central street.
const TREE_POS: [number, number, number] = [0, 0, 60];
const TREE_HEIGHT = 5;
const ROCKET_POS: [number, number, number] = [0, 0, 230];
const ROCKET_HEIGHT = 210;
const CRATE_BASE: [number, number, number] = [46, 0, 66];
const CRATE_GAP = 3.2;

function Plinth({ width }: { width: number }) {
  return (
    <mesh castShadow position={[0, 0.2, 0]} receiveShadow>
      <boxGeometry args={[width, 0.4, 3]} />
      <meshStandardMaterial color="#6e6e73" roughness={0.92} />
    </mesh>
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

/** A large ground plane so assets out past the palace deck stand on visible earth, not sky. */
function Ground() {
  const tex = useMemo(() => {
    const t = stoneTexture("#d9c6a0", { bands: true });
    t.repeat.set(50, 56);
    return t;
  }, []);
  return (
    <mesh position={[0, -0.05, 70]} receiveShadow rotation-x={-Math.PI / 2}>
      <planeGeometry args={[560, 620]} />
      <meshStandardMaterial color="#ffffff" map={tex} roughness={1} />
    </mesh>
  );
}

/** The central street — a path out to the rocket and the ring street behind the palace. */
function CentralStreet() {
  return (
    <>
      <mesh position={[0, -0.02, 150]} receiveShadow rotation-x={-Math.PI / 2}>
        <planeGeometry args={[12, 230]} />
        <meshStandardMaterial color="#6b6258" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.02, -140]} receiveShadow rotation-x={-Math.PI / 2}>
        <planeGeometry args={[12, 200]} />
        <meshStandardMaterial color="#6b6258" roughness={0.95} />
      </mesh>
    </>
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
  return (
    <group position={position}>
      <GrowableObject
        fitHeight={GROWABLES.tree.height}
        glbUrl={GROWABLES.tree.glb}
        manifestUrl={GROWABLES.tree.manifest}
        progress={progress}
      />
    </group>
  );
}

/**
 * The palace plaza: the Tree centred in front, the 210 m Rocket towering far back with room to breathe,
 * and the timelock placeholder crates (the "special" tiers) in a row lining one side of the street.
 */
export function PlotAssets({ accent }: { accent: string }) {
  const specials = TIER_ORDER.filter((tier) => TIER_ASSETS[tier].kind === "special");
  return (
    <>
      <Ground />
      <CentralStreet />
      <group position={TREE_POS}>
        <GrowableObject
          fitHeight={TREE_HEIGHT}
          glbUrl={GROWABLES.tree.glb}
          manifestUrl={GROWABLES.tree.manifest}
          progress={1}
        />
      </group>
      <group position={ROCKET_POS}>
        <GrowableObject
          fitHeight={ROCKET_HEIGHT}
          glbUrl={GROWABLES.spaceship.glb}
          manifestUrl={GROWABLES.spaceship.manifest}
          progress={1}
        />
      </group>
      <group position={CRATE_BASE}>
        <Plinth width={(specials.length - 1) * CRATE_GAP + 2.2} />
        {specials.map((tier, index) => (
          <group
            key={tier}
            position={[(index - (specials.length - 1) / 2) * CRATE_GAP, ASSET_LIFT, 0]}
          >
            <SealedSlot accent={accent} />
          </group>
        ))}
      </group>
    </>
  );
}
