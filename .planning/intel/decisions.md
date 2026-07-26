## ADR-0001: Stack language and runtime topology
- source: docs/adr/0001-stack-and-runtime-topology.md
- status: locked
- decision: Use TypeScript across the browser, realtime, and truth path; isolate Python to the suggestion-only world agent and future data/ML work. The application owns canonical truth, clients and server share ownership verification, and external systems remain adapters.
- scope: client runtime, realtime server, truth tier, ownership verification, world agent, external adapters

## ADR-0002: Chat and voice transport
- source: docs/adr/0002-chat-and-voice-transport.md
- status: locked
- decision: Keep chat and room-scoped non-positional voice behind ChatTransport and VoiceTransport adapters; progress from mocks to NIP-29/LiveKit and later Nostr-native NIP-17/44 and MoQ implementations without changing the UI.
- scope: text chat, voice, transport adapters, LiveKit, Nostr, MoQ

## ADR-0003: Character data and VRM slot-builder
- source: docs/adr/0003-character-data-and-avatar-builder.md
- status: locked
- decision: Build an in-stack, data-driven VRM slot-builder; keep AvatarConfig as source of truth and VRM as derived art; persist the shared Character schema through an IndexedDB-backed CharacterStore before later SQLite migration.
- scope: avatar builder, AvatarConfig, Character schema, IndexedDB, VRM derivation

## ADR-0004: Media, value, and live open standards
- source: docs/adr/0004-media-value-live-open-standards.md
- status: locked
- decision: Make podcasts, music, live broadcasts, social interaction, and V4V core mechanics using Podcasting 2.0 RSS, Lightning splits and zaps, Nostr NIP-53/57/1311, and swappable adapters; Fountain is an interoperable endpoint, not a dependency.
- scope: media player, live events, V4V, Podcasting 2.0, Nostr, Lightning

## ADR-0005: Voice and video backends
- source: docs/adr/0005-voice-backends-hivetalk.md
- status: locked
- decision: Preserve the room-scoped VoiceTransport seam with mock, LiveKit, and separately hosted HiveTalk backends; keep MoQ as the later target and isolate AGPL services behind a network boundary.
- scope: VoiceTransport, LiveKit, HiveTalk, MoQ, AGPL boundary

## ADR-0006: Colyseus authoritative realtime boundary
- source: docs/adr/0006-colyseus-authoritative-realtime-boundary.md
- status: partially superseded; retained through ADR-0009 except for the original hq target
- decision: Retain Colyseus as authority only for bounded ephemeral movement, presence, reconnection leases, and session-local visuals; durable ownership, construction, economy, and world changes remain SQLite commands. ADR-0009 supersedes only the original hq world target.
- scope: Colyseus, movement, presence, room security, ephemeral state, durable-state boundary

## ADR-0007: Desktop web and separate mobile apps
- source: docs/adr/0007-desktop-web-and-separate-mobile-apps.md
- status: locked
- decision: Treat apps/web as the desktop browser world without a supported mobile gameplay contract; future mobile clients are separate applications sharing platform-neutral domain packages, protocols, and durable-state APIs rather than UI.
- scope: desktop web, mobile apps, shared packages, multiplayer protocol, durable APIs

## ADR-0008: Guild lenses and one Palace Core
- source: docs/adr/0008-guild-lenses-and-palace-core.md
- status: locked
- decision: Use one Palace Core across web, world, and arcade; keep canonical Activities separate from guild CurationEntries; support guild, Joined, and Commons lenses; connect surfaces through one Session while separating durable truth from ephemeral runtime state.
- scope: Palace Core, guild lenses, Activities, curation, Sessions, arcade security

## ADR-0009: Public realtime moves to Werkstattgasse
- source: docs/adr/0009-public-realtime-street.md
- status: locked
- decision: Expose only worldId street as the first unauthenticated Colyseus room with spawn (0, 3, 30); retain all ADR-0006 authority and security boundaries, permit at most one bounded human-confirmed ship-module label per session, and keep Palace HQ and Home local for this slice.
- scope: public realtime, Werkstattgasse, street room, spawn, ship modules, ADR-0006 supersession
