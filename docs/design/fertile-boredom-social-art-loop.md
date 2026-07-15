# Fertile Boredom → Social Art Loop

Status: product concept note for the 600 Billion / Palace of Culture playable slice.

## Concept kernel

The game is not about filling every second with content. It is about recovering the human layer that appears after algorithmic stimulation stops.

```text
Algorithmic noise consumes attention.
Boredom appears when the player stops reacting.
If the player stays with boredom, it becomes presence.
Presence enables real encounters.
Encounters produce memory.
Memory and boredom become art.
Art becomes shared culture and community memory.
```

Short form:

```text
boredom → presence → encounter → art → community
```

This is the emotional spine of the Palace of Culture social layer.

## Design position

The game is anti-feed, not anti-action.

The positive fantasy is not “do nothing forever”. The positive fantasy is:

```text
escape algorithmic capture
→ enter embodied human life
→ walk, talk, notice, make something
→ leave a meaningful trace in shared space
```

Boredom is the portal. Social interaction and art are what grow there.

## Player-facing sentence

> Stop scrolling long enough for reality to become interesting again.

Alternative taglines:

- Get bored. Go outside. Talk to someone. Make something.
- Do nothing. Save the world.
- Boredom is where the self loads.
- The feed ate the future.
- Reclaim the idle mind.

## Core resources

These can start as client-only mock state in the PoC.

```ts
type HumanPresenceState = {
  attention: number;       // capacity to notice and choose
  noise: number;           // algorithmic pressure / psychic clutter
  boredom: number;         // discomfort first, fertile resource later
  presence: number;        // embodied awareness of place/people
  connection: number;      // social trust / warmth
  inspiration: number;     // creative charge from encounters and place
  communityMemory: number; // shared world coherence
};
```

Design rule:

```text
attention is not XP.
presence is not productivity.
art is not loot.
```

These meters exist to make the player feel the transformation from noise to life.

## Core loop

```text
1. Phone/feed offers quick stimulation.
2. Player can scroll/react; this lowers boredom but raises noise and drains attention.
3. Player puts the phone away and walks or waits.
4. Boredom rises and initially feels uncomfortable.
5. If the player stays with it, boredom converts into presence.
6. Presence reveals small human encounters in the world.
7. Conversation creates memory fragments and connection.
8. Memory + boredom + inspiration can create an art artifact.
9. The artifact is placed in the Palace / room / public corner.
10. Community memory rises and the space becomes more alive.
```

System shorthand:

```text
phone noise
→ resist / put away
→ idle or walk
→ fertile boredom threshold
→ presence window
→ encounter spawn
→ memory fragment
→ art artifact
→ shared place changes
```

## Negative loop: algorithmic capture

The phone/feed is a seductive antagonist, not a simple evil button.

It should give immediate relief and shallow reward:

```text
open phone
→ boredom drops immediately
→ dopamine ping / fake progress
→ noise rises
→ attention falls
→ presence resets
→ encounter chance decreases
→ world becomes flatter
```

Example feed baits:

- urgent news fragment
- outrage prompt
- productivity hack
- “someone replied”
- market number
- follower/status comparison
- fake quest marker

Important: the phone should be tempting enough that ignoring it feels like a real choice.

## Positive loop: embodied life

Walking and waiting are content generators.

```text
walk without phone
→ ambient detail increases
→ place familiarity rises
→ overheard fragments appear
→ NPC routines become visible
→ small encounter becomes available
```

The player should experience that “nothing is happening” was false. They were only too noisy to notice.

## Boredom phases

### Phase 1 — Withdrawal

First seconds after disconnecting.

Effects:

- slight desaturation
- UI goes quiet
- player movement feels ordinary
- no objective appears
- boredom meter rises
- phone prompt remains tempting

### Phase 2 — Settling

Player stays without feed.

Effects:

- ambient audio becomes richer
- lighting warms slightly
- small animations become visible
- presence starts rising
- NPC awareness / look-at behavior increases

### Phase 3 — Fertile boredom

Threshold reached.

Effects:

- encounter chance rises
- memory fragments can appear
- art prompts unlock
- places gain meaning
- conversation options improve

## Encounters

Encounters should feel small and human, not heroic.

Examples:

- someone feeding birds
- a musician tuning badly
- a worker resting with coffee
- two people arguing about a wall / machine / concrete
- a child drawing on pavement
- a lonely mechanic in a garage
- someone silently watching light through a window

Dialogue actions should include:

```text
listen
ask
joke
share
walk together
stay silent
interrupt
leave
```

Presence quality affects outcome:

```text
low presence → shallow reply / missed moment
high presence → story shared / memory fragment gained / art prompt unlocked
```

## Artifacts

Art is how inner life becomes world state.

PoC artifact types:

- sketch
- poem / note
- mural mark
- field recording
- small song
- photograph / memory card
- found-object sculpture

Minimal data shape:

```ts
type MemoryFragment = {
  id: string;
  source: "encounter" | "place" | "walk" | "silence";
  title: string;
  text: string;
  tags: string[];
};

type ArtArtifact = {
  id: string;
  kind: "sketch" | "poem" | "mural" | "recording" | "song" | "photo" | "sculpture";
  title: string;
  createdFrom: string[]; // memory fragment ids
  placeId?: string;
  palaceSlotId?: string;
  communityEffect: {
    connection?: number;
    inspiration?: number;
    communityMemory?: number;
  };
};
```

Artifact rule:

```text
Input: boredom + presence + memory
Output: visible trace in the world
```

## Palace integration

The existing Palace asset system says:

```text
private progress → object unlocks → public placement
```

This loop adds the social/cultural source of some unlocks:

```text
walk / wait / talk
→ memory fragment
→ art artifact
→ place artifact in Palace slot
→ public culture object / shared memory
```

This should sit beside private-world builder progression, not replace it.

### Good first Palace objects from this loop

- small framed sketch
- poem card
- listening corner recording
- shared mural tile
- bench plaque
- memory lantern
- zine stand entry
- “walk story” archive card

## First vertical slice

Build one small walkable social slice.

Scope:

- 1 room or courtyard in the Palace / town edge
- 1 phone/feed overlay
- 1 attention/noise/boredom/presence state object
- 1 idle-without-phone threshold
- 1 NPC encounter
- 1 memory fragment
- 1 art artifact
- 1 Palace placement slot where that artifact appears
- 1 visible world change after placement

Playable sequence:

```text
1. Player starts in a noisy state with phone/feed open.
2. Feed can be scrolled indefinitely, but the world becomes flatter.
3. Player closes phone.
4. Boredom rises; nothing obvious happens.
5. Player waits or walks for long enough.
6. Presence threshold unlocks a small encounter.
7. NPC shares a story because the player listens.
8. Player receives a memory fragment.
9. Player creates a small artifact from it.
10. Artifact appears in a Palace slot and warms the space.
```

First magic moment:

```text
Player waits. Does nothing.
A bird lands nearby.
NPC says: “You saw it too?”
```

## Implementation seam in current web-first 3D PoC

Initial client-only modules can live under:

```text
apps/web/src/systems/human-presence/
apps/web/src/ui/phone/
apps/web/src/scene/encounters/
apps/web/src/scene/artifacts/
```

Suggested first files:

```text
apps/web/src/systems/human-presence/types.ts
apps/web/src/systems/human-presence/presenceState.ts
apps/web/src/systems/human-presence/tickPresence.ts
apps/web/src/ui/phone/PhoneOverlay.tsx
apps/web/src/scene/encounters/EncounterTrigger.tsx
apps/web/src/scene/artifacts/ArtArtifact.tsx
```

Keep this first pass local/mock only. Do not touch ownership, Nostr, timelocks, or persistence until the emotional loop works.

## Non-goals for the first pass

- no real social network
- no generative AI dependency
- no economy
- no marketplace
- no persistence requirement
- no multiplayer requirement
- no moralizing tutorial
- no large quest system

## Success condition

The prototype proves this sentence:

> A player can stop feeding the algorithm, become present through boredom, meet someone, make art from that encounter, and leave a visible trace in the shared Palace.
