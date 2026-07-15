import type { Character } from "@600b/shared";
import { useGLTF } from "@react-three/drei";
import { useEffect, useState } from "react";
import { Icon } from "../frontend/icons";
import { AvatarTurntable } from "../scene/AvatarTurntable";
import { MEMBERS } from "./members";

/**
 * Character select (new concept): pick who you are from the **600 Billion member roster** (names/roles
 * from www.600.wtf). A shared live turntable previews the highlighted member — mirroring the site's
 * business-card picker. Loading your own model is a later, user-content step.
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
    const saved = MEMBERS.findIndex((entry) => entry.name === initialHandle);
    return saved >= 0 ? saved : 0;
  });
  const member = MEMBERS[index] ?? MEMBERS[0];
  const modelUrl = member?.avatar.modelUrl;

  // Fetch only the highlighted idle mesh. The previous all-roster preload pulled ~133 MiB at once.
  useEffect(() => {
    if (modelUrl) useGLTF.preload(modelUrl);
  }, [modelUrl]);

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
          </div>
        </header>

        <div className="member-body">
          <div className="member-preview">
            <AvatarTurntable config={member.avatar} />
            <div className="member-preview-tag">
              <strong>{member.name}</strong>
              <small>
                {member.role} · {member.nostr}
              </small>
            </div>
          </div>

          <div className="member-roster">
            {MEMBERS.map((entry, i) => (
              <button
                aria-pressed={i === index}
                className={`member-chip${i === index ? " member-chip--active" : ""}`}
                key={entry.name}
                onClick={() => setIndex(i)}
                type="button"
              >
                <span className="member-chip-name">{entry.name}</span>
                <span className="member-chip-role">{entry.role}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="coral-button coral-button--hero" onClick={enter} type="button">
          <Icon name="play" size={18} />
          Enter as {member.name}
          <small>{member.role}</small>
        </button>
      </section>
    </main>
  );
}
