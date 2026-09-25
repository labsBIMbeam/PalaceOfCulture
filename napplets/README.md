# Napplets

Each folder builds one self-contained `dist/index.html` (NIP-5D, single file) with
`@napplet/vite-plugin` and `vite-plugin-singlefile`, on top of `packages/napplet-kit`.

| Napplet | d-tag | `napplet-requires` |
|---|---|---|
| `map` | `palace-map` | `link,resource,theme` |
| `feed` | `palace-feed` | `common,link,outbox,resource,theme` |
| `zap` | `palace-zap` | `link,theme` |

The requires list names every NAP domain the code calls, optional ones included. It is
declared once per napplet in `vite.config.ts`: the same object goes to `nip5aManifest()`
(the `requires` tags of the kind 35129 manifest) and to `nappletMeta()` from
`tooling/napplet/vite-napplet-meta.ts` (the `napplet-type` and `napplet-requires` metas in
the built file).

## Host channels outside the meta

Only NAP domains go into `napplet-requires`. A napplet that also talks to a host-specific
channel documents it here instead:

- **zap** calls `window.napplet.zap`, a channel of the Palace host, not a NAP domain:
  `probe()` returns the roster handle, the Lightning address and whether NIP-07, WebLN and
  payments are available; `send({ comment })` has the host sign the NIP-57 zap request,
  fetch the invoice and pay it, or return the invoice for a QR and `lightning:` hand-off.
  Without the channel the napplet renders a notice and does nothing else.

## Commands

```sh
pnpm --filter "./napplets/*" build
pnpm --filter @600b/napplet-map test:conformance
```
