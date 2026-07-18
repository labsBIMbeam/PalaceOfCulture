import { Icon } from "./icons";

/** First user gesture: normal visits may continue to the intro; invitations go straight to creation. */
export function StartScreen({
  onStart,
  joining = false,
}: { onStart: () => void; joining?: boolean }) {
  return (
    <main className="game-screen screen--title start-screen">
      <section className="start-card">
        <span className="start-mark">
          <Icon name="sprout" size={40} />
        </span>
        <small className="start-teaser">Meaningverse of Culture · x600billion</small>
        <h1>
          {joining ? "Someone invited you to the ship." : "Build the spaceship. Nothing less."}
        </h1>
        <p>
          {joining
            ? "Bring one idea. Weird is allowed."
            : "Create one part, place it live, then bring someone who changes it."}
        </p>
        <button
          className="coral-button coral-button--hero start-button"
          onClick={onStart}
          type="button"
        >
          <Icon name="play" size={20} />
          {joining ? "Join the workshop" : "Enter MoC"}
        </button>
      </section>
    </main>
  );
}
