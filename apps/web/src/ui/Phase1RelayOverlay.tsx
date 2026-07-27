import { useEffect, useRef } from "react";
import type {
  AttentivePresenceState,
  Phase1RelayState,
  RelayHandoffState,
} from "../meaningverse/phase1Relay";
import { FICTIONAL_WIRE_CARDS } from "../meaningverse/onboardingStory";

type Phase1RelayOverlayProps = {
  state: Phase1RelayState;
  attentivePresence?: AttentivePresenceState;
  handoffState?: RelayHandoffState;
  kerniInRange?: boolean;
  kerniDialogueOpen?: boolean;
  onActivate?: () => void;
  wireOpen?: boolean;
  onWireDismiss?: () => void;
  onWireReopen?: () => void;
  onKerniInteract?: () => void;
  onKerniAcknowledge?: () => void;
  onKerniClose?: () => void;
  onBeginRelay?: () => void;
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

function KerniDialogue({
  open,
  orientationInteractionAccepted,
  acknowledged,
  onAcknowledge,
  onClose,
}: {
  open: boolean;
  orientationInteractionAccepted: boolean;
  acknowledged: boolean;
  onAcknowledge: () => void;
  onClose: () => void;
}) {
  const closeAndReturnFocus = () => {
    onClose();
    window.setTimeout(() => {
      document
        .querySelector<HTMLElement>("[data-kerni-interaction], [data-phase1-safe-control]")
        ?.focus();
    }, 0);
  };
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.code === "KeyE") {
        event.preventDefault();
        event.stopPropagation();
        closeAndReturnFocus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        "button, [tabindex]:not([tabindex='-1'])",
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
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, open]);

  if (!open || !orientationInteractionAccepted) return null;
  return (
    <section
      aria-label="Kerni dialogue"
      aria-modal="true"
      className="phase1-kerni-dialogue"
      data-kerni-dialogue="open"
      ref={panelRef}
      role="dialog"
    >
      <p className="phase1-kerni-dialogue__label">KERNI · WORLD AGENT · SUGGESTION ONLY</p>
      <span className="visually-hidden">Listen to Kerni</span>
      <h2 ref={headingRef} tabIndex={-1}>
        Suggestion only
      </h2>
      <p className="phase1-kerni-dialogue__line">
        Welcome. No rush — the Palace gets better when people leave something useful behind. Start with
        one small thing.
      </p>
      <div className="phase1-kerni-dialogue__actions">
        {!acknowledged ? (
          <button onClick={onAcknowledge} type="button">
            Acknowledge
          </button>
        ) : null}
        <button onClick={onClose} type="button">
          Close Kerni dialogue
        </button>
      </div>
    </section>
  );
}

/** Bounded relay status surface; every visible state is derived from application truth. */
export function Phase1RelayOverlay({
  state,
  attentivePresence,
  handoffState = {
    orientationInteractionAccepted: false,
    memoryFragment: null,
    inspirationChoice: null,
  },
  kerniInRange = false,
  kerniDialogueOpen = false,
  onActivate,
  wireOpen = false,
  onWireDismiss = () => {},
  onWireReopen = () => {},
  onKerniInteract = () => {},
  onKerniAcknowledge = () => {},
  onKerniClose = () => {},
  onBeginRelay = () => {},
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
      {kerniInRange && !handoffState.memoryFragment && !kerniDialogueOpen ? (
        <div className="phase1-kerni-proximity" data-kerni-proximity="2.6m">
          <button
            className="phase1-kerni-interact"
            data-kerni-interaction="true"
            onClick={onKerniInteract}
            type="button"
          >
            <span className="phase1-kerni-key">E</span>
            <span>Listen to Kerni</span>
          </button>
          <span className="phase1-kerni-label">KERNI · WORLD AGENT · SUGGESTION ONLY</span>
        </div>
      ) : null}
      {handoffState.memoryFragment && !handoffState.inspirationChoice ? (
        <section className="phase1-workbench-choice" data-workbench-choice="connect-with-others">
          <button data-phase1-safe-control="true" onClick={onBeginRelay} type="button">
            Begin relay
          </button>
        </section>
      ) : null}
      <KerniDialogue
        acknowledged={Boolean(handoffState.memoryFragment)}
        onAcknowledge={() => {
          onKerniAcknowledge();
          onKerniClose();
        }}
        onClose={onKerniClose}
        open={kerniDialogueOpen}
        orientationInteractionAccepted={handoffState.orientationInteractionAccepted}
      />
      <FictionalWire
        onDismiss={onWireDismiss}
        onReopen={onWireReopen}
        open={wireOpen}
      />
    </>
  );
}
