"""Build the 21 s intro cinematic scene in Blender — deterministic, from repo GLBs only.

Run inside Blender 5.1+ (GUI or background):
    exec(compile(open(r"G:\\Github\\PalaceOfCulture\\tooling\\intro-cinematic\\build_scene.py").read(),
                 "build_scene.py", "exec"))

Storyboard: docs/design/intro-cinematic.md — 504 frames @ 24 fps, five beats, one camera.
The script wipes the scene and rebuilds everything, so it is safe to re-run after edits.
"""

from __future__ import annotations

import logging
import math
import os
import random
from contextlib import suppress
from pathlib import Path

import bpy
from mathutils import Euler, Vector

for _logger in ("glTFImporter", "gltf"):
    logging.getLogger(_logger).setLevel(logging.WARNING)

ROOT = Path(r"G:\Github\PalaceOfCulture")
PUB = ROOT / "apps" / "web" / "public"
FPS = 24
FRAME_END = 504  # 21.0 s

# Palette (storyboard "Look")
ORANGE = (0.9686, 0.5765, 0.1020)  # #F7931A
COPPER = (0.7216, 0.4510, 0.2000)  # #B87333
VIOLET = (0.4549, 0.2784, 0.7216)  # #7447B8
AMBER = (1.0000, 0.7020, 0.2784)  # #FFB347
CYAN = (0.0902, 0.7451, 0.7333)  # #17BEBB
CREAM = (1.0000, 0.9686, 0.9255)  # #FFF7EC

RNG = random.Random(21)

# World layout (m): street runs along +Y, plaza circle at the far end.
STREET_HALF_WIDTH = 4.6
PLAZA_CENTER = Vector((0.0, 48.0, 0.0))
PLAZA_RADIUS = 10.5
KERNI_HOVER = Vector((0.0, 48.0, 5.0))  # against the violet band, not the black ground
ROOF_PERCH = Vector((-6.1, 8.0, 5.35))  # raccoon on the first left house ridge

# Beat boundaries (frames)
F_HORIZON_IN = 60  # fade from black starts (2.5 s)
F_BEAT2 = 73
F_DISSOLVE_START = 181
F_DISSOLVE_END = 290
F_REFORM_START = 301
F_LANTERN_BUILD = 330
F_LENS_ON = 378
F_FLOOD_ON = 384
F_BEAT5 = 397
F_LAMP_FIRST = 403  # 16.8 s, then one lamp every 7.2 f (0.3 s)
F_TITLE_IN = 454  # 18.9 s
F_FADE_OUT = 486


def sec(s: float) -> int:
    """Seconds → frame number."""
    return round(s * FPS)


# ---------------------------------------------------------------- helpers


def wipe_scene() -> None:
    """Remove every object/collection/orphan so the build is deterministic."""
    bpy.ops.object.select_all(action="DESELECT")
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in list(bpy.data.collections):
        bpy.data.collections.remove(coll)
    for block_list in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.worlds,
        bpy.data.fonts,
        bpy.data.actions,
        bpy.data.node_groups,
    ):
        for block in list(block_list):
            if block.users == 0 or block_list in (bpy.data.worlds,):
                with suppress(RuntimeError):
                    block_list.remove(block)


def collection(name: str) -> bpy.types.Collection:
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    return coll


def link_to(obj: bpy.types.Object, coll_name: str) -> None:
    target = collection(coll_name)
    for coll in obj.users_collection:
        coll.objects.unlink(obj)
    target.objects.link(obj)


def import_glb(path: Path, name: str) -> bpy.types.Object:
    """Import a GLB as ONE parent-free mesh with origin at bbox bottom centre."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    fresh = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in fresh if o.type == "MESH"]
    extra_names = [o.name for o in fresh if o.type != "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()  # invalidates the python refs of the merged-away objects
    merged = bpy.context.view_layer.objects.active
    merged.select_set(True)
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    for extra in extra_names:
        obj = bpy.data.objects.get(extra)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.select_all(action="DESELECT")
    merged.select_set(True)
    bpy.context.view_layer.objects.active = merged
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # origin → bbox bottom centre so placement maths stays readable
    box = [merged.matrix_world @ Vector(c) for c in merged.bound_box]
    lo = Vector((min(v.x for v in box), min(v.y for v in box), min(v.z for v in box)))
    hi = Vector((max(v.x for v in box), max(v.y for v in box), max(v.z for v in box)))
    centre_bottom = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    from mathutils import Matrix

    merged.data.transform(Matrix.Translation(-centre_bottom))
    merged.location = (0, 0, 0)
    merged.name = name
    return merged


def fit_height(obj: bpy.types.Object, height: float) -> None:
    dims = obj.dimensions
    if dims.z > 0:
        s = height / dims.z
        obj.scale = (s, s, s)


def emission_mat(name: str, color, strength: float) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
    bsdf.inputs["Emission Strength"].default_value = strength
    bsdf.inputs["Roughness"].default_value = 0.6
    return mat


def dark_mat(name: str, color=(0.02, 0.02, 0.025), rough=0.9) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    return mat


def key(obj, path: str, value, frame: int, interp: str = "BEZIER") -> None:
    """Set a property by data path and keyframe it."""
    target = obj
    attrs = path.split(".")
    for attr in attrs[:-1]:
        target = getattr(target, attr)
    setattr(target, attrs[-1], value)
    obj.keyframe_insert(data_path=path, frame=frame)
    anim = obj.animation_data
    if anim and anim.action:
        for fcu in anim.action.fcurves:
            if fcu.data_path == path:
                for kp in fcu.keyframe_points:
                    if abs(kp.co.x - frame) < 0.5:
                        kp.interpolation = interp


# ---------------------------------------------------------------- stage A: world


def setup_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = FRAME_END
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    with suppress(TypeError):  # look names shift between Blender releases
        scene.view_settings.look = "AgX - Base Contrast"
    eevee = scene.eevee
    if hasattr(eevee, "taa_render_samples"):
        eevee.taa_render_samples = 64
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    for beat_frame, label in (
        (1, "tick"),
        (F_BEAT2, "rooftop"),
        (F_DISSOLVE_START, "dissolve"),
        (F_REFORM_START, "reform"),
        (F_BEAT5, "zaps"),
        (F_TITLE_IN, "title"),
    ):
        scene.timeline_markers.new(label, frame=beat_frame)


def build_world() -> None:
    """Night sky: matte black zenith, thin ultraviolet horizon band, sparse procedural stars."""
    world = bpy.data.worlds.new("NightSky")
    bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputWorld")
    background = nodes.new("ShaderNodeBackground")
    coord = nodes.new("ShaderNodeTexCoord")
    sep = nodes.new("ShaderNodeSeparateXYZ")
    ramp = nodes.new("ShaderNodeValToRGB")
    star_vor = nodes.new("ShaderNodeTexVoronoi")
    star_map = nodes.new("ShaderNodeMapRange")
    star_gain = nodes.new("ShaderNodeMath")
    mix = nodes.new("ShaderNodeMix")  # RGBA sockets: Factor=0, A=6, B=7, out Result=2
    mix.data_type = "RGBA"

    links.new(coord.outputs["Generated"], sep.inputs["Vector"])
    # horizon gradient: deep violet band low, near-black above
    links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (
        VIOLET[0] * 0.085,
        VIOLET[1] * 0.05,
        VIOLET[2] * 0.12,
        1,
    )
    ramp.color_ramp.elements[1].position = 0.115
    ramp.color_ramp.elements[1].color = (0.003, 0.003, 0.008, 1)

    # stars: tight voronoi points on the sky direction
    links.new(coord.outputs["Generated"], star_vor.inputs["Vector"])
    star_vor.inputs["Scale"].default_value = 90.0
    if "Randomness" in star_vor.inputs:
        star_vor.inputs["Randomness"].default_value = 1.0
    links.new(star_vor.outputs["Distance"], star_map.inputs["Value"])
    star_map.inputs["From Min"].default_value = 0.0
    star_map.inputs["From Max"].default_value = 0.028
    star_map.inputs["To Min"].default_value = 1.0
    star_map.inputs["To Max"].default_value = 0.0
    star_map.clamp = True
    star_gain.operation = "MULTIPLY"
    links.new(star_map.outputs["Result"], star_gain.inputs[0])
    star_gain.inputs[1].default_value = 6.0

    mix.blend_type = "ADD"
    links.new(ramp.outputs["Color"], mix.inputs[6])
    mix.inputs[7].default_value = (0.75, 0.78, 1.0, 1.0)  # cool star white
    links.new(star_gain.outputs["Value"], mix.inputs[0])

    links.new(mix.outputs[2], background.inputs["Color"])
    background.inputs["Strength"].default_value = 1.0
    links.new(background.outputs["Background"], out.inputs["Surface"])


def build_ground() -> None:
    bpy.ops.mesh.primitive_plane_add(size=260, location=(0, 30, 0))
    ground = bpy.context.active_object
    ground.name = "Ground"
    ground.data.materials.append(dark_mat("GroundDark", (0.012, 0.012, 0.016), 0.95))
    link_to(ground, "Set")
    # street strip, one shade lighter so the lamp cascade has something to catch
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 21, 0.012))
    street = bpy.context.active_object
    street.name = "Street"
    street.scale = (STREET_HALF_WIDTH, 21.5, 1)
    street.data.materials.append(dark_mat("StreetDark", (0.030, 0.027, 0.026), 0.85))
    link_to(street, "Set")
    bpy.ops.mesh.primitive_circle_add(
        vertices=84,
        radius=PLAZA_RADIUS,
        fill_type="NGON",
        location=(PLAZA_CENTER.x, PLAZA_CENTER.y, 0.014),
    )
    plaza = bpy.context.active_object
    plaza.name = "Plaza"
    plaza.data.materials.append(dark_mat("PlazaDark", (0.034, 0.030, 0.028), 0.8))
    link_to(plaza, "Set")


HOUSES = [
    ("village/house-a.glb", -6.5, 8.0, 90, 5.3),
    ("village/house-b.glb", 6.5, 7.0, -90, 5.0),
    ("village/house-c.glb", -6.8, 15.5, 90, 4.8),
    ("village/blacksmith.glb", 6.6, 14.5, -90, 4.6),
    ("village/house-b.glb", -6.5, 23.0, 90, 5.1),
    ("village/inn.glb", 6.9, 23.5, -90, 6.2),
    ("village/house-a.glb", -6.6, 30.5, 90, 5.2),
    ("village/house-c.glb", 6.5, 31.0, -90, 4.9),
    ("village/hut-a.glb", -6.4, 37.5, 90, 3.9),
    ("village/house-small.glb", 6.4, 37.0, -90, 4.4),
    # skyline depth behind the rows
    ("village/tech-tower.glb", -14.5, 28.0, 0, 11.0),
    ("village/windmill.glb", 16.0, 38.0, 0, 12.0),
    ("village/sawmill.glb", -15.0, 42.0, 45, 5.5),
    ("buildings/corner-store.glb", 13.5, 18.0, -90, 5.5),
]

TREES = [
    ("nature/pine.glb", -12.5, 12.0, 7.5),
    ("nature/oak.glb", 12.8, 9.0, 6.0),
    ("nature/pine-2.glb", -13.5, 20.0, 8.5),
    ("nature/birch.glb", 14.5, 27.0, 6.5),
    ("nature/oak-2.glb", -12.0, 47.0, 7.0),
    ("nature/pine.glb", 12.0, 44.0, 8.0),
    ("nature/pine-2.glb", -7.0, 60.5, 7.5),
    ("nature/oak.glb", 8.0, 61.0, 6.5),
    # far treeline arc behind the plaza: breaks the empty horizon under the violet band
    ("nature/pine.glb", -22.0, 70.0, 12.0),
    ("nature/pine-2.glb", -14.0, 74.0, 13.5),
    ("nature/oak.glb", -6.0, 78.0, 11.0),
    ("nature/pine.glb", 2.0, 80.0, 14.0),
    ("nature/pine-2.glb", 9.0, 77.0, 12.5),
    ("nature/oak-2.glb", 17.0, 73.0, 11.5),
    ("nature/pine.glb", 25.0, 69.0, 12.5),
    ("nature/pine-2.glb", -30.0, 64.0, 11.0),
    ("nature/pine.glb", -38.0, 60.0, 11.5),
    ("nature/pine-2.glb", -46.0, 54.0, 10.5),
]


def build_street_set() -> None:
    for i, (rel, x, y, rot_z, height) in enumerate(HOUSES):
        obj = import_glb(PUB / rel, f"House_{i:02d}")
        fit_height(obj, height)
        obj.rotation_euler = Euler((0, 0, math.radians(rot_z)))
        obj.location = (x, y, 0)
        link_to(obj, "Set")
    for i, (rel, x, y, height) in enumerate(TREES):
        obj = import_glb(PUB / rel, f"Tree_{i:02d}")
        fit_height(obj, height)
        obj.rotation_euler = Euler((0, 0, RNG.uniform(0, 6.28)))
        obj.location = (x, y, 0)
        link_to(obj, "Set")
    # the unfinished ship, off to the plaza's side — scaffold silhouette, never central
    # quiet scaffold silhouette well behind the plaza edge — never central, never authority
    ship = import_glb(PUB / "growables/starship-stack.glb", "UnfinishedShip")
    fit_height(ship, 9.5)
    ship.rotation_euler = Euler((0, 0, math.radians(12)))
    ship.location = (14.5, 63.0, 0)
    link_to(ship, "Set")
    # scaffold stays a silhouette: knock its white truss down to blackened steel
    for slot in ship.material_slots:
        mat = slot.material
        bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat else None
        if bsdf is not None:
            c = bsdf.inputs["Base Color"].default_value
            bsdf.inputs["Base Color"].default_value = (
                c[0] * 0.22,
                c[1] * 0.22,
                c[2] * 0.26,
                1.0,
            )
    # warm windows: the village kit ships a "Windows" material — give it a faint glow
    for mat in bpy.data.materials:
        if mat.name.startswith("Windows") and mat.use_nodes:
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if bsdf is not None:
                bsdf.inputs["Emission Color"].default_value = (1.0, 0.61, 0.29, 1.0)
                bsdf.inputs["Emission Strength"].default_value = 0.55


def build_lamps() -> list[bpy.types.Object]:
    """Seven lampposts along the street; each gets its own glow material + point light."""
    lamps = []
    base = import_glb(PUB / "props/lamppost.glb", "LampBase")
    fit_height(base, 3.4)
    # the kit's "Grey" post reads white under the flood — blackened steel instead
    for slot in base.material_slots:
        mat = slot.material
        if mat and mat.name.startswith("Grey"):
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if bsdf is not None:
                bsdf.inputs["Base Color"].default_value = (0.045, 0.043, 0.052, 1.0)
                bsdf.inputs["Roughness"].default_value = 0.65
    for i in range(7):
        side = -1 if i % 2 else 1
        y = 6.0 + 6.0 * i
        lamp = base if i == 0 else base.copy()
        if i > 0:
            lamp.data = base.data.copy()
            bpy.context.scene.collection.objects.link(lamp)
        else:
            lamp.data = lamp.data.copy()
        lamp.name = f"Lamp_{i}"
        lamp.location = (side * (STREET_HALF_WIDTH - 1.1), y, 0)
        lamp.rotation_euler = Euler((0, 0, math.radians(90 if side > 0 else -90)))
        link_to(lamp, "Lamps")
        # per-lamp glow material clone so ignition can cascade
        for slot in lamp.material_slots:
            if slot.material and slot.material.name.startswith("Light"):
                glow = slot.material.copy()
                glow.name = f"LampGlow_{i}"
                bsdf = glow.node_tree.nodes.get("Principled BSDF")
                bsdf.inputs["Emission Color"].default_value = (*AMBER, 1.0)
                bsdf.inputs["Emission Strength"].default_value = 0.0
                slot.material = glow
        light_data = bpy.data.lights.new(f"LampLight_{i}", type="POINT")
        light_data.color = AMBER
        light_data.energy = 0.0
        light_data.shadow_soft_size = 0.3
        light = bpy.data.objects.new(f"LampLight_{i}", light_data)
        light.location = (side * (STREET_HALF_WIDTH - 1.6), y, 3.1)
        link_to(light, "Lamps")
        lamps.append(lamp)
    return lamps


def build_moon() -> None:
    sun_data = bpy.data.lights.new("Moon", type="SUN")
    sun_data.energy = 0.16
    sun_data.color = (0.62, 0.60, 0.92)
    sun_data.angle = math.radians(4.0)
    sun = bpy.data.objects.new("Moon", sun_data)
    # from beyond the plaza toward the camera → rim light on roof silhouettes
    sun.rotation_euler = Euler((math.radians(58), 0, math.radians(196)))
    link_to(sun, "Lights")


# ---------------------------------------------------------------- stage B: raccoon + camera


def _sphere(name: str, scale, loc, rot=(0, 0, 0)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=14, ring_count=10, radius=1.0, location=loc
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = Euler([math.radians(a) for a in rot])
    return obj


def _cone(
    name: str, radius: float, depth: float, loc, rot=(0, 0, 0)
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=10, radius1=radius, depth=depth, location=loc
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = Euler([math.radians(a) for a in rot])
    return obj


def _join(
    objs: list[bpy.types.Object], name: str, mat: bpy.types.Material
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    merged = bpy.context.view_layer.objects.active
    merged.name = name
    merged.data.materials.clear()
    merged.data.materials.append(mat)
    return merged


def roof_perch() -> Vector:
    """The raccoon's seat: ridge crest of the first left house, computed from its bbox."""
    house = bpy.data.objects["House_00"]
    box = [house.matrix_world @ Vector(c) for c in house.bound_box]
    top = max(v.z for v in box)
    cx = (min(v.x for v in box) + max(v.x for v in box)) / 2
    return Vector((cx, 8.0, top - 0.06))


def build_raccoon() -> None:
    """Low-poly raccoon, built for the silhouette: sitting profile, bushy tail, alert ears.

    Local frame: +Y is forward (toward the plaza). Head and tail stay separate objects so
    the head-turn and tail-sway keys stay readable.
    """
    fur = dark_mat("RaccoonFur", (0.032, 0.030, 0.034), 1.0)
    perch = roof_perch()

    root = bpy.data.objects.new("RaccoonRoot", None)
    root.empty_display_size = 0.2
    root.location = perch
    root.scale = (1.5, 1.5, 1.5)
    bpy.context.scene.collection.objects.link(root)

    body_parts = [
        _sphere("rb_haunch", (0.24, 0.28, 0.24), (0, -0.10, 0.22)),
        _sphere("rb_torso", (0.19, 0.28, 0.19), (0, 0.10, 0.30), rot=(-24, 0, 0)),
        _sphere("rb_chest", (0.15, 0.16, 0.15), (0, 0.22, 0.38)),
    ]
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=8, radius=0.028, depth=0.30, location=(side * 0.07, 0.24, 0.15)
        )
        leg = bpy.context.active_object
        leg.name = f"rb_leg_{side}"
        body_parts.append(leg)
    body = _join(body_parts, "RaccoonBody", fur)
    body.parent = root

    head_parts = [
        _sphere("rh_skull", (0.125, 0.115, 0.105), (0, 0.38, 0.56)),
        _cone("rh_snout", 0.05, 0.16, (0, 0.50, 0.53), rot=(-78, 0, 0)),
        _cone("rh_ear_l", 0.055, 0.13, (-0.082, 0.36, 0.675), rot=(-10, -16, 0)),
        _cone("rh_ear_r", 0.055, 0.13, (0.082, 0.36, 0.675), rot=(-10, 16, 0)),
    ]
    head = _join(head_parts, "RaccoonHead", fur)
    head.parent = root
    # pivot for the head turn sits at the neck
    head.location = (0, 0, 0)

    tail_parts = []
    tail_curve = [  # low overlapping chain hugging the ridge, curled to the camera side
        ((0.04, -0.33, 0.17), (0.085, 0.11, 0.085)),
        ((0.07, -0.45, 0.17), (0.075, 0.10, 0.075)),
        ((0.09, -0.57, 0.19), (0.066, 0.09, 0.066)),
        ((0.10, -0.68, 0.23), (0.056, 0.075, 0.056)),
        ((0.10, -0.75, 0.27), (0.048, 0.062, 0.048)),
        ((0.09, -0.79, 0.32), (0.038, 0.052, 0.038)),
    ]
    for i, (loc, scale) in enumerate(tail_curve):
        tail_parts.append(_sphere(f"rt_{i}", scale, loc))
    tail = _join(tail_parts, "RaccoonTail", fur)
    tail.parent = root

    for obj in (root, body, head, tail):
        link_to(obj, "Raccoon")

    # idle: head first tilted toward the camera side, then it turns to face the plaza at 5.5 s
    head.rotation_euler = Euler((math.radians(-5), 0, math.radians(-30)))
    head.keyframe_insert("rotation_euler", frame=1)
    head.keyframe_insert("rotation_euler", frame=sec(5.0))
    head.rotation_euler = Euler((math.radians(7), 0, 0))
    head.keyframe_insert("rotation_euler", frame=sec(6.1))
    # tail sway — two slow beats, settles before the dissolve
    tail.rotation_euler = Euler((0, 0, 0))
    tail.keyframe_insert("rotation_euler", frame=1)
    tail.rotation_euler = Euler((0, math.radians(-7), math.radians(9)))
    tail.keyframe_insert("rotation_euler", frame=sec(4.2))
    tail.rotation_euler = Euler((0, 0, 0))
    tail.keyframe_insert("rotation_euler", frame=sec(7.0))

    # moon-motivated rim so the silhouette separates from the near-black sky
    rim_data = bpy.data.lights.new("RaccoonRim", type="SPOT")
    rim_data.energy = 220.0
    rim_data.color = (0.66, 0.64, 1.0)
    rim_data.spot_size = math.radians(38)
    rim_data.spot_blend = 0.6
    rim_data.shadow_soft_size = 0.4
    rim = bpy.data.objects.new("RaccoonRim", rim_data)
    rim.location = perch + Vector(
        (-2.6, 3.4, 2.3)
    )  # opposite the camera: edge, not key
    aim = rim.constraints.new("TRACK_TO")
    aim.target = bpy.data.objects["RaccoonRoot"]
    aim.track_axis = "TRACK_NEGATIVE_Z"
    aim.up_axis = "UP_Y"
    link_to(rim, "Lights")


def build_kerni() -> bpy.types.Object:
    """The runtime lantern familiar, hovering above the plaza. Hidden until the reformation,
    then revealed top-down in sync with the settling particles."""
    kerni = import_glb(PUB / "npc/kerni.glb", "Kerni")
    fit_height(kerni, 1.1)
    kerni.location = KERNI_HOVER - Vector((0, 0, 0.55))  # origin is bbox bottom
    link_to(kerni, "Kerni")

    # top-down build-up: weight 1 at the crown, 0 at the base
    box = [Vector(c) for c in kerni.bound_box]
    z_lo = min(v.z for v in box)
    z_hi = max(v.z for v in box)
    group = kerni.vertex_groups.new(name="buildup")
    span = max(z_hi - z_lo, 1e-6)
    for v in kerni.data.vertices:
        w = (v.co.z - z_lo) / span
        group.add([v.index], w, "REPLACE")
    mask = kerni.modifiers.new("BuildMask", "MASK")
    mask.vertex_group = "buildup"
    mask.threshold = 1.02
    kerni.keyframe_insert('modifiers["BuildMask"].threshold', frame=F_LANTERN_BUILD)
    mask.threshold = 0.0
    kerni.keyframe_insert('modifiers["BuildMask"].threshold', frame=F_LENS_ON + 8)
    kerni.hide_render = True
    kerni.keyframe_insert("hide_render", frame=1)
    kerni.hide_render = False
    kerni.keyframe_insert("hide_render", frame=F_LANTERN_BUILD - 1)

    # hover bob after the reformation — same gentle 0.9 rad/s spirit as the runtime familiar
    base_z = kerni.location.z
    for frame in range(F_BEAT5, FRAME_END + 1, 12):
        t = (frame - F_BEAT5) / FPS
        kerni.location.z = base_z + 0.08 * math.sin(t * 0.9 * 2)
        kerni.keyframe_insert("location", index=2, frame=frame)

    # the amber lens + tiny cyan diagnostic glint (proxy spheres; the GLB bakes its lens in paint)
    lens_mat = emission_mat("KerniLensGlow", AMBER, 0.0)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=12,
        ring_count=8,
        radius=0.055,
        location=KERNI_HOVER + Vector((0, -0.38, 0.12)),
    )
    lens = bpy.context.active_object
    lens.name = "KerniLens"
    lens.data.materials.append(lens_mat)
    link_to(lens, "Kerni")
    glint_mat = emission_mat("KerniGlint", CYAN, 0.0)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=10,
        ring_count=6,
        radius=0.018,
        location=KERNI_HOVER + Vector((0.07, -0.40, 0.19)),
    )
    glint = bpy.context.active_object
    glint.name = "KerniGlint"
    glint.data.materials.append(glint_mat)
    link_to(glint, "Kerni")
    for obj in (lens, glint):
        obj.parent = kerni
        obj.matrix_parent_inverse = kerni.matrix_world.inverted()
    for mat, strength in ((lens_mat, 7.0), (glint_mat, 2.6)):
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        sock = bsdf.inputs["Emission Strength"]
        sock.default_value = 0.0
        sock.keyframe_insert("default_value", frame=F_LENS_ON - 2)
        sock.default_value = strength
        sock.keyframe_insert("default_value", frame=F_LENS_ON + 6)

    # light floods: first the lens point, then the soft plaza wash
    lens_light_data = bpy.data.lights.new("KerniLensLight", type="POINT")
    lens_light_data.color = AMBER
    lens_light_data.energy = 0.0
    lens_light_data.shadow_soft_size = 0.25
    lens_light = bpy.data.objects.new("KerniLensLight", lens_light_data)
    lens_light.location = KERNI_HOVER + Vector((0, -0.55, 0.1))
    link_to(lens_light, "Lights")
    lens_light_data.keyframe_insert("energy", frame=F_LENS_ON)
    lens_light_data.energy = 90.0
    lens_light_data.keyframe_insert("energy", frame=F_LENS_ON + 10)

    flood_data = bpy.data.lights.new("PlazaFlood", type="AREA")
    flood_data.color = (1.0, 0.72, 0.38)
    flood_data.energy = 0.0
    flood_data.size = 14.0
    flood = bpy.data.objects.new("PlazaFlood", flood_data)
    flood.location = (PLAZA_CENTER.x, PLAZA_CENTER.y, 10.0)
    flood.rotation_euler = Euler((0, 0, 0))
    link_to(flood, "Lights")
    flood_data.keyframe_insert("energy", frame=F_FLOOD_ON)
    flood_data.energy = 300.0
    flood_data.keyframe_insert("energy", frame=F_FLOOD_ON + 30)
    return kerni


def _sample_world_verts(objs: list[bpy.types.Object], count: int) -> list[Vector]:
    pool: list[Vector] = []
    for obj in objs:
        mw = obj.matrix_world
        for v in obj.data.vertices:
            pool.append(mw @ v.co)
    idx = list(range(len(pool)))
    RNG.shuffle(idx)
    return [pool[i] for i in idx[:count]]


N_PARTICLES = 210  # the drip law's number — restrained, hundreds not thousands


def build_particles() -> None:
    """210 copper embers: keyed by hand from raccoon surface → drift → orbit → lantern surface.

    Departure order follows the dissolve front (tail → nose, low y first), so each ember
    leaves exactly where the mesh is vanishing.
    """
    raccoon_objs = [
        bpy.data.objects[n] for n in ("RaccoonBody", "RaccoonHead", "RaccoonTail")
    ]
    bpy.context.view_layer.update()
    origins = _sample_world_verts(raccoon_objs, N_PARTICLES)
    kerni = bpy.data.objects["Kerni"]
    targets = _sample_world_verts([kerni], N_PARTICLES)

    order = sorted(range(N_PARTICLES), key=lambda i: origins[i].y)

    mats = []
    for i, strength in enumerate(
        (1.6, 2.2, 2.9)
    ):  # low: AgX keeps the copper hue, bloom adds glow
        tint = tuple(
            COPPER[c] * (1 - i * 0.18) + ORANGE[c] * i * 0.18 for c in range(3)
        )
        mats.append(emission_mat(f"Ember_{i}", tint, strength))
    meshes = []
    for i, mat in enumerate(mats):
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=1, radius=1.0, location=(0, 0, -50)
        )
        proto = bpy.context.active_object
        proto.name = f"EmberProto_{i}"
        proto.data.materials.append(mat)
        meshes.append(proto.data)
        bpy.data.objects.remove(proto, do_unlink=True)

    root = bpy.data.objects.new("EmberRoot", None)
    bpy.context.scene.collection.objects.link(root)
    link_to(root, "Embers")

    dissolve_span = F_DISSOLVE_END - F_DISSOLVE_START - 14
    for rank, i in enumerate(order):
        o = origins[i]
        t = targets[i]
        frac = rank / (N_PARTICLES - 1)
        depart = int(F_DISSOLVE_START + frac * dissolve_span + RNG.uniform(0, 6))
        arrive = int(F_REFORM_START + 8 + frac * 52 + RNG.uniform(0, 5))
        land = arrive + int(RNG.uniform(14, 22))

        obj = bpy.data.objects.new(f"Ember_{i:03d}", meshes[i % 3])
        bpy.context.scene.collection.objects.link(obj)
        link_to(obj, "Embers")
        obj.parent = root

        size = RNG.uniform(0.011, 0.018)
        # scale: pop in as the mesh vanishes, absorb on landing
        for frame, s in (
            (depart - 1, 0.0),
            (depart + 4, size),
            (land - 2, size * 0.8),
            (land + 8, 0.0),
        ):
            obj.scale = (s, s, s)
            obj.keyframe_insert("scale", frame=frame)

        drift1 = o + Vector(
            (
                RNG.uniform(-1.4, 1.4) - o.x * 0.35,
                RNG.uniform(3.5, 6.5),
                RNG.uniform(1.1, 2.1),
            )
        )
        mid = Vector(
            (RNG.uniform(-1.6, 1.6), RNG.uniform(24.0, 36.0), RNG.uniform(5.6, 8.4))
        )
        theta = RNG.uniform(0, 2 * math.pi)
        ring = KERNI_HOVER + Vector(
            (1.15 * math.cos(theta), 1.15 * math.sin(theta), RNG.uniform(-0.35, 0.35))
        )
        for frame, loc in (
            (depart, o),
            (depart + 26, drift1),
            ((depart + arrive) // 2 + 6, mid),
            (arrive, ring),
            (land, t),
        ):
            obj.location = loc
            obj.keyframe_insert("location", frame=frame)

    # the gathering swarm sheds a little real light before the lens takes over
    swarm_data = bpy.data.lights.new("SwarmGlow", type="POINT")
    swarm_data.color = COPPER
    swarm_data.energy = 0.0
    swarm_data.shadow_soft_size = 1.2
    swarm = bpy.data.objects.new("SwarmGlow", swarm_data)
    swarm.location = KERNI_HOVER
    link_to(swarm, "Lights")
    swarm_data.keyframe_insert("energy", frame=F_REFORM_START + 8)
    swarm_data.energy = 16.0
    swarm_data.keyframe_insert("energy", frame=F_LENS_ON - 4)
    swarm_data.energy = 4.0
    swarm_data.keyframe_insert("energy", frame=F_LENS_ON + 12)


def build_dissolve() -> None:
    """Tail→nose unravel: shared world-y weights drive one animated Mask per raccoon part."""
    objs = [bpy.data.objects[n] for n in ("RaccoonBody", "RaccoonHead", "RaccoonTail")]
    bpy.context.view_layer.update()
    all_y = [(obj.matrix_world @ v.co).y for obj in objs for v in obj.data.vertices]
    y_lo, y_hi = min(all_y), max(all_y)
    span = max(y_hi - y_lo, 1e-6)
    for obj in objs:
        group = obj.vertex_groups.new(name="dissolve")
        mw = obj.matrix_world
        for v in obj.data.vertices:
            w = ((mw @ v.co).y - y_lo) / span
            group.add([v.index], w, "REPLACE")
        mask = obj.modifiers.new("DissolveMask", "MASK")
        mask.vertex_group = "dissolve"
        mask.threshold = -0.01
        obj.keyframe_insert(
            'modifiers["DissolveMask"].threshold', frame=F_DISSOLVE_START
        )
        mask.threshold = 1.02
        obj.keyframe_insert('modifiers["DissolveMask"].threshold', frame=F_DISSOLVE_END)
    # the rim has nothing left to edge-light once the body is gone
    rim = bpy.data.lights["RaccoonRim"]
    rim.keyframe_insert("energy", frame=F_DISSOLVE_START + 40)
    rim.energy = 0.0
    rim.keyframe_insert("energy", frame=F_DISSOLVE_END)


def build_lamp_cascade() -> None:
    """Beat 5: seven lamps answer, one every 0.3 s, from Kerni outward (plaza → street start)."""
    lamps = sorted(
        (obj for obj in bpy.data.collections["Lamps"].objects if obj.type == "MESH"),
        key=lambda o: -o.location.y,
    )
    for i, lamp in enumerate(lamps):
        frame = int(F_LAMP_FIRST + i * 7.2)
        glow = next(
            (
                s.material
                for s in lamp.material_slots
                if s.material and s.material.name.startswith("LampGlow")
            ),
            None,
        )
        if glow is not None:
            sock = glow.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
            for f, s in ((frame - 1, 0.0), (frame + 2, 13.0), (frame + 7, 8.0)):
                sock.default_value = s
                sock.keyframe_insert("default_value", frame=f)
        light_data = bpy.data.lights.get(lamp.name.replace("Lamp_", "LampLight_"))
        if light_data is not None:
            for f, e in ((frame - 1, 0.0), (frame + 2, 110.0), (frame + 7, 72.0)):
                light_data.energy = e
                light_data.keyframe_insert("energy", frame=f)


def build_camera() -> None:
    """One continuous take. The camera keys carry the five beats; a tracked empty aims it."""
    perch = roof_perch()
    head_at = perch + Vector((0, 0.57, 0.84))  # skull position × the 1.5 root scale

    bpy.ops.object.camera_add(location=(0, 0, 0))
    cam = bpy.context.active_object
    cam.name = "IntroCam"
    cam.data.lens = 40
    cam.data.clip_end = 400
    bpy.context.scene.camera = cam
    target = bpy.data.objects.new("CamTarget", None)
    target.empty_display_size = 0.3
    bpy.context.scene.collection.objects.link(target)
    link_to(target, "Rig")
    link_to(cam, "Rig")
    track = cam.constraints.new("TRACK_TO")
    track.target = target
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"

    cam_keys = [
        (1, (1.8, 4.0, 2.45)),  # black; already framed on the rooftop, profile view
        (F_BEAT2, (1.7, 4.2, 2.5)),  # beat 2 opens
        (F_DISSOLVE_START, (0.4, 5.8, 3.05)),  # slow push-in ends at the ridge
        (240, (-0.2, 9.0, 4.1)),  # linger while the unravel runs
        (F_REFORM_START, (-0.6, 17.0, 6.6)),  # then track the particle stream
        (F_BEAT5, (0.9, 34.5, 4.6)),  # at the plaza, lantern reformation
        (FRAME_END, (0.0, 1.5, 11.5)),  # crane up + back: street sweep, sky above
    ]
    for frame, loc in cam_keys:
        cam.location = loc
        cam.keyframe_insert("location", frame=frame)

    frame_offset = Vector(
        (0.0, 0.9, 0.35)
    )  # gaze room toward the plaza, raccoon left third
    target_keys = [
        (1, head_at + frame_offset),
        (sec(8.6), head_at + frame_offset),  # hold through the first embers
        (250, Vector((-2.2, 13.0, 5.8))),  # release along the stream
        (F_REFORM_START, Vector((0.0, 31.0, 6.2))),  # mid-stream
        (sec(15.4), KERNI_HOVER),  # settle on the lantern
        (sec(18.0), KERNI_HOVER),
        (FRAME_END, Vector((0.0, 42.0, 4.0))),  # open up: street, plaza, sky
    ]
    for frame, loc in target_keys:
        target.location = loc
        target.keyframe_insert("location", frame=frame)


def build_title() -> None:
    """Calm end card, parented to the camera: cream small caps, no flare, no logo."""
    cam = bpy.data.objects["IntroCam"]
    try:
        font = bpy.data.fonts.load(
            r"C:\Windows\Fonts\bahnschrift.ttf", check_existing=True
        )
    except (RuntimeError, OSError):
        font = None  # Blender's built-in font still reads fine
    mat = emission_mat("TitleCream", CREAM, 0.0)

    def text_obj(name: str, body: str, size: float, y_local: float, spacing: float):
        curve = bpy.data.curves.new(name, type="FONT")
        curve.body = body
        curve.size = size
        curve.space_character = spacing
        curve.align_x = "CENTER"
        curve.align_y = "CENTER"
        if font is not None:
            curve.font = font
        obj = bpy.data.objects.new(name, curve)
        bpy.context.scene.collection.objects.link(obj)
        link_to(obj, "Title")
        obj.parent = cam
        obj.location = (0, y_local, -3.0)
        obj.data.materials.append(mat)
        obj.hide_render = True
        obj.keyframe_insert("hide_render", frame=1)
        obj.hide_render = False
        obj.keyframe_insert("hide_render", frame=F_TITLE_IN - 1)
        return obj

    text_obj("Title600", "600 BILLION", 0.24, 0.03, 1.12)
    text_obj("TitlePalace", "Palace of Culture", 0.085, -0.185, 1.3)
    sock = mat.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    sock.default_value = 0.0
    sock.keyframe_insert("default_value", frame=F_TITLE_IN - 1)
    sock.default_value = 2.2
    sock.keyframe_insert("default_value", frame=F_TITLE_IN + 16)


def _set_glare(node, name: str, value) -> None:
    sock = node.inputs.get(name) if hasattr(node, "inputs") else None
    if sock is not None and hasattr(sock, "default_value"):
        with suppress(TypeError):
            sock.default_value = value
            return
    attr = name.lower().replace(" ", "_")
    if hasattr(node, attr):
        setattr(node, attr, value)


def build_compositor() -> None:
    """Bloom for the embers/lamps + the black fades (in after the tick, out under the title)."""
    scene = bpy.context.scene
    scene.render.use_compositing = True
    if hasattr(
        scene, "compositing_node_group"
    ):  # Blender 5.x: the compositor is a node group
        tree = scene.compositing_node_group
        if tree is None:
            tree = bpy.data.node_groups.new("IntroComp", "CompositorNodeTree")
            scene.compositing_node_group = tree
    else:  # pre-5.x fallback
        scene.use_nodes = True
        tree = scene.node_tree
    tree.nodes.clear()
    if hasattr(tree, "interface"):
        with suppress(AttributeError, RuntimeError, TypeError):
            tree.interface.clear()
            tree.interface.new_socket(
                name="Image", in_out="OUTPUT", socket_type="NodeSocketColor"
            )
    rl = tree.nodes.new("CompositorNodeRLayers")
    glare = tree.nodes.new("CompositorNodeGlare")
    for name, values in (("Type", ("BLOOM", "Bloom")), ("Quality", ("HIGH", "High"))):
        sock = glare.inputs.get(name)
        if sock is not None:
            for value in values:
                with suppress(TypeError):
                    sock.default_value = value
                    break
    _set_glare(glare, "Threshold", 1.0)
    _set_glare(glare, "Strength", 0.5)
    _set_glare(glare, "Size", 0.55)
    _set_glare(glare, "Saturation", 1.0)

    mix = None
    for type_name in ("ShaderNodeMix", "CompositorNodeMixRGB"):
        with suppress(RuntimeError):
            mix = tree.nodes.new(type_name)
            break

    glare_in = glare.inputs.get("Image")
    glare_out = glare.outputs.get("Image")
    tree.links.new(rl.outputs["Image"], glare_in)

    if mix is not None and mix.bl_idname == "ShaderNodeMix":  # unified Mix (5.x)
        mix.data_type = "RGBA"
        fac = mix.inputs[0]
        mix.inputs[7].default_value = (0, 0, 0, 1)  # B = black
        tree.links.new(glare_out, mix.inputs[6])  # A = image
        out_sock = mix.outputs[2]
    elif mix is not None:  # legacy MixRGB
        fac = mix.inputs["Fac"]
        mix.inputs[2].default_value = (0, 0, 0, 1)
        tree.links.new(glare_out, mix.inputs[1])
        out_sock = mix.outputs["Image"]
    else:
        fac = None
        out_sock = glare_out

    comp = None
    for type_name in ("NodeGroupOutput", "CompositorNodeComposite"):
        with suppress(RuntimeError):
            comp = tree.nodes.new(type_name)
            break
    tree.links.new(out_sock, comp.inputs[0])

    if fac is not None:
        for frame, value in (
            (1, 1.0),
            (F_HORIZON_IN, 1.0),
            (84, 0.0),
            (F_FADE_OUT, 0.0),
            (FRAME_END, 1.0),
        ):
            fac.default_value = value
            fac.keyframe_insert("default_value", frame=frame)


def main() -> None:
    wipe_scene()
    setup_render()
    build_world()
    build_ground()
    build_street_set()
    build_lamps()
    build_moon()
    build_raccoon()
    build_kerni()
    build_particles()
    build_dissolve()
    build_lamp_cascade()
    build_camera()
    build_title()
    build_compositor()
    bpy.context.scene.frame_set(120)


main()

if (
    os.environ.get("INTRO_RENDER") == "1"
):  # headless: blender -b --python build_scene.py
    _scene = bpy.context.scene
    _out = ROOT / "tooling" / "intro-cinematic" / "_work" / "frames"
    _out.mkdir(parents=True, exist_ok=True)
    _scene.render.filepath = str(_out) + os.sep
    bpy.ops.render.render(animation=True)
