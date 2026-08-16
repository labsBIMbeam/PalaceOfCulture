/**
 * @600b/napplet-framework — the Palace shell as a NIP-5D runtime.
 *
 * Every UI panel is a sandboxed napplet; the shell owns the state. See
 * `README.md` for the contract and `docs/PALACE-INTERFACE-CONCEPTS.md` Round 4/5
 * for the layout and the state-lifetime findings this implements.
 */
export {
  PALACE_DOMAINS,
  SHIPPED_DOMAINS,
  isNappletMessage,
  isPalaceIntent,
  type ActivityId,
  type ChatMessage,
  type ChatState,
  type GuildId,
  type GuildLens,
  type GuildState,
  type GuildSummary,
  type IntentResult,
  type MediaItem,
  type MediaState,
  type NappletMessage,
  type PalaceDomain,
  type PalaceIntent,
  type PalaceSnapshots,
  type PalaceTheme,
  type Peer,
  type PresenceState,
  type Pubkey,
  type SessionId,
  type SessionState,
  type ShellMessage,
  type ShippedDomain,
} from "./domains.js";

export {
  BELL_MODE_COLLAPSED,
  REGIONS,
  isGranted,
  isRegionVisible,
  type Region,
  type RegionEntry,
} from "./regions.js";

export {
  PalaceState,
  createState,
  emptySnapshots,
  type ShellActor,
  type StateListener,
} from "./controllers.js";

export { PrismHost, type PrismHostOptions, type RegionElements } from "./host.js";

export { PRELUDE_SOURCE } from "./prelude.js";
