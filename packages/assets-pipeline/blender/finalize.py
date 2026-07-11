"""Finalize the game asset: drop blow-ups, ground on the floor slab, cut substructure, recentre XZ.

The Revit project zero IS the finished ground floor (Oberkante Geschossdecke = top of the EG slab,
confirmed at world z ~= 0.00 via the named `Geschossdecke FB ...` elements). So we keep z=0 at z=0
and seat that on the stage. Everything below the ground slab (UG pool at -3.2, the over-water piles
and foundation down to -11.6) is cut away so the building sits flush instead of floating on stilts.

Run: blender --factory-startup -b --python finalize.py -- <in.glb> <out.glb>
"""

import math
import sys

import bmesh
import bpy
from mathutils import Vector

MAX_DIM = (
    1000.0  # any mesh bigger than this in a single axis is a blow-up artifact -> drop
)
CUT_Z = -0.6  # cut every vertex below this world-Z (just under the EG ground slab, top@0 / STB@-0.45)


def world_bbox(objs):
    mins = [math.inf] * 3
    maxs = [-math.inf] * 3
    for o in objs:
        for corner in o.bound_box:
            wc = o.matrix_world @ Vector(corner[:])
            for i in range(3):
                mins[i] = min(mins[i], wc[i])
                maxs[i] = max(maxs[i], wc[i])
    return mins, maxs


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
    bpy.context.view_layer.update()

    # 1. drop named garbage + any blown-up mesh
    dropped = []
    for o in list(bpy.data.objects):
        if o.type != "MESH":
            continue
        if "palapa" in o.name.lower() or max(o.dimensions) > MAX_DIM:
            dropped.append(o.name)
            bpy.data.objects.remove(o, do_unlink=True)
    print("dropped:", dropped)

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    if not meshes:
        raise SystemExit("no meshes left")

    # 2. centre the footprint on the origin in X/Y, keep Z (deck already at world z~=0)
    mins, maxs = world_bbox(meshes)
    cx = (mins[0] + maxs[0]) / 2.0
    cy = (mins[1] + maxs[1]) / 2.0
    print(
        "pre-cut bbox min:",
        [round(v, 2) for v in mins],
        "max:",
        [round(v, 2) for v in maxs],
    )
    for o in meshes:
        o.location.x -= cx
        o.location.y -= cy
    bpy.context.view_layer.update()

    # 3. cut everything below CUT_Z (UG pool, over-water piles, foundation)
    cut_verts = 0
    for o in meshes:
        if o.data.users > 1:
            o.data = o.data.copy()
        mw = o.matrix_world
        bm = bmesh.new()
        bm.from_mesh(o.data)
        low = [v for v in bm.verts if (mw @ v.co).z < CUT_Z]
        if low:
            bmesh.ops.delete(bm, geom=low, context="VERTS")
            cut_verts += len(low)
            bm.to_mesh(o.data)
        bm.free()
        o.data.update()
    print(f"cut {cut_verts} verts below z={CUT_Z}")

    # 4. drop meshes emptied by the cut
    for o in list(bpy.data.objects):
        if o.type == "MESH" and (o.data is None or len(o.data.polygons) == 0):
            bpy.data.objects.remove(o, do_unlink=True)

    final = [o for o in bpy.data.objects if o.type == "MESH"]
    fmins, fmaxs = world_bbox(final)
    size = [round(fmaxs[i] - fmins[i], 1) for i in range(3)]
    print(
        f"FINAL objects={len(final)} size(m)={size} z=[{fmins[2]:.2f},{fmaxs[2]:.2f}] (deck@0)"
    )
    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=False)
    print("FINALIZED", dst)


if __name__ == "__main__":
    main()
