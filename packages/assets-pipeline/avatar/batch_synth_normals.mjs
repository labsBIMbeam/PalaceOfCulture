// Batch: read immutable imported avatars and write regenerable derived avatars with synthetic normals.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SOURCE_DIR = "apps/web/public/avatar/imported";
const DERIVED_DIR = "apps/web/public/avatar/derived";
const BL = "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe";
const SYN = "packages/assets-pipeline/avatar/synth_normals.mjs";
const NMP = "packages/assets-pipeline/avatar/make_normal_map.py";
const TMP = os.tmpdir();

fs.mkdirSync(DERIVED_DIR, { recursive: true });
const glbs = fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".glb"));
let done = 0;
let skipped = 0;
let failed = 0;

for (const f of glbs) {
  const id = f.replace(".glb", "");
  const glb = path.join(SOURCE_DIR, f);
  const derivedGlb = path.join(DERIVED_DIR, f);
  const sourceHash = createHash("sha256").update(fs.readFileSync(glb)).digest("hex");
  const baseRaw = path.join(TMP, `${id}_base`);
  let meta;
  try {
    const o = execFileSync("node", [SYN, "extract", glb, baseRaw], { encoding: "utf8" });
    meta = JSON.parse(o.trim().split("\n").pop());
  } catch {
    console.log(`SKIP ${id} (extract failed)`);
    skipped++;
    continue;
  }
  if (meta.error || meta.hasNormal) {
    console.log(`SKIP ${id} (${meta.error || "already has normal"})`);
    skipped++;
    continue;
  }
  const head = fs.readFileSync(baseRaw).subarray(0, 2);
  const ext = head[0] === 0x89 && head[1] === 0x50 ? "png" : "jpg";
  const baseImg = `${baseRaw}.${ext}`;
  fs.copyFileSync(baseRaw, baseImg);
  const normPng = path.join(TMP, `${id}_n.png`);
  try {
    execFileSync(
      BL,
      ["-b", "--factory-startup", "-P", NMP, "--", baseImg, normPng, "5.0", "1024"],
      {
        stdio: "ignore",
      },
    );
    execFileSync("node", [SYN, "inject", glb, normPng, derivedGlb, "0.7"], {
      stdio: "ignore",
    });
  } catch {
    console.log(`FAIL ${id} (bake/inject)`);
    failed++;
    continue;
  }
  const afterHash = createHash("sha256").update(fs.readFileSync(glb)).digest("hex");
  if (afterHash !== sourceHash) throw new Error(`Immutable source changed: ${glb}`);
  const b = fs.readFileSync(derivedGlb);
  const jl = b.readUInt32LE(12);
  const g = JSON.parse(b.slice(20, 20 + jl).toString("utf8"));
  const anims = (g.animations || []).map((a) => a.name).join("/");
  const ok =
    b.toString("utf8", 0, 4) === "glTF" &&
    !!g.materials[0].normalTexture &&
    (g.skins || []).length > 0 &&
    anims === "idle/walk/run";
  console.log(`${ok ? "OK  " : "BAD "} ${id.padEnd(14)} ${(b.length / 1024) | 0}KB anims=${anims}`);
  if (ok) done++;
  else failed++;
}
console.log(`\n=== done=${done} skipped=${skipped} failed=${failed} ===`);
