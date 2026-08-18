#!/usr/bin/env node
// Prints the X-Forwarded-For chain the origin actually receives, and which address each candidate
// hop count would select. Mirrors resolveClientIp() in apps/server/src/rateLimit.ts exactly, so its
// output is authoritative for choosing TRUST_PROXY_HOPS / MULTIPLAYER_TRUST_PROXY_HOPS.
//
//   node .claude/skills/fips/scripts/probe-forwarded-for.mjs [port]
//
// Route a temporary edge path to 127.0.0.1:<port>, load it through the real public hostname, then
// remove the route. Binds loopback only and never writes to disk.

import { createServer } from "node:http";
import { isIP } from "node:net";

const MAX_FORWARDED_FOR_LENGTH = 512;

const port = Number(process.argv[2] ?? 8788);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  process.stderr.write("[fips] port must be an integer between 1 and 65535\n");
  process.exit(1);
}

const server = createServer((request, response) => {
  const forwardedForHeader = request.headers["x-forwarded-for"];
  const forwardedFor = Array.isArray(forwardedForHeader)
    ? forwardedForHeader.join(",")
    : forwardedForHeader;
  const report = describeRequest(request.socket.remoteAddress, forwardedFor, request.headers);

  process.stdout.write(report);
  response.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
  response.end(report);
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(
    `[fips] probe listening on http://127.0.0.1:${port} — route an edge path here, then load it\n` +
      "[fips] Ctrl+C to stop\n\n",
  );
});

process.once("SIGINT", () => server.close(() => process.exit(0)));
process.once("SIGTERM", () => server.close(() => process.exit(0)));

/** Render the received forwarding chain and the effect of every plausible hop count. */
function describeRequest(remoteAddress, forwardedFor, headers) {
  const lines = ["", "=".repeat(72), `request at ${new Date().toISOString()}`, "=".repeat(72)];
  lines.push(`socket.remoteAddress : ${normalizeIpAddress(remoteAddress) ?? "unknown"}`);
  lines.push(`x-forwarded-for      : ${forwardedFor ?? "(absent)"}`);

  // Cloudflare's own header is a useful cross-check: it is the true client, unappended.
  const connectingIp = headers["cf-connecting-ip"];
  if (connectingIp) lines.push(`cf-connecting-ip     : ${connectingIp}`);
  const realIp = headers["x-real-ip"];
  if (realIp) lines.push(`x-real-ip            : ${realIp}`);

  const chain = forwardedFor ? forwardedFor.split(",").map((entry) => entry.trim()) : [];
  if (chain.length > 0) {
    lines.push("", "chain, left to right (each proxy appends on the right):");
    chain.forEach((entry, index) => lines.push(`  [${index}] ${entry}`));
  }

  lines.push("", "hop count -> address the server would use:");
  const maxHops = Math.min(10, chain.length + 1);
  for (let hops = 0; hops <= maxHops; hops += 1) {
    const selected = resolveClientIp(remoteAddress, forwardedFor, hops);
    const marker = hops === chain.length && chain.length > 0 ? "   <-- matches chain length" : "";
    lines.push(`  ${String(hops).padStart(2)} -> ${selected}${marker}`);
  }

  lines.push(
    "",
    "Pick the hop count whose address equals your real public IP (curl -s ifconfig.me from the",
    "browsing machine). Then re-run with a forged header:",
    "",
    "  curl -sS -H 'X-Forwarded-For: 1.2.3.4' https://<host>/__probe",
    "",
    "If 1.2.3.4 is selected at that hop count, the count is too high or the request bypassed the",
    "edge — either way both counters belong back at 0 until the origin is locked down.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

/** Byte-for-byte mirror of resolveClientIp() in apps/server/src/rateLimit.ts. */
function resolveClientIp(remoteAddress, forwardedFor, trustedProxyHops) {
  const remoteIp = normalizeIpAddress(remoteAddress) ?? "unknown";
  if (trustedProxyHops === 0 || !forwardedFor || forwardedFor.length > MAX_FORWARDED_FOR_LENGTH) {
    return remoteIp;
  }

  const forwardedChain = forwardedFor.split(",");
  const clientIndex = forwardedChain.length - trustedProxyHops;
  if (clientIndex < 0 || clientIndex >= forwardedChain.length) return remoteIp;
  return normalizeIpAddress(forwardedChain[clientIndex]?.trim()) ?? remoteIp;
}

/** Mirror of normalizeIpAddress() in apps/server/src/rateLimit.ts. */
function normalizeIpAddress(value) {
  if (!value) return null;
  const candidate = value.trim().replace(/^\[|\]$/g, "");
  const family = isIP(candidate);
  if (family === 4) return candidate;
  if (family !== 6) return null;

  let canonical;
  try {
    canonical = new URL(`http://[${candidate}]/`).hostname.slice(1, -1);
  } catch {
    return null;
  }

  const mappedIpv4 = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(canonical);
  if (!mappedIpv4) return canonical;
  const high = Number.parseInt(mappedIpv4[1] ?? "", 16);
  const low = Number.parseInt(mappedIpv4[2] ?? "", 16);
  return `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`;
}
