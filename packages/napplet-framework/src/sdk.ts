/**
 * Napplet-side SDK.
 *
 * What a UI napplet imports. It is a thin typed wrapper over the `window.palace`
 * bridge the prelude installs — the same shape the stub napplets use directly,
 * but with the domain types attached so a bundled napplet gets checked against
 * the contract instead of guessing at snapshot shapes.
 *
 * There is no `connect()` and no readiness handshake: the runtime installs the
 * bridge before napplet code runs. If `window.palace` is missing you are not
 * inside a Palace shell, and {@link inShell} is how you find out.
 */
import type {
  ChatState,
  GuildState,
  IntentResult,
  MediaState,
  PalaceDomain,
  PalaceIntent,
  PalaceSnapshots,
  PalaceTheme,
  PresenceState,
  SessionState,
} from "./domains.js";

/** Handle returned by every subscription; call `close` on teardown. */
export interface Subscription {
  close: () => void;
}

interface PalaceBridge {
  get: (domain: PalaceDomain) => Promise<unknown>;
  on: (domain: PalaceDomain, handler: (snapshot: unknown) => void) => Subscription;
  intent: (intent: PalaceIntent) => Promise<IntentResult>;
  onTheme: (handler: (theme: PalaceTheme) => void) => Subscription;
  resize: (height: number) => void;
}

declare global {
  interface Window {
    palace?: PalaceBridge;
  }
}

function bridge(): PalaceBridge {
  const found = typeof window === "undefined" ? undefined : window.palace;
  if (!found) throw new Error("not running inside a Palace shell");
  return found;
}

/** True when this document was mounted by a Palace shell. */
export function inShell(): boolean {
  return typeof window !== "undefined" && Boolean(window.palace);
}

/** Current snapshot of one domain. Rejects when the domain was not granted. */
export function get<K extends PalaceDomain>(domain: K): Promise<PalaceSnapshots[K]> {
  return bridge().get(domain) as Promise<PalaceSnapshots[K]>;
}

/**
 * Snapshot now, then on every change. This is the normal way to read Palace
 * state: a napplet holds no state of its own beyond what it is rendering.
 */
export function on<K extends PalaceDomain>(
  domain: K,
  handler: (snapshot: PalaceSnapshots[K]) => void,
): Subscription {
  return bridge().on(domain, handler as (snapshot: unknown) => void);
}

/**
 * Ask the shell to do something. A refusal is an ordinary answer with
 * `ok: false`, not a thrown error — the shell decides, the napplet renders
 * whatever it decided.
 */
export function intent(value: PalaceIntent): Promise<IntentResult> {
  return bridge().intent(value);
}

/** Follow the Palace palette. The prelude already paints the surface. */
export function onTheme(handler: (theme: PalaceTheme) => void): Subscription {
  return bridge().onTheme(handler);
}

/** Report the natural height of this napplet so the host can size its slot. */
export function resize(height: number): void {
  bridge().resize(height);
}

/** Typed convenience readers, one per domain. */
export const palace = {
  session: (): Promise<SessionState> => get("session"),
  presence: (): Promise<PresenceState> => get("presence"),
  guild: (): Promise<GuildState> => get("guild"),
  media: (): Promise<MediaState> => get("media"),
  chat: (): Promise<ChatState> => get("chat"),
} as const;
