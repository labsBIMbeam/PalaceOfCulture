import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";

import { AuditStore } from "../src/db/auditStore.js";
import {
  AuditRaidLedger,
  InMemoryRaidLedger,
  RAID_COMPLETED_EVENT_TYPE,
  RAID_STREAM_ID,
} from "../src/multiplayer/raidLedger.js";

const FACTS = {
  coAuthorCount: 2,
  handle: "alice",
  sessionId: "sess-alice",
  shipModuleCount: 2,
} as const;

function temporaryStore(context: TestContext): AuditStore {
  const dir = mkdtempSync(join(tmpdir(), "600b-raid-ledger-"));
  const store = new AuditStore({ databasePath: join(dir, "audit.sqlite") });
  context.after(() => {
    store.close();
    rmSync(dir, { force: true, recursive: true });
  });
  return store;
}

test("the in-memory ledger counts on top of the demo seed", () => {
  const ledger = new InMemoryRaidLedger(104);
  assert.equal(ledger.total(), 104);
  assert.equal(ledger.record(FACTS), 105);
  assert.equal(ledger.record(FACTS), 106);
  assert.equal(ledger.total(), 106);
});

test("the audit ledger records replayable raid.completed events", (context) => {
  const store = temporaryStore(context);
  const ledger = new AuditRaidLedger(store, 104);
  assert.equal(ledger.total(), 104, "an empty stream is exactly the seed");

  assert.equal(ledger.record(FACTS), 105);
  assert.equal(ledger.record({ ...FACTS, handle: "bob", sessionId: "sess-bob" }), 106);
  assert.equal(ledger.total(), 106);

  // The count is derivable from the event log alone — replayable, hash-chained, append-only.
  const events = store.readStream(RAID_STREAM_ID);
  assert.equal(events.length, 2);
  assert.equal(events[0]?.eventType, RAID_COMPLETED_EVENT_TYPE);
  assert.equal(events[0]?.revision, 0);
  assert.equal(events[1]?.prevHash, events[0]?.contentHash);
  assert.deepEqual(events[1]?.payload, {
    coAuthorCount: 2,
    handle: "bob",
    sessionId: "sess-bob",
    shipModuleCount: 2,
  });
  assert.equal(store.verifyStream(RAID_STREAM_ID).valid, true);

  // A fresh ledger over the same database resumes from the persisted truth (server restart).
  const reopened = new AuditRaidLedger(store, 104);
  assert.equal(reopened.total(), 106);
  assert.equal(reopened.record(FACTS), 107);
});

test("a concurrent writer costs one retry, never a lost completion", (context) => {
  const store = temporaryStore(context);
  const ledger = new AuditRaidLedger(store, 0);
  assert.equal(ledger.record(FACTS), 1);

  // Another writer advances the stream between our head read and append: the ledger retries
  // on the fresh head instead of dropping the completion.
  const head = store.getHead(RAID_STREAM_ID);
  assert.ok(head);
  const original = store.getHead.bind(store);
  let intercepted = false;
  store.getHead = (streamId: string) => {
    const current = original(streamId);
    if (!intercepted && streamId === RAID_STREAM_ID && current) {
      intercepted = true;
      store.append({
        streamId: RAID_STREAM_ID,
        revision: current.revision + 1,
        prevHash: current.contentHash,
        eventType: RAID_COMPLETED_EVENT_TYPE,
        payload: { concurrent: true },
        reason: "test concurrent writer",
        updatedBy: "auto:test",
      });
    }
    return current;
  };
  assert.equal(ledger.record(FACTS), 3, "retry lands on top of the concurrent event");
  store.getHead = original;
  assert.equal(store.readStream(RAID_STREAM_ID).length, 3);
  assert.equal(store.verifyStream(RAID_STREAM_ID).valid, true);
});
