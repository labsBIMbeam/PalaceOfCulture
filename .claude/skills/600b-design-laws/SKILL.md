---
name: "600b-design-laws"
description: "The locked design laws of 600 Billion / Palace of Culture / zapburg.com. Load BEFORE any game-design, economy, balancing, dialogue, naming, lore, npc, zap, craft-timer, item-set, or street/world feature work in this project — and before reviewing such work from any agent. Encodes: sats never buy time, the TCG is lore canon, E1 voice, 21-numerology, the identity boundary, and zaps-light-the-street."
---

# 600B Design Laws

The non-negotiables for **600 Billion — The Palace of Culture** (web game at zapburg.com,
in-game district "Locktard Street"). These were decided by FLX and are recorded in the
repo — this skill exists so no agent (Claude, Codex, Hermes) drifts from them. When a
task conflicts with a law, say so and propose a law-compatible alternative; never
silently bend one.

## 1. Sats never buy time or progress

Ultra-low time preference is THE design law. The craft economy runs on real time
(21-numerology: 2.1h / 4.2h / 21h / 210h / 2.1d / 21d / 42d), `DRIP_PER_MINUTE` is the
single balancing knob, and **no payment may accelerate anything or advance world state**.
The plaza foundation grows per completed raid — explicitly NOT per zap volume. The TCG
rulebook states the law canonically: *"Timelock delays the easy move to preserve the
stronger move."* Test for every feature: "does money buy time or progress?" → then no.

## 2. The TCG is lore canon — reuse its vocabulary

`G:\Github\TCG600nap` (600B Timelock TCG, E1 rulebook) is the canonical lore source.
Before inventing a term, reuse: **Zap** (a fast one-time action — resolves once, then
Archive), **Operation** (planned, via the Queue), **Uptime**, **Commit**, **Archive**,
the five affinities **Power / Bitcoin / Keys / Signal / Timelock** (each with a locked
one-line philosophy in rulebook §4) and the affinity wheel. NPC dialogue teaches in the
rulebook's words. Affinity colors are brand-fixed (P #F3C244, B #F7931A, K #FFF7EC,
S #7447B8, T #17BEBB) and may not be re-themed.

## 3. E1 voice for every player-facing word

From `TCG600nap/art/E1-ART-AND-VOICE-DIRECTION.md`: positive cypherpunk — the future
already works. Short, literal, playful, brave, **never corporate**. No price promises,
no Web3 marketing language, no hooded-hacker clichés, no doom/collapse. Every line lands
one of: *I can build this · I can own this · I can understand this · we make the network
stronger together.* Reference lines: "YOLO, but verify." / "No permission. Just
builders." Kid-safe naming for public-facing brands (zapburg.com is the domain; the
in-game district stays "Locktard Street" — do not rename either direction again).

## 4. Zaps light the street

A received zap = 21-minute lantern glow on the receiver + street-lamp intensity as a
deterministic function of 21-minute zap activity + a nameplate ⚡ counter display-capped
at "21+". **Nothing else may brighten the street.** The light is presence-layer VFX
(cosmetic, never owned state). Design doc: `docs/design/demo-loop-and-zap-light.md`.

## 5. The identity boundary (ADR 0009)

No pubkeys, keys, ownership, inventory, or audit data cross the realtime presence
transport. A room handle is an unverified display hint and a lookup key into the
600.wtf roster — zap money can only ever flow to the roster-registered identity.
Napplets are sandboxed (allow-scripts, no same-origin); keys and wallets live host-side
only; NIP-07 signs, WebLN pays, and a napplet never touches either directly.

## 6. Architecture invariants (short form, from CLAUDE.md)

The app owns the truth (Boltz/LNbits/Nostr are adapters); art is static + content-hashed
(sha256/Blossom), state is data; mobile 30 FPS is a hard budget; ownership verification
lives once in `packages/ownership`. New assets: glTF/GLB + Draco + KTX2, delivered
content-addressed via `blossom.bimcvp.com`.

## Where the details live

`docs/design/demo-mvp-plan.md` (the TCG table is the demo centerpiece; mentors teach),
`docs/design/mentor-dialogues.md` (the crew script), `docs/design/item-sets.md` (21-day
set cadence), `docs/adr/0009` (street identity), `TCG600nap/docs/napplet-spec.md`
(napplet capability fallbacks — a missing capability is a fallback, never a failure).
