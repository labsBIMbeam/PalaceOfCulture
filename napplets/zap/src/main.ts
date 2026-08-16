/**
 * Zap — meet a character on the street, send them 21 sats.
 *
 * Pure UI: the napplet holds no keys, no wallet, no network. Everything privileged goes
 * through the host's `zap` domain (probe/send) — the host resolves the roster identity,
 * signs the NIP-57 request (NIP-07 when the browser has it), fetches the invoice and talks
 * to WebLN. When the host can't pay directly, the invoice comes back here and is rendered
 * as a QR + `lightning:` hand-off, so the sats move on the player's own device either way.
 */
import "@600b/napplet-kit/styles.css";
import "./style.css";
import { boot, button, clear, el, openLink } from "@600b/napplet-kit";
import qrcode from "qrcode-generator";

const SATS = 21;

interface ZapProbe {
  handle: string;
  address: string;
  nip07: boolean;
  webln: boolean;
  paymentsEnabled: boolean;
}

interface ZapSendResult {
  paid: boolean;
  invoice?: string;
  fallbackUri?: string;
  error?: string;
  zapRequestSent: boolean;
  recipient?: string;
}

interface ZapDomain {
  probe(): Promise<ZapProbe>;
  send(options?: { comment?: string }): Promise<ZapSendResult>;
}

function zapDomain(): ZapDomain | null {
  const domain = (window.napplet as { zap?: ZapDomain } | undefined)?.zap;
  return domain ?? null;
}

function notice(title: string, body: string): HTMLElement {
  return el("div", { class: "notice" }, [
    el("h2", { class: "notice-title", text: title }),
    el("p", { class: "notice-body", text: body }),
  ]);
}

/** bolt11 → QR `<img>` (uppercase in the URI improves QR density; wallets accept both). */
function invoiceQr(invoice: string): HTMLElement {
  const qr = qrcode(0, "M");
  qr.addData(`lightning:${invoice.toUpperCase()}`);
  qr.make();
  return el("img", {
    class: "zap-qr",
    attrs: { src: qr.createDataURL(4, 2), alt: "Lightning invoice QR" },
  });
}

function capabilityChips(probe: ZapProbe): HTMLElement {
  const chip = (label: string, ok: boolean) =>
    el("span", { class: `zap-chip${ok ? " zap-chip-ok" : ""}`, text: label });
  return el("div", { class: "zap-chips" }, [
    chip(probe.nip07 ? "NIP-07 signer" : "no NIP-07 — app key signs", probe.nip07),
    chip(
      probe.webln && probe.paymentsEnabled ? "WebLN wallet" : "QR / wallet hand-off",
      probe.webln && probe.paymentsEnabled,
    ),
  ]);
}

function renderResult(root: HTMLElement, probe: ZapProbe, result: ZapSendResult): void {
  if (result.paid) {
    clear(
      root,
      el("div", { class: "zap-done" }, [
        el("div", { class: "zap-bolt", text: "⚡" }),
        el("h2", { class: "zap-title", text: `${SATS} sats zapped` }),
        el("p", {
          class: "zap-sub",
          text: `${probe.handle} · ${result.recipient ?? probe.address}${
            result.zapRequestSent ? " · zap receipt on its way" : ""
          }`,
        }),
      ]),
    );
    return;
  }
  if (result.invoice) {
    const uri = result.fallbackUri ?? `lightning:${result.invoice}`;
    clear(
      root,
      el("div", { class: "zap-fallback" }, [
        el("h2", { class: "zap-title", text: `Scan to zap ${SATS} sats` }),
        invoiceQr(result.invoice),
        el("p", {
          class: "zap-sub",
          text: `${probe.handle} · ${result.recipient ?? probe.address}`,
        }),
        button("Open in wallet", "zap-button zap-button-secondary", () => {
          void openLink(uri);
        }),
        result.error ? el("p", { class: "zap-error", text: result.error }) : "",
      ]),
    );
    return;
  }
  clear(
    root,
    notice("Zap failed", result.error ?? "The lightning endpoint did not answer."),
    button("Try again", "zap-button", () => renderReady(root, probe)),
  );
}

function renderReady(root: HTMLElement, probe: ZapProbe): void {
  const send = button(`⚡ Zap ${SATS} sats`, "zap-button", () => {
    send.disabled = true;
    send.textContent = "Zapping…";
    const domain = zapDomain();
    if (!domain) return;
    void domain
      .send({ comment: "⚡ seen on Locktard Street" })
      .then((result) => renderResult(root, probe, result))
      .catch((error: unknown) =>
        clear(
          root,
          notice("Zap failed", error instanceof Error ? error.message : "Unknown."),
          button("Try again", "zap-button", () => renderReady(root, probe)),
        ),
      );
  });
  clear(
    root,
    el("div", { class: "zap-card" }, [
      el("p", { class: "zap-kicker", text: "ZAP" }),
      el("h2", { class: "zap-title", text: probe.handle }),
      el("p", { class: "zap-sub", text: probe.address }),
      capabilityChips(probe),
      send,
    ]),
  );
}

boot({
  requires: [],
  unavailable: "This shell provides no zap support.",
  render: async (root) => {
    const domain = zapDomain();
    if (!domain) {
      clear(root, notice("Not available in this shell", "This runtime has no zap domain."));
      return;
    }
    clear(root, el("p", { class: "zap-sub", text: "Looking up the character…" }));
    const probe = await domain.probe();
    renderReady(root, probe);
  },
});
