import assert from "node:assert/strict";
import { type AuditEvent, createAuditEvent, verifyAuditChain } from "../src/audit/indexedDbAudit";

let checks = 0;
function ok(value: unknown, label: string): void {
  assert.ok(value, label);
  checks += 1;
  console.log(`ok: ${label}`);
}

const first = await createAuditEvent(
  "builder:home:test",
  {
    action: "home.snapshot.saved",
    payload: { blocks: [{ id: "stone", cell: [0, 0, 0] }], decor: [] },
    reason: "test first append",
    updatedBy: "auto:test",
  },
  null,
  "2026-01-01T00:00:00.000Z",
);
const second = await createAuditEvent(
  "builder:home:test",
  {
    action: "home.snapshot.saved",
    payload: { decor: [], blocks: [{ cell: [0, 0, 0], id: "stone" }] },
    reason: "test second append",
    updatedBy: "auto:test",
  },
  first,
  "2026-01-01T00:00:01.000Z",
);

ok(first.revision === 1 && first.prevHash === null, "genesis has revision one and no parent");
ok(second.revision === 2 && second.prevHash === first.hash, "events link to the previous hash");
ok((await verifyAuditChain([first, second])).valid, "untouched chain verifies");

const tampered = structuredClone(second) as AuditEvent;
const firstBlock = (tampered.payload as { blocks: Array<{ id: string }> }).blocks[0];
assert.ok(firstBlock);
firstBlock.id = "gold";
const tamperedResult = await verifyAuditChain([first, tampered]);
ok(!tamperedResult.valid, "payload tampering is detected");

const missingResult = await verifyAuditChain([{ ...second, revision: 3 }]);
ok(!missingResult.valid, "missing revisions are detected");

const reordered = await createAuditEvent(
  "canonical:test",
  {
    action: "canonical.checked",
    payload: { b: 2, a: 1 },
    reason: "stable object ordering",
    updatedBy: "auto:test",
  },
  null,
  "2026-01-01T00:00:00.000Z",
);
const reorderedAgain = await createAuditEvent(
  "canonical:test",
  {
    action: "canonical.checked",
    payload: { a: 1, b: 2 },
    reason: "stable object ordering",
    updatedBy: "auto:test",
  },
  null,
  "2026-01-01T00:00:00.000Z",
);
ok(reordered.hash === reorderedAgain.hash, "object key order does not change hashes");

console.log(`\nAUDIT SMOKE TESTS GREEN (${checks} assertions)`);
