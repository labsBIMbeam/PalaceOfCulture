# Cloudflare + Caddy edge

Reference for topology A in `env-matrix.md`. The goal is a chain whose shape you can state exactly,
because the hop counters encode that shape as a number.

## DNS

| Record | Value | Proxy |
|---|---|---|
| `palace.fips.network` | VPS IPv4/IPv6 | proxied (orange) |
| `rooms.fips.network` | VPS IPv4/IPv6 | proxied (orange) |
| `fips.network` | existing GitHub Pages target | proxied |

The apex can keep serving the current static landing page — it is a separate origin from the app and
needs no allowlist entry.

**Set the Cloudflare SSL/TLS mode to Full (strict).** On *Flexible*, Cloudflare speaks plain HTTP to
the origin: Caddy redirects to HTTPS, Cloudflare re-requests over HTTP, and the loop only ends when
the browser gives up. Full (strict) also keeps the `https://` origin the browser sees consistent with
what the server observes.

Proxied hostnames pass WebSocket upgrades through on 443 without extra configuration, so
`rooms.fips.network` works behind the orange cloud as-is.

## Caddyfile

```caddyfile
palace.fips.network {
    encode zstd gzip

    handle /api/* {
        reverse_proxy 127.0.0.1:8787
    }

    handle {
        root * /srv/palace/web
        try_files {path} /index.html
        file_server
    }
}

rooms.fips.network {
    # Caddy negotiates the WebSocket upgrade automatically; no extra directives needed.
    reverse_proxy 127.0.0.1:2567
}
```

Both Node listeners stay bound to `127.0.0.1`, so the only public surface is Caddy on 443.

## Locking the origin down

Until this is done, both hop counters must stay `0` — and at `0` every user shares a single
rate-limit bucket, so this is what stands between a playtest and a launch. Any one of these is
sufficient.

**1. Firewall to Cloudflare ranges** — simplest, and verifiable from outside.

```bash
curl -s https://www.cloudflare.com/ips-v4 https://www.cloudflare.com/ips-v6
```

Allow 80/443 from those ranges only, default-deny the rest. Cloudflare publishes changes rarely; pull
the list on a schedule rather than pasting it once and forgetting. ACME still works, because
Let's Encrypt reaches the origin *through* Cloudflare.

**2. Authenticated Origin Pulls** — Cloudflare presents a client certificate and Caddy refuses
connections without it. Stronger than IP filtering and immune to range drift, but more moving parts.

**3. Cloudflare Tunnel** — `cloudflared` dials out, no inbound ports at all. This changes the chain
shape: with the tunnel connecting straight to the Node listeners there is no Caddy hop, so the
counters become `1`, not `2`. Re-run the probe rather than assuming.

Verify the lockdown actually took, from off-network:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' --max-time 8 https://<vps-ip>/api/health -k
```

A timeout or connection refused is the goal. A `200` — or any HTTP status — means the origin is still
directly reachable and the counters must stay `0`.

## Deriving the hop count instead of guessing

Each trusted proxy appends the address it received the connection from, on the right:

| Hop | `X-Forwarded-For` after it |
|---|---|
| Cloudflare | `<client>` |
| Caddy | `<client>, <cloudflare-edge>` |

Two entries → `MULTIPLAYER_TRUST_PROXY_HOPS=2` and `TRUST_PROXY_HOPS=2`.

Confirm it against the running edge rather than against this table, since an extra CDN, a sidecar, or
a tunnel silently changes the count:

```bash
# On the VPS
node .claude/skills/fips/scripts/probe-forwarded-for.mjs 8788
```

Add a temporary route, load it through the real public hostname, then remove the route:

```caddyfile
handle /__probe* {
    reverse_proxy 127.0.0.1:8788
}
```

The script prints the chain it received and, for each candidate hop value, which address that value
would select. Choose the one that equals your actual public IP — check it with `curl -s ifconfig.me`
from the machine you are browsing from.

Run the probe a second time while sending a forged header:

```bash
curl -sS -H 'X-Forwarded-For: 1.2.3.4' https://palace.fips.network/__probe
```

At the correct hop count the forged `1.2.3.4` must **not** be selected. If it is, the count is too
high — or the request reached the origin without passing the edge, which means the lockdown has a
hole and the counters belong back at `0`.

## Deploy checklist

1. Build the client with the room host baked in:
   `VITE_MULTIPLAYER_URL=https://rooms.fips.network pnpm --filter @600b/web build`
2. Sync `apps/web/dist/` to `/srv/palace/web`. Gitignored runtime assets under
   `apps/web/public/avatar/` and `apps/web/public/feeds/` are not in git — copy them separately.
3. Install the systemd unit with the topology-A env block from `env-matrix.md`.
4. Reload Caddy, then run the verification steps in `SKILL.md`.
5. Lock the origin down, re-probe, raise both counters to the confirmed value, restart.
