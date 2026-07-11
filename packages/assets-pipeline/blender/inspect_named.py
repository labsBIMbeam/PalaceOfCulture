"""List objects whose name contains <keyword>, with world Z range + dims (find named slabs).

Run: blender --factory-startup -b --python inspect_named.py -- <in.glb> [keyword]
"""

import sys

import bpy
from mathutils import Vector


def wz(o):
    zs = [(o.matrix_world @ Vector(c[:])).z for c in o.bound_box]
    return min(zs), max(zs)


def main() -> None:
    argv = sys.argv
    rest = argv[argv.index("--") + 1 :] if "--" in argv else []
    src = rest[0]
    kw = (rest[1] if len(rest) > 1 else "geschossdecke").lower()

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
    hits = [o for o in meshes if kw in o.name.lower()]
    print(f"MATCHES '{kw}': {len(hits)}")
    for o in sorted(hits, key=lambda o: wz(o)[1]):
        zlo, zhi = wz(o)
        d = o.dimensions
        print(
            f"  z=[{zlo:7.2f},{zhi:7.2f}] dim=[{d.x:6.1f},{d.y:6.1f},{d.z:5.2f}] {o.name[:52]}"
        )

    allz = [(o.matrix_world @ Vector(c[:])).z for o in meshes for c in o.bound_box]
    print(f"OVERALL Z min={min(allz):.2f} max={max(allz):.2f}  objects={len(meshes)}")


if __name__ == "__main__":
    main()
