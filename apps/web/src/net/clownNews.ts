import type { CitadelWireItem, PoliticsCategory } from "../frontend/politics";

const CITADEL_WIRE_FEED = "https://citadelwire.com/feed.xml";
const MAX_FEED_BYTES = 1_000_000;
const MAX_RSS_ITEMS = 5;
const MAX_NEWS_ITEMS = 16;
const FETCH_TIMEOUT_MS = 10_000;

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'");
}

function elementText(xml: string, name: string): string {
  const match = xml.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`, "iu"),
  );
  return decodeEntities(match?.[1]?.trim() ?? "");
}

function descriptionLines(description: string): string[] {
  return decodeEntities(description)
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/(?:div|p)>/giu, "\n")
    .replace(/<[^>]+>/gu, " ")
    .split(/\r?\n/gu)
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
}

function categoryFor(text: string): Exclude<PoliticsCategory, "all"> {
  const value = text.toLowerCase();
  if (/bitcoin|btc|blockchain|node|mining|miner|lightning/iu.test(value)) return "bitcoin";
  if (/market|bank|inflation|gold|oil|debt|bond|econom|finance|currency|trade/iu.test(value)) {
    return "markets";
  }
  if (/journalist|newspaper|media|press|reporter|broadcast|speech/iu.test(value)) return "media";
  if (/ai\b|software|cyber|data center|technology|openai|apple|microsoft|xbox/iu.test(value)) {
    return "tech";
  }
  if (/opposition|challenger|coalition|campaign|election/iu.test(value)) return "opposition";
  return "government";
}

function stableTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Parse Citadel Wire's fixed RSS shape into deduplicated, text-only factual news items. */
export function parseCitadelWireFeed(xml: string): CitadelWireItem[] {
  if (xml.length > MAX_FEED_BYTES) throw new Error("Citadel Wire feed exceeds the size limit");
  const rssItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/giu)].slice(0, MAX_RSS_ITEMS);
  const seenTitles = new Set<string>();
  const news: CitadelWireItem[] = [];

  for (const [rssIndex, match] of rssItems.entries()) {
    const item = match[1] ?? "";
    const guid = elementText(item, "guid") || `wire-${rssIndex}`;
    const sourceUrl = elementText(item, "link");
    if (!/^https:\/\/citadelwire\.com\/posts\/[a-z0-9-]+$/iu.test(sourceUrl)) continue;
    const lines = descriptionLines(elementText(item, "description"));
    const publishedAt = lines[0] ?? elementText(item, "title");
    const marketLine = lines[1]?.startsWith("BITCOIN ") ? lines[1] : undefined;

    for (let index = marketLine ? 2 : 1; index < lines.length; index += 1) {
      const titleMatch = lines[index]?.match(/^\d+\.\s+(.+)$/u);
      if (!titleMatch?.[1]) continue;
      const title = titleMatch[1].trim();
      const facts: string[] = [];
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const line = lines[cursor] ?? "";
        if (/^\d+\.\s+/u.test(line)) break;
        if (line.startsWith("-- ")) facts.push(line.slice(3).trim());
        index = cursor;
      }
      const factualBody = facts.join(" ").trim();
      const titleKey = stableTitleKey(title);
      if (title.length < 12 || factualBody.length < 40 || seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);
      news.push({
        id: `${guid}:${news.length}`,
        category: categoryFor(`${title} ${factualBody}`),
        publishedAt,
        marketLine,
        title,
        factualBody,
        sourceUrl,
      });
      if (news.length >= MAX_NEWS_ITEMS) return news;
    }
  }
  return news;
}

/** Load the live public Citadel Wire RSS feed. No HTML from the provider reaches React. */
export async function loadCitadelWireNews(): Promise<CitadelWireItem[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(CITADEL_WIRE_FEED, {
      headers: { Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Citadel Wire returned HTTP ${response.status}`);
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_FEED_BYTES) throw new Error("Citadel Wire feed exceeds the size limit");
    const xml = await response.text();
    const items = parseCitadelWireFeed(xml);
    if (items.length === 0) throw new Error("Citadel Wire returned no readable items");
    return items;
  } finally {
    window.clearTimeout(timeout);
  }
}

/*
 * WORLD AGENT EXTENSION POINT
 *
 * After a Citadel Wire item is accepted as factual input, a separate world agent may append exactly
 * one fresh `Clownfaktor:` line for that item. The browser must never invent or template this line,
 * and the joke must never modify `publishedAt`, `title`, `factualBody`, or `sourceUrl`.
 */
