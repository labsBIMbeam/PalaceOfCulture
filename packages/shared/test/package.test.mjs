import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_AVATAR,
  JsonEncodingError,
  SHARED_SCHEMA_VERSION,
  canonicalizeJson,
} from "@600b/shared";

test("the built ESM package is importable by Node", () => {
  assert.equal(SHARED_SCHEMA_VERSION, "0.0.0");
  assert.equal(DEFAULT_AVATAR.gender, "neutral");
});

test("canonical JSON is stable and rejects values JSON would silently lose", () => {
  assert.equal(canonicalizeJson({ z: [2, 1], a: { b: true } }), '{"a":{"b":true},"z":[2,1]}');
  assert.throws(() => canonicalizeJson({ missing: undefined }), JsonEncodingError);
  const sparse = Array(2);
  sparse[1] = "sparse";
  assert.throws(() => canonicalizeJson(sparse), JsonEncodingError);
  const circular = {};
  circular.self = circular;
  assert.throws(() => canonicalizeJson(circular), JsonEncodingError);
});
