<!-- refreshed: 2026-07-26 -->
# Architecture

**Analysis Date:** 2026-07-26

## System Overview

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│                              User-facing surfaces                             │
├────────────────────────┬────────────────────────┬─────────────────────────────┤
│ Desktop browser        │ Godot desktop client   │ Sandboxed NIP-5D napplets  │
│ `apps/web/`            │ `godot/`               │ `napplets/feed/`            │
│ React + r3f + Rapier   │ typed GDScript         │ `napplets/map/`             │
└───────────┬────────────┴────────────┬───────────┴──────────────┬──────────────┘
            │                         │                          │
            │ shared TS contracts     │ localhost-only optional │ host-injected NAP
            ▼                         ▼                          ▼
┌──────────────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐
│ Shared application kernels   │  │ Suggestion-only      │  │ Napplet adapter  │
│ `packages/shared/`           │  │ world-agent sidecar  │  │ facade           │
│ `packages/multiplayer/`      │  │ `services/world-agent/`│ │ `packages/       │
│ `packages/ownership/`        │  │                       │  │  napplet-kit/`   │
└──────────────┬───────────────┘  └───────────────────────┘  └──────────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         Node truth-tier process                               │
│ `apps/server/src/index.ts`                                                    │
├───────────────────────────┬──────────────────────────┬────────────────────────┤
│ HTTP API / feed proxy     │ Colyseus public Street  │ SQLite audit boundary  │
│ `apps/server/src/app.ts`  │ `apps/server/src/       │ `apps/server/src/db/   │
│                           │  multiplayer/`           │  auditStore.ts`        │
└───────────────┬───────────┴──────────────┬───────────┴────────────┬───────────┘
                │                          │                        │
                ▼                          ▼                        ▼
       Podcast/catalog sources     volatile room state     append-only SQLite
       `apps/server/src/api/`       (not durable truth)     outside the worktree

Immutable/runtime art enters surfaces through `apps/web/public/`, `godot/assets/`, and
`packages/assets-pipeline/`; browser-local state lives in IndexedDB/localStorage under
`apps/web/src/`, while Godot local state lives under `user://` through `godot/scripts/store.gd`.
```

The repository is a multi-surface monorepo. The production-capable browser and Node paths are
TypeScript, the standalone Godot slice is typed GDScript, and the bounded proposal service is Python.
Accepted topology is recorded in `docs/adr/0001-stack-and-runtime-topology.md`; the current Street
realtime boundary is refined by `docs/adr/0006-colyseus-authoritative-realtime-boundary.md` and
`docs/adr/0009-public-realtime-street.md`.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Browser bootstrap | Mount React and enter the frontend state machine | `apps/web/src/main.tsx` |
| Frontend shell | Intro, member gate, menu screens, lazy engine handoff, local character selection | `apps/web/src/frontend/GameFrontend.tsx` |
| 3D world runtime | Street/Home/HQ rendering, Rapier controller, decoration, home building, travel and realtime visuals | `apps/web/src/scene/PalaceScene.tsx` |
| Browser networking | Colyseus lifecycle, Nostr/social/media adapters, retries and render snapshots | `apps/web/src/net/` |
| Browser local truth | Audited IndexedDB writes for character and builder data; local preference/decor stores | `apps/web/src/audit/indexedDbAudit.ts`, `apps/web/src/builder/store.ts`, `apps/web/src/character/store.ts` |
| Node process lifecycle | Open SQLite, start HTTP and Colyseus listeners, coordinate graceful shutdown | `apps/server/src/index.ts` |
| HTTP boundary | Health and podcast routes, CORS, capacity and per-IP controls | `apps/server/src/app.ts`, `apps/server/src/api/podcasts.ts`, `apps/server/src/rateLimit.ts` |
| Realtime authority | Validate joins/movement, own volatile Street presence and live ship modules | `apps/server/src/multiplayer/PalaceRoom.ts`, `apps/server/src/multiplayer/server.ts` |
| Durable audit core | Transactional, append-only, hash-linked SQLite streams with verification/export | `apps/server/src/db/auditStore.ts` |
| Shared domain model | Platform-neutral character, JSON and Palace Activity/Session/Guild contracts | `packages/shared/src/` |
| Shared realtime protocol | Colyseus schemas, message names, bounds and exact parsers used by web and server | `packages/multiplayer/src/index.ts` |
| Ownership verifier | Canonical JSON, BIP-340 signatures and per-asset branch verification; implemented but not wired into apps | `packages/ownership/src/index.ts` |
| Entity identity | Deterministic server-side Nostr entity-key derivation; implemented as an isolated package | `packages/identity/src/index.ts` |
| Napplet compatibility layer | Guarded NAP-domain access, fail-soft boot, DOM and theme helpers | `packages/napplet-kit/src/` |
| Napplet surfaces | Independently built NIP-5D feed and world-map artifacts | `napplets/feed/src/main.ts`, `napplets/map/src/main.ts` |
| Godot client | Code-first standalone homebuilder/social-world/Meaningverse slice with local JSON state | `godot/scripts/main.gd`, `godot/scripts/game.gd` |
| World-agent | Stateless proposals plus a localhost-only, capability-bounded Kerni template selector | `services/world-agent/src/world_agent/agent.py`, `services/world-agent/src/world_agent/server.py` |
| Asset production | Blender and Node/Python scripts that turn source art into runtime GLB/VRM/data | `packages/assets-pipeline/`, `tooling/`, `assets-incoming/` |

## Pattern Overview

**Overall:** Multi-surface modular monorepo with shared kernels, explicit adapter boundaries, local-first
clients, and a single-process Node truth tier.

**Key Characteristics:**
- Use shared protocol/domain packages in `packages/shared/`, `packages/multiplayer/`, and
  `packages/ownership/` so a transport or surface does not invent its own wire contract.
- Keep durable application decisions in the audit/state-machine boundary under `apps/server/src/db/`,
  `apps/server/src/eventlog/`, and `apps/server/src/statemachine/`; keep Colyseus state in
  `apps/server/src/multiplayer/` explicitly volatile.
- Treat integrations as ports: browser adapters live in `apps/web/src/net/`, future truth-tier adapters
  are reserved under `apps/server/src/adapters/`, Godot mocks live in `godot/scripts/net/`, and napplets
  use only `packages/napplet-kit/` wrappers around host-provided NAP domains.
- Keep art immutable in `apps/web/public/`, `godot/assets/`, and `assets-incoming/`; represent placement,
  growth and ownership as serializable data in `apps/web/src/builder/`, `apps/web/src/scene/decorStore.ts`,
  and `godot/scripts/store.gd`.
- Keep the Python boundary suggestion-only: `services/world-agent/src/world_agent/kerni.py` can select
  from app-owned template IDs but cannot receive a game-state mutation capability.

## Layers

**Presentation and Interaction:**
- Purpose: Render menus, social surfaces, 3D worlds, HUDs and standalone embedded experiences.
- Location: `apps/web/src/frontend/`, `apps/web/src/ui/`, `apps/web/src/scene/`, `godot/scripts/ui/`,
  `godot/scripts/world/`, `napplets/*/src/`.
- Contains: React components, r3f scene nodes, Godot Nodes/CanvasLayers, and DOM-only napplet views.
- Depends on: Browser/Godot state, shared contracts, networking facades and immutable assets in
  `packages/`, `apps/web/public/`, and `godot/assets/`.
- Used by: End users through `apps/web/src/main.tsx`, `godot/scenes/Main.tscn`, and napplet `index.html`
  entry points under `napplets/`.

**Client Application State:**
- Purpose: Coordinate UI modes and persist client-owned data/preferences.
- Location: `apps/web/src/frontend/GameFrontend.tsx`, `apps/web/src/builder/`,
  `apps/web/src/character/`, `apps/web/src/audit/`, `godot/scripts/game.gd`,
  `godot/scripts/economy.gd`, `godot/scripts/store.gd`.
- Contains: React state, module-level builder stores, IndexedDB audit streams, localStorage preferences,
  Godot autoloads and `user://` JSON persistence.
- Depends on: Pure types/helpers in `packages/shared/` and browser/Godot storage APIs.
- Used by: Presentation code in `apps/web/src/scene/`, `apps/web/src/ui/`, and `godot/scripts/ui/`.

**Transport and Integration:**
- Purpose: Isolate network protocols and external providers from view and truth logic.
- Location: `apps/web/src/net/`, `apps/server/src/api/`, `apps/server/src/multiplayer/`,
  `apps/server/src/adapters/`, `godot/scripts/net/`, `packages/napplet-kit/src/nap.ts`.
- Contains: Colyseus transport, Nostr/social clients, hardened podcast fetching, mock Godot transports,
  exact NAP-domain wrappers, and reserved Boltz/LNbits/Nostr truth-tier seams.
- Depends on: Shared schemas in `packages/multiplayer/`, provider SDKs, HTTP/WebSocket and shell APIs.
- Used by: `apps/web/src/scene/PalaceScene.tsx`, `apps/web/src/frontend/GameFrontend.tsx`,
  `apps/server/src/app.ts`, Godot UI modules, and `napplets/*/src/main.ts`.

**Shared Domain and Protocol Kernel:**
- Purpose: Keep wire formats and deterministic verification independent of any UI or deployment.
- Location: `packages/shared/src/`, `packages/multiplayer/src/`, `packages/ownership/src/`,
  `packages/identity/src/`.
- Contains: JSON/domain types, Activity/Session/Guild contracts, Colyseus schemas and exact input parsers,
  signed ownership verification, and entity-key derivation.
- Depends on: Pure TypeScript plus cryptographic/schema libraries declared in each `packages/*/package.json`.
- Used by: Currently `apps/web/` and `apps/server/` consume shared/multiplayer; ownership and identity are
  consumed by their package tests until authenticated command paths are wired, as documented in
  `apps/server/README.md` and `apps/web/README.md`.

**Truth and Persistence:**
- Purpose: Own durable, replayable application decisions.
- Location: Implemented audit core in `apps/server/src/db/auditStore.ts`; reserved slices in
  `apps/server/src/eventlog/`, `apps/server/src/statemachine/`, and `apps/server/src/worker/`.
- Contains: SQLite migrations, append-only triggers, compare-and-swap stream appends, verification and
  deterministic exports.
- Depends on: `better-sqlite3` and canonical JSON from `apps/server/src/db/canonicalJson.ts`.
- Used by: Opened by `apps/server/src/index.ts`; no unauthenticated HTTP mutation route exists in
  `apps/server/src/app.ts`.

**Asset and Content Pipeline:**
- Purpose: Produce immutable runtime geometry, textures, growth manifests and previews.
- Location: `packages/assets-pipeline/blender/`, `packages/assets-pipeline/avatar/`,
  `packages/assets-pipeline/props/`, `tooling/blender/`, `tooling/scripts/`, `assets-incoming/`, `art/`.
- Contains: Blender automation, model cleanup/retargeting, prop acquisition manifests, authored source
  files and staged GLBs.
- Depends on: Blender/Python and Node scripts; the package CLI in `packages/assets-pipeline/src/cli.ts`
  remains a stub while the concrete pipeline is script-driven.
- Used by: Runtime assets under `apps/web/public/` and `godot/assets/`.

**Suggestion-only Agent:**
- Purpose: Produce non-binding proposals and choose one app-approved dialogue template.
- Location: `services/world-agent/src/world_agent/`.
- Contains: Frozen proposal records, exact request/response schemas, deterministic and Hermes-backed
  selectors, and a loopback HTTP server.
- Depends on: Python standard library; optional local Hermes subprocess in
  `services/world-agent/src/world_agent/kerni.py`.
- Used by: Optional Godot client `godot/scripts/moc/kerni_live_client.gd`; deterministic fallback remains
  in the Godot/app-owned path described by `godot/ARCHITECTURE.md`.

## Data Flow

### Browser Boot and Surface Handoff

1. `apps/web/src/main.tsx:5` locates `#root`, and `apps/web/src/main.tsx:8` mounts `App` under React
   `StrictMode`.
2. `apps/web/src/App.tsx:3` delegates to `GameFrontend`; `apps/web/src/frontend/GameFrontend.tsx:1701`
   sequences Start → intro → member selection → menu screens.
3. `apps/web/src/frontend/GameFrontend.tsx:1793` lazy-loads the 3D runtime when an engine target is set;
   `apps/web/src/scene/PalaceScene.tsx:655` owns active world and mode state.
4. `apps/web/src/scene/PalaceScene.tsx:1045` renders Canvas/physics/world/HUD; local placement and builder
   state are written through `apps/web/src/scene/decorStore.ts` and `apps/web/src/builder/store.ts`.

### Public Street Multiplayer

1. Entering Street creates `PalaceMultiplayerTransport` in `apps/web/src/scene/PalaceScene.tsx:694`; join
   options are validated by `packages/multiplayer/src/index.ts:175`.
2. `apps/web/src/net/multiplayer.ts:413` opens a Colyseus room and observes authoritative schema state;
   local movement is parsed and sent at a 10 Hz gate in `apps/web/src/net/multiplayer.ts:420`.
3. `apps/server/src/multiplayer/PalaceRoom.ts:77` validates origin/join data, and
   `apps/server/src/multiplayer/PalaceRoom.ts:169` applies sequence, rate and distance budgets before
   mutating room state.
4. Replicated presence and ship modules return through `packages/multiplayer/src/index.ts:114`; the web
   copies them into render snapshots in `apps/web/src/net/multiplayer.ts:231` and renders them in
   `apps/web/src/scene/PalaceScene.tsx:619`.
5. Room state is discarded on disposal by `apps/server/src/multiplayer/PalaceRoom.ts:165`; it never
   enters `apps/server/src/db/auditStore.ts`.

### Audited Browser Builder Write

1. Builder/economy code produces a serializable snapshot in `apps/web/src/builder/` and calls
   `saveState` (`apps/web/src/builder/store.ts:126`) or `saveHome` (`apps/web/src/builder/store.ts:140`).
2. `apps/web/src/builder/store.ts:86` (`writeAuditedKey`) serializes writes per stream, opens IndexedDB
   and calls `commitAuditedWrite`.
3. `apps/web/src/audit/indexedDbAudit.ts:143` compares the stream head, writes application data, appends
   the hash-linked event and updates the head in one IndexedDB transaction.
4. `apps/web/src/audit/indexedDbAudit.ts:193` reads ordered streams for local verification/export.

### Server HTTP Request Path

1. `apps/server/src/index.ts:9` loads validated settings, opens `AuditStore`, creates the HTTP server and
   starts the separate Colyseus listener.
2. `apps/server/src/app.ts:193` applies common headers, exact-origin CORS and method/path routing.
3. `/api/podcasts/search` delegates to `apps/server/src/api/podcasts.ts:126`; `/api/podcasts/feed`
   applies token/concurrency limits in `apps/server/src/app.ts:243` before the SSRF-resistant fetch in
   `apps/server/src/api/podcasts.ts:174`.
4. Responses are bounded JSON/XML from `sendJson` (`apps/server/src/app.ts:424`) or structured
   `{ error: { code, message } }` bodies from `sendError` (`apps/server/src/app.ts:429`); graceful
   shutdown drains HTTP and multiplayer before closing SQLite in `apps/server/src/index.ts:70`.

### Durable Server Audit Path

1. Internal application code supplies the expected revision and previous hash to
   `AuditStore.append` in `apps/server/src/db/auditStore.ts:243`.
2. `apps/server/src/db/auditStore.ts:246` performs a compare-and-swap append in one immediate SQLite
   transaction; database triggers defined in `apps/server/src/db/auditStore.ts:41` prohibit update/delete.
3. `apps/server/src/db/auditStore.ts:371` verifies revision, linkage, canonical payload, content hash and
   materialized head before `apps/server/src/db/auditStore.ts:379` permits export.
4. The store is internal only (`apps/server/src/db/auditStore.ts:215`); `apps/server/src/app.ts` exposes no
   durable mutation route.

### Godot Application Flow

1. Godot starts `godot/scenes/Main.tscn` from `run/main_scene` in `godot/project.godot:9` and autoloads
   Catalog, Economy, Store and Game from `godot/project.godot:14`.
2. `godot/scripts/main.gd:34` constructs UI modules in code and subscribes to `Game.space_changed`;
   `godot/scripts/main.gd:248` swaps Home/Palace world nodes.
3. `godot/scripts/game.gd:40` registers all controls and `godot/scripts/game.gd:44` owns menu/world/mode
   transitions; world/build scripts consume the autoload contracts.
4. `godot/scripts/store.gd` persists home/economy/palace JSON under `user://`; the Godot slice is not a
   Colyseus client, as recorded in `infra/HOSTING.md`.
5. With explicit live mode, `godot/scripts/moc/kerni_live_client.gd` posts a bounded capability to the
   loopback endpoint in `services/world-agent/src/world_agent/server.py:50`; the response can select
   presentation but cannot transition application state.

### Napplet Boot and Host Interaction

1. Each napplet entry (`napplets/feed/src/main.ts:164`, `napplets/map/src/main.ts:251`) calls `boot` from
   `packages/napplet-kit/src/boot.ts:30`.
2. `boot` applies shell theme, verifies hard domain requirements and catches render failures in
   `packages/napplet-kit/src/boot.ts:31`.
3. Napplet code accesses Nostr/resources/storage/links only through fail-soft wrappers in
   `packages/napplet-kit/src/nap.ts`; the host retains relay, identity and navigation policy.
4. `napplets/feed/src/main.ts:141` performs a one-shot outbox query then subscribes; the map remains
   functional without injected domains and delegates external navigation at `napplets/map/src/main.ts:211`.

**State Management:**
- React-local routing/mode state is concentrated in `apps/web/src/frontend/GameFrontend.tsx` and
  `apps/web/src/scene/PalaceScene.tsx`; pure gameplay state lives under `apps/web/src/builder/` and
  `apps/web/src/meaningverse/`.
- Browser durable/local state is split deliberately among audited IndexedDB (`apps/web/src/builder/store.ts`,
  `apps/web/src/character/store.ts`) and preferences/decor in localStorage (`apps/web/src/frontend/feedTabs.ts`,
  `apps/web/src/scene/decorStore.ts`).
- Realtime state is ephemeral Colyseus schema state in `packages/multiplayer/src/index.ts` owned by
  `apps/server/src/multiplayer/PalaceRoom.ts`.
- Server durable state is append-only SQLite in `apps/server/src/db/auditStore.ts`, with the default file
  resolved outside the repository.
- Godot state is autoload singleton state plus `user://` JSON through `godot/scripts/store.gd`; the Python
  service in `services/world-agent/src/world_agent/` is request-local/stateless.

## Key Abstractions

**Engine Target and Surface State:**
- Purpose: Select the web shell screen and the active 3D world without a URL router.
- Examples: `apps/web/src/frontend/types.ts`, `apps/web/src/frontend/GameFrontend.tsx`,
  `apps/web/src/scene/PalaceScene.tsx`.
- Pattern: React state machine plus lazy surface loading.

**Shared Realtime Contract:**
- Purpose: Keep room schema, protocol version, bounds and payload validation identical on both sides.
- Examples: `packages/multiplayer/src/index.ts`, `apps/web/src/net/multiplayer.ts`,
  `apps/server/src/multiplayer/PalaceRoom.ts`.
- Pattern: Shared schema package with exact-record parsers and server-authoritative mutation.

**Append-only Audit Stream:**
- Purpose: Record deterministic application decisions as ordered hash chains.
- Examples: `apps/server/src/db/auditStore.ts`, `apps/web/src/audit/indexedDbAudit.ts`.
- Pattern: Materialized stream head plus compare-and-swap append and independent verification.

**Ownership Branch:**
- Purpose: Verify BIP-340 signed, per-asset ownership transfers without trusting relay ordering.
- Examples: `packages/ownership/src/index.ts`, `packages/ownership/test/ownership.test.mjs`.
- Pattern: Canonical JSON, domain-separated hashes and previous-owner signatures; package is currently
  isolated from `apps/web/` and `apps/server/`.

**Activity → Session → Surface:**
- Purpose: Share canonical social/activity identity across web, world and arcade projections.
- Examples: `packages/shared/src/palace.ts`, `docs/adr/0008-guild-lenses-and-palace-core.md`.
- Pattern: Platform-neutral domain records with ephemeral runtime presence kept separate from durable
  session decisions.

**Godot Autoload Core:**
- Purpose: Share catalog, economy, persistence and app-flow services across code-created scenes.
- Examples: `godot/scripts/catalog.gd`, `godot/scripts/economy.gd`, `godot/scripts/store.gd`,
  `godot/scripts/game.gd`.
- Pattern: Four autoloaded Nodes configured in `godot/project.godot`; all other nodes are instantiated
  from scripts by `godot/scripts/main.gd`.

**NAP Domain Facade:**
- Purpose: Make independent napplets portable across shells with incomplete/missing optional domains.
- Examples: `packages/napplet-kit/src/boot.ts`, `packages/napplet-kit/src/nap.ts`.
- Pattern: Capability detection plus null-ish/fail-soft wrappers; shell owns privileged operations.

**Kerni Template Capability:**
- Purpose: Let an external selector choose only from phase-owned dialogue IDs.
- Examples: `services/world-agent/src/world_agent/kerni.py`,
  `godot/scripts/moc/kerni_live_client.gd`, `godot/scripts/moc/kerni_world_agent.gd`.
- Pattern: Exact schema, short-lived request ID, allowlist equality and deterministic fail-closed fallback.

## Entry Points

**Desktop Web:**
- Location: `apps/web/index.html` → `apps/web/src/main.tsx`.
- Triggers: Vite development server or a built static deployment.
- Responsibilities: Mount the React shell, gate intro/member selection and lazy-load the 3D engine.

**Node Production Server:**
- Location: `apps/server/src/index.ts`.
- Triggers: `node dist/index.js` via `apps/server/package.json`.
- Responsibilities: Open SQLite, start HTTP and Colyseus listeners, install shutdown handlers.

**Node Development Server:**
- Location: `apps/server/src/dev.ts`.
- Triggers: `tsx watch src/dev.ts` via `apps/server/package.json`.
- Responsibilities: Supply local-development defaults before loading the production lifecycle.

**Godot Client:**
- Location: `godot/project.godot` → `godot/scenes/Main.tscn` → `godot/scripts/main.gd`.
- Triggers: Godot editor/export or command-line flags handled by `godot/scripts/main.gd`.
- Responsibilities: Construct UI/world nodes, route smoke/capture/release modes and swap local worlds.

**World-agent Sidecar:**
- Location: `services/world-agent/src/world_agent/server.py`.
- Triggers: `kerni-sidecar` from `services/world-agent/pyproject.toml`.
- Responsibilities: Bind only `127.0.0.1`, validate one exact capability endpoint and select/fallback.

**Napplets:**
- Location: `napplets/feed/src/main.ts`, `napplets/map/src/main.ts`.
- Triggers: Their independent Vite `index.html` files inside a NIP-5D shell.
- Responsibilities: Render one focused surface and delegate privileged operations to injected NAP domains.

**Asset Pipeline:**
- Location: `packages/assets-pipeline/src/cli.ts`, concrete scripts in
  `packages/assets-pipeline/blender/`, `packages/assets-pipeline/avatar/`, and `tooling/`.
- Triggers: pnpm/Node, Blender background Python or direct Python commands documented in
  `packages/assets-pipeline/HANDOFF.md`.
- Responsibilities: Produce optimized, content-addressable runtime assets and data manifests.

## Architectural Constraints

- **Truth ownership:** Durable ownership, economy and world decisions must pass through the application
  boundary under `apps/server/src/db/`, `apps/server/src/statemachine/`, and `apps/server/src/eventlog/`;
  `apps/server/src/multiplayer/` and `apps/web/src/net/` cannot finalize them.
- **Shared verification:** Add authenticated ownership flows by importing `packages/ownership/` from both
  `apps/web/` and `apps/server/`; do not fork its hashing/signature logic. The imports are not wired yet,
  as stated in `apps/server/README.md`.
- **Threading:** Browser code in `apps/web/src/` runs on the main event loop plus Web APIs; the Node HTTP
  layer in `apps/server/src/app.ts` is asynchronous while `better-sqlite3` in
  `apps/server/src/db/auditStore.ts` is synchronous; `services/world-agent/src/world_agent/server.py`
  uses `ThreadingHTTPServer` but is stateless.
- **Global state:** Module-level/singleton state exists in `apps/web/src/builder/buildState.ts`, Nostr
  setup under `apps/web/src/net/nostr.ts`, Colyseus static room admission in
  `apps/server/src/multiplayer/PalaceRoom.ts`, and Godot autoloads declared by `godot/project.godot`.
- **Circular imports:** No circular chain was detected in sampled imports under `apps/`, `packages/`,
  `services/`, and `godot/`; preserve dependency direction from surfaces/adapters toward `packages/`.
- **Realtime durability:** `packages/multiplayer/src/index.ts` carries only public presence and ship-module
  schema; private homes and ownership data must not be added to this unauthenticated room.
- **Godot isolation:** `godot/` is a standalone client and currently does not consume Colyseus; shared
  product semantics are documented, not linked through a common runtime package.
- **Code-first Godot:** Keep `godot/scenes/Main.tscn` as the only scene file and instantiate modules from
  `godot/scripts/`, per `godot/ARCHITECTURE.md`.
- **Static art:** Runtime GLB/VRM geometry stays immutable under `apps/web/public/` and `godot/assets/`;
  mutable growth/placement remains data under `apps/web/src/` and `godot/scripts/store.gd`.
- **Desktop-only web:** Do not add mobile-game controls to `apps/web/`; future mobile clients receive
  their own app and share only contracts from `packages/`, per `docs/adr/0007-desktop-web-and-separate-mobile-apps.md`.
- **One-process current server:** `apps/server/src/index.ts` owns one HTTP listener, one dedicated Colyseus
  listener and one SQLite handle; multi-process room scaling requires a shared driver/presence and is not
  present in `apps/server/`.

## Anti-Patterns

### Adding Durable State to the Public Colyseus Room

**What happens:** It is tempting to extend live ship modules in `apps/server/src/multiplayer/PalaceRoom.ts`
into ownership, inventory or construction records because the schema already reaches every client.
**Why it's wrong:** Room disposal deliberately destroys state, session handles are unauthenticated, and
`docs/adr/0009-public-realtime-street.md` defines the room as volatile presentation only.
**Do this instead:** Submit durable commands to the audited truth boundary in `apps/server/src/db/` and
replicate only bounded projections through `packages/multiplayer/src/index.ts`.

### Reimplementing Ownership Verification in a Surface

**What happens:** The production ownership package exists at `packages/ownership/src/index.ts`, but neither
`apps/web/package.json` nor `apps/server/package.json` currently consumes it, making local one-off verification
code an easy shortcut.
**Why it's wrong:** Separate signing/canonicalization implementations can disagree and recreate relay-order
trust, violating `CLAUDE.md` and `docs/adr/0001-stack-and-runtime-topology.md`.
**Do this instead:** Wire `@600b/ownership` into both app manifests and call the same `verifyBranch` API from
`packages/ownership/src/index.ts`.

### Growing the Two Web Root Components Further

**What happens:** Screen orchestration and most menu surfaces are concentrated in the 1,826-line
`apps/web/src/frontend/GameFrontend.tsx`; world modes, physics, multiplayer and HUD orchestration are
concentrated in the 1,434-line `apps/web/src/scene/PalaceScene.tsx`.
**Why it's wrong:** More unrelated state/effects in these roots increases stale-closure, input-priority and
mount/unmount coupling across otherwise separate features.
**Do this instead:** Add pure domain logic under `apps/web/src/builder/`, `apps/web/src/meaningverse/` or
`apps/web/src/net/`, and extract focused view components into `apps/web/src/frontend/`,
`apps/web/src/scene/`, or `apps/web/src/ui/`; leave roots as composition/state boundaries.

### Baking Mutable State into Runtime Models

**What happens:** Growth, placement or ownership can be encoded into replacement GLBs under
`apps/web/public/` or `godot/assets/`.
**Why it's wrong:** It destroys deterministic replay and content-addressability and conflicts with
`assets-incoming/README.md` and `BUILD-BRIEF.md`.
**Do this instead:** Keep full static geometry plus growth manifests in `assets-incoming/` and apply
progress/state in `apps/web/src/scene/GrowableObject.tsx`, `apps/web/src/scene/loadGrowable.ts`, or the
corresponding data-driven Godot scripts.

### Calling Privileged Napplet APIs Directly

**What happens:** A napplet under `napplets/` can import raw SDK domains or navigate/fetch outside the
shell policy instead of using `packages/napplet-kit/`.
**Why it's wrong:** Missing or partially injected domains then become runtime failures, and the napplet
escapes the host-owned security/relay/navigation boundary.
**Do this instead:** Use `boot`, `query`, `bytes`, `openLink`, `read`, and `write` from
`packages/napplet-kit/src/` and render a degraded state when a capability is absent.

## Error Handling

**Strategy:** Validate at every trust boundary, fail closed for authority-sensitive operations, and degrade
non-critical client experiences without crashing the surface.

**Patterns:**
- Browser storage adapters in `apps/web/src/builder/store.ts`, `apps/web/src/character/store.ts`, and
  `apps/web/src/scene/decorStore.ts` catch unavailable/quota/corrupt-state failures and continue with
  defaults; protocol payloads in `apps/web/src/net/multiplayer.ts` are parsed before application.
- Server config and inputs in `apps/server/src/app.ts`, `apps/server/src/api/podcasts.ts`,
  `apps/server/src/multiplayer/httpGuard.ts`, and `apps/server/src/multiplayer/PalaceRoom.ts` are bounded
  before resource acquisition or mutation; client-facing failures use structured status/code/message data.
- Integrity failures in `apps/server/src/db/auditStore.ts` use typed `AuditConflictError`,
  `AuditInputError`, and `AuditIntegrityError`; export refuses invalid streams rather than repairing them.
- `packages/napplet-kit/src/boot.ts` catches sync/async render failures and
  `packages/napplet-kit/src/nap.ts` turns absent optional domains into null-ish results.
- `services/world-agent/src/world_agent/kerni.py` rejects exact-schema violations and falls back to the
  first canonical template on selector failure; `services/world-agent/src/world_agent/server.py` binds
  loopback only and returns bounded JSON errors.
- Godot UI/network seams in `godot/scripts/net/` and `godot/scripts/ui/media_player.gd` are mock/offline
  tolerant; `godot/scripts/main.gd` exposes explicit smoke/capture exit codes for verification paths.

## Cross-Cutting Concerns

**Logging:** Node lifecycle logs write explicit startup/shutdown failures in `apps/server/src/index.ts`;
Python uses `logging` in `services/world-agent/src/world_agent/`; Godot operational/capture paths use
`print`/`push_error` in `godot/scripts/main.gd`; browser modules avoid a central logger in `apps/web/src/`.

**Validation:** Exact parsers in `packages/multiplayer/src/index.ts`, canonical encoders in
`packages/shared/src/json.ts`, `packages/ownership/src/index.ts`, and `apps/server/src/db/canonicalJson.ts`,
plus request bounds in `apps/server/src/app.ts` and `apps/server/src/multiplayer/httpGuard.ts`, form the
main validation boundary.

**Authentication:** Public Street admission in `apps/server/src/multiplayer/PalaceRoom.ts` validates only
origin and bounded display options; it is not identity. Browser demo signing in
`apps/web/src/identity/keyStore.ts` is development-only and safe-off. Production NIP-07/NIP-46 and signed
truth-tier commands are not wired; server entity derivation remains isolated in `packages/identity/`.

**Security:** Exact origin allowlists, SSRF-resistant feed fetching, bounded request bodies/concurrency,
SQLite append-only triggers, protocol exactness and localhost-only agent binding are implemented in
`apps/server/src/`, `packages/multiplayer/`, and `services/world-agent/`. Secret-bearing `.env` files are
excluded by `.gitignore`; only `.env.example` files exist under `apps/web/` and `apps/server/`.

**Performance:** 3D detail/physics boundaries live in `apps/web/src/scene/PalaceScene.tsx`; remote detailed
avatars are capped, scenery is kept outside physics where possible, and immutable assets are organized under
`apps/web/public/`. Godot selects GL Compatibility in `godot/project.godot`; asset budgets and optimization
flows are documented in `packages/assets-pipeline/HANDOFF.md`.

---

*Architecture analysis: 2026-07-26*
