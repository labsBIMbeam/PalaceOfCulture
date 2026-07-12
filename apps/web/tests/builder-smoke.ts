// Run: pnpm --filter @600b/web test
// Godot-parity smoke test for the ported builder logic (run in Node, storage is a silent no-op).
import { homeBuild as buildSystem, palaceBuild } from "../src/builder/buildState";
import { OBJECTS, RECIPES, blockIds, formatDuration } from "../src/builder/catalog";
import { economy } from "../src/builder/economy";

const assert = (name: string, cond: boolean) => {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`ok: ${name}`);
};

// catalog parity
assert("hotbar order blocks first", blockIds().join(",") === "block_stone,block_boards");
assert(
  "lantern costs 2 boards + 2 stone",
  JSON.stringify(RECIPES.craft_lantern?.cost) === '{"boards":2,"stone":2}',
);
assert("stool takes 21 days", RECIPES.craft_stool?.seconds === 21 * 86400);
assert("duration renders 21d", formatDuration(RECIPES.craft_stool?.seconds ?? 0) === "21d");
assert("fountain attracts", OBJECTS.fountain?.attracts === true);

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
assert("can afford stone blocks", economy.canAfford("craft_block_stone") === true);
assert("queue craft", economy.queueCraft("craft_block_stone") === true);
assert("stone paid", economy.getMaterial("stone") === 31);
assert("queue length 1", economy.getQueue().length === 1);

// serialization roundtrip (godot contract shape)
const data = buildSystem.toData();
assert("blocks serialized", data.blocks.length === 9);
assert("decor serialized", data.decor.length === 2);
assert("shape has rot_y", typeof data.decor[0]?.rot_y === "number");
buildSystem.fromData(JSON.parse(JSON.stringify(data)));
assert("roundtrip blocks", buildSystem.blockCount() === 9);
assert("roundtrip lantern", buildSystem.decorCount("lantern") === 1);
assert("condition still met after load", economy.conditionMet() === true);

// public palace is decorate-only (design law): block tools must refuse
assert(
  "palace refuses blocks",
  palaceBuild.placeBlocks(palaceBuild.footprintCells([0, 0, 0]), "block_stone") === 0,
);
economy.returnObject("stool");
assert("palace takes furniture", palaceBuild.placeDecor("stool", [1, 0, 1], 0) === true);

console.log("\nALLE SMOKE-TESTS GRUEN");
