export type ScreenId = "title" | "map" | "home" | "workshop" | "pleb";

export type EngineTarget = "hq" | "home";

// The player identity + avatar record lives in the shared schema (client + server speak it).
export type { Character } from "@600b/shared";

export type FeedAction = {
  replies: number;
  reposts: number;
  zaps: number;
};

export type FeedPost = {
  id: string;
  author: string;
  meta: string;
  body: string;
  pinned?: boolean;
  founder?: boolean;
  actions: FeedAction;
};

export type EventItem = {
  title: string;
  tag: string;
  description: string;
};

export type FeedConfig = {
  title: string;
  subtitle: string;
  status: string;
  tone: "gold" | "green" | "coral";
  icon: IconName;
  placeholder: string;
  action: string;
  posts: FeedPost[];
  events?: EventItem[];
};

export type MarketItem = {
  id: string;
  title: string;
  meta: string;
  price: string;
  badge?: string;
  icon: IconName;
  tone: "gold" | "coral" | "teal" | "deep";
  locked?: boolean;
  /** External checkout deeplink (e.g. the listing on plebeian.market). Buy opens it in a new tab. */
  href?: string;
  /** Product photo from the Nostr listing (NIP-15 `images` / NIP-99 `image`); falls back to the icon. */
  image?: string;
};

export type NavItem = {
  id: ScreenId;
  name: string;
  label: string;
  tag: string;
  icon: IconName;
};

/** A committed timelock shown on the Home "legendwall" — days locked is the hero metric. */
export type Timelock = {
  id: string;
  tier: string;
  name: string;
  grewInto: string;
  daysLocked: number;
  unlock: string;
  status: "growing" | "sealed";
  icon: IconName;
  tone: "gold" | "coral" | "teal" | "deep";
  detail: string;
};

/** A member of your private circle (the Nostr friend browser on Home). */
export type Friend = {
  id: string;
  handle: string;
  status: string;
  online: boolean;
  founder?: boolean;
};

/**
 * A placed asset shown as a dot near HQ on the Map — the scalable "town" view.
 * `personal` = your grown timelock assets, `community` = landmarks built into the Palace of Culture.
 */
export type WorldAsset = {
  id: string;
  name: string;
  category: "personal" | "community";
  /** Lat/lng offset (degrees) from the HQ marker, so the dots cluster around it. */
  offset: [number, number];
};

export type IconName =
  | "block"
  | "brush"
  | "car"
  | "chevron"
  | "coins"
  | "community"
  | "crown"
  | "doc"
  | "events"
  | "flower"
  | "globe"
  | "hammer"
  | "home"
  | "lock"
  | "map"
  | "palace"
  | "paw"
  | "play"
  | "pause"
  | "reply"
  | "repost"
  | "ring"
  | "check"
  | "search"
  | "shirt"
  | "spark"
  | "sprout"
  | "store"
  | "zap";
