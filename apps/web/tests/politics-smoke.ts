import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { POLITICS_CATEGORIES } from "../src/frontend/politics";
import { parseCitadelWireFeed } from "../src/net/clownNews";

const frontend = readFileSync(new URL("../src/frontend/GameFrontend.tsx", import.meta.url), "utf8");
const data = readFileSync(new URL("../src/frontend/data.ts", import.meta.url), "utf8");
const adapter = readFileSync(new URL("../src/net/clownNews.ts", import.meta.url), "utf8");

const feed = `<?xml version="1.0"?><rss><channel>
  <item>
    <guid>wire-101</guid>
    <link>https://citadelwire.com/posts/edition-101</link>
    <description><![CDATA[
      2026-07-12 17:00 UTC | BLOCK 957731<br>
      BITCOIN $100,000 | GOLD $3,000 | OIL $70<br>
      1. FIRST VERIFIED WIRE TITLE<br>
      -- This factual body is deliberately long enough to pass the parser input quality floor.<br>
      2. SECOND VERIFIED WIRE TITLE<br>
      -- This second factual body is also deliberately long enough for the parser quality floor.
    ]]></description>
  </item>
  <item>
    <guid>wire-100</guid>
    <link>https://citadelwire.com/posts/edition-100</link>
    <description><![CDATA[
      2026-07-12 16:00 UTC | BLOCK 957700<br>
      BITCOIN $99,000 | GOLD $3,000 | OIL $70<br>
      1. FIRST VERIFIED WIRE TITLE<br>
      -- This older duplicate must not appear in the final parsed collection of factual items.
    ]]></description>
  </item>
</channel></rss>`;

const items = parseCitadelWireFeed(feed);

assert.match(data, /id:\s*"politics"/u, "Politics is present in the main menu");
assert.match(frontend, /case\s+"politics"/u, "Politics has a routed screen");
assert.match(frontend, /loadCitadelWireNews/u, "Politics loads the live source adapter");
assert.doesNotMatch(frontend, /Clownfaktor:/u, "the browser does not render a local clown factor");
assert.match(adapter, /WORLD AGENT EXTENSION POINT/u, "the future agent boundary is documented");
assert.match(adapter, /Clownfaktor:/u, "the future output contract remains commented in code");
assert.equal(items.length, 2, "hourly duplicates are removed");
assert.equal(items[0]?.publishedAt, "2026-07-12 17:00 UTC | BLOCK 957731");
assert.equal(items[0]?.marketLine, "BITCOIN $100,000 | GOLD $3,000 | OIL $70");
assert.equal(items[0]?.sourceUrl, "https://citadelwire.com/posts/edition-101");
assert.match(items[0]?.factualBody ?? "", /deliberately long enough/u);
assert.ok(POLITICS_CATEGORIES.some((category) => category.id === "government"));
assert.ok(POLITICS_CATEGORIES.some((category) => category.id === "opposition"));
assert.ok(POLITICS_CATEGORIES.some((category) => category.id === "bitcoin"));

console.log("POLITICS LIVE WIRE SMOKE TESTS GREEN");
