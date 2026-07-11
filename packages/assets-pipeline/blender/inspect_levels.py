"""Find horizontal slab levels (Geschossdecken) by histogramming horizontal face area over Z.

Run: blender --factory-startup -b --python inspect_levels.py -- <in.glb>
"""

import math
import sys
from collections import defaultdict

import bpy

MAX_DIM = 1000.0


def main() -> None:
    argv = sys.argv
    rest = argv[argv.index("--") + 1 :] if "--" in argv else []
    src = rest[0]

    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not hasattr(bpy.ops.import_scene, "gltf"):
        for mod in ("io_scene_gltf2", "bl_ext.blender_org.io_scene_gltf2"):
            try:
                bpy.ops.preferences.addon_enable(module=mod)
            except Exception:
                pass
    bpy.ops.import_scene.gltf(filepath=src)
    bpy.context.view_layer.update()

    for o in list(bpy.data.objects):
        if o.type == "MESH" and (
            "palapa" in o.name.lower() or max(o.dimensions) > MAX_DIM
        ):
            bpy.data.objects.remove(o, do_unlink=True)

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    area_by_z = defaultdict(float)
    zmin, zmax = math.inf, -math.inf
    for o in meshes:
        mw = o.matrix_world
        rot = mw.to_3x3()
        for poly in o.data.polygons:
            wc = mw @ poly.center
            zmin = min(zmin, wc.z)
            zmax = max(zmax, wc.z)
            wn = rot @ poly.normal
            length = wn.length
            if length > 0 and abs(wn.z / length) > 0.85:  # ~horizontal
                area_by_z[round(wc.z * 4) / 4] += poly.area  # 0.25 m bins

    top = sorted(area_by_z.items(), key=lambda kv: -kv[1])[:15]
    print(f"ZRANGE min={zmin:.2f} max={zmax:.2f} height={zmax - zmin:.2f}")
    print("TOP horizontal-area Z levels (candidate slab tops):")
    for z, a in top:
        print(f"  z={z:8.2f}  horiz_area={a:11.1f}")


if __name__ == "__main__":
    main()
