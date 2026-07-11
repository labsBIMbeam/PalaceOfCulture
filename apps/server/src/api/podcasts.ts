import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { type IncomingMessage, request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import { BlockList, type LookupFunction, isIP } from "node:net";

const UA = "Mozilla/5.0 (compatible; 600Billion/0.1; +https://600000000000)";
const MAX_FEED_URL_LENGTH = 2_048;
const REQUEST_ABORT_REASON = Symbol("request-aborted");
const TIMEOUT_ABORT_REASON = Symbol("feed-timeout");

const BLOCKED_IPV4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  BLOCKED_IPV4.addSubnet(network, prefix, "ipv4");
}

const GLOBAL_IPV6 = new BlockList();
GLOBAL_IPV6.addSubnet("2000::", 3, "ipv6");

const BLOCKED_IPV6 = new BlockList();
for (const [network, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
] as const) {
  BLOCKED_IPV6.addSubnet(network, prefix, "ipv6");
}

const LOCAL_HOSTNAME_SUFFIXES = [".localhost", ".local", ".internal", ".home"];
const XML_MEDIA_TYPES = new Set([
  "application/atom+xml",
  "application/rdf+xml",
  "application/rss+xml",
  "application/xml",
  "text/xml",
]);
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

export interface PodcastShow {
  title: string;
  author: string;
  feedUrl: string;
  artwork?: string;
}

interface ItunesResult {
  collectionName?: string;
  artistName?: string;
  feedUrl?: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
}

export interface FeedFetchOptions {
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
}

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export type ResolveHostname = (hostname: string) => Promise<readonly LookupAddress[]>;
export type FeedRequest = (
  url: URL,
  addresses: readonly ResolvedAddress[],
  signal: AbortSignal,
) => Promise<IncomingMessage>;

export interface FeedFetchDependencies {
  resolveHostname?: ResolveHostname;
  request?: FeedRequest;
}

export const DEFAULT_FEED_FETCH_OPTIONS: Readonly<FeedFetchOptions> = Object.freeze({
  timeoutMs: 12_000,
  maxBytes: 4 * 1024 * 1024,
  maxRedirects: 4,
});

export type PodcastFetchErrorCode =
  | "dns_resolution_failed"
  | "forbidden_target"
  | "invalid_redirect"
  | "invalid_url"
  | "network_error"
  | "request_aborted"
  | "response_too_large"
  | "timeout"
  | "too_many_redirects"
  | "unsupported_content_encoding"
  | "unsupported_content_type"
  | "upstream_status";

/** A safe, client-facing failure raised while retrieving an untrusted podcast feed. */
export class PodcastFetchError extends Error {
  constructor(
    readonly code: PodcastFetchErrorCode,
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "PodcastFetchError";
  }
}

/** Search the public Apple podcast catalog. */
export async function searchPodcasts(query: string): Promise<PodcastShow[]> {
  const term = query.trim();
  if (!term) return [];

  const url = `https://itunes.apple.com/search?media=podcast&limit=24&term=${encodeURIComponent(term)}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return [];
  }
  if (!response.ok) return [];

  let data: { results?: ItunesResult[] };
  try {
    data = (await response.json()) as { results?: ItunesResult[] };
  } catch {
    return [];
  }

  const shows: PodcastShow[] = [];
  for (const result of Array.isArray(data.results) ? data.results : []) {
    if (!result.feedUrl || !result.collectionName) continue;
    shows.push({
      title: result.collectionName,
      author: result.artistName ?? "",
      feedUrl: result.feedUrl,
      artwork: result.artworkUrl600 ?? result.artworkUrl100,
    });
  }
  return shows;
}

/** Return whether an IP address must never be contacted by the public feed proxy. */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return BLOCKED_IPV4.check(address, "ipv4");
  if (family !== 6) return true;

  // Only currently allocated global unicast space is eligible. This also rejects IPv4-mapped,
  // NAT64, unspecified, loopback, unique-local, link-local, multicast, and reserved ranges.
  return !GLOBAL_IPV6.check(address, "ipv6") || BLOCKED_IPV6.check(address, "ipv6");
}

/** Fetch an untrusted podcast feed with DNS pinning, redirect checks, and bounded resources. */
export async function fetchFeed(
  feedUrl: string,
  options: Partial<FeedFetchOptions> = {},
  dependencies: FeedFetchDependencies = {},
  externalSignal?: AbortSignal,
): Promise<string> {
  if (externalSignal?.aborted) throw requestAbortedError();
  const limits = normalizeFeedOptions(options);
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  let removeExternalAbortListener: (() => void) | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort(TIMEOUT_ABORT_REASON);
      reject(new PodcastFetchError("timeout", 504, "The upstream feed timed out."));
    }, limits.timeoutMs);
    timer.unref();
  });
  const operations: Array<Promise<string>> = [
    fetchFeedChain(feedUrl, limits, dependencies, controller.signal),
    timeout,
  ];

  if (externalSignal) {
    operations.push(
      new Promise<never>((_resolve, reject) => {
        const abortRequest = (): void => {
          controller.abort(REQUEST_ABORT_REASON);
          reject(requestAbortedError());
        };
        if (externalSignal.aborted) abortRequest();
        else {
          externalSignal.addEventListener("abort", abortRequest, { once: true });
          removeExternalAbortListener = () =>
            externalSignal.removeEventListener("abort", abortRequest);
        }
      }),
    );
  }

  try {
    return await Promise.race(operations);
  } finally {
    if (timer) clearTimeout(timer);
    removeExternalAbortListener?.();
  }
}

async function fetchFeedChain(
  feedUrl: string,
  options: FeedFetchOptions,
  dependencies: FeedFetchDependencies,
  signal: AbortSignal,
): Promise<string> {
  const resolveHostname = dependencies.resolveHostname ?? resolveHostnameDefault;
  const requestFeed = dependencies.request ?? requestFeedDefault;
  let currentUrl = parseFeedUrl(feedUrl);

  for (let redirectCount = 0; ; redirectCount += 1) {
    const addresses = await resolveAndValidate(currentUrl, resolveHostname);
    if (signal.aborted) {
      throw abortedFetchError(signal);
    }

    let response: IncomingMessage;
    try {
      response = await requestFeed(currentUrl, addresses, signal);
    } catch (error) {
      if (signal.aborted) {
        throw abortedFetchError(signal);
      }
      if (error instanceof PodcastFetchError) throw error;
      throw new PodcastFetchError("network_error", 502, "The upstream feed is unavailable.");
    }

    const statusCode = response.statusCode ?? 0;
    if (REDIRECT_STATUS_CODES.has(statusCode)) {
      response.destroy();
      if (redirectCount >= options.maxRedirects) {
        throw new PodcastFetchError(
          "too_many_redirects",
          502,
          "The upstream feed redirected too many times.",
        );
      }
      currentUrl = parseRedirectUrl(response.headers.location, currentUrl);
      continue;
    }

    if (statusCode < 200 || statusCode >= 300) {
      response.destroy();
      throw new PodcastFetchError(
        "upstream_status",
        502,
        "The upstream feed returned an unsuccessful status.",
      );
    }

    validateResponseHeaders(response, options.maxBytes);
    return readResponseBody(response, options.maxBytes);
  }
}

function abortedFetchError(signal: AbortSignal): PodcastFetchError {
  if (signal.reason === REQUEST_ABORT_REASON) return requestAbortedError();
  return new PodcastFetchError("timeout", 504, "The upstream feed timed out.");
}

function requestAbortedError(): PodcastFetchError {
  return new PodcastFetchError("request_aborted", 499, "The client closed the request.");
}

function normalizeFeedOptions(options: Partial<FeedFetchOptions>): FeedFetchOptions {
  const merged = { ...DEFAULT_FEED_FETCH_OPTIONS, ...options };
  if (!Number.isInteger(merged.timeoutMs) || merged.timeoutMs <= 0) {
    throw new TypeError("Feed timeoutMs must be a positive integer.");
  }
  if (!Number.isInteger(merged.maxBytes) || merged.maxBytes <= 0) {
    throw new TypeError("Feed maxBytes must be a positive integer.");
  }
  if (!Number.isInteger(merged.maxRedirects) || merged.maxRedirects < 0) {
    throw new TypeError("Feed maxRedirects must be a non-negative integer.");
  }
  return merged;
}

function parseFeedUrl(value: string): URL {
  if (!value || value.length > MAX_FEED_URL_LENGTH) {
    throw new PodcastFetchError("invalid_url", 400, "A valid podcast feed URL is required.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PodcastFetchError("invalid_url", 400, "A valid podcast feed URL is required.");
  }
  validateUrlShape(url);
  url.hash = "";
  return url;
}

function parseRedirectUrl(location: string | undefined, currentUrl: URL): URL {
  if (!location) {
    throw new PodcastFetchError(
      "invalid_redirect",
      502,
      "The upstream feed returned an invalid redirect.",
    );
  }

  let nextUrl: URL;
  try {
    nextUrl = new URL(location, currentUrl);
  } catch {
    throw new PodcastFetchError(
      "invalid_redirect",
      502,
      "The upstream feed returned an invalid redirect.",
    );
  }
  validateUrlShape(nextUrl, "invalid_redirect", 502);
  if (currentUrl.protocol === "https:" && nextUrl.protocol !== "https:") {
    throw new PodcastFetchError(
      "invalid_redirect",
      502,
      "The upstream feed attempted an insecure redirect.",
    );
  }
  nextUrl.hash = "";
  return nextUrl;
}

function validateUrlShape(
  url: URL,
  code: "invalid_redirect" | "invalid_url" = "invalid_url",
  statusCode = 400,
): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PodcastFetchError(code, statusCode, "Only HTTP and HTTPS feed URLs are allowed.");
  }
  if (url.username || url.password || !url.hostname) {
    throw new PodcastFetchError(code, statusCode, "Feed URLs cannot contain credentials.");
  }

  const expectedPort = url.protocol === "https:" ? "443" : "80";
  if (url.port && url.port !== expectedPort) {
    throw new PodcastFetchError("forbidden_target", 403, "The feed target is not allowed.");
  }
}

async function resolveAndValidate(
  url: URL,
  resolveHostname: ResolveHostname,
): Promise<ResolvedAddress[]> {
  const hostname = normalizeHostname(url.hostname);
  if (
    hostname === "localhost" ||
    LOCAL_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new PodcastFetchError("forbidden_target", 403, "The feed target is not allowed.");
  }

  const literalFamily = isIP(hostname);
  if (literalFamily !== 0) {
    const literal = { address: hostname, family: literalFamily } as ResolvedAddress;
    assertAllowedAddress(literal.address);
    return [literal];
  }

  let resolved: readonly LookupAddress[];
  try {
    resolved = await resolveHostname(hostname);
  } catch {
    throw new PodcastFetchError(
      "dns_resolution_failed",
      502,
      "The feed hostname could not be resolved.",
    );
  }
  if (resolved.length === 0) {
    throw new PodcastFetchError(
      "dns_resolution_failed",
      502,
      "The feed hostname could not be resolved.",
    );
  }

  const addresses: ResolvedAddress[] = [];
  const uniqueAddresses = new Set<string>();
  for (const result of resolved) {
    const family = isIP(result.address);
    if (family !== 4 && family !== 6) {
      throw new PodcastFetchError(
        "dns_resolution_failed",
        502,
        "The feed hostname returned an invalid address.",
      );
    }
    assertAllowedAddress(result.address);
    if (!uniqueAddresses.has(result.address)) {
      uniqueAddresses.add(result.address);
      addresses.push({ address: result.address, family });
    }
  }
  return addresses;
}

function normalizeHostname(hostname: string): string {
  const withoutBrackets = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;
  return withoutBrackets.replace(/\.$/, "").toLowerCase();
}

function assertAllowedAddress(address: string): void {
  if (isBlockedAddress(address)) {
    throw new PodcastFetchError("forbidden_target", 403, "The feed target is not allowed.");
  }
}

async function resolveHostnameDefault(hostname: string): Promise<readonly LookupAddress[]> {
  return lookup(hostname, { all: true, verbatim: true });
}

function requestFeedDefault(
  url: URL,
  addresses: readonly ResolvedAddress[],
  signal: AbortSignal,
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const lookupPinned: LookupFunction = (_hostname, lookupOptions, callback) => {
      const requestedFamily = Number(lookupOptions.family ?? 0);
      const candidates =
        requestedFamily === 4 || requestedFamily === 6
          ? addresses.filter((address) => address.family === requestedFamily)
          : addresses;
      if (candidates.length === 0) {
        const error = new Error("No approved address matches the requested family.");
        Object.assign(error, { code: "ENOTFOUND" });
        callback(error, "", 0);
        return;
      }
      if (lookupOptions.all) {
        callback(
          null,
          candidates.map(({ address, family }) => ({ address, family })),
        );
        return;
      }
      const selected = candidates[0];
      if (!selected) {
        callback(new Error("No approved address is available."), "", 0);
        return;
      }
      callback(null, selected.address, selected.family);
    };
    const request = url.protocol === "https:" ? requestHttps : requestHttp;
    const clientRequest = request(
      url,
      {
        method: "GET",
        headers: {
          accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9",
          "accept-encoding": "identity",
          "user-agent": UA,
        },
        lookup: lookupPinned,
        signal,
      },
      resolve,
    );
    clientRequest.once("error", reject);
    clientRequest.end();
  });
}

function validateResponseHeaders(response: IncomingMessage, maxBytes: number): void {
  const contentType = firstHeader(response.headers["content-type"])
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (!contentType || (!XML_MEDIA_TYPES.has(contentType) && !contentType.endsWith("+xml"))) {
    response.destroy();
    throw new PodcastFetchError(
      "unsupported_content_type",
      502,
      "The upstream response is not an XML podcast feed.",
    );
  }

  const contentEncoding = firstHeader(response.headers["content-encoding"])?.trim().toLowerCase();
  if (contentEncoding && contentEncoding !== "identity") {
    response.destroy();
    throw new PodcastFetchError(
      "unsupported_content_encoding",
      502,
      "The upstream feed used an unsupported content encoding.",
    );
  }

  const contentLength = firstHeader(response.headers["content-length"]);
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      response.destroy();
      throw new PodcastFetchError(
        "response_too_large",
        502,
        "The upstream feed exceeds the response size limit.",
      );
    }
  }
}

async function readResponseBody(response: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  try {
    for await (const chunk of response) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      totalBytes += buffer.byteLength;
      if (totalBytes > maxBytes) {
        response.destroy();
        throw new PodcastFetchError(
          "response_too_large",
          502,
          "The upstream feed exceeds the response size limit.",
        );
      }
      chunks.push(buffer);
    }
  } catch (error) {
    if (error instanceof PodcastFetchError) throw error;
    throw new PodcastFetchError("network_error", 502, "The upstream feed is unavailable.");
  }
  return Buffer.concat(chunks, totalBytes).toString("utf8");
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
