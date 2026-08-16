// Imported rigged avatars — the output of the Meshy → rig → VRM/GLB pipeline (ADR 0003), served
// from apps/web/public/avatar/imported/. Picking one (in the builder, or via a member's roster entry)
// sets `AvatarConfig.modelUrl`, which `AvatarView` loads instead of the parametric Quaternius preset.
// `placeholder` is the shared stand-in worn by members without their own model yet; per-member models
// (flx, dni, darren, …) are added here as the pipeline produces them.

export interface AvatarImport {
  id: string;
  label: string;
  /** The rigged mesh GLB (carries at least the idle clip). */
  modelUrl: string;
  /**
   * Extra GLBs whose **animation clips** get merged onto the mesh (same rig → bound by bone name),
   * for models whose locomotion clips ship as separate files (the Meshy rig export does this). The
   * meshes inside are ignored. TODO(pipeline): bake idle+walk+run into one GLB so these aren't
   * re-downloaded just for their clips.
   */
  clipUrls?: string[];
}

// Shared cozy-pose clips (sit/sleep), authored on the bullbear rig in Blender and bound by bone name
// — all member models share that humanoid skeleton, so one file animates every avatar.
const POSE_CLIPS = "/avatar/poses.glb";

/**
 * Build an import entry for a model under public/avatar/imported. The model GLB now carries
 * idle + walk + run baked in as named clips (the Meshy → rig → retarget pipeline emits one file),
 * so the only extra clip file is the shared sit/sleep poses GLB. (Older trio files
 * `${id}-walk.glb` / `${id}-run.glb` are no longer required.)
 */
function rig(id: string, label: string): AvatarImport {
  const base = `/avatar/imported/${id}`;
  return {
    id,
    label,
    modelUrl: `${base}.glb`,
    clipUrls: [POSE_CLIPS],
  };
}

// The full 600 Billion council batch — one rigged model per member, id = the lowercased member name.
// `placeholder` is the shared stand-in for anyone without a model.
// Models aj…tonichina below (minus the five excluded) use the new Meshy 3D meshes re-rigged onto the
// shared humanoid skeleton (idle/walk/run baked in); the excluded five (arbadacarba, blackcoffee,
// darren, mhb, snick) plus `p` keep their previous rigged mesh, repackaged to the same single-file form.
const MEMBER_MODEL_IDS = [
  "aj",
  "arbadacarba",
  "bam",
  "benarc",
  "blackcoffee",
  // cuddy: the join.600.wtf squirrel mesh, bound to the shared skeleton in-session
  // (nearest-bone + smoothed weights; the site mesh ships unrigged) — see PR notes.
  "cuddy",
  "darren",
  "dni",
  "essex",
  "flx",
  "gadaj",
  "jedai",
  "leon",
  "longy",
  "madmunkey",
  "mhb",
  "michael1011",
  "morgs",
  "nc",
  "nind",
  "p",
  "proton",
  "rootzoll",
  "sat",
  "shillie",
  "snick",
  "tobo",
  "tonichina",
] as const;

// The neutral hooded Builder archetype (avatar-builder-pilot v1, locally authored, beam-free core;
// sha256 592a6a9d…8fcd4). Self-contained: BuilderIdle is baked in, and the shared pose GLB is
// authored on the member rig, so no clipUrls — foreign clips would misbind on this skeleton.
const BUILDER_IMPORT: AvatarImport = {
  id: "builder",
  label: "Builder",
  modelUrl: "/avatar/imported/builder.glb",
};

export const AVATAR_IMPORTS: ReadonlyArray<AvatarImport> = [
  BUILDER_IMPORT,
  rig("placeholder", "Placeholder"),
  ...MEMBER_MODEL_IDS.map((id) => rig(id, id)),
];

/** Look up an import entry by its model url (the value stored in `AvatarConfig.modelUrl`). */
export function findImport(modelUrl: string | undefined): AvatarImport | undefined {
  if (!modelUrl) return undefined;
  return AVATAR_IMPORTS.find((entry) => entry.modelUrl === modelUrl);
}

/** Model url for an import id (e.g. "flx", "placeholder"), or undefined if unknown. */
export function importUrl(id: string): string | undefined {
  return AVATAR_IMPORTS.find((entry) => entry.id === id)?.modelUrl;
}
