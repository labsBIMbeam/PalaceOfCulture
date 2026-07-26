# Codebase Concerns

**Analysis Date:** 2026-07-26

Scope: full repository at `6df4c58`. Every item below is grounded in an inspected file. The project
is deliberately mid-build — several entries are *planned-but-absent* rather than *broken*, and are
labelled as such so planning does not treat scaffolding as regression.

## Tech Debt

**Truth-tier directories are still empty placeholders:**
- Issue: The invariant "the app owns the truth" (`CLAUDE.md` §1) is architecturally reserved but not
  implemented. `apps/server/src/statemachine/`, `apps/server/src/eventlog/`, `apps/server/src/worker/`,
  `apps/server/src/adapters/`, and `apps/server/src/rooms/` each contain only a `.gitkeep`.
- Files: `apps/server/src/statemachine/.gitkeep`, `apps/server/src/eventlog/.gitkeep`,
  `apps/server/src/worker/.gitkeep`, `apps/server/src/adapters/.gitkeep`, `apps/server/src/rooms/.gitkeep`.
- Impact: There is no command boundary, no state machine, and no reconcile job. `apps/server/src/app.ts`
  exposes only `GET /api/health`, `GET /api/podcasts/search`, and `GET /api/podcasts/feed` — no durable
  mutation path exists, so `apps/server/src/db/auditStore.ts` currently has no in-repo caller.
- Fix approach: Land `BUILD-BRIEF.md` §6 items 9–12 in order. Add a typed command layer under
  `apps/server/src/statemachine/` that validates with `packages/ownership`, appends through
  `AuditStore.append` (`apps/server/src/db/auditStore.ts:243`), and only then emits adapter effects.

**`packages/ownership` and `packages/identity` are built and tested but consumed by nothing:**
- Issue: Neither `apps/web/package.json` nor `apps/server/package.json` declares `@600b/ownership` or
  `@600b/identity`. The only importers are their own tests.
- Files: `packages/ownership/src/index.ts`, `packages/ownership/test/ownership.test.mjs`,
  `packages/identity/src/index.ts`, `packages/identity/test/package.test.mjs`.
- Impact: `CLAUDE.md` §2 ("verification lives once, imported by both `apps/web` and `apps/server`") is
  currently unenforceable by the build. Nothing stops a surface from hand-rolling a second verifier;
  the acknowledgement is already written into `apps/server/README.md`.
- Fix approach: Add `"@600b/ownership": "workspace:*"` to both app manifests when the first authenticated
  flow lands, and call `verifyBranch` from both sides rather than reimplementing canonical JSON.

**Two divergent implementations of the same product loop (web + Godot):**
- Issue: Catalog, economy, build system, persistence and the Meaningverse loop exist twice — once in
  TypeScript, once in GDScript — with no shared contract package between them.
- Files: `apps/web/src/builder/catalog.ts` vs `godot/scripts/catalog.gd`;
  `apps/web/src/builder/economy.ts` vs `godot/scripts/economy.gd`;
  `apps/web/src/builder/store.ts` vs `godot/scripts/store.gd`;
  `apps/web/src/meaningverse/model.ts` vs `godot/scripts/moc/moc_loop.gd`.
- Impact: A balance or rule change must be made twice and can silently diverge; only the Godot side is
  covered by an in-engine end-to-end test (`godot/tests/smoke.gd`).
- Fix approach: Treat `packages/shared/src/` as the single source for cross-surface records and export
  the tunables as data (JSON) that both runtimes read, rather than duplicating literals in code.

**Diverged staging copies of two live source files:**
- Issue: `assets-incoming/GrowableObject.tsx` and `assets-incoming/loadGrowable.ts` are stale copies of
  the shipped `apps/web/src/scene/GrowableObject.tsx` and `apps/web/src/scene/loadGrowable.ts`; `diff`
  reports both pairs differ.
- Files: `assets-incoming/GrowableObject.tsx`, `assets-incoming/loadGrowable.ts`,
  `apps/web/src/scene/GrowableObject.tsx`, `apps/web/src/scene/loadGrowable.ts`.
- Impact: A contributor following `assets-incoming/README.md` can copy the older variant back over the
  live scene code. The staging copies are also outside Biome's scope (`biome.json` ignores
  `assets-incoming`), so drift is never linted.
- Fix approach: Delete the two staged `.tsx`/`.ts` copies and have `assets-incoming/GROWABLES.md` point
  at the live paths; keep `assets-incoming/` for GLB + `*.growth.json` artifacts only.

**Declared-but-unused server dependency:**
- Issue: `express` ^5.2.1 is a runtime dependency of `@600b/server`, but no file under
  `apps/server/src/` imports it — the HTTP layer is hand-written on `node:http`.
- Files: `apps/server/package.json`, `apps/server/src/app.ts`.
- Impact: Unnecessary install/attack surface and a misleading signal about the routing approach.
- Fix approach: Remove the dependency, or adopt it deliberately when `apps/server/src/app.ts` outgrows
  the hand-rolled router (`handleRequest`, `apps/server/src/app.ts:193`).

**Asset-pipeline CLI is a stub wired to an unrunnable bin entry:**
- Issue: `packages/assets-pipeline/src/cli.ts` prints "pipeline not implemented yet (BUILD-BRIEF §6.3)",
  and `packages/assets-pipeline/package.json` maps `"bin": { "600b-assets": "src/cli.ts" }` — a
  TypeScript file Node cannot execute directly.
- Files: `packages/assets-pipeline/src/cli.ts`, `packages/assets-pipeline/package.json`.
- Impact: `BUILD-BRIEF.md` §6.3 (the gltfpack/Draco/KTX2/LOD/hash/manifest chain) is unimplemented; the
  real pipeline is a set of ad-hoc Blender scripts under `packages/assets-pipeline/blender/` invoked by
  hand per `packages/assets-pipeline/HANDOFF.md`.
- Fix approach: Point `bin` at the compiled `dist/cli.js` (with `build` as a prepare step) and implement
  the manifest/hash stage first, since content-hashing is what `CLAUDE.md` §5 depends on.

**Two 1,400+ line React roots concentrate unrelated state:**
- Issue: `apps/web/src/frontend/GameFrontend.tsx` is 1,826 lines and `apps/web/src/scene/PalaceScene.tsx`
  is 1,434 lines — the two largest TypeScript files in the repo by a wide margin.
- Files: `apps/web/src/frontend/GameFrontend.tsx`, `apps/web/src/scene/PalaceScene.tsx`.
- Impact: Screen routing, member gating, feeds, map, economy surfaces, physics, multiplayer wiring and
  HUD all share one effect graph each; stale closures and mount-order coupling are easy to introduce and
  hard to test (neither file is exercised by `apps/web/tests/`).
- Fix approach: Follow the boundary already recorded in `.planning/codebase/ARCHITECTURE.md` — extract
  pure rules into `apps/web/src/builder/`, `apps/web/src/meaningverse/`, or `apps/web/src/net/`, and
  view fragments into `apps/web/src/ui/`, keeping the roots as composition-only.

**Repository-external hard dependency for the asset budget gate:**
- Issue: `viewers/README.md` calls the budget-HUD viewer "the gate every asset must pass" and links to
  `../../08-tools/600-billion-viewer.html`, a path outside this repository.
- Files: `viewers/README.md`, `packages/assets-pipeline/HANDOFF.md`, `BUILD-BRIEF.md` §6.2.
- Impact: A fresh clone cannot run the mandatory asset gate; the check is unenforceable in CI.
- Fix approach: Vendor the viewer into `viewers/` (it is a single HTML file) or replace the manual gate
  with a scripted budget assertion in the asset pipeline that CI can run.

## Known Bugs

No defect with reproducible failing behaviour was identified in the inspected source. The items in this
document are structural gaps, unwired subsystems, and stated-scope limitations rather than bugs. Two
places most likely to *become* bugs are recorded under **Fragile Areas**.

## Security Considerations

**Plaintext throwaway Nostr key in browser sessionStorage:**
- Risk: The demo signer generates an nsec and stores it unencrypted at `600b:demo:nsec`; anything in the
  page's JS context can read it.
- Files: `apps/web/src/identity/keyStore.ts`, `apps/web/src/config/safety.ts`.
- Current mitigation: Strong and explicit. `DEMO_WRITES_ENABLED` requires *both* `import.meta.env.DEV`
  and `VITE_ENABLE_DEMO_WRITES === "true"`, so production builds throw rather than sign
  (`apps/web/src/config/safety.ts`). `connectNip07` and `connectBunker` are deliberate throwing stubs.
  The header comment states keys are throwaway identities on test infrastructure holding no value.
- Recommendations: Keep the safe-off gate as the invariant when implementing NIP-07/NIP-46 behind the
  same surface; add a test in `apps/web/tests/security-smoke.ts` asserting the signer throws whenever
  either flag is absent, so the gate cannot regress silently.

**Public Colyseus room has no identity, only origin filtering:**
- Risk: `PalaceRoom.onAuth` (`apps/server/src/multiplayer/PalaceRoom.ts:77`) validates an exact origin
  allowlist and bounded join options. Origin headers are trivially forged by non-browser clients, so
  handles and avatars in the Street are unauthenticated and unattributable.
- Files: `apps/server/src/multiplayer/PalaceRoom.ts`, `apps/server/src/multiplayer/server.ts`,
  `packages/multiplayer/src/index.ts`.
- Current mitigation: The room is deliberately volatile — `MAX_ROOM_CLIENTS = 64`, 20 Hz movement window
  plus `ABSOLUTE_MESSAGES_PER_SECOND = 40`, sequence/distance budgets, `INVALID_MOVEMENT_LIMIT = 5`,
  policy close code 4008, and state destroyed in `onDispose` (`apps/server/src/multiplayer/PalaceRoom.ts:165`).
  `apps/server/README.md` states a session/handle is not durable identity or authorship.
- Recommendations: Preserve the boundary. Do not add ownership, inventory, or home data to
  `PalaceRoomState` (`packages/multiplayer/src/index.ts:114`) before signed admission exists; when it
  does, derive it from `packages/identity` rather than trusting join options.

**Browser-side audit chain is self-attested:**
- Risk: `apps/web/src/audit/indexedDbAudit.ts` maintains a hash-linked stream inside IndexedDB. The
  device owns both the data and the head, so a local actor can rewrite the entire chain consistently.
- Files: `apps/web/src/audit/indexedDbAudit.ts`, `apps/web/src/builder/store.ts`,
  `apps/web/src/character/store.ts`.
- Current mitigation: Correct for its current purpose — local-first, single-player Home/builder state
  with atomic write + head update in one transaction (`apps/web/src/audit/indexedDbAudit.ts:143`).
- Recommendations: Never treat a browser stream as evidence server-side. When Home state becomes
  shareable, sign each event with the user key and re-verify on the server through
  `apps/server/src/db/auditStore.ts`.

**Server-side SSRF surface is the podcast feed proxy:**
- Risk: `GET /api/podcasts/feed` fetches attacker-supplied URLs on behalf of clients.
- Files: `apps/server/src/api/podcasts.ts`, `apps/server/src/app.ts`, `apps/server/src/rateLimit.ts`.
- Current mitigation: Unusually thorough for the project's stage — DNS pinning, private-address blocking,
  per-hop redirect revalidation (`PODCAST_FEED_MAX_REDIRECTS`), MIME and byte ceilings
  (`PODCAST_FEED_MAX_BYTES`), total timeout, per-IP token bucket, and per-IP plus global concurrency
  caps; wildcard `CORS_ORIGINS` is rejected outright by `loadServerConfig`.
- Recommendations: Any new outbound-fetch endpoint must reuse `fetchFeed`'s guard chain rather than
  calling `fetch` directly; keep the boundary matrix in `apps/server/test/podcasts.test.ts` growing with it.

**Direct browser-to-relay and third-party fetches bypass the server boundary:**
- Risk: `apps/web/src/net/` connects the browser straight to five public relays plus SoundHelix, Citadel
  Wire and LNURL endpoints, exposing client IPs and interest graphs to third parties.
- Files: `apps/web/src/net/nostrConfig.ts`, `apps/web/src/net/media.ts`, `apps/web/src/net/clownNews.ts`,
  `apps/web/src/net/lightning.ts`.
- Current mitigation: All reads are public and keyless; writes are gated by `DEMO_WRITES_ENABLED` and
  real payment handoff by `REAL_PAYMENTS_ENABLED` (`apps/web/src/config/safety.ts`).
- Recommendations: Document this as intended (open-protocol client) in the deployment notes, or proxy the
  non-Nostr HTTPS reads through the existing hardened server path as the feed proxy already does.

**No secret material is committed:**
- Risk: Low. Only `apps/web/.env.example` and `apps/server/.env.example` exist; `.gitignore` excludes
  `.env` and `.env.*` while allow-listing `!.env.example`, and `*.db`/`*.sqlite`/`*.sqlite3` are excluded.
- Files: `.gitignore`, `apps/web/.env.example`, `apps/server/.env.example`.
- Current mitigation: As above; the SQLite audit file also defaults outside the worktree
  (`resolveAuditDatabasePath` in `apps/server/src/db/auditStore.ts`).
- Recommendations: Keep the `.gitkeep`/`.env.example` discipline; no action required.

## Performance Bottlenecks

**Mobile 30 FPS budget (`CLAUDE.md` §6) is not measured anywhere:**
- Problem: The invariant requires `InstancedMesh` + LOD + clustering and a hard frame budget, but no
  benchmark, budget assertion, or profiling harness exists in the repo, and the asset budget HUD lives
  outside it (`viewers/README.md`).
- Files: `apps/web/src/scene/PalaceScene.tsx`, `apps/web/src/scene/Vegetation.tsx` (518 lines),
  `apps/web/src/scene/Plaza.tsx` (533 lines), `apps/web/src/scene/StreetWorld.tsx` (551 lines).
- Cause: Scene population is data-driven from deterministic layout modules, but nothing gates a
  regression in draw calls or triangle count at review time.
- Improvement path: Add a headless budget check to the asset pipeline (triangles/meshes/draw calls per
  GLB) and record measured frame timings per world in `docs/STREET-HANDOFF.md` so drift is visible.
  Note `docs/adr/0007-desktop-web-and-separate-mobile-apps.md` scopes `apps/web` to desktop, so the
  30 FPS budget currently binds the asset pipeline and the future mobile client, not this client.

**Development-only UI shipped in the production bundle:**
- Problem: `leva` 0.10.0 is a runtime dependency and `Leva` is imported by the world root, so the debug
  panel library is bundled for every user.
- Files: `apps/web/package.json`, `apps/web/src/scene/PalaceScene.tsx:13`.
- Cause: Convenience during scene tuning.
- Improvement path: Gate the import behind `import.meta.env.DEV` with a dynamic `import()`, or move
  `leva` to `devDependencies` and render a null shim in production builds.

**Single-process, single-room realtime tier:**
- Problem: `PalaceRoom` enforces one live room per process via a static field, and there is no shared
  presence/driver, so the Street cannot span processes.
- Files: `apps/server/src/multiplayer/PalaceRoom.ts` (`static #activeRoomId`),
  `apps/server/src/multiplayer/server.ts`, `packages/multiplayer/src/index.ts` (`MAX_ROOM_CLIENTS = 64`).
- Cause: Intentional simplicity for the current stage, consistent with
  `docs/adr/0009-public-realtime-street.md`.
- Improvement path: See **Scaling Limits** below.

## Fragile Areas

**`apps/web/src/net/multiplayer.ts` (774 lines) — reconnect and snapshot lifecycle:**
- Files: `apps/web/src/net/multiplayer.ts`, `apps/web/src/scene/PalaceScene.tsx:694`.
- Why fragile: It owns connect/reconnect backoff, the 10 Hz send gate, schema-change observation, render
  snapshot copying, and teardown, and it is created inside a `useEffect` in a 1,434-line component. A
  missed cleanup path leaks a socket or replays stale poses.
- Safe modification: Change the wire contract in `packages/multiplayer/src/index.ts` first, then the
  server authority in `apps/server/src/multiplayer/PalaceRoom.ts`, then the client — and extend all three
  test layers (`packages/multiplayer/test/`, `apps/server/test/multiplayer.test.ts`,
  `apps/web/tests/multiplayer-smoke.ts`). Bump `MULTIPLAYER_PROTOCOL_VERSION` for any breaking change.
- Test coverage: Good for this file specifically — `apps/web/tests/multiplayer-smoke.ts` is 507 lines with
  hand-written room fakes, and `apps/server/test/multiplayer.test.ts` is 573 lines against a real listener.

**`apps/server/src/db/auditStore.ts` (897 lines) — append-only invariants encoded in SQL triggers:**
- Files: `apps/server/src/db/auditStore.ts`, `apps/server/src/db/canonicalJson.ts`.
- Why fragile: Correctness depends on the interaction of embedded migration SQL
  (`apps/server/src/db/auditStore.ts:41`), update/delete-prohibiting triggers, a compare-and-swap append
  inside one immediate transaction (`:246`), and byte-exact canonical JSON. A canonicalization change
  invalidates every stored hash.
- Safe modification: Add a new numbered migration; never edit `MIGRATION_1`. Treat
  `canonicalizeJson` as a frozen protocol shared with `packages/shared/src/json.ts` and
  `packages/ownership/src/index.ts`. Keep the fixed regression vectors in
  `apps/server/test/auditStore.test.ts` and add one per format change.
- Test coverage: Strong — real SQLite files in temp dirs, restart, trigger and tamper-detection cases.

**`godot/tests/smoke.gd` (816 lines) is the only gate for the entire Godot surface:**
- Files: `godot/tests/smoke.gd`, `godot/scripts/main.gd`.
- Why fragile: One monolithic pass/fail script covers autoloads, world construction, economy, building,
  persistence, UI, input gating and Meaningverse authority. The first `_check` failure short-circuits, so
  a break early in the file hides everything after it.
- Safe modification: Add new checks as separate functions with distinct reason strings and keep
  `HOME_NAME = "smoke"` isolation so `user://` state never leaks between runs.
- Test coverage: Broad but coarse-grained; there is no per-module GDScript unit layer.

## Scaling Limits

**Realtime Street:**
- Current capacity: 64 concurrent clients in exactly one room in one Node process
  (`MAX_ROOM_CLIENTS` in `packages/multiplayer/src/index.ts:10`; `static #activeRoomId` in
  `apps/server/src/multiplayer/PalaceRoom.ts`), 100 ms patch rate, 36 ship modules
  (`MAX_SHIP_MODULES`).
- Limit: A second process cannot host a second Street shard — a duplicate room throws
  `MATCHMAKE_UNHANDLED` only within its own process, and there is no cross-process presence.
- Scaling path: Introduce a Colyseus presence/driver (Redis) plus world-sharded room IDs, and replace the
  static singleton with a matchmaking filter. `infra/HOSTING.md` records Redis as a future option; it is
  not a current dependency.

**HTTP tier:**
- Current capacity: `SERVER_MAX_CONNECTIONS` default 256; per-IP feed concurrency 2; global 32
  (`apps/server/src/app.ts`, `apps/server/README.md`).
- Limit: Rate-limit state is in-process memory (`apps/server/src/rateLimit.ts`, LRU-evicted at
  `PODCAST_FEED_RATE_MAX_ENTRIES` = 10,000), so limits are per-instance and reset on restart.
- Scaling path: Move buckets to a shared store before running more than one API instance behind a proxy.

**Durable storage:**
- Current capacity: One synchronous `better-sqlite3` handle in one process
  (`apps/server/src/db/auditStore.ts`), opened by `apps/server/src/index.ts`.
- Limit: Synchronous SQLite blocks the event loop under heavy append load and cannot be shared across
  processes for writes.
- Scaling path: The SQLite→Postgres migration is already the stated global standard (`CLAUDE.md`) and is
  noted in `infra/HOSTING.md`; keep all SQL behind `AuditStore` so the swap is one module.

**Repository weight:**
- Current capacity: 53 MB of tracked content across 512 files; the largest single file is
  `apps/web/public/avatar/sample.vrm` at 10.8 MB.
- Limit: Binary art dominates history — `apps/web/public/palace.glb` and `godot/assets/palace.glb` are
  byte-identical 2.1 MB duplicates, as are `apps/web/public/ne_110m_admin_0_countries.geojson` and
  `godot/assets/world/countries.geojson` (839 KB each); `art/blender/*.blend1` are committed Blender
  backup files.
- Scaling path: `BUILD-BRIEF.md` §2 already specifies content-hashed assets on a CDN with a JSON
  manifest. Until then, at minimum drop the `.blend1` backups and de-duplicate the shared GLB/GeoJSON.

## Dependencies at Risk

**`@napplet/sdk` / `@napplet/vite-plugin` / `@napplet/conformance-cli` (0.x):**
- Risk: The NIP-5D napplet toolchain is pre-1.0 (`^0.24.4`, `^0.11.3`, `^0.2.15`) and the surrounding NIP
  is itself young; breaking changes are likely.
- Impact: `napplets/feed/` and `napplets/map/` builds and manifests; `packages/napplet-kit/src/nap.ts`.
- Migration plan: The existing insulation is the right one — keep every SDK call inside
  `packages/napplet-kit/src/nap.ts` so a version bump touches one file, and keep the fail-soft wrappers
  so a missing domain degrades instead of throwing.

**Colyseus 0.17 across three packages:**
- Risk: `@colyseus/core` ^0.17.44, `@colyseus/ws-transport` ^0.17.13, `@colyseus/sdk` ^0.17.43 and
  `@colyseus/schema` ^4.0.27 must move together; schema encoding is version-sensitive.
- Impact: `apps/server/src/multiplayer/`, `apps/web/src/net/multiplayer.ts`, `packages/multiplayer/`.
- Migration plan: Upgrade all four in one commit, bump `MULTIPLAYER_PROTOCOL_VERSION`
  (`packages/multiplayer/src/index.ts:3`), and run `apps/server/test/multiplayer.test.ts` against real
  SDK clients before merging.

**`better-sqlite3` native binary:**
- Risk: Native module requiring a prebuild or toolchain per Node version and platform; explicitly
  allow-listed in `pnpm-workspace.yaml` (`allowBuilds`).
- Impact: Server install and CI on any new platform or Node major.
- Migration plan: Pin the Node major via `.nvmrc` (currently 22) and treat a Node upgrade as a
  coordinated change; the `AuditStore` seam already isolates the driver.

**Pinned transitive override `set-cookie-parser: 3.1.1`:**
- Risk: A root `pnpm.overrides` pin (`package.json`) freezes a transitive dependency; it will not receive
  upstream fixes automatically.
- Impact: Whatever resolves through it in the Colyseus/Express tree.
- Migration plan: Re-check whether the pin is still needed at each Colyseus upgrade and remove it when the
  upstream constraint is gone.

**Godot 4.7 exact-version coupling:**
- Risk: CI installs Godot `4.7.0` explicitly (`.github/workflows/ci.yml`) and `godot/project.godot`
  declares `config/features=PackedStringArray("4.7")`; `.import`/`.uid` sidecars are committed.
- Impact: The whole `godot/` surface; an engine bump regenerates import metadata.
- Migration plan: Bump the CI pin and `project.godot` together, re-run `--import`, and commit the
  regenerated sidecars as one reviewable change.

**Optional external `hermes` executable:**
- Risk: `services/world-agent/src/world_agent/kerni.py` shells out to a local `hermes` binary that is not
  declared, versioned, or installed by this repo.
- Impact: Only the opt-in `--backend hermes` path.
- Migration plan: None needed — the deterministic fallback is the default and selector failures fall back
  without raising (proven by `services/world-agent/tests/test_kerni.py`). Keep it that way.

## Missing Critical Features

Ordered by the dependency chain in `BUILD-BRIEF.md` §6. `README.md` §Status marks these ⏳.

**The timelock itself (the product's core primitive):**
- Problem: No Boltz, LNbits, bitcoind, LND or CLN client exists anywhere in the repo; there is no swap,
  no CLTV script construction, no server-independent claim path.
- Blocks: `BUILD-BRIEF.md` §6 items 11–12; every ownership, growth and prestige mechanic downstream.

**Authenticated command boundary:**
- Problem: No route, message, or worker can mutate durable state; `apps/server/src/app.ts` is read-only.
- Blocks: Wiring `packages/ownership`, seal identity (`BUILD-BRIEF.md` §6.10), and any economy that
  outlives a browser profile.

**Reconcile jobs and raw webhook storage:**
- Problem: `apps/server/src/worker/` is empty; `BUILD-BRIEF.md` §2 calls reconcile jobs mandatory and
  requires provider webhooks stored raw.
- Blocks: Trustworthy chain/LN/relay state; without it any adapter integration is trust-and-forget.

**Real chat and voice transport:**
- Problem: `apps/web/src/net/chat.ts` and `apps/web/src/net/voice.ts` are local mocks;
  `VITE_VOICE_BACKEND`, `VITE_LIVEKIT_URL` and `VITE_HIVETALK_URL` are read but every path falls back to
  the mock, with the real join marked `TODO(infra)` (`apps/web/src/net/voice.ts:112`, `:129`).
- Blocks: `docs/adr/0002-chat-and-voice-transport.md` and `docs/adr/0005-voice-backends-hivetalk.md`.

**Yjs persistent shared state:**
- Problem: Named in `BUILD-BRIEF.md` §2 and `docs/adr/0001-stack-and-runtime-topology.md`; not installed
  in any manifest. Shared state today is either volatile Colyseus or device-local IndexedDB.
- Blocks: `BUILD-BRIEF.md` §6.8 and any collaborative building outside a single session.

**Content-hashed asset manifest and CDN delivery:**
- Problem: `CLAUDE.md` §5 requires immutable content-hashed files; assets are currently plain paths under
  `apps/web/public/` and `godot/assets/` with no hash, manifest, or LOD chain.
- Blocks: `BUILD-BRIEF.md` §3 stream A, cache correctness, and the "art is static, state is data" audit story.

**Error tracking and observability:**
- Problem: No Sentry, OpenTelemetry, or structured logger in any manifest; the server logs lifecycle text
  to stdout (`apps/server/src/index.ts`) and the browser has no central logger.
- Blocks: Diagnosing anything in the deployed pre-alpha.

**Deployment automation:**
- Problem: `infra/` contains only documentation (`infra/HOSTING.md`, `infra/LAN-PLAYTEST.md`,
  `infra/README.md`). There is no Dockerfile, Caddyfile, systemd unit, or deploy job in
  `.github/workflows/ci.yml`.
- Blocks: Reproducible hosting of the documented VPS + Caddy target.

## Test Coverage Gaps

**All React/r3f components — zero rendering coverage:**
- What's not tested: Every `.tsx` file under `apps/web/src/`. The 18 web tests are `tsx`-executed Node
  scripts asserting pure modules (`apps/web/tests/street-layout.test.ts`,
  `apps/web/tests/map-search-smoke.ts`, `apps/web/tests/furniture-catalog-smoke.ts`, …); there is no
  jsdom, Vitest, Testing Library, or browser runner in `apps/web/package.json`.
- Files: `apps/web/src/frontend/GameFrontend.tsx`, `apps/web/src/scene/PalaceScene.tsx`,
  `apps/web/src/ui/*.tsx`, `apps/web/src/scene/*.tsx`.
- Risk: Screen routing, gating, effect cleanup and HUD regressions reach users unnoticed; only a manual
  playtest catches them.
- Priority: High — this is the largest untested surface in the repository.

**Napplet conformance never runs in CI:**
- What's not tested: NIP-5D artifact conformance. `napplets/map/package.json` and
  `napplets/feed/package.json` expose `test:conformance`, but the script is not named `test`, so
  `pnpm -r --if-present test` skips it and `.github/workflows/ci.yml` never invokes it. Playwright is a
  declared devDependency with no spec files present.
- Files: `napplets/map/package.json`, `napplets/feed/package.json`, `package.json`,
  `.github/workflows/ci.yml`.
- Risk: A napplet can ship a manifest or sandbox violation that only the external shell discovers.
- Priority: High — cheap to fix; add a `napplets` CI job running `pnpm --filter '@600b/napplet-*' test:conformance`.

**`packages/napplet-kit` has no tests at all:**
- What's not tested: `boot` failure paths, capability detection, and every fail-soft wrapper — the exact
  logic that keeps napplets portable across shells with missing domains.
- Files: `packages/napplet-kit/src/boot.ts`, `packages/napplet-kit/src/nap.ts`,
  `packages/napplet-kit/src/dom.ts`, `packages/napplet-kit/src/theme.ts`,
  `packages/napplet-kit/src/format.ts` (no `test/` directory; no `test` script in its `package.json`).
- Risk: A regression in the guard layer turns an absent optional domain into a hard crash in every napplet.
- Priority: High.

**No coverage measurement anywhere:**
- What's not tested: Unknown — no c8, nyc, `--experimental-test-coverage`, or pytest-cov configuration
  exists in `package.json`, `services/world-agent/pyproject.toml`, or `.github/workflows/ci.yml`.
- Files: `package.json`, `services/world-agent/pyproject.toml`, `.github/workflows/ci.yml`.
- Risk: Gaps like the three above stay invisible until someone reads every manifest.
- Priority: Medium — add `node --test --experimental-test-coverage` for the server/packages first.

**Asset-pipeline scripts are effectively untested:**
- What's not tested: All 18 Blender scripts under `packages/assets-pipeline/blender/` and the prop
  fetcher. The only test is `packages/assets-pipeline/avatar/synth_normals.test.mjs`; Ruff lints the
  Python but nothing executes it.
- Files: `packages/assets-pipeline/blender/*.py`, `packages/assets-pipeline/props/fetch_props.mjs`,
  `tooling/blender/*.py`, `tooling/scripts/*.py`.
- Risk: A pipeline change silently corrupts geometry; failures surface only as visual defects.
- Priority: Medium — the scripts require Blender, so gate them behind an opt-in CI job rather than the
  default matrix.

**Cross-surface parity is unverified:**
- What's not tested: That `apps/web/src/builder/economy.ts` and `godot/scripts/economy.gd` (or the two
  catalogs, or the two Meaningverse loops) agree on any value.
- Files: `apps/web/src/builder/`, `godot/scripts/`, `apps/web/src/meaningverse/`, `godot/scripts/moc/`.
- Risk: The two clients drift into different games without any signal.
- Priority: Medium — a shared JSON fixture asserted by both `apps/web/tests/` and `godot/tests/smoke.gd`
  would close it cheaply.

**`tooling/video/test_upscale_grok_video.py` runs in no suite:**
- What's not tested: It exists but sits outside pytest `testpaths` (`services/world-agent/pyproject.toml`)
  and outside the root pnpm command, so it executes only if invoked by hand.
- Files: `tooling/video/test_upscale_grok_video.py`, `services/world-agent/pyproject.toml`.
- Risk: Low — auxiliary tooling only.
- Priority: Low.

---

*Concerns audit: 2026-07-26*
