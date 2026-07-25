/**
 * @600b/napplet-kit — the small shared surface every Palace napplet stands on.
 *
 * A napplet is one self-contained `index.html` the runtime loads into
 * `iframe sandbox="allow-scripts"` with no `allow-same-origin`: opaque origin,
 * no ambient authority. This kit is deliberately thin — it exists so a napplet
 * is ~150 lines of its own logic instead of ~1000 lines of boilerplate, which is
 * the entire argument for splitting the UI up in the first place.
 *
 * Everything here uses **shipped** NAP domains only (`outbox`, `resource`,
 * `storage`, `link`, `theme`, `identity`, `common`). Nothing Palace-specific, so
 * every napplet built on it runs unchanged in any NIP-5D shell.
 */
export { el, button, clear, mount, type ElProps } from "./dom.js";
export { applyTheme, startTheme, FALLBACK_THEME, type Palette } from "./theme.js";
export { has, query, subscribe, bytes, read, write, openLink, profile } from "./nap.js";
export { boot, type BootOptions } from "./boot.js";
export { relative, truncate, initials } from "./format.js";
