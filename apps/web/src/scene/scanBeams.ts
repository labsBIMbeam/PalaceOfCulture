import { importUrl } from "./avatarImports";

/**
 * The gate for the Builder pilot's laser scan-beams. The beams are a scene effect layered onto the
 * beam-free core GLB (the preview/beam GLB variant never ships) and they are a *tool light*, not a
 * costume: on only while actually building/scanning — decorate (walk + build overlay) or build (the
 * homebuilder magnet) — only on the Builder archetype, and always toggleable off by the player.
 */
export type ScanMode = "orbit" | "walk" | "decorate" | "build";

export function scanBeamsActive({
  modelUrl,
  mode,
  enabled,
}: {
  modelUrl?: string;
  mode: ScanMode;
  enabled: boolean;
}): boolean {
  if (!enabled) return false;
  if (modelUrl !== importUrl("builder")) return false;
  return mode === "decorate" || mode === "build";
}
