"""Texture the grouped game asset so it reads rich, not flat-monotone:

  - WALLS  -> strong tileable stone masonry (offset courses, mortar, per-stone variation), 3 stone
              tones that alternate (warm / cool / light), at a realistic ~0.33 m block scale.
  - ROOFS  -> semitransparent MESH (grid alpha) so they read as light canopies.
  - VARIATION by storey/zone -> baked into COLOR_0 vertex colours from each vertex's WORLD position
              (height band = storey, XY low-freq noise = zone) — modulates the texture, no extra draw calls.

Procedural (numpy), packed into the GLB. Runs AFTER build_level.
Run: blender --factory-startup -b --python texturize.py -- <in.glb> <out.glb>
"""

import math
import sys

import bpy
import numpy as np

SIZE = 512


def tile_grid(size, octaves, seed):
    out = np.zeros((size, size))
    amp, total = 1.0, 0.0
    rng = np.random.default_rng(seed)
    for o in range(octaves):
        f = 2 ** (o + 1)
        g = rng.random((f + 1, f + 1))
        g[-1] = g[0]
        g[:, -1] = g[:, 0]
        ys = np.arange(size) * f / size
        y0 = np.floor(ys).astype(int)
        fy = ys - y0
        a = g[y0][:, y0] * (1 - fy)[:, None] + g[y0 + 1][:, y0] * fy[:, None]
        b = g[y0][:, y0 + 1] * (1 - fy)[:, None] + g[y0 + 1][:, y0 + 1] * fy[:, None]
        out += (a * (1 - fy)[None, :] + b * fy[None, :]) * amp
        total += amp
        amp *= 0.5
    return out / total


def _grids(s):
    u = np.linspace(0.0, 1.0, s, endpoint=False)[None, :] * np.ones((s, 1))
    v = np.linspace(0.0, 1.0, s, endpoint=False)[:, None] * np.ones((1, s))
    return u, v


def _rgba(rgb, alpha=None):
    a = np.ones(rgb.shape[:2]) if alpha is None else alpha
    return np.clip(np.dstack([rgb, a]), 0, 1)


def masonry(size, seed, base, courses, contrast):
    """Offset-course stone wall: mortar lines, per-stone shade + warm/cool jitter, intra-stone noise."""
    rng = np.random.default_rng(seed)
    base = np.array(base, dtype=float)
    shade = np.ones((size, size))
    tint = np.zeros((size, size, 3))
    ch = size / courses
    mortar_px = max(1, int(round(ch * 0.09)))
    mortar_v = 0.42
    bw_base = ch * 1.7
    for c in range(courses):
        y0, y1 = int(round(c * ch)), int(round((c + 1) * ch))
        x = -(0.5 if c % 2 else 0.0) * bw_base
        while x < size:
            bw = bw_base * (0.72 + 0.55 * rng.random())
            xa, xb = max(0, int(round(x))), min(size, int(round(x + bw)))
            if xb > xa:
                shade[y0:y1, xa:xb] = 1.0 + contrast * (rng.random() - 0.5) * 2.0
                h = (rng.random() - 0.5) * 0.10
                tint[y0:y1, xa:xb, 0] = h
                tint[y0:y1, xa:xb, 2] = -h
                shade[y0:y1, xa : min(size, xa + mortar_px)] = (
                    mortar_v  # vertical joint
                )
            x += bw
        shade[max(0, y1 - mortar_px) : y1, :] = mortar_v  # bed joint
    shade *= 1.0 + 0.13 * (tile_grid(size, 6, seed + 7) - 0.5)
    return _rgba((base[None, None, :] + tint) * shade[:, :, None])


def column_tex(size, seed):
    u, _ = _grids(size)
    grain = np.sin(u * math.pi * 2 * 6 + tile_grid(size, 4, seed) * 3.5)
    val = 0.95 + 0.16 * grain + 0.10 * (tile_grid(size, 5, seed + 1) - 0.5)
    return _rgba(
        np.array((0.93, 0.51, 0.15))[None, None, :] * np.clip(val, 0.5, 1.4)[:, :, None]
    )


def steel_tex(size, seed):
    _, v = _grids(size)
    val = (
        0.95
        + 0.06 * np.sin(v * math.pi * 2 * 60)
        + 0.08 * (tile_grid(size, 5, seed) - 0.5)
    )
    return _rgba(np.array((0.34, 0.37, 0.36))[None, None, :] * val[:, :, None])


def roof_mesh(size, seed, base, cells, alpha_cell):
    """Semitransparent canopy: opaque thin grid 'mesh', see-through cells."""
    u, v = _grids(size)
    line = (np.abs(np.sin(u * math.pi * cells)) < 0.16) | (
        np.abs(np.sin(v * math.pi * cells)) < 0.16
    )
    alpha = alpha_cell + (1.0 - alpha_cell) * line.astype(float)
    rgb = (
        np.array(base)[None, None, :]
        * (0.92 + 0.18 * (tile_grid(size, 4, seed) - 0.5))[:, :, None]
    )
    return _rgba(rgb, alpha)


# key -> (rgba array, world tile size [m], is_roof)
def build_textures():
    return {
        "RammedEarth": (masonry(SIZE, 11, (0.76, 0.58, 0.40), 6, 0.30), 2.0, False),
        "Concrete": (masonry(SIZE, 23, (0.70, 0.70, 0.66), 6, 0.26), 2.2, False),
        "Stone": (masonry(SIZE, 37, (0.84, 0.80, 0.70), 7, 0.30), 2.0, False),
        "Floor": (masonry(SIZE, 51, (0.74, 0.70, 0.60), 4, 0.22), 3.5, False),
        "Column": (column_tex(SIZE, 61), 1.0, False),
        "Steel": (steel_tex(SIZE, 71), 1.5, False),
        "Door": (column_tex(SIZE, 81), 1.2, False),
        "PV": (roof_mesh(SIZE, 91, (0.20, 0.34, 0.46), 11, 0.32), 1.8, True),
        "Palapa": (roof_mesh(SIZE, 95, (0.74, 0.58, 0.34), 9, 0.40), 2.2, True),
    }


def group_of(name, keys):
    n = name.lower()
    if "floor" in n:
        return "Floor"
    if "tür" in n or "door" in n:
        return "Door"
    for key in keys:
        if key.lower() in n:
            return key
    return "Stone"


def make_material(key, rgba, is_roof):
    img = bpy.data.images.new(f"600B_TX_{key}", SIZE, SIZE)
    img.pixels.foreach_set(rgba.astype(np.float32).ravel())
    img.pack()
    mat = bpy.data.materials.new(f"600B_TX_{key}")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    # multiply texture x COLOR_0 vertex colour (storey/zone variation); glTF multiplies COLOR_0 per spec
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Col"
    mix = nt.nodes.new("ShaderNodeMixRGB")
    mix.blend_type = "MULTIPLY"
    mix.inputs["Fac"].default_value = 1.0
    nt.links.new(tex.outputs["Color"], mix.inputs["Color1"])
    nt.links.new(vc.outputs["Color"], mix.inputs["Color2"])
    nt.links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    try:
        bsdf.inputs["Roughness"].default_value = 0.8
    except Exception:
        pass
    if is_roof:
        nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
        for attr, val in (("blend_method", "BLEND"), ("show_transparent_back", False)):
            try:
                setattr(mat, attr, val)
            except Exception:
                pass
    avg = rgba[:, :, :3].reshape(-1, 3).mean(axis=0)
    mat.diffuse_color = (*avg, 0.55 if is_roof else 1.0)
    return mat


def bake_variation(obj):
    """COLOR_0 vertex tint from world position: storey band (Z) + zone noise (XY)."""
    me = obj.data
    n = len(me.vertices)
    if n == 0:
        return
    co = np.empty(n * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)
    m = np.array(obj.matrix_world)
    world = co @ m[:3, :3].T + m[:3, 3]
    x, y, z = world[:, 0], world[:, 1], world[:, 2]
    storey = 0.5 + 0.5 * np.sin(z * (math.pi / 3.6))  # band ~ every storey (~3.6 m)
    zone = (np.sin(x * 0.10) + np.sin(y * 0.10) + np.sin((x + y) * 0.061)) / 3.0
    val = 0.85 + 0.13 * storey + 0.11 * zone
    warm = 0.05 * zone + 0.03 * (storey - 0.5)
    cols = np.ones((n, 4), dtype=np.float32)
    cols[:, 0] = np.clip(val * (1 + warm), 0, 1)
    cols[:, 1] = np.clip(val, 0, 1)
    cols[:, 2] = np.clip(val * (1 - warm), 0, 1)
    ca = me.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="POINT")
    ca.data.foreach_set("color", cols.ravel())
    me.color_attributes.active_color = ca


def main():
    argv = sys.argv
    rest = argv[argv.index("--") + 1 :] if "--" in argv else []
    src, dst = rest[0], rest[1]

    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not hasattr(bpy.ops.import_scene, "gltf"):
        for mod in ("io_scene_gltf2", "bl_ext.blender_org.io_scene_gltf2"):
            try:
                bpy.ops.preferences.addon_enable(module=mod)
            except Exception:
                pass
    bpy.ops.import_scene.gltf(filepath=src)

    textures = build_textures()
    mats = {
        k: make_material(k, rgba, is_roof) for k, (rgba, _, is_roof) in textures.items()
    }

    for o in [o for o in bpy.data.objects if o.type == "MESH"]:
        key = group_of(o.name, textures.keys())
        _, tile, is_roof = textures[key]
        o.data.materials.clear()
        o.data.materials.append(mats[key])
        for s in bpy.context.selected_objects:
            s.select_set(False)
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.cube_project(cube_size=tile)
        bpy.ops.object.mode_set(mode="OBJECT")
        bake_variation(o)
        o.select_set(False)
        print(f"  {o.name[:34]:34} -> {key}{' (roof/transp)' if is_roof else ''}")

    # force COLOR_0 export (the multiply node isn't auto-detected); three.js multiplies it per glTF spec
    try:
        bpy.ops.export_scene.gltf(
            filepath=dst,
            export_format="GLB",
            use_selection=False,
            export_vertex_color="ACTIVE",
        )
    except TypeError:
        bpy.ops.export_scene.gltf(
            filepath=dst, export_format="GLB", use_selection=False
        )
    print("TEXTURIZED", dst)


if __name__ == "__main__":
    main()
