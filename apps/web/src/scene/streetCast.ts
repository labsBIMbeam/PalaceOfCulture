// The street cast — all 31 join.600.wtf members standing in five crews at the five affinity
// stations, per the canonical script docs/design/mentor-dialogues.md. Per crew ONE lead teaches
// (four lines, stepped through with "Next"); every other member drops a single in-character
// comment. The lines here are the script verbatim — the rulebook is canon, the crews are its
// voice on the street. Positions are authored (not generated) so the clusters stay readable and
// clear of the lamps, benches, well, tree, ship ring, and workshop.

export type CrewId = "signal" | "bitcoin" | "keys" | "power" | "timelock";
export type CastRole = "lead" | "crew";

export interface CrewStation {
  id: CrewId;
  /** Set-1 signature piece at the station (MVP primitive; Meshy props come with the set cadence). */
  furniture: string;
  /** Affinity accent — brand-fixed (600b-design-laws), used for the station's emissive detail. */
  accent: string;
  /** World x/z of the furniture piece. */
  position: [number, number];
  rotationY: number;
}

export interface CastEntry {
  /** Roster name, exact case as in ui/members.ts. */
  member: string;
  crew: CrewId;
  role: CastRole;
  position: [number, number, number];
  rotationY: number;
  /** Lead: four teaching lines. Crew: one comment. */
  lines: string[];
  /** Staging: hold the sit pose on a crate instead of standing idle (max 1–2 per crew). */
  pose?: "sit";
}

/** Face `from` toward `to` (same convention as the plaza benches). */
function facing(from: [number, number], to: [number, number]): number {
  return Math.atan2(to[0] - from[0], to[1] - from[1]);
}

// Stations along the demo route Spawn → Plaza → Foundation → Market. Affinity colors are
// brand-fixed: S #7447B8 · B #F7931A · K #FFF7EC · P #F3C244 · T #17BEBB.
export const CREW_STATIONS: ReadonlyArray<CrewStation> = [
  {
    id: "signal",
    furniture: "Antenna Mast",
    accent: "#7447B8",
    position: [-8, 37.5],
    rotationY: 0.4,
  },
  {
    id: "bitcoin",
    furniture: "Node Rack",
    accent: "#F7931A",
    position: [10.5, 58],
    rotationY: -0.5,
  },
  { id: "keys", furniture: "Key Cabinet", accent: "#FFF7EC", position: [-10, 69], rotationY: 0.9 },
  { id: "power", furniture: "Solar Panel", accent: "#F3C244", position: [-24, 87], rotationY: 1.9 },
  {
    id: "timelock",
    furniture: "Block Clock",
    accent: "#17BEBB",
    position: [16, 91],
    rotationY: -1.2,
  },
];

const STATION_AT = Object.fromEntries(
  CREW_STATIONS.map((station) => [station.id, station.position]),
) as Record<CrewId, [number, number]>;

/** Cast entry helper: position + face the station (crew) or an authored focus point (leads). */
function at(
  member: string,
  crew: CrewId,
  role: CastRole,
  x: number,
  z: number,
  lines: string[],
  lookAt?: [number, number],
  pose?: "sit",
): CastEntry {
  return {
    member,
    crew,
    role,
    position: [x, 0, z],
    rotationY: facing([x, z], lookAt ?? STATION_AT[crew]),
    lines,
    ...(pose ? { pose } : {}),
  };
}

// ---------------------------------------------------------------------------- the five crews

export const STREET_CAST: ReadonlyArray<CastEntry> = [
  // Signal crew · Antenna Mast (station 1, near spawn) — dni greets toward the walk.
  at(
    "dni",
    "signal",
    "lead",
    -5.0,
    38.5,
    [
      "Hey! New face. I'm dni — I carry the signal around here.",
      "Signal is how people find each other without asking anyone's permission. No platform. Just us, saying who we are.",
      "Your name here is a key you hold — not an account somebody rented you. That's the whole trick.",
      "Walk the street. Every crew here builds something. Ask them — they love talking about it.",
    ],
    [0, 30],
  ),
  at("sat", "signal", "crew", -9.5, 35.5, ["Say it louder. If it's true, volume helps."]),
  at("mhb", "signal", "crew", -11.0, 39.0, [
    "I run relays like other people run marathons. Slower feet, faster gossip.",
  ]),
  at("gadaj", "signal", "crew", -7.0, 34.5, [
    "I forge antennas. Sparks included, permission not required.",
  ]),
  at(
    "tobo",
    "signal",
    "crew",
    -10.5,
    42.0,
    ["Lost? I route people, not packets. Who do you need?"],
    undefined,
    "sit",
  ),
  at("aj", "signal", "crew", -5.5, 35.0, ["Everything here is connected. My job is the 'is'."]),
  at("essex", "signal", "crew", -12.5, 36.5, [
    "Publish it or it didn't happen. Sign it or it wasn't you.",
  ]),

  // Bitcoin crew · Node Rack — michael1011 keeps the rack honest.
  at(
    "michael1011",
    "bitcoin",
    "lead",
    8.5,
    57.0,
    [
      "Careful, that rack is syncing. I'm michael1011 — we keep nodes honest.",
      "Bitcoin is patience with teeth: verify everything, save what matters, settle for real.",
      "Nobody on this street promises you riches. We promise you a ledger nobody can quietly rewrite.",
      "When someone zaps you 21 sats here, that's real value, friend to friend. Watch the lamps when it happens.",
    ],
    [0, 52],
  ),
  at("rootzoll", "bitcoin", "crew", 12.0, 55.5, [
    "Channels are like bicycles — balance beats size.",
  ]),
  at("tal", "bitcoin", "crew", 13.0, 59.5, ["I map nodes. X marks everywhere, honestly."]),
  at("p", "bitcoin", "crew", 11.5, 61.5, ["Fewer rules. Better kept."]),
  at(
    "BlackCoffee",
    "bitcoin",
    "crew",
    9.0,
    61.0,
    ["The street never sleeps. Neither does the relay. We take shifts."],
    undefined,
    "sit", // the Night Operator is mid-shift
  ),
  at("darren", "bitcoin", "crew", 12.5, 57.2, [
    "First one through the fog leaves footprints for everyone.",
  ]),

  // Keys crew · Key Cabinet — benarc keeps nobody's keys.
  at(
    "benarc",
    "keys",
    "lead",
    -8.0,
    68.0,
    [
      "Don't mind the drawers — every key in here belongs to somebody. None of them to me.",
      "Keys are the deal of the century: you carry the responsibility, you get the agency.",
      "Not your keys, not your name, not your sats. Comfort is the thing you trade in.",
      "Start small. One key, kept safe, beats ten accounts you rent.",
    ],
    [0, 64],
  ),
  at("cuddy", "keys", "crew", -12.0, 66.5, [
    "Good fences make good protocols. Know where yours run.",
  ]),
  at("jedai", "keys", "crew", -12.5, 70.5, [
    "If your grandma can't zap, the interface is wrong — not grandma.",
  ]),
  at("nind", "keys", "crew", -10.5, 72.5, [
    "Every good system looks boring from the outside. That's how you know it works.",
  ]),
  at(
    "bk",
    "keys",
    "crew",
    -7.5,
    71.5,
    ["If it's useful twice, it's infrastructure."],
    undefined,
    "sit",
  ),
  at("flx", "keys", "crew", -9.0, 65.5, [
    "I break things on purpose so the street doesn't break by accident.",
  ]),

  // Power crew · Solar Panel — proton meters the noon sun.
  at(
    "proton",
    "power",
    "lead",
    -22.0,
    86.0,
    [
      "Feel that? Noon sun on cheap panels. Best deal in physics.",
      "Power is direct action: energy in, work out. It solves the problem in front of you — sometimes at a cost.",
      "Mining is energy voting for honesty. Waste is just energy nobody metered.",
      "Build your machines where the energy is. This street runs on it.",
    ],
    [-14, 80],
  ),
  at(
    "leon",
    "power",
    "crew",
    -26.0,
    85.0,
    ["Show me your scrap pile and I'll show you your next machine."],
    undefined,
    "sit", // scouting the scrap pile from on top of it
  ),
  at("snick", "power", "crew", -25.5, 89.0, [
    "Every tool on this street was somebody's weekend. Make one.",
  ]),
  at("madmunkey", "power", "crew", -22.5, 90.0, [
    "Movement is a language. The street dances, if you watch long enough.",
  ]),
  at("tonichina", "power", "crew", -20.5, 88.5, [
    "Listen — even the lamps hum in key. Zaps are applause.",
  ]),
  at("shillie", "power", "crew", -24.0, 83.5, ["I surf the noise so you can hear the signal."]),

  // Timelock crew · Block Clock — longy listens to the ten-minute tick.
  at(
    "longy",
    "timelock",
    "lead",
    14.5,
    90.0,
    [
      "Shh. It ticks every ten minutes. Finest clock ever built.",
      "Timelock is the art of delaying the easy move to keep the stronger one.",
      "That's why your bricks take 21 hours here. A thing you waited for is a thing you value.",
      "Lock something away for the future, and the future starts owing you. That's the Palace's whole secret.",
    ],
    [8, 84],
  ),
  at(
    "morgs",
    "timelock",
    "crew",
    18.0,
    89.5,
    ["Every block placed here is a sentence. What's your first line?"],
    undefined,
    "sit", // the Story Mapper writes sitting down
  ),
  at("mtoshi", "timelock", "crew", 17.5, 93.0, [
    "Communities grow like orchards: slow, then all at once.",
  ]),
  at("arbadacarba", "timelock", "crew", 14.0, 93.5, [
    "Every corner is on my map twice — as it is, and as it could be.",
  ]),
  at("nc", "timelock", "crew", 16.5, 87.5, [
    "Culture is code that runs on people. Commit carefully.",
  ]),
  at("bam", "timelock", "crew", 19.0, 91.5, [
    "One good meme moves more sats than ten whitepapers. YOLO, but verify.",
  ]),
];

// Kerni bridges the crews to the TCG table — spoken at the familiar's workshop perch.
// Line 3 quotes the rulebook's practice-mode contract on purpose.
export const KERNI_BRIDGE_LINES: ReadonlyArray<string> = [
  "Psst. Raccoon business: cards on the table.",
  "Everything the crews just taught you — Power, Bitcoin, Keys, Signal, Timelock — it's all in the deck.",
  "Sit down, I'll deal. First match is practice: no standing, no stake, just you and me.",
];
