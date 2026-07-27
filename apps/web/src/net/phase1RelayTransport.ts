import type { Phase1RelayState } from "../meaningverse/phase1Relay";

export interface Phase1RelayTransport {
  openRelay(attemptId: string): void;
  dispose(): void;
}

export interface Phase1RelayLifecycleGate {
  apply(state: Phase1RelayState): void;
  dispose(): void;
}

/**
 * Convert the accepted application-state delta into one bounded transport effect. The adapter sees
 * only the attempt identifier and cannot write relay truth back into the reducer.
 */
export function createPhase1RelayLifecycleGate(
  transport: Phase1RelayTransport,
): Phase1RelayLifecycleGate {
  let previous: Phase1RelayState = { status: "inactive" };
  let disposed = false;
  let openedAttemptId: string | null = null;

  return {
    apply(next) {
      if (disposed) return;

      if (
        previous.status === "pending" &&
        next.status === "accepted" &&
        previous.attemptId === next.attemptId &&
        openedAttemptId !== next.attemptId
      ) {
        openedAttemptId = next.attemptId;
        transport.openRelay(next.attemptId);
      }
      previous = next;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      transport.dispose();
    },
  };
}
