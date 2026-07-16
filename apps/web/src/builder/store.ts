// Browser persistence for the home builder. Data writes and their audit events commit atomically.

import {
  type AuditEvent,
  commitAuditedWrite,
  ensureAuditStores,
  readAuditStream,
} from "../audit/indexedDbAudit";

export interface QueueEntry {
  recipe_id: string;
  remaining: number;
  total: number;
}

export interface EconomyState {
  materials: Record<string, number>;
  inventory: Record<string, number>;
  queue: QueueEntry[];
  /** Unix seconds of the last tick; offline time is caught up from here on boot. */
  last_tick: number;
  /** Unix seconds the move-in condition became met; 0 means not met. */
  condition_since: number;
  specialty: Record<string, number>;
}

export interface HomeBlock {
  id: string;
  cell: [number, number, number];
  /** Quarter-turns (0..3) about y for shaped blocks; older saves omit it (= 0). */
  rot?: number;
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
const DB_VERSION = 2;
const STORE = "kv";
const STATE_KEY = "state";
const HOME_KEY_PREFIX = "home:";
const writeQueues = new Map<string, Promise<void>>();

/** Single-home proof of concept: the hosted home. */
export const DEFAULT_HOME = "default";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      ensureAuditStores(db);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readKey<T>(key: string): Promise<T | null> {
  let db: IDBDatabase | null = null;
  try {
    const database = await openDb();
    db = database;
    return await new Promise<T | null>((resolve, reject) => {
      const transaction = database.transaction(STORE, "readonly");
      const input = transaction.objectStore(STORE).get(key);
      input.onsuccess = () => resolve((input.result as T | undefined) ?? null);
      input.onerror = () => reject(input.error);
    });
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

async function writeAuditedKey(
  key: string,
  value: unknown,
  stream: string,
  action: string,
  reason: string,
): Promise<void> {
  // Preserve call order. Without this queue, an older snapshot could win a retry after a newer one.
  const previous = writeQueues.get(stream) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      let db: IDBDatabase | null = null;
      try {
        db = await openDb();
        await commitAuditedWrite(
          db,
          [STORE],
          stream,
          { action, payload: value, reason, updatedBy: "auto:builder" },
          (transaction) => transaction.objectStore(STORE).put(value, key),
        );
      } catch {
        // Storage unavailable/full is non-fatal; the next ordered snapshot can still retry.
      } finally {
        db?.close();
      }
    });
  writeQueues.set(stream, current);
  const clean = () => {
    if (writeQueues.get(stream) === current) writeQueues.delete(stream);
  };
  current.then(clean, clean);
  return current;
}

export async function loadState(): Promise<EconomyState | null> {
  return readKey<EconomyState>(STATE_KEY);
}

export async function saveState(state: EconomyState): Promise<void> {
  return writeAuditedKey(
    STATE_KEY,
    state,
    "builder:economy",
    "economy.snapshot.saved",
    "persist deterministic economy snapshot",
  );
}

export async function loadHome(name: string = DEFAULT_HOME): Promise<HomeData | null> {
  return readKey<HomeData>(HOME_KEY_PREFIX + name);
}

export async function saveHome(data: HomeData, name: string = DEFAULT_HOME): Promise<void> {
  return writeAuditedKey(
    HOME_KEY_PREFIX + name,
    data,
    `builder:home:${name}`,
    "home.snapshot.saved",
    "persist local home after a builder mutation",
  );
}

/** Export a local builder audit stream for verification or future SQLite import. */
export async function loadBuilderAudit(stream: string): Promise<AuditEvent[]> {
  const db = await openDb();
  try {
    return await readAuditStream(db, stream);
  } finally {
    db.close();
  }
}
