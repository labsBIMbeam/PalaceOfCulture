# Phase 1: Visible Art in Werkstattgasse - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the first coherent desktop-Web Palace slice in the linear Werkstattgasse. A player enters
alone with Kerni, deliberately leaves a tempting feed, becomes present, builds and places one small
useful artifact in under ten minutes, and opens an honest bounded handoff to one other person.

For this phase, the artifact is a diegetic, luminous Nostr relay assembled at Kerni's workbench. It
changes the visible world from isolated and quiet to capable of communication. The handoff ends when
a real invited person witnesses the relay with a signed light pulse and may attach one small remix
lens. No fake peer, ambient bot, timer, or Kerni action may complete that social step.

This phase does not add broad social feeds, open-world placement, economy, timelocks, generalized
crafting, voice, moderation, production-scale multiplayer, or the later Palace topology.

</domain>

<decisions>
## Implementation Decisions

### Entry and presence rhythm
- **D-01:** Preserve the canonical intro order: the approved five-second raccoon-to-Kerni video,
  then the three authoritative story cards, then `Walk in`.
- **D-02:** After entering the Street, show a short unobstructed world glimpse before a fictional
  feed pushes itself into the foreground.
- **D-03:** The feed can always be dismissed through one large, honest `Put away` action. No scroll,
  reaction, or other engagement is required before leaving it.
- **D-04:** Presence emerges over 30–45 seconds of walking or quietly remaining in the world. Do not
  show a timer, number, objective marker, or progress bar.
- **D-05:** Communicate presence through light, sound, natural world reactions, and environmental
  animation. Provide subtitles and natural animation cues so the transition remains legible without
  sound or strong lighting effects.
- **D-06:** Reopening the feed interrupts attention but never removes presence already gained and
  never resets the transition.
- **D-07:** Feed cards are short, believable fictional news/status items: calmly tempting, slightly
  absurd, and never copied from current real headlines or framed as a moral lecture.

### Kerni as the first helper
- **D-08:** Kerni is the raccoon in another form and the first helper encountered after the intro.
  Kerni is a companion and Schaffenwerkzeug, never a rescuer, quest authority, moderator, or source
  of game truth.
- **D-09:** Kerni is always physically present, small and peripheral beside the first workbench in
  Street zone Z1. Presence makes Kerni noticeable; it does not spawn, unlock, or authorize Kerni.
- **D-10:** Kerni never blocks the path or follows the player. The first spoken interaction requires
  proximity plus an explicit `E` press.
- **D-11:** On that first interaction Kerni speaks exactly one orientation line and then remains
  quiet: “Welcome. No rush — the Palace gets better when people leave something useful behind.
  Start with one small thing.”
- **D-12:** Show `KERNI · WORLD AGENT · SUGGESTION ONLY` as a small proximity/inspect label, not a
  permanent floating sign.
- **D-13:** Kerni may indicate the workbench but cannot choose, generate, assemble, place, sign,
  publish, or complete the relay for the player.
- **D-14:** After successful placement Kerni gives one short automatic nonverbal reaction. Kerni does
  not auto-speak, preserving the canonical authority boundary.

### Luminous Nostr relay and placement
- **D-15:** Before the relay is built, the player is genuinely alone in the world with Kerni. No
  ambient chat people, ghost sessions, or simulated peers are visible.
- **D-16:** The first player-created artifact is a small luminous Nostr relay: a useful, handmade
  communication object rather than loot or a generic decorative picture.
- **D-17:** The player physically assembles three visible relay components at the workbench. Text
  input or AI generation must not build it on the player's behalf.
- **D-18:** Phase 1 uses one fixed relay socket directly at Kerni's Z1 workbench. Multiple sockets,
  arbitrary grid placement, and free world placement are out of scope here.
- **D-19:** The completed relay snaps into the fixed socket and lights automatically. The light is
  the primary visible world change and signifies that communication is now possible.
- **D-20:** The diegetic relay is an interface to the bounded Nostr communication path, never the
  source of application truth. The planner must preserve the transport-adapter boundary from ADR
  0002 rather than coupling world UI directly to one relay implementation.

### Witness and remix handoff
- **D-21:** After activation the relay shows a restrained `OPEN` status and offers a voluntary invite
  link. It must not publish or broadcast an invitation automatically. This was selected as the safe
  default after the interaction timed out.
- **D-22:** The invite opens the same Werkstattgasse directly at the lit relay and bypasses the
  creator intro. This preserves the existing invite-bypass contract and was selected as the safe
  default after the interaction timed out.
- **D-23:** Mere presence does not count as witnessing. The invited person explicitly touches the
  relay and sends a signed light pulse.
- **D-24:** A claimed signed pulse must be backed by an actual human-controlled signing action/event.
  A mock, bot, Kerni, timer, session-count heuristic, or ambient message cannot fabricate it.
- **D-25:** The invited person may remix by attaching one second small signal lens. The original
  relay remains intact and attributable; the added lens is visibly additive, not an overwrite.
- **D-26:** If nobody answers, the relay remains lit and `OPEN` without penalty. The loop stays
  honestly incomplete rather than simulating social proof.

### Claude's Discretion
- Exact feed-card copy within the fictional, calm, slightly absurd tone.
- Exact lighting, audio, animation, and subtitle choreography within the 30–45 second presence range.
- Exact visual forms, materials, and assembly motion for the three relay parts and second signal lens,
  while preserving the established dark warm workshop language and mobile performance budget.
- Exact event kind, signer UI, and adapter implementation for the signed light pulse, provided the
  result is human-controlled, fail-closed, testable, and does not let Nostr become application truth.
- Exact nonverbal Kerni acknowledgement after placement.

</decisions>

<specifics>
## Specific Ideas

- Felix's defining statement: “ein Nostr Relay um mit den anderen zu kommunizieren. davor ist er
  alleine in welt mit kerni”.
- Kerni is explicitly the helper. “Helper” here means calm orientation and practical indication, not
  authority, rescue, automated creation, or autonomous action.
- The approved visual identity beat already exists at `apps/web/public/intro.mp4`: natural raccoon,
  restrained copper-particle dissolve, lantern-form Kerni above Locktard Street.
- The emotional transition is intentionally physical and visible: alone with Kerni → assemble three
  parts → snap the relay into place → light appears → an honest channel to another person becomes
  available.
- The second person's witness should read as a light travelling through the relay, followed by one
  small attached lens that makes co-creation visible without erasing the first contribution.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core loop and visible contribution
- `docs/design/fertile-boredom-social-art-loop.md` — anti-feed presence sequence, encounter-to-memory
  art loop, under-ten-minute target, and non-punitive waiting.
- `docs/design/private-to-palace-asset-concept.md` — private expression to bounded public placement,
  visible world change, finite slots, and invite/witness/remix handoff.

### Kerni and intro
- `docs/design/kerni-workshop-companion.md` — canonical helper/companion temperament, player-initiated
  orientation, first welcome line, embodiment, and suggestion-only authority boundary.
- `docs/design/moc-intro-tutorial-story.md` — raccoon identity, authoritative story cards, invite
  truth, no-fake-peer contract, and Kerni's prohibited actions.
- `docs/assets/intro-kerni-grok.md` — approved intro-video provenance, integrity hashes, runtime
  paths, duration, and fallback relationship to the story cards.

### Street and communication architecture
- `docs/adr/0002-chat-and-voice-transport.md` — `ChatTransport` adapter boundary, mock-to-NIP-29
  migration, Nostr identity/signing direction, and relay-not-truth invariant.
- `docs/adr/0009-public-realtime-street.md` — Street as the first public realtime world.
- `docs/STREET-LEVEL-PLAN.md` — linear five-zone Street topology, Z1 workshop row, interaction
  density, grid, palette, and mobile performance envelope.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/public/intro.mp4`: approved five-second raccoon-to-Kerni identity beat.
- `apps/web/src/meaningverse/onboardingStory.ts`: canonical video/cards sequence, skip semantics,
  first Kerni welcome line, tutorial stage vocabulary, honest invite state, and no-peer fallback.
- `apps/web/src/scene/KerniFamiliar.tsx` and `apps/web/public/npc/kerni.glb`: existing Web Kerni
  embodiment and runtime art.
- `apps/web/src/scene/StreetWorld.tsx`: current Street environment where the fixed Z1 workbench relay
  socket belongs.
- `apps/web/src/frontend/GameFrontend.tsx` and `apps/web/src/scene/PalaceScene.tsx`: runtime shell and
  orchestration seam for intro, feed/presence state, chat visibility, and world UI.
- `apps/web/src/ui/BuilderHud.tsx` and `apps/web/src/ui/MeaningPath.tsx`: existing builder/tutorial UI;
  `MeaningPath` already copies the direct Street invitation.
- `apps/web/src/meaningverse/model.ts`: `buildMeaningverseInvite`, confirmed-placement diffing,
  co-creation truth checks, and the human-signer-only `createShipModuleNostrDraft` pattern.
- `apps/web/src/net/chat.ts`: `ChatTransport` adapter and current mock implementation.
- `apps/web/src/net/nostrConfig.ts`: pure public-relay configuration seam.
- `apps/web/src/scene/MeaningShip.tsx`: confirmed-placement pulse pattern that may inform relay/light
  feedback without coupling the relay to the ship implementation.

### Established Patterns
- Application-owned facts determine progress. Presentation, Kerni, Nostr, and external models cannot
  transition or complete state on their own.
- Intro video is decorative; story-card fallback remains authoritative and skippable only according
  to `introSkipTarget`.
- Invitation URLs are sanitized to `?join=street` by `buildMeaningverseInvite`.
- Placement feedback is silent on initial sync and fires only for new confirmed events.
- Nostr drafts are prepared separately from human-controlled signing and publication.

### Known Conflicts to Resolve in This Phase
- `apps/web/src/net/chat.ts` currently preloads named townsfolk and emits periodic ambient messages.
  That directly conflicts with D-15 and the no-fake-peer contract. Phase 1 must remove or gate those
  fabricated people from this path; they can never satisfy witness/remix.
- `apps/web/src/meaningverse/onboardingStory.ts` currently says the live room connects on `Enter` and
  models creation as naming a ship part. The phase flow must instead keep the player alone until the
  relay is assembled and lit, then expose communication.
- `apps/web/src/scene/PalaceScene.tsx` currently renders `ChatPanel` broadly outside build/decorate
  modes. The communication UI must remain unavailable or honestly disconnected before relay light.

### Integration Points
- Mount the fixed socket and relay assembly interaction in `StreetWorld.tsx` Z1 near
  `KerniFamiliar.tsx`.
- Coordinate feed/presence, Kerni noticeability, relay assembly/placement, and ChatPanel gating from
  the existing `PalaceScene.tsx`/frontend orchestration seam rather than adding a parallel app shell.
- Extend or adapt `ChatTransport`; do not import a Nostr SDK directly into world UI components.
- Reuse `buildMeaningverseInvite` and preserve invitation intro bypass.
- Add an application-owned witness/remix state transition that validates the human-controlled signed
  pulse and additive lens before showing completion.

</code_context>

<deferred>
## Deferred Ideas

- Multiple relay sockets, arbitrary Z1 grid placement, and open-world relay placement.
- Automatic public Nostr broadcasts, general social feeds, broad chat channels, and voice.
- Production-scale relay hosting, moderation, reconnection policy, broad identity UX, and many-user
  concurrency beyond the bounded two-person handoff.
- Economy, zaps, timelocks, Palace ownership, generalized crafting, and the later Palace Ringstadt.

</deferred>

---

*Phase: 01-visible-art-in-werkstattgasse*
*Context gathered: 2026-07-26*
