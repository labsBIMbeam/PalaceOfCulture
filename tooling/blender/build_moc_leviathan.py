"""Build the MoC Leviathan as 36 deterministic, data-addressable modules and render QA views."""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BLEND_OUT = ROOT / "art" / "blender" / "moc_leviathan.blend"
GLB_OUT = ROOT / "godot" / "assets" / "moc" / "leviathan.glb"
PREVIEW_DIR = ROOT / "docs" / "communications" / "assets" / "moc_leviathan"


def material(name: str, color: str, metallic: float, roughness: float, emission: str | None = None, energy: float = 0.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = tuple(int(color[i : i + 2], 16) / 255.0 for i in (0, 2, 4)) + (1.0,)
    mat.metallic = metallic
    mat.roughness = roughness
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = mat.diffuse_color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        glow = tuple(int(emission[i : i + 2], 16) / 255.0 for i in (0, 2, 4)) + (1.0,)
        bsdf.inputs["Emission Color"].default_value = glow
        bsdf.inputs["Emission Strength"].default_value = energy
    return mat


def apply_bevel(obj: bpy.types.Object, width: float = 0.18, segments: int = 2) -> None:
    bevel = obj.modifiers.new("Built edge", "BEVEL")
    bevel.width = width
    bevel.segments = segments
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)


def box(location: tuple[float, float, float], size: tuple[float, float, float], mat: bpy.types.Material, bevel: float = 0.15) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.scale = Vector(size) / 2.0
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        apply_bevel(obj, min(bevel, min(size) * 0.2))
    obj.data.materials.append(mat)
    return obj


def cylinder(location: tuple[float, float, float], radius: float, depth: float, mat: bpy.types.Material, rotation: tuple[float, float, float] = (0, 0, 0), vertices: int = 16) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.data.materials.append(mat)
    apply_bevel(obj, min(0.14, radius * 0.12), 2)
    return obj


def torus(location: tuple[float, float, float], major: float, minor: float, mat: bpy.types.Material, rotation: tuple[float, float, float] = (0, 0, 0), major_segments: int = 24) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=major_segments, minor_segments=8, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.data.materials.append(mat)
    return obj


def sphere(location: tuple[float, float, float], scale: tuple[float, float, float], mat: bpy.types.Material, segments: int = 20) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=10, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def cone_x(location: tuple[float, float, float], radius: float, depth: float, mat: bpy.types.Material, vertices: int = 20) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=0.05, depth=depth, location=location, rotation=(0, math.pi / 2, 0))
    obj = bpy.context.object
    obj.data.materials.append(mat)
    return obj


def join_module(slot: int, slug: str, role: str, parts: list[bpy.types.Object]) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = parts[0]
    obj.name = f"MOC_{slot:02d}_{slug}"
    obj["moc_slot"] = slot
    obj["moc_role"] = role
    obj["moc_authority"] = "human_commit_only"
    return obj


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def build() -> list[bpy.types.Object]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    if scene.world is None:
        scene.world = bpy.data.worlds.new("MoC Void")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.012, 0.018, 0.04, 1.0)
    bg.inputs["Strength"].default_value = 0.38

    obsidian = material("MOC Obsidian Hull", "22283a", 0.68, 0.3)
    iron = material("MOC Warm Iron", "3e465a", 0.62, 0.34)
    copper = material("MOC Copper Bones", "c87845", 0.78, 0.27)
    cream = material("MOC Handbuilt Ceramic", "eadbc0", 0.22, 0.5)
    cyan = material("MOC Culture Core", "10364b", 0.38, 0.19, "48dcff", 7.5)
    coral = material("MOC Human Signal", "4b172b", 0.35, 0.24, "ff4f9d", 6.0)
    amber = material("MOC Hearth", "4e2e10", 0.4, 0.3, "ffae42", 5.0)
    garden = material("MOC Night Garden", "0d3328", 0.25, 0.48, "46e7a4", 2.8)
    future = material("MOC Open Socket", "101421", 0.8, 0.22, "7158ff", 2.0)

    modules: list[bpy.types.Object] = []
    modules.append(join_module(1, "Keel", "structure", [box((0, 0, -2.2), (45, 1.4, 1.3), iron, 0.25), box((-2, 0, -3.2), (32, 0.45, 1.0), cyan, 0.1)]))
    modules.append(join_module(2, "HullFore", "structure", [box((13, 0, 0), (18, 11, 5.6), obsidian, 1.0)]))
    modules.append(join_module(3, "HullMid", "structure", [box((-1, 0, 0), (12, 13.5, 7.2), obsidian, 1.2)]))
    modules.append(join_module(4, "HullAft", "structure", [box((-13, 0, 0), (13, 12, 6.4), obsidian, 1.0)]))
    modules.append(join_module(5, "ArkBow", "structure", [cone_x((26, 0, 0), 5.5, 12.0, iron), torus((20.5, 0, 0), 5.2, 0.28, copper, (0, math.pi / 2, 0))]))
    modules.append(join_module(6, "CultureCore", "energy", [sphere((0, 0, 0.2), (4.0, 4.0, 4.0), cyan), torus((0, 0, 0.2), 5.2, 0.35, copper, (0, math.pi / 2, 0)), torus((0, 0, 0.2), 4.6, 0.18, coral, (math.pi / 2, 0, 0))]))

    for idx, x in enumerate((-15.5, -7.8, 7.8, 15.5), start=7):
        modules.append(join_module(idx, f"Rib{x:+.0f}", "structure", [torus((x, 0, 0), 6.8 if abs(x) < 10 else 6.0, 0.34, copper, (0, math.pi / 2, 0)), box((x, 0, 4.7), (0.5, 7.5, 0.5), iron, 0.1)]))

    engine_positions = [(-22.5, -4.1, -1.6), (-22.5, 4.1, -1.6), (-22.5, -3.0, 3.0), (-22.5, 3.0, 3.0)]
    for idx, pos in enumerate(engine_positions, start=11):
        modules.append(join_module(idx, f"HearthEngine{idx-10}", "energy", [cylinder(pos, 2.0, 3.0, iron, (0, math.pi / 2, 0)), torus((-24.1, pos[1], pos[2]), 1.55, 0.32, amber, (0, math.pi / 2, 0))]))

    modules.append(join_module(15, "CommonsDeck", "habitat", [box((5, 0, 4.3), (13, 8.5, 1.2), cream, 0.45), box((5, 0, 5.2), (7, 5.0, 0.5), amber, 0.16)]))
    modules.append(join_module(16, "Archive", "habitat", [box((11, -4.7, 2.8), (7, 2.3, 4.2), iron, 0.45), *[box((11 + dx, -5.95, 3.0), (0.35, 0.2, 2.4), cyan, 0.05) for dx in (-2.3, -1.1, 0, 1.1, 2.3)]]))
    modules.append(join_module(17, "Garden", "habitat", [sphere((10, 4.8, 3.1), (3.5, 2.1, 2.4), garden), torus((10, 4.8, 3.1), 3.0, 0.18, copper, (math.pi / 2, 0, 0))]))
    modules.append(join_module(18, "Kitchen", "habitat", [box((-8, -4.9, 2.5), (7, 2.6, 3.5), cream, 0.5), cylinder((-8, -5.0, 5.1), 0.6, 3.2, copper)]))
    modules.append(join_module(19, "Studio", "signal", [box((-7.5, 4.8, 2.6), (7.5, 2.6, 3.7), iron, 0.55), torus((-7.5, 6.2, 2.8), 1.25, 0.18, coral, (math.pi / 2, 0, 0))]))
    modules.append(join_module(20, "Playroom", "habitat", [sphere((17.2, 0, 3.8), (3.2, 3.2, 2.0), coral), box((17.2, 0, 2.2), (5.2, 5.2, 0.6), cream, 0.2)]))
    modules.append(join_module(21, "HabitatRing", "habitat", [torus((1.5, 0, 0), 8.6, 0.72, cream, (0, math.pi / 2, 0), 32), torus((1.5, 0, 0), 7.4, 0.15, cyan, (0, math.pi / 2, 0), 32)]))
    modules.append(join_module(22, "Bridge", "signal", [box((18, 0, 5.3), (7.2, 6.0, 2.2), iron, 0.7), box((19.0, 0, 6.3), (3.7, 5.2, 0.18), cyan, 0.04)]))
    modules.append(join_module(23, "SignalMast", "signal", [cylinder((8, 0, 9.0), 0.32, 8.0, copper), torus((8, 0, 12.6), 1.8, 0.18, cyan, (math.pi / 2, 0, 0))]))
    modules.append(join_module(24, "StoryDish", "signal", [sphere((2, 0, 8.4), (2.7, 2.7, 0.55), cream), cylinder((2, 0, 6.4), 0.25, 3.0, copper)]))
    modules.append(join_module(25, "SailPort", "energy", [box((-3, -10, 1.5), (17, 0.35, 8.5), iron, 0.28), *[box((x, -10.3, 1.5), (0.18, 0.12, 7.5), cyan, 0.03) for x in (-9, -6, -3, 0, 3)]]))
    modules.append(join_module(26, "SailStarboard", "energy", [box((-3, 10, 1.5), (17, 0.35, 8.5), iron, 0.28), *[box((x, 10.3, 1.5), (0.18, 0.12, 7.5), coral, 0.03) for x in (-9, -6, -3, 0, 3)]]))
    modules.append(join_module(27, "LandingSpine", "structure", [box((-2, -5.2, -4.5), (22, 0.8, 1.1), copper, 0.2), box((-2, 5.2, -4.5), (22, 0.8, 1.1), copper, 0.2)]))
    modules.append(join_module(28, "MemoryHalo", "signal", [torus((0, 0, 0), 10.7, 0.22, coral, (0, math.pi / 2, 0), 40)]))
    modules.append(join_module(29, "FutureSockets", "structure", [*[torus((x, y, z), 1.05, 0.18, future, (0, math.pi / 2, 0)) for x, y, z in ((-17,-7,3),(-17,7,3),(-10,-7,6),(-10,7,6),(8,-7,7),(8,7,7))]]))
    modules.append(join_module(30, "CommissionFrame", "structure", [torus((-2, 0, 0), 12.0, 0.28, copper, (0, math.pi / 2, 0), 48), box((-2, 0, 12), (0.6, 16, 0.6), iron, 0.1)]))

    future_specs = [
        (31, "Amphitheatre", "habitat", (-17, -7, 3), cream),
        (32, "MemeFoundry", "signal", (-17, 7, 3), coral),
        (33, "MusicRoom", "signal", (-10, -7, 6), cyan),
        (34, "NightGarden", "habitat", (-10, 7, 6), garden),
        (35, "WorkshopBay", "structure", (8, -7, 7), copper),
        (36, "OpenFuture", "signal", (8, 7, 7), future),
    ]
    for slot, slug, role, pos, mat in future_specs:
        modules.append(join_module(slot, slug, role, [sphere(pos, (1.25, 1.25, 1.25), mat), torus(pos, 1.55, 0.16, copper, (0, math.pi / 2, 0))]))

    root = bpy.data.objects.new("MOC_Leviathan_Assembly", None)
    bpy.context.scene.collection.objects.link(root)
    for obj in modules:
        obj.parent = root

    # Ground/stage is excluded from GLB selection but retained in the .blend QA source.
    stage = cylinder((0, 0, -7.0), 18.0, 0.8, obsidian, vertices=64)
    stage.name = "QA_Assembly_Plinth"
    stage.hide_render = False
    for r in (13.0, 16.2):
        ring = torus((0, 0, -6.55), r, 0.08, cyan, major_segments=64)
        ring.name = "QA_LightRing"

    return modules


def add_qa_lighting_and_render(modules: list[bpy.types.Object]) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 1.1

    def area(name: str, location: tuple[float, float, float], color: tuple[float, float, float], energy: float, size: float) -> None:
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        obj.location = location
        look_at(obj, Vector((0, 0, 0)))
        scene.collection.objects.link(obj)

    area("Key Copper", (35, -45, 45), (1.0, 0.43, 0.22), 3200, 20)
    area("Rim Cyan", (-35, 35, 28), (0.12, 0.72, 1.0), 2800, 18)
    area("Soft Fill", (0, -38, 28), (0.42, 0.52, 1.0), 3600, 24)
    area("Top Shape", (0, 5, 58), (0.66, 0.5, 1.0), 2400, 24)

    # Three tiny workshop figures provide an immediate human scale cue in QA renders.
    people_mat = bpy.data.materials.get("MOC Human Signal")
    for index, pos in enumerate(((4, -15, -5.8), (7, -15, -5.8), (10, -15, -5.8)), start=1):
        body = cylinder((pos[0], pos[1], pos[2] + 0.9), 0.24, 1.45, people_mat, vertices=10)
        head = sphere((pos[0], pos[1], pos[2] + 1.85), (0.34, 0.34, 0.34), people_mat, 12)
        body.name = f"QA_Person_{index}_Body"
        head.name = f"QA_Person_{index}_Head"

    # Tuesday's authored image is 30 contributors, not a falsely completed ship.
    for module in modules:
        module.hide_render = int(module.get("moc_slot", 0)) > 30

    camera_data = bpy.data.cameras.new("Hero Camera")
    camera = bpy.data.objects.new("Hero Camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.lens = 55

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    views = {
        "hero": ((66, -68, 38), (0, 0, 1)),
        "side": ((4, -92, 20), (0, 0, 0)),
        "bow": ((72, -8, 12), (5, 0, 0)),
    }
    for name, (location, target) in views.items():
        camera.location = location
        look_at(camera, Vector(target))
        scene.render.filepath = str(PREVIEW_DIR / f"leviathan_{name}.png")
        bpy.ops.render.render(write_still=True)

    BLEND_OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT))

    # Export from a temporary scene containing only the 36 immutable runtime modules. This avoids
    # Blender's selected-parent traversal pulling a stray helper mesh into the GLB.
    export_scene = bpy.data.scenes.new("MOC_RUNTIME_EXPORT")
    for obj in modules:
        duplicate = obj.copy()
        duplicate.data = obj.data.copy()
        duplicate.parent = None
        duplicate.hide_render = False
        duplicate.hide_viewport = False
        export_scene.collection.objects.link(duplicate)
    bpy.context.window.scene = export_scene
    GLB_OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_OUT),
        export_format="GLB",
        export_extras=True,
        export_apply=True,
        use_active_scene=True,
    )
    bpy.context.window.scene = scene
    bpy.data.scenes.remove(export_scene)


if __name__ == "__main__":
    built_modules = build()
    assert len(built_modules) == 36, len(built_modules)
    add_qa_lighting_and_render(built_modules)
    print(f"MOC_LEVIATHAN_OK modules={len(built_modules)} glb={GLB_OUT} blend={BLEND_OUT}")
