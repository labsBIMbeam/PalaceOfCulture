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
      nappletType: "palace-feed",
      title: "Feed",
      description: "A scrolling list of Nostr notes. Opens authors by role, never inline.",
      // outbox is the only hard requirement; common/resource/link are optional
      // enhancements with rendered fallbacks.
      requires: ["outbox"],
      artifactMode: "single-file",
    }),
  ],
});
