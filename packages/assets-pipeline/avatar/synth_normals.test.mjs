import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./synth_normals.mjs", import.meta.url));
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function minimalGlb() {
  const json = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: 4 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 4 }],
    images: [{ bufferView: 0, mimeType: "image/png" }],
    textures: [{ source: 0 }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
  };
  const jsonBytes = Buffer.from(JSON.stringify(json), "utf8");
  const jsonLength = Math.ceil(jsonBytes.length / 4) * 4;
  const total = 12 + 8 + jsonLength + 8 + 4;
  const output = Buffer.alloc(total);
  output.write("glTF", 0, "ascii");
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(total, 8);
  output.writeUInt32LE(jsonLength, 12);
  output.writeUInt32LE(JSON_CHUNK, 16);
  output.fill(0x20, 20, 20 + jsonLength);
  jsonBytes.copy(output, 20);
  const binaryOffset = 20 + jsonLength;
  output.writeUInt32LE(4, binaryOffset);
  output.writeUInt32LE(BIN_CHUNK, binaryOffset + 4);
  Buffer.from([0x89, 0x50, 0x4e, 0x47]).copy(output, binaryOffset + 8);
  return output;
}

function readGlbJson(glbPath) {
  const bytes = fs.readFileSync(glbPath);
  const jsonLength = bytes.readUInt32LE(12);
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
}

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "600b-avatar-normal-"));
  const source = path.join(directory, "source.glb");
  const normal = path.join(directory, "normal.png");
  fs.writeFileSync(source, minimalGlb());
  fs.writeFileSync(normal, Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]));
  return { directory, source, normal };
}

function run(...arguments_) {
  return spawnSync(process.execPath, [SCRIPT, ...arguments_], { encoding: "utf8" });
}

test("inject writes a separate derived GLB and leaves source bytes unchanged", (context) => {
  const { directory, source, normal } = fixture();
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const derived = path.join(directory, "derived", "avatar.glb");
  const before = fs.readFileSync(source);

  const result = run("inject", source, normal, derived, "0.7");

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readFileSync(source), before);
  assert.equal(readGlbJson(derived).materials[0].normalTexture.scale, 0.7);
});

test("inject refuses an in-place output and preserves the source", (context) => {
  const { directory, source, normal } = fixture();
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const before = fs.readFileSync(source);

  const result = run("inject", source, normal, source, "0.7");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to overwrite source input/);
  assert.deepEqual(fs.readFileSync(source), before);
});

test("extract refuses an in-place output and preserves the source", (context) => {
  const { directory, source } = fixture();
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const before = fs.readFileSync(source);

  const result = run("extract", source, source);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to overwrite source input/);
  assert.deepEqual(fs.readFileSync(source), before);
});

test("inject refuses a hard-link alias of the source", (context) => {
  const { directory, source, normal } = fixture();
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const alias = path.join(directory, "source-alias.glb");
  fs.linkSync(source, alias);
  const before = fs.readFileSync(source);

  const result = run("inject", source, normal, alias, "0.7");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to overwrite source input/);
  assert.deepEqual(fs.readFileSync(source), before);
});
