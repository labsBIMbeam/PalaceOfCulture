import assert from "node:assert/strict";
import type { Character } from "@600b/shared";
import "fake-indexeddb/auto";
import { readAuditStream, verifyAuditChain } from "../src/audit/indexedDbAudit";
import { loadHome, saveHome } from "../src/builder/store";
import { createIndexedDbCharacterStore } from "../src/character/store";

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();

  get length(): number {
    return this.#values.size;
  }

  clear(): void {
    this.#values.clear();
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.#values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: new MemoryStorage(),
});

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = indexedDB.deleteDatabase(name);
    input.onsuccess = () => resolve();
    input.onerror = () => reject(input.error);
    input.onblocked = () => reject(new Error(`Database ${name} deletion was blocked`));
  });
}

function openDatabase(name: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const input = indexedDB.open(name, version);
    input.onsuccess = () => resolve(input.result);
    input.onerror = () => reject(input.error);
  });
}

await deleteDatabase("600b");
const characters = createIndexedDbCharacterStore();
const character: Character = {
  id: "member-test",
  handle: "test-member",
  avatar: {
    age: "adult",
    gender: "neutral",
    skinTone: "#c98f63",
    aura: "#e7b23c",
    hair: "short-brown",
    outfit: "workwear",
    headwear: "none",
  },
  createdAt: 1_767_225_600_000,
  updatedAt: 1_767_225_600_000,
  updatedBy: "local:test",
};

await characters.save(character);
assert.deepEqual(await characters.loadCurrent(), character, "character and active pointer commit");

const characterDb = await openDatabase("600b", 2);
const characterEvents = await readAuditStream(characterDb, "character:member-test");
assert.equal(characterEvents.length, 1, "character save appends one audit event");
assert.deepEqual(await verifyAuditChain(characterEvents), { valid: true, revisions: 1 });
characterDb.close();

await characters.clearCurrent();
assert.equal(await characters.loadCurrent(), null, "clear removes the pointer");

await deleteDatabase("600b-builder");
const firstHome = {
  blocks: [{ id: "block_stone", cell: [0, 0, 0] as [number, number, number] }],
  decor: [],
};
const secondHome = {
  blocks: [
    { id: "block_stone", cell: [0, 0, 0] as [number, number, number] },
    { id: "block_stone", cell: [1, 0, 0] as [number, number, number] },
  ],
  decor: [],
};
await Promise.all([saveHome(firstHome, "test"), saveHome(secondHome, "test")]);
assert.deepEqual(
  await loadHome("test"),
  secondHome,
  "ordered writes cannot restore a stale snapshot",
);

const builderDb = await openDatabase("600b-builder", 2);
const builderEvents = await readAuditStream(builderDb, "builder:home:test");
assert.equal(builderEvents.length, 2, "both ordered home writes remain in history");
assert.deepEqual(await verifyAuditChain(builderEvents), { valid: true, revisions: 2 });
assert.deepEqual(builderEvents[1]?.payload, secondHome, "latest event matches latest state");
builderDb.close();

console.log("INDEXEDDB AUDIT INTEGRATION TESTS GREEN (9 assertions)");
