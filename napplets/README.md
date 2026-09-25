# Napplets

Each folder builds one self-contained `dist/index.html` (NIP-5D, single file) with
`@napplet/vite-plugin` and `vite-plugin-singlefile`, on top of `packages/napplet-kit`.

| Napplet | d-tag | `napplet-requires` |
|---|---|---|
| `map` | `palace-map` | `link,resource,theme` |
| `feed` | `palace-feed` | `common,link,outbox,resource,theme` |
| `zap` | `palace-zap` | `link,theme` |

A shell grants a napplet only the domains it declares, so the requires list names every
domain the napplet's code asks the shell for, optional ones included; the napplet degrades
when the shell refuses one (owner rule of 2026-09-25, `leitstand/inventory/CONSOLIDATION.md`,
"What requires means"). It is declared once per napplet in `vite.config.ts`: the same object
goes to `nip5aManifest()` (the `requires` tags of the kind 35129 manifest) and to
`nappletMeta()` from `tooling/napplet/vite-napplet-meta.ts` (the `napplet-type` and
`napplet-requires` metas in the built file).

Verify a list against the source, never against the previous list: every `has()` probe and
every kit call (`openLink` is `link`, `bytes` is `resource`, `query` and `subscribe` are
`outbox`, `profile` is `common`, `read` and `write` are `storage`), plus `theme`, which
`boot()` always asks for.

## Where each kind of name goes

| Kind of name | `napplet-requires` meta | manifest `requires` tags |
|---|---|---|
| Standard NAP domain (`outbox`, `resource`, `link`, `theme`, `common`, `storage`, ...) | yes | yes |
| Interim `x-nappelin-*` domain | yes | yes |
| Nappelin host channel (`table`, `totem`, `leitstand`) | yes | no: other shells would read an unknown requirement |
| Custom shell object (`window.napplet.zap`, `palace.*`, `guild`, `nutft`) | no | no: documented below instead |

No napplet here uses an interim domain or a Nappelin host channel yet, so the meta and the
manifest carry the same list. A napplet that starts to use a host channel adds it to the
list handed to `nappletMeta()` only and keeps it out of the object for `nip5aManifest()`.

## Custom shell objects

- **zap** calls `window.napplet.zap`, a channel of the Palace host, not a NAP domain:
  `probe()` returns the roster handle, the Lightning address and whether NIP-07, WebLN and
  payments are available; `send({ comment })` has the host sign the NIP-57 zap request,
  fetch the invoice and pay it, or return the invoice for a QR and `lightning:` hand-off.
  Without the channel the napplet renders a notice and does nothing else.

## Commands

```sh
pnpm build:napplets                               # the kit first, then map, feed and zap
pnpm --filter @600b/napplet-map test:conformance  # after build:napplets; rebuilds map, runs the CLI
```

`pnpm --filter "./napplets/*" build` on its own fails on a clean checkout: the napplets
import `@600b/napplet-kit` from its `dist/`, which only the kit's own build writes.
`build:napplets` filters with `{napplets/*}...`, so pnpm includes the kit and builds it
first.
