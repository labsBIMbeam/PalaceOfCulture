# Palace Core — guild-filtered activities across web, world and arcade

## Product sentence

**The Palace is a network of interest guilds that turn open media, places, making, markets and
games into things people can do together.** Web is the clear data view; the engine is the embodied
view; both operate on the same Palace Core.

The key loop is:

```text
Guild lens → Activity → Session → people gather → artifact/result → guild memory
```

Content acquisition is not the differentiator. Wavlake, Podcasting 2.0, Nostr and future arcade
projects supply open activities. Guild selection, shared presence and persistent memory are the
Palace product.

Citadel Resources supplies the first builder-oriented knowledge/blueprint catalog. Its integration,
including the Global Village Construction Set and the read-only provider boundary, is specified in
[`CITADEL-INTEGRATION.md`](CITADEL-INTEGRATION.md).

## The product grammar

### Guild

An interest community with members, roles, chat, calendar, curation and an optional world place.
Membership is many-to-many. A person can simultaneously belong to music, podcast, builder, local
and game guilds.

The current `foundersGuild` service identity is a demo/bootstrap identity, not a singleton in the
domain. Production guild ids follow `guild:<stable-slug-or-id>`. They do not require a Nostr key to
exist. A future audited binding may attach an entity npub without changing the guild id, history or
membership records.

### Keyless first

Guild profiles, memberships, curation and Sessions work against stable local ids and the SQLite
audit boundary before any Nostr identity exists. No nsec, derived demo key or relay login is needed
to build or test the product.

Later, a shared signer/security solution may append a binding such as
`guild.identity.bound(guildId, npub, proof)`. Nostr then mirrors/discovers the existing guild; it
does not become the guild's source of truth. Private keys never enter provider catalogs, browser
fixtures, URLs or audit payloads. Revoking/changing a signer updates the binding, not the durable
guild id.

### Activity

One canonical thing people may do. Initial kinds:

| Kind | Example | Web projection | World projection |
|---|---|---|---|
| Music/audio | Wavlake track, PC2 episode | player + notes | listening room/stage |
| Live/video | NIP-53 stream | event/player | public stage |
| Article | NIP-23 article | reader | library/table reading |
| Craft | workshop recipe | inventory/form | workbench/build mode |
| Listing | Nostr market offer | listing/checkout | market stall |
| Meetup | guild gathering | RSVP/calendar | room/plaza spawn |
| Game | V4V arcade title | launch/lobby | cabinet/portal/scene |

Provider metadata stays read-only. The Palace stores a stable reference, normalized display data,
source URL and entrypoints. It never rewrites the upstream feed or game manifest.

### Curation entry

A guild's signed decision to list, feature or hide an Activity. It carries curator, time and reason.
This is the quality filter.

```text
guild:electronic-music ──features──▶ activity:wavlake:track:abc
guild:vienna            ──lists────▶ activity:wavlake:track:abc
guild:podcast-club      ──features──▶ activity:pc2:episode:def
```

The Activity is stored once. Each guild supplies its own context, note and ordering.

### Lens

The explicit filter used by a person:

- **Guild:** only one selected guild's current curation.
- **Joined:** deterministic union of every joined guild.
- **Commons:** public Palace editorial surface and onboarding path.

There is no implicit global `For You` feed. Cross-guild discovery lives under `Explore guilds` and
shows why a guild might be relevant before mixing its content into anything.

### Session

The social instance of an Activity. It connects all clients and carries:

- canonical Activity id;
- optional guild and place context;
- host and lifecycle (`scheduled`, `live`, `ended`, `cancelled`);
- one chat channel;
- participants in the realtime projection;
- later: V4V split, result summary and created artifacts.

One Activity can have several Sessions: a global premiere, a private guild listening party and an
asynchronous solo playback are different contexts around the same content.

### Place

A stable spatial anchor. A guild page may point to `place:guild:electronic-music`, while an active
session may temporarily occupy `place:hq:stage-a`. Place permissions and assets are persistent;
avatar positions are not.

## Curation and ranking rules

The first projection is deliberately small and legible:

1. project the latest curation decision for each `(scope, activityId)` from SQLite;
2. remove hidden entries and unavailable Activities;
3. apply the selected guild/Joined/Commons lens;
4. show featured entries first;
5. apply the curator's explicit position;
6. break ties by curation time and stable Activity id;
7. decorate, but do not reorder, live and scheduled Sessions.

Zaps, plays, dwell time, follower count and outrage never change this order. They can be displayed as
facts where appropriate, but cannot become an engagement ranking function.

For a new user, Commons contains a small honest editorial set plus live Palace events. The user then
joins guilds by interest. A quiet lens remains visibly quiet; it may offer `Explore` but must not
fabricate members, chat or recommendations.

## State and audit streams

Every durable decision is a command against the truth tier and an append to SQLite before external
publication. Suggested streams:

| Stream | Events |
|---|---|
| `guild:<guildId>` | created, profile changed, place assigned, visibility changed |
| `membership:<guildId>:<pubkey>` | requested, joined, roles changed, left, removed |
| `curation:<scope>` | listed, featured, hidden, reordered |
| `activity:<activityId>` | registered, source refreshed, unavailable, restored |
| `session:<sessionId>` | scheduled, started, moved, ended, cancelled, result accepted |
| `arcade:<arcadeId>` | approved, manifest changed, suspended |

Each event contains `reason` and `updated_by`. Nostr publication, NIP-29 group changes and provider
refreshes are reconciliation jobs after the canonical append. Failure to publish does not roll back
truth; it produces a retryable adapter state.

Ephemeral data remains outside the audit log:

- avatar movement and rotation;
- heartbeat and reconnect lease;
- transient voice state;
- high-frequency game frames;
- UI panel arrangement and active lens preference.

Session start/end and accepted results are durable because they affect guild memory, schedules or
value distribution.

## Surface parity contract

Parity means that a durable object has the same id and action semantics everywhere.

| Capability | Web | World/engine | Arcade |
|---|---|---|---|
| Browse a guild lens | dense list/grid | rooms, boards, objects | optional lobby subset |
| Inspect Activity | detail page/player | interactable object/stage | game lobby |
| Join Session | button | enter/teleport/interact | host-approved handoff |
| Chat | persistent panel | HUD/spatial context | host overlay or scoped adapter |
| Presence | People & Now | avatars | lobby/team roster |
| Curate | steward tools | diegetic board later | never |
| Pay/boost | Palace wallet UI | Palace HUD | request host action only |
| Report result | inspect history | ceremony/scoreboard | bounded result message |

The shell keeps chat, identity, active guild and current Session alive while the renderer changes.
The engine must not be mounted as a disposable page that replaces all surrounding social state.

## Handoff rules

The canonical share target is an HTTPS Session URL, for example:

```text
/s/session:01J...?surface=web
/s/session:01J...?surface=world
```

Both routes resolve the same server Session before rendering. If the requested surface is
unavailable, the web detail remains usable and explains the missing capability.

Same-process r3f components consume the shared Session store directly. Embedded Godot or external
web games communicate through versioned messages from `packages/shared`:

```json
{
  "protocolVersion": 1,
  "type": "palace.session.enter",
  "sessionId": "session:01J...",
  "surface": "arcade"
}
```

Messages never contain wallet credentials, private keys or authoritative roles. The host derives
the actor from its authenticated connection rather than trusting an iframe-supplied pubkey.

## Arcade adapter

Arcade is an open integration point, not a privileged plugin system. A curated game provides an
immutable, hash-pinned manifest with:

- stable id and description;
- iframe URL plus exact allowed origin, or an engine scene id;
- multiplayer/player-limit capabilities;
- whether guild challenges and score reporting are supported;
- optional V4V recipients.

Security boundary:

1. the Palace fetches and validates the manifest server-side;
2. approval and manifest hash are appended to SQLite;
3. external web games run in a sandboxed iframe without same-origin access;
4. `postMessage` validates exact origin, protocol, message type and bounded payload;
5. the game reports a proposed result with a unique id;
6. the server validates session membership and replay/idempotency;
7. only then is a result appended and shown in guild history;
8. the Palace host performs any V4V transfer after explicit user policy/consent.

No game may directly award durable inventory, mutate a guild, sign Nostr events or access an NWC
connection.

## Core user flows

### Guild-filtered Culture Session

1. Alice selects the Electronic Music guild lens in the web client.
2. The lens returns a curator-featured Wavlake Activity.
3. Alice chooses `Listen together`; the server appends and starts a Session.
4. Guild chat receives a real Session invitation.
5. Bob joins on web; Clara chooses `Enter world` and appears at the linked stage.
6. All three share the Session chat and participant list.
7. When it ends, the Activity remains canonical and the Session becomes guild memory.

### Guild to arcade challenge

1. A game guild features an approved Arcade Activity.
2. A steward schedules a challenge Session for Saturday.
3. Members RSVP from web or the guild calendar.
4. At start, web members launch the sandboxed game; world members enter its cabinet/portal.
5. Results use one Session id and appear on the guild page and world scoreboard.

### Cross-guild discovery without feed pollution

1. Alice's active music lens remains purely curated by that guild.
2. `Explore guilds` shows a podcast guild because two joined people shared a public Session link.
3. Alice previews its purpose, curators, current set and schedule.
4. Only after joining does its curation enter the Joined lens.

## Interface architecture

The product-level navigation becomes:

```text
World · People · Guilds · Activities
```

Culture, Workshop, Market and Arcade are Activity families and world places rather than isolated
top-level websites.

The persistent shell owns:

- identity and wallet status;
- active lens/guild switcher;
- current Session/player;
- ChatPanel;
- People & Now;
- client handoff and reconnect state.

Web provides dense management and accessibility. World provides spatial presence and interaction.
Neither client is subordinate; both must preserve the same Session during a handoff.

## First vertical slice

Do not begin with a general guild builder or a large arcade catalog. Prove the architecture with one
real flow:

1. add Palace Core ids/contracts in `packages/shared`;
2. project two explicit demo guilds plus Commons from audited fixtures;
3. register existing curated Wavlake/Podcasting 2.0 items as canonical Activities;
4. render the same selected guild lens in web and on one in-world stage board;
5. start/join one listening Session and keep ChatPanel mounted across web↔world;
6. add one local FOSS arcade build using the same Session handoff;
7. persist session start/end and result, not participant movement;
8. only then add guild creation, NIP-29 publication and third-party arcade manifests.

### Acceptance criteria

- A person can hold at least two guild memberships and switch lenses without losing the current
  Session.
- The same Activity id appears in multiple guild lenses without duplicated provider records.
- Starting a Session on web makes it joinable at the linked engine place.
- Returning from the engine restores the same web Session, player position and chat history.
- An arcade iframe cannot access wallet/key material and cannot directly create an accepted score.
- Every membership, curation, scheduled-session and accepted-result mutation is present in SQLite
  with actor and reason before any relay publication.
- Empty states contain no fake players or synthetic social proof.

## Explicit non-goals for the first slice

- global algorithmic recommendations;
- guild tokens or custodial treasuries;
- wealth/activity leaderboards;
- arbitrary third-party iframe approval;
- mirroring high-frequency movement into SQLite or Nostr;
- forcing every Activity to have a 3D representation before its web view is useful.
