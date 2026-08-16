// The generic web napplet host panel — second iteration of the zap panel, now shared.
// Mirrors godot/web/napplet-host.js: `sandbox="allow-scripts"` iframe (opaque origin),
// prelude injected, `nap.*` request/response over postMessage gated on window identity.
// Common domains live here (link, theme, identity stub, storage with the spec's 512 KB
// quota); each napplet passes its own `extension` for domain-specific requests (zap.*)
// and optional `preludeExtras` (e.g. a first-party E1_MIRRORS for the TCG table).

import { type ReactNode, useEffect, useRef } from "react";
import { WEB_NAPPLET_PRELUDE, injectPrelude } from "./prelude";

const STORAGE_QUOTA = 512 * 1024; // bytes per napplet — the napplet spec's cap

type NapRequest = { type: string; id: string } & Record<string, unknown>;

export type NapReply = (id: string, result: unknown) => void;
export type NapFail = (id: string, error: string, message: string) => void;
/** Return true when the request was handled; false falls through to "unsupported". */
export type NapExtension = (msg: NapRequest, reply: NapReply, fail: NapFail) => boolean;

function isNapRequest(value: unknown): value is NapRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

/** Open a link on the napplet's behalf: https in a new tab, lightning: to the OS wallet. */
export function openHostLink(url: string): boolean {
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

/** Prefixed, quota-capped localStorage scope for one napplet (godot host parity). */
function storageScope(nappletId: string) {
  const prefix = `palace.napplet.${nappletId}.`;
  const keys = () => {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) out.push(key.slice(prefix.length));
    }
    return out;
  };
  const used = () =>
    keys().reduce((total, key) => total + (localStorage.getItem(prefix + key)?.length ?? 0), 0);
  return {
    get: (key: string) => localStorage.getItem(prefix + key),
    set: (key: string, value: string) => {
      if (
        used() - (localStorage.getItem(prefix + key)?.length ?? 0) + value.length >
        STORAGE_QUOTA
      ) {
        throw new Error("quota");
      }
      localStorage.setItem(prefix + key, value);
    },
    remove: (key: string) => localStorage.removeItem(prefix + key),
    keys,
  };
}

export function NappletPanel({
  nappletId,
  title,
  artifactHtml,
  preludeExtras = "",
  extension,
  onClose,
  frameClassName = "zap-shell-frame",
  children,
}: {
  /** Storage scope + host bookkeeping id (e.g. "zap", "tcg-table"). */
  nappletId: string;
  title: string;
  /** The single-file artifact; the prelude (plus extras) is injected before it runs. */
  artifactHtml: string;
  /** Extra script prepended with the prelude — e.g. `window.E1_MIRRORS = [...];` */
  preludeExtras?: string;
  extension?: NapExtension;
  onClose: () => void;
  frameClassName?: string;
  /** Optional header extras (status chips etc.). */
  children?: ReactNode;
}) {
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
    const scope = storageScope(nappletId);

    const reply: NapReply = (id, result) => {
      frame.contentWindow?.postMessage({ type: "nap.result", id, result }, "*");
    };
    const fail: NapFail = (id, error, message) => {
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
      if (extension?.(msg, reply, fail)) return;
      switch (type) {
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
        case "storage.getItem":
          reply(id, typeof msg.key === "string" ? scope.get(msg.key) : null);
          return;
        case "storage.setItem":
          try {
            if (typeof msg.key === "string" && typeof msg.value === "string") {
              scope.set(msg.key, msg.value);
              reply(id, { ok: true });
            } else fail(id, "bad-request", "storage.setItem needs string key and value");
          } catch {
            fail(id, "quota", "napplet storage quota exceeded (512 KB)");
          }
          return;
        case "storage.removeItem":
          if (typeof msg.key === "string") scope.remove(msg.key);
          reply(id, { ok: true });
          return;
        case "storage.keys":
          reply(id, scope.keys());
          return;
        default:
          fail(id, "unsupported", `${type} is not available in this shell`);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [extension, nappletId]);

  const prelude = preludeExtras ? `${preludeExtras}\n${WEB_NAPPLET_PRELUDE}` : WEB_NAPPLET_PRELUDE;

  return (
    <div
      className="zap-shell"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      role="presentation"
    >
      <section aria-label={title} className="zap-shell-card">
        <header className="zap-shell-head">
          <span className="zap-shell-title">{title}</span>
          {children}
          <button className="zap-shell-close" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <iframe
          className={frameClassName}
          ref={frameRef}
          sandbox="allow-scripts"
          srcDoc={injectPrelude(artifactHtml, prelude)}
          title={title}
        />
      </section>
    </div>
  );
}
