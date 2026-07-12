// Media catalog — the seam between the in-game player and Podcasting 2.0 feeds + Nostr live (ADR 0004).
//
// Plug-and-play first: a mock catalog with real, CORS-friendly audio so the player actually plays.
// Then swap in real sources without touching the UI:
//   - music + podcasts → `createPodcastingFeedCatalog(feedUrls)` parsing **Podcasting 2.0 RSS**
//     (`<podcast:medium>`, `<enclosure>`, artwork, `<podcast:value>` for V4V splits).
//   - live → a Nostr **NIP-53** (`kind:30311`) subscription → live events (streaming URL = HLS).
// UI modelled on Podverse (FOSS PC2.0 + V4V player): a browse list + a bottom now-playing bar.

import { loadFeedItems } from "./feed";
import { type Event, queryEvents, tag } from "./nostr";

export type MediaKind = "music" | "podcast" | "live";

export interface MediaItem {
  id: string;
  title: string;
  author: string;
  kind: MediaKind;
  audioUrl: string;
  /** Placeholder artwork tint until feeds bring real artwork. */
  tone: "gold" | "coral" | "teal";
  /** V4V: the Lightning value split boosts/stream-sats flow to (from <podcast:value> / NIP-57). */
  valueRecipient?: string;
  /** Live only: current listener count (from the NIP-53 event participants). */
  listeners?: number;
  /** Live comes from an approved feed/event; demo is the small playable offline fallback. */
  source?: "live" | "demo";
}

export interface MediaCatalog {
  load(): Promise<MediaItem[]>;
}

// Placeholder audio (SoundHelix, freely usable, CORS-open) so play/skip work end-to-end today.
const MOCK: MediaItem[] = [
  // --- Music ---
  {
    id: "mus-1",
    title: "Golden Hour",
    author: "The Builder",
    kind: "music",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    tone: "gold",
    valueRecipient: "builder@getalby.com",
  },
  {
    id: "mus-2",
    title: "Patience (Annual Rings)",
    author: "Wren",
    kind: "music",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    tone: "teal",
    valueRecipient: "wren@getalby.com",
  },
  {
    id: "mus-3",
    title: "Coral Festival",
    author: "Bríd",
    kind: "music",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    tone: "coral",
    valueRecipient: "brid@getalby.com",
  },
  // --- Podcasts ---
  {
    id: "pod-1",
    title: "The Signal — ep. 21",
    author: "600 Billion",
    kind: "podcast",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    tone: "gold",
    valueRecipient: "signal@getalby.com",
  },
  {
    id: "pod-2",
    title: "Time Builds Legend",
    author: "racooDNI",
    kind: "podcast",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    tone: "teal",
    valueRecipient: "dni@getalby.com",
  },
  // --- Live (mock NIP-53 events; real stream = HLS) ---
  {
    id: "live-1",
    title: "Strings of the Atlantic",
    author: "Plaza Main Stage",
    kind: "live",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    tone: "coral",
    valueRecipient: "stage@getalby.com",
    listeners: 142,
  },
  {
    id: "live-2",
    title: "Builder's Workshop (live)",
    author: "The Builder",
    kind: "live",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    tone: "gold",
    valueRecipient: "builder@getalby.com",
    listeners: 38,
  },
];

function demoItems(kind?: MediaKind): MediaItem[] {
  return MOCK.filter((item) => !kind || item.kind === kind).map((item) => ({
    ...item,
    source: "demo",
  }));
}

/** The plug-and-play catalog: on-brand mock items with real playable audio across all three kinds. */
export function createMockMediaCatalog(): MediaCatalog {
  return {
    load: () => Promise.resolve(demoItems()),
  };
}

/** Real media adapters stay behind this catalog interface. See ADR 0004. */
// --- Real Nostr data ---------------------------------------------------------------------------

/** NIP-53 live event (kind 30311) → a live MediaItem. Streaming URL is usually HLS. */
function liveItem(event: Event): MediaItem | null {
  const streaming = tag(event, "streaming") ?? tag(event, "recording");
  const title = tag(event, "title");
  if (!streaming || !/^https?:/.test(streaming) || !title) return null;
  const listeners = Number(tag(event, "current_participants"));
  return {
    id: `live:${tag(event, "d") ?? event.id}`,
    title,
    author: tag(event, "summary") ?? "Live on Nostr",
    kind: "live",
    audioUrl: streaming,
    tone: "coral",
    valueRecipient: event.pubkey,
    listeners: Number.isFinite(listeners) && listeners > 0 ? listeners : undefined,
    source: "live",
  };
}

function dedupe(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  for (const item of items) {
    if (seen.has(item.audioUrl)) continue;
    seen.add(item.audioUrl);
    out.push(item);
  }
  return out;
}

const isItem = (x: MediaItem | null): x is MediaItem => x !== null;

async function loadLive(): Promise<MediaItem[]> {
  try {
    const events = await queryEvents({ kinds: [30311], limit: 50 });
    return dedupe(events.map(liveItem).filter(isItem)).slice(0, 8);
  } catch {
    return [];
  }
}

async function loadCuratedMedia(): Promise<MediaItem[]> {
  try {
    return dedupe(await loadFeedItems()).slice(0, 24);
  } catch {
    return [];
  }
}

/**
 * Factory the player calls. Music and podcasts come only from approved Podcasting 2.0 feeds found
 * through Wavlake/Fountain; live events stay on NIP-53. Empty categories get a marked demo fallback.
 */
export function createMediaCatalog(): MediaCatalog {
  return {
    async load() {
      const [curated, live] = await Promise.all([loadCuratedMedia(), loadLive()]);
      const music = curated.filter((item) => item.kind === "music");
      const podcasts = curated.filter((item) => item.kind === "podcast");
      const merged = [
        ...(music.length ? music : demoItems("music")),
        ...(podcasts.length ? podcasts : demoItems("podcast")),
        ...(live.length ? live : demoItems("live")),
      ];
      return merged.length ? merged : demoItems();
    },
  };
}
