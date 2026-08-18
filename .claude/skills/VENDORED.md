# Vendored skills

Skills in this directory that were not written for this repo, and where they came from.

## MengTo/Skills (MIT)

- Source: https://github.com/MengTo/Skills — `agent-skills/game-development/`
- Commit: `21b278c62f49f3ce3d8c8ecbcc84cbcd534f3e49` (2026-07-25)
- License: MIT (Meng To) — see the upstream `LICENSE`
- Announced: https://x.com/MengTo/status/2080915786206789733

Curated subset installed (9 of 17). The ARPG-specific ones — `design-action-combat`,
`tune-enemy-ai`, `build-threejs-enemy-systems`, `build-game-monster-system`,
`build-game-inventory`, `design-game-encounters`, `build-isometric-arpg`,
`build-hybrid-game-assets` — were skipped: 600 Billion is a social MMO, not a combat game.

| Skill | Why it's here |
| --- | --- |
| `optimize-threejs-games` | Serves invariant #6 (mobile 30 FPS hard budget) — CPU/GPU triage, draw calls, pooling, adaptive quality |
| `build-mobile-threejs-games` | Touch controls, safe areas, responsive HUD, mobile browser QA |
| `build-game-camera-controls` | Third-person camera work around `ecctrl` |
| `create-game-vfx` | Timelock / plaza / rocket-growth effects |
| `build-game-audio-feedback` | Audio layer for the street world |
| `test-playable-web-games` | Pairs with our headless Chrome verification of the 3D scene |
| `ship-web-games` | Release checks; complements the `fips` skill for deploy topology |
| `author-game-levels` | Street + plaza layout authoring |
| `build-game-map-editor` | Closest match to our in-world builder |

**Caveat:** these were written for vanilla three.js. `apps/web` is React Three Fiber, so
R3F-specific costs (reconciler churn, per-frame allocation in `useFrame`, `<Instances>` vs raw
`InstancedMesh`) are not covered by them — apply the principles, not the snippets.

Each skill folder also carries an `agents/openai.yaml` from upstream. That is Codex metadata,
ignored by Claude Code; it is kept so the same folders can be synced to `~/.codex/skills`.

The same subset is installed at `~/.claude/skills/`, `~/.codex/skills/` and in the Hermes tree on
this machine, kept in sync by `node ~/.claude/sync-skills.mjs`. Project copies shadow the
user-level ones when working in this repo.
