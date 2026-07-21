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

export const DEFAULT_FRAME_IMAGE = "/frontend/bg/home.webp";
export const DEFAULT_SCREEN_VIDEO = "/intro.mp4";

export const CATALOG: DecorDef[] = [
  // KayKit Furniture Bits 1.0 — curated, self-contained CC0 GLBs. Stable legacy ids remain so
  // existing locally saved rooms keep loading after the placeholder furniture is replaced.
  {
    id: "chair-1",
    label: "Workshop Chair",
    kind: "model",
    url: "/furniture/chair_A_wood.glb",
    pose: "sit",
    glyph: "🪑",
  },
  {
    id: "chair-2",
    label: "Wooden Stool",
    kind: "model",
    url: "/furniture/chair_stool_wood.glb",
    pose: "sit",
    glyph: "🪑",
  },
  {
    id: "chair-3",
    label: "Cushioned Armchair",
    kind: "model",
    url: "/furniture/armchair_pillows.glb",
    pose: "sit",
    glyph: "🛋",
  },
  {
    id: "sofa-1",
    label: "Pillow Sofa",
    kind: "model",
    url: "/furniture/couch_pillows.glb",
    pose: "sit",
    glyph: "🛋",
  },
  {
    id: "table-1",
    label: "Low Coffee Table",
    kind: "model",
    url: "/furniture/table_low.glb",
    glyph: "▭",
  },
  {
    id: "table-2",
    label: "Round Work Table",
    kind: "model",
    url: "/furniture/table_medium.glb",
    glyph: "◯",
  },
  {
    id: "table-3",
    label: "Long Dining Table",
    kind: "model",
    url: "/furniture/table_medium_long.glb",
    glyph: "▬",
  },
  {
    id: "table-4",
    label: "Side Table",
    kind: "model",
    url: "/furniture/table_small.glb",
    glyph: "▪",
  },
  {
    id: "shelf-1",
    label: "Workshop Shelf",
    kind: "model",
    url: "/furniture/shelf_B_large_decorated.glb",
    glyph: "▤",
  },
  {
    id: "cabinet-1",
    label: "Supply Cabinet",
    kind: "model",
    url: "/furniture/cabinet_medium_decorated.glb",
    glyph: "▥",
  },
  {
    id: "lamp-1",
    label: "Table Lamp",
    kind: "model",
    url: "/furniture/lamp_table.glb",
    glyph: "💡",
  },
  {
    id: "lamp-2",
    label: "Standing Lamp",
    kind: "model",
    url: "/furniture/lamp_standing.glb",
    glyph: "💡",
  },
  {
    id: "rug-1",
    label: "Striped Rug",
    kind: "model",
    url: "/furniture/rug_rectangle_stripes_A.glb",
    glyph: "▧",
  },
  {
    id: "plant-1",
    label: "Street Cactus",
    kind: "model",
    url: "/furniture/cactus_medium_A.glb",
    glyph: "🌵",
  },
  {
    id: "books-1",
    label: "Book Stack",
    kind: "model",
    url: "/furniture/book_set.glb",
    glyph: "📚",
  },
  {
    id: "bed-1",
    label: "Single Bed",
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
