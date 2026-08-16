# Demo loop & Zaps light the street

Design session 2026-08-16 (FLX + Claude). Locks the three demo-loop decisions and anchors
the street game to the **600B Timelock TCG** (`G:\Github\TCG600nap`, Edition One rulebook),
which is the canonical lore source. Decisions here are FLX's; implementation notes are
scoped for the two weeks to the 2026-08-30 live demo.

> **The design law, in the TCG's own words:** *"Timelock delays the easy move to preserve
> the stronger move."* Sats never buy time. Light is never for sale.

## The thesis: Zaps light the street

Raid 01 is called *Light the Street*. The zap-on-meet mechanic ships. The street lives at
dusk under lamplight. These are one system:

**Every zap received makes light.** Value flowing between people is rendered as the world
getting brighter — nothing else in the world may brighten it. This is the TCG's **Signal**
affinity made physical: *"Signal makes people legible to one another without requiring a
central platform."*

## Lore anchor (TCG ↔ street)

| TCG (E1 rulebook) | Street / builder |
| --- | --- |
| **Zap** — "a fast one-time action… resolves once, then Archive" | The street zap: spontaneous, at-meet, resolves once; the NIP-57 receipt (9735) is the Archive |
| **Operation** — planned, Build phase only, via the Queue | The 21-numerology crafts in the craft **Queue** — planned, patient, worth the wait |
| **Uptime** | Raid step 1 is already labeled `ENTER uptime` — presence on the street is uptime |
| **Signal** affinity | Zap glow + nameplate — people made legible to each other |
| **Bitcoin** affinity — "patient verification into durable coordination" | Foundation growth from completed raids: communal work becomes durable architecture |
| **Timelock** affinity — "delays the easy move…" | The economy law: DRIP + craft times untouchable, no acceleration purchasable |
| Five resource moods | Set 1's five signature furniture pieces (block clock, node rack, antenna, solar, key cabinet) |

New street/builder features should reuse TCG vocabulary before inventing terms
(Queue, Archive, Uptime, Commit, the five affinities).

## Decision 1 — Zap receipt is visible (all three, FLX 2026-08-16)

Today a received zap is invisible to its receiver. Ship all three effects:

1. **Lantern glow** — the receiver's avatar/lantern glows visibly brighter for **21
   minutes**. Wearable, warm, seen by everyone near them.
2. **Street lamps brighten** — global lamplight intensity is a deterministic function of
   street-wide zap activity in the last **21 minutes** (e.g. `min(1, base + zaps * step)`).
   A quiet street is dusky; a zapping street turns golden. Literally: zaps light the street.
3. **⚡ counter on the nameplate** — session-scoped count of received zaps. Display caps
   at **"21+"**: status without a leaderboard arms race (soft Signal, not a scoreboard).

**Implementation note (honest MVP):** the demo zap pays the ROSTER identity (NIP-05 →
lud16); players don't hold those keys, so receiver clients cannot watch their own 9735
receipts. The light is therefore **presence-layer VFX**: the sender's client reports the
zap to the Colyseus room (new volatile message, rate-limited server-side, broadcast to
all), clients render glow/lamps/counter. It is cosmetic light, never owned state — "the
app owns the truth" is untouched, and a spoofed flash could only ever make the street
prettier. Real receipt-driven light (relay-subscribed 9735) comes when players hold their
own keys (NIP-07 onboarding, post-demo).

## Decision 2 — Day 2 hook: the move-in surprise (no new code)

The existing move-in attraction (≥9 blocks + a lantern, held 24 h wall-clock → a fountain
**moves in**) becomes the explicit day-2 story. The demo starter kit guarantees every
visitor can arm it in their first minutes.

- Demo-script line (beat 4/5): **"Bau heute dein Zuhause — morgen ist jemand
  eingezogen."** Presenter shows their own day-old plot with the fountain that arrived.
- The 21 h brick craft is the second, softer promise: "ready tomorrow, same time."
- Nostr-DM craft notifications: consciously **deferred** (competes with design time);
  candidate for the week after the demo.

## Decision 3 — The foundation grows on completed raids

The plaza foundation's growth progress advances **deterministically per completed raid
run** (a run that reaches CO-CREATE). Community work becomes architecture — the Bitcoin
affinity's "patient verification into durable coordination", auditable and replayable
from the event log. Zap volume explicitly does NOT drive growth (rejected: money must
not visibly accelerate world progress — it collides with the Timelock law).

- Growth function (initial): `progress = min(1, completedRaids / 210)` — 210 raids to a
  full stage, tune after the demo.
- For the stage demo: pre-seed `completedRaids` so one live raid visibly moves the
  foundation during the show.

## Implementation tickets (≈2–3 days total, leaves the rest for design)

1. `feat: zap light` — room message + server rate limit + glow material pulse on the
   receiving avatar + lamp intensity function + nameplate counter. (~1.5 days)
2. `feat: foundation grows on raid completions` — count in room/event log → growth
   progress into the existing growable loader. (~1 day)
3. Demo-script update: move-in beat + zap-light beat ("watch the lamps").

## The maxflex: play the TCG inside the RPG (napplet)

FLX, same session: *"am besten waere wenn man das TCG im RPG spielen kann im napplet."*
Feasibility-checked against `TCG600nap` — this is real, and the architecture shipped today:

- The TCG's **digital table is static web** (`site/arena.html` + `engine.js` 312 KB +
  `fx.js` 120 KB + `faces.js` 8 KB), and the **NPC opponent runs client-side** (rulebook:
  practice mode, "no standing, no stake, no signed transcript" — no server needed).
  → bundles into a single-file napplet (~450 KB) that boots in the sandbox.
- The **298 card faces (50 MB webp)** stream through the existing `resource.bytes`
  capability from Blossom (sha256-addressed, like everything else) — lazy per card drawn,
  ~170 KB each; a match touches a fraction of the pool.
- **In-world staging:** sit at a plaza table (pose points exist) → the table napplet
  opens → a practice match **against Kerni**, the street's NPC familiar, as dealer. The
  lore closes perfectly: the world's collectible game, played inside the world.
- **PvP later:** two players on facing seats → matchmake via the room; the referee
  (`server/table.js`, SQLite) reached through a host `tcg` domain — signed transcripts
  become real matches with standing.

**Scope call:** NOT in the 30.08. demo (the demo is full and the wow-beat is the zap).
First step is a **1-day spike right after the demo**: bundle arena+engine as a napplet,
load 10 faces via `resource.bytes`, play one NPC turn in the sandbox. If the spike holds,
the TCG table is the flagship second napplet and the Palace's first exhibit.

## Open design threads (next sessions)

- **Visitor zappability**: non-roster players (Builder archetype) can't RECEIVE zaps —
  post-demo: bring-your-own NIP-05/lud16 via NIP-07 onboarding.
- **Builder progression**: what Set-1 buildings unlock (habitat capabilities doc exists);
  Tier 0→1 during the 21-day set cadence.
- **Set 2 design**: pick the ~21 items, Meshy batch, an affinity-themed set?
- **The receiver's keepsake**: a zap is archived (receipt) — should the receiver's HOME
  gain a small trace (a spark in a jar?) — durable, personal, non-tradable.
