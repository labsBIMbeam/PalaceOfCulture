import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_AVATAR,
  JsonEncodingError,
  PALACE_CORE_PROTOCOL_VERSION,
  SHARED_SCHEMA_VERSION,
  canonicalizeJson,
  selectActivityIdsForLens,
} from "@600b/shared";

test("the built ESM package is importable by Node", () => {
  assert.equal(SHARED_SCHEMA_VERSION, "0.2.0");
  assert.equal(PALACE_CORE_PROTOCOL_VERSION, 1);
  assert.equal(DEFAULT_AVATAR.gender, "neutral");
});

test("guild lenses curate canonical activities without engagement ranking", () => {
  const curations = [
    {
      scope: { kind: "guild", guildId: "guild:music" },
      activityId: "activity:track-a",
      state: "listed",
      position: 2,
      curatedAt: "2026-07-12T10:00:00.000Z",
      curatedBy: "user:alice",
    },
    {
      scope: { kind: "guild", guildId: "guild:podcasts" },
      activityId: "activity:episode-a",
      state: "featured",
      curatedAt: "2026-07-12T09:00:00.000Z",
      curatedBy: "user:bob",
    },
    {
      scope: { kind: "guild", guildId: "guild:music" },
      activityId: "activity:track-b",
      state: "featured",
      curatedAt: "2026-07-12T08:00:00.000Z",
      curatedBy: "user:alice",
    },
    {
      scope: { kind: "commons" },
      activityId: "activity:public-stage",
      state: "featured",
      curatedAt: "2026-07-12T11:00:00.000Z",
      curatedBy: "auto:palace",
    },
    {
      scope: { kind: "guild", guildId: "guild:music" },
      activityId: "activity:spam",
      state: "hidden",
      curatedAt: "2026-07-12T12:00:00.000Z",
      curatedBy: "user:alice",
    },
  ];

  assert.deepEqual(
    selectActivityIdsForLens(
      { kind: "guild", guildId: "guild:music" },
      ["guild:music", "guild:podcasts"],
      curations,
    ),
    ["activity:track-b", "activity:track-a"],
  );
  assert.deepEqual(
    selectActivityIdsForLens({ kind: "joined" }, ["guild:music", "guild:podcasts"], curations),
    ["activity:episode-a", "activity:track-b", "activity:track-a"],
  );
  assert.deepEqual(selectActivityIdsForLens({ kind: "commons" }, [], curations), [
    "activity:public-stage",
  ]);
});

test("canonical JSON is stable and rejects values JSON would silently lose", () => {
  assert.equal(canonicalizeJson({ z: [2, 1], a: { b: true } }), '{"a":{"b":true},"z":[2,1]}');
  assert.throws(() => canonicalizeJson({ missing: undefined }), JsonEncodingError);
  const sparse = Array(2);
  sparse[1] = "sparse";
  assert.throws(() => canonicalizeJson(sparse), JsonEncodingError);
  const circular = {};
  circular.self = circular;
  assert.throws(() => canonicalizeJson(circular), JsonEncodingError);
});
