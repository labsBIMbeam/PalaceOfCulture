# ADR 0007 — Desktop web and separate mobile apps

- **Status:** Accepted
- **Date:** 2026-07-09
- **Supersedes:** the mobile-web performance target in the 2026-06-19 build brief

## Context

The initial brief treated one responsive browser client as both desktop 3D world and mobile game.
That couples two different control systems, performance envelopes and release lifecycles. Touch
overlays inside the desktop web scene also compete with chat, media and construction tools.

## Decision

`apps/web` is the desktop browser client. It does not promise a mobile gameplay experience and will
not accumulate touch-controller or phone-specific game UI. Mobile clients will be separate apps with
their own navigation, controls, performance budgets and store release process.

The reusable boundary is data and protocol, not UI:

- `packages/multiplayer` is shared by desktop web, server and future mobile clients.
- `packages/shared` and `packages/ownership` remain platform-neutral domain packages.
- Colyseus room messages and synchronized schemas are versioned independently of any client view.
- Durable state remains behind the same SQLite/ownership APIs for every client surface.

Existing responsive CSS may keep basic pages readable on narrow windows, but it is not a supported
mobile game contract. New mobile gameplay work belongs in a separately scaffolded application after
its runtime technology is selected.

## Consequences

The desktop world can optimize for keyboard/mouse, visual density and large scenes without shipping
compromised touch overlays. Mobile work becomes explicit rather than hidden inside CSS breakpoints.
The cost is a future additional application and release pipeline, mitigated by shared protocols and
domain packages.
