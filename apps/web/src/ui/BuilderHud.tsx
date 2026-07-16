// The build-mode UI (DOM overlay) — hud.gd + craft_menu.gd, webbed. Left rail: material counts
// with drip-per-day. Bottom: a WoW-style action bar — 8 fixed slots (keys 1–8) the player assigns
// by dragging items out of the inventory (I). The inventory sorts every object into pockets
// (Blocks / Openings / Roofs / Furniture — the Pokémon pattern). C opens the craft menu: recipes
// with costs + month-scale times, the sequential queue with a live countdown, and the move-in
// attraction progress (>=9 blocks, >=1 lantern, held 24 h wall-clock). V cycles the block brush
// (1 / 2x2 / 3x3). Pure presentation; all state lives in builder/* (bar layout in localStorage).

import type { DragEvent } from "react";
import { useEffect, useState } from "react";
import { type BrushSize, type BuildSystem, useBuildSystem } from "../builder/buildState";
import {
  ATTRACTION_SUSTAIN_SEC,
  MATERIALS,
  OBJECTS,
  POCKETS,
  RECIPES,
  formatDuration,
  furnitureIds,
  getObject,
  pocketObjectIds,
  recipeIds,
} from "../builder/catalog";
import { type EconomyEvent, useEconomy } from "../builder/economy";
import { Icon } from "../frontend/icons";

const HOTBAR_SLOTS = 8;
const BRUSH_SIZES: BrushSize[] = [1, 2, 3];

const DEFAULT_HOME_BAR = [
  "block_stone",
  "block_boards",
  "block_window",
  "block_door",
  "block_roof",
  "lantern",
  "stool",
  "sawbench",
];

function defaultBar(allowBlocks: boolean): string[] {
  const bar = allowBlocks ? [...DEFAULT_HOME_BAR] : furnitureIds().slice(0, HOTBAR_SLOTS);
  while (bar.length < HOTBAR_SLOTS) bar.push("");
  return bar.slice(0, HOTBAR_SLOTS);
}

function barStorageKey(allowBlocks: boolean): string {
  return allowBlocks ? "600b:builderBar:home:v1" : "600b:builderBar:palace:v1";
}

function loadBar(allowBlocks: boolean): string[] {
  const fallback = defaultBar(allowBlocks);
  try {
    const raw = window.localStorage.getItem(barStorageKey(allowBlocks));
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return Array.from({ length: HOTBAR_SLOTS }, (_, i) => {
      const id = parsed[i];
      return typeof id === "string" && (id === "" || OBJECTS[id]) ? id : "";
    });
  } catch {
    return fallback;
  }
}

function saveBar(allowBlocks: boolean, bar: string[]): void {
  try {
    window.localStorage.setItem(barStorageKey(allowBlocks), JSON.stringify(bar));
  } catch {
    // Storage unavailable (privacy mode) — the layout just resets next session.
  }
}

/** The colored tile visual for an object — window tiles read glassy, doors tall, roofs slanted. */
function ObjectSwatch({ id, size = 22 }: { id: string; size?: number }) {
  const def = OBJECTS[id];
  if (!def) return null;
  const shape = def.kind === "block" ? (def.shape ?? "cube") : "furniture";
  const style: Record<string, string | number> = {
    background: def.color,
    width: size,
    height: size,
    borderRadius: shape === "furniture" ? 10 : 4,
  };
  if (shape === "window") style.opacity = 0.55;
  if (shape === "door") {
    style.width = Math.round(size * 0.62);
    style.borderRadius = "4px 4px 0 0";
  }
  if (shape === "roof") {
    style.background = "transparent";
    style.borderLeft = `${size / 2}px solid transparent`;
    style.borderRight = `${size / 2}px solid transparent`;
    style.borderBottom = `${size * 0.8}px solid ${def.color}`;
    style.width = 0;
    style.height = 0;
    style.borderRadius = 0;
  }
  return <span className="builder-slot-icon" style={style} />;
}

export function BuilderHud({
  system,
  selected,
  onSelect,
  onExit,
  brush,
  onBrush,
}: {
  /** The world being edited — homeBuild (private, blocks) or palaceBuild (public, decor-only). */
  system: BuildSystem;
  selected: string;
  onSelect: (objectId: string) => void;
  onExit: () => void;
  /** Block brush size (1 / 2x2 / 3x3); V cycles it. */
  brush: BrushSize;
  onBrush: (size: BrushSize) => void;
}) {
  const economy = useEconomy();
  useBuildSystem(system);
  const [bar, setBar] = useState<string[]>(() => loadBar(system.allowBlocks));
  const [craftOpen, setCraftOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // 1 Hz re-render so queue countdown + sustain progress tick visibly.
  const [, setPulse] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setPulse((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const assignSlot = (index: number, id: string) => {
    setBar((prev) => {
      const next = [...prev];
      next[index] = id;
      saveBar(system.allowBlocks, next);
      return next;
    });
  };
  const swapSlots = (a: number, b: number) => {
    setBar((prev) => {
      const next = [...prev];
      const tmp = next[a] ?? "";
      next[a] = next[b] ?? "";
      next[b] = tmp;
      saveBar(system.allowBlocks, next);
      return next;
    });
  };

  // C craft · I inventory · V brush · 1–8 select the bar slot (godot hud shortcuts, extended).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (event.code === "KeyC") {
        setCraftOpen((open) => !open);
        setInvOpen(false);
      } else if (event.code === "KeyI") {
        setInvOpen((open) => !open);
        setCraftOpen(false);
      } else if (event.code === "KeyV" && system.allowBlocks) {
        onBrush(BRUSH_SIZES[(BRUSH_SIZES.indexOf(brush) + 1) % BRUSH_SIZES.length] ?? 1);
      }
      const slot = Number.parseInt(event.key, 10);
      if (slot >= 1 && slot <= HOTBAR_SLOTS) {
        const slotId = bar[slot - 1];
        if (slotId) onSelect(slotId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bar, brush, onBrush, onSelect, system.allowBlocks]);

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

  const onSlotDrop = (index: number) => (event: DragEvent) => {
    event.preventDefault();
    const data = event.dataTransfer.getData("text/plain");
    if (data.startsWith("obj:")) {
      const id = data.slice(4);
      if (OBJECTS[id]) assignSlot(index, id);
    } else if (data.startsWith("slot:")) {
      const from = Number.parseInt(data.slice(5), 10);
      if (Number.isInteger(from) && from >= 0 && from < HOTBAR_SLOTS) swapSlots(from, index);
    }
  };

  const queue = economy.getQueue();
  const blocks = system.blockCount();
  const lanterns = system.decorCount("lantern");
  const conditionMet = economy.conditionMet();
  const heldFor = economy.conditionHeldFor();
  // The palace is decorate-only: its inventory shows just the furniture pocket.
  const pockets = system.allowBlocks
    ? POCKETS
    : POCKETS.filter((pocket) => pocket.id === "furniture");

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

      {/* the action bar: 8 fixed slots, assigned via drag & drop from the inventory */}
      <div className="builder-hotbar">
        {bar.map((id, index) => {
          const def = id ? OBJECTS[id] : undefined;
          const count = id ? economy.getCount(id) : 0;
          const key = `slot-${index}`;
          return (
            <button
              className={`builder-slot${selected && selected === id ? " builder-slot--active" : ""}${def ? "" : " builder-slot--empty"}`}
              draggable={Boolean(def)}
              key={key}
              onClick={() => def && onSelect(selected === id ? "" : id)}
              onContextMenu={(event) => {
                event.preventDefault();
                assignSlot(index, "");
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={(event) => event.dataTransfer.setData("text/plain", `slot:${index}`)}
              onDrop={onSlotDrop(index)}
              title={def ? `${def.display} — right-click clears` : "drag an item here (I)"}
              type="button"
            >
              <span className="builder-slot-key">{index + 1}</span>
              {def ? (
                <ObjectSwatch id={id} />
              ) : (
                <span className="builder-slot-icon builder-slot-icon--empty" />
              )}
              {def ? (
                <span className="builder-slot-count">{count}</span>
              ) : (
                <span className="builder-slot-count">·</span>
              )}
            </button>
          );
        })}
        <button
          className={`builder-slot builder-slot--menu${invOpen ? " builder-slot--active" : ""}`}
          onClick={() => {
            setInvOpen((open) => !open);
            setCraftOpen(false);
          }}
          type="button"
        >
          <span className="builder-slot-key">I</span>
          <Icon name="store" size={20} />
          <span className="builder-slot-count">bag</span>
        </button>
        <button
          className={`builder-slot builder-slot--menu${craftOpen ? " builder-slot--active" : ""}`}
          onClick={() => {
            setCraftOpen((open) => !open);
            setInvOpen(false);
          }}
          type="button"
        >
          <span className="builder-slot-key">C</span>
          <Icon name="sprout" size={20} />
          <span className="builder-slot-count">craft</span>
        </button>
      </div>

      {/* block brush (home only): 1 / 2x2 / 3x3, V cycles */}
      {system.allowBlocks ? (
        <div className="builder-brush" title="Block brush — V cycles">
          <span className="builder-brush-label">brush</span>
          {BRUSH_SIZES.map((size) => (
            <button
              className={`builder-brush-chip${brush === size ? " builder-brush-chip--active" : ""}`}
              key={size}
              onClick={() => onBrush(size)}
              type="button"
            >
              {size === 1 ? "1" : `${size}×${size}`}
            </button>
          ))}
          <span className="builder-brush-key">V</span>
        </div>
      ) : null}

      {/* live queue chip — the head craft counts down without opening the menu */}
      {queue.length > 0 && !craftOpen ? (
        <button className="builder-queue-chip" onClick={() => setCraftOpen(true)} type="button">
          <Icon name="sprout" size={12} />
          {RECIPES[queue[0]?.recipe_id ?? ""]?.display ?? "crafting"} —{" "}
          {formatDuration((queue[0]?.remaining ?? 0) / economy.timeScale)}
          {queue.length > 1 ? ` (+${queue.length - 1})` : ""}
        </button>
      ) : null}

      {/* inventory — pockets in fixed order, every object in exactly one (Pokémon sorting) */}
      {invOpen ? (
        <section className="builder-craft builder-inventory">
          <header className="decor-head">
            <Icon name="store" size={16} />
            <span>Inventory — drag onto the bar, click to select</span>
            <button className="builder-close" onClick={() => setInvOpen(false)} type="button">
              ×
            </button>
          </header>
          {pockets.map((pocket) => {
            const ids = pocketObjectIds(pocket.id);
            if (ids.length === 0) return null;
            return (
              <div className="builder-pocket" key={pocket.id}>
                <strong className="builder-pocket-title">{pocket.label}</strong>
                <div className="builder-pocket-grid">
                  {ids.map((id) => {
                    const def = OBJECTS[id];
                    const count = economy.getCount(id);
                    if (!def) return null;
                    return (
                      <button
                        className={`builder-inv-tile${selected === id ? " builder-inv-tile--active" : ""}`}
                        disabled={count <= 0 && selected !== id}
                        draggable={count > 0}
                        key={id}
                        onClick={() => onSelect(selected === id ? "" : id)}
                        onDragStart={(event) =>
                          event.dataTransfer.setData("text/plain", `obj:${id}`)
                        }
                        title={`${def.display} — drag to a bar slot`}
                        type="button"
                      >
                        <ObjectSwatch id={id} size={26} />
                        <span className="builder-inv-name">{def.display}</span>
                        <span className="builder-inv-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
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
          LMB place · Shift+LMB repaint · RMB absorb · Q/E rotate · V brush · WASD fly · Space/Shift
          rise/sink · 1–{HOTBAR_SLOTS} slots · I inventory · C craft · M done
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
