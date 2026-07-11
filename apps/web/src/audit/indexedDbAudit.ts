import { canonicalizeJson } from "@600b/shared";

export const AUDIT_EVENT_STORE = "audit-events";
export const AUDIT_HEAD_STORE = "audit-heads";

export interface AuditEvent<T = unknown> {
  id: string;
  stream: string;
  revision: number;
  action: string;
  payload: T;
  reason: string;
  updatedAt: string;
  updatedBy: string;
  prevHash: string | null;
  hash: string;
}

interface AuditHead {
  stream: string;
  revision: number;
  hash: string;
}

export interface AuditInput<T> {
  action: string;
  payload: T;
  reason: string;
  updatedBy: string;
}

export type AuditVerification =
  | { valid: true; revisions: number }
  | { valid: false; revision: number; reason: string };

class AuditConflictError extends Error {}

function assertText(value: string, field: string): void {
  if (!value.trim()) throw new Error(`Audit ${field} must not be empty`);
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalizeJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function request<T>(input: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    input.onsuccess = () => resolve(input.result);
    input.onerror = () => reject(input.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Audit transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Audit transaction aborted"));
  });
}

/** Add the append-only stores during an IndexedDB version upgrade. */
export function ensureAuditStores(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(AUDIT_EVENT_STORE)) {
    const events = database.createObjectStore(AUDIT_EVENT_STORE, { keyPath: "id" });
    events.createIndex("stream-revision", ["stream", "revision"], { unique: true });
  }
  if (!database.objectStoreNames.contains(AUDIT_HEAD_STORE)) {
    database.createObjectStore(AUDIT_HEAD_STORE, { keyPath: "stream" });
  }
}

async function readHead(database: IDBDatabase, stream: string): Promise<AuditHead | null> {
  const transaction = database.transaction(AUDIT_HEAD_STORE, "readonly");
  const value = await request<AuditHead | undefined>(
    transaction.objectStore(AUDIT_HEAD_STORE).get(stream),
  );
  return value ?? null;
}

/** Create one deterministic, hash-linked event from a previously verified stream head. */
export async function createAuditEvent<T>(
  stream: string,
  input: AuditInput<T>,
  previous: Pick<AuditEvent, "revision" | "hash"> | null = null,
  updatedAt = new Date().toISOString(),
): Promise<AuditEvent<T>> {
  assertText(stream, "stream");
  assertText(input.action, "action");
  assertText(input.reason, "reason");
  assertText(input.updatedBy, "updatedBy");
  if (!/^(auto|local|user):[^\s]+$/.test(input.updatedBy)) {
    throw new Error("Audit updatedBy must use the auto:, local: or user: prefix");
  }
  if (Number.isNaN(Date.parse(updatedAt)))
    throw new Error("Audit updatedAt must be ISO-compatible");
  const revision = (previous?.revision ?? 0) + 1;
  const unsigned = {
    id: `${stream}:${revision}`,
    stream,
    revision,
    action: input.action,
    payload: input.payload,
    reason: input.reason,
    updatedAt,
    updatedBy: input.updatedBy,
    prevHash: previous?.hash ?? null,
  };
  return { ...unsigned, hash: await sha256(unsigned) };
}

/** Verify ordering, linkage and content hashes without trusting IndexedDB metadata. */
export async function verifyAuditChain(events: readonly AuditEvent[]): Promise<AuditVerification> {
  let previous: AuditEvent | null = null;
  for (const event of events) {
    const expectedRevision = (previous?.revision ?? 0) + 1;
    if (event.revision !== expectedRevision) {
      return { valid: false, revision: event.revision, reason: "non-contiguous revision" };
    }
    if (previous && event.stream !== previous.stream) {
      return { valid: false, revision: event.revision, reason: "mixed streams" };
    }
    if (event.prevHash !== (previous?.hash ?? null)) {
      return { valid: false, revision: event.revision, reason: "previous hash mismatch" };
    }
    if (event.id !== `${event.stream}:${event.revision}`) {
      return { valid: false, revision: event.revision, reason: "event id mismatch" };
    }
    const { hash, ...unsigned } = event;
    if (hash !== (await sha256(unsigned))) {
      return { valid: false, revision: event.revision, reason: "content hash mismatch" };
    }
    previous = event;
  }
  return { valid: true, revisions: events.length };
}

/**
 * Commit an application write and its audit record in the same IndexedDB transaction.
 * A small optimistic retry keeps concurrent tabs from creating two events at one revision.
 */
export async function commitAuditedWrite<T>(
  database: IDBDatabase,
  dataStores: readonly string[],
  stream: string,
  input: AuditInput<T>,
  write: (transaction: IDBTransaction, event: AuditEvent<T>) => void,
): Promise<AuditEvent<T>> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const expected = await readHead(database, stream);
    const event = await createAuditEvent(stream, input, expected);
    const transaction = database.transaction(
      [...new Set([...dataStores, AUDIT_EVENT_STORE, AUDIT_HEAD_STORE])],
      "readwrite",
    );
    const completion = transactionDone(transaction);
    try {
      const actual = await request<AuditHead | undefined>(
        transaction.objectStore(AUDIT_HEAD_STORE).get(stream),
      );
      if (
        (actual?.revision ?? 0) !== (expected?.revision ?? 0) ||
        actual?.hash !== expected?.hash
      ) {
        transaction.abort();
        await completion.catch(() => undefined);
        throw new AuditConflictError("Audit stream changed during write");
      }
      write(transaction, event);
      transaction.objectStore(AUDIT_EVENT_STORE).add(event);
      transaction.objectStore(AUDIT_HEAD_STORE).put({
        stream,
        revision: event.revision,
        hash: event.hash,
      } satisfies AuditHead);
      await completion;
      return event;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The transaction already completed or was aborted by IndexedDB.
      }
      await completion.catch(() => undefined);
      if (!(error instanceof AuditConflictError) || attempt === 2) throw error;
    }
  }
  throw new Error("Audit write retry limit reached");
}

/** Read a stream in revision order for export or local verification. */
export async function readAuditStream(
  database: IDBDatabase,
  stream: string,
): Promise<AuditEvent[]> {
  const transaction = database.transaction(AUDIT_EVENT_STORE, "readonly");
  const index = transaction.objectStore(AUDIT_EVENT_STORE).index("stream-revision");
  const range = IDBKeyRange.bound([stream, 0], [stream, Number.MAX_SAFE_INTEGER]);
  return request<AuditEvent[]>(index.getAll(range));
}
