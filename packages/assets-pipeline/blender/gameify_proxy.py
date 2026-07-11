"""Headless first-pass proxy: import a GLB, join all meshes, decimate to a triangle budget,
export a lightweight GLB. THROWAWAY shape-check (single mesh, no per-part materials/animation) —
just to validate the pipeline end-to-end and finally see the building at budget.

Run: blender --factory-startup -b --python gameify_proxy.py -- <in.glb> <out.glb> <target_tris>
"""

import sys

import bpy


def _args() -> tuple[str, str, int]:
    argv = sys.argv
    rest = argv[argv.index("--") + 1 :] if "--" in argv else []
    return rest[0], rest[1], int(rest[2])


def _enable(attr: str, mods: tuple[str, ...]) -> None:
    if hasattr(bpy.ops.import_scene, attr):
        return
    for mod in mods:
        try:
            bpy.ops.preferences.addon_enable(module=mod)
        except Exception:
            pass
        if hasattr(bpy.ops.import_scene, attr):
            return


def _count_tris() -> int:
    total = 0
    for obj in bpy.data.objects:
        if obj.type == "MESH" and obj.data:
            obj.data.calc_loop_triangles()
            total += len(obj.data.loop_triangles)
    return total


def main() -> None:
    src, dst, target = _args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _enable(
        "gltf",
        (
            "io_scene_gltf2",
            "bl_ext.blender_org.io_scene_gltf2",
            "bl_ext.system.io_scene_gltf2",
        ),
    )
    bpy.ops.import_scene.gltf(filepath=src)

    for obj in list(bpy.data.objects):
        if obj.type != "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    if not meshes:
        raise SystemExit("no meshes imported")

    before = _count_tris()

    active = meshes[0]
    for obj in meshes:
        obj.select_set(True)
    with bpy.context.temp_override(
        active_object=active, selected_objects=meshes, selected_editable_objects=meshes
    ):
        bpy.ops.object.join()
    joined = active

    ratio = min(1.0, float(target) / max(1, before))
    mod = joined.modifiers.new("dec", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = ratio
    with bpy.context.temp_override(active_object=joined, object=joined):
        bpy.ops.object.modifier_apply(modifier=mod.name)

    after = _count_tris()

    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=False)
    print(f"GAMEIFY_DONE before={before} after={after} ratio={ratio:.4f}")


if __name__ == "__main__":
    main()
