# Phase 01 Plan Outline — Visible Art in Werkstattgasse

- **Mode:** CHUNKED OUTLINE-ONLY · standard granularity · `TRACER_MODE=true` · `MVP_MODE=false` · `WALKING_SKELETON=false` · global TDD disabled, task-level TDD required for reducers/validators
- **Plan count:** 5 executable plans, each 2–3 tasks and targeted below 50% executor context
- **Phase goal:** A builder can enter Werkstattgasse, create and place something meaningful in under ten minutes, and invite another person to witness or remix the visible result.
- **Global final-plan contract:** Every generated plan must include an ASVS-L1 `<threat_model>` with severity and disposition; any critical/high threat blocks completion until mitigated. Every plan must also include `## Artifacts this phase produces`. Prohibition recall belongs only under `must_haves.prohibitions`, never under `must_haves.truths`.

## Napplet suitability decision

- **Boundary:** `native-world`; **participating Napplets:** none; **fleet registry effect:** none.
- **Presentation:** diegetic world objects plus deliberately invoked focused overlays inside the existing Palace runtime, never an automatically opened browser-looking window.
- **Reason:** Phase 1 is one continuous embodied loop of movement, attention, physical assembly, fixed-socket placement, light, and in-world witness feedback. A separate Napplet would fragment that loop and duplicate the established application-truth and transport seams.
- **Re-evaluation gate:** a later bounded tool may become a Napplet only when it has an independent player promise and genuinely benefits from sandboxing, shell capabilities, deep linking, data-rich web UI, independent conformance, or independent release.

| Plan ID | Objective | Wave | Depends On | Requirements |
|---|---|---:|---|---|
| `01-01` (`01-01-PLAN.md`) | Establish production Phase-1 truth and prove one real end-to-end relay happy path through reducer, scene, UI, transport seam, and runnable smoke. | 1 | — | ART-02, PLAC-05 |
| `01-02` (`01-02-PLAN.md`) | Expand the tracer backward through canonical entry, honest feed refusal, monotonic presence, and bounded Kerni interaction. | 2 | `01-01` | ART-01, ART-02 |
| `01-03` (`01-03-PLAN.md`) | Expand physical creation into exactly three parts, one fixed Z1 socket, fail-closed placement states, and accepted visible activation. | 3 | `01-02` | ART-01, ART-02, PLAC-05 |
| `01-04` (`01-04-PLAN.md`) | Expand the lit relay into a voluntary sanitized handoff with explicit signer consent and strict signed-event acceptance. | 4 | `01-03` | ART-02, PLAC-05 |
| `01-05` (`01-05-PLAN.md`) | Complete accepted witness/remix presentation, accessibility, honest no-answer behavior, regressions, and end-of-phase UAT. | 5 | `01-04` | ART-01, ART-02, PLAC-05 |

## 01-01 — Production Truth Tracer

### Task objectives (3)
1. **`type=tracer` — Production end-to-end accepted relay path.** Add the smallest durable Phase-1 application reducer and one bounded transport-facing action; wire a single accepted fixed-socket activation from scene intent through application truth to accessible `OPEN` UI, with the transport seam gated off before acceptance. The path is production code, not a prototype, and it must not depend on fake people, ambient messages, a generic builder, or a direct Nostr SDK import in scene/UI.
2. **Task-level TDD — Truth and authority invariants.** Write reducer-first negative cases for impossible/out-of-order transitions, pre-activation transport silence, mock/backlog/participant-count ineligibility, and accepted-state-only rendering.
3. **Runnable tracer smoke.** Exercise one end-to-end happy path through scene/UI/transport orchestration and assert visible accepted activation plus `OPEN`; retain a fast command suitable for every later plan.

### Exact intended `files_modified`
- `apps/web/src/meaningverse/phase1Relay.ts` (create)
- `apps/web/src/net/phase1RelayTransport.ts` (create)
- `apps/web/src/ui/Phase1RelayOverlay.tsx` (create)
- `apps/web/src/scene/PalaceScene.tsx` (modify)
- `apps/web/tests/phase1-tracer-smoke.ts` (create)

### D-IDs covered
- **D-15:** genuine solitude and hard gate against ambient people/ghost sessions/simulated peers.
- **D-16:** first artifact is the useful luminous Nostr relay.
- **D-20:** app truth and transport adapter remain authoritative; scene/UI stay SDK-free.

### UI-consideration ownership
- **loading (1/8):** establish bounded pending vocabulary with no false success and cancellation/failure-ready transitions for later expansions.

### Security/trust-boundary ownership
- ASVS-L1 boundary: world/DOM intent → application reducer → transport adapter; fail closed on unauthorized transition and prevent callback-driven truth.
- STRIDE focus: tampering/elevation by forged UI or transport callbacks, spoofed social evidence, and denial through premature subscription. Critical/high findings block this plan.
- The no-fake-peer gate is executable: loopback, ambient townsfolk, backlog, timers, Kerni, handles, participant counts, and remote-player presence are never witness/remix evidence.

### Spec-less edge / prohibition / assumption-delta ownership
- Seed the phase prohibition ledger for all later plans under `must_haves.prohibitions`: no fake peers or ambient evidence; no generic `BuilderHud`, catalog, grid, or free placement; no broad persistence/economy/social feed/generative AI/multiplayer scale; no direct SDK-to-scene truth; no new packages; no schema push.
- This plan does not resolve an edge probe; it creates the pure state seam against which Plans 02–04 resolve all three probes.
- Enforce installed NDK/`nostr-tools` only; package-install and database/schema work are absent.

### Symbols/artifacts to create or modify
- `Phase1RelayState`, `Phase1RelayAction`, `reducePhase1Relay` (pure application truth)
- `Phase1RelayTransport` application-facing interface and inert/pre-activation lifecycle
- `Phase1RelayOverlay` accepted `OPEN` output and accessible status seam
- `PalaceScene` Phase-1 orchestration gate
- `phase1-tracer-smoke.ts` runnable end-to-end contract

## 01-02 — Canonical Entry, Presence, and Kerni Expansion

### Task objectives (3)
1. **Canonical intro and honest feed refusal.** Preserve the approved five-second video → three authoritative cards → `Walk in`; show an unobstructed glimpse, then exactly the fixed fictional feed with immediate `Put away`, optional reopen, and no engagement requirement or real-headline dependency.
2. **Task-level TDD — Monotonic attentive presence.** Define and test 30–45 seconds of attentive walking/quiet presence without timer/progress UI; feed reopening interrupts attention but cannot erase accepted presence, while tab suspension cannot fabricate completion.
3. **Kerni encounter, memory, and player inspiration.** Keep Kerni peripheral at the Z1 bench; proximity plus explicit `E` reveals the suggestion-only label and exactly one locked line. Only explicit player acknowledgement records one bounded `RelayMemoryFragment`, and only a separate explicit `Begin relay` / `connect-with-others` choice records `RelayInspirationChoice`; Kerni never authorizes either fact and only gives one nonverbal response after later accepted placement.

### Exact intended `files_modified`
- `apps/web/src/meaningverse/onboardingStory.ts` (modify canonical stages/copy without changing intro order)
- `apps/web/src/meaningverse/phase1Relay.ts` (modify presence/Kerni transitions)
- `apps/web/src/ui/Phase1RelayOverlay.tsx` (modify feed/dialog/accessibility surfaces)
- `apps/web/src/scene/PalaceScene.tsx` (modify attentive-time and focus orchestration)
- `apps/web/src/scene/KerniFamiliar.tsx` (modify bounded presentation only)
- `apps/web/src/frontend/frontend.css` (modify phase-scoped focus/status/reduced-effects styles)
- `apps/web/tests/phase1-presence-smoke.ts` (create)

### D-IDs covered
- **D-01–D-07:** canonical intro, glimpse, dismissible fictional feed, 30–45s non-instrumentalized presence, multisensory/accessibility cues, monotonic reopen behavior, and calm fictional copy.
- **D-08–D-14:** Kerni identity/role, fixed peripheral placement, explicit proximity + `E`, exact one-line copy, suggestion-only label, no authority, and one nonverbal accepted-placement reaction.

### UI-consideration ownership
- **populated (2/8):** exact intro cards, fixed feed content, accepted presence presentation, and the one Kerni line.
- **overflow (3/8):** feed fits at 1280×720; zoomed modal content scrolls internally; essential copy does not ellipsize.

### Security/trust-boundary ownership
- ASVS-L1 boundary: elapsed browser attention/focus input → monotonic reducer; DOM modal focus → world keyboard controls.
- STRIDE focus: tampering with elapsed-time transitions, elevation by Kerni/presentation effects, and accidental `E` activation while controls/modals own focus. Critical/high findings block this plan.
- Accessibility is a truth channel: subtitles, text/shape cues, mute/reduced-effects behavior, keyboard-only operation, focus containment/return, and `aria-live` terminal status must not grant transitions themselves.

### Spec-less edge / prohibition / assumption-delta ownership
- **ART-01 unresolved/unclassified probe owner:** classify it explicitly as an interruption/attention-state edge and resolve it with the invariant: feed reopen pauses attentive accumulation without reset; tab suspension cannot add attentive time; accepted presence is monotonic. Add boundary tests at the selected 30–45s threshold and reopen/suspension tests.
- Plan prohibitions must include no algorithmic/real feed, no engagement gate, no timer/numeric progress/objective marker, no Kerni authority, no duplicated onboarding system, and no quest rail.
- No identity-model delta is introduced here.

### Symbols/artifacts to create or modify
- Canonical `INTRO_SEQUENCE`, `TUTORIAL`, and `tutorialStageFor` Phase-1 continuation
- `AttentivePresenceState`, bounded `RelayMemoryFragment`, `RelayInspirationChoice`, and derived `relayAssemblyEligible`
- `FictionalWire`, focus-safe `Put away`, `KerniProximity`, and `AccessibleStatus` surfaces within `Phase1RelayOverlay`
- Kerni accepted-presentation props only; no reducer or signer authority
- `phase1-presence-smoke.ts` timing/interruption/accessibility source contracts

## 01-03 — Physical Relay Assembly and Fixed-Socket Placement

### Task objectives (3)
1. **Task-level TDD — Memory/inspiration-gated exactly-three-part assembly.** Require accepted `RelayMemoryFragment` plus explicit player `RelayInspirationChoice`, then model foot → coil → aperture physical pickup/cradle order, wrong-cradle resistance, carry state, and completion only from accepted physical actions; reject text, AI, Kerni, scene, or presentation substitutes.
2. **Task-level TDD — Transactional fixed-socket placement and tracer closure.** Implement one Z1 socket with `idle | valid | invalid | pending | accepted | failed`; interruption or concurrent duplicate intents never expose an accepted relay unless one current reducer winner with memory, inspiration, and complete assembly is accepted. Remove the Plan-01 generic direct-activation production action/dispatch and retain only a tested permanent no-op fixture.
3. **Bounded world presentation.** Render the workbench, three visible parts, preview/rejection, accepted snap, one non-shadow amber light, restrained `OPEN`, and Kerni's nonverbal reaction from accepted facts only; keep the center lane clear and represent higher-tier capability honestly without implementing it.

### Exact intended `files_modified`
- `apps/web/src/meaningverse/phase1Relay.ts` (modify assembly/placement reducer)
- `apps/web/src/ui/Phase1RelayOverlay.tsx` (modify placement/status output)
- `apps/web/src/scene/PalaceScene.tsx` (modify intent routing and accepted effects)
- `apps/web/src/scene/StreetWorld.tsx` (modify Z1 composition)
- `apps/web/src/scene/KerniFamiliar.tsx` (modify nonverbal accepted reaction)
- `apps/web/tests/phase1-placement-smoke.ts` (create)

### D-IDs covered
- **D-17:** three visible physical components; no text/AI construction.
- **D-18:** exactly one fixed socket at Kerni's Z1 workbench; no grid/free placement.
- **D-19:** accepted snap and light are the primary visible world change and communication gate.
- Reinforces **D-14**, **D-16**, and **D-20** at their physical presentation boundary.

### UI-consideration ownership
- **partial (4/8):** 0–3 seated components and carried state stay physically visible; unsupported attribution is omitted.
- **error (5/8):** invalid fit, failed acceptance, and retry state explicitly state that nothing changed and never light the relay.

### Security/trust-boundary ownership
- ASVS-L1 boundary: untrusted/repeated world interaction intent → pure assembly/placement reducer → accepted scene effects.
- STRIDE focus: tampering/races around pending placement, elevation through local mesh position or animation completion, and denial via input repetition. Critical/high findings block this plan.
- Persistent light, `OPEN`, transport eligibility, and invite availability derive only from accepted placement truth.

### Spec-less edge / prohibition / assumption-delta ownership
- **PLAC-05 unresolved concurrency probe owner:** resolve with a single-winner, idempotent fixed-socket transition. Interruption leaves `pending` recoverable or `failed` with unchanged world truth; parallel/duplicate intents cannot create extra artifacts, consume multiple slots, or bypass validation. Test interleaving, cancellation/failure, retry, and duplicate acceptance.
- Plan prohibitions must include no generic `BuilderHud`, inventory/catalog/recipe, arbitrary grid, multiple socket, free placement, terraforming, paid/open-upload/spam placement, structural construction, or schema push.
- No broad persistence assumption: the reducer owns only the bounded Phase-1 handoff state.

### Symbols/artifacts to create or modify
- `RelayPart`, `AssemblyState`, `PlacementState`, placement validator and idempotent acceptance reducer
- `RelayWorkbench` bounded Z1 scene group, three cradles, one fixed socket, and `RelayStatusPlate`
- `VALID · E · Place relay`, visible invalid resistance, pending and failure outputs
- `phase1-placement-smoke.ts` assembly/fit/concurrency invariants

## 01-04 — Voluntary Invite and Signed Witness Security

### Task objectives (3)
1. **Voluntary signed activation invite and verified invited landing.** After accepted local placement, explicit `Copy invite` requests creator NIP-07 approval for a sign-only `activate-relay-invite` capability. Embed the complete verified event in an allowlisted `?join=street&activation=...` URL; route text alone never creates lit truth, while valid bounded import reconstructs only the same fixed relay fact in a fresh browser.
2. **Task-level TDD — Exact three-action validator.** Implement the kind-9127 `activate-relay-invite | touch-relay-witness | attach-signal-lens` discriminated union with exact ordered tags, raw/shape/signature/binding/freshness/rate/dedup gates, network-free signed fixtures, and activation→witness→lens lineage tests.
3. **Concrete human signer, acknowledged publication, and reconnect-safe receive.** Use the exact installed `NDKNip07Signer`/`NDKEvent` path; witness and lens require explicit consent, valid returned raw events, acknowledged `publish`, and later relay-backed receive before reducer acceptance. Ignore optimistic/cache/no-relay callbacks, keep initial/reconnect EOSE silent, and leave the relay `OPEN` on cancellation/failure.

### Exact intended `files_modified`
- `apps/web/src/meaningverse/model.ts` (modify/reuse sanitized invite and draft-first helpers only if extension is required)
- `apps/web/src/meaningverse/phase1Relay.ts` (modify invite/witness transitions and validator-facing contracts)
- `apps/web/src/net/phase1RelayTransport.ts` (modify strict adapter/validation/reconnect behavior)
- `apps/web/src/ui/Phase1RelayOverlay.tsx` (modify invite/consent/manual fallback/status)
- `apps/web/src/scene/PalaceScene.tsx` (modify activation-gated lifecycle and invited landing orchestration)
- `apps/web/tests/phase1-witness-security-smoke.ts` (create)

### D-IDs covered
- **D-21:** restrained `OPEN`; voluntary invite; no auto-publish/broadcast.
- **D-22:** direct same-Street lit-relay landing with creator intro bypass.
- **D-23:** explicit relay touch and signed pulse; presence is insufficient.
- **D-24:** actual human-controlled signing; mock/bot/Kerni/timer/count/ambient input is ineligible.

### UI-consideration ownership
- **long-text (6/8):** sanitized invite URLs and evidence-backed attribution wrap/select safely, never unsafe HTML, with full inspectability and no guessed identity.

### Security/trust-boundary ownership
- ASVS-L1 boundaries: invite URL → landing parser; relay callback → bounded parser; parsed event → installed signature verification; verified event → phase/invite/relay binding and authorization; draft → human-controlled signer; accepted delta → reducer.
- STRIDE focus: spoofed signer/participant, tampered or unrelated signed events, replay/repudiation, event-content disclosure/unsafe rendering, and malformed/flood denial. Lock content bytes, tag count/length, freshness, dedup-set size, subscription scope, and per-source/time-window rate caps before hookup. Critical/high threats block this plan.
- Fail-closed order is mandatory: raw bounds → strict parse → `verifyEvent` → binding → freshness → dedup → transition authorization → reducer → presentation. Existing NDK/`nostr-tools` only; no package install.

### Spec-less edge / prohibition / assumption-delta ownership
- **ART-02 unresolved concurrency probe owner:** resolve signed-event and signer concurrency explicitly. Cancellation and signer failure produce no witness; duplicate/simultaneous valid events are idempotent; wrong-binding events are rejected; reconnect snapshots are silent; at most one bounded witness transition is accepted.
- **Assumption delta owner:** signed Nostr participant/event identity is `no-change`. A bounded second participant does not change the primary identity model. A valid signature proves only control of the signing key/event and the accepted phase-bound action—not a verified human, authenticated session handle, or broader Palace identity. Add an invariant test that introducing the second signer cannot replace, merge, or reclassify the creator's primary identity/attribution.
- Plan prohibitions must include no auto-broadcast, no displayed-link-equals-shared claim, no custom crypto, no unsafe HTML/event URL, no relay-callback truth, no fake peer/social evidence, no broad persistence/social feed/chat/voice/multiplayer, no new package, and no schema push.

### Symbols/artifacts to create or modify
- `buildMeaningverseInvite` signed activation-capability URL and fail-closed invited-route import contract
- Generic kind-9127 three-action templates/parser/validator, numeric bounds policy, lineage authorization, and accepted-event-ID set
- Exact NIP-07 sign boundary, witness/lens acknowledged publish, relay-backed subscription, and silent epoch behavior
- `InvitePanel` and `WitnessConsentSheet` with fail-closed cancellation/focus return
- `phase1-witness-security-smoke.ts` signature/binding/bounds/concurrency/identity invariants

## 01-05 — Accepted Pulse, Additive Lens, Accessibility, and UAT

### Task objectives (3)
1. **Accepted witness pulse and honest no-answer.** Render exactly one accepted 900ms cyan pulse from new validated evidence; keep initial/reconnect/replay silent; retain steady amber `OPEN` with no penalty or fabricated social proof when nobody answers.
2. **Task-level TDD plus UI — One additive lens.** Permit one optional accepted lens only after witness, preserve the original relay and creator attribution, add chronological evidence-backed signer attribution, and make duplicate/rejected/replayed lens events no-ops.
3. **Full regressions and end-of-phase UAT.** Verify canonical intro, under-ten-minute creator path, invited desktop path, keyboard-only, mute/reduced-effects/200% zoom, placement failure/retry, signer cancel/invalid/replay/reconnect, identity no-change, no-answer honesty, no fake-peer evidence, existing Meaningverse/multiplayer regressions, typecheck, and source-contract prohibitions.

### Exact intended `files_modified`
- `apps/web/src/meaningverse/phase1Relay.ts` (modify lens transition/idempotency)
- `apps/web/src/ui/Phase1RelayOverlay.tsx` (modify terminal witness/lens/no-answer/accessibility states)
- `apps/web/src/scene/PalaceScene.tsx` (modify accepted-delta effect orchestration)
- `apps/web/src/scene/StreetWorld.tsx` (modify additive lens and attribution presentation)
- `apps/web/src/frontend/frontend.css` (modify reduced-effects/zoom/long-state presentation)
- `apps/web/tests/phase1-remix-uat-smoke.ts` (create)
- `apps/web/tests/meaningverse-smoke.ts` (modify obsolete enter-connect assertion and preserve canonical regressions)

### D-IDs covered
- **D-25:** one visibly additive signal lens; original relay remains intact and attributable.
- **D-26:** no answer leaves the relay lit and `OPEN` without penalty or fake completion.
- Re-verifies **D-01–D-26** through complete-flow regression/UAT.

### UI-consideration ownership
- **empty (7/8):** genuine no-answer state remains steady, useful, and free of fake people/social proof.
- **zero-one-many (8/8):** zero or one invited witness and zero or one additive lens are supported; “many” is explicitly out of scope and never rendered.

### Security/trust-boundary ownership
- ASVS-L1 boundary: accepted reducer delta → one-shot presentation; accepted signer attribution → escaped/wrapped UI; UAT fixtures → transport adapter without network trust assumptions.
- STRIDE focus: spoofed attribution, replayed visual proof, lens overwrite/tampering, and effect floods. Critical/high findings block phase completion.
- Accessibility is verified independently of color/audio/motion: text + icon/shape, subtitles, keyboard/focus, `aria-live="polite"`, reduced effects, and no required looping animation.

### Spec-less edge / prohibition / assumption-delta ownership
- Close all probe assumptions in end-to-end regression: ART-01 interruption/monotonicity, ART-02 signer/reconnect idempotency, and PLAC-05 placement single-winner behavior.
- Re-run the signed-identity `no-change` invariant: bounded second signer adds only phase-bound witness/lens attribution and never mutates the creator's primary identity model.
- Plan prohibitions must explicitly cover no fake avatars/townsfolk/ghost sessions/ambient evidence/counts; no pulse/lens replay; no overwrite/ranking; no urgency/penalty; no generic builder/catalog/grid/free placement; no broad persistence/economy/social feed/generative AI/multiplayer scale; no new packages; no schema push.

### Symbols/artifacts to create or modify
- Accepted-delta `SignedPulseEffect`, static/reduced-effects alternative, and silent reconnect baseline
- `SignalLens` accepted-only scene child and chronological attribution rows
- Honest `Relay is OPEN` / `No answer yet. The light stays on.` state
- `phase1-remix-uat-smoke.ts` complete regressions and UAT source contracts
- Updated canonical `meaningverse-smoke.ts` assertions with obsolete enter-time connection removed

## Dependency, Wave, and File-Ownership Rationale

- The tracer owns the first viable reducer/adapter/UI/scene seam. Each later plan is an explicit vertical expansion of that proven path, not a horizontal foundation plan.
- Plans are intentionally sequential because `phase1Relay.ts`, `Phase1RelayOverlay.tsx`, and `PalaceScene.tsx` are shared integration files. This avoids same-wave overlapping `files_modified` ownership and prevents parallel merge ambiguity.
- Each plan has a distinct primary smoke file; shared regression modification occurs only in final Wave 5.
- The five plans have 3 tasks each and stay under the 2–3-task rule. Heavy validator/reducer work is task-level TDD; presentation/glue tasks remain standard.

## Multi-Source Coverage Audit

### GOAL coverage

- **Enter and create under ten minutes:** Plans 01–03 cover canonical entry, presence, physical assembly, accepted placement, and visible world change.
- **Invite another person:** Plan 04 covers voluntary sanitized handoff and explicit signer consent.
- **Witness or remix the visible result:** Plans 04–05 cover validated witness, one additive lens, no-answer honesty, and creator attribution preservation.

### REQ coverage

| Requirement | Assigned plans | Coverage proof |
|---|---|---|
| ART-01 | `01-02`, `01-03`, `01-05` | Waiting/walking, attentive presence, Kerni encounter/memory line, physical artifact/community trace, and feed refusal are executable and tested. |
| ART-02 | `01-01`–`01-05` | Complete local/mock vertical slice from truthful isolation through visible placement and bounded invite/witness/remix, with prohibited broad systems excluded. |
| PLAC-05 | `01-01`, `01-03`, `01-04`, `01-05` | Honest mocked object, finite single socket, preview/rejection/accepted placement, visible inspectable result, and bounded handoff are assigned. |

### CONTEXT locked-decision coverage

- `01-01`: D-15, D-16, D-20.
- `01-02`: D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14.
- `01-03`: D-17, D-18, D-19; reinforces D-14, D-16, D-20.
- `01-04`: D-21, D-22, D-23, D-24.
- `01-05`: D-25, D-26 and full D-01–D-26 regression.
- Therefore every locked decision D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19, D-20, D-21, D-22, D-23, D-24, D-25, and D-26 has at least one implementation owner.

### UI-SPEC consideration coverage — exactly 8

1. loading → `01-01`
2. populated → `01-02`
3. overflow → `01-02`
4. partial → `01-03`
5. error → `01-03`
6. long-text → `01-04`
7. empty → `01-05`
8. zero-one-many → `01-05`

No UI consideration is unassigned or silently dropped. Cross-cutting keyboard, focus, muted/reduced-effects, non-color status, 1280×720, 200% zoom, and desktop/companion-only behavior are implemented in Plans 02–05 and verified in Plan 05.

### Spec-less edge-probe coverage — exactly 3

1. **ART-01 unresolved/unclassified:** `01-02` owns classification and explicit interruption/monotonic-attention resolution plus threshold/reopen/suspension tests.
2. **ART-02 unresolved concurrency:** `01-04` owns signer cancellation, duplicate/simultaneous event idempotency, binding rejection, and silent reconnect assumptions; `01-05` closes them end to end.
3. **PLAC-05 unresolved concurrency:** `01-03` owns single-winner fixed-socket transition, interruption/failure/retry, and duplicate intent assumptions; `01-05` closes them end to end.

### RESEARCH, security, identity, and prohibition coverage

- All plans use the app-owned pure reducer → accepted fact → scene/UI effect direction and retain adapter isolation.
- Every future PLAN body must include ASVS-L1 `<threat_model>` and dispositions; critical/high threats are blocking. Plan 04 owns strict signed-event validation, numeric bounds, signer consent, replay resistance, binding, and silent reconnect; Plans 01 and 05 independently enforce no fake-peer evidence.
- The assumption delta is explicitly `no-change`: a signed Nostr event proves only bounded key/event control. The second participant does not alter the primary identity model; Plans 04 and 05 own an invariant test.
- Existing NDK/`nostr-tools` only; no package install and no schema push occur in any plan.
- Final PLAN generation must place prohibition recall under `must_haves.prohibitions`, never truths. Prohibited scope includes fake peers/ambient evidence; generic builder/catalog/grid/free placement; broad persistence/economy/social feed/generative AI/multiplayer scale; auto-broadcast; custom crypto; relay callbacks as truth; and presentation-driven completion.
- After all PLAN bodies exist, run the Nostr API coverage detector. Generate/handle `COVERAGE.md` only after plans; neither detector output nor `COVERAGE.md` belongs in this outline.

## OUTLINE COMPLETE