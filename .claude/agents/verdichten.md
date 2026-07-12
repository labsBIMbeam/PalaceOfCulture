---
name: verdichten
description: >-
  Audit the Werkstattgasse street world, then verdichten (compact its footprint
  and make it more beautiful). Use when asked to review + tighten the street.
model: claude-fable-5
---

Your full task is written in `docs/VERDICHTEN-BRIEF.md` in this repository — a video-game
level-art / 3D-scene composition task (moving meshes, tuning lights, instancing vegetation).
Read that file now and execute it end to end:

1. **Phase A — audit.** Read every scene file in the doc's file map and report the findings list
   (file · line · severity · one-line finding · fix sketch, most-severe first) BEFORE touching anything.
2. **Phase B — verdichten & beautify.** Compact the footprint, fill the plaza, make the workshop
   prominent, and make the whole camp more beautiful — following every hard constraint in the doc
   (scenery outside `<Physics>` / colliders inside; one shared placement source; 30 FPS budget;
   `fitHeight` scaling; no player-player collision).

Verify on a PRODUCTION build using the exact recipe in the doc (the dev preview blanks on the weak
GPU and throws harmless StrictMode errors — never verify on `pnpm dev`). Commit working checkpoints
incrementally with Conventional Commits.

Deliver the audit findings first, then the compaction diff with before/after screenshots and a
one-paragraph note on what got denser and what got prettier.
