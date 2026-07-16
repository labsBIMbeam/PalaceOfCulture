// The decoration catalog — the objects a player can place to decorate the Palace of Culture (the
// shared, interactive chat room). Three kinds:
//   - "model"  : a CC0 GLB (Kenney / Quaternius) under /public/furniture, normalised at load time.
//   - "frame"  : a picture frame whose image is data (a URL) — drei <Image>.
//   - "screen" : a video screen whose clip is data (a URL) — drei useVideoTexture.
//
// "Art is static, state is data": the geometry/material is a fixed file; what is placed — and which
// image/video a frame/screen shows — is data, persisted per room (see decorStore.ts). The same
// model slots can later take user-uploaded GLBs (the Roblox-style goal), gated by perf/validation.
// CC0 sources + attribution: /public/furniture/CREDITS.md.

export type DecorKind = "model" | "frame" | "screen";

export interface DecorDef {
  id: string;
  label: string;
  kind: DecorKind;
  /** GLB path for kind "model". */
  url?: string;
  /**
   * Per-asset scale correction (kind "model"). The CC0 Kenney/Quaternius models are authored in real
   * metres, so most need none (1); only outliers modelled at a different scale get a factor.
   */
  modelScale?: number;
  /** Default media URL for kind "frame" (image) / "screen" (video). */
  defaultMedia?: string;
  /**
   * If set, the avatar can use this piece: walk up, press E, and hold the pose. "sit" for chairs,
   * "sleep" for beds. The pose clip plays if present on the rig, else idle (placeholder).
   */
  pose?: "sit" | "sleep";
  /** Short glyph shown on the picker tile. */
  glyph: string;
}

export const DEFAULT_FRAME_IMAGE = "/frontend/bg/home.png";
export const DEFAULT_SCREEN_VIDEO = "/intro.mp4";

export const CATALOG: DecorDef[] = [
  // Heights as authored (m): chair-1 0.61, chair-2 0.46, table-1 0.33, lamp-1 0.86 — already sensible.
  // chair-3 ships oversized (1.36 tall / 1.64 wide), so it gets a correction.
  {
    id: "chair-1",
    label: "Wooden Chair",
    kind: "model",
    url: "/furniture/chair-1.glb",
    pose: "sit",
    glyph: "🪑",
  },
  {
    id: "chair-2",
    label: "Low Stool",
    kind: "model",
    url: "/furniture/chair-2.glb",
    pose: "sit",
    glyph: "🪑",
  },
  {
    id: "chair-3",
    label: "Lounge Chair",
    kind: "model",
    url: "/furniture/chair-3.glb",
    modelScale: 0.62,
    pose: "sit",
    glyph: "🪑",
  },
  {
    id: "table-1",
    label: "Coffee Table",
    kind: "model",
    url: "/furniture/table-1.glb",
    glyph: "▭",
  },
  { id: "lamp-1", label: "Lamp", kind: "model", url: "/furniture/lamp-1.glb", glyph: "💡" },
  {
    id: "bed-1",
    label: "Bed",
    kind: "model",
    url: "/furniture/bed_single_A.glb",
    modelScale: 0.5,
    pose: "sleep",
    glyph: "🛏",
  },
  {
    id: "frame",
    label: "Picture Frame",
    kind: "frame",
    defaultMedia: DEFAULT_FRAME_IMAGE,
    glyph: "🖼",
  },
  {
    id: "screen",
    label: "Video Screen",
    kind: "screen",
    defaultMedia: DEFAULT_SCREEN_VIDEO,
    glyph: "▶",
  },
];

export function defById(id: string): DecorDef | undefined {
  return CATALOG.find((def) => def.id === id);
}
