# Kerni — Palace Workshop Companion

Status: canonical NPC concept and first in-engine placeholder.

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

The current procedural scene component is an interaction and silhouette placeholder at:

```text
apps/web/src/scene/Kerni.tsx
```

The future Meshy asset is a static, art-only GLB. It must preserve a base-centred origin and use the same world anchor. Dialogue, state, reputation, presence, and welcome history remain app data; none are baked into the model.

## First welcome line

> “Welcome. No rush — the Palace gets better when people leave something useful behind. Start with one small thing.”

## Meshy generation brief

**Mode:** image-to-3D using Kerni's Telegram concept as the visual reference, static GLB, realistic PBR, no auto-rig.

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
