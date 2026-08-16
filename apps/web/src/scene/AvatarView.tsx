import type { AvatarConfig } from "@600b/shared";
import type { RapierRigidBody } from "@react-three/rapier";
import { Component, type ReactNode, type RefObject, Suspense } from "react";
import { CharacterModel } from "./CharacterModel";
import { RiggedAvatar } from "./RiggedAvatar";
import { findImport } from "./avatarImports";

// Cute CC0 Quaternius preset characters (Ultimate Modular Men/Women, self-contained glTF, each with
// an "Idle" clip), picked by **gender × outfit** = the parametric quick-start. Drop more presets into
// apps/web/public/avatar/humans/ and extend the map.
//
// Note: the other traits (hair/skin/aura/age) don't drive these complete presets yet — that needs
// per-part mesh tinting/swapping (the Quaternius parts are generically named "Cube.*"); tracked for
// later (ADR 0003). For now Body + Outfit drive the avatar.
type Gender = AvatarConfig["gender"];

const WOMEN: Record<string, string> = {
  casual: "/avatar/humans/woman-casual.gltf",
  worker: "/avatar/humans/woman-worker.gltf",
  suit: "/avatar/humans/woman-suit.gltf",
  explorer: "/avatar/humans/woman-explorer.gltf",
};
const MEN: Record<string, string> = {
  casual: "/avatar/humans/man-casual.gltf",
  worker: "/avatar/humans/man-worker.gltf",
  suit: "/avatar/humans/man-suit.gltf",
  explorer: "/avatar/humans/man-explorer.gltf",
};
const PRESETS: Record<Gender, Record<string, string>> = {
  feminine: WOMEN,
  masculine: MEN,
  neutral: MEN,
};

function presetUrl(config: AvatarConfig): string {
  const set = PRESETS[config.gender];
  return set[config.outfit] ?? set.casual ?? "";
}

class AvatarAssetBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * The single switch point for the player avatar. An **imported model** (`config.modelUrl`, the
 * Meshy→rig pipeline output) wins outright; otherwise the cute Quaternius preset for the chosen
 * gender + outfit, or the procedural `CharacterModel` if none matches. `bodyRef` (the player's rapier
 * body) lets the avatar pick idle/walk/run from its speed. `locomotion={false}` (the turntable
 * preview) skips loading the walk/run clip GLBs — only the idle mesh is fetched. The Suspense
 * fallback is empty (not the blocky placeholder) so switching models doesn't flash an old shape.
 */
export function AvatarView({
  config,
  bodyRef,
  locomotion = true,
  pose,
  scanning,
  animationOffset,
  gaitOverride,
  gaitSpeed,
}: {
  config: AvatarConfig;
  bodyRef?: RefObject<RapierRigidBody | null>;
  locomotion?: boolean;
  /** Hold a cozy pose (sit/sleep) instead of speed-driven locomotion. */
  pose?: "sit" | "sleep";
  /** Build/scan context: the Builder pilot's toggleable eye scan-beams (see `scanBeamsActive`). */
  scanning?: boolean;
  /** Crowd desync: phase-shift the starting clip (see RiggedAvatar). */
  animationOffset?: number;
  /** NPC drive: force idle/walk instead of reading a physics body (see RiggedAvatar). */
  gaitOverride?: "idle" | "walk";
  /** Ground speed (m/s) the forced walk should read as. */
  gaitSpeed?: number;
}) {
  const url = config.modelUrl || presetUrl(config);
  if (!url) return <CharacterModel config={config} />;
  // Imported models carry their locomotion + pose clips in extra GLBs; a static preview skips
  // them — unless a pose is held, whose clip lives in exactly those files.
  const clipUrls = locomotion || pose ? findImport(config.modelUrl)?.clipUrls : undefined;
  return (
    <AvatarAssetBoundary fallback={<CharacterModel config={config} />} key={url}>
      <Suspense fallback={null}>
        <RiggedAvatar
          animationOffset={animationOffset}
          bodyRef={bodyRef}
          clipUrls={clipUrls}
          config={config}
          gaitOverride={gaitOverride}
          gaitSpeed={gaitSpeed}
          pose={pose}
          scanning={scanning}
          url={url}
        />
      </Suspense>
    </AvatarAssetBoundary>
  );
}
