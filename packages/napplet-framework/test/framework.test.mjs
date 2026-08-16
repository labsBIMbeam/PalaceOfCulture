// Framework logic tests. The host itself needs a DOM and is exercised by the
// demo in a browser; everything here is the part that must hold regardless of
// where the shell runs — the contract, the grants and the state machine.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PalaceState,
  isGranted,
  isNappletMessage,
  isPalaceIntent,
  isRegionVisible,
} from "../dist/index.js";

const ACTOR = { pubkey: "a".repeat(64), handle: "Builder" };

function stateWith(extra = {}) {
  return new PalaceState(ACTOR, {
    guild: {
      lens: { kind: "commons" },
      guilds: [{ id: "music", name: "Music", crest: "♪", joined: true, unread: 3 }],
    },
    media: {
      nowPlaying: null,
      playing: false,
      positionSec: 0,
      durationSec: 0,
      queue: [
        { id: "t1", title: "One", author: "A", kind: "music" },
        { id: "t2", title: "Two", author: "B", kind: "music" },
      ],
    },
    chat: {
      channels: ["world", "plaza"],
      activeChannel: "world",
      messages: [],
      unread: {},
    },
    ...extra,
  });
}

/* ------------------------------------------------------------ the contract */

test("isPalaceIntent refuses unknown domains and actions", () => {
  assert.equal(isPalaceIntent({ domain: "chat", action: "send" }), true);
  assert.equal(isPalaceIntent({ domain: "chat", action: "delete" }), false);
  assert.equal(isPalaceIntent({ domain: "wallet", action: "pay" }), false);
  assert.equal(isPalaceIntent({ domain: "session", action: "__proto__" }), false);
  assert.equal(isPalaceIntent(null), false);
  assert.equal(isPalaceIntent("chat.send"), false);
});

test("isNappletMessage requires a known type and a string id", () => {
  assert.equal(isNappletMessage({ type: "palace.get", id: "1" }), true);
  assert.equal(isNappletMessage({ type: "palace.get" }), false);
  assert.equal(isNappletMessage({ type: "palace.evil", id: "1" }), false);
  assert.equal(isNappletMessage({ type: "palace.get", id: 1 }), false);
});

test("grants are per napplet, not global", () => {
  const entry = { id: "chat", region: "chat", title: "", artifactUrl: "", grants: ["chat"] };
  assert.equal(isGranted(entry, "chat"), true);
  assert.equal(isGranted(entry, "presence"), false);
  assert.equal(isGranted(entry, "session"), false);
});

test("Bell Mode collapses the rails and nothing else", () => {
  assert.equal(isRegionVisible("guild-rail", false), true);
  assert.equal(isRegionVisible("guild-rail", true), false);
  assert.equal(isRegionVisible("guild-context", true), false);
  assert.equal(isRegionVisible("center-stage", true), true);
  assert.equal(isRegionVisible("chat", true), true);
  assert.equal(isRegionVisible("session-dock", true), true);
});

/* --------------------------------------------------------------- the state */

test("joining focuses the shell and leaving restores it", () => {
  const state = stateWith();
  assert.equal(state.apply({ domain: "session", action: "join", activityId: "gig" }).ok, true);
  assert.equal(state.get("session").focused, true);
  assert.equal(state.get("session").sessionId, "session-gig");
  assert.equal(state.apply({ domain: "session", action: "leave" }).ok, true);
  assert.equal(state.get("session").focused, false);
  assert.equal(state.get("session").sessionId, null);
});

test("leaving or inviting outside a session is refused, not thrown", () => {
  const state = stateWith();
  assert.deepEqual(state.apply({ domain: "session", action: "leave" }), {
    ok: false,
    error: "not-in-session",
  });
  assert.equal(
    state.apply({ domain: "session", action: "invite", pubkey: "b".repeat(64) }).error,
    "not-in-session",
  );
});

test("an unknown guild cannot become the lens", () => {
  const state = stateWith();
  const result = state.apply({
    domain: "guild",
    action: "setLens",
    lens: { kind: "guild", guildId: "nope" },
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "unknown-guild");
  assert.equal(state.get("guild").lens.kind, "commons");
});

test("a napplet cannot author a message as someone else", () => {
  const state = stateWith();
  // The intent carries no actor field at all; the shell stamps its own.
  state.apply({ domain: "chat", action: "send", channel: "world", body: "hello" });
  const [message] = state.get("chat").messages;
  assert.equal(message.author, ACTOR.handle);
  assert.equal(message.self, true);
});

test("empty and unknown-channel sends are refused", () => {
  const state = stateWith();
  assert.equal(
    state.apply({ domain: "chat", action: "send", channel: "world", body: "  " }).error,
    "empty-message",
  );
  assert.equal(
    state.apply({ domain: "chat", action: "send", channel: "nope", body: "x" }).error,
    "unknown-channel",
  );
  assert.equal(state.get("chat").messages.length, 0);
});

test("inbound messages only mark unread on inactive channels", () => {
  const state = stateWith();
  state.receiveMessage({
    id: "1",
    channel: "plaza",
    author: "Wren",
    body: "hi",
    atMs: 0,
    system: false,
  });
  assert.equal(state.get("chat").unread.plaza, 1);
  state.receiveMessage({
    id: "2",
    channel: "world",
    author: "Wren",
    body: "hi",
    atMs: 0,
    system: false,
  });
  assert.equal(state.get("chat").unread.world, undefined);
});

test("switching channel clears its unread count", () => {
  const state = stateWith();
  state.receiveMessage({
    id: "1",
    channel: "plaza",
    author: "Wren",
    body: "hi",
    atMs: 0,
    system: false,
  });
  state.apply({ domain: "chat", action: "setChannel", channel: "plaza" });
  assert.equal(state.get("chat").unread.plaza, undefined);
  assert.equal(state.get("chat").activeChannel, "plaza");
});

test("media: play, wrap on next, and clamp a seek", () => {
  const state = stateWith();
  assert.equal(
    state.apply({ domain: "media", action: "play", itemId: "nope" }).error,
    "unknown-item",
  );
  state.apply({ domain: "media", action: "play", itemId: "t2" });
  assert.equal(state.get("media").nowPlaying.id, "t2");
  state.apply({ domain: "media", action: "next" });
  assert.equal(state.get("media").nowPlaying.id, "t1", "next wraps to the head of the queue");
  state.apply({ domain: "media", action: "seek", positionSec: 99999 });
  assert.equal(state.get("media").positionSec, state.get("media").durationSec);
  assert.equal(
    state.apply({ domain: "media", action: "seek", positionSec: -1 }).error,
    "bad-position",
  );
});

test("playback survives a surface switch — the whole point of the shell", () => {
  const state = stateWith();
  state.apply({ domain: "session", action: "join", activityId: "gig" });
  state.apply({ domain: "media", action: "play", itemId: "t1" });
  state.tick(30);
  const before = state.get("media").positionSec;
  state.apply({ domain: "session", action: "setSurface", surface: "world" });
  state.tick(30);
  assert.equal(state.get("session").surface, "world");
  assert.ok(state.get("media").positionSec > before, "position kept advancing across the switch");
  assert.equal(state.get("media").nowPlaying.id, "t1", "the track did not restart");
});

test("chat history survives a surface switch", () => {
  const state = stateWith();
  state.apply({ domain: "chat", action: "send", channel: "world", body: "before" });
  state.apply({ domain: "session", action: "setSurface", surface: "world" });
  state.apply({ domain: "chat", action: "send", channel: "world", body: "after" });
  assert.deepEqual(
    state.get("chat").messages.map((m) => m.body),
    ["before", "after"],
  );
});

test("the clock rolls into the next track at the end", () => {
  const state = stateWith();
  state.apply({ domain: "media", action: "play", itemId: "t1" });
  state.tick(10_000);
  assert.equal(state.get("media").nowPlaying.id, "t2");
  assert.equal(state.get("media").positionSec, 0);
});

test("subscribers see every domain change exactly once", () => {
  const state = stateWith();
  const seen = [];
  const off = state.subscribe((domain) => seen.push(domain));
  state.apply({ domain: "chat", action: "send", channel: "world", body: "x" });
  state.apply({ domain: "session", action: "setSurface", surface: "world" });
  off();
  state.apply({ domain: "chat", action: "send", channel: "world", body: "y" });
  assert.deepEqual(seen, ["chat", "session"]);
});
