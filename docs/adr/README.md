# Architecture Decision Records

Each ADR captures one significant, hard-to-reverse decision: its context, the decision, and the
consequences. We never edit an accepted ADR to change its decision — we add a new one that
**supersedes** it, preserving the audit trail (ISO 19650 CDE: an ADR is the *Published* state of a
decision).

| # | Title | Status |
|---|---|---|
| [0001](0001-stack-and-runtime-topology.md) | Stack language & runtime topology ("wo rennt was") | Accepted |
| [0002](0002-chat-and-voice-transport.md) | Chat & voice transport ("plug-and-play first, Nostr-native later") | Accepted |
| [0003](0003-character-data-and-avatar-builder.md) | Character data model & our own VRM slot-builder | Accepted |
| [0004](0004-media-value-live-open-standards.md) | Media, value & live core: Podcasting 2.0 + V4V + Nostr (Fountain as endpoint) | Accepted |
| [0005](0005-voice-backends-hivetalk.md) | Voice/video backends: HiveTalk as a second SFU behind the voice adapter | Accepted |
| [0006](0006-colyseus-authoritative-realtime-boundary.md) | Colyseus authoritative realtime boundary | Accepted |
| [0007](0007-desktop-web-and-separate-mobile-apps.md) | Desktop web and separate mobile apps | Accepted |
| [0008](0008-guild-lenses-and-palace-core.md) | Guild lenses and one Palace Core across surfaces | Accepted |

Naming: `NNNN-kebab-title.md`, four-digit zero-padded, incrementing.
