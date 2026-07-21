import type { ShipModuleRole } from "@600b/multiplayer";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  FIRST_RAID,
  type InviteShareState,
  inviteShareComplete,
  inviteStateAfterManualCopy,
  raidCompleteFor,
} from "../meaningverse/firstRaid";
import {
  PROJECT_SCALE,
  SHIP_MODULE_CAPACITY,
  buildMeaningverseInvite,
  hasCoCreated,
} from "../meaningverse/model";
import {
  TUTORIAL,
  TUTORIAL_STAGE_LABELS,
  TUTORIAL_STAGE_ORDER,
  type TutorialStageId,
  tutorialStageFor,
  tutorialStepNumber,
} from "../meaningverse/onboardingStory";
import type {
  MultiplayerViewState,
  PalaceMultiplayerTransport,
  ShipModuleSnapshot,
} from "../net/multiplayer";
import { connectedParticipantCount } from "../net/multiplayer";
import { SHIP_ROLE_COLORS } from "../scene/shipBerths";

const ROLES: Array<{ id: ShipModuleRole; label: string }> = [
  { id: "structure", label: "Shape" },
  { id: "energy", label: "Glow" },
  { id: "habitat", label: "Hangout" },
  { id: "signal", label: "Noise" },
];

function moduleId(): string {
  return globalThis.crypto?.randomUUID?.().toLowerCase() ?? `module-${Date.now().toString(36)}`;
}

function ownModule(state: MultiplayerViewState): ShipModuleSnapshot | undefined {
  return state.shipModules.find((module) => module.authorSessionId === state.localSessionId);
}

export function MeaningPath({
  multiplayer,
  transport,
  open,
  onOpenChange,
  focusNonce = 0,
}: {
  multiplayer: MultiplayerViewState;
  transport: PalaceMultiplayerTransport | null;
  /** Panel visibility — owned by the scene so the ship dock can open it and mode switches keep it. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bumped by the ship dock's E-action: land focus straight in the "Name your part" field. */
  focusNonce?: number;
}) {
  const [label, setLabel] = useState("");
  const [role, setRole] = useState<ShipModuleRole>("signal");
  const [inviteState, setInviteState] = useState<InviteShareState>("idle");
  const [submitError, setSubmitError] = useState("");
  const inviteComplete = inviteShareComplete(inviteState);
  const mine = ownModule(multiplayer);
  const coCreated = hasCoCreated(multiplayer.shipModules, multiplayer.localSessionId);
  const raidComplete = raidCompleteFor(inviteState, coCreated);
  const tutorialStage = tutorialStageFor({
    connected: multiplayer.status === "connected",
    label,
    hasOwnModule: Boolean(mine),
    inviteShared: inviteComplete,
    coCreated,
  });
  const stageDone: Record<TutorialStageId, boolean> = {
    enter: multiplayer.status === "connected",
    create: Boolean(label.trim()),
    place: Boolean(mine),
    invite: inviteComplete,
    co_create: raidComplete,
  };
  const recentModules = useMemo(
    () => [...multiplayer.shipModules].sort((a, b) => b.slot - a.slot).slice(0, 5),
    [multiplayer.shipModules],
  );
  const full = multiplayer.shipModules.length >= SHIP_MODULE_CAPACITY;

  // Runs after the open render, so the input exists by the time we focus it. When the player has
  // already placed (no input), opening the panel is the whole response — nothing to focus.
  const labelInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusNonce > 0) labelInput.current?.select();
  }, [focusNonce]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = label.trim();
    if (!transport || multiplayer.status !== "connected") {
      setSubmitError("Live room is offline. Your part was not placed.");
      return;
    }
    if (!clean) {
      setSubmitError("Name the part first.");
      return;
    }
    const accepted = transport.placeShipModule({ moduleId: moduleId(), label: clean, role });
    setSubmitError(accepted ? "" : "That part could not be placed.");
  };

  const copyInvite = async () => {
    const invite = buildMeaningverseInvite(window.location.href);
    try {
      await navigator.clipboard.writeText(invite);
      setInviteState("copied");
    } catch {
      const manualCopy = window.prompt("Copy this invite, then press OK", invite);
      setInviteState(inviteStateAfterManualCopy(manualCopy));
    }
  };

  if (!open) {
    return (
      <button className="moc-path-tab" onClick={() => onOpenChange(true)} type="button">
        MoC · Ship {multiplayer.shipModules.length}/{SHIP_MODULE_CAPACITY}
      </button>
    );
  }

  return (
    <aside className="moc-path" onKeyDown={(event) => event.stopPropagation()}>
      <header className="moc-path__head">
        <div>
          <span className="moc-path__kicker">Meaningverse of Culture · {PROJECT_SCALE}</span>
          <h2>{raidComplete ? "Leviathan workshop" : `Raid 01 · ${FIRST_RAID.title}`}</h2>
        </div>
        <button aria-label="Close creation panel" onClick={() => onOpenChange(false)} type="button">
          ×
        </button>
      </header>

      <p className="moc-objective">
        <small>
          Step {tutorialStepNumber(tutorialStage)} of {TUTORIAL_STAGE_ORDER.length} ·{" "}
          {TUTORIAL_STAGE_LABELS[tutorialStage]}
        </small>
        <strong>{TUTORIAL[tutorialStage].objective}</strong>
      </p>

      <section className={`moc-raid${raidComplete ? " moc-raid--complete" : ""}`}>
        <div className="moc-raid__meta">
          <span>{FIRST_RAID.mode}</span>
          <b>{raidComplete ? "Complete" : FIRST_RAID.duration}</b>
        </div>
        <p>{raidComplete ? "Two live sessions changed the same street." : FIRST_RAID.premise}</p>
        <strong>V4V · bring what you can</strong>
        <small>{FIRST_RAID.v4v}</small>
      </section>

      <ol aria-label="creation path" className="moc-steps">
        {FIRST_RAID.checkpoints.map(({ stage, contribution }) => (
          <li
            aria-current={stage === tutorialStage ? "step" : undefined}
            className={stageDone[stage] ? "done" : stage === tutorialStage ? "now" : ""}
            key={stage}
          >
            {TUTORIAL_STAGE_LABELS[stage]}
            <small>{contribution}</small>
          </li>
        ))}
      </ol>

      {!mine && !full ? (
        <form className="moc-create" onSubmit={submit}>
          <label htmlFor="moc-module-label">Name your part</label>
          <input
            autoComplete="off"
            id="moc-module-label"
            maxLength={64}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="a room, meme, sound, ugly joke…"
            ref={labelInput}
            value={label}
          />
          <div aria-label="part role" className="moc-role-picker">
            {ROLES.map((option) => (
              <button
                className={role === option.id ? "active" : ""}
                key={option.id}
                onClick={() => setRole(option.id)}
                type="button"
              >
                <i
                  aria-hidden
                  className="moc-role-dot"
                  style={{ color: SHIP_ROLE_COLORS[option.id] }}
                />
                {option.label}
              </button>
            ))}
          </div>
          <button
            className="moc-primary"
            disabled={multiplayer.status !== "connected"}
            type="submit"
          >
            {multiplayer.status === "connected" ? "Place my module" : "Waiting for the live room…"}
          </button>
          {submitError ? <p className="moc-error">{submitError}</p> : null}
        </form>
      ) : mine ? (
        <div className="moc-own-module">
          <span>Berth {mine.slot} is live · copper beacon on the ring</span>
          <strong>{mine.label}</strong>
          <button
            className="moc-primary"
            onClick={inviteState === "shown" ? () => setInviteState("confirmed") : copyInvite}
            type="button"
          >
            {inviteState === "copied"
              ? "Invite copied"
              : inviteState === "shown"
                ? "Confirm link was shared"
                : inviteState === "confirmed"
                  ? "Invite share confirmed"
                  : "Invite another session"}
          </button>
          <p>
            {coCreated
              ? "Another live session changed the same ship. Keep going."
              : "A module from another session will appear here live."}
          </p>
        </div>
      ) : (
        <p className="moc-own-module">All 36 launch modules are occupied. Remix opens next.</p>
      )}

      {recentModules.length ? (
        <section className="moc-remixes">
          <span>Recent room modules</span>
          {recentModules.map((module) => (
            <div key={module.id}>
              <p>
                <strong>#{module.slot}</strong> {module.label}
                <small>@{module.authorHandle}</small>
              </p>
              {!mine ? (
                <button
                  onClick={() => {
                    setLabel(`Remix: ${module.label}`.slice(0, 64));
                    setRole(module.role);
                  }}
                  type="button"
                >
                  Remix
                </button>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      <footer>
        {multiplayer.status === "connected"
          ? `${connectedParticipantCount(multiplayer.players)} connected now`
          : "Connecting to the live workshop…"}
      </footer>
    </aside>
  );
}
