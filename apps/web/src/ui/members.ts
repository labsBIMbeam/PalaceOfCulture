import type { AvatarConfig } from "@600b/shared";
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
  // Model-only members now in the game — roles/nostr are placeholders until the real 600.wtf entries land.
  { name: "gadaj", role: "Council", nostr: "gadaj@600.wtf" },
  { name: "leon", role: "Council", nostr: "leon@600.wtf" },
  { name: "madmunkey", role: "Council", nostr: "madmunkey@600.wtf" },
  { name: "morgs", role: "Council", nostr: "morgs@600.wtf" },
  { name: "proton", role: "Council", nostr: "proton@600.wtf" },
  { name: "tonichina", role: "Council", nostr: "tonichina@600.wtf" },
];

export const MEMBERS: ReadonlyArray<Member> = SEEDS.map((seed) => ({
  name: seed.name,
  role: seed.role,
  nostr: seed.nostr,
  // Own model if one exists for this name, else the shared placeholder (overrides the parametric base).
  avatar: avatarFor(seed.name, { ...seed.avatar, modelUrl: modelForMember(seed.name) }),
}));
