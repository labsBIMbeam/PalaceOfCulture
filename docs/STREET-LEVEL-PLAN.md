# Werkstattgasse — level plan v1 (rustic frontier culture-lane)

*Design note, 2026-07-12. The plan comes BEFORE the assets, so the street reads as composed, not
scattered. Drives `apps/web/src/scene/StreetWorld.tsx` + `Village.tsx`. Companion to the top-down
map shared in chat.*

## Concept & mood — RUSTIC

A frontier town layered by **age**, not by decoration: **medieval bones → wild-west timber frontage
→ a thin cyberpunk retrofit crust**. Dominant read is **rustic** — weathered, handmade, lived-in.
Cyberpunk is a *sparse* accent (a jury-rigged neon sign on an old tavern, a scavenged antenna), warm
and amber-biased, **not** cold neon-noir. If in doubt: more dirt, less chrome.

- **Palette:** weathered wood browns/greys, terracotta, sandstone, moss green, rust orange. High
  roughness, matte, no plastic sheen.
- **Neon budget:** cut ~70% of the current neon. Keep **3–4 warm accents at the life-nodes** (tavern
  sign, forge glow, one market lantern-string, the terminus tech-tower). Bias cyan → amber/rust.
- **Ground:** dirt + cobble mix — ruts, worn centre, puddles — not clean pavement.

## The spine — five beats along the lane (player walks −z→+z, i.e. z 12 → 280)

Every zone has ONE job, ONE dominant vertical (the eye's target), and a place in the **density
rhythm**. Uniform density is what reads as "random"; dense life-nodes with sparse gaps between read
as designed.

| Zone | z-range | Job | Focal vertical | Density | Rustic beat |
|---|---|---|---|---|---|
| **Z0 Gate** | 12–36 | Threshold; frame the vista; spawn | the stone arch | sparse | 2 lanterns, a parked wagon, a barrel stack; you see the tower in the fog |
| **Z1 Workshop Row** | 40–110 | The crafts (the economy) | the **forge** chimney (smoke) | dense | 6 open-air timber stalls, staggered L/R; tool clutter, sawdust, hanging work-lamps |
| **Z2 Market Square** | 115–165 | Gather / social; the lane **widens** | the **well** + a big **tree** | medium, ringed | market stalls ring a small plaza; benches, café tables, a cart; open centre to gather |
| **Z3 Tavern Bend** | 170–215 | Social heart; lane **bends** toward it | the **Inn/tavern** (the ONE neon retrofit) | dense, warm | tavern off-axis left; stable + houses opposite; hanging lanterns, benches, wagon |
| **Z4 Old Town** | 220–280 | Climax; the vista payoff | **watch tower + windmill**, **tech-tower** behind | clustered → fog | houses + huts around a terminal plaza; cyber tech-tower/-block as skyline, set back |

## Composition rules (the anti-random checklist)

1. **One dominant vertical per zone** — chimney → tree → tavern → tower — so the eye always has a
   target down the lane.
2. **Asymmetric but balanced** — stagger buildings L/R; **never mirror** the two sides.
3. **Density rhythm** — pack the life-nodes (workshops, market, tavern); leave breathing space
   between them.
4. **Props hug walls & bases** — clutter accumulates against buildings, never floats mid-lane. Keep a
   **clear ~8 m centre walk-lane** the whole length.
5. **Framing** — the gate arch frames the entrance; building lines funnel to the terminus; the square
   **widens then re-narrows** (a plaza, not a corridor).
6. **Limited kit, repeated with variation** (rotation / scale / weathering) — not many unique randoms.
7. **Sightline to the terminus** — from the gate the tower silhouette shows through the haze (street
   fog far is already 300) and pulls the player forward.

## Build order (plan → blockout → art)

1. **This plan** (done).
2. **Blockout / greybox** — reposition the EXISTING buildings & props to the zoned coordinates above;
   verify the composition (focal points, density rhythm, clear centre lane) with plain shapes before
   any art. This is the step that kills the "random" feel. Data-only edits to `TOWN`/`PROPS`/workshop
   arrays.
3. **Rustic art pass** (Blender — see below): regrade materials to the earthy palette, cut the neon to
   the 3–4 accents, dirt-up the ground, weather the hero buildings.
4. **Polish** — hero tavern + forge, lantern strings, smoke, small life details.

## Where Blender helps (it IS connected)

Blender is the tool for the **art/cohesion pass**, once the blockout is locked — it fixes the
"mismatched downloads" problem at the material level, which no amount of re-placing can:

- **Batch rustic regrade** — load the CC0 GLBs (`public/village`, `public/props`, facades), apply a
  shared muted palette / material override, raise roughness, tint weathered, re-export. Turns three
  clashing sources into one rustic set. (Uses the existing `packages/assets-pipeline/blender/` scripts:
  `gameify.py`, `texturize.py`, `greyify.py`.)
- **AO bake + edge wear** on the hero buildings (tavern, forge) — the single biggest "rustic realism"
  win on simple geometry.
- **Kitbash custom heroes** — a bespoke rustic tavern / forge-with-chimney the packs don't provide.
- **Blockout in 3D** (optional) — greybox the zones as boxes, compose in the viewport, export the
  positions back as coordinates.

Not for: the layout *plan* itself (that's this doc + data), or runtime — the world stays data-driven
in TS.

## Asset mapping per zone (reuse first → source → custom)

- **Reuse (regrade rustic):** `LocktardStreet` facades, workshop stalls, all `public/props`, all
  `public/village` buildings.
- **Source if needed (CC0, Poly Pizza pipeline):** dirt/mud ground texture, hanging lanterns, market
  awnings, hay bales, a smoking chimney.
- **Custom (Blender):** rustic hero tavern + forge; the palette/AO pass over everything.

## Open questions for Felix

- Keep the workshops as open-air **stalls**, or promote a couple to the **Blacksmith/Sawmill
  buildings** (they'd anchor Z1 as real forge/mill)?
- How far to push cyberpunk — a genuine *sparse retrofit* (my recommendation), or a stronger
  neon presence at the tavern + terminus?
