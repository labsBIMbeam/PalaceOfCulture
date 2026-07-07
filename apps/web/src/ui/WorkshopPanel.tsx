// The Workshop — the 2D frontend window onto the homebuilder economy (menu item "Workshop").
// Resources (drip per day + placed-specialty bonus), the crafted-object inventory, the recipe
// book and the sequential craft queue, and the move-in attraction status. Same singletons as the
// in-engine BuilderHud (builder/economy + builder/buildState), so the 21-day stool keeps crafting
// while you read the feed. Pure presentation; all state lives in builder/*.

import { useEffect, useState } from "react";
import { buildSystem, useBuildSystem } from "../builder/buildState";
import {
  ATTRACTION_SUSTAIN_SEC,
  MATERIALS,
  OBJECTS,
  RECIPES,
  formatDuration,
  recipeIds,
} from "../builder/catalog";
import { useEconomy } from "../builder/economy";
import { Icon } from "../frontend/icons";

export function WorkshopPanel() {
  const economy = useEconomy();
  const system = useBuildSystem();
  // 1 Hz pulse so the queue countdown and sustain timer tick visibly.
  const [, setPulse] = useState(0);
  useEffect(() => {
    // Load the home blueprint (idempotent) so block/lantern counts are real outside the engine.
    void buildSystem.setup(true);
    const timer = window.setInterval(() => setPulse((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const queue = economy.getQueue();
  const blocks = system.blockCount();
  const lanterns = system.decorCount("lantern");
  const conditionMet = economy.conditionMet();
  const heldFor = economy.conditionHeldFor();
  const inventory = Object.keys(OBJECTS).filter((id) => economy.getCount(id) > 0);

  return (
    <div className="workshop-grid">
      {/* resources */}
      <section className="workshop-card">
        <header className="workshop-head">
          <Icon name="coins" size={16} />
          <strong>Resources</strong>
          <small>drip with real time — no farming</small>
        </header>
        {Object.entries(MATERIALS).map(([id, def]) => {
          const perDay = economy.dripRate(id) * 60 * 24;
          return (
            <div className="workshop-resource" key={id}>
              <span className="builder-swatch" style={{ background: def.color }} />
              <strong>{economy.getMaterial(id)}</strong>
              <span>{def.display}</span>
              <small>{perDay > 0 ? `+${perDay.toFixed(1)}/day` : "refined — mill it"}</small>
            </div>
          );
        })}
        {economy.timeScale > 1 ? (
          <small className="builder-timescale">⏩ ×{economy.timeScale} dev time</small>
        ) : null}
      </section>

      {/* inventory */}
      <section className="workshop-card">
        <header className="workshop-head">
          <Icon name="store" size={16} />
          <strong>Crafted, not placed</strong>
          <small>place them on your Plot (Builder, M)</small>
        </header>
        {inventory.length === 0 ? (
          <p className="workshop-empty">Nothing on the shelf — queue a craft.</p>
        ) : (
          inventory.map((id) => {
            const def = OBJECTS[id];
            if (!def) return null;
            return (
              <div className="workshop-resource" key={id}>
                <span
                  className="builder-swatch"
                  style={{ background: def.color, borderRadius: def.kind === "block" ? 3 : 8 }}
                />
                <strong>{economy.getCount(id)}</strong>
                <span>{def.display}</span>
                <small>{def.kind}</small>
              </div>
            );
          })
        )}
      </section>

      {/* recipes */}
      <section className="workshop-card workshop-card--recipes">
        <header className="workshop-head">
          <Icon name="hammer" size={16} />
          <strong>Craft</strong>
          <small>time is the material — the queue runs while you sleep</small>
        </header>
        <div className="builder-recipes">
          {recipeIds().map((id) => {
            const recipe = RECIPES[id];
            if (!recipe) return null;
            const affordable = economy.canAfford(id);
            return (
              <button
                className="builder-recipe"
                disabled={!affordable}
                key={id}
                onClick={() => economy.queueCraft(id)}
                type="button"
              >
                <strong>{recipe.display}</strong>
                <span className="builder-recipe-cost">
                  {Object.entries(recipe.cost)
                    .map(([mat, count]) => `${count} ${MATERIALS[mat]?.display ?? mat}`)
                    .join(" + ")}
                </span>
                <small>{formatDuration(recipe.seconds)}</small>
              </button>
            );
          })}
        </div>
      </section>

      {/* queue + move-in */}
      <section className="workshop-card">
        <header className="workshop-head">
          <Icon name="lock" size={16} />
          <strong>Queue &amp; move-in</strong>
          <small>sequential, offline-friendly</small>
        </header>
        {queue.length === 0 ? (
          <p className="workshop-empty">The bench is idle.</p>
        ) : (
          <div className="builder-queue">
            {queue.map((entry, index) => (
              <span className="builder-queue-item" key={`${entry.recipe_id}-${index}`}>
                {RECIPES[entry.recipe_id]?.display ?? entry.recipe_id}
                {index === 0
                  ? ` — ${formatDuration(entry.remaining / economy.timeScale)}`
                  : " — waiting"}
              </span>
            ))}
          </div>
        )}
        <div className="builder-movein">
          <strong>Move-in attraction</strong>
          <span className={blocks >= 9 ? "builder-check builder-check--ok" : "builder-check"}>
            {blocks >= 9 ? "✓" : "○"} 9+ blocks placed ({blocks})
          </span>
          <span className={lanterns >= 1 ? "builder-check builder-check--ok" : "builder-check"}>
            {lanterns >= 1 ? "✓" : "○"} a lantern placed ({lanterns})
          </span>
          <span className={conditionMet ? "builder-check builder-check--ok" : "builder-check"}>
            {conditionMet
              ? `⏳ held ${formatDuration(heldFor)} of ${formatDuration(ATTRACTION_SUSTAIN_SEC)}`
              : "hold both for 24 h and someone moves in"}
          </span>
        </div>
      </section>
    </div>
  );
}
