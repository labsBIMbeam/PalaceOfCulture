import type { ShipModuleRole } from "@600b/multiplayer";
import { type FormEvent, useMemo, useState } from "react";
import {
  PROJECT_SCALE,
  SHIP_MODULE_CAPACITY,
  buildMeaningverseInvite,
  hasCoCreated,
} from "../meaningverse/model";
import type {
  MultiplayerViewState,
  PalaceMultiplayerTransport,
  ShipModuleSnapshot,
} from "../net/multiplayer";

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
}: {
  multiplayer: MultiplayerViewState;
  transport: PalaceMultiplayerTransport | null;
}) {
  const [open, setOpen] = useState(true);
  const [label, setLabel] = useState("");
  const [role, setRole] = useState<ShipModuleRole>("signal");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const mine = ownModule(multiplayer);
  const coCreated = hasCoCreated(multiplayer.shipModules, multiplayer.localSessionId);
  const recentModules = useMemo(
    () => [...multiplayer.shipModules].sort((a, b) => b.slot - a.slot).slice(0, 5),
    [multiplayer.shipModules],
  );
  const full = multiplayer.shipModules.length >= SHIP_MODULE_CAPACITY;

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
      setInviteCopied(true);
    } catch {
      window.prompt("Copy this invite", invite);
      setInviteCopied(true);
    }
  };

  if (!open) {
    return (
      <button className="moc-path-tab" onClick={() => setOpen(true)} type="button">
        MoC · Ship {multiplayer.shipModules.length}/{SHIP_MODULE_CAPACITY}
      </button>
    );
  }

  return (
    <aside className="moc-path" onKeyDown={(event) => event.stopPropagation()}>
      <header className="moc-path__head">
        <div>
          <span className="moc-path__kicker">Meaningverse of Culture · {PROJECT_SCALE}</span>
          <h2>What is this spaceship missing?</h2>
        </div>
        <button aria-label="Close creation panel" onClick={() => setOpen(false)} type="button">
          ×
        </button>
      </header>

      <ol aria-label="creation path" className="moc-steps">
        <li className={multiplayer.status === "connected" ? "done" : ""}>Enter</li>
        <li className={label.trim() ? "done" : ""}>Create</li>
        <li className={mine ? "done" : ""}>Place</li>
        <li className={inviteCopied ? "done" : ""}>Invite</li>
        <li className={coCreated ? "done" : ""}>Co-create</li>
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
                {option.label}
              </button>
            ))}
          </div>
          <button
            className="moc-primary"
            disabled={multiplayer.status !== "connected"}
            type="submit"
          >
            Place my module
          </button>
          {submitError ? <p className="moc-error">{submitError}</p> : null}
        </form>
      ) : mine ? (
        <div className="moc-own-module">
          <span>Module {mine.slot} is live</span>
          <strong>{mine.label}</strong>
          <button className="moc-primary" onClick={copyInvite} type="button">
            {inviteCopied ? "Invite copied" : "Invite a friend"}
          </button>
          <p>
            {coCreated
              ? "Two people changed the same ship. Keep going."
              : "Their part will appear here live."}
          </p>
        </div>
      ) : (
        <p className="moc-own-module">All 36 launch modules are occupied. Remix opens next.</p>
      )}

      {recentModules.length ? (
        <section className="moc-remixes">
          <span>Built by people here</span>
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
          ? `${multiplayer.players.length + 1} here now`
          : "Connecting to the live workshop…"}
      </footer>
    </aside>
  );
}
