import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Tier 0 — the browser client. Data-driven r3f scene (InstancedMesh + LOD) goes in src/scene.
// `/api` proxies to the Tier-2 server (apps/server) so the browser calls it same-origin (no CORS).
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Split the heavyweights so the first paint doesn't wait on one 5 MB chunk.
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei", "@react-three/rapier"],
          react: ["react", "react-dom"],
          nostr: ["@nostr-dev-kit/ndk", "nostr-tools"],
        },
      },
    },
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
});
