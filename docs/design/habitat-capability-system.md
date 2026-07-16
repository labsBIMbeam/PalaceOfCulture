# Locktard Street Habitat & Capability System

Status: implementable data-first prototype. This supersedes the generic score-only proposal in `private-world-builder-loop.md` where the two conflict.

## Product decision

Locktard Street adopts the satisfying *placed bundle → inhabited place → next build possibility* rhythm found in cozy habitat builders, but it does not copy Pokémon characters, terminology, item art, habitat names, UI, or worldbuilding.

The original Palace rule is:

```text
physical bundle stands
+ prerequisite capabilities exist
+ one real commissioning job succeeds
→ habitat is commissioned
→ capability is permanently learned
→ resident role may arrive
→ next physical chain becomes buildable
```

This replaces abstract habitat XP with **capability commissioning**. A forge is not “five fabrication points”; it is fuel + heat + anvil + tools + quench water, and it becomes real when the player forges a hinge.

## Source pattern studied

Live reference inspected 2026-07-16: [Pokopia Wiki items](https://www.pokopiawiki.com/items) and [Habitat Dex](https://www.pokopiawiki.com/habitats).

Observed database shape:

- 1,391 items across materials, food, furniture, buildings, outdoor, utilities, blocks, kits, key items, nature, fossils, and relic categories
- 212 listed habitat combinations
- “Lumberjack's workplace”: Tree Stump + Cart + Log Table + Log Bench
- “Best bread bakery”: Bread Oven + 2 Counter + Plated Food
- “Tantalizing restaurant”: Table + Seat + Plated Food + Menu
- “Waterwheel spot”: Waterwheel + Waterfall + 2 Water
- “Music and magazines”: CD Player + CD Rack + Magazine Rack

What we reuse: the legibility of a small physical recipe that makes a place meaningful.

What we do **not** reuse: names, creatures, visual identity, exact item sets, rewards, progression order, copy, meshes, or protected worldbuilding.

## Design laws

1. **Everything has a real job.** Teaching assets explain an actual material, energy, food, water, fabrication, or communication chain.
2. **Deco remains dumb.** Rugs, plants, posters, books, and mushroom spots can be pure atmosphere. The world must not feel like a syllabus.
3. **No magic XP threshold.** Unlocks require visible components and a commissioning result.
4. **Learning never decays.** Removing or moving a commissioned habitat may stop its resident activity, but never revokes unlocked knowledge or recipes.
5. **No popularity gates.** Residents arrive because a habitat works, not because the player has visitors, likes, or wealth.
6. **No pay-to-skip.** Waiting represents growth, drying, curing, baking, or machine cycles. It is deterministic and survives absence.
7. **Central Resource Core.** No storage-box micromanagement; barrels, racks, and carts communicate function rather than create inventory chores.
8. **Source-backed teaching.** Full teaching cards later link to real references, measurements, and safety limits.

## Original progression graph

| Stage | Habitat | Physical proof | Commissioning job | Permanent capability | Attracted role |
|---:|---|---|---|---|---|
| 0 | **Hearth Camp** | shelter blocks, light, stool, workbench | repair first workbench | shelter, culture, basic fabrication | Caretaker |
| 1 | **Water Garden** | collector, gravity channels, barrel, garden beds | filter first water | water, food growing | Gardener |
| 1 | **Lumber Yard** | stump, cart, log furniture, sawbench, drying rack | season first boards | woodwork | Carpenter |
| 2 | **Street Bakery** | grain plots, millstone, oven, counters, served food | bake first loaf | baking, hospitality | Baker |
| 2 | **Street Forge** | charcoal, kiln, anvil, quench barrel, tools | forge first hinge | metalwork | Smith |
| 3 | **Waterwheel House** | channel, wheel, generator, working lamps | generate first charge | energy | Millwright |
| 3 | **Glowcap Tea House** | counter, tables, seats, food, warm light | host first meal | community | Host |
| 4 | **Mycelium Relay Hut** | mast, terminal, cabling, archive, power | publish first signed note | sovereign network | Relay Keeper |
| 5 | **Civic Workshop** | benches, archive, notice board, blueprint table | ratify first blueprint | district-scale building | Coordinator |

The first six roles are understandable without Bitcoin/Nostr. The Relay Hut introduces Nostr only after the player has already built energy, tools, hospitality, and a living street. Technology arrives as infrastructure, not branding.

## Real-world production chains

### Timber

```text
tree/log
→ handcart
→ chopping stump
→ sawbench
→ drying rack + elapsed time
→ dimensioned boards
→ furniture, bakery fit-out, wheel and forge structures
```

### Bread

```text
grain plot + water + time
→ millstone
→ flour + water + heat
→ bread oven
→ served loaf
→ bakery commissioned
```

### Metal

```text
wood
→ charcoal burner
→ forge heat + stock
→ anvil + hammer
→ quench barrel
→ hinge
→ metalwork commissioned
```

### Local power

```text
water catchment / channel
→ waterwheel
→ shaft
→ low-speed generator
→ measured charge
→ lamps, tools, relay
```

### Sovereign communication

```text
local energy
→ wired terminal
→ keypair under player control
→ relay connection
→ signed note published + retrieved
→ network capability commissioned
```

## Habitat vs. capability state

Two truths are deliberately separate:

- **Habitat active:** its objects currently exist in a valid local bundle; residents can use it.
- **Capability learned:** commissioning happened once and remains in the player's history forever.

This prevents punishment when redecorating. It also allows a carpenter to move workshops without the player “forgetting” woodwork.

## Data implementation

Implemented in `apps/web/src/builder/habitats.ts`:

- original item and habitat definitions
- ordered capability graph
- pure habitat evaluation
- pure commissioning transition
- permanent capability resolution
- graph integrity validation

`itemCounts` is deliberately scoped to one candidate habitat boundary. Scene integration must derive those counts from local placement proximity; globally scattered objects or one shared item must not satisfy multiple distant habitats.

The module intentionally does not mutate `economy.ts` or persistence yet. It can be wired in without migrating saves until the required placement assets exist.

## MVP UI slice

1. Add a **Street Ledger** panel showing the next 2–3 possible habitats, never a giant tech tree.
2. Selecting a habitat ghosts its physical bundle into the builder.
3. Missing components read as concrete nouns: `Quench Barrel 0/1`, not `Metalwork 73%`.
4. When the bundle stands, one commissioning action becomes available.
5. The result plays in the world: first loaf on the counter, first lamp powered, first signed note on the board.
6. A resident role arrives after a gentle wall-clock sustain period and starts using the place.

## Shroom-house mapping

The original procedural assets on `feature/shroom-workshop-assets` fit directly:

- `shroom_workshop.glb` → Street Forge / repair annex
- `glowcap_tea_house.glb` → Glowcap Tea House
- `mycelium_relay_hut.glb` → Mycelium Relay Hut

They are visual shells. Commissioning still depends on the real component bundle; a pretty mushroom mesh alone grants nothing.

## Explicit non-goals for this slice

- no Pokémon characters or names
- no copied item icons, meshes, text, or habitat combinations
- no financial state or automatic sats spending
- no real key creation before the security flow is designed
- no multiplayer requirement for progression
- no decay, upkeep, streaks, or daily quests
- no giant 1,391-item inventory in the MVP

## Acceptance test

A clean playthrough can:

1. commission Hearth Camp,
2. independently choose Water Garden or Lumber Yard,
3. build the missing physical chains,
4. commission Bakery and Forge,
5. generate local power,
6. host the first shared meal,
7. publish one signed test note,
8. unlock Civic Workshop,
9. dismantle an old habitat without losing learned capabilities.
