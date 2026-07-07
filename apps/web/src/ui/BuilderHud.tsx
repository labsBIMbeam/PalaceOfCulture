// The build-mode UI (DOM overlay) — hud.gd + craft_menu.gd, webbed. Left rail: material counts
// with drip-per-day. Bottom: the hotbar (blocks first, then furniture, insertion order = catalog
// order) with inventory counts. C opens the craft menu: recipes with costs + month-scale times,
// the sequential queue with a live countdown, and the move-in attraction progress (>=9 blocks,
// >=1 lantern, held 24 h wall-clock). Pure presentation; all state lives in builder/*.

import { useEffect, useState } from "react";
import { type BuildSystem, useBuildSystem } from "../builder/buildState";
import {
  ATTRACTION_SUSTAIN_SEC,
  MATERIALS,
  OBJECTS,
  RECIPES,
  blockIds,
  formatDuration,
  furnitureIds,
  getObject,
  recipeIds,
} from "../builder/catalog";
import { type EconomyEvent, useEconomy } from "../builder/economy";
import { Icon } from "../frontend/icons";

const HOTBAR_HOME: string[] = [...blockIds(), ...furnitureIds()];
const HOTBAR_PALACE: string[] = [...furnitureIds()]; // public palace: decorate-only, no block tools

export function BuilderHud({
  system,
  selected,
  onSelect,
  onExit,
}: {
  /** The world being edited — homeBuild (private, blocks) or palaceBuild (public, decor-only). */
  system: BuildSystem;
  selected: string;
  onSelect: (objectId: string) => void;
  onExit: () => void;
}) {
  const economy = useEconomy();
  useBuildSystem(system);
  const HOTBAR = system.allowBlocks ? HOTBAR_HOME : HOTBAR_PALACE;
  const [craftOpen, setCraftOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // 1 Hz re-render so queue countdown + sustain progress tick visibly.
  const [, setPulse] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setPulse((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // C toggles the craft menu; number keys pick hotbar slots (godot hud shortcuts).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (event.code === "KeyC") setCraftOpen((open) => !open);
      const slot = Number.parseInt(event.key, 10);
      const slotId = HOTBAR[slot - 1];
      if (slotId) onSelect(slotId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSelect]);

  // Arrival + craft toasts (godot signals craft_completed / move_in_arrived).
  useEffect(() => {
    return economy.onEvent((event: EconomyEvent) => {
      if (event.kind === "craft_completed") {
        const recipe = RECIPES[event.recipeId];
        setToast(`Crafted: ${recipe?.display ?? event.recipeId}`);
      } else {
        const def = getObject(event.objectId);
        setToast(`Something moved in — a ${def?.display ?? event.objectId} arrived!`);
      }
      window.setTimeout(() => setToast(null), 6000);
    });
  }, [economy]);

  const queue = economy.getQueue();
  const blocks = system.blockCount();
  const lanterns = system.decorCount("lantern");
  const conditionMet = economy.conditionMet();
  const heldFor = economy.conditionHeldFor();

  return (
    <>
      <div className="builder-crosshair" />

      {/* materials rail */}
      <div className="builder-materials">
        {Object.entries(MATERIALS).map(([id, def]) => {
          const perDay = economy.dripRate(id) * 60 * 24;
          return (
            <div className="builder-material" key={id}>
              <span className="builder-swatch" style={{ background: def.color }} />
              <strong>{economy.getMaterial(id)}</strong>
              <span className="builder-material-name">{def.display}</span>
              {perDay > 0 ? <small>+{perDay.toFixed(1)}/day</small> : <small>refined</small>}
            </div>
          );
        })}
        {economy.timeScale > 1 ? (
          <small className="builder-timescale">⏩ ×{economy.timeScale} dev time</small>
        ) : null}
      </div>

      {/* hotbar */}
      <div className="builder-hotbar">
        {HOTBAR.map((id, index) => {
          const def = OBJECTS[id];
          if (!def) return null;
          const count = economy.getCount(id);
          return (
            <button
              className={`builder-slot${selected === id ? " builder-slot--active" : ""}`}
              disabled={count <= 0 && selected !== id}
              key={id}
              onClick={() => onSelect(selected === id ? "" : id)}
              title={def.display}
              type="button"
            >
              <span className="builder-slot-key">{index + 1}</span>
              <span
                className="builder-slot-icon"
                style={{ background: def.color, borderRadius: def.kind === "block" ? 4 : 10 }}
              />
              <span className="builder-slot-count">{count}</span>
            </button>
          );
        })}
        <button
          className={`builder-slot builder-slot--menu${craftOpen ? " builder-slot--active" : ""}`}
          onClick={() => setCraftOpen((open) => !open)}
          type="button"
        >
          <span className="builder-slot-key">C</span>
          <Icon name="sprout" size={20} />
          <span className="builder-slot-count">craft</span>
        </button>
      </div>

      {/* live queue chip — the head craft counts down without opening the menu */}
      {queue.length > 0 && !craftOpen ? (
        <button className="builder-queue-chip" onClick={() => setCraftOpen(true)} type="button">
          <Icon name="sprout" size={12} />
          {RECIPES[queue[0]?.recipe_id ?? ""]?.display ?? "crafting"} —{" "}
          {formatDuration((queue[0]?.remaining ?? 0) / economy.timeScale)}
          {queue.length > 1 ? ` (+${queue.length - 1})` : ""}
        </button>
      ) : null}

      {/* craft menu */}
      {craftOpen ? (
        <section className="builder-craft">
          <header className="decor-head">
            <Icon name="sprout" size={16} />
            <span>Craft — time is the material</span>
            <button className="builder-close" onClick={() => setCraftOpen(false)} type="button">
              ×
            </button>
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
          {queue.length > 0 ? (
            <div className="builder-queue">
              <strong>Queue</strong>
              {queue.map((entry, index) => (
                <span className="builder-queue-item" key={`${entry.recipe_id}-${index}`}>
                  {RECIPES[entry.recipe_id]?.display ?? entry.recipe_id}
                  {index === 0
                    ? ` — ${formatDuration(entry.remaining / economy.timeScale)}`
                    : " — waiting"}
                </span>
              ))}
            </div>
          ) : null}
          {system.allowBlocks ? (
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
                  ? `⏳ held for ${formatDuration(heldFor)} of ${formatDuration(ATTRACTION_SUSTAIN_SEC)}`
                  : "hold both for 24 h and someone moves in"}
              </span>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* hints + exit */}
      <div className="fp-hint builder-hint">
        <strong>
          {document.pointerLockElement ? "Magnet captured" : "Click the scene to fly"}
        </strong>
        <span>
          LMB place · Shift+LMB repaint · RMB absorb · Q/E rotate · WASD fly · Space/Shift rise/sink
          · 1–{HOTBAR.length} select · C craft · M done
          {document.pointerLockElement ? " · Esc release" : " · or click surfaces to place"}
        </span>
      </div>

      {toast ? <div className="builder-toast">{toast}</div> : null}

      <button className="nav-pill nav-pill--engine builder-exit" onClick={onExit} type="button">
        <Icon name="chevron" size={16} />
        <span>Done building (M)</span>
      </button>
    </>
  );
}
