# HQ Arrival Plaza — Art Direction & Delivery Constraints

Status: first authored vertical-slice direction. This is a product/design source, not runtime truth.

## Platform decision

- **Laptop/Desktop:** primary playable 3D Palace client. The HQ slice may use real lighting, dense set dressing, richer materials, authored sight lines, and environmental audio.
- **Mobile:** companion web interface only. It must not boot the R3F/Rapier/VRM/GLB 3D client or download its heavy assets.

This is a quality decision, not a temporary performance workaround.

## First playable place

The first density pass is the **HQ Arrival Plaza**: the moment a builder enters, sees the Palace, notices a repair bench and warm lights, and meets Kerni only if they choose to approach.

```text
arrival / spawn
→ visible Palace landmark and warm light axis
→ quiet repair bench + Kerni at the edge, not blocking the path
→ timelock shelf as a distant ritual anchor
→ planted / rested corners for stopping, talking, and returning
```

## Spatial composition: circular Street, not a Roman forum

The Palace HQ is not a frontal imperial square. The **Street is a walkable ring around a living central plaza**:

```text
outer district / arrivals
→ circular Street loop with irregular workshops, stalls, benches and planted edges
→ openings from the ring lead into the central plaza
→ Palace / workshop / ritual anchors sit as destinations around the loop, not on an emperor axis
```

The ring is intentionally imperfect: width, façades, awnings, repair marks, height and activity vary by segment. The central plaza remains open enough for encounters, events, rest and sight lines. Kerni lives on a quiet workshop edge of the ring—not in the centre and never as a gatekeeper.

## Material families

No plastic mono-world. The slice uses a small shared palette with visible condition and age:

| Family | Use | Condition / variation |
|---|---|---|
| Warm limestone | plinths, paving, benches | chips, soot seams, repaired edges |
| Graphite ceramic | Kerni, utility housings | matte body, polished contact edges |
| Oxidised copper | rings, lamps, rail details | ember-copper to dark green patina |
| Charcoal cloth | banners, awnings | faded weave, one restrained cyan stitch |
| Living green | planters / recovery corners | irregular silhouette, not hedge-wall uniformity |
| Amber light | arrival, care, workshop | warm and local, never UI-marker neon |

## System rules

1. **Art is static; state is data.** Props do not contain ownership, timer, NPC dialogue, reputation, or Nostr state.
2. **Shared material families, not per-prop materials.** Use atlases, trim sheets, decals, masks, and palette variation when real assets arrive.
3. **Keep the first slice dense but legible.** Every cluster needs a purpose: orientation, rest, repair, culture, or ritual.
4. **Do not generate noise.** Kerni, lights, and interactables are opt-in; no hover-over tutorials, auto-dialogue, or retention pressure.
5. **Collision stays intentional.** Decorative density must not become a full-scene trimesh burden or block the player route.

## First quality gates

- clear landmark / arrival axis in a single screenshot
- at least three material families readable in the plaza
- no repeated prop cluster with identical scale/rotation/colour
- Kerni visible but never in the direct spawn line
- target: under ~100 visible draw calls and ~250k visible triangles in the slice
- mobile companion route excludes 3D bundle entirely
