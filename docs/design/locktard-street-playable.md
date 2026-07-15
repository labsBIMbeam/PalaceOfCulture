# Locktard Street — First Playable District

Status: runtime source for the current 3D entry. The Palace HQ GLB is **not** the primary playable place.

## Decision

- **Playable now:** Locktard Street (`StreetWorld`, engine target `street`).
- **Not playable yet:** Palace of Culture interior / finished HQ (`palace.glb` not loaded as the entry world).
- **Teaser:** plaza-centre `PalaceTeaser` with **“released soon · date TBA”**.

## Spatial flow

```text
title / map entry → Locktard Street
→ gate, approach, workshop, civic plaza
→ Palace teaser landmark at plaza centre
→ no enterable Palace interior
```

## System rules

1. Art is static; state is data.
2. Default `onStartEngine` target is `street`, not `hq`.
3. HQ travel remains available as a teaser-only world (no Palace GLB).
4. Mobile stays companion-web only.
5. Do not claim a release date for the Palace until Felix sets one.
