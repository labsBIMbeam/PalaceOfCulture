# @600b/server — truth tier (Tier 2)

The application that **owns the truth**. One app, one worker, one DB — boring on purpose.
SQLite-first, append-only event log, reconcile jobs mandatory.

## src/ layout

| Dir | Responsibility |
|---|---|
| `db/` | SQLite (→ Postgres); append-only event log; typed event writer |
| `eventlog/` | the audit log; every world-changing decision reproducible from logged inputs + rules |
| `statemachine/` | defined states + transitions for asset / lock / ownership / palace |
| `api/` | Node HTTP endpoints; currently the hardened podcast-feed proxy |
| `multiplayer/` | Colyseus authoritative movement + volatile public-HQ presence |
| `worker/` | reconcile jobs against chain / LN / relay; provider webhooks stored **raw** |
| `adapters/` | Boltz · LNbits · Nostr behind one swappable interface — never the source of truth |

`@600b/ownership` is the shared verifier for the future authenticated command boundary. It is not
yet wired into this server or the browser UI; public multiplayer therefore cannot mutate ownership.

Run: `pnpm dev:server` (from repo root) or `pnpm dev` here.

Production: `pnpm build && pnpm start`. The server binds to `127.0.0.1:8787` by default.
Set `HOST=0.0.0.0` only when the process must be exposed by a container or reverse proxy.

## HTTP configuration

| Variable | Default | Purpose |
|---|---:|---|
| `HOST` | `127.0.0.1` | Explicit listen address |
| `PORT` | `8787` | Listen port |
| `CORS_ORIGINS` | empty | Comma-separated exact origins; wildcards are rejected |
| `AUDIT_DB_PATH` | platform state dir | Absolute SQLite path; `:memory:` is intended for tests |
| `TRUST_PROXY_HOPS` | `0` | Trusted proxies at the right edge of `X-Forwarded-For` |
| `SERVER_MAX_CONNECTIONS` | `256` | Hard cap on simultaneous client connections |
| `SERVER_SHUTDOWN_GRACE_MS` | `10000` | Grace before active sockets are force-closed |
| `PODCAST_FEED_TIMEOUT_MS` | `12000` | Total timeout including DNS, redirects, and body |
| `PODCAST_FEED_MAX_BYTES` | `4194304` | Maximum RSS response size |
| `PODCAST_FEED_MAX_REDIRECTS` | `4` | Maximum validated redirect hops |
| `PODCAST_FEED_RATE_LIMIT` | `12` | Token-bucket capacity and refills per window |
| `PODCAST_FEED_RATE_WINDOW_MS` | `60000` | Token-bucket refill window |
| `PODCAST_FEED_RATE_MAX_ENTRIES` | `10000` | Hard cap on retained per-IP buckets |
| `PODCAST_FEED_MAX_CONCURRENT_PER_IP` | `2` | Simultaneous feed fetches per client IP |
| `PODCAST_FEED_MAX_CONCURRENT_GLOBAL` | `32` | Simultaneous feed fetches for the process |

## Public HQ multiplayer

The process also owns a separate Colyseus listener. It exposes exactly one unauthenticated room
type, `palace`, filtered to the public `hq` world and capped at 64 clients. There are no public home
rooms. Room state is volatile presence only and is never written to SQLite.

| Variable | Default | Purpose |
|---|---:|---|
| `MULTIPLAYER_HOST` | `127.0.0.1` | Dedicated Colyseus listen address |
| `MULTIPLAYER_PORT` | `2567` | Dedicated Colyseus listen port |
| `MULTIPLAYER_ORIGINS` | empty | Comma-separated exact browser origins; wildcards are rejected |
| `MULTIPLAYER_TRUST_PROXY_HOPS` | `0` | Trusted proxy hops for matchmaking rate-limit identity |

Browser deployments must list every web origin explicitly, for example
`MULTIPLAYER_ORIGINS=https://palace.example,http://localhost:5173`. A missing Origin header remains
available to native clients, while any supplied browser origin must match exactly.
`pnpm dev:server` supplies the two Vite loopback origins only for local development; the production
entry point remains deny-by-default when `MULTIPLAYER_ORIGINS` is absent.

Matchmaking accepts at most 4 KiB per POST, including chunked bodies, and closes incomplete bodies
after an absolute three-second read deadline. Process-local admission is
limited to eight concurrent requests globally, four per TCP client, eight requests per client per
five seconds, and 32 globally per five seconds. The per-client map is bounded. Unconsumed room
reservations expire after five seconds, so HTTP-only reservation floods cannot hold the 64 seats
indefinitely. These are application backstops, not an Internet edge: multi-replica deployments must
also enforce shared connection, request-rate, and body limits at a trusted reverse proxy.

By default, rate limiting uses only the TCP peer and ignores `X-Forwarded-For`. Set
`MULTIPLAYER_TRUST_PROXY_HOPS` only when the listener is reachable exclusively through exactly that
many trusted proxies and the outer proxy strips or overwrites incoming forwarding headers. A wrong
value lets clients forge identities or makes all users share the proxy's bucket.

New players spawn at the shared HQ spawn `(6, 4, 44)`. Movement is server-authoritative: payload
shape, finite values, world bounds, monotone sequence, and a strict rolling 20-message/second limit
are checked before replication. Bounded distance budgets refill at 12 m/s horizontally and 24 m/s
vertically. Their 500 ms jitter allowance caps at 8 m and 14 m respectively, so packet batching is
tolerated but idle time cannot bank an unbounded teleport. A move to the exact shared spawn is the
only fall-safety teleport. Rejected speed updates return the current authoritative pose to the
sender. Invalid updates are ignored; sustained invalid or excessive input closes only that client.
Presence does not apply player-to-player collision or separation, so multiple players may
intentionally share identical coordinates. State patches are emitted at 10 Hz.

Unexpected disconnects keep their volatile seat for ten seconds. The replicated `connected` flag
is false during that window and returns to true on reconnection. WebSocket payload, heartbeat,
connection, header, and socket lifetime limits are explicit. `SIGINT`/`SIGTERM` drain Colyseus,
HTTP, and SQLite together.

Same-origin requests do not need CORS. For direct local web development, use for example
`CORS_ORIGINS=http://localhost:5173`. The feed proxy permits only HTTP(S) on ports 80/443,
rejects non-public IP space, pins validated DNS answers for the connection, and validates every
redirect target before following it.

Feed limits use the TCP peer address unless `TRUST_PROXY_HOPS` is explicitly set. Only enable that
setting when the server is reachable exclusively through that many trusted reverse proxies and the
edge proxy appends or overwrites `X-Forwarded-For`; otherwise clients could forge rate-limit keys.
The token-bucket map uses idle LRU eviction and never exceeds `PODCAST_FEED_RATE_MAX_ENTRIES`.
Disconnecting clients abort their upstream request and release concurrency immediately.
Limits are process-local; a multi-replica deployment must additionally enforce a shared limit at
the trusted edge.

The HTTP listener also limits header time, request time, socket inactivity, header count, requests
per keep-alive socket, and total connections. `SIGINT`/`SIGTERM` stop new connections, close idle
sockets, and force-close remaining sockets after the configured shutdown grace.

## Internal audit store

`src/db/auditStore.ts` is the internal SQLite truth boundary. Server startup opens it and applies
idempotent schema migrations, but there is deliberately no unauthenticated HTTP mutation route.
The default DB is outside the repository (`%LOCALAPPDATA%/600b/audit.sqlite` on Windows or
`$XDG_STATE_HOME/600b/audit.sqlite`, falling back to `~/.local/state/600b/audit.sqlite`). Explicit
paths must be absolute, which prevents an accidental generated DB in the worktree.

Each stream is a zero-based hash chain. An append supplies the expected `revision` and `prevHash`;
one `BEGIN IMMEDIATE` transaction compares them with the stored head, updates the head, and inserts
the event. The first transaction accepted by SQLite wins. Competing forks receive a structured
`AuditConflictError` and do not modify the winning chain. Events record canonical payload, reason,
`user:*`/`auto:*` actor, server timestamp, and a domain-separated SHA-256 content hash.

The connection uses WAL, `synchronous=FULL`, foreign keys, a five-second busy timeout, bounded WAL
checkpointing, and append-only update/delete triggers. `readStream()`, `verifyStream()`, and
`exportStreamJson()` never repair source rows. Export refuses a chain that fails revision, linkage,
canonical-payload, content-hash, or materialized-head verification.

`@600b/shared` currently provides JSON types but no stable canonical serializer; ownership's
serializer is private to its signed protocol. Audit canonical JSON therefore has an explicit local
version-1 boundary and a fixed regression vector. It must move only through a versioned migration
once a public shared encoding exists. The hash chain detects accidental or partial DB tampering; a
privileged attacker who can rewrite the entire DB and every hash still requires a future external
signed checkpoint to detect.

Run the Node test suite with `pnpm test`.
