#!/usr/bin/env python3
"""Assemble the game's Builder avatar from the approved release package.

The Builder release (600BillionCWO/avatar-exports/the-builder-browsergame/release/v1)
ships ONE rig three times — idle, walk and run each in their own GLB. The game wants a
single self-contained builder.glb (BUILDER_IMPORT has no clipUrls, foreign clips would
misbind on this bespoke 24-joint skeleton). This script imports the idle model, adopts
the walk/run actions from their sibling files, names the clips the canonical idle/walk/
run, downscales the texture to the web budget, and exports one file.

Run with:
  blender --background --python tooling/scripts/build_builder_model.py -- \
    <release_model_dir> <out_glb> [max_px]
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import bpy

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))
from retexture_member_models import downscale_images, import_objects, stash_clips  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("builder")

CLIPS = {
    "idle": "palace-builder-v1-rigged-idle.glb",
    "walk": "palace-builder-v1-rigged-walk.glb",
    "run": "palace-builder-v1-rigged-run.glb",
}


def main() -> None:
    """Build one self-contained builder.glb from the three release GLBs."""
    args = sys.argv[sys.argv.index("--") + 1 :]
    if len(args) < 2:
        raise SystemExit("usage: ... -- <release_model_dir> <out_glb> [max_px]")
    model_dir, target = Path(args[0]), Path(args[1])
    max_px = int(args[2]) if len(args) > 2 else 1024

    bpy.ops.wm.read_factory_settings(use_empty=True)

    # The idle file is the model: mesh, identity nodes (face void + emissive eyes), skeleton.
    idle_objects = import_objects(model_dir / CLIPS["idle"])
    armatures = [o for o in idle_objects if o.type == "ARMATURE"]
    if len(armatures) != 1:
        raise SystemExit(f"expected 1 armature in the idle GLB, got {len(armatures)}")
    for action in bpy.data.actions:
        action.name = "idle"

    # Walk and run contribute only their action; their duplicate scene objects are dropped.
    # Same 24-joint skeleton in every file, so the fcurve bone paths bind cleanly.
    for clip_name in ("walk", "run"):
        before_actions = set(bpy.data.actions)
        clip_objects = import_objects(model_dir / CLIPS[clip_name])
        new_actions = [a for a in bpy.data.actions if a not in before_actions]
        if len(new_actions) != 1:
            raise SystemExit(f"expected 1 new action from {clip_name}, got {len(new_actions)}")
        new_actions[0].name = clip_name
        new_actions[0].use_fake_user = True
        for obj in clip_objects:
            bpy.data.objects.remove(obj, do_unlink=True)

    downscale_images(max_px)
    # The glTF importer stashes its own NLA track per file (named after the source action);
    # drop those so the export carries exactly the three canonical clips once.
    animation_data = armatures[0].animation_data
    if animation_data:
        for track in list(animation_data.nla_tracks):
            animation_data.nla_tracks.remove(track)
    stash_clips(armatures[0])

    target.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(target),
        export_format="GLB",
        export_animation_mode="NLA_TRACKS",
    )
    log.info(
        "%s: %.1f MB <- %s (idle+walk+run, %d px)",
        target.name,
        target.stat().st_size / 1e6,
        model_dir,
        max_px,
    )


if __name__ == "__main__":
    main()
