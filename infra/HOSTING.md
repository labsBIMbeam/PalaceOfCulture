# Hosting — 600 Billion / Palace of Culture

Deployment-Plan: **was wird wo aufgesetzt**, um das Spiel zu hosten. Begleitdokument zu
[`infra/README.md`](README.md) (Ziel-Topologie) und [`docs/adr/0001`](../docs/adr/0001-stack-and-runtime-topology.md)
(wo rennt was). Gewählte Variante: **öffentlich im Internet, self-hosted auf eigenem VPS.**

> **Wichtigste Erkenntnis:** Vom in ADR 0001 beschriebenen 5-Tier-System ist heute real
> **nur Tier 0 (Browser-Client) + ein winziges Stück Tier 2 (API-Proxy)**. Der „tragende"
> Backend-Teil (Colyseus/Yjs-Realtime, SQLite-Eventlog, Ownership-Chain, Timelock-Flow,
> world-agent) ist laut README/CLAUDE.md **Gerüst, noch nicht implementiert**. Es gibt also
> (noch) keinen Multiplayer-Server, keine DB und keine Auth zum Hosten.

---

## 1. Was tatsächlich existiert (Befund)

| Teil | Pfad | Zustand | Hosting-Relevanz |
|---|---|---|---|
| **Web-Client** | `apps/web` | ✅ Läuft: Intro → Start → begehbares 3D-Palace-HQ (Vite + React + Three.js/r3f + ecctrl) | Statisches Bundle (`pnpm build` → `dist/`) |
| **Server / API-Proxy** | `apps/server/src/index.ts` | ✅ Läuft, aber minimal: nur `node:http` mit `/api/health`, `/api/podcasts/search`, `/api/podcasts/feed` (CORS-Proxy für Podcasts, ADR 0004) | Node-Prozess (Port 8787) |
| Colyseus/Fastify/better-sqlite3 | `apps/server` deps | ⏳ Als Dependency deklariert, **nicht verdrahtet** | Noch nichts zu hosten |
| **world-agent** | `services/world-agent` | ⏳ Python-Stub, `dependencies = []` | Noch nichts zu hosten |
| **Nostr-Anbindung** | `apps/web/src/net/nostr.ts` | Browser verbindet direkt zu öffentlichen Relays (`wss://relay.damus.io` u.a.) | **Extern, hosten wir nicht** |
| Boltz / LNbits / Bitcoin-Timelock | — | Nicht implementiert | Nichts zu hosten |

**Client → Backend-Kopplung:** Der Client ruft das Backend **ausschließlich** für
`/api/podcasts/*` auf (Media-Player). Vite proxyt im Dev `/api` → `localhost:8787`.
Die 3D-Welt selbst läuft **rein im Browser** und funktioniert auch ohne den Proxy —
nur die Podcast-Suche im Media-Player bleibt dann tot.

---

## 2. Das eigentliche Hosting-Problem: die Assets (1,1 GB)

- `apps/web/public` ist primär wegen der Avatar-Rohpakete groß: **996 MB Avatare** (`public/avatar/`). Das stumme Runtime-`intro.mp4` ist auf ca. **3,3 MB** reduziert.
- `public/avatar/` und `public/feeds/` sind **`.gitignore`-d** → nur 11 Dateien aus `public/`
  liegen im Git. Die Avatar-Packs (CC0 Quaternius/VRM/FBX) werden lokal „reingedroppt", nicht
  committet.
- **Konsequenz:** Wer auch immer deployt, muss diese Assets vor `pnpm build` lokal vorliegen
  haben (sie werden in `dist/` kopiert), **oder** sie auf ein CDN auslagern (Tier 1 in ADR 0001).
  Für einen schlanken Demo-Build sollte zuerst geprüft werden, welche Avatare wirklich gebraucht
  werden — die 280-MB-`Modular`- und 52-MB-`Ultimate`-Packs sind vermutlich Rohmaterial, nicht
  Laufzeit-Assets.

---

## 3. Minimal-Setup für die spielbare Demo (heutiger Stand)

1. **Build-Maschine (einmalig / CI)** — Node ≥ 20, `corepack enable` (pnpm 9):
   `pnpm install` → `pnpm --filter @600b/web build` → statisches `dist/`.
   Voraussetzung: Avatar-/Feed-Assets liegen unter `apps/web/public/`.
2. **Statisches Hosting (Tier 0/1)** — `dist/` ausliefern. Wegen 1 GB Assets idealerweise mit CDN.
3. **API-Proxy (Tier 2)** — Node-Prozess `apps/server` (Port via `PORT`) für `/api/podcasts/*`.
   Optional für die Demo; nötig, sobald der Media-Player live Podcasts suchen soll.
4. **Reverse-Proxy / Routing** — `/api/*` → Node-Server, alles andere → statisches `dist/`,
   damit der Client same-origin bleibt (kein CORS).

### Empfohlenes Setup (öffentlich im Internet, eigener VPS)

Ein **einzelner kleiner Linux-VPS** trägt alles — passt zu „boring on purpose / one app,
one worker, one DB" und FOSS-first. Topologie auf der Box:

```
Internet ──HTTPS──▶ Caddy (Port 443, Auto-TLS via Let's Encrypt)
                      ├─ /            → statische Dateien aus apps/web/dist/   (Tier 0/1)
                      └─ /api/*       → reverse_proxy 127.0.0.1:8787           (Tier 2)
                                          └─ Node-Prozess apps/server (systemd, nur localhost)
```

**VPS-Eckdaten:** Debian/Ubuntu, 2 vCPU / 2–4 GB RAM, **≥ 15 GB Disk** (1,1 GB Assets +
Build + OS-Reserve). Firewall: nur 80/443 offen; der Node-Server lauscht nur auf `127.0.0.1`.

**Komponenten, die aufgesetzt werden:**

1. **Runtime:** Node ≥ 20 (NodeSource/nvm), `corepack enable` → pnpm 9. (Python für
   den world-agent erst nötig, wenn er gebaut ist — heute überspringen.)
2. **Code + Assets:** Repo klonen (`github.com/600-000-000-000/PalaceOfCulture`). Die
   ge-gitignore-ten Assets **separat** auf den VPS bringen (z. B. `rsync` von deiner Box) nach
   `apps/web/public/avatar/` und `apps/web/public/feeds/` — sie sind **nicht** im Git.
3. **Build:** `pnpm install && pnpm --filter @600b/web build` → `apps/web/dist/`.
   Server: `pnpm --filter @600b/server build` (oder per `tsx` direkt fahren).
4. **Webserver/TLS:** **Caddy** (empfohlen — eine Config-Zeile, Auto-HTTPS) als public
   reverse proxy; Alternative: nginx + certbot. Statisches `dist/` als Root, `/api/*` →
   `127.0.0.1:8787`. Gzip/Brotli + lange Cache-Header für die content-gehashten Assets.
5. **Prozess-Management:** `apps/server` als **systemd-Service** (`PORT=8787`, Restart=always),
   sodass der API-Proxy nach Reboot wieder läuft. (Alternative: pm2 oder docker-compose mit zwei
   Services caddy+node für reproduzierbare Deploys.)
6. **DNS:** A/AAAA-Record einer (Sub-)Domain auf die VPS-IP; Caddy zieht das Zertifikat dann
   automatisch.

**Vor dem ersten Build empfohlen:** Asset-Ordner ausmisten — die 280-MB-`Modular`- und
52-MB-`Ultimate`-Packs sind mutmaßlich Quaternius-Rohmaterial, keine Laufzeit-Assets. Nur die
tatsächlich von `apps/web/src/scene/avatarImports.ts` referenzierten GLB/VRM ausliefern; das
drückt den Transfer und die `dist/`-Größe erheblich.

**Bewusst (noch) NICHT gehostet, weil im Code nicht real:** Multiplayer/Realtime (Colyseus/Yjs),
DB/Eventlog (SQLite→Postgres), Ownership-Chain, Timelock/Boltz/LNbits, world-agent. Sobald
diese aus dem Gerüst-Status kommen, kommen DB + Reconcile-Worker + Python-Service als weitere
systemd-Units auf dieselbe Box (Tier 2/3 aus ADR 0001) — der VPS ist dafür schon der richtige Ort.

---

## 4. Vollständiges Multiplayer-Hosting nach Architektur (Ziel-Topologie)

> **Realitäts-Check:** Der Code für Realtime, DB, Ownership-Chain, Timelock und world-agent
> existiert noch nicht (README: „not built yet"). Diese Liste ist die **Provisionierungs-Spec**
> nach ADR 0001 / BUILD-BRIEF §2 — was bereitstehen muss, damit der volle Loop läuft. Infra
> ohne implementierten Code = leere Server; das hier wächst **parallel** zum Feature-Bau
> (Reihenfolge = BUILD-BRIEF §6-Backlog).

### A · Multiplayer-Realtime-Kern (das eigentliche „mehrere Spieler in einer Welt")
Auf dem Truth-VPS (Tier 2, Node ≥ 20):
- **Colyseus** WS-Server (autoritative Bewegung/Presence) — Deps `@colyseus/core` + `colyseus`
  sind da. Braucht **WebSocket-Upgrade** im Proxy (Caddy macht das automatisch). Bei >1 Prozess:
  Sticky Sessions + `@colyseus/redis-presence`/`-driver`. **PoC = 1 Prozess, kein Redis nötig.**
- **Yjs** CRDT persistent shared state (`yjs` ist Dep). **Persistenz** nötig (y-leveldb auf Disk
  oder in Postgres) — sonst ist Welt-State nach Reboot weg.
- **Fastify** REST-API + **State Machine** + **append-only Eventlog**.
- **DB:** für echte Multiplayer-Persistenz **Postgres** (SQLite reicht für Single-Box-PoC, aber
  concurrent writes/Realtime → Postgres; Eventlog append-only).
- **Proxy:** Caddy — `/` → static `dist/`, `/api/*` → Fastify, WS-Route → Colyseus-Port.

→ Das ist „Multiplayer läuft" **ohne Bitcoin**: VPS + Node + Postgres + Caddy.

### B · Wertschicht / Timelock-Ökonomie (Objekte aus echten Locks)
Externe Adapter (Tier 4) — bereitstellen **oder** an öffentliche Dienste anbinden:

| Dienst | Wofür | Self-hosted | Schlank: öffentlich nutzen |
|---|---|---|---|
| **bitcoind (signet)** | Timelock-Backing, Chain-Reconcile | `bitcoind -signet` + ggf. `electrs`/esplora für indizierte Abfragen | öffentl. signet Esplora/mempool API |
| **Lightning-Node (LND/CLN, signet)** | backt LNbits | lnd/cln auf signet | — |
| **LNbits** | Sats-Ökonomie (Skins/Tips/Fees) | LNbits-Instanz an die LN-Node | hosted Demo-LNbits |
| **Boltz** | Swaps/Funding der Locks | Boltz-Backend (braucht LND+bitcoind; v0.5 **ohne** Liquid) | öffentl. Boltz API (testnet/signet) |
| **Nostr-Relay** | Objekt-/Identitäts-Layer, Seal, Chat | strfry / nostr-rs-relay | öffentl. Relays (schon im Client) |
| **Signal-/Fee-Quellen** | mempool/price/hashrate (auch für world-agent) | mempool self-host | öffentl. APIs |

**Reconcile-Worker (Pflicht laut infra-README):** scheduled Job auf Tier 2, gleicht App-State
gegen Chain/LN/Relay ab; Provider-Webhooks **roh** speichern. Eigene systemd-Unit neben dem App-Prozess.
**Non-custodial-Invariante:** server-unabhängiger Claim-Pfad muss funktionieren — Keys/Seal liegen
im Browser (Tier 0), nicht auf dem Server.

### C · world-agent (Tier 3, Python)
Separater Prozess (gleiche oder eigene Box). Liest BTC- + Nostr-Signale → **Proposals auf eine
Queue** (Redis/NATS) → App konsumiert, entscheidet deterministisch, loggt. Queue muss existieren
(Redis bietet sich an, da auch für Colyseus-Scaling nützlich). Runtime: uv + Python ≥ 3.12.
Niemals Schreibpfad in die Truth-Core — nur Queue/API.

### D · Tier 1 — Assets / CDN
Content-gehashte GLB/VRM + JSON-Manifest + Map-Daten (Natural Earth GeoJSON / OSM). Self-host:
MinIO oder Caddy mit langen Cache-Headern; optional echtes CDN davor. Immutable → trivial cachebar.

### Empfohlene Box-Aufteilung (self-hosted, öffentlich)
- **Option 1 — eine Box (PoC/signet):** größerer VPS (≈ 4 vCPU / 8 GB RAM / ≥ 40 GB Disk):
  Caddy + Node(App+Colyseus+Worker) + Postgres + Redis + Python world-agent + bitcoind(signet)
  + lnd + LNbits + nostr-relay. Für eine signet-Demo ausreichend.
- **Option 2 — zwei Boxen (sauberer, empfohlen):**
  - Box **„truth"**: Caddy + Node + Postgres + Redis + world-agent + static. Einziger öffentlicher Ingress.
  - Box **„bitcoin"**: bitcoind(signet) + lnd + LNbits + Boltz + nostr-relay — die wartungs-/
    ressourcenintensive Hälfte, getrennt zum Schutz der Truth-Tier.
  - Verbindung über **Tailscale**; nach außen nur Caddy auf „truth".

### Phasen-Reihenfolge des Hostings (folgt BUILD-BRIEF §6)
1. **A** öffentlich live (Realtime + Postgres + Caddy) → echtes Multiplayer.
2. Nostr-Relay anbinden (Objekt/Identität/Chat).
3. signet + LN + LNbits + Boltz → erster Timelock-Flow (Objekt geboren), Webhooks roh.
4. Reconcile-Worker (Pflicht) scharf schalten.
5. Redis-Queue + Python world-agent (Proposals).

Jede Phase ist für sich hostbar und testbar.

---

## 5. Verifikation

**Heutiger Stand (PoC):**
- `pnpm install && pnpm --filter @600b/web build` läuft fehlerfrei, `dist/` entsteht.
- `pnpm dev:server` → `curl http://localhost:8787/api/health` gibt `ok`.
- Im Browser: Intro-Video lädt, Start-Flow, begehbares 3D-Palace; Avatare laden ohne 404.
- Media-Player: Podcast-Suche liefert Ergebnisse (nur mit laufendem Proxy + `/api`-Routing).

**Für die volle Multiplayer-Topologie (sobald gebaut):**
- WS-Handshake gegen die Colyseus-Route erfolgreich (Caddy-Upgrade); zwei Browser sehen sich bewegen.
- Postgres erreichbar, Eventlog wächst append-only; Welt-State überlebt einen Server-Reboot (Yjs-Persistenz).
- signet: ein Test-Lock erzeugt ein Objekt; `bitcoin-cli -signet` bestätigt die TX; Reconcile-Job
  gleicht ab; server-unabhängiger Claim-Pfad funktioniert ohne unsere Server.
- world-agent legt ein Proposal auf die Queue; App konsumiert + loggt deterministisch (kein direkter Schreibpfad).
