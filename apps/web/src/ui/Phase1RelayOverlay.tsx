import { useEffect, useRef, useState } from "react";
import type { Phase1InviteState } from "../meaningverse/model";
import type {
  AttentivePresenceState,
  Phase1RelayState,
  RelayHandoffState,
} from "../meaningverse/phase1Relay";
import { RELAY_PART_ORDER, RELAY_SOCKET_ID } from "../meaningverse/phase1Relay";
import { FICTIONAL_WIRE_CARDS } from "../meaningverse/onboardingStory";

type Phase1RelayOverlayProps = {
  state: Phase1RelayState;
  attentivePresence?: AttentivePresenceState;
  handoffState?: RelayHandoffState;
  kerniInRange?: boolean;
  kerniDialogueOpen?: boolean;
  onActivate?: () => void;
  onPickupPart?: (part: (typeof RELAY_PART_ORDER)[number]) => void;
  onSeatPart?: (part: (typeof RELAY_PART_ORDER)[number]) => void;
  onPreviewPlacement?: () => void;
  onPlaceRelay?: () => void;
  onRetryPlacement?: () => void;
  onKeepHolding?: () => void;
  wireOpen?: boolean;
  onWireDismiss?: () => void;
  onWireReopen?: () => void;
  onKerniInteract?: () => void;
  onKerniAcknowledge?: () => void;
  onKerniClose?: () => void;
  onBeginRelay?: () => void;
  activationInviteUrl?: string | null;
  inviteState?: Phase1InviteState;
  onInviteConsent?: () => void;
  onInviteCancel?: () => void;
  witnessState?: Phase1InviteState;
  lensState?: Phase1InviteState;
  onWitnessConsent?: () => void;
  onLensConsent?: () => void;
  onWitnessCancel?: () => void;
  onLensCancel?: () => void;
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
  onPickupPart = () => {},
  onSeatPart = () => {},
  onPreviewPlacement = () => {},
  onPlaceRelay = () => {},
  onRetryPlacement = () => {},
  onKeepHolding = () => {},
  wireOpen = false,
  onWireDismiss = () => {},
  onWireReopen = () => {},
  onKerniInteract = () => {},
  onKerniAcknowledge = () => {},
  onKerniClose = () => {},
  onBeginRelay = () => {},
  activationInviteUrl = null,
  inviteState = "idle",
  onInviteConsent = () => {},
  onInviteCancel = () => {},
  witnessState = "idle",
  lensState = "idle",
  onWitnessConsent = () => {},
  onLensConsent = () => {},
  onWitnessCancel = () => {},
  onLensCancel = () => {},
}: Phase1RelayOverlayProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const inviteHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (inviteOpen) inviteHeadingRef.current?.focus();
  }, [inviteOpen]);
  const status =
    state.status === "accepted"
      ? "OPEN"
      : state.status === "pending"
        ? "Securing relay…"
        : state.status === "failed"
          ? "The relay did not secure. Try the socket again."
          : "Relay closed.";
  const placement = state.placement ?? {
    status: state.status === "pending" ? "pending" : state.status === "accepted" ? "accepted" : state.status === "failed" ? "failed" : "idle",
    socketId: null,
    attemptId: null,
    acceptedSocketId: null,
  };
  const assembly = state.assembly ?? { status: "parts_0" as const, seatedParts: [], carriedPart: null };
  const placementCopy =
    placement.status === "valid"
      ? "VALID"
      : placement.status === "invalid"
        ? "This relay fits the workbench socket."
        : placement.status === "pending"
          ? "Securing relay…"
          : placement.status === "failed"
            ? "The relay did not secure. Try the socket again."
            : placement.status;
  const nextPart = RELAY_PART_ORDER[assembly.seatedParts.length];

  return (
    <>
      <section
        aria-label="Phase-1 relay"
        data-placement-socket={RELAY_SOCKET_ID}
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
      {state.status === "accepted" ? (
        <section aria-label="Relay invite" data-phase1-relay-invite="open">
          <h2>Relay is OPEN</h2>
          <p>The light is on. Invite one person when you want to.</p>
          <button data-phase1-safe-control="true" onClick={() => setInviteOpen(true)} type="button">
            Copy invite
          </button>
        </section>
      ) : null}
      {inviteOpen ? (
        <section
          aria-labelledby="phase1-invite-heading"
          aria-modal="true"
          data-phase1-invite="consent"
          role="dialog"
        >
          <h2 id="phase1-invite-heading" ref={inviteHeadingRef} tabIndex={-1}>
            Share this relay invite?
          </h2>
          <p>
            The activation capability is signed for this relay only. It is never published, and showing
            or copying it does not prove that anyone received it.
          </p>
          <p data-phase1-invite-action="activate-relay-invite">activate-relay-invite</p>
          {activationInviteUrl ? (
            <label>
              Copy the invite manually
              <textarea aria-label="Selectable relay invite" readOnly value={activationInviteUrl} />
            </label>
          ) : null}
          <p aria-live="polite" role="status">
            {inviteState === "copied"
              ? "Invite copied"
              : inviteState === "manual"
                ? "I copied it"
                : inviteState === "failed"
                  ? "The invite could not be copied. Select the link or try again."
                  : "Nothing is shared until you approve the activation signature."}
          </p>
          <button onClick={onInviteConsent} type="button">
            Approve activation signature
          </button>
          <button
            onClick={() => {
              setInviteOpen(false);
              onInviteCancel();
            }}
            type="button"
          >
            Not now
          </button>
          <button onClick={() => setInviteOpen(false)} type="button">
            Close invite
          </button>
        </section>
      ) : null}
      {state.status === "accepted" && state.activation?.source === "verified-invite-capability" && !state.acceptedWitness ? (
        <section aria-label="Signed light pulse" data-phase1-witness="consent">
          <h2>SIGNED LIGHT PULSE</h2>
          <p>Send one light pulse? Your signer approves one dependency-bound witness event.</p>
          <p aria-live="polite" role="status">
            {witnessState === "waiting"
              ? "Waiting for relay-backed confirmation…"
              : witnessState === "failed"
                ? "The pulse could not be verified. Nothing changed."
                : witnessState === "cancelled"
                  ? "No pulse was sent. The relay stays OPEN."
                  : "Nothing is sent until you approve a signature."}
          </p>
          {witnessState === "signer_pending" || witnessState === "waiting" ? (
            <button onClick={onWitnessCancel} type="button">Cancel signing</button>
          ) : (
            <button onClick={onWitnessConsent} type="button">Sign pulse</button>
          )}
          <button onClick={onWitnessCancel} type="button">Not now</button>
        </section>
      ) : null}
      {state.status === "accepted" && state.acceptedWitness && !state.acceptedLens ? (
        <section aria-label="Signal lens" data-phase1-lens="consent">
          <h2>ATTACH SIGNAL LENS</h2>
          <p>Attach one bounded lens to the accepted witness. Nothing changes until relay confirmation.</p>
          <p aria-live="polite" role="status">
            {lensState === "waiting"
              ? "Waiting for relay-backed confirmation…"
              : lensState === "failed"
                ? "The lens could not be verified. Nothing changed."
                : lensState === "cancelled"
                  ? "No lens was sent. The relay stays OPEN."
                  : "Nothing is sent until you approve a signature."}
          </p>
          {lensState === "signer_pending" || lensState === "waiting" ? (
            <button onClick={onLensCancel} type="button">Cancel signing</button>
          ) : (
            <button onClick={onLensConsent} type="button">Sign lens</button>
          )}
          <button onClick={onLensCancel} type="button">Not now</button>
        </section>
      ) : null}
      <section aria-label="Relay assembly" data-relay-assembly={assembly.status}>
        <p>Relay parts: {assembly.seatedParts.length}/3</p>
        <ul>
          {RELAY_PART_ORDER.map((part) => (
            <li data-relay-part={part} key={part}>
              {part}: {assembly.seatedParts.includes(part) ? "seated" : assembly.carriedPart === part ? "carried" : "ready"}
            </li>
          ))}
        </ul>
        {nextPart && assembly.carriedPart === null ? (
          <button onClick={() => onPickupPart(nextPart)} type="button">Pick up {nextPart}</button>
        ) : null}
        {nextPart && assembly.carriedPart === nextPart ? (
          <button onClick={() => onSeatPart(nextPart)} type="button">Seat {nextPart}</button>
        ) : null}
        {assembly.carriedPart === "completed-relay" ? (
          <button onClick={onPreviewPlacement} type="button">Preview fixed Z1 socket</button>
        ) : null}
        <div aria-live="polite" data-placement-state={placement.status} role="status">
          {placementCopy}
        </div>
        {placement.status === "valid" ? (
          <button onClick={onPlaceRelay} type="button">E · Place relay</button>
        ) : null}
        {placement.status === "failed" ? (
          <>
            <button onClick={onRetryPlacement} type="button">Try again</button>
            <button onClick={onKeepHolding} type="button">Keep holding</button>
          </>
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
