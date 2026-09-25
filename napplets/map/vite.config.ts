import { nip5aManifest } from "@napplet/vite-plugin";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { nappletMeta } from "../../tooling/napplet/vite-napplet-meta.js";

const napplet = {
  nappletType: "palace-map",
  // Every domain the code calls, all of them optional: the map renders with no
  // NAP domains at all. `resource` loads the ship's meme gallery, `link` opens
  // the Madeira intro, and `theme` follows the shell's palette.
  requires: ["link", "resource", "theme"],
};

export default defineConfig({
  build: {
    // The modulepreload polyfill calls `fetch` — forbidden browser authority in
    // the sandbox even when unreachable, and there is nothing to preload.
    modulePreload: false,
    // The world outlines are ~108 KB of inlined data; keep the whole artifact
    // in one file regardless.
    assetsInlineLimit: 1024 * 1024,
  },
  plugins: [
    viteSingleFile(),
    nappletMeta(napplet),
    nip5aManifest({
      ...napplet,
      title: "We're not a cult. We're culture.",
      description: "One marker on Madeira. The Palace of Culture.",
      artifactMode: "single-file",
    }),
  ],
});
