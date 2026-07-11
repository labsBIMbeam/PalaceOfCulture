const INTRO_SEEN_KEY = "600b:introSeen:v1";

export type IntroStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Return localStorage when it is usable; privacy modes may deny access entirely. */
export function getBrowserIntroStorage(): IntroStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Whether this browser has already completed or skipped the current intro version. */
export function hasSeenIntro(storage: IntroStorage | null): boolean {
  try {
    return storage?.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Persist intro completion without making unavailable storage fatal to onboarding. */
export function markIntroSeen(storage: IntroStorage | null): void {
  try {
    storage?.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Storage is an optimization; the intro still completes for this session.
  }
}

/** Clear the completion marker so Settings or tests can replay the intro. */
export function resetIntroSeen(storage: IntroStorage | null): void {
  try {
    storage?.removeItem(INTRO_SEEN_KEY);
  } catch {
    // Nothing to reset when storage is unavailable.
  }
}

/** `?intro=replay` is an explicit, bookmarkable replay path without adding another UI control. */
export function introReplayRequested(search: string): boolean {
  return new URLSearchParams(search).get("intro") === "replay";
}

/** Decide the initial intro state from injected storage and URL input for straightforward tests. */
export function shouldShowIntro(storage: IntroStorage | null, search = ""): boolean {
  return introReplayRequested(search) || !hasSeenIntro(storage);
}

/** Character persistence is on by default; only an explicit false-like value disables it. */
export function characterPersistenceEnabled(configuredValue: unknown): boolean {
  if (typeof configuredValue !== "string") return true;
  return !["0", "false", "no", "off"].includes(configuredValue.trim().toLowerCase());
}
