# @600b/ownership

Per-asset **signed hash-chain** ownership — the core primitive of "the app owns the truth".
Imported by **both** `@600b/web` and `@600b/server`, so a client verifies the chain itself instead
of trusting whichever relay answered last. **Never fork this logic** — divergence here is exactly
the "latest relay wins" failure the project forbids (BUILD-BRIEF §7.1).

- `OwnershipEvent` — `assetId / revision / prevHash / ownerPubkey / payload / signature`.
- `getOwnershipSigningHash()` — canonical, domain-separated SHA-256 digest for BIP-340 signing.
- `getOwnershipEventHash()` — hash of the complete signed event used by the next `prevHash`.
- `verifyBranch()` / `verifyChain()` — local verification of genesis, exact revisions, linkage,
  canonical JSON payloads, and BIP-340 signatures. Genesis is self-signed; each gift is signed by
  the previous owner.
- Export format: signed JSONL / event-chain, verifiable offline.

Branch verification does **not** invent a relay-order tie-break. Two conflicting transfers from the
same valid head can both be cryptographically valid; canonical acceptance belongs to the app's
transactional truth tier. This keeps "first accepted wins" auditable instead of disguising relay
arrival order as consensus.

Tests run on Node's built-in test runner (`pnpm --filter @600b/ownership test`).
