# Codebase Structure

**Analysis Date:** 2026-07-26

## Directory Layout

```text
PalaceOfCulture/
├── apps/
│   ├── web/                      # Desktop React/r3f browser client
│   │   ├── public/               # Runtime GLB/VRM/media/map assets
│   │   ├── src/
│   │   │   ├── audit/            # Browser hash-linked IndexedDB audit support
│   │   │   ├── builder/          # Local-first building/economy domain and persistence
│   │   │   ├── character/        # Character repository and device persistence
│   │   │   ├── config/           # Runtime safety gates
│   │   │   ├── frontend/         # Menu/screen shell and web surface data
│   │   │   ├── identity/         # Browser identity/entity helpers
│   │   │   ├── meaningverse/     # Tutorial/raid/ship domain logic
│   │   │   ├── net/              # Colyseus, Nostr, chat, voice, feeds and media adapters
│   │   │   ├── scene/            # r3f/Rapier world, assets and homebuilder views
│   │   │   ├── types/            # Ambient TypeScript declarations
│   │   │   └── ui/               # Reusable HUD/panel components
│   │   └── tests/                # Node/tsx web unit and smoke tests
│   └── server/                   # Node truth-tier process
│       ├── src/
│       │   ├── adapters/         # Reserved Boltz/LNbits/Nostr adapters
│       │   ├── api/              # HTTP provider-facing logic
│       │   ├── db/               # SQLite audit store and canonical JSON
│       │   ├── eventlog/         # Reserved durable event-log modules
│       │   ├── multiplayer/      # Colyseus listener, room and HTTP guard
│       │   ├── rooms/            # Reserved non-current room modules
│       │   ├── statemachine/     # Reserved durable transition logic
│       │   └── worker/           # Reserved reconcile/background jobs
│       └── test/                 # Node server tests
├── packages/
│   ├── shared/                   # Platform-neutral domain types and canonical JSON
│   ├── multiplayer/              # Shared Colyseus schema and strict wire parsers
│   ├── ownership/                # BIP-340 ownership branch verifier
│   ├── identity/                 # Server-side deterministic Nostr entity identities
│   ├── napplet-kit/              # NIP-5D shell/DOM/theme capability facade
│   └── assets-pipeline/          # Blender/Node/Python asset production scripts
├── services/
│   └── world-agent/              # Python suggestion-only proposal/Kerni sidecar
├── godot/
│   ├── assets/                   # Imported runtime art/fonts/world data
│   ├── scenes/                   # Single Main.tscn root
│   ├── scripts/                  # Code-first gameplay, UI, net and Meaningverse modules
│   └── tests/                    # Headless GDScript smoke path
├── napplets/
│   ├── feed/                     # Independent NIP-5D feed artifact
│   ├── map/                      # Independent NIP-5D map artifact
│   └── tools/                    # Local napplet authoring/serve/publish harnesses
├── docs/
│   ├── adr/                      # Accepted architecture decision records
│   ├── design/                   # Product/gameplay design records
│   ├── communications/           # Publication artwork
│   ├── assets/                   # Asset-generation notes
│   └── prototypes/               # Standalone interface prototypes
├── infra/                        # Hosting/topology/playtest documentation
├── assets-incoming/              # Staged immutable GLBs + growth manifests/previews
├── art/                          # Blender source files
├── tooling/                      # Cross-workspace Blender/dev/video scripts
├── 600BillionCWO/                # Branding/lore/member-system source material
├── viewers/                      # Viewer documentation placeholder
├── .github/workflows/            # CI workflow
├── .planning/codebase/           # Generated repository maps (these documents)
├── package.json                  # pnpm workspace commands
├── pnpm-workspace.yaml           # Workspace membership
├── tsconfig.base.json            # Shared TypeScript compiler baseline
├── biome.json                    # TypeScript formatting/lint configuration
├── BUILD-BRIEF.md                # Implementation-oriented product architecture
├── CLAUDE.md                     # Project invariants and contributor constraints
└── README.md                     # Repository overview and quick start
```

## Directory Purposes

**`apps/web/`:**
- Purpose: Ship the desktop browser surface and playable Three.js world.
- Contains: Vite entry files, React/r3f source, static runtime assets and `tsx` tests.
- Key files: `apps/web/src/main.tsx`, `apps/web/src/frontend/GameFrontend.tsx`,
  `apps/web/src/scene/PalaceScene.tsx`, `apps/web/package.json`, `apps/web/vite.config.ts`.

**`apps/web/src/frontend/`:**
- Purpose: Own the website-shaped menu shell, screen routing, intro handoff and frontend-only data.
- Contains: `GameFrontend.tsx`, screen types/data, onboarding, feed-tab and map-search helpers, CSS.
- Key files: `apps/web/src/frontend/GameFrontend.tsx`, `apps/web/src/frontend/types.ts`,
  `apps/web/src/frontend/frontend.css`, `apps/web/src/frontend/onboarding.ts`.

**`apps/web/src/scene/`:**
- Purpose: Own r3f/Rapier world composition, scene assets, controllers, interactables and rendering data.
- Contains: World root, Street/Home/HQ components, avatar loaders, growables, furniture/decor catalogs,
  deterministic layout helpers and `homebuilder/` components.
- Key files: `apps/web/src/scene/PalaceScene.tsx`, `apps/web/src/scene/StreetWorld.tsx`,
  `apps/web/src/scene/homebuilder/BuilderWorld.tsx`, `apps/web/src/scene/GrowableObject.tsx`,
  `apps/web/src/scene/furnitureCatalog.ts`.

**`apps/web/src/ui/`:**
- Purpose: Hold reusable overlay/panel/HUD components that consume domain state but do not own protocols.
- Contains: Builder, chat, culture, decoration, Meaningverse, media, member and workshop UI.
- Key files: `apps/web/src/ui/BuilderHud.tsx`, `apps/web/src/ui/MeaningPath.tsx`,
  `apps/web/src/ui/MemberSelect.tsx`, `apps/web/src/ui/MediaPlayer.tsx`.

**`apps/web/src/net/`:**
- Purpose: Isolate browser network protocols and provider-specific read/write logic.
- Contains: Colyseus transport, Nostr setup/social feeds, chat/voice abstractions, market/lightning/media
  clients and quality filters.
- Key files: `apps/web/src/net/multiplayer.ts`, `apps/web/src/net/nostr.ts`,
  `apps/web/src/net/social.ts`, `apps/web/src/net/chat.ts`, `apps/web/src/net/media.ts`.

**`apps/web/src/builder/`:**
- Purpose: Implement the local-first Home building/economy model independently of r3f presentation.
- Contains: Catalog, economy, habitats, mutable build system state and audited IndexedDB persistence.
- Key files: `apps/web/src/builder/buildState.ts`, `apps/web/src/builder/economy.ts`,
  `apps/web/src/builder/store.ts`, `apps/web/src/builder/habitats.ts`.

**`apps/web/src/audit/` and `apps/web/src/character/`:**
- Purpose: Provide browser-side audited persistence and the character repository.
- Contains: IndexedDB schema/transactions/hash-chain verification and character migration/persistence.
- Key files: `apps/web/src/audit/indexedDbAudit.ts`, `apps/web/src/character/store.ts`.

**`apps/web/src/meaningverse/`:**
- Purpose: Keep Meaningverse tutorial/raid/ship rules pure and testable outside view components.
- Contains: First-raid checkpoints, intro/tutorial stages, Nostr draft builders and placement diffs.
- Key files: `apps/web/src/meaningverse/model.ts`, `apps/web/src/meaningverse/firstRaid.ts`,
  `apps/web/src/meaningverse/onboardingStory.ts`.

**`apps/server/`:**
- Purpose: Run the current Node truth-tier process and hardened public network boundaries.
- Contains: HTTP API/feed proxy, SQLite audit core, Colyseus Street room and tests; several `.gitkeep`
  directories reserve future adapters/state machine/event log/worker code.
- Key files: `apps/server/src/index.ts`, `apps/server/src/app.ts`,
  `apps/server/src/db/auditStore.ts`, `apps/server/src/multiplayer/PalaceRoom.ts`,
  `apps/server/src/multiplayer/server.ts`.

**`apps/server/src/api/`:**
- Purpose: Implement provider-facing HTTP operations behind route handling in `apps/server/src/app.ts`.
- Contains: Current Apple podcast catalog search and bounded, DNS-pinned RSS fetching.
- Key files: `apps/server/src/api/podcasts.ts`, `apps/server/src/app.ts`.

**`apps/server/src/db/`:**
- Purpose: Own SQLite schema, append-only audit streams and server-specific canonical encoding.
- Contains: Migration SQL embedded in TypeScript, store API, verification/export and JSON adapter.
- Key files: `apps/server/src/db/auditStore.ts`, `apps/server/src/db/canonicalJson.ts`.

**`apps/server/src/multiplayer/`:**
- Purpose: Own the dedicated Colyseus listener and volatile public Street authority.
- Contains: Room lifecycle/movement rules, matchmaking HTTP guard and listener configuration.
- Key files: `apps/server/src/multiplayer/PalaceRoom.ts`,
  `apps/server/src/multiplayer/httpGuard.ts`, `apps/server/src/multiplayer/server.ts`.

**`packages/shared/`:**
- Purpose: Supply side-effect-free platform-neutral domain contracts and canonical JSON.
- Contains: Character/avatar records, JSON value encoding, Palace Activity/Session/Guild contracts.
- Key files: `packages/shared/src/index.ts`, `packages/shared/src/character.ts`,
  `packages/shared/src/json.ts`, `packages/shared/src/palace.ts`.

**`packages/multiplayer/`:**
- Purpose: Keep Colyseus schema, protocol version, message names and exact validators shared by web/server.
- Contains: One public Street room schema plus join/movement/correction/ship-module parsers.
- Key files: `packages/multiplayer/src/index.ts`, `packages/multiplayer/test/package.test.mjs`.

**`packages/ownership/`:**
- Purpose: Provide the one platform-neutral signed ownership branch verifier.
- Contains: Canonical signing/event hashing, BIP-340 verification and deterministic failure codes.
- Key files: `packages/ownership/src/index.ts`, `packages/ownership/test/ownership.test.mjs`,
  `packages/ownership/README.md`.

**`packages/identity/`:**
- Purpose: Derive recoverable server-side Nostr identities for canonical entities from caller-supplied seed.
- Contains: Entity ID types, HMAC derivation and public npub projection.
- Key files: `packages/identity/src/index.ts`, `packages/identity/test/package.test.mjs`.

**`packages/napplet-kit/`:**
- Purpose: Standardize portable napplet boot, guarded host capabilities, theming, DOM and formatting.
- Contains: TypeScript facade modules plus shared CSS.
- Key files: `packages/napplet-kit/src/boot.ts`, `packages/napplet-kit/src/nap.ts`,
  `packages/napplet-kit/src/dom.ts`, `packages/napplet-kit/src/theme.ts`,
  `packages/napplet-kit/src/styles.css`.

**`packages/assets-pipeline/`:**
- Purpose: Hold reproducible Blender/Node/Python asset-processing logic and acquisition manifests.
- Contains: Blender conversion/inspection/build scripts, avatar retargeting/normal synthesis, prop manifests,
  a handoff runbook and a currently stubbed TypeScript CLI.
- Key files: `packages/assets-pipeline/HANDOFF.md`, `packages/assets-pipeline/blender/build_level.py`,
  `packages/assets-pipeline/avatar/blender/retarget_meshy_to_rig.py`,
  `packages/assets-pipeline/props/fetch_props.mjs`, `packages/assets-pipeline/src/cli.ts`.

**`services/world-agent/`:**
- Purpose: Isolate Python AI/data work from the TypeScript truth path.
- Contains: Proposal model, Kerni capability protocol, loopback HTTP sidecar and pytest coverage.
- Key files: `services/world-agent/src/world_agent/agent.py`,
  `services/world-agent/src/world_agent/kerni.py`,
  `services/world-agent/src/world_agent/server.py`, `services/world-agent/pyproject.toml`.

**`godot/`:**
- Purpose: Ship a separate Godot 4.7 client/Steam vertical slice with code-first scenes and local-first state.
- Contains: One `.tscn`, four autoload cores, world/play/UI/net/Meaningverse scripts, runtime assets and smoke tests.
- Key files: `godot/project.godot`, `godot/scenes/Main.tscn`, `godot/scripts/main.gd`,
  `godot/ARCHITECTURE.md`, `godot/tests/smoke.gd`.

**`godot/scripts/moc/`:**
- Purpose: Implement Meaningverse cultural state, Leviathan assembly and the bounded Kerni embodiment.
- Contains: Phase loop, demo presenter, session store, ship assembly, deterministic agent and optional local client.
- Key files: `godot/scripts/moc/moc_loop.gd`, `godot/scripts/moc/moc_demo.gd`,
  `godot/scripts/moc/kerni_world_agent.gd`, `godot/scripts/moc/kerni_live_client.gd`,
  `godot/scripts/moc/leviathan_assembly.gd`.

**`godot/scripts/net/`:**
- Purpose: Keep mock-first chat/voice/media contracts stable while provider backends evolve.
- Contains: Plain Node transport seams consumed by Godot UI.
- Key files: `godot/scripts/net/chat_transport.gd`, `godot/scripts/net/voice_transport.gd`,
  `godot/scripts/net/media_catalog.gd`.

**`napplets/`:**
- Purpose: Build focused, independently publishable NIP-5D applets rather than one coupled web app.
- Contains: `feed/` and `map/` Vite packages plus non-package authoring/publish tools.
- Key files: `napplets/feed/src/main.ts`, `napplets/map/src/main.ts`,
  `napplets/tools/paja.mjs`, `napplets/tools/serve.mjs`, `napplets/tools/publish/index.html`.

**`docs/` and `infra/`:**
- Purpose: Record accepted architecture, feature handoffs, design intent and deployment constraints.
- Contains: Numbered ADRs, subsystem handoffs, design notes, communications assets and hosting/playtest guides.
- Key files: `docs/adr/0001-stack-and-runtime-topology.md`,
  `docs/adr/0008-guild-lenses-and-palace-core.md`, `docs/adr/0009-public-realtime-street.md`,
  `infra/HOSTING.md`, `infra/LAN-PLAYTEST.md`.

**`assets-incoming/`, `art/`, and `tooling/`:**
- Purpose: Stage original/static assets and maintain cross-package production scripts.
- Contains: GLB/growth-manifest pairs, Blender source files, deterministic build scripts and video utilities.
- Key files: `assets-incoming/README.md`, `assets-incoming/GROWABLES.md`,
  `tooling/blender/build_kerni_3d.py`, `tooling/blender/build_moc_leviathan.py`,
  `tooling/dev/lan-playtest.mjs`.

**`600BillionCWO/`:**
- Purpose: Store repository-local branding, lore and member-system source/projection data.
- Contains: Brand voice/canon/prompt documents, JSON schemas/registries and a member SQLite schema definition.
- Key files: `600BillionCWO/00_branding/lore/README.md`,
  `600BillionCWO/00_branding/member_system/README.md`,
  `600BillionCWO/00_branding/member_system/member_registry.json`,
  `600BillionCWO/00_branding/member_system/schema.sql`.

## Key File Locations

**Entry Points:**
- `apps/web/index.html`: Vite HTML shell for the desktop browser client.
- `apps/web/src/main.tsx`: React root bootstrap.
- `apps/web/src/frontend/GameFrontend.tsx`: Browser application/surface state machine.
- `apps/web/src/scene/PalaceScene.tsx`: Playable 3D world root.
- `apps/server/src/index.ts`: Production Node process lifecycle.
- `apps/server/src/dev.ts`: Development entry with local defaults.
- `godot/project.godot`: Godot project/autoload configuration.
- `godot/scenes/Main.tscn`: Only Godot scene entry.
- `godot/scripts/main.gd`: Code-first Godot app root.
- `services/world-agent/src/world_agent/server.py`: `kerni-sidecar` CLI target.
- `napplets/feed/src/main.ts`: Feed napplet bootstrap.
- `napplets/map/src/main.ts`: Map napplet bootstrap.
- `packages/assets-pipeline/src/cli.ts`: Asset package CLI entry; currently a stub.

**Configuration:**
- `package.json`: Root pnpm scripts and workspace-wide checks.
- `pnpm-workspace.yaml`: Includes `apps/*`, `packages/*`, and `napplets/*`; excludes Python service.
- `pnpm-lock.yaml`: Locked Node dependency graph.
- `tsconfig.base.json`: Shared strict TypeScript baseline.
- `biome.json`: TypeScript lint/format policy.
- `.editorconfig`: Cross-editor whitespace baseline.
- `.pre-commit-config.yaml`: Pre-commit hooks.
- `.github/workflows/ci.yml`: CI workflow.
- `.nvmrc`: Node runtime selection.
- `apps/web/vite.config.ts`: Browser dev/build config and local API proxy.
- `apps/server/tsconfig.json`: Server production compilation.
- `services/world-agent/pyproject.toml`: Python package, CLI, Ruff and pytest configuration.
- `godot/project.godot`: Godot runtime/autoload/rendering settings.
- `godot/export_presets.cfg`: Committed Godot export presets.
- `apps/web/.env.example`: Example browser environment configuration; values are not part of this map.
- `apps/server/.env.example`: Example server environment configuration; values are not part of this map.

**Core Logic:**
- `packages/shared/src/palace.ts`: Palace Activity/Session/Guild domain.
- `packages/shared/src/json.ts`: Cross-platform canonical JSON.
- `packages/multiplayer/src/index.ts`: Shared realtime schema and validation.
- `packages/ownership/src/index.ts`: Signed ownership verification.
- `apps/server/src/db/auditStore.ts`: Durable append-only SQLite store.
- `apps/server/src/multiplayer/PalaceRoom.ts`: Volatile public Street authority.
- `apps/web/src/net/multiplayer.ts`: Browser room lifecycle and snapshots.
- `apps/web/src/builder/buildState.ts`: Home builder system state.
- `apps/web/src/builder/economy.ts`: Real-time drip/crafting economy.
- `apps/web/src/meaningverse/model.ts`: Meaningverse ship/tutorial social logic.
- `godot/scripts/economy.gd`: Godot inventory/drip/craft queue.
- `godot/scripts/build_system.gd`: Godot grid/decor mutation boundary.
- `godot/scripts/moc/moc_loop.gd`: Godot cultural phase state machine.
- `services/world-agent/src/world_agent/kerni.py`: Capability-bounded external template selection.

**Testing:**
- `apps/web/tests/`: Browser-domain unit/smoke scripts executed by `tsx`.
- `apps/server/test/`: Node HTTP, multiplayer, audit and rate-limit tests.
- `packages/shared/test/`: Shared package contract tests.
- `packages/multiplayer/test/`: Realtime protocol package tests.
- `packages/ownership/test/`: Cryptographic ownership vectors and branch tests.
- `packages/identity/test/`: Entity derivation package tests.
- `packages/assets-pipeline/avatar/synth_normals.test.mjs`: Asset helper test.
- `services/world-agent/tests/`: Python proposal/Kerni boundary tests.
- `godot/tests/smoke.gd`: Headless autoload/world/UI/network-seam smoke test.
- `tooling/video/test_upscale_grok_video.py`: Video utility test.

**Architecture and Handoffs:**
- `CLAUDE.md`: Non-negotiable project invariants.
- `BUILD-BRIEF.md`: Target data model, stack and ordered backlog.
- `docs/adr/`: Accepted topology/protocol decisions.
- `godot/ARCHITECTURE.md`: Detailed Godot module contract.
- `packages/assets-pipeline/HANDOFF.md`: Revit/Blender-to-runtime pipeline runbook.
- `infra/HOSTING.md`: Current and target hosting topology.

## Naming Conventions

**Files:**
- React components use PascalCase `.tsx`, e.g. `apps/web/src/scene/PalaceScene.tsx` and
  `apps/web/src/ui/BuilderHud.tsx`.
- TypeScript domain/adapters use camelCase `.ts`, e.g. `apps/web/src/net/multiplayer.ts` and
  `apps/server/src/db/auditStore.ts`.
- Package public APIs use `src/index.ts`, e.g. `packages/shared/src/index.ts` and
  `packages/ownership/src/index.ts`.
- TypeScript tests use `.test.ts`/`.test.mjs` for test-runner suites and `-smoke.ts` for executable
  smoke checks, e.g. `apps/server/test/server.test.ts` and `apps/web/tests/builder-smoke.ts`.
- Python modules/tests use snake_case, e.g. `services/world-agent/src/world_agent/agent.py` and
  `services/world-agent/tests/test_agent.py`.
- Godot scripts use snake_case `.gd`, e.g. `godot/scripts/build_system.gd`; generated `.uid` sidecars
  share the full script filename, e.g. `godot/scripts/build_system.gd.uid`.
- ADRs use zero-padded numeric kebab-case names, e.g. `docs/adr/0009-public-realtime-street.md`.
- Major handoff/reference Markdown uses uppercase or descriptive kebab-case according to scope, e.g.
  `BUILD-BRIEF.md`, `docs/STREET-HANDOFF.md`, and `docs/design/habitat-capability-system.md`.
- Runtime asset names are lowercase descriptive paths in current client data, e.g.
  `apps/web/public/growables/apple-tree.glb`; the production kit convention is documented as
  `600B_<KIT>_<PART>_<LODn>` in `packages/assets-pipeline/src/index.ts`.

**Directories:**
- pnpm workspace packages are grouped by role under plural lowercase roots: `apps/`, `packages/`,
  `napplets/`, `services/`.
- Package/service names use kebab-case, e.g. `packages/assets-pipeline/`, `packages/napplet-kit/`,
  `services/world-agent/`.
- Feature folders inside TypeScript apps are lowercase role names, e.g. `apps/web/src/meaningverse/`,
  `apps/server/src/multiplayer/`.
- Godot feature folders are lowercase snake-compatible names, e.g. `godot/scripts/scene_assets/` and
  `godot/scripts/moc/`.

## Where to Add New Code

**New Desktop Web Screen:**
- Screen identity/data/pure helpers: `apps/web/src/frontend/`.
- Reusable view component: `apps/web/src/ui/`.
- Shell registration/composition: `apps/web/src/frontend/GameFrontend.tsx`.
- Tests: `apps/web/tests/`; keep business logic importable without mounting r3f.

**New 3D World Feature:**
- Scene component or deterministic world data: `apps/web/src/scene/`.
- Homebuilder-specific view: `apps/web/src/scene/homebuilder/`.
- Pure gameplay state/rules: `apps/web/src/builder/` or `apps/web/src/meaningverse/`.
- UI overlay: `apps/web/src/ui/`.
- Tests: `apps/web/tests/` using pure layout/state helpers where possible.

**New Browser Integration:**
- Transport/provider implementation: `apps/web/src/net/`.
- Runtime-safe environment gate: `apps/web/src/config/`.
- UI remains in `apps/web/src/ui/` and consumes a narrow transport interface from `apps/web/src/net/`.
- Tests: `apps/web/tests/` with provider/network calls replaced by explicit dependencies or fixtures.

**New HTTP API:**
- Provider/domain operation: `apps/server/src/api/`.
- Route and boundary controls: `apps/server/src/app.ts` until a dedicated router is introduced.
- Durable writes: call an internal command/state-machine layer under `apps/server/src/statemachine/` and
  append through `apps/server/src/db/`/`apps/server/src/eventlog/`; do not write in route handlers.
- Tests: `apps/server/test/` with injected dependencies through `ServerDependencies`-style seams.

**New Realtime Message:**
- Shared constant, payload type, strict parser and schema state: `packages/multiplayer/src/index.ts`.
- Server authority/rate/transition handling: `apps/server/src/multiplayer/PalaceRoom.ts`.
- Browser lifecycle/render snapshot handling: `apps/web/src/net/multiplayer.ts`.
- Tests: `packages/multiplayer/test/`, `apps/server/test/multiplayer.test.ts`, and
  `apps/web/tests/multiplayer-smoke.ts`.

**New Durable Domain/Command:**
- Platform-neutral record/type: `packages/shared/src/` and re-export from `packages/shared/src/index.ts`.
- Transition/command rules: `apps/server/src/statemachine/`.
- Audit persistence: `apps/server/src/db/` and `apps/server/src/eventlog/`.
- Provider effects/reconciliation: `apps/server/src/adapters/` and `apps/server/src/worker/`.
- Tests: package tests under `packages/shared/test/` plus server tests under `apps/server/test/`.

**New Ownership Flow:**
- Verification/signing protocol changes: `packages/ownership/src/index.ts` with vectors in
  `packages/ownership/test/ownership.test.mjs`.
- Browser on-device call site: a focused module under `apps/web/src/identity/` or `apps/web/src/net/`.
- Server command validation: `apps/server/src/statemachine/` and audited persistence in
  `apps/server/src/db/`.
- Never duplicate verifier logic in `apps/web/` or `apps/server/`; import `@600b/ownership`.

**New Shared Palace Activity/Guild/Session Concept:**
- Domain types/pure selection: `packages/shared/src/palace.ts`.
- Public exports: `packages/shared/src/index.ts`.
- Contract tests: `packages/shared/test/package.test.mjs`.
- Surface projections: separate adapters/components under `apps/web/src/`, `godot/scripts/`, or a
  dedicated `napplets/<name>/` without moving canonical identity into the surface.

**New Godot Gameplay Module:**
- Core state service: `godot/scripts/` only when it belongs in an existing autoload contract.
- World composition: `godot/scripts/world/`.
- UI: `godot/scripts/ui/`.
- Provider/mock boundary: `godot/scripts/net/`.
- Meaningverse/Kerni logic: `godot/scripts/moc/`.
- Tests: extend `godot/tests/smoke.gd`; keep `godot/scenes/Main.tscn` as the only `.tscn`.

**New World-agent Capability:**
- Pure proposal/selection model: `services/world-agent/src/world_agent/`.
- Exact local API boundary: `services/world-agent/src/world_agent/server.py`.
- Tests: `services/world-agent/tests/`.
- Keep all outputs suggestion-only and require application validation in `godot/scripts/moc/` or a future
  Node adapter under `apps/server/src/adapters/`.

**New Napplet:**
- Independent package: `napplets/<name>/` with its own `package.json`, `index.html`, `tsconfig.json`,
  `vite.config.ts`, and `src/main.ts`.
- Shared shell/DOM/theme behavior: add to `packages/napplet-kit/src/` and export from
  `packages/napplet-kit/src/index.ts`.
- Local authoring/publish helpers: `napplets/tools/`.
- Use host capabilities through `packages/napplet-kit/src/nap.ts`, not direct navigation/provider access.

**New Runtime Asset:**
- Original/staged GLB and growth data: `assets-incoming/` or authored source under `art/`.
- Reproducible processor: `packages/assets-pipeline/blender/`, `packages/assets-pipeline/avatar/`, or
  `tooling/` according to scope.
- Browser runtime copy: `apps/web/public/<category>/` with licensing in the category `CREDITS.md`.
- Godot runtime copy/import metadata: `godot/assets/<category>/`.
- Pipeline/handoff update: `packages/assets-pipeline/HANDOFF.md` or the relevant asset README.

**New Architecture Decision or Handoff:**
- Accepted architectural change: next numbered record under `docs/adr/` and index in
  `docs/adr/README.md`.
- Feature/world implementation handoff: `docs/`.
- Deployment/operations change: `infra/`.
- Project invariant change: `CLAUDE.md` only when it is genuinely repository-wide.

**Utilities:**
- Shared pure TypeScript helper across apps: place in the responsible package under `packages/`; avoid a
  generic unowned utility directory.
- Browser-only helper: colocate in its feature directory under `apps/web/src/`.
- Server-only helper: colocate under `apps/server/src/` near its boundary.
- Cross-workspace production script: `tooling/`; package-specific asset script:
  `packages/assets-pipeline/`.

## Special Directories

**`apps/web/public/`:**
- Purpose: Vite-served runtime assets, including palace/growable models, map data, intro media and credits.
- Generated: Mixed — canonical assets are committed; downloaded avatar/furniture/building/prop/nature/
  housekit/village/tools packs are intended to be local inputs refreshed by `pnpm demo:assets`.
- Committed: Mixed and partly inconsistent. `.gitignore:32-64` excludes `apps/web/public/avatar/`,
  `apps/web/public/furniture/*.glb`, `apps/web/public/buildings/*.glb` and the sibling pack globs, but 21
  files matching those patterns (~15.7 MB, including `apps/web/public/avatar/sample.vrm` and
  `apps/web/public/avatar/clip.fbx`) were tracked before the rules existed and remain tracked. Treat
  `git ls-files apps/web/public` as authoritative, not `.gitignore`; see `.planning/codebase/CONCERNS.md`.

**`assets-incoming/`:**
- Purpose: Staging area for original static full-growth geometry plus `<asset>.growth.json` data and previews.
- Generated: Yes, primarily from deterministic Blender scripts documented in `assets-incoming/README.md`.
- Committed: Yes for the current growable/Leviathan artifacts.

**`art/blender/`:**
- Purpose: Editable Blender source for Kerni and Leviathan production assets.
- Generated: No; source authoring files (including Blender backup `.blend1` files).
- Committed: Yes.

**`godot/assets/`:**
- Purpose: Runtime Godot fonts, GLBs, video, UI and world data plus Godot import sidecars.
- Generated: Mixed — content files are authored/copied; `.import`/`.uid` metadata is Godot-generated.
- Committed: Yes for selected assets and sidecars; `godot/.godot/` and `godot/dist/` are excluded by
  `godot/.gitignore`.

**`apps/server/src/adapters/`, `apps/server/src/eventlog/`, `apps/server/src/statemachine/`,
`apps/server/src/worker/`, and `apps/server/src/rooms/`:**
- Purpose: Reserve architecture-aligned locations for future truth-tier features.
- Generated: No; currently represented by `.gitkeep` placeholders.
- Committed: Yes.

**`600BillionCWO/00_branding/`:**
- Purpose: Local source material for brand/lore/member identity projections, separate from executable app
  packages.
- Generated: Mixed JSON projections and authored Markdown/SQL schema.
- Committed: Yes.

**`napplets/tools/`:**
- Purpose: Non-package local harnesses for authoring, serving and publishing independent napplets.
- Generated: No.
- Committed: Yes; excluded from pnpm package membership by the comment in `pnpm-workspace.yaml`.

**`.planning/codebase/`:**
- Purpose: Store GSD repository maps used by planning/execution workflows.
- Generated: Yes, by `/gsd-map-codebase`.
- Committed: Depends on the orchestrator workflow. The full set is `STACK.md`, `INTEGRATIONS.md`,
  `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, and `CONCERNS.md`; regenerate
  them together rather than editing one in isolation.

**Ignored build/cache directories:**
- Purpose: Hold dependencies, builds, caches, coverage and local databases.
- Generated: Yes — `node_modules/`, `dist/`, `build/`, `.venv/`, `.ruff_cache/`, `.pytest_cache/`,
  `__pycache__/`, `.godot/`, `coverage/`, and local `*.sqlite`/`*.db` paths are excluded by `.gitignore`.
- Committed: No; do not place source or canonical runtime data in these locations.

---

*Structure analysis: 2026-07-26*
