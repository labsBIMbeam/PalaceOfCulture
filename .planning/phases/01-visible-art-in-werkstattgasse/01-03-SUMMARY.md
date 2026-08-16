---
phase: 01-visible-art-in-werkstattgasse
plan: 03
subsystem: relay-assembly-placement
 tags: [typescript, reducer, threejs, fixed-socket, placement, tdd]

# Dependency graph
requires:
  - phase: 01-visible-art-in-werkstattgasse
    provides: "Plan-02 accepted memory/inspiration handoff and Plan-01 reducer/transport seam"
provides:
  - "Memory+inspiration-gated exactly-three-part relay assembly"
  - "Ordered foot → coil → aperture physical reducer transitions"
  - "Single-winner transactional placement at z1-relay-socket"
  - "Bounded native-world Z1 RelayWorkbench and accessible assembly/placement overlay"
  - "Permanent no-op for removed generic direct activation"
affects: [01-04, 01-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [closed physical-intent union, compare-current-attempt placement winner, accepted-fact-only presentation, fixed Z1 workbench]

key-files:
  created:
    - apps/web/tests/phase1-placement-smoke.ts
  modified:
    - apps/web/src/meaningverse/phase1Relay.ts
    - apps/web/src/net/phase1RelayTransport.ts
    - apps/web/src/scene/PalaceScene.tsx
    - apps/web/src/scene/StreetWorld.tsx
    - apps/web/src/ui/Phase1RelayOverlay.tsx
    - apps/web/tests/phase1-tracer-smoke.ts

key-decisions:
  - "The reducer rechecks both accepted Plan-02 facts before every assembly mutation; scene, UI, mesh, animation, Kerni, and transport remain non-authoritative."
  - "Only z1-relay-socket is valid; one pending attempt wins, duplicate same-ID requests are idempotent, contenders/stale callbacks cannot replace or replay the winner."
  - "Placement UI emits a physical place request; only a matching fixed-socket completion can create accepted truth. No timer or UI callback self-accepts placement."

requirements-completed: [ART-01, ART-02, PLAC-05]

coverage:
  - id: D1
    description: "Exactly-three-part memory+inspiration-gated assembly"
    requirement: "ART-01"
    verification:
      - kind: unit
        ref: "apps/web/tests/phase1-placement-smoke.ts — gate, ordered pickup/seating, wrong-order, duplicate, forged-origin, and completed-carry assertions"
        status: pass
    human_judgment: false
  - id: D2
    description: "Fixed Z1 single-winner placement and recovery states"
    requirement: "PLAC-05"
    verification:
      - kind: unit
        ref: "apps/web/tests/phase1-placement-smoke.ts — valid/invalid preview, pending winner, duplicate/contender race, stale completion, failure, cancellation, retry, frozen acceptance"
        status: pass
      - kind: other
        ref: "apps/web/src/net/phase1RelayTransport.ts — accepted placement edge opens transport once"
        status: pass
    human_judgment: false
  - id: D3
    description: "Native-world Z1 workbench and accessible honest status surface"
    requirement: "ART-02"
    verification:
      - kind: automated_ui
        ref: "apps/web/tests/phase1-placement-smoke.ts — SSR OPEN/parts/socket/status copy and source contracts"
        status: pass
      - kind: other
        ref: "apps/web/src/scene/StreetWorld.tsx — one RelayWorkbench, three visible parts/cradles, one socket, accepted-only amber light"
        status: pass
    human_judgment: false
  - id: D4
    description: "Legacy generic direct activation remains a permanent no-op"
    requirement: "ART-01"
    verification:
      - kind: unit
        ref: "apps/web/tests/phase1-placement-smoke.ts and phase1-tracer-smoke.ts — forged activation shapes no-op; PalaceScene dispatch absent"
        status: pass
    human_judgment: false

# Metrics
duration: 54min
completed: 2026-07-27
status: complete
---

# Phase 01 Plan 03 Summary

**The acknowledged memory plus explicit inspiration now becomes one tactile three-part relay and one fixed-socket placement truth, with the native Palace scene presenting only reducer-owned facts.**

## Performance

- **Duration:** approximately 54 minutes including recovery and final gates
- **Completed:** 2026-07-27T17:35:27Z
- **Tasks:** 3 completed
- **Task commits:** 7 implementation/test checkpoints plus closeout metadata

## Accomplishments

- Added the closed `foot → coil → aperture` assembly union and gated every mutation on the exact accepted Plan-02 memory fragment plus `connect-with-others` inspiration choice.
- Added fixed-socket placement vocabulary and reducer validation for `idle | valid | invalid | pending | accepted | failed`, exact `z1-relay-socket`, one pending winner, stale/duplicate/race resistance, failure/cancel/retry recovery, and frozen accepted truth.
- Added the bounded native-world `RelayWorkbench` with three visible parts/cradles, one socket, status plate, accepted-only amber core/light, and presentation-only assembly props.
- Added keyboard/on-screen overlay controls for pickup, seating, fixed-socket preview, placement request, retry, and keep-holding states.
- Removed the old generic Scene activation dispatch and migrated the tracer lifecycle smoke to the physical placement completion contract.

## Task Commits

1. **Task 1 RED:** `2be29cd` — `test(01-03): add failing relay assembly assertions`
2. **Task 1 GREEN:** `29c12f3` — `feat(01-03): implement gated physical relay assembly`
3. **Task 2 RED:** `3602f14` — `test(01-03): add failing fixed-socket race assertions`
4. **Task 2 GREEN:** `bed554d` — `feat(01-03): enforce single-winner relay placement`
5. **Task 3 assertions:** `1cd8c1e` — `test(01-03): add bounded workbench presentation assertions`
6. **Task 3 production wiring:** `d9f94ad` — `feat(01-03): wire bounded relay workbench presentation`
7. **Compatibility fix:** `a3a8ae9` — `fix(01-03): keep relay overlay legacy-safe`

## Verification

All commands used finite timeout wrappers:

- `timeout ... 60s pnpm --filter @600b/web exec tsx tests/phase1-placement-smoke.ts` — **PASS**
- `timeout ... 60s pnpm --filter @600b/web exec tsx tests/phase1-tracer-smoke.ts` — **PASS**
- `timeout ... 60s pnpm --filter @600b/web exec tsx tests/phase1-presence-smoke.ts` — **PASS**
- `timeout ... 180s pnpm --filter @600b/web typecheck` — **PASS**
- `timeout ... 180s pnpm --filter @600b/web test` — **PASS** (`ALLE SMOKE-TESTS GRUEN` and all listed suites green)
- `timeout ... 180s pnpm --filter @600b/web build` — **PASS**, 1007 modules transformed, Vite build completed in 11.72s
- `git diff --check` — **PASS**
- final working tree — **clean**

Vite retained existing warnings for `tseep` `eval`, static/dynamic Nostr imports, and large chunks; no new package or network operation was introduced.

## Deviations

### Auto-fixed Issues

**1. Existing lifecycle adapter used the removed Plan-01 state shape**
- **Found during:** Plan-03 typecheck.
- **Fix:** Updated `phase1RelayTransport.ts` to initialize with `createPhase1RelayState()` and compare nested placement attempt/status fields.
- **Committed in:** `d9f94ad`.

**2. Existing tracer smoke used the removed generic activation union**
- **Found during:** Plan-03 focused regression.
- **Fix:** Migrated the fixture to physical assembly → preview → place request → fixed-socket completion and kept forged legacy actions as permanent no-op checks.
- **Committed in:** `d9f94ad`.

**3. Legacy SSR fixtures omitted new assembly/placement fields**
- **Found during:** full Plan-03 gate.
- **Fix:** Added a fail-closed presentation fallback in `Phase1RelayOverlay`; no reducer or acceptance authority was broadened.
- **Committed in:** `a3a8ae9`.

**Total deviations:** 3 compatibility fixes, all required to preserve existing regression coverage while removing the obsolete activation path.

## Issues Encountered

The delegated executor reached the 600-second limit after committing reducers and tests but before completing the native-world presentation and closeout. The partial tree was inspected; missing production wiring, compatibility fixes, full verification, and this Summary were completed and verified on the main tree. No timeout was treated as a success signal.

## User Setup Required

None.

## Next Phase Readiness

Plan 01-04 can start. It receives the exact accepted placement edge and the transport seam, while NIP-07 approval, signed invite capability, publication, and later relay-backed witness evidence remain intentionally deferred to the next plan.

Browser-level 1280×720 keyboard/reduced-effects inspection remains a human visual-UAT concern; this close-out claims automated/source/build evidence only.

## Self-Check: PASSED

- All Plan-03 task commits are present.
- Assembly, placement, tracer, presence, typecheck, full tests, and build passed.
- No Napplet, package, schema, database, network, signer, or external publication was added.
- Final working tree is clean.

---
*Phase: 01-visible-art-in-werkstattgasse / Plan: 03*
*Completed: 2026-07-27*
