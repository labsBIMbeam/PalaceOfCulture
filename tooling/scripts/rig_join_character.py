#!/usr/bin/env python3
"""Bind a workspace character mesh to the shared humanoid game skeleton.

For members whose rigged game model never existed (bk, tal, mtoshi): take a DONOR game
model (any member on the shared skeleton, e.g. tobo.glb), drop its mesh, bring in the
character's newest `*_simple_exact_3view_hd.glb` (raw Meshy mesh + newest textures),
bind it with automatic weights in the skeleton's REST pose — the same route cuddy's
squirrel took — and export a single-file GLB with the idle/walk/run clips stashed.

Run with:
  blender --background --python tooling/scripts/rig_join_character.py -- \
    <donor_game_glb> <workspace_characters_dir> <game_imported_dir> [max_px] <id ...>
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import bpy
from mathutils import Vector

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))
from retexture_member_models import (  # noqa: E402
    downscale_images,
    import_objects,
    newest_retexture,
    stash_clips,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("rig-join")


def parse_args(argv: list[str]) -> tuple[Path, Path, Path, int, list[str]]:
    """Read `<donor_glb> <workspace_dir> <game_dir> [max_px] <ids...>` after `--`."""
    args = argv[argv.index("--") + 1 :]
    if len(args) < 4:
        raise SystemExit(
            "usage: blender --background --python rig_join_character.py -- "
            "donor.glb workspace game_dir [max_px] id ..."
        )
    max_px = int(args[3]) if args[3].isdigit() else 1024
    ids = args[4:] if args[3].isdigit() else args[3:]
    return Path(args[0]), Path(args[1]), Path(args[2]), max_px, ids


def mesh_height(obj: bpy.types.Object) -> float:
    """World-space height of a mesh object's bounding box."""
    zs = [(obj.matrix_world @ Vector(c)).z for c in obj.bound_box]
    return max(zs) - min(zs)


def rig_one(donor_glb: Path, source_glb: Path, target: Path, max_px: int) -> bool:
    """Build one member model: donor skeleton + workspace mesh. Returns success."""
    bpy.ops.wm.read_factory_settings(use_empty=True)

    donor_objects = import_objects(donor_glb)
    armatures = [o for o in donor_objects if o.type == "ARMATURE"]
    if len(armatures) != 1:
        log.warning("%s: expected 1 armature, got %d — skipped", donor_glb.name, len(armatures))
        return False
    armature = armatures[0]
    donor_meshes = [
        o
        for o in donor_objects
        if o.type == "MESH" and any(m.type == "ARMATURE" for m in o.modifiers)
    ]
    if len(donor_meshes) != 1:
        log.warning("%s: expected 1 skinned donor mesh, got %d — skipped", donor_glb.name, len(donor_meshes))
        return False
    donor_mesh = donor_meshes[0]
    donor_height = mesh_height(donor_mesh)
    for stray in donor_objects:
        if stray.type == "MESH" and stray is not donor_mesh:
            bpy.data.objects.remove(stray, do_unlink=True)

    # Bind in REST pose: the clips pose the skeleton, but the workspace mesh stands in the
    # neutral Meshy pose the skeleton was authored in.
    armature.data.pose_position = "REST"
    bpy.context.view_layer.update()

    source_objects = import_objects(source_glb)
    meshes = [o for o in source_objects if o.type == "MESH"]
    if len(meshes) != 1:
        log.warning("%s: expected 1 mesh, got %d — skipped", source_glb.name, len(meshes))
        return False
    mesh = meshes[0]
    for stray in source_objects:
        if stray is not mesh and stray.type != "ARMATURE":
            bpy.data.objects.remove(stray, do_unlink=True)

    # Same character family, but guard the scale: match the donor's height when they differ.
    height = mesh_height(mesh)
    if donor_height > 0 and height > 0 and abs(height - donor_height) / donor_height > 0.02:
        factor = donor_height / height
        mesh.scale = (mesh.scale[0] * factor, mesh.scale[1] * factor, mesh.scale[2] * factor)
        log.info("%s: scaled by %.3f to donor height %.2f m", target.stem, factor, donor_height)
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Meshy meshes defeat bone-heat ("failed to find solution"), so take cuddy's route:
    # copy the donor's polished vertex weights across by nearest face, then ride the same
    # armature through a plain modifier. Both meshes stand in the neutral pose here.
    for group in donor_mesh.vertex_groups:
        mesh.vertex_groups.new(name=group.name)
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = donor_mesh
    bpy.ops.object.data_transfer(
        data_type="VGROUP_WEIGHTS",
        vert_mapping="POLYINTERP_NEAREST",
        layers_select_src="ALL",
        layers_select_dst="NAME",
    )
    modifier = mesh.modifiers.new("Armature", "ARMATURE")
    modifier.object = armature
    mesh.parent = armature
    # The shared skeleton is authored in centimetres (armature object scale 0.01): keep the
    # mesh where it stands instead of inheriting that shrink through the new parent link.
    mesh.matrix_parent_inverse = armature.matrix_world.inverted()
    bpy.data.objects.remove(donor_mesh, do_unlink=True)
    armature.data.pose_position = "POSE"

    downscale_images(max_px)
    stash_clips(armature)

    target.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(target),
        export_format="GLB",
        export_animation_mode="NLA_TRACKS",
    )
    log.info(
        "%s: %.1f MB <- skeleton %s + mesh %s",
        target.name,
        target.stat().st_size / 1e6,
        donor_glb.name,
        source_glb.parent.name,
    )
    return True


def main() -> None:
    """Rig every requested character from its newest workspace look."""
    donor, workspace, game_dir, max_px, ids = parse_args(sys.argv)
    done, skipped = [], []
    for char_id in ids:
        source = newest_retexture(workspace, char_id)
        if source is None:
            log.warning("%s: no *_simple_exact_3view_hd.glb in workspace — skipped", char_id)
            skipped.append(char_id)
            continue
        ok = rig_one(donor, source, game_dir / f"{char_id}.glb", max_px)
        (done if ok else skipped).append(char_id)
    log.info("rigged %d: %s", len(done), ", ".join(done))
    if skipped:
        log.warning("skipped %d: %s", len(skipped), ", ".join(skipped))


if __name__ == "__main__":
    main()
