# Palace Ringstadt — future spatial handoff

Status: deferred future Palace-district topology and historical implementation context. The current
first playable world is the linear five-zone Werkstattgasse defined by `docs/STREET-LEVEL-PLAN.md`.

## Product image

The future Palace Ringstadt is not a linear avenue. It is the inhabited ring around the Palace's two
central symbols and is separate from the current Werkstattgasse entry world:

- the **young tree** represents time, patience and growth;
- the **rocket site** represents the future and the 21-year horizon;
- the **Plaza** is the shared civic ground;
- **Street** is the complete walkable ring around it;
- the guild quarters face inward from the outside of the ring.

The player enters from the south, immediately sees the centre and may walk either direction around
the whole city. Web and world will later project the same guilds, Activities, Sessions and places;
this scene establishes their spatial grammar without owning their business state.

## Historical implementation snapshot

Updated after commit `a979a1c` (`feat: add citadel wire politics page`). The handoff remains the
spatial target, while these shipped web facts now constrain the world projection:

- the main web menu contains `Home`, `Culture`, `Politics`, `Workshop` and `Pleb Market`;
- `Culture` uses curated Wavlake, Podcasting 2.0 and Nostr discovery surfaces;
- `Politics` is branded **Clown News**, but currently renders factual content only;
- Politics reads the public [Citadel Wire RSS feed](https://citadelwire.com/feed.xml), extracts text,
  limits input size, deduplicates recurring headlines and keeps source links visible;
- no demo headline, fake social proof or browser-generated satire is shown;
- the future `Clownfaktor:` contract is commented at the `WORLD AGENT EXTENSION POINT` in
  `apps/web/src/net/clownNews.ts`; only a separate world agent may implement it.

The current browser adapter is a demo acquisition layer, not permanent world truth. Before Politics
appears in the 3D engine, normalize accepted wire items into Palace Core records so web and world
project the same id and source fields. The scene must never fetch, rewrite or independently classify
news.

## Top-down plan

```text
                                      NORTH

                          ╭────── ARCANE PORTAL ──────╮
                          │  action on demand / games │
                 ╭────────┴───────────────────────────┴────────╮
                 │                                             │
          SHELTER HALL                                  CULTURE LIBRARY
          CRAFT LODGE          OUTER BUILDING RING       LISTENING STAGE
                 │        entrances and porches inward          │
                 │                                             │
             ╭───┴═══════════════════════════════════════┴───╮
             ║                                               ║
             ║                  STREET                       ║
             ║          continuous walkable ring             ║
             ║                                               ║
        FORGE YARD    ╭─────────────────────────────────╮    CULTURE
        BLACKSMITH    │                                 │     COURT
        SAWMILL       │        INNER PLAZA              │
             ║        │                                 │        ║
             ║        │            🌳                   │        ║
             ║        │       TREE + ROCKET SITE 🚀     │        ║
             ║        │                                 │        ║
             ║        ╰─────────────────────────────────╯        ║
             ║                                               ║
             ║                                               ║
             ╚═══╤═══════════════════════════════════════╤═══╝
                 │                                       │
           WORKSHOP DEPOT                           MARKET + INN
                 │                                       │
                 ╰─────────────── MAIN GATE ──────────────╯
                                      │
                                    SPAWN
                                      │
                                     SOUTH
```

The drawing communicates hierarchy, not exact scale. The centre must remain visually dominant.
Buildings frame it; they do not form an opaque wall around it.

Politics is a civic surface rather than a mandatory guild quarter. Add a small inward-facing wire
board between the Commons, Culture and Market routes:

```text
INNER PLAZA  ->  CITADEL WIRE BOARD  ->  CULTURE / MARKET
                     facts only
               future agent layer beside it
```

This is a board, notice wall or town crier station—not another landmark competing with the tree and
rocket site.

## Visual recipe

### Rendering qualities

Aim for the graphic clarity of a stylized Nintendo Switch adventure world without copying a
specific game's assets or characters:

- simple, strong silhouettes;
- reduced geometry and painterly surfaces;
- warm, readable colour regions;
- soft daylight/dusk, atmospheric depth and restrained fog;
- natural vegetation with deliberate negative space;
- exaggerated landmarks legible from third person;
- fantastic and welcoming rather than photoreal or grimdark;
- material response kept simple enough for weaker desktop GPUs.

### Architecture blend

Every quarter belongs to the same world. Do not split the ring into three unrelated art styles.
Layer the influences on each building:

| Layer | Approx. share | Expression |
|---|---:|---|
| Medieval | 65% | stone, timber, plaster, shingles, towers, gables, arches, guild halls |
| Western | 25% | porches, awnings, timber walks, open workshops, large signs, market fronts |
| Cypherpunk | 10% | antennas, cables, terminals, emissive marks, patched-on technical systems |

Cypherpunk is a signal layer, not a neon city. A bright colour must help identify a place, state or
route. Upper floors create silhouette and atmosphere; street-level fronts communicate action.

## Spatial hierarchy

### 1. Central sanctuary

- Keep the rocket foundation and young tree together in the middle.
- The future rocket grows from the existing prepared site; do not ship a completed rocket early.
- No shop, traffic lane or unrelated prop crosses the centre.
- Keep important sightlines from the gate and ring.
- Use only low planting, seating, ceremonial stones and a few banners nearby.
- Reserve this ground for the Bell, Unsealings, witnessing and multi-guild gatherings.

### 2. Inner Plaza

- Circular, pedestrian and visually quieter than the street.
- Several radial paths connect it to the ring.
- Floor value/colour differs clearly from Street.
- Benches and lamps support gathering without obscuring the centre.
- No tall prop may accidentally become the central silhouette.

### 3. Street Ring

- One continuous road around the Plaza.
- A player can complete the loop in both directions without jumping or backtracking.
- Wide enough for groups, events and small temporary stalls.
- Inner edge reads as civic space; outer edge reads as inhabited frontage.
- The ring itself is the primary navigation device. No minimap should be necessary for one lap.

### 4. Guild quarters

All primary entrances face the ring. Recommended distribution:

| Direction | Place | Function |
|---|---|---|
| South | Main Gate / Commons | arrival and immediate sightline to centre |
| South-west | Forge Yard | build, study, repair; blacksmith, sawmill, GVCS Activities |
| West / north-west | Craft Lodge and Shelter Hall | materials, joinery, building and repair |
| North | Arcane Portal | strongest technical silhouette; action on demand |
| East / north-east | Culture Library and Listening Stage | music, podcasts, reading and performance |
| East / south-east inner edge | Citadel Wire Board | factual politics wire; future satire shown separately |
| South-east | Market and Inn | trading, hospitality and low-friction social arrival |

Use stable spatial ids from the beginning:

```text
place:commons:plaza
place:guild:forge
place:guild:craft
place:guild:shelter
place:guild:culture
place:commons:citadel-wire
place:market:ring
place:arcade:portal
```

These are spatial anchors only. Scene components must not own guild membership, Nostr keys,
curation, wallet state or Session truth.

### 5. Outer boundary

- Palisade, landform and dense vegetation hide the technical edge.
- Avoid the read of a rectangular arena even if colliders remain simple internally.
- Keep the south gate unmistakable.
- Later radial exits may lead to new quarters without breaking the original ring.

## Existing code — useful facts

At the time of this handoff, the scene contained a radial base (compacted in the 2026-07 verdichten
pass). This evidence is historical and must not override the current linear Werkstattgasse contract:

- `PLAZA_CENTRE = [0, 88]`;
- `PLAZA_RADIUS = 24`;
- `plazaRing()` places six inward-facing buildings at radius `35` with seeded yaw jitter;
- the south arc (≈270°±) is intentionally open for the approach;
- the workshop yard (`WORKSHOP_CENTRE = [-35, 88]`, forge chimney) fills the west ring;
- Plaza/Workshop visuals and all colliders consume the same shared data (`plazaRing()`,
  `plazaSolids()`, `workshopSolids()`, `depotSolids()`, `YOUNG_TREE`, `FENCE`, `GATE_ARCH`);
- `STREET_SPAWN = [0, 3, 30]`;
- the gate arch sits at `z=14` (`GATE_ARCH`), posts collidable;
- the enclosure spans `x=-44…44`, `z=2…136`, with an 11 m half-width gate opening; the forest
  band and vegetation bounds derive from `FENCE`;
- all procedural textures/scatter are seeded (`scene/rand.ts`) — no `Math.random()` anywhere in
  the street, so the world is identical across remounts;
- street interactables (build site, young tree, forge, well) live in `scene/interactables.ts`,
  filtered per world.

Preserve the shared-layout habit. Extend it rather than adding a second hand-maintained position
list. The former inconsistencies (unmounted `StreetFacades`/`StreetShops`, stale comments,
unseeded textures) were resolved in the verdichten pass. The radial layout remains a future Palace
district reference, not the current entry-world layout.

## One radial layout source

Define one small, typed layout and derive visuals, colliders, signs, interactables, map markers and
future Session spawns from it.

```ts
type RingPlace = {
  id: PlaceId;
  angle: number;
  radius: number;
  buildingType: string;
  guildId?: GuildId;
  rotationOffset?: number;
  scale?: number;
};
```

Position from angle and radius:

```ts
const x = centerX + Math.cos(angle) * radius;
const z = centerZ + Math.sin(angle) * radius;
const rotationY = Math.atan2(centerX - x, centerZ - z) + (rotationOffset ?? 0);
```

Rules:

- building front faces the centre by default;
- deliberate exceptions use `rotationOffset` and a written reason;
- collider footprint comes from the same building/layout record;
- paths and gate gaps are explicit layout data, not accidental empty space;
- seed any procedural variation from stable place/building ids;
- never call `Math.random()` during render or texture construction.

## Existing FOSS assets as world proxies

The credited CC0 village assets already cover the first landmarks:

| Asset | Palace use |
|---|---|
| `blacksmith.glb` | Forge Yard anchor |
| `sawmill.glb` | Citadel/GVCS Sawmill Activity |
| `stable.glb` | future Food/Land quarter |
| `windmill.glb` | Energy landmark |
| `market-stand.glb` | ring market |
| `inn.glb` | inn, guild hall or Culture hospitality |
| houses and huts | Shelter/Craft frontage |

These are `WORLD PROXY` visuals, never technical representations of source hardware. Preserve asset
credits. Source, maturity and license will come from the canonical Activity inspection layer.

## Interaction grammar

Street-level design must communicate verbs:

- Forge: **Study · Build · Repair**
- Culture: **Listen · Read · Perform**
- Market: **Browse · Trade · Exhibit**
- Arcane: **Play · Form party · Challenge**
- Politics: **Read · Verify** (add **Satirize** only after the world agent exists)
- Commons: **Meet · Invite · Attend**

Use doors, porches, signs, props, lighting and silhouette before adding floating UI. Empty places
may be quiet, but never fake populated: no fake users, chat, presence dots or invented Sessions.

## Politics / Clown News projection

The visual joke is the town crier and clown framing; the data remains factual until the separate
agent layer exists.

Current factual fields:

```text
publishedAt
marketLine?
title
factualBody
sourceUrl
category
```

Projection rules:

1. Preserve date, title, factual body and Citadel Wire link exactly as accepted by the source
   adapter.
2. Render provider content as text, never provider HTML.
3. Show an honest empty/unavailable board when the live source cannot be read.
4. Guilds may later curate the canonical item through Palace Core; they do not copy or alter it.
5. Do not display a `Clownfaktor:` placeholder, canned joke, score or clown meter.
6. A future world agent may append one fresh satire record referencing the factual item id. That
   record is adjacent presentation, never a mutation of the factual record.
7. Web cards, world boards and later VR views must resolve to the same canonical source item.

Suggested visual treatment: parchment headline strips, a brass wire terminal, a small jester bell
and a clear source seal. Keep the cyber layer functional and restrained. The board may be funny;
the provenance must be obvious.

## Collision and walkability

- Derive building colliders from the radial layout.
- Preserve the open gate and all radial Plaza paths.
- Keep the full ring traversable.
- Test door thresholds and awnings with the real controller.
- Do not place invisible barriers across obvious walkable surfaces.
- Prevent access behind the world boundary without making the boundary visually surprising.
- Keep the central sanctuary free of unnecessary colliders.
- Validate the palisade collider matches its visible geometry and leaves the gate open.

Required walkthrough:

```text
Spawn → Gate → Ring clockwise → Arcane → Culture → Market → Gate
                 ↓
              Plaza centre
                 ↓
Spawn ← Gate ← Ring counter-clockwise ← Forge ← Craft/Shelter
```

## Performance budget

- Reuse CanvasTextures per facade/material variant.
- Use instancing for repeated facade modules, lamps and vegetation where practical.
- Shadow only hero buildings, avatars and meaningful landmarks.
- Small props and repeated upper floors should not cast shadows.
- Prefer emissive materials over many realtime lights.
- Keep a small number of deliberate warm light pools.
- Avoid new large GLBs until the existing CC0 set cannot express the silhouette.
- Use deterministic, bounded vegetation density.
- Keep the web projection usable when 3D or post-processing is disabled.
- Treat 1280×720 and a modest desktop GPU as the minimum desktop case.

## Build order

1. Establish the correct centre, Plaza, ring radii and south entrance.
2. Make one complete collision-tested lap possible.
3. Fix the gate-to-centre composition.
4. Place four unmistakable landmarks: Forge, Culture, Market and Arcane.
5. Add Craft/Shelter supporting frontage.
6. Connect stable place ids and simple interactables.
7. Add signs, porches and street-level props.
8. Add deterministic vegetation and restrained lighting.
9. Optimize repeated geometry and shadows.
10. Only then add facade micro-detail or more buildings.

## Acceptance checklist

- [ ] Player can complete the ring in both directions without obstruction.
- [ ] Tree and rocket site dominate the centre and remain visible from the gate.
- [ ] The centre contains no unrelated building, road or tall prop.
- [ ] Every primary building faces the ring deliberately.
- [ ] Forge, Culture, Market and Arcane are identifiable without a map.
- [ ] Gate, radial paths, doors and Plaza are collider-safe.
- [ ] Visuals and colliders consume the same layout data.
- [ ] World layout is identical after repeated reloads/remounts.
- [ ] No mounted/unmounted mismatch or stale street description remains.
- [ ] No fake social proof is introduced.
- [ ] The Citadel Wire Board shows factual source fields or an honest unavailable state.
- [ ] Source time and link remain visible in both web and world projections.
- [ ] No `Clownfaktor:` appears before a separate world agent is connected.
- [ ] Future satire is stored and rendered beside the factual record, never inside it.
- [ ] No Guild/Nostr/wallet truth lives in scene components.
- [ ] Existing CC0 credits and `WORLD PROXY` semantics remain intact.
- [ ] 1280×720 has no canvas/UI overflow.
- [ ] Biome, typecheck, tests and production build pass.

Capture and inspect four final views:

1. spawn/gate looking directly toward tree and rocket site;
2. centre showing Plaza and surrounding ring;
3. Forge Yard with the central symbols still orienting the player;
4. Culture side looking across the ring toward Arcane.
5. Citadel Wire Board showing its relationship to Plaza, Culture and Market.

## Final rule

```text
The rocket is the future.
The tree is time.
The Plaza is community.
Street is the culture that connects them.
```
