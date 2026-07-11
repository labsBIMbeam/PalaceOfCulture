"""Strip Textil, Glas, the duplicate-skeleton light strips, and the environment+wall from a GLB.

Felix: "lass textilien komplett raus und glas und lichtstreifen, was doppelte skelettbauelemente sind"
       + "die umgebung mit mauer ... entfernen".
  - textil          : the sun sails (handled separately as a hero/animation later)
  - glas            : all glass (railings = the ~1M-tri hog, facades, glass doors, glass ceiling)
  - licht-streifen  : `BSH Träger ... Licht` — light strips that duplicate the structural BSH skeleton
  - umgebung+mauer  : the 132 m ground slab + the 132 m perimeter wall (footprint > 100 m; the building
                      tops out at ~63 m, so this threshold only ever hits the environment)

Run: blender --factory-startup -b --python strip_categories.py -- <in.glb> <out.glb>
"""

import sys

import bpy
from mathutils import Vector

FOOTPRINT_MAX = (
    100.0  # m — anything wider than this in X or Y is environment/wall, not building
)


def should_remove(name: str, span: float) -> str | None:
    low = name.lower()
    # NOTE: environment + perimeter wall are now KEPT (Felix wants them back). Footprint rule disabled.
    if "textil" in low:
        return "textil"
    if "glas" in low:  # covers 'glas' + 'glass'
        return "glas"
    if "träger" in low and "licht" in low:  # duplicate-skeleton light strips
        return "licht-streifen"
    return None


def tris(o) -> int:
    o.data.calc_loop_triangles()
    return len(o.data.loop_triangles)


def xy_span(o) -> float:
    bb = [o.matrix_world @ Vector(c[:]) for c in o.bound_box]
    xs = [v.x for v in bb]
    ys = [v.y for v in bb]
    return max(max(xs) - min(xs), max(ys) - min(ys))


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

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    before_objs = len(meshes)
    before_tris = sum(tris(o) for o in meshes)

    removed = {
        k: [0, 0] for k in ("textil", "glas", "licht-streifen", "umgebung+mauer")
    }
    env_names = []
    for o in list(meshes):
        reason = should_remove(o.name, xy_span(o))
        if reason:
            removed[reason][0] += 1
            removed[reason][1] += tris(o)
            if reason == "umgebung+mauer":
                env_names.append(o.name[:50])
            bpy.data.objects.remove(o, do_unlink=True)

    kept = [o for o in bpy.data.objects if o.type == "MESH"]
    after_tris = sum(tris(o) for o in kept)

    print(f"BEFORE objs={before_objs} tris={before_tris}")
    for reason, (cnt, t) in removed.items():
        print(f"  removed {reason:16} objs={cnt:5} tris={t}")
    for n in env_names:
        print(f"    env: {n}")
    print(f"AFTER  objs={len(kept)} tris={after_tris}")

    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=False)
    print("STRIPPED", dst)


if __name__ == "__main__":
    main()
