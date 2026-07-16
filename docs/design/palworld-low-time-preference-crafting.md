# Palworld reference — low-time-preference social crafting

Companion reference: `enshrouded-building-learning-automation.md` defines the multi-scale building,
build-to-learn, machine commissioning, and robot automation progression.

Status: design reference for the Tuesday 2026-07-21 demo and later Locktard Street systems.

## Reference boundary

Palworld is used only as a systems reference. Do not copy its creatures, names, visual designs,
items, interface, writing, sounds, lore, recipes, balance numbers, or distinctive expression.

Useful abstract patterns:

- one readable operational district where building, storage, labor, and production connect;
- residents with different practical aptitudes;
- visible resource transformation instead of an invisible crafting menu;
- several workers contributing to one shared production task;
- stations and infrastructure unlocking more capable production;
- multiplayer building and production around a common place.

Rejected patterns:

- captive or disposable labor;
- hunger, sanity, injury, or death as production-pressure mechanics;
- combat equipment as the main reason to craft;
- breeding for optimized workers;
- raids, territorial destruction, or extraction-first progression;
- exponential inventory clutter and short-lived replacement gear;
- speed bonuses, pay-to-skip, daily streaks, or idle-game coercion.

## Evidence collected 2026-07-16

Pocketpair's official page presents **Build × Automate**, residents with distinct skills, and
**World × Multiplayer**. The Steam description explicitly connects farming, structures,
production, electricity, mining, factories, automation, and multiplayer.

The public Palworld Wiki documents these transferable patterns:

- work roles include fire/heat, watering, planting, electricity, handiwork, gathering,
  lumbering, mining, medicine, transport, and farming;
- crop automation requires planting, watering, gathering, and transport as a chain;
- electricity powers advanced facilities;
- ore is smelted into an intermediate metal material before advanced fabrication;
- multiple suitable workers can contribute at one production station;
- storage inside one base can serve as a shared crafting pool;
- base capability grows when concrete stations and facilities are deployed.

Sources:

- https://www.pocketpair.jp/games/palworld/
- https://store.steampowered.com/app/1623730/Palworld/
- https://palworld.wiki.gg/wiki/Working
- https://palworld.wiki.gg/wiki/Crafting
- https://palworld.wiki.gg/wiki/Base
- https://palworld.wiki.gg/wiki/Ingot
- https://palworld.wiki.gg/wiki/Production_Assembly_Line

## Locktard Street translation

### Design law

> Crafting is a social promise made visible in matter.

The player does not grind isolated recipes. People agree on a durable improvement, gather or
recover materials, perform complementary work, wait for real processes, commission the result,
and remember who helped.

```text
shared need
→ public work order
→ locally gathered/recovered inputs
→ complementary resident roles
→ visible timed transformation
→ commissioning ritual
→ permanent street capability
```

### Low-time-preference rules

1. **Durability over throughput.** A repaired bench, dry roof, oven, bridge, or water system is a
   lasting world improvement, not vendor trash.
2. **Repair before replacement.** Scrap and broken objects are valuable inputs.
3. **Time represents reality.** Timber dries, dough rises, crops grow, metal heats, paint cures,
   and apprentices learn. No monetized skipping.
4. **Waiting creates social play.** While production runs, players decorate, trade stories,
   perform music, help another workshop, inspect provenance, or plan the next civic build.
5. **Shared success, attributed contribution.** A public work order records material, craft,
   care, design, teaching, and funding contributions without ranking human worth.
6. **Consent and affinity.** Residents choose work matching their interests, relationships, and
   current wellbeing. Nobody is assigned as a production unit.
7. **Maintenance is culture.** Sweeping the bakery, sharpening tools, checking water, and tending
   lamps are periodic communal rituals, not punishment meters.
8. **Enoughness.** Production stops when the street need is met. Infinite stockpiling gives no
   prestige advantage.

## MVP resource language

Keep the first visible economy to seven readable resource families:

| Resource | Sources | Primary meaning |
|---|---|---|
| Reclaimed wood | repairs, fallen timber, salvage | shelter and joinery |
| Stone & clay | local ground, demolition salvage | foundations, ovens, thermal mass |
| Water | rain, well, channel | life, crops, cleaning, cooling |
| Grain & food | gardens, exchange, mill | hospitality and resident wellbeing |
| Fibre & cloth | plants, recovered textiles | roofs, shade, sacks, identity |
| Scrap metal | repairs, salvage, exchange | durable fittings and tools |
| Stored energy | waterwheel, solar cloth, charged cells | advanced shared machines |

Do not expose more currencies for the Tuesday slice. Decorative objects can remain mechanically
simple.

## Original production chains

### Timber and joinery

```text
reclaimed wood
→ sorting bench
→ saw station
→ planks
→ drying rack (time)
→ joinery bench
→ doors, shelves, counters, roof repairs
```

Roles: salvager, sawyer, carpenter, caretaker, apprentice.

### Bread and hospitality

```text
seed + water
→ grain
→ mill
→ flour
→ dough (time)
→ communal oven
→ shared meal
→ bakery habitat commissioned
```

Roles: gardener, miller, baker, host, courier.

### Metal and repair

```text
scrap metal or local ore
→ sorting
→ charcoal/stored energy + heat
→ billet
→ forge
→ hinge, bracket, fastener, repaired tool
→ durable construction capability
```

Roles: collector, charcoal burner, smith, water tender, repairer.

### Water and power

```text
rain/well/flow
→ collection
→ filtration
→ storage
→ irrigation or waterwheel
→ stored energy
→ lighting and advanced workshop cycles
```

Roles: water keeper, gardener, millwright, electrician, lamp tender.

## Social production model

A work order has complementary contribution slots rather than one progress bar:

```ts
type ContributionKind =
  | "material"
  | "craft"
  | "care"
  | "design"
  | "teaching"
  | "funding";
```

A player may complete any slot. No single player must master every trade. A veteran gains social
value by teaching or lending tools, not by monopolizing output.

Commissioning requires:

- the local physical bundle;
- all required transformations completed;
- at least two complementary contribution kinds;
- one authentic first use;
- a short shared acknowledgement at the finished place.

Bitcoin/Value4Value can fund a public work order or thank contributors, but payment must never be
the only valid contribution. Nostr can carry signed provenance and work-order notes, while the app
remains authoritative for game state.

## Tuesday demo slice

Do not build a complete simulation before the demo. Show one beautiful, legible loop:

1. The player enters Locktard Street and sees a public work order for the communal bakery corner.
2. Three nearby physical stations communicate the chain: resource yard, mill/workbench, oven.
3. The player contributes one recovered material bundle.
4. A resident with a complementary role visibly joins the task.
5. One short transformation plays with readable animation, sound-ready timing, and warm light.
6. The finished counter/oven area changes the street silhouette and activates a social gathering.
7. The Street Ledger shows who contributed and the permanent hospitality capability unlocked.

Demo success criteria:

- understandable without reading a design document;
- visually attractive from the start-screen through the first interaction;
- one obvious action at a time;
- no inventory spreadsheet;
- no combat dependency;
- no copied Palworld expression;
- stable laptop frame rate and repeatable reset state.

## Agent selection rule

Before choosing a seam, ask:

1. Does this make Tuesday's demo more beautiful or more reliable?
2. Does it make crafting physically readable in the street?
3. Does it create cooperation rather than optimization pressure?
4. Does the result persist as a meaningful world improvement?

If all answers are no, defer the seam until after the demo.
