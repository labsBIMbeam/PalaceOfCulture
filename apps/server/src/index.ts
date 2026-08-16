import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { createPodcastServer, loadServerConfig } from "./app.js";
import { AuditStore } from "./db/auditStore.js";
import { AuditRaidLedger } from "./multiplayer/raidLedger.js";
import { MultiplayerServer, loadMultiplayerConfig } from "./multiplayer/server.js";

/** Start HTTP, SQLite, and volatile multiplayer as one process lifecycle. */
async function startServer(): Promise<void> {
  let auditStore: AuditStore | undefined;
  let httpServer: Server | undefined;
  let multiplayer: MultiplayerServer | undefined;
  let shutdownPromise: Promise<void> | undefined;

  try {
    const config = loadServerConfig();
    const multiplayerConfig = loadMultiplayerConfig();
    const runningAuditStore = new AuditStore({ databasePath: config.auditDbPath });
    auditStore = runningAuditStore;
    const runningHttpServer = createPodcastServer(config);
    httpServer = runningHttpServer;
    const runningMultiplayer = new MultiplayerServer(multiplayerConfig, {
      raidLedger: new AuditRaidLedger(runningAuditStore, multiplayerConfig.raidCompletionsSeed),
    });
    multiplayer = runningMultiplayer;

    await runningMultiplayer.listen();
    await listenHttp(runningHttpServer, config.port, config.host);

    const httpAddress = runningHttpServer.address() as AddressInfo;
    const multiplayerAddress = runningMultiplayer.address;
    process.stdout.write(
      `[600b] feed proxy listening on http://${formatHost(config.host)}:${httpAddress.port}\n`,
    );
    if (multiplayerAddress) {
      process.stdout.write(
        `[600b] multiplayer listening on ws://${formatHost(multiplayerConfig.host)}:${multiplayerAddress.port}\n`,
      );
    }

    const shutdown = (failed = false): Promise<void> => {
      if (shutdownPromise) return shutdownPromise;
      shutdownPromise = shutdownServices(
        runningHttpServer,
        runningMultiplayer,
        runningAuditStore,
        config.shutdownGraceMs,
        failed,
      );
      return shutdownPromise;
    };

    runningHttpServer.on("error", (error) => {
      process.stderr.write(`[600b] HTTP server failed: ${error.message}\n`);
      void shutdown(true);
    });
    runningMultiplayer.transport.server?.on("error", (error) => {
      process.stderr.write(`[600b] multiplayer server failed: ${error.message}\n`);
      void shutdown(true);
    });
    process.once("SIGINT", () => void shutdown());
    process.once("SIGTERM", () => void shutdown());
  } catch (error) {
    await Promise.allSettled([multiplayer?.shutdown(), closeHttpServer(httpServer)]);
    auditStore?.close();
    const message = error instanceof Error ? error.message : "Unknown startup error.";
    process.stderr.write(`[600b] server startup failed: ${message}\n`);
    process.exitCode = 1;
  }
}

async function shutdownServices(
  httpServer: Server,
  multiplayer: MultiplayerServer,
  auditStore: AuditStore,
  graceMs: number,
  failed: boolean,
): Promise<void> {
  const forceCloseTimer = setTimeout(() => {
    httpServer.closeAllConnections();
    multiplayer.transport.server?.closeAllConnections();
  }, graceMs);
  forceCloseTimer.unref();

  try {
    await Promise.allSettled([closeHttpServer(httpServer), multiplayer.shutdown()]);
  } finally {
    clearTimeout(forceCloseTimer);
    auditStore.close();
    process.exitCode = failed ? 1 : 0;
  }
}

function listenHttp(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

function closeHttpServer(server: Server | undefined): Promise<void> {
  if (!server?.listening) return Promise.resolve();
  return new Promise((resolve) => {
    server.close(() => resolve());
    server.closeIdleConnections();
  });
}

function formatHost(host: string): string {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

void startServer();
