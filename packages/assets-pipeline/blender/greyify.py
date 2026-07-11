"""Flatten the whole asset to a single light-grey material — no textures, no per-group colour.

Felix: "mach alles mal einfarbig statt texturen. hellgrau". A clean clay/blockout look to judge
the forms without texture distraction. Swap back to texturize.py later. Runs AFTER build_level.

Run: blender --factory-startup -b --python greyify.py -- <in.glb> <out.glb>
"""

import sys

import bpy

GREY = (0.80, 0.80, 0.82, 1.0)


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

    mat = bpy.data.materials.new("600B_Grey")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = GREY
        try:
            bsdf.inputs["Roughness"].default_value = 0.7
        except Exception:
            pass
    mat.diffuse_color = GREY

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    for o in meshes:
        o.data.materials.clear()
        o.data.materials.append(mat)

    print(f"greyified {len(meshes)} meshes")
    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=False)
    print("GREYIFIED", dst)


if __name__ == "__main__":
    main()
