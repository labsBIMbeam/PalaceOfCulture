import {
  MOVE_MESSAGE,
  MULTIPLAYER_PROTOCOL_VERSION,
  PALACE_ROOM_NAME,
  PALACE_WORLD_ID,
  POSITION_CORRECTION_MESSAGE,
  PalaceRoomState,
  type PositionCorrection,
  parseMovementMessage,
  parsePalaceJoinOptions,
  parsePositionCorrection,
} from "@600b/multiplayer";
import {
  Client,
  CloseCode,
  ErrorCode,
  type FetchFn,
  MatchMakeError,
  type Room,
} from "@colyseus/sdk";
import type { SchemaConstructor } from "@colyseus/sdk/serializer/SchemaSerializer";

const DEV_MULTIPLAYER_URL = "http://127.0.0.1:2567";
const MOVEMENT_INTERVAL_MS = 100;
const MAX_JOIN_ATTEMPTS = 6;
const BASE_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 8_000;
const FRESH_JOIN_BASE_DELAY_MS = 5_000;
const FRESH_JOIN_MAX_DELAY_MS = 30_000;
const MATCHMAKING_TIMEOUT_MS = 2_500;
const JOIN_ROOM_TIMEOUT_MS = 5_000;
const AUTHORITATIVE_STATE_TIMEOUT_MS = 5_000;
const CONSENTED_LEAVE_TIMEOUT_MS = 1_000;

export type MultiplayerStatus = "connecting" | "connected" | "reconnecting" | "offline";

export type RemotePlayerSnapshot = {
  sessionId: string;
  avatarAssetId: string;
  handle: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  sequence: number;
  connected: boolean;
};

export type MultiplayerViewState = {
  status: MultiplayerStatus;
  players: RemotePlayerSnapshot[];
  detail?: string;
};

export type LocalPlayerPose = {
  x: number;
  y: number;
  z: number;
  rotationY: number;
};

type PalaceRoom = Room<unknown, PalaceRoomState>;
type StateListener = (state: MultiplayerViewState) => void;
type FastRetryMode = { kind: "join" } | { kind: "reconnect"; token: string };
type RetryMode = FastRetryMode | { kind: "fresh" };
type RoomCreatedListener = (room: Room) => void;
type RoomCreationTracker = {
  setRoomCreatedListener(listener: RoomCreatedListener | null): void;
};

type PendingJoinOperation = {
  id: number;
  generation: number;
  cancelled: Promise<never>;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout> | null;
};

export const OFFLINE_MULTIPLAYER_STATE: MultiplayerViewState = {
  status: "offline",
  players: [],
};

/** Resolve the HTTP matchmaking endpoint while rejecting non-web and credential-bearing URLs. */
export function resolveMultiplayerUrl(
  configured: unknown,
  dev: boolean,
  currentOrigin?: string,
): string {
  if (configured !== undefined && typeof configured !== "string") {
    throw new Error("VITE_MULTIPLAYER_URL must be a string");
  }

  const explicit = typeof configured === "string" ? configured.trim() : "";
  const candidate = explicit || (dev ? DEV_MULTIPLAYER_URL : currentOrigin);
  if (!candidate) throw new Error("A same-origin multiplayer URL is unavailable");

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("VITE_MULTIPLAYER_URL must be an absolute HTTP(S) URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("VITE_MULTIPLAYER_URL only supports HTTP(S)");
  }
  if (url.username || url.password) {
    throw new Error("VITE_MULTIPLAYER_URL must not contain credentials");
  }
  if (currentOrigin) {
    let pageUrl: URL;
    try {
      pageUrl = new URL(currentOrigin);
    } catch {
      throw new Error("The current page origin is invalid");
    }
    if (pageUrl.protocol === "https:" && url.protocol !== "https:") {
      throw new Error("VITE_MULTIPLAYER_URL cannot downgrade an HTTPS page to HTTP");
    }
  }

  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

/** Runtime endpoint: localhost in development, current origin behind the production reverse proxy. */
export function getMultiplayerUrl(): string {
  const env = import.meta.env;
  const origin = typeof window === "undefined" ? undefined : window.location.origin;
  return resolveMultiplayerUrl(env?.VITE_MULTIPLAYER_URL, env?.DEV === true, origin);
}

/** Deterministic capped exponential backoff, exported for transport tests. */
export function reconnectDelayMs(attempt: number): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  return Math.min(MAX_RECONNECT_DELAY_MS, BASE_RECONNECT_DELAY_MS * 2 ** (safeAttempt - 1));
}

/** Spread reconnect starts across one additional base-delay window to avoid outage/deploy herds. */
export function jitteredRetryDelayMs(baseDelay: number, randomUnit = Math.random()): number {
  const safeBase = Math.max(0, Math.floor(baseDelay));
  const safeRandom = Math.min(1, Math.max(0, randomUnit));
  return safeBase + Math.floor(safeBase * safeRandom);
}

/** 10 Hz gate used by the render loop without allocating an interval. */
export function shouldSendMovement(lastSentAt: number, now: number): boolean {
  return now - lastSentAt >= MOVEMENT_INTERVAL_MS;
}

/** Drop intermediate snapshots while the reliable WebSocket still has unsent bytes queued. */
export function movementSendIsBackpressured(connection: unknown): boolean {
  try {
    const bufferedAmount = (
      connection as { transport?: { ws?: { bufferedAmount?: unknown } } } | null
    )?.transport?.ws?.bufferedAmount;
    return (
      typeof bufferedAmount === "number" && Number.isFinite(bufferedAmount) && bufferedAmount > 0
    );
  } catch {
    return true;
  }
}

/** Project a body quaternion's local +Z axis onto the ground and return its world-space yaw. */
export function horizontalYawFromQuaternion(rotation: {
  x: number;
  y: number;
  z: number;
  w: number;
}): number {
  return Math.atan2(
    2 * (rotation.x * rotation.z + rotation.w * rotation.y),
    1 - 2 * (rotation.x * rotation.x + rotation.y * rotation.y),
  );
}

/** Slow, capped retries used only after the fast initial/reconnect cycle has been exhausted. */
export function freshJoinDelayMs(attempt: number): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  return Math.min(FRESH_JOIN_MAX_DELAY_MS, FRESH_JOIN_BASE_DELAY_MS * 2 ** (safeAttempt - 1));
}

/** A fresh join is safe only after the server definitively rejects the old room/session token. */
export function reconnectFailureAllowsFreshJoin(error: unknown): boolean {
  return (
    error instanceof MatchMakeError &&
    (error.code === ErrorCode.MATCHMAKE_INVALID_ROOM_ID ||
      error.code === ErrorCode.MATCHMAKE_EXPIRED)
  );
}

/** A server shutdown disposes the old room, so token reconnect is impossible and a fresh join is safe. */
export function leaveCodeAllowsFreshJoin(code: number): boolean {
  return code === CloseCode.SERVER_SHUTDOWN;
}

/** Validate only an observed server state; local schema constructor defaults are not authoritative. */
export function authoritativeStateError(
  state: Pick<PalaceRoomState, "protocolVersion" | "worldId">,
): string | null {
  if (state.protocolVersion !== MULTIPLAYER_PROTOCOL_VERSION || state.worldId !== PALACE_WORLD_ID) {
    return "The multiplayer protocol does not match this client";
  }
  return null;
}

/** Copy replicated presence into immutable render snapshots and omit the local Colyseus session. */
export function snapshotRemotePlayers(
  state: Pick<PalaceRoomState, "players">,
  localSessionId: string,
): RemotePlayerSnapshot[] {
  const players: RemotePlayerSnapshot[] = [];
  state.players.forEach((player, sessionId) => {
    if (sessionId === localSessionId) return;
    if (
      !/^[a-z0-9][a-z0-9-]{0,31}$/.test(player.avatarAssetId) ||
      !player.handle ||
      !Number.isFinite(player.x) ||
      !Number.isFinite(player.y) ||
      !Number.isFinite(player.z) ||
      !Number.isFinite(player.rotationY) ||
      !Number.isFinite(player.sequence) ||
      typeof player.connected !== "boolean"
    ) {
      return;
    }
    players.push({
      sessionId,
      avatarAssetId: player.avatarAssetId,
      handle: player.handle,
      x: player.x,
      y: player.y,
      z: player.z,
      rotationY: player.rotationY,
      sequence: player.sequence,
      connected: player.connected,
    });
  });
  return players.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
}

/** Parse the latest authoritative local pose without trusting mutable schema values. */
export function authoritativeSelfCorrection(
  state: Pick<PalaceRoomState, "players">,
  localSessionId: string,
  reason: PositionCorrection["reason"] = "sync",
): PositionCorrection | null {
  const player = state.players.get(localSessionId);
  if (!player) return null;
  try {
    return parsePositionCorrection({
      reason,
      rotationY: player.rotationY,
      sequence: player.sequence,
      x: player.x,
      y: player.y,
      z: player.z,
    });
  } catch {
    return null;
  }
}

/** SDK client hook exposing a Room as soon as a seat reservation creates it, before JOIN_ROOM. */
class TrackedPalaceClient extends Client implements RoomCreationTracker {
  private roomCreatedListener: RoomCreatedListener | null = null;

  setRoomCreatedListener(listener: RoomCreatedListener | null): void {
    this.roomCreatedListener = listener;
  }

  protected override createRoom<T>(
    roomName: string,
    rootSchema?: SchemaConstructor<T>,
  ): Room<unknown, T> {
    const room = super.createRoom(roomName, rootSchema) as Room<unknown, T>;
    this.roomCreatedListener?.(room);
    return room;
  }
}

function supportsRoomCreationTracking(client: Client): client is Client & RoomCreationTracker {
  return typeof (client as Partial<RoomCreationTracker>).setRoomCreatedListener === "function";
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : "Multiplayer connection failed";
}

/**
 * Ephemeral HQ presence only. No builder, ownership, inventory, identity key, or audit data crosses
 * this transport. Instances are one-shot so React StrictMode cleanup can permanently cancel them.
 */
export class PalaceMultiplayerTransport {
  private readonly client: Client;
  private readonly joinOptions: ReturnType<typeof parsePalaceJoinOptions>;
  private readonly listeners = new Set<StateListener>();
  private viewState: MultiplayerViewState = OFFLINE_MULTIPLAYER_STATE;
  private room: PalaceRoom | null = null;
  private pendingRoom: { room: PalaceRoom; operationId: number } | null = null;
  private activeJoin: PendingJoinOperation | null = null;
  private detachRoomListeners: (() => void) | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly pendingFetches = new Set<AbortController>();
  private generation = 0;
  private joinOperationId = 0;
  private attempts = 0;
  private freshJoinAttempts = 0;
  private sequence = 0;
  private lastMovementAt = Number.NEGATIVE_INFINITY;
  private latestAuthoritativeSelf: PositionCorrection | null = null;
  private pendingCorrection: PositionCorrection | null = null;
  private started = false;
  private disposed = false;

  constructor(
    endpoint: string,
    handle: string,
    clientOverride?: Client,
    avatarAssetId = "placeholder",
  ) {
    this.joinOptions = parsePalaceJoinOptions({ avatarAssetId, handle, worldId: PALACE_WORLD_ID });
    if (clientOverride) {
      this.client = clientOverride;
      if (supportsRoomCreationTracking(this.client)) {
        this.client.setRoomCreatedListener((room) => this.trackPendingRoom(room));
      }
      return;
    }

    const fetchFn: FetchFn = async (input, init) => {
      const controller = new AbortController();
      const upstreamSignal = init?.signal;
      const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
      if (upstreamSignal?.aborted) abortFromUpstream();
      else upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });
      const timeout = setTimeout(() => controller.abort(), MATCHMAKING_TIMEOUT_MS);
      this.pendingFetches.add(controller);
      try {
        return await fetch(input, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
        upstreamSignal?.removeEventListener("abort", abortFromUpstream);
        this.pendingFetches.delete(controller);
      }
    };
    const client = new TrackedPalaceClient(endpoint, { fetchFn });
    client.setRoomCreatedListener((room) => this.trackPendingRoom(room));
    this.client = client;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.viewState);
    return () => this.listeners.delete(listener);
  }

  connect(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    this.publish({ status: "connecting", players: [] });
    void this.open({ kind: "join" }, this.generation);
  }

  sendMovement(pose: LocalPlayerPose, now = performance.now()): void {
    const room = this.room;
    if (!room || this.viewState.status !== "connected") return;
    if (!shouldSendMovement(this.lastMovementAt, now)) return;
    if (movementSendIsBackpressured(room.connection)) return;

    const nextSequence = (this.sequence + 1) >>> 0;
    let movement: ReturnType<typeof parseMovementMessage>;
    try {
      movement = parseMovementMessage({ ...pose, sequence: nextSequence });
    } catch {
      if (this.latestAuthoritativeSelf) {
        this.pendingCorrection = { ...this.latestAuthoritativeSelf, reason: "invalid" };
      }
      return;
    }

    this.sequence = nextSequence;
    this.lastMovementAt = now;
    room.send(MOVE_MESSAGE, movement);
  }

  /** Consume at most one authoritative snap request; ordinary state patches never populate it. */
  consumeCorrection(): PositionCorrection | null {
    const correction = this.pendingCorrection;
    this.pendingCorrection = null;
    return correction;
  }

  async leave(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    for (const controller of this.pendingFetches) controller.abort();
    this.pendingFetches.clear();
    const activeJoin = this.activeJoin;
    if (activeJoin) this.cancelJoinOperation(activeJoin, new Error("Multiplayer join cancelled"));
    const pendingRoom = this.pendingRoom;
    this.pendingRoom = null;
    if (pendingRoom) this.closePendingRoom(pendingRoom.room);
    this.detachRoomListeners?.();
    this.detachRoomListeners = null;
    this.latestAuthoritativeSelf = null;
    this.pendingCorrection = null;

    const room = this.room;
    this.room = null;
    this.publish(OFFLINE_MULTIPLAYER_STATE);
    if (!room) return;
    await this.closeJoinedRoom(room);
  }

  private async open(mode: RetryMode, generation: number): Promise<void> {
    if (this.disposed || generation !== this.generation) return;
    const operation = this.beginJoinOperation(generation);
    try {
      const joining =
        mode.kind === "reconnect"
          ? this.client.reconnect(mode.token, PalaceRoomState)
          : this.client.joinOrCreate(PALACE_ROOM_NAME, this.joinOptions, PalaceRoomState);
      void joining.then(
        (room) => {
          if (
            this.disposed ||
            generation !== this.generation ||
            (this.activeJoin !== operation && this.room !== room)
          ) {
            void this.closeJoinedRoom(room);
          }
        },
        () => undefined,
      );
      const room = await Promise.race([joining, operation.cancelled]);
      this.finishJoinOperation(operation, room);

      if (this.disposed || generation !== this.generation) {
        await this.closeJoinedRoom(room);
        return;
      }
      this.attachRoom(room, mode);
    } catch (error) {
      this.finishJoinOperation(operation);
      if (this.disposed || generation !== this.generation) return;
      const detail = errorDetail(error);
      if (mode.kind === "fresh") {
        this.scheduleFreshJoin(detail, generation);
      } else if (mode.kind === "reconnect" && reconnectFailureAllowsFreshJoin(error)) {
        this.scheduleFreshJoin(detail, generation);
      } else {
        this.scheduleRetry(mode, detail, generation);
      }
    }
  }

  private beginJoinOperation(generation: number): PendingJoinOperation {
    let rejectOperation: (error: Error) => void = () => undefined;
    const cancelled = new Promise<never>((_resolve, reject) => {
      rejectOperation = reject;
    });
    this.joinOperationId += 1;
    const operation: PendingJoinOperation = {
      id: this.joinOperationId,
      generation,
      cancelled,
      reject: rejectOperation,
      timeout: null,
    };
    this.activeJoin = operation;
    return operation;
  }

  private trackPendingRoom(createdRoom: Room): void {
    const room = createdRoom as PalaceRoom;
    const operation = this.activeJoin;
    if (!operation || this.disposed || operation.generation !== this.generation) {
      queueMicrotask(() => this.closePendingRoom(room));
      return;
    }

    const previous = this.pendingRoom;
    if (previous && previous.operationId !== operation.id) this.closePendingRoom(previous.room);
    this.pendingRoom = { room, operationId: operation.id };
    if (operation.timeout) clearTimeout(operation.timeout);
    operation.timeout = setTimeout(() => {
      this.cancelJoinOperation(
        operation,
        new Error("The multiplayer socket did not complete JOIN_ROOM"),
      );
    }, JOIN_ROOM_TIMEOUT_MS);
  }

  private cancelJoinOperation(operation: PendingJoinOperation, error: Error): void {
    if (this.activeJoin !== operation) return;
    this.activeJoin = null;
    if (operation.timeout) clearTimeout(operation.timeout);
    operation.timeout = null;
    const pending = this.pendingRoom;
    if (pending?.operationId === operation.id) {
      this.pendingRoom = null;
      this.closePendingRoom(pending.room);
    }
    operation.reject(error);
  }

  private finishJoinOperation(operation: PendingJoinOperation, joinedRoom?: PalaceRoom): void {
    if (this.activeJoin === operation) this.activeJoin = null;
    if (operation.timeout) clearTimeout(operation.timeout);
    operation.timeout = null;
    const pending = this.pendingRoom;
    if (pending?.operationId !== operation.id) return;
    this.pendingRoom = null;
    if (pending.room !== joinedRoom) this.closePendingRoom(pending.room);
  }

  private closePendingRoom(room: PalaceRoom): void {
    room.reconnection.enabled = false;
    try {
      room.connection?.close();
    } catch {
      // Closing an already-closed or not-yet-open socket completes local cleanup.
    }
  }

  private async closeJoinedRoom(room: PalaceRoom): Promise<void> {
    room.reconnection.enabled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    try {
      if (room.connection?.isOpen) {
        await Promise.race([
          room.leave(true),
          new Promise<void>((resolve) => {
            timeout = setTimeout(resolve, CONSENTED_LEAVE_TIMEOUT_MS);
          }),
        ]);
      }
    } catch {
      // A concurrent server close is equivalent to a completed local leave.
    } finally {
      if (timeout) clearTimeout(timeout);
      try {
        room.connection?.close();
      } catch {
        // The connection is already closed.
      }
    }
  }

  private attachRoom(room: PalaceRoom, mode: RetryMode): void {
    // SDK 0.17 retry timers are internal and cannot be cancelled on React StrictMode cleanup. The
    // transport owns cancellable retries and explicitly reuses the server-issued token.
    room.reconnection.enabled = false;
    this.room = room;
    let firstStateObserved = false;
    let stateTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      stateTimeout = null;
      if (this.disposed || this.room !== room || firstStateObserved) return;
      this.room = null;
      const detach = this.detachRoomListeners;
      this.detachRoomListeners = null;
      detach?.();
      const detail = "The multiplayer room did not provide authoritative state";
      const retryGeneration = this.generation;
      void this.closeJoinedRoom(room).then(() => {
        if (this.disposed || retryGeneration !== this.generation) return;
        if (mode.kind === "fresh") this.scheduleFreshJoin(detail, retryGeneration);
        else this.scheduleRetry(mode, detail, retryGeneration);
      });
    }, AUTHORITATIVE_STATE_TIMEOUT_MS);
    const updatePlayers = (state: PalaceRoomState) => {
      if (this.disposed || this.room !== room) return;
      if (!firstStateObserved) {
        firstStateObserved = true;
        if (stateTimeout) clearTimeout(stateTimeout);
        stateTimeout = null;
        const protocolError = authoritativeStateError(state);
        if (protocolError) {
          this.room = null;
          const detach = this.detachRoomListeners;
          this.detachRoomListeners = null;
          detach?.();
          void this.closeJoinedRoom(room);
          this.latestAuthoritativeSelf = null;
          this.pendingCorrection = null;
          this.publish({ status: "offline", players: [], detail: protocolError });
          return;
        }
        this.attempts = 0;
        this.freshJoinAttempts = 0;
        const selfCorrection = authoritativeSelfCorrection(state, room.sessionId);
        if (selfCorrection) {
          this.latestAuthoritativeSelf = selfCorrection;
          this.pendingCorrection = selfCorrection;
        }
      } else {
        const selfCorrection = authoritativeSelfCorrection(state, room.sessionId);
        if (selfCorrection) this.latestAuthoritativeSelf = selfCorrection;
      }
      this.publish({
        status: "connected",
        players: snapshotRemotePlayers(state, room.sessionId),
      });
    };
    const onDrop = (_code: number, reason?: string) => {
      if (this.disposed || this.room !== room) return;
      const token = room.reconnectionToken;
      this.room = null;
      const detach = this.detachRoomListeners;
      this.detachRoomListeners = null;
      detach?.();
      this.publish({ status: "reconnecting", players: [], detail: reason });
      if (token) {
        this.scheduleRetry({ kind: "reconnect", token }, reason, this.generation);
      } else {
        this.publish({
          status: "offline",
          players: [],
          detail: reason || "The multiplayer reconnect token is unavailable",
        });
      }
    };
    const onError = (_code: number, message?: string) => {
      if (this.disposed || this.room !== room || !message) return;
      this.publish({ ...this.viewState, detail: message });
    };
    const onLeave = (code: number, reason?: string) => {
      if (this.room !== room) return;
      this.room = null;
      const detach = this.detachRoomListeners;
      this.detachRoomListeners = null;
      detach?.();
      if (this.disposed) return;
      if (leaveCodeAllowsFreshJoin(code)) {
        this.scheduleFreshJoin(reason || "The multiplayer server is restarting", this.generation);
        return;
      }
      this.publish({ status: "offline", players: [], detail: reason });
    };
    const detachCorrection = room.onMessage<unknown>(POSITION_CORRECTION_MESSAGE, (payload) => {
      if (this.disposed || this.room !== room) return;
      try {
        const correction = parsePositionCorrection(payload);
        this.latestAuthoritativeSelf = correction;
        this.pendingCorrection = correction;
      } catch {
        // Ignore malformed correction messages; only the strict shared protocol is actionable.
      }
    });

    room.onStateChange(updatePlayers);
    room.onDrop(onDrop);
    room.onError(onError);
    room.onLeave(onLeave);
    this.detachRoomListeners = () => {
      if (stateTimeout) clearTimeout(stateTimeout);
      stateTimeout = null;
      room.onStateChange.remove(updatePlayers);
      room.onDrop.remove(onDrop);
      room.onError.remove(onError);
      room.onLeave.remove(onLeave);
      detachCorrection();
    };
  }

  private scheduleRetry(mode: FastRetryMode, detail: string | undefined, generation: number): void {
    if (this.disposed || generation !== this.generation) return;
    const nextAttempt = this.attempts + 1;
    this.attempts = nextAttempt;
    if (mode.kind === "join" && nextAttempt >= MAX_JOIN_ATTEMPTS) {
      this.scheduleFreshJoin(detail, generation);
      return;
    }

    const delay = jitteredRetryDelayMs(reconnectDelayMs(nextAttempt));
    this.publish({ status: "reconnecting", players: [], detail });
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.open(mode, generation);
    }, delay);
  }

  private scheduleFreshJoin(detail: string | undefined, generation: number): void {
    if (this.disposed || generation !== this.generation) return;
    this.attempts = 0;
    const nextAttempt = this.freshJoinAttempts + 1;
    const delay = jitteredRetryDelayMs(freshJoinDelayMs(nextAttempt));
    this.freshJoinAttempts = nextAttempt;
    this.publish({ status: "reconnecting", players: [], detail });
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.open({ kind: "fresh" }, generation);
    }, delay);
  }

  private publish(state: MultiplayerViewState): void {
    this.viewState = state;
    for (const listener of this.listeners) listener(state);
  }
}
