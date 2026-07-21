# ADR 0009 — Public realtime moves from HQ to Werkstattgasse

- **Status:** Accepted
- **Date:** 2026-07-21
- **Builds on:** [ADR 0006](0006-colyseus-authoritative-realtime-boundary.md)
- **Supersedes:** ADR 0006 only where it names `hq` as the first unauthenticated realtime world

## Context

ADR 0006 established the correct security and truth boundary for public Colyseus presence, but its
first playable target was Palace HQ. The current Meaningverse slice begins in Werkstattgasse: people
meet at the workshop, place one live Leviathan module per session, and see the same street activity.
Keeping realtime in HQ would make the visible onboarding loop single-player while an unused world
held the live room.

## Decision

The first unauthenticated Colyseus room now exposes only `worldId = street`, with the shared Street
spawn `(0, 3, 30)`.

The ADR 0006 boundary otherwise remains unchanged:

- the server accepts only the single public Street room; private homes are not addressable;
- movement and presence remain server-authoritative, bounded, and volatile;
- each connected session may add at most one bounded, human-confirmed ship-module label;
- ship modules disappear with the room and are not SQLite truth, ownership, a Nostr event, or proof
  of a distinct person;
- a session handle is an unverified display hint and must not be presented as durable authorship;
- ownership, economy, private construction, and every durable world decision stay outside Colyseus.

The browser client connects only while the player is in Werkstattgasse. Palace HQ and Home remain
local gameplay surfaces for this slice.

## Consequences

The multiplayer surface now matches the first-raid workshop loop and can be tested from a Windows
browser against the Linux server. The room can demonstrate live co-creation without inventing peer
presence or weakening the app-truth boundary.

The trade-off is that the `palace` room type keeps its historical name while its sole current world
is `street`. Renaming the room would add protocol churn without improving the boundary, so that can
wait for a future versioned topology change. Durable module provenance, signed identity admission,
and a native Godot network client remain separate work.
