# Avatar retarget — Meshy mesh → shared rig → single-file GLB

`retarget_meshy_to_rig.py` skins a static Meshy image-to-3D mesh onto the shared 600B humanoid
skeleton and bakes **idle + walk + run** into one GLB for `apps/web/public/avatar/imported/<id>.glb`.

## What shipped (council avatar refresh)

`apps/web/public/avatar/imported/` now holds **single-file** rigged models (idle/walk/run baked in,
clips named `idle` / `walk` / `run`). `avatarImports.ts` no longer expects `<id>-walk.glb` /
`<id>-run.glb`; the only extra clip file is the shared `poses.glb` (sit/sleep).

- **21 members re-meshed** from the new Meshy 3D batch
  (`G:\projekte\PoC\characters\characters\<id>\05_3d_models_meshy\*_0_model.glb`):
  aj, bam, benarc, dni, essex, flx, gadaj, jedai, leon, longy, madmunkey, michael1011, morgs, nc,
  nind, proton, rootzoll, sat, shillie, tobo, tonichina.
  15 use their own old rig as donor; the 6 without a same-name old model
  (gadaj, leon, madmunkey, morgs, proton, tonichina) use **flx** as the donor (all old rigs share
  the same skeleton + clips, so the donor choice only affects weight-transfer proximity).
- **6 legacy members repackaged** (no new mesh — kept their previous rigged mesh, just baked into the
  single-file form): arbadacarba, blackcoffee, darren, mhb, snick, p.
- **placeholder.glb** = copy of `essex` (neutral human stand-in). The original placeholder file was
  not recoverable from the asset folder; regenerate from any neutral member if a different stand-in
  is wanted.

The 6 new-only characters (gadaj, leon, madmunkey, morgs, proton, tonichina) are registered in
`avatarImports.ts` and available in the avatar builder, but are **not** added to the 21-member roster
in `apps/web/src/ui/members.ts` (that mirrors the real 600.wtf org). Add seeds there if they should
appear as selectable members.

## Re-run

Single character:

```bash
blender --background --factory-startup --python retarget_meshy_to_rig.py -- \
  --new  <characters>/<id>/05_3d_models_meshy/<task>_0_model.glb \
  --idle <old>/models_all/<donor>/<donor>_rigged.glb \
  --walk <old>/models_all/<donor>/<task>_4_rigged.glb \
  --run  <old>/models_all/<donor>/<task>_7_rigged.glb \
  --out  apps/web/public/avatar/imported --id <id>
```

`--walk` / `--run` may be any GLB that carries the `walking_man` / `running` clip (the tiny
clip-only `_4` / `_7` exports are ideal). See the module docstring for the correctness notes
(centimetre rig space, REST-pose bind, single-file clip baking).
