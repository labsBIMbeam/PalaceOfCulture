# ADR 0006 — Colyseus authoritative realtime boundary

- **Status:** Partially superseded by ADR 0009
- **Date:** 2026-07-09
- **Builds on:** [ADR 0001](0001-stack-and-runtime-topology.md)
- **Retained:** ADR 0009 keeps every boundary below except the initial `hq` world target

## Context

ADR 0001 selected Colyseus for authoritative movement and presence, but the repository only listed
the dependency. The browser still rendered a single-player world, and comments did not define which
state a room may own. Leaving that boundary implicit would let transient network state become a
second source of truth beside SQLite and the ownership chain.

## Decision

Colyseus 0.17 is the realtime authority for the public Palace HQ:

- `packages/multiplayer` owns the versioned room schema, message names, input bounds and protocol
  constants imported by both server and web client.
- `apps/server` owns room lifecycle, admission, rate/speed checks and accepted player positions.
- `apps/web` sends movement requests and renders replicated remote presence. A client never mutates
  synchronized state directly; rejected or newly rejoined local poses are reconciled from an
  explicit server correction instead of drifting until disconnect.
- The first unauthenticated slice exposes only the public `hq` world. Private homes are not addressable
  until authenticated room admission exists; a guessable character id is not authorization.
- Presence, movement and short reconnection leases are ephemeral. They are deliberately not written
  to SQLite and are lost when a room is disposed.
- Player presence has no player-to-player collision or separation. Remote avatars are visual only;
  many players may occupy the same coordinates while local controllers still collide with the world.
- Presence replicates a bounded asset id, never a client-provided URL or path. The web client resolves
  known ids through its local avatar registry and falls back to the placeholder for unknown ids.
  Detailed rigged models are rendered outside Rapier for at most four nearby players; everyone else
  remains a cheap visual marker, so model detail cannot reintroduce character collision.
- Ownership, construction, economy and every world-changing decision remain commands against the
  SQLite audit/state-machine boundary. A Colyseus message cannot finalize those transitions.

The initial deployment uses a dedicated Colyseus listener in the same process as the HTTP API and
SQLite store. Production may place it behind the same reverse proxy and origin as the web client.
Multi-process scaling requires a shared Colyseus presence/driver and is a separate deployment change.

## Security and operational constraints

- Exact origin allowlists; no wildcard browser admission.
- Bounded matchmaking bodies, admission rate/concurrency, seat lifetime, WebSocket payloads, room
  size and movement frequency.
- Finite coordinate and rotation checks, monotonic sequence numbers, and independently bounded
  horizontal and vertical travel budgets with a finite network-jitter allowance.
- Invalid input is rejected without mutating room state.
- Graceful process shutdown drains both HTTP and Colyseus listeners before closing SQLite.
- Browser reconnects receive only a short lease; they are not durable identity or ownership proof.

## Consequences

Movement is responsive and server-authoritative without polluting the durable audit log. Client and
server cannot silently drift on field names or numeric limits because they consume one built package.
The trade-off is a second listener and an explicit reverse-proxy configuration. Redis presence/driver,
authenticated private rooms and Yjs-backed collaborative projections remain later, separate slices.
Until signed identity admission lands, known avatar ids are appearance hints rather than proof of
ownership; unauthenticated users can still imitate another public appearance.
