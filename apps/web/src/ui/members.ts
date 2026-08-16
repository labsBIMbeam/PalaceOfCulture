import type { AvatarConfig } from "@600b/shared";
import {
  type RaidSpecialtyStatus,
  raidSpecialtyFor,
  raidSpecialtyStatusFor,
} from "../meaningverse/firstRaid";
import { importUrl } from "../scene/avatarImports";
import { AGES, AURAS, GENDERS, HAIR_COLORS, OUTFITS, SKIN_TONES } from "./avatarTraits";

// The 600 Billion member roster — the character-select line-up (new concept: pick an existing member;
// loading your own model is later, user-content). Names/roles are the real org from www.600.wtf
// (members.json). Each member wears their own pipeline model (www600-council-v1 batch, matched by
// lowercased name); the shared `placeholder` is the fallback for any future member without one. Each
// also carries a deterministic parametric base config underneath, revealed if the model is removed.

export interface Member {
  name: string;
  role: string;
  /** Playful raid contribution, not biography, rank, or authority. */
  specialty: string;
  specialtyStatus: RaidSpecialtyStatus;
  nostr: string;
  avatar: AvatarConfig;
}

interface MemberSeed {
  name: string;
  role: string;
  nostr: string;
  /** Override the generated avatar (e.g. an imported hero model). */
  avatar?: Partial<AvatarConfig>;
}

// Members whose name matches an imported model id (lowercased) wear that model; rest get placeholder.
const PLACEHOLDER = importUrl("placeholder");
function modelForMember(name: string): string | undefined {
  return importUrl(name.toLowerCase()) ?? PLACEHOLDER;
}

/** Stable string hash → spread the trait pickers so each member reads as a different person. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(list: readonly T[], n: number): T {
  // Normalise to a valid index — `n` can be a large/negative shift result.
  const i = ((Math.trunc(n) % list.length) + list.length) % list.length;
  return list[i] as T;
}

function avatarFor(name: string, overrides?: Partial<AvatarConfig>): AvatarConfig {
  const h = hash(name);
  return {
    gender: pick(GENDERS, h).id,
    age: pick(AGES, h >>> 2).id,
    skinTone: pick(SKIN_TONES, h >>> 4),
    aura: pick(AURAS, h >>> 6),
    hair: pick(HAIR_COLORS, h >>> 8),
    outfit: pick(OUTFITS, h >>> 10).id,
    headwear: "none",
    ...overrides,
  };
}

// The 600.wtf roster (in org order) + the model-only members added below.
const SEEDS: ReadonlyArray<MemberSeed> = [
  { name: "dni", role: "CEO", nostr: "dni@600.wtf" },
  { name: "nind", role: "CCS", nostr: "n@600.wtf" },
  { name: "michael1011", role: "CTO", nostr: "m@bol.tz" },
  { name: "sat", role: "CMO", nostr: "sat@600.wtf" },
  { name: "flx", role: "CWO", nostr: "flx@600.wtf" },
  { name: "shillie", role: "CDO", nostr: "quillie@600.wtf" },
  { name: "arbadacarba", role: "CMO", nostr: "arbadacarba@600.wtf" },
  { name: "benarc", role: "CVO", nostr: "ben@nostr.com" },
  { name: "tobo", role: "CDO", nostr: "tobo@600.wtf" },
  { name: "BlackCoffee", role: "CHO", nostr: "bc@600.wtf" },
  { name: "darren", role: "CIO", nostr: "darren@600.wtf" },
  { name: "rootzoll", role: "CDJ", nostr: "rootzoll@600.wtf" },
  { name: "nc", role: "CCC", nostr: "nc@600.wtf" },
  { name: "longy", role: "CSO", nostr: "longy@600.wtf" },
  { name: "essex", role: "CPO", nostr: "essex@600.wtf" },
  { name: "jedai", role: "CIAO", nostr: "jedai@600.wtf" },
  { name: "p", role: "CBDC", nostr: "p@600.wtf" },
  { name: "aj", role: "COL", nostr: "aj@600.wtf" },
  { name: "bam", role: "CMO", nostr: "bam@600.wtf" },
  { name: "mhb", role: "CRO", nostr: "mhb@600.wtf" },
  { name: "snick", role: "CWO", nostr: "snick@600.wtf" },
  // Roles below follow the live 600.wtf members.json (site slugs gdj/madmunky map to our model ids).
  { name: "gadaj", role: "CKO", nostr: "gdj@600.wtf" },
  { name: "leon", role: "CHO", nostr: "leon@600.wtf" },
  { name: "madmunkey", role: "CDJ", nostr: "madmunky@600.wtf" },
  { name: "morgs", role: "CFR", nostr: "morgs@600.wtf" },
  { name: "proton", role: "Council", nostr: "proton@600.wtf" },
  { name: "tonichina", role: "CCN", nostr: "tonychina@600.wtf" },
  // The newest join.600.wtf characters — tal/bk/mtoshi wear the shared placeholder until their
  // rigged models come out of the Meshy → rig → retarget pipeline (raw meshes exist on the
  // site). cuddy's squirrel is already bound to the shared skeleton (avatarImports).
  { name: "tal", role: "CNO", nostr: "tal@600.wtf" },
  { name: "bk", role: "CUO", nostr: "bk@600.wtf" },
  { name: "mtoshi", role: "CHR", nostr: "mtoshi@600.wtf" },
  { name: "cuddy", role: "CLO", nostr: "cuddy@600.wtf" },
  // Kerni (CIVO) is deliberately NOT in the pickable roster: the workshop familiar lives in the
  // street as an NPC (scene/KerniFamiliar.tsx), not as a wearable member model.
];

export const MEMBERS: ReadonlyArray<Member> = SEEDS.map((seed) => ({
  name: seed.name,
  role: seed.role,
  specialty: raidSpecialtyFor(seed.name),
  specialtyStatus: raidSpecialtyStatusFor(seed.name),
  nostr: seed.nostr,
  // Own model if one exists for this name, else the shared placeholder (overrides the parametric base).
  avatar: avatarFor(seed.name, { ...seed.avatar, modelUrl: modelForMember(seed.name) }),
}));

// The neutral hooded Builder — the archetype for everyone who is not (yet) a 600.wtf member. You
// enter as yourself, not wearing someone else's name; your own Nostr key comes later. Kept out of
// MEMBERS so the org roster stays the real org.
export const BUILDER: Member = {
  name: "Builder",
  role: "start fresh",
  specialty: raidSpecialtyFor("Builder"),
  specialtyStatus: raidSpecialtyStatusFor("Builder"),
  nostr: "your own key, later",
  avatar: avatarFor("Builder", { modelUrl: importUrl("builder") }),
};

/** The character-select line-up: the neutral archetype first, then the 600.wtf member roster. */
export const ROSTER: ReadonlyArray<Member> = [BUILDER, ...MEMBERS];
