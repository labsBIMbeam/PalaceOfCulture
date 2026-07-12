import { isIP } from "node:net";

const MAX_FORWARDED_FOR_LENGTH = 512;

export interface TokenBucketConfig {
  limit: number;
  windowMs: number;
  maxEntries: number;
  entryTtlMs?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface TokenBucket {
  tokens: number;
  updatedAt: number;
  lastSeenAt: number;
}

/** A bounded token-bucket limiter with LRU-ordered idle eviction. */
export class TokenBucketRateLimiter {
  readonly #buckets = new Map<string, TokenBucket>();
  readonly #config: Required<TokenBucketConfig>;
  readonly #tokensPerMillisecond: number;
  #lastTimestamp = 0;
  #nextPruneAt = 0;

  constructor(config: TokenBucketConfig) {
    assertPositiveInteger(config.limit, "limit");
    assertPositiveInteger(config.windowMs, "windowMs");
    assertPositiveInteger(config.maxEntries, "maxEntries");
    const entryTtlMs = config.entryTtlMs ?? Math.max(config.windowMs * 2, 60_000);
    assertPositiveInteger(entryTtlMs, "entryTtlMs");

    this.#config = { ...config, entryTtlMs };
    this.#tokensPerMillisecond = config.limit / config.windowMs;
  }

  /** Consume one token for a client key and return response metadata. */
  consume(clientKey: string, now = Date.now()): RateLimitDecision {
    const timestamp = this.#monotonicTimestamp(now);
    if (timestamp >= this.#nextPruneAt || this.#buckets.size >= this.#config.maxEntries) {
      this.#pruneIdleEntries(timestamp);
    }

    let bucket = this.#buckets.get(clientKey);
    if (!bucket) {
      this.#evictOldestIfFull();
      bucket = {
        tokens: this.#config.limit,
        updatedAt: timestamp,
        lastSeenAt: timestamp,
      };
    } else {
      const elapsed = timestamp - bucket.updatedAt;
      bucket.tokens = Math.min(
        this.#config.limit,
        bucket.tokens + elapsed * this.#tokensPerMillisecond,
      );
      bucket.updatedAt = timestamp;
      bucket.lastSeenAt = timestamp;
      // Reinsertion keeps the Map ordered from least to most recently seen.
      this.#buckets.delete(clientKey);
    }

    const allowed = bucket.tokens >= 1;
    if (allowed) bucket.tokens -= 1;
    this.#buckets.set(clientKey, bucket);

    const missingTokenFraction = Math.max(0, 1 - bucket.tokens);
    return {
      allowed,
      limit: this.#config.limit,
      remaining: Math.floor(bucket.tokens),
      retryAfterSeconds: allowed
        ? 0
        : Math.max(1, Math.ceil(missingTokenFraction / this.#tokensPerMillisecond / 1_000)),
    };
  }

  /** Number of retained client buckets; exposed for health tests and operational assertions. */
  get entryCount(): number {
    return this.#buckets.size;
  }

  #monotonicTimestamp(now: number): number {
    const finiteNow = Number.isFinite(now) ? now : this.#lastTimestamp;
    this.#lastTimestamp = Math.max(this.#lastTimestamp, finiteNow);
    return this.#lastTimestamp;
  }

  #pruneIdleEntries(now: number): void {
    const oldestAllowed = now - this.#config.entryTtlMs;
    for (const [key, bucket] of this.#buckets) {
      if (bucket.lastSeenAt > oldestAllowed) break;
      this.#buckets.delete(key);
    }
    this.#nextPruneAt = now + Math.min(this.#config.windowMs, 60_000);
  }

  #evictOldestIfFull(): void {
    if (this.#buckets.size < this.#config.maxEntries) return;
    const oldestKey = this.#buckets.keys().next().value;
    if (oldestKey !== undefined) this.#buckets.delete(oldestKey);
  }
}

/** Resolve a stable client key without trusting forwarding headers by default. */
export function resolveClientIp(
  remoteAddress: string | undefined,
  forwardedFor: string | undefined,
  trustedProxyHops: number,
): string {
  const remoteIp = normalizeIpAddress(remoteAddress) ?? "unknown";
  if (trustedProxyHops === 0 || !forwardedFor || forwardedFor.length > MAX_FORWARDED_FOR_LENGTH) {
    return remoteIp;
  }

  const forwardedChain = forwardedFor.split(",");
  const clientIndex = forwardedChain.length - trustedProxyHops;
  if (clientIndex < 0 || clientIndex >= forwardedChain.length) return remoteIp;
  return normalizeIpAddress(forwardedChain[clientIndex]?.trim()) ?? remoteIp;
}

/** Normalize equivalent IPv4, IPv4-mapped IPv6, and IPv6 spellings to one key. */
export function normalizeIpAddress(value: string | undefined): string | null {
  if (!value) return null;
  const candidate = value.trim().replace(/^\[|\]$/g, "");
  const family = isIP(candidate);
  if (family === 4) return candidate;
  if (family !== 6) return null;

  let canonical: string;
  try {
    canonical = new URL(`http://[${candidate}]/`).hostname.slice(1, -1);
  } catch {
    return null;
  }

  const mappedIpv4 = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(canonical);
  if (!mappedIpv4) return canonical;
  const high = Number.parseInt(mappedIpv4[1] ?? "", 16);
  const low = Number.parseInt(mappedIpv4[2] ?? "", 16);
  return `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`;
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`Rate-limit ${name} must be a positive integer.`);
  }
}
