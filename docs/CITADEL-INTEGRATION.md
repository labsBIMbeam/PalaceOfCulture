# Citadel Resources integration — knowledge becomes a playable guild commons

## Finding

[Citadel Resources](https://www.citadel-resources.com/) is not merely a visual reference for the
Palace. Its source repository already contains the domain structure the Palace Core needs:

- a 15-chapter guild reading room;
- curated research tracks;
- 8 open-hardware records;
- 12 craft-library records;
- 9 interest guild definitions;
- explicit `guildId` assignments on hardware and craft records;
- Nostr tags and publishing configuration;
- source URLs, maturity labels and intended guild use.

The source repository at `G:\Github\citadel-resources` remains read-only from the Palace project.
The Palace must consume an explicit versioned export rather than import its TypeScript files or
scrape rendered HTML.

## Product role

Citadel Resources becomes the **knowledge and blueprint provider** for builder-oriented Palace
guilds. The Palace adds people, Sessions, spatial representation, audit history and V4V; Citadel
remains the editorial source.

```text
Citadel Resources                         Palace
──────────────────────────────────────    ──────────────────────────────────
Book chapter                          →   Article Activity / library Session
Research track                        →   Guild-curated reading collection
Open-hardware record                  →   Craft Activity / world proxy
Craft-library record                  →   Blueprint/reference Activity
Guild definition                      →   Guild charter candidate
Nostr tag                             →   discovery/publishing adapter
Source URL + stage + license          →   visible provenance, never hidden
```

The connection proves the Palace thesis: guilds filter open knowledge and turn it into shared
activity instead of another global feed.

## Existing Citadel guild ecology

The local Citadel source already defines these guilds:

| Citadel id | Palace quarter | Primary material |
|---|---|---|
| `land` | Land Observatory | terrain, water, law, settlement constraints |
| `shelter` | Shelter Hall | housing, workshops, repair and off-grid patterns |
| `craft` | Craft Lodge | earth, timber, joinery, plaster, masonry and repair |
| `forge` | Forge Yard | open hardware, fabrication and machine-assisted craft |
| `food` | Food Garden | farming, grazing, seed, storage and local food loops |
| `energy` | Energy House | passive systems, power, storage, heating and cooling |
| `bitcoin` | Bitcoin Archive | custody, circular economies and merchant tools |
| `nostr` | Nostr Scriptorium | publishing, lists, relay/group standards and signing |
| `culture` | Culture Library | essays, stories, illustration and local memory |

These are not automatically active Palace guilds. The provider export supplies **charters**. A
truth-tier command creates the live guild and records its initial stewards. It does not create or
require a Nostr key. Provider status (`draft`, `recruiting`, `active`) remains visible source
metadata rather than granting Palace roles.

## Keyless bootstrap and later security binding

Citadel deliberately removed its public guild-economy/Nostr-key surface while the cross-project
security model is being designed. The Palace integration preserves that decision:

- Citadel exports public guild charters, source links and curation metadata only;
- Palace creates stable ids such as `guild:forge` and records decisions in SQLite;
- local membership, curation, chat adapters and Sessions do not depend on Nostr signing;
- no nsec, NWC secret, relay credential or deterministic seed crosses the provider boundary;
- public tags/relays may be metadata, but confer no authority;
- a future signer adapter binds an npub to the existing guild through an audited proof;
- rotating/recovering the signer changes the binding, never the guild id or its history.

This keeps the security problem centralized across Felix's projects instead of solving it
differently inside every UI. Possible later signers include user-held NIP-07, remote NIP-46 and a
threshold/officer flow; choosing among them is intentionally outside this integration slice.

## The Global Village Construction Set as game structure

Open Source Ecology describes the GVCS as a modular set of open blueprints for 50 industrial
machines needed by a small modern civilization. Its construction-set families include habitat,
agriculture, industry, energy, materials and transportation. OSE states that its designs use
CC BY-SA 4.0, writings CC0 and software GPL-3.0; each imported artifact still needs its own license
record rather than relying on a blanket assumption.

Official references:

- [Global Village Construction Set](https://wiki.opensourceecology.org/wiki/GVCS)
- [Construction Sets](https://wiki.opensourceecology.org/wiki/Construction_Sets)
- [Open collaboration and licensing](https://wiki.opensourceecology.org/wiki/About_Open_Collaboration)

### Why it fits

The GVCS is already a real technology tree, but the Palace must not turn it into a fake linear
unlock ladder. The knowledge remains open from the beginning. Progress represents what a person or
guild has studied, simulated, documented or built — never permission to access public knowledge.

```text
Discover source
      ↓
Study and annotate in web
      ↓
Start guild Session
      ↓
Explore/assemble world proxy or Arcane simulation
      ↓
Publish notes, adaptation or real replication evidence
      ↓
Place a persistent guild artifact and retain the history
```

### First Citadel hardware path

| Source Activity | Guild lens | Web use | World/game use |
|---|---|---|---|
| Global Village Construction Set | Forge | browse the whole source map | technology wall in Forge Yard |
| Sawmill | Forge | source docs, maturity, curator notes | sawmill world proxy + material-flow Session |
| CEB Press | Forge / Craft | plans, earth-material references | block-press assembly simulation |
| Seed Eco-Home | Shelter | CAD/BOM/build notes | modular shelter planning table |
| LifeTrac | Food / Land | variants, maintenance docs | hauling/site-logistics Arcane activity |
| Well-drilling rig | Land | planning-stage references | water-site scenario, clearly labeled simulation |
| CNC table | Forge | fabrication docs | nesting/cutting challenge without real machine authority |
| Open-source welder | Forge | planning-stage record | repair bench scenario, never professional certification |

The source maturity must be prominent. A `planning stage` card cannot look as complete as a
`built/documented` source. The Palace normalized values are `reference`, `planning`, `prototype`,
`documented` and `built`; the original provider label is retained beside them.

## Existing Palace assets already fit the first demo

The Palace contains a CC0 village kit with credited Quaternius/Kenney assets:

- `blacksmith.glb` → Forge Yard anchor;
- `sawmill.glb` → Sawmill Activity world proxy;
- `stable.glb` → Food/Land Quarter anchor;
- `windmill.glb` → Energy/Materials landmark;
- `market-stand.glb` → guild-made artifact exchange;
- houses/huts → early Shelter Quarter.

These models are **world proxies**, not technical representations of OSE machinery. The interface
must show `WORLD PROXY` plus the canonical source/maturity. Later technical CAD or purpose-built
models can replace the renderer without changing Activity ids, curation or Session history.

Asset credits remain in `apps/web/public/village/CREDITS.md`; Citadel/OSE attribution and licenses
belong on the Activity source panel.

## Reader and research integration

The Citadel book is licensed CC BY-SA 4.0 in its backmatter. It should enter the Palace as chapters,
not as one 141-minute wall of text:

| Chapter family | Default guild curations | Palace place |
|---|---|---|
| Bitcoin | Bitcoin Guild | Bitcoin Archive |
| Nostr | Nostr Guild | Scriptorium |
| Gaming Engines | Culture / Forge | Arcane workshop |
| Guilds, Clans and V4V | Culture / all-guild Commons | Guild Hall |
| Open-construction architecture | Shelter / Forge / Nostr | Planning table |
| Future of Construction | Commons / Culture | Palace library |

Possible social verbs:

- `Read together` creates a chapter Session with shared location and optional voice;
- `Curate for guild` appends context without copying the chapter;
- `Discuss in Quarter` binds the Session to a guild place;
- `Open source` always links back to Citadel Resources;
- `Support` appears only when a real published V4V endpoint exists.

Book images and general site images require explicit per-asset rights metadata before copying. The
book license covers the work, but a third-party or referenced image may have separate terms. Until
verified, the Palace links the chapter and uses its own artwork.

## Provider export contract

Citadel should eventually publish a static artifact such as:

```text
https://citadel-resources.com/palace/v1/catalog.json
```

Suggested shape:

```json
{
  "format": "palace.provider.catalog",
  "protocolVersion": 1,
  "providerId": "provider:citadel-resources",
  "revision": 1,
  "generatedAt": "2026-07-12T00:00:00.000Z",
  "guildCharters": [],
  "activities": [],
  "curations": []
}
```

The catalog schema has no key or signer fields by design.

Each Activity source contains:

- stable provider/external id;
- canonical source URL;
- retrieval time and optional canonical JSON hash;
- normalized maturity plus original stage label;
- explicit license/attribution where known;
- guild curation references separate from the Activity.

The Palace server fetches, size-limits, validates and canonicalizes the JSON. It compares the
previous accepted revision and appends `provider.snapshot.accepted` to SQLite before updating any
projection. Invalid, older or unexplained mutations are rejected. Browser clients never treat the
provider response as authority and never fetch arbitrary asset URLs directly.

### Why no HTML scraping

- the local source already has typed records;
- scraping discards guild ids, maturity semantics and future licenses;
- an HTML redesign would silently break Palace ingestion;
- deterministic JSON can be hashed, audited and reconciled;
- Citadel remains independently deployable and useful.

## V4V rules

Open licensing does not imply an invented payment destination. An Activity may show:

- the source project's official support link;
- creator/contributor recipients explicitly published by that source;
- a Palace curator split only when it is transparent and accepted;
- no `Boost` action when no valid destination exists.

Embedded Arcane activities never receive wallet credentials. The Palace host performs any payment
after consent and records the result separately from source provenance.

## Smallest shippable Citadel slice

1. Define the static provider catalog in a separate Citadel Resources change.
2. Add the Palace server adapter and append-only snapshot acceptance.
3. Materialize Forge, Shelter and Craft as keyless chartered guilds plus Commons.
4. Import GVCS, Sawmill, CEB Press, Seed Eco-Home and three book chapters as canonical Activities.
5. Create curations from the existing Citadel `guildId` fields.
6. Map Sawmill and Forge to the existing CC0 world proxies.
7. Start one `Study/build together` Session on web and enter the same Session at Forge Yard.
8. Add one bounded material-flow Arcane simulation only after Session continuity works.

### Acceptance criteria

- changing Citadel HTML does not affect the import;
- one Citadel Activity appears through multiple guild lenses without copying its source record;
- source, maturity, license and provider attribution are visible in web and world inspection;
- a world proxy is never presented as an accurate technical model;
- provider changes are accepted in SQLite before appearing in clients;
- no Nostr key or signer is needed to create, curate or join the first guilds;
- no source file in the Citadel repository is modified by the Palace;
- offline Palace clients retain the last accepted provider snapshot and mark its age.
