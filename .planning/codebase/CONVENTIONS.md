# Coding Conventions

**Analysis Date:** 2026-07-26

## Naming Patterns

**Files:**
- Use `PascalCase.tsx` for React components and scene objects, such as `apps/web/src/frontend/GameFrontend.tsx`, `apps/web/src/scene/PalaceScene.tsx`, and `apps/web/src/ui/ChatPanel.tsx`.
- Use `camelCase.ts` for TypeScript behavior, stores, utilities, and adapters, such as `apps/web/src/builder/buildState.ts`, `apps/web/src/audit/indexedDbAudit.ts`, and `apps/server/src/db/auditStore.ts`.
- Keep TypeScript tests in a dedicated `test/` or `tests/` tree; use `*.test.ts`/`*.test.mjs` for runner-based tests and `*-smoke.ts` for executable smoke contracts, as shown by `apps/server/test/server.test.ts`, `packages/ownership/test/ownership.test.mjs`, and `apps/web/tests/builder-smoke.ts`.
- Use `snake_case.py` and `test_*.py` for Python modules and tests, as in `services/world-agent/src/world_agent/agent.py` and `services/world-agent/tests/test_kerni.py`.
- Use `snake_case.gd` for GDScript modules, with generated Godot UID companions alongside them, as in `godot/scripts/magnet_controller.gd` and `godot/scripts/magnet_controller.gd.uid`.
- Name ADRs with a zero-padded sequence and descriptive kebab-case suffix, as in `docs/adr/0006-colyseus-authoritative-realtime-boundary.md`.

**Functions:**
- Use verb-led `camelCase` for TypeScript functions and methods: `loadServerConfig`, `createPodcastServer`, `verifyBranch`, and `selectActivityIdsForLens` in `apps/server/src/app.ts`, `packages/ownership/src/index.ts`, and `packages/shared/src/palace.ts`.
- Use `PascalCase` for React components and classes, and `useCamelCase` for hooks, as shown by `MatrixField`, `GameFrontend`, and `useEconomy` in `apps/web/src/frontend/GameFrontend.tsx` and `apps/web/src/builder/economy.ts`.
- Use `snake_case` for Python functions and methods, including private helpers with a leading underscore, as shown by `resolve_template`, `build_parser`, and `_send_json` in `services/world-agent/src/world_agent/kerni.py` and `services/world-agent/src/world_agent/server.py`.
- Use `snake_case` for GDScript functions; reserve a leading underscore for callbacks, engine lifecycle methods, and internal helpers, as in `_ready`, `_register_actions`, and `_set_space` in `godot/scripts/main.gd` and `godot/scripts/game.gd`.
- Follow the repository's verb–noun–qualifier semantic order where natural; render it in each language's native casing, as required by `CLAUDE.md` and demonstrated by `resolveAuditDatabasePath` in `apps/server/src/db/auditStore.ts` and `world_input_blockers_snapshot` in `godot/scripts/game.gd`.

**Variables:**
- Use `camelCase` for TypeScript local variables, parameters, properties, and object fields unless a persisted cross-runtime contract already uses snake case; compare `currentOrigin` in `apps/web/src/net/multiplayer.ts` with persisted `recipe_id` and `rot_y` in `apps/web/src/builder/store.ts`.
- Use `UPPER_SNAKE_CASE` for module constants in TypeScript and Python, as in `MAX_RECONNECT_DELAY_MS` in `apps/web/src/net/multiplayer.ts` and `MAX_BODY_BYTES` in `services/world-agent/src/world_agent/server.py`.
- Use `snake_case` for Python locals and attributes, as in `raw_length`, `allowed_templates`, and `server_version` in `services/world-agent/src/world_agent/server.py` and `services/world-agent/src/world_agent/kerni.py`.
- Use `snake_case` for GDScript variables and `UPPER_SNAKE_CASE` for constants; prefix private state with `_`, as in `_world_input_blockers` and `AMBIENT_MIN_SEC` in `godot/scripts/game.gd` and `godot/scripts/net/chat_transport.gd`.
- Preserve domain identifiers exactly across boundaries, including structured lower-case values such as `asset.status_changed`, `builder:home:test`, and `palace.session.enter` in `apps/server/src/db/auditStore.ts`, `apps/web/src/builder/store.ts`, and `packages/shared/src/palace.ts`.

**Types:**
- Use `PascalCase` for TypeScript interfaces, type aliases, classes, and discriminated unions, as in `ServerConfig`, `AuditVerifyResult`, `PalaceHandoff`, and `PalaceMultiplayerTransport` in `apps/server/src/app.ts`, `apps/server/src/db/auditStore.ts`, `packages/shared/src/palace.ts`, and `apps/web/src/net/multiplayer.ts`.
- Prefer explicit domain types and template-literal IDs over unstructured strings at package boundaries, as in `GuildId`, `ActivityId`, and `EntityId` in `packages/shared/src/palace.ts` and `packages/identity/src/index.ts`.
- Mark immutable protocol data `readonly` and use readonly arrays/sets at truth boundaries, as in `OwnershipEvent` in `packages/ownership/src/index.ts` and `ServerConfig` in `apps/server/src/app.ts`.
- Use frozen dataclasses for immutable Python value objects, as demonstrated by `Proposal` in `services/world-agent/src/world_agent/agent.py`.
- Add explicit GDScript parameter and return types, including typed arrays when practical, as in `set_world_input_blocked(source: StringName, blocked: bool) -> void` in `godot/scripts/game.gd` and `channel_ids() -> Array[String]` in `godot/scripts/net/chat_transport.gd`.

## Code Style

**Formatting:**
- Run `pnpm format`; Biome formats JavaScript, TypeScript, TSX, JSON, and supported workspace text with two spaces, double quotes, semicolons, and a 100-column width from `package.json` and `biome.json`.
- Keep UTF-8, LF endings, a final newline, trimmed trailing whitespace, two-space indentation, and a 100-column limit from `.editorconfig`; Markdown retains intentional trailing whitespace via `.editorconfig`.
- Format Python with Ruff at four spaces and 100 columns; the active service settings are in `services/world-agent/pyproject.toml`, and the pre-commit scope also covers `packages/assets-pipeline/**/*.py` through `.pre-commit-config.yaml`.
- Keep Godot GDScript tab-indented and typed; this is explicit in `godot/ARCHITECTURE.md` and visible in `godot/scripts/game.gd` and `godot/tests/smoke.gd`.
- Do not apply Biome formatting to its explicit exclusions: `services/world-agent`, `assets-incoming`, `600BillionCWO`, or generated `napplets/map/src/world.ts`, as configured in `biome.json`.

**Linting:**
- Run `pnpm lint` for Biome's recommended rule set across the non-excluded repository; the command and rule selection live in `package.json` and `biome.json`.
- Run `pnpm typecheck` in addition to linting; strict TypeScript is configured in `tsconfig.base.json` with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `isolatedModules`, and `verbatimModuleSyntax`.
- Run `uv run ruff check .` and `uv run ruff format --check .` inside `services/world-agent`; Ruff selects `E`, `F`, `I`, `UP`, and `B` in `services/world-agent/pyproject.toml`.
- Keep asset-pipeline Python compatible with the world-agent Ruff environment; CI and pre-commit run Ruff against `packages/assets-pipeline` from `.github/workflows/ci.yml` and `.pre-commit-config.yaml`.
- Treat Godot headless import as the parse/static validation gate and the custom smoke as the behavior gate; no separate GDScript linter or formatter is configured in `.github/workflows/ci.yml` or `godot/project.godot`.
- Respect the local pre-commit file scopes: Biome triggers for `apps/`, `packages/`, and root package/lock/config files, while Ruff triggers for world-agent and asset-pipeline Python in `.pre-commit-config.yaml`.

## Import Organization

**Order:**
1. Put platform built-ins first in Node-targeted files, such as `node:crypto`, `node:fs`, and `node:path` in `apps/server/src/db/auditStore.ts` and `apps/server/test/auditStore.test.ts`.
2. Put third-party and workspace-package imports next, separating groups with a blank line in Node/server modules, as shown by `@600b/shared` and `better-sqlite3` in `apps/server/src/db/auditStore.ts`.
3. Put relative imports last, as shown by `./canonicalJson.js` in `apps/server/src/db/auditStore.ts` and `../src/app.js` in `apps/server/test/server.test.ts`.
4. Keep side-effect stylesheet imports adjacent to the modules they support in browser entry modules, as in `leaflet/dist/leaflet.css` and `./frontend.css` in `apps/web/src/frontend/GameFrontend.tsx`.
5. Separate Python standard-library imports from local package imports, and place `from __future__ import annotations` immediately after the module docstring, as in `services/world-agent/src/world_agent/server.py`.
6. Preload GDScript dependencies as top-level `const ... := preload(...)` declarations and use `res://` paths, as in `godot/scripts/main.gd` and `godot/tests/smoke.gd`.

**Path Aliases:**
- Import shared workspace packages through their public `@600b/*` names, such as `@600b/shared`, `@600b/multiplayer`, and `@600b/ownership` in `apps/server/src/app.ts`, `apps/web/src/net/multiplayer.ts`, and `packages/ownership/test/ownership.test.mjs`.
- Use relative imports inside an app or package; there is no general `@/` source alias in `tsconfig.base.json` or `apps/web/tsconfig.json`.
- Preserve the single web compiler path mapping for `ecctrl` in `apps/web/tsconfig.json`; do not generalize it into an app-wide alias.
- Include `.js` in local ESM specifiers compiled under NodeNext, as in `apps/server/src/app.ts` and `apps/server/src/db/auditStore.ts`; browser modules under `apps/web/src` generally use bundler-resolved extensionless paths, as in `apps/web/src/builder/store.ts`.
- Resolve Python imports from the `src` layout using the package name `world_agent`, as configured by `pythonpath = ["src"]` in `services/world-agent/pyproject.toml` and used in `services/world-agent/tests/test_kerni.py`.

## Error Handling

**Patterns:**
- Validate untrusted input at module boundaries and fail closed with precise messages or structured codes, as in `loadServerConfig` in `apps/server/src/app.ts`, `validateAppendInput` in `apps/server/src/db/auditStore.ts`, and `KerniTemplateRequest.from_mapping` exercised by `services/world-agent/tests/test_kerni.py`.
- Use discriminated result unions for expected verification failure instead of throwing, as in `VerifyResult` from `packages/ownership/src/index.ts` and `AuditVerifyResult` from `apps/server/src/db/auditStore.ts`.
- Reserve custom exceptions for invalid API use, integrity violations, and transactional conflicts, as in `OwnershipEncodingError` in `packages/ownership/src/index.ts` and `AuditConflictError`, `AuditInputError`, and `AuditIntegrityError` in `apps/server/src/db/auditStore.ts`.
- Catch narrowly at transport/storage boundaries, clean up in `finally`, and degrade only where the feature contract permits it; examples are IndexedDB closure in `apps/web/src/builder/store.ts`, abort/listener release in `apps/server/src/app.ts`, and socket cleanup in `apps/web/src/net/multiplayer.ts`.
- Return stable HTTP error bodies of `{ error: { code, message } }` through one helper rather than ad hoc responses, as implemented by `sendError` in `apps/server/src/app.ts`.
- Keep browser-optional facilities safe-off or non-fatal when unavailable; storage failures return `null` or allow later retries in `apps/web/src/builder/store.ts`, while malformed multiplayer messages are ignored or produce authoritative correction in `apps/web/src/net/multiplayer.ts` and `apps/server/src/multiplayer/PalaceRoom.ts`.
- In Python, catch only the protocol/decoding exceptions that map to a client error and close resources in `finally`, as in `services/world-agent/src/world_agent/server.py`.
- In GDScript, return neutral values after `push_error`/`push_warning` for missing files or assets, as in `godot/scripts/store.gd`, `godot/scripts/world/palace_world.gd`, and `godot/scripts/ui/world_map.gd`.

## Logging

**Framework:** Language-native logging only; no shared TypeScript logging dependency is configured in `package.json` or `apps/server/package.json`.

**Patterns:**
- Keep browser console output exceptional and operational; the web client uses `console.info` for explicit voice-backend fallback in `apps/web/src/net/voice.ts`, while executable smoke tests print progress in `apps/web/tests`.
- Use Python's `logging.getLogger(__name__)` and parameterized logger calls, never `print()`, in service code under `services/world-agent/src/world_agent/agent.py` and `services/world-agent/src/world_agent/server.py`.
- Allow direct `print()` in Blender/CLI asset tooling where stdout is the command protocol, as in `packages/assets-pipeline/blender/gameify.py` and `packages/assets-pipeline/avatar/make_normal_map.py`; do not copy that exception into `services/world-agent/src/world_agent`.
- Use `push_warning` for recoverable Godot asset/data absence, `push_error` for broken contracts, and `print` for deterministic smoke/capture markers, as in `godot/scripts/world/palace_world.gd`, `godot/scripts/moc/leviathan_assembly.gd`, `godot/scripts/main.gd`, and `godot/tests/smoke.gd`.
- Never log private key material; the prohibition is documented directly on `EntityKey.privHex` in `packages/identity/src/index.ts`.

## Comments

**When to Comment:**
- Explain architectural invariants, security boundaries, lifecycle races, and performance choices rather than restating syntax, as in the transport notes in `apps/web/src/net/multiplayer.ts`, audit transaction notes in `apps/server/src/db/auditStore.ts`, and renderer budget notes in `apps/web/vite.config.ts`.
- Keep cross-runtime contract comments beside persisted shapes and protocol fields, as in `apps/web/src/builder/store.ts`, `packages/shared/src/palace.ts`, and `godot/scripts/net/chat_transport.gd`.
- Mark intentional catches and fallback behavior inside the catch block, as in `apps/web/src/builder/store.ts`, `apps/web/src/net/multiplayer.ts`, and `packages/identity/src/index.ts`.
- Use comments in tests to divide contract scenarios and state why a regression matters, as in `apps/web/tests/avatar-roster.test.ts`, `apps/server/test/multiplayer.test.ts`, and `godot/tests/smoke.gd`.

**JSDoc/TSDoc:**
- Add `/** ... */` documentation to exported protocol functions, classes, and non-obvious domain types, as in `packages/ownership/src/index.ts`, `packages/shared/src/palace.ts`, and `apps/server/src/db/auditStore.ts`.
- Keep short public-function comments to one line when the contract is simple; use multi-line blocks when authority, hashing, or lifecycle semantics require detail, as demonstrated by `verifyBranch` in `packages/ownership/src/index.ts` and `PalaceMultiplayerTransport` in `apps/web/src/net/multiplayer.ts`.
- Use module/class/function docstrings in Python and keep public signatures typed, as in `services/world-agent/src/world_agent/agent.py` and `services/world-agent/src/world_agent/server.py`.
- Use `##` documentation comments for GDScript modules, public functions, signals, and contract fields; use `#` for local implementation notes, as in `godot/scripts/game.gd` and `godot/scripts/net/chat_transport.gd`.

## Function Design

**Size:** Keep validation and transformation functions focused and pure where possible, but allow orchestrators to compose local helpers when lifecycle must remain visible in one module; compare `parseIntegerSetting` in `apps/server/src/app.ts` with the transport orchestrator in `apps/web/src/net/multiplayer.ts` and the Godot smoke orchestrator in `godot/tests/smoke.gd`.

**Parameters:**
- Accept dependency objects and safe defaults at external boundaries so behavior is testable without network services, as in `createPodcastServer(config, dependencies)` in `apps/server/src/app.ts` and `AuditStore(options)` in `apps/server/src/db/auditStore.ts`.
- Use `unknown` for untrusted runtime input and narrow it with parsers before use, as in `parseMovementMessage` calls in `apps/server/src/multiplayer/PalaceRoom.ts` and URL/config validation in `apps/web/src/net/multiplayer.ts`.
- Use options objects for related configuration and positional parameters for small, stable math/value helpers, as in `AuditStoreOptions` in `apps/server/src/db/auditStore.ts` and `connectedParticipantCount` in `apps/web/src/net/multiplayer.ts`.
- Give Python and GDScript functions explicit parameter and return annotations in product code, as shown by `main() -> None` in `services/world-agent/src/world_agent/server.py` and `toggle_mode() -> void` in `godot/scripts/game.gd`.

**Return Values:**
- Return typed domain objects or discriminated results from verification/business logic, as in `verifyBranch` in `packages/ownership/src/index.ts` and `verifyStream` in `apps/server/src/db/auditStore.ts`.
- Use `null` for expected absence in TypeScript APIs and `boolean` for accepted/refused commands, as in `getHead` in `apps/server/src/db/auditStore.ts`, `loadHome` in `apps/web/src/builder/store.ts`, and `placeShipModule` in `apps/web/src/net/multiplayer.ts`.
- Return cleanup callbacks from subscriptions/effects and always remove listeners/timers, as in `subscribe` in `apps/web/src/net/multiplayer.ts` and React effects in `apps/web/src/frontend/GameFrontend.tsx`.
- Use neutral empty collections/objects only where the contract explicitly defines graceful absence, as in `propose()` in `services/world-agent/src/world_agent/agent.py` and GDScript loaders documented in `godot/ARCHITECTURE.md`.

## Module Design

**Exports:**
- Use named exports for TypeScript domain functions, types, and classes; package public APIs are collected through `src/index.ts`, as in `packages/ownership/src/index.ts`, `packages/identity/src/index.ts`, and `packages/shared/src/index.ts`.
- Keep app-internal helpers unexported unless tests or another module need a stable seam, as in private parsing/response helpers in `apps/server/src/app.ts` and exported deterministic transport helpers in `apps/web/src/net/multiplayer.ts`.
- Keep truth and protocol code in shared workspace packages rather than duplicating it between app surfaces; the ownership invariant and package location are explicit in `CLAUDE.md` and implemented by `packages/ownership/src/index.ts`.
- Keep external services behind app adapter/transport seams rather than importing them into domain state, as prescribed by `CLAUDE.md` and represented by `apps/server/src/adapters/`, `apps/web/src/net/`, and `godot/scripts/net/`.
- Keep React scene/UI modules declarative and move reusable deterministic calculations into plain `.ts` modules that executable tests can import, as shown by `apps/web/src/scene/streetLayout.ts`, `apps/web/src/frontend/mapSearch.ts`, and their tests under `apps/web/tests/`.
- Keep Godot code-first: `godot/scenes/Main.tscn` is the single scene file, while modules construct nodes procedurally from `godot/scripts/`, as defined in `godot/ARCHITECTURE.md`.

**Barrel Files:**
- Use package-root barrels only for stable workspace APIs, such as `packages/shared/src/index.ts`, `packages/ownership/src/index.ts`, and `packages/multiplayer/src/index.ts`.
- Import concrete files inside applications instead of creating broad app barrels, as demonstrated throughout `apps/web/src/frontend/GameFrontend.tsx` and `apps/server/src/app.ts`.
- Keep CSS as explicit side-effect exports/imports when it is part of a package surface, as in `packages/napplet-kit/package.json` and `napplets/map/src/main.ts`.

---

*Convention analysis: 2026-07-26*
