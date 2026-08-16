/**
 * The Prism host — mounts N napplets at once, one per region.
 *
 * Each napplet is a separate `iframe sandbox="allow-scripts"` with no
 * `allow-same-origin`, so every panel runs at an opaque origin with no ambient
 * authority: no fetch, no socket, no storage, no signer, and no reach into any
 * sibling panel. They share exactly one thing — the shell state this host reads
 * snapshots out of.
 *
 * Three properties are load-bearing:
 *
 * - **Nothing remounts.** Changing lens, surface or Bell Mode changes region
 *   *visibility*, never the iframe set. Round 5 finding 1 is a hosting rule here,
 *   not a discipline someone has to remember.
 * - **Least privilege per panel.** A napplet only reaches domains its region
 *   entry granted. The chat panel cannot read presence.
 * - **The shell stamps identity.** Intents carry no actor; the host attaches the
 *   authenticated one before the state ever sees it.
 */
import type { PalaceState } from "./controllers.js";
import {
  type PalaceDomain,
  type PalaceTheme,
  isNappletMessage,
  isPalaceIntent,
} from "./domains.js";
import { PRELUDE_SOURCE } from "./prelude.js";
import { type Region, type RegionEntry, isGranted, isRegionVisible } from "./regions.js";

/** Where a host puts each region's iframe. */
export type RegionElements = Partial<Record<Region, HTMLElement>>;

/** Options for {@link PrismHost}. */
export interface PrismHostOptions {
  state: PalaceState;
  entries: readonly RegionEntry[];
  containers: RegionElements;
  theme: PalaceTheme;
  /** Injected so tests can run without a network. Defaults to `fetch`. */
  loadArtifact?: (url: string) => Promise<string>;
}

/** What the host knows about one mounted panel. */
interface Mounted {
  entry: RegionEntry;
  frame: HTMLIFrameElement;
  subscribed: Set<PalaceDomain>;
  ready: boolean;
  error: string;
}

async function defaultLoad(url: string): Promise<string> {
  const response = await fetch(url, { credentials: "omit", redirect: "error" });
  if (!response.ok) throw new Error(`artifact ${response.status}`);
  return response.text();
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Injects the prelude ahead of the napplet's own scripts. */
function injectPrelude(html: string): string {
  const tag = `<script>${PRELUDE_SOURCE}</${"script"}>`;
  const head = /<head(\s[^>]*)?>/i.exec(html);
  if (head === null) return tag + html;
  const at = head.index + head[0].length;
  return html.slice(0, at) + tag + html.slice(at);
}

/** Mounts and drives every napplet in a Prism shell. */
export class PrismHost {
  private readonly state: PalaceState;
  private readonly entries: readonly RegionEntry[];
  private readonly containers: RegionElements;
  private readonly loadArtifact: (url: string) => Promise<string>;
  private readonly mounted = new Map<string, Mounted>();
  private readonly onMessage = (event: MessageEvent): void => this.handle(event);
  private unsubscribe: (() => void) | null = null;
  private theme: PalaceTheme;

  constructor(options: PrismHostOptions) {
    this.state = options.state;
    this.entries = options.entries;
    this.containers = options.containers;
    this.theme = options.theme;
    this.loadArtifact = options.loadArtifact ?? defaultLoad;
  }

  /** Mount every entry that has a container. Safe to await once. */
  async start(): Promise<void> {
    window.addEventListener("message", this.onMessage);
    this.unsubscribe = this.state.subscribe((domain, snapshot) => {
      this.broadcast(domain, snapshot);
      if (domain === "session") this.applyBellMode();
    });
    await Promise.all(this.entries.map((entry) => this.mount(entry)));
    this.applyBellMode();
  }

  /** Tear every panel down and stop listening. */
  stop(): void {
    window.removeEventListener("message", this.onMessage);
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const panel of this.mounted.values()) panel.frame.remove();
    this.mounted.clear();
  }

  /** Repaint every panel with a new palette. */
  setTheme(theme: PalaceTheme): void {
    this.theme = theme;
    for (const panel of this.mounted.values()) {
      this.post(panel, { type: "palace.theme", id: "theme", theme });
    }
  }

  /** Diagnostic view of what is mounted — used by the demo and by tests. */
  status(): { id: string; region: Region; ready: boolean; error: string }[] {
    return Array.from(this.mounted.values()).map((panel) => ({
      id: panel.entry.id,
      region: panel.entry.region,
      ready: panel.ready,
      error: panel.error,
    }));
  }

  private async mount(entry: RegionEntry): Promise<void> {
    const container = this.containers[entry.region];
    if (container === undefined) return;

    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("title", entry.title);
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.border = "0";
    frame.style.display = "block";
    const panel: Mounted = { entry, frame, subscribed: new Set(), ready: false, error: "" };
    this.mounted.set(entry.id, panel);

    try {
      const html = await this.loadArtifact(entry.artifactUrl);
      if (entry.sha256) {
        const actual = await sha256Hex(html);
        if (actual !== entry.sha256) {
          throw new Error(`artifact hash mismatch: expected ${entry.sha256}, got ${actual}`);
        }
      }
      frame.srcdoc = injectPrelude(html);
      container.appendChild(frame);
    } catch (error) {
      panel.error = error instanceof Error ? error.message : String(error);
    }
  }

  /** Bell Mode collapses regions; it never unmounts them. */
  private applyBellMode(): void {
    const focused = this.state.get("session").focused;
    for (const panel of this.mounted.values()) {
      const container = this.containers[panel.entry.region];
      if (container === undefined) continue;
      container.hidden = !isRegionVisible(panel.entry.region, focused);
    }
  }

  private find(source: MessageEventSource | null): Mounted | undefined {
    if (source === null) return undefined;
    for (const panel of this.mounted.values()) {
      if (panel.frame.contentWindow === source) return panel;
    }
    return undefined;
  }

  private handle(event: MessageEvent): void {
    const panel = this.find(event.source);
    if (panel === undefined) return;
    const message: unknown = event.data;
    if (!isNappletMessage(message)) return;

    switch (message.type) {
      case "palace.ready":
        panel.ready = true;
        this.post(panel, { type: "palace.theme", id: "theme", theme: this.theme });
        return;

      case "palace.get": {
        if (!isGranted(panel.entry, message.domain)) {
          this.deny(panel, message.id, message.domain);
          return;
        }
        this.post(panel, {
          type: "palace.result",
          id: message.id,
          result: this.state.get(message.domain),
        });
        return;
      }

      case "palace.subscribe": {
        if (!isGranted(panel.entry, message.domain)) {
          this.deny(panel, message.id, message.domain);
          return;
        }
        panel.subscribed.add(message.domain);
        this.post(panel, {
          type: "palace.snapshot",
          id: message.id,
          domain: message.domain,
          snapshot: this.state.get(message.domain),
        });
        return;
      }

      case "palace.intent": {
        const intent: unknown = message.intent;
        if (!isPalaceIntent(intent)) {
          this.post(panel, {
            type: "palace.error",
            id: message.id,
            error: "bad-intent",
            reason: "unknown domain or action",
          });
          return;
        }
        if (!isGranted(panel.entry, intent.domain)) {
          this.deny(panel, message.id, intent.domain);
          return;
        }
        this.post(panel, {
          type: "palace.result",
          id: message.id,
          result: this.state.apply(intent),
        });
        return;
      }

      case "palace.resize": {
        const container = this.containers[panel.entry.region];
        if (container !== undefined && Number.isFinite(message.height)) {
          // Clamped: a panel may ask for room, it may not take over the shell.
          const height = Math.max(0, Math.min(2000, message.height));
          panel.frame.style.height = `${height}px`;
        }
        return;
      }

      default:
        return;
    }
  }

  private deny(panel: Mounted, id: string, domain: string): void {
    this.post(panel, {
      type: "palace.error",
      id,
      error: "not-granted",
      reason: `${panel.entry.id} was not granted '${domain}'`,
    });
  }

  private broadcast(domain: PalaceDomain, snapshot: unknown): void {
    for (const panel of this.mounted.values()) {
      if (!panel.subscribed.has(domain)) continue;
      this.post(panel, { type: "palace.snapshot", id: "push", domain, snapshot });
    }
  }

  private post(panel: Mounted, message: Record<string, unknown>): void {
    panel.frame.contentWindow?.postMessage(message, "*");
  }
}
