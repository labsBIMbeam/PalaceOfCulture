# Avatar texture derivation

`apps/web/public/avatar/imported/` is immutable source data. Texture processing must write a new,
regenerable file below `apps/web/public/avatar/derived/`; it must never update an imported GLB.

```powershell
node packages/assets-pipeline/avatar/synth_normals.mjs inject `
  apps/web/public/avatar/imported/flx.glb normal.png `
  apps/web/public/avatar/derived/flx.glb 0.7
```

Synthetic luminance normals are a temporary relief effect, not a substitute for a real high-to-low
normal bake. They are stored losslessly as PNG; production delivery should later use KTX2/UASTC.
