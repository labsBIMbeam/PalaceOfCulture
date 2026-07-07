// Lightning seam for V4V (ADR 0004) — boosts and zaps, non-custodial: we resolve a recipient
// (lightning address / LNURL-pay URL) per LUD-06/LUD-16, fetch an invoice, and hand it to the
// wallet the player already has — WebLN (Alby & co.) when present, else a `lightning:` URI the
// OS wallet picks up. Zaps add a signed NIP-57 request so receipts (kind 9735) land on the note
// and the feed ranking (net/social.ts) picks them up. We never touch keys or custody sats.

import { NDKEvent } from "@nostr-dev-kit/ndk";
import { RELAYS, getNdk, queryEvents } from "./nostr";

/** WebLN (https://webln.dev) — injected by Alby and friends. */
interface WebLNProvider {
  enable(): Promise<void>;
  sendPayment(invoice: string): Promise<{ preimage: string }>;
}

declare global {
  interface Window {
    webln?: WebLNProvider;
  }
}

/** LUD-06 pay endpoint (the JSON behind a lightning address / LNURL). */
export interface PayEndpoint {
  callback: string;
  minSendable: number; // msat
  maxSendable: number; // msat
  commentAllowed?: number;
  allowsNostr?: boolean;
  nostrPubkey?: string;
}

export interface PayResult {
  /** true = paid via WebLN; false = not paid (fallbackUri may hand off to an OS wallet). */
  paid: boolean;
  invoice?: string;
  /** `lightning:` URI to open when no WebLN wallet is around. */
  fallbackUri?: string;
  error?: string;
}

/** name@domain → LUD-16 well-known URL; https URLs pass through. (bech32 lnurl1… TODO later.) */
export function recipientToUrl(recipient: string): string | null {
  const trimmed = recipient.trim();
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  const at = trimmed.match(/^([\w.+-]+)@([\w.-]+)$/);
  if (at) return `https://${at[2]}/.well-known/lnurlp/${at[1]}`;
  return null; // lnurl1 bech32 not supported in v0 — value blocks ship addresses
}

export async function fetchPayEndpoint(recipient: string): Promise<PayEndpoint | null> {
  const url = recipientToUrl(recipient);
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data.callback !== "string") return null;
    return {
      callback: data.callback,
      minSendable: Number(data.minSendable ?? 1000),
      maxSendable: Number(data.maxSendable ?? 100_000_000_000),
      commentAllowed: Number(data.commentAllowed ?? 0) || undefined,
      allowsNostr: Boolean(data.allowsNostr),
      nostrPubkey: typeof data.nostrPubkey === "string" ? data.nostrPubkey : undefined,
    };
  } catch {
    return null;
  }
}

/** LUD-06 callback → bolt11 invoice. `zapRequest` = signed kind-9734 JSON (NIP-57). */
export async function requestInvoice(
  endpoint: PayEndpoint,
  sats: number,
  options: { comment?: string; zapRequest?: string } = {},
): Promise<string | null> {
  const msat = Math.max(endpoint.minSendable, Math.min(endpoint.maxSendable, sats * 1000));
  const url = new URL(endpoint.callback);
  url.searchParams.set("amount", String(msat));
  if (options.comment && endpoint.commentAllowed) {
    url.searchParams.set("comment", options.comment.slice(0, endpoint.commentAllowed));
  }
  if (options.zapRequest && endpoint.allowsNostr) {
    url.searchParams.set("nostr", options.zapRequest);
  }
  try {
    const response = await fetch(url.toString());
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.pr === "string" ? data.pr : null;
  } catch {
    return null;
  }
}

/** Pay via WebLN when available; otherwise return the `lightning:` URI for the OS wallet. */
export async function payInvoice(invoice: string): Promise<PayResult> {
  if (window.webln) {
    try {
      await window.webln.enable();
      await window.webln.sendPayment(invoice);
      return { paid: true, invoice };
    } catch (error) {
      return {
        paid: false,
        invoice,
        fallbackUri: `lightning:${invoice}`,
        error: error instanceof Error ? error.message : "webln payment failed",
      };
    }
  }
  return { paid: false, invoice, fallbackUri: `lightning:${invoice}` };
}

/** V4V boost to a value recipient (PC2.0 `<podcast:valueRecipient>`): plain LNURL-pay + comment. */
export async function sendBoost(
  recipient: string,
  sats: number,
  comment?: string,
): Promise<PayResult> {
  const endpoint = await fetchPayEndpoint(recipient);
  if (!endpoint) return { paid: false, error: `no pay endpoint for ${recipient}` };
  const invoice = await requestInvoice(endpoint, sats, { comment });
  if (!invoice) return { paid: false, error: "no invoice from callback" };
  return payInvoice(invoice);
}

/** The note author's lightning address from their kind-0 profile (lud16, else lud06). */
export async function fetchZapAddress(pubkey: string): Promise<string | null> {
  const events = await queryEvents({ kinds: [0], authors: [pubkey], limit: 1 }, 4000);
  const newest = events.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0];
  if (!newest) return null;
  try {
    const profile = JSON.parse(newest.content);
    return (
      (typeof profile.lud16 === "string" && profile.lud16) ||
      (typeof profile.lud06 === "string" && profile.lud06) ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * NIP-57 zap on a note: signed kind-9734 request → author's LNURL callback → invoice → wallet.
 * The receipt (9735) is published by the recipient's LN service, not by us.
 */
export async function zapNote(
  note: { id: string; pubkey: string },
  sats: number,
  comment = "",
): Promise<PayResult> {
  const address = await fetchZapAddress(note.pubkey);
  if (!address) return { paid: false, error: "author has no lightning address" };
  const endpoint = await fetchPayEndpoint(address);
  if (!endpoint) return { paid: false, error: "no pay endpoint" };

  let zapRequest: string | undefined;
  if (endpoint.allowsNostr && getNdk().signer) {
    const event = new NDKEvent(getNdk());
    event.kind = 9734;
    event.content = comment;
    event.tags = [
      ["relays", ...RELAYS],
      ["amount", String(sats * 1000)],
      ["e", note.id],
      ["p", note.pubkey],
    ];
    await event.sign();
    zapRequest = JSON.stringify(await event.toNostrEvent());
  }

  const invoice = await requestInvoice(endpoint, sats, { comment, zapRequest });
  if (!invoice) return { paid: false, error: "no invoice from callback" };
  return payInvoice(invoice);
}
