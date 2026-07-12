import assert from "node:assert/strict";
import { type Server, createServer, request } from "node:http";
import type { AddressInfo } from "node:net";
import test, { type TestContext } from "node:test";

import {
  type FeedFetchDependencies,
  type FeedRequest,
  PodcastFetchError,
  fetchFeed,
  isBlockedAddress,
} from "../src/api/podcasts.js";

const PUBLIC_DNS_RESULT = [{ address: "93.184.216.34", family: 4 }] as const;

test("private, loopback, link-local, mapped, and reserved addresses are blocked", () => {
  for (const address of [
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "224.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fd00::1",
    "fe80::1",
    "2001:db8::1",
  ]) {
    assert.equal(isBlockedAddress(address), true, address);
  }
  assert.equal(isBlockedAddress("93.184.216.34"), false);
  assert.equal(isBlockedAddress("2606:4700:4700::1111"), false);
});

test("feed URLs cannot target local addresses or unsafe ports", async () => {
  for (const url of [
    "http://127.0.0.1/feed.xml",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/feed.xml",
    "http://[fd00::1]/feed.xml",
    "https://example.com:8443/feed.xml",
  ]) {
    await assert.rejects(fetchFeed(url), isFetchError("forbidden_target"));
  }
});

test("every DNS answer is checked before a connection is attempted", async () => {
  let requestCount = 0;
  const dependencies: FeedFetchDependencies = {
    resolveHostname: async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.8", family: 4 },
    ],
    request: async () => {
      requestCount += 1;
      throw new Error("must not connect");
    },
  };

  await assert.rejects(
    fetchFeed("https://feed.example/rss", {}, dependencies),
    isFetchError("forbidden_target"),
  );
  assert.equal(requestCount, 0);
});

test("redirect targets are revalidated before the next request", async (context) => {
  let requestCount = 0;
  const upstream = createServer((_request, response) => {
    requestCount += 1;
    response.writeHead(302, { location: "http://127.0.0.1/private" });
    response.end();
  });
  const origin = await listen(upstream, context);

  await assert.rejects(
    fetchFeed("http://feed.example/redirect", {}, localDependencies(origin)),
    isFetchError("forbidden_target"),
  );
  assert.equal(requestCount, 1);
});

test("the total feed timeout aborts a slow upstream", async (context) => {
  const upstream = createServer((_request, response) => {
    setTimeout(() => {
      response.writeHead(200, { "content-type": "application/rss+xml" });
      response.end("<rss />");
    }, 200);
  });
  const origin = await listen(upstream, context);

  await assert.rejects(
    fetchFeed("http://feed.example/slow", { timeoutMs: 30 }, localDependencies(origin)),
    isFetchError("timeout"),
  );
});

test("an external client signal aborts an active upstream request", async (context) => {
  let resolveStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    resolveStarted = resolve;
  });
  const upstream = createServer(() => {
    resolveStarted?.();
  });
  const origin = await listen(upstream, context);
  const controller = new AbortController();
  const operation = fetchFeed(
    "http://feed.example/slow",
    {},
    localDependencies(origin),
    controller.signal,
  );

  await started;
  controller.abort();
  await assert.rejects(operation, isFetchError("request_aborted"));
});

test("chunked responses are stopped when the byte limit is exceeded", async (context) => {
  const upstream = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/rss+xml" });
    response.write("<rss>");
    response.write("x".repeat(128));
    response.end("</rss>");
  });
  const origin = await listen(upstream, context);

  await assert.rejects(
    fetchFeed("http://feed.example/large", { maxBytes: 32 }, localDependencies(origin)),
    isFetchError("response_too_large"),
  );
});

test("non-XML upstream responses are rejected", async (context) => {
  const upstream = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<html>not a feed</html>");
  });
  const origin = await listen(upstream, context);

  await assert.rejects(
    fetchFeed("http://feed.example/html", {}, localDependencies(origin)),
    isFetchError("unsupported_content_type"),
  );
});

function localDependencies(origin: string): FeedFetchDependencies {
  return {
    resolveHostname: async () => PUBLIC_DNS_RESULT,
    request: createLocalRequest(origin),
  };
}

function createLocalRequest(origin: string): FeedRequest {
  return (targetUrl, _addresses, signal) =>
    new Promise((resolve, reject) => {
      const localUrl = new URL(`${targetUrl.pathname}${targetUrl.search}`, origin);
      const clientRequest = request(localUrl, { signal }, resolve);
      clientRequest.once("error", reject);
      clientRequest.end();
    });
}

async function listen(server: Server, context: TestContext): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

function isFetchError(code: PodcastFetchError["code"]): (error: unknown) => boolean {
  return (error) => error instanceof PodcastFetchError && error.code === code;
}
