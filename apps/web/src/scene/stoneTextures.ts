import * as THREE from "three";

/**
 * Tiny procedural stone/clay textures (CanvasTexture) — give the model's flat-coloured surfaces real
 * grain + sediment variation without shipping image assets. The stone colour is baked into the texture,
 * so the material colour stays white and the map reads true. Tileable; callers set `.repeat`. This is
 * the stylised in-engine pass; richer PBR (normal/roughness maps) can be baked in Blender later.
 */
export function stoneTexture(
  base: string,
  {
    speck = 8000,
    contrast = 0.16,
    bands = false,
  }: { speck?: number; contrast?: number; bands?: boolean } = {},
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    // horizontal sediment bands (sandstone terraces / roof-tile rows)
    if (bands) {
      for (let y = 0; y < size; ) {
        const h = 3 + Math.random() * 4;
        ctx.globalAlpha = 0.05 + Math.random() * 0.08;
        ctx.fillStyle = Math.random() < 0.5 ? "#000000" : "#ffffff";
        ctx.fillRect(0, y, size, h);
        y += h + 4 + Math.random() * 10;
      }
    }
    // fine speckle grain
    for (let i = 0; i < speck; i++) {
      ctx.globalAlpha = Math.random() * contrast;
      ctx.fillStyle = Math.random() < 0.5 ? "#000000" : "#ffffff";
      ctx.fillRect(Math.random() * size, Math.random() * size, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
