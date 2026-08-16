# Demo-MVP plan — the TCG IS the demo

Design session 2026-08-16, part 2 (FLX). Supersedes the scope call in
[`demo-loop-and-zap-light.md`](demo-loop-and-zap-light.md) ("not demo scope"): **FLX
decided the TCG table in-world is the demo centerpiece.** Week 1 builds it, week 2 stacks
everything → Demo-MVP on 2026-08-30 at zapburg.com.

## Why this is buildable in a week (verified against `TCG600nap`, 2026-08-16)

The TCG was **built as a napplet from day one**:

- `site/napplet.js` is the adapter: every page asks it for identity/storage/theme/assets
  and checks `globalThis.napplet` — **exactly the object our web napplet host (shipped
  today, PR #23) injects.** Missing capability = specified fallback, never a failure;
  the plain website is literally the all-fallbacks path.
- `docs/napplet-spec.md` (v1, locked with FLX 2026-07-28, amended 2026-08-15):
  `nappletType: 600b-timelock-tcg`, `requires: [webrtc]` for PvP — but **local hotseat
  and the NPC opponent are extension-free** (practice mode: "no standing, no stake, no
  signed transcript").
- The real table is `site/play.html` (72 KB) + 8 static scripts (`engine.js` 312 KB,
  `npc.js`, `faces.js`, `precons.js`, `fx.js`, `play-data.js`, `blob-map.js`,
  `napplet.js`) — no server for solo/hotseat.
- **Card faces already stream sha256-addressed from Blossom** (`faces.js`: primal →
  bimcvp → nostr.download mirrors, Cache-API, offline fallback, per-face source dots).
  The 50 MB asset question was solved by the TCG itself.

**Integration = mount, not port:** bundle `play.html`+scripts as a single-file artifact,
open it in the web napplet panel (generalized from the zap panel), let the adapter find
`window.napplet`. Host adds the `storage` domain (prefixed localStorage, 512 KB quota —
the spec's cap) and `theme`; `resource`/network degrade per spec. `webrtc` domain (PvP)
is week-2 stretch, NOT MVP — MVP is the practice match **against Kerni at a plaza table**.

## The intro: the join.600.wtf cast as mentor NPCs

FLX, same session: all join.600.wtf characters as avatars IN the game, explaining the
lore — Bitcoin, Nostr, Keys, … "die Assets haben wir alle, wir müssen das nur stagen."

- **Staging is light:** the `Interactable` pattern already has `kind: "npc"`, the street
  has themed spots, `AvatarView` renders roster avatar configs. A `streetCast.ts` data
  file places members at spots with dialog.
- **Each mentor teaches their affinity** in the TCG's own words (the rulebook's resource
  philosophy lines are the dialog seeds), voiced per the E1 direction: short, warm,
  confident, never corporate. Examples: michael1011 near the node rack corner (Bitcoin/
  Lightning), benarc at the workbench (Hardware/Power), a Keys mentor at the key cabinet,
  a Signal mentor at the antenna — the five Set-1 signature pieces become the five
  classrooms.
- **Kerni bridges to the table:** the last mentor beat points you to the plaza table —
  "sit, I'll show you" → the TCG napplet opens. Lore onboarding flows INTO the demo
  centerpiece.
- Dialog content: 5 affinity mentors deep (3–4 lines each) + the rest of the cast with
  one greeting line each (presence over depth for MVP).

## The week plan

**Week 1 (So 17 – Sa 23) — build the centerpiece:**
1. TCG napplet bundle + generalized web napplet panel + `storage`/`theme` domains
   (~2 days, spike-first: one NPC turn in the sandbox proves it).
2. Plaza table staging: sit at the table → napplet opens (pose point + interact action,
   ~0.5 day).
3. Mentor cast staging + dialog pass (~1 day; dialog drafted from rulebook affinity
   texts, FLX reviews voice).
4. Zap-light + foundation-per-raid tickets from part 1 (~1.5 days).
5. In parallel (FLX): zapburg.com + DNS + first Hetzner deploy (package ready in
   `HetzerDeploy/zapburg/`).

**Week 2 (So 24 – Sa 30) — stack to MVP:**
- Everything on the live URL; the 6-beat demo script grows the TCG beat: street → meet
  mentors → zap → TCG match vs Kerni → home/builder → craft promise.
- Real-sats zap test, load check on live, polish from playtests, freeze Do 28.,
  Generalprobe Fr 29., **Demo Sa 30.**
- Stretch only if green: `webrtc` domain → live PvP match on stage.

## Non-goals for the MVP (unchanged laws)

Sats never buy time or progress. The TCG napplet holds no keys (NIP-07 stays outside the
sandbox; the Table's NIP-42 flow is post-MVP). Godot parity untouched. Icons/KayKit stay
cut.
