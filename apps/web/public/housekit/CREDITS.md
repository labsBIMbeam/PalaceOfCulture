# Modular house kit — CC0 asset credits

A cohesive **CC0 1.0 / public domain** modular building kit by **Kenney** (his City / House kit),
sourced from [Poly Pizza](https://poly.pizza) filtered to CC0. Used by `KitHouse` in
`apps/web/src/scene/KitBuilding.tsx` to assemble houses in the Werkstattgasse street.

Authored on a **2-metre grid** (measured from the GLBs): `wall` / `wall-window-round` panels are
2.0 long × 2.4 tall; `floor` / `roof-center` are 2×2 tiles. Pieces snap at native scale.

This folder is **gitignored** (binary assets); the `.glb` files are fetched/dropped in and rsync'd to
the host, not committed. Keep this file.

| File | Model | File | Model |
|------|-------|------|-------|
| wall.glb | Wall | roof-center.glb | Roof Flat Center |
| wall-low.glb | Wall Low | roof-corner.glb | Roof Flat Corner |
| wall-window.glb | Wall Window* | roof-side.glb | Roof Flat Side |
| wall-window-round.glb | Wall Window Round | roof-structure.glb | Structure Roof |
| wall-doorway.glb | Wall Doorway* | floor.glb | Floor |
| wall-corner.glb | Wall Corner Column | floor-wood.glb | Wood Floor |
| wall-corner-round.glb | Wall Corner Round | door.glb | Doorway (leaf) |
| door-front.glb | Doorway Front | | |

All **Kenney, CC0 1.0**. Source pages under `https://poly.pizza/m/<id>` — the exact ids are in
`packages/assets-pipeline/props/house-kit.json`.

\* `wall-window.glb` / `wall-doorway.glb` measured at a **1-unit / 1.29 m** scale — a different Kenney
sub-kit than the 2-unit walls, so they are **not** used by the aligned `KitHouse` (kept in the library
for smaller structures). The 2-unit pieces (`wall`, `wall-window-round`, `wall-corner-round`, `floor`,
`roof-*`) are the cohesive set.

## Regenerate

```
node packages/assets-pipeline/props/fetch_props.mjs apps/web/public/housekit packages/assets-pipeline/props/house-kit.json
```
