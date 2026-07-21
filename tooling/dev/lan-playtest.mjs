import { spawn } from "node:child_process";
import { isIP } from "node:net";

const host = process.env.PALACE_LAN_HOST?.trim() ?? "";
const ipVersion = isIP(host);
const validHostname =
  host.length <= 253 &&
  /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(
    host,
  );

if (!host || (!ipVersion && !validHostname)) {
  fail("Set PALACE_LAN_HOST to this Linux machine's Tailscale/LAN IP or DNS name.");
}
if (host === "0.0.0.0" || host === "::" || host === "localhost" || host.startsWith("127.")) {
  fail(
    "PALACE_LAN_HOST must be an address the Windows client can reach, not a wildcard or loopback.",
  );
}

const packageManager = process.env.npm_execpath;
if (!packageManager) {
  fail("Run this through pnpm: PALACE_LAN_HOST=<host> pnpm dev:lan");
}

const urlHost = ipVersion === 6 ? `[${host}]` : host;
const clientOrigin = `http://${urlHost}:5173`;
const multiplayerUrl = `http://${urlHost}:2567`;
const children = [];
let closing = false;

const server = runPnpm(["--filter", "@600b/server", "dev"], {
  CORS_ORIGINS: clientOrigin,
  HOST: "127.0.0.1",
  MULTIPLAYER_HOST: host,
  MULTIPLAYER_ORIGINS: clientOrigin,
  MULTIPLAYER_PORT: "2567",
  PORT: "8787",
});
children.push(server);

const web = runPnpm(["--filter", "@600b/web", "dev", "--host", host, "--strictPort"], {
  VITE_MULTIPLAYER_URL: multiplayerUrl,
});
children.push(web);

process.stdout.write(
  [
    "",
    "[600b] Windows browser playtest",
    `[600b] client:      ${clientOrigin}`,
    `[600b] health:      ${clientOrigin}/api/health`,
    `[600b] multiplayer: ${multiplayerUrl}`,
    "[600b] bound only to the requested interface; Ctrl+C stops both processes",
    "",
  ].join("\n"),
);

for (const child of children) {
  child.once("error", (error) => {
    process.stderr.write(`[600b] child process failed: ${error.message}\n`);
    shutdown(1);
  });
  child.once("exit", (code, signal) => {
    if (closing) return;
    process.stderr.write(
      `[600b] playtest process exited unexpectedly (${signal ?? `code ${code ?? 1}`})\n`,
    );
    shutdown(code && code > 0 ? code : 1);
  });
}

process.once("SIGINT", () => shutdown(0));
process.once("SIGTERM", () => shutdown(0));

function runPnpm(args, extraEnv) {
  const cliIsScript = packageManager.endsWith(".js") || packageManager.endsWith(".cjs");
  const command = cliIsScript ? process.execPath : packageManager;
  const commandArgs = cliIsScript ? [packageManager, ...args] : args;
  return spawn(command, commandArgs, {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });
}

function shutdown(code) {
  if (closing) return;
  closing = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  }
  const force = setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
  }, 5_000);
  force.unref();
}

function fail(message) {
  process.stderr.write(`[600b] ${message}\n`);
  process.exit(1);
}
