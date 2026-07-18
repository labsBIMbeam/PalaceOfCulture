# Kerni — Palace Workshop Companion

Status: canonical companion, reproducible Blender asset and embodied Godot world-agent runtime.

## Role

Kerni is the small floating workshop familiar encountered near the Palace entrance. Kerni is not a quest dispenser, moderator, engagement mechanic, or all-knowing oracle.

Kerni is there to make arrival feel safe and possible:

```text
new builder arrives
→ Kerni offers one quiet orientation line
→ player chooses what to notice, repair, build, or join
→ the Palace remembers useful contributions over repeated visits
```

Kerni never nags, chases, sends streak reminders, or punishes absence. Interaction is always player-initiated.

## Temperament

- calm, observant, concise
- gentle humour, never corporate cheerfulness
- practical before mystical
- notices repairable things and small useful contributions
- respects silence and phone-free time
- does not rank people by attention, likes, or logins

## Relationship to the core loop

Kerni can explain the first layer of the Palace without turning it into a tutorial funnel:

```text
noise → withdrawal → settling → fertile boredom → presence
presence + meaningful contribution → consistency
consistency + trusted action → reputation
```

Kerni may acknowledge an action after it happens, but never commands it. The player is free to leave, wait, walk, talk, or build.

## Visual identity

A compact floating lantern automaton:

- obsidian ceramic body
- worn copper rings and three small folded tool-arms
- one warm amber lens with a tiny cyan diagnostic glint
- repair bench / drafting-compass language
- no weapons, armour, crown, mascot grin, readable text, or corporate robot styling

The current runtime implementation is split across immutable art, embodiment and policy:

```text
tooling/blender/build_kerni_3d.py       deterministic art builder
art/blender/kerni_3d.blend             art source
godot/assets/moc/kerni.glb             static runtime art
godot/scripts/moc/kerni_3d.gd          hover/look/speech embodiment
godot/scripts/moc/kerni_world_agent.gd suggestion-only policy boundary
godot/scripts/moc/kerni_live_client.gd opt-in loopback client
godot/scripts/moc/moc_demo.gd          application-owned presentation decision
services/world-agent/                  bounded template-selection sidecar
```

The GLB is static art-only and base-centred. Dialogue, state, reputation, presence and welcome
history remain application data; none are baked into the model. External models never provide
embodied prose. They may choose one ID from an exact phase-owned template capability. Godot owns
every spoken word, binds the response to a short-lived request ID and current phase, then applies an
independent presentation policy. Unknown keys, replayed/stale IDs and arbitrary text fail closed.
Kerni has no `MocLoop` reference and cannot transition phases, commit modules, claim authorship,
attest a peer, save or publish.

Interaction is player-initiated: pressing `E` near Kerni asks for context and must leave the current
phase unchanged. The deterministic offline policy is the release fallback; no network or model
credential is required to complete the workshop.

## Optional live comedy selector

The default release is offline. Live selection is explicit on both processes:

```bash
# Free deterministic localhost selector
cd services/world-agent
uv run kerni-sidecar --backend mock

# In another terminal
godot4 --path godot -- --moc-demo --moc-fresh --kerni-live
```

`--backend hermes` invokes one configured provider call per Kerni request and may incur model cost.
It runs Hermes with `--safe-mode`, no rules/memory/plugins/MCP, and an explicitly empty toolset. The
model receives only a phase number and two canonical template IDs. The sidecar binds only to
`127.0.0.1`; it is never auto-started by the game.

## First welcome line

> “Welcome. No rush — the Palace gets better when people leave something useful behind. Start with one small thing.”

## Meshy generation brief

**Optional future replacement mode:** image-to-3D using Kerni's Telegram concept as the visual
reference, static GLB, realistic PBR, no auto-rig. It must pass the same art-only contract.

```text
A small friendly floating workshop familiar for a dark, warm, mythic-cyberpunk social MMO. Compact round obsidian ceramic body, one large warm amber lens with a tiny cyan diagnostic glint, three folded copper tool-arms, one small drafting compass and repair ring, subtle worn metal and soot in seams. Cute, calm and useful—not childish. Symmetrical readable silhouette, clear single prop centered on a neutral background, no character base, no terrain, no text, no logos, no weapons, no armour, no crown, no humanoid body, no photoreal human features.
```

**Target:** 8–15k triangles before optimisation; one 1K atlas where possible; base-centred origin; static art-only GLB.

Before importing a Meshy GLB:

- [ ] silhouette remains readable at player distance
- [ ] no military or generic corporate-AI look
- [ ] one atlas / restrained material count
- [ ] static GLB, no ownership or dialogue data embedded
- [ ] inspected with `gltf-transform inspect`
- [ ] quality review in the Palace plaza before replacing `Kerni.tsx`
