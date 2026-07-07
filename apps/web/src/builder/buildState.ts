// Block + decor placement state for one world — a 1:1 port of godot/scripts/build_system.gd,
// with the GridMap swapped for a plain cell map (rendering is the scene's job; state is data).
// Every mutation settles with Economy and re-reports specialty multipliers and the move-in
// condition (>=9 blocks and >=1 lantern placed). Autosaves via builder/store.ts on every change.

import { useSyncExternalStore } from "react";
import { getObject } from "./catalog";
import { economy } from "./economy";
import { DEFAULT_HOME, type HomeData, loadHome, saveHome } from "./store";

export type Cell = [number, number, number];

export interface PlacedDecor {
  uid: string;
  id: string;
  pos: [number, number, number];
  rotY: number;
}

const cellKey = (cell: Cell) => `${cell[0]},${cell[1]},${cell[2]}`;

let uidCounter = 0;
const newUid = () => {
  uidCounter += 1;
  return `b${uidCounter}-${Date.now().toString(36)}`;
};

class BuildSystem {
  /** cellKey -> block object id. */
  private cells = new Map<string, string>();
  private decor: PlacedDecor[] = [];
  /** Palace worlds pass allowBlocks = false — block tools exist only in the private Home. */
  private allowBlocks = true;
  private version = 0;
  private listeners = new Set<() => void>();
  private loaded = false;
  private suppressSave = false;

  /** Loads the blueprint for the home and starts autosaving on every change. */
  async setup(allowBlocks: boolean, home: string = DEFAULT_HOME): Promise<void> {
    this.allowBlocks = allowBlocks;
    const data = await loadHome(home);
    this.suppressSave = true; // loading must not immediately re-save
    this.fromData(data ?? { blocks: [], decor: [] });
    this.suppressSave = false;
    this.loaded = true;
  }

  // --- reads ---

  blockAt(cell: Cell): string | undefined {
    return this.cells.get(cellKey(cell));
  }

  blockCount(): number {
    return this.cells.size;
  }

  decorCount(objectId: string): number {
    return this.decor.filter((item) => item.id === objectId).length;
  }

  /** [cell, blockId] pairs for rendering. */
  entries(): Array<{ cell: Cell; id: string }> {
    return Array.from(this.cells.entries(), ([key, id]) => {
      const parts = key.split(",").map(Number);
      return { cell: [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0] as Cell, id };
    });
  }

  decorItems(): PlacedDecor[] {
    return [...this.decor];
  }

  /** The magnet's 3x3x1 placement footprint around a center cell. */
  footprintCells(center: Cell): Cell[] {
    const cells: Cell[] = [];
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        cells.push([center[0] + dx, center[1], center[2] + dz]);
      }
    }
    return cells;
  }

  // --- mutations (all settle with Economy) ---

  /** Places blockId into every free cell, consuming one from Economy per cell. */
  placeBlocks(cells: Cell[], blockId: string): number {
    if (!this.allowBlocks || getObject(blockId)?.kind !== "block") return 0;
    let placed = 0;
    for (const cell of cells) {
      if (this.cells.has(cellKey(cell))) continue;
      if (!economy.consumeObject(blockId)) break;
      this.cells.set(cellKey(cell), blockId);
      placed += 1;
    }
    if (placed > 0) this.afterChange();
    return placed;
  }

  /** Clears the cell and returns the block to Economy. */
  absorbBlock(cell: Cell): boolean {
    if (!this.allowBlocks) return false;
    const id = this.cells.get(cellKey(cell));
    if (!id) return false;
    this.cells.delete(cellKey(cell));
    economy.returnObject(id);
    this.afterChange();
    return true;
  }

  /**
   * Atomic absorb+place: swaps existing blocks of another material to blockId.
   * New blocks are consumed, displaced blocks return intact. Empty cells stay empty.
   */
  replaceBlocks(cells: Cell[], blockId: string): number {
    if (!this.allowBlocks || getObject(blockId)?.kind !== "block") return 0;
    let swapped = 0;
    for (const cell of cells) {
      const current = this.cells.get(cellKey(cell));
      if (!current || current === blockId) continue;
      if (!economy.consumeObject(blockId)) break;
      economy.returnObject(current);
      this.cells.set(cellKey(cell), blockId);
      swapped += 1;
    }
    if (swapped > 0) this.afterChange();
    return swapped;
  }

  /** Places one crafted furniture piece, consuming it from Economy. */
  placeDecor(objectId: string, pos: [number, number, number], rotY: number): boolean {
    if (getObject(objectId)?.kind !== "furniture") return false;
    if (!economy.consumeObject(objectId)) return false;
    this.decor.push({ uid: newUid(), id: objectId, pos, rotY });
    this.afterChange();
    return true;
  }

  /** Removes a placed furniture piece and returns the object to Economy. */
  absorbDecor(uid: string): boolean {
    const index = this.decor.findIndex((item) => item.uid === uid);
    const item = this.decor[index];
    if (index < 0 || !item) return false;
    economy.returnObject(item.id);
    this.decor.splice(index, 1);
    this.afterChange();
    return true;
  }

  // --- serialization (JSON-safe, the godot contract data shape) ---

  toData(): HomeData {
    return {
      blocks: this.entries().map(({ cell, id }) => ({ id, cell })),
      decor: this.decor.map((item) => ({ id: item.id, pos: item.pos, rot_y: item.rotY })),
    };
  }

  /** Restores placed state without touching Economy (placed objects are not inventory). */
  fromData(data: HomeData): void {
    this.cells.clear();
    this.decor = [];
    for (const entry of data.blocks ?? []) {
      // stale save: block id no longer in Catalog — skip, never crash
      if (getObject(entry.id)?.kind !== "block") continue;
      const [x = 0, y = 0, z = 0] = entry.cell ?? [0, 0, 0];
      this.cells.set(cellKey([Math.round(x), Math.round(y), Math.round(z)]), entry.id);
    }
    for (const entry of data.decor ?? []) {
      if (getObject(entry.id)?.kind !== "furniture") continue;
      const [x = 0, y = 0, z = 0] = entry.pos ?? [0, 0, 0];
      this.decor.push({ uid: newUid(), id: entry.id, pos: [x, y, z], rotY: entry.rot_y ?? 0 });
    }
    this.afterChange();
  }

  // --- internals ---

  /**
   * Specialty multipliers = product per material over placed specialty objects. Only the Home
   * (allowBlocks) pushes to Economy: specialty and move-in are Home concepts, so a palace visit
   * must not clobber the persisted context.
   */
  private afterChange(): void {
    if (this.allowBlocks) {
      const mults: Record<string, number> = {};
      for (const item of this.decor) {
        const specialty = getObject(item.id)?.specialty ?? {};
        for (const [mat, mult] of Object.entries(specialty)) {
          mults[mat] = (mults[mat] ?? 1) * mult;
        }
      }
      economy.setSpecialtyContext(mults);
      economy.notifyCondition(this.blockCount() >= 9 && this.decorCount("lantern") >= 1);
    }
    this.version += 1;
    for (const listener of this.listeners) listener();
    if (this.loaded && !this.suppressSave) void saveHome(this.toData());
  }

  // --- React wiring ---

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;
}

/** The one home BuildSystem instance (single-home PoC). */
export const buildSystem = new BuildSystem();

/** Subscribes the component to every placement change; read via buildSystem.entries() etc. */
export function useBuildSystem(): BuildSystem {
  useSyncExternalStore(buildSystem.subscribe, buildSystem.getVersion, buildSystem.getVersion);
  return buildSystem;
}

export type { BuildSystem };
