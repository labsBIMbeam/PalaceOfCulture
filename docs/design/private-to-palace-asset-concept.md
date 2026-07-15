# Private World → Palace Asset System

Status: product design draft for the current Palace of Culture prototype.

## Purpose

The first playable social loop should not start with a full construction editor. It should start with a clear relationship between the player's private world and the shared Palace of Culture:

```text
Private world progress
→ unlock furniture, decoration, culture objects, and special objects
→ place selected objects in the shared Palace
→ make public social space more personal, expressive, and alive
```

The private world is the player's progression/home space. The Palace of Culture is the shared social world.

## Core principle

```text
Earn in private → express in public
```

Private progress grants placement rights and object unlocks. The Palace remains a curated social space, not an unlimited sandbox.

The shared world should feel personal and social because players bring earned objects into it, not because anyone can spawn anything anywhere.

## Design goals

1. **Make private progress visible publicly.** A player's room, booth, table, or corner in the Palace reflects what they have achieved privately.
2. **Start with furnishing, not building construction.** Chairs, tables, sofas, lamps, rugs, framed art, plants, and special objects are the first unlock layer.
3. **Use a real grid.** Every object has a block footprint, so placement is readable, fair, and expandable.
4. **Keep the Palace curated.** Use placement zones and slots to avoid clutter.
5. **Support future teaching assets.** Later tiers unlock real-world knowledge objects, exhibits, machines, and builder systems.
6. **Defer structural construction.** Blocks, walls, windows, doors, and roofs come after the social furnishing loop is fun.

## Progression loop

```text
Private habitat improves
→ private level / milestones rise
→ object catalogue expands
→ player chooses objects to bring into public space
→ Palace rooms and social zones become more personal
```

## Human presence / social art loop

The furnishing loop should be joined by the core 600 Billion human loop documented in `docs/design/fertile-boredom-social-art-loop.md`:

```text
algorithmic noise
→ boredom
→ presence
→ encounter
→ memory
→ art
→ community
```

This means not every culture object should come from private builder progression. Some should come from walking, waiting, talking, and making art from real encounters.

```text
walk / wait without phone
→ fertile boredom threshold
→ presence window
→ NPC or place encounter
→ memory fragment
→ art artifact
→ Palace placement slot
→ shared culture / community memory
```

This loop sits beside `Earn in private → express in public`:

```text
Reclaim attention → encounter life → make art → leave a public trace
```

For the first PoC, keep it client-only and mock-state based. Do not involve ownership, Nostr, timelocks, persistence, or economy until the emotional loop is playable.

For Palace of Culture, the translation is:

```text
private citadel capability
→ palace placement rights
→ social/culture expression
→ visible contribution to the Palace of Culture
```

The Palace placement catalogue should feel like a reward track from private progress, not a shop-first UI.

## Asset classes

### 1. Furniture and dumb decoration

Pure visual expression. No teaching, no production. This is the main early Palace asset category.

Examples:

- chairs
- tables
- sofas
- lamps
- rugs
- pictures / framed art
- plants
- posters
- crates
- sculptures
- banners
- other decoration

Use in Palace:

- can be placed in assigned social slots
- limited by unlocked capacity and slot size
- primarily cosmetic/status/culture
- should feel like furnishing a social room, not managing inventory

### 2. Culture objects

Social and creative objects. These connect to music, art, Nostr, creator identity, and value-for-value later.

Examples:

- music booth
- art frame
- poster wall
- listening corner
- stage light
- creator shrine
- zine stand

Use in Palace:

- can display curated posts, music, art, creator cards, or event material
- can become V4V/zap surfaces later
- good first shared-world content because it is social without needing complex economy

### 3. Special objects

Rare or meaningful objects that are not necessarily teaching machines. They can communicate story, status, culture, identity, or event participation.

Examples:

- rare lamp
- founder object
- guild relic
- music relic
- artist object
- seasonal object
- animated gear sculpture
- archive object

Use in Palace:

- unlocked through milestones, events, trust, or private-world achievement
- limited more strictly than normal decoration
- ideal for making public rooms feel earned and unique

### 4. Teaching assets

Real-world knowledge machines and systems. Not every asset is teaching; only selected machines/systems are.

Examples:

- CEB Press
- water collector
- solar station
- garden module
- workbench
- CNC table
- Bitcoin node

Use in Palace:

- mostly placed in themed public zones, exhibitions, workshops, guild halls
- may require higher private-world milestones
- should include a short knowledge/source card

### 5. Hero assets

Large meaningful anchors. Rare, curated, high milestone.

Examples:

- full OSE CEB Press
- LifeTrac
- MicroHouse
- Citadel Archive Terminal
- guild monument

Use in Palace:

- not freely spammed
- placed via hall/zone permissions, events, or collective milestones
- may require curator approval or group unlocks

### 6. Timelock assets

Timelock assets are their own sacred asset class. They are **not** normal build unlocks and cannot be bought with normal resources, habitat points, inspiration, trust, or shop currency.

DNI is building the dedicated timelock service with Palace of Culture as the first use case. PoC should integrate it as a timelock adapter, while the app truth layer still decides/records the asset birth.

Rule:

```text
No timelock proof → no timelock asset.
```

Proof modes:

- **Default:** Bitcoin L1 timelocks for every tier while mainchain fees are acceptable.
- **High-fee fallback:** Liquid timelocks for short/medium tiers when Bitcoin L1 fees become unattractive.
- **Legend assets:** Bitcoin L1 remains required for the longest sacred assets.
- **Lightning:** intentionally out of scope for timelock proofs because it would be custodian/soft-state dependent for this use case.

Examples:

- 21D sealed crate / seed object — Bitcoin L1 default, Liquid fallback if fees high
- 210D lantern seed / short-vow asset — Bitcoin L1 default, Liquid fallback if fees high
- 21M tree / grove asset — Bitcoin L1 default, Liquid fallback if fees high
- 210M vehicle / skiff asset — Bitcoin L1 proof required/preferred
- 21Y spaceship / legendary palace asset — Bitcoin L1 proof required

Use in Palace/private world:

- unlocked only by the timelock birth path, not by normal building progression
- shown as locked silhouettes/empty slots until proof exists
- visible low-time-preference commitment
- cosmetic/world/presence impact, not required for basic building progression
- verified through the app truth layer + ownership hash-chain; Nostr is transport, not consensus
- long Bitcoin-locked principal remains non-custodial and claimable without our servers

This keeps the cozy builder accessible while preserving long timelock assets as legend objects.

### 7. Building parts

Structural construction pieces. These come later than furnishing/deco because they change spatial layout.

Examples:

- blocks / Bausteine
- wall pieces
- windows
- doors
- roofs
- columns
- stairs
- floor/foundation pieces

Use in Palace/private world:

- initially more important for the private builder than public Palace placement
- later allowed in controlled room/guild/hall zones
- require stricter grid/snap/collision rules than furniture
- unlock after early furnishing/deco progression is fun

## Private-world milestones

Private progression should follow real-life capability tiers. The exact private builder comes later; for the first social prototype, these tiers can be mocked.

### Tier 0 — Home seed

Player has a basic private world identity.

Unlocks for Palace:

- profile marker
- small banner
- tiny plant/deco
- name plaque

### Tier 1 — Basic living

Private world has basic shelter, water, food, light, and cultural comfort.

Unlocks for Palace:

- chair
- table
- sofa
- lamp
- rug
- framed picture
- plant pot
- music poster
- listening corner

### Tier 2 — Durable home

Player can produce or access durable building materials and better interior objects.

Unlocks for Palace:

- brick bench
- brick planter
- shelf
- workshop sign
- tool rack
- large picture frame
- first special object
- small teaching display slot

### Tier 3 — Mechanic workshop

Player unlocks moving parts, energy systems, and machine literacy.

Unlocks for Palace:

- animated mechanical decor
- engine display
- solar display
- workshop booth
- rare lamp / art object
- bigger cultural installations

### Tier 4 — Machine ecology

Machines produce machines; player/guild has serious builder status.

Unlocks for Palace:

- hero teaching assets
- guild workshop zones
- public exhibit slots
- large installations
- Citadel Archive Terminal

### Later — Structural building

After the furnishing/social loop works, unlock structural construction:

- blocks / Bausteine
- wall modules
- windows
- doors
- roofs
- columns
- stairs

## Grid and block system

The Palace uses grid-based placement slots/zones, not unlimited arbitrary placement.

Everything placed in the game has a footprint measured in blocks. Early furniture uses simple rectangular footprints.

```text
chair = 1 block
lamp = 1 block
table = 1–2 blocks
sofa = 2 blocks
bed = 4–9 blocks depending on type
large/special objects = 4+ blocks
```

The grid makes placement readable: players understand immediately why something fits or does not fit.

### Grid unit

Use a single logical placement unit for furniture and room-layout gameplay:

```text
1 block = 0.7m × 0.7m
```

0.7m is close to real interior/furniture planning dimensions. Kitchen modules, chair/table clearances, practical wall thicknesses, and furnishing layouts can be represented better than with a 1m block. This gives the game a real-life BIM/interior-planning feel while staying simple enough for cozy placement.

### Footprint type

```ts
type GridFootprint = {
  width: number;
  depth: number;
};
```

### Example scale

```text
chair          = 1×1 block  ≈ 0.7×0.7m
small table    = 1×1 block  ≈ 0.7×0.7m
long table     = 2×1 blocks ≈ 1.4×0.7m
sofa           = 2×1 blocks ≈ 1.4×0.7m
compact bed    = 3×2 blocks ≈ 2.1×1.4m
large bed      = 3×3 blocks ≈ 2.1×2.1m
rug            = 2×3 blocks ≈ 1.4×2.1m
wall thickness = ~0.25–0.35 block visual thickness, snapped to grid line
```

The existing 2m architectural snap grid can remain a higher-level module grid. Furniture and room-layout gameplay uses the finer 0.7m grid.

## Palace placement model

The Palace should use placement zones with finite grids.

### Slot types

```text
personal_slot      small public expression slot owned by player
room_slot          assigned booth/room/corner
guild_slot         shared by group/guild/tribe
exhibit_slot       curated teaching/culture display
stage_slot         event/music/art surface
monument_slot      rare large object placement
```

### Placement data

```ts
type PalaceSlotType =
  | "personal_slot"
  | "room_slot"
  | "guild_slot"
  | "exhibit_slot"
  | "stage_slot"
  | "monument_slot";

type PalacePlacementRule = {
  allowedSlots: PalaceSlotType[];
  maxPerPlayer?: number;
  requiresPrivateTier?: number;
  requiresTrust?: number;
  requiresCuratorApproval?: boolean;
};
```

### Example placement rules

```yaml
chair:
  footprint: [1, 1]
  allowed_slots: [personal_slot, room_slot]
  requires_private_tier: 1
  max_per_player: 4

sofa:
  footprint: [2, 1]
  allowed_slots: [personal_slot, room_slot]
  requires_private_tier: 1
  max_per_player: 1

art_frame:
  footprint: [1, 1]
  allowed_slots: [personal_slot, room_slot, exhibit_slot]
  requires_private_tier: 1
  max_per_player: 3

music_booth:
  footprint: [2, 2]
  allowed_slots: [room_slot, stage_slot]
  requires_private_tier: 1
  requires_trust: 2

ceb_press_display:
  footprint: [4, 3]
  allowed_slots: [exhibit_slot, guild_slot]
  requires_private_tier: 3
  requires_curator_approval: true

lifetrac:
  footprint: [6, 3]
  allowed_slots: [monument_slot, exhibit_slot]
  requires_private_tier: 4
  requires_curator_approval: true
```

## Asset definition sketch

```ts
type AssetKind = "deco" | "culture" | "special" | "teaching" | "hero" | "building_part";

type AssetDefinition = {
  id: string;
  name: string;
  kind: AssetKind;
  description: string;
  source?: {
    name: string;
    url: string;
    license: string;
  };
  privateUnlock: {
    tier: number;
    requirement?: string;
  };
  palacePlacement: PalacePlacementRule;
  render: {
    glb?: string;
    icon: string;
    footprint: GridFootprint;
    mobileBudget: "tiny" | "small" | "medium" | "hero";
  };
};
```

## First MVP asset set

Do not start with too many assets. Start with a small social-world set.

### Tier 0

- Builder Banner — 1×1
- Tiny Plant — 1×1
- Name Plaque — 1×1 / wall item

### Tier 1 — Furniture / room feeling

- Chair — 1×1
- Table — 1×1
- Sofa — 2×1
- Lamp — 1×1
- Rug — 2×3
- Picture Frame — 1×1 / wall item
- Plant Pot — 1×1
- Music Poster — 1×1 / wall item
- Small Decoration Object — 1×1
- Listening Corner — 2×2

### Tier 2 — Better deco / workshop flavor

- Brick Bench — 2×1
- Brick Planter — 2×1
- Workshop Sign — 1×1 / wall item
- Tool Rack — 2×1 / wall item
- Large Picture Frame — 2×1 / wall item
- Shelf — 2×1
- Small CEB Knowledge Card Stand — 1×1
- First Special Object — 2×2

### Tier 3 — Machines as display / special objects

- Engine Display — 2×2
- Solar Display — 2×2
- Animated Gear Sculpture — 2×2
- Workshop Booth — 3×3
- Rare Lamp / Art Object — 1×1 or 2×2

### Tier 4 — Hero / exhibit objects

- OSE CEB Press Exhibit — 4×3
- LifeTrac Exhibit Placeholder — 6×3
- Citadel Archive Terminal — 3×2

## First social-world loop

This should come before the full private builder.

```text
1. Player enters Palace social world.
2. Player sees available placement zones and slots.
3. Player has a few unlocked objects from mocked private tier.
4. Player selects one unlocked object.
5. The game previews the object's footprint on the grid.
6. Player places the object into an allowed Palace slot.
7. Object appears in Palace and can be inspected.
8. Higher mocked private tier unlocks richer objects.
```

## MVP implementation seam

Use the current prototype first:

- `apps/web/src/frontend/types.ts` for asset/placement types
- `apps/web/src/frontend/data.ts` for initial static/mock asset unlocks
- `apps/web/src/scene/PalaceScene.tsx` or a new scene component for rendering placed public objects
- `apps/web/src/scene/interactables.ts` for inspect prompts

Do not implement the full private builder yet. Model private-world level as mock state first:

```ts
const privateWorldProgress = {
  tier: 2,
  scores: {
    shelter: 4,
    water: 2,
    food: 2,
    energy: 1,
    fabrication: 3,
    culture: 2,
  },
};
```

Then derive available Palace assets from that.

## Non-goals for the first pass

- no arbitrary palace terraforming
- no full private builder
- no server persistence
- no paid placement
- no unlimited UGC upload
- no open public spam
- no structural building parts in the first pass

## Success condition

The prototype proves this sentence:

> Reaching levels in your private world unlocks furniture and meaningful objects that you can place in the Palace of Culture social world.
