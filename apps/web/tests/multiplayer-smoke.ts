import assert from "node:assert/strict";
import {
  MULTIPLAYER_PROTOCOL_VERSION,
  POSITION_CORRECTION_MESSAGE,
  PalaceRoomState,
  PlayerPresenceState,
} from "@600b/multiplayer";
import { type Client, CloseCode, ErrorCode, MatchMakeError, type Room } from "@colyseus/sdk";
import {
  PalaceMultiplayerTransport,
  authoritativeSelfCorrection,
  authoritativeStateError,
  freshJoinDelayMs,
  horizontalYawFromQuaternion,
  jitteredRetryDelayMs,
  leaveCodeAllowsFreshJoin,
  movementSendIsBackpressured,
  reconnectDelayMs,
  reconnectFailureAllowsFreshJoin,
  resolveMultiplayerUrl,
  shouldSendMovement,
  snapshotRemotePlayers,
} from "../src/net/multiplayer";

assert.equal(resolveMultiplayerUrl(undefined, true), "http://127.0.0.1:2567");
assert.equal(
  resolveMultiplayerUrl(undefined, false, "https://palace.example"),
  "https://palace.example",
);
assert.equal(
  resolveMultiplayerUrl("https://rooms.example/match/#ignored", false),
  "https://rooms.example/match",
);
assert.throws(() => resolveMultiplayerUrl("ws://rooms.example", false), /HTTP\(S\)/);
assert.throws(() => resolveMultiplayerUrl("ftp://rooms.example", false), /HTTP\(S\)/);
assert.throws(() => resolveMultiplayerUrl("/multiplayer", false), /absolute/);
assert.throws(
  () => resolveMultiplayerUrl("https://user:secret@rooms.example", false),
  /credentials/,
);
assert.throws(
  () => resolveMultiplayerUrl("http://rooms.example", false, "https://palace.example"),
  /cannot downgrade/,
);
assert.equal(
  resolveMultiplayerUrl("https://rooms.example", false, "http://palace.example"),
  "https://rooms.example",
);

assert.deepEqual(
  [1, 2, 3, 4, 5, 6].map(reconnectDelayMs),
  [500, 1_000, 2_000, 4_000, 8_000, 8_000],
);
assert.equal(reconnectDelayMs(100), 8_000, "transient token reconnects remain slowly retryable");
assert.equal(jitteredRetryDelayMs(5_000, 0), 5_000);
assert.equal(jitteredRetryDelayMs(5_000, 0.5), 7_500);
assert.equal(jitteredRetryDelayMs(5_000, 1), 10_000);
assert.equal(shouldSendMovement(1_000, 1_099), false);
assert.equal(shouldSendMovement(1_000, 1_100), true);
assert.equal(movementSendIsBackpressured({ transport: { ws: { bufferedAmount: 0 } } }), false);
assert.equal(movementSendIsBackpressured({ transport: { ws: { bufferedAmount: 1 } } }), true);
assert.equal(movementSendIsBackpressured({}), false);
assert.ok(
  Math.abs(
    horizontalYawFromQuaternion({
      x: 0,
      y: Math.sin(Math.PI / 4),
      z: 0,
      w: Math.cos(Math.PI / 4),
    }) -
      Math.PI / 2,
  ) < 1e-12,
  "body quaternion projects to visible yaw",
);
assert.deepEqual(
  [1, 2, 3, 4, 5].map((attempt) => freshJoinDelayMs(attempt)),
  [5_000, 10_000, 20_000, 30_000, 30_000],
);
assert.equal(leaveCodeAllowsFreshJoin(CloseCode.SERVER_SHUTDOWN), true);
assert.equal(leaveCodeAllowsFreshJoin(CloseCode.CONSENTED), false);
assert.equal(reconnectFailureAllowsFreshJoin(new TypeError("fetch failed")), false);
assert.equal(
  reconnectFailureAllowsFreshJoin(
    new MatchMakeError("reconnection token invalid or expired", ErrorCode.MATCHMAKE_EXPIRED),
  ),
  true,
);
assert.equal(
  reconnectFailureAllowsFreshJoin(
    new MatchMakeError("room has been disposed", ErrorCode.MATCHMAKE_INVALID_ROOM_ID),
  ),
  true,
);
assert.equal(
  reconnectFailureAllowsFreshJoin(
    new MatchMakeError("temporary server error", ErrorCode.MATCHMAKE_UNHANDLED),
  ),
  false,
);
assert.equal(
  authoritativeStateError({ protocolVersion: MULTIPLAYER_PROTOCOL_VERSION, worldId: "hq" }),
  null,
);
assert.match(
  authoritativeStateError({
    protocolVersion: MULTIPLAYER_PROTOCOL_VERSION - 1,
    worldId: "hq",
  }) ?? "",
  /does not match/,
);
assert.match(
  authoritativeStateError({ protocolVersion: 1, worldId: "home" }) ?? "",
  /does not match/,
);

const player = (handle: string, x: number, connected = true): PlayerPresenceState =>
  Object.assign(new PlayerPresenceState(), {
    avatarAssetId: handle === "alice" ? "flx" : "placeholder",
    handle,
    x,
    y: 1,
    z: 2,
    rotationY: 0.5,
    sequence: 3,
    connected,
    connectedAt: 1,
  });

const players = new Map<string, PlayerPresenceState>([
  ["self", player("local", 0)],
  ["remote-a", player("alice", 5)],
  ["remote-b", player("bob", 5, false)],
  [
    "invalid",
    {
      connected: true,
      connectedAt: 1,
      handle: "",
      rotationY: 0.5,
      sequence: 3,
      x: Number.NaN,
      y: 1,
      z: 2,
    } as PlayerPresenceState,
  ],
]);
const snapshots = snapshotRemotePlayers(
  { players } as unknown as Pick<PalaceRoomState, "players">,
  "self",
);
assert.deepEqual(
  snapshots.map(({ sessionId, avatarAssetId, handle, connected }) => ({
    sessionId,
    avatarAssetId,
    handle,
    connected,
  })),
  [
    { sessionId: "remote-a", avatarAssetId: "flx", handle: "alice", connected: true },
    {
      sessionId: "remote-b",
      avatarAssetId: "placeholder",
      handle: "bob",
      connected: false,
    },
  ],
);
assert.equal(snapshots[0]?.x, snapshots[1]?.x, "identical remote positions remain valid");

assert.deepEqual(
  authoritativeSelfCorrection(
    { players: new Map([["self", player("local", 7)]]) } as unknown as Pick<
      PalaceRoomState,
      "players"
    >,
    "self",
  ),
  { reason: "sync", rotationY: 0.5, sequence: 3, x: 7, y: 1, z: 2 },
);

type TestSignal<Arguments extends unknown[]> = {
  (callback: (...arguments_: Arguments) => void): void;
  emit(...arguments_: Arguments): void;
  remove(callback: (...arguments_: Arguments) => void): void;
};

function createSignal<Arguments extends unknown[]>(): TestSignal<Arguments> {
  const handlers = new Set<(...arguments_: Arguments) => void>();
  const signal = ((callback: (...arguments_: Arguments) => void) => {
    handlers.add(callback);
  }) as TestSignal<Arguments>;
  signal.emit = (...arguments_: Arguments) => {
    for (const handler of handlers) handler(...arguments_);
  };
  signal.remove = (callback) => handlers.delete(callback);
  return signal;
}

function createTestRoom(isOpen = true) {
  const state = new PalaceRoomState();
  const onStateChange = createSignal<[PalaceRoomState]>();
  const onDrop = createSignal<[number, string?]>();
  const onError = createSignal<[number, string?]>();
  const onLeave = createSignal<[number, string?]>();
  const messageHandlers = new Map<string | number, (payload: unknown) => void>();
  let closeCount = 0;
  let leaveCount = 0;
  let sendCount = 0;
  const wsState = { bufferedAmount: 0 };
  const room = {
    state,
    sessionId: "self",
    reconnectionToken: "room-id:reconnect-token",
    reconnection: { enabled: true },
    connection: {
      isOpen,
      transport: { ws: wsState },
      close: () => {
        closeCount += 1;
      },
    },
    onStateChange,
    onDrop,
    onError,
    onLeave,
    onMessage: (type: string | number, callback: (payload: unknown) => void) => {
      messageHandlers.set(type, callback);
      return () => messageHandlers.delete(type);
    },
    send: () => {
      sendCount += 1;
    },
    leave: async () => {
      leaveCount += 1;
      return 4_000;
    },
  } as unknown as Room<unknown, PalaceRoomState>;
  return {
    room,
    state,
    onStateChange,
    onLeave,
    emitMessage: (type: string | number, payload: unknown) => messageHandlers.get(type)?.(payload),
    closeCount: () => closeCount,
    leaveCount: () => leaveCount,
    sendCount: () => sendCount,
    setBufferedAmount: (value: number) => {
      wsState.bufferedAmount = value;
    },
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

const authoritativeRoom = createTestRoom();
let observedJoinOptions: unknown;
const authoritativeClient = {
  joinOrCreate: async (_roomName: string, options: unknown) => {
    observedJoinOptions = options;
    return authoritativeRoom.room;
  },
  reconnect: async () => authoritativeRoom.room,
} as unknown as Client;
const authoritativeTransport = new PalaceMultiplayerTransport(
  "http://127.0.0.1:2567",
  "alice",
  authoritativeClient,
  "flx",
);
const authoritativeStates: string[] = [];
authoritativeTransport.subscribe((state) => authoritativeStates.push(state.status));
authoritativeTransport.connect();
await flushMicrotasks();
assert.deepEqual(observedJoinOptions, { avatarAssetId: "flx", handle: "alice", worldId: "hq" });
assert.equal(
  authoritativeStates.at(-1),
  "connecting",
  "the local schema defaults cannot mark a room connected before ROOM_STATE",
);
assert.equal(authoritativeTransport.consumeCorrection(), null);

authoritativeRoom.state.players.set("self", player("alice", 3));
authoritativeRoom.state.players.set("remote", player("bob", 8));
authoritativeRoom.onStateChange.emit(authoritativeRoom.state);
assert.equal(authoritativeStates.at(-1), "connected");
assert.deepEqual(authoritativeTransport.consumeCorrection(), {
  reason: "sync",
  rotationY: 0.5,
  sequence: 3,
  x: 3,
  y: 1,
  z: 2,
});
authoritativeRoom.setBufferedAmount(64);
authoritativeTransport.sendMovement({ x: 3, y: 1, z: 2, rotationY: 0 }, 1_000);
assert.equal(authoritativeRoom.sendCount(), 0, "backpressure drops an intermediate snapshot");
authoritativeRoom.setBufferedAmount(0);
authoritativeTransport.sendMovement({ x: 3, y: 1, z: 2, rotationY: 0 }, 1_000);
assert.equal(authoritativeRoom.sendCount(), 1, "the latest pose sends after the queue drains");

const authoritativeSelf = authoritativeRoom.state.players.get("self");
assert.ok(authoritativeSelf);
authoritativeSelf.x = 9;
authoritativeSelf.sequence = 4;
authoritativeRoom.onStateChange.emit(authoritativeRoom.state);
assert.equal(
  authoritativeTransport.consumeCorrection(),
  null,
  "ordinary authoritative patches update the fallback but do not snap physics",
);
authoritativeTransport.sendMovement({ x: 999, y: 1, z: 2, rotationY: 0 }, 1_100);
assert.deepEqual(authoritativeTransport.consumeCorrection(), {
  reason: "invalid",
  rotationY: 0.5,
  sequence: 4,
  x: 9,
  y: 1,
  z: 2,
});

authoritativeRoom.emitMessage(POSITION_CORRECTION_MESSAGE, {
  extra: true,
  reason: "speed",
  rotationY: 0,
  sequence: 5,
  x: 4,
  y: 1,
  z: 2,
});
assert.equal(authoritativeTransport.consumeCorrection(), null, "malformed corrections are ignored");
authoritativeRoom.emitMessage(POSITION_CORRECTION_MESSAGE, {
  reason: "speed",
  rotationY: 0,
  sequence: 5,
  x: 4,
  y: 1,
  z: 2,
});
assert.deepEqual(authoritativeTransport.consumeCorrection(), {
  reason: "speed",
  rotationY: 0,
  sequence: 5,
  x: 4,
  y: 1,
  z: 2,
});
await authoritativeTransport.leave();

const restartRoom = createTestRoom();
const restartTransport = new PalaceMultiplayerTransport("http://127.0.0.1:2567", "alice", {
  joinOrCreate: async () => restartRoom.room,
  reconnect: async () => restartRoom.room,
} as unknown as Client);
const restartStates: string[] = [];
restartTransport.subscribe((state) => restartStates.push(state.status));
restartTransport.connect();
await flushMicrotasks();
restartRoom.state.players.set("self", player("alice", 3));
restartRoom.onStateChange.emit(restartRoom.state);
restartRoom.onLeave.emit(CloseCode.SERVER_SHUTDOWN, "deploy");
assert.equal(
  restartStates.at(-1),
  "reconnecting",
  "a production server shutdown schedules a cancellable fresh join",
);
await restartTransport.leave();

const mismatchRoom = createTestRoom();
mismatchRoom.state.protocolVersion = MULTIPLAYER_PROTOCOL_VERSION - 1;
const mismatchTransport = new PalaceMultiplayerTransport("http://127.0.0.1:2567", "alice", {
  joinOrCreate: async () => mismatchRoom.room,
  reconnect: async () => mismatchRoom.room,
} as unknown as Client);
const mismatchStates: string[] = [];
mismatchTransport.subscribe((state) => mismatchStates.push(state.status));
mismatchTransport.connect();
await flushMicrotasks();
mismatchRoom.onStateChange.emit(mismatchRoom.state);
await flushMicrotasks();
assert.equal(mismatchStates.at(-1), "offline");
assert.equal(mismatchRoom.leaveCount(), 1, "a protocol mismatch leaves the joined room");

const pendingRoom = createTestRoom(false);
let pendingRoomListener: ((room: Room) => void) | null = null;
const pendingClient = {
  setRoomCreatedListener: (listener: ((room: Room) => void) | null) => {
    pendingRoomListener = listener;
  },
  joinOrCreate: () => {
    pendingRoomListener?.(pendingRoom.room);
    return new Promise<Room<unknown, PalaceRoomState>>(() => undefined);
  },
  reconnect: () => new Promise<Room<unknown, PalaceRoomState>>(() => undefined),
} as unknown as Client;
const pendingTransport = new PalaceMultiplayerTransport(
  "http://127.0.0.1:2567",
  "alice",
  pendingClient,
);
pendingTransport.connect();
await pendingTransport.leave();
assert.equal(
  pendingRoom.closeCount(),
  1,
  "cleanup closes a seat-reserved Room while JOIN_ROOM is still pending",
);

const latePendingRoom = createTestRoom(false);
let lateRoomListener: ((room: Room) => void) | null = null;
const latePendingClient = {
  setRoomCreatedListener: (listener: ((room: Room) => void) | null) => {
    lateRoomListener = listener;
  },
  joinOrCreate: () => {
    queueMicrotask(() => lateRoomListener?.(latePendingRoom.room));
    return new Promise<Room<unknown, PalaceRoomState>>(() => undefined);
  },
  reconnect: () => new Promise<Room<unknown, PalaceRoomState>>(() => undefined),
} as unknown as Client;
const latePendingTransport = new PalaceMultiplayerTransport(
  "http://127.0.0.1:2567",
  "alice",
  latePendingClient,
);
latePendingTransport.connect();
await latePendingTransport.leave();
await flushMicrotasks();
assert.equal(
  latePendingRoom.closeCount(),
  1,
  "the Room-created listener remains armed across the cleanup microtask race",
);

const originalFetch = globalThis.fetch;
let resolveFetchStarted: (() => void) | undefined;
const fetchStarted = new Promise<void>((resolve) => {
  resolveFetchStarted = resolve;
});
let requestAborted = false;
globalThis.fetch = ((_input: string | URL | Request, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    resolveFetchStarted?.();
    init?.signal?.addEventListener(
      "abort",
      () => {
        requestAborted = true;
        reject(new Error("aborted"));
      },
      { once: true },
    );
  })) as typeof fetch;
try {
  const transport = new PalaceMultiplayerTransport("http://127.0.0.1:2567", "alice");
  transport.connect();
  await fetchStarted;
  await transport.leave();
  assert.equal(requestAborted, true, "cleanup aborts an in-flight StrictMode matchmaking request");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("multiplayer smoke: ok");
