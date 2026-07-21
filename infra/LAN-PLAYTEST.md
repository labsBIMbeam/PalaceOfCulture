# Windows browser client ↔ Linux server playtest

This is the supported two-machine test for the current PR:

```text
Windows Edge/Chrome over Tailscale
  └─ http://LINUX_IP:5173     Vite browser client
       ├─ /api/*              Vite proxy → 127.0.0.1:8787
       └─ Colyseus            http://LINUX_IP:2567

Linux
  ├─ apps/web                 Vite, bound only to LINUX_IP:5173
  └─ apps/server              HTTP on loopback + multiplayer on LINUX_IP:2567
```

The native Godot Windows export is a separate standalone vertical-slice client. It builds and runs,
but it does **not** yet speak to the Colyseus server. Use the browser client for the first real
Windows-client/Linux-server multiplayer test. Do not describe the Godot binary as network-ready.

## Prerequisites

- Both machines are connected to the same Tailscale tailnet (preferred) or trusted LAN.
- Linux has Node 22+, Corepack/pnpm 9, and the repository dependencies installed.
- Windows has a current Edge or Chrome browser; no source checkout is required.
- Ports 5173 and 2567 are reachable on the selected Tailscale/LAN interface. The launcher never
  binds them to `0.0.0.0`.

## 1. Linux: install and launch

From the repository root:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check

export PALACE_LAN_HOST="$(tailscale ip -4)"
pnpm dev:lan
```

If `corepack enable` cannot write its shims, prefix the pnpm commands with `corepack`, including the
launcher:

```bash
PALACE_LAN_HOST="$(tailscale ip -4)" corepack pnpm dev:lan
```

The launcher prints the exact client, health, and multiplayer URLs. On this Linux host the current
Tailscale address can also be checked with `tailscale ip -4`.

## 2. Linux: preflight probes

In a second terminal, replace `LINUX_IP` with the printed address:

```bash
curl --fail http://LINUX_IP:5173/api/health
ss -ltn | grep -E ':(5173|2567)\\b'
```

Expected health body: `ok`.

## 3. Windows: playtest

1. Confirm Tailscale shows the Linux machine online.
2. Open the printed `http://LINUX_IP:5173` URL in Edge/Chrome.
3. Run the intro/start flow and enter **Werkstattgasse**.
4. Confirm the multiplayer badge says `connected · 1 online`.
5. Open a second browser profile or another Windows machine, choose a different character, and enter
   Werkstattgasse.
6. Confirm both clients show `2 online` and can see each other move.
7. At the ship dock, each live session places one named module. Confirm both clients see the same
   slots, labels, and role colours.
8. Close/reopen one client inside ten seconds and verify it reconnects without duplicating the seat.

The room is deliberately volatile. Restarting the Linux server clears live presence and ship
modules; session handles are not verified identities or durable authorship.

## Troubleshooting

- **Page unreachable:** verify both machines are in Tailscale and the Linux listener is bound to the
  printed IP. Inspect host firewall rules; do not expose the dev ports on a public interface.
- **Page works, multiplayer says offline:** the build-time `VITE_MULTIPLAYER_URL` or
  `MULTIPLAYER_ORIGINS` does not match the exact browser origin. Relaunch with `pnpm dev:lan` rather
  than starting the two processes manually.
- **`better-sqlite3` ABI error after switching Node versions:** reinstall/rebuild dependencies with
  the active Node version before launching.
- **Weak GPU/blank post-processing:** append `?postfx=0` to the client URL.

Stop both services with `Ctrl+C` in the launcher terminal.
