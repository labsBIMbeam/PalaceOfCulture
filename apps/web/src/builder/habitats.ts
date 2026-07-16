// Original Locktard Street habitat progression.
//
// The design borrows only the general "placed object bundle attracts a role" pattern seen in
// cozy builders. Names, objects, capability graph, commissioning jobs, and worldbuilding are
// original to Palace of Culture. A habitat is not an XP score: it is a verifiable bundle of
// physical systems plus one completed commissioning job.

export type CapabilityId =
  | "shelter"
  | "culture"
  | "basic_fabrication"
  | "water"
  | "food_growing"
  | "woodwork"
  | "baking"
  | "hospitality"
  | "metalwork"
  | "energy"
  | "community"
  | "network"
  | "civic_building";

export type CommissioningJobId =
  | "repair_first_workbench"
  | "filter_first_water"
  | "season_first_boards"
  | "bake_first_loaf"
  | "forge_first_hinge"
  | "generate_first_charge"
  | "host_first_meal"
  | "publish_first_note"
  | "ratify_first_blueprint";

export interface HabitatItemDef {
  display: string;
  category: "structure" | "utility" | "workstation" | "furniture" | "food" | "culture";
  /** Existing builder catalog id when a playable representation already exists. */
  catalogObjectId?: string;
  /** Why this object belongs in the bundle in real-world terms. */
  realWorldRole: string;
}

export const HABITAT_ITEMS = {
  shelter_block: {
    display: "Shelter Block",
    category: "structure",
    catalogObjectId: "block_stone",
    realWorldRole: "weather protection and a stable room envelope",
  },
  lantern: {
    display: "Lantern",
    category: "utility",
    catalogObjectId: "lantern",
    realWorldRole: "safe light and visible occupancy",
  },
  stool: {
    display: "Stool",
    category: "furniture",
    catalogObjectId: "stool",
    realWorldRole: "a place to rest while working",
  },
  workbench: {
    display: "Workbench",
    category: "workstation",
    realWorldRole: "basic repair, measuring, clamping, and assembly",
  },
  water_collector: {
    display: "Rainwater Collector",
    category: "utility",
    realWorldRole: "captures water before storage and treatment",
  },
  water_channel: {
    display: "Water Channel",
    category: "structure",
    realWorldRole: "moves water by gravity between systems",
  },
  garden_bed: {
    display: "Garden Bed",
    category: "structure",
    realWorldRole: "turns soil, water, seed, and time into food",
  },
  barrel: {
    display: "Storage Barrel",
    category: "utility",
    realWorldRole: "buffers water or dry goods",
  },
  tree_stump: {
    display: "Chopping Stump",
    category: "workstation",
    realWorldRole: "safe chopping and first timber processing",
  },
  handcart: {
    display: "Handcart",
    category: "utility",
    realWorldRole: "moves logs and boards without powered machinery",
  },
  log_table: {
    display: "Log Table",
    category: "furniture",
    realWorldRole: "proves rough timber can become useful joinery",
  },
  log_bench: {
    display: "Log Bench",
    category: "furniture",
    realWorldRole: "proves repeatable seating and stable joints",
  },
  sawbench: {
    display: "Sawbench",
    category: "workstation",
    catalogObjectId: "sawbench",
    realWorldRole: "turns rough timber into dimensioned boards",
  },
  drying_rack: {
    display: "Board Drying Rack",
    category: "utility",
    realWorldRole: "seasons timber before durable construction",
  },
  grain_plot: {
    display: "Grain Plot",
    category: "structure",
    realWorldRole: "local source of grain rather than unexplained food spawning",
  },
  millstone: {
    display: "Millstone",
    category: "workstation",
    realWorldRole: "turns grain into flour",
  },
  bread_oven: {
    display: "Bread Oven",
    category: "workstation",
    realWorldRole: "controlled heat for repeatable baking",
  },
  counter: {
    display: "Service Counter",
    category: "furniture",
    realWorldRole: "clean preparation and exchange surface",
  },
  plated_food: {
    display: "Prepared Meal",
    category: "food",
    realWorldRole: "proof that the complete food chain produced something edible",
  },
  kiln: {
    display: "Kiln",
    category: "workstation",
    catalogObjectId: "kiln",
    realWorldRole: "controlled high-temperature processing",
  },
  charcoal_burner: {
    display: "Charcoal Burner",
    category: "workstation",
    realWorldRole: "turns wood into concentrated forge fuel",
  },
  anvil: {
    display: "Anvil",
    category: "workstation",
    realWorldRole: "stable forming surface for hot metal",
  },
  quench_barrel: {
    display: "Quench Barrel",
    category: "utility",
    realWorldRole: "controlled cooling and heat treatment",
  },
  hammer_rack: {
    display: "Hammer Rack",
    category: "utility",
    realWorldRole: "the correct hand tools stored at point of use",
  },
  waterwheel: {
    display: "Waterwheel",
    category: "workstation",
    realWorldRole: "converts moving water into rotational power",
  },
  generator: {
    display: "Low-Speed Generator",
    category: "workstation",
    realWorldRole: "converts shaft power into electricity",
  },
  tea_counter: {
    display: "Tea Counter",
    category: "furniture",
    realWorldRole: "shared preparation surface for hospitality",
  },
  table: {
    display: "Community Table",
    category: "furniture",
    realWorldRole: "shared surface for meals and conversation",
  },
  seat: {
    display: "Community Seat",
    category: "furniture",
    realWorldRole: "makes lingering together physically possible",
  },
  relay_mast: {
    display: "Relay Mast",
    category: "utility",
    realWorldRole: "visible network infrastructure rather than magic connectivity",
  },
  node_terminal: {
    display: "Node Terminal",
    category: "workstation",
    realWorldRole: "local interface for keys, relays, logs, and message flow",
  },
  cable_spool: {
    display: "Cable Spool",
    category: "utility",
    realWorldRole: "physical power and data distribution",
  },
  archive_shelf: {
    display: "Archive Shelf",
    category: "culture",
    realWorldRole: "stores manuals, local records, and signed knowledge",
  },
  notice_board: {
    display: "Notice Board",
    category: "culture",
    realWorldRole: "publicly legible plans, decisions, and work status",
  },
  meeting_table: {
    display: "Blueprint Table",
    category: "furniture",
    realWorldRole: "shared review surface for coordinated building",
  },
} as const satisfies Record<string, HabitatItemDef>;

export type HabitatItemId = keyof typeof HABITAT_ITEMS;
export type HabitatId =
  | "hearth_camp"
  | "water_garden"
  | "lumber_yard"
  | "bakery"
  | "forge"
  | "waterwheel_house"
  | "glowcap_tea_house"
  | "mycelium_relay_hut"
  | "civic_workshop";

export interface HabitatDef {
  display: string;
  stage: number;
  description: string;
  requiresItems: Partial<Record<HabitatItemId, number>>;
  requiresCapabilities: CapabilityId[];
  commissioningJob: CommissioningJobId;
  grants: CapabilityId[];
  attractsRole: string;
  /** Concrete teaching result; flavor copy must never replace this. */
  realWorldOutcome: string;
}

export const HABITAT_ORDER: HabitatId[] = [
  "hearth_camp",
  "water_garden",
  "lumber_yard",
  "bakery",
  "forge",
  "waterwheel_house",
  "glowcap_tea_house",
  "mycelium_relay_hut",
  "civic_workshop",
];

export const HABITATS: Record<HabitatId, HabitatDef> = {
  hearth_camp: {
    display: "Hearth Camp",
    stage: 0,
    description: "A dry, lit place where repair work and culture can begin.",
    requiresItems: { shelter_block: 9, lantern: 1, stool: 1, workbench: 1 },
    requiresCapabilities: [],
    commissioningJob: "repair_first_workbench",
    grants: ["shelter", "culture", "basic_fabrication"],
    attractsRole: "Caretaker",
    realWorldOutcome: "The player can shelter, light, inspect, and repair simple objects.",
  },
  water_garden: {
    display: "Water Garden",
    stage: 1,
    description: "Catch, move, store, and use water to grow food.",
    requiresItems: { water_collector: 1, water_channel: 2, barrel: 1, garden_bed: 2 },
    requiresCapabilities: ["shelter", "basic_fabrication"],
    commissioningJob: "filter_first_water",
    grants: ["water", "food_growing"],
    attractsRole: "Gardener",
    realWorldOutcome: "The settlement has a visible water path and can grow basic food.",
  },
  lumber_yard: {
    display: "Lumber Yard",
    stage: 1,
    description: "A tactile timber workplace built from transport, cutting, joining, and drying.",
    requiresItems: {
      tree_stump: 1,
      handcart: 1,
      log_table: 1,
      log_bench: 1,
      sawbench: 1,
      drying_rack: 1,
    },
    requiresCapabilities: ["shelter", "basic_fabrication"],
    commissioningJob: "season_first_boards",
    grants: ["woodwork"],
    attractsRole: "Carpenter",
    realWorldOutcome: "Rough logs can become measured, seasoned boards and simple joinery.",
  },
  bakery: {
    display: "Street Bakery",
    stage: 2,
    description: "A complete grain-to-loaf chain, not an isolated decorative oven.",
    requiresItems: { grain_plot: 2, millstone: 1, bread_oven: 1, counter: 2, plated_food: 1 },
    requiresCapabilities: ["water", "food_growing", "woodwork"],
    commissioningJob: "bake_first_loaf",
    grants: ["baking", "hospitality"],
    attractsRole: "Baker",
    realWorldOutcome: "Grain is milled, dough is prepared, and a repeatable loaf is baked and served.",
  },
  forge: {
    display: "Street Forge",
    stage: 2,
    description: "Fuel, heat, forming tools, and quench water form one working metal shop.",
    requiresItems: { kiln: 1, charcoal_burner: 1, anvil: 1, quench_barrel: 1, hammer_rack: 1 },
    requiresCapabilities: ["water", "woodwork"],
    commissioningJob: "forge_first_hinge",
    grants: ["metalwork"],
    attractsRole: "Smith",
    realWorldOutcome: "The settlement can forge and heat-treat a useful hinge from raw stock.",
  },
  waterwheel_house: {
    display: "Waterwheel House",
    stage: 3,
    description: "Civil works, timber mechanics, and forged parts become local generation.",
    requiresItems: { waterwheel: 1, water_channel: 3, generator: 1, lantern: 2 },
    requiresCapabilities: ["water", "woodwork", "metalwork"],
    commissioningJob: "generate_first_charge",
    grants: ["energy"],
    attractsRole: "Millwright",
    realWorldOutcome: "Moving water drives a shaft and produces measured electrical energy.",
  },
  glowcap_tea_house: {
    display: "Glowcap Tea House",
    stage: 3,
    description: "Food capability becomes a welcoming, inhabited social place.",
    requiresItems: { tea_counter: 1, table: 2, seat: 4, plated_food: 2, lantern: 3 },
    requiresCapabilities: ["baking", "hospitality", "culture"],
    commissioningJob: "host_first_meal",
    grants: ["community"],
    attractsRole: "Host",
    realWorldOutcome: "The player can host a shared meal with light, seating, food, and service.",
  },
  mycelium_relay_hut: {
    display: "Mycelium Relay Hut",
    stage: 4,
    description: "A cozy mushroom landmark whose infrastructure teaches sovereign communication.",
    requiresItems: { relay_mast: 1, node_terminal: 1, cable_spool: 2, archive_shelf: 1, lantern: 1 },
    requiresCapabilities: ["energy", "metalwork", "community"],
    commissioningJob: "publish_first_note",
    grants: ["network"],
    attractsRole: "Relay Keeper",
    realWorldOutcome: "A locally powered node publishes and retrieves one signed Nostr note.",
  },
  civic_workshop: {
    display: "Civic Workshop",
    stage: 5,
    description: "All production chains meet at a public table where the next district is designed.",
    requiresItems: { workbench: 2, archive_shelf: 2, notice_board: 1, meeting_table: 1, seat: 6 },
    requiresCapabilities: ["baking", "woodwork", "metalwork", "energy", "network", "community"],
    commissioningJob: "ratify_first_blueprint",
    grants: ["civic_building"],
    attractsRole: "Coordinator",
    realWorldOutcome: "The settlement can review, sign, and execute a shared construction blueprint.",
  },
};

export interface HabitatWorldState {
  /**
   * Counts inside ONE candidate habitat's spatial boundary, not global inventory/world totals.
   * Future scene integration must derive this local bundle from placement proximity so one object
   * cannot satisfy two distant habitats at the same time.
   */
  itemCounts: Partial<Record<HabitatItemId, number>>;
  commissionedJobs: CommissioningJobId[];
  completedHabitats: HabitatId[];
}

export interface HabitatEvaluation {
  habitatId: HabitatId;
  alreadyCompleted: boolean;
  missingItems: Array<{ itemId: HabitatItemId; need: number; have: number }>;
  missingCapabilities: CapabilityId[];
  commissioningComplete: boolean;
  bundleComplete: boolean;
  readyToCommission: boolean;
  unlockable: boolean;
}

/** Permanent capabilities come from commissioned habitats, never from current decoration state. */
export function resolveCapabilities(completedHabitats: readonly HabitatId[]): Set<CapabilityId> {
  const result = new Set<CapabilityId>();
  for (const id of completedHabitats) {
    for (const capability of HABITATS[id]?.grants ?? []) result.add(capability);
  }
  return result;
}

export function evaluateHabitat(id: HabitatId, state: HabitatWorldState): HabitatEvaluation {
  const def = HABITATS[id];
  const capabilities = resolveCapabilities(state.completedHabitats);
  const missingItems = (Object.entries(def.requiresItems) as Array<[HabitatItemId, number]>).flatMap(
    ([itemId, need]) => {
      const have = state.itemCounts[itemId] ?? 0;
      return have >= need ? [] : [{ itemId, need, have }];
    },
  );
  const missingCapabilities = def.requiresCapabilities.filter((capability) => !capabilities.has(capability));
  const commissioningComplete = state.commissionedJobs.includes(def.commissioningJob);
  const alreadyCompleted = state.completedHabitats.includes(id);
  const bundleComplete = missingItems.length === 0;
  const readyToCommission = bundleComplete && missingCapabilities.length === 0;
  return {
    habitatId: id,
    alreadyCompleted,
    missingItems,
    missingCapabilities,
    commissioningComplete,
    bundleComplete,
    readyToCommission,
    unlockable: !alreadyCompleted && readyToCommission && commissioningComplete,
  };
}

/** Pure transition used by UI/store code: returns the same state if commissioning is invalid. */
export function completeHabitat(id: HabitatId, state: HabitatWorldState): HabitatWorldState {
  if (!evaluateHabitat(id, state).unlockable) return state;
  return { ...state, completedHabitats: [...state.completedHabitats, id] };
}

/** Data-integrity checks suitable for CI and editor tooling. */
export function validateHabitatGraph(): string[] {
  const errors: string[] = [];
  const produced = new Set<CapabilityId>();
  const seen = new Set<HabitatId>();
  const commissioningJobs = new Set<CommissioningJobId>();
  let previousStage = -1;
  for (const id of HABITAT_ORDER) {
    const def = HABITATS[id];
    if (!def) {
      errors.push(`missing habitat definition: ${id}`);
      continue;
    }
    if (seen.has(id)) errors.push(`duplicate habitat order entry: ${id}`);
    seen.add(id);
    if (def.stage < previousStage) errors.push(`${id}: stage ${def.stage} decreases after ${previousStage}`);
    previousStage = def.stage;
    if (commissioningJobs.has(def.commissioningJob)) {
      errors.push(`${id}: duplicate commissioning job ${def.commissioningJob}`);
    }
    commissioningJobs.add(def.commissioningJob);
    for (const [itemId, count] of Object.entries(def.requiresItems) as Array<[HabitatItemId, number]>) {
      if (!HABITAT_ITEMS[itemId]) errors.push(`${id}: unknown item ${itemId}`);
      if (!Number.isInteger(count) || count <= 0) errors.push(`${id}: ${itemId} requires invalid count ${count}`);
    }
    for (const capability of def.requiresCapabilities) {
      if (!produced.has(capability)) errors.push(`${id}: capability ${capability} has no earlier producer`);
    }
    for (const capability of def.grants) produced.add(capability);
  }
  for (const id of Object.keys(HABITATS) as HabitatId[]) {
    if (!seen.has(id)) errors.push(`habitat missing from order: ${id}`);
  }
  return errors;
}
