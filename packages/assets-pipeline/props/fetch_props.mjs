// One-off asset sourcing: search Poly Pizza, keep CC0 models by cohesive toon authors
// (Kenney / Quaternius), download the GLB into apps/web/public/props/, and emit a credits row.
// Usage: node fetch_props.mjs <outDir> <spec.json>
// spec.json: [{ "term": "barrel", "want": 1, "as": "barrel", "authors": ["Kenney","Quaternius"] }, ...]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [, , outDir, specPath] = process.argv;
const spec = JSON.parse(readFileSync(specPath, "utf8"));
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (asset-sourcing)" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

async function searchIds(term) {
  const html = await (await get(`https://poly.pizza/search/${encodeURIComponent(term)}`)).text();
  const ids = [...html.matchAll(/\/m\/([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
  return [...new Set(ids)];
}

async function inspect(id) {
  const html = await (await get(`https://poly.pizza/m/${id}`)).text();
  const glb = html.match(/https:\/\/static\.poly\.pizza\/[A-Za-z0-9_-]+\.glb/);
  const lic = html.match(/"Licence":"([^"]+)"/);
  const creator = html.match(/"Creator":\{"Username":"([^"]+)"/);
  const title = html.match(/"Title":"([^"]+)"/) || html.match(/<title>([^<|]+)/);
  return {
    id,
    glb: glb?.[0],
    license: lic?.[1] ?? "unknown",
    creator: creator?.[1] ?? "unknown",
    title: (title?.[1] ?? id).trim(),
  };
}

const credits = [];
for (const item of spec) {
  const { term, want = 1, as, authors } = item;
  let ids;
  try {
    ids = await searchIds(term);
  } catch (e) {
    console.log(`SEARCH FAIL ${term}: ${e.message}`);
    continue;
  }
  let taken = 0;
  for (const id of ids) {
    if (taken >= want) break;
    let info;
    try {
      info = await inspect(id);
    } catch {
      continue;
    }
    await sleep(150);
    const cc0 = /^CC0/i.test(info.license);
    const authorOk =
      !authors || authors.some((a) => info.creator.toLowerCase().includes(a.toLowerCase()));
    if (!cc0 || !authorOk || !info.glb) continue;
    const fname = want > 1 ? `${as}-${taken + 1}.glb` : `${as}.glb`;
    const dest = join(outDir, fname);
    if (existsSync(dest)) {
      taken++;
      continue;
    }
    try {
      const buf = Buffer.from(await (await get(info.glb)).arrayBuffer());
      if (buf.subarray(0, 4).toString() !== "glTF") throw new Error("not a glb");
      writeFileSync(dest, buf);
      credits.push({
        file: fname,
        creator: info.creator,
        license: info.license,
        source: `https://poly.pizza/m/${id}`,
        kb: Math.round(buf.length / 1024),
      });
      console.log(
        `OK  ${fname}  ${info.creator}  ${info.license}  ${Math.round(buf.length / 1024)}KB  (${info.title})`,
      );
      taken++;
    } catch (e) {
      console.log(`DL FAIL ${id}: ${e.message}`);
    }
    await sleep(150);
  }
  if (taken < want) console.log(`PARTIAL ${term}: got ${taken}/${want}`);
}

writeFileSync(join(outDir, "_manifest.json"), JSON.stringify(credits, null, 2));
console.log(`\n${credits.length} assets downloaded → ${outDir}`);
