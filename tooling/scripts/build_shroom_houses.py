#!/usr/bin/env python3
"""Build three original low-poly mushroom buildings for Locktard Street.

Run with:
  blender --background --python tooling/scripts/build_shroom_houses.py

The geometry is authored procedurally for Palace of Culture. No external mesh,
texture, or paid generation service is used.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "apps/web/public/buildings"
OUTPUT.mkdir(parents=True, exist_ok=True)


def material(name: str, color: tuple[float, float, float, float], *, metallic=0.0, roughness=0.8, emission=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = 2.2
    return mat


CREAM = material("stem_plaster", (0.68, 0.54, 0.35, 1), roughness=0.95)
MINT = material("mint_plaster", (0.20, 0.48, 0.42, 1), roughness=0.9)
LILAC = material("lilac_plaster", (0.36, 0.30, 0.55, 1), roughness=0.9)
WOOD = material("warm_wood", (0.20, 0.07, 0.025, 1), roughness=0.9)
WOOD_LIGHT = material("light_wood", (0.43, 0.19, 0.06, 1), roughness=0.88)
COPPER = material("aged_copper", (0.34, 0.12, 0.035, 1), metallic=0.72, roughness=0.38)
STONE = material("street_stone", (0.25, 0.27, 0.29, 1), roughness=1)
RED = material("workshop_cap", (0.47, 0.045, 0.025, 1), roughness=0.78)
TEAL = material("tea_cap", (0.035, 0.42, 0.43, 1), roughness=0.72)
INDIGO = material("relay_cap", (0.12, 0.06, 0.36, 1), roughness=0.7)
SPOT = material("cap_spots", (0.82, 0.68, 0.40, 1), roughness=0.9)
GLOW = material("window_glow", (1.0, 0.47, 0.10, 1), roughness=0.25, emission=(1.0, 0.20, 0.025, 1))
CYAN_GLOW = material("relay_glow", (0.10, 0.75, 0.9, 1), roughness=0.25, emission=(0.03, 0.45, 0.8, 1))
GREEN = material("moss", (0.10, 0.28, 0.08, 1), roughness=1)


def assign(obj, mat):
    obj.data.materials.append(mat)
    return obj


def smooth(obj):
    if hasattr(obj.data, "polygons"):
        for poly in obj.data.polygons:
            poly.use_smooth = True
    return obj


def cube(name, loc, scale, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    if bevel:
        mod = obj.modifiers.new("soft_edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
    return obj


def cylinder(name, loc, radius, depth, mat, vertices=16, rotation=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    return obj


def sphere(name, loc, scale, mat, segments=24, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    return smooth(obj)


def torus(name, loc, major, minor, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=20, minor_segments=6, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    return smooth(obj)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def add_base(body_mat, cap_mat, *, cap_scale=(2.8, 2.55, 0.78), body_scale=(1.55, 1.45), cap_z=4.0):
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=body_scale[0], radius2=body_scale[1], depth=3.35, location=(0, 0, 1.675))
    stem = bpy.context.object
    stem.name = "organic_plaster_stem"
    assign(stem, body_mat)
    smooth(stem)
    cap = sphere("mushroom_cap", (0, 0, cap_z), cap_scale, cap_mat, segments=32, rings=16)
    torus("cap_underside_rim", (0, 0, cap_z - 0.42), cap_scale[0] * 0.78, 0.12, SPOT)
    # Uneven cap freckles — broad motifs, deliberately not matching the reference layout.
    for i, (x, y, z, s) in enumerate([
        (-1.1, -0.75, cap_z + 0.52, 0.22),
        (0.85, -0.95, cap_z + 0.42, 0.18),
        (1.25, 0.15, cap_z + 0.38, 0.25),
        (-0.3, 0.8, cap_z + 0.63, 0.16),
        (0.15, -0.25, cap_z + 0.75, 0.20),
    ]):
        sphere(f"cap_freckle_{i}", (x, y, z), (s * 1.3, s, s * 0.35), SPOT, segments=12, rings=6)
    # Cobble footing.
    for i in range(12):
        a = i / 12 * math.tau
        r = 1.48 + 0.08 * math.sin(i * 2.1)
        cylinder(f"foundation_stone_{i}", (math.cos(a) * r, math.sin(a) * r, 0.11), 0.28, 0.22, STONE, vertices=7, scale=(1.3, 0.8, 1))
    # Round door facing -Y, plus radial-ish timber slats.
    cylinder("round_door", (0, -1.47, 1.42), 0.84, 0.16, WOOD, vertices=24, rotation=(math.pi / 2, 0, 0), scale=(0.9, 1.18, 1))
    torus("door_copper_frame", (0, -1.57, 1.42), 0.83, 0.07, COPPER, rotation=(math.pi / 2, 0, 0))
    for x in (-0.42, -0.14, 0.14, 0.42):
        cube("door_plank", (x, -1.57, 1.42), (0.025, 0.04, 0.72), WOOD_LIGHT, bevel=0.015)
    sphere("door_handle", (0.47, -1.69, 1.42), (0.08, 0.05, 0.08), COPPER, segments=12, rings=6)
    # Two warm porthole windows.
    for side in (-1, 1):
        x = side * 1.17
        cylinder("round_window", (x, -0.96, 2.18), 0.36, 0.10, GLOW, vertices=20, rotation=(math.pi / 2, 0, 0))
        torus("window_frame", (x, -1.03, 2.18), 0.37, 0.055, COPPER, rotation=(math.pi / 2, 0, 0))
        cube("window_mullion", (x, -1.09, 2.18), (0.025, 0.025, 0.31), COPPER)
    return stem, cap


def add_workshop():
    add_base(CREAM, RED, cap_scale=(2.85, 2.55, 0.78))
    # Crooked forge chimney and exposed copper utility line.
    cylinder("brick_chimney", (1.25, 0.62, 4.75), 0.32, 2.6, WOOD_LIGHT, vertices=8, rotation=(0.04, -0.12, 0))
    torus("chimney_cap", (1.25, 0.62, 6.02), 0.34, 0.08, COPPER)
    cylinder("utility_pipe", (-1.35, 0.2, 1.75), 0.09, 2.6, COPPER, vertices=10)
    torus("pressure_gauge", (-1.35, -0.04, 2.65), 0.28, 0.06, COPPER, rotation=(math.pi / 2, 0, 0))
    cube("workbench", (-1.9, -1.15, 0.65), (0.75, 0.32, 0.12), WOOD_LIGHT, bevel=0.05)
    for x in (-2.45, -1.35):
        cube("bench_leg", (x, -1.15, 0.32), (0.08, 0.08, 0.32), WOOD)


def add_tea_house():
    add_base(MINT, TEAL, cap_scale=(3.05, 2.75, 0.68), body_scale=(1.68, 1.55), cap_z=3.9)
    # Cloth-and-timber tea awning with hanging glowcaps.
    cube("tea_awning", (0, -1.92, 2.55), (1.35, 0.48, 0.10), SPOT, bevel=0.08)
    for x in (-1.12, 1.12):
        cylinder("awning_post", (x, -2.05, 1.25), 0.07, 2.5, WOOD, vertices=8)
        sphere("hanging_glowcap", (x, -2.05, 2.25), (0.18, 0.18, 0.12), GLOW, segments=12, rings=6)
    cylinder("tea_table", (2.05, -1.25, 0.66), 0.72, 0.14, WOOD_LIGHT, vertices=16)
    cylinder("tea_table_leg", (2.05, -1.25, 0.34), 0.11, 0.62, WOOD, vertices=10)
    for x in (1.48, 2.62):
        cylinder("tea_stool", (x, -1.25, 0.35), 0.28, 0.46, WOOD_LIGHT, vertices=10)


def add_relay_hut():
    add_base(LILAC, INDIGO, cap_scale=(2.65, 2.45, 0.82), body_scale=(1.45, 1.38), cap_z=4.05)
    # Copper relay mast: abstract network/communication motif, no logos.
    cylinder("relay_mast", (0.35, 0.35, 6.0), 0.085, 3.6, COPPER, vertices=10)
    for z, radius in ((5.25, 0.55), (5.9, 0.78), (6.55, 0.46)):
        torus("relay_ring", (0.35, 0.35, z), radius, 0.045, CYAN_GLOW, rotation=(0.2, 0.1, 0))
    sphere("relay_beacon", (0.35, 0.35, 7.78), (0.18, 0.18, 0.18), CYAN_GLOW, segments=16, rings=8)
    # Cable spool and message hatch.
    cylinder("cable_spool", (-1.55, -1.0, 0.55), 0.42, 0.52, COPPER, vertices=12, rotation=(math.pi / 2, 0, 0))
    torus("cable_coil", (-1.55, -1.3, 0.55), 0.32, 0.06, CYAN_GLOW, rotation=(math.pi / 2, 0, 0))
    cube("message_hatch", (1.05, -1.28, 1.0), (0.34, 0.08, 0.26), COPPER, bevel=0.05)


def export(name: str, builder):
    clear_scene()
    builder()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / f"{name}.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )


export("shroom_workshop", add_workshop)
export("glowcap_tea_house", add_tea_house)
export("mycelium_relay_hut", add_relay_hut)
print(f"Wrote 3 original shroom buildings to {OUTPUT}")
