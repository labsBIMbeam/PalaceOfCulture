# API Coverage — Phase-1 Nostr Witness Adapter

> Full coverage by default for the external Nostr surface integrated by Phase 1. Opt-outs are explicit and reasoned. Plan 04 owns one generic kind-9127 three-action transport/validator for activation, witness, and lens. Plan 05 consumes only reducer-authorized accepted evidence/deltas.

## Integration boundary

The creator signs a self-contained activation capability with NIP-07. Its verified event travels in the invite URL and is imported locally, never published. Invited witness and lens actions each require explicit NIP-07 approval, acknowledged publication, relay-backed receipt, exact validation, and reducer authorization. The scoped kind-9127 `#e` subscription remains silent through initial EOSE and reconnect baselines. Nostr SDK objects never enter scene or UI.

| capability | decision | reason |
|---|---|---|
| creator NIP-07 sign of activation capability | INTEGRATE | Creates the human-approved signed activation capability embedded in the invite. |
| self-contained verified activation event in invite URL | INTEGRATE | Lets the invite carry its complete public capability without server or relay lookup. |
| activation local verify/import; no publish | INTEGRATE | Establishes activation authority locally while intentionally keeping activation off relays. |
| witness NIP-07 sign | INTEGRATE | D-23/D-24 require explicit human-controlled approval of the bounded witness draft. |
| witness acknowledged publish | INTEGRATE | Witness truth advances only after relay publish acknowledgement, never signer UI success alone. |
| witness relay-backed receive/validation | INTEGRATE | Only a received, exactly validated witness event may become accepted application evidence. |
| lens NIP-07 sign | INTEGRATE | The accepted witness signer explicitly approves the exact additive lens action. |
| lens acknowledged publish | INTEGRATE | Lens truth advances only after relay publish acknowledgement, never signer UI success alone. |
| lens relay-backed receive/validation | INTEGRATE | Only exact Plan-04-authorized lens evidence may reach the Plan-05 reducer. |
| scoped kind-9127/#e subscription + silent EOSE baseline | INTEGRATE | Bounds receipt to the activation and prevents history or reconnect from replaying effects. |
| stop/dispose | INTEGRATE | Required for teardown, eligibility loss, reconnect safety, and bounded resources. |
| exact parser/verifyEvent/binding/freshness/rate/dedup | INTEGRATE | Fail-closed validation keeps signatures as evidence and the application as authority. |
| bounded attribution | INTEGRATE | Shows pubkey/event provenance without handles, verified-human claims, or identity merging. |
| strict raw-event bounds before verification | INTEGRATE | Rejects oversized or malformed relay input before crypto work or application allocation. |
| three exact kind-9127 application actions | INTEGRATE | One generic adapter discriminates activation, witness, and lens without arbitrary events. |
| signer cancellation/failure without state change | INTEGRATE | Human refusal and signer errors must preserve the amber OPEN relay and accepted truth. |
| Plan-04 accepted evidence/delta application seam | INTEGRATE | Gives reducers typed authorized inputs while keeping transport and SDK objects isolated. |
| NIP-46 remote signer / bunker | OPT-OUT | Another signer transport would enlarge identity, authentication, recovery, and failure scope. |
| app-held nsec or local private-key custody | OPT-OUT | Phase 1 keeps signing human-controlled and must not store or expose identity secrets. |
| generic `finalizeEvent` in production | OPT-OUT | Allowed only for deterministic test fixtures; production activation, witness, and lens use NIP-07. |
| generic publish API or event composer | OPT-OUT | Only exact witness and lens drafts may publish after consent; activation is never published. |
| generic historical query or archive search | OPT-OUT | One scoped live subscription plus silent EOSE is sufficient; no Nostr browser is needed. |
| arbitrary event kinds, tags, or content | OPT-OUT | Only exact kind-9127 action schemas are accepted; arbitrary payloads widen attack scope. |
| profiles, metadata, npub or handle enrichment | OPT-OUT | A signature proves key/event control, not a Palace handle, account, or verified human. |
| social graph, follows, feed, reactions, or reposts | OPT-OUT | These are outside the bounded activation, witness, and additive-lens handoff. |
| direct messages or encrypted payloads | OPT-OUT | No private messaging is required for the signed invite, witness, or lens path. |
| zaps, wallet calls, payments, or economic events | OPT-OUT | Phase 1 contains no economy or payment path. |
| event deletion or replaceable-state management | OPT-OUT | Phase 1 accepts bounded additive evidence and does not manage general content lifecycle. |
| NIP-11 relay information or administration | OPT-OUT | Relay discovery and administration are unnecessary; configuration remains adapter-owned. |
| multi-relay quorum or consensus | OPT-OUT | Phase 1 needs acknowledged bounded handoff, not distributed consensus guarantees. |
| SDK objects in scene, world, Kerni, or DOM UI | OPT-OUT | Those layers consume application facts/actions only; direct SDK coupling breaks isolation. |

## Exact action coverage

- Activation: creator-approved kind 9127 capability, self-contained in the invite URL, verified and imported locally, intentionally not published.
- Witness: exact action-specific draft, explicit NIP-07 sign, acknowledged publish, scoped relay receive, strict validation, then accepted application evidence/delta.
- Lens: kind 9127 with empty content and ordered tags `t=palace-phase-1`, `action=attach-signal-lens`, `relay=werkstattgasse:z1:relay:1`, `e=activationId`, `p=creatorPubkey`, `w=acceptedWitnessId`; signer pubkey equals the accepted witness pubkey, the witness exists, and at most one lens is authorized.

## Enforcement

Receive-side enforcement is fail closed:

`raw bounds → strict kind-9127 action parse → verifyEvent → exact action/binding checks → freshness/rate/dedup → application authorization → pure reducer → accepted fact/delta → presentation`

Publish-side enforcement is also explicit:

`exact unsigned draft → human confirmation → NIP-07 signature → event recheck → acknowledged publish`

The activation branch stops after local verification/import and never reaches publish. Invite URLs contain the complete signed public activation event and binding data, but no `nsec`, private key, bearer secret, or signer credential. `finalizeEvent` is permitted only in deterministic tests. Network-free evidence fixtures still traverse the Plan-04 parser/validator application seam; Plan-05 pure reducer tests may create an authorized action only through Plan 04's typed helper.

A capability marked `OPT-OUT` cannot be introduced during Phase 1 without updating this matrix and the affected plan/threat model before execution.