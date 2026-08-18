---
name: fips
description: >-
  Run or deploy the 600 Billion / Palace of Culture stack behind fips.network, Cloudflare,
  Caddy/nginx, a VPS, Tailscale, or any reverse proxy or overlay network. Encodes the two
  INDEPENDENT deny-by-default origin allowlists (MULTIPLAYER_ORIGINS for the Colyseus listener on
  :2567, CORS_ORIGINS for the feed proxy on :8787) and the two INDEPENDENT trust-proxy-hop counters
  (MULTIPLAYER_TRUST_PROXY_HOPS, TRUST_PROXY_HOPS), plus the https-not-wss rule and the build-time
  baking of VITE_MULTIPLAYER_URL. Use this whenever the user mentions fips.network, deploying or
  hosting the palace, "going live", a VPS / Cloudflare / Caddy / tunnel / overlay setup, LAN or
  cross-machine playtests, 403 origin_not_allowed, CORS failures on /api, matchmaking or Colyseus
  connection failures, rate limits firing against the wrong client, or mixed-content / wss errors —
  even when they never name the environment variables themselves.
---

# Shipping the palace behind a proxy

The whole stack is two listeners in **one** Node process (`apps/server/src/index.ts`):

| Listener | Default | Guarded by | Source |
|---|---|---|---|
| Feed proxy + audit store | `127.0.0.1:8787` | `CORS_ORIGINS` | `src/app.ts` |
| Colyseus multiplayer | `127.0.0.1:2567` | `MULTIPLAYER_ORIGINS` | `src/multiplayer/server.ts` |

Everything that goes wrong behind a proxy comes from one fact: **these two listeners share a process
but share no configuration.** Each has its own allowlist and its own trust-proxy counter, and setting
one does nothing for the other. `src/dev.ts` sets only `MULTIPLAYER_ORIGINS`, which is why the feed
proxy can reject browser origins in a tree where multiplayer works fine.

## The four variables that actually matter

```
MULTIPLAYER_ORIGINS           -> :2567   deny-by-default, exact match, wildcards rejected
CORS_ORIGINS                  -> :8787   deny-by-default, exact match, wildcards rejected
MULTIPLAYER_TRUST_PROXY_HOPS  -> :2567   default 0
TRUST_PROXY_HOPS              -> :8787   default 0   <-- note: NOT prefixed with MULTIPLAYER_
```

`TRUST_PROXY_HOPS` is the one people miss, because its sibling carries a prefix and it doesn't.

For the concrete, copy-pasteable env block for a given topology, read
[`references/env-matrix.md`](references/env-matrix.md).

## Origins are compared exactly, after URL normalization

Both allowlists parse each entry with `new URL()` and store `url.origin`
(`parseExactOrigins`, `parseCorsOrigins`). A value is rejected outright if it is `*`, carries
credentials, or has a path, query, or fragment. So `https://palace.fips.network/` is fine (the
trailing slash is the empty path), but `https://palace.fips.network/app` throws at startup.

Two traps worth internalizing:

- **Scheme, host, and port must all match.** `http://` vs `https://`, and `:5173` vs no port, are
  different origins. There is no wildcard escape hatch — that is deliberate.
- **Internationalized hostnames normalize to punycode.** `https://fißs.network` becomes
  `https://xn--fis-6ka.network`, which will never match a browser sending `https://fips.network`.
  If a hostname contains non-ASCII characters, resolve it with `new URL(x).origin` and put *that*
  string in the allowlist.

The allowlist entry is always the **page's** origin — the thing in the browser address bar — never
the API's or the room server's. A browser loading `https://palace.fips.network` and opening a socket
to `https://rooms.fips.network` sends `Origin: https://palace.fips.network`. That is what both lists
must contain.

Origin allowlists only constrain browsers, which is their whole job: a browser will not lie about
`Origin`, so the list keeps other people's web pages from driving your server. Any non-browser client
can send whatever `Origin` it likes. Never reason about the allowlist as if it were authentication.

## Never write ws:// or wss:// in the client config

`resolveMultiplayerUrl` (`apps/web/src/net/multiplayer.ts`) **rejects** `ws:` and `wss:` schemes. Set
`VITE_MULTIPLAYER_URL` to an `http(s)://` URL and the Colyseus client derives the socket scheme
itself. It also refuses to let an HTTPS page point at an HTTP endpoint, so behind TLS the value must
be `https://…` — which is what makes the socket `wss://` and keeps the browser's mixed-content
blocker quiet.

Two more behaviors of that function are easy to get bitten by:

- **It is baked at build time.** `import.meta.env.VITE_MULTIPLAYER_URL` is substituted during
  `pnpm --filter @600b/web build`. Setting it in the systemd unit at runtime does nothing. Rebuild
  the client whenever the room host changes.
- **Unset means same-origin in production.** With no explicit value and `DEV === false`, it falls
  back to `window.location.origin`. That is correct *only* if the edge also proxies `/matchmake/*`
  and the WebSocket upgrade on the page's own host.

## Choosing the hop count — the safety gate

`resolveClientIp` (`apps/server/src/rateLimit.ts`) picks the client from `X-Forwarded-For` by
counting **from the right**:

```
clientIndex = chain.length - trustedProxyHops
```

Counting rightward is the safe direction: entries an attacker prepends get skipped, because each
trusted proxy appends on the right as the request travels inward. The number must be *exact*:

| Setting | Effect |
|---|---|
| **Too high** | An attacker-supplied entry lands on `clientIndex`. They choose their own rate-limit identity, and can poison another user's bucket. |
| **Correct** | The real client IP is selected. |
| **Too low** | A proxy's own IP is selected, so every user shares one bucket. Safe, but the limiter degrades badly. |
| **`0`** | Forwarding headers are ignored entirely. Always safe. |

**The gate: a hop count above 0 is only safe if the origin cannot be reached except through the
edge.** If anyone can open a connection to the box directly — its public IP, a stray listener, a
`Host`-header request that your proxy still serves — they can forge the whole chain, and a non-zero
count converts that into a working bypass.

Do not guess the number. Determine it by observing what the process actually receives:

```bash
node .claude/skills/fips/scripts/probe-forwarded-for.mjs 8788
```

Point a temporary edge route at `127.0.0.1:8788`, load it through the real public URL, and the script
prints the received chain and the hop count that chain implies. Delete the route afterwards.

`0` is the correct value until the origin is locked down — but it is not free, and shipping it
without saying so is how a playtest quietly falls over. With `0` behind a proxy every request
resolves to the proxy's address, so all users land in **one** bucket: 12 feed requests per 60s total
(`PODCAST_FEED_RATE_LIMIT`), 4 concurrent matchmaking requests total, 8 per 5s total
(`MAX_ACTIVE_MATCHMAKE_PER_IP`, `MATCHMAKE_PER_IP_RATE_LIMIT`). Fine for a handful of testers,
an outage at real concurrency. Treat locking the origin down as the prerequisite for launch, not as
hardening to revisit later. `references/edge-cloudflare-caddy.md` covers how.

## What needs an origin entry, and what doesn't

- **`apps/web`** — needs entries in both allowlists (it calls `/api` and opens rooms).
- **Godot web export** — needs **neither**. It talks directly to public Nostr relays
  (`godot/scripts/net/napplet_catalog.gd`) and never contacts `:8787` or `:2567`. It is pure static
  hosting; serve it wherever is convenient.
- **`services/world-agent`** — never publicly routed. Per the repo invariant it only proposes, behind
  a queue/API boundary, so it gets no edge route and no allowlist entry.

## Verifying a deployment

Work outward, because each check rules out a layer:

1. `curl -sS https://<app-host>/api/health` → `ok`. Failure here is routing, not CORS.
2. Replay a browser request with an explicit Origin — this is the check that isolates the allowlists,
   since a same-origin `GET` from a real browser sends no `Origin` header at all and would pass even
   with an empty list:
   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' -H 'Origin: https://palace.fips.network' https://<app-host>/api/health
   ```
   `403` with `{"error":{"code":"origin_not_allowed"}}` means `CORS_ORIGINS` is wrong or unset.
3. Same header against `POST https://<rooms-host>/matchmake/joinOrCreate/palace`. A `403` here means
   `MULTIPLAYER_ORIGINS` is wrong — a different variable from step 2, even though the symptom rhymes.
4. In the browser console, confirm the socket URL is `wss://`. If it is `ws://` on an HTTPS page the
   build has a stale or missing `VITE_MULTIPLAYER_URL`; rebuild rather than patching at runtime.
5. Confirm the hop count with the probe script above before trusting any rate-limit behavior.

## Guardrail

Production is deny-by-default on purpose. Do not add wildcards, do not widen an allowlist to make an
error go away, and do not raise a hop count to fix a rate-limit complaint — a limiter firing against
the wrong identity is a symptom of the hop count being wrong, and raising it blindly is the exact
move that makes forgery work. Changes to `apps/server` warrant confirming with the user first; the
env values and edge config are the intended adjustment surface.
