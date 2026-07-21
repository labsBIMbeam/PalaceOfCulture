#!/usr/bin/env python3
"""Repack a join.600.wtf character GLB for the game: downscale textures to a web budget.

The character source GLBs on https://join.600.wtf/models/ carry full-resolution
(up to 4K) textures — 40+ MB per file. The game budget (mobile 30 FPS, fast first
load) wants <= 512 px textures. Geometry, rig, and clips pass through unchanged.

Run with:
  blender --background --python tooling/scripts/repack_join_character.py -- <in.glb> <out.glb> [max_px]
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import bpy

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("repack")


def parse_args(argv: list[str]) -> tuple[Path, Path, int]:
    """Read `<in.glb> <out.glb> [max_px]` from the args after Blender's `--`."""
    try:
        marker = argv.index("--")
    except ValueError:
        raise SystemExit(
            "usage: blender --background --python repack_join_character.py -- in.glb out.glb [max_px]"
        )
    args = argv[marker + 1 :]
    if len(args) < 2:
        raise SystemExit("need <in.glb> <out.glb>")
    max_px = int(args[2]) if len(args) > 2 else 512
    return Path(args[0]), Path(args[1]), max_px


def downscale_images(max_px: int) -> None:
    """Scale every packed image so its longest edge is at most max_px."""
    for image in bpy.data.images:
        width, height = image.size
        if max(width, height) <= max_px or width == 0:
            continue
        factor = max_px / max(width, height)
        new_size = (max(1, round(width * factor)), max(1, round(height * factor)))
        log.info("scaling %s: %dx%d -> %dx%d", image.name, width, height, *new_size)
        image.scale(*new_size)


def repack(source: Path, target: Path, max_px: int) -> None:
    """Import the GLB, downscale its textures, export it again (geometry untouched)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    downscale_images(max_px)
    target.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(target), export_format="GLB")
    log.info(
        "wrote %s (%.1f MB, from %.1f MB)",
        target,
        target.stat().st_size / 1e6,
        source.stat().st_size / 1e6,
    )


if __name__ == "__main__":
    src, dst, px = parse_args(sys.argv)
    repack(src, dst, px)
