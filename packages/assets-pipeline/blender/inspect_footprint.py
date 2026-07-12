"""List meshes by world XY footprint to spot environment / boundary-wall elements.

Run: blender --factory-startup -b --python inspect_footprint.py -- <in.glb>
"""

import sys

import bpy
from mathutils import Vector


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

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    rows = []
    gmin = [1e18] * 3
    gmax = [-1e18] * 3
    for o in meshes:
        bb = [o.matrix_world @ Vector(c[:]) for c in o.bound_box]
        xs = [v.x for v in bb]
        ys = [v.y for v in bb]
        zs = [v.z for v in bb]
        sx, sy, sz = max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)
        for i, vlist in enumerate((xs, ys, zs)):
            gmin[i] = min(gmin[i], min(vlist))
            gmax[i] = max(gmax[i], max(vlist))
        rows.append((max(sx, sy), sx, sy, sz, min(zs), max(zs), o.name))

    rows.sort(reverse=True)
    print(
        f"OVERALL bbox min={[round(v, 1) for v in gmin]} max={[round(v, 1) for v in gmax]}"
    )
    print(
        f"building-ish span guess: X={round(gmax[0] - gmin[0])} Y={round(gmax[1] - gmin[1])}"
    )
    print("--- largest XY-footprint meshes ---")
    for span, sx, sy, sz, z0, z1, name in rows[:28]:
        print(
            f"  span={span:7.1f}  dims=[{sx:6.1f},{sy:6.1f},{sz:6.1f}]  z=[{z0:7.1f},{z1:7.1f}]  {name[:46]}"
        )


if __name__ == "__main__":
    main()
