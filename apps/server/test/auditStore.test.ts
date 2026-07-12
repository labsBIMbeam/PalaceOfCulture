import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import test, { type TestContext } from "node:test";

import type { JsonValue } from "@600b/shared";
import Database from "better-sqlite3";

import {
  type AppendAuditEventInput,
  AuditConflictError,
  AuditEncodingError,
  AuditInputError,
  AuditIntegrityError,
  AuditStore,
  type AuditStoreOptions,
  canonicalizeAuditJson,
  computeAuditContentHash,
  resolveAuditDatabasePath,
} from "../src/db/auditStore.js";

test("database defaults stay outside the repo and migrations are idempotent", (context) => {
  const defaultPath = resolveAuditDatabasePath(undefined, {});
  assert.equal(isAbsolute(defaultPath), true);
  assert.equal(defaultPath.startsWith(resolve(".")), false);
  assert.throws(() => resolveAuditDatabasePath("relative/audit.sqlite"), /must be absolute/);

  const fixture = createFixture(context);
  const store = fixture.open();
  assert.deepEqual(store.getRuntimeSettings(), {
    journalMode: "wal",
    foreignKeys: true,
    synchronous: 2,
    busyTimeoutMs: 5_000,
    schemaVersion: 1,
  });
  store.close();

  const reopened = fixture.open();
  assert.equal(reopened.getRuntimeSettings().schemaVersion, 1);
  reopened.close();

  const raw = new Database(fixture.databasePath);
  const migrationCount = raw
    .prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM audit_schema_migrations")
    .get()?.count;
  raw.close();
  assert.equal(migrationCount, 1);
});

test("append, read, verify, and deterministic export form one hash chain", (context) => {
  const fixture = createFixture(context);
  const store = fixture.open({ clock: tickingClock() });
  const genesis = store.append(
    eventInput({
      payload: { z: 2, a: { y: true, x: false } },
      reason: "Create the asset record.",
    }),
  );
  const changed = store.append(
    eventInput({
      revision: 1,
      prevHash: genesis.contentHash,
      eventType: "asset.status_changed",
      payload: { status: "REVIEW" },
      reason: "Manual review requested.",
    }),
  );

  assert.match(genesis.contentHash, /^[0-9a-f]{64}$/);
  assert.equal(changed.prevHash, genesis.contentHash);
  assert.equal(store.getEvent("asset:test", 0)?.contentHash, genesis.contentHash);
  assert.deepEqual(store.readStream("asset:test"), [genesis, changed]);
  assert.deepEqual(store.getHead("asset:test"), {
    streamId: "asset:test",
    revision: 1,
    contentHash: changed.contentHash,
    createdAt: genesis.timestamp,
    updatedAt: changed.timestamp,
  });

  const verification = store.verifyStream("asset:test");
  assert.equal(verification.valid, true);
  if (verification.valid) assert.equal(verification.eventCount, 2);

  const exported = store.exportStream("asset:test");
  assert.equal(exported.format, "600b.audit.stream");
  assert.deepEqual(exported.events, [genesis, changed]);
  const exportJson = store.exportStreamJson("asset:test");
  assert.equal(exportJson, canonicalizeAuditJson(exported));
  assert.match(exportJson, /"a":\{"x":false,"y":true\},"z":2/);
});

test("the first valid fork wins atomically across store connections", (context) => {
  const fixture = createFixture(context);
  const firstStore = fixture.open({ clock: fixedClock("2026-01-01T00:00:00.000Z") });
  const secondStore = fixture.open({ clock: fixedClock("2026-01-01T00:00:01.000Z") });
  const genesis = firstStore.append(eventInput());
  const observedHead = secondStore.getHead("asset:test");
  assert.equal(observedHead?.contentHash, genesis.contentHash);

  const winner = firstStore.append(
    eventInput({
      revision: 1,
      prevHash: genesis.contentHash,
      eventType: "asset.status_changed",
      payload: { status: "COPY" },
      reason: "First accepted branch.",
    }),
  );

  assert.throws(
    () =>
      secondStore.append(
        eventInput({
          revision: 1,
          prevHash: genesis.contentHash,
          eventType: "asset.status_changed",
          payload: { status: "SKIP" },
          reason: "Competing branch.",
        }),
      ),
    (error) =>
      error instanceof AuditConflictError &&
      error.code === "revision_conflict" &&
      error.actualHead?.contentHash === winner.contentHash,
  );

  assert.throws(
    () =>
      secondStore.append(
        eventInput({
          revision: 2,
          prevHash: genesis.contentHash,
          eventType: "asset.status_changed",
        }),
      ),
    (error) => error instanceof AuditConflictError && error.code === "prev_hash_conflict",
  );
  assert.throws(
    () => secondStore.append(eventInput({ revision: 3, prevHash: winner.contentHash })),
    (error) => error instanceof AuditConflictError && error.code === "revision_conflict",
  );
  assert.equal(firstStore.readStream("asset:test").length, 2);
});

test("invalid metadata and non-canonical JSON values are rejected before writes", (context) => {
  const fixture = createFixture(context);
  const store = fixture.open();

  assert.throws(() => store.append(eventInput({ updatedBy: "anonymous" })), AuditInputError);
  assert.throws(
    () => store.append(eventInput({ revision: 1, prevHash: null })),
    (error) => error instanceof AuditConflictError && error.code === "revision_conflict",
  );
  assert.throws(
    () => store.append(eventInput({ payload: { invalid: Number.NaN } })),
    AuditEncodingError,
  );

  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.throws(
    () => store.append(eventInput({ payload: circular as JsonValue })),
    AuditEncodingError,
  );
  assert.equal(store.getHead("asset:test"), null);
});

test("valid chains survive restart and continue from the persisted head", (context) => {
  const fixture = createFixture(context);
  const firstStore = fixture.open({ clock: fixedClock("2026-02-01T00:00:00.000Z") });
  const genesis = firstStore.append(eventInput());
  const second = firstStore.append(
    eventInput({ revision: 1, prevHash: genesis.contentHash, payload: { status: "REVIEW" } }),
  );
  const beforeRestart = firstStore.exportStreamJson("asset:test");
  firstStore.close();

  const restarted = fixture.open({ clock: fixedClock("2026-02-01T00:00:01.000Z") });
  assert.equal(restarted.verifyStream("asset:test").valid, true);
  assert.equal(restarted.exportStreamJson("asset:test"), beforeRestart);
  const third = restarted.append(
    eventInput({ revision: 2, prevHash: second.contentHash, payload: { status: "COPY" } }),
  );
  assert.equal(restarted.getHead("asset:test")?.contentHash, third.contentHash);
  assert.equal(restarted.verifyStream("asset:test").valid, true);
});

test("append-only triggers reject writes and verification detects bypass tampering", (context) => {
  const fixture = createFixture(context);
  const store = fixture.open({ clock: fixedClock("2026-03-01T00:00:00.000Z") });
  const genesis = store.append(eventInput());
  store.append(
    eventInput({ revision: 1, prevHash: genesis.contentHash, payload: { status: "COPY" } }),
  );
  store.close();

  const raw = new Database(fixture.databasePath);
  assert.throws(
    () =>
      raw
        .prepare("UPDATE audit_events SET payload_json = ? WHERE stream_id = ? AND revision = 1")
        .run('{"status":"SKIP"}', "asset:test"),
    /append-only/,
  );
  raw.exec("DROP TRIGGER audit_events_no_update");
  raw
    .prepare("UPDATE audit_events SET payload_json = ? WHERE stream_id = ? AND revision = 1")
    .run('{"status":"SKIP"}', "asset:test");
  raw.close();

  const restarted = fixture.open();
  const verification = restarted.verifyStream("asset:test");
  assert.equal(verification.valid, false);
  if (!verification.valid) {
    assert.equal(verification.code, "content_hash_mismatch");
    assert.equal(verification.eventIndex, 1);
  }
  assert.throws(() => restarted.exportStream("asset:test"), AuditIntegrityError);
});

test("content hashing has a fixed canonical regression vector", () => {
  const first = computeAuditContentHash({
    streamId: "asset:vector",
    revision: 0,
    prevHash: null,
    eventType: "asset.created",
    payload: { z: [3, 2, 1], a: "culture" },
    reason: "Canonical vector.",
    updatedBy: "auto:test",
    timestamp: "2026-01-02T03:04:05.006Z",
  });
  const second = computeAuditContentHash({
    streamId: "asset:vector",
    revision: 0,
    prevHash: null,
    eventType: "asset.created",
    payload: { a: "culture", z: [3, 2, 1] },
    reason: "Canonical vector.",
    updatedBy: "auto:test",
    timestamp: "2026-01-02T03:04:05.006Z",
  });
  assert.equal(first, second);
  assert.equal(first, "f485d3b1415dc32391fce15b057dffa27edb8ad99521e5681a6728b8f947bcb3");
});

interface TestFixture {
  readonly databasePath: string;
  open(options?: Omit<AuditStoreOptions, "databasePath">): AuditStore;
}

function createFixture(context: TestContext): TestFixture {
  const directory = mkdtempSync(join(tmpdir(), "600b-audit-test-"));
  const stores: AuditStore[] = [];
  context.after(() => {
    for (const store of stores) store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const databasePath = join(directory, "audit.sqlite");
  return {
    databasePath,
    open: (options = {}) => {
      const store = new AuditStore({ ...options, databasePath });
      stores.push(store);
      return store;
    },
  };
}

function eventInput(overrides: Partial<AppendAuditEventInput> = {}): AppendAuditEventInput {
  return {
    streamId: "asset:test",
    revision: 0,
    prevHash: null,
    eventType: "asset.created",
    payload: { status: "PENDING" },
    reason: "Create the audit stream.",
    updatedBy: "user:test",
    ...overrides,
  };
}

function fixedClock(timestamp: string): () => Date {
  return () => new Date(timestamp);
}

function tickingClock(): () => Date {
  let second = 0;
  return () => new Date(Date.UTC(2026, 0, 1, 0, 0, second++));
}
