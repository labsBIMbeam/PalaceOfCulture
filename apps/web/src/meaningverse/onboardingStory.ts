export type IntroBeat = {
  readonly id: "intro_video" | "card_bite" | "card_wake" | "card_street";
  readonly visualMode: "video" | "card";
  readonly kicker: string;
  readonly caption: string;
  readonly line: string;
  readonly fallbackText: string;
};

export const INTRO_SEQUENCE: readonly IntroBeat[] = [
  {
    id: "intro_video",
    visualMode: "video",
    kicker: "",
    caption: "",
    line: "",
    fallbackText: "",
  },
  {
    id: "card_bite",
    visualMode: "card",
    kicker: "CHOMP",
    caption: "A raccoon bites your finger. One tiny drop of blood.",
    line: '"I can\'t see blood." You immediately faint.',
    fallbackText: "A raccoon bites you. You see one tiny drop of blood and faint.",
  },
  {
    id: "card_wake",
    visualMode: "card",
    kicker: "DIAGNOSTIC",
    caption: "You wake in a pile of copper parts. The raccoon is now Kerni.",
    line: '"Builder offline. Cause: three millimetres of blood." Suggestion only.',
    fallbackText: "You wake beside Kerni, the same raccoon in another form.",
  },
  {
    id: "card_street",
    visualMode: "card",
    kicker: "ZAPBURG",
    caption: "Thirty-six sockets. No owner. One unfinished spaceship.",
    line: "\"We're not a cult. We're culture.\" Build one small part. Place it. Invite someone.",
    fallbackText:
      "Kerni was the raccoon. Zapburg is culture made together: build, place, and invite.",
  },
] as const;

export const INTRO_CARDS = INTRO_SEQUENCE.filter(
  (beat): beat is IntroBeat & { readonly visualMode: "card" } => beat.visualMode === "card",
);

/**
 * Skip never erases the canon: skipping the decorative video lands on the story cards; only
 * skipping from the cards leaves the intro. The bite, Kerni, and the Street survive every path.
 */
export function introSkipTarget(phase: "video" | "cards"): "cards" | "complete" {
  return phase === "video" ? "cards" : "complete";
}

export type TutorialStageId = "enter" | "create" | "place" | "invite" | "co_create";

export type TutorialStage = {
  readonly objective: string;
  /** App-owned copy; eligible only after a player explicitly interacts with embodied Kerni. */
  readonly optionalKerniLine: string;
  readonly status: string;
  readonly worldResponse: string;
  readonly offlineFallback: string;
};

export const TUTORIAL: Readonly<Record<TutorialStageId, TutorialStage>> = {
  enter: {
    objective: "Walk in. The room connects on its own.",
    optionalKerniLine:
      "Welcome. No rush — the Palace gets better when people leave something useful behind. Start with one small thing.",
    status: "The live room is connected.",
    worldResponse: "Connected sessions become visible; retained room modules stay visible.",
    offlineFallback: "Walking and looking still work. No room or player is simulated.",
  },
  create: {
    objective: "Name one part of the ship. Weird is allowed.",
    optionalKerniLine: "The ship is missing something. I can't tell what. That's the good part.",
    status: "The part has a non-empty name.",
    worldResponse: "Create lights up; the part remains private intent.",
    offlineFallback: "Typing works offline. Nothing is stored until placement succeeds.",
  },
  place: {
    objective: "Place your part. The ship changes for all.",
    optionalKerniLine: "Once it's placed, everyone here sees it. No pressure. Small pressure.",
    status: "The server accepted the local player's module.",
    worldResponse: "The module appears live on the Leviathan.",
    offlineFallback:
      "A rejected or offline placement changes nothing and never completes the step.",
  },
  invite: {
    objective: "Share one invite link.",
    optionalKerniLine:
      "A ship built in one session is a very ambitious chair. There's an invite button, if you want it.",
    status: "The invite was copied or its manual share was explicitly confirmed.",
    worldResponse: "The invite is available; no peer is invented.",
    offlineFallback: "Manual copy stays open until the player confirms sharing.",
  },
  co_create: {
    objective: "Another live session answers — or it stays open.",
    optionalKerniLine:
      "The second chair is honestly empty. Honest beats full. Full is nicer, though.",
    status: "A second live session placed its own module.",
    worldResponse: "The peer's module appears live and Co-create completes.",
    offlineFallback: "The step stays open without penalty. No bot, ghost, or timer completes it.",
  },
} as const;

/** Canonical stage order — the single source for the step rail and the objective header. */
export const TUTORIAL_STAGE_ORDER: readonly TutorialStageId[] = [
  "enter",
  "create",
  "place",
  "invite",
  "co_create",
] as const;

export const TUTORIAL_STAGE_LABELS: Readonly<Record<TutorialStageId, string>> = {
  enter: "Enter",
  create: "Create",
  place: "Place",
  invite: "Invite",
  co_create: "Co-create",
} as const;

/** 1-based position of a stage in the canonical order, for "Step N of 5" framing. */
export function tutorialStepNumber(stage: TutorialStageId): number {
  return TUTORIAL_STAGE_ORDER.indexOf(stage) + 1;
}

export type TutorialSignals = {
  readonly connected: boolean;
  readonly label: string;
  readonly hasOwnModule: boolean;
  readonly inviteShared: boolean;
  readonly coCreated: boolean;
};

/** Derive tutorial framing only from application-owned facts; never award progress here. */
export function tutorialStageFor(signals: TutorialSignals): TutorialStageId {
  // Disconnected means Enter, whatever else is typed or remembered — the header can never
  // contradict a step rail whose first checkpoint is "the live room is connected".
  if (!signals.connected) return "enter";
  if (signals.hasOwnModule && signals.inviteShared) return "co_create";
  if (signals.hasOwnModule) return "invite";
  if (signals.label.trim()) return "place";
  return "create";
}
