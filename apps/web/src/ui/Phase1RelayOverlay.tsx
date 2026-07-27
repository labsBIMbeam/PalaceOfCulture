import type { Phase1RelayState } from "../meaningverse/phase1Relay";

type Phase1RelayOverlayProps = {
  state: Phase1RelayState;
  onActivate?: () => void;
};

/** Bounded relay status surface; every visible state is derived from application truth. */
export function Phase1RelayOverlay({ state, onActivate }: Phase1RelayOverlayProps) {
  const status =
    state.status === "accepted"
      ? "OPEN"
      : state.status === "pending"
        ? "Securing relay…"
        : state.status === "failed"
          ? "The relay did not secure. Try the socket again."
          : "Relay closed.";

  return (
    <section
      aria-label="Phase-1 relay"
      data-relay-socket="werkstattgasse:z1:relay:1"
      data-relay-status={state.status}
    >
      <div aria-live="polite" role="status">
        {state.status === "accepted" ? <span aria-hidden="true">◯ </span> : null}
        <span>{status}</span>
      </div>
      {state.status !== "accepted" && onActivate ? (
        <button onClick={onActivate} type="button">
          Secure relay at fixed socket
        </button>
      ) : null}
    </section>
  );
}
