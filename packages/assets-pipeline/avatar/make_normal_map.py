"""Blender as a pure image processor: derive a tangent-space normal map from an albedo image
(luminance -> height -> finite-difference gradient -> normal). NO mesh/scene import, so there is zero
risk to the rigged GLBs — the map is injected into the GLB material separately (synth_normals.mjs).
Gives the flat Meshy toon avatars a touch of surface relief (no Meshy credits, no re-rig).

Usage:
  blender -b --factory-startup -P make_normal_map.py -- <in_albedo> <out_normal.png> [strength]
"""

import sys

import numpy as np
import bpy

argv = sys.argv[sys.argv.index("--") + 1 :]
src, out = argv[0], argv[1]
strength = float(argv[2]) if len(argv) > 2 else 5.0

img = bpy.data.images.load(src)
w, h = img.size
px = np.empty(w * h * 4, dtype=np.float32)
img.pixels.foreach_get(px)
px = px.reshape(h, w, 4)

lum = 0.2126 * px[:, :, 0] + 0.7152 * px[:, :, 1] + 0.0722 * px[:, :, 2]
dx = (np.roll(lum, -1, axis=1) - np.roll(lum, 1, axis=1)) * strength
dy = (np.roll(lum, -1, axis=0) - np.roll(lum, 1, axis=0)) * strength
nz = np.ones_like(lum)
inv = 1.0 / np.sqrt(dx * dx + dy * dy + nz * nz)

out_px = np.empty((h, w, 4), dtype=np.float32)
out_px[:, :, 0] = (-dx * inv) * 0.5 + 0.5
out_px[:, :, 1] = (dy * inv) * 0.5 + 0.5  # glTF normal maps are +Y (OpenGL) convention
out_px[:, :, 2] = (nz * inv) * 0.5 + 0.5
out_px[:, :, 3] = 1.0

nimg = bpy.data.images.new("N", w, h, alpha=True)
nimg.colorspace_settings.name = "Non-Color"
nimg.pixels.foreach_set(out_px.reshape(-1))

# Keep normal vectors lossless. JPEG block artifacts bend reconstructed surface directions.
target = int(argv[3]) if len(argv) > 3 else 1024
if w > target:
    nimg.scale(target, target)
nimg.filepath_raw = out
nimg.file_format = "PNG"
nimg.save()
print("WROTE", out, nimg.size[0], nimg.size[1])
