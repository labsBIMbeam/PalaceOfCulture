# Palace interface concepts — four evaluation rounds

## Objective

Design one social interface system that can render the same Palace Core in two forms:

- **web:** fast, legible, data-dense and accessible;
- **world:** spatial, visual and embodied;
- **Arcane Games:** immediate action inside the same social Session.

This is not a restyling exercise. The current screen navigation is replaced only if a new system
makes guild identity, people and action structurally harder to lose.

## What the interface must make true

1. **The guild is the filter.** A selected guild lens changes Culture, events, games, market and
   making at once.
2. **Membership is plural.** People can belong to several guilds without creating several
   identities or separate inboxes.
3. **The Session survives the renderer.** Web → world → game → web is one continuous activity,
   participant list and chat.
4. **The world is a renderer, not another database.** Every object shown spatially points to the
   same durable id as its web representation.
5. **Every content card offers a social verb.** Join, invite, schedule, curate, play together or
   visit; `Play` alone is insufficient.
6. **Quiet is honest.** Empty guilds and sessions do not receive fake people, messages or activity.
7. **External games stay untrusted.** Arcane Games cannot access keys, wallets, guild roles or
   authoritative results.
8. **Desktop remains usable at 1280 × 720.** The 3D renderer may be optional on weak hardware, but
   guild, chat and session capabilities remain available.

The useful lesson from WoW is not ornamental fantasy UI. It is persistent communication plus
low-friction conversion from `people are doing something` to `join them`. Communities add durable
chat history, voice and events; Quick Join removes the planning question; neighborhoods turn a
social group into a shared place. These are the mechanics being translated, not copied visually.

Reference patterns:

- [WoW Communities](https://news.blizzard.com/en-gb/article/21952590/battle-for-azeroth-preview-world-of-warcraft-communities)
- [WoW Quick Join](https://worldofwarcraft.blizzard.com/en-us/news/20327353/find-your-friends-faster-with-quick-join-in-patch-71-updated)
- [WoW Housing Neighborhoods](https://news.blizzard.com/en-us/article/24221516/wow-housing-its-only-neighborly)
- [WoW HUD and UI revamp](https://worldofwarcraft.blizzard.com/en-us/news/23841481/world-of-warcraft-dragonflight-hud-and-ui-revamp)
- [Discord Community Onboarding](https://discord.com/blog/community-onboarding-welcome-your-new-members)
- [FFXIV Community Finder](https://na.finalfantasyxiv.com/lodestone/community_finder/)

---

## Concept A — The Guild Lens

### Thesis

Make multi-guild context impossible to miss. The web client is a fast guild-filtered workspace with
a persistent Session dock.

```text
┌ Palace / Search / Commands ─────────────── Web ◉ World ○ ─ Profile ┐
│ G │ Guild rooms       │ Selected guild activity      │ People & Now │
│ U │ # now             │                               │ Anna · listen│
│ I │ # culture         │ Featured by this guild       │ Ben  · arcade│
│ L │ # workshop        │ Live / Next / Anytime        │ Next Bell    │
│ D │ # market          │                               │ Join →       │
│ S │ # arcade          │                               │              │
├───┴───────────────────┴───────────────────────────────┴──────────────┤
│ Session: Wavlake listening room · 3 people · Chat · Enter world    │
└─────────────────────────────────────────────────────────────────────┘
```

### Strongest qualities

- The selected guild visibly filters every activity family.
- Joined guilds behave like a deterministic combined inbox.
- Curation tools are easy to express in web form controls.
- Excellent empty state: Commons still works without pretending a guild is active.
- Maximum reuse of the current React frontend and ChatPanel.

### Primary risk

It can become Discord with a fantasy skin. The center must emphasize activities and shared places,
not an endless vertical channel list.

---

## Concept B — The Living Palace

### Thesis

The world never disappears. Web tools are context panels over a continuously rendered Palace.
Changing guild lens changes banners, doors, stages, objects and nearby activity markers.

```text
┌ Guild crest · Music Guild                  People nearby · 12:40 ┐
│                                                                   │
│                 FULL-BLEED PALACE WORLD                           │
│       stage: 3 listening       arcade: challenge ready            │
│       workshop: Ben crafting   hall: next event                   │
│                                                                   │
│ [E] Interact        [J] Guild        [P] People        [/] Command│
├ Chat: Local · Guild · Session ───────────── Player / Session ─────┤
└───────────────────────────────────────────────────────────────────┘
```

### Strongest qualities

- Clearest expression of one Palace instead of several websites.
- Web/world handoff almost disappears because the world is already present.
- Best emotional and visual impact.
- Presence feels spatial rather than statistical.

### Primary risk

An empty or slow-loading world dominates the entire product. Dense curator tasks, long articles and
market comparison are worse when forced into spatial UI.

---

## Concept C — The Bell

### Thesis

Organize the Palace around `Now`, `Next` and `Anytime`. Joining a Session transforms the interface
into a focused stage while identity, guild and chat remain mounted.

```text
┌ Electronic Music Guild ─────── Now · Next · Anytime ──────────────┐
│                                                                   │
│ NOW                    NEXT                    ANYTIME              │
│ Listening room         Moon Night             Arcane Games         │
│ 5 people · Join        Sat 20:00 · RSVP        Play with guild      │
│                                                                   │
│ Guild radio            Workshop circle        Curated albums       │
│ 2 people · Join        Tomorrow · 3 going      Start a room         │
├───────────────────────────────────────────────────────────────────┤
│ Persistent chat · current Session · voice · web/world switch      │
└───────────────────────────────────────────────────────────────────┘
```

### Strongest qualities

- Every screen answers `What can I do with somebody now?`
- Culture and games naturally share one activity model.
- Excellent live demo: little explanation is required before pressing Join.
- World and web are render choices inside the active Session.

### Primary risk

On a quiet day the `Now` column exposes low population. `Anytime` needs meaningful asynchronous or
host-on-demand activities so the Palace never depends on scheduled events alone.

---

## Concept D — The Guild Quarters

### Thesis

Each guild is a persistent neighborhood. Its hall contains the curation wall, calendar, workshop,
market stalls, monument and game portals. The web view is the floor plan/ledger of the same Quarter.

```text
┌ Your Quarters ────────────────────────────────────────────────────┐
│ [Music Hall]  [Podcast Library]  [Builders Yard]  [Vienna House] │
├───────────────────────────────────────────────────────────────────┤
│ ELECTRONIC MUSIC QUARTER                                          │
│ Hall state         Members          Culture wall       Portals    │
│ Monument 62%       3 here now       8 featured         2 games    │
│ Next gathering    Guild memory      Curators           Enter →    │
└───────────────────────────────────────────────────────────────────┘
```

### Strongest qualities

- Strongest belonging and long-term memory.
- Multi-guild membership becomes a collection of meaningful homes.
- Existing monument, building-age, calendar and witnessing systems fit naturally.
- Persistent places remain useful even when nobody is currently online.

### Primary risk

Abandoned guilds become abandoned architecture. Switching between many Quarters can also create
navigation cost unless the active Session and global chat remain independent of place.

---

## Concept E — The Command Deck

### Thesis

The Palace is navigated primarily through verbs and universal search. The visual surface stays
minimal; power users can reach any person, guild, Activity, Session or place in a few keystrokes.

```text
┌ What do you want to do? ──────────────────────────────────────────┐
│ > join music                                                      │
│   Join: Wavlake listening room · Music Guild · 5 people           │
│   Visit: Music Guild Quarter · 2 people there                     │
│   Play: Arcane challenge · Music Guild · needs 1 player           │
├───────────────────────────────────────────────────────────────────┤
│ Recent: Podcast session · Builders Yard · Market listing          │
│ / join · invite · listen · play · build · trade · visit · curate  │
└───────────────────────────────────────────────────────────────────┘
```

### Strongest qualities

- Fastest navigation across a large number of guilds and Activities.
- Same command grammar works in web and engine HUD.
- Excellent accessibility foundation when paired with semantic results.
- Avoids permanent dashboard clutter.

### Primary risk

Newcomers do not know the vocabulary. It feels like infrastructure rather than a place unless
combined with a strong visual/default surface.

---

## Concept F — The Constellation

### Thesis

Render people, guilds and live Sessions as a navigable social constellation. Proximity represents
shared memberships and active participation rather than follower counts.

```text
                    ○ Podcast Club
                   /      │
          Alice ●─● live session ─● Ben
                 /         │
        Music Guild ○     Arcade ○──● Clara
                 \         │
                   ● You ──○ Builders
```

### Strongest qualities

- Visually original and memorable.
- Makes overlapping guild membership legible.
- Good optional map for discovery and presence.

### Primary risk

It fails hardest at low population, performs poorly as a task interface and is difficult to make
accessible. It should not become the default shell.

---

## Round 1 — weighted product and architecture score

Scores are 1–5. The weighted total is out of 100.

| Criterion | Weight | A Lens | B Living | C Bell | D Quarters | E Command | F Constellation |
|---|---:|---:|---:|---:|---:|---:|---:|
| Guild filter remains obvious | 20 | 5 | 4 | 4 | 5 | 4 | 3 |
| Converts content into social action | 20 | 4 | 5 | 5 | 5 | 4 | 5 |
| Web/world parity | 15 | 4 | 5 | 5 | 4 | 5 | 4 |
| Honest cold start | 10 | 5 | 2 | 3 | 3 | 4 | 1 |
| Immediate demo impact | 15 | 3 | 5 | 5 | 5 | 3 | 5 |
| Daily clarity | 10 | 5 | 3 | 4 | 4 | 5 | 2 |
| Reuses current seams | 10 | 5 | 3 | 4 | 3 | 4 | 2 |
| **Weighted result** | **100** | **87** | **82** | **88** | **87** | **82** | **69** |

### Round 1 conclusion

The Bell narrowly wins as a demonstrable social loop. Guild Lens and Guild Quarters tie immediately
behind it for usability and belonging. No single proposal solves the full system.

---

## Round 2 — scenario walkthroughs

### Scenario 1: newcomer without a guild

Goal: find one good real Activity and meet the Palace without fabricated population.

- **Best:** Guild Lens using Commons; The Bell with a strong `Anytime` column.
- **Weak:** Living Palace and Constellation visibly advertise emptiness before value is clear.
- **Lesson:** Commons must be a first-class lens, not a temporary onboarding slideshow.

### Scenario 2: member of six guilds returns after a week

Goal: understand what matters without opening six dashboards.

- **Best:** Joined Lens plus The Bell's `Now/Next/Anytime` grouping.
- **Weak:** separate Guild Quarters require six visits.
- **Lesson:** `Joined` is an aggregated view, while curation still displays its originating guild.

### Scenario 3: curator features a Wavlake release

Goal: inspect source, write context, choose placement, optionally schedule a Session.

- **Best:** Guild Lens web tooling.
- **Weak:** Living Palace makes a simple editorial operation spatially cumbersome.
- **Lesson:** capability parity does not require spatial authoring parity. World may show the result;
  web may remain the best editor.

### Scenario 4: listener joins on web and enters the world

Goal: retain playback position, people, chat and guild context.

- **Best:** The Bell and Living Palace.
- **Failure condition:** mounting the engine as a replacement screen destroys continuity.
- **Lesson:** Session state belongs to the persistent shell; the renderer is replaceable.

### Scenario 5: three guild members want immediate action

Goal: start a V4V game without waiting for an event.

- **Best:** The Bell's `Anytime` and Command Deck's `play with …` verb.
- **Lesson:** every guild should be able to curate a small action shelf, not only media.

### Scenario 6: nobody else is online

Goal: the Palace still feels valuable and honest.

- **Best:** Guild Quarters preserve history; Guild Lens exposes curated media and work; `Anytime`
  offers solo-start activities that others can join later.
- **Worst:** Constellation.
- **Lesson:** presence is an enhancement, not the only content surface.

### Round 2 conclusion

The global shell should come from Guild Lens. The primary activity grouping should come from The
Bell. The world renderer should behave like Living Palace only after a Session or explicit `Enter
world` action.

---

## Round 3 — adversarial review

### Too many guilds

Failure: a Discord-like vertical rail becomes an unreadable badge farm.

Response:

- pin at most five guild lenses;
- place the rest behind search and intentional groups;
- one `Joined` lens aggregates without losing source labels;
- unread counts are for direct messages and invitations, never every new content item;
- active Session is independent of currently selected lens.

### Fragmented communities

Failure: every interest creates a tiny empty guild.

Response:

- previews show purpose, curators, schedule and current Activity set before joining;
- creating a guild is allowed, but a world Quarter is earned/configured after real membership;
- Commons hosts public Sessions that multiple guilds may co-sponsor;
- co-curation references the same Activity rather than cloning posts.

### Curator capture or slop

Failure: the guild filter merely replaces an algorithm with an opaque gatekeeper.

Response:

- show curator identity, curation note and timestamp;
- roles and changes are audited;
- members can inspect hidden/removal reasons where privacy permits;
- a group may fork its curation without copying provider content;
- no paid placement silently changes ordering.

### Quiet world

Failure: full-screen 3D communicates failure when only two people are present.

Response:

- default to the web projection on low activity or weak devices;
- world entry is purposeful: a Session, Quarter, person or place;
- persistent artifacts and NPC inhabitants are clearly non-human;
- no simulated player chat or false online dots.

### Weak hardware and 1280 × 720

Failure: four permanent panels repeat the current Workshop overflow.

Response:

- center is the only mandatory pane;
- guild context collapses to a 64 px crest rail;
- People & Now becomes a drawer below 1180 px;
- Session dock remains 56 px collapsed and may expand over content;
- world mode can disable post-processing or fall back to the web projection.

Suggested desktop geometry:

| Region | 1440 px | 1280 px | 1024–1179 px |
|---|---:|---:|---:|
| Guild crest rail | 64 | 64 | 56 |
| Guild context panel | 224 | 208 | collapsed |
| Center stage | flexible | flexible | flexible |
| People & Now | 272 | 248 | drawer |
| Session dock | 56/240 high | 56/220 high | 52/overlay |

### Unsafe third-party game

Failure: a vibe-coded game exfiltrates an NWC connection or fabricates a score.

Response:

- exact-origin sandbox and hash-pinned manifest;
- no wallet or signer in the iframe;
- bounded versioned messages only;
- server validates membership, result id and replay;
- Palace performs V4V transfers after user consent.

### Round 3 conclusion

Living Palace and Constellation cannot be the default. They are renderers/visualizations. The
durable shell must remain useful without 3D, population or live events.

---

## Round 4 — synthesis after the apparent answer

The first three rounds suggest combining Guild Lens + Bell. One more pass reveals that this still
describes only a dashboard. The improved answer separates the interface into four layers that can
transform independently.

## Proposal 1 — Palace Prism (recommended global shell)

`Prism` means the same Palace data refracted through different guild and renderer lenses.

```text
┌ Crest + active lens ───── Search / Command ───── Web ◉ World ○ ───┐
│ guild rail │ guild context │                                      │
│            │                │         CENTER STAGE                 │
│ Commons    │ Now            │ Web projection OR world renderer    │
│ Joined     │ Culture        │ of the same Activity/Place/Session  │
│ Music      │ Making         │                                      │
│ Builders   │ Market         │                         People & Now  │
│ Vienna     │ Arcane         │                                      │
├────────────┴────────────────┴──────────────────────────────────────┤
│ SESSION DOCK: media/game · participants · chat · voice · handoff  │
└───────────────────────────────────────────────────────────────────┘
```

Properties:

- selected guild is a global filter, not a page;
- center renderer switches without remounting Session/chat;
- Guild Context is `Now/Next/Anytime` first, activity families second;
- People & Now contains real presence and one-click Join/Invite;
- command palette exposes every action but is not required for discovery;
- current Session may belong to a different guild than the lens being browsed.

This is the recommended base because it works when the world is empty, when it is full, when 3D is
disabled and when a user belongs to many guilds.

## Proposal 2 — Guild Quarter (recommended guild depth view)

Not a competing shell. Selecting a guild's `Quarter` renders its persistent identity inside Prism:

- web: overview, curation wall, people, calendar, monument, treasury policy and portals;
- world: the corresponding hall/neighborhood with the same object ids;
- Commons: public Plaza rather than a fake guild hall;
- small/new guild: a room or charter table before receiving an elaborate Quarter.

This is where long-term belonging lives. It must not become the route required for every routine
action.

## Proposal 3 — Bell Mode (recommended Session transformation)

When a Session is joined, Prism shifts focus:

- guild rail collapses;
- center becomes player, world stage or game;
- People & Now becomes the participant roster;
- Session chat becomes the default channel;
- `Leave`, `Invite`, `Web`, `World` and `Play` stay in fixed positions;
- leaving restores the previous guild lens and scroll position.

This is the showpiece mode and the main demo loop.

## Proposal 4 — Arcane Night (recommended programmed demo/event)

A curated sequence of Sessions demonstrates the complete product without pretending constant
population:

```text
Wavlake warm-up → guild gathering → Arcane Game challenge → aftershow / results
```

Each step is a canonical Activity. The program links them; it does not merge their data. Members can
join at any step on web or world. This provides action on demand while also teaching the social
model.

## Proposal 5 — Constellation (optional discovery visualization)

Keep the visually radical graph, but place it under `Explore`. It may reveal overlapping public
guilds and live Sessions. It never replaces search, lists or the selected lens, and it displays no
private relationship edges.

---

## Round 5 — implementation stress test against the current frontend

This round starts after the conceptual recommendation appears complete. It checks whether the
proposal fits the code or merely sounds coherent on paper.

### Finding 1: renderer switching currently destroys the shell

`GameFrontend` returns `PalaceScene` early whenever `engineTarget` is set. `ScreenFrame` and the
selected web screen are therefore unmounted. This is the exact opposite of Session continuity.

Required change: onboarding/identity remain outside, then one persistent `PalaceShell` owns both
renderers. `PalaceScene` becomes the center-stage child instead of replacing the application.

```text
GameFrontend
├── Start / Intro / Character gate
└── PalaceShell                    ← never unmount during normal use
    ├── GuildLensRail
    ├── WebProjection OR PalaceScene
    ├── PeopleAndNow
    └── SessionDock + ChatPanel
```

### Finding 2: media state exists inside each MediaPlayer instance

`MediaPlayer` currently owns `nowPlaying`, playlist, play state and the `<audio>` element. Culture
and `PalaceScene` mount separate instances, so playback cannot survive a renderer switch.

Required change: one `SessionMediaController` in `PalaceShell` owns the audio element and playback
state. `MediaPlayer` becomes a visual control surface over that controller. Web, HUD and stage may
render different controls while observing one playback position.

### Finding 3: chat transport exists only where ChatPanel is mounted

`ChatPanel` creates its transport and message state internally and is currently mounted by
`PalaceScene`. It disappears in builder/decorate modes and does not exist globally across the web
screens.

Required change: lift transport, messages, active channel and unread state into one `ChatController`.
The visible panel may collapse or change layout, but the connection and message history remain.

### Finding 4: screen ids encode the old information architecture

`ScreenId = title | map | home | culture | workshop | pleb` makes content families top-level
destinations. There is no URL-level guild, Activity, Session or renderer state, so a social action
cannot be deep-linked or restored.

Required change: retain the old ids temporarily as web projection names, but introduce canonical
navigation state:

```ts
type PalaceLocation = {
  lens: GuildLens;
  projection: "now" | "culture" | "making" | "market" | "arcane" | "quarter";
  surface: "web" | "world";
  activityId?: ActivityId;
  sessionId?: SessionId;
  placeId?: PlaceId;
};
```

The URL serializes durable/shareable fields. Panel open state and scroll position remain local UI
state.

### Finding 5: multiplayer deliberately knows only public HQ

ADR 0006 and the current protocol correctly restrict unauthenticated realtime to `worldId = hq`.
Adding Session context directly to movement messages would widen the trusted input surface and mix
social state with pose replication.

Required change: authenticate/join the Palace Session first, then derive authorized room/place
admission server-side. Movement continues carrying only bounded pose data. Session ids are room
admission context, not client-authored movement fields.

### Finding 6: the local Godot build has no Palace bridge yet

The repository contains a local web export, but there is no versioned host/game message bridge.
This makes it a good first Arcane Game test because it is controlled and same-project, but it must
still use the untrusted adapter rules intended for future external games.

Required change: launch through `ArcadeManifest`, sandbox it as production code would, and implement
only three initial messages: ready, session enter and result proposal. Do not expose a generic RPC
bridge.

### Minimal migration order after code review

1. Add `PalaceShell` around the existing web and scene renderers without changing their visual
   content.
2. Lift ChatPanel transport/state into the shell; prove chat survives web↔world.
3. Lift the audio element/playback state; prove playback survives web↔world.
4. Add `PalaceLocation` plus Session URLs and restore behavior.
5. Replace the nav with Prism rails using two guild fixtures and Commons.
6. Attach the current live Wavlake/PC2 items to canonical Activity ids and guild curations.
7. Add Bell Mode transformation for one listening Session.
8. Add the controlled Godot build through the same Arcane adapter boundary used by external games.

### Round 5 conclusion

The proposed visual system is feasible, but the first implementation PR should be intentionally
unimpressive visually: preserve the existing screens while moving chat, media and Session ownership
above the renderer branch. If that state-lifetime refactor is skipped, every polished Prism mockup
will conceal the same fundamental split between website and game.

---

## Final priority

1. **Palace Prism shell** — structural prerequisite.
2. **Bell Mode with one real Wavlake listening Session** — proves continuity.
3. **Two Guild Quarters plus Commons** — proves multi-guild filtering and persistent places.
4. **One local Arcane Game adapter** — proves action on demand and result boundary.
5. **Arcane Night program** — strongest public demo.
6. **Constellation Explore view** — only after real social density exists.

## Prototype plan

### Prototype P1 — Prism without backend expansion

Use current curated Wavlake/Podcasting 2.0 data and existing ChatPanel. Create two explicit demo
guild lenses and Commons in local fixtures. Keep all demo labels honest. Goal: validate layout and
switching, not durable membership.

Test tasks:

- switch from Commons to Music without losing current playback;
- identify which guild curated an Activity;
- invite one visible person to a Session;
- open Workshop and return without losing chat;
- use the shell at 1280 × 720 without horizontal overflow.

### Prototype P2 — Web/world Session continuity

Move Session and ChatPanel ownership above `GameFrontend`'s web/engine branch. Render the same
Session id in web and `PalaceScene`. Link one Activity to one stage place.

Test tasks:

- start listening on web and enter the world;
- retain media position, participant count and chat;
- exit the world back to the prior lens and scroll position;
- reconnect after a short network interruption.

### Prototype P3 — Arcane Game

Wrap the existing local FOSS/Godot web build through the versioned Arcade manifest. Start it from a
guild Activity and keep Palace chat/session outside the sandbox.

Test tasks:

- launch from web and from an in-world portal;
- reject messages from a wrong origin or protocol version;
- reject duplicate/unbounded result proposals;
- show one accepted result in the Session history;
- confirm the game cannot access signer or wallet state.

## Decision gates

Do not proceed to a general guild creator until all are true:

- one Activity is visible through two guild lenses without duplicated provider data;
- current Session survives web↔world twice in succession;
- ChatPanel remains mounted during renderer changes;
- the shell works at 1280 × 720 and with 3D disabled;
- Commons remains useful with zero online humans;
- one Arcane Game runs without receiving Palace authority.

If any gate fails, fix the shared shell or Session boundary before adding more content, guilds or
world art.
