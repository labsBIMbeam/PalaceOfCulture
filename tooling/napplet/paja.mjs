// Launch the Paja authoring workshop — a real Kehto runtime hosting the napplet
// in a real sandboxed iframe.
//
// Why this file exists: @kehto/cli@0.2.16 guards its entry with
// `entryPath.endsWith("/index.js")`. On Windows process.argv[1] uses
// backslashes, so the guard never matches, the CLI exits 0 and nothing starts.
// Calling runPajaCli directly bypasses the broken guard. Delete this once the
// upstream guard is path-separator aware.
import { runPajaCli } from "@kehto/paja/cli";

const io = {
  stdout: { write: (chunk) => process.stdout.write(chunk) },
  stderr: { write: (chunk) => process.stderr.write(chunk) },
};

const code = await runPajaCli(process.argv.slice(2), io);
if (code !== 0) process.exitCode = code;

// runPajaCli returns as soon as the runtime is serving; hold the process open so
// the workshop stays up until it is stopped.
await new Promise(() => {});
