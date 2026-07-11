// @600b/shared — types shared by client and server: domain events, the asset model, state-machine
// definitions, conflict-resolution rules. Imported by apps/web AND apps/server so both speak the
// same vocabulary. No runtime logic lives here beyond pure helpers.
//
// To be filled per BUILD-BRIEF.md §3 (the three streams: art / world-map / live-state).

export const SHARED_SCHEMA_VERSION = "0.0.0";

export type { AgeRead, AvatarConfig, Character, Gender } from "./character.js";
export { DEFAULT_AVATAR } from "./character.js";
export { JsonEncodingError, canonicalizeJson } from "./json.js";
export type { JsonObject, JsonPrimitive, JsonValue } from "./json.js";
