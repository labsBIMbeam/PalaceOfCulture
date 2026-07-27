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

/**
 * Reduce the bounded Phase-1 relay activation truth. External effects and presentation are
 * deliberately absent: only a matching pending attempt can become accepted.
 */
export function reducePhase1Relay(
  state: Phase1RelayState,
  action: Phase1RelayAction,
): Phase1RelayState {
  if (!isAttemptId(action.attemptId)) return state;

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
