// Interactables — things in the world you can activate with the Interact button (E): NPCs, objects,
// doors. v1 is proximity-based: when you walk within an interactable's radius, a prompt appears; E (or
// the on-screen button) fires its action. Every entry belongs to ONE world — PalaceScene filters by
// the active world so an HQ prompt never fires on the street. Positions of street entries derive from
// the shared street layout constants (Plaza/Workshop), never hand-copied coordinates.
// Real door animations / NPC dialog trees come later — v1 shows the response so the loop is testable.

import { PLAZA_CENTRE, PLAZA_WELL, YOUNG_TREE } from "./Plaza";
import { WORKSHOP_CENTRE } from "./Workshop";
import { SHIP_DOCK } from "./streetLayout";

export type InteractKind = "door" | "npc" | "object";
export type InteractWorld = "hq" | "home" | "street";
/** Beyond-dialog activations: the ship dock opens the MoC creation panel instead of a
 *  message; Kerni's plaza table opens the TCG practice-table napplet. */
export type InteractAction = "open-ship-panel" | "open-tcg-table";

export interface Interactable {
  id: string;
  /** The world this interactable lives in — prompts only fire there. */
  world: InteractWorld;
  /** World position [x, y, z]; proximity is measured on the XZ plane. */
  position: [number, number, number];
  /** Activation radius in metres. */
  radius: number;
  kind: InteractKind;
  /** Prompt verb shown on the button, e.g. "Open the gate". */
  label: string;
  /** Response shown when activated (placeholder until doors animate / NPCs get dialog trees). */
  message: string;
  /** When set, activation routes to this app action instead of showing `message`. */
  action?: InteractAction;
}

// HQ: spawn is ~[6,4,44]; the growing tree sits at [-7,0,40], the asset shelf at z≈52.
export const INTERACTABLES: Interactable[] = [
  {
    id: "tree",
    world: "hq",
    position: [-7, 0, 40],
    radius: 4.5,
    kind: "object",
    label: "Tend your Tree",
    message: "You tend the Tree. Its rings thicken with the time you lock — come back as it grows.",
  },
  {
    id: "racoo",
    world: "hq",
    position: [2, 0, 36],
    radius: 4,
    kind: "npc",
    label: "Talk to racooDNI",
    message: 'racooDNI: "gm, builder. money buys style — time builds legend."',
  },
  {
    id: "gate",
    world: "hq",
    position: [0, 0, 50],
    radius: 5,
    kind: "door",
    label: "Open the palace gate",
    message: "The gate creaks open. (Real door animation lands with the rigged palace doors.)",
  },
  // Street: the beta camp's story beats — the site, the tree, the forge, the well.
  {
    id: "street-site",
    world: "street",
    position: [PLAZA_CENTRE[0], 0, PLAZA_CENTRE[1]],
    radius: 8,
    kind: "object",
    label: "Survey the build site",
    message:
      'Scaffolding and a hand-painted board: "Palace of Culture — released soon. Date TBA." The street is open; the Palace is not.',
  },
  {
    id: "street-tree",
    world: "street",
    position: [YOUNG_TREE[0], 0, YOUNG_TREE[1]],
    radius: 4,
    kind: "object",
    label: "Tend the young tree",
    message:
      "You water the apple tree. It grows by waiting, never by grind — come back as the lock matures.",
  },
  {
    id: "street-forge",
    world: "street",
    position: [WORKSHOP_CENTRE[0], 0, WORKSHOP_CENTRE[1]],
    radius: 6,
    kind: "object",
    label: "Warm up at the forge",
    message:
      "The forge is glowing. Study, build, repair — the crafts on these benches feed the whole economy.",
  },
  {
    id: "street-ship-dock",
    world: "street",
    position: [SHIP_DOCK[0], 0, SHIP_DOCK[1]],
    radius: 5,
    kind: "object",
    label: "Add your part to the ship",
    action: "open-ship-panel",
    message: "The assembly ring hums overhead, waiting for the next session module.",
  },
  {
    id: "street-well",
    world: "street",
    position: [PLAZA_WELL[0], 0, PLAZA_WELL[1]],
    radius: 3.5,
    kind: "object",
    label: "Draw water",
    message: "Cold, clear well water. The camp gathers here at dusk.",
  },
  {
    // Kerni's practice table — the TCG played inside the world (demo centerpiece).
    // The raccoon deals; the napplet opens the real Edition One table vs the NPC.
    id: "street-kerni-table",
    world: "street",
    position: [PLAZA_WELL[0] + 4, 0, PLAZA_WELL[1] + 3],
    radius: 3,
    kind: "npc",
    label: "Sit at Kerni's table — cards",
    action: "open-tcg-table",
    message: 'Kerni shuffles. "First match is practice: no standing, no stake, just you and me."',
  },
];
