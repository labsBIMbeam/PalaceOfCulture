import { CULTURE_PROJECTS, type CultureCategory } from "../src/frontend/cultureProjects";
import { navItems } from "../src/frontend/data";
import { CURATED_FEEDS } from "../src/net/feed";
import { BUILTIN_TABS, CURATED_POC_AUTHORS } from "../src/net/socialModel";

function assert(name: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`ok: ${name}`);
}

const categories: CultureCategory[] = ["audio", "music", "live", "articles", "v4v"];
const cultureIndex = navItems.findIndex((item) => item.id === "culture");
const homeIndex = navItems.findIndex((item) => item.id === "home");

assert("Culture is present in the main menu", cultureIndex >= 0);
assert("Culture sits next to Home", cultureIndex === homeIndex + 1);
assert(
  "every Culture category has projects",
  categories.every((category) => CULTURE_PROJECTS.some((project) => project.category === category)),
);
assert(
  "core open-media projects are discoverable",
  ["Fountain", "Wavlake Top", "Wavlake Artists", "zap.stream", "Habla.news"].every((name) =>
    CULTURE_PROJECTS.some((project) => project.name === name),
  ),
);
assert(
  "directory links use secure URLs",
  CULTURE_PROJECTS.every((project) => project.href.startsWith("https://")),
);
assert(
  "Wavlake discovery links are explicit",
  ["https://wavlake.com/top", "https://wavlake.com/artists"].every((href) =>
    CULTURE_PROJECTS.some((project) => project.href === href),
  ),
);
assert(
  "demo player uses only approved live feeds",
  CURATED_FEEDS.length === 2 &&
    CURATED_FEEDS.some((feed) => feed.source === "Wavlake") &&
    CURATED_FEEDS.some((feed) => feed.source === "Podcast Index"),
);
assert(
  "PoC social feed uses an explicit publisher allowlist",
  CURATED_POC_AUTHORS.length > 0 &&
    BUILTIN_TABS.find((tab) => tab.id === "poc")?.authors?.length === CURATED_POC_AUTHORS.length,
);

console.log("\nCULTURE SMOKE TESTS GREEN");
