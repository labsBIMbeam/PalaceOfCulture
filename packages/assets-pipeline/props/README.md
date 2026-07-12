# Street props sourcing

Fetches the CC0 low-poly props for the Werkstattgasse workshop-street world
(`apps/web/src/scene/StreetWorld.tsx`). Since `apps/web/public/props/*.glb` is **gitignored**
(binary assets, like `public/furniture` / `public/buildings`), this is how they are regenerated
on a fresh checkout or on the deploy host (see `infra/HOSTING.md` — gitignored assets are
re-fetched, not committed).

## Run

```bash
node packages/assets-pipeline/props/fetch_props.mjs \
  apps/web/public/props \
  packages/assets-pipeline/props/street-props.json
```

It searches [Poly Pizza](https://poly.pizza), keeps only **CC0** models by **Kenney / Quaternius**
(for a cohesive toon look), verifies the glTF magic bytes, seats them, and writes a `_manifest.json`.
Only network access to `poly.pizza` / `static.poly.pizza` is required.

## Spec format (`street-props.json`)

```json
{ "term": "barrel", "want": 2, "as": "barrel", "authors": ["Kenney", "Quaternius"] }
```

- `term` — Poly Pizza search query
- `want` — how many distinct CC0 matches to keep (`>1` → `barrel-1.glb`, `barrel-2.glb`, …)
- `as` — output basename
- `authors` — allow-list of creators (omit to accept any CC0 author)

Credits for the resulting files live in `apps/web/public/props/CREDITS.md`.
