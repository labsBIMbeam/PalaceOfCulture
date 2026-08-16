import type { EngineTarget } from "../frontend/types";

/** Canonical display name per world — rename a world here and every scene label follows. */
export const WORLD_NAME: Record<EngineTarget, string> = {
  hq: "Palace of Culture",
  home: "Home",
  street: "Zapburg",
};

export const WORLD_TITLE: Record<EngineTarget, string> = {
  hq: `${WORLD_NAME.hq} · TBA`,
  home: `${WORLD_NAME.home} — your map`,
  street: WORLD_NAME.street,
};

export const TRAVEL_LABEL: Record<EngineTarget, string> = {
  hq: "Travel: Palace TBA",
  home: `Travel: ${WORLD_NAME.home}`,
  street: `Travel: ${WORLD_NAME.street}`,
};

export const WORLD_WALK_SUBTITLE: Record<EngineTarget, string> = {
  hq: "teaser only — not released yet",
  home: "private — your plot",
  street: "public — first playable district",
};

export const WORLD_IDLE_SUBTITLE: Record<EngineTarget, string> = {
  hq: "3D engine — Palace released soon · date TBA",
  home: "3D engine — private plot",
  street: `3D engine — ${WORLD_NAME.street}`,
};

/** Curtain title shown while the world swap happens underneath. */
export const TRAVEL_PENDING_TITLE: Record<EngineTarget, string> = {
  hq: "Palace of Culture — released soon…",
  home: "Coming home…",
  street: `Heading to ${WORLD_NAME.street}…`,
};
