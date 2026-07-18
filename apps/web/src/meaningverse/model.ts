import type { ShipModuleSnapshot } from "../net/multiplayer";

export const GAME_NAME = "Meaningverse of Culture";
export const GAME_SHORT_NAME = "MoC";
export const PROJECT_SCALE = "x600billion";
export const SHIP_NAME = "Leviathan";
export const SHIP_MODULE_CAPACITY = 36;
export const TUESDAY_CONTRIBUTOR_TARGET = 30;

export type NostrEventDraft = {
  kind: 30078;
  created_at: number;
  content: string;
  tags: string[][];
};

/** Build a direct Street invitation without carrying unrelated query state or URL fragments. */
export function buildMeaningverseInvite(currentHref: string): string {
  const url = new URL(currentHref);
  url.search = "";
  url.searchParams.set("join", "street");
  url.hash = "";
  return url.toString();
}

/** True only when the shared room confirms modules from this person and at least one other person. */
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
      source: "human",
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
