"""Headless game-ify — clean & sharp, efficient (per-unique-mesh), shape-preserving.

Lesson: aggressive weld crumples curves & deletes posts; per-object single-user copies blow up
RAM. This pass:
  1. import GLB; drop non-mesh + truly tiny (<5 mm) junk (keeps thin posts)
  2. tall round columns -> clean low-poly cylinders (straight lines)
  3. clean each UNIQUE mesh ONCE (instances stay shared -> light): gentle 3 mm weld + LIMITED
     DISSOLVE (straight lines, keeps curves) + bmesh SOLIDIFY for thin non-glass shells (thicker
     roofs, connected surfaces) + recalc normals
  4. classify -> toon material; merge static/sail groups; doors individual; shade-smooth; export

Run: blender --factory-startup -b --python gameify.py -- <in.glb> <out.glb>
"""

import math
import sys

import bmesh
import bpy
from mathutils import Vector

WELD = 0.003
DISSOLVE = math.radians(5)
MIN_SIZE = 0.005
SOLIDIFY_THIN = 0.06
COL_SIDES = 8

GROUPS = [
    (("rammedearth",), "RammedEarth", (0.80, 0.62, 0.40, 1.0), False),
    (
        ("geländer", "gelander", "aluminco", "crystaline"),
        "Glass",
        (0.62, 0.88, 0.80, 0.45),
        False,
    ),
    (
        ("glassfacade", "facade", "systemelement glass"),
        "Glass",
        (0.62, 0.88, 0.80, 0.45),
        False,
    ),
    (("textil",), "Textil", (0.96, 0.90, 0.78, 1.0), True),
    (
        ("roofpalm", "palm", "piratespot", "rovepalm"),
        "Palapa",
        (0.72, 0.52, 0.24, 1.0),
        True,
    ),
    (
        ("pvsemitransparent", "semitransparent", " pv"),
        "PV",
        (0.12, 0.24, 0.34, 1.0),
        False,
    ),
    # vertical supports -> orange (before concrete so columns win; concrete *beams* still go grey)
    (
        (
            "rechteckiger pfosten",
            "pfosten",
            "columnconcretesquare",
            "säule",
            "saule",
            "stütze",
            "stutze",
            "structuralcolumn",
            "fenster",
            "window",
        ),
        "Column",
        (0.93, 0.51, 0.15, 1.0),
        False,
    ),
    (("concrete", "geschossdecke", "stb"), "Concrete", (0.80, 0.78, 0.72, 1.0), False),
    (("column", "steel", "metall", "metal"), "Steel", (0.30, 0.34, 0.33, 1.0), False),
    (("ml -", "gg -", "tür", "tuere", "door"), "Door", (0.55, 0.40, 0.28, 1.0), True),
]
DEFAULT = ("Stone", (0.85, 0.82, 0.74, 1.0), False)


def classify(name):
    low = name.lower()
    for keys, key, rgba, anim in GROUPS:
        if any(k in low for k in keys):
            return key, rgba, anim
    return DEFAULT[0], DEFAULT[1], DEFAULT[2]


def get_mat(key, rgba):
    name = "600B_" + key
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        try:
            bsdf.inputs["Roughness"].default_value = 0.75
            if rgba[3] < 1.0:
                bsdf.inputs["Alpha"].default_value = rgba[3]
        except Exception:
            pass
    mat.diffuse_color = rgba
    return mat


CURVED = {"Textil", "Palapa", "RammedEarth"}  # keep their shape: NO flattening dissolve
ROOF = {
    "Textil"
}  # solidify only Textil; Palapa membranes blow up on solidify -> keep them flat


def process_mesh(mesh, key):
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=WELD)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-5, edges=bm.edges)
    if not bm.faces:
        bm.to_mesh(mesh)
        bm.free()
        mesh.update()
        return False
    if (
        key not in CURVED
    ):  # flat geometry -> straighten + merge coplanar (curves keep their facets)
        bmesh.ops.dissolve_limit(
            bm, angle_limit=DISSOLVE, verts=bm.verts, edges=bm.edges
        )
    did_sol = False
    if (
        key in ROOF and bm.faces
    ):  # roof membranes are single surfaces -> always give thickness
        try:
            bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=SOLIDIFY_THIN)
            did_sol = True
        except Exception as exc:
            print("solidify warn", exc)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return did_sol


def tri_count(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def is_column(obj):
    d = obj.dimensions
    fx, fy = d.x, d.y
    foot = max(fx, fy, 1e-6)
    return d.z > 1.3 * foot and foot < 1.5 and min(fx, fy) / foot > 0.4


def columnize(obj, mat):
    bb = [obj.matrix_world @ Vector(c[:]) for c in obj.bound_box]
    xs = [v.x for v in bb]
    ys = [v.y for v in bb]
    zs = [v.z for v in bb]
    cx, cy = (min(xs) + max(xs)) / 2.0, (min(ys) + max(ys)) / 2.0
    z0, z1 = min(zs), max(zs)
    radius = (max(xs) - min(xs) + max(ys) - min(ys)) / 4.0
    name = obj.name
    bpy.data.objects.remove(obj, do_unlink=True)
    before = {o.name for o in bpy.data.objects}
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=COL_SIDES,
        radius=max(radius, 0.02),
        depth=max(z1 - z0, 0.02),
        location=(cx, cy, (z0 + z1) / 2.0),
        end_fill_type="NGON",
    )
    fresh = [o.name for o in bpy.data.objects if o.name not in before]
    cyl = bpy.data.objects.get(fresh[0]) if fresh else None
    if cyl:
        cyl.name = "COL_" + name[:36]
        cyl.data.materials.clear()
        cyl.data.materials.append(mat)
    return cyl


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

    dropped = 0
    for obj in list(bpy.data.objects):
        if obj.type != "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
            dropped += 1
        elif (
            obj.data is None
            or len(obj.data.polygons) == 0
            or max(obj.dimensions) < MIN_SIZE
        ):
            bpy.data.objects.remove(obj, do_unlink=True)
            dropped += 1
    print(f"dropped {dropped} non-mesh/tiny objects")

    # --- columnize pass (per object) ---
    columnized = 0
    for obj in [o for o in bpy.data.objects if o.type == "MESH"]:
        if obj.name not in bpy.data.objects:
            continue
        key, rgba, anim = classify(obj.name)
        if key != "Door" and is_column(obj):
            try:
                if columnize(obj, get_mat(key, rgba)):
                    columnized += 1
            except Exception as exc:
                print("columnize warn", exc)
    print(f"columnized {columnized} columns")

    # --- clean each UNIQUE mesh once (efficient; instances stay shared) ---
    done = set()
    cleaned = solidified = 0
    for obj in [o for o in bpy.data.objects if o.type == "MESH"]:
        if obj.name.startswith("COL_"):
            continue
        m = obj.data
        if m.name in done:
            continue
        done.add(m.name)
        key, _, _ = classify(obj.name)
        try:
            if process_mesh(m, key):
                solidified += 1
            cleaned += 1
        except Exception as exc:
            print("mesh warn", m.name, exc)
    print(f"cleaned {cleaned} unique meshes; solidified {solidified}")

    for obj in [o for o in bpy.data.objects if o.type == "MESH"]:
        if obj.data is None or len(obj.data.polygons) == 0:
            bpy.data.objects.remove(obj, do_unlink=True)

    # --- material + grouping ---
    groups = {}
    for obj in [o for o in bpy.data.objects if o.type == "MESH"]:
        key, rgba, anim = classify(obj.name)
        mat = get_mat(key, rgba)
        obj.data.materials.clear()
        obj.data.materials.append(mat)
        groups.setdefault(key, {"rgba": rgba, "anim": anim, "objs": []})["objs"].append(
            obj
        )

    info = {}
    for key, grp in groups.items():
        objs = [o for o in grp["objs"] if o.name in bpy.data.objects]
        if not objs:
            continue
        if key == "Door" or len(objs) <= 1:
            info[key] = (len(objs), sum(tri_count(o) for o in objs), grp["anim"])
            continue
        active = objs[0]
        for o in objs:
            o.select_set(True)
        with bpy.context.temp_override(
            active_object=active, selected_objects=objs, selected_editable_objects=objs
        ):
            bpy.ops.object.join()
        active.name = "600B_PALACE_HQ_" + key
        for o in bpy.data.objects:
            o.select_set(False)
        info[key] = (1, tri_count(active), grp["anim"])

    final_meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    if final_meshes:
        for o in final_meshes:
            o.select_set(True)
        try:
            with bpy.context.temp_override(
                active_object=final_meshes[0],
                selected_objects=final_meshes,
                selected_editable_objects=final_meshes,
            ):
                bpy.ops.object.shade_auto_smooth(angle=0.524)
        except Exception as exc:
            print("auto_smooth failed:", exc)
        for o in final_meshes:
            o.select_set(False)

    total = sum(tri_count(o) for o in final_meshes)
    print(f"FINAL objects={len(final_meshes)} total_tris={total}")
    for key in sorted(info):
        cnt, tris, anim = info[key]
        print(f"  {key:12} objs={cnt:5} tris={tris:8} {'ANIM' if anim else ''}")

    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=False)
    print("EXPORT_DONE", dst)


if __name__ == "__main__":
    main()
