/**
 * Map napplet — pure signal.
 *
 * A dark world of gold outlines, one marker on Madeira, one line. Nothing else:
 * no event plotting, no asset cluster, no decoration. The message is the point.
 *
 * It asks the runtime for nothing it cannot live without — `theme` when the
 * shell offers one, the bundled dark palette when it does not — so it runs in
 * any NIP-5D shell, including one that injects no domains at all.
 */
import "@600b/napplet-kit/styles.css";
import { boot, clear, el, has, openLink } from "@600b/napplet-kit";
import { mountMemes } from "./memes.js";
import stoneUrl from "./sacred-stone.webp";
import secLogoUrl from "./sec-logo.svg";
import { WORLD } from "./world.js";
import "./map.css";

/** Equirectangular: the viewBox *is* degrees, so projection is a translation. */
const VIEW_W = 360;
const VIEW_H = 180;
const SVG_NS = "http://www.w3.org/2000/svg";

/** Palace of Culture — Madeira. */
const MADEIRA = { lat: 32.7583, lon: -16.9419 };

const LINE = "We're not a cult. We're culture.";

/** Where Madeira leads. Opened through NAP-LINK — never by navigating ourselves. */
const MADEIRA_URL = "https://sec1.citadel-resources.com/intro.html";

/** The rain reads the number itself, top to bottom: 6, then eleven zeroes. */
const NUMBER = "600000000000";
const CELL = 14;
const TICK_MS = 90;

/** How long the stone holds before the map takes over. */
const INTRO_MS = 2200;

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

const x = (lon: number): number => lon + 180;
const y = (lat: number): number => 90 - lat;

/**
 * 600000000000 falling behind the world.
 *
 * Each column runs the digits of the number in order, so a vertical read is
 * always 6-0-0-0-0-0-0-0-0-0-0-0. Deliberately cheap: one canvas, one interval,
 * and it stops the moment the napplet is hidden.
 */
function startRain(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  let heads: number[] = [];
  const resize = (): void => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const columns = Math.max(1, Math.ceil(canvas.width / CELL));
    heads = Array.from({ length: columns }, () => -Math.floor(Math.random() * 40));
  };
  resize();
  window.addEventListener("resize", resize);

  const timer = window.setInterval(() => {
    // Fade the previous frame instead of clearing: that is the trail.
    ctx.fillStyle = "rgba(10, 7, 5, 0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${CELL - 2}px ui-monospace, monospace`;

    const rows = Math.ceil(canvas.height / CELL);
    heads.forEach((head, column) => {
      // A short bright tail behind each head, dimming as it falls away.
      for (let back = 0; back < 6; back += 1) {
        const row = head - back;
        if (row < 0 || row > rows) continue;
        const digit = NUMBER[((row % NUMBER.length) + NUMBER.length) % NUMBER.length] ?? "0";
        ctx.fillStyle = `rgba(231, 178, 60, ${(0.34 - back * 0.05).toFixed(3)})`;
        ctx.fillText(digit, column * CELL, row * CELL);
      }
      heads[column] = head > rows + 6 && Math.random() > 0.97 ? 0 : head + 1;
    });
  }, TICK_MS);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener("resize", resize);
  };
}

/**
 * The ship is the SEC mark, drawn at the origin so CSS can carry it along its
 * route. The logo is inlined at build time (it is 3.5 KB of SVG), because a
 * napplet has no origin from which to fetch it.
 */
function ship(onClick: () => void): SVGGElement {
  const group = svg("g", { class: "ship" });
  const mark = svg("image", { x: "-2.6", y: "-2.6", width: "5.2", height: "5.2", class: "mark" });
  mark.setAttribute("href", secLogoUrl);
  group.append(
    // A generous invisible hit area: the mark is ~5 units wide and moving,
    // and on the 480x320 Totem panel (1.33 px per map unit) a 44px tap
    // target needs a radius of 17 units. Nobody chases the ship.
    svg("circle", { cx: "0", cy: "0", r: "17", class: "ship-hit" }),
    svg("path", { d: "M-3.4,2.4 Q0,3.2 3.4,2.4", class: "wake" }),
    mark,
  );
  group.setAttribute("role", "button");
  group.setAttribute("tabindex", "0");
  group.setAttribute("aria-label", "Open the meme viewer");
  const title = svg("title");
  title.textContent = "Click for memes";
  group.append(title);

  group.addEventListener("click", onClick);
  group.addEventListener("keydown", (event: Event) => {
    const key = (event as KeyboardEvent).key;
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      onClick();
    }
  });
  return group;
}

/**
 * A short intro: the stone, then the map. Skippable by click or key, and it
 * never blocks — the map is already built underneath before this fades out.
 */
function intro(root: HTMLElement, done: () => void): void {
  const stone = el("img", { class: "stone", attrs: { alt: "", decoding: "async" } });
  stone.src = stoneUrl;
  const screen = el("div", { class: "intro", attrs: { role: "presentation" } }, [
    stone,
    el("p", { class: "intro-line", text: LINE }),
    el("p", { class: "intro-skip muted", text: "click to skip" }),
  ]);

  let finished = false;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timer);
    screen.dataset.leaving = "true";
    // Let the fade play out, then take the intro out of the tree entirely.
    window.setTimeout(() => {
      screen.remove();
      done();
    }, 600);
  };

  const timer = window.setTimeout(finish, INTRO_MS);
  screen.addEventListener("click", finish);
  window.addEventListener("keydown", finish, { once: true });
  root.append(screen);
}

function render(root: HTMLElement): void {
  // Only ever written to when the shell will not open a link for us.
  const note = el("p", { class: "note" });
  const board = svg("svg", {
    class: "map",
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label": `World map. One marker: Madeira. ${LINE}`,
  });

  for (const country of WORLD) {
    const d = country.r
      .map((ring) => `M${ring.map(([lon, lat]) => `${x(lon)},${y(lat)}`).join("L")}Z`)
      .join("");
    board.append(svg("path", { d, class: "country" }));
  }

  // The ship circumnavigates, and it is also the switch: clicking it opens the
  // memes. Drawn before the marker so Madeira always sits on top of it.
  const memesReady = { toggle: (): void => {} };
  board.append(ship(() => memesReady.toggle()));

  // The one marker: three staggered pulses, then the point itself. Clicking it
  // leaves through the shell.
  const cx = String(x(MADEIRA.lon));
  const cy = String(y(MADEIRA.lat));
  const pulses = svg("g", { class: "pulses" });
  for (let index = 0; index < 3; index += 1) {
    pulses.append(
      svg("circle", { cx, cy, r: "1.8", class: "pulse", style: `animation-delay:${index * 1.2}s` }),
    );
  }

  const madeira = svg("g", { class: "madeira" });
  madeira.append(
    svg("circle", { cx, cy, r: "4", class: "here-hit" }),
    svg("circle", { cx, cy, r: "1.5", class: "here" }),
  );
  madeira.setAttribute("role", "link");
  madeira.setAttribute("tabindex", "0");
  madeira.setAttribute("aria-label", "Open the Street of SEC intro");
  const label = svg("title");
  label.textContent = has("link") ? "Madeira — open the intro" : "Madeira";
  madeira.append(label);

  const leave = (): void => {
    // Without NAP-LINK there is no way out of the sandbox: say so rather than
    // looking broken.
    if (!has("link")) {
      note.textContent = MADEIRA_URL;
      return;
    }
    void openLink(MADEIRA_URL).then((outcome) => {
      if (outcome !== "opened") note.textContent = `${MADEIRA_URL} (the shell declined)`;
    });
  };
  madeira.addEventListener("click", leave);
  madeira.addEventListener("keydown", (event: Event) => {
    const key = (event as KeyboardEvent).key;
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      leave();
    }
  });

  board.append(pulses, madeira);

  const rain = el("canvas", { class: "rain", attrs: { "aria-hidden": "true" } });
  const stage = el("div", { class: "stage" }, [rain, board as unknown as Node]);
  clear(root, stage, el("p", { class: "line", text: LINE }), note);

  // The stone plays over a map that is already built, so nothing waits on it.
  intro(root, () => {
    root.dataset.ready = "true";
  });

  const stopRain = startRain(rain);
  const viewer = mountMemes(stage);
  memesReady.toggle = viewer.toggle;
  window.addEventListener("pagehide", () => {
    stopRain();
    viewer.dispose();
  });
}

boot({ render });
