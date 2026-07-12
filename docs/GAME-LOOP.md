# The Loop — how 600 Billion becomes the next WoW

*Design doc, 2026-07-12. Product of a five-lens design tournament (appointment-games,
MMO-social, low-time-preference, ethical-habit, live-ops) judged for social pull, LTP purity,
feasibility, ethics and ambition. Winning spine: the **ethical-habit** proposal ("The Patience
Engine"), with mandatory grafts from the other four and sixteen explicit vetoes. Companion to
[HOME-TOWN.md](HOME-TOWN.md); grounded in `apps/web/src/builder/{catalog,economy,store}.ts`,
`frontend/growth.ts`, `scene/timelockAssets.ts`, `net/social.ts`, `PalaceRoom.ts`. Research
citations in the appendix.*

**Design law, restated as psychology: every retention mechanic runs on ANTICIPATION (savoring
a known future), never ANXIETY (fearing a loss). Every timer is deterministic and visible.
Nothing decays. Absence compounds instead of punishing. That refusal is the brand.**

WoW retained people for decades through guild bonds *despite* punishing systems (lockouts,
dailies, attendance). We keep the bonds and delete the punishment. The audit test applied to
every mechanic below: **"delete the clock"** — if a player checks in weekly instead of daily,
does anything punish them? If yes, the mechanic is redesigned or cut.

---

## The one-sentence loop

> You queue something worth waiting for, close the tab and live your life; the town grows,
> ages and fills while you're gone — and every return is a homecoming, every Sunday a
> reunion, every maturity a ceremony your friends witnessed.

Absence produces content; presence produces memory. The only thing you can't get
asynchronously is *each other* — which is why you come to the Palace.

---

## Cadence pyramid

| Layer | Mechanic | Emotion | Social hook |
|---|---|---|---|
| **MINUTE** (5–20 min session) | Boot → offline catch-up fires (existing `last_tick` replay) → a companion delivers the **Hearth Report**: "while you were away: 2 crafts finished, the fountain arrived twice, your kiln turned 1 year old." Harvest glance, place/absorb one thing, walk the HQ, zap 21 sats at a note. | **Homecoming.** "The kettle was already on." | Colyseus presence (faces within 40 m, not dots) + one v4v gesture. Sessions end naturally when the queue is full — there is deliberately nothing else to do. |
| **DAY** | ~21.6 wood / 10.8 stone arrived whether or not you did. One queue decision ("what do I want to be waiting for?"), check the move-in condition, read the signal. Under two minutes of mandatory content. **No daily ritual mechanic exists — by design.** | **Tending.** "I am someone who tends my town" — identity, not obligation. | The signal feed, one whisper. The daily act is checking on something alive, not claiming a bonus. |
| **WEEK** | The **Sunday Bell** rings (weekly, fixed hour, 60-min window, **48 h echo** — the game's ONE synchronous appointment). A sawbench/kiln (2.1 d) or lantern (8.75 d) completes. | **Belonging + anticipation.** You know exactly what next Sunday holds. | The bell gathering in the HQ; attendance mints a **Bell Tile** (cosmetic datestone, identical next week — never scarcer). Ten bell tiles in a wall = "this person shows up," legible to every visitor. |
| **MONTH** | A stool (21 d) lands; a building crosses an age tier and gains patina + output; an inhabitant's sustain milestone passes; the guild monument's completion date gets closer. **Moon Night** (every 4,320 blocks) on the block calendar. | **Pride.** The skyline is measurably older than a newcomer's. | Friends visit your town, leave **postcards**; guild plaque readings at Moon Night. |
| **YEAR+** | Timelock tiers mature: 21 D tile → 210 D car → 21-month tree → the 21-year rocket in the fog (`growth.ts` stages exist). Each maturity is a scheduled, board-visible **Unsealing** ceremony. The **Halving** is a pre-scheduled cosmetic festival season — the longest anticipation arc in gaming, and the mempool is the countdown. | **Legend.** Earned, never for sale — the town IS the player's lock history. | **Witnessing:** your friends were literally there when your tree matured, their npubs on its plaque forever. That memory is the retention mechanic no battle pass can buy. |

The pyramid's arc: the minute is homecoming, the day is tending, the week is reunion, the
month is pride, the year is legend — and every layer up, the harvest gets more communal.

---

## New mechanics

All data-first; drip stays the single knob (`DRIP_PER_MINUTE`), and only placed, aging
buildings and earned inhabitants may multiply it — both capped.

### M1 — Building Age ("patina lines") — extends: blueprint + `dripRate()` specialty
Add `placed_at` to blueprint entries (`{id, cell, rot_y, placed_at}` in `store.ts` HomeData;
migration default `placed_at = now`). The specialty multiplier steps with age:

| Age placed | Multiplier | Visual |
|---|---|---|
| 0–6 months | ×1.5 (current) | raw |
| 6–12 months | ×1.65 | first moss |
| 12–18 months | ×1.8 | weathering |
| 18–24 months | ×1.95 | ornament |
| ≥ 24 months | **×2.1 (hard cap)** | golden line |

**Absorbing resets `placed_at`** — moving a kiln costs only time, and time is the currency.
Age accrues offline (wall-clock arithmetic through `setSpecialtyContext`, so catch-up drip
stays honest). **Never decays.** The ×2.1 cap bounds veteran advantage: a 10-year player
out-drips a day-one player by at most 2.1×. Patina renders via the same static-stage pattern
as `growth.ts` (art may lag the multiplier; ship the number first).

### M2 — The Hearth Report — extends: `loadBuilderAudit()` (zero new state)
On boot, one card synthesized from the existing audit streams (`builder:economy`,
`builder:home:*`) plus offline catch-up results. Max 5 lines, one-click dismiss, **never a
claim button** — the report *tells* you what already happened; it gates nothing. Once
inhabitants exist (M3), the report is delivered in-character by a companion, not a UI card.

### M3 — The Inhabitant Ladder — extends: `MOVE_IN_REWARD_ID` → condition table
Generalize the single-reward move-in into a table in `economy.ts`:

| Arrival | Condition | Sustain (wall clock, never timescaled) | Cap |
|---|---|---|---|
| Fountain | ≥9 blocks + lantern (current) | 24 h (current) | repeatable |
| racooDNI companion | fountain placed + ≥21 blocks | 7 d | 1 |
| Second inhabitant | racooDNI + ≥2 specialty buildings aged ≥90 d | 21 d | 1 |
| Further companions | prior inhabitant + next age tier reached | 63 d each | 5 total |

Each inhabitant walks the town, greets you by handle, narrates the Hearth Report, and adds
×1.05 to one drip (routed through `specialty`; total inhabitant bonus capped at +10%). The
existing while-loop catch-up means a 3-month absence *delivers arrivals in a batch on
return* — the best welcome-back screen in gaming. **Inhabitants arrive by sustain timers
only** — never gated on visitors, signatures, or any social throughput (vetoed: popularity
gates punish the friendless newcomer the game most needs).

**Delete `craft_fountain` (the 42-day recipe) — one line in `catalog.ts`.** The fountain is
attracts-only; the first inhabitant-class object is earned by tending, never manufactured,
or the whole ladder reads as a shop with extra steps. Saves drop removed recipes silently.

### M4 — The Bell & the Block Calendar — extends: events board (mock → real), `PalaceRoom`
Replace the mock `feeds[].events` with NIP-52 calendar events published by the `hqPalace`
entity. Two layers:

- **Sunday Bell** — weekly, fixed hour, 60-min gathering in the existing single global
  Colyseus room. Warm lighting shift, one broadcast message type. Attendance mints a **Bell
  Tile**: a cosmetic `block_*` variant stamped with the date, placeable in your town.
  **Next week's tile is identical in kind — dates may differ, scarcity may not.** A **48 h
  echo** (replayable ambience + tile still mintable) means a missed Sunday costs literally
  nothing. Zero material reward, ever. This is the game's ONE appointment; **no daily
  synchronous anchor exists** (vetoed: even reward-free daily gatherings train guilt and
  exclude timezones).
- **The Block Calendar** — the server tracks block height and emits deterministic,
  computable-forever festivals: **Market Day** every 2,016 blocks (~2 weeks, difficulty
  epoch) and **Moon Night** every 4,320 blocks (~monthly), each a 2.1 h window; the
  **Halving** (~4 years) opens a 21-day cosmetic festival season — banner year, halving-
  stamped tiles, and the rocket in the fog fires its engines once. **All festivals are
  cosmetic-only. No drip wind, no multiplier, no economic effect of any kind** (vetoed:
  calendar-timed windfalls are the foundational LTP erosion — they create the first reason
  to feel bad about WHEN you played). Attendance yields nothing but people.

### M5 — Postcards & Witnessing — extends: shared towns (read-only visits) + `packages/ownership`
When friend visits ship (HOME-TOWN roadmap #4):

- **Postcards:** a visitor may leave one signed kind-1 note per visit, tagged to the home's
  blueprint hash. **Cap 21 displayed** on the fountain; overflow scrolls to a never-deleted
  archive book (the archive itself becomes a chronicle object). Every visit becomes a
  persistent artifact.
- **Witnessing:** every timelock maturity and every craft ≥21 days auto-schedules an
  **Unsealing** at the next Bell/Market Day — visible on the events board from day one (a
  21-month tree's ceremony is announced 639 days out). Friends present within 3 m sign as
  witnesses; their npubs append to the object's blueprint entry, **cap 21, zero buff,
  forever**. Ceremonies use the scheduled-plus-48h-echo shape, **never a one-shot window**
  (vetoed: a permanent plaque deficit caused by a one-day window is a FOMO scar).
  Unsealings ship only after the real timelock flow exists (vetoed: faking maturities is
  the same fabricated-authenticity dark pattern we cut below).

The legendwall (currently mock) becomes the real ledger of ceremonies, **ordered by lock
AGE, never by amount** — a 21-year lock of 21,000 sats outranks a 21-month whole-coin lock.
Status axis = time, structurally immune to wealth.

---

## Player-made guilds — the shared-economy design

A guild = **NIP-29 group** (chat plumbing per ADR 0002) + an entity npub (the `entities.ts`
pattern) + a **commons parcel** with one monument craft at a time.

**The Monument.** Guild-scale recipes on the same sequential-queue logic, e.g. Bell Tower =
2,100 stone + 630 boards, **210 days wall time starting when materials are complete**. Once
funded, **no amount of activity accelerates it and no headcount can fail it** — wall time,
not contribution rate, gates completion (vetoed: contributor-count thresholds with deadlines
are obligation and anxiety by construction; they turn guilds into recruiting funnels). If a
guild cancels a craft, every contribution returns via the existing `returnObject` semantics —
the no-loss guarantee applies to every communal mechanic.

**Gifts, not dues.** Contributions are one-way material gifts from personal drip surplus.
Each gift is a **signed revision on the monument's ownership chain** (`packages/ownership` —
the tested chain-of-custody primitive, not a new ledger). The plaque is **chronological,
never sorted by amount, never ranked**; the UI shows only the collective progress bar, while
individual gifts stay verifiable in the audit log. No tithe settings, no quotas, no
percentage drips (vetoed: a standing contribution setting converts gifts into dues and
invites "we're behind, raise your tithe" pressure).

**No sats treasury in v0.** An officer-spendable pooled wallet violates the non-custodial
spirit and invites rug drama (vetoed). Guild pooling is **materials-only** until the v1
design exists: a guild treasury as *standing individual co-signed timelocks* — everyone's
own locks standing together, so a guild collapse never takes anyone's money.

**Guild standing = the age of its monuments** (M1's `placed_at` applied to the commons),
never member activity. Prestige accrues while everyone sleeps — structurally immune to
attendance quotas. A member who vanishes for six months returns to find the Arch
three-quarters built: the guild *waited for them*. Progress-in-absence reads as a gift, not
a debt. Leaving removes nothing; pledges stay on the plaque forever.

Why this retains (see appendix): guild involvement is the strongest churn reducer measured
in WoW (88% of unguilded players had quit vs 71% of guild officers), small guilds of
pre-existing friends carry the strongest bonds, and shared *economic* participation — not
mere co-presence — is what made MMO communities outlast social-game audiences. The monument
is shared economic participation with the obligation channel physically removed.

---

## The ethics bar (what we refuse to build — stated as product marketing)

Ship **"The Refusals"** as a signed, versioned in-game page (ADR-style), linked from the
title screen. The anti-FOMO claim made verifiable — and the marketing story:

1. **No streaks, no daily quests, no login rewards** — in any costume. The drip pays whether
   you show up or not. No lifetime check-in counters with reward ladders either (a
   21/210/2,100-vigil cosmetic ladder is a login streak wearing robes — vetoed). Nothing may
   reward presence *frequency*; only elapsed calendar time and placed objects may earn.
2. **Nothing expires, nothing decays, no upkeep, no weeds — ever.** The anti-decay covenant:
   an untouched town ages *beautifully* (patina), so a lapsed player returns to more value,
   never shame. Every event echoes; every keepsake recurs.
3. **No pay-to-skip, no boosters, no time-limited multipliers.** Money buys style; time
   builds legend. `DRIP_PER_MINUTE` is the single knob and no festival, item or payment
   touches it.
4. **No retention notifications.** The game never calls you back. Your calendar of good news
   is reason enough.
5. **No fabricated social proof.** Remove or visibly badge every simulation of other humans
   **before any social loop ships**: the scripted NPC chat lines, the fake online dots in
   `circleFriends`, the mock Nostr feed fallback (badge: "demo signal"), the decorative
   "ENCRYPTED" rail label. An honest quiet town creates the real pull — inviting friends.
   Ambient NPC flavor is fine only when visibly non-human (inhabitants greet as characters,
   not fake players).
6. **No leaderboards ranked by wealth or activity.** The only comparison surfaces are
   visitable towns, plaques, and the age-ordered legendwall — inputs are calendar time,
   identical for every human, un-gameable.

Why this is still habit-forming: the trigger is internal curiosity ("what arrived at my
hearth?"), the reward is *anticipated, not variable* — every timer is deterministic with a
visible end date (the savoring literature: anticipation of a certain reward yields sustained
positive utility; slot-machine variance yields compulsion) — and the investment compounds
(buildings age, locks mature, plaques accumulate). At any moment the player holds 3–5
concrete future dates: next craft, next arrival, next age tier, next Bell, next maturity.
Return triggers are positive predictions, never loss aversion. The worst outcome of not
playing 600 Billion is arriving late to a party that saved you a seat.

---

## Build order (smallest shippable slice first)

| Phase | Ships | Files / systems |
|---|---|---|
| **0. Honesty pass** (days) | Delete `craft_fountain`; badge/remove fake liveliness (scripted chat, presence dots, mock-feed badge); publish The Refusals page. | `builder/catalog.ts`, `net/social.ts` / chat mocks, `frontend/*`, one static page |
| **1. Age lines** (data-only) | `placed_at` in blueprint + stepped multiplier + absorb-resets. Patina art can lag. | `builder/store.ts` (HomeData migration), `builder/economy.ts` (`dripRate`), BuildSystem `setSpecialtyContext` |
| **2. Hearth Report** | Boot card from audit streams; offline-diff narration. | `audit/` + `loadBuilderAudit()`, one frontend card |
| **3. Inhabitant ladder** | Condition table, racooDNI first; companions deliver the report. | `builder/economy.ts` (`checkMoveIn` → table), scene ambient walkers |
| **4. The Bell** | Events board real (NIP-52), Sunday Bell in `PalaceRoom`, Bell Tiles, 48 h echo; block-height feed → Market Day / Moon Night (cosmetic). | `frontend/data.ts` de-mock, `net/social.ts`, `apps/server` block feed, one room message type |
| **5. Visits + postcards + witnessing** | Read-only town visits over the server blueprint; postcards (cap 21 + archive); witness signatures on blueprint entries. | HOME-TOWN roadmap #4 server work, blueprint schema `witnesses: npub[]`, `packages/ownership` habits |
| **6. Guilds v0** | NIP-29 group + commons parcel + materials-only monument queue + chronological plaque (ownership revisions). | `apps/server` (guild EconomyState + audited writes), ADR 0002 chat swap |
| **7. Unsealings** (gated on the real timelock flow, BUILD-BRIEF §6 #11) | Maturity ceremonies auto-scheduled from lock dates; age-ordered legendwall. | `growth.ts`, `timelockAssets.ts`, events board, NIP-57 zaps |

Each phase is independently shippable and testable; nothing in 0–6 depends on Bitcoin.

---

## Open design risks

1. **Goal-pipeline exhaustion.** The measured failure mode of waiting-based loops: when
   month/year-scale goals run out, daily tending stops building toward anything and play
   collapses. The catalog needs a standing pipeline of long-horizon recipes and the guild
   monument ladder must always have a next tier. Owner: catalog design, every quarter.
2. **Newcomer purposelessness.** Open social worlds without early structure retain very few
   newcomers (~20% would be a *high* stay rate on VRChat, per one study). The first 21 days
   need a light scripted arc — first block, first craft, first Bell, first visit — without
   ever becoming a daily-quest system. The Community-Passport-style bridge (visit hubs,
   attend one Bell) is the researched shape.
3. **Social-departure churn.** Socially-motivated players stay longest but leave when their
   friends leave. Mitigation is structural: monuments and plaques make guilds hold members'
   *artifacts*, and the Hearth Report makes returning painless. Watch guild-collapse
   cascades once guilds exist (~21%/month guild disappearance in WoW).
4. **Sybil pressure on social keepsakes.** Postcards and witness signatures are only as real
   as key verification; with demo keys they are trivially fakeable. Keepsakes must stay
   zero-buff (they already are), and real NIP-05/lock-backed identity should precede any
   social surface that confers status.
5. **Drip-vs-recipe balance.** ~21.6 wood/day against a 2,100-wood monument means a 3-member
   guild funds it in ~33 days, a soloist in ~97. The numbers above are first-pass; a small
   simulation (spreadsheet is enough) should validate every recipe against solo/small/large
   cohorts before Phase 6.
6. **The fixed Bell hour.** One weekly UTC hour structurally favors some timezones. The 48 h
   echo removes the cost, but if attendance data shows regional exclusion, rotate the hour
   seasonally rather than adding a second bell (one appointment is the law).

---

## Appendix — research notes

*From the parallel deep-research pass (24 sources fetched, 119 claims extracted). The
adversarial verification stage was rate-limited, so these are **source-extracted but not
independently verified** — treat as strong leads with citations, not established fact.*

- Idle/incremental games show exceptionally high retention vs other genres; the genre's
  definition is progress-while-away, and its pull is the loop structure, not content
  (Pecorella, GDC 2015/2016 — gdcvault.com/play/1022065, "Quest for Progress" GDC Europe 2016).
- Capping offline earnings is a churn-causing anti-pattern (Egg Inc.'s 2 h cap cited as the
  reason a designer quit) — reward absence generously (ibid.). *Our while-loop catch-up
  already complies; keep it sacred.*
- Animal Crossing: NH's temporal design (daily drip + overnight-only changes) produces
  short regular sessions and *affective attachment through the ritual of return itself*;
  the mechanism is "progress simulation" — small in-session tasks visibly accumulating
  toward large time-gated goals, deliberately freeing the player to live their life
  (CHI PLAY companion study, dl.acm.org/doi/10.1145/3641237.3691689).
- The measured failure mode: **major-goal exhaustion** collapses the loop (ibid.) → risk #1.
- Guild social architecture is designable: mechanics determine group size, cohesion and
  roles. Small guilds (<10) hold the strongest bonds; ~75% founded by real-life
  friends/family; ~35 members is the threshold where formal management becomes mandatory;
  ~21% of guilds disappear within a month (Williams et al., "From Tree House to Barracks").
- WoW works as an Oldenburg third place — sociability over gameplay; formally structured
  guilds feel MORE social; the authors call for built-in guild infrastructure (ibid.).
- Churn falls monotonically with guild involvement (88% unguilded / 79% members / 71%
  officers had quit at some point); playing with real-life connections is among the
  strongest retention factors (75% did); social motivation predicts longevity better than
  achievement — but social players churn together ("If You Build It They Might Stay").
- MMO communities outlasted Facebook-game audiences because of **shared economic
  participation**, not mere persistent presence; gift cycles (Mauss: give–receive–
  reciprocate) and rituals (ceremonies at role transitions, holidays, gatherings, gifts)
  are load-bearing multiplayer mechanics (Koster, "Social Mechanics").
- Open social worlds without objectives lose most newcomers; survivors describe a pivotal
  social moment (mentor, becoming a regular). Recommendation: intentional bridging —
  newcomer events, mentorship, lightweight visit/attend objectives (arxiv 2603.25223).
- Dark-pattern definition requires intent + harm + lack of consent jointly — a transparent,
  consented waiting mechanic is NOT inherently dark (Zagal et al., FDG 2013). *The Refusals
  page is how we keep the consent leg load-bearing.*
