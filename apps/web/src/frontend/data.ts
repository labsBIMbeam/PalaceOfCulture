import type {
  FeedConfig,
  Friend,
  MarketItem,
  NavItem,
  ScreenId,
  Timelock,
  WorldAsset,
} from "./types";

export const navItems: NavItem[] = [
  { id: "title", name: "Title", label: "TITLE", tag: "enter", icon: "play" },
  { id: "map", name: "Map", label: "MAP", tag: "world", icon: "globe" },
  { id: "home", name: "Home", label: "HOME", tag: "private", icon: "sprout" },
  { id: "pleb", name: "Pleb Market", label: "PLEB MARKET", tag: "sats", icon: "store" },
  { id: "style", name: "Style Market", label: "STYLE MARKET", tag: "digital", icon: "shirt" },
];

export const feeds: Record<ScreenId, FeedConfig> = {
  title: {
    title: "The Signal",
    subtitle: "global nostr firehose",
    status: "4 RELAYS",
    tone: "green",
    icon: "zap",
    placeholder: "post to the signal...",
    action: "Post",
    posts: [
      {
        id: "signal-1",
        author: "racooDNI",
        meta: "founder / npub1dn...420 / pinned",
        body: "gm. the signal is eternal.",
        pinned: true,
        founder: true,
        actions: { replies: 84, reposts: 210, zaps: 6000 },
      },
      {
        id: "signal-2",
        author: "flx",
        meta: "builder / npub1fl...600 / 12m",
        body: "HQ is awake. First route: title, map, home, markets. Then the engine breathes.",
        actions: { replies: 21, reposts: 12, zaps: 904 },
      },
    ],
    events: [
      {
        title: "Strings of the Atlantic",
        tag: "block 905,522 / tonight",
        description: "live from the plaza stage",
      },
      {
        title: "Founders' Library opening",
        tag: "day 21 / shared",
        description: "a new wing rises",
      },
    ],
  },
  map: {
    title: "World Signal",
    subtitle: "palace discovery",
    status: "HQ LIVE",
    tone: "green",
    icon: "globe",
    placeholder: "ping the world...",
    action: "Ping",
    posts: [
      {
        id: "map-1",
        author: "atlas",
        meta: "cartographer / npub1ma...p00 / now",
        body: "Only HQ is charted. The rest of the world is waiting for foundations.",
        pinned: true,
        actions: { replies: 18, reposts: 7, zaps: 905 },
      },
      {
        id: "map-2",
        author: "madeira",
        meta: "relay / npub1hq...atl / 4m",
        body: "Pico Ruivo marker is active. Click the HQ marker to enter the 3D engine.",
        actions: { replies: 9, reposts: 4, zaps: 321 },
      },
    ],
  },
  home: {
    title: "Your Circle",
    subtitle: "private friends only",
    status: "ENCRYPTED",
    tone: "green",
    icon: "community",
    placeholder: "message your circle...",
    action: "Send",
    posts: [
      {
        id: "home-1",
        author: "nind",
        meta: "circle / npub1ni...7g / 8m",
        body: "come by my plot. the cherry finally bloomed.",
        actions: { replies: 12, reposts: 1, zaps: 210 },
      },
      {
        id: "home-2",
        author: "racooDNI",
        meta: "founder / npub1dn...420 / 21m",
        body: "home is where the lock becomes visible. build slowly.",
        pinned: true,
        founder: true,
        actions: { replies: 42, reposts: 19, zaps: 1420 },
      },
    ],
  },
  pleb: {
    title: "Market Notes",
    subtitle: "peer listings",
    status: "MARKET RELAY",
    tone: "gold",
    icon: "store",
    placeholder: "post a listing...",
    action: "List",
    posts: [
      {
        id: "pleb-1",
        author: "forge",
        meta: "seller / npub1fo...rge / now",
        body: "WTS restored rover. clean title, warm paint, no drama.",
        actions: { replies: 15, reposts: 4, zaps: 800 },
      },
      {
        id: "pleb-2",
        author: "loom",
        meta: "buyer / npub1lo...mkt / 17m",
        body: "WTB lanterns for a stage corner. paying sats direct.",
        actions: { replies: 8, reposts: 2, zaps: 240 },
      },
    ],
  },
  style: {
    title: "Style Drops",
    subtitle: "creators and mints",
    status: "MINTING",
    tone: "coral",
    icon: "spark",
    placeholder: "follow a creator...",
    action: "Drops",
    posts: [
      {
        id: "style-1",
        author: "loom",
        meta: "creator / npub1lm...5d / now",
        body: "the Atlantic Hoodie just dropped. deep teal, gold embroidery. 12 left.",
        pinned: true,
        actions: { replies: 48, reposts: 32, zaps: 2100 },
      },
      {
        id: "style-2",
        author: "bone",
        meta: "creator / npub1bo...2k / 22m",
        body: "minted the plaza lantern set. style only, wear it loud.",
        actions: { replies: 14, reposts: 8, zaps: 640 },
      },
    ],
  },
};

// Pleb-market listings now come live from Nostr (plebeian.market, NIP-15/NIP-99) — see net/market.ts,
// which also holds the on-brand mock fallback (MARKET_MOCK). The Style market stays a static drop list.
export const styleDrops: MarketItem[] = [
  {
    id: "hoodie",
    title: "Atlantic Hoodie",
    meta: "outfit / by @loom",
    price: "120,000",
    badge: "NEW",
    icon: "shirt",
    tone: "teal",
  },
  {
    id: "bike-paint",
    title: "Ember Bike Paint",
    meta: "vehicle paint / by @forge",
    price: "45,000",
    icon: "car",
    tone: "coral",
  },
  {
    id: "tree-patch",
    title: "Gold Tree Patch",
    meta: "decal / by @bone",
    price: "9,000",
    icon: "spark",
    tone: "gold",
  },
  {
    id: "lantern-set",
    title: "Plaza Lantern Set",
    meta: "decor / by @bone",
    price: "30,000",
    icon: "events",
    tone: "coral",
  },
  {
    id: "crown",
    title: "Crown",
    meta: "pet cosmetic / by @loom",
    price: "18,000",
    icon: "crown",
    tone: "teal",
  },
  {
    id: "founder-statue",
    title: "Founder Statue Skin",
    meta: "earned / provenance",
    price: "not for sale",
    badge: "LEGEND",
    icon: "lock",
    tone: "gold",
    locked: true,
  },
];

export const timelockTiers = ["21D", "2100H", "210D", "21M", "21Y"] as const;

// The Home "legendwall" — your committed timelocks. Days locked is the hero metric (not money).
// Mock data for the pilot; the real source is the signed ownership chain (packages/ownership).
export const timelocks: Timelock[] = [
  {
    id: "first-sapling",
    tier: "21Y",
    name: "The First Sapling",
    grewInto: "Ringed Oak / 142 rings",
    daysLocked: 7665,
    unlock: "block 1,150,000",
    status: "sealed",
    icon: "ring",
    tone: "gold",
    detail: "Grown by the original holder. Not for sale, only lived.",
  },
  {
    id: "coast-road-bike",
    tier: "2100H",
    name: "Coast Road Bike",
    grewInto: "Vehicle / Motorbike",
    daysLocked: 55,
    unlock: "block 1,021,400",
    status: "growing",
    icon: "car",
    tone: "coral",
    detail: "Two wheels, earned not given. 33 days to go.",
  },
  {
    id: "cherry-grove",
    tier: "21M",
    name: "Cherry Grove",
    grewInto: "Tree / blossoming",
    daysLocked: 612,
    unlock: "block 968,900",
    status: "growing",
    icon: "sprout",
    tone: "teal",
    detail: "Planted with nind. Blooms every spring it survives.",
  },
  {
    id: "lantern-seed",
    tier: "210D",
    name: "Lantern Seed",
    grewInto: "Sapling / lit",
    daysLocked: 168,
    unlock: "block 928,300",
    status: "growing",
    icon: "events",
    tone: "deep",
    detail: "A short vow. Small light, kept burning.",
  },
];

// Placed assets shown as a dot cluster around HQ on the Map — the seed of the ever-growing town.
// Community landmarks build into the Palace of Culture; personal assets are your grown timelocks.
// Append to grow the town (later driven by shared world state). Offsets are degrees from HQ.
export const worldAssets: WorldAsset[] = [
  { id: "library", name: "Founders' Library", category: "community", offset: [0.12, 0.1] },
  { id: "lighthouse", name: "Atlantic Lighthouse", category: "community", offset: [-0.1, 0.15] },
  { id: "spaceport", name: "Pico Spaceport", category: "community", offset: [0.14, -0.12] },
  { id: "your-tree", name: "Your Tree", category: "personal", offset: [-0.13, -0.08] },
  { id: "your-spaceship", name: "Your Spaceship", category: "personal", offset: [0.03, 0.19] },
];

// Your private circle — the Nostr friend browser on Home (encrypted, friends only).
export const circleFriends: Friend[] = [
  { id: "nind", handle: "nind", status: "at the cherry grove", online: true },
  { id: "racoo", handle: "racooDNI", status: "tending the signal", online: true, founder: true },
  { id: "mara", handle: "mara", status: "building a stage", online: true },
  { id: "bem", handle: "bem", status: "afk / gone fishing", online: false },
];
