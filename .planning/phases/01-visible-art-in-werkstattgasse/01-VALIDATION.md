---
phase: 1
slug: visible-art-in-werkstattgasse
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Existing TypeScript smoke tests executed with `tsx` |
| **Config file** | `apps/web/package.json` scripts; no separate test-runner config |
| **Quick run command** | `pnpm --filter @600b/web exec tsx tests/meaningverse-smoke.ts` |
| **Full suite command** | `pnpm --filter @600b/web test` |
| **Estimated runtime** | Not measured during research; measure and record in Wave 0 |

---

## Sampling Rate

- **After every task commit:** Run the narrowest affected `tsx` smoke file; use
  `pnpm --filter @600b/web exec tsx tests/meaningverse-smoke.ts` as the default.
- **After every plan wave:** Run `pnpm --filter @600b/web test` and
  `pnpm --filter @600b/web typecheck`.
- **Before `/gsd-verify-work`:** Full repository test, lint, typecheck, check, and build gates must
  be green.
- **Max feedback latency:** 120 seconds for task-local smoke evidence; split tests if the measured
  latency exceeds this target.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-W0-01 | 01-01 | 1 | ART-02, PLAC-05 | T-03 / T-04 / T-05 | App truth alone opens the relay; communication is inert beforehand and fake peers are ineligible | tracer/state | `pnpm --filter @600b/web exec tsx tests/phase1-tracer-smoke.ts` | ❌ W0 | ⬜ pending |
| 01-W0-02 | 01-02 | 2 | ART-01 | T-01 / T-02 | Presence is monotonic; only explicit acknowledgement plus player inspiration creates the memory handoff | unit/state | `pnpm --filter @600b/web exec tsx tests/phase1-presence-smoke.ts` | ❌ W0 | ⬜ pending |
| 01-W0-03 | 01-03 | 3 | ART-01, PLAC-05 | T-02 / T-06 | Memory plus inspiration gates exactly three parts and one fixed Z1 socket; the legacy activation shortcut is inert | unit/state | `pnpm --filter @600b/web exec tsx tests/phase1-placement-smoke.ts` | ❌ W0 | ⬜ pending |
| 01-W0-04 | 01-04 | 4 | ART-02 | T-03 / T-04 / T-05 / T-07 / T-08 | Signed activation handoff, signer cancellation, publish failure, invalid binding, stale/replayed events fail closed | security contract | `pnpm --filter @600b/web exec tsx tests/phase1-witness-security-smoke.ts` | ❌ W0 | ⬜ pending |
| 01-W0-05 | 01-05 | 5 | ART-01, ART-02, PLAC-05 | T-02 / T-06 / T-08 | Witness pulse, honest no-answer, additive lens, accessibility, and complete-flow regressions remain evidence-backed | UAT/regression | `pnpm --filter @600b/web exec tsx tests/phase1-remix-uat-smoke.ts` | ❌ W0 | ⬜ pending |
| 01-REG-01 | unassigned | 1+ | ART-01, ART-02 | — | Existing intro, invite truth, reconnect baseline, and multiplayer contracts remain green | regression | `pnpm --filter @600b/web exec tsx tests/meaningverse-smoke.ts && pnpm --filter @600b/web exec tsx tests/multiplayer-smoke.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Threat references are provisional identifiers for plan threat models:

- **T-01:** feed engagement or reopen resets/forces presence.
- **T-02:** Kerni, timer, animation, or presentation becomes authority.
- **T-03:** room/chat connects before accepted relay activation.
- **T-04:** mock ambient townsfolk, backlog, loopback, or participant count fabricates a peer.
- **T-05:** activation failure is presented as a live `OPEN` relay.
- **T-06:** placement/remix overwrites the creator artifact or bypasses the fixed socket.
- **T-07:** untrusted, malformed, oversized, unrelated, or invalidly signed relay events mutate truth.
- **T-08:** duplicate, stale, baseline, or replayed events retrigger witness/remix.

---

## Wave 0 Requirements

- [ ] `apps/web/tests/phase1-tracer-smoke.ts` — production app-truth tracer, pre-activation
  transport silence, accepted OPEN rendering, and no-fake-peer invariants.
- [ ] `apps/web/tests/phase1-presence-smoke.ts` — ART-01 presence/feed/Kerni state, explicit
  memory-fragment acknowledgement, player inspiration choice, and negative transitions.
- [ ] `apps/web/tests/phase1-placement-smoke.ts` — memory/inspiration-gated three-part assembly,
  fixed socket, single-winner placement, visible accepted state, and legacy shortcut no-op.
- [ ] `apps/web/tests/phase1-witness-security-smoke.ts` — signed activation invite, consent
  cancellation, exact three-action parsing, publish/receive, signature/binding failure,
  freshness, replay, size, tag, and rate boundaries.
- [ ] `apps/web/tests/phase1-remix-uat-smoke.ts` — accepted witness pulse, honest no-answer,
  additive lens, identity no-change, accessibility, and D-01–D-26 complete-flow evidence.
- [ ] Measure task-local and full-suite runtime; update the sampling latency evidence.
- [ ] Implement the exact installed NDK/`nostr-tools` APIs and bounded policies recorded in
  `01-RESEARCH.md`; no execution-time API guessing or new dependency is permitted.

No new framework or dependency installation is required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Complete creator tracer in under ten minutes | ART-01, ART-02 | Experiential timing and choreography | Start from intro; dismiss feed directly; become present; interact with Kerni; assemble/place relay; confirm `OPEN`; record elapsed wall time without showing an in-game timer. |
| Presence remains legible with muted audio/reduced effects | ART-01 | Sensory accessibility requires rendered inspection | Repeat presence transition muted and with reduced effects; verify subtitles, status, and natural animation cues convey the transition without color/audio alone. |
| Genuine solitude before relay activation | ART-02 | Requires rendered scene plus transport observation | Enter Street and wait before assembly; confirm no visible peers, chat people, ambient backlog, room-live status, or ghost sessions appear. |
| Two-session signed witness and optional additive remix | ART-02 | Human signer consent and cross-session presentation | Creator opens voluntary invite; invited browser lands at lit relay, explicitly touches and signs; verify one pulse; attach one lens; verify original relay/attribution remains intact. Cancel signing in a second run and confirm the relay remains honestly `OPEN`. |
| Z1 placement composition and inspection | PLAC-05 | Spatial clearance and visible world change | Verify fixed socket at Kerni's Z1 workbench, clear center lane, three visible parts, snap/light feedback, inspectable result, and one additive lens. |
| Reconnect does not replay celebration | ART-02 | Requires reconnecting rendered sessions | Reconnect creator and invitee after accepted pulse/lens; confirm historical events establish baseline silently and do not retrigger pulse/lens feedback. |

---

## Validation Sign-Off

- [ ] All final plan tasks have `<automated>` verification or an explicit Wave 0 dependency.
- [ ] Sampling continuity: no three consecutive tasks without automated verification.
- [ ] Wave 0 covers every `❌ W0` reference above.
- [ ] No watch-mode flags.
- [ ] Measured task feedback latency is below 120 seconds or the affected test is split.
- [ ] Full Web test and typecheck gates pass.
- [ ] Security boundary tests cover fail-closed signer, input, binding, replay, and fake-peer cases.
- [ ] `status: validated`, `nyquist_compliant: true`, and `wave_0_complete: true` are set only after
  evidence exists.

**Approval:** pending
