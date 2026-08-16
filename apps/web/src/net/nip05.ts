// NIP-05 resolution: name@domain → hex pubkey via /.well-known/nostr.json. The spec REQUIRES
// CORS (`Access-Control-Allow-Origin: *`) on that file, so a browser fetch is the intended path.
// Used by the zap flow to turn a roster identity into a receipt-capable pubkey — resolution
// failure is never fatal there (the zap degrades to plain LNURL-pay without a 9734).

/** name@domain → the well-known URL, or null when the address isn't NIP-05 shaped. */
export function nip05Url(address: string): string | null {
  const match = address.trim().match(/^([\w.+-]+)@([\w.-]+)$/);
  if (!match) return null;
  return `https://${match[2]}/.well-known/nostr.json?name=${encodeURIComponent(match[1] ?? "")}`;
}

/** Resolve a NIP-05 address to its 64-hex pubkey, or null (offline, missing, malformed). */
export async function resolveNip05(address: string): Promise<string | null> {
  const url = nip05Url(address);
  if (!url) return null;
  const name = address.trim().split("@")[0]?.toLowerCase() ?? "";
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const names = data?.names;
    if (!names || typeof names !== "object") return null;
    // Local-parts compare case-insensitively (NIP-05); the JSON may key either casing.
    for (const [key, value] of Object.entries(names as Record<string, unknown>)) {
      if (key.toLowerCase() === name && typeof value === "string" && /^[0-9a-f]{64}$/.test(value)) {
        return value;
      }
    }
    return null;
  } catch {
    return null;
  }
}
