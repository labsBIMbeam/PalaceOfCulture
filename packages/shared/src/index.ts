// @600b/shared — types shared by client and server: domain events, the asset model, state-machine
// definitions, conflict-resolution rules. Imported by apps/web AND apps/server so both speak the
// same vocabulary. No runtime logic lives here beyond pure helpers.
//
// To be filled per BUILD-BRIEF.md §3 (the three streams: art / world-map / live-state).

export const SHARED_SCHEMA_VERSION = "0.2.0";

export type { AgeRead, AvatarConfig, Character, Gender } from "./character.js";
export { DEFAULT_AVATAR } from "./character.js";
export { JsonEncodingError, canonicalizeJson } from "./json.js";
export type { JsonObject, JsonPrimitive, JsonValue } from "./json.js";
export {
  ARCADE_MANIFEST_VERSION,
  PALACE_CORE_PROTOCOL_VERSION,
  selectActivityIdsForLens,
} from "./palace.js";
export type {
  ActivityEntrypoints,
  ActivityId,
  ActivityKind,
  ActivityLicense,
  ActivityMaturity,
  ActivitySource,
  ArcadeEntrypoint,
  ArcadeId,
  ArcadeManifest,
  ArcadeValueRecipient,
  CurationEntry,
  CurationScope,
  CurationState,
  GuildId,
  GuildLens,
  GuildMembership,
  GuildProfile,
  GuildRole,
  GuildVisibility,
  PalaceActivity,
  PalaceHandoff,
  PalaceSession,
  PalaceSurface,
  PlaceId,
  ProviderId,
  SessionId,
  SessionState,
  WebEntrypoint,
  WorldEntrypoint,
} from "./palace.js";
