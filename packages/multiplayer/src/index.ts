import { MapSchema, Schema, type } from "@colyseus/schema";

export const MULTIPLAYER_PROTOCOL_VERSION = 3;
export const PALACE_ROOM_NAME = "palace";
export const PALACE_WORLD_ID = "street";
export const PALACE_SPAWN = Object.freeze({ x: 0, y: 3, z: 30 });
export const MOVE_MESSAGE = "move";
export const PLACE_SHIP_MODULE_MESSAGE = "placeShipModule";
export const POSITION_CORRECTION_MESSAGE = "positionCorrection";
export const MAX_ROOM_CLIENTS = 64;
export const MAX_SHIP_MODULES = 36;
export const MAX_MOVE_MESSAGES_PER_SECOND = 20;
export const MAX_LINEAR_SPEED = 12;
export const MOVEMENT_TOLERANCE = 2;

const JOIN_OPTION_FIELDS = ["avatarAssetId", "handle", "worldId"] as const;
const MOVEMENT_FIELDS = ["rotationY", "sequence", "x", "y", "z"] as const;
const POSITION_CORRECTION_FIELDS = ["reason", "rotationY", "sequence", "x", "y", "z"] as const;
const SHIP_MODULE_FIELDS = ["label", "moduleId", "role"] as const;
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

export const SHIP_MODULE_ROLES = ["structure", "energy", "habitat", "signal"] as const;
export type ShipModuleRole = (typeof SHIP_MODULE_ROLES)[number];

export interface PlaceShipModuleMessage {
  /** Client-generated idempotency key; the room assigns the physical slot. */
  moduleId: string;
  /** Human-authored module name or purpose. */
  label: string;
  role: ShipModuleRole;
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

/** One human-confirmed module in the live MoC workshop ship. */
export class ShipModuleState extends Schema {
  @type("string")
  id = "";

  @type("uint8")
  slot = 0;

  @type("string")
  authorSessionId = "";

  @type("string")
  authorHandle = "";

  @type("string")
  label = "";

  @type("string")
  role: ShipModuleRole = "structure";

  @type("float64")
  createdAt = 0;
}

export class PalaceRoomState extends Schema {
  @type("uint16")
  protocolVersion = MULTIPLAYER_PROTOCOL_VERSION;

  @type("string")
  worldId = PALACE_WORLD_ID;

  @type({ map: PlayerPresenceState })
  players = new MapSchema<PlayerPresenceState>();

  @type({ map: ShipModuleState })
  shipModules = new MapSchema<ShipModuleState>();
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
    throw new MultiplayerInputError(
      "only the public street world is available without authentication",
    );
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

function hasUnsafeDisplayCodePoint(value: string): boolean {
  for (const character of value) {
    const point = character.codePointAt(0);
    if (point === undefined) return true;
    if (
      point <= 0x1f ||
      (point >= 0x7f && point <= 0x9f) ||
      (point >= 0x202a && point <= 0x202e) ||
      (point >= 0x2066 && point <= 0x2069)
    ) {
      return true;
    }
  }
  return false;
}

/** Validate one deliberate ship-module contribution before the room assigns authorship and slot. */
export function parsePlaceShipModuleMessage(value: unknown): PlaceShipModuleMessage {
  const input = asExactRecord(value, "ship module message", SHIP_MODULE_FIELDS);
  const moduleId = input.moduleId;
  if (typeof moduleId !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(moduleId)) {
    throw new MultiplayerInputError("moduleId must be a safe 1-64 character id");
  }
  const label = input.label;
  if (
    typeof label !== "string" ||
    label !== label.trim() ||
    label.length < 1 ||
    label.length > 64 ||
    hasUnsafeDisplayCodePoint(label)
  ) {
    throw new MultiplayerInputError("label must be 1-64 trimmed display characters");
  }
  const role = input.role;
  if (typeof role !== "string" || !SHIP_MODULE_ROLES.includes(role as ShipModuleRole)) {
    throw new MultiplayerInputError("role is not supported");
  }
  return { moduleId, label, role: role as ShipModuleRole };
}

// --- zap flash (presence-layer light, docs/design/demo-loop-and-zap-light.md) ---
// A sender reports "I zapped that player" AFTER a confirmed payment; the server rate-limits
// and re-broadcasts. This is cosmetic light only — never owned state, never money truth:
// a spoofed flash could only make the street prettier, which is why it may ride the
// presence transport without violating ADR 0009's identity boundary.

export const ZAP_FLASH_MESSAGE = "zapFlash";
/** Flashes follow real payments, not chat cadence — bursts beyond this are misbehaving. */
export const MAX_ZAP_FLASHES_PER_MINUTE = 6;

const ZAP_FLASH_FIELDS = ["targetSessionId"] as const;

export interface ZapFlashMessage {
  targetSessionId: string;
}

/** Colyseus session ids are short url-safe tokens; anything else is rejected. */
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/** Validate a sender's flash report before the room rate-limits and re-broadcasts it. */
export function parseZapFlashMessage(value: unknown): ZapFlashMessage {
  const input = asExactRecord(value, "zap flash message", ZAP_FLASH_FIELDS);
  const targetSessionId = input.targetSessionId;
  if (typeof targetSessionId !== "string" || !SESSION_ID_PATTERN.test(targetSessionId)) {
    throw new MultiplayerInputError("targetSessionId must be a session id");
  }
  return { targetSessionId };
}

/** The broadcast every client receives: who got zapped (receiver-focused, sender private). */
export interface ZapFlashBroadcast {
  sessionId: string;
}

/** Validate a room broadcast before the client lets it brighten anything. */
export function parseZapFlashBroadcast(value: unknown): ZapFlashBroadcast {
  const input = asExactRecord(value, "zap flash broadcast", ["sessionId"] as const);
  const sessionId = input.sessionId;
  if (typeof sessionId !== "string" || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new MultiplayerInputError("sessionId must be a session id");
  }
  return { sessionId };
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
