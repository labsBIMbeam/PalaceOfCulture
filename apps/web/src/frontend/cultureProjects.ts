import type { IconName } from "./types";

export type CultureCategory = "audio" | "music" | "live" | "articles" | "v4v";

export type CultureProject = {
  name: string;
  description: string;
  category: CultureCategory;
  protocol: string;
  href: string;
  icon: IconName;
};

export const CULTURE_DIRECTORY_LINKS = {
  whyNostr: "https://www.whynostr.com/explore",
  compass: "https://nostrcompass.org/en/projects/",
  resources: "https://nostr-resources.com/",
} as const;

/** Open culture projects surfaced by the Culture screen. */
export const CULTURE_PROJECTS: readonly CultureProject[] = [
  {
    name: "Fountain",
    description: "Nostr-native podcasts, livestreams, video and zaps.",
    category: "audio",
    protocol: "Nostr + PC2.0",
    href: "https://fountain.fm/",
    icon: "community",
  },
  {
    name: "Fanfares",
    description: "Open-source, Nostr-based podcast publishing.",
    category: "audio",
    protocol: "Nostr",
    href: CULTURE_DIRECTORY_LINKS.whyNostr,
    icon: "community",
  },
  {
    name: "castr.me",
    description: "Turns an npub into a portable podcast feed.",
    category: "audio",
    protocol: "npub → RSS",
    href: CULTURE_DIRECTORY_LINKS.compass,
    icon: "community",
  },
  {
    name: "Nostr Nests / Corny Chat",
    description: "Clubhouse-style audio spaces with zap support.",
    category: "audio",
    protocol: "Nostr + NIP-57",
    href: CULTURE_DIRECTORY_LINKS.whyNostr,
    icon: "community",
  },
  {
    name: "Podcasting 2.0 apps",
    description: "Podverse, CurioCaster, TrueFans and podfans.",
    category: "audio",
    protocol: "PC2.0 + V4V",
    href: "https://podcastindex.org/apps",
    icon: "community",
  },
  {
    name: "Wavlake Top",
    description: "The live Top 40 ranked by listener support.",
    category: "music",
    protocol: "Lightning + Nostr",
    href: "https://wavlake.com/top",
    icon: "spark",
  },
  {
    name: "Wavlake Artists",
    description: "Browse artists and open their Podcasting 2.0 release feeds.",
    category: "music",
    protocol: "PC2.0 RSS",
    href: "https://wavlake.com/artists",
    icon: "community",
  },
  {
    name: "Tunestr",
    description: "Value-for-value live music streams.",
    category: "music",
    protocol: "V4V live",
    href: CULTURE_DIRECTORY_LINKS.whyNostr,
    icon: "spark",
  },
  {
    name: "Stemstr",
    description: "Open collaboration for producers and artists.",
    category: "music",
    protocol: "Nostr",
    href: CULTURE_DIRECTORY_LINKS.whyNostr,
    icon: "spark",
  },
  {
    name: "zap.stream",
    description: "Open live streaming with real-time zaps.",
    category: "live",
    protocol: "NIP-53 + NIP-57",
    href: "https://zap.stream/",
    icon: "play",
  },
  {
    name: "Flare",
    description: "Video hosting published back to Nostr.",
    category: "live",
    protocol: "Nostr video",
    href: CULTURE_DIRECTORY_LINKS.whyNostr,
    icon: "play",
  },
  {
    name: "Swae / Shosho",
    description: "Mobile live streaming with Cashu, zaps and VOD.",
    category: "live",
    protocol: "Live + VOD",
    href: CULTURE_DIRECTORY_LINKS.compass,
    icon: "play",
  },
  {
    name: "Habla.news",
    description: "Long-form publishing and reading on Nostr.",
    category: "articles",
    protocol: "NIP-23",
    href: "https://habla.news/",
    icon: "doc",
  },
  {
    name: "YakiHonne",
    description: "Articles, video, curation and NWC/Cashu wallet tools.",
    category: "articles",
    protocol: "NIP-23 + NWC",
    href: "https://nostrapps.com/yakihonne",
    icon: "doc",
  },
  {
    name: "Pareto",
    description: "Publishing for citizen journalism and independent writers.",
    category: "articles",
    protocol: "NIP-23",
    href: CULTURE_DIRECTORY_LINKS.compass,
    icon: "doc",
  },
  {
    name: "Highlighter / Boris",
    description: "Highlight long-form work or keep it for offline reading.",
    category: "articles",
    protocol: "Nostr reading",
    href: CULTURE_DIRECTORY_LINKS.resources,
    icon: "doc",
  },
  {
    name: "Stacker News",
    description: "Community news and discussions rewarded in bitcoin.",
    category: "v4v",
    protocol: "Lightning",
    href: "https://stacker.news/",
    icon: "zap",
  },
  {
    name: "Olas / Zap.cooking",
    description: "Value-for-value photography and recipes.",
    category: "v4v",
    protocol: "Nostr + zaps",
    href: CULTURE_DIRECTORY_LINKS.compass,
    icon: "zap",
  },
  {
    name: "Zapstore / DTAN",
    description: "FOSS apps with dev zaps and Nostr-native torrents.",
    category: "v4v",
    protocol: "Nostr + FOSS",
    href: CULTURE_DIRECTORY_LINKS.compass,
    icon: "zap",
  },
] as const;
