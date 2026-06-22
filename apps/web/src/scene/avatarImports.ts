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

/** Build an import entry from the conventional idle/walk/run file trio under public/avatar/imported. */
function rig(id: string, label: string): AvatarImport {
  const base = `/avatar/imported/${id}`;
  return {
    id,
    label,
    modelUrl: `${base}.glb`,
    clipUrls: [`${base}-walk.glb`, `${base}-run.glb`, POSE_CLIPS],
  };
}

// The full 600 Billion council batch (www600-council-v1) — one rigged model per member, id = the
// lowercased member name. `placeholder` is the shared stand-in for anyone without a model.
const MEMBER_MODEL_IDS = [
  "aj",
  "arbadacarba",
  "bam",
  "benarc",
  "blackcoffee",
  "darren",
  "dni",
  "essex",
  "flx",
  "jedai",
  "longy",
  "mhb",
  "michael1011",
  "nc",
  "nind",
  "p",
  "rootzoll",
  "sat",
  "shillie",
  "snick",
  "tobo",
] as const;

export const AVATAR_IMPORTS: ReadonlyArray<AvatarImport> = [
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
