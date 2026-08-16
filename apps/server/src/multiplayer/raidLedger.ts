import type { AuditStore } from "../db/auditStore.js";
import { AuditConflictError } from "../db/auditStore.js";

export const RAID_STREAM_ID = "street:raids";
export const RAID_COMPLETED_EVENT_TYPE = "raid.completed";

/** Server-observable facts of one completed Light-the-Street run, recorded for the audit trail. */
export interface RaidCompletionFacts {
  readonly sessionId: string;
  readonly handle: string;
  /** Distinct module authors in the room at completion time (co-creation requires >= 2). */
  readonly coAuthorCount: number;
  readonly shipModuleCount: number;
}

/**
 * Counts completed raid runs. `total()` includes the configured demo seed; `record()` returns the
 * new total. The seed is presentation staging only — recorded completions are the audited truth.
 */
export interface RaidLedger {
  total(): number;
  record(facts: RaidCompletionFacts): number;
}

/** Volatile ledger for dev and tests — same law, no durability. */
export class InMemoryRaidLedger implements RaidLedger {
  #completions = 0;
  readonly #seed: number;

  constructor(seed = 0) {
    this.#seed = seed;
  }

  total(): number {
    return this.#seed + this.#completions;
  }

  record(_facts: RaidCompletionFacts): number {
    this.#completions += 1;
    return this.total();
  }
}

/**
 * Durable ledger over the append-only audit log: one `raid.completed` event per run on the
 * `street:raids` stream, so the foundation's growth is replayable from the event log alone.
 */
export class AuditRaidLedger implements RaidLedger {
  readonly #store: AuditStore;
  readonly #seed: number;

  constructor(store: AuditStore, seed = 0) {
    this.#store = store;
    this.#seed = seed;
  }

  total(): number {
    const head = this.#store.getHead(RAID_STREAM_ID);
    return this.#seed + (head ? head.revision + 1 : 0);
  }

  record(facts: RaidCompletionFacts): number {
    try {
      return this.#append(facts);
    } catch (error) {
      // A single active room appends sequentially; a conflict means another writer touched the
      // stream (e.g. operator tooling) — re-read the head once and retry on top of it.
      if (!(error instanceof AuditConflictError)) throw error;
      return this.#append(facts);
    }
  }

  #append(facts: RaidCompletionFacts): number {
    const head = this.#store.getHead(RAID_STREAM_ID);
    const event = this.#store.append({
      streamId: RAID_STREAM_ID,
      revision: head ? head.revision + 1 : 0,
      prevHash: head ? head.contentHash : null,
      eventType: RAID_COMPLETED_EVENT_TYPE,
      payload: {
        coAuthorCount: facts.coAuthorCount,
        handle: facts.handle,
        sessionId: facts.sessionId,
        shipModuleCount: facts.shipModuleCount,
      },
      reason: "co-create verified in the public palace room",
      updatedBy: "auto:palace-room",
    });
    return this.#seed + event.revision + 1;
  }
}
