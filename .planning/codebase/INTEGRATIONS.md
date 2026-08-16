# External Integrations

**Analysis Date:** 2026-07-26

## APIs & External Services

**Nostr relays and open-protocol content:**
- The browser connects directly to five public WebSocket relays (`relay.damus.io`, `nos.lol`, `relay.primal.net`, `relay.nostr.band`, and `relay.zap.stream`) for Nostr event reads and guarded development-only writes (`apps/web/src/net/nostrConfig.ts`, `apps/web/src/net/nostr.ts`).
  - SDK/Client: `@nostr-dev-kit/ndk` with `nostr-tools` for identifiers (`apps/web/package.json`, `apps/web/src/net/social.ts`).
  - Auth: no server credential; reads are public, while writes require a local signer and `VITE_ENABLE_DEMO_WRITES=true` in a development build (`apps/web/src/config/safety.ts`, `apps/web/src/identity/keyStore.ts`).
- Social notes/profiles/reactions/reposts/zap receipts, NIP-23 articles, NIP-15/NIP-99 market listings, and NIP-53 live events are queried through the shared NDK relay pool (`apps/web/src/net/social.ts`, `apps/web/src/net/articles.ts`, `apps/web/src/net/market.ts`, `apps/web/src/net/media.ts`).
  - SDK/Client: shared lazy NDK singleton and bounded one-shot subscriptions (`apps/web/src/net/nostr.ts`).
  - Auth: public read; NDK signer only for explicitly enabled development writes (`apps/web/src/identity/keyStore.ts`, `apps/web/src/config/safety.ts`).
- Plebeian Market and Habla are outbound deeplink destinations; product checkout and article reading occur on those services rather than inside this app (`apps/web/src/net/market.ts`, `apps/web/src/net/articles.ts`).
  - SDK/Client: NDK `naddr` encoding and ordinary HTTPS links (`apps/web/src/net/market.ts`, `apps/web/src/net/articles.ts`).
  - Auth: none in this application (`apps/web/src/net/market.ts`, `apps/web/src/net/articles.ts`).

**Podcasting, audio, and news:**
- Apple iTunes Search API supplies keyless podcast-catalog search through the server endpoint `/api/podcasts/search` (`apps/server/src/api/podcasts.ts`, `apps/server/src/app.ts`).
  - SDK/Client: Node built-in `fetch`; no Apple SDK (`apps/server/src/api/podcasts.ts`).
  - Auth: none (`apps/server/src/api/podcasts.ts`).
- The server fetches user-selected or curated RSS/Atom XML through `/api/podcasts/feed`, with DNS pinning, private-address blocking, redirect checks, MIME limits, byte limits, timeouts, rate limits, and concurrency limits (`apps/server/src/api/podcasts.ts`, `apps/server/src/app.ts`).
  - SDK/Client: Node built-in DNS/HTTP/HTTPS modules (`apps/server/src/api/podcasts.ts`).
  - Auth: none; untrusted upstream URLs are accepted only through the hardened proxy rules (`apps/server/src/api/podcasts.ts`).
- Curated Podcasting 2.0 sources are Podcasting 2.0 / No Agenda show notes RSS and a Wavlake music feed; the browser parses enclosures, medium, and value recipients after same-origin proxying (`apps/web/src/net/feed.ts`).
  - SDK/Client: browser `fetch` plus `DOMParser` (`apps/web/src/net/feed.ts`).
  - Auth: none (`apps/web/src/net/feed.ts`).
- SoundHelix provides public demo MP3s used when live media sources are unavailable; both the web and Godot slices consume them (`apps/web/src/net/media.ts`, `godot/scripts/net/media_catalog.gd`).
  - SDK/Client: browser audio and Godot `HTTPRequest`/`AudioStreamMP3` (`apps/web/src/ui/MediaPlayer.tsx`, `godot/scripts/ui/media_player.gd`).
  - Auth: none (`apps/web/src/net/media.ts`, `godot/scripts/net/media_catalog.gd`).
- Citadel Wire RSS is fetched directly by the browser and reduced to bounded, text-only news items (`apps/web/src/net/clownNews.ts`).
  - SDK/Client: browser `fetch` with timeout and response-size checks (`apps/web/src/net/clownNews.ts`).
  - Auth: none (`apps/web/src/net/clownNews.ts`).

**Lightning / value-for-value:**
- LNURL-pay/Lightning Address discovery and callback invoice requests are implemented client-side; WebLN can hand invoices to an injected wallet, with `lightning:` URI fallback (`apps/web/src/net/lightning.ts`).
  - SDK/Client: native `fetch`, optional `window.webln`, and NDK for signed NIP-57 zap requests (`apps/web/src/net/lightning.ts`).
  - Auth: wallet-controlled WebLN authorization; real payment handoff is fail-closed unless `VITE_ENABLE_REAL_PAYMENTS=true` in local development (`apps/web/src/config/safety.ts`, `apps/web/src/net/lightning.ts`).
- LNbits, Boltz, bitcoind, LND/CLN, and server-side timelock/reconcile adapters are not implemented in the current source (`infra/HOSTING.md`, `docs/adr/0001-stack-and-runtime-topology.md`).
  - SDK/Client: not detected in `apps/server/package.json` or `apps/server/src/`.
  - Auth: not applicable until those adapters exist (`infra/HOSTING.md`).

**Realtime multiplayer:**
- The web client uses Colyseus matchmaking HTTP plus WebSocket transport to the repository's own dedicated multiplayer listener; development defaults to `http://127.0.0.1:2567`, while production defaults to the page origin unless `VITE_MULTIPLAYER_URL` is set (`apps/web/src/net/multiplayer.ts`).
  - SDK/Client: `@colyseus/sdk`; server uses `@colyseus/core` and `@colyseus/ws-transport` (`apps/web/package.json`, `apps/server/package.json`).
  - Auth: no durable identity yet; current public HQ admission accepts bounded handle/avatar hints and exact origin policy (`apps/server/src/multiplayer/PalaceRoom.ts`, `apps/server/src/multiplayer/server.ts`).

**Voice / live communications:**
- Current chat and voice are local mocks; NIP-29/NIP-17 chat, LiveKit, HiveTalk, and MoQ are documented adapter targets but no real network voice/SFU client is installed (`apps/web/src/net/chat.ts`, `apps/web/src/net/voice.ts`, `apps/web/package.json`).
  - SDK/Client: mock transport only; `VITE_VOICE_BACKEND`, `VITE_LIVEKIT_URL`, and `VITE_HIVETALK_URL` are inert scaffolding that falls back to mock (`apps/web/src/net/voice.ts`).
  - Auth: not applicable for the current mock; future npub/SFU token auth is not implemented (`docs/adr/0002-chat-and-voice-transport.md`, `docs/adr/0005-voice-backends-hivetalk.md`).

**NIP-5D napplet runtime:**
- Single-file map/feed napplets integrate only through sandbox-injected NAP domains: outbox, resource, scoped storage, link, theme, common/profile, and optional identity/count capabilities (`packages/napplet-kit/src/nap.ts`, `napplets/feed/src/main.ts`, `napplets/map/src/main.ts`).
  - SDK/Client: `@napplet/sdk` 0.24.4; manifests are generated with `@napplet/vite-plugin` (`packages/napplet-kit/package.json`, `napplets/feed/vite.config.ts`, `napplets/map/vite.config.ts`).
  - Auth: owned by the containing NIP-5D shell; napplets receive no raw relay or credential authority (`packages/napplet-kit/src/nap.ts`).
- The feed napplet requires shell outbox access and optionally resolves profiles/resources/links; the map napplet has no required domain and delegates external navigation to NAP-LINK (`napplets/feed/src/main.ts`, `napplets/map/src/main.ts`).
  - SDK/Client: guarded helper layer in `packages/napplet-kit/src/nap.ts`.
  - Auth: shell-mediated (`packages/napplet-kit/src/nap.ts`).

**World-agent / local AI:**
- Godot can call the loopback-only Kerni sidecar at `127.0.0.1:8791/v1/kerni/template`; only bounded template IDs and phases cross the boundary (`godot/scripts/moc/kerni_live_client.gd`, `services/world-agent/src/world_agent/server.py`).
  - SDK/Client: Godot `HTTPRequest` to Python standard-library HTTP server (`godot/scripts/moc/kerni_live_client.gd`, `services/world-agent/src/world_agent/server.py`).
  - Auth: loopback binding plus exact bounded request schema; no token (`services/world-agent/src/world_agent/server.py`).
- The optional `hermes` backend invokes a safe-mode, zero-tool Hermes CLI one-shot and falls back deterministically on errors or invalid output (`services/world-agent/src/world_agent/kerni.py`).
  - SDK/Client: local `hermes` executable through Python `subprocess.run` (`services/world-agent/src/world_agent/kerni.py`).
  - Auth: provider credentials remain owned by the local Hermes installation and are not passed through the game protocol (`services/world-agent/src/world_agent/kerni.py`).

**Platform and asset tooling:**
- Godot exposes an optional Steamworks seam through a dynamically detected `Steam` singleton; GodotSteam and an App ID are not bundled or configured (`godot/scripts/platform/steam_bridge.gd`).
  - SDK/Client: optional external GodotSteam GDExtension (`godot/scripts/platform/steam_bridge.gd`).
  - Auth: not configured (`godot/scripts/platform/steam_bridge.gd`).
- Developer-only asset sourcing can search/download verified CC0 GLB files from Poly Pizza and emit local credits manifests (`packages/assets-pipeline/props/fetch_props.mjs`).
  - SDK/Client: Node built-in `fetch` and filesystem APIs (`packages/assets-pipeline/props/fetch_props.mjs`).
  - Auth: none (`packages/assets-pipeline/props/fetch_props.mjs`).

## Data Storage

**Databases:**
- SQLite via `better-sqlite3` stores server-side append-only audit streams and heads (`apps/server/src/db/auditStore.ts`, `apps/server/package.json`).
  - Connection: `AUDIT_DB_PATH`; defaults to an OS state directory such as `$XDG_STATE_HOME/600b/audit.sqlite` or the platform fallback (`apps/server/src/db/auditStore.ts`).
  - Client: `better-sqlite3` 11.3.0 (`apps/server/package.json`).
- IndexedDB database `600b` stores browser characters, builder state, metadata, audit events, and audit heads (`apps/web/src/character/store.ts`, `apps/web/src/builder/store.ts`, `apps/web/src/audit/indexedDbAudit.ts`).
  - Connection: browser-local database; no environment variable (`apps/web/src/character/store.ts`).
  - Client: native IndexedDB API (`apps/web/src/character/store.ts`, `apps/web/src/builder/store.ts`).
- Postgres is a planned scale-out migration, not a current database integration (`infra/HOSTING.md`, `apps/server/package.json`).
  - Connection: not detected (`apps/server/src/`).
  - Client: not detected (`apps/server/package.json`).

**File Storage:**
- Static application assets are repository/build-local under `apps/web/public/` and copied into the Vite distribution; a CDN/MinIO move is only a documented future deployment option (`apps/web/public/`, `infra/HOSTING.md`).
- Godot persists home/economy/palace/session JSON and cached MP3s under `user://` (`godot/scripts/store.gd`, `godot/scripts/moc/moc_session_store.gd`, `godot/scripts/ui/media_player.gd`).
- Browser decor/UI preferences use localStorage, while the dev-only throwaway Nostr key uses sessionStorage (`apps/web/src/scene/decorStore.ts`, `apps/web/src/identity/keyStore.ts`).
- Napplet storage is shell-scoped and accessed only via NAP-STORAGE (`packages/napplet-kit/src/nap.ts`).

**Caching:**
- No external cache service is integrated; Redis is only a future Colyseus/queue option (`infra/HOSTING.md`, `apps/server/package.json`).
- Godot caches downloaded demo/media MP3s in `user://media_cache` (`godot/scripts/ui/media_player.gd`).
- Browser-side live data uses adapter-level in-memory state and local device persistence rather than a shared cache (`apps/web/src/net/nostr.ts`, `apps/web/src/character/store.ts`).

## Authentication & Identity

**Auth Provider:**
- No centralized application auth provider is implemented; the current public Colyseus room is unauthenticated and server API routes are public GET endpoints with origin/rate protections (`apps/server/src/multiplayer/PalaceRoom.ts`, `apps/server/src/app.ts`).
  - Implementation: bounded anonymous handle/avatar admission for realtime and no server sessions (`apps/server/src/multiplayer/PalaceRoom.ts`).
- Nostr identity uses a generated NDK private-key signer only when unsafe demo writes are explicitly enabled in local development (`apps/web/src/identity/keyStore.ts`, `apps/web/src/config/safety.ts`).
  - Implementation: plaintext throwaway nsec in browser sessionStorage; NIP-07 and NIP-46 functions are explicit unimplemented stubs (`apps/web/src/identity/keyStore.ts`).
- Shared deterministic Nostr identity primitives are available as a library but are not yet wired into server admission (`packages/identity/src/index.ts`, `apps/server/src/multiplayer/PalaceRoom.ts`).

## Monitoring & Observability

**Error Tracking:**
- None detected; no Sentry/OpenTelemetry/error-tracking SDK appears in current manifests (`package.json`, `apps/web/package.json`, `apps/server/package.json`, `services/world-agent/pyproject.toml`).

**Logs:**
- Node server lifecycle logs are written to stdout/stderr (`apps/server/src/index.ts`).
- Browser adapters use limited console status/fallback messages (`apps/web/src/net/voice.ts`).
- Python sidecar uses standard-library `logging` (`services/world-agent/src/world_agent/server.py`).
- Godot uses engine logging helpers such as `push_error` for local persistence failures (`godot/scripts/store.gd`).

## CI/CD & Deployment

**Hosting:**
- No live hosting or infrastructure-as-code is committed; the documented target is a Linux VPS with Caddy serving `apps/web/dist` and reverse-proxying Node API/Colyseus traffic (`infra/README.md`, `infra/HOSTING.md`).
- Vite produces the static browser bundle; the Node server runs as a separate process with loopback defaults (`apps/web/package.json`, `apps/server/package.json`, `apps/server/src/app.ts`, `apps/server/src/multiplayer/server.ts`).
- Godot exports are separate Web/Linux/Windows artifacts rather than the deployed Colyseus web client (`godot/export_presets.cfg`, `infra/HOSTING.md`).

**CI Pipeline:**
- GitHub Actions runs on pushes and pull requests with read-only contents permission (`.github/workflows/ci.yml`).
- The TypeScript job installs from the frozen pnpm lockfile, then lints, typechecks, tests, and builds the workspace (`.github/workflows/ci.yml`).
- The Python job installs with frozen uv state, runs Ruff checks/format verification and pytest, and also lints Python asset tooling (`.github/workflows/ci.yml`).
- The Godot job installs Godot 4.7, imports the project, and runs the headless smoke path (`.github/workflows/ci.yml`).
- No automatic publish/deploy job is present in `.github/workflows/ci.yml`.

## Environment Configuration

**Required env vars:**
- Web multiplayer: `VITE_MULTIPLAYER_URL` is optional in development and required only when production multiplayer is not same-origin (`apps/web/src/net/multiplayer.ts`).
- Web safety/feature gates: `VITE_ENABLE_DEMO_WRITES`, `VITE_ENABLE_REAL_PAYMENTS`, and `VITE_PERSIST_CHARACTER` (`apps/web/src/config/safety.ts`, `apps/web/src/frontend/GameFrontend.tsx`).
- Voice scaffolding: `VITE_VOICE_BACKEND`, `VITE_LIVEKIT_URL`, and `VITE_HIVETALK_URL`; current implementations still fall back to mock (`apps/web/src/net/voice.ts`).
- HTTP server: `HOST`, `PORT`, `CORS_ORIGINS`, `AUDIT_DB_PATH`, `TRUST_PROXY_HOPS`, `SERVER_MAX_CONNECTIONS`, and `SERVER_SHUTDOWN_GRACE_MS` (`apps/server/src/app.ts`).
- Podcast proxy tuning: `PODCAST_FEED_TIMEOUT_MS`, `PODCAST_FEED_MAX_BYTES`, `PODCAST_FEED_MAX_REDIRECTS`, `PODCAST_FEED_RATE_LIMIT`, `PODCAST_FEED_RATE_WINDOW_MS`, `PODCAST_FEED_RATE_MAX_ENTRIES`, `PODCAST_FEED_MAX_CONCURRENT_PER_IP`, and `PODCAST_FEED_MAX_CONCURRENT_GLOBAL` (`apps/server/src/app.ts`).
- Multiplayer listener: `MULTIPLAYER_HOST`, `MULTIPLAYER_PORT`, `MULTIPLAYER_ORIGINS`, and `MULTIPLAYER_TRUST_PROXY_HOPS` (`apps/server/src/multiplayer/server.ts`).
- OS state-root selection: `XDG_STATE_HOME` on non-Windows or `LOCALAPPDATA` on Windows can affect the default SQLite path (`apps/server/src/db/auditStore.ts`).

**Secrets location:**
- Example environment files exist at `apps/web/.env.example` and `apps/server/.env.example`; their contents were not inspected for this map.
- No committed application secret store is detected; current external reads are keyless/public, and wallet/Nostr signing remains on the user's device (`apps/server/src/api/podcasts.ts`, `apps/web/src/net/lightning.ts`, `apps/web/src/identity/keyStore.ts`).
- Hermes/provider credentials, if the optional backend is selected, remain in the external Hermes installation rather than project configuration (`services/world-agent/src/world_agent/kerni.py`).

## Webhooks & Callbacks

**Incoming:**
- No provider webhook endpoints are implemented; current server routes are `/api/health`, `/api/podcasts/search`, and `/api/podcasts/feed` only (`apps/server/src/app.ts`).
- The local world-agent accepts only `/health` and `POST /v1/kerni/template` on loopback; this is an internal bounded API, not a public provider webhook (`services/world-agent/src/world_agent/server.py`).
- Raw Boltz/LN/chain webhook storage is a documented future requirement, not current code (`infra/README.md`, `infra/HOSTING.md`).

**Outgoing:**
- No outgoing webhooks are implemented (`apps/server/src/`).
- Outbound network actions are direct HTTPS/RSS requests, Nostr WebSocket subscriptions/publications, Colyseus client traffic, LNURL callback requests, and sandbox-mediated napplet intents rather than webhook delivery (`apps/server/src/api/podcasts.ts`, `apps/web/src/net/nostr.ts`, `apps/web/src/net/multiplayer.ts`, `apps/web/src/net/lightning.ts`, `packages/napplet-kit/src/nap.ts`).

---

*Integration audit: 2026-07-26*
