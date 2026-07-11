export type MapSearchLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "country" | "hq" | "community" | "personal";
  aliases?: string[];
};

function normalizeSearchTerm(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();
}

/** Find the best mapped location, preferring exact and prefix matches over loose matches. */
export function findMapLocation(
  locations: MapSearchLocation[],
  query: string,
): MapSearchLocation | null {
  const needle = normalizeSearchTerm(query);
  if (!needle) return null;

  let best: { location: MapSearchLocation; score: number } | null = null;
  for (const location of locations) {
    const terms = [location.name, ...(location.aliases ?? [])].map(normalizeSearchTerm);
    let score = Number.POSITIVE_INFINITY;
    if (terms.some((term) => term === needle)) score = 0;
    else if (terms.some((term) => term.startsWith(needle))) score = 1;
    else if (terms.some((term) => term.includes(needle))) score = 2;

    if (score < (best?.score ?? Number.POSITIVE_INFINITY)) best = { location, score };
  }

  return best?.location ?? null;
}
