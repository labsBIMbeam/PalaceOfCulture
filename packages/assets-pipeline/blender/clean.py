"""Remove stray/outlier vertices (far from each mesh's median) from a GLB and re-export.

Fixes solidify/decimate artifacts that blow up bounding boxes. Run:
    blender --factory-startup -b --python clean.py -- <in.glb> <out.glb>
"""

import sys

import bmesh
import bpy
from mathutils import Vector

THRESH = 500.0  # vertices farther than this (m) from the mesh median are stray


def main() -> None:
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

    removed = 0
    for o in [o for o in bpy.data.objects if o.type == "MESH" and o.data]:
        me = o.data
        n = len(me.vertices)
        if n == 0:
            continue
        xs = sorted(v.co.x for v in me.vertices)
        ys = sorted(v.co.y for v in me.vertices)
        zs = sorted(v.co.z for v in me.vertices)
        med = Vector((xs[n // 2], ys[n // 2], zs[n // 2]))
        bm = bmesh.new()
        bm.from_mesh(me)
        far = [v for v in bm.verts if (v.co - med).length > THRESH]
        if far:
            bmesh.ops.delete(bm, geom=far, context="VERTS")
            bm.to_mesh(me)
            removed += len(far)
        bm.free()
        me.update()

    print(f"removed {removed} stray vertices")
    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=False)
    print("CLEANED", dst)


if __name__ == "__main__":
    main()
