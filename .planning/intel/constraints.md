## Avatar output contract
- source: docs/AVATAR-PIPELINE.md
- type: protocol
- content: Emit VRM 1.0 humanoids with complete VRM Humanoid bones, MToon materials, simplified toon styling, content hash, manifest registration, and rejection or logged downgrade when budget/style checks fail.

## Avatar runtime budget
- source: docs/AVATAR-PIPELINE.md
- type: nfr
- content: Hero avatars are limited to about 50k triangles, four materials, roughly 90 humanoid bones plus a few spring chains, with low-LOD or impostor treatment for distant crowds.

## Headless avatar stages
- source: docs/AVATAR-PIPELINE.md
- type: protocol
- content: The Linux pipeline runs stylize, image-to-3D, auto-rig, VRM/MToon conversion, validation, and publish as swappable stages; animation clips remain shared and retarget through the common humanoid rig.

## Avatar agent interface
- source: docs/AVATAR-PIPELINE.md
- type: api-contract
- content: A content-idempotent avatar_pipeline.py accepts an image or prompt plus optional AvatarConfig hints, engine and quality, and emits a VRM plus report fields vrm, sha256, tris, materials, bones, humanoidComplete, downgraded, and notes.

## Citadel provider boundary
- source: docs/CITADEL-INTEGRATION.md
- type: protocol
- content: Palace consumes a versioned static Citadel provider export; it never imports Citadel TypeScript, scrapes HTML, modifies the provider repository, or treats provider status as Palace authority.

## Citadel catalog schema
- source: docs/CITADEL-INTEGRATION.md
- type: schema
- content: A palace.provider.catalog protocolVersion 1 document carries provider id, revision, generation time, guild charters, Activities, and curations without signer fields; Activity records retain stable external id, source URL, retrieval/hash data, normalized and original maturity, and license attribution.

## Citadel snapshot acceptance
- source: docs/CITADEL-INTEGRATION.md
- type: protocol
- content: The server size-limits, validates, canonicalizes, compares, and appends provider.snapshot.accepted to SQLite before projections change; invalid, older, or unexplained mutations are rejected and offline clients retain a visibly aged last accepted snapshot.

## Citadel keyless security
- source: docs/CITADEL-INTEGRATION.md
- type: nfr
- content: Provider catalogs, browser fixtures, URLs, and audit payloads contain no nsec, NWC secret, relay credential, or deterministic seed; a later audited signer binding may attach or rotate an npub without changing the durable guild id or history.

## Citadel provenance and world proxies
- source: docs/CITADEL-INTEGRATION.md
- type: nfr
- content: Web and world inspection expose source, maturity, license, and provider attribution; CC0 models are labeled WORLD PROXY rather than technical representations; support actions appear only for published recipients.

## Guild value flow
- source: docs/GUILD-ECONOMY.md
- type: protocol
- content: Guild economics use NIP-29 groups, direct NIP-57/Podcasting 2.0 recipient splits, NIP-75 goals, NIP-53 live events, NIP-52 calendars, zero-buff badges, lists, and ownership revisions without officer-spendable pooled custody.

## Forbidden guild economics
- source: docs/GUILD-ECONOMY.md
- type: nfr
- content: No pooled wallet, standing tithe, quota, member-count threshold, or amount-ranked leaderboard is allowed; only one-way material gifts may pool, and any future treasury remains standing individual co-signed timelocks.

## Moon Night event protocol
- source: docs/GUILD-ECONOMY.md
- type: protocol
- content: Every 4,320 blocks opens a 2.1-hour Moon Night with up to six 21-minute guild slots; each slot is a NIP-53 event with live chat, HLS and liveItem interoperability, explicit direct-recipient split, 48-hour echo, and no material reward.

## Guild economy reconciliation
- source: docs/GUILD-ECONOMY.md
- type: nfr
- content: Plays, boosts, joins, split receipts, and relay publication are audited and reconciled; relay or wallet discrepancies surface rather than becoming trusted state.

## Palace domain grammar
- source: docs/PALACE-CORE.md
- type: schema
- content: Palace Core defines stable Guild, Activity, CurationEntry, Lens, Session, and Place identities; Activities are canonical provider-backed objects, guild curations reference rather than copy them, and membership is many-to-many.

## Palace curation ordering
- source: docs/PALACE-CORE.md
- type: protocol
- content: Project latest curation per scope/activity, remove hidden or unavailable Activities, apply the selected lens, sort featured and explicit positions first, then curation time and stable id; zaps, plays, dwell, followers, and outrage never reorder results.

## Palace audit boundary
- source: docs/PALACE-CORE.md
- type: protocol
- content: Membership, curation, Activity, Session, guild, and arcade decisions append actor, reason, and canonical state to SQLite before external publication; movement, heartbeat, transient voice, high-frequency frames, and local layout remain ephemeral.

## Palace surface parity
- source: docs/PALACE-CORE.md
- type: api-contract
- content: Web, world, and arcade use the same durable ids and action semantics; the persistent shell retains identity, active lens, current Session, chat, people, handoff, and reconnect state while renderers change.

## Palace Session handoff
- source: docs/PALACE-CORE.md
- type: api-contract
- content: HTTPS Session URLs resolve the same server Session for web or world; embedded clients use versioned package-shared messages and never supply wallet credentials, private keys, or authoritative actor roles.

## Arcade sandbox boundary
- source: docs/PALACE-CORE.md
- type: protocol
- content: Hash-pinned approved manifests define exact origins or scene ids; web games run sandboxed, postMessage validates origin/version/type/bounds, proposed results are membership- and replay-checked, and no game directly mutates guilds, inventory, scores, signing, or NWC state.

## Werkstattgasse five-zone layout
- source: docs/STREET-LEVEL-PLAN.md
- type: schema
- content: The current linear lane runs from gate through workshop row, market square, tavern bend, and old-town terminus with one focal vertical and deliberate density rhythm per zone.

## Werkstattgasse composition
- source: docs/STREET-LEVEL-PLAN.md
- type: nfr
- content: Preserve an asymmetric but balanced layout, clear roughly 8m center lane, wall-hugging props, gate framing, widened square, visible terminus, limited repeated kit, and an adopted rustic-to-cyber gradient concentrated in zones 3 and 4.

## Werkstattgasse art pipeline
- source: docs/STREET-LEVEL-PLAN.md
- type: protocol
- content: Lock the data-driven greybox before Blender cohesion work; use a warm rustic palette, high roughness, restrained warm tech accents, repeated variation, and re-run the scripted rustic regrade after fetched GLB assets change.

## Street scene physics split
- source: docs/VERDICHTEN-BRIEF.md
- type: protocol
- content: Scenery remains outside Physics and lightweight colliders inside; every moved building, tree, gate, or fence derives visual and collision placement from the same shared function or constant; remote players remain non-colliding visuals.

## Street asset rendering
- source: docs/VERDICHTEN-BRIEF.md
- type: nfr
- content: Fit every GLB by target height, instance repeated props and vegetation, ration realtime and shadow-casting lights, limit transparent overdraw, and keep immutable art separate from application state.

## Street compaction intent
- source: docs/VERDICHTEN-BRIEF.md
- type: nfr
- content: Compact fence, forest, buildings, workshop, and props around the approach and plaza without blocking the clear center lane; strengthen the prepared site, tended tree, workshop chimney, warm dusk hierarchy, and deterministic vegetation.

## Street production verification
- source: docs/VERDICHTEN-BRIEF.md
- type: protocol
- content: Validate the street through typecheck, formatting, production build, clean browser console, aligned solid buildings/fence/trees, open south gate, and visual evidence of plaza and workshop density; the superseded mobile-web gameplay target is not carried forward.

## Multi-scale construction grammar
- source: docs/design/enshrouded-building-learning-automation.md
- type: schema
- content: Construction uses 0.5m detail, 1m module, 2m assembly, and 4m massing scales with shape separated from compatible material skin, coarse-to-fine editing, default snapping, reversible pre-commissioning placement, terrain contact, and visible construction stages.

## Capability mastery protocol
- source: docs/design/enshrouded-building-learning-automation.md
- type: protocol
- content: Practical processes advance through observe, manual, assisted, mechanized, and automated stages proven by a quality-checked object, corrected failure, safe workplace, teaching or calibration, and successful commissioning; learned capability never decays.

## Machine commissioning
- source: docs/design/enshrouded-building-learning-automation.md
- type: protocol
- content: A machine requires process knowledge, foundation, tool head, drive, power, buffers, safety zone, and calibration; robot assistance additionally requires chassis, sensor/tool compatibility, route or envelope, taught operation, and stop condition.

## Bounded WorkshopOrder
- source: docs/design/enshrouded-building-learning-automation.md
- type: schema
- content: WorkshopOrder carries processId, finite targetOutput, reservedInputs, destination, stopWhenTargetMet true, requestedBy, and communityPurpose; runs pause visibly unless capability, machine, robot/tool, inputs, output space, energy, maintenance, safety, target, and destination are valid.

## Low-time-preference automation
- source: docs/design/enshrouded-building-learning-automation.md
- type: nfr
- content: The first cycle teaches and repeated cycles automate without click acceleration, paid speed-up, streak loss, infinite output, hidden failure, disposable-tool spam, or loss of manual fallback; automation must free time for social and creative activity.

## Habitat commissioning authority
- source: docs/design/habitat-capability-system.md
- type: protocol
- content: A habitat commissions only when its physical bundle stands, prerequisite capabilities exist, and one authentic commissioning job succeeds; the resulting capability is permanently learned and replaces every score-based unlock proposal.

## Habitat design laws
- source: docs/design/habitat-capability-system.md
- type: nfr
- content: Teaching objects have real jobs, deco may remain nonfunctional, no XP/popularity/pay-to-skip gate exists, learning never decays, Resource Core is centralized, and later teaching cards are source-backed.

## Habitat progression graph
- source: docs/design/habitat-capability-system.md
- type: schema
- content: Progression runs from Hearth Camp through independent Water Garden or Lumber Yard, Bakery and Forge, local power and hospitality, sovereign communication, and Civic Workshop; each node records physical proof, commissioning job, permanent capability, and optional role.

## Habitat state separation
- source: docs/design/habitat-capability-system.md
- type: schema
- content: Habitat active reflects a currently valid local object bundle, while capability learned records a one-time commissioning history and survives dismantling or relocation; candidate item counts are proximity-scoped and cannot satisfy multiple distant habitats.

## Street Ledger interface
- source: docs/design/habitat-capability-system.md
- type: api-contract
- content: Show only the next two or three possible habitats, ghost the selected physical bundle, name concrete missing components, expose one commissioning action only after the bundle stands, show the result in-world, and delay resident arrival through a gentle wall-clock sustain period.

## Kerni embodiment boundary
- source: docs/design/kerni-workshop-companion.md
- type: protocol
- content: Kerni interaction is always player-initiated and suggestion-only; static art contains no dialogue or state, application-owned templates determine speech, and Kerni cannot transition phases, commit modules, claim authorship, attest peers, save, publish, pay, or moderate.

## Kerni live selector security
- source: docs/design/kerni-workshop-companion.md
- type: api-contract
- content: Live selection is opt-in on both processes, binds only to localhost, accepts phase and approved template ids, rejects unknown keys and stale/replayed requests, uses safe-mode Hermes with empty tools when configured, and never auto-starts or becomes required.

## Kerni asset contract
- source: docs/design/kerni-workshop-companion.md
- type: nfr
- content: Kerni remains a compact non-military lantern automaton; replacement GLB targets 8–15k triangles, one restrained 1K atlas, base-centered static art, readable silhouette, inspected budget, and in-world quality review.

## Kerni interaction tone
- source: docs/design/kerni-workshop-companion.md
- type: nfr
- content: Kerni is calm, concise, practical, respects silence and absence, never nags or ranks attention, and offers orientation without becoming a quest dispenser or gatekeeper.

## Current playable district
- source: docs/design/locktard-street-playable.md
- type: protocol
- content: The default current engine target is street and the playable flow is title/map to gate, approach, workshop, civic plaza, and PalaceTeaser; the Palace interior is unavailable and no release date is claimed.

## Palace teaser boundary
- source: docs/design/locktard-street-playable.md
- type: nfr
- content: Palace HQ remains a teaser-only local surface with no loaded Palace GLB as the entry world; current copy says released soon with date TBA.

## Current platform boundary
- source: docs/design/locktard-street-playable.md
- type: nfr
- content: Art remains static and state data-driven; mobile remains companion web only and does not host the current 3D entry.

## Canonical intro flow
- source: docs/design/moc-intro-tutorial-story.md
- type: protocol
- content: Intro order is video then exactly three Bite, Reveal, and Street cards; cards remain authoritative on video failure or skip, preserve the family-slapstick facts, and require deliberate final Walk in progression.

## First raid truth contract
- source: docs/design/moc-intro-tutorial-story.md
- type: protocol
- content: Raid 01 connects, names, places, shares, and waits for a second live-session module; no bot, ghost, timer, story copy, typing alone, rejected placement, unconfirmed fallback link, or unauthenticated session claim may satisfy checkpoints.

## V4V tutorial boundary
- source: docs/design/moc-intro-tutorial-story.md
- type: nfr
- content: The first raid moves no money and frames time, knowledge, hardware, code, art, attention, routing, hosting, or sats as voluntary value; any future zap requires consent and validated recipients and never becomes price, treasury, leaderboard, or assigned worth.

## Intro publication and reconnect safety
- source: docs/design/moc-intro-tutorial-story.md
- type: protocol
- content: Web and Godot share the same card text; Kerni cannot auto-speak or mutate truth; reconnect snapshots establish a silent baseline; sessions/modules are not authenticated people; video input/output/report paths are distinct and output/report publication rolls back atomically on failure.
