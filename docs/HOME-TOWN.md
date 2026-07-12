# Home Town — resource production by waiting

*Design note, 2026-07-07. Vision: the private Home map grows from an empty plot into a small
TOWN whose buildings produce resources — everything arrives and improves by WAITING, never by
grinding. Ultra-low time preference is the only progression axis (see HOMEBUILDER-GAMEPLAY.md
in the docs workspace).*

## What already exists (the foundation)

- **The empty map** (`PalaceScene`, world `"home"`): cream ground + fog, godot `home_world`
  parity. Your growables anchor it — Tree (21M lock) near the spawn, Rocket (21Y) in the fog.
- **The drip** (`builder/economy.ts`): wood + stone arrive per DAY (`DRIP_PER_MINUTE`, THE
  balancing knob). No farming, no gathering — the town's "mine" is the calendar.
- **Production buildings v0**: `sawbench` (wood ×1.5) and `kiln` (stone ×1.5) already multiply
  the drip when PLACED on the home map (`BuildSystem.afterChange` → `setSpecialtyContext`).
  This is the town's production seam — buildings modify the drip, nothing else does.
- **The craft queue**: sequential, month-scale, offline-friendly. A building is itself a thing
  you waited for.
- **Move-in attraction**: ≥9 blocks + a lantern, held 24 h → someone (the fountain, later
  companions) moves in. The town POPULATES by waiting too.

## Where the town goes (roadmap, in order)

1. **More production buildings** (catalog `kind: "furniture"` with `specialty`): windmill
   (boards drip?), quarry shed, herb garden. Each is a craft recipe with a month-scale wait —
   the town skyline IS the player's lock history.
2. **Building lines instead of flat multipliers**: a placed building levels by AGE (placed_at
   in the blueprint; multiplier grows with the building's standing time — a 6-month-old kiln
   out-produces a fresh one). Data-only change: `{id, pos, rot_y, placed_at}`.
3. **Inhabitants**: move-in arrivals (fountain → companions, racooDNI first) walk the town;
   each inhabitant adds a small production or greeting bonus. Presence by proxy.
4. **Town == shared later**: the same blueprint shape ships to apps/server (ADR 0001) so a
   friend can VISIT your town read-only; the palace stays the public build.

## Laws

Earned only, never for sale (v4v everywhere else). No stats that gate core play. The drip is
the single knob; buildings only MULTIPLY it. Time, never material, is the bottleneck.
