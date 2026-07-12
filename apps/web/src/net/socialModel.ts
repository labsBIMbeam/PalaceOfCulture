import type { IconName } from "../frontend/types";

/** Render-ready Nostr note shape; kept dependency-free so the shell does not preload NDK. */
export type FeedNote = {
  id: string;
  author: string;
  meta: string;
  body: string;
  npub: string;
  pubkey: string;
  createdAt: number;
  founder?: boolean;
  pinned?: boolean;
  source?: "live" | "demo";
  actions: { replies: number; reposts: number; zaps: number };
};

/** Data-driven mood/topic tab. */
export type FeedTab = {
  id: string;
  label: string;
  icon: IconName;
  hashtags: string[];
  builtin?: boolean;
  algo?: "general" | "articles";
  /** Optional editorial author allowlist (hex pubkeys) instead of an open hashtag query. */
  authors?: string[];
  /** Curated publishers may contribute more than one card; open feeds stay at one per author. */
  maxPerAuthor?: number;
};

export const CURATED_POC_AUTHORS = [
  "199db590b5748d567dbaa91f4a33b4845c4aab640a2031b27abade40f5d11eff",
] as const;

export const BUILTIN_TABS: FeedTab[] = [
  { id: "general", label: "General", icon: "globe", hashtags: [], algo: "general", builtin: true },
  {
    id: "articles",
    label: "Articles",
    icon: "doc",
    hashtags: [],
    algo: "articles",
    builtin: true,
  },
  {
    id: "poc",
    label: "PoC",
    icon: "palace",
    hashtags: [
      "600billion",
      "palaceofculture",
      "value4value",
      "v4v",
      "wavlake",
      "zapstream",
      "podcast",
      "music",
      "art",
    ],
    authors: [...CURATED_POC_AUTHORS],
    maxPerAuthor: 8,
    builtin: true,
  },
  {
    id: "guild",
    label: "Guild",
    icon: "community",
    hashtags: ["guild"],
    builtin: true,
  },
];

export const PRESET_TABS: FeedTab[] = [
  {
    id: "social",
    label: "Social",
    icon: "spark",
    hashtags: ["nostr", "asknostr", "introductions"],
  },
  {
    id: "gardening",
    label: "Gardening",
    icon: "sprout",
    hashtags: ["gardening", "garden", "plants", "permaculture", "homestead"],
  },
  {
    id: "geopolitics",
    label: "Geopolitics",
    icon: "globe",
    hashtags: ["geopolitics", "politics", "worldnews"],
  },
  { id: "bitcoin", label: "Bitcoin", icon: "coins", hashtags: ["bitcoin", "lightning", "nostr"] },
];

export function customTab(raw: string): FeedTab | null {
  const tag = raw
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!tag) return null;
  return { id: `tag:${tag}`, label: `#${tag}`, icon: "zap", hashtags: [tag] };
}

function shortNpub(npub: string): string {
  return npub.length > 16 ? `${npub.slice(0, 10)}…${npub.slice(-4)}` : npub;
}

export function localNote(id: string, npub: string, body: string): FeedNote {
  return {
    id,
    author: "you",
    meta: `${shortNpub(npub)} · now`,
    body,
    npub,
    pubkey: "",
    createdAt: Math.floor(Date.now() / 1000),
    actions: { replies: 0, reposts: 0, zaps: 0 },
  };
}
