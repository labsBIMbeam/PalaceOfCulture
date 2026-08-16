# Option B — Auslieferung über nsite + FIPS-Mesh

Stand 2026-08-16. Ergänzt [`HOSTING.md`](HOSTING.md) §3: **Weg A** (Default) ist zapburg.com
auf der Hetzner-Box (`G:\projekte\HetzerDeploy\zapburg\RUNBOOK.md`). **Weg B** liefert dieselbe
statische Web-App über [nsite](https://nsite.run/) aus (Nostr kind-34128-Pfad-Mapping + Blobs
auf Blossom) und erreicht den Spielserver wahlweise über das Internet oder das FIPS-Mesh.

Es bleibt bei **einem Bundle und einem Spielserver**: nsite ändert nur, *wer die Statik
serviert*. Die Wahrheit (Room-State, Audit-Log, Raid-Zähler) lebt weiter ausschließlich im
`apps/server`-Prozess — egal über welchen Weg ein Client ihn erreicht.

## Wie der Client den Spielserver findet (Laufzeit, nicht Build)

Ein nsite-Gateway hat kein Same-Origin-Backend, deshalb ist die Server-Wahl seit diesem
Branch ein Laufzeit-Seam (`apps/web/src/net/multiplayer.ts`):

1. **`?server=` in der URL** — höchste Priorität, exakt dieselbe Validierung wie die gebackene
   URL: nur HTTP(S), keine Credentials, von einer HTTPS-Seite aus kein Plaintext-Downgrade —
   **außer zu Loopback** (`localhost`, `127.0.0.1`, `[::1]`), denn Browser behandeln Loopback
   als potentially trustworthy. Genau dadurch geht der lokale FIPS-Port-Forward.
   Ein ungültiger oder feindlicher Wert wird verworfen und fällt auf den Default zurück —
   ein kaputter Link ist nie ein Denial-of-Service. Die Wahl steht sichtbar in der
   Adresszeile und wird nirgends persistiert.
2. **Gebackener Default** (`VITE_MULTIPLAYER_URL`) — für den nsite-Build immer
   `https://zapburg.com` setzen, damit die Seite ohne Parameter einfach funktioniert.
3. Dev-Fallback `http://127.0.0.1:2567`, Produktion hinter Caddy: Same-Origin.

Beispiele:

- `https://npub1….nsite.lol/` → spielt gegen zapburg.com (Default).
- `https://npub1….nsite.lol/?server=http://localhost:2567` → Spielserver durch einen lokalen
  FIPS-Forward (`fips fwd 2567 <mesh-host>` o. Ä.); Nostr geht ohnehin schon per Mesh-Probe
  über `ws://localhost:7777` (PR #16, `nostrConfig.ts`).
- LAN/Mesh-Seite über HTTP serviert → `?server=http://<mesh-host>:2567` ist erlaubt
  (kein Downgrade, die Seite ist selbst HTTP).

## nsite-Deploy (nsyte)

Einmalig auf deiner Maschine (`npx`/deno, Key bleibt bei dir — nie ins Repo, nie in den Chat):

```bash
cd apps/web
VITE_MULTIPLAYER_URL=https://zapburg.com VITE_DEMO=1 pnpm build
npx -y nsyte init   # interaktiv: Key/NIP-46-Bunker, Relays, Blossom-Server
```

Als Blossom-Server unseren eigenen zuerst, öffentliche als Redundanz; Relays wie in
`nostrConfig.ts`. Danach bei jedem Release:

```bash
npx -y nsyte deploy ./dist --fallback=/index.html
```

nsyte diff-t gegen den letzten Stand — der Erst-Upload trägt das ganze `dist/` (inkl. GLBs +
`intro.mp4`) auf die Blossom-Server, danach nur Änderungen. Sha256-adressierte Blobs sind
exakt unser Asset-Standard, das passt. Schwere Medien lassen sich per `.nsyte-ignore`
ausnehmen, dann fehlen sie aber auch auf dem nsite-Weg — nicht empfohlen.

## Server-Seite: die Gateway-Origin freischalten

Beide Allowlists sind deny-by-default. Auf der Box (`600b-server.service`) muss die exakte
nsite-Origin zusätzlich hinein, sonst endet jeder Join in `origin_not_allowed`:

```ini
Environment=MULTIPLAYER_ORIGINS=https://zapburg.com,https://palace.fips.network,https://npub1<dein-pubkey>.nsite.lol
Environment=CORS_ORIGINS=https://zapburg.com,https://palace.fips.network,https://npub1<dein-pubkey>.nsite.lol
```

`palace.fips.network` ist die bereits vorbereitete Zweitdomain derselben Box
(HetzerDeploy, konsolidiertes Paket) — der einfachste fips-Weg ganz ohne nsite:
gleiche Statik, gleicher Server, zweite Tür.

Eigener nsite-Resolver im Mesh (statt öffentlichem Gateway): `nsyte run` bzw. der
nsite-Resolver auf einem FIPS-Host — dann dessen Origin eintragen. Clients ohne Origin-Header
(native) bleiben wie bisher erlaubt.

## Was Weg B bewusst NICHT ändert

- Kein zweiter Spielserver, kein State-Fork: FIPS-Clients und zapburg-Clients treffen sich
  im selben Room, derselbe Raid-Zähler wächst.
- Keine stille Endpoint-Wahl: nur der sichtbare `?server=`-Parameter, kein Storage.
- Sats kaufen weiterhin nichts; die Transportfrage berührt keine Design-Gesetze.
