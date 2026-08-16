import { nip5aManifest } from "@napplet/vite-plugin";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

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
    nip5aManifest({
      nappletType: "palace-map",
      title: "We're not a cult. We're culture.",
      description: "One marker on Madeira. The Palace of Culture.",
      // Nothing is required: the map renders with no NAP domains at all, and
      // simply follows the shell's palette when NAP-THEME happens to be there.
      requires: [],
      artifactMode: "single-file",
    }),
  ],
});
