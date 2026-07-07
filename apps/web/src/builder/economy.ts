// Player economy — a 1:1 port of godot/scripts/economy.gd: real-time material drip, sequential
// craft queue, crafted-object inventory and the move-in sustain timer. A module-level singleton
// (the web's "autoload"); React subscribes via useSyncExternalStore (see useEconomy below).
// Persists via builder/store.ts; offline time is caught up from the saved last_tick on boot.

import { useSyncExternalStore } from "react";
import { ATTRACTION_SUSTAIN_SEC, DRIP_PER_MINUTE, MATERIALS, getRecipe } from "./catalog";
import { type EconomyState, type QueueEntry, loadState, saveState } from "./store";

const AUTOSAVE_INTERVAL = 3; // seconds
const TICK_MS = 1000;
const MOVE_IN_REWARD_ID = "fountain"; // v0: the single attractable object

const STARTER_MATERIALS: Record<string, number> = { wood: 60, stone: 40, boards: 0 };
const STARTER_INVENTORY: Record<string, number> = { block_stone: 18 };

export type EconomyEvent =
  | { kind: "craft_completed"; recipeId: string }
  | { kind: "move_in_arrived"; objectId: string };

const nowSec = () => Date.now() / 1000;

/**
 * Dev-only acceleration for drip + craft queue: open the app with `?timescale=600` to compress
 * month-long waits while testing. Production is always real time (1.0). The move-in sustain
 * timer stays on the wall clock and is NOT scaled (mirrors `-- --timescale=N` in godot).
 */
function readTimeScale(): number {
  try {
    const raw = new URLSearchParams(window.location.search).get("timescale");
    return raw ? Math.max(1, Number(raw) || 1) : 1;
  } catch {
    return 1;
  }
}

class Economy {
  private materials: Record<string, number> = {};
  private inventory: Record<string, number> = {};
  private queue: QueueEntry[] = [];
  private specialty: Record<string, number> = {};
  private conditionSince = 0; // unix seconds; 0 = not met
  private dirty = false;
  private saveCooldown = 0;
  private lastTick = nowSec();
  private version = 0;
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(event: EconomyEvent) => void>();
  private ready = false;
  readonly timeScale = readTimeScale();

  constructor() {
    void this.boot();
    if (typeof window !== "undefined") {
      window.setInterval(() => this.tick(), TICK_MS);
      window.addEventListener("beforeunload", () => this.persist());
    }
  }

  private async boot(): Promise<void> {
    const state = await loadState();
    if (!state) {
      this.materials = { ...STARTER_MATERIALS };
      this.inventory = { ...STARTER_INVENTORY };
    } else {
      this.materials = { ...state.materials };
      this.inventory = { ...state.inventory };
      this.queue = state.queue.map((entry) => ({ ...entry }));
      this.specialty = { ...state.specialty };
      this.conditionSince = state.condition_since ?? 0;
      const elapsed = nowSec() - (state.last_tick ?? nowSec());
      if (elapsed > 0) {
        this.advance(elapsed * this.timeScale);
        this.checkMoveIn();
      }
    }
    this.ready = true;
    this.lastTick = nowSec();
    this.emit();
    this.persist();
  }

  // --- reads (contract: godot/ARCHITECTURE.md) ---

  isReady(): boolean {
    return this.ready;
  }

  /** Whole units owned; the fractional drip remainder stays hidden. */
  getMaterial(id: string): number {
    return Math.floor(this.materials[id] ?? 0);
  }

  /** Crafted objects owned (not placed). */
  getCount(objectId: string): number {
    return this.inventory[objectId] ?? 0;
  }

  /** Units per minute: base rate times the placed-specialty multiplier. */
  dripRate(id: string): number {
    return (DRIP_PER_MINUTE[id] ?? 0) * (this.specialty[id] ?? 1);
  }

  canAfford(recipeId: string): boolean {
    const recipe = getRecipe(recipeId);
    if (!recipe) return false;
    return Object.entries(recipe.cost).every(([mat, count]) => this.getMaterial(mat) >= count);
  }

  /** Display copy of the queue: [{recipe_id, remaining, total}] in craft order. */
  getQueue(): QueueEntry[] {
    return this.queue.map((entry) => ({ ...entry }));
  }

  /** Unix seconds the move-in condition has been held, or 0 when not met. */
  conditionHeldFor(): number {
    return this.conditionSince > 0 ? nowSec() - this.conditionSince : 0;
  }

  conditionMet(): boolean {
    return this.conditionSince > 0;
  }

  // --- mutations ---

  /** Appends to the craft queue, consuming materials up-front. */
  queueCraft(recipeId: string): boolean {
    if (!this.canAfford(recipeId)) return false;
    const recipe = getRecipe(recipeId);
    if (!recipe) return false;
    for (const [mat, count] of Object.entries(recipe.cost)) {
      this.materials[mat] = (this.materials[mat] ?? 0) - count;
    }
    this.queue.push({ recipe_id: recipeId, remaining: recipe.seconds, total: recipe.seconds });
    this.emit();
    this.persist();
    return true;
  }

  /** Placement takes one object from inventory. */
  consumeObject(objectId: string): boolean {
    if (this.getCount(objectId) <= 0) return false;
    this.inventory[objectId] = this.getCount(objectId) - 1;
    this.dirty = true;
    this.emit();
    return true;
  }

  /** Absorb gives the whole object back — never raw materials. */
  returnObject(objectId: string): void {
    this.inventory[objectId] = this.getCount(objectId) + 1;
    this.dirty = true;
    this.emit();
  }

  /**
   * BuildSystem reports combined placed-specialty multipliers, e.g. {"wood": 1.5}.
   * Persisted so the bonus also applies to offline catch-up drip.
   */
  setSpecialtyContext(multipliers: Record<string, number>): void {
    this.specialty = { ...multipliers };
    this.dirty = true;
    this.emit();
  }

  /**
   * BuildSystem reports whether the move-in condition currently holds. The sustain timer
   * survives sessions: only an explicit "not met" resets it.
   */
  notifyCondition(met: boolean): void {
    if (met && this.conditionSince <= 0) {
      this.conditionSince = nowSec();
      this.persist();
      this.emit();
    } else if (!met && this.conditionSince > 0) {
      this.conditionSince = 0;
      this.persist();
      this.emit();
    }
  }

  // --- internals ---

  private tick(): void {
    const now = nowSec();
    const delta = Math.max(0, now - this.lastTick);
    this.lastTick = now;
    this.advance(delta * this.timeScale);
    this.checkMoveIn();
    this.saveCooldown -= delta;
    if (this.dirty && this.saveCooldown <= 0) this.persist();
  }

  /** Applies elapsed real time to the drip and the (sequential) craft queue. */
  private advance(seconds: number): void {
    let changed = false;
    for (const id of Object.keys(DRIP_PER_MINUTE)) {
      const before = Math.floor(this.materials[id] ?? 0);
      this.materials[id] = (this.materials[id] ?? 0) + (this.dripRate(id) * seconds) / 60;
      if (Math.floor(this.materials[id]) !== before) {
        changed = true;
        this.dirty = true;
      }
    }
    let budget = seconds;
    while (budget > 0) {
      const head = this.queue[0];
      if (!head) break;
      const step = Math.min(budget, head.remaining);
      head.remaining -= step;
      budget -= step;
      if (head.remaining <= 0) {
        this.queue.shift();
        this.completeCraft(head.recipe_id);
        changed = true;
      }
    }
    if (changed) this.emit();
  }

  /**
   * Output lands in materials for processing recipes (outputId is a material, e.g. mill_boards)
   * and in inventory for object recipes.
   */
  private completeCraft(recipeId: string): void {
    const recipe = getRecipe(recipeId);
    if (!recipe) return; // recipe removed from Catalog since save — drop silently
    if (MATERIALS[recipe.outputId]) {
      this.materials[recipe.outputId] = (this.materials[recipe.outputId] ?? 0) + recipe.outputCount;
    } else {
      this.inventory[recipe.outputId] = this.getCount(recipe.outputId) + recipe.outputCount;
    }
    this.emitEvent({ kind: "craft_completed", recipeId });
    this.persist();
  }

  /**
   * A condition sustained for ATTRACTION_SUSTAIN_SEC grants the reward; the timer then restarts,
   * so a long absence can deliver several arrivals.
   */
  private checkMoveIn(): void {
    const now = nowSec();
    while (this.conditionSince > 0 && now - this.conditionSince >= ATTRACTION_SUSTAIN_SEC) {
      this.conditionSince += ATTRACTION_SUSTAIN_SEC;
      this.inventory[MOVE_IN_REWARD_ID] = this.getCount(MOVE_IN_REWARD_ID) + 1;
      this.emitEvent({ kind: "move_in_arrived", objectId: MOVE_IN_REWARD_ID });
      this.emit();
      this.persist();
    }
  }

  private persist(): void {
    this.dirty = false;
    this.saveCooldown = AUTOSAVE_INTERVAL;
    const state: EconomyState = {
      materials: { ...this.materials },
      inventory: { ...this.inventory },
      queue: this.queue.map((entry) => ({ ...entry })),
      last_tick: nowSec(),
      condition_since: this.conditionSince,
      specialty: { ...this.specialty },
    };
    void saveState(state);
  }

  // --- React wiring ---

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  onEvent(listener: (event: EconomyEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emit(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  private emitEvent(event: EconomyEvent): void {
    for (const listener of this.eventListeners) listener(event);
  }
}

/** The one Economy instance (web "autoload"). */
export const economy = new Economy();

/** Subscribes the component to every economy change; read via economy.getMaterial() etc. */
export function useEconomy(): Economy {
  useSyncExternalStore(economy.subscribe, economy.getVersion, economy.getVersion);
  return economy;
}

export type { Economy };
