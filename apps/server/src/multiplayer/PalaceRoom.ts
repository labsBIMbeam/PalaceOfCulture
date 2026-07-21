import { type AuthContext, type Client, ErrorCode, Room, ServerError } from "@colyseus/core";

import {
  MAX_LINEAR_SPEED,
  MAX_MOVE_MESSAGES_PER_SECOND,
  MAX_ROOM_CLIENTS,
  MAX_SHIP_MODULES,
  MOVEMENT_TOLERANCE,
  MOVE_MESSAGE,
  type MovementMessage,
  PALACE_SPAWN,
  PALACE_WORLD_ID,
  PLACE_SHIP_MODULE_MESSAGE,
  POSITION_CORRECTION_MESSAGE,
  type PalaceJoinOptions,
  PalaceRoomState,
  type PlaceShipModuleMessage,
  PlayerPresenceState,
  type PositionCorrection,
  ShipModuleState,
  parseMovementMessage,
  parsePalaceJoinOptions,
  parsePlaceShipModuleMessage,
} from "@600b/multiplayer";

const RECONNECT_WINDOW_SECONDS = 10;
const ABSOLUTE_MESSAGES_PER_SECOND = 40;
const INVALID_MOVEMENT_LIMIT = 5;
const INVALID_MOVEMENT_WINDOW_MS = 10_000;
const POLICY_CLOSE_CODE = 4008;
const MOVEMENT_JITTER_ALLOWANCE_SECONDS = 0.5;
export const MAX_HORIZONTAL_DISTANCE_BUDGET_METERS =
  MOVEMENT_TOLERANCE + MAX_LINEAR_SPEED * MOVEMENT_JITTER_ALLOWANCE_SECONDS;
export const MAX_VERTICAL_SPEED = 24;
export const MAX_VERTICAL_DISTANCE_BUDGET_METERS =
  MOVEMENT_TOLERANCE + MAX_VERTICAL_SPEED * MOVEMENT_JITTER_ALLOWANCE_SECONDS;

interface MovementGuard {
  allowReconnect: boolean;
  closing: boolean;
  horizontalDistanceBudget: DistanceBudget;
  invalidCount: number;
  invalidWindowStartedAt: number;
  lastSequence: number;
  movementTimestamps: number[];
  shipModuleId?: string;
  verticalDistanceBudget: DistanceBudget;
}

export interface DistanceBudget {
  distanceRefillAt: number;
  distanceTokens: number;
}

interface PalaceClientContext {
  auth: PalaceJoinOptions;
  messages: { [POSITION_CORRECTION_MESSAGE]: PositionCorrection };
  userData: MovementGuard;
}

type PalaceClient = Client<PalaceClientContext>;

/** Volatile Street presence plus workshop ship assembly. Durable ownership never enters this room. */
export class PalaceRoom extends Room<{
  state: PalaceRoomState;
  metadata: { worldId: typeof PALACE_WORLD_ID };
  client: PalaceClient;
}> {
  static #activeRoomId: string | undefined;
  static #allowedOrigins: ReadonlySet<string> = new Set();

  /** Configure the exact browser-origin allowlist before registering this room. */
  static configureAllowedOrigins(origins: ReadonlySet<string>): void {
    PalaceRoom.#allowedOrigins = new Set(origins);
  }

  /** Validate public join options and browser origin before a room can be created or reserved. */
  static override async onAuth(
    _token: string,
    options: unknown,
    context: AuthContext,
  ): Promise<PalaceJoinOptions> {
    const origin = context?.headers?.get("origin");
    if (origin && !PalaceRoom.#allowedOrigins.has(origin)) {
      throw new ServerError(ErrorCode.AUTH_FAILED, "origin is not allowed");
    }
    try {
      return parsePalaceJoinOptions(options);
    } catch {
      throw new ServerError(ErrorCode.AUTH_FAILED, "invalid public palace join options");
    }
  }

  override onCreate(options: unknown): void {
    parsePalaceJoinOptions(options);
    if (PalaceRoom.#activeRoomId) {
      throw new ServerError(ErrorCode.MATCHMAKE_UNHANDLED, "the public palace room is unavailable");
    }

    this.maxClients = MAX_ROOM_CLIENTS;
    // Movement has its own rolling 20/s window. This is a second hard cap for all message types.
    this.maxMessagesPerSecond = ABSOLUTE_MESSAGES_PER_SECOND;
    this.seatReservationTimeout = 5;
    this.autoDispose = true;
    this.setPatchRate(100);
    this.state = new PalaceRoomState();
    this.metadata = { worldId: PALACE_WORLD_ID };
    this.onMessage<unknown>(MOVE_MESSAGE, (client, payload) => {
      this.#handleMovement(client, payload);
    });
    this.onMessage<unknown>(PLACE_SHIP_MODULE_MESSAGE, (client, payload) => {
      this.#handleShipModule(client, payload);
    });
    PalaceRoom.#activeRoomId = this.roomId;
  }

  override onJoin(client: PalaceClient, options: unknown): void {
    const join = parsePalaceJoinOptions(options);
    const now = performance.now();
    const player = new PlayerPresenceState();
    player.avatarAssetId = join.avatarAssetId;
    player.handle = join.handle;
    player.x = PALACE_SPAWN.x;
    player.y = PALACE_SPAWN.y;
    player.z = PALACE_SPAWN.z;
    player.rotationY = 0;
    player.sequence = 0;
    player.connected = true;
    player.connectedAt = Date.now();
    this.state.players.set(client.sessionId, player);
    client.userData = {
      allowReconnect: true,
      closing: false,
      horizontalDistanceBudget: {
        distanceRefillAt: now,
        distanceTokens: MOVEMENT_TOLERANCE,
      },
      invalidCount: 0,
      invalidWindowStartedAt: now,
      lastSequence: player.sequence,
      movementTimestamps: [],
      verticalDistanceBudget: {
        distanceRefillAt: now,
        distanceTokens: MOVEMENT_TOLERANCE,
      },
    };
  }

  override onDrop(client: PalaceClient): void {
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = false;
    if (client.userData?.allowReconnect === false) return;
    void this.allowReconnection(client, RECONNECT_WINDOW_SECONDS).catch(() => {});
  }

  override onReconnect(client: PalaceClient): void {
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = true;
  }

  override onLeave(client: PalaceClient): void {
    this.state.players.delete(client.sessionId);
  }

  override onDispose(): void {
    if (PalaceRoom.#activeRoomId === this.roomId) PalaceRoom.#activeRoomId = undefined;
  }

  #handleMovement(client: PalaceClient, payload: unknown): void {
    const guard = client.userData;
    const player = this.state.players.get(client.sessionId);
    if (!guard || !player || guard.closing) return;

    const now = performance.now();
    if (!consumeMoveToken(guard, now)) {
      this.#closeForPolicy(client, "movement rate exceeded");
      return;
    }

    let movement: MovementMessage;
    try {
      movement = parseMovementMessage(payload);
    } catch {
      this.#recordInvalidMessage(client, guard, now);
      return;
    }

    if (movement.sequence <= guard.lastSequence) return;

    const deltaX = movement.x - player.x;
    const deltaZ = movement.z - player.z;
    const horizontalDistance = Math.hypot(deltaX, deltaZ);
    const verticalDistance = Math.abs(movement.y - player.y);
    const isRespawn = isExactSpawn(movement) && !isExactSpawn(player);
    if (!isRespawn && !consumeMovementBudget(guard, horizontalDistance, verticalDistance, now)) {
      this.#sendPositionCorrection(client, player);
      this.#recordInvalidMessage(client, guard, now);
      return;
    }
    if (isRespawn) resetDistanceBudget(guard, now);

    player.x = movement.x;
    player.y = movement.y;
    player.z = movement.z;
    player.rotationY = movement.rotationY;
    player.sequence = movement.sequence;
    guard.lastSequence = movement.sequence;
  }

  #handleShipModule(client: PalaceClient, payload: unknown): void {
    const guard = client.userData;
    const player = this.state.players.get(client.sessionId);
    if (!guard || !player || guard.closing) return;

    let input: PlaceShipModuleMessage;
    try {
      input = parsePlaceShipModuleMessage(payload);
    } catch {
      this.#recordInvalidMessage(client, guard, performance.now());
      return;
    }

    if (guard.shipModuleId || this.state.shipModules.size >= MAX_SHIP_MODULES) return;
    const stateId = `${client.sessionId}:${input.moduleId}`;
    if (this.state.shipModules.has(stateId)) return;

    const module = new ShipModuleState();
    module.id = stateId;
    module.slot = this.state.shipModules.size + 1;
    module.authorSessionId = client.sessionId;
    module.authorHandle = player.handle;
    module.label = input.label;
    module.role = input.role;
    module.createdAt = Date.now();
    this.state.shipModules.set(stateId, module);
    guard.shipModuleId = stateId;
  }

  #recordInvalidMessage(client: PalaceClient, guard: MovementGuard, now: number): void {
    if (now - guard.invalidWindowStartedAt >= INVALID_MOVEMENT_WINDOW_MS) {
      guard.invalidCount = 0;
      guard.invalidWindowStartedAt = now;
    }
    guard.invalidCount += 1;
    if (guard.invalidCount >= INVALID_MOVEMENT_LIMIT) {
      this.#closeForPolicy(client, "invalid public message");
    }
  }

  #sendPositionCorrection(client: PalaceClient, player: PlayerPresenceState): void {
    client.send(POSITION_CORRECTION_MESSAGE, {
      reason: "speed",
      rotationY: player.rotationY,
      sequence: player.sequence,
      x: player.x,
      y: player.y,
      z: player.z,
    });
  }

  #closeForPolicy(client: PalaceClient, reason: string): void {
    const guard = client.userData;
    if (!guard || guard.closing) return;
    guard.closing = true;
    guard.allowReconnect = false;
    client.leave(POLICY_CLOSE_CODE, reason);
  }
}

function consumeMoveToken(guard: MovementGuard, now: number): boolean {
  const oldestAllowed = now - 1_000;
  while (
    guard.movementTimestamps[0] !== undefined &&
    guard.movementTimestamps[0] <= oldestAllowed
  ) {
    guard.movementTimestamps.shift();
  }
  if (guard.movementTimestamps.length >= MAX_MOVE_MESSAGES_PER_SECOND) return false;
  guard.movementTimestamps.push(now);
  return true;
}

/** Consume bounded movement distance without banking more than the one-time tolerance burst. */
export function consumeDistanceBudget(
  budget: DistanceBudget,
  distance: number,
  now: number,
  refillPerSecond = MAX_LINEAR_SPEED,
  maximumTokens = MAX_HORIZONTAL_DISTANCE_BUDGET_METERS,
): boolean {
  if (!Number.isFinite(distance) || distance < 0) return false;
  const timestamp = Number.isFinite(now) ? now : budget.distanceRefillAt;
  refillDistanceBudget(budget, timestamp, refillPerSecond, maximumTokens);

  if (!hasDistanceBudget(budget, distance)) return false;
  budget.distanceTokens = Math.max(0, budget.distanceTokens - distance);
  return true;
}

function consumeMovementBudget(
  guard: MovementGuard,
  horizontalDistance: number,
  verticalDistance: number,
  now: number,
): boolean {
  refillDistanceBudget(
    guard.horizontalDistanceBudget,
    now,
    MAX_LINEAR_SPEED,
    MAX_HORIZONTAL_DISTANCE_BUDGET_METERS,
  );
  refillDistanceBudget(
    guard.verticalDistanceBudget,
    now,
    MAX_VERTICAL_SPEED,
    MAX_VERTICAL_DISTANCE_BUDGET_METERS,
  );
  if (
    !hasDistanceBudget(guard.horizontalDistanceBudget, horizontalDistance) ||
    !hasDistanceBudget(guard.verticalDistanceBudget, verticalDistance)
  ) {
    return false;
  }
  guard.horizontalDistanceBudget.distanceTokens = Math.max(
    0,
    guard.horizontalDistanceBudget.distanceTokens - horizontalDistance,
  );
  guard.verticalDistanceBudget.distanceTokens = Math.max(
    0,
    guard.verticalDistanceBudget.distanceTokens - verticalDistance,
  );
  return true;
}

function refillDistanceBudget(
  budget: DistanceBudget,
  now: number,
  refillPerSecond: number,
  maximumTokens: number,
): void {
  const effectiveNow = Math.max(budget.distanceRefillAt, now);
  const elapsed = effectiveNow - budget.distanceRefillAt;
  budget.distanceTokens = Math.min(
    maximumTokens,
    budget.distanceTokens + (elapsed * refillPerSecond) / 1_000,
  );
  budget.distanceRefillAt = effectiveNow;
}

function hasDistanceBudget(budget: DistanceBudget, distance: number): boolean {
  const epsilon = Number.EPSILON * Math.max(1, distance, budget.distanceTokens) * 8;
  return distance <= budget.distanceTokens + epsilon;
}

function resetDistanceBudget(guard: MovementGuard, now: number): void {
  for (const budget of [guard.horizontalDistanceBudget, guard.verticalDistanceBudget]) {
    budget.distanceRefillAt = Math.max(budget.distanceRefillAt, now);
    budget.distanceTokens = 0;
  }
}

function isExactSpawn(position: { x: number; y: number; z: number }): boolean {
  return (
    position.x === PALACE_SPAWN.x && position.y === PALACE_SPAWN.y && position.z === PALACE_SPAWN.z
  );
}
