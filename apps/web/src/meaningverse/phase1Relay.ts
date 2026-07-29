export const RELAY_PART_ORDER = ["foot", "coil", "aperture"] as const;
export type RelayPart = (typeof RELAY_PART_ORDER)[number];
export const RELAY_SOCKET_ID = "z1-relay-socket" as const;
export const PHASE1_RELAY_ID = "werkstattgasse:z1:relay:1" as const;
export const COMPLETED_RELAY = "completed-relay" as const;
export type RelayCarriedPart = RelayPart | typeof COMPLETED_RELAY | null;
export type AssemblyStatus = "parts_0" | "parts_1" | "parts_2" | "parts_3" | "carrying";

export type AssemblyState = {
  readonly status: AssemblyStatus;
  readonly seatedParts: readonly RelayPart[];
  readonly carriedPart: RelayCarriedPart;
};

export type PlacementStatus = "idle" | "valid" | "invalid" | "pending" | "accepted" | "failed";
export type PlacementState = {
  readonly status: PlacementStatus;
  readonly socketId: string | null;
  readonly attemptId: string | null;
  readonly acceptedSocketId: typeof RELAY_SOCKET_ID | null;
};

export type Phase1RelayState = {
  readonly status: PlacementStatus;
  readonly assembly: AssemblyState;
  readonly placement: PlacementState;
  readonly memoryFragment: RelayMemoryFragment | null;
  readonly inspirationChoice: RelayInspirationChoice | null;
  readonly activationEpoch: number;
  readonly acceptedPlacement: boolean;
  readonly relayId: typeof PHASE1_RELAY_ID | null;
  readonly activation: Phase1ActivationFact | null;
  readonly acceptedWitness: Phase1WitnessFact | null;
  readonly acceptedLens: Phase1LensFact | null;
  readonly acceptedEventIds: readonly string[];
  readonly creatorIdentity: string | null;
  /** Presentation-only accepted delta; it is set only by a reducer-authorized evidence action. */
  readonly acceptedDelta?: Phase1AcceptedDelta | null;
  readonly acceptedEvidenceEpoch?: number;
};

export type Phase1ActivationFact = {
  readonly relayId: typeof PHASE1_RELAY_ID;
  readonly activationId: string;
  readonly creatorPubkey: string;
  readonly createdAt: number;
  readonly source: "local-signed-activation" | "verified-invite-capability";
};

export type Phase1WitnessFact = {
  readonly eventId: string;
  readonly pubkey: string;
  readonly createdAt: number;
};

export type Phase1LensFact = {
  readonly eventId: string;
  readonly pubkey: string;
  readonly witnessEventId: string;
  readonly createdAt: number;
};

/** Plan-05 presentation name for the one bounded, reducer-authorized additive lens. */
export type SignalLens = Phase1LensFact;

export type Phase1AcceptedDelta =
  | {
      readonly kind: "witness";
      readonly eventId: string;
      readonly pubkey: string;
      readonly createdAt: number;
      readonly epoch: number;
    }
  | {
      readonly kind: "lens";
      readonly eventId: string;
      readonly pubkey: string;
      readonly witnessEventId: string;
      readonly createdAt: number;
      readonly epoch: number;
    };

export type Phase1AuthorizedEvidence = {
  readonly action: "activate-relay-invite" | "touch-relay-witness" | "attach-signal-lens";
  readonly id: string;
  readonly pubkey: string;
  readonly created_at: number;
  readonly tags: readonly (readonly string[])[];
};

export type Phase1AuthorizedEvidenceAction =
  | {
      readonly type: "accepted_witness_delta";
      readonly eventId: string;
      readonly pubkey: string;
      readonly createdAt: number;
      readonly origin: "plan-04-authorized";
    }
  | {
      readonly type: "accepted_lens_delta";
      readonly eventId: string;
      readonly pubkey: string;
      readonly witnessEventId: string;
      readonly createdAt: number;
      readonly origin: "plan-04-authorized";
    };

export type Phase1ActivationCapability = {
  readonly relayId: typeof PHASE1_RELAY_ID;
  readonly activationId: string;
  readonly creatorPubkey: string;
  readonly createdAt: number;
  readonly source: "verified-invite-capability";
};

export type PhysicalRelayOrigin = "player-physical";

type PhysicalRelayAction =
  | { readonly type: "pickup_part"; readonly part: RelayPart; readonly origin: PhysicalRelayOrigin }
  | {
      readonly type: "seat_part";
      readonly part: RelayPart;
      readonly cradleId: RelayPart;
      readonly origin: PhysicalRelayOrigin;
    };

type PlacementAction =
  | {
      readonly type: "preview_placement";
      readonly socketId: string;
      readonly origin: PhysicalRelayOrigin;
    }
  | {
      readonly type: "place_requested";
      readonly socketId: string;
      readonly attemptId: string;
      readonly origin: PhysicalRelayOrigin;
    }
  | {
      readonly type: "placement_accepted";
      readonly socketId: string;
      readonly attemptId: string;
      readonly origin: "fixed-socket-completion";
    }
  | {
      readonly type: "placement_failed" | "placement_cancelled";
      readonly attemptId: string;
      readonly origin: "fixed-socket-completion";
    };

/** Compatibility input for the removed Plan-01 generic direct-activation path. It is never valid. */
export type LegacyDirectActivationAction = {
  readonly type: "activation_requested" | "activation_accepted" | "activation_failed" | "activation_cancelled";
  readonly attemptId: string;
};

type ActivationAction =
  | {
      readonly type: "activation_signed";
      readonly activationId: string;
      readonly creatorPubkey: string;
      readonly createdAt: number;
      readonly origin: "verified-local-signature";
    }
  | {
      readonly type: "activation_imported";
      readonly activationId: string;
      readonly creatorPubkey: string;
      readonly createdAt: number;
      readonly origin: "verified-invite-capability";
    };

type EvidenceAction =
  | {
      readonly type: "witness_verified";
      readonly eventId: string;
      readonly pubkey: string;
      readonly createdAt: number;
      readonly origin: "relay-live-evidence";
    }
  | {
      readonly type: "lens_verified";
      readonly eventId: string;
      readonly pubkey: string;
      readonly witnessEventId: string;
      readonly createdAt: number;
      readonly origin: "relay-live-evidence";
    };

export type Phase1RelayAction =
  | ActivationAction
  | EvidenceAction
  | Phase1AuthorizedEvidenceAction
  | PhysicalRelayAction
  | PlacementAction;

const isAttemptId = (attemptId: unknown): attemptId is string =>
  typeof attemptId === "string" && attemptId.length > 0;
const isRelayPart = (part: unknown): part is RelayPart =>
  part === "foot" || part === "coil" || part === "aperture";
const isPhysicalOrigin = (origin: unknown): origin is PhysicalRelayOrigin =>
  origin === "player-physical";
const exactKeys = (value: Record<string, unknown>, expected: readonly string[]) => {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
};

const createAssemblyState = (): AssemblyState => ({
  status: "parts_0",
  seatedParts: [],
  carriedPart: null,
});
const createPlacementState = (): PlacementState => ({
  status: "idle",
  socketId: null,
  attemptId: null,
  acceptedSocketId: null,
});

export function createPhase1RelayState(
  facts: {
    readonly memoryFragment?: RelayMemoryFragment | null;
    readonly inspirationChoice?: RelayInspirationChoice | null;
  } = {},
): Phase1RelayState {
  return {
    status: "idle",
    assembly: createAssemblyState(),
    placement: createPlacementState(),
    memoryFragment: facts.memoryFragment ?? null,
    inspirationChoice: facts.inspirationChoice ?? null,
    activationEpoch: 0,
    acceptedPlacement: false,
    relayId: null,
    activation: null,
    acceptedWitness: null,
    acceptedLens: null,
    acceptedEventIds: [],
    creatorIdentity: null,
    acceptedDelta: null,
    acceptedEvidenceEpoch: 0,
  };
}

const withPlacement = (
  state: Phase1RelayState,
  placement: PlacementState,
  patch: Partial<Pick<Phase1RelayState, "activationEpoch" | "acceptedPlacement">> = {},
): Phase1RelayState => ({
  ...state,
  status: placement.status,
  placement,
  ...patch,
});

const nextAssemblyStatus = (count: number): AssemblyStatus =>
  count === 0 ? "parts_0" : count === 1 ? "parts_1" : count === 2 ? "parts_2" : "parts_3";

const hasAssemblyGate = (state: Phase1RelayState): boolean =>
  isRelayMemoryFragment(state.memoryFragment) && isRelayInspirationChoice(state.inspirationChoice);

const isPhase1RelayAction = (value: unknown): value is Phase1RelayAction => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  switch (candidate.type) {
    case "activation_signed":
      return (
        exactKeys(candidate, ["type", "activationId", "creatorPubkey", "createdAt", "origin"]) &&
        isHex(candidate.activationId, 64) &&
        isHex(candidate.creatorPubkey, 64) &&
        Number.isSafeInteger(candidate.createdAt) &&
        (candidate.createdAt as number) >= 0 &&
        candidate.origin === "verified-local-signature"
      );
    case "activation_imported":
      return (
        exactKeys(candidate, ["type", "activationId", "creatorPubkey", "createdAt", "origin"]) &&
        isHex(candidate.activationId, 64) &&
        isHex(candidate.creatorPubkey, 64) &&
        Number.isSafeInteger(candidate.createdAt) &&
        (candidate.createdAt as number) >= 0 &&
        candidate.origin === "verified-invite-capability"
      );
    case "witness_verified":
      return (
        exactKeys(candidate, ["type", "eventId", "pubkey", "createdAt", "origin"]) &&
        isHex(candidate.eventId, 64) &&
        isHex(candidate.pubkey, 64) &&
        Number.isSafeInteger(candidate.createdAt) &&
        (candidate.createdAt as number) >= 0 &&
        candidate.origin === "relay-live-evidence"
      );
    case "lens_verified":
      return (
        exactKeys(candidate, ["type", "eventId", "pubkey", "witnessEventId", "createdAt", "origin"]) &&
        isHex(candidate.eventId, 64) &&
        isHex(candidate.pubkey, 64) &&
        isHex(candidate.witnessEventId, 64) &&
        Number.isSafeInteger(candidate.createdAt) &&
        (candidate.createdAt as number) >= 0 &&
        candidate.origin === "relay-live-evidence"
      );
    case "accepted_witness_delta":
      return (
        exactKeys(candidate, ["type", "eventId", "pubkey", "createdAt", "origin"]) &&
        isHex(candidate.eventId, 64) &&
        isHex(candidate.pubkey, 64) &&
        Number.isSafeInteger(candidate.createdAt) &&
        (candidate.createdAt as number) >= 0 &&
        candidate.origin === "plan-04-authorized"
      );
    case "accepted_lens_delta":
      return (
        exactKeys(candidate, ["type", "eventId", "pubkey", "witnessEventId", "createdAt", "origin"]) &&
        isHex(candidate.eventId, 64) &&
        isHex(candidate.pubkey, 64) &&
        isHex(candidate.witnessEventId, 64) &&
        Number.isSafeInteger(candidate.createdAt) &&
        (candidate.createdAt as number) >= 0 &&
        candidate.origin === "plan-04-authorized"
      );
    case "pickup_part":
      return exactKeys(candidate, ["type", "part", "origin"]) && isRelayPart(candidate.part) && isPhysicalOrigin(candidate.origin);
    case "seat_part":
      return (
        exactKeys(candidate, ["type", "part", "cradleId", "origin"]) &&
        isRelayPart(candidate.part) &&
        isRelayPart(candidate.cradleId) &&
        isPhysicalOrigin(candidate.origin)
      );
    case "preview_placement":
      return exactKeys(candidate, ["type", "socketId", "origin"]) && typeof candidate.socketId === "string" && candidate.socketId.length > 0 && isPhysicalOrigin(candidate.origin);
    case "place_requested":
      return (
        exactKeys(candidate, ["type", "socketId", "attemptId", "origin"]) &&
        typeof candidate.socketId === "string" &&
        candidate.socketId.length > 0 &&
        isAttemptId(candidate.attemptId) &&
        isPhysicalOrigin(candidate.origin)
      );
    case "placement_accepted":
      return (
        exactKeys(candidate, ["type", "socketId", "attemptId", "origin"]) &&
        candidate.socketId === RELAY_SOCKET_ID &&
        isAttemptId(candidate.attemptId) &&
        candidate.origin === "fixed-socket-completion"
      );
    case "placement_failed":
    case "placement_cancelled":
      return (
        exactKeys(candidate, ["type", "attemptId", "origin"]) &&
        isAttemptId(candidate.attemptId) &&
        candidate.origin === "fixed-socket-completion"
      );
    default:
      return false;
  }
};

/**
 * Reduce bounded Phase-1 physical relay truth. Meshes, timers, DOM, Kerni, and transport callbacks
 * are intentionally not action authorities; accepted truth is created only by these fail-closed guards.
 */
export function reducePhase1Relay(state: Phase1RelayState, action: Phase1RelayAction): Phase1RelayState {
  if (!isPhase1RelayAction(action)) return state;
  if (action.type === "activation_signed") {
    return acceptLocalActivation(state, {
      activationId: action.activationId,
      creatorPubkey: action.creatorPubkey,
      createdAt: action.createdAt,
    });
  }
  if (action.type === "activation_imported") {
    return importVerifiedActivationCapability(state, {
      relayId: PHASE1_RELAY_ID,
      activationId: action.activationId,
      creatorPubkey: action.creatorPubkey,
      createdAt: action.createdAt,
      source: "verified-invite-capability",
    });
  }
  if (action.type === "witness_verified") {
    return acceptPhase1Witness(
      state,
      { eventId: action.eventId, pubkey: action.pubkey, createdAt: action.createdAt },
      state.activation?.creatorPubkey ?? "",
    );
  }
  if (action.type === "lens_verified") {
    return acceptPhase1Lens(state, {
      eventId: action.eventId,
      pubkey: action.pubkey,
      witnessEventId: action.witnessEventId,
      createdAt: action.createdAt,
    });
  }
  if (action.type === "accepted_witness_delta") {
    return acceptPhase1Witness(
      state,
      { eventId: action.eventId, pubkey: action.pubkey, createdAt: action.createdAt },
      state.activation?.creatorPubkey ?? "",
    );
  }
  if (action.type === "accepted_lens_delta") {
    return acceptPhase1Lens(state, {
      eventId: action.eventId,
      pubkey: action.pubkey,
      witnessEventId: action.witnessEventId,
      createdAt: action.createdAt,
    });
  }
  if (!hasAssemblyGate(state)) return state;

  if (action.type === "pickup_part") {
    if (state.assembly.carriedPart !== null || state.assembly.status === "parts_3" || state.assembly.status === "carrying") return state;
    const expected = RELAY_PART_ORDER[state.assembly.seatedParts.length];
    if (action.part !== expected) return state;
    return { ...state, assembly: { ...state.assembly, carriedPart: action.part } };
  }

  if (action.type === "seat_part") {
    if (state.assembly.carriedPart !== action.part || action.cradleId !== action.part) return state;
    const expected = RELAY_PART_ORDER[state.assembly.seatedParts.length];
    if (action.part !== expected) return state;
    const seatedParts = [...state.assembly.seatedParts, action.part] as RelayPart[];
    if (seatedParts.length === RELAY_PART_ORDER.length) {
      return {
        ...state,
        assembly: { status: "carrying", seatedParts, carriedPart: COMPLETED_RELAY },
      };
    }
    return {
      ...state,
      assembly: {
        status: nextAssemblyStatus(seatedParts.length),
        seatedParts,
        carriedPart: null,
      },
    };
  }

  if (action.type === "preview_placement") {
    if (state.placement.status === "accepted") return state;
    const canPreview = state.assembly.carriedPart === COMPLETED_RELAY;
    const status: PlacementStatus = canPreview && action.socketId === RELAY_SOCKET_ID ? "valid" : "invalid";
    return withPlacement(state, {
      ...state.placement,
      status,
      socketId: action.socketId,
    });
  }

  if (action.type === "place_requested") {
    if (state.placement.status === "accepted") return state;
    if (state.placement.status === "pending") {
      return state.placement.attemptId === action.attemptId ? state : state;
    }
    if (state.assembly.carriedPart !== COMPLETED_RELAY || action.socketId !== RELAY_SOCKET_ID) {
      return withPlacement(state, {
        ...state.placement,
        status: "invalid",
        socketId: action.socketId,
      });
    }
    if (!["idle", "valid", "failed"].includes(state.placement.status)) return state;
    return withPlacement(state, {
      status: "pending",
      socketId: RELAY_SOCKET_ID,
      attemptId: action.attemptId,
      acceptedSocketId: null,
    });
  }

  if (action.type === "placement_accepted") {
    if (
      state.placement.status !== "pending" ||
      state.placement.attemptId !== action.attemptId ||
      state.placement.socketId !== RELAY_SOCKET_ID ||
      state.assembly.carriedPart !== COMPLETED_RELAY
    ) return state;
    return {
      ...withPlacement(
        state,
        {
          status: "accepted",
          socketId: RELAY_SOCKET_ID,
          attemptId: action.attemptId,
          acceptedSocketId: RELAY_SOCKET_ID,
        },
        {
          activationEpoch: state.activationEpoch + 1,
          acceptedPlacement: true,
        },
      ),
      relayId: PHASE1_RELAY_ID,
    };
  }

  if (state.placement.status !== "pending" || state.placement.attemptId !== action.attemptId) return state;
  return withPlacement(state, {
    ...state.placement,
    status: "failed",
  });
}

export function isRelayAccepted(state: Phase1RelayState): boolean {
  return state.placement.status === "accepted" && state.acceptedPlacement;
}

function isHex(value: unknown, length: number): value is string {
  return typeof value === "string" && new RegExp(`^[0-9a-f]{${length}}$`).test(value);
}

function isActivationCapability(value: unknown): value is Phase1ActivationCapability {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate);
  return (
    keys.length === 5 &&
    keys.every((key) => ["relayId", "activationId", "creatorPubkey", "createdAt", "source"].includes(key)) &&
    candidate.relayId === PHASE1_RELAY_ID &&
    isHex(candidate.activationId, 64) &&
    isHex(candidate.creatorPubkey, 64) &&
    Number.isSafeInteger(candidate.createdAt) &&
    (candidate.createdAt as number) >= 0 &&
    candidate.source === "verified-invite-capability"
  );
}

/** Import only the bounded result of a completed, verified URL capability. */
export function importVerifiedActivationCapability(
  state: Phase1RelayState,
  capability: unknown,
): Phase1RelayState {
  if (!isActivationCapability(capability)) return state;
  if (state.activation && state.activation.activationId !== capability.activationId) return state;
  const activation: Phase1ActivationFact = { ...capability };
  return {
    ...state,
    status: "accepted",
    placement: {
      ...state.placement,
      status: "accepted",
      socketId: RELAY_SOCKET_ID,
      acceptedSocketId: RELAY_SOCKET_ID,
    },
    acceptedPlacement: true,
    relayId: PHASE1_RELAY_ID,
    activation,
    creatorIdentity: state.creatorIdentity ?? activation.creatorPubkey,
  };
}

/** Store a verified local activation without changing the creator's primary identity. */
export function acceptLocalActivation(
  state: Phase1RelayState,
  activation: Omit<Phase1ActivationFact, "source" | "relayId">,
): Phase1RelayState {
  if (!isRelayAccepted(state) || !isHex(activation.activationId, 64) || !isHex(activation.creatorPubkey, 64)) {
    return state;
  }
  if (state.activation && state.activation.activationId !== activation.activationId) return state;
  return {
    ...state,
    relayId: PHASE1_RELAY_ID,
    activation: {
      ...activation,
      relayId: PHASE1_RELAY_ID,
      source: "local-signed-activation",
    },
    creatorIdentity: state.creatorIdentity ?? activation.creatorPubkey,
  };
}

export function acceptPhase1Witness(
  state: Phase1RelayState,
  evidence: Phase1WitnessFact,
  creatorPubkey: string,
): Phase1RelayState {
  if (
    !state.activation ||
    state.acceptedWitness ||
    !isHex(evidence.eventId, 64) ||
    !isHex(evidence.pubkey, 64) ||
    evidence.pubkey === creatorPubkey ||
    state.acceptedEventIds.includes(evidence.eventId)
  ) return state;
  return {
    ...state,
    acceptedWitness: { ...evidence },
    acceptedEventIds: [...state.acceptedEventIds, evidence.eventId].slice(-64),
    acceptedDelta: {
      kind: "witness",
      eventId: evidence.eventId,
      pubkey: evidence.pubkey,
      createdAt: evidence.createdAt,
      epoch: (state.acceptedEvidenceEpoch ?? 0) + 1,
    },
    acceptedEvidenceEpoch: (state.acceptedEvidenceEpoch ?? 0) + 1,
  };
}

export function acceptPhase1Lens(state: Phase1RelayState, evidence: Phase1LensFact): Phase1RelayState {
  if (
    !state.activation ||
    !state.acceptedWitness ||
    state.acceptedLens ||
    evidence.witnessEventId !== state.acceptedWitness.eventId ||
    evidence.pubkey !== state.acceptedWitness.pubkey ||
    !isHex(evidence.eventId, 64) ||
    state.acceptedEventIds.includes(evidence.eventId)
  ) return state;
  return {
    ...state,
    acceptedLens: { ...evidence },
    acceptedEventIds: [...state.acceptedEventIds, evidence.eventId].slice(-64),
    acceptedDelta: {
      kind: "lens",
      eventId: evidence.eventId,
      pubkey: evidence.pubkey,
      witnessEventId: evidence.witnessEventId,
      createdAt: evidence.createdAt,
      epoch: (state.acceptedEvidenceEpoch ?? 0) + 1,
    },
    acceptedEvidenceEpoch: (state.acceptedEvidenceEpoch ?? 0) + 1,
  };
}

export function getPhase1LensHandoff(state: Phase1RelayState): Phase1LensFact | null {
  return state.acceptedLens;
}

/**
 * Narrow adapter handoff: the transport has already parsed, verified, bound, rate-limited, and
 * deduplicated this event. Plan 05 turns that authorized evidence into a reducer action without
 * re-parsing or accepting raw relay input.
 */
export function createPhase1AuthorizedEvidenceAction(
  evidence: Phase1AuthorizedEvidence,
): Phase1AuthorizedEvidenceAction | null {
  if (evidence.action === "touch-relay-witness") {
    return {
      type: "accepted_witness_delta",
      eventId: evidence.id,
      pubkey: evidence.pubkey,
      createdAt: evidence.created_at,
      origin: "plan-04-authorized",
    };
  }
  if (evidence.action === "attach-signal-lens") {
    const witnessEventId = evidence.tags[5]?.[1];
    if (!witnessEventId) return null;
    return {
      type: "accepted_lens_delta",
      eventId: evidence.id,
      pubkey: evidence.pubkey,
      witnessEventId,
      createdAt: evidence.created_at,
      origin: "plan-04-authorized",
    };
  }
  return null;
}

export type Phase1EvidenceSnapshot = {
  readonly witnessEventId: string | null;
  readonly lensEventId: string | null;
  readonly evidenceEpoch: number;
};

export function phase1EvidenceSnapshot(state: Phase1RelayState): Phase1EvidenceSnapshot {
  return {
    witnessEventId: state.acceptedWitness?.eventId ?? null,
    lensEventId: state.acceptedLens?.eventId ?? null,
    evidenceEpoch: state.acceptedEvidenceEpoch ?? 0,
  };
}

/** Initial sync and reconnect snapshots establish a baseline and never emit presentation deltas. */
export function diffPhase1AcceptedEvidence(
  previous: Phase1EvidenceSnapshot | null,
  state: Phase1RelayState,
): { readonly baseline: Phase1EvidenceSnapshot; readonly delta: Phase1AcceptedDelta | null } {
  const baseline = phase1EvidenceSnapshot(state);
  if (!previous || previous.evidenceEpoch >= baseline.evidenceEpoch) {
    return { baseline, delta: null };
  }
  if (baseline.lensEventId && baseline.lensEventId !== previous.lensEventId && state.acceptedLens) {
    return { baseline, delta: state.acceptedDelta?.kind === "lens" ? state.acceptedDelta : null };
  }
  if (baseline.witnessEventId && baseline.witnessEventId !== previous.witnessEventId && state.acceptedWitness) {
    return { baseline, delta: state.acceptedDelta?.kind === "witness" ? state.acceptedDelta : null };
  }
  return { baseline, delta: null };
}

/** One bounded 900ms cyan witness pulse; the scene and the stylesheet share this single number. */
export const PHASE1_SIGNED_PULSE_MS = 900;

export type Phase1PulsePresentation = {
  /** The receive epoch this baseline belongs to; a new epoch re-baselines silently. */
  readonly receiveEpoch: number;
  readonly baseline: Phase1EvidenceSnapshot | null;
  readonly pulse: Phase1AcceptedDelta | null;
};

export function createPhase1PulsePresentation(): Phase1PulsePresentation {
  return { receiveEpoch: -1, baseline: null, pulse: null };
}

/**
 * Presentation-only reduction for the accepted-witness pulse. Mount, initial sync, and every
 * reconnect open a new receive epoch that establishes a silent baseline and drops the transient
 * effect; only a newly accepted witness delta inside the same epoch presents one pulse. The
 * presented pulse keeps its identity across later deltas (a lens acceptance, a duplicate, replayed
 * history), so the bounded 900ms interval is never restarted, cancelled, or stranded.
 */
export function advancePhase1PulsePresentation(
  previous: Phase1PulsePresentation,
  state: Phase1RelayState,
  receiveEpoch: number,
): Phase1PulsePresentation {
  if (previous.receiveEpoch !== receiveEpoch) {
    return { receiveEpoch, baseline: phase1EvidenceSnapshot(state), pulse: null };
  }
  const { baseline, delta } = diffPhase1AcceptedEvidence(previous.baseline, state);
  const pulse = delta && delta.kind === "witness" ? delta : previous.pulse;
  if (pulse === previous.pulse && baseline.evidenceEpoch === previous.baseline?.evidenceEpoch) {
    return previous;
  }
  return { receiveEpoch, baseline, pulse };
}

export type Phase1Attribution =
  | { readonly kind: "creator"; readonly pubkey: string }
  | {
      readonly kind: "signal-lens";
      readonly eventId: string;
      readonly pubkey: string;
      readonly witnessEventId: string;
      readonly createdAt: number;
    };

/** Attribution is chronological and additive; creator identity is read from immutable activation truth. */
export function getPhase1Attributions(state: Phase1RelayState): readonly Phase1Attribution[] {
  const creatorPubkey = state.creatorIdentity ?? state.activation?.creatorPubkey;
  if (!creatorPubkey) return [];
  const rows: Phase1Attribution[] = [{ kind: "creator", pubkey: creatorPubkey }];
  if (state.acceptedLens) {
    rows.push({ kind: "signal-lens", ...state.acceptedLens });
  }
  return rows;
}

export const ATTENTIVE_PRESENCE_THRESHOLD_MS = 36_000;
export const ATTENTIVE_FRAME_MAX_MS = 250;

export type AttentiveFeed = "glimpse" | "foreground" | "away" | "reopened";

export type AttentivePresenceState = {
  readonly feed: AttentiveFeed;
  readonly accumulatedMs: number;
  readonly presenceAccepted: boolean;
};

export type AttentivePresenceAction =
  | {
      readonly type: "feed_changed";
      readonly feed: AttentiveFeed;
    }
  | {
      readonly type: "active_frame_sampled";
      readonly deltaMs: number;
      readonly foregroundFocused: boolean;
      readonly documentVisible: boolean;
    };

export function createAttentivePresenceState(): AttentivePresenceState {
  return { feed: "away", accumulatedMs: 0, presenceAccepted: false };
}

const ATTENTIVE_FEEDS = new Set<AttentiveFeed>(["glimpse", "foreground", "away", "reopened"]);

const hasExactKeys = (value: Record<string, unknown>, expected: readonly string[]): boolean => {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
};

const isAttentivePresenceAction = (value: unknown): value is AttentivePresenceAction => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === "feed_changed") {
    return hasExactKeys(candidate, ["type", "feed"]) && ATTENTIVE_FEEDS.has(candidate.feed as AttentiveFeed);
  }
  if (candidate.type !== "active_frame_sampled") return false;
  return (
    hasExactKeys(candidate, ["type", "deltaMs", "foregroundFocused", "documentVisible"]) &&
    typeof candidate.deltaMs === "number" &&
    Number.isFinite(candidate.deltaMs) &&
    candidate.deltaMs >= 0 &&
    typeof candidate.foregroundFocused === "boolean" &&
    typeof candidate.documentVisible === "boolean"
  );
};

const isAttentivePresenceState = (value: unknown): value is AttentivePresenceState => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    hasExactKeys(candidate, ["feed", "accumulatedMs", "presenceAccepted"]) &&
    ATTENTIVE_FEEDS.has(candidate.feed as AttentiveFeed) &&
    typeof candidate.accumulatedMs === "number" &&
    Number.isFinite(candidate.accumulatedMs) &&
    candidate.accumulatedMs >= 0 &&
    typeof candidate.presenceAccepted === "boolean"
  );
};

/**
 * Reduce untrusted browser attention hints into monotonic application truth. The reducer never reads a
 * clock and never accepts a hidden-tab or focused-overlay sample as attentive presence.
 */
export function reduceAttentivePresence(
  state: AttentivePresenceState,
  action: AttentivePresenceAction,
): AttentivePresenceState {
  if (!isAttentivePresenceState(state) || !isAttentivePresenceAction(action)) return state;

  if (action.type === "feed_changed") {
    return { ...state, feed: action.feed };
  }

  if (
    state.feed !== "away" ||
    !action.foregroundFocused ||
    !action.documentVisible ||
    action.deltaMs < 0 ||
    !Number.isFinite(action.deltaMs)
  ) {
    return state;
  }

  const accumulatedMs = state.accumulatedMs + Math.min(action.deltaMs, ATTENTIVE_FRAME_MAX_MS);
  return {
    accumulatedMs,
    feed: state.feed,
    presenceAccepted: state.presenceAccepted || accumulatedMs >= ATTENTIVE_PRESENCE_THRESHOLD_MS,
  };
}

export type RelayMemoryFragment = {
  readonly source: "kerni-orientation";
  readonly meaning: "leave-one-small-useful-thing";
};

export type RelayInspirationChoice = {
  readonly intent: "connect-with-others";
};

export type RelayHandoffState = {
  readonly orientationInteractionAccepted: boolean;
  readonly memoryFragment: RelayMemoryFragment | null;
  readonly inspirationChoice: RelayInspirationChoice | null;
};

export type RelayHandoffAction =
  | {
      readonly type: "kerni_interaction_requested";
      readonly origin: "player";
      readonly proximity: true;
      readonly worldFocusOwned: true;
    }
  | {
      readonly type: "kerni_orientation_acknowledged";
      readonly origin: "player";
    }
  | {
      readonly type: "workbench_choice_requested";
      readonly intent: "connect-with-others";
      readonly origin: "player";
    };

const RELAY_MEMORY_FRAGMENT: RelayMemoryFragment = {
  source: "kerni-orientation",
  meaning: "leave-one-small-useful-thing",
};
const RELAY_INSPIRATION_CHOICE: RelayInspirationChoice = { intent: "connect-with-others" };

export function createRelayHandoffState(): RelayHandoffState {
  return {
    orientationInteractionAccepted: false,
    memoryFragment: null,
    inspirationChoice: null,
  };
}

const isRelayMemoryFragment = (value: unknown): value is RelayMemoryFragment => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    hasExactKeys(candidate, ["source", "meaning"]) &&
    candidate.source === "kerni-orientation" &&
    candidate.meaning === "leave-one-small-useful-thing"
  );
};

const isRelayInspirationChoice = (value: unknown): value is RelayInspirationChoice => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return hasExactKeys(candidate, ["intent"]) && candidate.intent === "connect-with-others";
};

const isRelayHandoffState = (value: unknown): value is RelayHandoffState => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    hasExactKeys(candidate, ["orientationInteractionAccepted", "memoryFragment", "inspirationChoice"]) &&
    typeof candidate.orientationInteractionAccepted === "boolean" &&
    (candidate.memoryFragment === null || isRelayMemoryFragment(candidate.memoryFragment)) &&
    (candidate.inspirationChoice === null || isRelayInspirationChoice(candidate.inspirationChoice))
  );
};

const isRelayHandoffAction = (value: unknown): value is RelayHandoffAction => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === "kerni_interaction_requested") {
    return (
      hasExactKeys(candidate, ["type", "origin", "proximity", "worldFocusOwned"]) &&
      candidate.origin === "player" &&
      candidate.proximity === true &&
      candidate.worldFocusOwned === true
    );
  }
  if (candidate.type === "kerni_orientation_acknowledged") {
    return hasExactKeys(candidate, ["type", "origin"]) && candidate.origin === "player";
  }
  if (candidate.type === "workbench_choice_requested") {
    return (
      hasExactKeys(candidate, ["type", "intent", "origin"]) &&
      candidate.intent === "connect-with-others" &&
      candidate.origin === "player"
    );
  }
  return false;
};

/**
 * Reduce the explicit Kerni-to-workbench handoff. Scene, presentation, animation, and world-agent
 * callbacks are intentionally not part of the action vocabulary; only ordered player intents can
 * create the two bounded application-owned facts.
 */
export function reduceRelayHandoff(
  state: RelayHandoffState,
  action: RelayHandoffAction,
): RelayHandoffState {
  if (!isRelayHandoffState(state) || !isRelayHandoffAction(action)) return state;

  switch (action.type) {
    case "kerni_interaction_requested":
      return state.orientationInteractionAccepted
        ? state
        : { ...state, orientationInteractionAccepted: true };
    case "kerni_orientation_acknowledged":
      if (!state.orientationInteractionAccepted || state.memoryFragment) return state;
      return { ...state, memoryFragment: RELAY_MEMORY_FRAGMENT };
    case "workbench_choice_requested":
      if (!state.memoryFragment || state.inspirationChoice) return state;
      return { ...state, inspirationChoice: RELAY_INSPIRATION_CHOICE };
    default:
      return state;
  }
}

/** The Phase-1 assembly gate is the conjunction of the two accepted application facts. */
export function relayAssemblyEligible(
  state: Pick<Phase1RelayState, "memoryFragment" | "inspirationChoice"> | RelayHandoffState,
): boolean {
  return isRelayMemoryFragment(state.memoryFragment) && isRelayInspirationChoice(state.inspirationChoice);
}

export const deriveRelayAssemblyEligible = relayAssemblyEligible;
