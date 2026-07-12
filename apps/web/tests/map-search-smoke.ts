import assert from "node:assert/strict";
import { type MapSearchLocation, findMapLocation } from "../src/frontend/mapSearch";

const locations: MapSearchLocation[] = [
  {
    id: "hq",
    name: "Palace of Culture HQ",
    lat: 32.7583,
    lng: -16.9419,
    kind: "hq",
    aliases: ["Madeira", "Pico Ruivo"],
  },
  { id: "portugal", name: "Portugal", lat: 39.5, lng: -8, kind: "country" },
  { id: "reunion", name: "Réunion", lat: -21.1, lng: 55.5, kind: "country" },
];

assert.equal(findMapLocation(locations, "madeira")?.id, "hq", "aliases resolve");
assert.equal(findMapLocation(locations, "palace")?.id, "hq", "prefixes resolve");
assert.equal(findMapLocation(locations, "union")?.id, "reunion", "substring matches resolve");
assert.equal(findMapLocation(locations, "reunion")?.id, "reunion", "diacritics normalize");
assert.equal(findMapLocation(locations, ""), null, "empty searches do not select a marker");
assert.equal(findMapLocation(locations, "missing"), null, "unknown searches return no result");

console.log("MAP SEARCH SMOKE TESTS GREEN (6 assertions)");
