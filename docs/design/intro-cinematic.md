# Intro Cinematic — Kerni Crosses Over (21 s)

Status: production storyboard for the web intro video (`apps/web/public/intro.mp4`).
Replaces the 5 s silent grok clip on the web only; the Godot intro and the three runtime
story cards stay untouched and authoritative (`docs/design/moc-intro-tutorial-story.md`).

## What the video is

One continuous night shot, 21.0 seconds, that shows the single canonical identity fact:
**the raccoon is Kerni in another form** (Felix's final canon decision). A natural raccoon
on a rooftop dissolves into restrained copper particles, reforms above the plaza as the
lantern familiar, and the street lamps answer one after another — the zaps-light-the-street
motif as pure mood. No words, no facts, no UI: the family-slapstick bite, the diagnostic
reveal, and the Locktard Street facts still live in the story cards that follow. The video
stays decorative by design; a video error or Skip lands on the same cards.

Canon sources: `docs/assets/intro-kerni-grok.md` (motion lineage this replaces),
`docs/assets/menu-keyart-openai.md` (world look), `docs/design/kerni-workshop-companion.md`
(lantern body), `TCG600nap/art/E1-ART-AND-VOICE-DIRECTION.md` (palette, restraint).

## Numerology

- Runtime **21.0 s** = 504 frames @ 24 fps.
- Lamp cascade: 7 lamps over exactly **2.1 s** (one every 0.3 s).
- A block-clock tick opens the film and closes it (patience bookends).

## The five beats

| # | Time (s) | Frames | Beat |
|---|---|---|---|
| 1 | 0.0 – 3.0 | 1–72 | **Tick.** Pure black. One dry block-clock tick, then a quiet ~70 Hz heartbeat pulse. From 2.5 s the horizon fades in. |
| 2 | 3.0 – 7.5 | 73–180 | **Rooftop.** Starry night over the street silhouette; thin ultraviolet dusk band on the horizon; a few faint warm windows. The raccoon sits small and off-centre on a roof ridge (guide, never authority). Camera pushes in slowly. At ~5.5 s the head turns toward the plaza — one natural two-note chirp. |
| 3 | 7.5 – 12.5 | 181–300 | **Dissolve.** From the tail forward the raccoon unravels into copper particles — ember-like, slow, hundreds not thousands (E1: restrained, no effect orgy). The stream drifts above the rooflines toward the plaza; the camera tracks with it. |
| 4 | 12.5 – 16.5 | 301–396 | **Reformation.** Above the plaza centre the particles fall into slow orbits — worn copper rings — then settle into the obsidian-ceramic lantern body. The amber lens ignites with a tiny cyan diagnostic glint; warm light floods the plaza. The chirp motif returns, quantized — same voice, other form. |
| 5 | 16.5 – 21.0 | 397–504 | **Zaps light the street.** From Kerni outward the seven street lamps ignite one after another (2.1 s cascade, each a soft zap-spark note). Camera pulls up and back to a wide: lit street, plaza glow, the unfinished ship scaffold as a quiet silhouette, stars above. Title card fades in at ~18.9 s, final tick at ~20.5 s, fade to black by 21.0 s. |

## Look

- **Palette:** matte black core; Bitcoin orange `#F7931A` / copper `#B87333` for particles
  and lamp warmth; ultraviolet `#7447B8` only as a thin horizon band and star tint; amber
  lens `#FFB347` with cyan glint `#17BEBB`.
- **No text, logo, or UI inside the imagery.** The only type is the end title card:
  cream `#FFF7EC` small caps, "600 BILLION" over "Palace of Culture", calm fade — no flare.
- **Materials** read as E1: blackened steel, copper, timber, ceramic, glass.
- **One clear subject per beat**, coherent depth, calm crop edges. Kerni stays small.
- Buildings are the repo's own street GLBs (`apps/web/public/village|buildings|props`)
  as near-silhouettes with faint warm windows; the lantern body is the runtime
  `apps/web/public/npc/kerni.glb`, unmodified.

## Sound

Post-click placement ("Enter MoC" is the user gesture), so the video may carry audio.
`IntroScreen.tsx` drops its `muted` attribute; the Skip button and the card fallback stay.

| t (s) | Cue |
|---|---|
| 0.7 | Block-clock tick #1 — dry, short, woody |
| 1.5 / 2.3 | Heartbeat pulses, ~70 Hz, soft |
| 3.0 | Bed enters pp — slow C-minor sine pad (C2 G2 C3, breath LFO) |
| 5.5 | Kerni chirp, natural — two notes up, slightly warbly |
| 7.5 – 12.5 | Particle shimmer — sparse high sine grains, density follows the dissolve |
| 12.5 – 14.5 | Convergence — grain density and pitch rise gently |
| ~14.6 | Reformation "whum" (98→65 Hz swell) + short warm lens ping |
| ~15.3 | Kerni chirp, synthetic — same two-note motif, clean and quantized |
| 16.8 – 18.9 | Seven zap-sparks, one per lamp, a rising C-minor-pentatonic figure |
| 18.9 | Bed resolves warm — G3/C4 join over the open fifth |
| 20.5 | Block-clock tick #2 — bookend; bed fades to silence by 21.0 |

**License note.** The in-game player streams the *I'm Sorry EP* (Sam Means) from the
approved Wavlake feed — value-for-value, but no license to embed the recording in a
shipped asset. The entire soundtrack is therefore **synthesized deterministically**
(pure-sine house style of `TCG600nap/art/video-intro/*/make_bed.py`) by
`tooling/intro-cinematic/make_audio.py`. No third-party samples anywhere in the mix.

## Production

- Blender EEVEE, 1920×1080, 24 fps, 504 frames, one continuous camera.
- The scene is built **from script, not from a hand-kept .blend**:
  `tooling/intro-cinematic/build_scene.py` rebuilds the whole scene + animation from the
  repo GLBs deterministically (same spirit as the character repack pipeline). The raccoon
  is a low-poly silhouette model built in that script; it only ever reads against the sky.
- Frames render to `tooling/intro-cinematic/_work/` (git-ignored), then
  `tooling/intro-cinematic/mux.py` encodes H.264 (yuv420p, faststart) + AAC 48 kHz,
  target **< 10 MB**.
- Web integration: replace `apps/web/public/intro.mp4`, un-mute `IntroScreen.tsx`.
  `docs/assets/intro-kerni-grok.md` gets a superseded note for the web file; the Godot
  `intro.ogv` keeps the approved grok clip (story-card parity stays locked).

## Restraint checklist (from the design laws)

- No payment/zap imagery implying sats buy progress — lamps answer presence, nothing else.
- Kerni orients, never commands: the raccoon looks, moves, transforms — no gestures at
  the viewer, no summoning pose.
- No hooded-hacker staging, no doom; the night is calm, the windows are warm.
- Particles restrained; light floods only after the reformation (motivated light).
- Facts never depend on media: everything a player must know stays in the cards.
