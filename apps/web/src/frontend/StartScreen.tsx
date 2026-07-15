import { Icon } from "./icons";

/**
 * The very first screen — a Start gate before the intro video. Its click is the user gesture that
 * lets the browser play the intro WITH sound (unmuted autoplay is otherwise blocked on a cold load).
 */
export function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="game-screen screen--title start-screen">
      <section className="start-card">
        <span className="start-mark">
          <Icon name="sprout" size={40} />
        </span>
        <h1>600 Billion</h1>
        <p>The Palace of Culture</p>
        <button
          className="coral-button coral-button--hero start-button"
          onClick={onStart}
          type="button"
        >
          <Icon name="play" size={20} />
          Start
        </button>
      </section>
    </main>
  );
}
