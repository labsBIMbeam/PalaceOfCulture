# Technology Stack

**Analysis Date:** 2026-07-26

## Languages

**Primary:**
- TypeScript 5.6.3 in the main workspace and 5.9.3 in the napplet workspace - browser client, Node server, shared protocol/identity/ownership packages, asset tooling, and NIP-5D napplets (`package.json`, `apps/web/package.json`, `apps/server/package.json`, `packages/napplet-kit/package.json`).
- GDScript for Godot 4.7 - standalone Meaningverse vertical slice, local-first gameplay, UI, persistence, and optional platform seams (`godot/project.godot`, `godot/scripts/`, `godot/tests/smoke.gd`).

**Secondary:**
- Python >=3.12 - isolated, suggestion-only Kerni/world-agent loopback service (`services/world-agent/pyproject.toml`, `services/world-agent/src/world_agent/server.py`).
- JavaScript ES modules (`.mjs`) - LAN orchestration, napplet authoring server, world-data generation, and asset acquisition scripts (`tooling/dev/lan-playtest.mjs`, `napplets/tools/serve.mjs`, `napplets/map/tools/build-world.mjs`, `packages/assets-pipeline/props/fetch_props.mjs`).
- TS/JS compilation targets ES2022 with strict type checking and bundler-style module resolution (`tsconfig.base.json`).
- HTML, CSS, SVG, JSON, GeoJSON, GLB/VRM, WebP, and MP4 are application assets and presentation formats rather than separate application runtimes (`apps/web/index.html`, `apps/web/src/frontend/frontend.css`, `packages/napplet-kit/src/styles.css`, `apps/web/public/ne_110m_admin_0_countries.geojson`, `apps/web/public/`).

## Runtime

**Environment:**
- Node.js 22 is the required JavaScript runtime (`.nvmrc`, `package.json`).
- Modern browsers run the Vite React/Three.js client, IndexedDB/localStorage persistence, WebSocket multiplayer, Web Audio/media, and direct Nostr relay connections (`apps/web/src/main.tsx`, `apps/web/src/net/multiplayer.ts`, `apps/web/src/character/store.ts`, `apps/web/src/net/nostr.ts`).
- Python 3.12 runs the optional loopback-only world-agent sidecar (`services/world-agent/pyproject.toml`, `.github/workflows/ci.yml`).
- Godot 4.7 with the GL Compatibility renderer runs the separate Web/Linux/Windows vertical slice (`godot/project.godot`, `godot/export_presets.cfg`).

**Package Manager:**
- pnpm 9.12.0 manages the TypeScript monorepo (`package.json`, `pnpm-workspace.yaml`).
- Lockfile: present at `pnpm-lock.yaml`.
- uv manages the Python development environment and frozen dependency graph (`services/world-agent/uv.lock`, `.github/workflows/ci.yml`).
- Python packaging uses Hatchling (`services/world-agent/pyproject.toml`).

## Frameworks

**Core:**
- React 18.3.1 + React DOM 18.3.1 - browser UI and route/screen composition (`apps/web/package.json`, `apps/web/src/App.tsx`).
- Three.js 0.169.0 + React Three Fiber 8.17.10 + Drei 9.114.0 - browser 3D scene graph, GLB/VRM loading, controls, and optimized rendering (`apps/web/package.json`, `apps/web/src/scene/PalaceScene.tsx`).
- Rapier 1.5.0 + ecctrl 1.0.91 - browser physics and character controller (`apps/web/package.json`, `apps/web/src/scene/PalaceScene.tsx`).
- Colyseus 0.17 - server-authoritative public-room movement/presence over matchmaking HTTP and WebSocket (`apps/server/package.json`, `apps/server/src/multiplayer/server.ts`, `apps/web/src/net/multiplayer.ts`).
- Node built-in `http` server - health and podcast proxy API; Express 5.2.1 is declared but not imported by current server source (`apps/server/package.json`, `apps/server/src/app.ts`).
- Godot 4.7 - independent standalone/web game implementation with GDScript autoloads and GL Compatibility rendering (`godot/project.godot`, `godot/scripts/`).
- Python standard-library `ThreadingHTTPServer` - bounded Kerni template API; no Python runtime third-party dependencies are declared (`services/world-agent/pyproject.toml`, `services/world-agent/src/world_agent/server.py`).

**Testing:**
- Node built-in test runner plus TypeScript compilation - shared packages and server unit/integration tests (`apps/server/package.json`, `packages/ownership/package.json`, `packages/shared/package.json`).
- `tsx` 4.19.1 - executes web smoke tests and server TypeScript tests (`apps/web/package.json`, `apps/server/package.json`).
- pytest >=8.0 - Python world-agent tests (`services/world-agent/pyproject.toml`, `services/world-agent/tests/`).
- Godot headless smoke mode - CI imports the project and invokes `--smoke` (`.github/workflows/ci.yml`, `godot/tests/smoke.gd`).
- Napplet conformance CLI 0.2.15 and Playwright 1.59.1 - built-artifact NIP-5D conformance checks (`napplets/map/package.json`, `napplets/feed/package.json`).
- `fake-indexeddb` 6.2.4 - browser persistence tests under Node (`apps/web/package.json`, `apps/web/tests/indexeddb-audit.test.ts`).

**Build/Dev:**
- Vite 5.4.8 + React plugin 4.3.2 builds and serves the primary web client (`apps/web/package.json`, `apps/web/vite.config.ts`).
- Vite 6.4.2 + single-file plugin 2.3.3 + Napplet Vite plugin 0.11.3 build sandboxed single-file napplets (`napplets/map/package.json`, `napplets/feed/vite.config.ts`).
- TypeScript `tsc` emits shared packages and the Node server; Vite bundles browser applications (`package.json`, `apps/server/package.json`, `apps/web/package.json`).
- Biome 1.9.4 provides TypeScript/JavaScript linting and formatting with two-space indentation, double quotes, semicolons, and 100-column lines (`biome.json`, `package.json`).
- Ruff >=0.8.0 provides Python linting/formatting; Hatchling builds the Python wheel (`services/world-agent/pyproject.toml`).
- Godot export presets emit Web, Linux Steam, and Windows Steam artifacts (`godot/export_presets.cfg`).

## Key Dependencies

**Critical:**
- `@nostr-dev-kit/ndk` 3.0.3 and `nostr-tools` 2.23.5 - Nostr relay lifecycle, event queries/publishing, NIP wrappers, key/signature utilities, and NIP-19 identifiers (`apps/web/package.json`, `apps/web/src/net/nostr.ts`, `apps/web/src/net/social.ts`).
- `@colyseus/core` 0.17.44, `@colyseus/ws-transport` 0.17.13, `@colyseus/sdk` 0.17.43, and `@colyseus/schema` 4.0.27 - shared multiplayer protocol and realtime transport (`apps/server/package.json`, `apps/web/package.json`, `packages/multiplayer/package.json`).
- `better-sqlite3` 11.3.0 - synchronous durable append-only audit storage in the truth-tier process (`apps/server/package.json`, `apps/server/src/db/auditStore.ts`).
- `@noble/curves` 2.0.1 and `@noble/hashes` 1.x/2.x - Schnorr/secp256k1, HMAC, SHA-256, canonical ownership-chain and deterministic identity primitives (`packages/ownership/package.json`, `packages/identity/package.json`).
- `@pixiv/three-vrm` 3.5.4 - VRM avatar support (`apps/web/package.json`, `apps/web/src/scene/avatarImports.ts`).
- Leaflet 1.9.4 + React Leaflet 4.2.1 - 2D geographic map UI over bundled GeoJSON (`apps/web/package.json`, `apps/web/src/frontend/GameFrontend.tsx`).
- `@napplet/sdk` 0.24.4 - sandbox-mediated NIP-5D outbox, resource, storage, link, theme, and profile capabilities (`packages/napplet-kit/package.json`, `packages/napplet-kit/src/nap.ts`).

**Infrastructure:**
- SQLite is the implemented server database; Postgres is an explicit later migration and is not a current dependency (`apps/server/src/db/auditStore.ts`, `infra/HOSTING.md`).
- IndexedDB is the browser database for characters, builder state, and hash-linked audit records (`apps/web/src/character/store.ts`, `apps/web/src/builder/store.ts`, `apps/web/src/audit/indexedDbAudit.ts`).
- Browser localStorage/sessionStorage persist low-risk UI/decor state and the explicitly dev-only throwaway Nostr signer (`apps/web/src/scene/decorStore.ts`, `apps/web/src/identity/keyStore.ts`).
- Godot uses `user://` JSON/files and an MP3 media cache for its local-first standalone state (`godot/scripts/store.gd`, `godot/scripts/ui/media_player.gd`).
- Yjs, Postgres, Redis/NATS, LNbits, Boltz, and Bitcoin-node clients are planned but not installed in the current dependency manifests (`docs/adr/0001-stack-and-runtime-topology.md`, `infra/HOSTING.md`).

## Configuration

**Environment:**
- Browser build settings are accessed through Vite variables: `VITE_MULTIPLAYER_URL`, `VITE_PERSIST_CHARACTER`, `VITE_ENABLE_DEMO_WRITES`, `VITE_ENABLE_REAL_PAYMENTS`, `VITE_VOICE_BACKEND`, `VITE_LIVEKIT_URL`, and `VITE_HIVETALK_URL` (`apps/web/src/net/multiplayer.ts`, `apps/web/src/frontend/GameFrontend.tsx`, `apps/web/src/config/safety.ts`, `apps/web/src/net/voice.ts`).
- Server runtime settings cover HTTP bind/CORS, SQLite location, proxy trust, resource limits, feed-proxy limits, and the dedicated multiplayer bind/origin policy (`apps/server/src/app.ts`, `apps/server/src/multiplayer/server.ts`).
- Example environment files exist but their contents are intentionally not part of this map (`apps/web/.env.example`, `apps/server/.env.example`).
- The Python sidecar uses CLI flags `--port` and `--backend`; the optional Hermes backend receives only a restricted process environment (`services/world-agent/src/world_agent/server.py`, `services/world-agent/src/world_agent/kerni.py`).

**Build:**
- Root workspace/build orchestration: `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`.
- Shared compiler policy: `tsconfig.base.json`; package-specific compiler graphs live in `apps/*/tsconfig*.json`, `packages/*/tsconfig.json`, and `napplets/*/tsconfig.json`.
- Web bundling: `apps/web/vite.config.ts`; napplet bundling: `napplets/map/vite.config.ts` and `napplets/feed/vite.config.ts`.
- Python build/lint/test configuration: `services/world-agent/pyproject.toml` and `services/world-agent/uv.lock`.
- Godot runtime/export configuration: `godot/project.godot` and `godot/export_presets.cfg`.
- CI configuration: `.github/workflows/ci.yml`; formatting/lint hooks: `biome.json` and `.pre-commit-config.yaml`.

## Platform Requirements

**Development:**
- Use Node 22 with Corepack/pnpm 9.12.0 for the TypeScript workspace (`.nvmrc`, `package.json`).
- Use Python 3.12 with uv for `services/world-agent`; development dependencies are Ruff and pytest (`services/world-agent/pyproject.toml`, `services/world-agent/uv.lock`).
- Use Godot 4.7 without .NET for the GDScript project (`godot/project.godot`, `.github/workflows/ci.yml`).
- A modern WebGL/WebAudio/IndexedDB-capable browser is required for the primary web experience (`apps/web/src/scene/PalaceScene.tsx`, `apps/web/src/character/store.ts`, `apps/web/src/ui/MediaPlayer.tsx`).
- Local web development uses Vite on 5173, the HTTP API on 8787, and Colyseus on 2567 (`apps/web/vite.config.ts`, `apps/server/src/app.ts`, `apps/server/src/multiplayer/server.ts`).

**Production:**
- The implemented web deployment shape is a static Vite bundle plus one Node 22 process exposing API and Colyseus listeners with a durable SQLite file (`apps/web/package.json`, `apps/server/src/index.ts`, `apps/server/src/db/auditStore.ts`).
- The documented target is a Linux VPS with Caddy serving static files and reverse-proxying API/WebSocket traffic; no provisioning or deployment configuration is committed (`infra/HOSTING.md`, `infra/README.md`).
- The Godot slice exports separately to Web, Linux, and Windows and is not a Colyseus client (`godot/export_presets.cfg`, `infra/HOSTING.md`).
- Static GLB/VRM/media/GeoJSON assets are expected to be served with the client or moved to content-addressed CDN storage (`apps/web/public/`, `infra/HOSTING.md`).

---

*Stack analysis: 2026-07-26*
