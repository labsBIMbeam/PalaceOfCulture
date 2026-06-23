// Dynamic timelock preview — a small image that evolves with the lock's growth stage. Tree and Ship
// use the rendered growable previews (apple-tree / starship-stack, from assets-incoming →
// public/growables); the special tier keeps a parametric SVG crate. Stage comes from growth.ts (the
// lock's age). Used in the Home legendwall lock cards. "Art is static, state is data" — the same
// growth value selects the preview.

import type { TimelockAssetKind } from "../scene/timelockAssets";

// Three rendered stages per asset (tree: young/blossom/fruit · ship: assembling/nearly/launch-ready).
const PREVIEWS: Partial<Record<TimelockAssetKind, [string, string, string]>> = {
  tree: [
    "/growables/apple-tree_young.png",
    "/growables/apple-tree_mid.png",
    "/growables/apple-tree_full.png",
  ],
  spaceship: [
    "/growables/starship-stack_assembling.png",
    "/growables/starship-stack_nearly.png",
    "/growables/starship-stack_full.png",
  ],
};

/** Map the 0..3 growth stage onto the three preview images (stages 0–1 → early, 2 → mid, 3 → full). */
function previewIndex(stage: number): number {
  return Math.min(2, Math.max(0, Math.floor((stage * 3) / 4)));
}

/** A special (UGC) tier with no rendered asset yet — a sealed crate that brightens as it ripens. */
function SealedSprite({ stage, size }: { stage: number; size: number }) {
  const glow = 0.25 + stage * 0.25;
  return (
    <svg aria-hidden="true" height={size} role="img" viewBox="0 0 64 64" width={size}>
      <rect fill="#4b4540" height="24" rx="3" width="24" x="20" y="30" />
      <rect
        fill="none"
        height="24"
        opacity={glow}
        rx="3"
        stroke="#e7b23c"
        strokeWidth="1.8"
        width="24"
        x="20"
        y="30"
      />
      {stage >= 2 ? <polygon fill="#e7b23c" opacity={glow} points="32,18 28,27 36,27" /> : null}
      {stage >= 3 ? <circle cx="32" cy="21" fill="#e7b23c" r="2.2" /> : null}
    </svg>
  );
}

/** The evolving asset preview for a timelock — tree/ship use rendered images, special an SVG crate. */
export function GrowthSprite({
  kind,
  stage,
  size = 50,
}: {
  kind: TimelockAssetKind;
  stage: number;
  size?: number;
}) {
  const preview = PREVIEWS[kind];
  if (preview) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className="growth-img"
        height={size}
        src={preview[previewIndex(stage)]}
        width={size}
      />
    );
  }
  return <SealedSprite size={size} stage={stage} />;
}
