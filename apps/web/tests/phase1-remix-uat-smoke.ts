import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { finalizeEvent, getPublicKey } from "nostr-tools";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FICTIONAL_WIRE_CARDS,
  INTRO_CARDS,
  INTRO_SEQUENCE,
  STREET_GLIMPSE_MS,
  introSkipTarget,
} from "../src/meaningverse/onboardingStory";
import {
  ATTENTIVE_FRAME_MAX_MS,
  ATTENTIVE_PRESENCE_THRESHOLD_MS,
  PHASE1_RELAY_ID,
  PHASE1_SIGNED_PULSE_MS,
  RELAY_PART_ORDER,
  RELAY_SOCKET_ID,
  advancePhase1PulsePresentation,
  createAttentivePresenceState,
  createPhase1AuthorizedEvidenceAction,
  createPhase1PulsePresentation,
  createPhase1RelayState,
  createRelayHandoffState,
  diffPhase1AcceptedEvidence,
  getPhase1Attributions,
  reduceAttentivePresence,
  reducePhase1Relay,
  reduceRelayHandoff,
  relayAssemblyEligible,
} from "../src/meaningverse/phase1Relay";
import {
  PHASE1_EVENT_KIND,
  Phase1RelayEvidenceGuard,
  parsePhase1RelayEvent,
  reducePhase1Evidence,
  verifyAndAuthorizePhase1Event,
} from "../src/net/phase1RelayTransport";
import { Phase1RelayOverlay } from "../src/ui/Phase1RelayOverlay";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path: string) => readFileSync(resolve(webRoot, path), "utf8");
const relaySource = source("src/meaningverse/phase1Relay.ts");
const overlaySource = source("src/ui/Phase1RelayOverlay.tsx");
const palaceSource = source("src/scene/PalaceScene.tsx");
const streetSource = source("src/scene/StreetWorld.tsx");
const cssSource = source("src/frontend/frontend.css");
const transportSource = source("src/net/phase1RelayTransport.ts");
const introSource = source("src/frontend/IntroScreen.tsx");
const kerniSource = source("src/scene/KerniFamiliar.tsx");

const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

const creatorSecret = new Uint8Array(32).fill(31);
const witnessSecret = new Uint8Array(32).fill(32);
const creatorPubkey = getPublicKey(creatorSecret);
const witnessPubkey = getPublicKey(witnessSecret);
const activationId = "a".repeat(64);
const witnessId = "b".repeat(64);
const lensId = "c".repeat(64);
const now = 1_800_000_000;

const baseState = createPhase1RelayState();
const activationState = reducePhase1Relay(baseState, {
  type: "activation_imported",
  activationId,
  creatorPubkey,
  createdAt: now,
  origin: "verified-invite-capability",
});

const witnessTemplate = {
  kind: PHASE1_EVENT_KIND,
  created_at: now,
  content: "",
  tags: [
    ["t", "palace-phase-1"],
    ["action", "touch-relay-witness"],
    ["relay", PHASE1_RELAY_ID],
    ["e", activationId],
    ["p", creatorPubkey],
  ],
};
const witnessEvent = finalizeEvent(witnessTemplate, witnessSecret);
const witnessGuard = new Phase1RelayEvidenceGuard();
const authorizedWitness = verifyAndAuthorizePhase1Event(witnessEvent, {
  state: activationState,
  now,
  guard: witnessGuard,
});
assert.ok(authorizedWitness, "Plan 04 must authorize the network-free witness fixture first");
const witnessAction = createPhase1AuthorizedEvidenceAction(authorizedWitness);
assert.ok(witnessAction, "Plan 05 accepts only the typed Plan-04 authorized action seam");
const witnessedState = reducePhase1Relay(activationState, witnessAction);
assert.equal(witnessedState.acceptedWitness?.eventId, witnessEvent.id);
assert.equal(reducePhase1Relay(witnessedState, witnessAction), witnessedState);

const lensTemplate = {
  kind: PHASE1_EVENT_KIND,
  created_at: now,
  content: "",
  tags: [
    ["t", "palace-phase-1"],
    ["action", "attach-signal-lens"],
    ["relay", PHASE1_RELAY_ID],
    ["e", activationId],
    ["p", creatorPubkey],
    ["w", witnessEvent.id],
  ],
};
const lensEvent = finalizeEvent(lensTemplate, witnessSecret);
const authorizedLens = verifyAndAuthorizePhase1Event(lensEvent, {
  state: witnessedState,
  now,
  guard: new Phase1RelayEvidenceGuard(),
});
assert.ok(authorizedLens, "Plan 04 must authorize the exact lens contract first");
const lensAction = createPhase1AuthorizedEvidenceAction(authorizedLens);
assert.ok(lensAction);
const creatorBeforeLens = witnessedState.activation;
const lensState = reducePhase1Relay(witnessedState, lensAction);
assert.equal(lensState.acceptedLens?.eventId, lensEvent.id);
assert.deepEqual(
  lensState.activation,
  creatorBeforeLens,
  "lens acceptance cannot mutate creator truth",
);
assert.equal(lensState.acceptedLens?.pubkey, lensState.acceptedWitness?.pubkey);
assert.deepEqual(getPhase1Attributions(lensState), [
  { kind: "creator", pubkey: creatorPubkey },
  {
    kind: "signal-lens",
    eventId: lensEvent.id,
    pubkey: witnessPubkey,
    witnessEventId: witnessEvent.id,
    createdAt: now,
  },
]);
assert.deepEqual(reducePhase1Relay(lensState, lensAction), lensState, "second lens is a no-op");

const initial = diffPhase1AcceptedEvidence(null, witnessedState);
assert.deepEqual(initial.delta, null, "initial accepted evidence is a silent baseline");
const live = diffPhase1AcceptedEvidence(initial.baseline, lensState);
assert.equal(live.delta?.kind, "lens");
const duplicate = diffPhase1AcceptedEvidence(live.baseline, lensState);
assert.equal(duplicate.delta, null);
const reconnect = diffPhase1AcceptedEvidence(null, lensState);
assert.equal(reconnect.delta, null, "reconnect history is silent");

// ---------------------------------------------------------------------------
// D-23 / D-24 — the runtime pulse presentation the scene actually drives.
// Executable, not a substring grep: the same reduction PalaceScene calls.
// ---------------------------------------------------------------------------
assert.equal(PHASE1_SIGNED_PULSE_MS, 900, "the pulse interval is one shared 900ms contract");

const mounted = createPhase1PulsePresentation();
assert.equal(mounted.pulse, null);

// Initial sync for a fresh receive epoch establishes a baseline and emits nothing.
const baselined = advancePhase1PulsePresentation(mounted, activationState, 0);
assert.equal(baselined.pulse, null, "initial sync is a silent baseline");

// A newly accepted witness delta inside the same epoch presents exactly one pulse.
const pulsed = advancePhase1PulsePresentation(baselined, witnessedState, 0);
assert.equal(pulsed.pulse?.kind, "witness");
assert.equal(pulsed.pulse?.eventId, witnessEvent.id);

// A lens delta arriving in a separate render must not disturb the in-flight witness pulse.
// This is the exact sequence (two unbatched relay messages) that used to strand the pulse.
const afterLens = advancePhase1PulsePresentation(pulsed, lensState, 0);
assert.equal(
  afterLens.pulse,
  pulsed.pulse,
  "a lens delta cannot restart or strand the witness pulse",
);

// Duplicate and replayed evidence stay silent.
const afterDuplicate = advancePhase1PulsePresentation(afterLens, lensState, 0);
assert.equal(afterDuplicate.pulse, afterLens.pulse, "duplicate evidence emits no new pulse");

// Reconnect is a new receive epoch: drop the transient effect and re-baseline without replay.
const afterReconnect = advancePhase1PulsePresentation(afterDuplicate, lensState, 1);
assert.equal(afterReconnect.pulse, null, "reconnect clears the transient pulse");
const afterReplay = advancePhase1PulsePresentation(afterReconnect, lensState, 1);
assert.equal(afterReplay.pulse, null, "replayed history after reconnect stays silent");

// Mount/reload against already accepted historical evidence is silent.
const remounted = advancePhase1PulsePresentation(createPhase1PulsePresentation(), lensState, 0);
assert.equal(remounted.pulse, null, "a reload that starts with accepted history never pulses");
const remountedNext = advancePhase1PulsePresentation(remounted, lensState, 0);
assert.equal(remountedNext.pulse, null);

// A lens-only delta never produces a witness pulse.
const lensOnly = advancePhase1PulsePresentation(
  advancePhase1PulsePresentation(createPhase1PulsePresentation(), witnessedState, 3),
  lensState,
  3,
);
assert.equal(lensOnly.pulse, null, "only an accepted witness delta drives the cyan pulse");

// The scene wires that reduction and the shared interval; the helpers are not test-only.
assert.match(palaceSource, /advancePhase1PulsePresentation/);
assert.match(palaceSource, /createPhase1PulsePresentation/);
assert.match(palaceSource, /PHASE1_SIGNED_PULSE_MS/);
assert.doesNotMatch(
  palaceSource,
  /setTimeout\(\(\) => setSignedPulseDelta\(null\), 900\)/,
  "the clearing timer must use the shared contract, not a literal",
);
// The clearing timer is owned by an effect keyed on the presented pulse alone, so a later
// witness-to-lens update can neither re-run nor cancel it. This is the 900ms stick fix.
assert.match(
  palaceSource,
  /if \(!signedPulseDelta\) return;[\s\S]{0,320}?\}, \[signedPulseDelta\]\);/,
  "the pulse-clearing effect must depend only on the presented pulse",
);

// ---------------------------------------------------------------------------
// Accessible witness acceptance (D-23, D-05) and functional a11y controls.
// ---------------------------------------------------------------------------
const noAnswerMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, { state: activationState }),
);
assert.match(noAnswerMarkup, /Relay is OPEN/);
assert.match(noAnswerMarkup, /No answer yet\. The light stays on\./);
assert.match(noAnswerMarkup, /open-circle|◯|steady/i);
assert.doesNotMatch(noAnswerMarkup, /online|participant|people nearby|deadline|penalty|count/i);
assert.doesNotMatch(noAnswerMarkup, /Pulse accepted/, "no witness copy before an accepted witness");

const witnessMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, { state: witnessedState }),
);
assert.match(witnessMarkup, /Pulse accepted/);
assert.match(witnessMarkup, /Your signed light reached this relay\./);
assert.equal(occurrences(witnessMarkup, "Pulse accepted"), 1, "acceptance announces exactly once");
assert.match(
  witnessMarkup,
  /data-phase1-witness="accepted"[\s\S]{0,400}?aria-live="polite"[\s\S]{0,200}?Pulse accepted/,
  "witness acceptance lives in one polite live region",
);
assert.match(witnessMarkup, /↯|lightning|path/i, "acceptance carries a non-color icon");
assert.doesNotMatch(
  witnessMarkup,
  /No answer yet/,
  "an accepted witness replaces the no-answer copy",
);

// Muted and reduced effects are real inputs, not overlay-local decoration.
const quietMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, {
    state: witnessedState,
    muted: true,
    reducedEffects: true,
  }),
);
assert.match(
  quietMarkup,
  /\[Signed witness received\.\]/,
  "muted/reduced effects expose the subtitle",
);
assert.match(quietMarkup, /aria-pressed="true"/);
assert.match(quietMarkup, /Reduced effects: on/);
assert.match(quietMarkup, /Muted/);
assert.doesNotMatch(noAnswerMarkup, /aria-pressed="true"/);
assert.match(noAnswerMarkup, /Reduced effects: off/);

assert.doesNotMatch(
  overlaySource,
  /setReducedEffects|setMuted/,
  "the overlay must not own a private copy of the accessibility settings",
);
assert.match(overlaySource, /onToggleReducedEffects/);
assert.match(overlaySource, /onToggleMuted/);
assert.match(palaceSource, /reducedEffects=\{reducedEffects\}/);
assert.match(palaceSource, /muted=\{muted\}/);
assert.match(palaceSource, /onToggleReducedEffects=/);
assert.match(palaceSource, /onToggleMuted=/);
// A mid-session OS preference change must reach the running experience.
assert.match(
  palaceSource,
  /matchMedia\?\.\("\(prefers-reduced-motion: reduce\)"\)[\s\S]{0,400}?addEventListener\("change"/,
  "the scene must follow prefers-reduced-motion changes mid-session",
);

// The CSS reduced-motion fallback must target the class the scene actually renders.
assert.match(palaceSource, /className=\{[\s\S]{0,200}?phase1-signed-pulse-path/);
assert.match(
  cssSource,
  /\.phase1-signed-pulse-path \{[\s\S]{0,160}?animation: phase1-signed-pulse 900ms/,
);
assert.match(
  cssSource,
  /@media \(prefers-reduced-motion: reduce\) \{\s*\.phase1-signed-pulse-path/,
  "the reduced-motion fallback must target the rendered pulse class",
);
assert.doesNotMatch(
  cssSource,
  /\.phase1-signed-pulse(?![-\w])/,
  "the dead .phase1-signed-pulse selector must not come back",
);
assert.match(cssSource, /overflow-wrap:\s*anywhere/);

const lensMarkup = renderToStaticMarkup(
  React.createElement(Phase1RelayOverlay, { state: lensState }),
);
assert.match(lensMarkup, /Lens added\./);
assert.match(lensMarkup, /RELAY · BUILT BY/);
assert.match(lensMarkup, /SIGNAL LENS · ADDED BY/);
assert.match(lensMarkup, new RegExp(witnessPubkey));
assert.match(
  lensMarkup,
  new RegExp(creatorPubkey),
  "creator attribution survives the additive lens",
);
assert.doesNotMatch(lensMarkup, /verified human|Palace handle|dangerouslySetInnerHTML/i);

assert.match(palaceSource, /SignedPulseEffect/);
assert.match(palaceSource, /createPhase1AuthorizedEvidenceAction/);
assert.doesNotMatch(
  palaceSource,
  /dispatchPhase1Relay\(\{\s*type:\s*"(?:witness_verified|lens_verified)"/s,
);
assert.match(streetSource, /SignalLens/);
assert.match(streetSource, /acceptedLens/);
assert.match(overlaySource, /No answer yet\. The light stays on\./);
assert.match(overlaySource, /Reduced effects/);
assert.match(overlaySource, /Muted/);
assert.match(overlaySource, /aria-live="polite"/);
assert.doesNotMatch(overlaySource, /dangerouslySetInnerHTML/);
assert.doesNotMatch(
  relaySource,
  /signPhase1|publishPhase1|createPhase1RelaySubscription|parsePhase1RelayEvent|verifyEvent/,
);
assert.doesNotMatch(
  relaySource,
  /participant count|fake avatar|townsfolk|ghost session|ambient evidence/i,
);
assert.doesNotMatch(palaceSource, /from ["'](?:nostr-tools|@nostr-dev-kit\/ndk)/);
assert.match(transportSource, /createPhase1LiveEvidenceGate/);

// ---------------------------------------------------------------------------
// Accessibility source contracts (01-05-PLAN.md:196,209; 01-UI-SPEC.md:71,373,400-405).
// Keyboard operation, focus containment/return, 44px targets, 200%-zoom reflow.
// ---------------------------------------------------------------------------

// Every interactive control in the overlay is a real button: reachable by Tab and activatable by
// Enter/Space without a synthetic key handler. A click-only div would fail here.
assert.equal(
  occurrences(overlaySource, "<button"),
  occurrences(overlaySource, 'type="button"'),
  "every overlay control must be a keyboard-activatable button",
);
assert.doesNotMatch(
  overlaySource,
  /<(?:div|span|p|section|li)[^>]*\sonClick=/,
  "no overlay action may hang off a non-focusable element",
);
assert.match(
  noAnswerMarkup,
  /<button data-phase1-safe-control="true" type="button">Copy invite<\/button>/,
  "the invite invoker renders as a real button, not a decorated click target",
);

// The invite consent sheet is a modal dialog: focus moves in, Tab and Shift+Tab wrap inside it,
// Escape closes it, and every close path returns focus to the Copy invite button that opened it.
const inviteRegionStart = overlaySource.indexOf("const [inviteOpen");
const inviteRegionEnd = overlaySource.indexOf('data-phase1-witness="consent"');
assert.ok(
  inviteRegionStart > 0 && inviteRegionEnd > inviteRegionStart,
  "invite region is locatable",
);
const inviteSource = overlaySource.slice(inviteRegionStart, inviteRegionEnd);

assert.match(inviteSource, /aria-modal="true"/);
assert.match(inviteSource, /<dialog/);
assert.match(
  inviteSource,
  /inviteHeadingRef\.current\?\.focus\(\)/,
  "opening moves focus to the heading",
);
assert.match(inviteSource, /inviteInvokerRef/, "the invoking Copy invite button is tracked by ref");
assert.match(
  inviteSource,
  /ref=\{inviteInvokerRef\}/,
  "the ref is attached to the Copy invite control",
);
assert.match(
  inviteSource,
  /inviteInvokerRef\.current\?\.focus\(\)/,
  "closing the invite dialog returns focus to its invoker",
);
assert.match(
  inviteSource,
  /event\.key === "Escape"[\s\S]{0,300}?event\.preventDefault\(\)/,
  "Escape closes the invite dialog",
);
assert.match(
  inviteSource,
  /event\.key !== "Tab"[\s\S]{0,600}?event\.shiftKey && document\.activeElement === first[\s\S]{0,160}?last\?\.focus\(\)/,
  "Shift+Tab on the first control wraps to the last",
);
assert.match(
  inviteSource,
  /!event\.shiftKey && document\.activeElement === last[\s\S]{0,160}?first\?\.focus\(\)/,
  "Tab on the last control wraps to the first",
);
assert.match(
  inviteSource,
  /addEventListener\("keydown"[\s\S]{0,200}?removeEventListener\("keydown"/,
  "the invite key handler is torn down with the dialog",
);
assert.equal(
  occurrences(overlaySource, "setInviteOpen(false)"),
  1,
  "every invite close path must route through the single focus-returning helper",
);

// The three phase-1 dialogs share one containment pattern; none may regress to a bare panel.
for (const dialog of ["phase1-wire", "phase1-kerni-dialogue", "phase1-invite"]) {
  assert.equal(
    occurrences(overlaySource, `className="${dialog}"`),
    1,
    `${dialog} must render exactly one classed panel`,
  );
}
assert.equal(
  occurrences(overlaySource, 'aria-modal="true"'),
  occurrences(overlaySource, "<dialog"),
  "every modal panel uses native dialog semantics",
);
assert.equal(
  occurrences(overlaySource, 'document.addEventListener("keydown"'),
  3,
  "wire, Kerni, and invite each contain their own focus",
);

// 44px minimum targets (01-UI-SPEC.md:71) — asserted on the CSS the panels actually carry.
assert.match(
  cssSource,
  /\.phase1-wire-reopen \{[\s\S]{0,240}?min-height: 44px/,
  "the Wire reopen control keeps a 44px target",
);
assert.match(
  cssSource,
  /\.phase1-wire__dismiss \{[\s\S]{0,300}?min-height: 48px/,
  "the primary Put away action keeps its 48px target",
);
assert.match(
  cssSource,
  /\.phase1-invite button \{[\s\S]{0,160}?min-height: 44px;\s*min-width: 44px/,
  "every invite dialog action keeps a 44x44px target",
);
assert.match(
  cssSource,
  /\.phase1-invite button:focus-visible[\s\S]{0,200}?outline: 2px solid var\(--gold-bright\);\s*outline-offset: 3px/,
  "the invite dialog reuses the visible focus outline",
);

// 200% zoom: the modal reflows and scrolls internally; essential copy wraps instead of clipping,
// and no phase-1 surface forces horizontal page scrolling.
assert.match(
  cssSource,
  /\.phase1-invite \{[\s\S]{0,320}?max-width: min\([\s\S]{0,200}?max-height: [\s\S]{0,120}?overflow-y: auto/,
  "the invite dialog reflows within the viewport and scrolls inside itself at 200% zoom",
);
assert.match(cssSource, /\.phase1-invite \{[\s\S]{0,400}?overscroll-behavior: contain/);
assert.match(
  cssSource,
  /\.phase1-wire \{[\s\S]{0,320}?width: min\(384px, calc\(100vw - 48px\)\)/,
  "the Wire panel is viewport-bounded, never fixed wider than the page",
);
assert.match(cssSource, /\.phase1-wire__body \{[\s\S]{0,220}?overflow: auto/);
assert.match(
  cssSource,
  /\.phase1-invite p,\s*\.phase1-invite h2,\s*\.phase1-invite textarea \{[\s\S]{0,160}?overflow-wrap: anywhere/,
  "invite copy and the invite URL wrap rather than clip at 200% zoom",
);
assert.doesNotMatch(
  cssSource,
  /\.phase1-(?:invite|wire|subtitle|attribution)[^{]*\{[^}]*text-overflow: ellipsis/,
  "essential phase-1 copy must never ellipsize",
);

// ---------------------------------------------------------------------------
// ART-01 — interruption and monotonic accepted presence.
// ---------------------------------------------------------------------------
const sample = (state: ReturnType<typeof createAttentivePresenceState>, deltaMs: number) =>
  reduceAttentivePresence(state, {
    type: "active_frame_sampled",
    deltaMs,
    foregroundFocused: true,
    documentVisible: true,
  });

let presence = createAttentivePresenceState();
// Just below the threshold never accepts.
for (
  let elapsed = 0;
  elapsed + ATTENTIVE_FRAME_MAX_MS <= ATTENTIVE_PRESENCE_THRESHOLD_MS - ATTENTIVE_FRAME_MAX_MS;
  elapsed += ATTENTIVE_FRAME_MAX_MS
) {
  presence = sample(presence, ATTENTIVE_FRAME_MAX_MS);
}
assert.equal(presence.presenceAccepted, false, "just below the threshold is not accepted presence");
const justBelow = presence.accumulatedMs;
assert.ok(justBelow < ATTENTIVE_PRESENCE_THRESHOLD_MS);

// Reopening the Wire pauses accumulation and never decrements accepted time.
const paused = reduceAttentivePresence(presence, { type: "feed_changed", feed: "reopened" });
assert.equal(
  sample(paused, ATTENTIVE_FRAME_MAX_MS).accumulatedMs,
  justBelow,
  "a reopened feed pauses",
);
const resumed = reduceAttentivePresence(paused, { type: "feed_changed", feed: "away" });
assert.equal(resumed.accumulatedMs, justBelow, "pausing never decrements accepted attention");

// A hidden tab cannot silently complete the choreography.
assert.equal(
  reduceAttentivePresence(resumed, {
    type: "active_frame_sampled",
    deltaMs: ATTENTIVE_PRESENCE_THRESHOLD_MS,
    foregroundFocused: true,
    documentVisible: false,
  }),
  resumed,
  "a suspended tab cannot complete presence",
);

// Exact threshold accepts, and acceptance is monotonic afterwards.
let accepted = resumed;
while (!accepted.presenceAccepted) accepted = sample(accepted, ATTENTIVE_FRAME_MAX_MS);
assert.equal(accepted.presenceAccepted, true);
const afterInterruption = reduceAttentivePresence(accepted, {
  type: "feed_changed",
  feed: "foreground",
});
assert.equal(
  afterInterruption.presenceAccepted,
  true,
  "accepted presence is monotonic across interruption",
);
assert.equal(
  reduceAttentivePresence(afterInterruption, { type: "feed_changed", feed: "reopened" })
    .presenceAccepted,
  true,
);

// ---------------------------------------------------------------------------
// PLAC-05 — one immutable fixed-socket winner.
// ---------------------------------------------------------------------------
const readyState = () =>
  createPhase1RelayState({
    memoryFragment: { source: "kerni-orientation", meaning: "leave-one-small-useful-thing" },
    inspirationChoice: { intent: "connect-with-others" },
  });
const assembled = (() => {
  let current = readyState();
  for (const part of RELAY_PART_ORDER) {
    current = reducePhase1Relay(current, { type: "pickup_part", part, origin: "player-physical" });
    current = reducePhase1Relay(current, {
      type: "seat_part",
      part,
      cradleId: part,
      origin: "player-physical",
    });
  }
  return current;
})();
const attempt = "uat-attempt-1";
const requested = reducePhase1Relay(assembled, {
  type: "place_requested",
  socketId: RELAY_SOCKET_ID,
  attemptId: attempt,
  origin: "player-physical",
});
assert.equal(requested.placement.status, "pending");
const placed = reducePhase1Relay(requested, {
  type: "placement_accepted",
  socketId: RELAY_SOCKET_ID,
  attemptId: attempt,
  origin: "fixed-socket-completion",
});
assert.equal(placed.status, "accepted");
assert.equal(placed.placement.acceptedSocketId, RELAY_SOCKET_ID);
assert.equal(
  reducePhase1Relay(placed, {
    type: "placement_accepted",
    socketId: RELAY_SOCKET_ID,
    attemptId: attempt,
    origin: "fixed-socket-completion",
  }),
  placed,
  "the same attempt is idempotent",
);
assert.equal(
  reducePhase1Relay(placed, {
    type: "placement_accepted",
    socketId: RELAY_SOCKET_ID,
    attemptId: "uat-attempt-2",
    origin: "fixed-socket-completion",
  }),
  placed,
  "a competing attempt cannot displace the accepted winner",
);
assert.equal(
  reducePhase1Relay(placed, {
    type: "placement_failed",
    attemptId: attempt,
    origin: "fixed-socket-completion",
  }),
  placed,
  "a stale completion cannot unseat the accepted relay",
);

// ---------------------------------------------------------------------------
// D-01 … D-26 — executable and exact-source coverage, not a planning-doc grep.
// ---------------------------------------------------------------------------
const DECISION_COVERAGE: Readonly<Record<string, () => void>> = {
  "D-01": () => {
    assert.deepEqual(
      INTRO_SEQUENCE.map((beat) => beat.id),
      ["intro_video", "card_bite", "card_wake", "card_street"],
    );
    assert.equal(INTRO_CARDS.length, 3);
    assert.match(introSource, /Walk in/);
  },
  "D-02": () => {
    assert.equal(STREET_GLIMPSE_MS, 2400);
    assert.match(
      palaceSource,
      /setWireOpen\(false\);[\s\S]{0,200}?setTimeout\(\(\) => setWireOpen\(true\), STREET_GLIMPSE_MS\)/,
      "the Street is unobstructed for the glimpse before the Wire enters",
    );
  },
  "D-03": () => {
    assert.equal(FICTIONAL_WIRE_CARDS.length, 3);
    assert.match(overlaySource, /Put away/);
    assert.match(overlaySource, /Press Escape to put away the Wire\./);
    assert.equal(introSkipTarget("video"), "cards");
    assert.equal(introSkipTarget("cards"), "complete");
  },
  "D-04": () => {
    assert.equal(ATTENTIVE_PRESENCE_THRESHOLD_MS, 36_000);
    assert.equal(accepted.presenceAccepted, true);
    assert.doesNotMatch(overlaySource, /progress|percent|countdown|timer/i);
  },
  "D-05": () => {
    assert.match(overlaySource, /\[The workbench is easier to notice now\.\]/);
    assert.match(overlaySource, /\[Signed witness received\.\]/);
  },
  "D-06": () => {
    assert.equal(afterInterruption.presenceAccepted, true);
    assert.equal(paused.accumulatedMs, justBelow);
  },
  "D-07": () => {
    for (const card of INTRO_CARDS) {
      assert.ok(card.kicker.length > 0 && card.caption.length > 0 && card.line.length > 0);
    }
    assert.equal(INTRO_CARDS[2]?.kicker, "LOCKTARD STREET");
  },
  "D-08": () => {
    assert.match(overlaySource, /Listen to Kerni/);
    assert.match(kerniSource, /Kerni/);
  },
  "D-09": () => {
    assert.match(overlaySource, /data-kerni-proximity="2\.6m"/);
    assert.match(
      overlaySource,
      /kerniInRange && !handoffState\.memoryFragment && !kerniDialogueOpen/,
      "the Kerni label is proximity-scoped, never a permanent nameplate",
    );
  },
  "D-10": () => {
    const handoff = reduceRelayHandoff(createRelayHandoffState(), {
      type: "kerni_interaction_requested",
      origin: "player",
      proximity: true,
      worldFocusOwned: true,
    });
    assert.equal(handoff.orientationInteractionAccepted, true);
    assert.equal(
      reduceRelayHandoff(createRelayHandoffState(), {
        type: "kerni_interaction_requested",
        origin: "player",
        proximity: true,
        worldFocusOwned: false,
      } as never).orientationInteractionAccepted,
      false,
      "E cannot fire while a DOM control owns focus",
    );
  },
  "D-11": () => {
    const kerniLineMatches = overlaySource.match(
      /Welcome\. No rush — the Palace gets better when people leave something useful behind\. Start\s+with one small thing\./g,
    );
    assert.equal(kerniLineMatches?.length ?? 0, 1, "Kerni speaks exactly one line");
  },
  "D-12": () => {
    assert.match(overlaySource, /KERNI · WORLD AGENT · SUGGESTION ONLY/);
  },
  "D-13": () => {
    const acknowledged = reduceRelayHandoff(createRelayHandoffState(), {
      type: "kerni_orientation_acknowledged",
      origin: "player",
    });
    assert.equal(
      acknowledged.memoryFragment,
      null,
      "Kerni cannot authorize without the player interaction",
    );
    assert.equal(relayAssemblyEligible(createRelayHandoffState()), false);
  },
  "D-14": () => {
    assert.match(streetSource, /presenceAccepted/);
    assert.doesNotMatch(streetSource, /applause|quest complete|badge/i);
  },
  "D-15": () => {
    assert.doesNotMatch(overlaySource, /townsfolk|ghost|remote player|online count/i);
    assert.match(
      palaceSource,
      /world === "street" && phase1RelayState\.status === "accepted" \? \(\s*<MultiplayerLayer/,
      "no live room before accepted relay activation",
    );
  },
  "D-16": () => {
    assert.match(streetSource, /RelayWorkbench/);
    assert.equal(PHASE1_RELAY_ID, "werkstattgasse:z1:relay:1");
  },
  "D-17": () => {
    assert.deepEqual(RELAY_PART_ORDER, ["foot", "coil", "aperture"]);
    assert.deepEqual(assembled.assembly.seatedParts, ["foot", "coil", "aperture"]);
    assert.equal(assembled.assembly.carriedPart, "completed-relay");
  },
  "D-18": () => {
    assert.equal(RELAY_SOCKET_ID, "z1-relay-socket");
    assert.equal(placed.placement.acceptedSocketId, RELAY_SOCKET_ID);
  },
  "D-19": () => {
    assert.equal(placed.acceptedPlacement, true);
    assert.match(overlaySource, /OPEN/);
  },
  "D-20": () => {
    assert.equal(
      reducePhase1Relay(activationState, {
        type: "accepted_witness_delta",
        eventId: witnessId,
        pubkey: witnessPubkey,
        createdAt: now,
        origin: "presentation",
      } as never),
      activationState,
      "only Plan-04 authorized origins reach the reducer",
    );
    assert.match(relaySource, /plan-04-authorized/);
  },
  "D-21": () => {
    assert.match(overlaySource, /The light is on\. Invite one person when you want to\./);
    assert.match(overlaySource, /Copy invite/);
  },
  "D-22": () => {
    assert.match(palaceSource, /join/);
    assert.equal(activationState.activation?.source, "verified-invite-capability");
  },
  "D-23": () => {
    assert.equal(pulsed.pulse?.eventId, witnessEvent.id);
    assert.equal(baselined.pulse, null);
    assert.match(witnessMarkup, /Pulse accepted/);
  },
  "D-24": () => {
    const forged = reducePhase1Relay(activationState, {
      type: "accepted_witness_delta",
      eventId: witnessId,
      pubkey: creatorPubkey,
      createdAt: now,
      origin: "plan-04-authorized",
    });
    assert.equal(forged.acceptedWitness, null, "the creator cannot witness their own relay");
    assert.equal(remounted.pulse, null);
  },
  "D-25": () => {
    assert.equal(lensState.acceptedLens?.eventId, lensEvent.id);
    assert.deepEqual(reducePhase1Relay(lensState, lensAction), lensState);
    assert.deepEqual(lensState.activation, creatorBeforeLens);
  },
  "D-26": () => {
    assert.match(noAnswerMarkup, /No answer yet\. The light stays on\./);
    assert.doesNotMatch(noAnswerMarkup, /urgency|expires|hurry|failed to attract/i);
  },
};

const declaredDecisions = Array.from(
  { length: 26 },
  (_, index) => `D-${String(index + 1).padStart(2, "0")}`,
);
assert.deepEqual(
  Object.keys(DECISION_COVERAGE),
  declaredDecisions,
  "every locked decision needs coverage",
);
for (const decision of declaredDecisions) {
  try {
    DECISION_COVERAGE[decision]?.();
  } catch (error) {
    throw new Error(`${decision} coverage failed: ${(error as Error).message}`);
  }
}

console.log("PHASE 1 REMIX UAT SMOKE RED/GREEN CONTRACT");
