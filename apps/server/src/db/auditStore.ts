import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

import type { JsonValue } from "@600b/shared";
import Database from "better-sqlite3";

import { AuditEncodingError, canonicalizeAuditJson } from "./canonicalJson.js";

const AUDIT_HASH_DOMAIN = "600b:audit:event:v1";
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9._:-]{0,127}$/;
const UPDATED_BY_PATTERN = /^(?:auto|user):[A-Za-z0-9][A-Za-z0-9._:@/-]{0,126}$/;
const MAX_PAYLOAD_BYTES = 1024 * 1024;
const LATEST_SCHEMA_VERSION = 1;
const APPEND_INPUT_KEYS = [
  "eventType",
  "payload",
  "prevHash",
  "reason",
  "revision",
  "streamId",
  "updatedBy",
] as const;

const EVENT_SELECT = `
  SELECT
    stream_id AS streamId,
    revision,
    prev_hash AS prevHash,
    content_hash AS contentHash,
    event_type AS eventType,
    payload_json AS payloadJson,
    reason,
    updated_by AS updatedBy,
    recorded_at AS timestamp
  FROM audit_events
`;

const MIGRATION_1 = `
  CREATE TABLE audit_streams (
    stream_id TEXT PRIMARY KEY,
    head_revision INTEGER NOT NULL CHECK (head_revision >= 0),
    head_hash TEXT NOT NULL
      CHECK (length(head_hash) = 64 AND head_hash NOT GLOB '*[^0-9a-f]*'),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT;

  CREATE TABLE audit_events (
    stream_id TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision >= 0),
    prev_hash TEXT
      CHECK (
        prev_hash IS NULL OR
        (length(prev_hash) = 64 AND prev_hash NOT GLOB '*[^0-9a-f]*')
      ),
    content_hash TEXT NOT NULL UNIQUE
      CHECK (length(content_hash) = 64 AND content_hash NOT GLOB '*[^0-9a-f]*'),
    event_type TEXT NOT NULL CHECK (length(event_type) BETWEEN 1 AND 128),
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 1000),
    updated_by TEXT NOT NULL CHECK (length(updated_by) BETWEEN 3 AND 128),
    recorded_at TEXT NOT NULL,
    PRIMARY KEY (stream_id, revision),
    FOREIGN KEY (stream_id) REFERENCES audit_streams(stream_id) ON DELETE RESTRICT
  ) STRICT, WITHOUT ROWID;

  CREATE INDEX audit_events_stream_hash_idx ON audit_events(stream_id, content_hash);

  CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE ON audit_events
  BEGIN
    SELECT RAISE(ABORT, 'audit_events are append-only');
  END;

  CREATE TRIGGER audit_events_no_delete
  BEFORE DELETE ON audit_events
  BEGIN
    SELECT RAISE(ABORT, 'audit_events are append-only');
  END;
`;

export const AUDIT_PROTOCOL_VERSION = 1 as const;

export interface AppendAuditEventInput {
  readonly streamId: string;
  readonly revision: number;
  readonly prevHash: string | null;
  readonly eventType: string;
  readonly payload: JsonValue;
  readonly reason: string;
  readonly updatedBy: string;
}

export interface AuditEvent extends AppendAuditEventInput {
  readonly contentHash: string;
  readonly timestamp: string;
}

export interface AuditHead {
  readonly streamId: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AuditStreamExport {
  readonly format: "600b.audit.stream";
  readonly protocolVersion: 1;
  readonly streamId: string;
  readonly events: readonly AuditEvent[];
}

export interface AuditStoreOptions {
  readonly databasePath?: string;
  readonly clock?: () => Date;
}

export interface AuditRuntimeSettings {
  readonly journalMode: string;
  readonly foreignKeys: boolean;
  readonly synchronous: number;
  readonly busyTimeoutMs: number;
  readonly schemaVersion: number;
}

export type AuditConflictCode =
  | "content_hash_conflict"
  | "prev_hash_conflict"
  | "revision_conflict";

export type AuditVerifyErrorCode =
  | "content_hash_mismatch"
  | "event_count_mismatch"
  | "head_mismatch"
  | "invalid_event"
  | "payload_not_canonical"
  | "prev_hash_mismatch"
  | "revision_mismatch"
  | "stream_not_found";

export interface ValidAuditVerifyResult {
  readonly valid: true;
  readonly streamId: string;
  readonly eventCount: number;
  readonly head: AuditHead;
}

export interface InvalidAuditVerifyResult {
  readonly valid: false;
  readonly streamId: string;
  readonly code: AuditVerifyErrorCode;
  readonly reason: string;
  readonly eventIndex?: number;
}

export type AuditVerifyResult = ValidAuditVerifyResult | InvalidAuditVerifyResult;

interface StreamRow {
  streamId: string;
  headRevision: number;
  headHash: string;
  createdAt: string;
  updatedAt: string;
}

interface EventRow {
  streamId: string;
  revision: number;
  prevHash: string | null;
  contentHash: string;
  eventType: string;
  payloadJson: string;
  reason: string;
  updatedBy: string;
  timestamp: string;
}

interface PreparedAuditEvent extends AuditEvent {
  readonly payloadJson: string;
}

/** A compare-and-swap append lost to the stream head that committed first. */
export class AuditConflictError extends Error {
  override readonly name = "AuditConflictError";

  constructor(
    readonly code: AuditConflictCode,
    readonly streamId: string,
    readonly requestedRevision: number,
    readonly actualHead: AuditHead | null,
    message: string,
  ) {
    super(message);
  }
}

/** Raised for invalid metadata at the internal AuditStore boundary. */
export class AuditInputError extends Error {
  override readonly name = "AuditInputError";
}

/** Raised when a read/export encounters a broken stored chain. */
export class AuditIntegrityError extends Error {
  override readonly name = "AuditIntegrityError";

  constructor(readonly result: InvalidAuditVerifyResult) {
    super(result.reason);
  }
}

/**
 * SQLite-backed append-only audit log.
 *
 * This is an internal synchronous store. It deliberately exposes no HTTP mutation surface.
 */
export class AuditStore {
  readonly databasePath: string;
  readonly #clock: () => Date;
  readonly #database: Database.Database;

  constructor(options: AuditStoreOptions = {}) {
    this.databasePath = options.databasePath ?? resolveAuditDatabasePath();
    this.#clock = options.clock ?? (() => new Date());
    if (this.databasePath !== ":memory:") {
      mkdirSync(dirname(this.databasePath), { recursive: true, mode: 0o700 });
    }

    this.#database = new Database(this.databasePath, { timeout: 5_000 });
    try {
      this.#configureConnection();
      this.#migrate();
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  /** Atomically append exactly the caller's expected next revision and previous hash. */
  append(input: AppendAuditEventInput): AuditEvent {
    this.#assertOpen();
    const event = this.#prepareEvent(input);
    const appendTransaction = this.#database.transaction(() => {
      const currentHead = this.#selectHead(event.streamId);
      this.#assertExpectedHead(event, currentHead);

      if (!currentHead) {
        this.#database
          .prepare<{
            streamId: string;
            headRevision: number;
            headHash: string;
            createdAt: string;
          }>(`
            INSERT INTO audit_streams (
              stream_id, head_revision, head_hash, created_at, updated_at
            ) VALUES (
              @streamId, @headRevision, @headHash, @createdAt, @createdAt
            )
          `)
          .run({
            streamId: event.streamId,
            headRevision: event.revision,
            headHash: event.contentHash,
            createdAt: event.timestamp,
          });
      } else {
        const update = this.#database
          .prepare<{
            streamId: string;
            nextRevision: number;
            nextHash: string;
            updatedAt: string;
            expectedRevision: number;
            expectedHash: string;
          }>(`
            UPDATE audit_streams
            SET
              head_revision = @nextRevision,
              head_hash = @nextHash,
              updated_at = @updatedAt
            WHERE
              stream_id = @streamId AND
              head_revision = @expectedRevision AND
              head_hash = @expectedHash
          `)
          .run({
            streamId: event.streamId,
            nextRevision: event.revision,
            nextHash: event.contentHash,
            updatedAt: event.timestamp,
            expectedRevision: currentHead.headRevision,
            expectedHash: currentHead.headHash,
          });
        if (update.changes !== 1) {
          throw this.#revisionConflict(event, this.#selectHead(event.streamId));
        }
      }

      this.#database
        .prepare<{
          streamId: string;
          revision: number;
          prevHash: string | null;
          contentHash: string;
          eventType: string;
          payloadJson: string;
          reason: string;
          updatedBy: string;
          timestamp: string;
        }>(`
          INSERT INTO audit_events (
            stream_id, revision, prev_hash, content_hash, event_type,
            payload_json, reason, updated_by, recorded_at
          ) VALUES (
            @streamId, @revision, @prevHash, @contentHash, @eventType,
            @payloadJson, @reason, @updatedBy, @timestamp
          )
        `)
        .run(event);

      return toPublicEvent(event);
    });

    try {
      return appendTransaction.immediate();
    } catch (error) {
      if (error instanceof AuditConflictError) throw error;
      if (isContentHashConflict(error)) {
        throw new AuditConflictError(
          "content_hash_conflict",
          event.streamId,
          event.revision,
          this.getHead(event.streamId),
          "The generated content hash already exists.",
        );
      }
      throw error;
    }
  }

  /** Read the current stream head, or null when the stream has not been created. */
  getHead(streamId: string): AuditHead | null {
    this.#assertOpen();
    validateStreamId(streamId);
    const row = this.#selectHead(streamId);
    return row ? toAuditHead(row) : null;
  }

  /** Read one event without mutating or repairing stored data. */
  getEvent(streamId: string, revision: number): AuditEvent | null {
    this.#assertOpen();
    validateStreamId(streamId);
    validateRevision(revision);
    const row = this.#database
      .prepare<[string, number], EventRow>(`${EVENT_SELECT} WHERE stream_id = ? AND revision = ?`)
      .get(streamId, revision);
    return row ? rowToEvent(row) : null;
  }

  /** Read an ordered stream without mutating or repairing stored data. */
  readStream(streamId: string): AuditEvent[] {
    this.#assertOpen();
    validateStreamId(streamId);
    return this.#selectEvents(streamId).map(rowToEvent);
  }

  /** Verify revisions, linkage, canonical payloads, content hashes, and the materialized head. */
  verifyStream(streamId: string): AuditVerifyResult {
    this.#assertOpen();
    validateStreamId(streamId);
    const verifyTransaction = this.#database.transaction(() => this.#verifySnapshot(streamId));
    return verifyTransaction.deferred();
  }

  /** Export only a verified stream from one consistent SQLite read snapshot. */
  exportStream(streamId: string): AuditStreamExport {
    this.#assertOpen();
    validateStreamId(streamId);
    const exportTransaction = this.#database.transaction(() => {
      const verification = this.#verifySnapshot(streamId);
      if (!verification.valid) throw new AuditIntegrityError(verification);
      return {
        format: "600b.audit.stream" as const,
        protocolVersion: AUDIT_PROTOCOL_VERSION,
        streamId,
        events: this.#selectEvents(streamId).map(rowToEvent),
      };
    });
    return exportTransaction.deferred();
  }

  /** Export a deterministic JSON representation suitable for hashing or offline storage. */
  exportStreamJson(streamId: string): string {
    return canonicalizeAuditJson(this.exportStream(streamId));
  }

  /** Return operational SQLite settings for diagnostics and deployment checks. */
  getRuntimeSettings(): AuditRuntimeSettings {
    this.#assertOpen();
    const schemaVersion = this.#database
      .prepare<[], { version: number | null }>(
        "SELECT MAX(version) AS version FROM audit_schema_migrations",
      )
      .get()?.version;
    return {
      journalMode: String(this.#database.pragma("journal_mode", { simple: true })),
      foreignKeys: Number(this.#database.pragma("foreign_keys", { simple: true })) === 1,
      synchronous: Number(this.#database.pragma("synchronous", { simple: true })),
      busyTimeoutMs: Number(this.#database.pragma("busy_timeout", { simple: true })),
      schemaVersion: schemaVersion ?? 0,
    };
  }

  /** Close the SQLite handle. Safe to call repeatedly. */
  close(): void {
    if (this.#database.open) this.#database.close();
  }

  #configureConnection(): void {
    this.#database.pragma("busy_timeout = 5000");
    this.#database.pragma("foreign_keys = ON");
    this.#database.pragma("journal_mode = WAL");
    this.#database.pragma("synchronous = FULL");
    this.#database.pragma("wal_autocheckpoint = 1000");
    this.#database.pragma("journal_size_limit = 67108864");
    this.#database.pragma("trusted_schema = OFF");
  }

  #migrate(): void {
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS audit_schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
      ) STRICT;
    `);

    const latestStoredVersion =
      this.#database
        .prepare<[], { version: number | null }>(
          "SELECT MAX(version) AS version FROM audit_schema_migrations",
        )
        .get()?.version ?? 0;
    if (latestStoredVersion > LATEST_SCHEMA_VERSION) {
      throw new Error(
        `Audit schema ${latestStoredVersion} is newer than supported ${LATEST_SCHEMA_VERSION}.`,
      );
    }

    const migrateTransaction = this.#database.transaction(() => {
      const applied = this.#database
        .prepare<[number], { version: number }>(
          "SELECT version FROM audit_schema_migrations WHERE version = ?",
        )
        .get(1);
      if (applied) return;

      this.#database.exec(MIGRATION_1);
      this.#database
        .prepare<{ version: number; name: string; appliedAt: string }>(`
          INSERT INTO audit_schema_migrations (version, name, applied_at)
          VALUES (@version, @name, @appliedAt)
        `)
        .run({
          version: 1,
          name: "create_append_only_audit_log",
          appliedAt: this.#now(),
        });
    });
    migrateTransaction.immediate();
  }

  #prepareEvent(input: AppendAuditEventInput): PreparedAuditEvent {
    validateAppendInput(input);
    const payloadJson = canonicalizeAuditJson(input.payload);
    if (Buffer.byteLength(payloadJson, "utf8") > MAX_PAYLOAD_BYTES) {
      throw new AuditInputError(`payload exceeds ${MAX_PAYLOAD_BYTES} canonical UTF-8 bytes.`);
    }

    const timestamp = this.#now();
    const payload = JSON.parse(payloadJson) as JsonValue;
    const eventWithoutHash = {
      streamId: input.streamId,
      revision: input.revision,
      prevHash: input.prevHash,
      eventType: input.eventType,
      payload,
      reason: input.reason,
      updatedBy: input.updatedBy,
      timestamp,
    };
    return {
      ...eventWithoutHash,
      contentHash: computeAuditContentHash(eventWithoutHash),
      payloadJson,
    };
  }

  #assertExpectedHead(event: PreparedAuditEvent, currentHead: StreamRow | undefined): void {
    const expectedRevision = currentHead ? currentHead.headRevision + 1 : 0;
    if (event.revision !== expectedRevision) {
      throw this.#revisionConflict(event, currentHead);
    }

    const expectedPrevHash = currentHead?.headHash ?? null;
    if (event.prevHash !== expectedPrevHash) {
      throw new AuditConflictError(
        "prev_hash_conflict",
        event.streamId,
        event.revision,
        currentHead ? toAuditHead(currentHead) : null,
        "prevHash does not match the current stream head.",
      );
    }
  }

  #revisionConflict(
    event: PreparedAuditEvent,
    currentHead: StreamRow | undefined,
  ): AuditConflictError {
    return new AuditConflictError(
      "revision_conflict",
      event.streamId,
      event.revision,
      currentHead ? toAuditHead(currentHead) : null,
      "revision is not the next revision of the current stream head.",
    );
  }

  #verifySnapshot(streamId: string): AuditVerifyResult {
    const headRow = this.#selectHead(streamId);
    if (!headRow) {
      return invalidResult(streamId, "stream_not_found", "The audit stream does not exist.");
    }
    const rows = this.#selectEvents(streamId);
    if (rows.length !== headRow.headRevision + 1) {
      return invalidResult(
        streamId,
        "event_count_mismatch",
        "Stored event count does not match the materialized head revision.",
      );
    }

    let expectedPrevHash: string | null = null;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!row) {
        return invalidResult(streamId, "invalid_event", "An audit row is missing.", index);
      }
      if (row.revision !== index) {
        return invalidResult(
          streamId,
          "revision_mismatch",
          "Audit revisions must start at zero and increase by one.",
          index,
        );
      }
      if (row.prevHash !== expectedPrevHash) {
        return invalidResult(
          streamId,
          "prev_hash_mismatch",
          "An event prevHash does not match the previous event.",
          index,
        );
      }

      let payload: JsonValue;
      let canonicalPayload: string;
      try {
        payload = JSON.parse(row.payloadJson) as JsonValue;
        canonicalPayload = canonicalizeAuditJson(payload);
      } catch {
        return invalidResult(
          streamId,
          "payload_not_canonical",
          "An event payload is not valid canonical JSON.",
          index,
        );
      }
      if (canonicalPayload !== row.payloadJson) {
        return invalidResult(
          streamId,
          "payload_not_canonical",
          "An event payload is not stored in canonical form.",
          index,
        );
      }

      try {
        validateStoredEvent(row);
      } catch (error) {
        return invalidResult(
          streamId,
          "invalid_event",
          error instanceof Error ? error.message : "An event contains invalid metadata.",
          index,
        );
      }
      const computedHash = computeAuditContentHash({
        streamId: row.streamId,
        revision: row.revision,
        prevHash: row.prevHash,
        eventType: row.eventType,
        payload,
        reason: row.reason,
        updatedBy: row.updatedBy,
        timestamp: row.timestamp,
      });
      if (computedHash !== row.contentHash) {
        return invalidResult(
          streamId,
          "content_hash_mismatch",
          "An event content hash does not match its canonical content.",
          index,
        );
      }
      expectedPrevHash = row.contentHash;
    }

    const lastRow = rows.at(-1);
    const firstRow = rows[0];
    if (
      !lastRow ||
      !firstRow ||
      headRow.headRevision !== lastRow.revision ||
      headRow.headHash !== lastRow.contentHash ||
      headRow.createdAt !== firstRow.timestamp ||
      headRow.updatedAt !== lastRow.timestamp
    ) {
      return invalidResult(
        streamId,
        "head_mismatch",
        "The materialized stream head does not match its stored events.",
      );
    }

    return {
      valid: true,
      streamId,
      eventCount: rows.length,
      head: toAuditHead(headRow),
    };
  }

  #selectHead(streamId: string): StreamRow | undefined {
    return this.#database
      .prepare<[string], StreamRow>(`
        SELECT
          stream_id AS streamId,
          head_revision AS headRevision,
          head_hash AS headHash,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM audit_streams
        WHERE stream_id = ?
      `)
      .get(streamId);
  }

  #selectEvents(streamId: string): EventRow[] {
    return this.#database
      .prepare<[string], EventRow>(`${EVENT_SELECT} WHERE stream_id = ? ORDER BY revision ASC`)
      .all(streamId);
  }

  #now(): string {
    const date = this.#clock();
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
      throw new AuditInputError("Audit clock returned an invalid Date.");
    }
    return date.toISOString();
  }

  #assertOpen(): void {
    if (!this.#database.open) throw new Error("AuditStore is closed.");
  }
}

export interface AuditHashInput extends Omit<AuditEvent, "contentHash"> {}

/** Generate the domain-separated content hash stored in the audit chain. */
export function computeAuditContentHash(event: AuditHashInput): string {
  const canonical = canonicalizeAuditJson({
    eventType: event.eventType,
    payload: event.payload,
    prevHash: event.prevHash,
    protocolVersion: AUDIT_PROTOCOL_VERSION,
    reason: event.reason,
    revision: event.revision,
    streamId: event.streamId,
    timestamp: event.timestamp,
    updatedBy: event.updatedBy,
  });
  return createHash("sha256")
    .update(AUDIT_HASH_DOMAIN, "utf8")
    .update("\0", "utf8")
    .update(canonical, "utf8")
    .digest("hex");
}

/** Resolve the configured DB path; defaults are durable and outside the repository. */
export function resolveAuditDatabasePath(
  configuredPath?: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const candidate = configuredPath?.trim();
  if (candidate) {
    if (candidate === ":memory:") return candidate;
    if (!isAbsolute(candidate)) {
      throw new Error("AUDIT_DB_PATH must be absolute or :memory:.");
    }
    return candidate;
  }

  const configuredStateRoot = process.platform === "win32" ? env.LOCALAPPDATA : env.XDG_STATE_HOME;
  const stateRoot =
    configuredStateRoot && isAbsolute(configuredStateRoot)
      ? configuredStateRoot
      : process.platform === "win32"
        ? join(homedir(), "AppData", "Local")
        : join(homedir(), ".local", "state");
  return join(stateRoot, "600b", "audit.sqlite");
}

function validateAppendInput(input: AppendAuditEventInput): void {
  if (!isPlainRecord(input)) throw new AuditInputError("Audit input must be a plain object.");
  const keys = Object.keys(input).sort();
  if (
    keys.length !== APPEND_INPUT_KEYS.length ||
    APPEND_INPUT_KEYS.some((key, index) => key !== keys[index])
  ) {
    throw new AuditInputError("Audit input contains missing or unknown fields.");
  }
  validateStreamId(input.streamId);
  validateRevision(input.revision);
  validateHashOrNull(input.prevHash, "prevHash");
  validateEventType(input.eventType);
  validateReason(input.reason);
  validateUpdatedBy(input.updatedBy);
}

function validateStoredEvent(row: EventRow): void {
  validateStreamId(row.streamId);
  validateRevision(row.revision);
  validateHashOrNull(row.prevHash, "prevHash");
  if (!HASH_PATTERN.test(row.contentHash)) {
    throw new AuditInputError("contentHash must be a lowercase SHA-256 digest.");
  }
  validateEventType(row.eventType);
  validateReason(row.reason);
  validateUpdatedBy(row.updatedBy);
  validateTimestamp(row.timestamp);
}

function validateStreamId(value: string): void {
  validateText(value, "streamId", 255);
}

function validateRevision(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new AuditInputError("revision must be a non-negative safe integer.");
  }
}

function validateHashOrNull(value: string | null, name: string): void {
  if (value !== null && !HASH_PATTERN.test(value)) {
    throw new AuditInputError(`${name} must be null or a lowercase SHA-256 digest.`);
  }
}

function validateEventType(value: string): void {
  if (typeof value !== "string" || !EVENT_TYPE_PATTERN.test(value)) {
    throw new AuditInputError("eventType must use lowercase structured naming.");
  }
}

function validateReason(value: string): void {
  validateText(value, "reason", 1000);
}

function validateUpdatedBy(value: string): void {
  if (typeof value !== "string" || !UPDATED_BY_PATTERN.test(value)) {
    throw new AuditInputError("updatedBy must start with user: or auto: and name its actor.");
  }
}

function validateTimestamp(value: string): void {
  if (typeof value !== "string") throw new AuditInputError("timestamp must be an ISO instant.");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    throw new AuditInputError("timestamp must be a canonical ISO instant.");
  }
}

function validateText(value: string, name: string, maxLength: number): void {
  if (
    typeof value !== "string" ||
    !value ||
    value.trim() !== value ||
    value.length > maxLength ||
    containsControlCharacter(value)
  ) {
    throw new AuditInputError(
      `${name} must be non-empty, trimmed, control-free, and at most ${maxLength} characters.`,
    );
  }
}

function containsControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || (code >= 127 && code <= 159)) return true;
  }
  return false;
}

function rowToEvent(row: EventRow): AuditEvent {
  let payload: JsonValue;
  try {
    payload = JSON.parse(row.payloadJson) as JsonValue;
  } catch {
    throw new AuditIntegrityError(
      invalidResult(
        row.streamId,
        "payload_not_canonical",
        "An event payload is not valid JSON.",
        row.revision,
      ),
    );
  }
  return {
    streamId: row.streamId,
    revision: row.revision,
    prevHash: row.prevHash,
    contentHash: row.contentHash,
    eventType: row.eventType,
    payload,
    reason: row.reason,
    updatedBy: row.updatedBy,
    timestamp: row.timestamp,
  };
}

function toPublicEvent(event: PreparedAuditEvent): AuditEvent {
  return {
    streamId: event.streamId,
    revision: event.revision,
    prevHash: event.prevHash,
    contentHash: event.contentHash,
    eventType: event.eventType,
    payload: JSON.parse(event.payloadJson) as JsonValue,
    reason: event.reason,
    updatedBy: event.updatedBy,
    timestamp: event.timestamp,
  };
}

function toAuditHead(row: StreamRow): AuditHead {
  return {
    streamId: row.streamId,
    revision: row.headRevision,
    contentHash: row.headHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function invalidResult(
  streamId: string,
  code: AuditVerifyErrorCode,
  reason: string,
  eventIndex?: number,
): InvalidAuditVerifyResult {
  return eventIndex === undefined
    ? { valid: false, streamId, code, reason }
    : { valid: false, streamId, code, reason, eventIndex };
}

function isContentHashConflict(error: unknown): boolean {
  return (
    error instanceof Database.SqliteError &&
    error.code === "SQLITE_CONSTRAINT_UNIQUE" &&
    error.message.includes("audit_events.content_hash")
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

export { AuditEncodingError, canonicalizeAuditJson } from "./canonicalJson.js";
