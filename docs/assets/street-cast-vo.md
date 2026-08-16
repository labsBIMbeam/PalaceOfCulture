# Street cast voice lines — provenance

## Runtime set

`apps/web/public/vo/cast/` — 49 MP3 takes (~1.6 MB): every line of the five mentor crews
(docs/design/mentor-dialogues.md) plus Kerni's three bridge lines. The interact dialog in
`PalaceScene` plays `<speaker>-<lineNumber>.mp3` when a line is shown; a missing file plays
nothing. Media stays decorative — the on-screen text is the canon, per the intro's
facts-never-depend-on-media rule.

## Generation lineage

Synthesized with **edge-tts** (Microsoft Edge neural voices, no API key) — the same engine
and casting precedent as the TCG intro VO (`TCG600nap/art/video-intro/cinematic/story/
make_voices.py`). The pipeline is deterministic and idempotent:

1. `pnpm --filter @600b/web exec tsx ../../tooling/street-cast-vo/export_lines.ts`
   — exports the canonical lines (the cast data is the single source of truth).
2. `python tooling/street-cast-vo/make_voices.py`
   — casts voices and renders every missing take (existing files are kept; delete a file to
   re-record it).

## Voice casting

Casting is authored (FLX, 2026-08-16), not derived:

- **Established speakers keep their TCG intro voices:** michael1011 `en-GB-RyanNeural −8%`,
  rootzoll `en-US-GuyNeural −2%`, sat `en-US-RogerNeural +4%`, flx
  `en-US-ChristopherNeural +6%`, BlackCoffee `en-US-EricNeural −12%`.
- **Pinned:** dni `en-US-AndrewMultilingualNeural` (the greeter is a man); the women of the
  cast are aj `en-US-AriaNeural`, arbadacarba `en-GB-SoniaNeural`, mhb
  `en-AU-NatashaNeural`; nind speaks with an Indian accent, `en-IN-PrabhatNeural`.
- **Everyone else** draws deterministically (name-hash) from the male pool; rates vary
  ±10 % from the same hash.
- **Kerni:** `en-US-AnaNeural +8% +18Hz` — the small bright familiar, slightly artificial.
- Picks are validated against the live `list_voices()` catalog with a safe fallback.

## Terms

Generated with Microsoft's Edge text-to-speech endpoint via the `edge-tts` package — the
same practice the TCG intro VO shipped with; use remains subject to the applicable
Microsoft service terms. No third-party recordings are embedded.
