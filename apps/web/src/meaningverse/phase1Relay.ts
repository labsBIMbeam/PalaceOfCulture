export type Phase1RelayState =
  | { readonly status: "inactive" }
  | { readonly status: "pending"; readonly attemptId: string }
  | { readonly status: "accepted"; readonly attemptId: string }
  | { readonly status: "failed"; readonly attemptId: string };

export type Phase1RelayAction =
  | { readonly type: "activation_requested"; readonly attemptId: string }
  | { readonly type: "activation_accepted"; readonly attemptId: string }
  | { readonly type: "activation_failed"; readonly attemptId: string }
  | { readonly type: "activation_cancelled"; readonly attemptId: string };

const isAttemptId = (attemptId: unknown): attemptId is string =>
  typeof attemptId === "string" && attemptId.length > 0;

const isPhase1RelayAction = (value: unknown): value is Phase1RelayAction => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate);
  if (keys.length !== 2 || !keys.includes("type") || !keys.includes("attemptId")) {
    return false;
  }
  return (
    (candidate.type === "activation_requested" ||
      candidate.type === "activation_accepted" ||
      candidate.type === "activation_failed" ||
      candidate.type === "activation_cancelled") &&
    isAttemptId(candidate.attemptId)
  );
};

/**
 * Reduce the bounded Phase-1 relay activation truth. External effects and presentation are
 * deliberately absent: only a matching pending attempt can become accepted.
 */
export function reducePhase1Relay(
  state: Phase1RelayState,
  action: Phase1RelayAction,
): Phase1RelayState {
  if (!isPhase1RelayAction(action)) return state;

  switch (action.type) {
    case "activation_requested":
      if (state.status === "inactive" || state.status === "failed") {
        return { status: "pending", attemptId: action.attemptId };
      }
      return state;
    case "activation_accepted":
      if (state.status === "pending" && state.attemptId === action.attemptId) {
        return { status: "accepted", attemptId: action.attemptId };
      }
      return state;
    case "activation_failed":
      if (state.status === "pending" && state.attemptId === action.attemptId) {
        return { status: "failed", attemptId: action.attemptId };
      }
      return state;
    case "activation_cancelled":
      if (state.status === "pending" && state.attemptId === action.attemptId) {
        return { status: "inactive" };
      }
      return state;
    default:
      return state;
  }
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

/** The Plan-03 handoff is eligible only after both explicit application-owned facts exist. */
export function relayAssemblyEligible(state: RelayHandoffState): boolean {
  return Boolean(state.memoryFragment && state.inspirationChoice);
}

export const deriveRelayAssemblyEligible = relayAssemblyEligible;
