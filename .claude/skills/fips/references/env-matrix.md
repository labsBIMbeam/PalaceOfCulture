# Environment matrix

Copy the block matching the topology. Every value is exact-match, so substitute hostnames literally
rather than approximating them.

Contents:
- [A. Split origins behind a TLS edge](#a-split-origins-behind-a-tls-edge) — the fips.network layout
- [B. Single origin behind a TLS edge](#b-single-origin-behind-a-tls-edge)
- [C. Overlay network, no TLS edge](#c-overlay-network-no-tls-edge)
- [D. Local development and LAN playtests](#d-local-development-and-lan-playtests)
- [Cross-cutting notes](#cross-cutting-notes)

---

## A. Split origins behind a TLS edge

The fips.network layout: Cloudflare terminates TLS, Caddy runs on the VPS, both Node listeners stay
on loopback.

```
browser ──https──▶ Cloudflare ──https──▶ Caddy (:443, VPS) ──http──▶ 127.0.0.1:8787  /api/*
                                                            └──http──▶ 127.0.0.1:2567  /matchmake/* + WS
```

| Host | Serves | Origin entry needed |
|---|---|---|
| `palace.fips.network` | `apps/web/dist/` + `/api/*` | yes — this is the page origin |
| `rooms.fips.network` | `/matchmake/*` + WebSocket upgrade | no — it is never a page origin |
| `fips.network` (apex) | landing page, optionally the Godot export | no — Godot touches neither listener |

Server environment (systemd unit on the VPS):

```ini
NODE_ENV=production

# Feed proxy — loopback only; Caddy is the only thing that reaches it.
HOST=127.0.0.1
PORT=8787
CORS_ORIGINS=https://palace.fips.network
TRUST_PROXY_HOPS=0

# Colyseus — same process, separate listener, separate settings.
MULTIPLAYER_HOST=127.0.0.1
MULTIPLAYER_PORT=2567
MULTIPLAYER_ORIGINS=https://palace.fips.network
MULTIPLAYER_TRUST_PROXY_HOPS=0
```

Client build — baked in, so this must be present at build time, not at runtime:

```bash
VITE_MULTIPLAYER_URL=https://rooms.fips.network pnpm --filter @600b/web build
```

`https://`, not `wss://`. The Colyseus client upgrades the scheme itself, and an `http://` value on
an HTTPS page throws at startup by design.

### Why the hop counters say 0 here

The correct steady-state value for this chain is **2**, derived from what each hop appends:

| Hop | `X-Forwarded-For` after it |
|---|---|
| Cloudflare | `<client>` |
| Caddy | `<client>, <cloudflare-edge>` |

Two entries, so `clientIndex = 2 - 2 = 0`, selecting `<client>`. Correct.

They start at `0` because Caddy on the VPS answers on the public IP as well as through Cloudflare.
Anyone connecting to that IP directly and sending `X-Forwarded-For: 1.2.3.4` gets `1.2.3.4, <their
own IP>` after Caddy appends — two entries again, so a hop count of 2 would hand them a rate-limit
identity of their choosing.

Close that path first (see `edge-cloudflare-caddy.md`), re-verify with
`scripts/probe-forwarded-for.mjs`, and only then set both counters to `2` — remembering that the
zero-state means all users share one rate-limit bucket, so this is launch-blocking rather than
optional polish.

---

## B. Single origin behind a TLS edge

One hostname serves the client, `/api/*`, `/matchmake/*`, and the WebSocket upgrade. Simpler, and it
removes cross-origin requests entirely.

```ini
NODE_ENV=production
HOST=127.0.0.1
PORT=8787
CORS_ORIGINS=https://palace.fips.network
TRUST_PROXY_HOPS=0

MULTIPLAYER_HOST=127.0.0.1
MULTIPLAYER_PORT=2567
MULTIPLAYER_ORIGINS=https://palace.fips.network
MULTIPLAYER_TRUST_PROXY_HOPS=0
```

Build with `VITE_MULTIPLAYER_URL` **unset** — production falls back to `window.location.origin`.

Keep both allowlists populated even though same-origin `GET`s carry no `Origin` header and would pass
regardless. The empty-list version works by accident, and stops working the moment anything becomes
cross-origin or non-`GET`. Hop-count reasoning is identical to topology A.

---

## C. Overlay network, no TLS edge

Tailscale or similar, where browsers are themselves on the overlay and reach the machine directly.

```ini
NODE_ENV=production
HOST=100.x.y.z
PORT=8787
CORS_ORIGINS=http://100.x.y.z:5173
TRUST_PROXY_HOPS=0

MULTIPLAYER_HOST=100.x.y.z
MULTIPLAYER_PORT=2567
MULTIPLAYER_ORIGINS=http://100.x.y.z:5173
MULTIPLAYER_TRUST_PROXY_HOPS=0
```

`0` is not a placeholder here — it is correct and final. Nothing sits in front, so `remoteAddress`
already is the client, and any `X-Forwarded-For` present is by definition forged.

Bind to the specific overlay address, never `0.0.0.0`. Plain `http://` is fine because the page is
also `http://`; there is no mixed content to trip over, and `resolveMultiplayerUrl` only blocks an
HTTP endpoint when the *page* is HTTPS.

---

## D. Local development and LAN playtests

`pnpm dev:server` runs `src/dev.ts`, which sets **only**:

```
MULTIPLAYER_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

`CORS_ORIGINS` stays empty, so the feed proxy rejects any request that arrives with a browser
`Origin` header. To exercise the feed proxy cross-origin locally, set it explicitly:

```bash
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173 pnpm dev:server
```

For cross-machine playtests prefer `pnpm dev:lan`, which already does the right thing —
`tooling/dev/lan-playtest.mjs` sets `CORS_ORIGINS`, `MULTIPLAYER_ORIGINS`, and
`VITE_MULTIPLAYER_URL` from a single `PALACE_LAN_HOST` and keeps them consistent:

```bash
PALACE_LAN_HOST="$(tailscale ip -4)" pnpm dev:lan
```

That script is the working reference for "one host, all four values agree". When a deployment
misbehaves, comparing against what it derives is usually faster than re-reading the guards.

---

## Cross-cutting notes

**Startup is fail-fast.** An invalid origin, a wildcard, or an out-of-range hop count throws during
`loadServerConfig` / `loadMultiplayerConfig`, and `index.ts` exits with code 1 after printing
`[600b] server startup failed: …`. A container that will not start is usually a malformed env value,
not a crash.

**`AUDIT_DB_PATH` must be writable** by the service user. Under systemd with `DynamicUser=` or a
read-only root, point it at an explicit `StateDirectory` path.

**Colyseus rooms are volatile.** Ship modules and presence do not survive a restart — that is
intended, not a persistence bug to chase. Deploys drop live sessions.

**WebSocket idle timeouts are covered.** The transport pings every 5s
(`PING_INTERVAL_MS` in `src/multiplayer/server.ts`), comfortably inside the idle windows proxies
and CDNs typically enforce, so no keepalive tuning is needed at the edge.
