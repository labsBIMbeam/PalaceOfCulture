import assert from "node:assert/strict";
import { createServer } from "node:net";
import {
  PUBLIC_RELAYS,
  probeRelay,
  resolveMeshRelayUrl,
  resolveRelayUrls,
} from "../src/net/nostrConfig";

// --- endpoint validation ---------------------------------------------------

assert.equal(resolveMeshRelayUrl(undefined), "ws://localhost:7777");
assert.equal(resolveMeshRelayUrl("ws://localhost:7777/"), "ws://localhost:7777");
assert.equal(resolveMeshRelayUrl("  ws://127.0.0.1:7777  "), "ws://127.0.0.1:7777");
assert.equal(resolveMeshRelayUrl("ws://[::1]:7777"), "ws://[::1]:7777");

// An empty or null value is the documented opt-out, not a misconfiguration.
assert.equal(resolveMeshRelayUrl(""), null);
assert.equal(resolveMeshRelayUrl("   "), null);
assert.equal(resolveMeshRelayUrl(null), null);

// The guard that matters: a plaintext socket to a mesh address is refused by the browser when the
// page is served over HTTPS, so it must fail loudly at config time rather than silently at runtime.
assert.throws(() => resolveMeshRelayUrl("ws://[fd97::1]:7777"), /loopback/);
assert.throws(() => resolveMeshRelayUrl("ws://relay.example"), /loopback/);
assert.throws(() => resolveMeshRelayUrl("ws://192.168.1.10:7777"), /loopback/);

// TLS is trusted anywhere, because an HTTPS page may open wss:// to any host.
assert.equal(resolveMeshRelayUrl("wss://relay.example"), "wss://relay.example");

assert.throws(() => resolveMeshRelayUrl("http://localhost:7777"), /ws:\/\/ or wss:\/\//);
// "localhost:7777" parses — URL reads `localhost:` as the scheme — so it is caught by the protocol
// check rather than the absolute-URL check. A path-only value is what actually fails to parse.
assert.throws(() => resolveMeshRelayUrl("localhost:7777"), /ws:\/\/ or wss:\/\//);
assert.throws(() => resolveMeshRelayUrl("/relay"), /absolute/);
assert.throws(() => resolveMeshRelayUrl("ws://user:secret@localhost:7777"), /credentials/);
assert.throws(() => resolveMeshRelayUrl(42), /must be a string/);

// --- relay list resolution -------------------------------------------------

const reachable = await resolveRelayUrls({
  meshRelayUrl: "ws://localhost:7777",
  probe: async () => true,
});
assert.deepEqual(reachable, ["ws://localhost:7777", ...PUBLIC_RELAYS]);
assert.equal(reachable[0], "ws://localhost:7777", "the mesh relay must be dialled first");

// The branch every player without FIPS hits: no mesh relay, but still fully connected.
const unreachable = await resolveRelayUrls({
  meshRelayUrl: "ws://localhost:7777",
  probe: async () => false,
});
assert.deepEqual(unreachable, [...PUBLIC_RELAYS]);

// A probe that blows up must degrade to clearnet rather than propagate.
const thrown = await resolveRelayUrls({
  meshRelayUrl: "ws://localhost:7777",
  probe: async () => {
    throw new Error("probe exploded");
  },
});
assert.deepEqual(thrown, [...PUBLIC_RELAYS]);

// Opting out skips the probe entirely — no stray socket for players who disabled mesh routing.
let probeCalls = 0;
const optedOut = await resolveRelayUrls({
  meshRelayUrl: "",
  probe: async () => {
    probeCalls += 1;
    return true;
  },
});
assert.deepEqual(optedOut, [...PUBLIC_RELAYS]);
assert.equal(probeCalls, 0);

// The probe is handed the validated URL and the configured budget, not the raw input.
const observed: Array<{ url: string; timeoutMs: number }> = [];
await resolveRelayUrls({
  meshRelayUrl: "ws://localhost:7777/",
  timeoutMs: 250,
  probe: async (url, timeoutMs) => {
    observed.push({ url, timeoutMs });
    return false;
  },
});
assert.deepEqual(observed, [{ url: "ws://localhost:7777", timeoutMs: 250 }]);

// --- real probe against a closed port --------------------------------------

assert.equal(
  typeof WebSocket,
  "function",
  "Node must expose a global WebSocket for the live probe",
);

const closedPort = await new Promise<number>((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      reject(new Error("could not reserve a loopback port"));
      return;
    }
    // Closing before probing guarantees nothing is listening, so the check cannot flake.
    server.close(() => resolve(address.port));
  });
});

assert.equal(await probeRelay(`ws://127.0.0.1:${closedPort}`, 1_000), false);

process.stdout.write("mesh-relay-smoke ok\n");
