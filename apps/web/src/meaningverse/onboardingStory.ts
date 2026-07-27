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
    kicker: "LOCKTARD STREET",
    caption: "Thirty-six sockets. No owner. One unfinished spaceship.",
    line: "\"We're not a cult. We're culture.\" Build one small part. Place it. Invite someone.",
    fallbackText:
      "Kerni was the raccoon. Locktard Street is culture made together: build, place, and invite.",
  },
] as const;

export const INTRO_CARDS = INTRO_SEQUENCE.filter(
  (beat): beat is IntroBeat & { readonly visualMode: "card" } => beat.visualMode === "card",
);

/** The Street remains unobstructed and freely walkable before the local Wire appears. */
export const STREET_GLIMPSE_MS = 2400;

export type FictionalWireCard = {
  readonly kicker: "WORKSHOP NOTE" | "STREET WEATHER" | "LOCAL STATUS";
  readonly body: string;
};

/** Fixed local copy: this is a fictional Wire, never a remote or algorithmic feed. */
export const FICTIONAL_WIRE_CARDS: readonly FictionalWireCard[] = [
  {
    kicker: "WORKSHOP NOTE",
    body: "The mushroom sorter has rejected one perfectly ordinary spoon.",
  },
  {
    kicker: "STREET WEATHER",
    body: "Copper dust after dusk. The framed windows remain opinionated.",
  },
  {
    kicker: "LOCAL STATUS",
    body: "A small machine is still humming beside a bench nobody reserved.",
  },
] as const;

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
    objective: "Walk into the Street. Take your time.",
    optionalKerniLine:
      "Welcome. No rush — the Palace gets better when people leave something useful behind. Start with one small thing.",
    status: "The Street is ready; the workshop is quiet.",
    worldResponse: "The Street opens before any relay communication begins.",
    offlineFallback: "Walking and looking still work. No peer is simulated.",
  },
  create: {
    objective: "Choose one small relay part.",
    optionalKerniLine: "One useful part is enough. The bench can wait.",
    status: "The part is ready at the workbench.",
    worldResponse: "A physical part remains a local player choice.",
    offlineFallback: "The workbench remains available; nothing is accepted early.",
  },
  place: {
    objective: "Place the relay in its fixed socket.",
    optionalKerniLine: "The socket is small and honest. It either fits or it does not.",
    status: "The relay is accepted at the workbench.",
    worldResponse: "The relay lights the Street from its fixed socket.",
    offlineFallback: "A rejected placement changes nothing and never completes the step.",
  },
  invite: {
    objective: "Invite one person when you want to.",
    optionalKerniLine: "The light is ready. An invitation is always your choice.",
    status: "The invite was copied or manually confirmed.",
    worldResponse: "The invite is available; no peer is invented.",
    offlineFallback: "Manual copy stays open until the player confirms it.",
  },
  co_create: {
    objective: "A witness may answer — or it stays open.",
    optionalKerniLine: "The light can wait. Honest beats full.",
    status: "A signed light pulse is accepted.",
    worldResponse: "The relay records one invited contribution.",
    offlineFallback: "The step stays open without penalty. No ghost or timer completes it.",
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
