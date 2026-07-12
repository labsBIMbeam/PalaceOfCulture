"""Extract objects whose name contains <keyword> from a GLB into a new GLB.

Run: blender --factory-startup -b --python extract.py -- <in.glb> <out.glb> <keyword>
"""

import sys

import bpy


def main() -> None:
    argv = sys.argv
    rest = argv[argv.index("--") + 1 :] if "--" in argv else []
    src, dst, kw = rest[0], rest[1], rest[2].lower()

    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not hasattr(bpy.ops.import_scene, "gltf"):
        for mod in ("io_scene_gltf2", "bl_ext.blender_org.io_scene_gltf2"):
            try:
                bpy.ops.preferences.addon_enable(module=mod)
            except Exception:
                pass
    bpy.ops.import_scene.gltf(filepath=src)

    for o in list(bpy.data.objects):
        if o.type != "MESH" or kw not in o.name.lower():
            bpy.data.objects.remove(o, do_unlink=True)

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    tris = 0
    for o in meshes:
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
    for o in meshes[:30]:
        print("KEEP", o.name)

    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=False)
    print(f"EXTRACT_DONE objects={len(meshes)} tris={tris}")


if __name__ == "__main__":
    main()
