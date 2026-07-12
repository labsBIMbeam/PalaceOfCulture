import assert from "node:assert/strict";
import test from "node:test";

import { TokenBucketRateLimiter, normalizeIpAddress, resolveClientIp } from "../src/rateLimit.js";

test("token buckets refill continuously and return a bounded retry delay", () => {
  const limiter = new TokenBucketRateLimiter({
    limit: 2,
    windowMs: 1_000,
    maxEntries: 10,
  });

  assert.deepEqual(limiter.consume("client", 0), {
    allowed: true,
    limit: 2,
    remaining: 1,
    retryAfterSeconds: 0,
  });
  assert.equal(limiter.consume("client", 0).allowed, true);
  assert.deepEqual(limiter.consume("client", 0), {
    allowed: false,
    limit: 2,
    remaining: 0,
    retryAfterSeconds: 1,
  });
  assert.equal(limiter.consume("client", 500).allowed, true);
});

test("retained client state has a hard cap and idle entries are removed", () => {
  const bounded = new TokenBucketRateLimiter({
    limit: 1,
    windowMs: 1_000,
    maxEntries: 2,
    entryTtlMs: 10_000,
  });
  bounded.consume("one", 0);
  bounded.consume("two", 1);
  bounded.consume("three", 2);
  assert.equal(bounded.entryCount, 2);

  const expiring = new TokenBucketRateLimiter({
    limit: 1,
    windowMs: 1_000,
    maxEntries: 10,
    entryTtlMs: 100,
  });
  expiring.consume("one", 0);
  expiring.consume("two", 50);
  expiring.consume("three", 1_000);
  assert.equal(expiring.entryCount, 1);
});

test("clock rollback cannot refill a depleted bucket", () => {
  const limiter = new TokenBucketRateLimiter({
    limit: 1,
    windowMs: 1_000,
    maxEntries: 10,
  });
  assert.equal(limiter.consume("client", 1_000).allowed, true);
  assert.equal(limiter.consume("client", 1_000).allowed, false);
  assert.equal(limiter.consume("client", 500).allowed, false);
});

test("IP normalization collapses mapped and equivalent IPv6 spellings", () => {
  assert.equal(normalizeIpAddress("::ffff:127.0.0.1"), "127.0.0.1");
  assert.equal(normalizeIpAddress("::ffff:7f00:1"), "127.0.0.1");
  assert.equal(normalizeIpAddress("2001:0db8:0:0:0:0:0:1"), "2001:db8::1");
  assert.equal(normalizeIpAddress("not-an-ip"), null);
});

test("forwarding headers are ignored unless proxy hops are explicitly trusted", () => {
  const forwarded = "198.51.100.8, 203.0.113.10";
  assert.equal(resolveClientIp("::ffff:127.0.0.1", forwarded, 0), "127.0.0.1");
  assert.equal(resolveClientIp("10.0.0.2", forwarded, 1), "203.0.113.10");
  assert.equal(resolveClientIp("10.0.0.2", forwarded, 2), "198.51.100.8");
  assert.equal(resolveClientIp("10.0.0.2", "invalid", 1), "10.0.0.2");
});
