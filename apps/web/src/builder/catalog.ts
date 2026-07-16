// The homebuilder content catalog — a 1:1 port of godot/scripts/catalog.gd (module contract in
// godot/ARCHITECTURE.md). Static data only, no runtime state. Materials drip with real time
// (no farming); refined materials (boards) come only from processing recipes. Craft times are
// month-scale on purpose — ultra-low time preference is the design law, DRIP_PER_MINUTE is THE
// balancing knob. Touch nothing else.

export const COLOR_CREAM = "#efe6d2";
export const COLOR_GOLD = "#e7b23c";
export const COLOR_TEAL = "#23806f";
export const COLOR_CORAL = "#e8735a";
export const COLOR_STONEBLOCK = "#c5beac"; // stone-grey-cream block look
export const COLOR_BOARDS = "#b9814a"; // warm wood look (boards + board blocks)
export const COLOR_GLASS = "#bfe3ef"; // window pane
export const COLOR_ROOF = "#b05a3c"; // terracotta shingle

const HOUR = 3600;
const DAY = 86400;

/** Units per MINUTE (≈21.6 wood / 10.8 stone a DAY). THE balancing knob — touch nothing else. */
export const DRIP_PER_MINUTE: Record<string, number> = { wood: 0.015, stone: 0.0075 };
/** Finite local-stock targets. Passive collection and processing stop when storage is full. */
export const MATERIAL_CAPS: Record<string, number> = { wood: 100, stone: 80, boards: 100 };
/** Move-in condition hold time (24 h, wall clock — never timescaled). */
export const ATTRACTION_SUSTAIN_SEC = 86400;

export interface MaterialDef {
  display: string;
  color: string;
}

/** wood + stone = raw (drip); boards = refined (milled from wood, no drip entry). */
export const MATERIALS: Record<string, MaterialDef> = {
  wood: { display: "Wood", color: COLOR_GOLD },
  stone: { display: "Stone", color: COLOR_TEAL },
  boards: { display: "Boards", color: COLOR_BOARDS },
};

export type ObjectKind = "block" | "furniture";

/** Grid-cell modules: plain cube, glass window (solid), walk-through door, sloped roof wedge. */
export type BlockShape = "cube" | "window" | "door" | "roof";

export interface ObjectDef {
  display: string;
  kind: ObjectKind;
  color: string;
  /** Blocks only — how the 1x1x1 cell renders and collides. Undefined = plain cube. */
  shape?: BlockShape;
  /** Metres, furniture only. Blocks are 1x1x1 grid cells. */
  size?: [number, number, number];
  /** {} or {material_id: multiplier} — placed specialty boosts the drip. */
  specialty: Record<string, number>;
  /** true = arrives via move-in attraction, never bought/crafted directly. */
  attracts: boolean;
}

/** Insertion order = hotbar order (blocks first). */
export const OBJECTS: Record<string, ObjectDef> = {
  block_stone: {
    display: "Stone Block",
    kind: "block",
    color: COLOR_STONEBLOCK,
    specialty: {},
    attracts: false,
  },
  block_boards: {
    display: "Board Block",
    kind: "block",
    color: COLOR_BOARDS,
    specialty: {},
    attracts: false,
  },
  block_window: {
    display: "Window",
    kind: "block",
    shape: "window",
    color: COLOR_GLASS,
    specialty: {},
    attracts: false,
  },
  block_door: {
    display: "Door",
    kind: "block",
    shape: "door",
    color: COLOR_BOARDS,
    specialty: {},
    attracts: false,
  },
  block_roof: {
    display: "Roof",
    kind: "block",
    shape: "roof",
    color: COLOR_ROOF,
    specialty: {},
    attracts: false,
  },
  stool: {
    display: "Stool",
    kind: "furniture",
    color: COLOR_GOLD,
    size: [0.6, 0.5, 0.6],
    specialty: {},
    attracts: false,
  },
  lantern: {
    display: "Lantern",
    kind: "furniture",
    color: COLOR_CORAL,
    size: [0.4, 1.4, 0.4],
    specialty: {},
    attracts: false,
  },
  sawbench: {
    display: "Sawbench (Chop)",
    kind: "furniture",
    color: COLOR_BOARDS,
    size: [1.6, 1.0, 0.8],
    specialty: { wood: 1.5 },
    attracts: false,
  },
  kiln: {
    display: "Kiln",
    kind: "furniture",
    color: COLOR_TEAL,
    size: [1.2, 1.5, 1.2],
    specialty: { stone: 1.5 },
    attracts: false,
  },
  fountain: {
    display: "Fountain",
    kind: "furniture",
    color: COLOR_TEAL,
    size: [2.4, 1.6, 2.4],
    specialty: {},
    attracts: true,
  },
};

export interface RecipeDef {
  display: string;
  /** An OBJECTS id (crafting) or a MATERIALS id (processing, e.g. mill_boards). */
  outputId: string;
  outputCount: number;
  cost: Record<string, number>;
  seconds: number;
}

/** Craft times are EXTREMELY slow on purpose — the wait is what makes a piece worthy Palace decor. */
export const RECIPES: Record<string, RecipeDef> = {
  mill_boards: {
    display: "Boards x50 (Chop)",
    outputId: "boards",
    outputCount: 50,
    cost: { wood: 10 },
    seconds: 21 * HOUR,
  },
  craft_block_stone: {
    display: "Stone Blocks x9",
    outputId: "block_stone",
    outputCount: 9,
    cost: { stone: 9 },
    seconds: 2.1 * HOUR,
  },
  craft_block_boards: {
    display: "Board Blocks x9",
    outputId: "block_boards",
    outputCount: 9,
    cost: { boards: 9 },
    seconds: 2.1 * HOUR,
  },
  craft_block_window: {
    display: "Windows x4",
    outputId: "block_window",
    outputCount: 4,
    cost: { boards: 4, stone: 2 },
    seconds: 4.2 * HOUR,
  },
  craft_block_door: {
    display: "Door",
    outputId: "block_door",
    outputCount: 1,
    cost: { boards: 6 },
    seconds: 21 * HOUR,
  },
  craft_block_roof: {
    display: "Roof Wedges x9",
    outputId: "block_roof",
    outputCount: 9,
    cost: { boards: 6, stone: 3 },
    seconds: 4.2 * HOUR,
  },
  craft_stool: {
    display: "Stool",
    outputId: "stool",
    outputCount: 1,
    cost: { wood: 5 },
    seconds: 21 * DAY,
  },
  craft_lantern: {
    display: "Lantern",
    outputId: "lantern",
    outputCount: 1,
    cost: { boards: 2, stone: 2 },
    seconds: 210 * HOUR,
  },
  craft_sawbench: {
    display: "Sawbench (Chop)",
    outputId: "sawbench",
    outputCount: 1,
    cost: { wood: 8 },
    seconds: 2.1 * DAY,
  },
  craft_kiln: {
    display: "Kiln",
    outputId: "kiln",
    outputCount: 1,
    cost: { stone: 10 },
    seconds: 2.1 * DAY,
  },
  craft_fountain: {
    display: "Fountain",
    outputId: "fountain",
    outputCount: 1,
    cost: { stone: 12, boards: 6 },
    seconds: 42 * DAY,
  },
};

export function getObject(id: string): ObjectDef | undefined {
  return OBJECTS[id];
}

export function getRecipe(id: string): RecipeDef | undefined {
  return RECIPES[id];
}

/** Returns a material amount inside its authored finite stock boundary. */
export function clampMaterial(id: string, amount: number): number {
  return Math.min(MATERIAL_CAPS[id] ?? 0, Math.max(0, amount));
}

export function recipeIds(): string[] {
  return Object.keys(RECIPES);
}

export function blockIds(): string[] {
  return Object.entries(OBJECTS)
    .filter(([, def]) => def.kind === "block")
    .map(([id]) => id);
}

// --- inventory pockets (Pokémon-style: every object sorts into exactly one pocket) ---

export type PocketId = "blocks" | "openings" | "roofs" | "furniture";

/** Pocket display order + labels — the inventory panel renders them in this order. */
export const POCKETS: Array<{ id: PocketId; label: string }> = [
  { id: "blocks", label: "Blocks" },
  { id: "openings", label: "Openings" },
  { id: "roofs", label: "Roofs" },
  { id: "furniture", label: "Furniture" },
];

/** Which pocket an object sorts into (derived — no per-object bookkeeping to forget). */
export function pocketOf(id: string): PocketId {
  const def = OBJECTS[id];
  if (!def || def.kind === "furniture") return "furniture";
  if (def.shape === "window" || def.shape === "door") return "openings";
  if (def.shape === "roof") return "roofs";
  return "blocks";
}

/** Object ids in the given pocket, in catalog (insertion) order. */
export function pocketObjectIds(pocket: PocketId): string[] {
  return Object.keys(OBJECTS).filter((id) => pocketOf(id) === pocket);
}

export function furnitureIds(): string[] {
  return Object.entries(OBJECTS)
    .filter(([, def]) => def.kind === "furniture")
    .map(([id]) => id);
}

/** Renders durations as `21d 4h` / `3h 12m` / `04:32` (ARCHITECTURE.md display contract). */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s >= DAY) {
    const days = Math.floor(s / DAY);
    const hours = Math.round((s % DAY) / HOUR);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (s >= HOUR) {
    const hours = Math.floor(s / HOUR);
    const minutes = Math.round((s % HOUR) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const minutes = Math.floor(s / 60);
  const rest = s % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
