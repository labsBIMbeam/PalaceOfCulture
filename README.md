# 600 Billion — The Palace of Culture

> **A social world where Bitcoin timelocks become visible, ownable objects.** You lock sats and
> something grows — a tree, a vehicle, a 21-year spaceship — on one shared map of the real Earth.
> Status is earned through time, never pay-to-win. Non-custodial & FOSS. *Not an NFT game.*
>
> **Money buys style. Time builds legend.**

> ⚠️ **This is the raw stone — the statue still has to be carved.**
> Playable pre-alpha. Three walkable worlds (Palace HQ, the Werkstattgasse street, your private
> Home), multiplayer presence, growable timelock assets, a signed ownership verifier and an
> append-only audit core, the Godot Kerni companion and its bounded localhost template sidecar run
> today; the end-to-end timelock flow and broader Bitcoin/Nostr world-signal engine remain
> scaffolding. Contributions welcome — see [Contributing](#contributing).

This repository is the **application** — a web-first, stylized 3D social MMO. The product vision,
whitepaper, concept bible, and design brief are maintained separately in the 600 Billion
documentation package.

## The load-bearing ideas

- **Two protocols, nothing else.** *Bitcoin proves the time; Nostr owns the object.* No new token,
  no federation, no shitcoins.
- **The app owns the truth.** A deterministic state machine + append-only audit log + per-asset
  **signed hash-chain** ownership. Boltz / LNbits / Nostr are swappable adapters, never the source
  of truth — and one platform-neutral ownership verifier is ready for both client and server paths.
- **Non-custodial by design.** The locked principal stays the user's and is claimable without our
  servers. You commit time; you do not spend it.
- **Earned, not bought.** Cosmetics sell for small sats; maturity, provenance, and legend are
  earned only. No loot boxes, no gacha, no pay-to-win.
- **Desktop web first; mobile is a separate app.** UI and controls have separate release surfaces;
  protocols and domain packages are shared. See ADR 0007.

Start with **[BUILD-BRIEF.md](BUILD-BRIEF.md)** and **[ADR 0001](docs/adr/0001-stack-and-runtime-topology.md)**
(what runs where, in which language); ADRs 0001–0008 cover realtime, avatars, media, voice, guild
lenses and the desktop/mobile split. The invariants are in [CLAUDE.md](CLAUDE.md). World and
feature handoffs live in [`docs/`](docs/) — e.g. [STREET-HANDOFF.md](docs/STREET-HANDOFF.md) (the
street world), [HOME-TOWN.md](docs/HOME-TOWN.md), [GAME-LOOP.md](docs/GAME-LOOP.md) and
[PALACE-CORE.md](docs/PALACE-CORE.md).

## Stack

- **Client** (`apps/web`) — Three.js + react-three-fiber, `@pixiv/three-vrm` avatars + `ecctrl`,
  `@react-three/rapier` physics, GLTF/Draco/KTX2, data-driven instancing & LOD. TypeScript.
- **Server** (`apps/server`) — Colyseus (authoritative movement) + Node HTTP API + SQLite audit core
  worker. SQLite → Postgres, append-only event log. TypeScript.
- **Shared core** (`packages/*`) — event/asset-model types, the signed-hash-chain ownership engine,
  and the Blender→glTF asset pipeline.
- **World-agent** (`services/world-agent`) — suggestion-only, isolated behind a queue/API. Python.
- **Godot client** (`godot/`) — Godot 4.7 (typed GDScript, code-first scenes) exploring the 3D
  social world / homebuilder as its own module; contract in
  [`godot/ARCHITECTURE.md`](godot/ARCHITECTURE.md).

## Layout

```
.
├── apps/
│   ├── web/                  r3f client (three + react-three-fiber)   — TypeScript, Tier 0
│   └── server/               Colyseus rooms + HTTP API + audit core   — TypeScript, Tier 2
├── packages/
│   ├── shared/               event / asset-model / state-machine types
│   ├── ownership/            signed hash-chain build + local verify (imported by web AND server)
│   └── assets-pipeline/      GLB/VRM cleanup → Draco/meshopt → LOD → hash → manifest (+ Blender)
├── services/
│   └── world-agent/          suggestion-only world-agent             — Python, Tier 3
├── godot/                    Godot 4.7 client module (homebuilder / 3D social) — GDScript
├── docs/                     world + feature handoffs; docs/adr/ decision records
├── infra/                    hosting + deployment topology (infra/HOSTING.md)
└── viewers/                  drag-and-drop GLB/VRM budget viewer
```

`packages/ownership` is the home of "the app owns the truth" — the **same** verification code runs
on client and server. `apps/server/src/adapters/` isolates Boltz / LNbits / Nostr so they stay
swappable.

## Quick start

```bash
corepack enable          # provides pnpm
pnpm install             # install the TS workspace
pnpm dev:web             # run the client (Vite)
pnpm dev:server          # run the server (tsx watch)

# Two-machine playtest (Windows browser client -> this Linux server, preferably over Tailscale)
PALACE_LAN_HOST="$(tailscale ip -4)" pnpm dev:lan

# Python service (world-agent)
cd services/world-agent
uv sync && uv run pytest
```

Requires Node ≥ 22 and pnpm (`corepack enable`); the world-agent needs Python ≥ 3.12 + `uv`.
See [`infra/LAN-PLAYTEST.md`](infra/LAN-PLAYTEST.md) for the verified Windows/Linux multiplayer path.

## Status

Playable pre-alpha — one engine, three walkable worlds, in-engine **Travel** between them.

- ✅ Monorepo scaffold; architecture decided (ADRs 0001–0008); asset/budget viewer.
- ✅ **Palace HQ** (public) — the real Revit model, game-ified through the Blender pipeline
  ([packages/assets-pipeline/HANDOFF.md](packages/assets-pipeline/HANDOFF.md)); Colyseus presence
  with authoritative movement, chat + voice scaffold, collision-free player markers.
- ✅ **Werkstattgasse street** (public beta sandbox) — a compact dusk-lit workshop camp: a round
  civic plaza whose staged foundation will birth the rocket + Palace, a growing apple tree, six
  walkable buildings, a forge yard with chimney smoke, lantern garlands, palisade + forest edge.
  Deterministic data-driven scenery; colliders derive from the same layout data
  ([docs/STREET-HANDOFF.md](docs/STREET-HANDOFF.md)).
- ✅ **Home** (private) — your own empty map: magnet block-builder (M), uncapped decoration, and
  your timelocks living on the plot (21M tree, 21Y starship) — they grow purely by waiting.
- ✅ Decorate mode (B) in every world (21-piece anti-spam cap in public), cozy poses (sit/sleep),
  per-world interactables (E).
- ✅ Growable timelock assets — growth manifests morph a GLB by lock progress; art is static,
  state is data.
- ✅ Frontend economy surfaces: Home, Culture (Wavlake / Podcasting 2.0 / Nostr discovery),
  Politics ("Clown News" — the factual Citadel Wire feed, satire only via a future world agent),
  Workshop and Pleb Market.
- ✅ BIP340 signed ownership-chain verifier and SQLite append-only audit core (not yet wired to UI).
- ✅ Godot Kerni world-agent embodiment: static GLB, player-initiated phase context, fail-closed
  external-proposal seam and no cultural write authority.
- ⏳ Timelock adapters (Boltz/LNbits), authenticated commands, identity/seal UI, and external
  Python world-agent signals.

The first milestone is "tree first" — the playable MVP slice in `BUILD-BRIEF.md` §4/§6.

## Contributing

The world is built bottom-up, by its inhabitants — outside contributors very welcome.

1. Read [BUILD-BRIEF.md](BUILD-BRIEF.md) (architecture + first-sprint backlog) and the invariants in
   [CLAUDE.md](CLAUDE.md).
2. Commit style is [Conventional Commits](https://www.conventionalcommits.org/); work on a branch,
   open a PR.
3. **TypeScript** is linted/formatted with **Biome** (`pnpm lint` / `pnpm format`; `pnpm typecheck`
   before committing). **Python** with **Ruff** (`ruff check . && ruff format .`). Add a test when
   you add a feature.

## License

[MIT](LICENSE) — FOSS-first. (A separate license for community/art assets is still to be decided.)

---

*Officially, we are building a Palace of Culture for humanity. Unofficially, it is a giant digital
pyramid with a Head of Culture at the top. We are definitely not a cult.*
