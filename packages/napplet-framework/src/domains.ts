/**
 * Palace-local NAP domains.
 *
 * NIP-5D ships domains for Nostr-shaped concerns (outbox, storage, resource,
 * link, theme, identity, common, count, dm, lists). It ships nothing for the
 * things a Palace UI panel actually needs: which guild lens is active, who is
 * present, what is playing, what session you are in. These are that gap, defined
 * locally and namespaced `palace.*` so they can never be mistaken for shipped
 * protocol.
 *
 * Two rules hold the design together:
 *
 * 1. **Napplets are views.** Every mutation here is an *intent*: the napplet asks,
 *    a shell controller decides, and the resulting state comes back as a snapshot.
 *    A napplet cannot write Palace state directly. This is what keeps chat and
 *    media playback alive across a web↔world switch instead of dying with the
 *    panel that happened to own them (PALACE-INTERFACE-CONCEPTS Round 5, findings
 *    2 and 3).
 * 2. **The shell owns identity.** No message carries a caller-supplied actor. The
 *    host stamps the actor from the connection it already authenticated, per
 *    PALACE-CORE: never trust an iframe-supplied pubkey.
 *
 * Upstream gap to flag on the NAPs track: sessions, presence and shared playback
 * are generic runtime concerns, not Palace ones. If NAP equivalents appear, these
 * should be retired rather than maintained in parallel.
 */

/** Every Palace-local domain name. */
export const PALACE_DOMAINS = ["session", "presence", "guild", "media", "chat"] as const;

/** A Palace-local domain name. */
export type PalaceDomain = (typeof PALACE_DOMAINS)[number];

/** Shipped NIP-5D domains the shell also exposes to UI napplets. */
export const SHIPPED_DOMAINS = ["identity", "theme", "storage", "link", "resource"] as const;

/** A shipped domain name the shell re-exposes. */
export type ShippedDomain = (typeof SHIPPED_DOMAINS)[number];

/* ------------------------------------------------------------------ ids */

/** Opaque id of a guild. */
export type GuildId = string;
/** Opaque id of a canonical Activity (ADR 0008). */
export type ActivityId = string;
/** Opaque id of a Session — the social instance of an Activity. */
export type SessionId = string;
/** Hex-encoded Nostr public key. */
export type Pubkey = string;

/**
 * The three explicit lenses from ADR 0008. A lens is a global filter, never a
 * page: `union` is the deterministic union of joined guilds, `commons` is the
 * public curated surface for people without one.
 */
export type GuildLens =
  | { kind: "guild"; guildId: GuildId }
  | { kind: "union" }
  | { kind: "commons" };

/* -------------------------------------------------------------- snapshots */

/** One guild as the rail renders it. */
export interface GuildSummary {
  id: GuildId;
  name: string;
  crest: string;
  joined: boolean;
  unread: number;
}

/** What the guild rail and context panel read. */
export interface GuildState {
  lens: GuildLens;
  guilds: GuildSummary[];
}

/** A person as the roster renders them. */
export interface Peer {
  pubkey: Pubkey;
  handle: string;
  status: "here" | "away" | "in-session";
  sessionId?: SessionId;
}

/** What People & Now reads. */
export interface PresenceState {
  peers: Peer[];
  /** Ephemeral per ADR 0006 — never treat this as durable truth. */
  updatedAt: number;
}

/** The session the shell is currently in, if any. */
export interface SessionState {
  sessionId: SessionId | null;
  activityId: ActivityId | null;
  title: string;
  /** Bell Mode: the shell collapses the rail and refocuses when true. */
  focused: boolean;
  participants: Pubkey[];
  surface: "web" | "world";
}

/** One playable item. */
export interface MediaItem {
  id: string;
  title: string;
  author: string;
  kind: "music" | "podcast" | "live";
  /** V4V recipient (Podcasting 2.0 `podcast:value`). Display only here. */
  valueRecipient?: string;
}

/**
 * Playback as every surface sees it. One controller owns the audio element; the
 * HUD, the web player and the world stage are all views over this.
 */
export interface MediaState {
  nowPlaying: MediaItem | null;
  playing: boolean;
  positionSec: number;
  durationSec: number;
  queue: MediaItem[];
}

/** One chat message. */
export interface ChatMessage {
  id: string;
  channel: string;
  author: string;
  body: string;
  atMs: number;
  self: boolean;
  system: boolean;
}

/** Chat as every surface sees it: one transport, many views. */
export interface ChatState {
  channels: string[];
  activeChannel: string;
  messages: ChatMessage[];
  unread: Record<string, number>;
}

/** Union of every Palace snapshot, keyed by its domain. */
export interface PalaceSnapshots {
  session: SessionState;
  presence: PresenceState;
  guild: GuildState;
  media: MediaState;
  chat: ChatState;
}

/* ---------------------------------------------------------------- intents */

/**
 * Everything a napplet may ask for. Deliberately closed and bounded — there is
 * no generic RPC, no passthrough, and no way to name an actor other than
 * yourself (Round 5, finding 6).
 */
export type PalaceIntent =
  | { domain: "guild"; action: "setLens"; lens: GuildLens }
  | { domain: "guild"; action: "markRead"; guildId: GuildId }
  | { domain: "session"; action: "join"; activityId: ActivityId }
  | { domain: "session"; action: "leave" }
  | { domain: "session"; action: "setSurface"; surface: "web" | "world" }
  | { domain: "session"; action: "invite"; pubkey: Pubkey }
  | { domain: "media"; action: "play"; itemId?: string }
  | { domain: "media"; action: "pause" }
  | { domain: "media"; action: "next" }
  | { domain: "media"; action: "seek"; positionSec: number }
  | { domain: "chat"; action: "send"; channel: string; body: string }
  | { domain: "chat"; action: "setChannel"; channel: string }
  | { domain: "presence"; action: "refresh" };

/** The shell's answer to an intent. Refusal is a normal outcome, not an error. */
export interface IntentResult {
  ok: boolean;
  /** Machine-readable refusal, e.g. `not-permitted`, `unknown-activity`. */
  error?: string;
  reason?: string;
}

/* ------------------------------------------------------------------ wire */

/** Napplet → shell. */
export type NappletMessage =
  | { type: "palace.ready"; id: string }
  | { type: "palace.subscribe"; id: string; domain: PalaceDomain }
  | { type: "palace.get"; id: string; domain: PalaceDomain }
  | { type: "palace.intent"; id: string; intent: PalaceIntent }
  | { type: "palace.resize"; id: string; height: number };

/** Shell → napplet. */
export type ShellMessage =
  | { type: "palace.result"; id: string; result: unknown }
  | { type: "palace.error"; id: string; error: string; reason?: string }
  | { type: "palace.snapshot"; id: string; domain: PalaceDomain; snapshot: unknown }
  | { type: "palace.theme"; id: string; theme: PalaceTheme };

/** The three colours a napplet is guaranteed; it derives the rest. */
export interface PalaceTheme {
  colors: { background: string; text: string; primary: string };
}

/** True when `value` is a well-formed napplet message. */
export function isNappletMessage(value: unknown): value is NappletMessage {
  if (typeof value !== "object" || value === null) return false;
  const msg = value as { type?: unknown; id?: unknown };
  if (typeof msg.type !== "string" || typeof msg.id !== "string") return false;
  return (
    msg.type === "palace.ready" ||
    msg.type === "palace.subscribe" ||
    msg.type === "palace.get" ||
    msg.type === "palace.intent" ||
    msg.type === "palace.resize"
  );
}

/**
 * Validates an intent's shape before any controller sees it. A napplet is
 * untrusted input: an unknown domain/action pair is refused here rather than
 * falling through to a controller that might interpret it loosely.
 */
export function isPalaceIntent(value: unknown): value is PalaceIntent {
  if (typeof value !== "object" || value === null) return false;
  const intent = value as { domain?: unknown; action?: unknown };
  if (typeof intent.domain !== "string" || typeof intent.action !== "string") return false;
  const allowed: Record<string, readonly string[]> = {
    guild: ["setLens", "markRead"],
    session: ["join", "leave", "setSurface", "invite"],
    media: ["play", "pause", "next", "seek"],
    chat: ["send", "setChannel"],
    presence: ["refresh"],
  };
  return (allowed[intent.domain] ?? []).includes(intent.action);
}
