// Run: pnpm --filter @600b/web test
// Godot-parity smoke test for the ported builder logic (run in Node, storage is a silent no-op).
import { homeBuild as buildSystem, palaceBuild } from "../src/builder/buildState";
import {
  MATERIALS,
  MATERIAL_CAPS,
  OBJECTS,
  POCKETS,
  RECIPES,
  blockIds,
  clampMaterial,
  formatDuration,
  pocketObjectIds,
  pocketOf,
} from "../src/builder/catalog";
import { demoInventoryFloor, economy, isDemoBuild } from "../src/builder/economy";

const assert = (name: string, cond: boolean) => {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`ok: ${name}`);
};

// demo build flag: this Node run has no vite env -> mainnet behaviour; the kit floor is pure
assert("node run is not a demo build", isDemoBuild() === false);
assert("demo kit: 84 blocks per type (4x21)", demoInventoryFloor("block") === 84);
assert("demo kit: 8 of each furniture", demoInventoryFloor("furniture") === 8);

// catalog parity
assert(
  "hotbar order blocks first",
  blockIds().join(",") ===
    "block_stone,block_boards,block_brick,block_steel," +
      "slab_stone,slab_boards,slab_brick,stairs_stone,stairs_boards,stairs_brick," +
      "fence_boards,fence_steel,block_window,block_door,block_gate,block_roof,block_roof_slate",
);
assert(
  "lantern costs 2 boards + 2 stone",
  JSON.stringify(RECIPES.craft_lantern?.cost) === '{"boards":2,"stone":2}',
);
assert("stool takes 21 days", RECIPES.craft_stool?.seconds === 21 * 86400);
assert("duration renders 21d", formatDuration(RECIPES.craft_stool?.seconds ?? 0) === "21d");
assert("fountain attracts", OBJECTS.fountain?.attracts === true);
assert("every material has a finite cap", Object.values(MATERIAL_CAPS).every(Number.isFinite));
assert("offline catch-up clamps wood", clampMaterial("wood", 10_000) === MATERIAL_CAPS.wood);
assert("negative stock clamps to zero", clampMaterial("stone", -1) === 0);

// build modules: windows/doors/roofs are grid blocks with a shape
assert("window is a shaped block", OBJECTS.block_window?.shape === "window");
assert("door is a shaped block", OBJECTS.block_door?.shape === "door");
assert("roof is a shaped block", OBJECTS.block_roof?.shape === "roof");
assert("slab is a shaped block", OBJECTS.slab_stone?.shape === "slab");
assert("stairs is a shaped block", OBJECTS.stairs_boards?.shape === "stairs");
assert("fence is a shaped block", OBJECTS.fence_steel?.shape === "fence");
assert("gate reuses the door shape", OBJECTS.block_gate?.shape === "door");

// set 1 "Foundation" roster: 8 materials + 42 objects = 50 items, every entry stamped set 1
assert("8 materials", Object.keys(MATERIALS).length === 8);
assert("42 objects", Object.keys(OBJECTS).length === 42);
assert("50 items total", Object.keys(MATERIALS).length + Object.keys(OBJECTS).length === 50);
assert(
  "every object is set 1",
  Object.values(OBJECTS).every((def) => def.set === 1),
);
assert(
  "every material is set 1",
  Object.values(MATERIALS).every((def) => def.set === 1),
);
assert(
  "every material has a cap entry",
  Object.keys(MATERIALS).every((id) => Number.isFinite(MATERIAL_CAPS[id])),
);
assert(
  "every recipe output exists",
  Object.values(RECIPES).every((recipe) => OBJECTS[recipe.outputId] || MATERIALS[recipe.outputId]),
);
assert(
  "every recipe cost is a known material",
  Object.values(RECIPES).every((recipe) => Object.keys(recipe.cost).every((mat) => MATERIALS[mat])),
);
assert(
  "every non-attracted object is craftable",
  Object.entries(OBJECTS).every(
    ([id, def]) => def.attracts || Object.values(RECIPES).some((r) => r.outputId === id),
  ),
);
assert("bricks fire from clay", JSON.stringify(RECIPES.fire_bricks?.cost) === '{"clay":10}');
assert("glass melts from stone x24", RECIPES.melt_glass?.outputCount === 24);
assert("parts press from scrap", RECIPES.press_parts?.outputId === "parts");

// pockets (Pokémon sorting): every object lands in exactly one pocket, pockets stay ordered
assert(
  "pocket order",
  POCKETS.map((pocket) => pocket.id).join(",") === "blocks,openings,roofs,furniture",
);
assert("window sorts into openings", pocketOf("block_window") === "openings");
assert("door sorts into openings", pocketOf("block_door") === "openings");
assert("gate sorts into openings", pocketOf("block_gate") === "openings");
assert("roof sorts into roofs", pocketOf("block_roof") === "roofs");
assert("slate roof sorts into roofs", pocketOf("block_roof_slate") === "roofs");
assert("stairs sort into blocks", pocketOf("stairs_stone") === "blocks");
assert("slab sorts into blocks", pocketOf("slab_brick") === "blocks");
assert("fence sorts into blocks", pocketOf("fence_boards") === "blocks");
assert("stool sorts into furniture", pocketOf("stool") === "furniture");
const pocketed = POCKETS.flatMap((pocket) => pocketObjectIds(pocket.id)).sort();
assert(
  "every object in exactly one pocket",
  pocketed.join(",") === Object.keys(OBJECTS).sort().join(","),
);

// brush footprints: 1 / 2x2 / 3x3 on one y-layer
assert("brush 1 = single cell", buildSystem.footprintCells([4, 0, 4], 1).length === 1);
assert("brush 2 = 4 cells", buildSystem.footprintCells([4, 0, 4], 2).length === 4);
assert("brush 3 = 9 cells", buildSystem.footprintCells([4, 0, 4], 3).length === 9);
assert(
  "brush 2 grows toward +x/+z",
  JSON.stringify(buildSystem.footprintCells([4, 0, 4], 2)) ===
    JSON.stringify([
      [4, 0, 4],
      [4, 0, 5],
      [5, 0, 4],
      [5, 0, 5],
    ]),
);

// wait for the async boot (IndexedDB load resolves to null in Node -> starter state)
while (!economy.isReady()) await new Promise((resolve) => setTimeout(resolve, 10));

// starter economy (STARTER: 60 wood / 40 stone / 18 stone blocks)
assert("starter wood 60", economy.getMaterial("wood") === 60);
assert("starter stone blocks 18", economy.getCount("block_stone") === 18);

// magnet stamp: 3x3 footprint consumes 9 blocks
const placed = buildSystem.placeBlocks(buildSystem.footprintCells([0, 0, 0]), "block_stone");
assert("footprint places 9", placed === 9);
assert("inventory drained to 9", economy.getCount("block_stone") === 9);
assert(
  "second stamp on same cells places 0",
  buildSystem.placeBlocks(buildSystem.footprintCells([0, 0, 0]), "block_stone") === 0,
);

// absorb returns the block
assert("absorb", buildSystem.absorbBlock([0, 0, 0]) === true);
assert("returned to inventory", economy.getCount("block_stone") === 10);
assert("block count 8", buildSystem.blockCount() === 8);

// move-in condition: needs >=9 blocks AND a lantern
assert("condition not met at 8 blocks", economy.conditionMet() === false);
buildSystem.placeBlocks([[5, 0, 5]], "block_stone");
assert("9 blocks, still no lantern", economy.conditionMet() === false);
economy.returnObject("lantern"); // craft shortcut for the test
assert("lantern placeable", buildSystem.placeDecor("lantern", [2, 1, 2], 0.5) === true);
assert("condition met", economy.conditionMet() === true);

// specialty: sawbench multiplies wood drip x1.5
economy.returnObject("sawbench");
buildSystem.placeDecor("sawbench", [4, 0, 4], 0);
assert("wood drip x1.5", Math.abs(economy.dripRate("wood") - 0.015 * 1.5) < 1e-9);

// craft queue consumes materials up-front
assert("first bounded board batch queues", economy.queueCraft("mill_boards") === true);
assert("second bounded board batch queues", economy.queueCraft("mill_boards") === true);
assert("pending output reserves the board cap", economy.canAfford("mill_boards") === false);
assert("can afford stone blocks", economy.canAfford("craft_block_stone") === true);
assert("queue craft", economy.queueCraft("craft_block_stone") === true);
assert("stone paid", economy.getMaterial("stone") === 31);
assert("queue length 3", economy.getQueue().length === 3);

// serialization roundtrip (godot contract shape)
const data = buildSystem.toData();
assert("blocks serialized", data.blocks.length === 9);
assert("decor serialized", data.decor.length === 2);
assert("shape has rot_y", typeof data.decor[0]?.rot_y === "number");
buildSystem.fromData(JSON.parse(JSON.stringify(data)));
assert("roundtrip blocks", buildSystem.blockCount() === 9);
assert("roundtrip lantern", buildSystem.decorCount("lantern") === 1);
assert("condition still met after load", economy.conditionMet() === true);

// shaped blocks: rotation survives placement, repaint and the save roundtrip
economy.returnObject("block_door");
economy.returnObject("block_boards");
assert("door places with rotation", buildSystem.placeBlocks([[8, 0, 8]], "block_door", 3) === 1);
const doorEntry = () => buildSystem.entries().find((entry) => entry.cell.join(",") === "8,0,8");
assert("door keeps rot 3", doorEntry()?.rot === 3);
assert("repaint keeps rotation", buildSystem.replaceBlocks([[8, 0, 8]], "block_boards") === 1);
assert("repainted cell still rot 3", doorEntry()?.rot === 3);
const rotData = buildSystem.toData();
buildSystem.fromData(JSON.parse(JSON.stringify(rotData)));
assert("rot survives the save roundtrip", doorEntry()?.rot === 3);
buildSystem.absorbBlock([8, 0, 8]);

// public palace is decorate-only (design law): block tools must refuse
assert(
  "palace refuses blocks",
  palaceBuild.placeBlocks(palaceBuild.footprintCells([0, 0, 0]), "block_stone") === 0,
);
economy.returnObject("stool");
assert("palace takes furniture", palaceBuild.placeDecor("stool", [1, 0, 1], 0) === true);

console.log("\nALLE SMOKE-TESTS GRUEN");
