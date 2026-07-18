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
    kicker: "BEFORE",
    caption: "A raccoon bit you. You don't remember agreeing to this.",
    line: "Rude. Effective.",
    fallbackText: "A raccoon bit you.",
  },
  {
    id: "card_wake",
    visualMode: "card",
    kicker: "MORNING",
    caption: "You wake somewhere high and quiet. A sign says Kaiserwarte. Probably.",
    line: "Nobody official has named it yet.",
    fallbackText: "You wake at Kaiserwarte, high and quiet.",
  },
  {
    id: "card_street",
    visualMode: "card",
    kicker: "DOWNHILL",
    caption: "Below: lamps, and a spaceship nobody finished on purpose.",
    line: "The raccoon is gone. A copper lantern floats where it stood. Kerni, apparently. Welcome to Locktard Street: thirty-six sockets, no owner.",
    fallbackText:
      "Kerni was the raccoon. You follow Kerni into Locktard Street, where people build the ship.",
  },
] as const;

export const INTRO_CARDS = INTRO_SEQUENCE.filter(
  (beat): beat is IntroBeat & { readonly visualMode: "card" } => beat.visualMode === "card",
);

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
    worldResponse: "Other people and their modules become visible.",
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
    objective: "Copy one invite for one real person.",
    optionalKerniLine:
      "A ship built by one person is a very ambitious chair. There's an invite button, if you want it.",
    status: "The invite was copied or surfaced for manual copy.",
    worldResponse: "The invite is available; no peer is invented.",
    offlineFallback: "Manual copy is offered when clipboard access fails.",
  },
  co_create: {
    objective: "A real person finishes this — or it stays open.",
    optionalKerniLine:
      "The second chair is honestly empty. Honest beats full. Full is nicer, though.",
    status: "A second real session placed its own module.",
    worldResponse: "The peer's module appears live and Co-create completes.",
    offlineFallback: "The step stays open without penalty. No bot, ghost, or timer completes it.",
  },
} as const;

export type TutorialSignals = {
  readonly connected: boolean;
  readonly label: string;
  readonly hasOwnModule: boolean;
  readonly inviteCopied: boolean;
  readonly coCreated: boolean;
};

/** Derive tutorial framing only from application-owned facts; never award progress here. */
export function tutorialStageFor(signals: TutorialSignals): TutorialStageId {
  if (signals.coCreated) return "co_create";
  if (signals.hasOwnModule && signals.inviteCopied) return "co_create";
  if (signals.hasOwnModule) return "invite";
  if (signals.label.trim()) return "place";
  if (signals.connected) return "create";
  return "enter";
}
