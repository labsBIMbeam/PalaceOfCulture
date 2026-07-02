// Placed-decoration persistence. Each room (HQ / Home) keeps its placed items as DATA — the "state
// is data" invariant. v1 stores in localStorage; the migration path is Yjs (shared room state) +
// the apps/server event log (ISO-19650 audit), so the schema stays plain + serialisable.

import type { EngineTarget } from "../frontend/types";

export interface PlacedItem {
  /** Unique instance id. */
  uid: string;
  /** Catalog def id (see furnitureCatalog.ts). */
  defId: string;
  /** World position on the deck [x, y, z]; y is the floor (0) for v1. */
  position: [number, number, number];
  /** Yaw in radians. */
  rotationY: number;
  /** Uniform scale multiplier on top of the normalised size. */
  scale: number;
  /** For frame/screen: the image/video URL shown (overrides the catalog default). */
  mediaUrl?: string;
}

const key = (target: EngineTarget) => `600b:decor:${target}`;

export function loadDecor(target: EngineTarget): PlacedItem[] {
  try {
    const raw = localStorage.getItem(key(target));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlacedItem[]) : [];
  } catch {
    return [];
  }
}

export function saveDecor(target: EngineTarget, items: PlacedItem[]): void {
  try {
    localStorage.setItem(key(target), JSON.stringify(items));
  } catch {
    // storage unavailable/full — non-fatal for the pilot
  }
}

/** Unique instance id; crypto.randomUUID where available, else a monotonic fallback. */
let counter = 0;
export function newUid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  counter += 1;
  return `d${counter}-${performance.now().toString(36)}`;
}
