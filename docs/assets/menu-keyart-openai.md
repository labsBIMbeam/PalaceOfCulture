# Menu keyart provenance

## Runtime set

Felix explicitly requested three separate new menu images. The set replaces the previous white-gold giant-palace imagery with one coherent Locktard Street world:

| Runtime role | Web asset | Shared use |
|---|---|---|
| Title | `apps/web/public/frontend/bg/title.webp` | Start, avatar selection, Godot main menu |
| Home | `apps/web/public/frontend/bg/home.webp` | Home, Culture, placed picture-frame default |
| Market | `apps/web/public/frontend/bg/market.webp` | Pleb Market, Workshop |

`map-pattern.png` and the procedural Politics background remain unchanged. The unreferenced `style.png` and superseded giant-palace PNGs were removed rather than shipped as dead assets.

## Generation lineage

All three source images were generated as single, bounded OpenAI `gpt-image-2-medium` renders through Codex web authentication. No variants, upscales, retries, downloaded third-party art, names, logos, or readable signs are embedded.

The approved Kerni intro start frame and native Godot Kerni capture guided visual continuity. The three final compositions are distinct:

- **Title:** elevated path into Locktard Street, natural raccoon at the lower edge, horizontal unfinished Leviathan and a calm central typography zone.
- **Home:** modest self-built workshop home, constructed framed windows, garden, makers and a small lantern-form Kerni.
- **Market:** open maker lane with independent stalls, useful objects, repair activity and an unobstructed central UI lane.

The runtime assets use lossy WebP at quality 88, retaining the generated `1672×941` dimensions.

## Integrity

| Artifact | SHA-256 |
|---|---|
| Title source PNG | `e4224882e6add196c8aac5a51307948eb825652a2db60d56330ab064adebc9ae` |
| Home source PNG | `c3b7e359a371eb885bec2a34128e07b421f72c9911d710c627e9965f9af42494` |
| Market source PNG | `c5a667be966115f2f0438840dc3b68bf0d8543df2492a66db6199f4c4997becc` |
| Title runtime WebP | `609de6de019933b305475f9e71fd692ed0fe847008acbd0d0df405e156e4c039` |
| Home runtime WebP | `1669d15b8f97371f67f487d2b5e4d3b0ff460bf0d1e54177017556b78124ebee` |
| Market runtime WebP | `2928f72967bd0546b1d7531db7f32aaf0622b18a1d71f8ed05c715458208afc7` |

Web runtime sizes are approximately 234 KB, 271 KB and 314 KB respectively. The Godot title copy is byte-identical to the web Title asset.

## Canon and QA

- No giant central palace, tower, cathedral, royal banner, weapon or military vehicle.
- Leviathan reads as unfinished communal infrastructure rather than authority architecture.
- Technology remains integrated with moss, gardens, mushrooms and handmade repair culture.
- Kerni/raccoon stays small and peripheral: guide, never authority.
- Details sit mainly along the edges; central zones remain usable under menu typography, cards and feeds.
- Generated-media use remains subject to the applicable OpenAI service terms.
