// Security-contract smoke tests (run through tsx; no browser or external network required).
import { fetchPayEndpoint, payInvoice, recipientToUrl, requestInvoice } from "../src/net/lightning";

function assert(name: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`ok: ${name}`);
}

const originalFetch = globalThis.fetch;

try {
  assert(
    "lightning address resolves over https",
    recipientToUrl("alice@example.com") === "https://example.com/.well-known/lnurlp/alice",
  );
  assert("plain http recipient rejected", recipientToUrl("http://example.com/pay") === null);

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        callback: "http://127.0.0.1/pay",
        minSendable: 1_000,
        maxSendable: 1_000_000,
      }),
      { headers: { "content-type": "application/json" } },
    );
  assert(
    "insecure LNURL callback rejected",
    (await fetchPayEndpoint("alice@example.com")) === null,
  );

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        callback: "https://pay.example.com/callback",
        minSendable: 1_000_000,
        maxSendable: 1_000,
      }),
      { headers: { "content-type": "application/json" } },
    );
  assert(
    "invalid LNURL amount range rejected",
    (await fetchPayEndpoint("alice@example.com")) === null,
  );

  let callbackUrl = "";
  globalThis.fetch = async (input) => {
    callbackUrl = String(input);
    return new Response(JSON.stringify({ pr: "lnbc-valid-shape-for-smoke" }), {
      headers: { "content-type": "application/json" },
    });
  };
  const endpoint = {
    callback: "https://pay.example.com/callback",
    minSendable: 1_000,
    maxSendable: 100_000,
  };
  assert("out-of-range invoice amount rejected", (await requestInvoice(endpoint, 101)) === null);
  assert("out-of-range request never hits callback", callbackUrl === "");
  assert(
    "exact in-range invoice accepted",
    (await requestInvoice(endpoint, 21)) === "lnbc-valid-shape-for-smoke",
  );
  assert("invoice callback receives exact msat", callbackUrl.includes("amount=21000"));

  const disabled = await payInvoice("lnbc-disabled");
  assert("wallet hand-off is safe-off by default", !disabled.paid && !disabled.fallbackUri);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("\nSECURITY SMOKE TESTS GREEN");
