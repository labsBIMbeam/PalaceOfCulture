// Zap-on-meet smoke: the pure logic behind the street's 21-sats moment. Network, signer and
// wallet stay untested here (headless E2E covers those with mocks); this locks the roster
// directory, NIP-05/LUD-16 derivations, the NIP-57 profile-zap request shape and the prelude
// injection the web napplet host performs.
import { parseZapFlashBroadcast, parseZapFlashMessage } from "@600b/multiplayer";
import { WEB_NAPPLET_PRELUDE, injectPrelude } from "../src/napplet/prelude";
import { zapRecipientFor } from "../src/napplet/zapDirectory";
import { recipientToUrl, zapRequestTags } from "../src/net/lightning";
import { nip05Url } from "../src/net/nip05";
import {
  GLOW_MS,
  glowActive,
  lampBoost,
  recordZapFlash,
  resetZapLight,
  zapCounterLabel,
} from "../src/net/zapLight";

const assert = (name: string, cond: boolean) => {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`ok: ${name}`);
};

// roster directory: handles map to roster NIP-05 identities, never to room-asserted keys
assert("dni resolves to the roster address", zapRecipientFor("dni")?.address === "dni@600.wtf");
assert("lookup is case-insensitive", zapRecipientFor("DNI")?.address === "dni@600.wtf");
assert("michael1011 zaps to bol.tz", zapRecipientFor("michael1011")?.address === "m@bol.tz");
assert("the Builder archetype is not zappable", zapRecipientFor("Builder") === null);
assert("unknown handles are not zappable", zapRecipientFor("randomvisitor") === null);
assert("empty handle is not zappable", zapRecipientFor("  ") === null);

// address derivations: the same name@domain doubles as LUD-16 and NIP-05
assert(
  "LUD-16 well-known URL",
  recipientToUrl("dni@600.wtf") === "https://600.wtf/.well-known/lnurlp/dni",
);
assert(
  "NIP-05 well-known URL",
  nip05Url("dni@600.wtf") === "https://600.wtf/.well-known/nostr.json?name=dni",
);
assert("non-addresses derive nothing", nip05Url("your own key, later") === null);

// NIP-57 profile zap request: p tag only (a person, not a note), amount in msats
const tags = zapRequestTags("a".repeat(64), 21, ["wss://relay.example"]);
assert("relays tag first", tags[0]?.[0] === "relays" && tags[0]?.[1] === "wss://relay.example");
assert(
  "21 sats = 21000 msat",
  tags.some((t) => t[0] === "amount" && t[1] === "21000"),
);
assert(
  "p tag carries the recipient",
  tags.some((t) => t[0] === "p" && t[1] === "a".repeat(64)),
);
assert(
  "profile zaps never carry an e tag",
  tags.every((t) => t[0] !== "e"),
);

// prelude injection: the napplet runtime must exist before the artifact's own script runs
const injected = injectPrelude("<html><head><title>x</title></head><body></body></html>");
const preludeAt = injected.indexOf(WEB_NAPPLET_PRELUDE);
const titleAt = injected.indexOf("<title>");
assert("prelude is injected", preludeAt > 0);
assert("prelude runs before artifact markup", preludeAt < titleAt);
assert(
  "headless artifacts still get the prelude",
  injectPrelude("<div>x</div>").includes("napplet"),
);
assert(
  "prelude exposes the zap domain",
  WEB_NAPPLET_PRELUDE.includes("zap.probe") && WEB_NAPPLET_PRELUDE.includes("zap.send"),
);

// zaps light the street: the client light store + the flash protocol
resetZapLight();
const t0 = 1_000_000;
recordZapFlash("alice", t0);
assert("a flash lights the lantern", glowActive("alice", t0 + 1000) === true);
assert("the glow lasts 21 minutes, not longer", glowActive("alice", t0 + GLOW_MS + 1) === false);
assert("counter shows the count", zapCounterLabel("alice") === "⚡ 1");
for (let i = 0; i < 25; i += 1) recordZapFlash("alice", t0 + i);
assert("counter display caps at 21+", zapCounterLabel("alice") === "⚡ 21+");
assert("unzapped players carry no label", zapCounterLabel("nobody") === null);
assert("lamps saturate at 1", lampBoost(t0 + 30) === 1);
resetZapLight();
assert("reset darkens the street", lampBoost(t0) === 0);

assert(
  "flash message parses a session id",
  parseZapFlashMessage({ targetSessionId: "abc123" }).targetSessionId === "abc123",
);
let flashRejected = false;
try {
  parseZapFlashMessage({ targetSessionId: "no spaces allowed" });
} catch {
  flashRejected = true;
}
assert("malformed session ids are rejected", flashRejected);
let extraRejected = false;
try {
  parseZapFlashBroadcast({ sessionId: "abc", extra: 1 });
} catch {
  extraRejected = true;
}
assert("broadcast rejects unknown fields", extraRejected);

console.log("\nZAP SMOKE TESTS GREEN");
