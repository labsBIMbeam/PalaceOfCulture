/**
 * Shell-owned Palace state.
 *
 * This is the answer to Round 5 findings 2 and 3: chat transport, playback and
 * session live *above* every renderer and every panel, so switching web↔world or
 * collapsing a panel cannot take them with it. Napplets subscribe to snapshots
 * and send intents; nothing downstream owns durable state.
 *
 * The controllers here are reference implementations driven by fixtures — this
 * is a framework, not the game. The real app substitutes the same surface backed
 * by its own transports: `ChatController` over NIP-29/NIP-17, a
 * `SessionMediaController` owning the single `<audio>` element, presence over
 * Colyseus (ephemeral per ADR 0006), guild/session over the SQLite truth tier.
 * Because napplets only ever see snapshots and intents, that substitution does
 * not touch a single napplet.
 */
import type {
  ChatMessage,
  ChatState,
  GuildState,
  IntentResult,
  MediaState,
  PalaceDomain,
  PalaceIntent,
  PalaceSnapshots,
  PresenceState,
  SessionState,
} from "./domains.js";

/** Notified whenever a domain snapshot changes. */
export type StateListener = (domain: PalaceDomain, snapshot: unknown) => void;

const ok: IntentResult = { ok: true };

function refuse(error: string, reason?: string): IntentResult {
  return reason === undefined ? { ok: false, error } : { ok: false, error, reason };
}

/** Starting state for a shell with nothing loaded. */
export function emptySnapshots(): PalaceSnapshots {
  return {
    session: {
      sessionId: null,
      activityId: null,
      title: "",
      focused: false,
      participants: [],
      surface: "web",
    },
    presence: { peers: [], updatedAt: 0 },
    guild: { lens: { kind: "commons" }, guilds: [] },
    media: { nowPlaying: null, playing: false, positionSec: 0, durationSec: 0, queue: [] },
    chat: { channels: ["world"], activeChannel: "world", messages: [], unread: {} },
  };
}

/** How the shell identifies the local user when it stamps an authored message. */
export interface ShellActor {
  pubkey: string;
  handle: string;
}

const MAX_MESSAGES = 500;

/**
 * The single source of Palace UI state for one shell.
 *
 * Every mutation goes through {@link apply}. Napplets never hold a reference to
 * this object — the host reads snapshots out of it and posts them across the
 * sandbox boundary.
 */
export class PalaceState {
  private snapshots: PalaceSnapshots;
  private readonly listeners = new Set<StateListener>();
  private readonly actor: ShellActor;
  private messageSeq = 0;

  constructor(actor: ShellActor, initial: Partial<PalaceSnapshots> = {}) {
    this.actor = actor;
    this.snapshots = { ...emptySnapshots(), ...initial };
  }

  /** Current snapshot of one domain. Callers must not mutate the result. */
  get<K extends PalaceDomain>(domain: K): PalaceSnapshots[K] {
    return this.snapshots[domain];
  }

  /** Listen for snapshot changes. Returns an unsubscribe function. */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Apply a napplet intent. The intent has already been shape-checked and
   * grant-checked by the host; this decides whether it is *allowed* and what it
   * means. Refusal is a normal return value.
   */
  apply(intent: PalaceIntent): IntentResult {
    switch (intent.domain) {
      case "guild":
        return this.applyGuild(intent);
      case "session":
        return this.applySession(intent);
      case "media":
        return this.applyMedia(intent);
      case "chat":
        return this.applyChat(intent);
      case "presence":
        this.patch("presence", { updatedAt: this.snapshots.presence.updatedAt + 1 });
        return ok;
      default:
        return refuse("unknown-domain");
    }
  }

  /**
   * Advance playback. The real controller reads this off the audio element;
   * here it is a clock so the demo can show playback surviving a surface switch.
   */
  tick(deltaSec: number): void {
    const media = this.snapshots.media;
    if (!media.playing || media.nowPlaying === null) return;
    const next = Math.min(media.durationSec, media.positionSec + deltaSec);
    if (next >= media.durationSec && media.durationSec > 0) {
      this.apply({ domain: "media", action: "next" });
      return;
    }
    this.patch("media", { positionSec: next });
  }

  /** Push a message that did not originate here (the transport's inbound path). */
  receiveMessage(message: Omit<ChatMessage, "self">): void {
    const chat = this.snapshots.chat;
    const full: ChatMessage = { ...message, self: false };
    const unread = { ...chat.unread };
    if (message.channel !== chat.activeChannel) {
      unread[message.channel] = (unread[message.channel] ?? 0) + 1;
    }
    this.patch("chat", {
      messages: [...chat.messages, full].slice(-MAX_MESSAGES),
      unread,
    });
  }

  /** Replace presence wholesale — it is ephemeral and always arrives complete. */
  setPresence(peers: PresenceState["peers"]): void {
    this.patch("presence", { peers, updatedAt: this.snapshots.presence.updatedAt + 1 });
  }

  private applyGuild(intent: Extract<PalaceIntent, { domain: "guild" }>): IntentResult {
    const guild = this.snapshots.guild;
    if (intent.action === "setLens") {
      const lens = intent.lens;
      if (lens.kind === "guild" && !guild.guilds.some((g) => g.id === lens.guildId)) {
        return refuse("unknown-guild", "no such guild in this lens set");
      }
      this.patch("guild", { lens });
      return ok;
    }
    this.patch("guild", {
      guilds: guild.guilds.map((g) => (g.id === intent.guildId ? { ...g, unread: 0 } : g)),
    });
    return ok;
  }

  private applySession(intent: Extract<PalaceIntent, { domain: "session" }>): IntentResult {
    const session = this.snapshots.session;
    switch (intent.action) {
      case "join":
        // Bell Mode: joining focuses the shell rather than navigating anywhere.
        this.patch("session", {
          sessionId: `session-${intent.activityId}`,
          activityId: intent.activityId,
          title: intent.activityId,
          focused: true,
          participants: [this.actor.pubkey],
        });
        return ok;
      case "leave":
        if (session.sessionId === null) return refuse("not-in-session");
        this.patch("session", {
          sessionId: null,
          activityId: null,
          title: "",
          focused: false,
          participants: [],
        });
        return ok;
      case "setSurface":
        // The whole point of the shell: this changes the renderer and nothing else.
        this.patch("session", { surface: intent.surface });
        return ok;
      case "invite":
        if (session.sessionId === null) return refuse("not-in-session");
        if (session.participants.includes(intent.pubkey)) return refuse("already-participant");
        this.patch("session", { participants: [...session.participants, intent.pubkey] });
        return ok;
      default:
        return refuse("unknown-action");
    }
  }

  private applyMedia(intent: Extract<PalaceIntent, { domain: "media" }>): IntentResult {
    const media = this.snapshots.media;
    switch (intent.action) {
      case "play": {
        if (intent.itemId === undefined) {
          if (media.nowPlaying === null) return refuse("nothing-queued");
          this.patch("media", { playing: true });
          return ok;
        }
        const item = media.queue.find((entry) => entry.id === intent.itemId);
        if (item === undefined) return refuse("unknown-item");
        this.patch("media", {
          nowPlaying: item,
          playing: true,
          positionSec: 0,
          durationSec: 180,
        });
        return ok;
      }
      case "pause":
        this.patch("media", { playing: false });
        return ok;
      case "next": {
        if (media.queue.length === 0) return refuse("nothing-queued");
        const index = media.queue.findIndex((entry) => entry.id === media.nowPlaying?.id);
        const next = media.queue[(index + 1) % media.queue.length];
        if (next === undefined) return refuse("nothing-queued");
        this.patch("media", {
          nowPlaying: next,
          playing: true,
          positionSec: 0,
          durationSec: 180,
        });
        return ok;
      }
      case "seek": {
        if (media.nowPlaying === null) return refuse("nothing-queued");
        if (!Number.isFinite(intent.positionSec) || intent.positionSec < 0) {
          return refuse("bad-position");
        }
        this.patch("media", { positionSec: Math.min(media.durationSec, intent.positionSec) });
        return ok;
      }
      default:
        return refuse("unknown-action");
    }
  }

  private applyChat(intent: Extract<PalaceIntent, { domain: "chat" }>): IntentResult {
    const chat = this.snapshots.chat;
    if (intent.action === "setChannel") {
      if (!chat.channels.includes(intent.channel)) return refuse("unknown-channel");
      const unread = { ...chat.unread };
      delete unread[intent.channel];
      this.patch("chat", { activeChannel: intent.channel, unread });
      return ok;
    }
    const body = intent.body.trim();
    if (body === "") return refuse("empty-message");
    if (!chat.channels.includes(intent.channel)) return refuse("unknown-channel");
    this.messageSeq += 1;
    // The author is stamped from the shell's own actor — never from the napplet.
    const message: ChatMessage = {
      id: `m${this.messageSeq}`,
      channel: intent.channel,
      author: this.actor.handle,
      body,
      atMs: 0,
      self: true,
      system: false,
    };
    this.patch("chat", { messages: [...chat.messages, message].slice(-MAX_MESSAGES) });
    return ok;
  }

  private patch<K extends PalaceDomain>(domain: K, next: Partial<PalaceSnapshots[K]>): void {
    this.snapshots = {
      ...this.snapshots,
      [domain]: { ...this.snapshots[domain], ...next },
    };
    const snapshot = this.snapshots[domain];
    for (const listener of this.listeners) listener(domain, snapshot);
  }
}

/** Convenience: the state a fresh shell starts from, given an actor. */
export function createState(actor: ShellActor, initial?: Partial<PalaceSnapshots>): PalaceState {
  return new PalaceState(actor, initial);
}

/** Re-exported so hosts can type their own seams without reaching into domains. */
export type { ChatState, GuildState, MediaState, PresenceState, SessionState };
