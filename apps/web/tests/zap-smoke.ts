// Zap-on-meet smoke: the pure logic behind the street's 21-sats moment. Network, signer and
// wallet stay untested here (headless E2E covers those with mocks); this locks the roster
// directory, NIP-05/LUD-16 derivations, the NIP-57 profile-zap request shape and the prelude
// injection the web napplet host performs.
import { WEB_NAPPLET_PRELUDE, injectPrelude } from "../src/napplet/prelude";
import { zapRecipientFor } from "../src/napplet/zapDirectory";
import { recipientToUrl, zapRequestTags } from "../src/net/lightning";
import { nip05Url } from "../src/net/nip05";

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

console.log("\nZAP SMOKE TESTS GREEN");
