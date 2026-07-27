import assert from "node:assert/strict";
import {
  RELAY_PART_ORDER,
  type Phase1RelayState,
  type RelayMemoryFragment,
  type RelayInspirationChoice,
  createPhase1RelayState,
  reducePhase1Relay,
  relayAssemblyEligible,
} from "../src/meaningverse/phase1Relay";

const memory: RelayMemoryFragment = {
  source: "kerni-orientation",
  meaning: "leave-one-small-useful-thing",
};
const inspiration: RelayInspirationChoice = { intent: "connect-with-others" };

const ready = () => createPhase1RelayState({ memoryFragment: memory, inspirationChoice: inspiration });
const physical = { origin: "player-physical" as const };

let state = createPhase1RelayState();
assert.equal(relayAssemblyEligible(state), false, "assembly starts gated");
assert.equal(
  reducePhase1Relay(state, { type: "pickup_part", part: "foot", ...physical }),
  state,
  "foot pickup without the accepted memory and inspiration is inert",
);

const memoryOnly = createPhase1RelayState({ memoryFragment: memory, inspirationChoice: null });
assert.equal(relayAssemblyEligible(memoryOnly), false);
assert.equal(
  reducePhase1Relay(memoryOnly, { type: "pickup_part", part: "foot", ...physical }),
  memoryOnly,
  "memory alone cannot open physical assembly",
);
const inspirationOnly = createPhase1RelayState({ memoryFragment: null, inspirationChoice: inspiration });
assert.equal(relayAssemblyEligible(inspirationOnly), false);
assert.equal(
  reducePhase1Relay(inspirationOnly, { type: "pickup_part", part: "foot", ...physical }),
  inspirationOnly,
  "inspiration alone cannot open physical assembly",
);

const sceneForged = reducePhase1Relay(ready(), {
  type: "pickup_part",
  part: "foot",
  origin: "scene-callback",
} as never);
assert.deepEqual(sceneForged, ready(), "scene callbacks cannot pick up parts");
const aiForged = reducePhase1Relay(ready(), {
  type: "pickup_part",
  part: "foot",
  origin: "world-agent",
} as never);
assert.deepEqual(aiForged, ready(), "AI/world-agent input cannot pick up parts");
const presentationForged = reducePhase1Relay(ready(), {
  type: "pickup_part",
  part: "foot",
  origin: "presentation",
} as never);
assert.deepEqual(presentationForged, ready(), "presentation callbacks cannot pick up parts");

state = ready();
assert.deepEqual(state.assembly.seatedParts, []);
assert.equal(state.assembly.carriedPart, null);
state = reducePhase1Relay(state, { type: "pickup_part", part: "foot", ...physical });
assert.equal(state.assembly.carriedPart, "foot");
assert.deepEqual(state.assembly.seatedParts, []);
assert.equal(state.assembly.status, "parts_0");

assert.deepEqual(
  reducePhase1Relay(state, { type: "pickup_part", part: "coil", ...physical }),
  state,
  "only the next unseated part can be picked up",
);
assert.deepEqual(
  reducePhase1Relay(state, { type: "seat_part", part: "foot", cradleId: "coil", ...physical }),
  state,
  "a carried part resists the wrong cradle",
);
state = reducePhase1Relay(state, {
  type: "seat_part",
  part: "foot",
  cradleId: "foot",
  ...physical,
});
assert.deepEqual(state.assembly.seatedParts, ["foot"]);
assert.equal(state.assembly.carriedPart, null);
assert.equal(state.assembly.status, "parts_1");

state = reducePhase1Relay(state, { type: "pickup_part", part: "coil", ...physical });
state = reducePhase1Relay(state, {
  type: "seat_part",
  part: "coil",
  cradleId: "coil",
  ...physical,
});
assert.deepEqual(state.assembly.seatedParts, ["foot", "coil"]);
assert.equal(state.assembly.status, "parts_2");

assert.deepEqual(
  reducePhase1Relay(state, { type: "seat_part", part: "aperture", cradleId: "aperture", ...physical }),
  state,
  "an uncarried part cannot be seated",
);
state = reducePhase1Relay(state, { type: "pickup_part", part: "aperture", ...physical });
state = reducePhase1Relay(state, {
  type: "seat_part",
  part: "aperture",
  cradleId: "aperture",
  ...physical,
});
assert.deepEqual(state.assembly.seatedParts, RELAY_PART_ORDER);
assert.equal(state.assembly.status, "carrying");
assert.equal(state.assembly.carriedPart, "completed-relay");

const completed = state;
assert.deepEqual(
  reducePhase1Relay(completed, { type: "pickup_part", part: "foot", ...physical }),
  completed,
  "a completed relay is not a fourth part",
);
assert.deepEqual(
  reducePhase1Relay(completed, {
    type: "seat_part",
    part: "aperture",
    cradleId: "aperture",
    ...physical,
  }),
  completed,
  "repeated seating is idempotent",
);

for (const forged of [
  { type: "pickup_part", part: "foot", origin: "text" },
  { type: "pickup_part", part: "foot", origin: "kerni" },
  { type: "seat_part", part: "foot", cradleId: "foot", origin: "animation" },
  { type: "seat_part", part: "coil", cradleId: "coil", origin: "mesh-position" },
  { type: "seat_part", part: "coil", cradleId: "coil", origin: "presentation" },
]) {
  assert.deepEqual(
    reducePhase1Relay(ready(), forged as never),
    ready(),
    `untrusted ${String(forged.origin)} intent is a no-op`,
  );
}

const malformed = { type: "pickup_part", part: "foot", ...physical, extra: true };
assert.deepEqual(reducePhase1Relay(ready(), malformed as never), ready());
assert.deepEqual(reducePhase1Relay(ready(), null as never), ready());

console.log("\nPHASE 1 PLACEMENT ASSEMBLY RED/GREEN CONTRACT");
