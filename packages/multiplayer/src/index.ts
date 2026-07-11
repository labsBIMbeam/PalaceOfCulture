import { MapSchema, Schema, type } from "@colyseus/schema";

export const MULTIPLAYER_PROTOCOL_VERSION = 2;
export const PALACE_ROOM_NAME = "palace";
export const PALACE_WORLD_ID = "hq";
export const PALACE_SPAWN = Object.freeze({ x: 6, y: 4, z: 44 });
export const MOVE_MESSAGE = "move";
export const POSITION_CORRECTION_MESSAGE = "positionCorrection";
export const MAX_ROOM_CLIENTS = 64;
export const MAX_MOVE_MESSAGES_PER_SECOND = 20;
export const MAX_LINEAR_SPEED = 12;
export const MOVEMENT_TOLERANCE = 2;

const JOIN_OPTION_FIELDS = ["avatarAssetId", "handle", "worldId"] as const;
const MOVEMENT_FIELDS = ["rotationY", "sequence", "x", "y", "z"] as const;
const POSITION_CORRECTION_FIELDS = ["reason", "rotationY", "sequence", "x", "y", "z"] as const;
const UINT32_MAX = 0xffff_ffff;
const MAX_HORIZONTAL_POSITION = 320;
const MIN_VERTICAL_POSITION = -20;
const MAX_VERTICAL_POSITION = 200;

export interface PalaceJoinOptions {
  avatarAssetId: string;
  handle: string;
  worldId: typeof PALACE_WORLD_ID;
}

export interface MovementMessage {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  sequence: number;
}

export type PositionCorrectionReason = "invalid" | "speed" | "sync";

export interface PositionCorrection extends MovementMessage {
  reason: PositionCorrectionReason;
}

export class MultiplayerInputError extends Error {
  override readonly name = "MultiplayerInputError";
}

/** Replicated public presence only; persistent ownership and building state never enter this room. */
export class PlayerPresenceState extends Schema {
  @type("string")
  avatarAssetId = "placeholder";

  @type("string")
  handle = "";

  @type("float32")
  x = 0;

  @type("float32")
  y = 1;

  @type("float32")
  z = 0;

  @type("float32")
  rotationY = 0;

  @type("uint32")
  sequence = 0;

  @type("boolean")
  connected = true;

  @type("float64")
  connectedAt = 0;
}

export class PalaceRoomState extends Schema {
  @type("uint16")
  protocolVersion = MULTIPLAYER_PROTOCOL_VERSION;

  @type("string")
  worldId = PALACE_WORLD_ID;

  @type({ map: PlayerPresenceState })
  players = new MapSchema<PlayerPresenceState>();
}

function asExactRecord(
  value: unknown,
  label: string,
  expectedFields: readonly string[],
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new MultiplayerInputError(`${label} must be an object`);
  }

  let prototype: object | null;
  try {
    prototype = Object.getPrototypeOf(value);
  } catch {
    throw new MultiplayerInputError(`${label} must be a plain object`);
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new MultiplayerInputError(`${label} must be a plain object`);
  }

  const input = value as Record<string, unknown>;
  const keys = Object.getOwnPropertyNames(input).sort();
  if (
    keys.length !== expectedFields.length ||
    expectedFields.some((field, index) => keys[index] !== field) ||
    Object.getOwnPropertySymbols(input).length > 0
  ) {
    throw new MultiplayerInputError(`${label} contains missing or unknown fields`);
  }

  for (const field of expectedFields) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!descriptor || !("value" in descriptor)) {
      throw new MultiplayerInputError(`${label} fields must be plain values`);
    }
  }
  return input;
}

function finiteNumber(input: Record<string, unknown>, field: string): number {
  const value = input[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MultiplayerInputError(`${field} must be a finite number`);
  }
  return value;
}

/** Validate the deliberately small unauthenticated public-room join surface. */
export function parsePalaceJoinOptions(value: unknown): PalaceJoinOptions {
  const input = asExactRecord(value, "join options", JOIN_OPTION_FIELDS);
  const avatarAssetId = input.avatarAssetId;
  if (typeof avatarAssetId !== "string" || !/^[a-z0-9][a-z0-9-]{0,31}$/.test(avatarAssetId)) {
    throw new MultiplayerInputError("avatarAssetId must be a safe 1-32 character asset id");
  }
  const handle = input.handle;
  if (
    typeof handle !== "string" ||
    handle !== handle.trim() ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/.test(handle)
  ) {
    throw new MultiplayerInputError("handle must be 1-24 safe display characters");
  }
  if (input.worldId !== PALACE_WORLD_ID) {
    throw new MultiplayerInputError("only the public hq world is available without authentication");
  }
  return { avatarAssetId, handle, worldId: PALACE_WORLD_ID };
}

/** Validate one client movement request before the authoritative room applies rate/speed rules. */
export function parseMovementMessage(value: unknown): MovementMessage {
  const input = asExactRecord(value, "movement message", MOVEMENT_FIELDS);
  const x = finiteNumber(input, "x");
  const y = finiteNumber(input, "y");
  const z = finiteNumber(input, "z");
  const rotationY = finiteNumber(input, "rotationY");
  const sequence = finiteNumber(input, "sequence");

  if (
    !Number.isInteger(sequence) ||
    Object.is(sequence, -0) ||
    sequence < 0 ||
    sequence > UINT32_MAX
  ) {
    throw new MultiplayerInputError("sequence must be an unsigned 32-bit integer");
  }
  if (
    Math.abs(x) > MAX_HORIZONTAL_POSITION ||
    y < MIN_VERTICAL_POSITION ||
    y > MAX_VERTICAL_POSITION ||
    Math.abs(z) > MAX_HORIZONTAL_POSITION
  ) {
    throw new MultiplayerInputError("position is outside the public palace bounds");
  }
  if (rotationY < -Math.PI || rotationY > Math.PI) {
    throw new MultiplayerInputError("rotationY must be between -PI and PI");
  }
  return { x, y, z, rotationY, sequence };
}

/** Validate a server-authoritative pose correction before the client applies it to local physics. */
export function parsePositionCorrection(value: unknown): PositionCorrection {
  const input = asExactRecord(value, "position correction", POSITION_CORRECTION_FIELDS);
  const movement = parseMovementMessage({
    rotationY: input.rotationY,
    sequence: input.sequence,
    x: input.x,
    y: input.y,
    z: input.z,
  });
  const reason = input.reason;
  if (reason !== "invalid" && reason !== "speed" && reason !== "sync") {
    throw new MultiplayerInputError("position correction reason is invalid");
  }
  return { ...movement, reason };
}
