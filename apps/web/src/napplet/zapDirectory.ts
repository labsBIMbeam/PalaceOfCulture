// Who on the street can receive a zap, and where the money goes. Identity is resolved
// OUT-OF-BAND from the roster — never from the presence room (ADR 0009: no identity keys on
// the realtime transport, and a self-asserted pubkey would let an imposter RECEIVE zaps).
// A room handle is only a lookup key into the 600.wtf roster; funds can therefore only ever
// flow to the roster-registered identity for that name — impersonating a handle merely zaps
// the real person being impersonated.

import { MEMBERS } from "../ui/members";

export interface ZapRecipient {
  /** Roster display name (the room handle that matched). */
  handle: string;
  /** NIP-05 address from the roster — doubles as the LUD-16 candidate. */
  address: string;
}

/** The roster identity behind a street handle, or null when the handle isn't zappable. */
export function zapRecipientFor(handle: string): ZapRecipient | null {
  const trimmed = handle.trim().toLowerCase();
  if (!trimmed) return null;
  const member = MEMBERS.find((entry) => entry.name.toLowerCase() === trimmed);
  // Non-address placeholders ("your own key, later") are filtered by the shape check.
  if (!member || !/^[\w.+-]+@[\w.-]+$/.test(member.nostr)) return null;
  return { handle: member.name, address: member.nostr };
}
