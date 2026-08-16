import { nip5aManifest } from "@napplet/vite-plugin";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  build: {
    // The modulepreload polyfill calls `fetch`, which is forbidden browser
    // authority inside the sandbox even when unreachable — and a single-file
    // napplet has no external chunks to preload.
    modulePreload: false,
  },
  plugins: [
    viteSingleFile(),
    nip5aManifest({
      nappletType: "palace-zap",
      title: "Zap",
      description: "Zap the character in front of you 21 sats — NIP-07 signs, your wallet pays.",
      // The zap domain is host-specific and probed at runtime; nothing is a boot-blocker.
      requires: [],
      artifactMode: "single-file",
    }),
  ],
});
