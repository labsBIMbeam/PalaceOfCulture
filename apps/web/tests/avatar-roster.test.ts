// Avatar roster tests — the neutral hooded Builder pilot as the first player archetype.
//
// Canon guards: the Builder is a generic archetype (never a named member's identity), the runtime
// model is the beam-free core GLB (laser beams stay out of the default avatar; they live in a
// separately toggleable build/scan effect — `scanBeamsActive` — never in the GLB), and the org
// roster itself stays untouched — the archetype is prepended, not mixed in.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AVATAR_IMPORTS, findImport, importUrl } from "../src/scene/avatarImports";
import { scanBeamsActive } from "../src/scene/scanBeams";
import { BUILDER, MEMBERS, ROSTER } from "../src/ui/members";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The approved pilot asset (avatar-builder-pilot v1) — core GLB, no beam geometry.
const BUILDER_MODEL_URL = "/avatar/imported/builder.glb";
const BUILDER_MODEL_SHA256 = "592a6a9d81f5910971b3999a80baf238a64b2ff566eb1a5f8cbee1f4a838fcd4";

// The Builder leads the line-up: a neutral archetype is the default for anyone who is not (yet)
// a 600.wtf member — youth enter as themselves, not as a recruit wearing someone else's name.
assert.equal(ROSTER[0], BUILDER, "the neutral Builder archetype opens the roster");
assert.equal(BUILDER.name, "Builder");
assert.equal(BUILDER.avatar.modelUrl, BUILDER_MODEL_URL);
assert.equal(importUrl("builder"), BUILDER_MODEL_URL);
console.log("ok: Builder archetype is the first roster entry");

// The org roster is unchanged — the archetype is prepended, never mixed into the member list.
assert.ok(
  MEMBERS.every((member) => member.name !== "Builder"),
  "the Builder is an archetype, not a member",
);
assert.equal(ROSTER.length, MEMBERS.length + 1);
assert.equal(new Set(ROSTER.map((entry) => entry.name)).size, ROSTER.length, "names stay unique");
assert.notEqual(BUILDER.role, "Council", "the Builder carries no council rank");
console.log("ok: org member roster untouched, names unique");

// The Builder GLB is self-contained (BuilderIdle baked in). It must not inherit the member models'
// extra clip GLBs — those are authored on a different rig and would 404/misbind on this skeleton.
const entry = findImport(BUILDER_MODEL_URL);
assert.ok(entry, "the builder model is a registered avatar import");
assert.equal(entry.id, "builder");
assert.deepEqual(entry.clipUrls ?? [], [], "the builder rig loads no foreign clip GLBs");
console.log("ok: builder import is self-contained");

// Laser-beam boundary: only the beam-free core ships as the avatar. The preview variant (separate
// LaserBeam_L/R meshes) must never be referenced by roster or import code.
for (const [file, source] of [
  [
    "src/scene/avatarImports.ts",
    readFileSync(resolve(webRoot, "src/scene/avatarImports.ts"), "utf8"),
  ],
  ["src/ui/members.ts", readFileSync(resolve(webRoot, "src/ui/members.ts"), "utf8")],
] as const) {
  assert.ok(!source.toLowerCase().includes("laser"), `${file} must not wire laser-beam variants`);
}
assert.ok(
  AVATAR_IMPORTS.every((imported) => !imported.modelUrl.includes("preview")),
  "no import points at a preview/beam variant",
);
console.log("ok: runtime avatar is the beam-free core");

// Scan-beam context gate: the beams are a separate scene effect, on ONLY in build/scan context
// (decorate = walk + build overlay; build = the homebuilder magnet), ONLY for the Builder
// archetype, and always toggleable off. Walking around or a member avatar never shows beams.
const builderUrl = BUILDER_MODEL_URL;
assert.ok(scanBeamsActive({ modelUrl: builderUrl, mode: "decorate", enabled: true }));
assert.ok(scanBeamsActive({ modelUrl: builderUrl, mode: "build", enabled: true }));
for (const mode of ["walk", "orbit"] as const) {
  assert.ok(
    !scanBeamsActive({ modelUrl: builderUrl, mode, enabled: true }),
    `beams stay off outside build/scan context (${mode})`,
  );
}
assert.ok(
  !scanBeamsActive({ modelUrl: builderUrl, mode: "decorate", enabled: false }),
  "the toggle always wins — beams can be switched off even in build context",
);
assert.ok(
  !scanBeamsActive({ modelUrl: importUrl("placeholder"), mode: "decorate", enabled: true }),
  "beams belong to the Builder pilot, never other avatars",
);
assert.ok(!scanBeamsActive({ modelUrl: undefined, mode: "decorate", enabled: true }));
console.log("ok: scan beams gated to Builder + build/scan context + toggle");

// The scene wiring must go through the gate (no ad-hoc beam condition in PalaceScene), and no
// runtime module may reach for the preview/beam GLB variant.
const palaceScene = readFileSync(resolve(webRoot, "src/scene/PalaceScene.tsx"), "utf8");
assert.ok(palaceScene.includes("scanBeamsActive"), "PalaceScene gates beams via scanBeamsActive");
for (const file of ["src/scene/scanBeams.ts", "src/scene/RiggedAvatar.tsx"]) {
  const source = readFileSync(resolve(webRoot, file), "utf8");
  assert.ok(
    !source.includes("lasereyes") && !source.includes("preview.glb"),
    `${file} must not load the preview/beam GLB`,
  );
}
console.log("ok: beam effect wired through the gate, preview GLB untouched");

// Character select renders the combined line-up (archetype + members), including preselection.
const memberSelect = readFileSync(resolve(webRoot, "src/ui/MemberSelect.tsx"), "utf8");
assert.ok(memberSelect.includes("ROSTER"), "MemberSelect renders from the combined ROSTER");
assert.ok(!/\bMEMBERS\b/.test(memberSelect), "MemberSelect no longer bypasses the archetype");
console.log("ok: character select uses the combined roster");

// Drop-in asset pin: public/avatar/ is gitignored (assets are dropped in, never committed), so the
// file may be absent on a fresh clone — but when present it must be byte-identical to the approved
// pilot build (avatar-builder-pilot v1 SHA256SUMS).
const droppedIn = resolve(webRoot, "public/avatar/imported/builder.glb");
if (existsSync(droppedIn)) {
  const digest = createHash("sha256").update(readFileSync(droppedIn)).digest("hex");
  assert.equal(
    digest,
    BUILDER_MODEL_SHA256,
    "dropped-in builder.glb must match the approved build",
  );
  console.log("ok: dropped-in builder.glb matches the approved pilot hash");
} else {
  console.log("skip: builder.glb not dropped in on this machine (gitignored asset)");
}

console.log("\nAVATAR ROSTER TESTS GREEN");
