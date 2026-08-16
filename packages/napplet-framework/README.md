# @600b/napplet-framework

The Palace shell as a NIP-5D runtime: **every UI panel is a sandboxed napplet,
and the shell owns the state.**

This is the framework only. It runs on fixtures and is deliberately not wired
into `apps/web` or the Godot build — swapping fixtures for real transports is the
integration step, and it touches no napplet.

## Why

`docs/PALACE-INTERFACE-CONCEPTS.md` Round 5 found three things about the current
frontend: renderer switching destroys the shell, media state lives inside each
`MediaPlayer` instance, and chat transport exists only where `ChatPanel` is
mounted. So playback and chat die whenever the user crosses web↔world.

Sandboxing every panel would normally make that worse — an iframe per panel is
isolation by construction. This framework inverts it: napplets are **views**, the
shell owns **state**. A panel can be collapsed, remounted, replaced or crash, and
the session keeps playing.

## The split

```
napplet  →  renders, asks. Holds nothing durable.
shell    →  chat transport, playback, session, presence, guild lens, policy.
NIP-07   →  the key, when a napplet needs a signature at all.
```

Each napplet is an `iframe sandbox="allow-scripts"` with **no**
`allow-same-origin`: opaque origin, no `fetch`, no socket, no storage, no signer,
no reach into a sibling panel. The one thing they share is the shell state, and
they only ever see snapshots of it.

## Contract

Napplets get `window.palace` (installed by the prelude, ahead of their own
scripts) or the typed `@600b/napplet-framework/sdk`:

```ts
import { on, intent } from "@600b/napplet-framework/sdk";

on("media", (media) => renderTransport(media));        // snapshot now + on change
await intent({ domain: "media", action: "pause" });     // ask; the shell decides
```

Every mutation is an **intent**. There is no generic RPC and no passthrough — the
domain/action set is closed and validated at the host before a controller sees
it. A refusal is an ordinary answer (`{ ok: false, error }`), not an exception.

**No intent carries an actor.** The shell stamps identity from the connection it
already authenticated, so a napplet cannot post as someone else — per
`PALACE-CORE.md`, never trust an iframe-supplied pubkey.

### Palace-local domains

The shipped NIP-5D domains cover Nostr-shaped concerns and nothing else. These
fill the gap, namespaced so they can never be mistaken for shipped protocol:

| Domain | Snapshot | Intents |
| --- | --- | --- |
| `guild` | lens + guild summaries | `setLens`, `markRead` |
| `session` | session, activity, participants, surface, Bell Mode focus | `join`, `leave`, `setSurface`, `invite` |
| `presence` | peers (ephemeral, ADR 0006) | `refresh` |
| `media` | now playing, position, queue | `play`, `pause`, `next`, `seek` |
| `chat` | channels, messages, unread | `send`, `setChannel` |

Sessions, presence and shared playback are generic runtime concerns, not Palace
ones. **Flag upstream on the NAPs track** — if NAP equivalents land, retire these
rather than maintaining both.

### Grants are per napplet

Each `RegionEntry` declares the domains it may touch. The chat panel is granted
`chat`, so its attempt to read `presence` is refused by the host — the demo shows
that refusal on screen deliberately. Least privilege between first-party panels
is what makes the same host safe for third-party ones later.

## Regions

The Prism layout from Round 4, as mountable slots:

```
┌ crest + lens ─────── search ─────── Web ◉ World ○ ┐
│ guild-rail │ guild-context │ center-stage │ people-and-now │
├────────────┴───────────────┴──────────────┴────────────────┤
│ session-dock                              │ chat            │
└────────────────────────────────────────────────────────────┘
```

**Bell Mode collapses regions; it never unmounts them.** That is a hosting rule
here, not a discipline someone has to remember — which is what Round 5 finding 1
asks for.

## Run the demo

```bash
pnpm --filter @600b/napplet-framework build && node packages/napplet-framework/demo/serve.mjs
```

Then open <http://127.0.0.1:4190/>. Six napplets mount into the six regions on
fixtures. Worth trying: join an activity (rails collapse), start playback, switch
Web→World and watch the track keep playing and the chat log survive.

## Test

```bash
pnpm --filter @600b/napplet-framework test
```

16 tests over the contract, the grants and the state machine — including that a
napplet cannot author as someone else, and that playback and chat survive a
surface switch.

The host needs a DOM, so it is exercised by the demo in a browser rather than in
`node --test`. Verified there: six concurrent napplets mounting with
`sandbox="allow-scripts"` and no `allow-same-origin`, the grant refusal, Bell Mode
collapse, theme push repainting every panel, and playback plus chat surviving
web→world.

## What this is not, yet

- **Not integrated.** Fixtures, not Colyseus/SQLite/NIP-29. That is the point.
- **No artifact signing.** `RegionEntry.sha256` is checked when present and
  skipped when empty (dev). First-party panels are same-origin files today; a
  third-party napplet must have a pinned hash before it is allowed to mount.
- **Prelude is ours, not `@napplet/shim`.** Fine while every napplet is
  first-party. Before third-party napplets, swap it for the published shim and
  run `@napplet/conformance` against the pair so panels behave identically in
  every runtime.
- **Cost is unmeasured.** `CLAUDE.md` sets a hard 30 FPS mobile budget; six
  concurrent documents is a real shell cost that has not been profiled.
