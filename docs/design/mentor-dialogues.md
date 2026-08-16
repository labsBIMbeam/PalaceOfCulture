# Mentor crews — the whole join.600.wtf cast lives on the street

Design session 2026-08-16, part 3 (revised in-session per FLX: **crews, not solo
mentors**). The onboarding script for [`demo-mvp-plan.md`](demo-mvp-plan.md): the cast
stands in **five crews** at the five affinity stations. Per crew, ONE lead teaches
(4 lines); the others drop a single in-character comment — or stand silent (posed,
ambient). **All 31 members are in the world.** Kerni bridges to the TCG table.

Voice is the E1 lock: short, literal, playful, brave, never corporate. Teaching lines
are distilled from the TCG rulebook's affinity philosophy (§4) — the rulebook is canon,
the crews are its voice on the street.

**Voice rules (from `E1-ART-AND-VOICE-DIRECTION.md`):** no price promises, no corporate
Web3 language, no hacker clichés, no doom. Every line lands one of: *I can build this ·
I can own this · I can understand this · we make the network stronger together.*

## The five crews

Stations = the five Set-1 signature pieces, placed along the demo route
(Spawn → Plaza → Foundation → Market). Leads marked ★. Crew members are individually
interactable for their one line; per station 1–2 may be staged silent (emote only) to
keep text density calm — director's choice in the staging pass.

| Station | Furniture | Crew (7+6+6+6+6 = 31) |
| --- | --- | --- |
| **Signal** | Antenna Mast | ★dni · sat · mhb · gadaj · tobo · aj · essex |
| **Bitcoin** | Node Rack | ★michael1011 · rootzoll · tal · p · BlackCoffee · darren |
| **Keys** | Key Cabinet | ★benarc · cuddy · jedai · nind · bk · flx |
| **Power** | Solar Panel | ★proton · leon · snick · madmunkey · tonichina · shillie |
| **Timelock** | Block Clock | ★longy · morgs · mtoshi · arbadacarba · nc · bam |

---

## Signal crew · Antenna Mast (station 1, near spawn)

**★ dni (Signal Bearer) — the greeter, teaches:**

1. "Hey! New face. I'm dni — I carry the signal around here."
2. "Signal is how people find each other without asking anyone's permission. No
   platform. Just us, saying who we are."
3. "Your name here is a key you hold — not an account somebody rented you. That's the
   whole trick."
4. "Walk the street. Every crew here builds something. Ask them — they love talking
   about it."

**Crew comments:**

- sat (Signal Amplifier): "Say it louder. If it's true, volume helps."
- mhb (Relay Runner): "I run relays like other people run marathons. Slower feet,
  faster gossip."
- gadaj (Signal Smith): "I forge antennas. Sparks included, permission not required."
- tobo (People Router): "Lost? I route people, not packets. Who do you need?"
- aj (Link Operator): "Everything here is connected. My job is the 'is'."
- essex (Publishing Operator): "Publish it or it didn't happen. Sign it or it
  wasn't you."

## Bitcoin crew · Node Rack

**★ michael1011 (Node Operator) — teaches:**

1. "Careful, that rack is syncing. I'm michael1011 — we keep nodes honest."
2. "Bitcoin is patience with teeth: verify everything, save what matters, settle
   for real."
3. "Nobody on this street promises you riches. We promise you a ledger nobody can
   quietly rewrite."
4. "When someone zaps you 21 sats here, that's real value, friend to friend. Watch
   the lamps when it happens."

**Crew comments:**

- rootzoll (Lightning Mechanic): "Channels are like bicycles — balance beats size."
- tal (Node Cartographer): "I map nodes. X marks everywhere, honestly."
- p (Protocol Minimalist): "Fewer rules. Better kept."
- BlackCoffee (Night Operator): "The street never sleeps. Neither does the relay.
  We take shifts."
- darren (Pathfinder): "First one through the fog leaves footprints for everyone."

## Keys crew · Key Cabinet

**★ benarc (Hardware Thinker) — teaches:**

1. "Don't mind the drawers — every key in here belongs to somebody. None of them
   to me."
2. "Keys are the deal of the century: you carry the responsibility, you get the
   agency."
3. "Not your keys, not your name, not your sats. Comfort is the thing you trade in."
4. "Start small. One key, kept safe, beats ten accounts you rent."

**Crew comments:**

- cuddy (Boundary Mapper): "Good fences make good protocols. Know where yours run."
- jedai (Interface Thinker): "If your grandma can't zap, the interface is wrong —
  not grandma."
- nind (Systems Architect): "Every good system looks boring from the outside. That's
  how you know it works."
- bk (Utility Tinkerer): "If it's useful twice, it's infrastructure."
- flx (Chaos Engineer): "I break things on purpose so the street doesn't break by
  accident."

## Power crew · Solar Panel

**★ proton (Energy Systems) — teaches:**

1. "Feel that? Noon sun on cheap panels. Best deal in physics."
2. "Power is direct action: energy in, work out. It solves the problem in front of
   you — sometimes at a cost."
3. "Mining is energy voting for honesty. Waste is just energy nobody metered."
4. "Build your machines where the energy is. This street runs on it."

**Crew comments:**

- leon (Fabrication Scout): "Show me your scrap pile and I'll show you your next
  machine."
- snick (Workshop Maker): "Every tool on this street was somebody's weekend. Make one."
- madmunkey (Motion Mixer): "Movement is a language. The street dances, if you watch
  long enough."
- tonichina (Sonic Alchemist): "Listen — even the lamps hum in key. Zaps are applause."
- shillie (Wave Rider): "I surf the noise so you can hear the signal."

## Timelock crew · Block Clock

**★ longy (Long-Horizon Thinker) — teaches:**

1. "Shh. It ticks every ten minutes. Finest clock ever built."
2. "Timelock is the art of delaying the easy move to keep the stronger one."
3. "That's why your bricks take 21 hours here. A thing you waited for is a thing
   you value."
4. "Lock something away for the future, and the future starts owing you. That's the
   Palace's whole secret."

**Crew comments:**

- morgs (Story Mapper): "Every block placed here is a sentence. What's your first
  line?"
- mtoshi (Crew Gardener): "Communities grow like orchards: slow, then all at once."
- arbadacarba (Strategy Mapper): "Every corner is on my map twice — as it is, and as
  it could be."
- nc (Culture Compiler): "Culture is code that runs on people. Commit carefully."
- bam (Meme Engine): "One good meme moves more sats than ten whitepapers. YOLO, but
  verify."

---

## Kerni — the bridge · at the plaza table

1. "Psst. Raccoon business: cards on the table."
2. "Everything the crews just taught you — Power, Bitcoin, Keys, Signal, Timelock —
   it's all in the deck."
3. "Sit down, I'll deal. First match is practice: no standing, no stake, just you
   and me."

*(Line 3 quotes the rulebook's practice-mode contract on purpose.)*

## Staging notes (for the implementation ticket)

- Data: `apps/web/src/scene/streetCast.ts` — `{ member, crew, role: "lead"|"crew"|
  "silent", position, lines[] }`. Avatars via the roster `AvatarConfig`s
  (`members.ts`) + `AvatarView`; interactables `kind: "npc"`.
- **Group staging:** crew members cluster around their station (2–4 m spread, facing
  inward/at work — the pose system gives sit/idle variety). The lead stands nearest
  the furniture. 1–2 per crew may be `silent` (greeting emote only) — director's call.
- Dialog UI: the interact dialog shows ONE message today — extend with a "Next"
  step-through for the leads' `lines[]`; crew comments stay single-shot.
- Station furniture placed as street scenery (five pieces along the route). MVP uses
  the Set-1 primitives; **Meshy-generated station props** (a real antenna mast, a
  humming node rack…) are the natural first post-demo Meshy batch — they slot into the
  21-day set cadence (`item-sets.md`) without touching this script.
- NPCs are static presences, not room players — a live member walking the street
  appears additionally, and that is fine and funny.
- Localization: English first (matches all in-game copy); German pass later if wanted.
