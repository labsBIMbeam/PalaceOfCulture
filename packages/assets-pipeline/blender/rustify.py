"""Batch rustic regrade — pull the mixed CC0 packs onto one muted frontier palette.

The street mixes three sources (Kenney tools, Quaternius nature, Poly Pizza props) whose
saturation and sheen clash. This pass grades every GLB in place, subtly: desaturate toward
luminance, dim slightly, force matte (high roughness, no metal). It touches Principled BSDF
colours, base-colour images (pixels, once per unique image) and vertex colours, so flat-colour
and textured packs land on the same palette. Geometry and node names stay untouched, so
`fitHeight` and growth manifests keep working.

Run: blender --factory-startup -b --python rustify.py -- <file-or-dir> [more...]
"""

import sys
from pathlib import Path

import bpy

DESAT = 0.18  # lerp toward luminance
DIM = 0.94  # value multiplier
ROUGH_MIN = 0.85
METAL_MAX = 0.15
LUM = (0.2126, 0.7152, 0.0722)


def grade_rgb(r: float, g: float, b: float) -> tuple[float, float, float]:
    """Desaturate toward luminance and dim — the shared grade for every colour source."""
    lum = r * LUM[0] + g * LUM[1] + b * LUM[2]
    return (
        (r + (lum - r) * DESAT) * DIM,
        (g + (lum - g) * DESAT) * DIM,
        (b + (lum - b) * DESAT) * DIM,
    )


def grade_image(img: bpy.types.Image) -> None:
    """Grade an image's pixels in place (numpy, keeps alpha)."""
    import numpy as np

    n = len(img.pixels)
    if n == 0:
        return
    px = np.empty(n, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    lum = px[:, 0] * LUM[0] + px[:, 1] * LUM[1] + px[:, 2] * LUM[2]
    for c in range(3):
        px[:, c] = (px[:, c] + (lum - px[:, c]) * DESAT) * DIM
    img.pixels.foreach_set(px.reshape(-1))
    img.update()


def grade_materials() -> int:
    """Grade every material's BSDF + base-colour images; returns graded material count."""
    seen_images: set[str] = set()
    count = 0
    for mat in bpy.data.materials:
        if not mat.use_nodes or not mat.node_tree:
            continue
        for node in mat.node_tree.nodes:
            if node.type != "BSDF_PRINCIPLED":
                continue
            base = node.inputs["Base Color"]
            r, g, b, a = base.default_value
            base.default_value = (*grade_rgb(r, g, b), a)
            rough = node.inputs["Roughness"]
            rough.default_value = max(rough.default_value, ROUGH_MIN)
            metal = node.inputs["Metallic"]
            metal.default_value = min(metal.default_value, METAL_MAX)
            for link in base.links:
                img = getattr(link.from_node, "image", None)
                if img and img.name not in seen_images:
                    seen_images.add(img.name)
                    grade_image(img)
            count += 1
    return count


def grade_vertex_colours() -> int:
    """Grade every mesh colour attribute in place; returns attribute count."""
    import numpy as np

    count = 0
    for mesh in bpy.data.meshes:
        for attr in mesh.color_attributes:
            n = len(attr.data) * 4
            if n == 0:
                continue
            px = np.empty(n, dtype=np.float32)
            attr.data.foreach_get("color", px)
            px = px.reshape(-1, 4)
            lum = px[:, 0] * LUM[0] + px[:, 1] * LUM[1] + px[:, 2] * LUM[2]
            for c in range(3):
                px[:, c] = (px[:, c] + (lum - px[:, c]) * DESAT) * DIM
            attr.data.foreach_set("color", px.reshape(-1))
            count += 1
    return count


def ensure_gltf() -> None:
    if hasattr(bpy.ops.import_scene, "gltf"):
        return
    for mod in ("io_scene_gltf2", "bl_ext.blender_org.io_scene_gltf2"):
        try:
            bpy.ops.preferences.addon_enable(module=mod)
        except Exception:  # noqa: BLE001 — addon id differs per Blender version
            pass


def rustify(path: Path) -> None:
    """Regrade one GLB in place."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ensure_gltf()
    bpy.ops.import_scene.gltf(filepath=str(path))
    mats = grade_materials()
    cols = grade_vertex_colours()
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format="GLB", use_selection=False
    )
    print(f"RUSTIFIED {path.name}: {mats} materials, {cols} colour attrs")


def main() -> None:
    argv = sys.argv
    rest = argv[argv.index("--") + 1 :] if "--" in argv else []
    files: list[Path] = []
    for arg in rest:
        p = Path(arg)
        files.extend(sorted(p.glob("*.glb")) if p.is_dir() else [p])
    for f in files:
        rustify(f)
    print(f"DONE {len(files)} files")


if __name__ == "__main__":
    main()
