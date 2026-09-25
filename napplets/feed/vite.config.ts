import { nip5aManifest } from "@napplet/vite-plugin";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { nappletMeta } from "../../tooling/napplet/vite-napplet-meta.js";

const napplet = {
  nappletType: "palace-feed",
  // Every domain the code calls. `outbox` is the only hard requirement; `common`
  // (author names), `resource` (avatars), `link` and `theme` are optional
  // enhancements with rendered fallbacks.
  requires: ["common", "link", "outbox", "resource", "theme"],
};

export default defineConfig({
  build: {
    // The modulepreload polyfill calls `fetch`, which is forbidden browser
    // authority inside the sandbox even when unreachable — and a single-file
    // napplet has no external chunks to preload.
    modulePreload: false,
  },
  plugins: [
    viteSingleFile(),
    nappletMeta(napplet),
    nip5aManifest({
      ...napplet,
      title: "Feed",
      description: "A scrolling list of Nostr notes. Opens authors by role, never inline.",
      artifactMode: "single-file",
    }),
  ],
});
