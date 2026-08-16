/**
 * The meme viewer: a movable window onto memes.600.wtf.
 *
 * This is the part of the map that genuinely needs a shell. A napplet has no
 * network authority of its own, so both the index and every image come through
 * NAP-RESOURCE — without it the button simply never appears.
 */
import { bytes, el, has } from "@600b/napplet-kit";

const ORIGIN = "https://memes.600.wtf";
const INDEX = `${ORIGIN}/api/memes`;
const ROTATE_MS = 6000;

/** One meme, reduced to what the viewer shows. */
interface Meme {
  url: string;
  who: string;
}

interface IndexEntry {
  url?: unknown;
  mime_type?: unknown;
  uploader_name?: unknown;
}

/**
 * Fetch and parse the index. Videos are skipped: they are large, and a
 * shell-mediated byte fetch is the wrong shape for streaming media.
 */
async function loadIndex(): Promise<Meme[]> {
  const blob = await bytes(INDEX);
  if (!blob) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(await blob.text());
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const memes: Meme[] = [];
  for (const raw of parsed as IndexEntry[]) {
    const url = typeof raw.url === "string" ? raw.url : "";
    const mime = typeof raw.mime_type === "string" ? raw.mime_type : "";
    if (!url || !mime.startsWith("image/")) continue;
    memes.push({
      url: url.startsWith("http") ? url : `${ORIGIN}${url}`,
      who: typeof raw.uploader_name === "string" ? raw.uploader_name : "anon",
    });
  }
  return memes;
}

/** Drag by the header. Pointer events cover mouse, pen and touch in one path. */
function makeMovable(panel: HTMLElement, handle: HTMLElement): void {
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  const move = (event: PointerEvent): void => {
    const parent = panel.parentElement;
    if (!parent) return;
    const bounds = parent.getBoundingClientRect();
    // Keep at least a corner of the panel on screen, whatever the drag does.
    const maxX = Math.max(0, bounds.width - panel.offsetWidth);
    const maxY = Math.max(0, bounds.height - panel.offsetHeight);
    panel.style.left = `${Math.min(maxX, Math.max(0, originX + event.clientX - startX))}px`;
    panel.style.top = `${Math.min(maxY, Math.max(0, originY + event.clientY - startY))}px`;
  };

  const up = (event: PointerEvent): void => {
    handle.releasePointerCapture(event.pointerId);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };

  handle.addEventListener("pointerdown", (event: PointerEvent) => {
    startX = event.clientX;
    startY = event.clientY;
    originX = panel.offsetLeft;
    originY = panel.offsetTop;
    handle.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    event.preventDefault();
  });
}

/** Handle for the viewer: the ship is the switch, so the caller drives it. */
export interface MemeViewer {
  /** Show or hide the viewer. */
  toggle: () => void;
  /** True once the index loaded and there is something to show. */
  ready: () => boolean;
  /** Stop rotating and revoke every object URL. */
  dispose: () => void;
}

const INERT: MemeViewer = { toggle: () => {}, ready: () => false, dispose: () => {} };

/**
 * Mount the viewer into `stage`. It stays hidden until something toggles it —
 * on this map, clicking the ship.
 */
export function mountMemes(stage: HTMLElement): MemeViewer {
  if (!has("resource")) return INERT;

  const objectUrls = new Set<string>();
  let memes: Meme[] = [];
  let timer = 0;
  let open = false;

  // One big meme, centred over the map. Click it for the next one, click the
  // backdrop or press Escape to close.
  const image = el("img", { class: "meme-big", attrs: { alt: "" } });
  const who = el("p", { class: "meme-who", text: "" });
  const status = el("p", { class: "meme-status", text: "loading memes…" });
  const stack = el("div", { class: "meme-stack" }, [image, who, status]);
  const closeButton = el("button", {
    class: "meme-x",
    type: "button",
    text: "✕",
    attrs: { "aria-label": "Close memes" },
  });
  const panel = el("div", { class: "meme-panel", attrs: { hidden: "" } }, [closeButton, stack]);
  // Still movable: drag anywhere on the backdrop that is not the image itself.
  makeMovable(stack, who);

  const show = async (): Promise<void> => {
    if (memes.length === 0) return;
    const meme = memes[Math.floor(Math.random() * memes.length)];
    if (!meme) return;
    const blob = await bytes(meme.url);
    if (!blob || !open) return;
    const url = URL.createObjectURL(blob);
    objectUrls.add(url);
    image.src = url;
    who.textContent = `by ${meme.who}`;
  };

  const start = (): void => {
    window.clearInterval(timer);
    timer = window.setInterval(() => void show(), ROTATE_MS);
  };

  const setOpen = (next: boolean): void => {
    open = next;
    panel.toggleAttribute("hidden", !next);
    if (next) {
      void show();
      start();
    } else {
      window.clearInterval(timer);
    }
  };

  closeButton.addEventListener("click", () => setOpen(false));
  // Clicking the image is the fastest way to say "next".
  image.addEventListener("click", (event) => {
    event.stopPropagation();
    void show();
  });
  // Clicking the backdrop closes; Escape does too while it is open.
  panel.addEventListener("click", (event) => {
    if (event.target === panel) setOpen(false);
  });
  window.addEventListener("keydown", (event) => {
    if (open && (event as KeyboardEvent).key === "Escape") setOpen(false);
  });

  stage.append(panel);

  void loadIndex().then((loaded) => {
    memes = loaded;
    if (loaded.length === 0) {
      // Almost always CORS on the meme host rather than a missing shell — name
      // the real cause instead of leaving an empty frame.
      status.textContent =
        "memes.600.wtf sends no Access-Control-Allow-Origin, so a sandboxed napplet cannot read it.";
      return;
    }
    status.remove();
    if (open) void show();
  });

  return {
    toggle: () => setOpen(!open),
    ready: () => memes.length > 0,
    dispose: () => {
      window.clearInterval(timer);
      for (const url of objectUrls) URL.revokeObjectURL(url);
      objectUrls.clear();
    },
  };
}
