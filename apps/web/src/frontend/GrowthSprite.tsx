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

/**
 * 21D Siegelfliese — a hand-painted azulejo whose pattern richens with the lock's age (the seal
 * "fires" in the kiln): stage 0-1 = bisque outline, 2 = half-glazed, 3 = full pattern + gold lustre.
 */
function TileSprite({ stage, size }: { stage: number; size: number }) {
  const glaze = stage >= 2;
  const fired = stage >= 3;
  return (
    <svg aria-hidden="true" height={size} role="img" viewBox="0 0 64 64" width={size}>
      <rect fill={glaze ? "#efe6d2" : "#d8cdb4"} height="40" rx="4" width="40" x="12" y="12" />
      <rect
        fill="none"
        height="40"
        rx="4"
        stroke="#b9814a"
        strokeWidth="2"
        width="40"
        x="12"
        y="12"
      />
      {/* seal pattern grows ring by ring */}
      <circle cx="32" cy="32" fill="none" r="13" stroke="#23806f" strokeWidth={glaze ? 2.4 : 1.2} />
      {stage >= 1 ? (
        <path
          d="M32 21 L36 32 L32 43 L28 32 Z"
          fill={glaze ? "#23806f" : "none"}
          stroke="#23806f"
          strokeWidth="1.4"
        />
      ) : null}
      {glaze ? <path d="M21 32 L32 28 L43 32 L32 36 Z" fill="#e8735a" opacity="0.85" /> : null}
      {fired ? (
        <>
          <circle cx="32" cy="32" fill="#e7b23c" r="3" />
          <circle
            cx="32"
            cy="32"
            fill="none"
            opacity="0.8"
            r="17"
            stroke="#e7b23c"
            strokeWidth="1.4"
          />
        </>
      ) : null}
    </svg>
  );
}

/**
 * Vehicle tiers assemble like the growables: wheels first, then frame, then the gold trim.
 * 2100H = motorbike (two wheels), 210D = car (four wheels + cabin).
 */
function VehicleSprite({ car, stage, size }: { car: boolean; stage: number; size: number }) {
  const frame = stage >= 1;
  const body = stage >= 2;
  const done = stage >= 3;
  const wheel = (cx: number) => (
    <g key={cx}>
      <circle cx={cx} cy="46" fill="#4b4540" r="7" />
      <circle cx={cx} cy="46" fill="none" r={done ? 4 : 2.5} stroke="#e7b23c" strokeWidth="1.6" />
    </g>
  );
  return (
    <svg aria-hidden="true" height={size} role="img" viewBox="0 0 64 64" width={size}>
      {car ? [18, 46].map(wheel) : [20, 44].map(wheel)}
      {frame ? (
        car ? (
          <path
            d="M12 44 L14 34 L24 32 L30 24 L44 24 L50 32 L52 44 Z"
            fill={body ? "#e8735a" : "none"}
            stroke="#b9814a"
            strokeWidth="2"
          />
        ) : (
          <path
            d="M20 46 L30 32 L40 34 L44 46 M30 32 L26 26 M40 34 L46 28"
            fill="none"
            stroke={body ? "#e8735a" : "#b9814a"}
            strokeLinecap="round"
            strokeWidth="3"
          />
        )
      ) : null}
      {body && car ? <rect fill="#efe6d2" height="7" rx="2" width="12" x="31" y="26" /> : null}
      {done ? <circle cx={car ? 52 : 47} cy={car ? 38 : 30} fill="#e7b23c" r="2.4" /> : null}
    </svg>
  );
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
  tier,
}: {
  kind: TimelockAssetKind;
  stage: number;
  size?: number;
  /** Disambiguates same-kind tiers (2100H motorbike vs 210D car). */
  tier?: string;
}) {
  if (kind === "tile") return <TileSprite size={size} stage={stage} />;
  if (kind === "vehicle") return <VehicleSprite car={tier === "210D"} size={size} stage={stage} />;
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
