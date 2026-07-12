/** Shared Palace vocabulary. Web, world and arcade clients project the same durable ids. */

export const PALACE_CORE_PROTOCOL_VERSION = 1 as const;
export const ARCADE_MANIFEST_VERSION = 1 as const;

export type GuildId = `guild:${string}`;
export type ActivityId = `activity:${string}`;
export type SessionId = `session:${string}`;
export type PlaceId = `place:${string}`;
export type ArcadeId = `arcade:${string}`;
export type ProviderId = `provider:${string}`;

export type PalaceSurface = "web" | "world" | "arcade";
export type ActivityKind =
  | "article"
  | "audio"
  | "craft"
  | "game"
  | "listing"
  | "live"
  | "meetup"
  | "music"
  | "video";

export type GuildVisibility = "public" | "request" | "private";
export type GuildRole = "owner" | "steward" | "curator" | "member";

/** A player may hold memberships in many interest-based guilds at once. */
export interface GuildMembership {
  readonly guildId: GuildId;
  readonly memberPubkey: string;
  readonly roles: readonly GuildRole[];
  readonly joinedAt: string;
}

/** Durable guild record and world anchor; Nostr bindings are optional adapters. */
export interface GuildProfile {
  readonly id: GuildId;
  readonly slug: string;
  readonly name: string;
  readonly purpose: string;
  readonly visibility: GuildVisibility;
  readonly homePlaceId?: PlaceId;
  readonly nostrGroupId?: string;
  readonly entityNpub?: string;
}

export type CurationScope =
  | { readonly kind: "commons" }
  | { readonly kind: "guild"; readonly guildId: GuildId };

export type GuildLens =
  | { readonly kind: "commons" }
  | { readonly kind: "guild"; readonly guildId: GuildId }
  | { readonly kind: "joined" };

export type CurationState = "featured" | "listed" | "hidden";

/**
 * A guild references canonical content instead of copying it. Projections keep the latest entry
 * for each (scope, activityId); the append-only audit stream retains the complete history.
 */
export interface CurationEntry {
  readonly scope: CurationScope;
  readonly activityId: ActivityId;
  readonly state: CurationState;
  readonly position?: number;
  readonly note?: string;
  readonly curatedAt: string;
  readonly curatedBy: string;
}

export interface WebEntrypoint {
  readonly path: string;
}

export interface WorldEntrypoint {
  readonly worldId: string;
  readonly placeId: PlaceId;
  readonly spawnId?: string;
}

export interface ArcadeEntrypoint {
  readonly arcadeId: ArcadeId;
  readonly manifestUrl: string;
  readonly manifestSha256: string;
}

export interface ActivityEntrypoints {
  readonly web: WebEntrypoint;
  readonly world?: WorldEntrypoint;
  readonly arcade?: ArcadeEntrypoint;
}

/** One canonical thing people can do together, independent of the surface rendering it. */
export interface PalaceActivity {
  readonly id: ActivityId;
  readonly kind: ActivityKind;
  readonly title: string;
  readonly summary: string;
  readonly source: ActivitySource;
  readonly artworkUrl?: string;
  readonly entrypoints: ActivityEntrypoints;
  readonly createdAt: string;
}

export type SessionState = "scheduled" | "live" | "ended" | "cancelled";

export type ActivityMaturity = "reference" | "planning" | "prototype" | "documented" | "built";

export interface ActivityLicense {
  readonly label: string;
  readonly spdxId?: string;
  readonly url?: string;
  readonly attribution?: string;
}

/** Read-only upstream provenance. The Palace references and hashes sources; it never edits them. */
export interface ActivitySource {
  readonly providerId: ProviderId;
  readonly externalId: string;
  readonly url: string;
  readonly retrievedAt: string;
  readonly contentHash?: string;
  /** Normalized provider claim, not a Palace safety or professional certification. */
  readonly maturity: ActivityMaturity;
  readonly stageLabel?: string;
  readonly license?: ActivityLicense;
}

/** One social instance shared by web, world and an optional arcade runtime. */
export interface PalaceSession {
  readonly id: SessionId;
  readonly activityId: ActivityId;
  readonly guildId?: GuildId;
  readonly placeId?: PlaceId;
  readonly chatChannelId: string;
  readonly state: SessionState;
  readonly hostPubkey: string;
  readonly startsAt: string;
  readonly endsAt?: string;
}

export interface ArcadeValueRecipient {
  readonly address: string;
  readonly share: number;
}

export interface ArcadeManifest {
  readonly protocolVersion: typeof ARCADE_MANIFEST_VERSION;
  readonly id: ArcadeId;
  readonly name: string;
  readonly description: string;
  readonly launch:
    | {
        readonly kind: "iframe";
        readonly url: string;
        readonly allowedOrigin: string;
      }
    | {
        readonly kind: "world";
        readonly sceneId: string;
      };
  readonly capabilities: {
    readonly multiplayer: boolean;
    readonly maxPlayers: number;
    readonly guildChallenges: boolean;
    readonly scoreReporting: boolean;
  };
  /** The Palace host performs payments; an embedded game never receives wallet credentials. */
  readonly valueRecipients?: readonly ArcadeValueRecipient[];
}

export type PalaceHandoff =
  | {
      readonly protocolVersion: typeof PALACE_CORE_PROTOCOL_VERSION;
      readonly type: "palace.session.enter";
      readonly sessionId: SessionId;
      readonly surface: PalaceSurface;
    }
  | {
      readonly protocolVersion: typeof PALACE_CORE_PROTOCOL_VERSION;
      readonly type: "palace.session.leave";
      readonly sessionId: SessionId;
    }
  | {
      readonly protocolVersion: typeof PALACE_CORE_PROTOCOL_VERSION;
      readonly type: "palace.arcade.result";
      readonly sessionId: SessionId;
      readonly score: number;
      readonly resultId: string;
    };

function scopeMatchesLens(
  scope: CurationScope,
  lens: GuildLens,
  joinedGuildIds: ReadonlySet<GuildId>,
): boolean {
  if (lens.kind === "commons") return scope.kind === "commons";
  if (scope.kind !== "guild") return false;
  if (lens.kind === "guild") return scope.guildId === lens.guildId;
  return joinedGuildIds.has(scope.guildId);
}

function curationWeight(entry: CurationEntry): number {
  return entry.state === "featured" ? 0 : 1;
}

/**
 * Resolve a deterministic, editorial activity list for one lens. Engagement metrics never affect
 * this order: featured first, then explicit position, recency and stable activity id.
 */
export function selectActivityIdsForLens(
  lens: GuildLens,
  joinedGuildIds: readonly GuildId[],
  curations: readonly CurationEntry[],
): ActivityId[] {
  const joined = new Set(joinedGuildIds);
  const selected = curations
    .filter((entry) => entry.state !== "hidden" && scopeMatchesLens(entry.scope, lens, joined))
    .sort((left, right) => {
      const byState = curationWeight(left) - curationWeight(right);
      if (byState !== 0) return byState;
      const byPosition =
        (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER);
      if (byPosition !== 0) return byPosition;
      const byRecency = right.curatedAt.localeCompare(left.curatedAt);
      if (byRecency !== 0) return byRecency;
      return left.activityId.localeCompare(right.activityId);
    });

  const seen = new Set<ActivityId>();
  const activityIds: ActivityId[] = [];
  for (const entry of selected) {
    if (seen.has(entry.activityId)) continue;
    seen.add(entry.activityId);
    activityIds.push(entry.activityId);
  }
  return activityIds;
}
