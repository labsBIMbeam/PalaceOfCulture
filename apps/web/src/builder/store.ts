// Builder persistence — the seam between the homebuilder and where its state lives, mirroring
// godot/scripts/store.gd (user:// JSON files) and the CharacterStore pattern (src/character/store.ts).
//
// Plug-and-play today = IndexedDB on the device: the player owns their home, no server needed,
// survives reload. The DATA SHAPES are the godot module contract, unchanged:
//   state: {materials, inventory, queue, last_tick, condition_since, specialty}
//   home:  {blocks: [{id, cell: [x,y,z]}], decor: [{id, pos: [x,y,z], rot_y}]}
// The same interface later swaps to the apps/server truth-tier + event log (ADR 0001/0003).

export interface QueueEntry {
  recipe_id: string;
  remaining: number;
  total: number;
}

export interface EconomyState {
  materials: Record<string, number>;
  inventory: Record<string, number>;
  queue: QueueEntry[];
  /** Unix seconds of the last tick — offline time is caught up from here on boot. */
  last_tick: number;
  /** Unix seconds the move-in condition became met; 0 = not met. */
  condition_since: number;
  specialty: Record<string, number>;
}

export interface HomeBlock {
  id: string;
  cell: [number, number, number];
}

export interface HomeDecor {
  id: string;
  pos: [number, number, number];
  rot_y: number;
}

export interface HomeData {
  blocks: HomeBlock[];
  decor: HomeDecor[];
}

const DB_NAME = "600b-builder";
const STORE = "kv";
const STATE_KEY = "state";
const HOME_KEY_PREFIX = "home:";
/** Single-home PoC — the hosted home. */
export const DEFAULT_HOME = "default";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readKey<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null; // storage unavailable — non-fatal for the pilot
  }
}

async function writeKey(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // storage unavailable/full — non-fatal for the pilot
  }
}

export async function loadState(): Promise<EconomyState | null> {
  return readKey<EconomyState>(STATE_KEY);
}

export async function saveState(state: EconomyState): Promise<void> {
  return writeKey(STATE_KEY, state);
}

export async function loadHome(name: string = DEFAULT_HOME): Promise<HomeData | null> {
  return readKey<HomeData>(HOME_KEY_PREFIX + name);
}

export async function saveHome(data: HomeData, name: string = DEFAULT_HOME): Promise<void> {
  return writeKey(HOME_KEY_PREFIX + name, data);
}
