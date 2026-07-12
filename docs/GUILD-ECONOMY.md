# Guild economics on Nostr — flow, not pool

*Design note, 2026-07-12. Companion to [GAME-LOOP.md](GAME-LOOP.md) (guild design, Moon Night,
the vetoes) and [ADR 0004](adr/0004-media-value-live-open-standards.md) (NIP-53 + Podcasting 2.0
+ V4V rails). Constraint honored throughout: the design tournament's veto on pooled guild
custody — guild economics must work with **no spendable treasury**.*

**Thesis: Bitcoin proves the time, Nostr distributes the value.** Nostr's primitives turn the
guild economy from *pool-based* into *flow-based* — value streams through declared splits to
individual members in real time and never sits in anyone's custody. Communal economics without
communal custody; nobody can rug what never pools.

---

## The primitives (what each NIP does for a guild)

| Primitive | Guild use | Custody |
|---|---|---|
| **NIP-29 groups** | Membership, roles, guild chat — on a relay we can self-host (swarm, ADR 0005) | none (relay = transport) |
| **NIP-57 zap splits** | Revenue from guild content splits automatically: e.g. 70% performer / 25% guild members / 5% palace style-fee, declared **in the event itself** | none — payer's wallet pays each recipient directly |
| **PC2.0 `<podcast:value>`** | The guild as **media collective**: guild radio/music feeds declare per-member splits; streaming sats flow per-minute while people listen in the palace | none — same split mechanics |
| **NIP-75 zap goals** (kind 9041) | Public, relay-verifiable crowdfunding for guild *events* (book a performer, stage production) — transparent progress bar, every sat a signed public event | pays a named recipient; use for v4v spending only, never principal |
| **NIP-53 live events** (kind 30311 + 1311 chat) | Guild-hosted shows on the plaza stage; discovery across the whole Nostr/Fountain ecosystem via `liveItem` interop | none |
| **NIP-52 calendar** | Guild event booking — stage slots as signed calendar events by the guild entity | none |
| **NIP-58 badges** | Host/witness/founding-era honors — portable, **zero buff** (ethics bar) | none |
| **NIP-51 lists** | Guild-curated playlists and channels ("the new MTV" curation layer) | none |
| **`packages/ownership` revision chains** | Monument plaques: every material gift is a signed revision — chronological, never ranked | app-owned truth, publicly auditable |

**What stays forbidden (GAME-LOOP.md vetoes):** officer-spendable pooled wallets in any form
(LNbits sub-wallet, tithe pool); standing percentage tithes; contribution quotas or
member-count thresholds; leaderboards ranked by amount. Guild *material* pooling (drip surplus
→ monument) is the only pooling, and it is one-way gifts on an append-only plaque. The v1
"treasury" concept remains *standing individual co-signed timelocks* — everyone's own locks
standing together.

## The three guild revenue loops

1. **The show loop** (monthly+): guild hosts a stage event → boosts/zaps split live between
   performer, guild members, palace. The show gets better *because* the audience pays the
   artist — V4V as stagecraft. Boostagram rain rendered in the venue.
2. **The radio loop** (continuous): guild publishes a PC2.0 feed (curated music blocks, talk
   shows) with `<podcast:value>` splits across members. Plays in palace jukeboxes and every
   podcast app on earth. A guild with taste earns a royalty stream.
3. **The monument loop** (month/year-scale): material gifts → monument stages → guild prestige
   = **age of monuments, never member activity** (accrues while everyone sleeps).

All three are audited: plays, boosts, joins land in the append-only event log with mandatory
reconcile jobs against LN + relays (BUILD-BRIEF invariants; never trust-and-forget).

---

## The monthly live event — guaranteed, by the chain itself

**Law: at least one palace live event per month, forever, with a guild on stage.**

- **The anchor is Moon Night: every 4,320 blocks (~30 days), 2.1 h window** — computable from
  the chain for the next century, no ops calendar needed (GAME-LOOP.md M4). The block clock
  *is* the guarantee: the event cannot be forgotten, cancelled, or moved by anyone.
- **Programming = guild showcase.** Each Moon Night carries up to **6 stage slots × 21 min**.
  Any guild may book one slot per Moon Night (NIP-52 event signed by the guild entity,
  first-come on the events board). A guild that wants a monthly presence is structurally
  guaranteed one.
- **The stream is open**: each slot is a NIP-53 `kind:30311` live event (+ `kind:1311` chat in
  the existing ChatPanel, + HLS on the stage screen per ADR 0004) and publishes a PC2.0
  `liveItem` — Fountain, zap.stream and every Nostr client can tune in. The palace is the
  venue; the ecosystem is the audience.
- **Value**: the slot's zap/boost split is declared in the 30311 event — default
  70% performer / 25% guild / 5% palace (style-fee; money buys style). "25% guild" means an
  explicit member list in the split, not a wallet.
- **Ethics bar holds**: attendance yields nothing but people; the night leaves a **48 h echo**
  (replay + identical keepsake window); Moon Tiles recur identically — dates may differ,
  scarcity may not; no reward touches drip or progression, ever.
- Guild-run **Unsealings** (lock maturities) and monument-stage completions auto-schedule onto
  the nearest Moon Night — individual patience, harvested communally.

### Bootstrap (before player guilds exist)

Moon Night #1..n are hosted by the founding entity (`hqPalace`) by *tuning in* existing
NIP-53 streams (Tunestr concerts, Fountain lives) — zero exclusive content needed. The mock
"Strings of the Atlantic" event becomes the first real listing. Player guilds inherit the
slots as they form.

---

## Build order (extends GAME-LOOP.md phases 4/6)

1. **`net/live.ts`** (ADR 0004 adapter): subscribe NIP-53 kind 30311 → events board + stage
   screen (HLS video texture) + 1311 chat into ChatPanel + existing NIP-57 zap path. Proof:
   tune one real Tunestr/zap.stream event into the palace.
2. **Block clock on `apps/server`**: emit Moon Night (4,320 blocks) + Market Day (2,016) to
   the events board; NIP-52 publishing for slots.
3. **Zap-split rendering**: show the declared split on the stage UI ("this boost pays: …") —
   transparency is the product.
4. **Guilds v0** (NIP-29 + materials-only monuments + ownership-chain plaques) — per
   GAME-LOOP.md phase 6; slot booking gated on guild entity keys.
5. **Guild radio** (PC2.0 feed publishing with `<podcast:value>`) — after the media player's
   feed parser handles value blocks end-to-end.
6. **Broadcast-out**: palace ceremonies stream *out* via LiveKit RTMP egress → NIP-53 +
   `liveItem` (bidirectional MTV).

Open risks: NIP-53 relay support varies (pin the relay set, reconcile); zap-split honoring is
wallet-dependent (render the split, verify receipts in reconcile, surface discrepancies);
Sybil pressure on guild membership until NIP-05/lock-backed identity ships.
