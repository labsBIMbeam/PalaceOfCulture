import {
  type SocialEventCandidate,
  isPresentableSocialEvent,
  rankPresentableSocialEvents,
} from "../src/net/socialQuality";

function assert(name: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`ok: ${name}`);
}

function event(overrides: Partial<SocialEventCandidate> = {}): SocialEventCandidate {
  return {
    id: "event-1",
    pubkey: "author-1",
    content: "A thoughtful live note about open music and supporting independent artists.",
    created_at: 100,
    tags: [["t", "music"]],
    ...overrides,
  };
}

assert("readable live note accepted", isPresentableSocialEvent(event()));
assert(
  "machine payload rejected",
  !isPresentableSocialEvent(
    event({ content: '{"type":"zone_presence","metrics":{"clients":0,"cpuPct":35}}' }),
  ),
);
assert(
  "adult content rejected",
  !isPresentableSocialEvent(
    event({ content: "An explicit NSFW promotion with enough filler text." }),
  ),
);
assert(
  "link-only media rejected",
  !isPresentableSocialEvent(
    event({ content: "https://example.com/one.jpg https://example.com/two.mp4" }),
  ),
);

const ranked = rankPresentableSocialEvents(
  [
    event({ id: "older", created_at: 90 }),
    event({ id: "same-author", created_at: 120 }),
    event({
      id: "other-author",
      pubkey: "author-2",
      created_at: 110,
      content: "A second thoughtful live note about a value-for-value podcast release.",
    }),
  ],
  ["music"],
);
assert("one card per author", ranked.length === 2);
assert(
  "newer duplicate author wins",
  ranked.some((candidate) => candidate.id === "same-author"),
);
assert(
  "curated publishers may contribute a series",
  rankPresentableSocialEvents(
    [
      event({ id: "series-1", content: "The first chapter from our approved live publisher." }),
      event({ id: "series-2", content: "The second chapter from our approved live publisher." }),
    ],
    ["music"],
    4,
    4,
  ).length === 2,
);

console.log("\nSOCIAL QUALITY SMOKE TESTS GREEN");
