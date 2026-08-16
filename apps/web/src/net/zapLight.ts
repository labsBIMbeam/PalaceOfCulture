// Zaps light the street — the client-side light state (docs/design/demo-loop-and-zap-light.md).
// Fed by validated room broadcasts; read imperatively from render loops (glow, lamps) and
// via subscription from React (nameplate counters). Presence-layer VFX only: nothing here
// is owned state, and NOTHING else in the game may brighten the street.

/** How long a received zap keeps its lantern glowing — 21 minutes, of course. */
export const GLOW_MS = 21 * 60 * 1000;
/** Street-wide lamp boost saturates at this many zaps in the glow window. */
const LAMP_SATURATION = 6;
/** The nameplate counter displays at most this before becoming "21+". */
const COUNTER_CAP = 21;

interface Received {
  count: number;
  glowUntil: number;
}

const bySession = new Map<string, Received>();
/** Timestamps of every flash on the street in the rolling window (drives the lamps). */
let streetFlashes: number[] = [];
let version = 0;
const listeners = new Set<() => void>();

function emit(): void {
  version += 1;
  for (const listener of listeners) listener();
}

/** Record one validated flash for a session (called from the transport's broadcast handler). */
export function recordZapFlash(sessionId: string, now = Date.now()): void {
  const entry = bySession.get(sessionId) ?? { count: 0, glowUntil: 0 };
  entry.count += 1;
  entry.glowUntil = now + GLOW_MS;
  bySession.set(sessionId, entry);
  streetFlashes = streetFlashes.filter((t) => t > now - GLOW_MS);
  streetFlashes.push(now);
  emit();
}

/** Is this player's lantern currently glowing? (Render-loop safe.) */
export function glowActive(sessionId: string, now = Date.now()): boolean {
  const entry = bySession.get(sessionId);
  return Boolean(entry && entry.glowUntil > now);
}

/** 0..1 glow strength with a soft tail so the light fades instead of snapping off. */
export function glowStrength(sessionId: string, now = Date.now()): number {
  const entry = bySession.get(sessionId);
  if (!entry || entry.glowUntil <= now) return 0;
  const remaining = (entry.glowUntil - now) / GLOW_MS;
  return Math.min(1, 0.35 + remaining * 0.65);
}

/** Session-scoped received-zap count for the nameplate. */
export function zapCount(sessionId: string): number {
  return bySession.get(sessionId)?.count ?? 0;
}

/** "⚡ n" up to 21, then "⚡ 21+" — status without a leaderboard arms race. */
export function zapCounterLabel(sessionId: string): string | null {
  const count = zapCount(sessionId);
  if (count <= 0) return null;
  return count > COUNTER_CAP ? `⚡ ${COUNTER_CAP}+` : `⚡ ${count}`;
}

/** 0..1 street-wide lamp boost from zap activity in the last 21 minutes. */
export function lampBoost(now = Date.now()): number {
  streetFlashes = streetFlashes.filter((t) => t > now - GLOW_MS);
  return Math.min(1, streetFlashes.length / LAMP_SATURATION);
}

/** Reset everything (session end / tests). */
export function resetZapLight(): void {
  bySession.clear();
  streetFlashes = [];
  emit();
}

// --- React wiring (useSyncExternalStore shape) ---
export function subscribeZapLight(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function zapLightVersion(): number {
  return version;
}
