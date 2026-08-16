import assert from "node:assert/strict";
import {
  TRAVEL_LABEL,
  TRAVEL_PENDING_TITLE,
  WORLD_IDLE_SUBTITLE,
  WORLD_NAME,
  WORLD_TITLE,
  WORLD_WALK_SUBTITLE,
} from "../src/scene/worldLabels";

assert.equal(WORLD_TITLE.street, "Locktard Street", "the playable district keeps its full name");
assert.equal(
  TRAVEL_LABEL.street,
  "Travel: Locktard Street",
  "travel controls name the playable district explicitly",
);
assert.equal(
  WORLD_WALK_SUBTITLE.street,
  "public — first playable district",
  "walking status identifies the street as the current playable district",
);
assert.match(WORLD_TITLE.hq, /TBA/, "the unreleased Palace title does not imply a release date");
assert.match(TRAVEL_LABEL.hq, /TBA/, "Palace travel labels retain the TBA status");
assert.match(
  WORLD_IDLE_SUBTITLE.hq,
  /date TBA/,
  "the Palace teaser continues to communicate an unset release date",
);

for (const [label, value] of Object.entries({
  WORLD_TITLE: WORLD_TITLE.street,
  TRAVEL_LABEL: TRAVEL_LABEL.street,
  WORLD_IDLE_SUBTITLE: WORLD_IDLE_SUBTITLE.street,
  TRAVEL_PENDING_TITLE: TRAVEL_PENDING_TITLE.street,
})) {
  assert.ok(value.includes(WORLD_NAME.street), `${label}.street derives from WORLD_NAME.street`);
}

assert.match(
  TRAVEL_PENDING_TITLE.hq,
  /released soon/,
  "the travel curtain keeps Palace unreleased",
);

console.log("WORLD LABEL SMOKE TESTS GREEN");
