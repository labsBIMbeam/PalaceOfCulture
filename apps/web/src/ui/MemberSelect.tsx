import type { Character } from "@600b/shared";
import { useGLTF } from "@react-three/drei";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Icon } from "../frontend/icons";
import { AvatarTurntable } from "../scene/AvatarTurntable";
import { ROSTER } from "./members";
import { NAV_KEYS, detectColumns, stepRosterIndex } from "./rosterNav";

/**
 * Character select (new concept): pick who you are — the neutral hooded **Builder** archetype first
 * (enter as yourself), then the **600 Billion member roster** (names/roles from www.600.wtf). A
 * shared live turntable previews the highlighted choice — mirroring the site's business-card picker.
 * Loading your own model is a later, user-content step.
 */
export function MemberSelect({
  onComplete,
  initialHandle,
}: {
  onComplete: (character: Character) => void;
  /** Last-used member (device DB): preselected in the roster, but never entered automatically. */
  initialHandle?: string;
}) {
  const [index, setIndex] = useState(() => {
    const saved = ROSTER.findIndex((entry) => entry.name === initialHandle);
    return saved >= 0 ? saved : 0;
  });
  const member = ROSTER[index] ?? ROSTER[0];
  const modelUrl = member?.avatar.modelUrl;

  // Fetch only the highlighted idle mesh. The previous all-roster preload pulled ~133 MiB at once.
  useEffect(() => {
    if (modelUrl) useGLTF.preload(modelUrl);
  }, [modelUrl]);

  // Roving keyboard focus: the whole roster is ONE tab stop (Tab goes chip → Enter, not through all
  // ~28 members); arrows move the highlight through the live grid, and the turntable follows. The
  // grid is `auto-fill`, so the column count is measured from rendered chips, per keypress.
  const chips = useRef<Array<HTMLButtonElement | null>>([]);
  const highlight = (next: number) => {
    setIndex(next);
    const chip = chips.current[next];
    chip?.focus();
    chip?.scrollIntoView({ block: "nearest" });
  };
  const onRosterKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!NAV_KEYS.has(event.key)) return;
    // Always swallow nav keys — an edge-clamped arrow must not fall through and scroll the list.
    event.preventDefault();
    const columns = detectColumns(
      chips.current
        .filter((chip): chip is HTMLButtonElement => chip !== null)
        .map((chip) => chip.offsetTop),
    );
    const next = stepRosterIndex(index, event.key, ROSTER.length, columns);
    if (next !== index) highlight(next);
  };

  // Land keyboard focus on the active chip once, so arrows work straight off the story cards.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only — later focus follows keys
  useEffect(() => {
    chips.current[index]?.focus({ preventScroll: true });
    chips.current[index]?.scrollIntoView({ block: "nearest" });
  }, []);

  if (!member) return null; // roster is never empty; satisfies strict index access

  const enter = () => {
    const now = Date.now();
    onComplete({
      id: crypto.randomUUID(),
      handle: member.name,
      avatar: member.avatar,
      createdAt: now,
      updatedAt: now,
      updatedBy: "local:roster",
    });
  };

  return (
    <main className="game-screen screen--title member-screen">
      <section className="member-card">
        <header className="member-head">
          <div>
            <h1>Choose your starting avatar</h1>
            <p>600,000,000,000 — pick who you are</p>
            <small className="member-specialty-note">
              Raid cues are playful, not biographies or ranks. Only FLX-approved anchors are marked
              approved.
            </small>
          </div>
          <small aria-hidden className="member-keys">
            ← ↑ ↓ → browse · Tab, then Enter
          </small>
        </header>

        <div className="member-body">
          <div className="member-preview">
            <AvatarTurntable config={member.avatar} />
            <div className="member-preview-tag">
              <strong>{member.name}</strong>
              <span>
                {member.specialtyStatus === "approved" ? "FLX-approved" : "Draft"} ·{" "}
                {member.specialty}
              </span>
              <small>
                {member.role} · {member.nostr}
              </small>
            </div>
          </div>

          <div
            aria-label="Avatar roster — arrow keys browse"
            className="member-roster"
            onKeyDown={onRosterKey}
          >
            {ROSTER.map((entry, i) => (
              <button
                aria-pressed={i === index}
                className={`member-chip${i === index ? " member-chip--active" : ""}`}
                key={entry.name}
                onClick={() => setIndex(i)}
                ref={(el) => {
                  chips.current[i] = el;
                }}
                tabIndex={i === index ? 0 : -1}
                type="button"
              >
                <span className="member-chip-name">{entry.name}</span>
                <span className="member-chip-role">
                  {entry.specialtyStatus === "approved" ? "Approved" : "Draft"} · {entry.specialty}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button className="coral-button coral-button--hero" onClick={enter} type="button">
          <Icon name="play" size={18} />
          Enter as {member.name}
          <small>
            {member.specialtyStatus === "approved" ? "Approved" : "Draft"} · {member.specialty}
          </small>
        </button>
      </section>
    </main>
  );
}
