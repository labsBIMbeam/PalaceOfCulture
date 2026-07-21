import assert from "node:assert/strict";
import { OBJECTS } from "../src/builder/catalog";
import {
  HABITATS,
  HABITAT_ITEMS,
  HABITAT_ORDER,
  type HabitatItemId,
  type HabitatWorldState,
  completeHabitat,
  evaluateHabitat,
  resolveCapabilities,
  validateHabitatGraph,
} from "../src/builder/habitats";

assert.deepEqual(validateHabitatGraph(), [], "habitat graph is ordered, complete, and acyclic");

for (const [itemId, item] of Object.entries(HABITAT_ITEMS)) {
  const catalogObjectId = "catalogObjectId" in item ? item.catalogObjectId : undefined;
  if (catalogObjectId) {
    assert.ok(OBJECTS[catalogObjectId], `${itemId} maps to an existing builder catalog object`);
  }
}

const empty: HabitatWorldState = {
  itemCounts: {},
  commissionedJobs: [],
  completedHabitats: [],
};
const missingCamp = evaluateHabitat("hearth_camp", empty);
assert.equal(missingCamp.bundleComplete, false);
assert.equal(missingCamp.missingCapabilities.length, 0);
assert.ok(
  missingCamp.missingItems.some((item) => item.itemId === "shelter_block" && item.need === 9),
);

const campReady: HabitatWorldState = {
  ...empty,
  itemCounts: { shelter_block: 9, lantern: 1, stool: 1, workbench: 1 },
  commissionedJobs: ["repair_first_workbench"],
};
const campWithoutCommissioning: HabitatWorldState = { ...campReady, commissionedJobs: [] };
assert.equal(evaluateHabitat("hearth_camp", campWithoutCommissioning).readyToCommission, true);
assert.equal(evaluateHabitat("hearth_camp", campWithoutCommissioning).unlockable, false);
assert.equal(
  completeHabitat("hearth_camp", campWithoutCommissioning),
  campWithoutCommissioning,
  "a complete physical bundle stays locked until its commissioning job succeeds",
);
assert.equal(evaluateHabitat("hearth_camp", campReady).unlockable, true);
const withCamp = completeHabitat("hearth_camp", campReady);
assert.deepEqual([...resolveCapabilities(withCamp.completedHabitats)].sort(), [
  "basic_fabrication",
  "culture",
  "shelter",
]);

const lumberWithoutCamp = evaluateHabitat("lumber_yard", {
  ...empty,
  itemCounts: {
    tree_stump: 1,
    handcart: 1,
    log_table: 1,
    log_bench: 1,
    sawbench: 1,
    drying_rack: 1,
  },
  commissionedJobs: ["season_first_boards"],
});
assert.equal(lumberWithoutCamp.bundleComplete, true);
assert.deepEqual(lumberWithoutCamp.missingCapabilities.sort(), ["basic_fabrication", "shelter"]);
assert.equal(
  lumberWithoutCamp.unlockable,
  false,
  "objects alone do not bypass prerequisite knowledge",
);

// Stage 1 is a real branch: Water Garden and Lumber Yard work in either order after Hearth Camp.
const stageOneItems: HabitatWorldState["itemCounts"] = {
  water_collector: 1,
  water_channel: 2,
  barrel: 1,
  garden_bed: 2,
  tree_stump: 1,
  handcart: 1,
  log_table: 1,
  log_bench: 1,
  sawbench: 1,
  drying_rack: 1,
};
const stageOneBase: HabitatWorldState = {
  ...withCamp,
  itemCounts: stageOneItems,
  commissionedJobs: ["filter_first_water", "season_first_boards"],
};
assert.equal(evaluateHabitat("water_garden", stageOneBase).unlockable, true);
assert.equal(evaluateHabitat("lumber_yard", stageOneBase).unlockable, true);
const waterThenLumber = completeHabitat(
  "lumber_yard",
  completeHabitat("water_garden", stageOneBase),
);
const lumberThenWater = completeHabitat(
  "water_garden",
  completeHabitat("lumber_yard", stageOneBase),
);
assert.deepEqual(
  [...resolveCapabilities(waterThenLumber.completedHabitats)].sort(),
  [...resolveCapabilities(lumberThenWater.completedHabitats)].sort(),
  "stage-one branch order produces the same learned capabilities",
);

// Commission the complete graph in its authored order with every physical component available.
const allItems = Object.fromEntries(
  (Object.keys(HABITAT_ITEMS) as HabitatItemId[]).map((itemId) => [itemId, 99]),
) as Record<HabitatItemId, number>;
const allJobs = HABITAT_ORDER.map((id) => HABITATS[id].commissioningJob);
let world: HabitatWorldState = {
  itemCounts: allItems,
  commissionedJobs: allJobs,
  completedHabitats: [],
};
for (const habitatId of HABITAT_ORDER) {
  const evaluation = evaluateHabitat(habitatId, world);
  assert.equal(evaluation.unlockable, true, `${habitatId} unlocks in graph order`);
  world = completeHabitat(habitatId, world);
}
assert.equal(world.completedHabitats.length, HABITAT_ORDER.length);
assert.equal(resolveCapabilities(world.completedHabitats).has("civic_building"), true);

// Redecorating cannot erase learned capability: the permanent ledger is completedHabitats.
const dismantled = { ...world, itemCounts: {} };
assert.equal(evaluateHabitat("lumber_yard", dismantled).bundleComplete, false);
assert.equal(resolveCapabilities(dismantled.completedHabitats).has("woodwork"), true);
assert.equal(
  completeHabitat("hearth_camp", world),
  world,
  "an already commissioned habitat is an idempotent no-op",
);

console.log("habitat capability smoke: 9 habitats commissioned, civic building unlocked");
