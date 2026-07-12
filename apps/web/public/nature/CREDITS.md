# Nature — CC0 asset credits

All **CC0 1.0 / public domain** by **Quaternius**, from [Poly Pizza](https://poly.pizza). The nicer
GLB trees + nature detail used by `Vegetation.tsx` (the distant forest wall stays instanced primitives
in `Enclosure.tsx` for performance).

| File | Model | File | Model |
|------|-------|------|-------|
| pine.glb / pine-2.glb | Pine | bush.glb | Bush |
| oak.glb / oak-2.glb | Tree (oak) | bush-flowers.glb | Bush with Flowers |
| birch.glb | Birch Tree | bush-berries.glb | Bush with Berries |
| dead-tree.glb | Dead Tree | hedge.glb | Hedge |
| fern.glb | Fern | stump.glb | Trees cut (stump) |
| rock.glb / rock-large.glb / rocks.glb | Rock(s) | grass-clump.glb | Grass |

Gitignored (binary); regenerate:
`node packages/assets-pipeline/props/fetch_props.mjs apps/web/public/nature packages/assets-pipeline/props/nature.json`
