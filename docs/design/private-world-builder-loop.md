# Private World Builder Loop

Status: deferred supporting note. The immediate implementation priority is the social-world asset
system in `docs/design/private-to-palace-asset-concept.md`. The physical commissioning rules in
`docs/design/habitat-capability-system.md` supersede every score-based unlock rule below.

## Purpose

The private world is the player's home and progression space. It produces physical milestones and
commissioned capabilities that later become visible in the Palace of Culture social world.

This document captures the future private-world builder loop without making it the first implementation target.

## Core rule

Resources are centralized. There is no storage-box gameplay.

```text
Sources and machines produce
→ Resource Core / Citadel Core
→ build costs are paid from the central pool
```

## Private-world progression

The player improves habitat grids. Visible components and one successful commissioning job unlock
the next build possibility; abstract points never gate progress.

```text
physical bundle stands
→ commissioning job succeeds
→ capability is learned
→ next build possibility unlocks
→ new real-world capability
```

Any habitat score shown by the UI is a derived, non-authoritative summary of what physically exists.
It is never XP, currency, or an unlock threshold.

## Builder grid

Furniture and room-layout gameplay uses the same placement block as the Palace social-world asset system:

```text
1 block = 0.7m × 0.7m
```

This gives the game a real interior-planning feel while remaining simple enough for cozy placement.

## MVP resources

Visible resources only:

```text
soil, wood, scrap, water, energy, bricks, parts, food, blueprints, inspiration, trust
```

## Optional habitat indicators

```text
shelter, water, food, energy, fabrication, culture
```

Objects may contribute descriptive coverage indicators. These values help summarize a place but do
not accumulate XP or unlock tiers. Example:

```ts
basic_wall: { indicates: ["shelter"] }
water_collector: { indicates: ["water"] }
garden_bed: { indicates: ["food"] }
workbench: { indicates: ["fabrication"] }
music_corner: { indicates: ["culture"] }
solar_panel: { indicates: ["energy"] }
mini_ceb_press: { indicates: ["fabrication"] }
```

## Progression ladder

### Tier 0 — Ground / Camp

Theme: claim place, clean up, basic shelter.

Unlocks:

- basic floor/wall blocks
- simple decoration
- workbench repair
- notice board

### Tier 1 — Grundbedürfnisse

Theme: water, food, shelter, warmth/light.

Requirements:

- Hearth Camp has been commissioned
- the water collector has produced usable water
- the garden bed has produced its first food

Unlocks:

- solar panel
- music corner / culture mode
- better furniture/deco unlocks for the Palace

### Tier 2 — Ziegel

Theme: durable shelter and local material production.

Requirements:

- the repaired workbench has completed its first job
- water collection has been commissioned
- local energy has been commissioned

Unlocks:

- mini CEB press
- brick wall/foundation blocks
- brick furniture/deco unlocks for the Palace
- OSE CEB Press quest placeholder

### Tier 3 — Mechanik / Motor

Theme: moving parts, engines, stronger production.

Requirements:

- the mini CEB press has produced its first accepted brick batch
- forge components physically stand as a valid bundle
- the first hinge or motor part has been commissioned
- one blueprint has been physically acquired

Unlocks:

- motor parts
- power cube / engine module placeholder
- CNC precursor placeholder
- mechanical display/special-object unlocks for the Palace

## First buildable private-world assets

### Decoration

- crate stack
- work lamp
- poster board
- plant pot

### Needs / base systems

- basic wall block
- basic floor block
- water collector
- garden bed
- solar panel

### Machines

- workbench: scrap → parts, 5 min in real game, shortened in dev mode
- mini CEB press: soil + water + energy → bricks

### Culture

- music corner: opens culture mode, produces inspiration through engagement

### Timelock assets

Timelock assets are not part of the private-world resource/build unlock ladder. They require a timelock proof from the dedicated service DNI is building for PoC as first use case.

Rule:

```text
No timelock proof → no timelock asset.
```

Proof modes:

- default to Bitcoin L1 timelocks for every tier while mainchain fees are acceptable
- use Liquid timelocks as high-fee fallback for short/medium tiers
- keep Bitcoin L1 required for the longest legend tiers
- Lightning is intentionally out of scope for timelock proofs because it would be custodian/soft-state dependent

They may be displayed as locked silhouettes/slots in the private world or Palace, but the real asset only exists after the timelock birth path creates it.

Examples:

- 21D sealed crate / seed object — Bitcoin L1 default, Liquid fallback if fees high
- 210D lantern seed — Bitcoin L1 default, Liquid fallback if fees high
- 21M tree / grove — Bitcoin L1 default, Liquid fallback if fees high
- 210M vehicle / skiff — Bitcoin L1 proof required/preferred
- 21Y spaceship / legendary asset — Bitcoin L1 proof required

Gameplay role:

- prestige / legend object
- visible low-time-preference commitment
- cosmetic/world impact
- not required for basic needs, bricks, or motor progression
- never purchasable with normal resources

This keeps the builder accessible while preserving timelock assets as sacred Bitcoin-native unlocks.

## Timer model

Inputs are consumed when a production cycle starts. Outputs become pending when the timer ends and are added to Resource Core on collect.

For dev builds, use accelerated durations:

```text
workbench: 10s
water collector: 15s
solar panel: 15s
garden bed: 20s
mini CEB press: 30s
```

Keep the data shape real-duration-ready:

```ts
type ProductionState = {
  id: string;
  assetId: string;
  startedAt: number;
  durationMs: number;
  output: Partial<Record<ResourceId, number>>;
  status: "running" | "ready";
};
```

## Deferred implementation tasks

These tasks are intentionally deferred until the social-world asset concept is playable.

1. Create `apps/web/src/builder/types.ts`.
2. Create `apps/web/src/builder/data.ts` with resources, build assets, tiers, and initial inventory.
3. Create `apps/web/src/builder/progression.ts` for capability commissioning and read-only habitat indicators.
4. Create `apps/web/src/builder/BuilderMode.tsx`.
5. Wire `Home → Build` to the private builder when the social placement loop is ready.
6. Add CSS in `apps/web/src/builder/builder.css`.
7. Run `corepack pnpm -r typecheck` and `corepack pnpm --filter @600b/web build`.

## Non-goals for the first private-builder slice

- no server persistence
- no real Nostr zaps
- no multiplayer
- no financial state
- no asset import/conversion
- no full structural editor before furniture/social placement works

## Success condition

A player can:

1. open the private builder,
2. see central Resource Core,
3. place objects on a 0.7m grid,
4. satisfy basic needs and commission the brick capability,
5. start a timed production cycle,
6. enter culture mode while waiting,
7. return and collect output,
8. unlock objects that can be placed in the Palace social world.
