/**
 * The Prism region map.
 *
 * `PALACE-INTERFACE-CONCEPTS.md` Round 4/5 fixes the shell layout; this turns
 * that drawing into the slots a host can mount napplets into. Regions are
 * named, not positional: the host decides geometry, the napplet only ever knows
 * which region it was mounted in.
 *
 * Bell Mode (Proposal 3) is a region-visibility change, not a different shell —
 * the rail collapses and the center refocuses, but nothing remounts. That is the
 * whole point of Round 5 finding 1.
 */
import type { PalaceDomain, ShippedDomain } from "./domains.js";

/** A mountable slot in the Prism shell. */
export const REGIONS = [
  "guild-rail",
  "guild-context",
  "center-stage",
  "people-and-now",
  "session-dock",
  "chat",
] as const;

/** A Prism region name. */
export type Region = (typeof REGIONS)[number];

/** One napplet pinned to one region. */
export interface RegionEntry {
  /** Stable id; also the storage scope and the allowlist key. */
  id: string;
  region: Region;
  title: string;
  /** Same-origin URL of the napplet artifact (one self-contained HTML file). */
  artifactUrl: string;
  /** SHA-256 of that artifact. Empty disables the check — dev only. */
  sha256?: string;
  /** Domains this napplet may talk to. Anything else is refused by the host. */
  grants: readonly (PalaceDomain | ShippedDomain)[];
}

/** Regions hidden while a Session has focus (Bell Mode). */
export const BELL_MODE_COLLAPSED: readonly Region[] = ["guild-rail", "guild-context"];

/** True when a region should render given the current Bell Mode state. */
export function isRegionVisible(region: Region, sessionFocused: boolean): boolean {
  if (!sessionFocused) return true;
  return !BELL_MODE_COLLAPSED.includes(region);
}

/**
 * Refuses a napplet the domains it was not granted. Grants are declared per
 * entry rather than globally so the chat panel cannot read presence and the
 * guild rail cannot drive playback — least privilege between first-party
 * panels, which is what makes the same host safe for third-party ones later.
 */
export function isGranted(entry: RegionEntry, domain: string): boolean {
  return (entry.grants as readonly string[]).includes(domain);
}
