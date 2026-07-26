# Testing Patterns

**Analysis Date:** 2026-07-26

## Test Framework

**Runner:**
- The root TypeScript test command is pnpm recursive execution: `pnpm -r --if-present test` from `package.json`; each workspace package owns its runner and prerequisites.
- Server tests use Node's built-in `node:test` through `tsx --test`, with TypeScript source/test typechecks and a server build before execution, as configured in `apps/server/package.json` and `apps/server/tsconfig.test.json`.
- Shared TypeScript packages compile first and then run Node's built-in test runner against ESM `.mjs` tests, as configured in `packages/shared/package.json`, `packages/identity/package.json`, `packages/multiplayer/package.json`, and `packages/ownership/package.json`.
- The asset-pipeline JavaScript test uses `node --test avatar/*.test.mjs` without a preceding package build, as configured in `packages/assets-pipeline/package.json`.
- Web tests are 18 executable TypeScript scripts run sequentially with `tsx`; they use top-level assertions rather than `node:test`, as configured explicitly in `apps/web/package.json` and represented by `apps/web/tests/builder-smoke.ts` and `apps/web/tests/multiplayer-smoke.ts`.
- Python tests use pytest 8+ with `src` on `pythonpath` and `tests` as the discovery root, as configured in `services/world-agent/pyproject.toml`.
- Godot uses a custom headless smoke runner rather than a third-party test framework; `godot/scripts/main.gd` dispatches `--smoke` to `godot/tests/smoke.gd`.
- Napplet packages expose `test:conformance` scripts using `napplet-conformance`, but these scripts are not named `test` and therefore are not included by the root recursive command; see `napplets/map/package.json`, `napplets/feed/package.json`, and `package.json`.
- An auxiliary `unittest` suite exists at `tooling/video/test_upscale_grok_video.py`; it is outside the configured pytest `testpaths` in `services/world-agent/pyproject.toml` and outside the root pnpm test command in `package.json`.

**Assertion Library:**
- Use `node:assert/strict` for Node runner tests and most top-level web scripts, as in `apps/server/test/server.test.ts`, `packages/ownership/test/ownership.test.mjs`, and `apps/web/tests/indexeddb-audit.test.ts`.
- Small web smoke scripts may define a local named assertion that throws `Error("FAIL: ...")` and prints each passing check, as in `apps/web/tests/builder-smoke.ts` and `apps/web/tests/security-smoke.ts`.
- Use plain `assert` and `pytest.raises` in Python, as in `services/world-agent/tests/test_agent.py` and `services/world-agent/tests/test_kerni.py`.
- Use the `_check(condition, reason)` accumulator in the Godot smoke so the first failure becomes the process result, as in `godot/tests/smoke.gd`.

**Run Commands:**
```bash
pnpm test                                      # All workspace packages with a `test` script
pnpm --filter @600b/web test                   # All 18 web executable tests, sequential/fail-fast
pnpm --filter @600b/server test                # Server typechecks, build, then five node:test files
pnpm --filter @600b/ownership test             # Build and test the ownership package
pnpm --filter @600b/assets-pipeline test        # Asset-pipeline node:test suite
cd services/world-agent && uv run pytest        # Python service tests
cd services/world-agent && uv run pytest -q     # Quiet Python command documented by the service
pnpm --filter @600b/napplet-map test:conformance   # Build + napplet conformance (not root test)
pnpm --filter @600b/napplet-feed test:conformance  # Build + napplet conformance (not root test)
godot --headless --path godot --import         # Import/parse Godot project before smoke
godot --headless --path godot -- --smoke       # Godot custom end-to-end smoke
```
- Both Godot commands above are exactly the CI steps in `.github/workflows/ci.yml`; the Windows executable form (`Godot_v4.7-stable_win64_console.exe`) is documented in `godot/ARCHITECTURE.md`.
- `--smoke` is passed after `--` so Godot forwards it to the project; `godot/scripts/main.gd` reads it from `OS.get_cmdline_user_args()` and dispatches `godot/tests/smoke.gd`, which sets the process exit code.
- No repository test watch command is configured in `package.json`, `apps/web/package.json`, `apps/server/package.json`, or `services/world-agent/pyproject.toml`.
- No coverage command is configured in the package manifests, `services/world-agent/pyproject.toml`, or `.github/workflows/ci.yml`.

## Test File Organization

**Location:**
- Keep server tests separate under `apps/server/test/`, parallel to `apps/server/src/`; the current suite has five files, including `apps/server/test/auditStore.test.ts` and `apps/server/test/multiplayer.test.ts`.
- Keep web executable tests under `apps/web/tests/`; the current 18-file suite covers pure logic, security contracts, IndexedDB integration, source/asset invariants, and multiplayer transport behavior, as listed in `apps/web/package.json`.
- Keep package tests under each package's `test/` directory when they verify the compiled public package, as in `packages/ownership/test/ownership.test.mjs`, `packages/shared/test/package.test.mjs`, and `packages/identity/test/package.test.mjs`.
- Co-locate a narrow CLI test beside the script when the package command uses a local glob, as in `packages/assets-pipeline/avatar/synth_normals.test.mjs` beside `packages/assets-pipeline/avatar/synth_normals.mjs`.
- Keep Python tests under `services/world-agent/tests/`, separate from the `src/world_agent/` package, as configured in `services/world-agent/pyproject.toml`.
- Keep the Godot smoke under `godot/tests/` and load it through the real project entrypoint in `godot/scripts/main.gd`.
- Keep auxiliary tool tests beside their tool when they are not part of the product suite, as in `tooling/video/test_upscale_grok_video.py` beside `tooling/video/upscale_grok_video.py`.

**Naming:**
- Use `*.test.ts` for web scripts that are assertion/integration contracts and `*-smoke.ts` for broad executable contract checks, as in `apps/web/tests/indexeddb-audit.test.ts`, `apps/web/tests/avatar-roster.test.ts`, and `apps/web/tests/security-smoke.ts`.
- Use `*.test.ts` for all Node test-runner server files, as in `apps/server/test/podcasts.test.ts` and `apps/server/test/rateLimit.test.ts`.
- Use `*.test.mjs` for Node test-runner package tests, as in `packages/ownership/test/ownership.test.mjs` and `packages/assets-pipeline/avatar/synth_normals.test.mjs`.
- Use pytest's `test_*.py` convention for service tests, as in `services/world-agent/tests/test_agent.py` and `services/world-agent/tests/test_kerni.py`.
- Use a descriptive smoke entry name for the custom engine runner, as in `godot/tests/smoke.gd`.

**Structure:**
```text
apps/server/
├── src/
└── test/                         # node:test + tsx --test

apps/web/
├── src/
└── tests/                        # top-level tsx executable scripts

packages/<package>/
├── src/
└── test/                         # built-package ESM tests

services/world-agent/
├── src/world_agent/
└── tests/                        # pytest discovery root

godot/
├── scripts/main.gd               # --smoke dispatcher
└── tests/smoke.gd                # custom engine smoke
```
- The layout above is implemented by `apps/server/package.json`, `apps/web/package.json`, the package manifests under `packages/`, `services/world-agent/pyproject.toml`, and `godot/scripts/main.gd`.

## Test Structure

**Suite Organization:**

From `apps/server/test/server.test.ts`:
```typescript
import assert from "node:assert/strict";
import test from "node:test";

test("health endpoint responds from a real HTTP listener", async (context) => {
  const origin = await listenApplication(context, testConfig());
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ok");
});
```

From `apps/web/tests/security-smoke.ts`:
```typescript
function assert(name: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`ok: ${name}`);
}

const originalFetch = globalThis.fetch;
try {
  // top-level executable assertions
} finally {
  globalThis.fetch = originalFetch;
}
```

From `services/world-agent/tests/test_kerni.py`:
```python
def test_selector_failure_falls_back_without_raising() -> None:
    request = KerniTemplateRequest.from_mapping(payload())

    class BrokenSelector:
        def select(self, request: KerniTemplateRequest) -> str:
            del request
            raise TimeoutError

    assert resolve_template(request, BrokenSelector()).template_id == request.allowed_templates[0]
```

**Patterns:**
- Name tests as behavior sentences, not implementation method names, as in `apps/server/test/podcasts.test.ts`, `packages/ownership/test/ownership.test.mjs`, and `services/world-agent/tests/test_kerni.py`.
- Keep arrange, act, and assert visually separated with blank lines in runner-based tests, as in `apps/server/test/auditStore.test.ts` and `packages/assets-pipeline/avatar/synth_normals.test.mjs`.
- Use table/loop-driven assertions for families of invalid input rather than duplicating tests, as in blocked address and URL cases in `apps/server/test/podcasts.test.ts` and mode cases in `apps/web/tests/avatar-roster.test.ts`.
- Use top-level await in web executable tests when asynchronous setup is required, as in `apps/web/tests/builder-smoke.ts`, `apps/web/tests/indexeddb-audit.test.ts`, and `apps/web/tests/multiplayer-smoke.ts`.
- Register teardown before or immediately after acquiring resources; Node tests use `TestContext.after` in `apps/server/test/server.test.ts`, `apps/server/test/auditStore.test.ts`, and `packages/assets-pipeline/avatar/synth_normals.test.mjs`.
- Restore mutated globals in `finally`, as in the `fetch` replacements in `apps/web/tests/security-smoke.ts` and `apps/web/tests/multiplayer-smoke.ts`.
- Keep deterministic success/failure markers for executable smoke scripts, as in `apps/web/tests/builder-smoke.ts` and `godot/tests/smoke.gd`.

## Mocking

**Framework:** No dedicated JavaScript/TypeScript mocking library is configured; tests use dependency injection, hand-written fakes, temporary local servers, global replacement with restoration, and fake IndexedDB in `apps/server/src/app.ts`, `apps/web/tests/multiplayer-smoke.ts`, and `apps/web/package.json`.

**Patterns:**

Dependency injection from `apps/server/test/server.test.ts` into the seam defined in `apps/server/src/app.ts`:
```typescript
const origin = await listenApplication(context, config, {
  fetchFeed: async () => {
    fetchCount += 1;
    return "<rss />";
  },
});
```

Hand-written protocol fake from `apps/web/tests/multiplayer-smoke.ts`:
```typescript
const authoritativeClient = {
  joinOrCreate: async (_roomName: string, options: unknown) => {
    observedJoinOptions = options;
    return authoritativeRoom.room;
  },
  reconnect: async () => authoritativeRoom.room,
} as unknown as Client;
```

Pytest patching from `services/world-agent/tests/test_kerni.py`:
```python
monkeypatch.setattr(subprocess, "run", fake_run)
selected = HermesSelector().select(request)
```

**What to Mock:**
- Mock external fetch/catalog/selectors at explicit dependency seams while preserving request validation and response handling, as in `ServerDependencies` in `apps/server/src/app.ts` and `HermesSelector` testing in `services/world-agent/tests/test_kerni.py`.
- Replace browser-only storage APIs in Node with `fake-indexeddb/auto` and a minimal `Storage` implementation, as in `apps/web/tests/indexeddb-audit.test.ts` and the dependency in `apps/web/package.json`.
- Use controlled room/signal fakes for transport lifecycle edge cases that are difficult to trigger deterministically, as in `apps/web/tests/multiplayer-smoke.ts`.
- Inject clocks for deterministic timestamps and hashes, as in `AuditStoreOptions.clock`, `fixedClock`, and `tickingClock` in `apps/server/src/db/auditStore.ts` and `apps/server/test/auditStore.test.ts`.

**What NOT to Mock:**
- Use real SQLite databases in temporary directories for audit persistence, migration, trigger, and restart behavior, as in `apps/server/test/auditStore.test.ts`.
- Use real loopback HTTP/WebSocket listeners for server route, SSRF, rate-limit, disconnect, and Colyseus behavior, as in `apps/server/test/server.test.ts`, `apps/server/test/podcasts.test.ts`, and `apps/server/test/multiplayer.test.ts`.
- Use real cryptographic implementations and fixed regression vectors for protocol hashing/signatures, as in `packages/ownership/test/ownership.test.mjs` and `apps/server/test/auditStore.test.ts`.
- Import the compiled package through its public package name when testing workspace package distribution, as in `packages/shared/test/package.test.mjs`, `packages/identity/test/package.test.mjs`, and `packages/ownership/test/ownership.test.mjs`.
- Exercise real Godot autoloads, node trees, signals, persistence, input, and frame progression in the engine smoke, as in `godot/tests/smoke.gd` and `godot/scripts/main.gd`.

## Fixtures and Factories

**Test Data:**

Factory pattern from `apps/server/test/auditStore.test.ts`:
```typescript
function eventInput(overrides: Partial<AppendAuditEventInput> = {}): AppendAuditEventInput {
  return {
    streamId: "asset:test",
    revision: 0,
    prevHash: null,
    eventType: "asset.created",
    payload: { status: "PENDING" },
    reason: "Create the audit stream.",
    updatedBy: "user:test",
    ...overrides,
  };
}
```

Deterministic protocol fixture from `packages/ownership/test/ownership.test.mjs`:
```javascript
const ALICE_SECRET = hexToBytes("0000000000000000000000000000000000000000000000000000000000000001");
const ALICE = bytesToHex(schnorr.getPublicKey(ALICE_SECRET));
```

**Location:**
- Keep small factories and fixture builders in the test file that owns them, such as `testConfig`, `listenApplication`, and `reservePort` in `apps/server/test/server.test.ts`.
- Use temporary OS directories and register recursive cleanup with the test context for filesystem/database fixtures, as in `apps/server/test/auditStore.test.ts` and `packages/assets-pipeline/avatar/synth_normals.test.mjs`.
- Use `:memory:` only where persistence/restart behavior is not under test, as in `apps/server/test/server.test.ts` and the documented test setting in `apps/server/README.md`.
- Keep fixed cryptographic/canonicalization vectors inline next to the protocol assertion so changes are visible in review, as in `packages/ownership/test/ownership.test.mjs` and `apps/server/test/auditStore.test.ts`.
- No shared fixture directory or global JavaScript test setup file is configured; fixtures remain local across `apps/server/test/`, `apps/web/tests/`, and `packages/*/test/`.
- Godot's smoke uses a dedicated `HOME_NAME = "smoke"`, deterministic resets, and cleanup under `user://`, as implemented in `godot/tests/smoke.gd`.

## Coverage

**Requirements:** No line/branch/function coverage threshold is enforced; no c8, Istanbul/nyc, pytest-cov, or coverage configuration appears in `package.json`, `services/world-agent/pyproject.toml`, or `.github/workflows/ci.yml`.

**View Coverage:**
```bash
# Not configured: there is no repository coverage command or report target.
```
- Treat feature tests and contract regressions as the current quality gate rather than a numeric threshold; `CLAUDE.md` and `README.md` require adding a test with each feature.
- CI gates TypeScript with lint, typecheck, tests, and build; Python with Ruff and pytest; and Godot with import plus smoke in `.github/workflows/ci.yml`.

## Test Types

**Unit Tests:**
- Test pure parsers, validators, selection algorithms, timing helpers, and canonical encoders directly, as in `apps/server/test/rateLimit.test.ts`, `apps/web/tests/map-search-smoke.ts`, `packages/shared/test/package.test.mjs`, and `packages/ownership/test/ownership.test.mjs`.
- Exercise boundary matrices and malformed inputs aggressively for security-sensitive code, as in `apps/server/test/podcasts.test.ts`, `apps/server/test/multiplayer.test.ts`, `apps/web/tests/security-smoke.ts`, and `services/world-agent/tests/test_kerni.py`.
- Keep deterministic regression vectors for signed/hash-linked protocols, as in `packages/ownership/test/ownership.test.mjs` and `apps/server/test/auditStore.test.ts`.

**Integration Tests:**
- Start real loopback HTTP listeners and call them with `fetch`/Node requests, as in `apps/server/test/server.test.ts`, `apps/server/test/podcasts.test.ts`, and `services/world-agent/tests/test_kerni.py`.
- Start the real Colyseus server with real SDK clients for authoritative room behavior, reconnect, admission, and shutdown checks in `apps/server/test/multiplayer.test.ts`.
- Use real SQLite files to test migrations, WAL settings, append-only triggers, restart, and tamper detection in `apps/server/test/auditStore.test.ts`.
- Use fake IndexedDB as an in-process browser storage implementation to test atomic writes and audit chains in `apps/web/tests/indexeddb-audit.test.ts`.
- Spawn the compiled server entrypoint and verify startup/health/graceful shutdown in `apps/server/test/server.test.ts`.
- Verify asset CLI source preservation by spawning the real script against generated temporary GLB/PNG files in `packages/assets-pipeline/avatar/synth_normals.test.mjs`.

**E2E Tests:**
- The Godot headless smoke is the primary in-engine end-to-end suite; it covers autoload contracts, world construction, economy/building, persistence, UI seams, input gating, Meaningverse authority, assets, and responsive menu layout in `godot/tests/smoke.gd`.
- The web package has no browser-driven Playwright/Vitest/Jest suite; its checks execute modules in Node through `tsx`, as shown by `apps/web/package.json` and `apps/web/tests/`.
- Napplet packages declare Playwright and expose build-time conformance commands, but no Playwright spec files are present and conformance is outside the root/CI test command; see `napplets/map/package.json`, `napplets/feed/package.json`, and `.github/workflows/ci.yml`.
- CI does not run external network services; its test jobs use local package commands and the headless engine from `.github/workflows/ci.yml`.

## Common Patterns

**Async Testing:**

Node test cleanup and real listener setup from `apps/server/test/server.test.ts`:
```typescript
async function listenApplication(context: TestContext, config: ServerConfig): Promise<string> {
  const server = createPodcastServer(config);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
```

Bounded polling from `apps/server/test/multiplayer.test.ts`:
```typescript
async function waitFor(predicate: () => boolean, timeoutMs = 3_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await delay(10);
  }
  assert.fail("timed out waiting for replicated room state");
}
```

Godot frame progression from `godot/tests/smoke.gd`:
```gdscript
add_child(home)
await get_tree().process_frame
if not _check(home.build_system.block_count() == 9, "block_count != 9 after place"):
	return false
```

- Use explicit deadlines around eventually consistent network/engine state; do not leave unbounded waits, as shown by `within`/`waitFor` in `apps/server/test/multiplayer.test.ts` and two-second URL timeouts in `services/world-agent/tests/test_kerni.py`.
- Use `AbortController`, `Promise.race`, and context teardown for cancellation-sensitive code, as in `apps/server/test/server.test.ts` and `apps/web/tests/multiplayer-smoke.ts`.
- Await actual process frames/timers around Godot node lifecycle and UI transitions, as in `godot/tests/smoke.gd`.

**Error Testing:**

TypeScript exception and rejection checks from `apps/server/test/podcasts.test.ts`:
```typescript
assert.throws(() => loadServerConfig({ CORS_ORIGINS: "*" }), /explicit HTTP or HTTPS/);
await assert.rejects(fetchFeed(url), isFetchError("forbidden_target"));
```

Python protocol rejection from `services/world-agent/tests/test_kerni.py`:
```python
with pytest.raises(ProtocolError):
    KerniTemplateRequest.from_mapping(extra)
```

Godot fail-fast reason capture from `godot/tests/smoke.gd`:
```gdscript
func _check(cond: bool, reason: String) -> bool:
	if not cond and _fail.is_empty():
		_fail = reason
	return cond
```

- Assert stable error class/code/message semantics for domain and HTTP boundaries, as in `apps/server/test/auditStore.test.ts`, `apps/server/test/server.test.ts`, and `packages/ownership/test/ownership.test.mjs`.
- Verify failure leaves source data unchanged or rolls back derived outputs, as in `packages/assets-pipeline/avatar/synth_normals.test.mjs` and `tooling/video/test_upscale_grok_video.py`.
- Test malformed, unknown, replayed, stale, oversized, and authority-bearing inputs at every trust boundary, as in `services/world-agent/tests/test_kerni.py`, `apps/server/test/multiplayer.test.ts`, and `godot/tests/smoke.gd`.

---

*Testing analysis: 2026-07-26*
