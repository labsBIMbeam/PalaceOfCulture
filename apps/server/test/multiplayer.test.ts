import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { matchMaker } from "@colyseus/core";
import { Client, type Room } from "@colyseus/sdk";

import {
  MAX_LINEAR_SPEED,
  MAX_ROOM_CLIENTS,
  MOVEMENT_TOLERANCE,
  MOVE_MESSAGE,
  PALACE_ROOM_NAME,
  PALACE_SPAWN,
  PALACE_WORLD_ID,
  PLACE_SHIP_MODULE_MESSAGE,
  POSITION_CORRECTION_MESSAGE,
  PalaceRoomState,
  type PositionCorrection,
  parsePositionCorrection,
} from "@600b/multiplayer";

import {
  type DistanceBudget,
  MAX_HORIZONTAL_DISTANCE_BUDGET_METERS,
  MAX_VERTICAL_DISTANCE_BUDGET_METERS,
  MAX_VERTICAL_SPEED,
  type PalaceRoom,
  consumeDistanceBudget,
} from "../src/multiplayer/PalaceRoom.js";
import { MultiplayerServer, loadMultiplayerConfig } from "../src/multiplayer/server.js";

const ALLOWED_ORIGIN = "https://palace.example";
const POLICY_CLOSE_CODE = 4008;

type PalaceClientRoom = Room<unknown, PalaceRoomState>;

test("multiplayer configuration is local and exact by default", () => {
  const defaults = loadMultiplayerConfig({});
  assert.equal(defaults.host, "127.0.0.1");
  assert.equal(defaults.port, 2567);
  assert.equal(defaults.allowedOrigins.size, 0);
  assert.equal(defaults.trustedProxyHops, 0);

  const configured = loadMultiplayerConfig({
    MULTIPLAYER_HOST: "::1",
    MULTIPLAYER_ORIGINS: `${ALLOWED_ORIGIN}, http://localhost:5173`,
    MULTIPLAYER_PORT: "0",
    MULTIPLAYER_TRUST_PROXY_HOPS: "2",
  });
  assert.equal(configured.host, "::1");
  assert.equal(configured.port, 0);
  assert.equal(configured.trustedProxyHops, 2);
  assert.deepEqual([...configured.allowedOrigins], [ALLOWED_ORIGIN, "http://localhost:5173"]);
});

test("multiplayer configuration rejects wildcard, path, credentials, and invalid ports", () => {
  assert.throws(
    () => loadMultiplayerConfig({ MULTIPLAYER_ORIGINS: "*" }),
    /explicit HTTP or HTTPS/,
  );
  assert.throws(
    () => loadMultiplayerConfig({ MULTIPLAYER_ORIGINS: `${ALLOWED_ORIGIN}/room` }),
    /Invalid multiplayer origin/,
  );
  assert.throws(
    () => loadMultiplayerConfig({ MULTIPLAYER_ORIGINS: "https://user:pass@palace.example" }),
    /Invalid multiplayer origin/,
  );
  assert.throws(
    () => loadMultiplayerConfig({ MULTIPLAYER_PORT: "65536" }),
    /integer between 0 and 65535/,
  );
  assert.throws(
    () => loadMultiplayerConfig({ MULTIPLAYER_TRUST_PROXY_HOPS: "11" }),
    /integer between 0 and 10/,
  );
});

test("distance budget permits 12m/s with bounded jitter tolerance and no idle banking", () => {
  const budget: DistanceBudget = {
    distanceRefillAt: 0,
    distanceTokens: MOVEMENT_TOLERANCE,
  };
  let acceptedDistance = MOVEMENT_TOLERANCE;
  assert.equal(consumeDistanceBudget(budget, MOVEMENT_TOLERANCE, 0), true);
  for (let now = 50; now <= 10_000; now += 50) {
    const step = (MAX_LINEAR_SPEED * 50) / 1_000;
    assert.equal(consumeDistanceBudget(budget, step, now), true);
    acceptedDistance += step;
  }
  assert.ok(Math.abs(acceptedDistance - (MOVEMENT_TOLERANCE + MAX_LINEAR_SPEED * 10)) < 1e-9);
  assert.equal(consumeDistanceBudget(budget, 0.001, 10_000), false);

  const idleBudget: DistanceBudget = {
    distanceRefillAt: 0,
    distanceTokens: MOVEMENT_TOLERANCE,
  };
  assert.equal(consumeDistanceBudget(idleBudget, 122, 10_000), false);
  assert.equal(idleBudget.distanceRefillAt, 10_000);
  assert.equal(
    consumeDistanceBudget(idleBudget, MAX_HORIZONTAL_DISTANCE_BUDGET_METERS, 10_000),
    true,
  );

  const jitterBudget: DistanceBudget = { distanceRefillAt: 0, distanceTokens: 0 };
  for (let frame = 0; frame < 7; frame += 1) {
    assert.equal(consumeDistanceBudget(jitterBudget, 0.8, 700), true);
  }
  assert.ok(jitterBudget.distanceTokens > 2);

  const fallingBudget: DistanceBudget = { distanceRefillAt: 0, distanceTokens: 0 };
  for (let frame = 0; frame < 7; frame += 1) {
    assert.equal(
      consumeDistanceBudget(
        fallingBudget,
        2,
        700,
        MAX_VERTICAL_SPEED,
        MAX_VERTICAL_DISTANCE_BUDGET_METERS,
      ),
      true,
    );
  }
  assert.equal(fallingBudget.distanceTokens, 0);
});

test("real clients share one authoritative public HQ room", async (context) => {
  const runtime = new MultiplayerServer({
    host: "127.0.0.1",
    port: 0,
    allowedOrigins: new Set([ALLOWED_ORIGIN]),
    trustedProxyHops: 1,
  });
  let stopped = false;
  context.after(async () => {
    if (!stopped) await runtime.shutdown();
  });
  await runtime.listen();

  const address = runtime.address;
  assert.ok(address);
  const endpoint = `ws://127.0.0.1:${address.port}`;
  const matchmakeEndpoint = `http://127.0.0.1:${address.port}/matchmake/joinOrCreate/${PALACE_ROOM_NAME}`;

  const allowedPreflight = await fetch(matchmakeEndpoint, {
    method: "OPTIONS",
    headers: {
      Origin: ALLOWED_ORIGIN,
      "Access-Control-Request-Method": "POST",
    },
  });
  assert.equal(allowedPreflight.status, 204);
  assert.equal(allowedPreflight.headers.get("access-control-allow-origin"), ALLOWED_ORIGIN);

  const nullPreflight = await fetch(matchmakeEndpoint, {
    method: "OPTIONS",
    headers: { Origin: "null", "Access-Control-Request-Method": "POST" },
  });
  assert.equal(nullPreflight.status, 403);
  assert.equal(nullPreflight.headers.get("access-control-allow-origin"), null);
  const nullPost = await fetch(matchmakeEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "null" },
    body: JSON.stringify(joinOptions("opaque")),
  });
  assert.equal(nullPost.status, 403);
  assert.equal(nullPost.headers.get("access-control-allow-origin"), null);

  const declaredOversize = await fetch(matchmakeEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ALLOWED_ORIGIN },
    body: "x".repeat(4 * 1024 + 1),
  });
  assert.equal(declaredOversize.status, 413);
  const chunkedOversize = await postOversizedChunked(matchmakeEndpoint, ALLOWED_ORIGIN);
  assert.equal(chunkedOversize.status, 413);

  // Native clients without an Origin header remain supported after rejected HTTP requests.
  const nativeRoom = await new Client(endpoint).joinOrCreate<PalaceRoomState>(
    PALACE_ROOM_NAME,
    joinOptions("native"),
    PalaceRoomState,
  );
  await nativeRoom.leave(true);

  const slowBodies = [
    ...Array.from({ length: 4 }, () =>
      postIncompleteChunked(matchmakeEndpoint, ALLOWED_ORIGIN, "198.51.100.220"),
    ),
    ...Array.from({ length: 4 }, () =>
      postIncompleteChunked(matchmakeEndpoint, ALLOWED_ORIGIN, "198.51.100.221"),
    ),
  ];
  await waitFor(() => runtime.matchmakingHttpGuard.activeRequestCount === 8);
  await assert.rejects(() =>
    client(endpoint, ALLOWED_ORIGIN, "198.51.100.222").joinOrCreate(
      PALACE_ROOM_NAME,
      joinOptions("blocked-slow"),
      PalaceRoomState,
    ),
  );
  assert.deepEqual(
    await Promise.all(slowBodies),
    Array.from({ length: 8 }, () => 408),
  );
  await waitFor(() => runtime.matchmakingHttpGuard.activeRequestCount === 0);
  const healthyAfterTimeout = await client(
    endpoint,
    ALLOWED_ORIGIN,
    "198.51.100.222",
  ).joinOrCreate<PalaceRoomState>(
    PALACE_ROOM_NAME,
    joinOptions("healthy-timeout"),
    PalaceRoomState,
  );
  await healthyAfterTimeout.leave(true);

  await assert.rejects(() =>
    client(endpoint, `${ALLOWED_ORIGIN}.attacker`).joinOrCreate(
      PALACE_ROOM_NAME,
      joinOptions("mallory"),
      PalaceRoomState,
    ),
  );
  await assert.rejects(() =>
    client(endpoint).joinOrCreate(
      PALACE_ROOM_NAME,
      { handle: "contains spaces", worldId: PALACE_WORLD_ID },
      PalaceRoomState,
    ),
  );
  await assert.rejects(() =>
    client(endpoint).joinOrCreate(
      PALACE_ROOM_NAME,
      { handle: "alice", worldId: "home" },
      PalaceRoomState,
    ),
  );
  await assert.rejects(() =>
    client(endpoint).joinOrCreate("home", joinOptions("alice"), PalaceRoomState),
  );

  const aliceClient = client(endpoint);
  const bobClient = client(endpoint);
  let aliceRoom = await aliceClient.joinOrCreate<PalaceRoomState>(
    PALACE_ROOM_NAME,
    joinOptions("alice"),
    PalaceRoomState,
  );
  const bobRoom = await bobClient.joinOrCreate<PalaceRoomState>(
    PALACE_ROOM_NAME,
    joinOptions("bob"),
    PalaceRoomState,
  );
  await waitFor(() => aliceRoom.state.players.size === 2 && bobRoom.state.players.size === 2);

  assert.equal(aliceRoom.roomId, bobRoom.roomId);
  assert.equal(aliceRoom.state.worldId, PALACE_WORLD_ID);
  const authoritativeRoom = matchMaker.getLocalRoomById(aliceRoom.roomId) as PalaceRoom;
  assert.ok(authoritativeRoom);
  assert.equal(authoritativeRoom.roomName, PALACE_ROOM_NAME);
  assert.equal(authoritativeRoom.maxClients, MAX_ROOM_CLIENTS);
  assert.equal(authoritativeRoom.patchRate, 100);
  assert.equal(authoritativeRoom.seatReservationTimeout, 5);

  assertPresenceAtSpawn(aliceRoom, aliceRoom.sessionId, "alice");
  assertPresenceAtSpawn(aliceRoom, bobRoom.sessionId, "bob");

  aliceRoom.send(PLACE_SHIP_MODULE_MESSAGE, {
    moduleId: "alice-keel",
    label: "A dancefloor needs a keel",
    role: "structure",
  });
  await waitFor(
    () => aliceRoom.state.shipModules.size === 1 && bobRoom.state.shipModules.size === 1,
  );
  const aliceModule = bobRoom.state.shipModules.get(`${aliceRoom.sessionId}:alice-keel`);
  assert.ok(aliceModule);
  assert.equal(aliceModule.slot, 1);
  assert.equal(aliceModule.authorHandle, "alice");
  assert.equal(aliceModule.label, "A dancefloor needs a keel");
  assert.equal(aliceModule.role, "structure");

  aliceRoom.send(PLACE_SHIP_MODULE_MESSAGE, {
    moduleId: "alice-second",
    label: "A second claim",
    role: "energy",
  });
  await delay(100);
  assert.equal(bobRoom.state.shipModules.size, 1, "one person receives one live workshop module");

  bobRoom.send(PLACE_SHIP_MODULE_MESSAGE, {
    moduleId: "bob-signal",
    label: "Music for the long crossing",
    role: "signal",
  });
  await waitFor(
    () => aliceRoom.state.shipModules.size === 2 && bobRoom.state.shipModules.size === 2,
  );
  const bobModule = aliceRoom.state.shipModules.get(`${bobRoom.sessionId}:bob-signal`);
  assert.ok(bobModule);
  assert.equal(bobModule.slot, 2);
  assert.equal(bobModule.authorHandle, "bob");
  assert.equal(bobModule.role, "signal");

  // Presence is intentionally non-colliding: both players may occupy the exact same point.
  const sharedPoint = { x: PALACE_SPAWN.x + 1, y: PALACE_SPAWN.y, z: PALACE_SPAWN.z };
  aliceRoom.send(MOVE_MESSAGE, movement(1, sharedPoint));
  bobRoom.send(MOVE_MESSAGE, movement(1, sharedPoint));
  await waitFor(() =>
    [aliceRoom, bobRoom].every((room) =>
      [aliceRoom.sessionId, bobRoom.sessionId].every((sessionId) => {
        const player = room.state.players.get(sessionId);
        return player?.sequence === 1 && player.x === sharedPoint.x && player.z === sharedPoint.z;
      }),
    ),
  );
  assert.equal(aliceRoom.state.players.size, 2);

  // A teleport is ignored, but a later monotone, plausible update remains usable.
  const speedCorrection = nextPositionCorrection(aliceRoom);
  aliceRoom.send(MOVE_MESSAGE, movement(2, { x: 100, y: 4, z: 44 }));
  const correction = await within(speedCorrection, 3_000, "speed correction was not sent");
  assert.deepEqual(correction, {
    reason: "speed",
    rotationY: 0,
    sequence: 1,
    x: sharedPoint.x,
    y: sharedPoint.y,
    z: sharedPoint.z,
  });
  assert.equal(aliceRoom.state.players.get(aliceRoom.sessionId)?.sequence, 1);
  assert.equal(aliceRoom.state.players.get(aliceRoom.sessionId)?.x, sharedPoint.x);

  aliceRoom.send(MOVE_MESSAGE, movement(3, sharedPoint));
  await waitFor(() => bobRoom.state.players.get(aliceRoom.sessionId)?.sequence === 3);
  aliceRoom.send(MOVE_MESSAGE, movement(3, { x: sharedPoint.x + 1, y: 4, z: 44 }));
  await delay(100);
  assert.equal(bobRoom.state.players.get(aliceRoom.sessionId)?.x, sharedPoint.x);

  // Even UINT32_MAX cannot poison sequence tracking when that movement is rejected.
  aliceRoom.send(MOVE_MESSAGE, movement(0xffff_ffff, { x: 100, y: 4, z: 44 }));
  await delay(100);
  aliceRoom.send(MOVE_MESSAGE, movement(4, sharedPoint));
  await waitFor(() => bobRoom.state.players.get(aliceRoom.sessionId)?.sequence === 4);

  // Falling may always return to the exact authoritative spawn, but nowhere else.
  const authoritativeAlice = authoritativeRoom.state.players.get(aliceRoom.sessionId);
  assert.ok(authoritativeAlice);
  authoritativeAlice.x = 100;
  authoritativeAlice.y = PALACE_SPAWN.y;
  authoritativeAlice.z = PALACE_SPAWN.z;
  await waitFor(() => bobRoom.state.players.get(aliceRoom.sessionId)?.x === 100);
  aliceRoom.send(MOVE_MESSAGE, movement(5, PALACE_SPAWN));
  await waitFor(() => bobRoom.state.players.get(aliceRoom.sessionId)?.sequence === 5);
  assert.equal(bobRoom.state.players.get(aliceRoom.sessionId)?.x, PALACE_SPAWN.x);

  authoritativeAlice.x = 100;
  await waitFor(() => bobRoom.state.players.get(aliceRoom.sessionId)?.x === 100);
  aliceRoom.send(MOVE_MESSAGE, movement(6, { x: 90, y: PALACE_SPAWN.y, z: PALACE_SPAWN.z }));
  await delay(150);
  assert.equal(bobRoom.state.players.get(aliceRoom.sessionId)?.sequence, 5);
  assert.equal(bobRoom.state.players.get(aliceRoom.sessionId)?.x, 100);
  aliceRoom.send(MOVE_MESSAGE, movement(6, PALACE_SPAWN));
  await waitFor(() => bobRoom.state.players.get(aliceRoom.sessionId)?.sequence === 6);

  // A dropped connection keeps its seat for ten seconds and exposes its connection state.
  const aliceSessionId = aliceRoom.sessionId;
  const aliceReconnectionToken = aliceRoom.reconnectionToken;
  aliceRoom.reconnection.enabled = false;
  await aliceRoom.leave(false);
  await waitFor(() => bobRoom.state.players.get(aliceSessionId)?.connected === false);
  aliceRoom = await aliceClient.reconnect<PalaceRoomState>(aliceReconnectionToken, PalaceRoomState);
  await waitFor(
    () =>
      bobRoom.state.players.get(aliceSessionId)?.connected === true &&
      aliceRoom.state.players.get(aliceSessionId)?.sequence === 6,
  );
  assert.equal(aliceRoom.sessionId, aliceSessionId);

  // More than twenty movement messages in one burst is a controlled policy close.
  const rateRoom = await client(endpoint).joinOrCreate<PalaceRoomState>(
    PALACE_ROOM_NAME,
    joinOptions("rate-test"),
    PalaceRoomState,
  );
  await waitFor(() => bobRoom.state.players.has(rateRoom.sessionId));
  const rateLeave = nextLeave(rateRoom);
  for (let sequence = 1; sequence <= 21; sequence += 1) {
    rateRoom.send(MOVE_MESSAGE, movement(sequence, PALACE_SPAWN));
  }
  const rateResult = await within(rateLeave, 3_000, "rate-limited client was not closed");
  assert.equal(rateResult.code, POLICY_CLOSE_CODE);
  await waitFor(() => !bobRoom.state.players.has(rateRoom.sessionId));

  // Repeated malformed movement also closes only that client and leaves the room healthy.
  const invalidRoom = await client(endpoint).joinOrCreate<PalaceRoomState>(
    PALACE_ROOM_NAME,
    joinOptions("invalid-test"),
    PalaceRoomState,
  );
  await waitFor(() => bobRoom.state.players.has(invalidRoom.sessionId));
  const invalidLeave = nextLeave(invalidRoom);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    invalidRoom.send(MOVE_MESSAGE, movement(0xffff_ffff, { x: 321, y: 4, z: 44 }));
  }
  const invalidResult = await within(invalidLeave, 3_000, "invalid client was not closed");
  assert.equal(invalidResult.code, POLICY_CLOSE_CODE);
  await waitFor(() => !bobRoom.state.players.has(invalidRoom.sessionId));
  assert.equal(bobRoom.state.players.get(aliceSessionId)?.connected, true);

  // Abandoned reservations are bounded by admission control and expire after five seconds.
  const floodResponses: Response[] = [];
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const response = await fetch(matchmakeEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: ALLOWED_ORIGIN,
        "X-Forwarded-For": "198.51.100.200",
      },
      body: JSON.stringify(joinOptions("reserved")),
    });
    await response.arrayBuffer();
    floodResponses.push(response);
  }
  const successfulReservations = floodResponses.filter((response) => response.ok).length;
  assert.ok(successfulReservations < MAX_ROOM_CLIENTS - 2);
  assert.ok(floodResponses.some((response) => response.status === 429));
  const listingDuringFlood = await matchMaker.getRoomById(aliceRoom.roomId);
  assert.ok(listingDuringFlood.clients < MAX_ROOM_CLIENTS);

  const healthyDuringAttack = await client(
    endpoint,
    ALLOWED_ORIGIN,
    "198.51.100.201",
  ).joinOrCreate<PalaceRoomState>(PALACE_ROOM_NAME, joinOptions("healthy"), PalaceRoomState);
  await healthyDuringAttack.leave(true);

  await delay(5_250);
  const listingAfterExpiry = await matchMaker.getRoomById(aliceRoom.roomId);
  assert.equal(listingAfterExpiry.clients, 2);

  await bobRoom.leave(true);
  await waitFor(() => !aliceRoom.state.players.has(bobRoom.sessionId));
  await aliceRoom.leave(true);

  await runtime.shutdown();
  stopped = true;
  assert.equal(runtime.transport.server?.listening, false);
  assert.equal(runtime.address, null);
});

let nextTestIp = 10;

function client(
  endpoint: string,
  origin = ALLOWED_ORIGIN,
  forwardedFor = `198.51.100.${nextTestIp++}`,
): InstanceType<typeof Client> {
  return new Client(endpoint, {
    headers: { Origin: origin, "X-Forwarded-For": forwardedFor },
  });
}

function joinOptions(handle: string): {
  avatarAssetId: string;
  handle: string;
  worldId: typeof PALACE_WORLD_ID;
} {
  return {
    avatarAssetId: handle === "alice" ? "flx" : "placeholder",
    handle,
    worldId: PALACE_WORLD_ID,
  };
}

function movement(
  sequence: number,
  position: { x: number; y: number; z: number },
): { rotationY: number; sequence: number; x: number; y: number; z: number } {
  return { ...position, rotationY: 0, sequence };
}

function assertPresenceAtSpawn(room: PalaceClientRoom, sessionId: string, handle: string): void {
  const player = room.state.players.get(sessionId);
  assert.ok(player);
  assert.equal(player.avatarAssetId, handle === "alice" ? "flx" : "placeholder");
  assert.equal(player.handle, handle);
  assert.equal(player.x, PALACE_SPAWN.x);
  assert.equal(player.y, PALACE_SPAWN.y);
  assert.equal(player.z, PALACE_SPAWN.z);
  assert.equal(player.connected, true);
  assert.ok(player.connectedAt > 0);
}

function nextLeave(room: PalaceClientRoom): Promise<{ code: number; reason?: string }> {
  return new Promise((resolve) => {
    room.onLeave.once((code, reason) => resolve({ code, reason }));
  });
}

function nextPositionCorrection(room: PalaceClientRoom): Promise<PositionCorrection> {
  return new Promise((resolve) => {
    let unsubscribe = (): void => {};
    unsubscribe = room.onMessage(POSITION_CORRECTION_MESSAGE, (payload) => {
      unsubscribe();
      resolve(parsePositionCorrection(payload));
    });
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 3_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await delay(10);
  }
  assert.fail("timed out waiting for replicated room state");
}

async function within<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  const timeout = new AbortController();
  return Promise.race([
    promise,
    delay(timeoutMs, undefined, { signal: timeout.signal }).then(() => {
      throw new Error(message);
    }),
  ]).finally(() => timeout.abort());
}

function postOversizedChunked(url: string, origin: string): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
      },
      (response) => {
        response.resume();
        response.once("end", () => resolve({ status: response.statusCode ?? 0 }));
      },
    );
    request.once("error", reject);
    request.write("x".repeat(4 * 1024));
    request.end("x");
  });
}

function postIncompleteChunked(url: string, origin: string, forwardedFor: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          "X-Forwarded-For": forwardedFor,
        },
      },
      (response) => {
        response.resume();
        response.once("end", () => resolve(response.statusCode ?? 0));
      },
    );
    request.once("error", reject);
    request.write("{");
  });
}
