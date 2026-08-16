// The zap napplet, hosted by the generic NappletPanel — this file now only carries the
// zap domain (probe/send). Everything privileged stays host-side: roster lookup, NIP-05
// resolve, NIP-57 signing (NIP-07 preferred), LNURL fetch, WebLN. The napplet is pure UI.
//
// Dev note: the artifact is inlined at build time from napplets/zap/dist — run
// `pnpm --filter @600b/napplet-zap build` once before `apps/web` dev/build (CI's
// topological `pnpm -r build` orders it automatically via the devDependency).

import { useCallback } from "react";
import zapArtifact from "../../../../napplets/zap/dist/index.html?raw";
import { REAL_PAYMENTS_ENABLED } from "../config/safety";
import { zapProfile } from "../net/lightning";
import { resolveNip05 } from "../net/nip05";
import { type NapExtension, NappletPanel } from "./NappletPanel";
import { zapRecipientFor } from "./zapDirectory";

const ZAP_SATS = 21;

export function ZapNappletPanel({ handle, onClose }: { handle: string; onClose: () => void }) {
  const extension = useCallback<NapExtension>(
    (msg, reply, fail) => {
      const { type, id } = msg;
      if (type === "zap.probe") {
        const recipient = zapRecipientFor(handle);
        if (!recipient) fail(id, "no-recipient", `${handle} has no roster lightning identity`);
        else {
          reply(id, {
            handle: recipient.handle,
            address: recipient.address,
            sats: ZAP_SATS,
            nip07: Boolean((window as { nostr?: unknown }).nostr),
            webln: Boolean(window.webln),
            paymentsEnabled: REAL_PAYMENTS_ENABLED,
          });
        }
        return true;
      }
      if (type === "zap.send") {
        const recipient = zapRecipientFor(handle);
        if (!recipient) {
          fail(id, "no-recipient", `${handle} has no roster lightning identity`);
          return true;
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
        return true;
      }
      return false;
    },
    [handle],
  );

  return (
    <NappletPanel
      artifactHtml={zapArtifact}
      extension={extension}
      nappletId="zap"
      onClose={onClose}
      title={`⚡ ${handle}`}
    />
  );
}
