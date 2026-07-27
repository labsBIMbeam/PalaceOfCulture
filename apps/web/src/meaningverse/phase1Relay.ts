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
