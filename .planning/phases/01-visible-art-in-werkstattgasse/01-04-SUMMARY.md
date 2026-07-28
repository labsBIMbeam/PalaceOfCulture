---
phase: 01-visible-art-in-werkstattgasse
plan: 04
subsystem: signed-invite-witness-lens-transport
tags: [typescript, nostr, nip-07, kind-9127, reducer, security, tdd]

# Dependency graph
requires:
  - phase: 01-visible-art-in-werkstattgasse
    provides: "Plan-03 accepted fixed-socket relay placement and transport seam"
provides:
  - "Verified sign-only activation capability and strict fresh-browser import"
  - "Exact kind-9127 activation, witness, and lens parser/binding gates"
  - "NIP-07 signer, acknowledged publish, activation-scoped live subscription"
  - "Reducer-owned accepted witness/lens deltas with one-witness/one-lens bounds"
affects: [01-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [strict raw-event gate, NIP-07 adapter isolation, relay-backed accepted delta, silent EOSE baseline]

key-files:
  created:
    - apps/web/tests/phase1-witness-security-smoke.ts
    - .planning/phases/01-visible-art-in-werkstattgasse/01-04-SUMMARY.md
  modified:
    - apps/web/src/meaningverse/model.ts
    - apps/web/src/meaningverse/phase1Relay.ts
    - apps/web/src/net/phase1RelayTransport.ts
    - apps/web/src/ui/Phase1RelayOverlay.tsx
    - apps/web/src/scene/PalaceScene.tsx

requirements-completed: [ART-02, PLAC-05]
status: complete
---

# Phase 01 Plan 04 Summary

**The accepted relay now has a voluntary, sign-only activation invite and a fail-closed kind-9127 witness/lens handoff. NIP-07 and relay callbacks remain adapters; reducer-owned activation, witness, and lens facts are the only application truth.**

## Accomplishments

- Added exact activation capability encoding/decoding as bounded base64url UTF-8 JSON and strict `join=street` plus `activation` fresh-browser import.
- Preserved fixed relay ID `werkstattgasse:z1:relay:1`; route state alone cannot create activation truth.
- Added exact kind 9127 templates and parser for activation, witness, and lens events with empty content, ordered tags, standard-field bounds, installed `verifyEvent`, freshness, rate, dedup, and dependency gates.
- Added NIP-07 adapter flow with fresh `NDKNip07Signer`, signer readiness, `NDKEvent` signing, raw-event reparse, activation sign-only protection, acknowledged witness/lens publish, and activation-scoped relay subscription.
- Added silent EOSE/cache/optimistic/no-relay handling and relay-backed accepted-evidence dispatches into the reducer.
- Added focused invited-player witness consent and post-witness lens consent; cancellation and late-result tokens are app-owned and fail closed.
- Preserved creator identity and exposed only bounded event/pubkey attribution; no signature is treated as humanity, session, account, or Palace identity proof.

## Task Commits

1. **Task 1 RED:** `49b312b` — `test(01-04): add failing activation invite assertions`
2. **Task 1 GREEN:** `785d85c` — `feat(01-04): add signed activation invite truth seam`
3. **Task 2 RED:** `57efb8d` — `test(01-04): add failing kind-9127 security assertions`
4. **Task 2 GREEN:** `c395033` — `feat(01-04): add exact kind-9127 validation transport`
5. **Invite orchestration:** `09cd59f` — `feat(01-04): wire verified invite consent and import`
6. **Evidence acceptance:** `bad7ce7` — `feat(01-04): gate accepted witness and lens deltas`
7. **Task 3 wiring:** `fad1ef0` — `feat(01-04): wire relay-backed witness and lens consent`

## Verification

All commands used finite timeout wrappers:

- `timeout ... 60s pnpm --filter @600b/web exec tsx tests/phase1-tracer-smoke.ts` — **PASS**
- `timeout ... 60s pnpm --filter @600b/web exec tsx tests/phase1-presence-smoke.ts` — **PASS**
- `timeout ... 60s pnpm --filter @600b/web exec tsx tests/phase1-placement-smoke.ts` — **PASS**
- `timeout ... 60s pnpm --filter @600b/web exec tsx tests/phase1-witness-security-smoke.ts` — **PASS**
- `timeout ... 60s pnpm --filter @600b/web exec tsx tests/meaningverse-smoke.ts` — **PASS**
- `timeout ... 60s pnpm --filter @600b/web exec tsx tests/multiplayer-smoke.ts` — **PASS**
- `timeout ... 180s pnpm --filter @600b/web typecheck` — **PASS**
- `timeout ... 180s pnpm --filter @600b/web test` — **PASS** (`ALLE SMOKE-TESTS GRUEN` and all listed suites green)
- `timeout ... 180s pnpm --filter @600b/web build` — **PASS**, 1007 modules transformed, Vite completed in 11.57s
- `git diff --check` — **PASS**
- final working tree before metadata closeout — **clean**

Vite retained existing warnings for `tseep` `eval`, static/dynamic Nostr imports, and large chunks; no package install, schema change, database migration, or external publication was performed. An earlier isolated build invocation hit the bounded timeout at `transforming...`; a supervised rerun completed successfully in 11.76s, and the final normal build completed in 11.57s.

## Deviations

### Auto-fixed Issues

**1. Witness/lens parser initially compared raw tags to non-existent parsed fields**
- **Found during:** Task-2 security smoke.
- **Fix:** Validate witness/lens dependency tag shape intrinsically, then apply trusted state binding separately.

**2. Replay fixture accidentally created a new dedup guard**
- **Found during:** focused smoke.
- **Fix:** Share one guard across first acceptance and replay assertion.

**3. Task-3 executor had stopped before Scene/Overlay wiring**
- **Found during:** completion audit.
- **Fix:** Added reducer evidence actions, activation-scoped subscription, NIP-07 publish flow, focused witness/lens consent, cancellation tokens, and accepted-delta UI on the main tree.

**Total deviations:** 3, all closed and covered by the final gate.

## User Setup Required

None. Browser NIP-07 availability is required only for a real voluntary signing action; no credential is retained by the app.

## Next Phase Readiness

Plan 01-05 can start. It receives immutable accepted lens evidence from `phase1RelayState.acceptedLens` and may add the scoped witness pulse/remix presentation and final accessibility/UAT work without changing activation, witness, or lens truth authority.

## Self-Check: PASSED

- Plan-04 implementation, focused security suite, full regressions, typecheck, and production build passed.
- Activation remains sign-only; witness/lens acceptance requires acknowledged publish plus relay-backed live receive.
- No app-held nsec, production `finalizeEvent`, custom crypto, package, schema, database, or external publication was added.
- Working tree was clean before GSD metadata changes.

---
*Phase: 01-visible-art-in-werkstattgasse / Plan: 04*
*Completed: 2026-07-28*
