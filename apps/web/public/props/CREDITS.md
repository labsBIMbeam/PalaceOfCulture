# Street props — CC0 asset credits

All models here are **CC0 1.0 / public domain** (no attribution required). Listed anyway as good
practice. Source: [Poly Pizza](https://poly.pizza) (filtered to CC0), authored by **Quaternius** and
**Kenney** — the cohesive low-poly toon libraries, same as `public/furniture`. Used in
`apps/web/src/scene/StreetWorld.tsx` (the Werkstattgasse workshop-street demo world).

This folder is **gitignored** (binary assets, like `public/furniture` / `public/buildings`); the
`.glb` files are fetched/dropped in and rsync'd to the host, they are not committed. Keep this file.

| File | Creator | License | Model |
|------|---------|---------|-------|
| anvil.glb | Kenney | CC0 1.0 | Workbench Anvil |
| barrel-1.glb / barrel-2.glb | Quaternius | CC0 1.0 | Barrel |
| bench.glb | Quaternius | CC0 1.0 | Bench |
| box.glb | Quaternius | CC0 1.0 | Crate |
| bucket.glb | Quaternius | CC0 1.0 | Bucket |
| cart.glb | Quaternius | CC0 1.0 | Broken Cart |
| crate-1.glb / crate-2.glb | Quaternius | CC0 1.0 | Crate |
| flag.glb | Quaternius | CC0 1.0 | Flag |
| lamppost.glb | Quaternius | CC0 1.0 | Street Light |
| lantern.glb | Quaternius | CC0 1.0 | Torch |
| log.glb | Quaternius | CC0 1.0 | Wood Log |
| plant-1.glb / plant-2.glb | Quaternius | CC0 1.0 | Houseplant |
| sack.glb | Quaternius | CC0 1.0 | Bag |
| stall.glb | Quaternius | CC0 1.0 | Market Stand |
| tree.glb | Quaternius | CC0 1.0 | Pine Trees |
| vase.glb | Kenney | CC0 1.0 | Honey jar |
| well.glb | Quaternius | CC0 1.0 | Well |

### Furniture + tools (`packages/assets-pipeline/props/furniture-tools.json`)

| File | Creator | License | Model |
|------|---------|---------|-------|
| chair-a.glb / chair-b.glb | Quaternius | CC0 1.0 | Chair |
| chair-office.glb | Quaternius | CC0 1.0 | Office Chair |
| table-a.glb | Quaternius | CC0 1.0 | Small Table |
| table-round.glb | Quaternius | CC0 1.0 | Table Round Small |
| desk.glb | Quaternius | CC0 1.0 | Desk |
| lamp-table.glb | Kenney | CC0 1.0 | Lamp Round Table |
| lamp-stand.glb | Quaternius | CC0 1.0 | Light Stand |
| lamp-desk.glb | Quaternius | CC0 1.0 | Light Desk |
| tool-saw.glb | Quaternius | CC0 1.0 | Sawmill Saw |
| tool-hammer.glb | Quaternius | CC0 1.0 | Doublesided Hammer |
| tool-shovel.glb | Quaternius | CC0 1.0 | Shovel |
| tool-axe.glb | Quaternius | CC0 1.0 | Axe |

## Re-fetching / adding more

The fetch script lives at `packages/assets-pipeline/props/` (`fetch_props.mjs` + `street-props.json`):
searches Poly Pizza, keeps only CC0 models by Kenney/Quaternius, seats them, and downloads to this
folder. Regenerate with:

```
node packages/assets-pipeline/props/fetch_props.mjs apps/web/public/props packages/assets-pipeline/props/street-props.json
```

To add one by hand: drop a `.glb` here and add a placement to `PROPS` in
`apps/web/src/scene/StreetWorld.tsx`. Resolve a model's GLB manually:

```
curl -s https://poly.pizza/m/<id> | grep -oE 'https://static.poly.pizza/[A-Za-z0-9_-]+\.glb'
```

Whole CC0 kits to expand from: **Kenney** (https://kenney.nl/assets — City/Furniture/Survival kits),
**Quaternius** (https://quaternius.com — Nature, Modular buildings, Ultimate packs).
