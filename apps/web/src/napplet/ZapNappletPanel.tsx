// The web napplet host, first tenant: the zap napplet. Mirrors godot/web/napplet-host.js —
// `sandbox="allow-scripts"` (no same-origin), prelude injected, `nap.*` request/response over
// postMessage gated on the iframe's window identity. The napplet stays pure UI; every
// privileged step (roster lookup, NIP-05 resolve, NIP-07 signing, LNURL fetch, WebLN) runs
// HERE on the host — that split is the napplet security model, not an implementation detail.
//
// Dev note: the artifact is inlined at build time from napplets/zap/dist — run
// `pnpm --filter @600b/napplet-zap build` once before `apps/web` dev/build (CI's topological
// `pnpm -r build` orders it automatically via the devDependency).

import { useEffect, useRef } from "react";
import zapArtifact from "../../../../napplets/zap/dist/index.html?raw";
import { REAL_PAYMENTS_ENABLED } from "../config/safety";
import { zapProfile } from "../net/lightning";
import { resolveNip05 } from "../net/nip05";
import { injectPrelude } from "./prelude";
import { zapRecipientFor } from "./zapDirectory";

const ZAP_SATS = 21;

type NapRequest = { type: string; id: string } & Record<string, unknown>;

function isNapRequest(value: unknown): value is NapRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

/** Open a link on the napplet's behalf: https in a new tab, lightning: to the OS wallet. */
function openHostLink(url: string): boolean {
  if (/^lightning:/i.test(url)) {
    window.location.href = url; // protocol hand-off; the page itself stays put
    return true;
  }
  if (/^https:\/\//i.test(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }
  return false;
}

export function ZapNappletPanel({ handle, onClose }: { handle: string; onClose: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const reply = (id: string, result: unknown) => {
      frame.contentWindow?.postMessage({ type: "nap.result", id, result }, "*");
    };
    const fail = (id: string, error: string, message: string) => {
      frame.contentWindow?.postMessage({ type: "nap.result", id, error, message }, "*");
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return;
      const msg: unknown = event.data;
      if (!isNapRequest(msg)) return;
      if (msg.type === "nap.ready" || msg.type === "nap.error" || msg.type === "outbox.close") {
        return; // lifecycle signals, not requests
      }
      const { type, id } = msg;
      switch (type) {
        case "zap.probe": {
          const recipient = zapRecipientFor(handle);
          if (!recipient) {
            fail(id, "no-recipient", `${handle} has no roster lightning identity`);
            return;
          }
          reply(id, {
            handle: recipient.handle,
            address: recipient.address,
            sats: ZAP_SATS,
            nip07: Boolean((window as { nostr?: unknown }).nostr),
            webln: Boolean(window.webln),
            paymentsEnabled: REAL_PAYMENTS_ENABLED,
          });
          return;
        }
        case "zap.send": {
          const recipient = zapRecipientFor(handle);
          if (!recipient) {
            fail(id, "no-recipient", `${handle} has no roster lightning identity`);
            return;
          }
          const options = (msg.options ?? {}) as { comment?: string };
          const comment = typeof options.comment === "string" ? options.comment.slice(0, 140) : "";
          void (async () => {
            // NIP-05 → pubkey makes the zap receipt-capable; failure degrades to plain LNURL-pay.
            const pubkey = await resolveNip05(recipient.address);
            const result = await zapProfile(
              { address: recipient.address, pubkey: pubkey ?? undefined },
              ZAP_SATS,
              comment,
            );
            reply(id, result);
          })().catch((error: unknown) => {
            fail(id, "zap-failed", error instanceof Error ? error.message : "zap failed");
          });
          return;
        }
        case "link.open": {
          const url = typeof msg.url === "string" ? msg.url : "";
          if (openHostLink(url)) reply(id, { status: "opened" });
          else fail(id, "denied", "only https:// and lightning: links may leave the sandbox");
          return;
        }
        case "theme.get":
          reply(id, null);
          return;
        case "identity.getPublicKey":
          reply(id, "");
          return;
        default:
          fail(id, "unsupported", `${type} is not available in this shell`);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handle]);

  return (
    <div
      className="zap-shell"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      role="presentation"
    >
      <section aria-label={`Zap ${handle}`} className="zap-shell-card">
        <header className="zap-shell-head">
          <span className="zap-shell-title">⚡ {handle}</span>
          <button className="zap-shell-close" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <iframe
          className="zap-shell-frame"
          ref={frameRef}
          sandbox="allow-scripts"
          srcDoc={injectPrelude(zapArtifact)}
          title={`Zap ${handle}`}
        />
      </section>
    </div>
  );
}
