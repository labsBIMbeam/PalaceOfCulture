import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import { type AddressInfo, createServer as createNetServer } from "node:net";
import test, { type TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import {
  type ServerConfig,
  type ServerDependencies,
  createPodcastServer,
  loadServerConfig,
} from "../src/app.js";

test("network defaults bind locally and do not enable cross-origin access", () => {
  const config = loadServerConfig({});
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 8787);
  assert.equal(config.corsOrigins.size, 0);
  assert.equal(config.auditDbPath.endsWith("audit.sqlite"), true);
  assert.equal(config.trustedProxyHops, 0);
  assert.equal(config.feedRateLimit.limit, 12);
  assert.equal(config.feedRateLimit.maxEntries, 10_000);
});

test("wildcard CORS configuration is rejected", () => {
  assert.throws(() => loadServerConfig({ CORS_ORIGINS: "*" }), /explicit HTTP or HTTPS/);
});

test("inconsistent feed concurrency configuration is rejected", () => {
  assert.throws(
    () =>
      loadServerConfig({
        PODCAST_FEED_MAX_CONCURRENT_GLOBAL: "1",
        PODCAST_FEED_MAX_CONCURRENT_PER_IP: "2",
      }),
    /at least the per-IP concurrency limit/,
  );
});

test("HTTP server resource limits are applied", () => {
  const server = createPodcastServer(testConfig());
  assert.equal(server.maxConnections, 64);
  assert.equal(server.maxHeadersCount, 100);
  assert.equal(server.maxRequestsPerSocket, 100);
  assert.equal(server.headersTimeout, 10_000);
  assert.equal(server.requestTimeout, 15_000);
  assert.equal(server.timeout, 30_000);
});

test("health endpoint responds from a real HTTP listener", async (context) => {
  const origin = await listenApplication(context, testConfig());
  const response = await fetch(`${origin}/api/health`);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ok");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("the internal audit store has no HTTP route", async (context) => {
  const origin = await listenApplication(context, testConfig());
  const response = await fetch(`${origin}/api/audit/streams`);
  assert.equal(response.status, 404);
});

test("the feed endpoint exposes stable SSRF error semantics", async (context) => {
  const origin = await listenApplication(context, testConfig());
  const feedUrl = encodeURIComponent("http://169.254.169.254/latest/meta-data");
  const response = await fetch(`${origin}/api/podcasts/feed?url=${feedUrl}`);

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: {
      code: "forbidden_target",
      message: "The feed target is not allowed.",
    },
  });
});

test("CORS accepts only an explicitly configured exact origin", async (context) => {
  const config = testConfig();
  config.corsOrigins = new Set(["https://palace.example"]);
  const origin = await listenApplication(context, config);

  const rejected = await fetch(`${origin}/api/health`, {
    headers: { origin: "https://attacker.example" },
  });
  assert.equal(rejected.status, 403);

  const accepted = await fetch(`${origin}/api/health`, {
    headers: { origin: "https://palace.example" },
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.headers.get("access-control-allow-origin"), "https://palace.example");
});

test("feed requests are rate limited per socket IP with Retry-After", async (context) => {
  const config = testConfig();
  config.feedRateLimit.limit = 2;
  let fetchCount = 0;
  const origin = await listenApplication(context, config, {
    fetchFeed: async () => {
      fetchCount += 1;
      return "<rss />";
    },
  });
  const endpoint = `${origin}/api/podcasts/feed?url=${encodeURIComponent("https://feed.example/rss")}`;

  const first = await fetch(endpoint, { headers: { "x-forwarded-for": "198.51.100.1" } });
  const second = await fetch(endpoint, { headers: { "x-forwarded-for": "198.51.100.2" } });
  const rejected = await fetch(endpoint, { headers: { "x-forwarded-for": "198.51.100.3" } });

  assert.equal(first.status, 200);
  assert.equal(first.headers.get("x-ratelimit-remaining"), "1");
  assert.equal(second.status, 200);
  assert.equal(rejected.status, 429);
  assert.equal(rejected.headers.get("x-ratelimit-limit"), "2");
  assert.ok(Number(rejected.headers.get("retry-after")) > 0);
  assert.equal(fetchCount, 2);
});

test("per-IP concurrent feed fetches are capped", async (context) => {
  const config = testConfig();
  config.feedRateLimit.maxConcurrentPerIp = 1;
  let resolveStarted: (() => void) | undefined;
  let resolveFetch: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    resolveStarted = resolve;
  });
  const finishFetch = new Promise<void>((resolve) => {
    resolveFetch = resolve;
  });
  context.after(() => resolveFetch?.());
  const origin = await listenApplication(context, config, {
    fetchFeed: async () => {
      resolveStarted?.();
      await finishFetch;
      return "<rss />";
    },
  });
  const endpoint = `${origin}/api/podcasts/feed?url=${encodeURIComponent("https://feed.example/rss")}`;

  const firstRequest = fetch(endpoint);
  await started;
  const rejected = await fetch(endpoint);
  assert.equal(rejected.status, 429);
  const rejectedBody = (await rejected.json()) as { error: { code: string } };
  assert.equal(rejectedBody.error.code, "feed_concurrency_exceeded");

  resolveFetch?.();
  assert.equal((await firstRequest).status, 200);
});

test("global feed capacity rejects a different forwarded client", async (context) => {
  const config = testConfig();
  config.trustedProxyHops = 1;
  config.feedRateLimit.maxConcurrentGlobal = 1;
  config.feedRateLimit.maxConcurrentPerIp = 1;
  let resolveStarted: (() => void) | undefined;
  let resolveFetch: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    resolveStarted = resolve;
  });
  const finishFetch = new Promise<void>((resolve) => {
    resolveFetch = resolve;
  });
  context.after(() => resolveFetch?.());
  const origin = await listenApplication(context, config, {
    fetchFeed: async () => {
      resolveStarted?.();
      await finishFetch;
      return "<rss />";
    },
  });
  const endpoint = `${origin}/api/podcasts/feed?url=${encodeURIComponent("https://feed.example/rss")}`;

  const firstRequest = fetch(endpoint, { headers: { "x-forwarded-for": "198.51.100.1" } });
  await started;
  const rejected = await fetch(endpoint, {
    headers: { "x-forwarded-for": "198.51.100.2" },
  });
  assert.equal(rejected.status, 503);
  const rejectedBody = (await rejected.json()) as { error: { code: string } };
  assert.equal(rejectedBody.error.code, "feed_capacity_exceeded");

  resolveFetch?.();
  assert.equal((await firstRequest).status, 200);
});

test("disconnecting clients abort upstream work and release their slot", async (context) => {
  const config = testConfig();
  config.feedRateLimit.maxConcurrentPerIp = 1;
  let callCount = 0;
  let resolveStarted: (() => void) | undefined;
  let resolveAborted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    resolveStarted = resolve;
  });
  const aborted = new Promise<void>((resolve) => {
    resolveAborted = resolve;
  });
  const origin = await listenApplication(context, config, {
    fetchFeed: async (_url, _options, signal) => {
      callCount += 1;
      if (callCount > 1) return "<rss />";
      resolveStarted?.();
      return new Promise((_resolve, reject) => {
        signal?.addEventListener(
          "abort",
          () => {
            resolveAborted?.();
            reject(new Error("aborted"));
          },
          { once: true },
        );
      });
    },
  });
  const endpoint = `${origin}/api/podcasts/feed?url=${encodeURIComponent("https://feed.example/rss")}`;
  const clientRequest = httpRequest(endpoint);
  clientRequest.once("error", () => {});
  clientRequest.end();

  await started;
  clientRequest.destroy();
  await aborted;
  await delay(10);

  const nextResponse = await fetch(endpoint);
  assert.equal(nextResponse.status, 200);
  assert.equal(callCount, 2);
});

test("the compiled ESM entrypoint starts and serves health", async (context) => {
  const port = await reservePort();
  const serverRoot = fileURLToPath(new URL("../", import.meta.url));
  const entrypoint = fileURLToPath(new URL("../dist/index.js", import.meta.url));
  const child = spawn(process.execPath, [entrypoint], {
    cwd: serverRoot,
    env: {
      ...process.env,
      AUDIT_DB_PATH: ":memory:",
      CORS_ORIGINS: "",
      HOST: "127.0.0.1",
      MULTIPLAYER_ORIGINS: "",
      MULTIPLAYER_PORT: "0",
      PORT: String(port),
      SERVER_SHUTDOWN_GRACE_MS: "1000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });
  context.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGKILL");
      await exited;
    }
  });

  const deadline = Date.now() + 3_000;
  let response: Response | undefined;
  while (Date.now() < deadline && child.exitCode === null) {
    try {
      response = await fetch(`http://127.0.0.1:${port}/api/health`);
      break;
    } catch {
      await delay(25);
    }
  }

  assert.ok(response, `compiled server did not start: ${stderr}`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ok");

  assert.equal(child.kill("SIGTERM"), true);
  const shutdownTimeout = new AbortController();
  const [exitCode, exitSignal] = await Promise.race([
    once(child, "exit"),
    delay(5_000, undefined, { signal: shutdownTimeout.signal }).then(() => {
      throw new Error(`compiled server did not shut down: ${stderr}`);
    }),
  ]).finally(() => shutdownTimeout.abort());
  if (process.platform === "win32") {
    // Node maps ChildProcess.kill() to TerminateProcess on Windows; it cannot simulate Ctrl+C.
    assert.equal(exitSignal, "SIGTERM");
  } else {
    assert.equal(exitSignal, null);
    assert.equal(exitCode, 0, stderr);
  }
});

function testConfig(): ServerConfig {
  return {
    host: "127.0.0.1",
    port: 0,
    corsOrigins: new Set(),
    auditDbPath: ":memory:",
    trustedProxyHops: 0,
    maxConnections: 64,
    shutdownGraceMs: 1_000,
    feedFetch: { timeoutMs: 500, maxBytes: 64 * 1024, maxRedirects: 2 },
    feedRateLimit: {
      limit: 20,
      windowMs: 60_000,
      maxEntries: 100,
      maxConcurrentPerIp: 2,
      maxConcurrentGlobal: 8,
    },
  };
}

async function listenApplication(
  context: TestContext,
  config: ServerConfig,
  dependencies: ServerDependencies = {},
): Promise<string> {
  const server = createPodcastServer(config, dependencies);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function reservePort(): Promise<number> {
  const reservation = createNetServer();
  await new Promise<void>((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", resolve);
  });
  const port = (reservation.address() as AddressInfo).port;
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  return port;
}
