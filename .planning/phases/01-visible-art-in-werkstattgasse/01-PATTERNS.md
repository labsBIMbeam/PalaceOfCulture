# Phase 1: Visible Art in Werkstattgasse — Pattern Map

**Mapped:** 2026-07-26  
**Scope:** Bounded local analog mapping for the Phase-1 desktop-Web slice  
**Planning rule:** Every file or symbol described as proposed below is not claimed to exist; the planner owns its final name and decomposition.

## File Classification

| Existing / proposed target | Status | Role | Data flow | Closest local analog | Match quality |
|---|---|---|---|---|---|
| `apps/web/src/meaningverse/onboardingStory.ts` | existing; modify canonical copy/stages | model / canonical copy | pure transform | its own `INTRO_SEQUENCE`, `TUTORIAL`, and `tutorialStageFor` | exact extension point, conflicting current stages |
| Small Phase-1 truth module beside `apps/web/src/meaningverse/model.ts` (exact filename planner-owned) | **proposed** | model / reducer / validator | pure transform, event-driven | `apps/web/src/meaningverse/model.ts` | strong pure-helper analog; no relay reducer exists |
| `apps/web/src/net/chat.ts` | existing; hard-gate or remove mock ambience from the Phase-1 proof path | transport service | pub-sub | its own `ChatTransport` boundary | exact transport boundary, conflicting implementation |
| Narrow relay/witness adapter under `apps/web/src/net/` if `ChatTransport` cannot remain narrow (exact filename planner-owned) | **proposed** | transport adapter | pub-sub, event-driven | `apps/web/src/net/chat.ts`; local `nostr-tools` declarations | role match only; no signer adapter exists |
| `apps/web/src/scene/PalaceScene.tsx` | existing; orchestration only | scene controller | event-driven | its own interaction and multiplayer lifecycle | exact orchestration seam, conflicting eager connection |
| `apps/web/src/scene/StreetWorld.tsx` and `apps/web/src/scene/KerniFamiliar.tsx` | existing; bounded Z1 presentation | scene components | prop-driven rendering | current workshop/Kerni composition | strong composition analog; no socket reducer analog |
| Phase-owned feed, relay-status, invite, and signer-consent DOM overlay component(s) under `apps/web/src/ui/` (exact filenames planner-owned) | **proposed** | accessible UI components | event-driven, request/response | `apps/web/src/ui/MeaningPath.tsx`; `apps/web/src/frontend/frontend.css` | partial UI/focus/invite analog; do not copy quest rail |
| Phase-1 smoke files under `apps/web/tests/` for truth, relay/witness security, and fixed placement (exact filenames planner-owned) | **proposed** | tests | batch assertions / source contract | `apps/web/tests/meaningverse-smoke.ts` | exact test style; relay fixtures do not exist |

The diegetic relay mesh, light, status plate, and lens are presentation. They must render accepted application facts and must not become a second truth store. `PalaceScene.tsx` coordinates effects and availability; the proposed pure module owns transition acceptance; the transport adapter only carries and validates external evidence.

## Pattern Assignments

### Canonical intro copy and phase-stage adjustment

**Target:** existing `apps/web/src/meaningverse/onboardingStory.ts`  
**Analog:** current canonical sequence and pure stage derivation in the same file.

**Preserve the authoritative video-plus-three-card sequence** (`apps/web/src/meaningverse/onboardingStory.ts:1-55`):

```ts
export type IntroBeat = {
  readonly id: "intro_video" | "card_bite" | "card_wake" | "card_street";
  readonly visualMode: "video" | "card";
  // canonical copy fields
};

export const INTRO_SEQUENCE: readonly IntroBeat[] = [
  { id: "intro_video", visualMode: "video", /* ... */ },
  { id: "card_bite", visualMode: "card", /* ... */ },
  { id: "card_wake", visualMode: "card", /* ... */ },
  { id: "card_street", visualMode: "card", /* ... */ },
] as const;

export function introSkipTarget(phase: "video" | "cards"): "cards" | "complete" {
  return phase === "video" ? "cards" : "complete";
}
```

The implementation must retain the concrete three current cards and the `introSkipTarget` rule. Adjust only obsolete tutorial vocabulary/copy after the canonical intro. The current `enter` stage explicitly conflicts with Phase 1 (`apps/web/src/meaningverse/onboardingStory.ts:69-107`):

```ts
enter: {
  objective: "Walk in. The room connects on its own.",
  status: "The live room is connected.",
  worldResponse: "Connected sessions become visible; retained room modules stay visible.",
  offlineFallback: "Walking and looking still work. No room or player is simulated.",
},
```

Replace the enter-time connection and ship-part assumptions with the locked relay flow; do not layer contradictory Phase-1 copy elsewhere. Keep the existing pattern of deriving framing from application facts rather than awarding progress in copy code (`apps/web/src/meaningverse/onboardingStory.ts:133-150`).

### App truth separate from effects

**Target:** proposed small pure Phase-1 truth module beside `meaningverse/model.ts`; exact file and symbols are planner-owned.  
**Analog:** `apps/web/src/meaningverse/model.ts`.

**Pure sanitation at the model boundary** (`apps/web/src/meaningverse/model.ts:17-24`):

```ts
export function buildMeaningverseInvite(currentHref: string): string {
  const url = new URL(currentHref);
  url.search = "";
  url.searchParams.set("join", "street");
  url.hash = "";
  return url.toString();
}
```

Reuse this helper rather than concatenating invite URLs. Showing this sanitized URL is not proof of sharing or witness.

**Silent baseline followed by accepted live delta** (`apps/web/src/meaningverse/model.ts:31-49`, `apps/web/src/meaningverse/model.ts:51-83`):

```ts
export function diffShipPlacements(
  previous: ShipModuleSnapshot[] | null,
  next: ShipModuleSnapshot[],
  localSessionId?: string,
): ShipPlacementEvent[] {
  if (previous === null) return [];
  const known = new Set(previous.map((module) => module.id));
  return next
    .filter((module) => !known.has(module.id))
    .map((module) => ({
      module,
      byLocalPlayer: Boolean(localSessionId) && module.authorSessionId === localSessionId,
    }));
}
```

`diffShipPlacementEpoch` additionally clears its baseline whenever status is not connected, establishes a silent baseline for a new/reconnected session, and emits only later diffs. Apply the behavior—not the ship types—to validated witness and lens evidence. Initial sync, reconnect, and replay must produce no pulse, toast, or lens animation.

**Draft before human signature** (`apps/web/src/meaningverse/model.ts:107-135`):

```ts
export function createShipModuleNostrDraft(
  module: ShipModuleSnapshot,
  createdAt = Math.floor(Date.now() / 1000),
): NostrEventDraft {
  if (!Number.isInteger(createdAt) || createdAt < 0)
    throw new Error("createdAt must be Unix seconds");
  return {
    kind: 30078,
    created_at: createdAt,
    content: JSON.stringify({ /* bounded application data */ }),
    tags: [/* bounded tags */],
  };
}
```

The existing helper returns an unsigned draft and cannot sign or publish. Preserve that authority boundary for the Phase-1 witness draft: validate local intent, prepare bounded event data, request explicit human-controlled signature through an adapter, then validate the returned signed event before reducing application state. Do not copy the ship event kind, payload, or tags; the Phase-1 schema has no analog and must be designed explicitly.

### Strict signed-event validation seam from installed local APIs

**Target:** proposed narrow transport/validation adapter under `apps/web/src/net/` or the existing `chat.ts` boundary.  
**Verified installed API:** `nostr-tools` 2.23.5.

The locally installed package exports a dedicated pure entry point (`apps/web/node_modules/nostr-tools/package.json:17-35`) and its declarations expose the exact verification primitive (`apps/web/node_modules/nostr-tools/lib/types/pure.d.ts:1-8`):

```ts
import { Event, EventTemplate, UnsignedEvent, VerifiedEvent } from './core.ts';
// ...
export declare const verifyEvent: (event: Event) => event is VerifiedEvent;
```

`apps/web/node_modules/nostr-tools/lib/types/index.d.ts:1-4` re-exports the pure API, so `verifyEvent` is available from the package root as well. Prefer the explicit pure boundary when implementing the adapter. This resolves the local cryptographic verification primitive; it does **not** resolve the Phase-1 event schema or signer integration.

Fail closed in this order: parse unknown relay input into a phase-owned bounded shape; reject unknown/extra/oversize/stale/wrong-binding input; call the installed `verifyEvent` only after the value satisfies the library `Event` shape; deduplicate by accepted event identity; authorize the current phase transition; then reduce app truth. Never make a type assertion on unknown input and treat `verifyEvent` alone as schema/binding validation.

### Transport adapter isolation and no-fake-peer hard gate

**Target:** existing `apps/web/src/net/chat.ts`, or a proposed narrow adapter beside it if the chat message contract is unsuitable.  
**Analog:** exact interface boundary in `apps/web/src/net/chat.ts:13-31`.

```ts
export interface ChatTransport {
  send(channel: ChatChannelId, body: string): void;
  subscribe(listener: (message: ChatMessage) => void): () => void;
  dispose(): void;
}
```

Copy the dependency direction: scene/UI sees a small application-facing adapter, never NDK/`nostr-tools` event objects, relay subscriptions, or signer details. Do not invent relay methods on `ChatTransport` during planning; first choose whether its message shape can honestly carry the bounded evidence or whether a separate narrow adapter is clearer.

**Hard gate, not an analog for evidence:** `createMockChatTransport` contains named fake townsfolk (`apps/web/src/net/chat.ts:33-48`), a fabricated backlog (`apps/web/src/net/chat.ts:56-79`), and scheduled ambience (`apps/web/src/net/chat.ts:81-118`):

```ts
const AMBIENT = [/* Wren, Tomas, Isa, Pelle, Bríd */];
const backlog: ChatMessage[] = [/* Palace system line and Wren welcome */];
ambientTimer = setInterval(() => { /* emit an ambient townsperson */ }, 12000);
```

For the Phase-1 path these inputs must be absent or hard-gated before accepted relay activation, and they are never evidence for activation, witness, identity, remix, online count, or completion. A source-contract/transport test must prove the factory/connect/subscribe path and this ambience cannot satisfy social truth. The mock may remain for unrelated legacy paths only if isolation is explicit and tested.

### `PalaceScene.tsx` as orchestration only

**Target:** existing `apps/web/src/scene/PalaceScene.tsx`.  
**Analogs:** current multiplayer lifecycle, interaction routing, and world composition.

The current scene owns transport lifecycle and subscribes presentation to view state (`apps/web/src/scene/PalaceScene.tsx:596-617`). That ownership location is correct, but the current effect eagerly connects whenever `world === "street"` (`apps/web/src/scene/PalaceScene.tsx:682-724`):

```ts
useEffect(() => {
  if (world !== "street") {
    multiplayerTransportRef.current = null;
    setMultiplayerSession({ transport: null });
    return;
  }
  // construct transport
  multiplayerTransportRef.current = transport;
  setMultiplayerSession({ transport });
  transport.connect();
  return () => { void transport.leave(); };
}, [avatarAssetId, handle, world]);
```

Extend this effect's eligibility gate to accepted relay activation; simply entering Street cannot construct/connect the Phase-1 communication proof. Keep reducer decisions outside the effect. Effects may connect, disconnect, focus, and animate only after pure truth says they are eligible.

The existing interaction architecture separates the nearby object from activation intent (`apps/web/src/scene/PalaceScene.tsx:790-809`) and routes `KeyE` only in walk mode (`apps/web/src/scene/PalaceScene.tsx:879-899`):

```ts
const [activeInteract, setActiveInteract] = useState<Interactable | null>(null);
const activeRef = useRef<Interactable | null>(null);
activeRef.current = activeInteract;

if (event.code !== "KeyE") return;
const el = document.activeElement;
if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
if (activeRef.current) activateInteract(activeRef.current);
```

Reuse proximity plus explicit `E`, but strengthen the focus guard for Phase-1 overlays to cover focused buttons, links, and modal-owned actions—not only text inputs. `E` must never place, dismiss, sign, or publish through a focused consent surface. The existing focus-in movement release (`apps/web/src/scene/PalaceScene.tsx:947-963`) is the adjacent pattern for relinquishing world controls while DOM UI owns focus.

The scene currently mounts `StreetWorld`, `MeaningShip`, and multiplayer together (`apps/web/src/scene/PalaceScene.tsx:1199-1215`). Phase 1 should mount the bounded relay presentation here/through `StreetWorld`, derive it from accepted truth, and gate `MeaningShip`, remote players, broad chat, and online status out of the bounded proof path. Do not put relay parsing, signature verification, or reducer logic in this component.

### Bounded Z1 world composition; not generic placement

**Targets:** existing `apps/web/src/scene/StreetWorld.tsx` and `apps/web/src/scene/KerniFamiliar.tsx`.  
**Analog:** explicit workshop-group composition and fixed Kerni placement.

`StreetWorld` composes workshop scenery and Kerni as explicit bounded children (`apps/web/src/scene/StreetWorld.tsx:468-478`):

```tsx
<PropBoundary>
  <Workshop />
</PropBoundary>
<PropBoundary>
  <Suspense fallback={null}>
    <KerniFamiliar position={[-27.5, 0, 93]} rotationY={-2.16} />
  </Suspense>
</PropBoundary>
```

Follow this composition style for exactly one Z1 workbench interaction group and one brass-collared socket at a reviewed fixed coordinate near Kerni. The only valid final destination is that socket. Do not route Phase 1 through `BuilderHud`, catalog inventory, grid snapping, generic decoration, or arbitrary placement.

Keep Kerni presentational and non-blocking. `KerniFamiliar` is a small 0.85m, code-bobbing visual with one non-shadow warm light (`apps/web/src/scene/KerniFamiliar.tsx:14-18`, `apps/web/src/scene/KerniFamiliar.tsx:43-60`). It receives only position/rotation today and contains no truth transition. Preserve that direction: the scene may pass accepted presentation state or trigger one nonverbal reaction, but Kerni cannot assemble, place, sign, publish, authorize, or complete anything.

There is no existing exact fixed-socket or three-part reducer. The foot → coil → aperture order, matching cradles, carry state, pending/accepted placement, and one additive lens require phase-owned truth tests before scene rendering.

### Phase-owned DOM overlays: manual invite, focus, status, accessibility

**Targets:** proposed feed, relay status/invite, witness consent, and accessible status component(s) under `apps/web/src/ui/`.  
**Analog:** use only bounded parts of `MeaningPath.tsx` and existing CSS tokens; do not reuse its raid/step rail, ship form, room counts, or generic social module framing.

Use the sanitized helper and preserve explicit clipboard fallback semantics (`apps/web/src/ui/MeaningPath.tsx:112-121`):

```ts
const copyInvite = async () => {
  const invite = buildMeaningverseInvite(window.location.href);
  try {
    await navigator.clipboard.writeText(invite);
    setInviteState("copied");
  } catch {
    const manualCopy = window.prompt("Copy this invite, then press OK", invite);
    setInviteState(inviteStateAfterManualCopy(manualCopy));
  }
};
```

For Phase 1, implement the UI-SPEC's visible/selectable manual-copy panel rather than copying `window.prompt`; cancellation must leave sharing incomplete and relay `OPEN`. The analogous tests prove that a displayed/manual link is not automatically shared (`apps/web/tests/meaningverse-smoke.ts:130-139`).

Reuse scene-owned overlay visibility and explicit focus transfer. `MeaningPath` receives `open`, `onOpenChange`, and `focusNonce`, then selects its safe input after render (`apps/web/src/ui/MeaningPath.tsx:47-60`, `apps/web/src/ui/MeaningPath.tsx:90-95`). Phase-owned panels should move focus to a heading or first safe control, contain modal focus, and return focus to the invoking relay/feed control on close. Pending signer cancellation must use one fail-closed path.

Reuse the existing tokens (`apps/web/src/frontend/frontend.css:1-22`) and visible focus language (`apps/web/src/frontend/frontend.css:41-49`):

```css
:root {
  --gold-bright: #f3d27a;
  --soot: #2a1810;
  --panel: rgba(28, 19, 11, 0.88);
  --panel-strong: rgba(18, 12, 7, 0.95);
  --text: #f3e6c2;
  --body: #e6d6b4;
  --muted: #9c8a64;
}
button:focus-visible {
  outline: 2px solid var(--gold-bright);
  outline-offset: 3px;
}
```

Extend the 2px/3px `:focus-visible` treatment to every interactive Phase-1 control, not buttons only. Use text plus shape/icon and `aria-live="polite"` for terminal placement/invite/witness/lens results. The existing status output structure (`apps/web/src/scene/PalaceScene.tsx:636-650`) is a semantic analog, but Phase 1 must not copy participant counts or an animated reconnect pulse. Reduced effects, mute, and low bloom must leave all truth legible.

### Accepted-delta visual feedback

**Target:** phase-owned signed-pulse presentation mounted through the scene.  
**Analog:** `apps/web/src/scene/MeaningShip.tsx` for behavior only.

`MeaningShip` keeps an epoch baseline in a ref and a one-shot presentation event in component state (`apps/web/src/scene/MeaningShip.tsx:113-138`):

```ts
const previous = useRef<ShipPlacementEpoch | null>(null);
const [pulse, setPulse] = useState<ShipPlacementEvent | null>(null);
useEffect(() => {
  const { baseline, events, reset } = diffShipPlacementEpoch(
    previous.current,
    modules,
    status,
    localSessionId,
  );
  previous.current = baseline;
  if (reset) setPulse(null);
  const latest = events[events.length - 1];
  if (latest) setPulse(latest);
}, [modules, localSessionId, status]);
```

Copy only the silent-baseline/new-accepted-delta orchestration. Do not copy ship geometry, event types, 2.6-second expanding ring, large flare, room-module count, or broad peer coloring. Phase 1 requires one bounded 900ms cyan path only for a newly accepted validated pulse, with static/reduced-motion and subtitle equivalents.

### Exact smoke-test style and commands

**Targets:** proposed Phase-1 smoke files under `apps/web/tests/`; preserve existing regressions in `meaningverse-smoke.ts`.  
**Analog:** `apps/web/tests/meaningverse-smoke.ts`.

Use direct TypeScript execution, top-level `node:assert/strict`, small typed fixtures, and no testing framework wrapper (`apps/web/tests/meaningverse-smoke.ts:1-55`). Pure truth assertions are direct `assert.equal`/`assert.deepEqual`; unsigned-draft authority is asserted explicitly (`apps/web/tests/meaningverse-smoke.ts:57-99`):

```ts
import assert from "node:assert/strict";

assert.deepEqual(diffShipPlacements(null, [module("alice", 1)], "alice"), []);
assert.ok(!("pubkey" in draft), "the draft is unsigned and carries no invented authority");
```

Copy the reconnect sequence style exactly: establish an initial silent baseline, assert a later live delta, reset on reconnect, and assert the resync remains silent (`apps/web/tests/meaningverse-smoke.ts:101-128`). Use source-contract assertions only for wiring/guard invariants that cannot be exercised purely; the current suite reads source and checks required contracts (`apps/web/tests/meaningverse-smoke.ts:319-355`). End focused files with a clear green marker like the existing `console.log` at `apps/web/tests/meaningverse-smoke.ts:398`.

Required Phase-1 test groups:

1. Pure state: feed dismissal without coercion, monotonic presence, explicit Kerni intent, three accepted parts, placement pending/accepted/failure, communication unavailable before accepted activation, invite cancellation/manual truth, witness and additive-lens order/idempotency.
2. Relay/witness security: malformed shape, extra/oversize/stale/wrong-binding event, invalid signature, signer cancellation, duplicate/replay, ambience/backlog/no participant-count evidence, and silent reconnect baseline.
3. Placement/source contract: exactly one Z1 socket, no `BuilderHud`/generic placement path, accepted light/status only, additive lens preserves original relay/attribution, focus/keyboard/status/subtitle hooks.
4. Existing regressions: canonical intro order/skip, sanitized invite, manual-confirm truth, draft unsigned authority, and existing silent epoch behavior; replace the obsolete assertion that disconnection always forces the old `enter` stage.

Run these exact repository commands:

```bash
pnpm --filter @600b/web exec tsx tests/meaningverse-smoke.ts
pnpm --filter @600b/web exec tsx tests/multiplayer-smoke.ts
pnpm --filter @600b/web typecheck
pnpm --filter @600b/web test
```

The planner should add exact focused Phase-1 smoke command(s) once it chooses their filenames; no filename is invented here.

## Shared Patterns

### Truth flows in one direction

`unknown relay input → bounded schema parse → installed signature verification → phase/invite/relay binding → deduplication/authorization → pure reducer → accepted application fact → scene/UI effect`.

No animation completion, DOM visibility, elapsed UI timer, transport callback, participant count, session handle, mock message, Kerni behavior, or local mesh position may skip this order. Nostr carries evidence; it does not own Palace truth.

### Explicit user authority

- Draft first; signature and publication are separate human-controlled actions.
- `E` expresses intent only when proximity and focus ownership allow it.
- `Not now`, `Escape`, clipboard cancellation, signer cancellation, validation failure, and no answer leave the relay honestly unchanged/`OPEN`.
- Kerni is suggestion-only and never calls truth transitions autonomously.

### Accepted-state rendering

- Persistent amber light and `OPEN` follow accepted socket placement, not local snap animation or connection callback.
- Cyan witness pulse follows one newly accepted signed event, never baseline/reconnect/replay.
- Signal lens follows one accepted additive transition and never overwrites the relay or creator attribution.
- Every required visual/audio cue has text/icon/shape and reduced-effects/muted behavior.

### Transport and scene isolation

- Concrete Nostr and signer APIs remain under `net/`; scene and UI consume application-facing types/actions.
- `PalaceScene.tsx` coordinates lifecycle and overlays but does not parse events or decide acceptance.
- `StreetWorld.tsx`/`KerniFamiliar.tsx` render bounded world state but do not own progress.
- Existing mock townsfolk, backlog, remote players, online count, broad `ChatPanel`, and `MeaningShip` are gated out of the Phase-1 proof path unless a separately accepted requirement explicitly permits presentation; none is evidence.

### Bounded implementation

- One Z1 workbench, three named physical parts, one fixed socket, one invited witness, and at most one additive lens.
- No generic BuilderHud, catalog, inventory, recipe, grid, free placement, broad room, participant counter, or new onboarding system.
- No new dependency is needed; exact validation uses installed `nostr-tools` 2.23.5.

## No Analog Found

| Missing exact analog | Role / data flow | Planning consequence |
|---|---|---|
| Exact Phase-1 relay reducer and event schema | pure model / event-driven transform | Define the minimal phase-bound event kind, payload, relay/invite binding, freshness/size/tag/rate limits, dedup lifetime, and negative fixtures before transport hookup. Existing ship kinds/payloads must not be copied. |
| Exact three-part socket reducer | pure model plus fixed world interaction | Define foot → coil → aperture, matching-cradle, carrying, valid/invalid/pending/accepted/failed placement, and additive-lens transitions in pure tests. `StreetWorld` is only a composition analog. |
| Human signer adapter | transport adapter / request-response | No reviewed local component bridges explicit consent to a human-controlled signer. The installed `verifyEvent` primitive verifies returned events but does not provide this adapter. Select and inspect the exact locally installed signer API during implementation; keep cancel/failure fail-closed and do not invent a method signature. |

## Metadata

**Analog search scope:** only the seven fixed analog groups named by the Phase-1 delegation, plus required upstream files, canonical `onboardingStory.ts`, and installed local `nostr-tools` public declarations needed to resolve validation. No additional analog discovery was performed.  
**Fixed analog source files inspected:** 10 (`model.ts`, `meaningverse-smoke.ts`, `chat.ts`, `PalaceScene.tsx`, `StreetWorld.tsx`, `KerniFamiliar.tsx`, `MeaningPath.tsx`, `frontend.css`, `MeaningShip.tsx`, `onboardingStory.ts`).  
**Required upstream files inspected:** `01-CONTEXT.md`, `01-RESEARCH.md`, `01-UI-SPEC.md`, `CLAUDE.md`.  
**Installed API evidence:** `apps/web/node_modules/nostr-tools/package.json:17-35`, `apps/web/node_modules/nostr-tools/lib/types/index.d.ts:1-4`, and `apps/web/node_modules/nostr-tools/lib/types/pure.d.ts:1-8`.  
**Pattern extraction date:** 2026-07-26.  
**Source modifications:** none; this document is the only intended write.  
**Planner readiness:** complete for bounded Phase-1 planning; unresolved exact schemas/adapters are explicitly classified rather than invented.
