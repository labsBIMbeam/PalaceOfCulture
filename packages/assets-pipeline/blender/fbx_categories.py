"""Import an FBX and print a name-prefix histogram + keyword breakdown (objects + tris).

Used to identify what to keep/strip (Textil, Glas, Lichtstreifen, ...) before game-ifying.
Run: blender --factory-startup -b --python fbx_categories.py -- <in.fbx>
"""

import re
import sys
from collections import Counter

import bpy


def norm(name: str) -> str:
    name = re.sub(r"\[\d+\]", "", name)
    name = re.sub(r"\.\d+$", "", name)
    name = re.sub(r"\d+", "#", name)
    return name.strip()


def main() -> None:
    argv = sys.argv
    rest = argv[argv.index("--") + 1 :] if "--" in argv else []
    src = rest[0]

    bpy.ops.wm.read_factory_settings(use_empty=True)
    is_glb = src.lower().endswith((".glb", ".gltf"))
    mods = (
        ("io_scene_gltf2", "bl_ext.blender_org.io_scene_gltf2")
        if is_glb
        else ("io_scene_fbx", "bl_ext.blender_org.io_scene_fbx")
    )
    importer = bpy.ops.import_scene.gltf if is_glb else bpy.ops.import_scene.fbx
    if (is_glb and not hasattr(bpy.ops.import_scene, "gltf")) or (
        not is_glb and not hasattr(bpy.ops.import_scene, "fbx")
    ):
        for mod in mods:
            try:
                bpy.ops.preferences.addon_enable(module=mod)
            except Exception:
                pass
        importer = bpy.ops.import_scene.gltf if is_glb else bpy.ops.import_scene.fbx

    print("IMPORT_START")
    importer(filepath=src)
    print("IMPORT_OK")

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    total = 0
    for o in meshes:
        o.data.calc_loop_triangles()
        total += len(o.data.loop_triangles)
    print(f"MESHES {len(meshes)}  TOTAL_TRIS {total}")

    counts = Counter()
    tris_by = Counter()
    for o in meshes:
        key = norm(o.name)
        counts[key] += 1
        tris_by[key] += len(o.data.loop_triangles)
    print("--- top prefixes (count / tris) ---")
    for name, cnt in counts.most_common(70):
        print(f"  {cnt:5}  {tris_by[name]:9}  {name}")

    print("--- keyword breakdown ---")
    for kw in (
        "textil",
        "glas",
        "glass",
        "licht",
        "led",
        "streifen",
        "band",
        "geländer",
        "gelander",
        "skelett",
        "stahl",
        "steel",
        "träger",
        "trager",
        "rahmen",
        "fassade",
        "decke",
        "wand",
        "dach",
        "stütze",
        "stutze",
        "column",
    ):
        objs = [o for o in meshes if kw in o.name.lower()]
        if objs:
            t = sum(len(o.data.loop_triangles) for o in objs)
            print(f"  {kw:10} {len(objs):5} objs  {t:9} tris")


if __name__ == "__main__":
    main()
