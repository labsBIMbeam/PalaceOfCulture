import { BUILTIN_TABS, type FeedTab } from "../net/socialModel";

// The player's chosen feed tabs (built-ins + added presets/custom), persisted on the device. Mirrors
// the localStorage half of character/store.ts. Plug-and-play today; could move to the server truth-tier
// later like the character record. Default = the two built-in tabs (PoC, Guild).

const KEY = "600b:feedTabs";

function isTab(value: unknown): value is FeedTab {
  if (!value || typeof value !== "object") return false;
  const tab = value as Record<string, unknown>;
  return (
    typeof tab.id === "string" &&
    typeof tab.label === "string" &&
    typeof tab.icon === "string" &&
    Array.isArray(tab.hashtags)
  );
}

/**
 * Always anchor the built-ins (General, PoC, Guild) at the front — fresh canonical defs — then keep the
 * player's added custom/preset tabs after them. So new built-ins appear even for an older saved list,
 * and a built-in's hashtags can be updated without stranding the user on a stale copy.
 */
function withBuiltins(saved: FeedTab[]): FeedTab[] {
  const builtinIds = new Set(BUILTIN_TABS.map((tab) => tab.id));
  const customs = saved.filter((tab) => !tab.builtin && !builtinIds.has(tab.id));
  return [...BUILTIN_TABS, ...customs];
}

/** Load the saved tab list (built-ins always present), falling back to the built-ins if absent. */
export function loadTabs(): FeedTab[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [...BUILTIN_TABS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...BUILTIN_TABS];
    return withBuiltins(parsed.filter(isTab));
  } catch {
    return [...BUILTIN_TABS];
  }
}

/** Persist the tab list. No-op (session-only) if storage is unavailable. */
export function saveTabs(tabs: FeedTab[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(tabs));
  } catch {
    /* storage disabled — tabs stay in memory for the session */
  }
}
