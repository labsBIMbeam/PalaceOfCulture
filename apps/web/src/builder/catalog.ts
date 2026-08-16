// The homebuilder content catalog — a 1:1 port of godot/scripts/catalog.gd (module contract in
// godot/ARCHITECTURE.md). Static data only, no runtime state. Materials drip with real time
// (no farming); refined materials (boards) come only from processing recipes. Craft times are
// month-scale on purpose — ultra-low time preference is the design law, DRIP_PER_MINUTE is THE
// balancing knob. Touch nothing else.
// Set 1 "Foundation": 50 items (8 materials, 17 blocks, 25 furniture) in 4 architectural block
// families — stone, timber, brick, steel. Orange/violet stay furniture accents (E1 direction).
// Set cadence + the godot parity backlog live in docs/design/item-sets.md.

export const COLOR_CREAM = "#efe6d2";
export const COLOR_GOLD = "#e7b23c";
export const COLOR_TEAL = "#23806f";
export const COLOR_CORAL = "#e8735a";
export const COLOR_STONEBLOCK = "#c5beac"; // stone-grey-cream block look
export const COLOR_BOARDS = "#b9814a"; // warm wood look (boards + board blocks)
export const COLOR_GLASS = "#bfe3ef"; // window pane
export const COLOR_ROOF = "#b05a3c"; // terracotta shingle
export const COLOR_BRICK = "#b3573d"; // fired-clay block family
export const COLOR_STEEL = "#2e2f33"; // matte blackened steel family
export const COLOR_SLATE = "#3a3d45"; // dark slate roof
export const COLOR_CLAY = "#c98d6b"; // raw clay
export const COLOR_SCRAP = "#8a8d93"; // raw scrap
export const COLOR_PARTS = "#9aa0a8"; // pressed parts
export const COLOR_BTC = "#f7931a"; // Bitcoin-orange accent (furniture only)
export const COLOR_VIOLET = "#7b5cff"; // ultraviolet accent (furniture only)
export const COLOR_SOLAR = "#2b3f5e"; // solar-cell deep blue

const HOUR = 3600;
const DAY = 86400;

/** Items ship in sets — one new set every 21 days (docs/design/item-sets.md). */
export const CURRENT_SET = 1;

/** Units per MINUTE (≈21.6 wood / 10.8 stone a DAY). THE balancing knob — touch nothing else. */
export const DRIP_PER_MINUTE: Record<string, number> = {
  wood: 0.015,
  stone: 0.0075,
  clay: 0.005,
  scrap: 0.0035,
};
/** Finite local-stock targets. Passive collection and processing stop when storage is full. */
export const MATERIAL_CAPS: Record<string, number> = {
  wood: 100,
  stone: 80,
  clay: 60,
  scrap: 60,
  boards: 100,
  bricks: 80,
  glass: 60,
  parts: 60,
};
/** Move-in condition hold time (24 h, wall clock — never timescaled). */
export const ATTRACTION_SUSTAIN_SEC = 86400;

export interface MaterialDef {
  display: string;
  color: string;
  /** Which item set introduced this material. */
  set: number;
}

/** wood/stone/clay/scrap = raw (drip); boards/bricks/glass/parts = refined (process only). */
export const MATERIALS: Record<string, MaterialDef> = {
  wood: { display: "Wood", color: COLOR_GOLD, set: 1 },
  stone: { display: "Stone", color: COLOR_TEAL, set: 1 },
  clay: { display: "Clay", color: COLOR_CLAY, set: 1 },
  scrap: { display: "Scrap", color: COLOR_SCRAP, set: 1 },
  boards: { display: "Boards", color: COLOR_BOARDS, set: 1 },
  bricks: { display: "Bricks", color: COLOR_BRICK, set: 1 },
  glass: { display: "Glass", color: COLOR_GLASS, set: 1 },
  parts: { display: "Parts", color: COLOR_PARTS, set: 1 },
};

export type ObjectKind = "block" | "furniture";

/** Grid-cell modules: cube, glass window (solid), walk-through door, roof wedge, half-height
 *  slab, walkable stairs, thin fence. */
export type BlockShape = "cube" | "window" | "door" | "roof" | "stairs" | "slab" | "fence";

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
  /** Which item set introduced this object. */
  set: number;
}

/** Insertion order = hotbar order (blocks first: cubes, slabs, stairs, fences, openings, roofs). */
export const OBJECTS: Record<string, ObjectDef> = {
  // --- cubes: the 4 architectural families ---
  block_stone: {
    display: "Stone Block",
    kind: "block",
    color: COLOR_STONEBLOCK,
    specialty: {},
    attracts: false,
    set: 1,
  },
  block_boards: {
    display: "Board Block",
    kind: "block",
    color: COLOR_BOARDS,
    specialty: {},
    attracts: false,
    set: 1,
  },
  block_brick: {
    display: "Brick Block",
    kind: "block",
    color: COLOR_BRICK,
    specialty: {},
    attracts: false,
    set: 1,
  },
  block_steel: {
    display: "Steel Block",
    kind: "block",
    color: COLOR_STEEL,
    specialty: {},
    attracts: false,
    set: 1,
  },
  // --- slabs: half-height floors, steps and ledges ---
  slab_stone: {
    display: "Stone Slab",
    kind: "block",
    shape: "slab",
    color: COLOR_STONEBLOCK,
    specialty: {},
    attracts: false,
    set: 1,
  },
  slab_boards: {
    display: "Board Slab",
    kind: "block",
    shape: "slab",
    color: COLOR_BOARDS,
    specialty: {},
    attracts: false,
    set: 1,
  },
  slab_brick: {
    display: "Brick Slab",
    kind: "block",
    shape: "slab",
    color: COLOR_BRICK,
    specialty: {},
    attracts: false,
    set: 1,
  },
  // --- stairs: walkable ramps up one cell ---
  stairs_stone: {
    display: "Stone Stairs",
    kind: "block",
    shape: "stairs",
    color: COLOR_STONEBLOCK,
    specialty: {},
    attracts: false,
    set: 1,
  },
  stairs_boards: {
    display: "Board Stairs",
    kind: "block",
    shape: "stairs",
    color: COLOR_BOARDS,
    specialty: {},
    attracts: false,
    set: 1,
  },
  stairs_brick: {
    display: "Brick Stairs",
    kind: "block",
    shape: "stairs",
    color: COLOR_BRICK,
    specialty: {},
    attracts: false,
    set: 1,
  },
  // --- fences: thin boundaries, solid to walk against ---
  fence_boards: {
    display: "Board Fence",
    kind: "block",
    shape: "fence",
    color: COLOR_BOARDS,
    specialty: {},
    attracts: false,
    set: 1,
  },
  fence_steel: {
    display: "Steel Fence",
    kind: "block",
    shape: "fence",
    color: COLOR_STEEL,
    specialty: {},
    attracts: false,
    set: 1,
  },
  // --- openings ---
  block_window: {
    display: "Window",
    kind: "block",
    shape: "window",
    color: COLOR_GLASS,
    specialty: {},
    attracts: false,
    set: 1,
  },
  block_door: {
    display: "Door",
    kind: "block",
    shape: "door",
    color: COLOR_BOARDS,
    specialty: {},
    attracts: false,
    set: 1,
  },
  block_gate: {
    display: "Gate",
    kind: "block",
    shape: "door",
    color: COLOR_STEEL,
    specialty: {},
    attracts: false,
    set: 1,
  },
  // --- roofs ---
  block_roof: {
    display: "Roof",
    kind: "block",
    shape: "roof",
    color: COLOR_ROOF,
    specialty: {},
    attracts: false,
    set: 1,
  },
  block_roof_slate: {
    display: "Slate Roof",
    kind: "block",
    shape: "roof",
    color: COLOR_SLATE,
    specialty: {},
    attracts: false,
    set: 1,
  },
  // --- furniture: the original five ---
  stool: {
    display: "Stool",
    kind: "furniture",
    color: COLOR_GOLD,
    size: [0.6, 0.5, 0.6],
    specialty: {},
    attracts: false,
    set: 1,
  },
  lantern: {
    display: "Lantern",
    kind: "furniture",
    color: COLOR_CORAL,
    size: [0.4, 1.4, 0.4],
    specialty: {},
    attracts: false,
    set: 1,
  },
  sawbench: {
    display: "Sawbench (Chop)",
    kind: "furniture",
    color: COLOR_BOARDS,
    size: [1.6, 1.0, 0.8],
    specialty: { wood: 1.5 },
    attracts: false,
    set: 1,
  },
  kiln: {
    display: "Kiln",
    kind: "furniture",
    color: COLOR_TEAL,
    size: [1.2, 1.5, 1.2],
    specialty: { stone: 1.5 },
    attracts: false,
    set: 1,
  },
  fountain: {
    display: "Fountain",
    kind: "furniture",
    color: COLOR_TEAL,
    size: [2.4, 1.6, 2.4],
    specialty: {},
    attracts: true,
    set: 1,
  },
  // --- domestic set (private-to-palace Tier 1) ---
  chair: {
    display: "Chair",
    kind: "furniture",
    color: COLOR_BOARDS,
    size: [0.5, 0.9, 0.5],
    specialty: {},
    attracts: false,
    set: 1,
  },
  table: {
    display: "Table",
    kind: "furniture",
    color: COLOR_BOARDS,
    size: [1.2, 0.8, 0.8],
    specialty: {},
    attracts: false,
    set: 1,
  },
  bench: {
    display: "Bench",
    kind: "furniture",
    color: COLOR_BOARDS,
    size: [1.4, 0.5, 0.5],
    specialty: {},
    attracts: false,
    set: 1,
  },
  sofa: {
    display: "Sofa",
    kind: "furniture",
    color: COLOR_CORAL,
    size: [1.8, 0.8, 0.8],
    specialty: {},
    attracts: false,
    set: 1,
  },
  rug: {
    display: "Rug",
    kind: "furniture",
    color: COLOR_CREAM,
    size: [1.6, 0.04, 1.1],
    specialty: {},
    attracts: false,
    set: 1,
  },
  shelf: {
    display: "Shelf",
    kind: "furniture",
    color: COLOR_BOARDS,
    size: [1.0, 1.8, 0.35],
    specialty: {},
    attracts: false,
    set: 1,
  },
  crate: {
    display: "Crate",
    kind: "furniture",
    color: COLOR_GOLD,
    size: [0.8, 0.8, 0.8],
    specialty: {},
    attracts: false,
    set: 1,
  },
  plant_pot: {
    display: "Plant Pot",
    kind: "furniture",
    color: COLOR_CLAY,
    size: [0.45, 0.6, 0.45],
    specialty: {},
    attracts: false,
    set: 1,
  },
  framed_print: {
    display: "Framed Print",
    kind: "furniture",
    color: COLOR_GOLD,
    size: [0.8, 1.0, 0.08],
    specialty: {},
    attracts: false,
    set: 1,
  },
  floor_lamp: {
    display: "Floor Lamp",
    kind: "furniture",
    color: COLOR_CREAM,
    size: [0.4, 1.6, 0.4],
    specialty: {},
    attracts: false,
    set: 1,
  },
  // --- workstations (specialty boosts the new raw drips) ---
  brickworks: {
    display: "Brickworks (Fire)",
    kind: "furniture",
    color: COLOR_BRICK,
    size: [1.4, 1.3, 1.0],
    specialty: { clay: 1.5 },
    attracts: false,
    set: 1,
  },
  salvage_press: {
    display: "Salvage Press",
    kind: "furniture",
    color: COLOR_SCRAP,
    size: [1.2, 1.4, 1.0],
    specialty: { scrap: 1.5 },
    attracts: false,
    set: 1,
  },
  // --- the five resource moods (accent colors live here, not on blocks) ---
  block_clock: {
    display: "Block Clock",
    kind: "furniture",
    color: COLOR_VIOLET,
    size: [0.6, 1.8, 0.35],
    specialty: {},
    attracts: false,
    set: 1,
  },
  node_rack: {
    display: "Node Rack",
    kind: "furniture",
    color: COLOR_BTC,
    size: [0.6, 1.2, 0.5],
    specialty: {},
    attracts: false,
    set: 1,
  },
  antenna_mast: {
    display: "Antenna Mast",
    kind: "furniture",
    color: COLOR_STEEL,
    size: [0.5, 2.4, 0.5],
    specialty: {},
    attracts: false,
    set: 1,
  },
  solar_panel: {
    display: "Solar Panel",
    kind: "furniture",
    color: COLOR_SOLAR,
    size: [1.6, 1.0, 1.2],
    specialty: {},
    attracts: false,
    set: 1,
  },
  key_cabinet: {
    display: "Key Cabinet",
    kind: "furniture",
    color: COLOR_VIOLET,
    size: [0.8, 1.4, 0.4],
    specialty: {},
    attracts: false,
    set: 1,
  },
  // --- garden / outdoor ---
  planter_bed: {
    display: "Planter Bed",
    kind: "furniture",
    color: COLOR_BOARDS,
    size: [1.6, 0.4, 0.8],
    specialty: {},
    attracts: false,
    set: 1,
  },
  sapling: {
    display: "Orchard Sapling",
    kind: "furniture",
    color: COLOR_TEAL,
    size: [0.5, 1.3, 0.5],
    specialty: {},
    attracts: false,
    set: 1,
  },
  market_stall: {
    display: "Market Stall",
    kind: "furniture",
    color: COLOR_GOLD,
    size: [2.0, 2.2, 1.4],
    specialty: {},
    attracts: false,
    set: 1,
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
  // --- processing: raw -> refined batches ---
  mill_boards: {
    display: "Boards x50 (Chop)",
    outputId: "boards",
    outputCount: 50,
    cost: { wood: 10 },
    seconds: 21 * HOUR,
  },
  fire_bricks: {
    display: "Bricks x40 (Fire)",
    outputId: "bricks",
    outputCount: 40,
    cost: { clay: 10 },
    seconds: 21 * HOUR,
  },
  melt_glass: {
    display: "Glass x24 (Melt)",
    outputId: "glass",
    outputCount: 24,
    cost: { stone: 8 },
    seconds: 21 * HOUR,
  },
  press_parts: {
    display: "Parts x30 (Press)",
    outputId: "parts",
    outputCount: 30,
    cost: { scrap: 10 },
    seconds: 21 * HOUR,
  },
  // --- blocks ---
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
  craft_block_brick: {
    display: "Brick Blocks x9",
    outputId: "block_brick",
    outputCount: 9,
    cost: { bricks: 9 },
    seconds: 2.1 * HOUR,
  },
  craft_block_steel: {
    display: "Steel Blocks x9",
    outputId: "block_steel",
    outputCount: 9,
    cost: { parts: 9 },
    seconds: 2.1 * HOUR,
  },
  craft_slab_stone: {
    display: "Stone Slabs x9",
    outputId: "slab_stone",
    outputCount: 9,
    cost: { stone: 5 },
    seconds: 2.1 * HOUR,
  },
  craft_slab_boards: {
    display: "Board Slabs x9",
    outputId: "slab_boards",
    outputCount: 9,
    cost: { boards: 5 },
    seconds: 2.1 * HOUR,
  },
  craft_slab_brick: {
    display: "Brick Slabs x9",
    outputId: "slab_brick",
    outputCount: 9,
    cost: { bricks: 5 },
    seconds: 2.1 * HOUR,
  },
  craft_stairs_stone: {
    display: "Stone Stairs x4",
    outputId: "stairs_stone",
    outputCount: 4,
    cost: { stone: 6 },
    seconds: 4.2 * HOUR,
  },
  craft_stairs_boards: {
    display: "Board Stairs x4",
    outputId: "stairs_boards",
    outputCount: 4,
    cost: { boards: 6 },
    seconds: 4.2 * HOUR,
  },
  craft_stairs_brick: {
    display: "Brick Stairs x4",
    outputId: "stairs_brick",
    outputCount: 4,
    cost: { bricks: 6 },
    seconds: 4.2 * HOUR,
  },
  craft_fence_boards: {
    display: "Board Fences x6",
    outputId: "fence_boards",
    outputCount: 6,
    cost: { boards: 4 },
    seconds: 4.2 * HOUR,
  },
  craft_fence_steel: {
    display: "Steel Fences x6",
    outputId: "fence_steel",
    outputCount: 6,
    cost: { parts: 4 },
    seconds: 4.2 * HOUR,
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
  craft_block_gate: {
    display: "Gate",
    outputId: "block_gate",
    outputCount: 1,
    cost: { parts: 6 },
    seconds: 21 * HOUR,
  },
  craft_block_roof: {
    display: "Roof Wedges x9",
    outputId: "block_roof",
    outputCount: 9,
    cost: { boards: 6, stone: 3 },
    seconds: 4.2 * HOUR,
  },
  craft_block_roof_slate: {
    display: "Slate Roof Wedges x9",
    outputId: "block_roof_slate",
    outputCount: 9,
    cost: { stone: 6, parts: 3 },
    seconds: 4.2 * HOUR,
  },
  // --- furniture: the original five ---
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
  // --- domestic set ---
  craft_chair: {
    display: "Chair",
    outputId: "chair",
    outputCount: 1,
    cost: { boards: 3, wood: 2 },
    seconds: 2.1 * DAY,
  },
  craft_table: {
    display: "Table",
    outputId: "table",
    outputCount: 1,
    cost: { boards: 4 },
    seconds: 2.1 * DAY,
  },
  craft_bench: {
    display: "Bench",
    outputId: "bench",
    outputCount: 1,
    cost: { boards: 4 },
    seconds: 2.1 * DAY,
  },
  craft_sofa: {
    display: "Sofa",
    outputId: "sofa",
    outputCount: 1,
    cost: { boards: 6, wood: 4 },
    seconds: 21 * DAY,
  },
  craft_rug: {
    display: "Rug",
    outputId: "rug",
    outputCount: 1,
    cost: { wood: 3 },
    seconds: 210 * HOUR,
  },
  craft_shelf: {
    display: "Shelf",
    outputId: "shelf",
    outputCount: 1,
    cost: { boards: 5 },
    seconds: 2.1 * DAY,
  },
  craft_crate: {
    display: "Crate",
    outputId: "crate",
    outputCount: 1,
    cost: { boards: 3 },
    seconds: 21 * HOUR,
  },
  craft_plant_pot: {
    display: "Plant Pot",
    outputId: "plant_pot",
    outputCount: 1,
    cost: { clay: 3 },
    seconds: 21 * HOUR,
  },
  craft_framed_print: {
    display: "Framed Print",
    outputId: "framed_print",
    outputCount: 1,
    cost: { boards: 2, glass: 1 },
    seconds: 210 * HOUR,
  },
  craft_floor_lamp: {
    display: "Floor Lamp",
    outputId: "floor_lamp",
    outputCount: 1,
    cost: { parts: 2, glass: 1 },
    seconds: 210 * HOUR,
  },
  // --- workstations ---
  craft_brickworks: {
    display: "Brickworks (Fire)",
    outputId: "brickworks",
    outputCount: 1,
    cost: { stone: 8, clay: 4 },
    seconds: 2.1 * DAY,
  },
  craft_salvage_press: {
    display: "Salvage Press",
    outputId: "salvage_press",
    outputCount: 1,
    cost: { parts: 6, boards: 4 },
    seconds: 2.1 * DAY,
  },
  // --- the five resource moods ---
  craft_block_clock: {
    display: "Block Clock",
    outputId: "block_clock",
    outputCount: 1,
    cost: { parts: 6, glass: 3 },
    seconds: 42 * DAY,
  },
  craft_node_rack: {
    display: "Node Rack",
    outputId: "node_rack",
    outputCount: 1,
    cost: { parts: 5, glass: 2 },
    seconds: 21 * DAY,
  },
  craft_antenna_mast: {
    display: "Antenna Mast",
    outputId: "antenna_mast",
    outputCount: 1,
    cost: { parts: 4, boards: 2 },
    seconds: 210 * HOUR,
  },
  craft_solar_panel: {
    display: "Solar Panel",
    outputId: "solar_panel",
    outputCount: 1,
    cost: { glass: 4, parts: 3 },
    seconds: 21 * DAY,
  },
  craft_key_cabinet: {
    display: "Key Cabinet",
    outputId: "key_cabinet",
    outputCount: 1,
    cost: { boards: 4, parts: 2 },
    seconds: 210 * HOUR,
  },
  // --- garden / outdoor ---
  craft_planter_bed: {
    display: "Planter Bed",
    outputId: "planter_bed",
    outputCount: 1,
    cost: { boards: 3, clay: 2 },
    seconds: 21 * HOUR,
  },
  craft_sapling: {
    display: "Orchard Sapling",
    outputId: "sapling",
    outputCount: 1,
    cost: { wood: 2 },
    seconds: 21 * DAY,
  },
  craft_market_stall: {
    display: "Market Stall",
    outputId: "market_stall",
    outputCount: 1,
    cost: { boards: 6, parts: 2 },
    seconds: 21 * DAY,
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

/** Which pocket an object sorts into (derived — no per-object bookkeeping to forget).
 *  Cubes, slabs, stairs and fences are all "blocks"; windows/doors/gates are openings. */
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
