## REQ-ethical-anticipation-loop
- source: docs/GAME-LOOP.md
- description: Retention mechanics must create anticipation of known future outcomes rather than anxiety about loss; absence compounds progress and nothing decays or punishes missed play.
- acceptance: Weekly play is never worse than daily play; timers are deterministic and visible; no streak, daily quest, login reward, expiry, upkeep, pay-to-skip, retention notification, fabricated social proof, or wealth/activity leaderboard exists.
- scope: retention, ethics, timers, offline progress

## REQ-cadence-pyramid
- source: docs/GAME-LOOP.md
- description: Provide minute homecoming, daily tending, weekly Bell, monthly age and Moon Night, and year-plus timelock-maturity cadences, with only one synchronous weekly appointment and a 48-hour echo.
- acceptance: Each cadence yields its specified social or cosmetic experience; missing an appointment loses no material progress; calendar festivals never modify drip or economy.
- scope: session cadence, Sunday Bell, Moon Night, timelocks

## REQ-building-age
- source: docs/GAME-LOOP.md
- description: Age placed production buildings through permanent patina tiers and a capped specialty multiplier, with wall-clock offline accrual and age reset when absorbed.
- acceptance: Blueprint entries carry placed_at; multipliers step from 1.5 to a hard cap of 2.1; offline catch-up honors age; absorbing resets age; output never decays.
- scope: home blueprint, building age, drip multiplier, patina

## REQ-hearth-report
- source: docs/GAME-LOOP.md
- description: On boot, summarize completed crafts, arrivals, age changes, and offline catch-up from existing audit streams without introducing claim state.
- acceptance: The report has at most five lines, is dismissible in one click, reports outcomes that already occurred, and never gates or requires claiming progress.
- scope: homecoming UI, audit streams, offline catch-up

## REQ-inhabitant-ladder
- source: docs/GAME-LOOP.md
- description: Attract inhabitants through deterministic wall-clock sustain conditions tied to placed objects and building age, never social popularity or payments.
- acceptance: Arrivals follow the defined fountain, racooDNI, second-inhabitant, and later-companion conditions; catch-up can deliver elapsed arrivals; inhabitants cap at five and production bonus caps at 10%.
- scope: inhabitants, move-in conditions, sustain timers, production bonus

## REQ-bell-and-block-calendar
- source: docs/GAME-LOOP.md
- description: Replace mock events with NIP-52 calendar events for a weekly Sunday Bell and deterministic block-height Market Day, Moon Night, and Halving festivals.
- acceptance: Bell lasts 60 minutes with a 48-hour echo and recurring non-scarce cosmetic tile; Market Day is every 2,016 blocks, Moon Night every 4,320 blocks, and Halving opens a 21-day cosmetic season; no event changes material progression.
- scope: NIP-52, Sunday Bell, block calendar, cosmetic events

## REQ-postcards-and-witnessing
- source: docs/GAME-LOOP.md
- description: Preserve visits and long-horizon completions as signed postcards and witness records without buffs or one-shot scarcity.
- acceptance: A visitor can leave one signed note per visit; 21 postcards display and overflow remains archived; eligible maturities and crafts schedule an echoed Unsealing; at most 21 nearby witnesses append permanently with zero buff.
- scope: visits, postcards, Unsealings, witnesses, ownership chain

## REQ-guild-monuments
- source: docs/GAME-LOOP.md
- description: Let NIP-29 guilds build one materials-only monument at a time through gifts and wall time, without spendable pooled custody, quotas, tithes, or amount-ranked plaques.
- acceptance: Material gifts are signed revisions; cancellation returns contributions; plaques are chronological; completion cannot be accelerated by activity or headcount; standing is monument age; no sats treasury exists in v0.
- scope: guilds, monuments, material gifts, non-custody

## REQ-home-waiting-production
- source: docs/HOME-TOWN.md
- description: Grow the private Home from an empty plot into a production town where resources, buildings, crafts, and inhabitants progress through elapsed time rather than gathering or grinding.
- acceptance: DRIP_PER_MINUTE remains the balancing knob; placed production buildings multiply drip; craft queues run offline; time remains the bottleneck; progression is earned and not sold.
- scope: Home, resource drip, production buildings, craft queue

## REQ-home-roadmap
- source: docs/HOME-TOWN.md
- description: Extend Home in order with more production buildings, age-based building lines, inhabitants, and later read-only visits using the same blueprint shape on the server.
- acceptance: Work proceeds in the documented order; building age is stored in placed_at; inhabitants add only small bonuses; visits do not turn Home into the public build surface.
- scope: Home roadmap, building age, inhabitants, town visits

## REQ-palace-interface-invariants
- source: docs/PALACE-INTERFACE-CONCEPTS.md
- description: Render one Palace Core across web, world, and Arcane Games while preserving plural guild membership, explicit guild filtering, Session continuity, canonical ids, honest quiet states, and untrusted-game boundaries.
- acceptance: Guild context changes all activity families; web/world/game handoff retains Session, participants, and chat; external games receive no authority; core capabilities work at 1280×720 with 3D disabled.
- scope: interface architecture, guild lens, Session continuity, accessibility

## REQ-palace-prism
- source: docs/PALACE-INTERFACE-CONCEPTS.md
- description: Use Palace Prism as the persistent global shell with guild rail, guild context, switchable center renderer, People and Now, and Session dock.
- acceptance: Changing guild lens or renderer does not remount Session/chat; Now/Next/Anytime remains primary; People and Now uses real presence; the shell works with an empty or full world and with 3D disabled.
- scope: Palace Prism, global shell, renderer switching, Session dock

## REQ-guild-quarter-view
- source: docs/PALACE-INTERFACE-CONCEPTS.md
- description: Provide Guild Quarter as a depth view inside Prism, mapping the same persistent guild objects to web and world without making the Quarter mandatory for routine actions.
- acceptance: Web and world resolve the same object ids; Commons uses a public Plaza; small guilds can begin with a room or charter table rather than fabricated architecture.
- scope: Guild Quarter, guild identity, web/world parity

## REQ-bell-mode
- source: docs/PALACE-INTERFACE-CONCEPTS.md
- description: Transform Prism into Bell Mode when a Session is joined while preserving fixed leave, invite, web, world, and play controls.
- acceptance: The guild rail collapses; center and roster focus on the Session; Session chat becomes default; leaving restores the previous guild lens and scroll position.
- scope: Bell Mode, active Session, navigation restoration

## REQ-arcane-night
- source: docs/PALACE-INTERFACE-CONCEPTS.md
- description: Demonstrate the complete product through a curated sequence of canonical Activities and Sessions rather than fabricated constant population.
- acceptance: Wavlake warm-up, guild gathering, Arcane challenge, and aftershow remain separate canonical Activities linked by a program; participants may join any step from web or world.
- scope: Arcane Night, programmed event, Activities, Sessions

## REQ-palace-shell-state-lifetime
- source: docs/PALACE-INTERFACE-CONCEPTS.md
- description: Move chat, media, Session, and shareable navigation state above the web/world renderer branch in one persistent PalaceShell.
- acceptance: Chat and playback survive web↔world; one audio controller owns playback; PalaceLocation serializes durable lens/projection/surface/activity/session/place fields; Session authorization precedes room admission.
- scope: PalaceShell, ChatController, SessionMediaController, PalaceLocation

## REQ-interface-prototype-gates
- source: docs/PALACE-INTERFACE-CONCEPTS.md
- description: Validate Prism, renderer continuity, and one sandboxed Arcane Game before implementing a general guild creator.
- acceptance: One Activity appears through two lenses without duplication; Session survives two web↔world cycles; chat remains mounted; 1280×720 and no-3D modes work; Commons works with zero humans; the game receives no Palace authority.
- scope: interface prototypes, migration gates, Arcane adapter

## REQ-fertile-boredom-loop
- source: docs/design/fertile-boredom-social-art-loop.md
- description: Let resisting algorithmic noise convert boredom into presence, encounters, memories, art, and shared community traces; keep the system anti-feed but not anti-action.
- acceptance: Closing the phone and waiting or walking can unlock a small encounter; attentive dialogue can create a memory fragment; memory and inspiration can create an artifact placed into a Palace slot.
- scope: attention, boredom, presence, encounters, art artifacts

## REQ-social-art-vertical-slice
- source: docs/design/fertile-boredom-social-art-loop.md
- description: Build one local/mock walkable slice containing a feed overlay, human-presence state, one encounter, one memory, one artifact, one placement slot, and a visible world change.
- acceptance: The full noisy-feed-to-visible-artifact sequence is playable without real social networking, generative AI, economy, persistence, multiplayer, or a large quest system.
- scope: social art prototype, local state, Palace placement

## REQ-low-time-preference-crafting
- source: docs/design/palworld-low-time-preference-crafting.md
- description: Make crafting a durable social promise using repair, real process time, complementary roles, attributed contributions, consent, maintenance rituals, and finite sufficiency.
- acceptance: Work creates lasting improvements; no monetized skip, captive labor, combat dependency, infinite stockpiling, coercive idle mechanic, or copied Palworld expression is present.
- scope: social crafting, process time, durability, cooperation

## REQ-social-work-orders
- source: docs/design/palworld-low-time-preference-crafting.md
- description: Represent public work as complementary material, craft, care, design, teaching, and funding contributions rather than a single ranked progress bar.
- acceptance: A player may fill any contribution kind; commissioning requires the physical bundle, all transformations, two complementary contribution kinds, an authentic first use, and shared acknowledgement; payment is never the only contribution.
- scope: work orders, contribution slots, commissioning, provenance

## REQ-crafting-demo
- source: docs/design/palworld-low-time-preference-crafting.md
- description: Demonstrate one legible communal bakery chain in Locktard Street from material contribution through permanent hospitality capability.
- acceptance: One obvious action is presented at a time; the resident contribution and transformation are visible; the result changes the street and Ledger; the demo has no inventory spreadsheet or combat and resets repeatably at stable laptop frame rate.
- scope: bakery demo, Street Ledger, social production

## REQ-private-to-palace-progression
- source: docs/design/private-to-palace-asset-concept.md
- description: Let private milestones unlock placement rights and meaningful objects for curated public expression in the Palace, beginning with furnishing rather than structural construction.
- acceptance: Players select from earned objects, preview a footprint, place only into an allowed finite slot, inspect the result, and unlock richer objects at higher capability tiers.
- scope: private progression, Palace expression, object unlocks

## REQ-palace-asset-classes
- source: docs/design/private-to-palace-asset-concept.md
- description: Support furniture/deco, culture objects, special objects, teaching assets, hero assets, timelock assets, and later building parts with class-appropriate placement and curation.
- acceptance: Decorative objects remain simple; teaching and hero assets expose sources and stronger placement controls; structural parts remain deferred until furnishing is fun.
- scope: asset catalog, asset classes, curation

## REQ-timelock-assets
- source: docs/design/private-to-palace-asset-concept.md
- description: Keep timelock assets separate and sacred: they arise only through a valid proof and cannot be bought or unlocked through normal resources, scores, trust, or currency.
- acceptance: No proof means no asset; Bitcoin L1 is default and required for legend tiers; Liquid is only a high-fee fallback for short/medium tiers; Lightning is excluded; principal remains non-custodial and server-independent.
- scope: timelocks, Bitcoin, Liquid, asset birth, non-custody

## REQ-palace-placement-grid
- source: docs/design/private-to-palace-asset-concept.md
- description: Use finite Palace placement zones and rectangular footprints on a 0.7m furniture grid, with slot, tier, trust, count, and curator-approval rules.
- acceptance: Every placeable object has a footprint; invalid fits are rejected visibly; personal, room, guild, exhibit, stage, and monument slots enforce their documented rules; the existing 2m architectural grid may coexist.
- scope: placement grid, footprints, Palace slots, placement rules

## REQ-social-world-placement-mvp
- source: docs/design/private-to-palace-asset-concept.md
- description: Ship the social placement loop before the full private builder, using honest mocked private progression and a small tiered asset set.
- acceptance: The loop supports entering the Palace, seeing slots, selecting an unlocked object, previewing its footprint, placing into an allowed slot, inspecting it, and observing higher-tier unlocks; no terraforming, paid placement, open upload, spam, server persistence, or structural parts.
- scope: Palace placement MVP, mocked progression, social world
