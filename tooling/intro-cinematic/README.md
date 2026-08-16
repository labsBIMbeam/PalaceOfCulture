# Intro cinematic production

Storyboard and canon: [`docs/design/intro-cinematic.md`](../../docs/design/intro-cinematic.md).
Everything here is deterministic — same inputs, same 21 s film. No third-party samples,
no hand-kept .blend; the repo GLBs (`apps/web/public/…`) are the only art inputs.

## Reproduce

```bash
# 1. 504 PNG frames (EEVEE 1920x1080 @ 24 fps) → _work/frames/
INTRO_RENDER=1 blender -b --factory-startup --python build_scene.py

# 2. soundtrack (pure-sine synthesis, seeded) → _work/intro-audio.wav
python make_audio.py

# 3. mux H.264 + AAC, < 10 MB → _work/intro.mp4
python mux.py            # optionally: python mux.py 23  (higher crf if over budget)

# 4. ship it
cp _work/intro.mp4 ../../apps/web/public/intro.mp4
```

`build_scene.py` also runs inside an open Blender (it wipes and rebuilds the scene):

```python
exec(compile(open(r"G:\Github\PalaceOfCulture\tooling\intro-cinematic\build_scene.py",
                  encoding="utf-8").read(), "build_scene.py", "exec"))
```

The Godot intro (`godot/assets/intro.ogv`) intentionally keeps the earlier approved clip —
story-card parity stays locked; only the web asset is produced here.
