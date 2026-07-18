"""Build the canonical static Kerni 3D workshop familiar and a deterministic QA render."""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
GLB_PATH = ROOT / "godot/assets/moc/kerni.glb"
BLEND_PATH = ROOT / "art/blender/kerni_3d.blend"
RENDER_PATH = ROOT / "docs/communications/assets/kerni/kerni_hero.png"


def mat(name: str, color: str, metallic: float, roughness: float, emission: str | None = None, strength: float = 0.0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = tuple(int(color[i:i+2], 16) / 255 for i in (0, 2, 4)) + (1.0,)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = material.diffuse_color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        rgba = tuple(int(emission[i:i+2], 16) / 255 for i in (0, 2, 4)) + (1.0,)
        bsdf.inputs["Emission Color"].default_value = rgba
        bsdf.inputs["Emission Strength"].default_value = strength
    return material


def assign(obj, material):
    obj.data.materials.append(material)
    return obj


def sphere(name, location, scale, material, segments=40, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, material)
    bpy.ops.object.shade_smooth()
    return obj


def torus(name, location, major, minor, material, rotation=(0.0, 0.0, 0.0), major_segments=48, minor_segments=10):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign(obj, material)
    bpy.ops.object.shade_smooth()
    return obj


def cylinder_between(name, start, end, radius, material, vertices=16):
    a, b = Vector(start), Vector(end)
    delta = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=delta.length, location=(a + b) * 0.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(delta.normalized())
    assign(obj, material)
    bpy.ops.object.shade_smooth()
    return obj


def cone_between(name, start, end, radius, material):
    a, b = Vector(start), Vector(end)
    delta = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=radius, radius2=radius * 0.25, depth=delta.length, location=(a + b) * 0.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(delta.normalized())
    assign(obj, material)
    bpy.ops.object.shade_smooth()
    return obj


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
obsidian = mat("Kerni_ObsidianCeramic", "070a12", 0.18, 0.36)
copper = mat("Kerni_WornCopper", "a95c32", 0.72, 0.3)
dark_copper = mat("Kerni_DarkCopper", "4b2d27", 0.65, 0.38)
amber = mat("Kerni_AmberLens", "5e2606", 0.12, 0.22, "ff7a18", 3.0)
cyan = mat("Kerni_CyanDiagnostic", "082b35", 0.25, 0.18, "4cecff", 7.0)
charcoal = mat("Kerni_ToolCharcoal", "222632", 0.58, 0.32)

root = bpy.data.objects.new("Kerni3D", None)
scene.collection.objects.link(root)
parts = []
parts.append(sphere("Kerni_Body", (0, 0, 1.85), (1.05, 0.84, 1.0), obsidian, 48, 24))
parts.append(torus("Kerni_CopperEquator", (0, 0, 1.82), 0.98, 0.075, copper))
parts.append(torus("Kerni_RepairMeridian", (0, 0, 1.84), 0.94, 0.05, dark_copper, rotation=(math.pi / 2, 0, 0)))
parts.append(torus("Kerni_AntigravRing", (0, 0, 0.73), 0.62, 0.055, cyan, major_segments=56))
parts.append(cylinder_between("Kerni_LensNeck", (0, -0.72, 1.95), (0, -0.94, 1.95), 0.36, dark_copper, 32))
parts.append(torus("Kerni_LensBezel", (0, -1.01, 1.95), 0.39, 0.075, copper, rotation=(math.pi / 2, 0, 0), major_segments=48))
parts.append(sphere("Kerni_AmberEye", (0, -1.02, 1.95), (0.34, 0.12, 0.34), amber, 40, 20))
parts.append(sphere("Kerni_CyanGlint", (0.13, -1.145, 2.08), (0.065, 0.035, 0.065), cyan, 20, 10))
parts.append(torus("Kerni_FoldedRepairLoop", (0.5, 0.56, 2.48), 0.30, 0.035, copper, rotation=(1.0, 0.25, 0.6), major_segments=40, minor_segments=8))

# Three folded tool-arms: useful workshop gestures, not weapons.
arm_paths = [
    [(-0.88, -0.12, 2.25), (-1.28, -0.38, 1.92), (-1.08, -0.68, 1.55)],
    [(0.88, -0.12, 2.25), (1.30, -0.30, 1.90), (1.12, -0.66, 1.52)],
    [(0.72, 0.42, 1.48), (1.02, 0.72, 1.20), (0.72, 0.84, 0.96)],
]
for arm_index, points in enumerate(arm_paths, start=1):
    for joint_index, point in enumerate(points):
        parts.append(sphere(f"Kerni_Arm{arm_index}_Joint{joint_index+1}", point, (0.12, 0.12, 0.12), copper, 20, 10))
    parts.append(cylinder_between(f"Kerni_Arm{arm_index}_Upper", points[0], points[1], 0.075, dark_copper))
    parts.append(cylinder_between(f"Kerni_Arm{arm_index}_Lower", points[1], points[2], 0.065, copper))

# Drafting compass on the left, repair probe on the right, folded clamp behind.
parts.append(cylinder_between("Kerni_CompassLegA", (-1.08, -0.68, 1.55), (-1.28, -0.76, 1.14), 0.035, charcoal, 12))
parts.append(cylinder_between("Kerni_CompassLegB", (-1.08, -0.68, 1.55), (-0.91, -0.78, 1.12), 0.035, charcoal, 12))
parts.append(cone_between("Kerni_RepairProbe", (1.12, -0.66, 1.52), (1.18, -0.92, 1.22), 0.075, copper))
parts.append(torus("Kerni_FoldedClamp", (0.72, 0.84, 0.92), 0.17, 0.035, copper, rotation=(math.pi / 2, 0, 0), major_segments=28, minor_segments=8))

for obj in parts:
    obj.parent = root
    obj["kerni_role"] = "art_only"
    obj["authority"] = "none"
root["identity"] = "Kerni"
root["world_agent_contract"] = "suggestion_only"

GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format="GLB",
    export_extras=True,
    export_apply=True,
    use_active_scene=True,
)

# QA stage is not saved/exported.
world = bpy.data.worlds.new("Kerni_QA_World")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.018, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.2
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(RENDER_PATH)
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0.0

bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=2.1, depth=0.18, location=(0, 0, 0.15))
plinth = bpy.context.object
assign(plinth, obsidian)
torus("Kerni_QA_Ring", (0, 0, 0.28), 1.68, 0.035, cyan, major_segments=72, minor_segments=8)

for name, loc, energy, color, size in [
    ("Key", (-4, -5, 6), 900, (1.0, 0.52, 0.26), 4.0),
    ("Fill", (4, -3, 3), 320, (0.22, 0.65, 1.0), 3.0),
    ("Rim", (0, 4, 5), 700, (0.18, 0.78, 1.0), 3.0),
]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    light.location = loc
    scene.collection.objects.link(light)
    look_at(light, (0, 0, 1.7))

camera_data = bpy.data.cameras.new("Kerni_QA_Camera")
camera = bpy.data.objects.new("Kerni_QA_Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (4.7, -7.2, 3.8)
camera.data.lens = 60
look_at(camera, (0, 0, 1.65))
scene.camera = camera
bpy.ops.render.render(write_still=True)

mesh_objects = [obj for obj in parts if obj.type == "MESH"]
polys = sum(len(obj.data.polygons) for obj in mesh_objects)
print(f"KERNI_BUILD meshes={len(mesh_objects)} polys={polys} glb={GLB_PATH} blend={BLEND_PATH} render={RENDER_PATH}")
