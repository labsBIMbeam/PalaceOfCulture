// Social feed — the seam between the Iris-style themed feed UI and real Nostr text notes (kind:1).
// (Nostr is the "Social" transport in ADR 0004; net/feed.ts is the unrelated Podcasting 2.0 parser.)
//
// Plug-and-play first (the same pattern as net/media.ts): each tab is a curated hashtag set queried
// live off the relays via `queryEvents`; author identity comes from kind:0 profiles; npub via nip19;
// falls back to on-brand mock when relays are quiet so the feed is never empty. Posting / zaps that
// WRITE to Nostr come later — that needs a signer (NIP-07 or the per-seal key, ADR 0002). Read-only now.

import { NDKEvent } from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";
import { type Event, connect, getNdk, queryEvents } from "./nostr";
import { BUILTIN_TABS, type FeedNote, type FeedTab } from "./socialModel";
export { BUILTIN_TABS, PRESET_TABS, customTab, localNote } from "./socialModel";
export type { FeedNote, FeedTab } from "./socialModel";

// --- Write path (signed by the active signer; net/nostr wires the demo signer at startup) -----------

/** Publish a kind:1 text note signed by the active signer. Returns the new event id, or null. */
export async function publishNote(body: string): Promise<string | null> {
  const text = body.trim();
  const ndk = getNdk();
  if (!text || !ndk.signer) return null;
  try {
    await connect();
    const event = new NDKEvent(ndk);
    event.kind = 1;
    event.content = text;
    await event.publish();
    return event.id;
  } catch {
    return null;
  }
}

/** Publish a NIP-25 reaction (kind:7; default "+" like) to a note. Returns true on success. */
export async function reactToNote(
  note: { id: string; pubkey: string },
  content = "+",
): Promise<boolean> {
  const ndk = getNdk();
  if (!ndk.signer || !note.id) return false;
  try {
    await connect();
    const event = new NDKEvent(ndk);
    event.kind = 7;
    event.content = content;
    event.tags = note.pubkey
      ? [
          ["e", note.id],
          ["p", note.pubkey],
        ]
      : [["e", note.id]];
    await event.publish();
    return true;
  } catch {
    return false;
  }
}

/** Publish a NIP-18 repost (kind:6) of a note. Returns true on success. */
export async function repostNote(note: { id: string; pubkey: string }): Promise<boolean> {
  const ndk = getNdk();
  if (!ndk.signer || !note.id) return false;
  try {
    await connect();
    const event = new NDKEvent(ndk);
    event.kind = 6;
    event.tags = note.pubkey
      ? [
          ["e", note.id],
          ["p", note.pubkey],
        ]
      : [["e", note.id]];
    await event.publish();
    return true;
  } catch {
    return false;
  }
}

// Known founder pubkeys (hex) get the crown. Empty until the real npubs are known.
const FOUNDERS = new Set<string>();

function shortNpub(npub: string): string {
  return npub.length > 16 ? `${npub.slice(0, 10)}…${npub.slice(-4)}` : npub;
}

function safeNpub(pubkey: string): string {
  try {
    return nip19.npubEncode(pubkey);
  } catch {
    return pubkey;
  }
}

/** Relative time for the meta line ("21m", "3h", "2d"). */
function timeAgo(createdAtSec: number): string {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - createdAtSec));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

type Profile = { name?: string };

/** kind:0 metadata content → a display name (display_name wins, then name). */
function parseProfile(event: Event): Profile {
  try {
    const doc = JSON.parse(event.content) as Record<string, string>;
    const name = (doc.display_name || doc.name || "").trim();
    return name ? { name } : {};
  } catch {
    return {};
  }
}

function toNote(event: Event, profile?: Profile, actions?: FeedNote["actions"]): FeedNote {
  const npub = safeNpub(event.pubkey);
  return {
    id: event.id,
    author: profile?.name || shortNpub(npub),
    meta: `${shortNpub(npub)} · ${timeAgo(event.created_at ?? 0)}`,
    body: event.content,
    npub,
    pubkey: event.pubkey,
    createdAt: event.created_at ?? 0,
    founder: FOUNDERS.has(event.pubkey),
    actions: actions ?? { replies: 0, reposts: 0, zaps: 0 },
  };
}

/** Tag-stuffed / link-spam notes (the #PORTUGAL #ROMANIA… firehose junk) — kept out of every feed. */
function isSpammy(event: Event): boolean {
  const tags = event.tags.filter((entry) => entry[0] === "t").length;
  const urls = (event.content.match(/https?:\/\//g) ?? []).length;
  return tags > 8 || urls > 4;
}

/** Top-level, non-empty, non-spam notes (drops replies = notes carrying an `e` tag), newest first. */
function rootNotes(events: Event[]): Event[] {
  return events
    .filter(
      (event) => event.content.trim() && !event.tags.some((e) => e[0] === "e") && !isSpammy(event),
    )
    .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
}

/** Resolve kind:0 author names for a set of events and map them to FeedNotes (dedup by id). */
async function notesFromEvents(
  events: Event[],
  actionsFor?: (id: string) => FeedNote["actions"],
): Promise<FeedNote[]> {
  const pubkeys = [...new Set(events.map((event) => event.pubkey))].slice(0, 200);
  const profiles = new Map<string, Profile>();
  if (pubkeys.length) {
    const metas = await queryEvents({ kinds: [0], authors: pubkeys }, 3500);
    const newest = new Map<string, number>();
    for (const meta of metas) {
      const ts = meta.created_at ?? 0;
      if ((newest.get(meta.pubkey) ?? 0) >= ts) continue;
      newest.set(meta.pubkey, ts);
      profiles.set(meta.pubkey, parseProfile(meta));
    }
  }
  const seen = new Set<string>();
  const notes: FeedNote[] = [];
  for (const event of events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    notes.push(toNote(event, profiles.get(event.pubkey), actionsFor?.(event.id)));
  }
  return notes;
}

/**
 * Real data off Nostr for one tab. The General tab runs the curated global feed; every other tab is a
 * `#t` hashtag query (newest first). Author names come from kind:0 profiles. Falls back to the tab's
 * on-brand mock if the relays return nothing or error, so the feed is never blank.
 */
export async function loadFeedNotes(tab: FeedTab): Promise<FeedNote[]> {
  if (tab.algo === "general") return loadGeneralFeed();
  try {
    const events = await queryEvents({ kinds: [1], "#t": tab.hashtags, limit: 80 });
    const roots = rootNotes(events).slice(0, 40);
    if (roots.length === 0) return mockFor(tab);
    const notes = await notesFromEvents(roots);
    return notes.length ? notes : mockFor(tab);
  } catch {
    return mockFor(tab);
  }
}

// --- General channel: a curated global feed (Iris-style) -------------------------------------------
//
// Like Iris's global/popular feed: pull the recent global firehose, drop replies/spam, keep author
// diversity, then rank by engagement (zaps > reposts > likes, from kinds 9735/6/7 that reference each
// note) blended with a recency boost. Real repost/zap counts are surfaced on the cards. Pure read.

const GENERAL_TAB: FeedTab = BUILTIN_TABS[0] as FeedTab;

/** Recent global notes, de-spammed, max 2 per author, newest first — the ranking candidates. */
function generalCandidates(events: Event[]): Event[] {
  const perAuthor = new Map<string, number>();
  const out: Event[] = [];
  for (const event of rootNotes(events)) {
    if (event.content.trim().length < 2) continue;
    const count = perAuthor.get(event.pubkey) ?? 0;
    if (count >= 2) continue;
    perAuthor.set(event.pubkey, count + 1);
    out.push(event);
    if (out.length >= 80) break;
  }
  return out;
}

async function loadGeneralFeed(): Promise<FeedNote[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    // Skip the freshest ~30 min (no engagement yet) and look back over recent notes that have had time
    // to gather zaps/reposts — that's what turns a firehose into a "popular" feed (Iris-style).
    const events = await queryEvents({ kinds: [1], until: now - 1800, limit: 220 }, 5000);
    const candidates = generalCandidates(events);
    if (candidates.length === 0) return mockFor(GENERAL_TAB);

    // Tally engagement per note from reposts (6), reactions (7) and zap receipts (9735).
    const ids = candidates.map((event) => event.id);
    const candidateIds = new Set(ids);
    const reposts = new Map<string, number>();
    const zaps = new Map<string, number>();
    const likes = new Map<string, number>();
    try {
      const reactions = await queryEvents({ kinds: [6, 7, 9735], "#e": ids, limit: 1000 }, 4000);
      for (const reaction of reactions) {
        const target = reaction.tags.filter((e) => e[0] === "e").pop()?.[1];
        if (!target || !candidateIds.has(target)) continue;
        const bucket = reaction.kind === 9735 ? zaps : reaction.kind === 6 ? reposts : likes;
        bucket.set(target, (bucket.get(target) ?? 0) + 1);
      }
    } catch {
      /* engagement is best-effort — fall back to a recency-only ranking */
    }

    const ranked = candidates
      .map((event) => {
        const engagement =
          (likes.get(event.id) ?? 0) +
          (reposts.get(event.id) ?? 0) * 3 +
          (zaps.get(event.id) ?? 0) * 5;
        const ageHours = Math.max(0, (now - (event.created_at ?? 0)) / 3600);
        const recency = Math.exp(-ageHours / 12); // ~half a day half-life
        return { event, score: engagement + recency * 4 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map((entry) => entry.event);

    const actionsFor = (id: string) => ({
      replies: 0,
      reposts: reposts.get(id) ?? 0,
      zaps: zaps.get(id) ?? 0,
    });
    const notes = await notesFromEvents(ranked, actionsFor);
    return notes.length ? notes : mockFor(GENERAL_TAB);
  } catch {
    return mockFor(GENERAL_TAB);
  }
}

// --- Mock fallback (on-brand, used when relays are quiet) --------------------------------------------

function mockNote(
  id: string,
  author: string,
  meta: string,
  body: string,
  actions: FeedNote["actions"],
  extra: { founder?: boolean; pinned?: boolean } = {},
): FeedNote {
  return { id, author, meta, body, npub: "", pubkey: "", createdAt: 0, actions, ...extra };
}

const MOCK_DEFAULT: FeedNote[] = [
  mockNote(
    "mock-1",
    "racooDNI",
    "founder · npub1dn…420 · 21m",
    "the relays are quiet right now — this is the cached signal. build slowly.",
    { replies: 42, reposts: 19, zaps: 1420 },
    { founder: true, pinned: true },
  ),
  mockNote(
    "mock-2",
    "nind",
    "npub1ni…7g · 1h",
    "come by my plot, the cherry finally bloomed. time builds legend.",
    { replies: 12, reposts: 1, zaps: 210 },
  ),
];

const MOCK: Record<string, FeedNote[]> = {
  poc: [
    mockNote(
      "poc-1",
      "racooDNI",
      "founder · npub1dn…420 · 8m",
      "gm from the Palace of Culture. money buys style, time builds legend.",
      { replies: 84, reposts: 210, zaps: 6000 },
      { founder: true, pinned: true },
    ),
    mockNote(
      "poc-2",
      "flx",
      "builder · npub1fl…600 · 32m",
      "Home is the feed now. PoC + Guild built in, add your own moods. nostr underneath.",
      { replies: 21, reposts: 12, zaps: 904 },
    ),
  ],
  guild: [
    mockNote(
      "guild-1",
      "mara",
      "guild · npub1ma…stg · 14m",
      "guild stage goes up tonight. bring lanterns. (guilds get real groups soon — NIP-29.)",
      { replies: 18, reposts: 7, zaps: 540 },
      { pinned: true },
    ),
    mockNote(
      "guild-2",
      "bem",
      "guild · npub1be…fsh · 2h",
      "back from the water. who's holding the corner plot near the stage?",
      { replies: 9, reposts: 2, zaps: 120 },
    ),
  ],
};

function mockFor(tab: FeedTab): FeedNote[] {
  return MOCK[tab.id] ?? MOCK_DEFAULT;
}
