// The canonical tier → timelock-asset map: what a locked sat grows into, fixed by HOW LONG it's locked.
//
// Ladder (2026-07: 210 months was retired for 2100 HOURS ≈ 87.5 days — the 21-numerology stays,
// 2100 = 21×100, and the gap it fills sits between 21 days and 210 days, not next to the Spaceship):
// 21D → 2100H → 210D → 21M → 21Y.
//
// Three tiers have canonical forms: 21 days = the SIEGELFLIESE (Seal Tile) — a hand-painted azulejo
// whose pattern is generated from the lock's seal data; wall decor AND a colour/texture source that
// can skin furniture ("fired by time, not bought"). 21 months = the Tree ("let it grow"). 21 years =
// the 21-year Spaceship ("time builds legend"). The two open tiers (2100H, 210D) are SPECIAL assets —
// team-authored, handed to holders as content; leading candidates in 04-design/TIMELOCK-TIER-IDEAS.md
// (the Gefährte companion et al.). User-created content (Roblox-style) is the longer-term goal layered
// on later. "Art is static, state is data": whichever way, the chosen asset is data on the seal,
// signed into the ownership chain. Open tiers render as sealed placeholders.

export type TimelockTier = "21D" | "2100H" | "210D" | "21M" | "21Y";
export type TimelockAssetKind = "tree" | "spaceship" | "tile" | "special";

export interface TierAsset {
  tier: TimelockTier;
  kind: TimelockAssetKind;
  /** Short in-world name. */
  label: string;
  /** One-line meaning (shown on the legendwall / hover). */
  blurb: string;
  /** A fixed canonical form (tile/tree/spaceship), or a player-defined UGC slot. */
  fixed: boolean;
}

/** Ordered shortest → longest lock — matches `timelockTiers` in frontend/data. */
export const TIER_ORDER: TimelockTier[] = ["21D", "2100H", "210D", "21M", "21Y"];

export const TIER_ASSETS: Record<TimelockTier, TierAsset> = {
  "21D": {
    tier: "21D",
    kind: "tile",
    label: "Siegelfliese",
    blurb: "21 days — the Seal Tile. Fired by time, not bought; its pattern skins furniture too.",
    fixed: true,
  },
  "2100H": {
    tier: "2100H",
    kind: "special",
    label: "2100-hour asset",
    blurb: "2100 hours — a special asset (coming)",
    fixed: false,
  },
  "210D": {
    tier: "210D",
    kind: "special",
    label: "210-day relic",
    blurb: "210 days — a special asset (coming)",
    fixed: false,
  },
  "21M": {
    tier: "21M",
    kind: "tree",
    label: "Tree",
    blurb: "21 months — the Tree. Let it grow.",
    fixed: true,
  },
  "21Y": {
    tier: "21Y",
    kind: "spaceship",
    label: "Spaceship",
    blurb: "21 years — the 21-year Spaceship. Time builds legend.",
    fixed: true,
  },
};
