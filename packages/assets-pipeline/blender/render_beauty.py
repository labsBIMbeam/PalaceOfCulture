"""Headless EEVEE render — shows textures x vertex colours + transparency (Workbench can't).

Run: blender --factory-startup -b --python render_beauty.py -- <in.glb> <out.png>
"""

import math
import sys

import bpy
from mathutils import Vector


def main() -> None:
    argv = sys.argv
    rest = argv[argv.index("--") + 1 :] if "--" in argv else []
    src, out = rest[0], rest[1]

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
    mins = [math.inf] * 3
    maxs = [-math.inf] * 3
    for o in meshes:
        for c in o.bound_box:
            wc = o.matrix_world @ Vector(c[:])
            for i in range(3):
                mins[i] = min(mins[i], wc[i])
                maxs[i] = max(maxs[i], wc[i])
    mode = rest[2] if len(rest) > 2 else "wide"
    cz = {"wide": 3.0, "close": 5.0, "elev": 4.0}.get(mode, 3.0)
    center = Vector(((mins[0] + maxs[0]) / 2, (mins[1] + maxs[1]) / 2, cz))
    size = max(maxs[i] - mins[i] for i in range(3))

    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam)
    if mode == "elev":  # low, near side-on -> shows vertical walls
        cam.location = center + Vector((size * 0.10, -size * 0.78, size * 0.10))
    else:
        dist = size * (0.45 if mode == "close" else 1.35)
        cam.location = center + Vector(
            (dist * 0.9, -dist * 0.9, dist * (0.22 if mode == "close" else 0.42))
        )
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam

    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 4.0
    sun = bpy.data.objects.new("Sun", sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), math.radians(16), math.radians(40))

    scn = bpy.context.scene
    if scn.world is None:
        scn.world = bpy.data.worlds.new("World")
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.93, 0.90, 0.82, 1.0)
        bg.inputs[1].default_value = 1.1

    for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scn.render.engine = eng
            break
        except Exception:
            continue
    try:
        scn.eevee.taa_render_samples = 16
    except Exception:
        pass
    scn.render.resolution_x = 1000
    scn.render.resolution_y = 1000
    scn.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("RENDERED", out, "engine", scn.render.engine)


if __name__ == "__main__":
    main()
