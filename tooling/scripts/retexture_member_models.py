#!/usr/bin/env python3
"""Transplant the newest character textures onto the rigged in-game member models.

The branding workspace (600BillionCWO/00_branding/avatars/characters) produces
`<id>_simple_exact_3view_hd.glb` per character: the SAME mesh/UVs the game rig uses,
carrying the newest HD texture set — but unrigged. The game models
(apps/web/public/avatar/imported/<id>.glb) carry the rig + idle/walk/run clips with
the previous textures. This script merges the two: the game rig keeps its skeleton
and clips, and wears the new material with textures downscaled to the web budget.

A mesh guard (identical polygon count) skips any character whose retexture does not
match the rigged mesh — those keep their current look and are reported.

Run with:
  blender --background --python tooling/scripts/retexture_member_models.py -- \
    <workspace_characters_dir> <game_imported_dir> [max_px] [id ...]
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import bpy

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("retexture")

# Game model id -> branding workspace folder where the slugs differ.
ID_TO_WORKSPACE = {"madmunkey": "madmunky"}
# Game files that are not member characters or have no workspace source.
SKIP_IDS = {"placeholder"}


def parse_args(argv: list[str]) -> tuple[Path, Path, int, list[str]]:
    """Read `<workspace_dir> <game_dir> [max_px] [id ...]` after Blender's `--`."""
    try:
        marker = argv.index("--")
    except ValueError:
        raise SystemExit(
            "usage: blender --background --python retexture_member_models.py -- workspace game [max_px] [ids]"
        )
    args = argv[marker + 1 :]
    if len(args) < 2:
        raise SystemExit("need <workspace_characters_dir> <game_imported_dir>")
    max_px = int(args[2]) if len(args) > 2 else 512
    return Path(args[0]), Path(args[1]), max_px, args[3:]


def newest_retexture(workspace: Path, char_id: str) -> Path | None:
    """The newest `*simple_exact_3view_hd.glb` for a character, or None."""
    folder = workspace / ID_TO_WORKSPACE.get(char_id, char_id)
    candidates = sorted(
        folder.glob("3d/*/*simple_exact_3view_hd.glb"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return candidates[0] if candidates else None


def import_objects(filepath: Path) -> list[bpy.types.Object]:
    """Import a glTF file and return the newly added objects."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(filepath))
    return [o for o in bpy.data.objects if o not in before]


def downscale_images(max_px: int) -> None:
    """Scale every image so its longest edge is at most max_px."""
    for image in bpy.data.images:
        width, height = image.size
        if max(width, height) <= max_px or width == 0:
            continue
        factor = max_px / max(width, height)
        image.scale(max(1, round(width * factor)), max(1, round(height * factor)))


def stash_clips(armature: bpy.types.Object) -> None:
    """Push every action onto its own NLA track so the exporter emits all clips."""
    if armature.animation_data is None:
        armature.animation_data_create()
    armature.animation_data.action = None
    for action in bpy.data.actions:
        track = armature.animation_data.nla_tracks.new()
        track.name = action.name
        track.strips.new(action.name, max(0, int(action.frame_range[0])), action)


def retexture_one(game_glb: Path, retex_glb: Path, target: Path, max_px: int) -> bool:
    """Rebuild one member model: game rig + newest material. Returns success."""
    bpy.ops.wm.read_factory_settings(use_empty=True)

    game_objects = import_objects(game_glb)
    armatures = [o for o in game_objects if o.type == "ARMATURE"]
    # The importer adds helper meshes (bone display icospheres) — the character is the skinned mesh.
    rigged = [
        o
        for o in game_objects
        if o.type == "MESH"
        and (
            any(m.type == "ARMATURE" for m in o.modifiers)
            or (o.parent and o.parent.type == "ARMATURE")
        )
    ]
    if len(rigged) != 1 or len(armatures) != 1:
        log.warning(
            "%s: expected 1 skinned mesh + 1 armature, got %d/%d — skipped",
            game_glb.name,
            len(rigged),
            len(armatures),
        )
        return False
    for stray in game_objects:
        if stray.type == "MESH" and stray not in rigged:
            bpy.data.objects.remove(stray, do_unlink=True)

    retex_objects = import_objects(retex_glb)
    new_meshes = [o for o in retex_objects if o.type == "MESH"]
    if len(new_meshes) != 1:
        log.warning(
            "%s: expected 1 retexture mesh, got %d — skipped",
            retex_glb.name,
            len(new_meshes),
        )
        return False

    old_mesh, new_mesh = rigged[0], new_meshes[0]
    if len(old_mesh.data.polygons) != len(new_mesh.data.polygons):
        log.warning(
            "%s: mesh mismatch (game %d polys, retexture %d) — skipped",
            game_glb.stem,
            len(old_mesh.data.polygons),
            len(new_mesh.data.polygons),
        )
        return False

    old_mesh.data.materials.clear()
    for material in new_mesh.data.materials:
        old_mesh.data.materials.append(material)

    for obj in retex_objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    for _ in range(3):
        bpy.data.orphans_purge(do_recursive=True)

    downscale_images(max_px)
    stash_clips(armatures[0])

    target.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(target),
        export_format="GLB",
        export_animation_mode="NLA_TRACKS",
    )
    log.info(
        "%s: %.1f MB <- rig %s + look %s",
        target.name,
        target.stat().st_size / 1e6,
        game_glb.name,
        retex_glb.parent.name,
    )
    return True


def main() -> None:
    """Retexture every requested member model (default: all game GLBs with a source)."""
    workspace, game_dir, max_px, only = parse_args(sys.argv)
    ids = only or sorted(
        p.stem for p in game_dir.glob("*.glb") if p.stem not in SKIP_IDS
    )
    done, skipped = [], []
    for char_id in ids:
        game_glb = game_dir / f"{char_id}.glb"
        retex = newest_retexture(workspace, char_id)
        if not game_glb.exists() or retex is None:
            log.warning(
                "%s: no source pair (game=%s, retexture=%s)",
                char_id,
                game_glb.exists(),
                retex,
            )
            skipped.append(char_id)
            continue
        ok = retexture_one(game_glb, retex, game_glb, max_px)
        (done if ok else skipped).append(char_id)
    log.info("retextured %d member models: %s", len(done), ", ".join(done))
    if skipped:
        log.warning("skipped %d: %s", len(skipped), ", ".join(skipped))


if __name__ == "__main__":
    main()
