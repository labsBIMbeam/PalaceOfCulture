# Verdichten-Brief — audit the Werkstattgasse street, then compact & beautify

*A self-contained handoff prompt for a fresh session to review the street world and then **verdichten** — compact the footprint and make it more beautiful. Two phases: **A) audit**, then **B) verdichten**. Do A before B — report the audit first, then do the compaction. Grounded in the street as it actually stands (2026-07-12); if the files have moved on, trust the code over this doc.*

---

You are working in the monorepo **`G:\Github\PalaceOfCulture`**, branch **`feature/web-home-builder`** (pnpm workspace). This is a **video-game level-art / 3D-scene composition task**: moving meshes, tuning lights, instancing vegetation. The web app is `apps/web` — a browser 3D world built on **three.js + react-three-fiber v8 + @react-three/drei + @react-three/rapier (physics) + ecctrl (character controller) + @react-three/postprocessing**. Read `CLAUDE.md` and `docs/adr/0001-stack-and-runtime-topology.md` first.

## The setting (what this world *is*)

**Werkstattgasse** is the beta sandbox world of the game — a walkable dusk-lit workshop camp that players explore before the main town exists. Its heart is a **round civic plaza** (`PLAZA_CENTRE = [0, 120]`, `PLAZA_RADIUS = 24`). At the plaza centre is a **prepared build site** — a foundation ring + a red surveyor's flag marking where the town's two landmark builds (a rocket monument and the Palace of Culture) will later rise; **neither is built yet**, only the site is marked. A **young apple tree** (`treeProgress = 0.42`) already grows beside it. Five **walkable single-storey buildings** (1–4 rooms, real doors/windows/columns, wood + stone procedural textures) ring the plaza. The camp is enclosed by a **palisade fence + a dense forest band** with a south gate. The player spawns at the gate (`STREET_SPAWN = [0, 3, 30]`) and walks +z toward the plaza.

## The files that make the street (your map)

All under `apps/web/src/scene/`:

- **`PalaceScene.tsx`** — the `<Canvas>` + lighting + fog + `<Physics>`. Dusk grade: ACESFilmic tone-map, exposure 1.05, soft shadows, warm low directional key. It gates the world: `{world === "street" ? <StreetColliders/> : null}` **inside** `<Physics>`, and `{world === "street" ? <StreetWorld/> : null}` **outside** `<Physics>`.
- **`StreetWorld.tsx`** — all the **visuals** (renders OUTSIDE `<Physics>`): ground/plaza/approach-path planes (procedural canvas dirt+path textures), `GateArch`, `Enclosure`, `Vegetation`, `Workshop`, `Plaza`, warm lamp posts + `pointLight`s (the key light at dusk), depot prop clutter. `STREET_SPAWN`, `STREET_GROUND` live here.
- **`StreetColliders.tsx`** — all the **collision** (renders INSIDE `<Physics>`): fence perimeter walls, building walls (door left open), tree trunks. Derived from the SAME placement data as the visuals.
- **`Plaza.tsx`** — `PLAZA_CENTRE`, `PLAZA_RADIUS`, `FoundationSite` (prepared site), the young tree, and **`plazaRing()`** → the 5 building placements (`R = 35`, `degs = [16, 62, 108, 300, 344]`, `roomPlan = [2,1,3,2,4,1]`). This function is imported by BOTH the visuals and the colliders.
- **`Building.tsx`** — one walkable building (`DOOR_W`, procedural `woodTexture()`/`stoneTexture()`, glowing window panes, real door gap) + **`buildingWallColliders(rooms)`** → the matching wall colliders in local space.
- **`Enclosure.tsx`** — the palisade (instanced posts) + forest band (instanced trunks/foliage). Exports **`FENCE = {x0:-52, x1:52, z0:2, z1:188}`** and **`GATE_X = 11`** (south gate half-gap), consumed by the fence colliders.
- **`Vegetation.tsx`** — instanced grass (wind-sway shader), flowers, rocks, bushes + GLB hero trees. Exports **`heroTreePositions()`**, consumed by the tree-trunk colliders.
- **`Workshop.tsx`** — 4 craft stations (smith/carpenter/bench) with GLB workbenches + tools.
- **`SceneFx.tsx`** — procedural dusk sky gradient + sunset glow + `PostFx` (Bloom, HueSaturation, BrightnessContrast, Vignette, SMAA).
- **`GlbModel.tsx` / `GrowableObject.tsx`** — shared GLB loaders (clone + shadow + `fitHeight`).

## Hard constraints — DO NOT break these

1. **Scenery renders OUTSIDE `<Physics>`; colliders INSIDE.** Many lazy GLB suspends inside `<Physics>` crash the physics tree under React StrictMode. Keep the split. New solid objects → add a lightweight fixed collider in `StreetColliders.tsx`, don't move the visual inside `<Physics>`.
2. **Colliders derive from ONE source of placement data.** `plazaRing()`, `buildingWallColliders()`, `heroTreePositions()`, `FENCE`/`GATE_X` are imported by both the visuals and the colliders so they always line up. **If you move a building / tree / the fence, edit the shared function/constant — never hardcode a position in two places.** After any such move, the collider follows automatically; verify it still lines up.
3. **No player–player collision** (by design — remote players are visual markers, never rigid bodies). Keep it that way.
4. **Mobile 30 FPS is a hard budget.** Data-driven rendering: `InstancedMesh` + LOD + clustering, not thousands of React components. Adding density must not mean adding hundreds of draw calls — instance repeated props.
5. **Art is static, state is data.** Geometry/textures are immutable; nothing in the scene reads or writes game state. Keep the street pure scenery.
6. **Scale every GLB by `fitHeight`, never native scale** — the CC0 assets span ~4:1 native scales (SI/imperial mix). `Prop`/`GlbModel` already do this; reuse them.
7. **TS strict, Biome (double quotes, 100-col).** Run `pnpm --dir apps/web typecheck` and `pnpm exec biome check --write <files>` before committing. Conventional Commits.

## PHASE A — Audit (do this first, report before touching anything)

Read every file in the map above and produce a findings list. Look specifically for:

- **Correctness / bugs:** collider ↔ visual mismatches (a wall you can walk through, or an invisible wall where nothing is); `fitHeight` mistakes; wrong asset names (404s serving HTML crash `GLTFLoader` — a `PropBoundary` guards them, but flag any); StrictMode/Physics remount hazards; keys, `useMemo` deps.
- **Performance vs the 30 FPS budget:** count real draw calls. Anything repeated that is NOT instanced (buildings, props, lamps) is a candidate. `pointLight` count (real lights are rationed — currently a handful; flag if it grows). Shadow-casting light count. Overdraw from transparent planes.
- **Art cohesion (the important one — "es muss noch schöner werden"):** does the camp read as *composed* or *scattered*? Is the dusk grade landing? Are the hero moments (the prepared site, the young tree, the workshop forge) actually reading as focal points, or lost? Is the palette unified (weathered wood/terracotta/sandstone/moss, warm amber light) or clashing?

Report as: file · line · severity · one-line finding · fix sketch. Rank most-severe first.

## PHASE B — Verdichten & beautify

**Context — the art-director finding that motivates this:** the camp is currently **too spread out**. The fence box runs `z 2→188` (a long thin corridor) but the actual content clusters `z ~40→150`, leaving dead space. The **plaza reads empty**, and the **workshop lacks prominence** even though "es ist ja eine Werkstatt" — the workshop is the point. The brief:

1. **Compact the footprint.** Pull the fence, forest, buildings, workshop, and props inward so the walk from gate to plaza is dense and intentional, not a long empty stroll. Tighten `FENCE` (and therefore the forest band + fence colliders, which follow it) and the building ring `R` / the approach length together. Keep a **clear ~8 m centre walk-lane** — compaction means less dead space, not a cluttered lane.
2. **Fill the plaza.** It is the heart. Give the prepared site presence — scaffolding hints, surveyor's tools, crates of materials staged for the build, benches/lanterns ringing the round space so it reads as a gathering place, not a bare disc. The young tree should feel *tended*.
3. **Make the workshop prominent.** It should be the second focal point after the plaza. Cluster the craft stations, give the smith/forge a dominant vertical (a chimney with an emissive forge glow reads from across the camp), hug tool clutter and sawdust against the station bases.
4. **Make it more beautiful — the whole point of this pass.** Richer dusk lighting (warm rim on the west-facing surfaces, deeper indigo shadows), lantern strings between buildings, subtle smoke/embers at the forge, more and nicer instanced vegetation (ferns, tall grass tufts, wildflowers) softening every hard base, weathering variation on the repeated buildings (rotation/scale/tint per instance, never a mirrored row). Bias any accent light warm (amber/rust) and sparse — this is rustic frontier. Consult `docs/STREET-LEVEL-PLAN.md` for the palette + composition rules (one dominant vertical per zone, asymmetric-but-balanced, density rhythm, props hug walls).
5. **Keep colliders in lockstep.** Every geometry move goes through the shared placement functions/constants so `StreetColliders.tsx` tracks it. After compaction, re-verify: buildings solid, fence encloses, gate open, trees block, ground flat, **no** player-player collision.

Commit working checkpoints incrementally (Conventional Commits).

## How to verify (READ THIS — the dev preview lies)

The dev street **blanks on weak Intel/ANGLE preview GPUs**, and `EffectComposer + Rapier` throws harmless StrictMode double-mount errors in dev. **Verify on a PRODUCTION build, not `pnpm dev`:**

```bash
pnpm --dir apps/web typecheck
pnpm exec biome check --write apps/web/src/scene/<files you touched>
pnpm --filter @600b/web build          # must succeed
cd apps/web && pnpm exec vite preview --port 4173
```

Then drive in and confirm a clean console (screenshot with `?postfx=0` to bypass post-fx on weak GPUs):
`http://localhost:4173/?postfx=0` → click **Start** → pick an avatar card → **Enter as …** → **Enter the Palace** → **Travel: Street** (~7 s load). Assert **0 console errors**, and specifically none matching `/Physics|Collider|RigidBody|recreate/`. Then walk the camp: bump every building wall, the fence, a tree — you should stop; walk through the south gate — it should be open. Screenshot the plaza + the workshop for the "schöner" proof.

**Deliver:** the audit findings (Phase A), then the compaction diff with before/after screenshots and a one-paragraph note on what got denser and what got prettier.
