import assert from "node:assert/strict";
import test from "node:test";

import { Decoder, Encoder } from "@colyseus/schema";

import {
  MULTIPLAYER_PROTOCOL_VERSION,
  MultiplayerInputError,
  PALACE_SPAWN,
  PalaceRoomState,
  PlayerPresenceState,
  parseMovementMessage,
  parsePalaceJoinOptions,
  parsePositionCorrection,
} from "@600b/multiplayer";

const MOVEMENT = { x: 1, y: 2, z: 3, rotationY: 0.5, sequence: 7 };

function assertInputError(callback) {
  assert.throws(callback, MultiplayerInputError);
}

test("the public HQ spawn is one immutable shared protocol constant", () => {
  assert.deepEqual(PALACE_SPAWN, { x: 6, y: 4, z: 44 });
  assert.equal(Object.isFrozen(PALACE_SPAWN), true);
});

test("the built ESM package registers schemas that round-trip through schema 4", () => {
  const state = new PalaceRoomState();
  const player = new PlayerPresenceState();
  player.avatarAssetId = "dni";
  player.handle = "dni_21";
  player.x = 12.5;
  player.y = 3;
  player.z = -9.25;
  player.rotationY = 0.75;
  player.sequence = 0xffff_ffff;
  player.connected = false;
  player.connectedAt = 1_725_000_000_000;
  state.players.set("session-1", player);

  const bytes = new Encoder(state).encodeAll();
  const decoded = new PalaceRoomState();
  new Decoder(decoded).decode(bytes);
  const decodedPlayer = decoded.players.get("session-1");

  assert.equal(decoded.protocolVersion, MULTIPLAYER_PROTOCOL_VERSION);
  assert.equal(decoded.worldId, "hq");
  assert.equal(decoded.players.size, 1);
  assert.ok(decodedPlayer instanceof PlayerPresenceState);
  assert.equal(decodedPlayer.avatarAssetId, "dni");
  assert.equal(decodedPlayer.handle, player.handle);
  assert.equal(decodedPlayer.x, player.x);
  assert.equal(decodedPlayer.y, player.y);
  assert.equal(decodedPlayer.z, player.z);
  assert.equal(decodedPlayer.rotationY, player.rotationY);
  assert.equal(decodedPlayer.sequence, player.sequence);
  assert.equal(decodedPlayer.connected, false);
  assert.equal(decodedPlayer.connectedAt, player.connectedAt);
});

test("new player presence starts connected", () => {
  assert.equal(new PlayerPresenceState().connected, true);
});

test("join options accept only an exact own-field public-world shape", () => {
  assert.deepEqual(
    parsePalaceJoinOptions({ avatarAssetId: "dni", handle: "dni_21", worldId: "hq" }),
    {
      avatarAssetId: "dni",
      handle: "dni_21",
      worldId: "hq",
    },
  );
  assert.deepEqual(
    parsePalaceJoinOptions({ avatarAssetId: "placeholder", handle: "a", worldId: "hq" }),
    {
      avatarAssetId: "placeholder",
      handle: "a",
      worldId: "hq",
    },
  );
  assert.deepEqual(
    parsePalaceJoinOptions({
      avatarAssetId: "a".repeat(32),
      handle: "a".repeat(24),
      worldId: "hq",
    }),
    {
      avatarAssetId: "a".repeat(32),
      handle: "a".repeat(24),
      worldId: "hq",
    },
  );

  for (const handle of [
    "",
    " dni",
    "dni ",
    "a".repeat(25),
    "_dni",
    "-dni",
    "dni space",
    "<script>",
    "dní",
  ]) {
    assertInputError(() =>
      parsePalaceJoinOptions({ avatarAssetId: "placeholder", handle, worldId: "hq" }),
    );
  }
  for (const worldId of [undefined, null, "HQ", "home:guessable", 1]) {
    assertInputError(() =>
      parsePalaceJoinOptions({ avatarAssetId: "dni", handle: "dni", worldId }),
    );
  }
  for (const avatarAssetId of ["", "DNI", "../dni", "dni.glb", "a".repeat(33), null]) {
    assertInputError(() => parsePalaceJoinOptions({ avatarAssetId, handle: "dni", worldId: "hq" }));
  }
});

test("join options reject arrays, inherited fields, accessors, and stale shapes", () => {
  assertInputError(() => parsePalaceJoinOptions([]));
  assertInputError(() =>
    parsePalaceJoinOptions(Object.create({ avatarAssetId: "dni", handle: "dni", worldId: "hq" })),
  );
  assertInputError(() =>
    parsePalaceJoinOptions(
      Object.assign(Object.create({ polluted: true }), {
        handle: "dni",
        avatarAssetId: "dni",
        worldId: "hq",
      }),
    ),
  );
  assertInputError(() =>
    parsePalaceJoinOptions({
      get handle() {
        return "dni";
      },
      avatarAssetId: "dni",
      worldId: "hq",
    }),
  );
  assertInputError(() =>
    parsePalaceJoinOptions({ avatarAssetId: "dni", handle: "dni", worldId: "hq", role: "admin" }),
  );
  assertInputError(() => parsePalaceJoinOptions({ avatarAssetId: "dni", handle: "dni" }));
  assertInputError(() =>
    parsePalaceJoinOptions(
      JSON.parse('{"avatarAssetId":"dni","handle":"dni","worldId":"hq","__proto__":{}}'),
    ),
  );

  const safeNullPrototype = Object.assign(Object.create(null), {
    avatarAssetId: "dni",
    handle: "dni",
    worldId: "hq",
  });
  assert.deepEqual(parsePalaceJoinOptions(safeNullPrototype), {
    avatarAssetId: "dni",
    handle: "dni",
    worldId: "hq",
  });
});

test("movement accepts all inclusive palace and uint32 boundaries", () => {
  assert.deepEqual(parseMovementMessage(MOVEMENT), MOVEMENT);
  for (const movement of [
    { ...MOVEMENT, x: -320, y: -20, z: -320, rotationY: -Math.PI, sequence: 0 },
    {
      ...MOVEMENT,
      x: 320,
      y: 200,
      z: 320,
      rotationY: Math.PI,
      sequence: 0xffff_ffff,
    },
  ]) {
    assert.deepEqual(parseMovementMessage(movement), movement);
  }
});

test("movement rejects NaN, infinities, and non-uint32 sequences", () => {
  for (const [field, value] of [
    ["x", Number.NaN],
    ["y", Number.POSITIVE_INFINITY],
    ["z", Number.NEGATIVE_INFINITY],
    ["rotationY", Number.NaN],
    ["sequence", Number.POSITIVE_INFINITY],
  ]) {
    assertInputError(() => parseMovementMessage({ ...MOVEMENT, [field]: value }));
  }
  for (const sequence of [-1, -0, 0.5, 0x1_0000_0000, "7", null]) {
    assertInputError(() => parseMovementMessage({ ...MOVEMENT, sequence }));
  }
});

test("movement rejects every position and rotation just outside its bounds", () => {
  for (const movement of [
    { ...MOVEMENT, x: -320.000_001 },
    { ...MOVEMENT, x: 320.000_001 },
    { ...MOVEMENT, y: -20.000_001 },
    { ...MOVEMENT, y: 200.000_001 },
    { ...MOVEMENT, z: -320.000_001 },
    { ...MOVEMENT, z: 320.000_001 },
    { ...MOVEMENT, rotationY: -Math.PI - 1e-12 },
    { ...MOVEMENT, rotationY: Math.PI + 1e-12 },
  ]) {
    assertInputError(() => parseMovementMessage(movement));
  }
});

test("movement rejects arrays, inherited fields, accessors, and stale shapes", () => {
  assertInputError(() => parseMovementMessage([]));
  assertInputError(() => parseMovementMessage(Object.create(MOVEMENT)));
  assertInputError(() =>
    parseMovementMessage(Object.assign(Object.create({ polluted: true }), MOVEMENT)),
  );
  assertInputError(() =>
    parseMovementMessage({
      ...MOVEMENT,
      get x() {
        return 1;
      },
    }),
  );
  assertInputError(() => parseMovementMessage({ ...MOVEMENT, velocity: 1 }));
  const { z: _removed, ...missingZ } = MOVEMENT;
  assertInputError(() => parseMovementMessage(missingZ));

  const safeNullPrototype = Object.assign(Object.create(null), MOVEMENT);
  assert.deepEqual(parseMovementMessage(safeNullPrototype), MOVEMENT);
});

test("position corrections are exact, bounded authoritative poses", () => {
  const correction = { ...MOVEMENT, reason: "speed" };
  assert.deepEqual(parsePositionCorrection(correction), correction);
  for (const reason of ["teleport", "", null, undefined]) {
    assertInputError(() => parsePositionCorrection({ ...MOVEMENT, reason }));
  }
  assertInputError(() => parsePositionCorrection({ ...correction, extra: true }));
  assertInputError(() => parsePositionCorrection({ ...correction, x: 321 }));
});
