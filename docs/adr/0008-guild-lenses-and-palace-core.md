# ADR 0008 — Guild lenses and one Palace Core across surfaces

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Felix (@bimbeam), Codex
- **Builds on:** [ADR 0001](0001-stack-and-runtime-topology.md),
  [ADR 0002](0002-chat-and-voice-transport.md),
  [ADR 0004](0004-media-value-live-open-standards.md),
  [ADR 0006](0006-colyseus-authoritative-realtime-boundary.md)

## Context

The current frontend exposes Home, Culture, Workshop and Market as separate screens. The 3D world
is entered as another screen, so social context disappears when the user changes mode. Adding a
global content feed would preserve that website-shaped architecture and reintroduce the spam and
quality problems already present in open social feeds.

The intended product is one Palace with multiple renderings:

- web is the fast, data-dense view;
- the game engine is the spatial, fully visual view;
- embedded V4V games provide action on demand.

People may belong to multiple communities for different interests. A single mandatory guild or one
global engagement-ranked feed cannot represent that social structure.

## Decision

### One shared Palace Core

Web, world and arcade surfaces consume the same versioned domain ids and session contract from
`packages/shared`. They do not maintain separate identities, guilds, inventories, chats or session
histories. Surface parity means the same capability and state are reachable from each appropriate
client; it does not mean pixel-identical interfaces.

### Activities are canonical; guilds are lenses

An **Activity** is one canonical thing people can do together: listen, watch, read, meet, craft,
trade or play. Its provider data remains read-only and is referenced by URL/id.

A guild does not copy or own an Activity. It appends a **CurationEntry** referencing the canonical
Activity id. The same Wavlake track may therefore appear through several guild lenses while keeping
one media identity and one source record.

Users may hold many guild memberships. They choose one of three explicit lenses:

1. one guild;
2. the deterministic union of joined guilds;
3. Commons, the public Palace-curated entry surface for people without a guild.

No engagement metric participates in lens ordering. Curators choose featured state and optional
position; deterministic recency and id ordering break ties. Discovery of other guilds is a separate,
explicit action instead of content silently leaking into the selected lens.

### Sessions connect every surface

A **Session** is the social instance of an Activity. It has one id, state, chat channel and optional
guild/place context. Joining on the web, entering the world and launching an arcade runtime all join
the same Session. Presence and movement remain ephemeral under ADR 0006; durable session decisions
and results are written to SQLite first.

### State ownership

| State | Authority | Durability |
|---|---|---|
| Activity, guild, membership, curation, scheduled session, result | Palace truth tier | SQLite append-only streams |
| External media/game metadata | provider | read-only source plus verified cache/reference |
| Presence, movement, live participant state | Colyseus/session runtime | ephemeral |
| Active lens, panel layout | client | local preference |
| Nostr group/events and relay discovery | adapter | published/reconciled after canonical commit |

Nostr and Podcasting 2.0 remain open interoperability layers, not the canonical Palace database.

### Arcade games are untrusted adapters

An arcade game supplies a versioned manifest and joins a host-created Palace Session. Web games run
in a sandboxed iframe with an exact origin allowlist. Engine-native games declare a scene id. Games
may report bounded results, but cannot mutate guild state, publish canonical scores or access wallet
credentials directly. The Palace validates, records and performs V4V payments.

## Consequences

**Positive**

- Guilds become the human quality filter instead of a global recommendation algorithm.
- Web and world can evolve independently without becoming separate products.
- Culture, crafting, trade and games share one social grammar: Activity → Session → Place/Group.
- V4V games can be added incrementally without granting third-party code truth-tier authority.
- The existing shared package, audit store, NIP-29 plan and Colyseus boundary are reused.

**Negative / trade-offs**

- Every feature must define both its canonical data and its surface projections.
- Multi-guild moderation and role changes need explicit audited commands.
- Session handoff and reconnect semantics become a load-bearing protocol.
- Commons needs real editorial stewardship; it cannot be populated with fabricated activity.

## Rejected alternatives

- **One global Culture feed.** Rejected: weak social context, spam pressure and algorithmic
  incentives.
- **One Palace guild.** Rejected: interests and trust graphs overlap; membership is naturally many
  to many.
- **Separate web and engine databases.** Rejected: guaranteed drift and duplicate social state.
- **Let games call wallets or write scores directly.** Rejected: untrusted code must not cross the
  truth or custody boundary.

## ISO 19650 note

This accepted ADR records the shared information-container boundary. Future changes supersede this
record with a new ADR. Curation, membership, session and result decisions are append-only SQLite
events with actor and reason; external source records remain unmodified.
