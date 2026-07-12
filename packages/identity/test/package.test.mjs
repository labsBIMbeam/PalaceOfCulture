import assert from "node:assert/strict";
import test from "node:test";

import * as identity from "@600b/identity";

test("the built ESM package derives caller-supplied entity keys", () => {
  const seed = "unit-test-master-seed-with-32-plus-bytes";
  const first = identity.deriveEntityKey(seed, "system:test-runner");
  const repeated = identity.deriveEntityKey(seed, "system:test-runner");
  const other = identity.deriveEntityKey(seed, "system:other-test-runner");

  assert.deepEqual(repeated, first);
  assert.equal(first.privHex.length, 64);
  assert.equal(first.pubHex.length, 64);
  assert.match(first.npub, /^npub1/);
  assert.notEqual(other.pubHex, first.pubHex);
  assert.throws(() => identity.deriveEntityKey("weak", "system:test-runner"), /at least 32 bytes/);
  assert.throws(() => identity.deriveEntityKey(seed, "system:"), /invalid entity id/);
  assert.equal("DEMO_SEED" in identity, false);
});
