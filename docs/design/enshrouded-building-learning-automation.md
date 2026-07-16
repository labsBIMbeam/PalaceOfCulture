# Enshrouded reference — building is learning, workshops become autonomous

Status: companion reference to `palworld-low-time-preference-crafting.md` for the Tuesday
2026-07-21 Locktard Street demo and the long-term builder game.

## Reference boundary

Enshrouded is used only as an abstract building-UX and workshop-progression reference. Do not copy
its world, Flame lore, characters, quests, visual designs, UI, exact blocks, materials, recipes,
writing, sounds, or distinctive expression.

The useful principles are:

- expressive voxel-like construction from several scales of shape;
- terrain and architecture can meet cleanly instead of floating as separate systems;
- geometry and material choice are related but separable;
- building tools support both large massing and fine correction;
- a protected local building area makes changes persistent;
- sheltered craftspeople unlock specialized workshops;
- nearby shared storage reduces inventory friction;
- co-op players can shape one sanctuary together.

## Evidence collected 2026-07-16

The official Enshrouded site and Steam page describe voxel-based building, detailed customization,
many materials and furniture, terrain shaping, co-op construction, and NPC shelter unlocking
advanced workshops.

The public Enshrouded Wiki documents:

- construction shapes at 0.5 m and 1 m detail scale;
- foundations, walls, windows, doors, columns, ceilings, stairs, and stepped shapes;
- roof assemblies at 2 m and 4 m scale;
- building, terrain, overgrowth, and roof material classes;
- a bounded base where terrain/building changes persist;
- manual crafting plus specialist workshops;
- craftsperson roles such as blacksmith, carpenter, farmer, hunter, and alchemist;
- shared material access from nearby special storage.

Sources:

- https://enshrouded.com/en-US
- https://store.steampowered.com/app/1203620/Enshrouded/
- https://enshrouded.wiki.gg/wiki/Building
- https://enshrouded.wiki.gg/wiki/Construction_Hammer
- https://enshrouded.wiki.gg/wiki/Crafting
- https://enshrouded.wiki.gg/wiki/Survivors
- https://enshrouded.wiki.gg/wiki/Flame_Altar

## Design law

> Building is learning. Automation is embodied knowledge.

The player cannot unlock an automatic process by purchasing a menu node. They first perform and
understand the work, then improve the workplace, build the machine, teach its operation, and finally
commission a robot-assisted production cycle.

```text
observe a need
→ perform the process manually
→ learn material behavior
→ build a jig or fixture
→ build and commission a machine
→ teach/calibrate a robot
→ workshop runs to a defined community target
→ humans maintain, improve, teach, and design what comes next
```

## Construction grammar

Use Enshrouded's multi-scale readability as inspiration without building a full voxel engine before
the demo.

| Scale | Locktard use | Interaction |
|---|---|---|
| 0.5 m detail | trim, sill, shelf, patch, step, tool mount | precise correction |
| 1 m module | wall, window, door, floor, column | normal building |
| 2 m assembly | stair flight, roof side, workshop bay | rapid room shaping |
| 4 m massing | facade bay, bridge segment, large roof | silhouette and district composition |

Rules:

1. **Shape first, skin second.** Geometry can receive compatible wood, brick, stone, plaster,
   fabric, metal, roof, terrain, or living-overgrowth finishes.
2. **Coarse to fine.** Players establish massing with large pieces, then refine with small pieces.
3. **Snap by default, free correction deliberately.** The first action is easy; mastery permits
   offsets, rotation, trimming, and asymmetry.
4. **Immediate reversible editing.** Before commissioning, placed parts return their full material.
   Experimenting must not feel punitive.
5. **Terrain contact matters.** Foundations, stairs, drainage, ramps, retaining edges, and plants
   visually connect architecture to the street.
6. **Construction state is visible.** Ghost plan → staged materials → frame → enclosure → services
   → finish → commissioned place.
7. **Material truth.** Timber spans, masonry mass, metal joints, fabric shade, water fall, and plant
   growth should look plausible even in comic-fantasy style.

## Building mastery — no abstract XP

Every practical process has five stages:

| Stage | Player experience | System result |
|---|---|---|
| Observe | inspect an existing object/process and its needs | process becomes understandable |
| Manual | perform one authentic cycle by hand | recipe/process learned |
| Assisted | build jig, gauge, mould, rack, or fixture | fewer steps and better consistency |
| Mechanized | build and commission a powered machine | repeatable batches become possible |
| Automated | add robot, sensors, buffers, and stop condition | unattended work orders become possible |

Mastery proof is concrete:

- one completed object that passed quality checks;
- one repaired failure or corrected mistake;
- one safe physical workplace;
- one person taught or one machine calibrated;
- one successful commissioning job.

The player never forgets the learned capability. A dismantled workshop becomes inactive, but the
knowledge remains available for rebuilding elsewhere.

## Machines and robots

Robots are manufactured tools, not captive characters. They handle repetitive, precise, heavy,
dirty, or hazardous work. Humans retain intention, design, commissioning, care, maintenance,
teaching, and social decisions.

A machine needs physical infrastructure:

```text
known process
+ stable foundation
+ tool head
+ drive/actuator
+ power
+ input buffer
+ output buffer
+ guard/safety zone
+ calibration sample
→ commissioned machine
```

Robot automation adds:

```text
machine
+ robot chassis
+ compatible tool head
+ sensor package
+ route or work envelope
+ taught operation
+ stop condition
→ autonomous work order
```

### First robot families

| Robot | Repetitive work | Human work that remains |
|---|---|---|
| Yard Cart | move sorted materials between marked stations | choose priorities and routes |
| Saw Feeder | feed measured timber and stack cut pieces | select timber, inspect grain, maintain blade |
| Mill Tender | move grain/flour and monitor fill levels | judge ingredients, recipe, hospitality target |
| Kiln Keeper | regulate heat/air and record cycles | choose firing curve, inspect output, repair lining |
| Forge Manipulator | hold/turn hot work and repeat hammer pattern | design part, set process, inspect and finish |
| Assembly Arm | repeat known joinery/fastener sequence | design assemblies, fixture setup, quality approval |
| Garden Rover | water and carry harvest crates | planting plan, soil care, seed stewardship |

No humanoid robot is required for the MVP. Small readable machines with clear tools are more
credible, cheaper to animate, and visually charming.

## Autonomous production contract

Machines do not produce infinite inventory. Every autonomous run is a bounded public work order:

```ts
type WorkshopOrder = {
  processId: string;
  targetOutput: number;
  reservedInputs: Record<string, number>;
  destination: string;
  stopWhenTargetMet: true;
  requestedBy: string;
  communityPurpose: string;
};
```

A cycle runs only when:

- the process has been learned manually;
- the machine is commissioned;
- a compatible robot/tool is present;
- inputs, output space, and energy are available;
- maintenance and safety are within limits;
- a finite target and destination exist.

Production pauses visibly rather than failing mysteriously. The street shows states such as:

- waiting for reclaimed timber;
- drying until tomorrow;
- blade needs sharpening;
- output rack full;
- target of 12 brackets complete;
- steward inspection requested.

## Low-time-preference automation

1. **Slow first cycle, fast repeated cycle.** The first object teaches; the hundredth should not
   demand the same clicks.
2. **No click-to-accelerate.** Better layouts, fixtures, machines, maintenance, and cooperation
   improve production.
3. **Offline-friendly, not manipulative.** Real processes continue while players explore or leave;
   there is no streak loss and no paid speed-up.
4. **Finite sufficiency.** Work orders stop at the stated civic need.
5. **Repair economy.** Machines consume maintenance parts occasionally, creating meaningful work
   without disposable-tool spam.
6. **Visible causality.** Players can follow material from input rack through machine to output.
7. **Local resilience.** A workshop should still support manual operation during power or robot
   downtime.
8. **Automation creates free time.** The reward is more room for architecture, culture, teaching,
   social gathering, exploration, and new inventions.

## Social workshop roles

Automation does not remove people; it changes their roles:

- apprentice learns the manual cycle;
- craftsperson defines quality and fixtures;
- machinist commissions and maintains machines;
- roboticist teaches paths and tool changes;
- steward sets community targets and prevents waste;
- designer develops new objects and improvements;
- host turns completed production into a social place;
- archivist records provenance, lessons, and repair history.

A workshop becomes culturally valuable when it teaches others and solves visible street needs, not
when it maximizes items per minute.

## Resource-to-machine progression

```text
reclaimed wood + scrap metal
→ hand tools and workbench
→ straightedge, jig, drying rack
→ saw frame, bearings, belt/drive
→ waterwheel or stored energy
→ powered saw/mill
→ cart robot
→ sensor-guided material flow
→ autonomous finite work orders
```

Advanced machines must be made from outputs of earlier workshops. This creates a real capability
ladder: **tools build fixtures, fixtures build machines, machines build better machines**.

## Tuesday demo slice

Show the idea, not the full factory simulation.

### Scene

A small bakery/joinery corner on Locktard Street contains:

- public work-order board;
- reclaimed-material rack;
- manual bench with one obvious interaction;
- one simple powered machine;
- one charming Yard Cart robot;
- input and output markings;
- a visible finished improvement, such as the bakery counter or repaired awning.

### Demo flow

1. Kerni points to one missing component for the communal bakery corner.
2. The player places recovered material at the manual bench.
3. The player performs the first simple cut/assembly and learns the process.
4. The completed sample commissions the jig/machine recipe.
5. The player places or activates the prepared machine.
6. The Yard Cart begins carrying the remaining bounded batch automatically.
7. The player is free to walk, talk, decorate, or inspect the street while production continues.
8. The machine stops when the public target is met.
9. The bakery corner visibly completes and a social gathering begins.

Success criteria:

- the manual first cycle is understandable and satisfying;
- the automation transition is visible without explanatory text;
- robot motion has a readable source, destination, and purpose;
- no infinite conveyor clutter;
- the finished build changes the street silhouette or warm-light composition;
- the loop can be reset reliably for the Tuesday demonstration;
- laptop frame rate remains stable.

## Implementation order

1. Polish start screen, lighting, materials, and demo camera path.
2. Add work-order board and three-state construction presentation.
3. Add one manual process with a focused state-machine test.
4. Add one bounded machine cycle driven by timestamps/state.
5. Add one deterministic Yard Cart path and visible cargo.
6. Trigger one permanent scene improvement at target completion.
7. Only after the demo: generalized grid editor, multiple machines, power networks, robot toolheads,
   offline persistence, and multiplayer authority.

## Agent selection rule

Before choosing work, ask:

1. Does this improve Tuesday's visible demo?
2. Does it make building feel like learning rather than buying an unlock?
3. Does automation visibly emerge from prior manual knowledge?
4. Does the machine solve a finite shared need?
5. Does the result free humans for more meaningful social and creative activity?

If not, defer it.
