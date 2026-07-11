import assert from "node:assert/strict";
import test from "node:test";

import { schnorr } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

import {
  OwnershipEncodingError,
  getOwnershipEventHash,
  getOwnershipSigningHash,
  verifyBranch,
  verifyChain,
  verifyOwnershipSignature,
} from "@600b/ownership";

const AUX = new Uint8Array(32);
const ALICE_SECRET = hexToBytes("0000000000000000000000000000000000000000000000000000000000000001");
const BOB_SECRET = hexToBytes("0000000000000000000000000000000000000000000000000000000000000002");
const CAROL_SECRET = hexToBytes("0000000000000000000000000000000000000000000000000000000000000003");
const ALICE = bytesToHex(schnorr.getPublicKey(ALICE_SECRET));
const BOB = bytesToHex(schnorr.getPublicKey(BOB_SECRET));
const CAROL = bytesToHex(schnorr.getPublicKey(CAROL_SECRET));

function sign(unsignedEvent, secretKey) {
  const digest = hexToBytes(getOwnershipSigningHash(unsignedEvent));
  return {
    ...unsignedEvent,
    signature: bytesToHex(schnorr.sign(digest, secretKey, AUX)),
  };
}

function makeBranch() {
  const genesis = sign(
    {
      assetId: "tree:prague:0001",
      revision: 0,
      prevHash: null,
      ownerPubkey: ALICE,
      payload: { kind: "genesis", proof: { network: "signet", confirmations: 6 } },
    },
    ALICE_SECRET,
  );
  const transfer = sign(
    {
      assetId: genesis.assetId,
      revision: 1,
      prevHash: getOwnershipEventHash(genesis),
      ownerPubkey: BOB,
      payload: { kind: "gift", note: "For the garden" },
    },
    ALICE_SECRET,
  );
  return { genesis, transfer };
}

test("verifies genesis and transfers with the previous owner's key", () => {
  const { genesis, transfer } = makeBranch();
  const result = verifyBranch([genesis, transfer]);

  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.deepEqual(result.head, transfer);
  assert.equal(result.headHash, getOwnershipEventHash(transfer));
  assert.equal(verifyOwnershipSignature(genesis, ALICE), true);
  assert.equal(verifyOwnershipSignature(transfer, ALICE), true);
  assert.deepEqual(verifyChain([genesis, transfer]), result);
});

test("canonical hashes do not depend on payload key insertion order", () => {
  const first = {
    assetId: "asset:canonical",
    revision: 0,
    prevHash: null,
    ownerPubkey: ALICE,
    payload: { z: 1, nested: { beta: true, alpha: ["x", null] }, a: "last inserted" },
  };
  const second = {
    ...first,
    payload: { a: "last inserted", nested: { alpha: ["x", null], beta: true }, z: 1 },
  };

  const signingHash = getOwnershipSigningHash(first);
  assert.equal(signingHash, getOwnershipSigningHash(second));
  assert.equal(signingHash, "32b9a4658f2277ceed1b26f0b7924012720da437dcbaf6f82f491f692ef3bb1b");

  const signed = sign(first, ALICE_SECRET);
  assert.equal(
    signed.signature,
    "61c1325abb3339e039950c9d85f520d870a16b4a0b2aa0745704b311a05d9b98" +
      "1c09eaa2769828e83d57535cc69b77dc4315c00dd2b6675252adb7c56f09d2fd",
  );
  assert.equal(
    getOwnershipEventHash(signed),
    "b8691cdba1447ef4c23d2c44eae50e95fca09b4a63742b10161454901b4a7180",
  );
});

test("rejects broken linkage, revision gaps, and mixed assets", () => {
  const { genesis, transfer } = makeBranch();

  const badHash = { ...transfer, prevHash: "00".repeat(32) };
  assert.deepEqual(verifyBranch([genesis, badHash]), {
    valid: false,
    code: "prev_hash_mismatch",
    eventIndex: 1,
    reason: "prevHash does not match the previous signed event.",
  });

  assert.equal(verifyBranch([genesis, { ...transfer, revision: 2 }]).valid, false);
  assert.equal(verifyBranch([genesis, { ...transfer, assetId: "tree:other" }]).valid, false);
});

test("rejects tampering and signatures made by the receiving owner", () => {
  const { genesis, transfer } = makeBranch();
  const tampered = { ...transfer, payload: { ...transfer.payload, note: "Changed later" } };
  const signedByReceiver = sign(
    {
      assetId: genesis.assetId,
      revision: 1,
      prevHash: getOwnershipEventHash(genesis),
      ownerPubkey: BOB,
      payload: { kind: "gift" },
    },
    BOB_SECRET,
  );

  assert.equal(verifyBranch([genesis, tampered]).valid, false);
  const result = verifyBranch([genesis, signedByReceiver]);
  assert.equal(result.valid, false);
  if (result.valid) return;
  assert.equal(result.code, "invalid_signature");
  assert.equal(result.eventIndex, 1);
});

test("valid forks remain separate branches instead of using relay-order tie-breaks", () => {
  const { genesis, transfer } = makeBranch();
  const competingTransfer = sign(
    {
      assetId: genesis.assetId,
      revision: 1,
      prevHash: getOwnershipEventHash(genesis),
      ownerPubkey: CAROL,
      payload: { kind: "gift", note: "Competing signed branch" },
    },
    ALICE_SECRET,
  );

  assert.equal(verifyBranch([genesis, transfer]).valid, true);
  assert.equal(verifyBranch([genesis, competingTransfer]).valid, true);
  const mixed = verifyBranch([genesis, transfer, competingTransfer]);
  assert.equal(mixed.valid, false);
  if (mixed.valid) return;
  assert.equal(mixed.code, "revision_mismatch");
});

test("rejects empty branches, malformed genesis, and non-JSON payloads", () => {
  assert.deepEqual(verifyBranch([]), {
    valid: false,
    code: "empty_branch",
    reason: "An ownership branch must contain a genesis event.",
  });

  const { genesis } = makeBranch();
  const malformedGenesis = { ...genesis, prevHash: "00".repeat(32) };
  const result = verifyBranch([malformedGenesis]);
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.code, "invalid_genesis");

  assert.throws(
    () => getOwnershipSigningHash({ ...genesis, payload: { unsupported: undefined } }),
    OwnershipEncodingError,
  );
});
