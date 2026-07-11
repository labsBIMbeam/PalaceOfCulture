// Entity identities — the Nostr keys for places/groups/NPCs (palaces, guilds, system), so a palace can
// post announcements + (later) author its NIP-53 live events + receive zaps under its own npub.
//
// Service private keys never belong in the browser. The public demo npubs remain as read-only labels
// while signing moves behind the truth-tier API. These demo identities must be rotated before trust.

/** Stable public demo npubs. No derivation seed or private material is shipped to the client. */
export const ENTITY_NPUBS = {
  hqPalace: "npub1daquyvsku3g8fxz5c5r4jln92fttf84sa3c38f0flg5xkd4gk3eqf2t0rt",
  foundersGuild: "npub1a3ss95dhzmh4fjfc6jx6njslmlls42g0vahj0th4ycgkssthunzsmne5m0",
  worldAgent: "npub1yg6y9wuyefcekalppnjydttn93af4nwqum8tjtugp3lucl27f7esalnfen",
} as const;
