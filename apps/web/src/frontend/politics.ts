export type PoliticsCategory =
  | "all"
  | "government"
  | "opposition"
  | "markets"
  | "media"
  | "tech"
  | "bitcoin";

export type CitadelWireItem = {
  id: string;
  category: Exclude<PoliticsCategory, "all">;
  publishedAt: string;
  marketLine?: string;
  title: string;
  factualBody: string;
  sourceUrl: string;
};

export const POLITICS_CATEGORIES: { id: PoliticsCategory; label: string }[] = [
  { id: "all", label: "All wires" },
  { id: "government", label: "Government" },
  { id: "opposition", label: "Opposition" },
  { id: "markets", label: "Markets" },
  { id: "media", label: "Media" },
  { id: "tech", label: "Tech" },
  { id: "bitcoin", label: "Bitcoin" },
];
