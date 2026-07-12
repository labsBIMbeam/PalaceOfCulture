export type SocialEventCandidate = {
  id: string;
  pubkey: string;
  content: string;
  created_at?: number;
  tags: string[][];
};

const BLOCKED_CONTENT =
  /\b(nsfw|porn|porno|bukkake|onlyfans|nudes?|erotic|hentai|xxx|sexcam|jav|new track on bch radio|financial market preview)\b/i;
const URL_PATTERN = /https?:\/\/\S+/gi;
const NOSTR_REFERENCE_PATTERN = /nostr:\S+/gi;
const HASHTAG_PATTERN = /(^|\s)#[\p{L}\p{N}_-]+/gu;

function readableText(content: string): string {
  return content
    .replace(URL_PATTERN, " ")
    .replace(NOSTR_REFERENCE_PATTERN, " ")
    .replace(HASHTAG_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeMachinePayload(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function countMatches(content: string, pattern: RegExp): number {
  return content.match(pattern)?.length ?? 0;
}

/** Reject notes that are unsafe, machine-generated or visually poor in a text-card feed. */
export function isPresentableSocialEvent(event: SocialEventCandidate): boolean {
  const content = event.content.trim();
  if (content.length < 32 || content.length > 1_200) return false;
  if (BLOCKED_CONTENT.test(content) || looksLikeMachinePayload(content)) return false;
  if (countMatches(content, URL_PATTERN) > 2) return false;
  if (countMatches(content, NOSTR_REFERENCE_PATTERN) > 2) return false;
  if (event.tags.filter((tag) => tag[0] === "t").length > 7) return false;

  const readable = readableText(content);
  if (readable.length < 28) return false;
  if (/^(.)\1{11,}$/u.test(readable.replace(/\s/g, ""))) return false;
  return true;
}

function qualityScore(event: SocialEventCandidate, topics: readonly string[]): number {
  const readable = readableText(event.content);
  const topicSet = new Set(topics.map((topic) => topic.toLowerCase()));
  const topicMatches = event.tags.filter(
    (tag) => tag[0] === "t" && tag[1] && topicSet.has(tag[1].toLowerCase()),
  ).length;
  const palaceMatches = event.tags.filter(
    (tag) =>
      tag[0] === "t" && tag[1] && ["600billion", "palaceofculture"].includes(tag[1].toLowerCase()),
  ).length;
  const urlCount = countMatches(event.content, URL_PATTERN);
  const lengthScore = readable.length >= 70 && readable.length <= 520 ? 5 : 2;
  const sentenceScore = /[.!?…]/u.test(readable) ? 1 : 0;
  return lengthScore + Math.min(topicMatches, 3) * 2 + palaceMatches * 8 + sentenceScore - urlCount;
}

function templateKey(content: string): string {
  return readableText(content)
    .toLowerCase()
    .replace(/"[^"]+"/g, '"…"')
    .replace(/\d+/g, "#")
    .slice(0, 100);
}

/** Rank safe live notes and keep the demo visually diverse with at most one note per author. */
export function rankPresentableSocialEvents<T extends SocialEventCandidate>(
  events: readonly T[],
  topics: readonly string[],
  limit = 24,
  maxPerAuthor = 1,
): T[] {
  const seenBodies = new Set<string>();
  const authorCounts = new Map<string, number>();
  const ranked = events
    .filter(isPresentableSocialEvent)
    .map((event) => ({ event, score: qualityScore(event, topics) }))
    .sort((a, b) => b.score - a.score || (b.event.created_at ?? 0) - (a.event.created_at ?? 0));

  const selected: T[] = [];
  for (const { event } of ranked) {
    const bodyKey = templateKey(event.content);
    const authorCount = authorCounts.get(event.pubkey) ?? 0;
    if (authorCount >= maxPerAuthor || seenBodies.has(bodyKey)) continue;
    authorCounts.set(event.pubkey, authorCount + 1);
    seenBodies.add(bodyKey);
    selected.push(event);
    if (selected.length >= limit) break;
  }
  return selected;
}
