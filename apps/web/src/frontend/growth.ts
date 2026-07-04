// Timelock growth — the Tamagotchi mechanic. An asset's visible stage is driven by HOW LONG its lock
// has run (days locked vs the tier target). Canon: "sapling → full tree; bare frame → launch-ready
// ship" (concept §, BUILD-BRIEF §6.14 — growth is cosmetic, never a financial signal). The reference
// care-loop is claude-code-tamagotchi (MIT). Stage feeds both the 2D sprite (Home) and the 3D asset.

import { TIER_ASSETS, type TimelockAssetKind, type TimelockTier } from "../scene/timelockAssets";
import type { Timelock } from "./types";

/** Approx. days each tier locks for — the denominator for "how grown is it". */
const TIER_DAYS: Record<TimelockTier, number> = {
  "21D": 21,
  "2100H": 87.5, // 2100 hours
  "210D": 210,
  "21M": 639, // 21 months
  "21Y": 7670, // 21 years
};

/** Number of growth stages (0 = seed/parts … GROWTH_STAGES-1 = fully grown). */
export const GROWTH_STAGES = 4;

/** Progress 0..1 of a lock toward its tier target (by days locked). A sealed lock is fully grown. */
export function lockProgress(lock: Timelock): number {
  if (lock.status === "sealed") return 1;
  const target = TIER_DAYS[lock.tier as TimelockTier] ?? (lock.daysLocked || 1);
  return Math.max(0, Math.min(1, lock.daysLocked / target));
}

/** Growth stage 0..GROWTH_STAGES-1 from the lock's age — the Tamagotchi stage. */
export function growthStage(lock: Timelock): number {
  return Math.max(0, Math.min(GROWTH_STAGES - 1, Math.floor(lockProgress(lock) * GROWTH_STAGES)));
}

/** What this tier grows into (tree / spaceship / special) — from the canonical tier→asset map. */
export function kindForTier(tier: string): TimelockAssetKind {
  return TIER_ASSETS[tier as TimelockTier]?.kind ?? "special";
}
