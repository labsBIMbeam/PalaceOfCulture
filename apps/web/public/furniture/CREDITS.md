# Furniture — CC0 asset credits

All models here are **CC0 / public domain** (no attribution required). Listed anyway as good
practice. Source: [Poly Pizza](https://poly.pizza) (filtered to CC0), authored by Kenney and
Quaternius — the cohesive low-poly toon libraries from the FOSS foundation research (07-research).

| File | Creator | License | Source |
|------|---------|---------|--------|
| chair-1.glb | Kenney | CC0 | https://poly.pizza/m/CKSz6PB1vO |
| chair-2.glb | Kenney | CC0 | https://poly.pizza/m/RY93lbAIFg |
| chair-3.glb | Quaternius | CC0 | https://poly.pizza/m/9kIjuRFMFw |
| table-1.glb | Kenney | CC0 | https://poly.pizza/m/41R2HTYj1O |
| lamp-1.glb | Kenney | CC0 | https://poly.pizza/m/8LiDIfXVLi |

## Adding more

Whole CC0 kits to expand the catalog (drop a `.glb` here, add an entry to
`apps/web/src/scene/furnitureCatalog.ts`):

- **Kenney Furniture Kit** — https://kenney.nl/assets/furniture-kit (CC0, ~50 pieces)
- **Quaternius Interior / Furniture** — https://quaternius.com (CC0)
- **Poly Pizza** — https://poly.pizza, filter to CC0; resolve a model's GLB with
  `curl https://poly.pizza/m/<id> | grep -oE 'https://static.poly.pizza/[a-z0-9-]+\.glb'`

This folder is gitignored (binary assets), same as `public/avatar`.
