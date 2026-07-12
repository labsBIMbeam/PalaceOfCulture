"""Headless Workbench render of a GLB to verify grounding/contour (no GPU needed).

Run: blender --factory-startup -b --python render_check.py -- <in.glb> <out.png>
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
    center = Vector(((mins[0] + maxs[0]) / 2, (mins[1] + maxs[1]) / 2, 3.0))
    size = max(maxs[i] - mins[i] for i in range(3))
    # tint the floor so its contour is unmistakable in the check render
    for o in meshes:
        if "floor" in o.name.lower() and o.data.materials:
            o.data.materials[0].diffuse_color = (0.90, 0.42, 0.20, 1.0)

    # camera — 3/4 aerial
    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam)
    dist = size * 1.5
    cam.location = center + Vector((dist * 0.9, -dist * 0.9, dist * 0.4))
    direction = center - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam

    # sun
    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 3.0
    sun = bpy.data.objects.new("Sun", sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(48), math.radians(18), math.radians(35))

    scn = bpy.context.scene
    scn.render.engine = "BLENDER_WORKBENCH"
    shading = scn.display.shading
    shading.light = "STUDIO"
    shading.color_type = "TEXTURE"
    shading.show_shadows = True
    shading.show_cavity = True
    shading.background_type = "VIEWPORT"
    shading.background_color = (0.93, 0.90, 0.82)
    try:
        scn.display.render_aa = "8"
    except Exception:
        pass
    scn.render.resolution_x = 1000
    scn.render.resolution_y = 1000
    scn.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("RENDERED", out)


if __name__ == "__main__":
    main()
