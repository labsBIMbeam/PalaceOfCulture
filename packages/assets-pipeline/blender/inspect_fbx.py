"""Headless FBX inspector — import an FBX and dump geometry stats to JSON.

Run (no UI, won't touch any interactive Blender session):
    blender --background --python inspect_fbx.py -- <input.fbx> <output.json>

Reports object/mesh/material counts, real triangle total, per-object heaviest meshes,
material names, type breakdown, and the model's world-space dimensions (to sanity-check units).
"""

import json
import sys

import bpy
import mathutils


def _args() -> tuple[str, str]:
    argv = sys.argv
    rest = argv[argv.index("--") + 1 :] if "--" in argv else []
    if len(rest) < 2:
        raise SystemExit(
            "usage: blender -b --python inspect_fbx.py -- <in.fbx> <out.json>"
        )
    return rest[0], rest[1]


def main() -> None:
    fbx_path, out_path = _args()

    bpy.ops.wm.read_factory_settings(use_empty=True)

    def _enable(op_attr: str, modules: tuple[str, ...]) -> None:
        if hasattr(bpy.ops.import_scene, op_attr):
            return
        for mod in modules:
            try:
                bpy.ops.preferences.addon_enable(module=mod)
            except Exception:
                pass
            if hasattr(bpy.ops.import_scene, op_attr):
                return

    ext = fbx_path.lower().rsplit(".", 1)[-1]
    if ext == "fbx":
        _enable(
            "fbx",
            (
                "io_scene_fbx",
                "bl_ext.blender_org.io_scene_fbx",
                "bl_ext.system.io_scene_fbx",
            ),
        )
        bpy.ops.import_scene.fbx(filepath=fbx_path)
    elif ext in ("glb", "gltf"):
        _enable(
            "gltf",
            (
                "io_scene_gltf2",
                "bl_ext.blender_org.io_scene_gltf2",
                "bl_ext.system.io_scene_gltf2",
            ),
        )
        bpy.ops.import_scene.gltf(filepath=fbx_path)
    else:
        raise SystemExit("unsupported format: " + ext)

    total_tris = 0
    mats: set[str] = set()
    per_obj: list[list] = []
    type_counts: dict[str, int] = {}
    mins = [1e18] * 3
    maxs = [-1e18] * 3

    for obj in bpy.data.objects:
        type_counts[obj.type] = type_counts.get(obj.type, 0) + 1
        if obj.type != "MESH" or obj.data is None:
            continue
        mesh = obj.data
        try:
            mesh.calc_loop_triangles()
            tris = len(mesh.loop_triangles)
        except Exception:
            tris = len(mesh.polygons)
        total_tris += tris
        per_obj.append([obj.name, tris])
        for slot in obj.material_slots:
            if slot.material:
                mats.add(slot.material.name)
        for corner in obj.bound_box:
            world = obj.matrix_world @ mathutils.Vector(corner[:])
            for i in range(3):
                mins[i] = min(mins[i], world[i])
                maxs[i] = max(maxs[i], world[i])

    per_obj.sort(key=lambda row: -row[1])
    dims = [round(maxs[i] - mins[i], 2) for i in range(3)] if maxs[0] > -1e17 else None

    out = {
        "fbx": fbx_path,
        "objects": len(bpy.data.objects),
        "meshes": len(bpy.data.meshes),
        "total_triangles": total_tris,
        "num_materials": len(mats),
        "materials": sorted(mats),
        "type_counts": type_counts,
        "dimensions_xyz": dims,
        "heaviest_objects": per_obj[:30],
        "object_names_sample": sorted(o.name for o in bpy.data.objects)[:80],
    }
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(out, handle, ensure_ascii=False, indent=1)
    print(f"INSPECT_DONE total_tris={total_tris} objects={len(bpy.data.objects)}")


if __name__ == "__main__":
    main()
