import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CATALOG } from "../src/scene/furnitureCatalog";

const models = CATALOG.filter((def) => def.kind === "model");
assert.equal(models.length, 16, "the curated launch furniture set should have 16 models");
assert.equal(new Set(CATALOG.map((def) => def.id)).size, CATALOG.length, "decor ids must be unique");

for (const def of models) {
  assert.ok(def.url?.startsWith("/furniture/"), `${def.id} must use the local furniture directory`);
  const file = resolve("public", def.url!.slice(1));
  assert.ok(existsSync(file), `${def.id} is missing ${file}`);
  const header = readFileSync(file).subarray(0, 4).toString("ascii");
  assert.equal(header, "glTF", `${def.id} must be a valid binary glTF/GLB`);
}

for (const seated of ["chair-1", "chair-2", "chair-3", "sofa-1"]) {
  assert.equal(CATALOG.find((def) => def.id === seated)?.pose, "sit", `${seated} must be sittable`);
}
assert.equal(CATALOG.find((def) => def.id === "bed-1")?.pose, "sleep");

console.log(`furniture catalog smoke passed (${models.length} CC0 models)`);
