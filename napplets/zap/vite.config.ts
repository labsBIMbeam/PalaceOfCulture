import { nip5aManifest } from "@napplet/vite-plugin";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { nappletMeta } from "../../tooling/napplet/vite-napplet-meta.js";

const napplet = {
  nappletType: "palace-zap",
  // Every domain the code asks the shell for: `link` hands the invoice to a wallet
  // and `theme` follows the shell's palette. The `zap` channel it pays through is a
  // custom shell object (window.napplet.zap), which stays out of the meta and the
  // manifest; it is documented in napplets/README.md and probed at runtime. Nothing
  // is a boot-blocker.
  requires: ["link", "theme"],
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
      title: "Zap",
      description: "Zap the character in front of you 21 sats — NIP-07 signs, your wallet pays.",
      artifactMode: "single-file",
    }),
  ],
});
