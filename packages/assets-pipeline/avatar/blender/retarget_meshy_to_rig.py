"""
retarget_meshy_to_rig.py
========================
Skin a static Meshy image-to-3D mesh onto the shared 600B humanoid skeleton and bake
idle + walk + run into ONE single-file GLB that drops straight into
`apps/web/public/avatar/imported/<id>.glb` (loaded by RiggedAvatar.tsx / AvatarView.tsx).

Why this exists
---------------
The Meshy image-to-3D outputs (characters/<id>/05_3d_models_meshy/*_model.glb) are a single
textured, *un-rigged* mesh — no skeleton, no animation. The previous council batch
(old/models_all/<id>/) is fully rigged on a 24-joint Meshy humanoid skeleton and carries the
clips clip0 (idle), walking_man (walk) and running (run). Every old model shares that skeleton,
so we reuse one rig as the "donor": transfer its skin weights onto the new mesh by surface
proximity, then bake the donor's three clips in.

Key correctness notes (learned the hard way)
--------------------------------------------
* The donor armature lives in centimetre space (Meshy export scale 0.01). Do NOT apply the new
  mesh's transform into metre/world space before binding — pose rotations then pivot at the wrong
  scale (looks fine at rest, explodes under animation). Instead bind natively with the armature in
  REST position and let Blender keep the mesh in the rig's space.
* Bind with the armature set to REST (`pose_position='REST'`), via parent_set(type='ARMATURE_NAME')
  using the transferred vertex groups — automatic heat weights silently produce zero weights on
  non-watertight Meshy meshes.
* Bake all three clips into one file (export_animation_mode='NLA_TRACKS', one track per clip).
  Re-exporting clips into separate per-file GLBs round-trips them through the glTF Y-up conversion
  inconsistently and corrupts the animation — one file keeps everything in a single convention.

Usage
-----
  blender --background --factory-startup --python retarget_meshy_to_rig.py -- \
      --new   characters/flx/05_3d_models_meshy/<task>_0_model.glb \
      --idle  old/models_all/flx/flx_rigged.glb \
      --walk  old/models_all/flx/<task>_4_rigged.glb \    # any GLB carrying the walk clip
      --run   old/models_all/flx/<task>_7_rigged.glb \    # any GLB carrying the run clip
      --out   apps/web/public/avatar/imported --id flx

For a member that has no new mesh, point --new at the donor's own mesh (or use the sibling
repackage path) to emit the same single-file form.

Output: <out>/<id>.glb — one skinned mesh + named clips "idle", "walk", "run".
"""

import bpy
import sys
import os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def arg(flag, default=None):
    return argv[argv.index(flag) + 1] if flag in argv else default


NEW = arg("--new")
IDLE = arg("--idle")
WALK = arg("--walk")
RUN = arg("--run")
OUT = arg("--out")
CID = arg("--id")


def log(*a):
    print("[retarget]", *a)


def imp(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def of_type(objs, t):
    return [o for o in objs if o.type == t]


def world_bbox(o):
    bpy.context.view_layer.update()
    cs = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return (
        Vector((min(c.x for c in cs), min(c.y for c in cs), min(c.z for c in cs))),
        Vector((max(c.x for c in cs), max(c.y for c in cs), max(c.z for c in cs))),
    )


bpy.ops.wm.read_factory_settings(use_empty=True)

# --- donor rig: armature + skinned body mesh (D) + idle action -------------------------------
donor = imp(IDLE)
arm = of_type(donor, "ARMATURE")[0]
donor_meshes = of_type(donor, "MESH")
D = max(
    donor_meshes, key=lambda m: len(m.vertex_groups)
)  # the real body (most vertex groups)
idle = arm.animation_data.action
idle.name = "idle"
arm.data.pose_position = "REST"
bpy.context.view_layer.update()
dmn, dmx = world_bbox(D)
dh = dmx.z - dmn.z
dcx = (dmn.x + dmx.x) / 2
dcy = (dmn.y + dmx.y) / 2

# --- new mesh: import, join parts, align to donor body (scale to height, centre XY, feet to floor)
new = imp(NEW)
meshes = of_type(new, "MESH")
if len(meshes) > 1:
    bpy.ops.object.select_all(action="DESELECT")
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    meshes = [bpy.context.view_layer.objects.active]
N = meshes[0]
N.animation_data_clear()
nmn, nmx = world_bbox(N)
s = dh / (nmx.z - nmn.z) if (nmx.z - nmn.z) else 1.0
N.scale = [v * s for v in N.scale]
bpy.context.view_layer.update()
nmn, nmx = world_bbox(N)
N.location.x += dcx - (nmn.x + nmx.x) / 2
N.location.y += dcy - (nmn.y + nmx.y) / 2
N.location.z += dmn.z - nmn.z
bpy.context.view_layer.update()
log("aligned new mesh: scale", round(s, 3), "verts", len(N.data.vertices))

# --- transfer skin weights donor body -> new mesh (world-space proximity, while overlapping) ---
bpy.ops.object.select_all(action="DESELECT")
N.select_set(True)
D.select_set(True)
bpy.context.view_layer.objects.active = D
bpy.ops.object.data_transfer(
    data_type="VGROUP_WEIGHTS",
    vert_mapping="POLYINTERP_NEAREST",
    layers_select_src="ALL",
    layers_select_dst="NAME",
    use_create=True,
)
bpy.context.view_layer.objects.active = N
bpy.ops.object.vertex_group_normalize_all()
log("weight assignments", sum(len(v.groups) for v in N.data.vertices))

# --- native bind at REST pose (armature still in REST) ----------------------------------------
bpy.ops.object.select_all(action="DESELECT")
N.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type="ARMATURE_NAME")
arm.data.pose_position = "POSE"


# --- pull in walk + run actions (same skeleton, bound by bone name) ----------------------------
def grab_action(path, name):
    if not path:
        return None
    objs = imp(path)
    acts = [
        o.animation_data.action
        for o in of_type(objs, "ARMATURE")
        if o.animation_data and o.animation_data.action
    ]
    if acts:
        acts[0].name = name
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.delete()
    return acts[0] if acts else None


walk = grab_action(WALK, "walk")
run = grab_action(RUN, "run")

# --- drop donor body + any stray meshes so only N exports -------------------------------------
bpy.ops.object.select_all(action="DESELECT")
stray = [o for o in bpy.data.objects if o.type == "MESH" and o is not N]
for o in stray:
    o.select_set(True)
if stray:
    bpy.context.view_layer.objects.active = stray[0]
    bpy.ops.object.delete()

# --- one NLA track per clip -> single GLB with named animations idle / walk / run --------------
ad = arm.animation_data
ad.action = None
for t in list(ad.nla_tracks):
    ad.nla_tracks.remove(t)
for act in [a for a in (idle, walk, run) if a]:
    tr = ad.nla_tracks.new()
    tr.name = act.name
    tr.strips.new(act.name, int(act.frame_range[0]), act)
log("clips", [a.name for a in (idle, walk, run) if a])

os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
N.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
out_path = os.path.join(OUT, f"{CID}.glb")
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_skins=True,
    export_yup=True,
    export_apply=False,
)
log("wrote", out_path, os.path.getsize(out_path))
log("DONE", CID)
