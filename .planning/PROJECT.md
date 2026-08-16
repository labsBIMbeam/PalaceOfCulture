# 600 Billion — The Palace of Culture

## What This Is

600 Billion — The Palace of Culture is a web-first stylized 3D social MMO where Bitcoin timelocks become visible, ownable objects and individuals co-create a lived cultural world. The primary runtime is desktop-browser gameplay in `apps/web` backed by an authoritative TypeScript server; mobile web is companion-only, while future mobile gameplay belongs in separate applications that share platform-neutral contracts.

The repository is a brownfield TypeScript monorepo with partial and skeleton implementations across the browser, Node truth tier, shared packages, Godot slice, napplets, and an isolated Python suggestion service. Current code evidence is distinguished below from the active product requirements still to be delivered.

## Core Value

A builder can enter Werkstattgasse, create and place something meaningful in under ten minutes, and invite another person to witness or remix it.

## Requirements

### Validated

The following are codebase-evidenced current capabilities, not claims that the complete product loop or its user value has been validated:

- ✓ A desktop React/Three.js browser shell can enter local Street, Home, and HQ-targeted surfaces, with Werkstattgasse as the current playable public district and HQ remaining teaser-only.
- ✓ A bounded public `street` Colyseus room supports authoritative ephemeral movement, presence, reconnection handling, and session-local ship modules for up to 64 clients; room state is intentionally non-durable and unauthenticated.
- ✓ Browser-local character and builder writes can use hash-linked IndexedDB audit streams, while the Node server has a tested append-only, hash-linked SQLite audit store.
- ✓ Shared TypeScript packages define Palace domain records, multiplayer protocol validation, ownership-branch verification, and deterministic entity identity; ownership and identity packages are implemented but not yet wired into application command paths.
- ✓ The optional Python world-agent remains localhost-bound, stateless, suggestion-only, and unable to mutate application truth.
- ✓ Existing web and Godot slices demonstrate partial local building, crafting, placement, social-art, and persistence concepts, but they are divergent implementations rather than evidence that the staged v1 requirements are complete.

### Active

- [ ] Deliver the coherent Werkstattgasse vertical slice: enter → create in under ten minutes → place → invite → witness/remix.
- [ ] Make earned, finite-slot Palace placement legible, including proof-only non-custodial timelock assets and class-appropriate controls.
- [ ] Turn crafting into durable communal work through complementary contributions, commissioning, visible provenance, and a repeatable bakery demonstration.
- [ ] Grow Home through ethical elapsed-time production, age, inhabitants, homecoming reports, and non-punitive cadence.
- [ ] Establish shared cultural time through deterministic calendars, postcards, witnessing, Unsealings, and non-custodial guild monuments.
- [ ] Deliver one persistent Palace Prism across guild lenses, web/world renderers, Sessions, Bell Mode, and the Arcane Night proof sequence.
- [ ] Preserve application-owned durable truth, shared ownership verification, deterministic auditability, and strict separation from ephemeral realtime state throughout all phases.

See `.planning/REQUIREMENTS.md` for the 27 atomic v1 requirements and source traceability.

### Out of Scope

- Mobile gameplay in `apps/web` — mobile web is companion-only; future gameplay clients are separate applications sharing domain packages and protocols.
- Palace HQ interior, HQ Arrival Plaza, and Palace Ringstadt as the current entry world — Werkstattgasse is the present playable target; these are future spatial contexts.
- Full private-world builder, structural Palace construction, building parts, and terraforming — social furnishing and finite placement must become fun first.
- Open asset uploads, paid placement, spam-oriented infinite placement, or structural parts in the social placement MVP — the initial surface uses a small curated asset set and finite slots.
- Streaks, daily quests, login rewards, expiry, decay, upkeep, pay-to-skip, retention notifications, fabricated social proof, or wealth/activity leaderboards — anticipation must never become anxiety or punishment.
- Officer-spendable pooled guild custody, tithes, quotas, member thresholds, or amount-ranked plaques — v1 guild value flows are direct-recipient or materials-only.
- Lightning as a timelock-asset substrate — Bitcoin L1 is the default proof path and Liquid is only a high-fee fallback for eligible short/medium tiers.
- A general guild creator before Prism, renderer continuity, and one sandboxed Arcane Game pass their prototype gates.
- Real social-network feeds, generative AI, a full economy, broad server persistence, or a large quest system as prerequisites for the first local/mock social-art prototype.

## Context

The approved ingest synthesized 34 documents (9 ADRs, 11 specifications, 6 PRDs, and 8 supporting documents) with 0 blockers, 0 warnings, and 7 informational auto-resolutions. Eight ADRs are locked; ADR-0006 is partially superseded only where ADR-0009 moves the first public realtime target from HQ to `street`.

The current production-capable path is React 18 + Three.js/R3F/Rapier in `apps/web`, Node 22 + Colyseus + SQLite in `apps/server`, and shared TypeScript domain/protocol packages. Godot 4.7 is a separate local-first slice, and Python 3.12 is isolated to suggestion-only world-agent work. The repository already contains useful scaffolding, but authenticated durable commands, timelock integration, reconciliation workers, real chat/voice backends, persistent shared state, content-hashed delivery, observability, and deployment automation remain planned or absent.

The developer-facing success metric for this milestone is one coherent vertical slice that supports enter → create in under ten minutes → place → invite → witness/remix while preserving app-owned truth, non-custodial timelocks, and deterministic auditability.

## Constraints

- **Runtime topology**: TypeScript owns browser, realtime, and truth paths; Python remains suggestion-only — canonical application decisions must not escape into an agent or external provider.
- **Platform**: `apps/web` targets desktop browsers; core interface capability must remain usable at 1280×720 and with 3D disabled — accessibility and fallback views are product invariants.
- **Truth boundary**: Durable ownership, construction, economy, Session, guild, and world decisions append to SQLite before external effects — public Colyseus state is bounded, ephemeral, and never durable identity.
- **Ownership**: Client and server must import one shared verifier; relay ordering is not authority — `packages/ownership` exists but is not yet wired into either app.
- **Timelocks**: Principal remains non-custodial and server-independent; proof creates the asset — Bitcoin L1 is required for legend tiers, Liquid is constrained fallback, and Lightning is excluded.
- **State/art separation**: GLB/VRM and other art stay immutable; placement, growth, ownership, and patina are serializable state — this preserves deterministic replay and content addressing.
- **Ethical progression**: Wall-clock absence may compound progress but never causes loss; material progression cannot be accelerated by money, attendance, popularity, or calendar festivals.
- **Open protocols**: Nostr, Podcasting 2.0, Lightning/V4V, LiveKit/HiveTalk, and future MoQ remain behind adapters — external systems supply transport or evidence, not Palace authority.
- **Security**: Session authorization precedes room admission; arcade and napplet inputs are untrusted, versioned, origin-bounded, and incapable of direct truth mutation.
- **World scope**: The current public room is `worldId: street` with spawn `(0, 3, 30)`; Palace HQ and Home remain local for this slice.
- **Performance**: Preserve instancing/LOD, bounded physics, asset budgets, clean production builds, and a stable laptop frame rate — do not revive superseded mobile-web gameplay targets.
- **Interface continuity**: Guild lens, canonical IDs, Session, chat, media, participants, and shareable location survive renderer changes — surface switches must not invent or duplicate domain objects.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| **ADR-0001 — TypeScript stack and runtime topology**: Use TypeScript across browser, realtime, and truth paths; isolate Python to suggestion-only world-agent and future data/ML work; keep canonical truth in the application with shared ownership verification and external adapters. | One typed authority path prevents surface/provider drift and keeps proposals separate from decisions. | **Locked · — Pending validation** |
| **ADR-0002 — Chat and voice transport**: Keep chat and room-scoped non-positional voice behind `ChatTransport` and `VoiceTransport`; move from mocks to NIP-29/LiveKit and later NIP-17/44 and MoQ without changing UI contracts. | Transport replacement must not remount or redesign the social interface. | **Locked · — Pending validation** |
| **ADR-0003 — Character data and VRM slot-builder**: Use an in-stack, data-driven VRM slot-builder; `AvatarConfig` is truth, VRM is derived art, and the shared Character schema persists first through IndexedDB before later SQLite migration. | Data-owned identity keeps art replaceable and cross-surface records stable. | **Locked · — Pending validation** |
| **ADR-0004 — Media, value, and live open standards**: Make media, live broadcasts, social interaction, and V4V core mechanics through Podcasting 2.0 RSS, Lightning splits/zaps, Nostr NIP-53/57/1311, and swappable adapters; Fountain is an endpoint, not a dependency. | Open protocols preserve interoperability and prevent provider capture. | **Locked · — Pending validation** |
| **ADR-0005 — Voice and video backends**: Preserve the room-scoped `VoiceTransport` seam with mock, LiveKit, and separately hosted HiveTalk backends; keep MoQ as later target and isolate AGPL services behind a network boundary. | Backend choice and licensing must not contaminate Palace application authority. | **Locked · — Pending validation** |
| **ADR-0006 — Colyseus authoritative realtime boundary**: Retain Colyseus only for bounded ephemeral movement, presence, reconnection leases, and session-local visuals; durable ownership, construction, economy, and world changes remain SQLite commands. ADR-0009 supersedes only the original HQ target. | Realtime responsiveness must not become durable truth. | **Partially superseded · — Retained through ADR-0009** |
| **ADR-0007 — Desktop web and separate mobile apps**: Treat `apps/web` as the desktop browser world with no supported mobile gameplay contract; future mobile clients are separate apps sharing platform-neutral packages, protocols, and durable APIs rather than UI. | A clear platform boundary avoids compromised desktop play and duplicated mobile-web contracts. | **Locked · — Pending validation** |
| **ADR-0008 — Guild lenses and one Palace Core**: Use one Palace Core across web, world, and arcade; separate canonical Activities from guild CurationEntries; support guild, Joined, and Commons lenses; connect surfaces through one Session while separating durable truth from runtime state. | One domain grammar preserves identity and continuity across projections. | **Locked · — Pending validation** |
| **ADR-0009 — Public realtime Werkstattgasse**: Expose only `worldId: street` as the first unauthenticated Colyseus room with spawn `(0, 3, 30)`; retain ADR-0006 authority/security boundaries, permit at most one bounded human-confirmed ship-module label per session, and keep Palace HQ and Home local. | The current playable district is Werkstattgasse, while unauthenticated public realtime must stay harmless and bounded. | **Locked · — Pending validation** |

## Evolution

After each phase, move genuinely verified active requirements to Validated, keep codebase capability claims separate from product-value validation, record decision outcomes without silently editing locked ADRs, and re-check that the Core Value remains the prioritization test.

---
*Last updated: 2026-07-26 after clean 34-document ingest bootstrap*
