"""Build the playable level = the whole (decimated) building + a flat floor that is the
Gesamtkontur (combined silhouette) of ALL Geschossdecken, flattened to z=0.

The building is kept whole (NOT cut). The floor is the union footprint of the named floor slabs
projected to the EG level (Revit zero = Oberkante EG-Geschossdecke = z~0). Both are centred on the
origin in X/Y with one shared offset so they stay aligned.

Run: blender --factory-startup -b --python build_level.py -- <building.glb> <conv.glb> <out.glb>
"""

import math
import sys

import bmesh
import bpy
from mathutils import Vector

MAX_DIM = 1000.0  # building blow-up artifact -> drop
SLAB_MAX = (
    200.0  # ignore any "Geschossdecke" bigger than this (stray water plane safety)
)


def ensure_gltf() -> None:
    if not hasattr(bpy.ops.import_scene, "gltf"):
        for mod in ("io_scene_gltf2", "bl_ext.blender_org.io_scene_gltf2"):
            try:
                bpy.ops.preferences.addon_enable(module=mod)
            except Exception:
                pass


def floor_material():
    mat = bpy.data.materials.new("600B_Floor")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    rgba = (0.78, 0.72, 0.58, 1.0)
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        try:
            bsdf.inputs["Roughness"].default_value = 0.9
        except Exception:
            pass
    mat.diffuse_color = rgba
    return mat


def main() -> None:
    argv = sys.argv
    rest = argv[argv.index("--") + 1 :] if "--" in argv else []
    bsrc, csrc, dst = rest[0], rest[1], rest[2]

    bpy.ops.wm.read_factory_settings(use_empty=True)
    ensure_gltf()

    # 1. building (decimated) — drop blow-ups, keep WHOLE
    bpy.ops.import_scene.gltf(filepath=bsrc)
    bpy.context.view_layer.update()
    building_names = {o.name for o in bpy.data.objects}
    for o in list(bpy.data.objects):
        if (
            o.type == "MESH" and max(o.dimensions) > MAX_DIM
        ):  # drop blow-ups only; keep clean roofs
            bpy.data.objects.remove(o, do_unlink=True)
    building = [o for o in bpy.data.objects if o.type == "MESH"]

    # 2. named Geschossdecke slabs from the conv GLB
    bpy.ops.import_scene.gltf(filepath=csrc)
    bpy.context.view_layer.update()
    slabs = []
    for o in [o for o in bpy.data.objects if o.name not in building_names]:
        keep = (
            o.type == "MESH"
            and "geschossdecke" in o.name.lower()
            and max(o.dimensions) < SLAB_MAX
        )
        if keep:
            slabs.append(o)
        else:
            bpy.data.objects.remove(o, do_unlink=True)
    print(f"building meshes={len(building)} slabs={len(slabs)}")
    if not slabs:
        raise SystemExit("no slabs found")

    # 3. join slabs -> FLOOR, flatten to z=0, merge coplanar into the silhouette
    for o in bpy.data.objects:
        o.select_set(False)
    for o in slabs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = slabs[0]
    bpy.ops.object.join()
    floor = bpy.context.view_layer.objects.active
    if floor.data.users > 1:
        floor.data = floor.data.copy()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    me = floor.data
    bm = bmesh.new()
    bm.from_mesh(me)
    for v in bm.verts:
        v.co.z = 0.0
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.02)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-4, edges=bm.edges)
    if bm.edges:
        bmesh.ops.dissolve_limit(
            bm, angle_limit=math.radians(2), verts=bm.verts, edges=bm.edges
        )
    if bm.faces:
        bmesh.ops.triangulate(bm, faces=bm.faces)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.update()
    floor.name = "600B_FLOOR"
    me.materials.clear()
    me.materials.append(floor_material())
    floor.location.z = (
        -0.03
    )  # a hair below the building's own EG slab to avoid z-fighting

    # 4. one shared X/Y centre for building + floor (keep Z: deck@0, floor@-0.03)
    allm = [o for o in bpy.data.objects if o.type == "MESH"]
    mins = [math.inf, math.inf]
    maxs = [-math.inf, -math.inf]
    for o in allm:
        for c in o.bound_box:
            wc = o.matrix_world @ Vector(c[:])
            for i in (0, 1):
                mins[i] = min(mins[i], wc[i])
                maxs[i] = max(maxs[i], wc[i])
    cx = (mins[0] + maxs[0]) / 2.0
    cy = (mins[1] + maxs[1]) / 2.0
    for o in allm:
        o.location.x -= cx
        o.location.y -= cy
    bpy.context.view_layer.update()

    tris = 0
    for o in allm:
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
    floor.data.calc_loop_triangles()
    print(
        f"FINAL meshes={len(allm)} tris={tris} floor_tris={len(floor.data.loop_triangles)}"
    )
    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=False)
    print("BUILT", dst)


if __name__ == "__main__":
    main()
