# Village buildings — CC0 asset credits

The old-town quarter of the Werkstattgasse street — the 600 Billion blend of **medieval + wild-west
+ cyberpunk**. Rendered by `Village` in `apps/web/src/scene/Village.tsx` (the cyberpunk neon is
primitives; the buildings are these GLBs).

All **CC0 1.0 / public domain**, from [Poly Pizza](https://poly.pizza):

| File | Creator | Model | Role |
|------|---------|-------|------|
| inn.glb | Quaternius | Fantasy Inn | tavern / saloon (hero) |
| house-a.glb | Quaternius | Fantasy House | town house |
| house-b/-c/-small.glb | Quaternius | House | houses |
| blacksmith.glb | Quaternius | Blacksmith | ties to the Schmiede craft |
| sawmill.glb | Quaternius | Fantasy Sawmill | ties to the Sägerei craft |
| stable.glb | Quaternius | Fantasy Stable | stable |
| hut-a/-b.glb | Quaternius | Hut | huts |
| tower.glb | Quaternius | Watch Tower | medieval vertical |
| windmill.glb | Quaternius | Windmill | windmill |
| market-stand.glb | Quaternius | Market Stand | market centre |
| tech-tower.glb | Kenney | Skyscraper | cyberpunk skyline |
| tech-block.glb | Kenney | Large Building | cyberpunk skyline |

Medieval/western buildings are Quaternius's cohesive **Fantasy Town** pack; the two Kenney
sci-fi buildings supply the cyberpunk verticals. The cyberpunk near-layer (neon signs, glowing
strips, rooftop beacons) is drawn as emissive primitives in `Village.tsx`, bolted onto the old walls.

This folder is **gitignored** (binary assets); `.glb` files are fetched/dropped in and rsync'd to the
host, not committed. Keep this file.

## Regenerate

```
node packages/assets-pipeline/props/fetch_props.mjs apps/web/public/village packages/assets-pipeline/props/village.json
```
