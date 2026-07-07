// GLB normal-map surgery — adds a synthetic normalTexture to a rigged avatar GLB WITHOUT touching the
// mesh / skin / animation bytes (so the cm-rig-space + NLA clips are preserved exactly). Pairs with
// make_normal_map.py (Blender computes the map from the albedo). Two subcommands:
//   node synth_normals.mjs extract <glb> <out_albedo_file>   -> writes the base-colour image, prints meta
//   node synth_normals.mjs inject  <glb> <normal_png> [scale] -> appends the map + sets material.normalTexture
import fs from "node:fs";

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function readGlb(p) {
  const b = fs.readFileSync(p);
  let off = 12;
  let json = null;
  let bin = null;
  while (off < b.length) {
    const len = b.readUInt32LE(off);
    const type = b.readUInt32LE(off + 4);
    const data = b.subarray(off + 8, off + 8 + len);
    if (type === JSON_CHUNK) json = JSON.parse(data.toString("utf8"));
    else if (type === BIN_CHUNK) bin = data;
    off += 8 + len;
  }
  return { json, bin };
}

const [cmd, glbPath, arg2, arg3] = process.argv.slice(2);

if (cmd === "extract") {
  const { json, bin } = readGlb(glbPath);
  const mat = json.materials?.[0];
  const texIdx = mat?.pbrMetallicRoughness?.baseColorTexture?.index;
  if (texIdx == null) {
    console.log(JSON.stringify({ error: "no baseColorTexture on material 0" }));
    process.exit(2);
  }
  const img = json.images[json.textures[texIdx].source];
  const bv = json.bufferViews[img.bufferView];
  const start = bv.byteOffset || 0;
  fs.writeFileSync(arg2, bin.subarray(start, start + bv.byteLength));
  console.log(
    JSON.stringify({
      mime: img.mimeType,
      materials: json.materials.length,
      hasNormal: !!mat.normalTexture,
    }),
  );
} else if (cmd === "inject") {
  const normal = fs.readFileSync(arg2);
  const scale = arg3 ? Number.parseFloat(arg3) : 1.0;
  const { json, bin } = readGlb(glbPath);
  const buffer = json.buffers[0];
  const B = buffer.byteLength;
  const newOffset = Math.ceil(B / 4) * 4;
  const newBufLen = newOffset + normal.length;
  const newBin = Buffer.alloc(Math.ceil(newBufLen / 4) * 4, 0);
  bin.copy(newBin, 0, 0, B);
  normal.copy(newBin, newOffset);
  buffer.byteLength = newBufLen;

  const bvIdx =
    json.bufferViews.push({ buffer: 0, byteOffset: newOffset, byteLength: normal.length }) - 1;
  const mime = arg2.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  const imgIdx = json.images.push({ bufferView: bvIdx, mimeType: mime }) - 1;
  json.samplers = json.samplers || [];
  if (!json.samplers.length)
    json.samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 });
  const texIdx = json.textures.push({ sampler: 0, source: imgIdx }) - 1;
  // add to every material that has a base colour and no normal yet (avatars are single-material)
  let touched = 0;
  for (const mat of json.materials) {
    if (mat.pbrMetallicRoughness?.baseColorTexture && !mat.normalTexture) {
      mat.normalTexture = { index: texIdx, texCoord: 0, scale };
      touched++;
    }
  }

  const jsonBuf = Buffer.from(JSON.stringify(json), "utf8");
  const jsonPad = Math.ceil(jsonBuf.length / 4) * 4;
  const jsonChunk = Buffer.alloc(jsonPad, 0x20);
  jsonBuf.copy(jsonChunk);
  const total = 12 + 8 + jsonPad + 8 + newBin.length;
  const out = Buffer.alloc(total);
  out.write("glTF", 0, "ascii");
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonPad, 12);
  out.writeUInt32LE(JSON_CHUNK, 16);
  jsonChunk.copy(out, 20);
  const o = 20 + jsonPad;
  out.writeUInt32LE(newBin.length, o);
  out.writeUInt32LE(BIN_CHUNK, o + 4);
  newBin.copy(out, o + 8);
  fs.writeFileSync(glbPath, out);
  console.log(
    `INJECTED normalTexture idx=${texIdx} into ${touched} material(s), +${normal.length} bytes`,
  );
}
