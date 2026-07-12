"""Werkstattgasse level blockout — greybox of the rustic->cyber gradient (docs/STREET-LEVEL-PLAN.md).

The canonical layout: run this in Blender to inspect/iterate the composition, then port the box
positions to apps/web/src/scene/{StreetWorld,Village}.tsx. Coordinates are GAME coords (three.js):
x = cross-lane, z = along the lane (+, the walk direction), y = height. Blender is Z-up, so this maps
game (x, z, height) -> Blender (X=x, Y=z, Z=height); box bases sit on the ground (z=0).

Composition (validated by top-down + 3/4 renders):
- Clear ~16 m centre lane the whole length; buildings staggered/irregular, never a fixed-pitch row.
- Z0-Z2 open + low (rustic frontier); Z3-Z4 taller + neon (the cyberpunk city crust) — the gradient.
- One dominant vertical per zone: forge chimney -> market tree/well -> tavern -> tech-tower.
"""

import math

import bpy
from mathutils import Vector


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for m in list(bpy.data.materials):
        bpy.data.materials.remove(m)


def mat(name, rgb, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = 0.9
    if emit:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


def build():
    reset()
    M = {
        "timber": mat("timber", (0.42, 0.28, 0.16)),
        "stall": mat("stall", (0.6, 0.42, 0.26)),
        "facade": mat("facade", (0.72, 0.64, 0.52)),
        "cyber": mat("cyber", (0.30, 0.36, 0.44)),
        "focal": mat("focal", (0.95, 0.62, 0.22), emit=2.0),
        "neon": mat("neon", (0.2, 0.8, 1.0), emit=3.0),
        "ground": mat("ground", (0.5, 0.47, 0.4)),
        "lane": mat("lane", (0.66, 0.6, 0.5)),
        "tree": mat("tree", (0.28, 0.45, 0.22)),
        "well": mat("well", (0.5, 0.45, 0.36)),
    }

    def box(n, gx, gz, w, d, h, m, zoff=0.0):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(gx, gz, h / 2 + zoff))
        o = bpy.context.active_object
        o.name = n
        o.scale = (w / 2, d / 2, h / 2)
        o.data.materials.append(M[m])
        return o

    def cone(n, gx, gz, r, h, m):
        bpy.ops.mesh.primitive_cone_add(radius1=r, depth=h, location=(gx, gz, h / 2))
        o = bpy.context.active_object
        o.name = n
        o.data.materials.append(M[m])
        return o

    box("ground", 0, 150, 150, 320, 0.4, "ground")
    box("lane", 0, 150, 16, 320, 0.2, "lane", zoff=0.3)

    # Z0 GATE (open threshold)
    box("gate_L", -9, 20, 2, 2, 7, "facade")
    box("gate_R", 9, 20, 2, 2, 7, "facade")
    box("gate_top", 0, 20, 20, 2, 1.4, "facade", zoff=6.3)
    box("wagon", -6, 30, 3, 2, 1.6, "timber")
    box("barrels", 7, 28, 2, 2, 1.6, "stall")

    # Z1 WORKSHOP ROW — open low rustic; forge chimney = focal
    box("forge", -15, 58, 9, 8, 6, "timber")
    box("forge_chim", -15, 61, 1.4, 1.4, 11, "timber")
    box("forge_ember", -15, 61, 1.7, 1.7, 1.3, "focal", zoff=11)
    box("sawmill", 15, 90, 10, 8, 6, "timber")
    box("logpile", 12, 99, 3, 1.6, 1.4, "timber")
    box("stall_druck", -14, 44, 4, 3, 3, "stall")
    box("stall_topf", 14, 50, 4, 3, 3, "stall")
    box("stall_web", -14, 96, 4, 3, 3, "stall")
    box("stall_lat", 15, 108, 4, 3, 3, "stall")

    # Z2 MARKET SQUARE — widen, gather; well + tree = focal
    box("well", 0, 140, 2.4, 2.4, 2.2, "well")
    cone("tree", -9, 132, 4.2, 8, "tree")
    box("mk1", 14, 122, 4, 3, 3, "stall")
    box("mk2", -15, 150, 4, 3, 3, "stall")
    box("mk3", 13, 158, 4, 3, 3, "stall")
    box("mkhouse_L", -21, 130, 7, 7, 4, "timber")
    box("mkhouse_R", 21, 162, 7, 7, 4.5, "timber")

    # Z3 TAVERN BEND — city starts; tavern focal + strong neon
    box("inn", -14, 188, 11, 9, 8.5, "timber")
    box("inn_neon", -14, 188, 6.5, 0.6, 1.3, "neon", zoff=8.6)
    box("inn_beacon", -16, 188, 0.7, 0.7, 2.2, "neon", zoff=8.5)
    box("stable", 15, 192, 10, 8, 5.5, "timber")
    box("house_a", -20, 176, 6, 6, 6, "timber")
    box("house_b", 18, 210, 6, 6, 5, "timber")
    box("mid_L", -22, 202, 12, 10, 12, "facade")
    box("mid_R", 22, 182, 11, 10, 11, "facade")
    box("mid_neonR", 22, 182, 11.2, 0.5, 1, "neon", zoff=9)

    # Z4 OLD TOWN / CYBER CRUST — climax; irregular tall + towers + strong neon
    box("house_c", -19, 238, 6, 6, 4.5, "timber")
    box("house_sm", 19, 244, 5, 5, 4, "timber")
    box("hut_a", -6, 268, 4, 4, 3.5, "timber")
    box("hut_b", 7, 272, 4, 4, 3.5, "timber")
    box("watch_tower", 24, 258, 4, 4, 13, "timber")
    box("windmill", -24, 264, 5, 5, 9, "timber")
    box("tech_tower", 28, 278, 5, 5, 19, "cyber")
    box("tt_n1", 28, 278, 5.2, 0.5, 1, "neon", zoff=15)
    box("tt_n2", 28, 278, 0.5, 5.2, 1, "neon", zoff=11)
    box("tt_beacon", 28, 278, 0.9, 0.9, 1.8, "neon", zoff=19)
    box("tech_block", -30, 272, 6, 6, 10, "cyber")
    box("tb_neon", -30, 272, 6.2, 0.5, 0.9, "neon", zoff=8)
    box("crust_R1", 22, 234, 12, 11, 14, "facade")
    box("crust_R2", 25, 256, 12, 11, 17, "cyber")
    box("cr2_neon", 25, 256, 12.2, 0.5, 1, "neon", zoff=13)
    box("crust_L1", -22, 250, 12, 11, 15, "facade")
    box("crust_L2", -25, 272, 11, 11, 18, "cyber")

    # warm rustic sun + sky
    bpy.ops.object.light_add(type="SUN", location=(60, 60, 120))
    sun = bpy.context.active_object
    sun.data.energy = 3.2
    sun.data.color = (1.0, 0.9, 0.72)
    sun.rotation_euler = (math.radians(52), math.radians(8), math.radians(35))
    wn = bpy.context.scene.world.node_tree.nodes["Background"]
    wn.inputs["Color"].default_value = (0.55, 0.62, 0.72, 1)
    wn.inputs["Strength"].default_value = 0.6


def set_camera(view="hero"):
    """Position the render camera. view: 'hero' (elevated 3/4), 'gate', or 'top'."""
    cam = bpy.data.objects.get("Camera") or bpy.data.objects[
        bpy.ops.object.camera_add() or bpy.context.active_object.name
    ]
    if "Camera" not in bpy.data.objects:
        bpy.ops.object.camera_add()
        cam = bpy.context.active_object
    bpy.context.scene.camera = cam
    if view == "top":
        cam.data.type = "ORTHO"
        cam.data.ortho_scale = 330
        cam.location = (0, 150, 300)
        cam.rotation_euler = (0, 0, 0)
        return
    cam.data.type = "PERSP"
    if view == "gate":
        cam.data.lens = 22
        cam.location = (11, 5, 9)
        target = Vector((-3, 150, 4))
    else:  # hero
        cam.data.lens = 30
        cam.location = (20, -14, 26)
        target = Vector((-3, 205, 4))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()


if __name__ == "__main__":
    build()
    set_camera("hero")
