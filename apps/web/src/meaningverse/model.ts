import type { MultiplayerStatus, ShipModuleSnapshot } from "../net/multiplayer";

export const GAME_NAME = "Meaningverse of Culture";
export const GAME_SHORT_NAME = "MoC";
export const PROJECT_SCALE = "x600billion";
export const SHIP_NAME = "Leviathan";
export const SHIP_MODULE_CAPACITY = 36;
export const TUESDAY_CONTRIBUTOR_TARGET = 30;
export const PHASE1_INVITE_MAX_BYTES = 4096;

export type Phase1InviteState =
  | "idle"
  | "consent"
  | "signer_pending"
  | "copied"
  | "manual"
  | "failed"
  | "cancelled";

export type Phase1InviteAttempt = {
  readonly token: string;
  readonly state: Phase1InviteState;
};

export type Phase1SignerCapability = {
  readonly getPublicKey: () => Promise<string> | string;
  readonly signEvent: (event: unknown) => Promise<unknown> | unknown;
};

/** Capability detection is deliberately structural and never invokes an extension method. */
export function isPhase1SignerCapability(value: unknown): value is Phase1SignerCapability {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.getPublicKey === "function" && typeof candidate.signEvent === "function";
}

let phase1InviteAttemptCounter = 0;

/** Make an app-owned consent token; it is not an event ID, identity, or authorization proof. */
export function createPhase1InviteAttempt(): Phase1InviteAttempt {
  phase1InviteAttemptCounter += 1;
  return { token: `phase1-invite-${phase1InviteAttemptCounter}`, state: "idle" };
}

export type NostrEventDraft = {
  kind: 30078;
  created_at: number;
  content: string;
  tags: string[][];
};

/** Build a direct Street invitation without carrying unrelated query state or URL fragments. */
export function buildMeaningverseInvite(currentHref: string, activation?: string): string {
  const url = new URL(currentHref);
  url.search = "";
  url.searchParams.set("join", "street");
  if (activation) url.searchParams.set("activation", activation);
  url.hash = "";
  return url.toString();
}

export type ShipPlacementEvent = {
  module: ShipModuleSnapshot;
  byLocalPlayer: boolean;
};

/**
 * Modules that are new since the previous confirmed room snapshot, attributed to the local player
 * or a peer. The initial sync (`previous === null`) is silent: joining a room that already has
 * modules is arrival, not placement, and must not fire placement feedback.
 */
export function diffShipPlacements(
  previous: ShipModuleSnapshot[] | null,
  next: ShipModuleSnapshot[],
  localSessionId?: string,
): ShipPlacementEvent[] {
  if (previous === null) return [];
  const known = new Set(previous.map((module) => module.id));
  return next
    .filter((module) => !known.has(module.id))
    .map((module) => ({
      module,
      byLocalPlayer: Boolean(localSessionId) && module.authorSessionId === localSessionId,
    }));
}

export type ShipPlacementEpoch = {
  readonly localSessionId: string;
  readonly modules: ShipModuleSnapshot[];
};

/**
 * Advance placement feedback inside one uninterrupted connected epoch. Reconnecting/offline clears
 * the baseline; the next authoritative room snapshot becomes a silent baseline even when Colyseus
 * preserves the same session id.
 */
export function diffShipPlacementEpoch(
  previous: ShipPlacementEpoch | null,
  next: ShipModuleSnapshot[],
  status: MultiplayerStatus,
  localSessionId?: string,
): {
  readonly baseline: ShipPlacementEpoch | null;
  readonly events: ShipPlacementEvent[];
  readonly reset: boolean;
} {
  if (status !== "connected" || !localSessionId) {
    return { baseline: null, events: [], reset: true };
  }
  const baseline = { localSessionId, modules: next } as const;
  if (!previous || previous.localSessionId !== localSessionId) {
    return { baseline, events: [], reset: true };
  }
  return {
    baseline,
    events: diffShipPlacements(previous.modules, next, localSessionId),
    reset: false,
  };
}

/** The most recently accepted module (server time, slot as the tie-break) — social proof, not rank. */
export function newestShipModule(modules: ShipModuleSnapshot[]): ShipModuleSnapshot | undefined {
  let newest: ShipModuleSnapshot | undefined;
  for (const module of modules) {
    if (
      !newest ||
      module.createdAt > newest.createdAt ||
      (module.createdAt === newest.createdAt && module.slot > newest.slot)
    ) {
      newest = module;
    }
  }
  return newest;
}

/** True only when the shared room confirms modules from this session and at least one other session. */
export function hasCoCreated(modules: ShipModuleSnapshot[], localSessionId?: string): boolean {
  if (!localSessionId) return false;
  const authors = new Set(modules.map((module) => module.authorSessionId));
  return authors.has(localSessionId) && authors.size >= 2;
}

/**
 * Prepare portable Nostr application data after server confirmation. This function cannot sign or
 * publish; a human-controlled signer remains the only authority that can turn the draft into an event.
 */
export function createShipModuleNostrDraft(
  module: ShipModuleSnapshot,
  createdAt = Math.floor(Date.now() / 1000),
): NostrEventDraft {
  if (!Number.isInteger(createdAt) || createdAt < 0)
    throw new Error("createdAt must be Unix seconds");
  return {
    kind: 30078,
    created_at: createdAt,
    content: JSON.stringify({
      authorHandle: module.authorHandle,
      label: module.label,
      role: module.role,
      slot: module.slot,
      source: "session",
      world: "street",
    }),
    tags: [
      ["d", `moc:leviathan:module:${module.slot}`],
      ["t", "meaningverse-of-culture"],
      ["t", "x600billion"],
      ["t", "schaffen"],
    ],
  };
}
