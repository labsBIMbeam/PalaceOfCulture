import type { Character } from "@600b/shared";
import { commitAuditedWrite, ensureAuditStores } from "../audit/indexedDbAudit";

export interface CharacterStore {
  /** The active player's character, or null if none was created yet. */
  loadCurrent(): Promise<Character | null>;
  /** Persist a character and mark it current. */
  save(character: Character): Promise<void>;
  /** Forget the current character without deleting its audit history. */
  clearCurrent(): Promise<void>;
}

const DB_NAME = "600b";
const DB_VERSION = 2;
const CHARACTER_STORE = "characters";
const META_STORE = "metadata";
const CURRENT_KEY = "current-character";
const LEGACY_CURRENT_KEY = "600b:currentCharacterId";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const input = indexedDB.open(DB_NAME, DB_VERSION);
    input.onupgradeneeded = () => {
      const db = input.result;
      if (!db.objectStoreNames.contains(CHARACTER_STORE)) {
        db.createObjectStore(CHARACTER_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
      ensureAuditStores(db);
    };
    input.onsuccess = () => resolve(input.result);
    input.onerror = () => reject(input.error);
  });
}

function request<T>(
  store: IDBObjectStore,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const input = run(store);
    input.onsuccess = () => resolve(input.result);
    input.onerror = () => reject(input.error);
  });
}

function readLegacyCurrentId(): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(LEGACY_CURRENT_KEY);
  } catch {
    return null;
  }
}

function clearLegacyCurrentId(): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(LEGACY_CURRENT_KEY);
  } catch {
    // The IndexedDB pointer is authoritative; blocked legacy storage is safe to ignore.
  }
}

/** IndexedDB store with ordered operations, an atomic pointer and a hash-linked audit trail. */
export function createIndexedDbCharacterStore(): CharacterStore {
  let operationTail = Promise.resolve();
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = operationTail.then(operation);
    operationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  return {
    loadCurrent: () =>
      enqueue(async () => {
        const db = await openDb();
        try {
          const meta = db.transaction(META_STORE, "readonly").objectStore(META_STORE);
          const storedId = await request<string | undefined>(meta, (store) =>
            store.get(CURRENT_KEY),
          );
          const id = storedId ?? readLegacyCurrentId();
          if (!id) return null;
          const record = await request<Character | undefined>(
            db.transaction(CHARACTER_STORE, "readonly").objectStore(CHARACTER_STORE),
            (store) => store.get(id),
          );
          if (record && !storedId) {
            await commitAuditedWrite(
              db,
              [META_STORE],
              "character:current",
              {
                action: "character.pointer.migrated",
                payload: { id },
                reason: "move the active pointer from legacy localStorage into IndexedDB",
                updatedBy: "auto:character-migration",
              },
              (transaction) => transaction.objectStore(META_STORE).put(id, CURRENT_KEY),
            );
            clearLegacyCurrentId();
          }
          return record ?? null;
        } finally {
          db.close();
        }
      }),

    save: (character) =>
      enqueue(async () => {
        const db = await openDb();
        try {
          await commitAuditedWrite(
            db,
            [CHARACTER_STORE, META_STORE],
            `character:${character.id}`,
            {
              action: "character.saved",
              payload: character,
              reason: "persist the locally selected or updated avatar",
              updatedBy: character.updatedBy,
            },
            (transaction) => {
              transaction.objectStore(CHARACTER_STORE).put(character);
              transaction.objectStore(META_STORE).put(character.id, CURRENT_KEY);
            },
          );
          clearLegacyCurrentId();
        } finally {
          db.close();
        }
      }),

    clearCurrent: () =>
      enqueue(async () => {
        const db = await openDb();
        try {
          const meta = db.transaction(META_STORE, "readonly").objectStore(META_STORE);
          const currentId = await request<string | undefined>(meta, (store) =>
            store.get(CURRENT_KEY),
          );
          await commitAuditedWrite(
            db,
            [META_STORE],
            "character:current",
            {
              action: "character.current.cleared",
              payload: { previousId: currentId ?? null },
              reason: "the local player requested a fresh character selection",
              updatedBy: "local:character-store",
            },
            (transaction) => transaction.objectStore(META_STORE).delete(CURRENT_KEY),
          );
          clearLegacyCurrentId();
        } finally {
          db.close();
        }
      }),
  };
}

/** Create the browser store used by the web application. */
export function createCharacterStore(): CharacterStore {
  return createIndexedDbCharacterStore();
}
