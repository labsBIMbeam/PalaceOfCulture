import assert from "node:assert/strict";
import {
  RELAY_PART_ORDER,
  RELAY_SOCKET_ID,
  type Phase1RelayAction,
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

const completedState = () => {
  let current = ready();
  for (const part of RELAY_PART_ORDER) {
    current = reducePhase1Relay(current, { type: "pickup_part", part, ...physical });
    current = reducePhase1Relay(current, {
      type: "seat_part",
      part,
      cradleId: part,
      ...physical,
    });
  }
  return current;
};

const incomplete = ready();
const invalidTarget = reducePhase1Relay(incomplete, {
  type: "place_requested",
  socketId: "z1-other-socket",
  attemptId: "attempt-invalid",
  ...physical,
});
assert.equal(invalidTarget.status, "invalid");
assert.equal(invalidTarget.assembly.carriedPart, null);

const assembled = completedState();
const wrongPreview = reducePhase1Relay(assembled, {
  type: "preview_placement",
  socketId: "z1-other-socket",
  ...physical,
});
assert.equal(wrongPreview.status, "invalid");
assert.equal(wrongPreview.assembly.carriedPart, "completed-relay");
const validPreview = reducePhase1Relay(assembled, {
  type: "preview_placement",
  socketId: RELAY_SOCKET_ID,
  ...physical,
});
assert.equal(validPreview.status, "valid");

const pendingA = reducePhase1Relay(validPreview, {
  type: "place_requested",
  socketId: RELAY_SOCKET_ID,
  attemptId: "attempt-a",
  ...physical,
});
assert.equal(pendingA.status, "pending");
assert.equal(pendingA.placement.attemptId, "attempt-a");
const duplicateA = reducePhase1Relay(pendingA, {
  type: "place_requested",
  socketId: RELAY_SOCKET_ID,
  attemptId: "attempt-a",
  ...physical,
});
assert.deepEqual(duplicateA, pendingA, "duplicate same-ID request is idempotent");
const contenderB = reducePhase1Relay(pendingA, {
  type: "place_requested",
  socketId: RELAY_SOCKET_ID,
  attemptId: "attempt-b",
  ...physical,
});
assert.deepEqual(contenderB, pendingA, "a different contender cannot replace the winner");

assert.deepEqual(
  reducePhase1Relay(pendingA, {
    type: "placement_accepted",
    socketId: RELAY_SOCKET_ID,
    attemptId: "stale",
    origin: "fixed-socket-completion",
  }),
  pendingA,
  "stale completion cannot accept",
);
const acceptedA = reducePhase1Relay(pendingA, {
  type: "placement_accepted",
  socketId: RELAY_SOCKET_ID,
  attemptId: "attempt-a",
  origin: "fixed-socket-completion",
});
assert.equal(acceptedA.status, "accepted");
assert.equal(acceptedA.acceptedPlacement, true);
assert.equal(acceptedA.activationEpoch, 1);
assert.equal(acceptedA.placement.acceptedSocketId, RELAY_SOCKET_ID);
for (const late of [
  {
    type: "placement_accepted",
    socketId: RELAY_SOCKET_ID,
    attemptId: "attempt-b",
    origin: "fixed-socket-completion",
  },
  {
    type: "placement_failed",
    attemptId: "attempt-a",
    origin: "fixed-socket-completion",
  },
  {
    type: "placement_cancelled",
    attemptId: "attempt-a",
    origin: "fixed-socket-completion",
  },
  {
    type: "place_requested",
    socketId: RELAY_SOCKET_ID,
    attemptId: "attempt-c",
    ...physical,
  },
] as const) {
  assert.deepEqual(reducePhase1Relay(acceptedA, late as never), acceptedA, "accepted winner is frozen");
}

const pendingForFailure = reducePhase1Relay(
  reducePhase1Relay(assembled, {
    type: "preview_placement",
    socketId: RELAY_SOCKET_ID,
    ...physical,
  }),
  { type: "place_requested", socketId: RELAY_SOCKET_ID, attemptId: "attempt-fail", ...physical },
);
const failed = reducePhase1Relay(pendingForFailure, {
  type: "placement_failed",
  attemptId: "attempt-fail",
  origin: "fixed-socket-completion",
});
assert.equal(failed.status, "failed");
assert.equal(failed.acceptedPlacement, false);
assert.equal(failed.assembly.carriedPart, "completed-relay");
const retried = reducePhase1Relay(failed, {
  type: "place_requested",
  socketId: RELAY_SOCKET_ID,
  attemptId: "attempt-retry",
  ...physical,
});
assert.equal(retried.status, "pending");
assert.equal(retried.placement.attemptId, "attempt-retry");
assert.equal(retried.activationEpoch, 0);
const cancelled = reducePhase1Relay(retried, {
  type: "placement_cancelled",
  attemptId: "attempt-retry",
  origin: "fixed-socket-completion",
});
assert.equal(cancelled.status, "failed");
assert.equal(cancelled.assembly.carriedPart, "completed-relay");
assert.equal(cancelled.acceptedPlacement, false);

const legacyPending = pendingForFailure;
for (const legacy of [
  { type: "activation_requested", attemptId: "legacy" },
  { type: "activation_accepted", attemptId: "attempt-fail" },
  { type: "activation_failed", attemptId: "attempt-fail" },
  { type: "activation_cancelled", attemptId: "attempt-fail" },
]) {
  assert.deepEqual(
    reducePhase1Relay(legacyPending, legacy as unknown as Phase1RelayAction),
    legacyPending,
    "Plan-01 direct activation compatibility shape is a permanent no-op",
  );
}

console.log("\nPHASE 1 PLACEMENT ASSEMBLY RED/GREEN CONTRACT");
