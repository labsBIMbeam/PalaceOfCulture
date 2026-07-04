// The canonical tier → timelock-asset map: what a locked sat grows into, fixed by HOW LONG it's locked.
//
// Ladder (2026-07: 210 months retired for 2100 HOURS ≈ 87.5 days — 2100 = 21×100, the numerology
// stays): 21D → 2100H → 210D → 21M → 21Y. All five tiers now have canonical FIRST forms:
//
//   21D   = SIEGELFLIESE — hand-painted azulejo, pattern generated from the seal data; wall decor
//           AND a colour/texture source that skins furniture ("fired by time, not bought").
//   2100H = MOTORBIKE — your first wheels, earned not given. Vehicle ladder rung 1.
//   210D  = CAR — seven months of patience for four wheels. Vehicle ladder rung 2.
//   21M   = the TREE ("let it grow").
//   21Y   = the 21-year SPACESHIP ("time builds legend").
//
// REPEAT LOCKS deepen a line (the collection meta): repeat 21D = more tile patterns (mosaic wall);
// repeat 210D = the COMPANION line — the first companion is racooDNI himself, who moves in with you;
// repeat 21M = the big vehicles, in order Boat → Heli → Yacht (fills the prestige space between Tree
// and Spaceship: a yacht owner has locked 21 months four times, and everyone can read that).
// Zeppelin was cut. Vehicles are parade floats, never getaway cars (design brief).
//
// User-created content (Roblox-style) is the longer-term goal layered on later. "Art is static,
// state is data": the chosen asset is data on the seal, signed into the ownership chain. Forms not
// yet modelled render as sealed placeholders.

export type TimelockTier = "21D" | "2100H" | "210D" | "21M" | "21Y";
export type TimelockAssetKind = "tree" | "spaceship" | "tile" | "vehicle" | "special";

export interface TierAsset {
  tier: TimelockTier;
  kind: TimelockAssetKind;
  /** Short in-world name. */
  label: string;
  /** One-line meaning (shown on the legendwall / hover). */
  blurb: string;
  /** A fixed canonical form, or a player-defined UGC slot. */
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
    kind: "vehicle",
    label: "Motorbike",
    blurb: "2100 hours — your first wheels. Earned, not given.",
    fixed: true,
  },
  "210D": {
    tier: "210D",
    kind: "vehicle",
    label: "Car",
    blurb: "210 days — four wheels for seven months of patience. Repeat locks bring companions.",
    fixed: true,
  },
  "21M": {
    tier: "21M",
    kind: "tree",
    label: "Tree",
    blurb: "21 months — the Tree. Let it grow. Repeat locks launch Boat, Heli, Yacht.",
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

/** Repeat-lock lines: locking the same tier again advances its collection line. */
export const REPEAT_LINES: Partial<Record<TimelockTier, string[]>> = {
  // Every 21D lock mints a fresh tile pattern — the mosaic wall is the collection itself.
  "210D": ["racooDNI"], // first companion: the raccoon moves in with you; more companions later
  "21M": ["Boat", "Heli", "Yacht"], // big vehicles, in this order, after the first lock's Tree
};
