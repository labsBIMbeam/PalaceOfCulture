import type { TutorialStageId } from "./onboardingStory";

export type RaidCheckpoint = {
  readonly stage: TutorialStageId;
  readonly action: string;
  readonly contribution: string;
  readonly specialist: string;
};

/**
 * The first raid is a five-minute cooperative repair, never combat or extraction. Its checkpoints
 * reuse application-owned tutorial facts, so the UI cannot fake a peer, a placement, or a payment.
 */
export const FIRST_RAID = {
  id: "light-the-street",
  title: "Light the Street",
  duration: "~5 min",
  mode: "Co-op repair raid",
  premise:
    "The Builder's fall scattered a signal lamp. Rebuild it, place it, and ask another live session to answer.",
  v4v: "No entry fee. Bring time, knowledge, hardware, code, art, attention, routing, hosting, or sats. Recognition, remix, and optional zaps follow voluntary use — no central score decides value. This raid moves no money.",
  paymentBoundary:
    "This raid explains V4V but never moves money. Any future zap requires the player's explicit consent.",
  checkpoints: [
    {
      stage: "enter",
      action: "Wake the node",
      contribution: "uptime",
      specialist: "Node Operator",
    },
    {
      stage: "create",
      action: "Name the missing part",
      contribution: "idea",
      specialist: "Hardware Thinker",
    },
    {
      stage: "place",
      action: "Install the lamp part",
      contribution: "craft",
      specialist: "Workshop Maker",
    },
    {
      stage: "invite",
      action: "Broadcast the work order",
      contribution: "attention",
      specialist: "Signal Bearer",
    },
    {
      stage: "co_create",
      action: "Receive one live answer",
      contribution: "co-creation",
      specialist: "People Router",
    },
  ] as const satisfies readonly RaidCheckpoint[],
} as const;

/**
 * Playful raid specialties, not biographies, ranks, or authority claims. Only the two FLX-approved
 * anchors are marked approved; every other mapping remains an explicit draft.
 */
export const RAID_SPECIALTIES: Readonly<Record<string, string>> = {
  Builder: "Open Maker",
  dni: "Signal Bearer",
  nind: "Systems Architect",
  michael1011: "Node Operator",
  sat: "Signal Amplifier",
  flx: "Chaos Engineer",
  shillie: "Wave Rider",
  arbadacarba: "Strategy Mapper",
  benarc: "Hardware Thinker",
  tobo: "People Router",
  BlackCoffee: "Night Operator",
  darren: "Pathfinder",
  rootzoll: "Lightning Mechanic",
  nc: "Culture Compiler",
  longy: "Long-Horizon Thinker",
  essex: "Publishing Operator",
  jedai: "Interface Thinker",
  p: "Protocol Minimalist",
  aj: "Link Operator",
  bam: "Meme Engine",
  mhb: "Relay Runner",
  snick: "Workshop Maker",
  gadaj: "Signal Smith",
  leon: "Fabrication Scout",
  madmunkey: "Motion Mixer",
  morgs: "Story Mapper",
  proton: "Energy Systems",
  tonichina: "Sonic Alchemist",
} as const;

export function raidSpecialtyFor(name: string): string {
  return RAID_SPECIALTIES[name] ?? "Open Contributor";
}

export type RaidSpecialtyStatus = "approved" | "draft";

export type InviteShareState = "idle" | "copied" | "shown" | "confirmed";

export function inviteStateAfterManualCopy(promptResult: string | null): InviteShareState {
  return promptResult === null ? "idle" : "shown";
}

export function inviteShareComplete(state: InviteShareState): boolean {
  return state === "copied" || state === "confirmed";
}

export function raidCompleteFor(state: InviteShareState, coCreated: boolean): boolean {
  return inviteShareComplete(state) && coCreated;
}

export function raidSpecialtyStatusFor(name: string): RaidSpecialtyStatus {
  return name === "benarc" || name === "michael1011" ? "approved" : "draft";
}
