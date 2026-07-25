/**
 * Feed napplet — NAAT-FEED.
 *
 * A scrolling list of events by some criteria. That is the whole role: it does
 * not compose, it does not navigate, and it does not own a profile view. When a
 * reader opens an author, this asks the runtime for whoever handles the
 * `profile` role (NAP-INTENT) rather than growing a profile screen of its own.
 *
 * Portable: shipped NAPs only (`outbox` required; `common`, `resource`, `link`
 * optional), so it runs unchanged in any NIP-5D shell.
 */
import "@palace/kit/styles.css";
import {
  boot,
  bytes,
  clear,
  el,
  has,
  initials,
  openLink,
  profile,
  query,
  relative,
  subscribe,
  truncate,
} from "@palace/kit";
import type { NostrEvent, RelayEventResult } from "@napplet/sdk";

const PAGE = 40;
const KIND_TEXT_NOTE = 1;

/** Everything the list needs about one author, resolved lazily. */
interface Author {
  name: string;
  picture?: string;
}

const authors = new Map<string, Author>();
const objectUrls = new Set<string>();
let notes: NostrEvent[] = [];

/** Newest first, deduped by id. */
function ingest(incoming: NostrEvent[]): void {
  const byId = new Map(notes.map((note) => [note.id, note]));
  for (const note of incoming) byId.set(note.id, note);
  notes = [...byId.values()].sort((a, b) => b.created_at - a.created_at).slice(0, 200);
}

async function resolveAuthor(pubkey: string): Promise<Author> {
  const cached = authors.get(pubkey);
  if (cached) return cached;
  const meta = await profile(pubkey);
  const author: Author = {
    name:
      (typeof meta?.displayName === "string" && meta.displayName) ||
      (typeof meta?.name === "string" && meta.name) ||
      truncate(pubkey),
    picture: typeof meta?.picture === "string" ? meta.picture : undefined,
  };
  authors.set(pubkey, author);
  return author;
}

/** Avatar through NAP-RESOURCE, or initials when bytes are unavailable. */
async function paintAvatar(host: HTMLElement, author: Author): Promise<void> {
  if (!author.picture || !has("resource")) return;
  const blob = await bytes(author.picture);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  objectUrls.add(url);
  const image = el("img", { attrs: { alt: "", decoding: "async" } });
  image.src = url;
  clear(host, image);
}

function renderNote(note: NostrEvent, now: number): HTMLElement {
  const avatar = el("div", { class: "avatar", text: initials(note.pubkey) });
  const who = el("span", { class: "who", text: truncate(note.pubkey) });

  void resolveAuthor(note.pubkey).then((author) => {
    who.textContent = author.name;
    avatar.textContent = initials(author.name);
    void paintAvatar(avatar, author);
  });

  const head = el("div", { class: "row" }, [
    avatar,
    who,
    el("span", { class: "grow" }),
    el("span", { class: "when", text: relative(note.created_at, now) }),
  ]);

  const body = el("p", { class: "body", text: note.content.slice(0, 1000) });
  const card = el("article", { class: "card" }, [head, body]);

  // Links leave through the shell; a napplet never navigates on its own.
  const firstUrl = /https?:\/\/\S+/.exec(note.content)?.[0];
  if (firstUrl && has("link")) {
    card.append(
      el("button", {
        class: "link-button",
        type: "button",
        text: firstUrl.slice(0, 60),
        on: { click: () => void openLink(firstUrl) },
      }),
    );
  }
  return card;
}

function render(root: HTMLElement): void {
  const list = el("div", { class: "scroll" });
  const status = el("span", { class: "muted", text: "loading…" });
  const bar = el("div", { class: "bar" }, [
    el("h1", { class: "title", text: "Feed" }),
    el("span", { class: "grow" }),
    status,
  ]);
  clear(root, bar, list);

  const paint = (): void => {
    if (notes.length === 0) {
      clear(
        list,
        el("div", { class: "notice" }, [
          el("h2", { class: "notice-title", text: "Nothing here yet" }),
          el("p", {
            class: "notice-body",
            text: "No notes came back from the relays this shell reached.",
          }),
        ]),
      );
      return;
    }
    const now = Date.now();
    clear(list, ...notes.map((note) => renderNote(note, now)));
  };

  clear(list, el("div", { class: "skeleton" }), el("div", { class: "skeleton" }));

  void query([{ kinds: [KIND_TEXT_NOTE], limit: PAGE }], { timeoutMs: 5000 }).then((result) => {
    if (result.error && result.events.length === 0) {
      status.textContent = result.error;
    } else {
      status.textContent = "";
    }
    ingest(result.events.map((entry: RelayEventResult) => entry.event));
    paint();
  });

  // Live top-up. The shell owns relay policy; this only asks for the stream.
  const close = subscribe([{ kinds: [KIND_TEXT_NOTE], limit: PAGE }], {}, (entry) => {
    ingest([entry.event]);
    paint();
  });

  window.addEventListener("pagehide", () => {
    close?.();
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls.clear();
  });
}

boot({
  requires: ["outbox"],
  unavailable: "This feed reads notes through the shell's outbox service, which this runtime did not provide.",
  render,
});
