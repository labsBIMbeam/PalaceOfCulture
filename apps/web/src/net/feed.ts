import type { MediaItem } from "./media";

// Podcasting 2.0 RSS → MediaItems (ADR 0004). This is the same open catalog Fountain uses, so the
// content matches. Browsers can't fetch arbitrary feeds cross-origin (CORS), so every approved feed
// passes through the bounded server proxy in apps/server. The allowlist is deliberately small: source
// discovery comes from Fountain/Wavlake, while final editorial control stays in this repository.

export const CURATED_FEEDS = [
  {
    id: "podcasting-2.0",
    url: "https://mp3s.nashownotes.com/pc20rss.xml",
    source: "Podcast Index",
  },
  {
    id: "wavlake-sam-means",
    url: "https://wavlake.com/feed/891c9ffe-1e78-4b07-a75e-7283629fb127",
    source: "Wavlake",
  },
] as const;
const TONES = ["gold", "teal", "coral"] as const;

/** First descendant element's text by (qualified) tag name. */
function text(scope: Element | Document, name: string): string | undefined {
  return scope.getElementsByTagName(name)[0]?.textContent?.trim() || undefined;
}

/** Parse one Podcasting 2.0 feed document into MediaItems (latest episodes/tracks). */
export function parseFeed(xml: string, toneSeed = 0): MediaItem[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const channel = doc.querySelector("channel");
  if (!channel || doc.querySelector("parsererror")) return [];

  const show = text(channel, "title") ?? "Podcast";
  const medium = text(channel, "podcast:medium");
  const kind: MediaItem["kind"] = medium === "music" ? "music" : "podcast";
  const valueRecipient =
    doc.getElementsByTagName("podcast:valueRecipient")[0]?.getAttribute("address") ?? undefined;

  const out: MediaItem[] = [];
  const items = Array.from(doc.getElementsByTagName("item")).slice(0, 12);
  items.forEach((item, index) => {
    const enclosure = item.getElementsByTagName("enclosure")[0];
    const url = enclosure?.getAttribute("url");
    const type = enclosure?.getAttribute("type") ?? "";
    const title = text(item, "title");
    if (!url || !title || !/^https?:/.test(url)) return;
    if (type && !/audio|mpeg|mp3|m4a|aac|ogg/i.test(type)) return; // audio enclosures only
    out.push({
      id: `feed:${url}`,
      title,
      author: show,
      kind,
      audioUrl: url,
      tone: TONES[(toneSeed + index) % TONES.length] ?? "gold",
      valueRecipient,
      source: "live",
    });
  });
  return out;
}

/** A podcast show returned by the optional open-catalog search. */
export interface PodcastShow {
  title: string;
  author: string;
  feedUrl: string;
  artwork?: string;
}

/** Search public RSS shows via the server; playback still requires an explicit user selection. */
export async function searchPodcastShows(query: string): Promise<PodcastShow[]> {
  if (!query.trim()) return [];
  try {
    const response = await fetch(`/api/podcasts/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    const data = (await response.json()) as { shows?: PodcastShow[] };
    return data.shows ?? [];
  } catch {
    return [];
  }
}

/** Load a show's episodes by RSS feed URL via the server proxy (parses PC2.0 incl. the value block). */
export async function loadShowEpisodes(feedUrl: string): Promise<MediaItem[]> {
  try {
    const response = await fetch(`/api/podcasts/feed?url=${encodeURIComponent(feedUrl)}`);
    if (!response.ok) return [];
    return parseFeed(await response.text());
  } catch {
    return [];
  }
}

/** Fetch and parse only editorially approved live feeds through the safe server proxy. */
export async function loadFeedItems(): Promise<MediaItem[]> {
  const perFeed = await Promise.all(
    CURATED_FEEDS.map(async (feed, index) => {
      try {
        const response = await fetch(`/api/podcasts/feed?url=${encodeURIComponent(feed.url)}`);
        if (!response.ok) return [];
        return parseFeed(await response.text(), index * 5);
      } catch {
        return [];
      }
    }),
  );
  return perFeed.flat();
}
