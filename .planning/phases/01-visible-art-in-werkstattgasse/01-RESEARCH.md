# Phase 1: Visible Art in Werkstattgasse — Technical Research

**Researched:** 2026-07-26  
**Method:** bounded local-only repository research; no network providers, registries, package installation, builds, or full tests  
**Domain:** desktop-Web experiential flow, diegetic relay activation, bounded signed witness/remix handoff  
**Confidence:** HIGH for repository architecture and constraints; LOW where explicitly marked `[ASSUMED]`

## User Constraints

### Phase Boundary

- Deliver the first coherent desktop-Web Palace slice in the linear Werkstattgasse. A player enters alone with Kerni, deliberately leaves a tempting feed, becomes present, builds and places one small useful artifact in under ten minutes, and opens an honest bounded handoff to one other person. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- For this phase, the artifact is a diegetic, luminous Nostr relay assembled at Kerni's workbench. It changes the visible world from isolated and quiet to capable of communication. The handoff ends when a real invited person witnesses the relay with a signed light pulse and may attach one small remix lens. No fake peer, ambient bot, timer, or Kerni action may complete that social step. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- This phase does not add broad social feeds, open-world placement, economy, timelocks, generalized crafting, voice, moderation, production-scale multiplayer, or the later Palace topology. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

### Locked Implementation Decisions

#### Entry and presence rhythm

- **D-01:** Preserve the canonical intro order: the approved five-second raccoon-to-Kerni video, then the three authoritative story cards, then `Walk in`. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-02:** After entering the Street, show a short unobstructed world glimpse before a fictional feed pushes itself into the foreground. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-03:** The feed can always be dismissed through one large, honest `Put away` action. No scroll, reaction, or other engagement is required before leaving it. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-04:** Presence emerges over 30–45 seconds of walking or quietly remaining in the world. Do not show a timer, number, objective marker, or progress bar. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-05:** Communicate presence through light, sound, natural world reactions, and environmental animation. Provide subtitles and natural animation cues so the transition remains legible without sound or strong lighting effects. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-06:** Reopening the feed interrupts attention but never removes presence already gained and never resets the transition. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-07:** Feed cards are short, believable fictional news/status items: calmly tempting, slightly absurd, and never copied from current real headlines or framed as a moral lecture. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

#### Kerni as the first helper

- **D-08:** Kerni is the raccoon in another form and the first helper encountered after the intro. Kerni is a companion and Schaffenwerkzeug, never a rescuer, quest authority, moderator, or source of game truth. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-09:** Kerni is always physically present, small and peripheral beside the first workbench in Street zone Z1. Presence makes Kerni noticeable; it does not spawn, unlock, or authorize Kerni. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-10:** Kerni never blocks the path or follows the player. The first spoken interaction requires proximity plus an explicit `E` press. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-11:** On that first interaction Kerni speaks exactly one orientation line and then remains quiet: “Welcome. No rush — the Palace gets better when people leave something useful behind. Start with one small thing.” [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-12:** Show `KERNI · WORLD AGENT · SUGGESTION ONLY` as a small proximity/inspect label, not a permanent floating sign. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-13:** Kerni may indicate the workbench but cannot choose, generate, assemble, place, sign, publish, or complete the relay for the player. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-14:** After successful placement Kerni gives one short automatic nonverbal reaction. Kerni does not auto-speak, preserving the canonical authority boundary. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

#### Luminous Nostr relay and placement

- **D-15:** Before the relay is built, the player is genuinely alone in the world with Kerni. No ambient chat people, ghost sessions, or simulated peers are visible. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-16:** The first player-created artifact is a small luminous Nostr relay: a useful, handmade communication object rather than loot or a generic decorative picture. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-17:** The player physically assembles three visible relay components at the workbench. Text input or AI generation must not build it on the player's behalf. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-18:** Phase 1 uses one fixed relay socket directly at Kerni's Z1 workbench. Multiple sockets, arbitrary grid placement, and free world placement are out of scope here. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-19:** The completed relay snaps into the fixed socket and lights automatically. The light is the primary visible world change and signifies that communication is now possible. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-20:** The diegetic relay is an interface to the bounded Nostr communication path, never the source of application truth. The planner must preserve the transport-adapter boundary from ADR 0002 rather than coupling world UI directly to one relay implementation. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

#### Witness and remix handoff

- **D-21:** After activation the relay shows a restrained `OPEN` status and offers a voluntary invite link. It must not publish or broadcast an invitation automatically. This was selected as the safe default after the interaction timed out. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-22:** The invite opens the same Werkstattgasse directly at the lit relay and bypasses the creator intro. This preserves the existing invite-bypass contract and was selected as the safe default after the interaction timed out. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-23:** Mere presence does not count as witnessing. The invited person explicitly touches the relay and sends a signed light pulse. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-24:** A claimed signed pulse must be backed by an actual human-controlled signing action/event. A mock, bot, Kerni, timer, session-count heuristic, or ambient message cannot fabricate it. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-25:** The invited person may remix by attaching one second small signal lens. The original relay remains intact and attributable; the added lens is visibly additive, not an overwrite. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **D-26:** If nobody answers, the relay remains lit and `OPEN` without penalty. The loop stays honestly incomplete rather than simulating social proof. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

### Claude's Discretion

- Exact feed-card copy within the fictional, calm, slightly absurd tone. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- Exact lighting, audio, animation, and subtitle choreography within the 30–45 second presence range. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- Exact visual forms, materials, and assembly motion for the three relay parts and second signal lens, while preserving the established dark warm workshop language and mobile performance budget. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- Exact event kind, signer UI, and adapter implementation for the signed light pulse, provided the result is human-controlled, fail-closed, testable, and does not let Nostr become application truth. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- Exact nonverbal Kerni acknowledgement after placement. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

### Deferred Ideas

- Multiple relay sockets, arbitrary Z1 grid placement, and open-world relay placement. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- Automatic public Nostr broadcasts, general social feeds, broad chat channels, and voice. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- Production-scale relay hosting, moderation, reconnection policy, broad identity UX, and many-user concurrency beyond the bounded two-person handoff. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- Economy, zaps, timelocks, Palace ownership, generalized crafting, and the later Palace Ringstadt. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

## Summary

Phase 1 should be planned as a production-quality vertical tracer through existing Web seams, not as a new subsystem stack. The repository already has the canonical intro/story vocabulary, pure Meaningverse truth helpers, the Street and Kerni scene components, scene-level orchestration, an invite sanitizer, a transport adapter, public relay configuration, Nostr dependencies, and smoke-test conventions. [VERIFIED: apps/web/src/meaningverse/onboardingStory.ts] [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: apps/web/src/scene/PalaceScene.tsx] [VERIFIED: apps/web/src/scene/StreetWorld.tsx] [VERIFIED: apps/web/src/scene/KerniFamiliar.tsx] [VERIFIED: apps/web/src/net/chat.ts] [VERIFIED: apps/web/src/net/nostrConfig.ts] [VERIFIED: apps/web/tests/meaningverse-smoke.ts]

The key work is truth-preserving orchestration: intro → glimpse → dismissible fictional feed → monotonic presence → explicit Kerni interaction → three-part physical assembly → accepted relay activation → gated communication → voluntary invite → human-consented signed pulse → optional additive lens. Application-owned state must advance only from validated local actions and accepted external evidence. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] [VERIFIED: docs/design/moc-intro-tutorial-story.md]

**Primary recommendation:** lead with one end-to-end tracer using the existing `onboardingStory`/`model` → `PalaceScene` → `StreetWorld`/`KerniFamiliar` → `ChatTransport`/`nostrConfig` seams; gate all communication on accepted relay activation and treat witness/remix as validated application facts, never presentation or mock transport side effects. [VERIFIED: apps/web/src/meaningverse/onboardingStory.ts] [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: apps/web/src/scene/PalaceScene.tsx] [VERIFIED: apps/web/src/net/chat.ts]

## Project Constraints from `CLAUDE.md`

- The app owns truth; Nostr is an adapter and never the source of truth. State transitions remain in application code. [VERIFIED: CLAUDE.md]
- AI/world-agent output is suggestion-only and cannot finalize state. [VERIFIED: CLAUDE.md]
- Art is static and mutable runtime state is data; relay activation, witness, attribution, and lens state must not be baked into a model asset. [VERIFIED: CLAUDE.md]
- Mobile 30 FPS is a hard budget; prefer data-driven rendering, instancing/LOD/clustering where scale requires them, and avoid thousands of React components. [VERIFIED: CLAUDE.md]
- TypeScript is the browser language; project convention is strict TypeScript, double quotes, 100-column formatting, Biome lint/format, and typecheck before commit. [VERIFIED: CLAUDE.md]
- Add tests with each feature and commit working checkpoints incrementally. [VERIFIED: CLAUDE.md]
- Do not change runtime topology without the stack ADR; this phase should stay inside the existing Web and adapter seams. [VERIFIED: CLAUDE.md]

## Architectural Responsibility Map

| Capability | Primary owner | Supporting seam | Planning prescription |
|---|---|---|---|
| Canonical intro and phase copy | `meaningverse/onboardingStory.ts` | existing intro runtime | Extend canonical vocabulary without introducing parallel copy sources. [VERIFIED: apps/web/src/meaningverse/onboardingStory.ts] |
| Progress and completion truth | pure Meaningverse model helpers | smoke tests | Represent phase transitions as pure, testable application facts. [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: apps/web/tests/meaningverse-smoke.ts] |
| Cross-cutting flow orchestration | `scene/PalaceScene.tsx` | frontend shell | Coordinate feed, presence, interaction availability, relay state, and chat gating in the existing scene seam. [VERIFIED: apps/web/src/scene/PalaceScene.tsx] |
| Z1 workbench, socket, relay, lens | `scene/StreetWorld.tsx` | fixed Z1 topology | Add one bounded interaction site; do not create generalized placement. [VERIFIED: apps/web/src/scene/StreetWorld.tsx] [VERIFIED: docs/STREET-LEVEL-PLAN.md] |
| Kerni embodiment and proximity | `scene/KerniFamiliar.tsx` | Palace scene state | Keep Kerni visual/presentational and suggestion-only. [VERIFIED: apps/web/src/scene/KerniFamiliar.tsx] [VERIFIED: docs/design/kerni-workshop-companion.md] |
| Tutorial/invite UI | `ui/MeaningPath.tsx` | canonical stage model and invite builder | Adapt the existing rail/actions rather than introducing a second quest UI. [VERIFIED: apps/web/src/ui/MeaningPath.tsx] [VERIFIED: apps/web/src/meaningverse/model.ts] |
| Communication transport | `net/chat.ts` adapter | `net/nostrConfig.ts`, installed NDK/nostr-tools | Extend/replace transport behind the adapter; world components must not import SDK APIs. [VERIFIED: apps/web/src/net/chat.ts] [VERIFIED: apps/web/src/net/nostrConfig.ts] [VERIFIED: docs/adr/0002-chat-and-voice-transport.md] |
| External witness/remix ingestion | adapter plus pure validator/reducer | application state | Validate, deduplicate, and authorize before reducing into witness/lens state. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] |
| Regression coverage | `apps/web/tests/meaningverse-smoke.ts` | `multiplayer-smoke.ts`, package scripts | Add focused pure/state/source-contract tests first, then run existing suites. [VERIFIED: apps/web/tests/meaningverse-smoke.ts] [VERIFIED: apps/web/tests/multiplayer-smoke.ts] [VERIFIED: apps/web/package.json] |

## Standard Stack

### Core and supporting stack already present

| Library / layer | Repository version | Use in this phase | Evidence |
|---|---:|---|---|
| React | `^18.3.1` | UI and scene orchestration already used by the Web app | [VERIFIED: apps/web/package.json] |
| Three.js | `^0.169.0` | visible relay, light, component assembly, and lens geometry through the current scene stack | [VERIFIED: apps/web/package.json] |
| `@react-three/fiber` | `^8.17.10` | declarative scene integration | [VERIFIED: apps/web/package.json] |
| `@react-three/drei` | `^9.114.0` | existing scene helpers where already used | [VERIFIED: apps/web/package.json] |
| TypeScript | `^5.6.3` in the Web manifest | pure state types and fail-closed parsing | [VERIFIED: apps/web/package.json] |
| Vite | `^5.4.8` | existing Web build/dev layer | [VERIFIED: apps/web/package.json] |
| `tsx` | `^4.19.1` | existing smoke-test execution | [VERIFIED: apps/web/package.json] |
| `@nostr-dev-kit/ndk` | manifest `^3.0.3`, lockfile `3.0.3` | bounded transport implementation behind `ChatTransport`; do not expose SDK objects to scene/UI | [VERIFIED: apps/web/package.json] [VERIFIED: pnpm-lock.yaml] [VERIFIED: docs/adr/0002-chat-and-voice-transport.md] |
| `nostr-tools` | `^2.23.5` | use only through a reviewed adapter/validator if current repository code supports the needed validation operation; do not invent signatures | [VERIFIED: apps/web/package.json] |
| Existing `ChatTransport` | repository interface | stable UI/transport boundary | [VERIFIED: apps/web/src/net/chat.ts] [VERIFIED: docs/adr/0002-chat-and-voice-transport.md] |
| Existing public-relay configuration | repository seam | relay selection/configuration outside world UI | [VERIFIED: apps/web/src/net/nostrConfig.ts] |

**Installation recommendation:** none. Existing dependencies are sufficient for planning and implementing this phase. [VERIFIED: apps/web/package.json] [VERIFIED: pnpm-lock.yaml]

## Package Legitimacy Audit

No new packages are recommended or permitted by this research retry. Therefore no registry lookup or package-legitimacy provider run is needed; both would violate the local-only boundary. Existing package versions above are reported only from repository manifests and lockfile. [VERIFIED: package.json] [VERIFIED: apps/web/package.json] [VERIFIED: pnpm-lock.yaml]

**Packages added:** none.  
**Packages removed:** none.  
**Packages requiring an install checkpoint:** none.

### NIP-29 / NDK scope

ADR 0002 records the later general-chat direction as a NIP-29 group via NDK and maps world/plaza channels to groups while retaining `ChatTransport` as the UI-facing seam. Phase 1 does **not** implement general NIP-29 chat. It uses the locally verified NDK 3.0.3 signer/publish/subscription surface only for one private Phase-1 kind (`9127`) behind a narrower evidence adapter. Exact signatures are recorded below. [VERIFIED: docs/adr/0002-chat-and-voice-transport.md] [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/package.json] [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/dist/index.d.mts]

## Architecture Patterns

### Tracer-first vertical slice

Plan the first implementation task as one narrow, reversible tracer with minimal final-quality behavior:

```text
canonical intro
  -> unobstructed Street glimpse
  -> fictional feed / Put away
  -> monotonic presence state
  -> explicit E interaction with Kerni
  -> three local physical part placements
  -> fixed-socket acceptance + relay light
  -> communication adapter becomes eligible
  -> invite generated for ?join=street
  -> invited touch + signer consent
  -> validated, deduplicated pulse
  -> optional validated additive lens
```

This order directly implements the locked phase boundary and prevents horizontal work (visual art, transport, UI, or state) from appearing complete without end-to-end truth. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] The GSD planner's default is tracer-first decomposition. [VERIFIED: gsd-plan-phase skill]

### Pattern 1: Pure truth model, imperative effects at the edge

Use pure helpers to decide whether presence, relay activation, invite, witness, and remix transitions are accepted; use React/Three components only to present accepted state. Existing Meaningverse tests already exercise pure helpers for stage truth, invite truth, placement-epoch diffing, and reconnect baselines. [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: apps/web/tests/meaningverse-smoke.ts]

Recommended phase state shape (illustrative names, not a claimed existing API):

```ts
// Proposed phase-owned state; reducer transitions must be tested before scene effects.
type RelayPhase =
  | "alone"
  | "present"
  | "assembling"
  | "activation_pending"
  | "open"
  | "witnessed"
  | "remixed";
```

The exact new type names are planning discretion. [ASSUMED]

### Pattern 2: Accepted activation gates communication

Treat visible assembly completion as a request to activate, not proof that communication is live. Only an accepted relay activation transition may expose/connect the bounded transport and show `OPEN`. This resolves the current tutorial conflict and preserves the rule that the diegetic object is not application truth. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] [VERIFIED: docs/adr/0002-chat-and-voice-transport.md]

### Pattern 3: Adapter isolation

Keep NDK/Nostr details in `net/` and expose phase-specific state/events through a thin application-owned adapter. `ChatPanel`, `MeaningPath`, `StreetWorld`, and `KerniFamiliar` must not validate SDK objects or infer truth from relay callbacks. [VERIFIED: apps/web/src/net/chat.ts] [VERIFIED: docs/adr/0002-chat-and-voice-transport.md]

### Pattern 4: Explicit human action, draft before signature

Follow the existing `createShipModuleNostrDraft` pattern: create a bounded draft separately, display the action and payload meaning to the user, then request a human-controlled signing action. Only a validated returned event can become witness evidence. [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

### Pattern 5: Silent baseline then live deltas

Initial subscription and reconnect snapshots establish baseline state and must not replay a witness pulse or lens animation. Only a newly accepted event after the baseline can trigger feedback. This matches the existing ship placement epoch pattern and canonical reconnect contract. [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: apps/web/tests/meaningverse-smoke.ts] [VERIFIED: docs/design/moc-intro-tutorial-story.md]

### Pattern 6: Additive world state

Model the second lens as a separate attributed attachment to the original accepted relay, not mutation/replacement of the creator artifact. Render the lens only from accepted remix state. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

### Street composition constraints

Place the one workbench/socket in Z1 Workshop Row, preserving the lane's rustic-first composition, the clear center walk lane, asymmetric layout, density rhythm, and dark/warm handmade language. Z1 is the dense crafts zone and the plan explicitly keeps world layout data-driven in TypeScript. [VERIFIED: docs/STREET-LEVEL-PLAN.md] [VERIFIED: apps/web/src/scene/StreetWorld.tsx]

### Anti-patterns to avoid

- **Parallel phase shell:** do not create a second onboarding/router/store alongside `PalaceScene`; coordinate from the existing orchestration seam. [VERIFIED: apps/web/src/scene/PalaceScene.tsx]
- **Visual state as truth:** light, animation, label, audio, and Kerni reaction are outputs, not completion inputs. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **SDK in scene code:** do not import NDK/Nostr primitives into `StreetWorld`, `KerniFamiliar`, or `MeaningPath`. [VERIFIED: docs/adr/0002-chat-and-voice-transport.md]
- **Presence by countdown UI:** elapsed time may participate internally, but no timer, numeric progress, objective marker, or progress bar may appear. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- **Reconnect celebration replay:** snapshots are baseline, not new witness/remix evidence. [VERIFIED: docs/design/moc-intro-tutorial-story.md] [VERIFIED: apps/web/tests/meaningverse-smoke.ts]

## Explicit Repository Conflicts to Resolve

### Mock ambient townsfolk violate “alone with Kerni”

`createMockChatTransport` currently supplies calm ambient townsfolk and periodic ambient behavior, and ADR 0002 describes Stage 0 as mock loopback plus ambient townsfolk. [VERIFIED: apps/web/src/net/chat.ts] [VERIFIED: docs/adr/0002-chat-and-voice-transport.md] Phase 1 instead locks the pre-activation world to the player alone with Kerni and prohibits ambient chat people, ghost sessions, or simulated peers. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

**Resolution:** remove or hard-gate ambient townsfolk from the Phase 1 path. Mock loopback/ambient output and backlog/scheduled messages may support adapter development, but they may **never** satisfy Witness or Remix and must never be presented as a real invited person. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] [VERIFIED: docs/design/moc-intro-tutorial-story.md]

### `TUTORIAL.enter` connects too early

The current tutorial models `Enter` as “Walk in. The room connects on its own,” and current stage tests prioritize disconnected state as `enter`. [VERIFIED: apps/web/src/meaningverse/onboardingStory.ts] [VERIFIED: apps/web/tests/meaningverse-smoke.ts] Phase 1 requires genuine isolation until the relay is assembled, placed, lit, and accepted as active. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

**Resolution:** Phase 1 must gate communication/room transport on accepted relay activation. Walking into the Street must not connect the communication room or make `ChatPanel` appear live. Update canonical stage copy/state tests rather than layering contradictory copy over `TUTORIAL.enter`. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] [VERIFIED: apps/web/src/scene/PalaceScene.tsx]

## Don't Hand-Roll

| Problem | Do not build | Use instead | Reason |
|---|---|---|---|
| World/UI transport coupling | direct relay socket or NDK calls in scene components | existing `ChatTransport` plus `nostrConfig` seams | ADR 0002 requires adapter swappability and relay-not-truth. [VERIFIED: apps/web/src/net/chat.ts] [VERIFIED: apps/web/src/net/nostrConfig.ts] [VERIFIED: docs/adr/0002-chat-and-voice-transport.md] |
| A second onboarding system | duplicate story/stage constants | extend canonical `onboardingStory.ts` and pure model helpers | Existing smoke tests assert intro order, copy, and stage order. [VERIFIED: apps/web/src/meaningverse/onboardingStory.ts] [VERIFIED: apps/web/tests/meaningverse-smoke.ts] |
| Generic crafting or placement engine | inventories, recipes, grids, free placement | exactly three phase-owned parts and one fixed socket | Generalized crafting and arbitrary placement are deferred. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] |
| Custom identity/authentication claims | session ID or handle presented as a verified human | explicit signer consent plus validated event evidence; describe only what is actually proven | Existing canon forbids presenting sessions as authenticated people. [VERIFIED: docs/design/moc-intro-tutorial-story.md] |
| Home-grown cryptography | custom signatures, hashes, or key handling | `NDKNip07Signer`/`NDKEvent` for production human signing and publish; `verifyEvent` for validation | Exact installed APIs are verified below. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/signers/nip07/index.ts] [VERIFIED: apps/web/node_modules/nostr-tools/lib/types/pure.d.ts] |
| Fake social completion | bots, timers, mock messages, Kerni, participant count | accepted, human-controlled signed pulse and optional additive lens | D-23 through D-26 are explicit. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] |
| New test framework | additional runner/config | existing `tsx` smoke pattern and package scripts | The Web package already runs TypeScript smoke tests directly. [VERIFIED: apps/web/package.json] |

## Common Pitfalls

### Pitfall 1: Presence reset or engagement coercion

**Failure:** dismissing/reopening feed resets progress, or the player must scroll/react before `Put away`.  
**Prevention:** presence is monotonic; feed state only interrupts attention. Test reopen behavior and direct dismissal. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

### Pitfall 2: Kerni becomes a quest authority

**Failure:** Kerni auto-speaks, enables state, chooses a part, signs, publishes, or completes a step.  
**Prevention:** Kerni receives presentation props and emits explicit interaction intent only; reducers own truth. The only automatic post-placement response is nonverbal. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] [VERIFIED: docs/design/kerni-workshop-companion.md]

### Pitfall 3: Light precedes accepted activation

**Failure:** local animation shows a live relay even when activation/adapter initialization failed.  
**Prevention:** distinguish `activation_pending` from accepted `open`; only accepted state drives persistent light, `OPEN`, chat eligibility, and invite availability. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

### Pitfall 4: Relay callback becomes game truth

**Failure:** any incoming event directly triggers React state or a lens animation.  
**Prevention:** parse → validate signature/event → validate phase/invite/relay binding → deduplicate → authorize transition → reduce application state → present effect. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

### Pitfall 5: Presence is mistaken for witness

**Failure:** connected participant count, room membership, or a handle completes Witness.  
**Prevention:** require explicit relay touch and a successful human-controlled signed event. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] [VERIFIED: docs/design/moc-intro-tutorial-story.md]

### Pitfall 6: Replay or reconnect duplicates feedback

**Failure:** historical pulse/lens events replay animations or duplicate remix state after resubscribe.  
**Prevention:** silent baseline plus event-ID idempotency and one accepted lens per bounded handoff. [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: apps/web/tests/meaningverse-smoke.ts]

### Pitfall 7: Invite display is reported as sharing

**Failure:** merely rendering or opening a fallback invite counts as handoff.  
**Prevention:** preserve existing copy/manual-confirm semantics and keep cancellation open. [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: apps/web/tests/meaningverse-smoke.ts] [VERIFIED: docs/design/moc-intro-tutorial-story.md]

### Pitfall 8: Unbounded relay input

**Failure:** arbitrarily large content/tags, old events, duplicate events, or event floods consume memory/CPU or mutate state.  
**Prevention:** enforce the resolved 4096-byte, exact-tag, 300/60-second freshness, 4-per-pubkey/16-global rate, and 64-ID dedup bounds recorded below; reject excess input without visible completion. [RESOLVED POLICY: bounded Phase-1 handoff]

### Pitfall 9: Accessibility depends on light/audio

**Failure:** reduced effects, muted audio, or low contrast hides presence/activation.  
**Prevention:** pair light/audio with subtitles, natural animation cues, restrained status text, and keyboard-accessible actions. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

## Code Examples / Verified Repository Patterns

### Sanitized direct-Street invite

Use the existing `buildMeaningverseInvite` helper rather than concatenating URLs. It sanitizes the invitation to the direct Street join path according to existing code insights and tests. [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: apps/web/tests/meaningverse-smoke.ts]

```ts
// Pattern only: keep the exact call signature from the repository helper.
const inviteUrl = buildMeaningverseInvite(/* current location/base inputs */);
```

The omitted parameters are deliberate; this research does not invent an unverified signature. [VERIFIED: apps/web/src/meaningverse/model.ts]

### Human signer boundary

Use the existing draft-first pattern represented by `createShipModuleNostrDraft`: application code prepares bounded data, but a human-controlled NIP-07 signer performs signing and NDK performs publishing separately. [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/signers/nip07/index.ts]

```ts
import NDK, { NDKEvent, NDKNip07Signer } from "@nostr-dev-kit/ndk";
import { verifyEvent, type Event as NostrEvent } from "nostr-tools/pure";

const signer = new NDKNip07Signer(1000, ndk);
await signer.blockUntilReady();
const event = new NDKEvent(ndk, boundedTemplate);
await event.sign(signer, { skipContentTagging: true });
const raw = event.rawEvent() as NostrEvent;
if (!verifyEvent(raw)) throw new Error("Signer returned an invalid event");
const publishedTo = await event.publish(undefined, 3000, 1, { skipContentTagging: true });
if (publishedTo.size < 1) throw new Error("No relay acknowledged publication");
```

The imports, constructor, methods, options, and return shapes are locally installed APIs. Phase-owned template construction, strict parsing, attempt invalidation, and reducer names remain planner-owned. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/dist/index.d.mts] [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/events/index.ts] [VERIFIED: apps/web/node_modules/nostr-tools/lib/types/pure.d.ts]

### Silent connected-epoch baseline

`diffShipPlacementEpoch` establishes no event feedback on initial/reconnected snapshots and emits only subsequent accepted differences. Reuse that behavioral pattern for witness/remix subscriptions. [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: apps/web/tests/meaningverse-smoke.ts]

```ts
// Verified behavioral pattern; exact relay helper name is proposed.
const result = diffRelayWitnessEpoch(previousBaseline, validatedEvents, connectionStatus);
if (!result.reset) presentOnly(result.newlyAcceptedEvents);
```

The relay-specific helper does not yet exist. [ASSUMED]

### Existing transport adapter shape

ADR 0002 and `chat.ts` define a `ChatTransport` with `send`, `subscribe`, and `dispose`, keeping UI independent from concrete transport. [VERIFIED: apps/web/src/net/chat.ts] [VERIFIED: docs/adr/0002-chat-and-voice-transport.md]

```ts
// Preserve this repository seam conceptually; inspect local source for exact types.
type ChatTransport = {
  send: unknown;
  subscribe: unknown;
  dispose: unknown;
};
```

The `unknown` placeholders intentionally avoid inventing method signatures. [VERIFIED: apps/web/src/net/chat.ts]

## Security Domain

The following controls are relevant to an ASVS-L1-style baseline for this client-side, relay-connected phase. This is a design checklist, not a claim of formal ASVS certification. [ASSUMED]

### 1. Signer consent and authority

- Signing must occur only after explicit invited-player relay interaction; entering, being present, or seeing the relay cannot trigger it. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- Show a bounded, comprehensible signer action and separate draft construction from human signing/publication. [VERIFIED: apps/web/src/meaningverse/model.ts]
- Kerni, mock transport, timers, presentation effects, and external models have no signer authority. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] [VERIFIED: docs/design/kerni-workshop-companion.md]
- Cancellation or signer failure leaves Witness incomplete and the relay honestly `OPEN`. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

### 2. Untrusted relay events

- Treat every relay event, tag, author field, content value, timestamp, and relay URL as untrusted input. [ASSUMED]
- Parse into a strict phase-owned shape and reject unknown/extra state-changing semantics before application reduction. [ASSUMED]
- Never render untrusted event content as HTML and never allow event-provided URLs to bypass the existing invite builder/configuration boundaries. [ASSUMED]
- Relay subscription callbacks must not directly set Witness/Remix completion. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

### 3. Signature and event validation

- Validate the exact structural contract first, then call `verifyEvent(event): event is VerifiedEvent` from `nostr-tools/pure` before accepting evidence. [VERIFIED: apps/web/node_modules/nostr-tools/lib/types/pure.d.ts] [VERIFIED: apps/web/node_modules/nostr-tools/lib/types/core.d.ts]
- Bind accepted evidence to this phase's relay artifact/invite context, expected action, and allowed signer flow; a valid signature on unrelated data is insufficient. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- Use the exact kind/action union and locally verified APIs in the contracts below; do not substitute an unreviewed event shape during execution. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/dist/index.d.mts] [VERIFIED: apps/web/node_modules/nostr-tools/lib/types/pure.d.ts]

### 4. Replay resistance and idempotency

- Maintain an application-owned accepted-event-ID set for the bounded session and make duplicate pulse/lens events no-ops. [ASSUMED]
- Establish a silent subscription baseline and do not replay old events as fresh light/lens feedback. [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: apps/web/tests/meaningverse-smoke.ts]
- Accept at most the phase-defined witness transition and one additive lens transition for this bounded handoff. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- Enforce the resolved `now-300 <= created_at <= now+60` evidence window and the `now-900 <= activation.created_at <= now+60` invited-landing window. [RESOLVED POLICY: bounded Phase-1 handoff]

### 5. Invite truth

- Invitation is voluntary and never auto-published/broadcast. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- Reuse the sanitized direct-Street invite builder and preserve intro bypass. [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: apps/web/tests/meaningverse-smoke.ts]
- Displaying a fallback link does not prove sharing; cancellation remains incomplete. [VERIFIED: apps/web/tests/meaningverse-smoke.ts]
- Invite/session identifiers must not be described as proof of authenticated human identity. [VERIFIED: docs/design/moc-intro-tutorial-story.md]

### 6. No fake peers

- `createMockChatTransport` ambient townsfolk, loopback messages, backlog, timers, participant counts, Kerni actions, and session heuristics are categorically ineligible for Witness or Remix. [VERIFIED: apps/web/src/net/chat.ts] [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
- If no validated invited response arrives, the relay stays `OPEN` and incomplete without penalty. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]

### 7. Rate and size bounds

- Serialize each raw candidate once and reject over `4096` UTF-8 bytes before phase parsing; require empty content, exact ordered tags, 64-hex IDs/pubkeys, 128-hex signatures, integer Unix seconds, and no unknown fields used by application truth. [RESOLVED POLICY: bounded Phase-1 handoff]
- Accept events no more than `300` seconds old and no more than `60` seconds in the future. The self-contained activation capability is valid for invited landing for `900` seconds and no more than `60` seconds in the future. [RESOLVED POLICY: bounded Phase-1 handoff]
- Process at most `4` candidates per pubkey and `16` total per rolling `60` seconds per activation; retain at most `64` candidate IDs in the activation-scoped dedup set and stop the subscription after one witness plus one lens is accepted or the scene is disposed. [RESOLVED POLICY: bounded Phase-1 handoff]
- Add fixtures exactly at and just beyond every limit; excess input is an allocation-bounded no-op and produces no scene/UI effect. [RESOLVED POLICY: bounded Phase-1 handoff]

### Security fail-closed sequence

```text
relay callback
  -> bounded raw-input check
  -> strict structural parse
  -> dependency-backed event/signature validation
  -> phase + relay/invite binding check
  -> freshness check
  -> replay/idempotency check
  -> transition authorization
  -> application reducer
  -> presentation effect
```

This sequence and its numeric limits are resolved Phase-1 policy. Exact installed API evidence is recorded below. [VERIFIED: apps/web/node_modules/nostr-tools/lib/types/pure.d.ts] [RESOLVED POLICY: bounded Phase-1 handoff]

## Validation Architecture

### Requirement-to-test map

| Requirement / decision group | Automated evidence to add | Manual/UAT evidence | Current status |
|---|---|---|---|
| **ART-01**: waiting/walking → presence → encounter/memory → artifact/community trace; feed not primary | pure tests for glimpse/feed dismissal, 30–45s eligibility boundaries, monotonic presence, reopen-not-reset, explicit Kerni `E`, and no timer/progress UI source contract | run muted/reduced-light and keyboard-only; confirm subtitles/cues and under-ten-minute path | Existing Meaningverse smoke covers adjacent canonical truth, not this complete flow. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: apps/web/tests/meaningverse-smoke.ts] |
| **ART-02**: complete local/mock walkable slice through inviteable witness/remix without broad systems | tracer state-machine test from `alone` to `open`, `witnessed`, optional `remixed`; negative cases for fake peer, signer cancel, invalid/replayed event, failed activation | two browser sessions: creator and invited signer; no-answer path remains `OPEN` | Existing tests cover invite/co-create truth and silent reconnect patterns, but not relay assembly/activation. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: apps/web/tests/meaningverse-smoke.ts] |
| **PLAC-05**: enter the social world, see finite slots, select an honestly mocked unlocked object, preview/place it legally, inspect the visible result, and observe higher-tier unlocks before broad placement systems exist | fixed-socket acceptance tests: exactly three components, no text/AI completion, single Z1 socket, additive lens does not overwrite relay | verify workbench/socket location, center-lane clearance, visible light change, original attribution retained; represent higher-tier capability honestly without implementing it | Requirement text and Phase-1 assignment are repository-defined; relay-specific tests are absent. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] |
| D-01 intro integrity | preserve existing intro sequence/card/skip assertions | verify video → three cards → Walk in | Existing coverage present. [VERIFIED: apps/web/tests/meaningverse-smoke.ts] |
| D-15 and chat gate | test transport factory/connect/send are not invoked before accepted activation; ambient townsfolk/backlog cannot appear or transition state | enter and wait before building; confirm genuine solitude | Gap. [VERIFIED: apps/web/src/net/chat.ts] |
| D-23/D-24 signed witness | kind-9127 exact-action fixtures for valid, malformed, invalid-signature, wrong-binding, signer-cancel, publish-fail, duplicate, and stale event | explicit signer consent and visible pulse only after acknowledged publish plus relay-backed acceptance | Gap; exact event fixture format and APIs are resolved below. [RESOLVED POLICY: witness/lens contract] |
| D-25 additive remix | reducer test that one accepted lens is additive/idempotent and original relay attribution is unchanged | invited session attaches lens; creator relay remains visible | Gap. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] |
| Security bounds | boundary and over-bound fixtures for 4096-byte, exact-tag, 300/60/900-second, 4/16-rate, and 64-ID dedup limits | malformed flood does not change UI truth | Wave-0 gap; numeric policy is resolved below. [RESOLVED POLICY: bounded Phase-1 handoff] |
| Reconnect truth | baseline/reconnect tests emit no historical pulse/lens feedback | reconnect both sessions and observe no duplicate celebration | Existing analogous ship coverage can be extended. [VERIFIED: apps/web/tests/meaningverse-smoke.ts] |

### Wave-0 test gaps

Create the test seams before feature expansion:

1. A pure Phase-1 state reducer/model with negative transition tests: no presence reset, no assembly by text/Kerni, no communication before accepted activation, no witness from presence/mock/backlog, no remix before witness. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
2. A bounded kind-9127 action-union validator fixture layer covering consent cancellation, malformed/extra fields, invalid signature, wrong activation/creator/witness binding, stale event, publish failure, optimistic callback, replay, and the resolved size/rate limits. Use `finalizeEvent` only for deterministic test fixtures and route them through the production parser/validator seam. [VERIFIED: apps/web/node_modules/nostr-tools/lib/types/pure.d.ts]
3. A `ChatTransport` gating test or source-contract test proving no connect/subscription/UI-live state before activation and no ambient townsfolk in the phase path. [VERIFIED: apps/web/src/net/chat.ts]
4. A Street fixed-socket interaction test for three physical parts, one socket, accepted placement, light/status output, and additive lens. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
5. Accessibility assertions for `Put away`, `E` interaction, signer action, subtitles/status, and non-color-only state. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
6. Preserve the existing intro, invitation-truth, participant-truth, and silent-reconnect tests while replacing the obsolete enter-connect assumption. [VERIFIED: apps/web/tests/meaningverse-smoke.ts]

### Quick commands

These commands use scripts/dependencies already declared by the Web package. [VERIFIED: apps/web/package.json]

```bash
# Focused existing truth suite
pnpm --filter @600b/web exec tsx tests/meaningverse-smoke.ts

# Focused transport/multiplayer regression suite when adapter or room orchestration changes
pnpm --filter @600b/web exec tsx tests/multiplayer-smoke.ts

# Static check
pnpm --filter @600b/web typecheck
```

### Full commands

```bash
# Existing full Web smoke suite
pnpm --filter @600b/web test

# Full Web type check
pnpm --filter @600b/web typecheck
```

No build or full test was executed during this bounded research retry, as explicitly required. The commands above are validation architecture for planning/execution. [VERIFIED: apps/web/package.json]

### Tracer acceptance gate before expansion

The first tracer is complete only when one local test path proves all of the following: canonical intro retained; feed directly dismissible; presence monotonic and accessible; Kerni explicit and non-authoritative; three physical parts; one accepted fixed-socket relay activation; chat unavailable beforehand; voluntary direct-Street invite; fake ambient/backlog input rejected as social evidence; signer cancellation fails closed; one validated pulse witnesses; one validated lens is additive; reconnect/replay emits no false feedback. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] [VERIFIED: apps/web/tests/meaningverse-smoke.ts]

## Verified Local Signer and Publish API

**Confidence: HIGH.** Every name and signature below comes from the installed NDK `3.0.3` or `nostr-tools` `2.23.5` package, not from memory or a web source. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/package.json] [VERIFIED: apps/web/node_modules/nostr-tools/package.json]

### Exact production imports and calls

- Root NDK exports include default `NDK`, `NDKEvent`, `NDKNip07Signer`, type `NDKSigner`, type `NDKFilter`, `NDKSubscription`, and `NDKPublishError`. `src/index.ts` re-exports the NIP-07 module and the generated declaration confirms all names. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/index.ts] [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/dist/index.d.mts]
- `new NDKNip07Signer(waitTimeout?: number, ndk?: NDK)` defaults to a 1000 ms extension wait. `blockUntilReady(): Promise<NDKUser>` calls `window.nostr.getPublicKey()`; absent extension rejects `Error("NIP-07 extension not available")`, falsy/rejected access becomes `Error("User rejected access")`, and extension-thrown errors propagate. `sign(event: NostrEvent): Promise<string>` calls `window.nostr.signEvent(event)` and returns only `.sig`; a falsy return becomes `Error("Failed to sign event")`. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/signers/nip07/index.ts]
- The generic `NDKSigner` contract is `blockUntilReady(): Promise<NDKUser>`, `user(): Promise<NDKUser>`, and `sign(event: NostrEvent): Promise<string>`; a not-ready synchronous `pubkey` getter throws. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/signers/index.ts]
- `new NDKEvent(ndk?: NDK, event?: Partial<NDKRawEvent> | NDKEvent)` accepts the bounded unsigned template. `event.sign(signer?, opts?): Promise<string>` obtains the signer user, builds the Nostr event, writes `event.sig`, and returns the signature. `event.rawEvent(): NDKRawEvent` returns `{created_at, content, tags, kind, pubkey, id, sig}`. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/events/index.ts] [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/dist/index.d.mts]
- `event.publish(relaySet?: NDKRelaySet, timeoutMs?: number, requiredRelayCount?: number, opts?: ContentTaggingOptions): Promise<Set<NDKRelay>>` signs automatically only when `sig` is absent and otherwise publishes the approved signed event. Use `await event.publish(undefined, 3000, 1, { skipContentTagging: true })`. Success resolves a non-empty relay set and marks `publishStatus="success"`; fewer than one acknowledgement for this regular kind rejects `NDKPublishError`, marks `publishStatus="error"`, and retains per-relay errors/successes. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/events/index.ts] [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/relay/sets/index.ts]
- `ndk.subscribe(filters: NDKFilter | NDKFilter[], opts?, ...): NDKSubscription`; filters support `ids`, `kinds`, `authors`, `since`, `until`, `limit`, and `#<tag>` keys. `NDKSubscription.stop(): void` disposes it. Prefer the race-free `opts.onEvent(event, relay, subscription, fromCache, optimisticPublish)` callback and `opts.onEose`. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/ndk/index.ts] [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/subscription/index.ts] [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/dist/index.d.mts]
- `import { verifyEvent, type Event, type EventTemplate, type VerifiedEvent } from "nostr-tools/pure"`; `verifyEvent(event: Event): event is VerifiedEvent`. Installed event shape is exactly `kind`, `tags`, `content`, `created_at`, `pubkey`, `id`, and `sig`. [VERIFIED: apps/web/node_modules/nostr-tools/lib/types/pure.d.ts] [VERIFIED: apps/web/node_modules/nostr-tools/lib/types/core.d.ts] [VERIFIED: apps/web/node_modules/nostr-tools/package.json]

### Capability, consent, failure, and retry contract

1. Detect capability before opening consent: browser context plus callable `window.nostr.getPublicKey` and `window.nostr.signEvent`. Missing capability shows an install/enable-signer failure and never constructs an accepted fact. Instantiate a **fresh** `NDKNip07Signer(1000, getNdk())` for each explicit retry so a memoized rejected `user()` promise is not reused. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/signers/nip07/index.ts]
2. Build and strict-validate one unsigned Phase-1 `EventTemplate`; show the exact action (`activate-relay-invite`, `touch-relay-witness`, or `attach-signal-lens`) and bound relay/lineage in Palace UI; only the explicit primary action calls `blockUntilReady()` then `event.sign(signer, { skipContentTagging: true })`. Arrival, proximity, copy-panel display, timers, and callbacks never call the signer. [RESOLVED POLICY: D-21 through D-25]
3. Re-parse `event.rawEvent()` as untrusted data, require exact returned pubkey/shape/bindings, then call `verifyEvent`. A signature string alone is not accepted. [VERIFIED: apps/web/node_modules/nostr-tools/lib/types/pure.d.ts]
4. NIP-07 exposes no `AbortSignal` or cancellation method in the installed contract. `Cancel signing` invalidates an application-owned attempt token and ignores any later resolve/reject; it cannot promise to close an extension popup. Rejection, missing extension, malformed result, and late result all leave prior truth unchanged. Retry creates a new attempt and signer. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/signers/nip07/index.ts]
5. For witness/lens, publish only after returned-event validation. Keep status pending until `publish(..., 3000, 1, ...)` resolves with at least one relay. Publish reject/timeout leaves evidence unaccepted and offers explicit retry; retry may republish the same already-signed event after revalidation, avoiding a second signer prompt unless the draft expired. Never accept from NDK's optimistic dispatch: ignore callbacks with `optimisticPublish === true` or no relay. Creator truth advances only from a later relay-backed, parsed, verified, bound, fresh, rate-allowed, deduplicated event. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/events/index.ts] [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/relay/sets/index.ts] [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/subscription/index.ts]

### Production/test boundary and no-go alternatives

- **Production:** NIP-07 via `NDKNip07Signer` for activation-capability, witness, and lens approval. The app never receives or stores an nsec. [HIGH]
- **Tests only:** `nostr-tools/pure` exposes `generateSecretKey()` and `finalizeEvent(template, secretKey): VerifiedEvent`; use deterministic fixture keys only inside tests. `NDKPrivateKeySigner` and `apps/web/src/identity/keyStore.ts` are also demo/test-key paths and are forbidden for production Phase-1 invite, witness, or lens. Never log or place secret material in URLs. [VERIFIED: apps/web/node_modules/nostr-tools/lib/types/pure.d.ts] [VERIFIED: apps/web/src/identity/keyStore.ts]
- **NO-GO:** direct untyped `window.nostr.signEvent` in scene/UI, app-held/private nsec, `getOrCreateDemoSigner`, `finalizeEvent` in production, accepting only a returned `.sig`, accepting an optimistic local callback, or treating signer approval as publication success. [HIGH]

## Bounded Cross-Browser Relay Handoff Contract

**Recommendation: choose a signed self-contained activation capability in the voluntary invite URL. Confidence: HIGH for implementability with installed APIs; MEDIUM for the numeric 15-minute product policy, which is intentionally phase-local.** This is the smallest mechanism that transfers the same accepted relay into a fresh browser without a database, broad persistence, server protocol expansion, or a fake local route assertion. [VERIFIED: apps/web/src/meaningverse/model.ts] [VERIFIED: docs/adr/0002-chat-and-voice-transport.md]

### Repository-compatible options adjudicated

| Option | Result | Reason |
|---|---|---|
| (a) Signed self-contained activation capability in invite URL | **SELECTED** | One explicit creator NIP-07 approval at `Copy invite`; fresh browser verifies locally; no activation publication, lookup service, or durable store. D-21 remains voluntary and the route is evidence, not truth. [HIGH] |
| (b) Published Nostr activation capability referenced by event ID | **NO-GO for Phase 1** | Adds activation publish, relay lookup/availability, historical query, and ambiguity between relay retention and app truth before witness even starts. It is larger than the bounded handoff. [HIGH] |
| (c) Bounded authoritative room/server handoff | **NO-GO for Phase 1** | Could be honest, but adds server message/state/version/lifetime work and risks conflating volatile Colyseus presence with durable relay activation; ADR 0009 says room state is volatile and not Nostr/application truth. [VERIFIED: docs/adr/0009-public-realtime-street.md] |

### Exact capability and route

- The creator's reducer first accepts local fixed-socket activation and allocates the fixed artifact ID `werkstattgasse:z1:relay:1`. Persistent amber light and `OPEN` remain local app truth; no signing is needed merely to light it. [RESOLVED POLICY: D-19/D-20]
- On explicit `Copy invite`, build kind `9127`, empty-content activation template with these exact ordered tags: `[["t","palace-phase-1"],["action","activate-relay-invite"],["relay","werkstattgasse:z1:relay:1"],["creator",<creator-pubkey>]]`. The `creator` value must equal the NIP-07 returned event `pubkey`. Sign and verify it, but do **not** publish it. [RESOLVED POLICY: D-21]
- Route is exactly `?join=street&activation=<base64url(UTF-8 JSON of the complete verified activation event)>`. Extend the invite builder/parser to allow only `join` and `activation`; remove all other query/hash input. Maximum decoded capability is 4096 bytes. No secret is present: this is a public signed event. [RESOLVED POLICY: bounded invite]
- The activation event's `id` is the `activationId`; its `pubkey` is the creator attribution key. Witness and lens reference this immutable lineage. [RESOLVED POLICY: bounded invite]

### Fresh-browser verification and reconstruction order

1. Require exact `join=street` and exactly one `activation` parameter; base64url-decode to at most 4096 UTF-8 bytes; JSON-parse without prototype merging. Any error takes the canonical creator route and shows no lit-relay claim. [HIGH]
2. Require exact seven-field event structure, kind `9127`, empty content, exact four ordered tags above, fixed relay ID, `creator === pubkey`, 64-hex `id/pubkey`, 128-hex `sig`, and integer `created_at`. [HIGH]
3. Call `verifyEvent`; then require `created_at <= now+60` and `created_at >= now-900`. Only then dispatch an application action such as `importVerifiedActivationCapability`. [VERIFIED: apps/web/node_modules/nostr-tools/lib/types/pure.d.ts] [RESOLVED POLICY: 15-minute invite]
4. The reducer reconstructs a bounded imported fact `{ relayId, activationId:event.id, creatorPubkey:event.pubkey, acceptedAt:now, source:"verified-invite-capability" }`; this fact, not the route/parser/relay, authorizes intro/feed bypass, lit rendering, and witness eligibility. It does not restore assembly history, ownership, a general session, or broad persistence. [RESOLVED POLICY: D-20/D-22]
5. A second use within the 15-minute window is harmless and activation-ID-idempotent. After expiry, wrong binding, mutation, or invalid signature, landing fails closed with canonical unlit creator flow; it must not silently show `INVITED TO A LIT RELAY`. Existing accepted creator state is never downgraded by a bad URL. [HIGH]

## Witness and Lens Event Contract

**Recommendation: one private Phase-1 kind (`9127`) with an exact three-action discriminated union. Confidence: HIGH.** A single strict parser/validator/subscription is smaller and lets Plan 04 deliver a generic bounded transport contract consumed unchanged by Plan 05. Separate kinds add no authority benefit in this one-witness/one-lens slice. [RESOLVED POLICY: Claude's discretion]

### Exact action union

All events have empty `content`, integer Unix-second `created_at`, and kind `9127`. Tag order and count are exact; unknown, duplicate, reordered, short, or extra tags fail parsing.

| Action | Exact ordered tags | Additional authorization |
|---|---|---|
| `activate-relay-invite` | `t=palace-phase-1`; `action=activate-relay-invite`; `relay=werkstattgasse:z1:relay:1`; `creator=<event.pubkey>` | Local activation must already be accepted before draft creation; sign only on explicit invite action; never publish. |
| `touch-relay-witness` | `t=palace-phase-1`; `action=touch-relay-witness`; `relay=werkstattgasse:z1:relay:1`; `e=<activationId>`; `p=<creatorPubkey>` | `e` and `p` must match the verified activation capability/current creator fact; witness pubkey must differ from creator pubkey; accept at most one witness ID. |
| `attach-signal-lens` | `t=palace-phase-1`; `action=attach-signal-lens`; `relay=werkstattgasse:z1:relay:1`; `e=<activationId>`; `p=<creatorPubkey>`; `w=<acceptedWitnessId>` | Accepted witness must exist; lens event pubkey must equal accepted witness pubkey; accept at most one lens ID; original relay/creator fields are immutable. |

The narrow subscription is `NDKFilter<number> = { kinds:[9127], "#e":[activationId], since: activationCreatedAt-60, limit:16 }`; use relay-only/live handling, establish EOSE as a silent baseline, ignore cache/optimistic/no-relay callbacks, and call `stop()` after witness+lens acceptance or disposal. The exact action parser still rejects unrelated kind-9127 events. [VERIFIED: apps/web/node_modules/@nostr-dev-kit/ndk/src/subscription/index.ts]

### End-to-end evidence path

For **both witness and lens** use: explicit eligible proximity action → focused consent showing action/relay/lineage → strict unsigned draft → fresh NIP-07 signer readiness → sign → strict parse returned `rawEvent` → `verifyEvent` → binding/freshness check → NDK publish requiring one acknowledgement → relay-backed receive → serialized 4096-byte cap → strict parse → `verifyEvent` → action/activation/creator/(witness) binding → 300-second freshness/60-second future bound → `4/pubkey` and `16/global` per 60 seconds → 64-ID dedup → reducer authorization → accepted application fact → pulse/lens presentation. [HIGH]

Signer rejection/cancel, malformed return, invalid signature, publish rejection/timeout, optimistic callback, baseline history, stale/future event, wrong creator/activation/witness, duplicate, over-rate input, second witness, pre-witness lens, second lens, or creator-as-witness are no-ops on application truth. A retry reuses a still-fresh verified signed event only for publish retry; otherwise it creates a new explicit signer attempt. [HIGH]

**Plan boundary decision:** Plan 04 must create the generic `9127` action-union template/parser/validator, NIP-07 adapter, publish path, subscription filter, bounds/rate/dedup, and network-free fixture coverage for all three actions. Plan 05 consumes already accepted `attach-signal-lens` evidence and modifies reducer/presentation only; it must not modify `phase1RelayTransport.ts`. If the planner refuses this boundary, Plan 05 must explicitly list and modify that transport file and add the full lens sign/publish/receive contract; the current plan may not claim nonexistent Plan-04 lens evidence. [HIGH]

### Explicit no-go alternatives

- **NO-GO:** witness-only transport in Plan 04 followed by transport-free lens claims in Plan 05; separate unbound lens state; lens before witness; creator replacement; arbitrary content/tags; generic event composer; NIP-46; app-held nsec; mock/loopback evidence; direct reducer acceptance from test fixtures; and acceptance on sign success before acknowledged publish plus relay-backed validation. [HIGH]

## Assumptions Log

| ID | Status | Resolution |
|---|---|---|
| A-01 | **RESOLVED — HIGH** | Installed `NDKNip07Signer`, `NDKEvent`, `NDKSubscription`, and `verifyEvent` APIs are exact and cited above. |
| A-02 | **Planner-owned naming only** | Keep one small pure Phase-1 reducer beside `meaningverse/model.ts`; exact filename/symbol names do not affect the technical contract. |
| A-03 | **RESOLVED — HIGH** | Kind `9127` with exact three-action union and lineage tags above. |
| A-04 | **RESOLVED — MEDIUM** | 4096-byte, 300/60-second evidence freshness, 900/60-second activation freshness, 4-per-pubkey/16-global rate, 64-ID dedup, and exact tag caps above. |
| A-05 | **RESOLVED — HIGH** | Dedup/rate state is activation-scoped, memory-only, max 64 IDs, and disposed with the scene; self-contained invite carries only bounded activation evidence. |
| A-06 | **UNCHANGED SCOPE NOTE** | ASVS-L1 language remains a local checklist, not a certification claim. |
| A-07 | **Planner-owned naming only** | New helper names remain illustrative; installed external API names are exact. |

## Open Questions (RESOLVED)

1. **Minimal event kind/payload:** resolved to private kind `9127` and the exact `activate-relay-invite | touch-relay-witness | attach-signal-lens` tag union above. A valid signature proves key control for that event only. [HIGH]
2. **Local signer/validator/publish primitive:** resolved to `NDKNip07Signer` + `NDKEvent.sign` + `NDKEvent.publish` and `nostr-tools/pure.verifyEvent`, with exact installed signatures above. [HIGH]
3. **Conservative bounds:** resolved to the exact byte, shape, time, rate, and dedup limits above. [MEDIUM because limits are phase policy; HIGH implementability]
4. **Transport shape:** resolved to a narrow `phase1RelayTransport` beside, not inside the generic `ChatTransport` message shape, while preserving ADR 0002 adapter isolation. It owns all three Phase-1 actions; scene/UI remain SDK-free. [HIGH]
5. **Same lit relay in a fresh browser:** resolved to the verified, signed, self-contained activation capability in allowlisted route param `activation`; route parsing alone never creates accepted/lit truth. [HIGH]
6. **Presence choreography:** resolved by locked UI contract to exactly `36s` attentive time, with environmental plateaus, subtitles/static shape changes, no looping progress UI, muted equivalence, and reduced-effects static equivalents. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-UI-SPEC.md]

No Phase-1 research question remains open. Product choices D-01–D-26 are locked in `01-CONTEXT.md`; detailed invite, consent, no-answer, lens, focus, copy, 1280×720, 200%-zoom, and animation timing are locked in `01-UI-SPEC.md`. [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md] [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-UI-SPEC.md]

## Planner Revision Instructions

| Checker blocker/warning | Plans/files that must change | Exact revision |
|---|---|---|
| ART-01 memory/inspiration semantic gap | Plan 02 truth task and Plan 03 assembly entry/tests | Add an explicit application-owned memory-fragment fact after Kerni's acknowledged encounter and require `memory fragment + player inspiration/choice` before entering relay assembly; the fragment is bounded handoff state, not broad persistence. Test that direct presence/Kerni/scene intent cannot skip it. |
| Same relay in two browsers | Plan 04 Task 1; `model.ts`, `phase1Relay.ts`, overlay, scene, smoke | Replace bare `?join=street` with allowlisted signed `activation` capability contract and verification/reducer sequence above. Malformed/expired capability must not bypass intro or render lit. Update invite consent copy because `Copy invite` requires creator NIP-07 approval but does not publish. |
| Concrete signer and publish | Plan 04 transport task/frontmatter; `phase1RelayTransport.ts`, security smoke | Name exact imports/methods, implement capability detection/attempt invalidation, validate returned raw event, call `publish(undefined,3000,1,{skipContentTagging:true})`, ignore optimistic callbacks, and prove sign-without-publish-success cannot accept. |
| Lens schema/Plan-04→05 mismatch | Prefer Plan 04 generic transport task/tests; Plan 05 reducer/presentation only | Plan 04 must define/test all three actions and the lens filter/consent/sign/publish/receive pipeline. Plan 05 consumes accepted lens evidence without touching transport. Otherwise Plan 05 frontmatter/task files must add `phase1RelayTransport.ts` and own the full contract. |
| Tracer activation bypass | Plan 03 reducer/orchestration tasks/tests | Remove the Plan-01 direct scene `pending → accepted` production shortcut or permanently gate it on completed ordered assembly, memory+inspiration, and current fixed-socket pending winner; add an explicit old-shortcut no-op regression. |
| Validation-map warning | Phase-wide planner maintenance; `01-VALIDATION.md` | Align old `phase-one-*` names with the five planned `phase1-*` smoke files and only change Nyquist/Wave-0 flags when the revised executable coverage is consistent. |

Plan 04 and COVERAGE must also stop saying the schema is witness-only: coverage now includes activation-capability signing (no publish), witness publish/receive, and lens publish/receive. Plans must preserve D-20 app-owned truth, D-21 voluntary/no auto-broadcast, D-22 verified direct landing, D-23/D-24 explicit human signing, D-25 additive lineage, and D-26 honest no-answer. [HIGH]

## Planning Conclusion

Use the current stack with no installation. Begin with tests and a narrow application-owned truth tracer, then bind existing scene components and transport seams to accepted state. The planner must schedule conflict removal/gating (`createMockChatTransport` ambience and enter-time connection) as part of the tracer, not as later cleanup. Communication starts only after accepted relay activation; Witness and Remix start only after validated, explicit human-controlled evidence. [VERIFIED: apps/web/src/net/chat.ts] [VERIFIED: apps/web/src/meaningverse/onboardingStory.ts] [VERIFIED: .planning/phases/01-visible-art-in-werkstattgasse/01-CONTEXT.md]
