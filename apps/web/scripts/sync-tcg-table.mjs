// Bundle the 600B Timelock TCG table (play.html + its scripts/css from the TCG600nap repo
// next door) into public/tcg-table/index.html, and build the first-party card-face mirror
// public/faces/<sha256> (hash-verified against the TCG's blob map). Both outputs are
// GENERATED (gitignored) — the deploy runbook runs this before `pnpm build`, and the
// TcgTablePanel fetches the artifact at runtime so builds without it stay green.
//
// Usage: pnpm --filter @600b/web tcg:sync   (TCG_REPO overrides the sibling-path default)

import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const tcgRepo = process.env.TCG_REPO ?? resolve(webRoot, "../../../TCG600nap");
const site = join(tcgRepo, "site");
const facesSrc = join(tcgRepo, "art/cards/node-runner-web");

if (!existsSync(join(site, "play.html"))) {
  console.error(`TCG repo not found at ${tcgRepo} (set TCG_REPO) — nothing synced.`);
  process.exit(1);
}

// --- bundle play.html + its scripts and css into one artifact ---
let html = readFileSync(join(site, "play.html"), "utf8");
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const body = readFileSync(join(site, src), "utf8").replace(/<\/script>/g, "<\\/script>");
  return `<script>/* inlined: ${src} */\n${body}\n</script>`;
});
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
  return `<style>/* inlined: ${href} */\n${readFileSync(join(site, href), "utf8")}\n</style>`;
});
html = html.replace(/<link rel="icon"[^>]*>/g, "");
mkdirSync(join(webRoot, "public/tcg-table"), { recursive: true });
writeFileSync(join(webRoot, "public/tcg-table/index.html"), html);
console.log(`tcg-table/index.html bundled (${Math.round(html.length / 1024)} KB)`);

// --- first-party face mirror: copy each face to faces/<sha>, verified against blob-map ---
const blobMap = readFileSync(join(site, "blob-map.js"), "utf8");
const pairs = [...blobMap.matchAll(/"([^"]+)":\s*"([0-9a-f]{64})"/g)];
const facesOut = join(webRoot, "public/faces");
mkdirSync(facesOut, { recursive: true });
let ok = 0;
let skipped = 0;
for (const [, name, sha] of pairs) {
  const src = join(facesSrc, name);
  if (!existsSync(src)) {
    skipped += 1;
    continue;
  }
  const bytes = readFileSync(src);
  if (createHash("sha256").update(bytes).digest("hex") !== sha) {
    skipped += 1; // stale blob-map entry (e.g. an art recrop in flight) — never mirror unverified bytes
    continue;
  }
  cpSync(src, join(facesOut, sha));
  ok += 1;
}
console.log(`faces mirror: ${ok} verified, ${skipped} skipped of ${pairs.length}`);
if (readdirSync(facesOut).length === 0)
  console.warn("faces mirror is EMPTY — table falls back to text faces");
