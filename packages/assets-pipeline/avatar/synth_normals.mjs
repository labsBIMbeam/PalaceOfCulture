// GLB normal-map surgery. Imported GLBs are immutable inputs; inject always creates a derived GLB.
//   node synth_normals.mjs extract <source.glb> <out_albedo_file>
//   node synth_normals.mjs inject <source.glb> <normal.png> <derived.glb> [scale]
import fs from "node:fs";
import path from "node:path";

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function readGlb(inputPath) {
  const bytes = fs.readFileSync(inputPath);
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === JSON_CHUNK) json = JSON.parse(data.toString("utf8"));
    else if (type === BIN_CHUNK) bin = data;
    offset += 8 + length;
  }
  if (!json || !bin) throw new Error(`Invalid GLB: ${inputPath}`);
  return { json, bin };
}

function canonicalPath(inputPath) {
  const absolute = path.resolve(inputPath);
  if (fs.existsSync(absolute)) return fs.realpathSync.native(absolute);
  const missingSegments = [];
  let existingAncestor = absolute;
  while (!fs.existsSync(existingAncestor)) {
    missingSegments.unshift(path.basename(existingAncestor));
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) break;
    existingAncestor = parent;
  }
  return path.join(fs.realpathSync.native(existingAncestor), ...missingSegments);
}

function samePath(first, second) {
  const normalize = (value) =>
    process.platform === "win32" ? value.toLocaleLowerCase("en-US") : value;
  if (normalize(canonicalPath(first)) === normalize(canonicalPath(second))) return true;
  if (!fs.existsSync(first) || !fs.existsSync(second)) return false;
  const firstStat = fs.statSync(first);
  const secondStat = fs.statSync(second);
  return firstStat.dev === secondStat.dev && firstStat.ino === secondStat.ino;
}

function assertSeparateOutput(outputPath, inputPaths) {
  if (!outputPath) throw new Error("An explicit output path is required");
  for (const inputPath of inputPaths) {
    if (!inputPath) throw new Error("Every input path is required");
    if (samePath(outputPath, inputPath)) {
      throw new Error(`Refusing to overwrite source input: ${outputPath}`);
    }
  }
}

function writeAtomic(outputPath, data) {
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, data, { flag: "wx" });
    if (fs.existsSync(outputPath)) fs.rmSync(outputPath);
    fs.renameSync(temporaryPath, outputPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath);
  }
}

const [command, glbPath, argument2, argument3, argument4] = process.argv.slice(2);

if (command === "extract") {
  assertSeparateOutput(argument2, [glbPath]);
  const { json, bin } = readGlb(glbPath);
  const material = json.materials?.[0];
  const textureIndex = material?.pbrMetallicRoughness?.baseColorTexture?.index;
  if (textureIndex == null) {
    console.log(JSON.stringify({ error: "no baseColorTexture on material 0" }));
    process.exit(2);
  }
  const image = json.images[json.textures[textureIndex].source];
  const bufferView = json.bufferViews[image.bufferView];
  const start = bufferView.byteOffset || 0;
  writeAtomic(argument2, bin.subarray(start, start + bufferView.byteLength));
  console.log(
    JSON.stringify({
      mime: image.mimeType,
      materials: json.materials.length,
      hasNormal: !!material.normalTexture,
    }),
  );
} else if (command === "inject") {
  assertSeparateOutput(argument3, [glbPath, argument2]);
  const normal = fs.readFileSync(argument2);
  const scale = argument4 ? Number.parseFloat(argument4) : 1;
  if (!Number.isFinite(scale) || scale < 0 || scale > 1) {
    throw new Error("Normal scale must be a finite number between 0 and 1");
  }
  const { json, bin } = readGlb(glbPath);
  const buffer = json.buffers[0];
  const sourceBufferLength = buffer.byteLength;
  const newOffset = Math.ceil(sourceBufferLength / 4) * 4;
  const newBufferLength = newOffset + normal.length;
  const newBin = Buffer.alloc(Math.ceil(newBufferLength / 4) * 4, 0);
  bin.copy(newBin, 0, 0, sourceBufferLength);
  normal.copy(newBin, newOffset);
  buffer.byteLength = newBufferLength;

  const bufferViewIndex =
    json.bufferViews.push({ buffer: 0, byteOffset: newOffset, byteLength: normal.length }) - 1;
  const mimeType = argument2.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  const imageIndex = json.images.push({ bufferView: bufferViewIndex, mimeType }) - 1;
  json.samplers = json.samplers || [];
  if (!json.samplers.length) {
    json.samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 });
  }
  const textureIndex = json.textures.push({ sampler: 0, source: imageIndex }) - 1;
  let touched = 0;
  for (const material of json.materials) {
    if (material.pbrMetallicRoughness?.baseColorTexture && !material.normalTexture) {
      material.normalTexture = { index: textureIndex, texCoord: 0, scale };
      touched += 1;
    }
  }

  const jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
  const jsonPadding = Math.ceil(jsonBuffer.length / 4) * 4;
  const jsonChunk = Buffer.alloc(jsonPadding, 0x20);
  jsonBuffer.copy(jsonChunk);
  const total = 12 + 8 + jsonPadding + 8 + newBin.length;
  const output = Buffer.alloc(total);
  output.write("glTF", 0, "ascii");
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(total, 8);
  output.writeUInt32LE(jsonPadding, 12);
  output.writeUInt32LE(JSON_CHUNK, 16);
  jsonChunk.copy(output, 20);
  const binaryChunkOffset = 20 + jsonPadding;
  output.writeUInt32LE(newBin.length, binaryChunkOffset);
  output.writeUInt32LE(BIN_CHUNK, binaryChunkOffset + 4);
  newBin.copy(output, binaryChunkOffset + 8);
  writeAtomic(argument3, output);
  console.log(
    `WROTE ${argument3}: normalTexture idx=${textureIndex}, ${touched} material(s), +${normal.length} bytes`,
  );
} else {
  throw new Error(
    "Usage: extract <source.glb> <albedo> | inject <source.glb> <normal.png> <derived.glb> [scale]",
  );
}
