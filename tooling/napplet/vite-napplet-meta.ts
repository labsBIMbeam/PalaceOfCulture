/**
 * Writes a napplet's identity into its built index.html.
 *
 * `@napplet/vite-plugin` 0.14 puts `requires` only into the kind 35129 manifest and
 * no longer writes the `napplet-type` and `napplet-requires` metas. Shells that read
 * the artifact itself (the Nappelin Hangar's check:napplets and napplet board) look
 * for them there. This plugin writes both from the same object that configures
 * nip5aManifest(), so the manifest and the file agree without a hand edit.
 *
 * The one allowed difference: a Nappelin host channel (table, totem, leitstand) belongs
 * in the meta but not in the manifest tags, where other shells would read an unknown
 * requirement. Such a name goes into the list handed to this plugin only; see
 * napplets/README.md, "Where each kind of name goes".
 */

/** The identity half of a nip5aManifest() config. */
export interface NappletIdentity {
  /** The napplet's d-tag. */
  nappletType: string;
  /** Every domain the code asks the shell for, optional ones included. */
  requires: string[];
}

function meta(name: string, content: string) {
  return { tag: "meta", attrs: { name, content }, injectTo: "head" as const };
}

/** A Vite plugin that appends the napplet-type and napplet-requires metas to the head. */
export function nappletMeta(napplet: NappletIdentity) {
  return {
    name: "palace-napplet-meta",
    transformIndexHtml: () => [
      meta("napplet-type", napplet.nappletType),
      meta("napplet-requires", napplet.requires.join(",")),
    ],
  };
}
