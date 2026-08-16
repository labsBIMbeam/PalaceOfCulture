/**
 * Geohash decoding.
 *
 * Nostr geotags events with `["g", "<geohash>"]` (NIP-52 calendar events,
 * NIP-99/gamma listings, NIP-53 live events). Decoding is all this map needs —
 * it never encodes, so this is the whole implementation.
 */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/** A decoded geohash: centre point plus the cell's half-extents in degrees. */
export interface Cell {
  lat: number;
  lon: number;
  latError: number;
  lonError: number;
}

/**
 * Decode a geohash to its cell centre. Returns null for anything that is not a
 * valid geohash — relay content is untrusted input.
 */
export function decodeGeohash(hash: string): Cell | null {
  const value = hash.trim().toLowerCase();
  if (value.length === 0 || value.length > 12) return null;

  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let isLon = true;

  for (const char of value) {
    const index = BASE32.indexOf(char);
    if (index < 0) return null;
    for (let bit = 4; bit >= 0; bit -= 1) {
      const on = (index >> bit) & 1;
      if (isLon) {
        const mid = (lonMin + lonMax) / 2;
        if (on === 1) lonMin = mid;
        else lonMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (on === 1) latMin = mid;
        else latMax = mid;
      }
      isLon = !isLon;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lon: (lonMin + lonMax) / 2,
    latError: (latMax - latMin) / 2,
    lonError: (lonMax - lonMin) / 2,
  };
}
