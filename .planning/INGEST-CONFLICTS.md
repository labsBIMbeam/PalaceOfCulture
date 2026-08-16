## Conflict Detection Report

### BLOCKERS (0)

### WARNINGS (0)

### INFO (7)

[INFO] Approved dependency resolution removes reciprocal supersession citation from synthesis traversal
  Found: docs/design/private-world-builder-loop.md cites docs/design/habitat-capability-system.md as authoritative, while docs/design/habitat-capability-system.md names the lower-precedence DOC only to supersede its score proposal.
  Note: With docs/design/habitat-capability-system.md at precedence 0 and docs/design/private-world-builder-loop.md at precedence 50, the operative dependency is one-way from deferred context to authoritative capability rules; cycle detection then finds no synthesis dependency cycle. docs/design/enshrouded-building-learning-automation.md has no return link to docs/design/palworld-low-time-preference-crafting.md.

[INFO] Auto-resolved: ADR 0009 supersedes only ADR 0006 public-world target
  Found: docs/adr/0006-colyseus-authoritative-realtime-boundary.md names hq, while docs/adr/0009-public-realtime-street.md names street for the first unauthenticated room.
  Note: docs/adr/0009-public-realtime-street.md is locked at precedence 0 and explicitly supersedes that single target; docs/adr/0006-colyseus-authoritative-realtime-boundary.md is unlocked at precedence 10 and retains every movement, presence, security, and durable-state boundary.

[INFO] Auto-resolved: capability commissioning replaces score-based unlocks
  Found: docs/design/private-world-builder-loop.md contains optional habitat indicators and historical score language, while docs/design/habitat-capability-system.md requires physical bundles and successful commissioning.
  Note: docs/design/habitat-capability-system.md at precedence 0 wins over docs/design/private-world-builder-loop.md at precedence 50; scores survive only as derived non-authoritative indicators and never gate progression.

[INFO] Auto-resolved: Locktard Street is current and HQ Arrival Plaza is future
  Found: docs/design/locktard-street-playable.md makes Locktard Street the current entry and Palace HQ teaser-only, while docs/design/hq-arrival-plaza-art-direction.md describes an HQ arrival place.
  Note: docs/design/locktard-street-playable.md at precedence 0 governs the current playable runtime; docs/design/hq-arrival-plaza-art-direction.md at precedence 50 is retained only as future Palace art context.

[INFO] Auto-resolved: linear Werkstattgasse is current and Palace Ringstadt is future
  Found: docs/STREET-LEVEL-PLAN.md specifies the current five-zone linear Werkstattgasse, while docs/STREET-HANDOFF.md specifies a radial Palace Ringstadt.
  Note: docs/STREET-LEVEL-PLAN.md at precedence 0 governs the current entry world; docs/STREET-HANDOFF.md at precedence 50 is retained as deferred future Palace-district topology and historical context.

[INFO] Auto-resolved: desktop-web boundary overrides avatar pipeline mobile runtime target
  Found: docs/AVATAR-PIPELINE.md describes Pixel 8+ as a runtime target, while docs/adr/0007-desktop-web-and-separate-mobile-apps.md states that apps/web does not support mobile gameplay.
  Note: The locked ADR wins; avatar authoring budgets and VRM contracts remain, but they do not establish a mobile gameplay contract for apps/web. Future mobile clients remain separate applications.

[INFO] Auto-resolved: desktop-web boundary overrides street mobile 30 FPS requirement
  Found: docs/VERDICHTEN-BRIEF.md calls mobile 30 FPS a hard street budget, while docs/adr/0007-desktop-web-and-separate-mobile-apps.md removes mobile gameplay from apps/web.
  Note: The locked ADR wins; instancing, bounded draw calls, LOD, lighting discipline, and production verification remain valid desktop constraints, but mobile-web gameplay and its 30 FPS target are not carried forward.
