// Static server for the workspace. Used so the publisher and the artifact it
// signs share one origin (no CORS in the way), and because crypto.subtle needs
// a secure context — 127.0.0.1 counts, file:// does not.
//
//   node napplets/tools/serve.mjs [port]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Two levels up from napplets/tools/ — the repo root, so a napplet is reachable
// at its real workspace path (/napplets/map/dist/index.html).
const ROOT = normalize(join(fileURLToPath(new URL(".", import.meta.url)), "..", ".."));

/*
 * Browsers refuse a fixed list of ports outright ("blocked for security
 * reasons") — they belong to other protocols. 4190 is ManageSieve, 6000 is X11,
 * 6667 is IRC. Default to 5174, which is in none of them.
 */
const BLOCKED = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101,
  102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389,
  427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636,
  989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665,
  6666, 6667, 6668, 6669, 6679, 6697, 10080,
]);

const PORT = Number(process.argv[2] ?? 5174);
if (BLOCKED.has(PORT)) {
  process.stderr.write(`port ${PORT} is on the browser blocked-port list — pick another\n`);
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let file = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  // Never serve outside the workspace, whatever the path contains.
  if (!file.startsWith(ROOT + sep) && file !== ROOT) {
    res.writeHead(403).end("forbidden");
    return;
  }
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`workspace on http://127.0.0.1:${PORT}/\n`);
  process.stdout.write(`publisher    http://127.0.0.1:${PORT}/napplets/tools/publish/\n`);
});
