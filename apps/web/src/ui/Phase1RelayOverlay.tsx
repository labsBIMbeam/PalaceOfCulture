import { useEffect, useRef } from "react";
import type {
  AttentivePresenceState,
  Phase1RelayState,
} from "../meaningverse/phase1Relay";
import { FICTIONAL_WIRE_CARDS } from "../meaningverse/onboardingStory";

type Phase1RelayOverlayProps = {
  state: Phase1RelayState;
  attentivePresence?: AttentivePresenceState;
  onActivate?: () => void;
  wireOpen?: boolean;
  onWireDismiss?: () => void;
  onWireReopen?: () => void;
};

type FictionalWireProps = {
  open: boolean;
  onDismiss: () => void;
  onReopen: () => void;
};

function FictionalWire({ open, onDismiss, onReopen }: FictionalWireProps) {
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    headingRef.current?.focus();
    const containFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
        window.setTimeout(() => reopenRef.current?.focus(), 0);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", containFocus, true);
    return () => document.removeEventListener("keydown", containFocus, true);
  }, [onDismiss, open]);

  return (
    <>
      <button
        aria-label="Reopen the fictional Wire"
        className="phase1-wire-reopen"
        hidden={open}
        onClick={onReopen}
        ref={reopenRef}
        type="button"
      >
        Wire
      </button>
      {open ? (
        <section
          aria-labelledby="phase1-wire-heading"
          aria-modal="true"
          className="phase1-wire"
          data-phase1-wire="open"
          ref={panelRef}
          role="dialog"
        >
          <header className="phase1-wire__head">
            <div>
              <p className="phase1-wire__kicker">FICTIONAL</p>
              <h2 id="phase1-wire-heading" ref={headingRef} tabIndex={-1}>
                THE NEARBY WIRE
              </h2>
            </div>
            <span aria-hidden="true" className="phase1-wire__mark">
              ◌
            </span>
          </header>
          <div className="phase1-wire__body">
            {FICTIONAL_WIRE_CARDS.map((card) => (
              <article className="phase1-wire__card" key={card.kicker}>
                <h3>{card.kicker}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
          <footer className="phase1-wire__foot">
            <button className="phase1-wire__dismiss" onClick={onDismiss} type="button">
              Put away
            </button>
            <span className="visually-hidden">Press Escape to put away the Wire.</span>
          </footer>
        </section>
      ) : null}
    </>
  );
}

/** Bounded relay status surface; every visible state is derived from application truth. */
export function Phase1RelayOverlay({
  state,
  attentivePresence,
  onActivate,
  wireOpen = false,
  onWireDismiss = () => {},
  onWireReopen = () => {},
}: Phase1RelayOverlayProps) {
  const status =
    state.status === "accepted"
      ? "OPEN"
      : state.status === "pending"
        ? "Securing relay…"
        : state.status === "failed"
          ? "The relay did not secure. Try the socket again."
          : "Relay closed.";

  return (
    <>
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
      {attentivePresence?.presenceAccepted ? (
        <div
          aria-live="polite"
          className="phase1-presence-status"
          data-presence-state="accepted"
          role="status"
        >
          <span aria-hidden="true">◉ </span>
          <span>[The workbench is easier to notice now.]</span>
        </div>
      ) : null}
      <FictionalWire
        onDismiss={onWireDismiss}
        onReopen={onWireReopen}
        open={wireOpen}
      />
    </>
  );
}
