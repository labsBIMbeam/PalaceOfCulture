/**
 * Image imports resolve to a URL string. Because `assetsInlineLimit` is raised
 * in vite.config.ts, that URL is a `data:` URI in the build — the asset ends up
 * inside the single artifact, which is the only way a napplet can carry it.
 */
declare module "*.webp" {
  const url: string;
  export default url;
}

declare module "*.svg" {
  const url: string;
  export default url;
}
