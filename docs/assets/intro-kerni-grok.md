# Kerni intro video provenance

## Runtime status

Felix approved the decoded motion as an intro asset after visual review. The clip is a five-second, silent identity beat: Kerni moves as a natural raccoon, dissolves into restrained copper particles, and resolves into Kerni's artificial lantern body above Locktard Street.

The three runtime story cards remain authoritative. The generated video supports the reveal but never replaces its fallback copy.

## Generation lineage

1. OpenAI `gpt-image-2-medium` via Codex web authentication generated the start keyframe.
2. The same model edited it into a same-camera end keyframe using the native Godot Kerni capture as identity reference.
3. xAI `grok-imagine-video` via Grok OAuth received both keyframes as ordered reference images and generated one five-second 16:9/720p result.
4. The provider result was fully downloaded and decoded. Its unexpected AAC and MJPEG cover streams were removed; only the H.264 video stream became the web runtime asset.
5. The approved H.264 was deterministically transcoded to Theora without audio for Godot.

xAI request ID: `11c1e385-ab15-9d44-be7b-245df5bf39d8`.

Reference-to-video guides rather than hard-binds endpoints. The generated final Kerni is larger and more central than the OpenAI end keyframe; Felix approved the actual rendered motion, not an assertion of pixel-identical endpoints.

## Integrity

| Artifact | SHA-256 |
|---|---|
| OpenAI start keyframe | `efb16185f1b2b44dedf01ad61036e27a078a723edc286335213a75fe1e88ded1` |
| OpenAI end keyframe | `62b9a0e2e9377cf41ae5601050011c97baced92fba4a0d52e3278c2244278585` |
| Approved web MP4 | `29fc98a67c2482de85af527d8637c5c46f22052959d926745e8c3bf50c2b2b75` |
| Godot Theora OGV | `25203423cad0cf3ea9863c789b18d8a007bbd9cb3d17b2fc345bbdd74110083e` |

## Runtime files

- Web: `apps/web/public/intro.mp4` — H.264, 1280×720, 24 fps, 5.041667 s, no audio.
- Godot: `godot/assets/intro.ogv` — Theora, 1280×720, 5.041667 s, no audio.

Godot conversion:

```bash
ffmpeg -i intro.mp4 -map 0:v:0 -c:v libtheora -q:v 7 -pix_fmt yuv420p -an -map_metadata -1 intro.ogv
```

No downloaded third-party game asset is embedded in the clip. Generated-media use remains subject to the applicable OpenAI and xAI service terms.