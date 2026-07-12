// One-off asset sourcing: fetch CC0 models from Poly Pizza (Kenney / Quaternius) into an output
// dir and emit a credits row per file. Two spec entry shapes:
//   { "term": "barrel", "want": 2, "as": "barrel", "authors": ["Kenney","Quaternius"] }  // by search
//   { "id": "N8d0nkQGOn", "as": "wall" }                                                 // exact model
// Explicit IDs are used for cohesive modular kits, where search ranking can't be trusted to return
// the matching pieces. Usage: node fetch_props.mjs <outDir> <spec.json>

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

async function download(info, fname) {
  const dest = join(outDir, fname);
  if (existsSync(dest)) return "exists";
  const buf = Buffer.from(await (await get(info.glb)).arrayBuffer());
  if (buf.subarray(0, 4).toString() !== "glTF") throw new Error("not a glb");
  writeFileSync(dest, buf);
  credits.push({
    file: fname,
    creator: info.creator,
    license: info.license,
    source: `https://poly.pizza/m/${info.id}`,
    kb: Math.round(buf.length / 1024),
  });
  console.log(`OK  ${fname}  ${info.creator}  ${info.license}  ${Math.round(buf.length / 1024)}KB  (${info.title})`);
  return "ok";
}

const credits = [];
for (const item of spec) {
  // exact-id entry: download that one model (still verifies CC0)
  if (item.id) {
    try {
      const info = await inspect(item.id);
      await sleep(150);
      if (!/^CC0/i.test(info.license) || !info.glb) {
        console.log(`SKIP ${item.id}: ${info.license} / no glb`);
        continue;
      }
      await download(info, `${item.as}.glb`);
    } catch (e) {
      console.log(`ID FAIL ${item.id}: ${e.message}`);
    }
    await sleep(150);
    continue;
  }
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
    try {
      await download(info, fname);
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
