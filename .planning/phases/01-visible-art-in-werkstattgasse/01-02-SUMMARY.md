---
phase: 01-visible-art-in-werkstattgasse
plan: 02
subsystem: entry-presence-kerni
tags: [react, typescript, attentive-presence, accessibility, kerni, tdd]

# Dependency graph
requires:
  - phase: 01-visible-art-in-werkstattgasse
    provides: "Plan 01-01 reducer-owned relay truth, accepted-only transport seam, and focused overlay"
provides:
  - "Canonical video → three cards → Walk in entry continuation"
  - "Fixed local fictional Wire with immediate keyboard-safe dismissal and optional reopen"
  - "Monotonic 36-second foreground attention reducer with bounded active-frame sampling"
  - "Focus-safe, suggestion-only Kerni interaction at bounded proximity"
  - "Explicit RelayMemoryFragment → RelayInspirationChoice → relayAssemblyEligible handoff"
  - "Accepted-placement-only nonverbal Kerni presentation response"
affects: [01-03, 01-04, 01-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [monotonic bounded attention reducer, focus-contained native overlay, explicit player-intent handoff, suggestion-only world companion]

key-files:
  created:
    - apps/web/tests/phase1-presence-smoke.ts
  modified:
    - apps/web/src/meaningverse/onboardingStory.ts
    - apps/web/src/meaningverse/phase1Relay.ts
    - apps/web/src/ui/Phase1RelayOverlay.tsx
    - apps/web/src/scene/PalaceScene.tsx
    - apps/web/src/scene/KerniFamiliar.tsx
    - apps/web/src/scene/StreetWorld.tsx
    - apps/web/src/frontend/frontend.css

key-decisions:
  - "Attention is app truth only after bounded foreground active-frame samples; no wall-clock, hidden-tab, or presentation credit is accepted."
  - "Kerni may suggest and present, but only ordered explicit player intents create the memory and inspiration facts."
  - "The Wire remains fixed, local, fictional, and immediately dismissible; no current feed, fetch, ranking, or engagement gate was introduced."

patterns-established:
  - "World/DOM focus ownership is explicit: modal controls contain focus and release held movement before returning focus to the invoking control."
  - "Cross-plan eligibility is a pure conjunction of bounded accepted facts, not a callback, animation, proximity, or companion decision."

requirements-completed: [ART-01, ART-02]

coverage:
  - id: D1
    description: "Canonical entry sequence and fixed fictional Wire"
    requirement: "ART-01"
    verification:
      - kind: integration
        ref: "apps/web/tests/phase1-presence-smoke.ts — canonical IDs, card copy/order, 2400ms glimpse, Wire SSR/focus hooks"
        status: pass
    human_judgment: false
  - id: D2
    description: "Monotonic 36-second attentive presence with interruption/suspension safety"
    requirement: "ART-01"
    verification:
      - kind: unit
        ref: "apps/web/tests/phase1-presence-smoke.ts — 35,999/36,000ms, bounded frames, malformed input, feed interruption"
        status: pass
      - kind: other
        ref: "pnpm --filter @600b/web typecheck"
        status: pass
    human_judgment: false
  - id: D3
    description: "Suggestion-only Kerni interaction and explicit memory/inspiration handoff"
    requirement: "ART-01"
    verification:
      - kind: unit
        ref: "apps/web/tests/phase1-presence-smoke.ts — ordered player actions, idempotence, synthetic/presentation negatives"
        status: pass
      - kind: automated_ui
        ref: "apps/web/tests/phase1-presence-smoke.ts — exact label/line/dialogue SSR contract"
        status: pass
    human_judgment: false
  - id: D4
    description: "Accepted-placement-only, reduced-effects-compatible Kerni response and scene wiring"
    requirement: "ART-02"
    verification:
      - kind: other
        ref: "apps/web/tests/phase1-presence-smoke.ts — Kerni source and PalaceScene wiring assertions"
        status: pass
      - kind: other
        ref: "pnpm --filter @600b/web build"
        status: pass
    human_judgment: false

# Metrics
duration: 35min
completed: 2026-07-27
status: complete
---

# Phase 01 Plan 02 Summary

**Canonical entry now becomes honest foreground presence, a bounded Kerni encounter, and an explicit memory-to-inspiration handoff without fabricated social proof or companion authority.**

## Performance

- **Duration:** 35 minutes 21 seconds
- **Started:** 2026-07-27T13:02:18Z
- **Completed:** 2026-07-27T13:37:39Z
- **Tasks:** 3 completed
- **Files modified:** 8 total (7 production files, 1 smoke file)

## Accomplishments

- Preserved the approved intro video/cards/Walk-in order, removed obsolete enter-time connection/tutorial claims, and added the fixed fictional Wire after a 2400ms unobstructed Street glimpse.
- Added fail-closed 36,000ms foreground attention truth with 250ms frame caps, interruption/suspension boundaries, monotonic acceptance, accessible settled-state output, and focus-safe Wire/Kerni overlays.
- Added the bounded Kerni interaction and explicit application-owned `RelayMemoryFragment` plus separate `RelayInspirationChoice`; only their conjunction exposes `relayAssemblyEligible` for Plan 03.

## Task Commits

1. **Task 1: Preserve canonical entry and add the fixed, immediately dismissible Wire** — `7c4431a` (`feat(01-02): preserve canonical entry and add fictional Wire`)
2. **Task 2: Define monotonic attentive presence with interruption and suspension boundaries** — `3f9061b` (`test(01-02): add failing tests for attentive presence`), `3ad182e` (`feat(01-02): implement attentive presence`)
3. **Task 3: Bound Kerni and create the explicit memory-fragment/inspiration handoff** — `03bae48` (`test(01-02): add failing Kerni handoff assertions`), `765e44e` (`feat(01-02): add Kerni relay handoff`)

**Plan metadata:** this file is the dedicated plan close-out commit, created after all production commits.

## Files Created/Modified

- `apps/web/src/meaningverse/onboardingStory.ts` — canonical entry data, fictional Wire copy, and glimpse timing.
- `apps/web/src/meaningverse/phase1Relay.ts` — attentive presence and explicit Kerni-to-workbench handoff reducers/facts.
- `apps/web/src/ui/Phase1RelayOverlay.tsx` — Wire, focus-safe Kerni dialogue, exact copy/label, and Begin relay action.
- `apps/web/src/scene/PalaceScene.tsx` — active-frame sampling, focus/visibility orchestration, proximity and explicit player intent wiring.
- `apps/web/src/scene/KerniFamiliar.tsx` — peripheral presence and accepted-placement-only nonverbal cue.
- `apps/web/src/scene/StreetWorld.tsx` — read-only accepted-placement/presence presentation props.
- `apps/web/src/frontend/frontend.css` — Wire, presence, Kerni, focus, overflow, and reduced-effects styles.
- `apps/web/tests/phase1-presence-smoke.ts` — canonical entry, attention boundaries, handoff authority, SSR, and source-contract smoke.

## Decisions Made

- Kept the entire slice `native-world` with `participating_napplets: []` and focused overlays only.
- Kept the Wire entirely local and fictional; no algorithmic or real feed path was added.
- Kept Kerni explicitly suggestion-only; no world-agent, animation, scene callback, or presentation prop can create accepted facts.
- Kept acceptance wording qualitative and non-instrumental: no elapsed number, progress bar, percentage, objective marker, or engagement prerequisite is shown.

## Deviations from Plan

### Auto-fixed Issues

**1. [Task 3 / acceptance contract] Restored exact Kerni label and interaction name in the rendered dialogue contract**
- **Found during:** Task 3 focused smoke verification.
- **Issue:** The initial dialogue SSR output rendered `Kerni`/`Suggestion only` but did not expose the exact required label or the `Listen to Kerni` interaction name while the modal was open.
- **Fix:** Rendered the exact `KERNI · WORLD AGENT · SUGGESTION ONLY` label and a visually-hidden `Listen to Kerni` context inside the focus-contained dialogue; the visible trigger remains outside the modal and is not duplicated.
- **Files modified:** `apps/web/src/ui/Phase1RelayOverlay.tsx`
- **Verification:** Focused presence smoke and typecheck passed.
- **Committed in:** `765e44e`

**Total deviations:** 1 targeted acceptance-contract fix.
**Impact on plan:** Necessary for exact accessibility/copy conformance; no scope creep or dependency change.

## Issues Encountered

- Three executor invocations reached the 600-second delegation limit before Summary close-out. Their partial work was inspected rather than treated as a verdict; the final implementation, focused smoke, typecheck, full Web smoke chain, and build were rerun on the frozen tree.
- Vite emitted existing warnings about `eval` in `tseep`, static/dynamic Nostr imports, and large chunks; the production build still completed successfully. No new package or network work was introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 01-03 can start. It receives a pure `relayAssemblyEligible` handoff only after the explicit memory fragment and separate `connect-with-others` inspiration choice. Physical three-part relay assembly and fixed Z1 placement remain intentionally unimplemented here. Browser-level visual UAT remains a later verification concern and is not claimed by this automated close-out.

## Self-Check: PASSED

- Task commits `7c4431a`, `3f9061b`, `3ad182e`, `03bae48`, and `765e44e` are present.
- All eight declared files exist in the final tree.
- Presence smoke, Meaningverse regression, typecheck, full Web smoke chain, and production build passed.
- `git diff --check` passed.
- No Napplet, package, schema, database, network, signer, or external publication was added.

---
*Phase: 01-visible-art-in-werkstattgasse / Plan: 02*
*Completed: 2026-07-27*
