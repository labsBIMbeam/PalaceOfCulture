"""Mux the rendered frames + synthesized audio into the web intro.mp4.

Usage:  python mux.py [crf]        (default crf 20; raise it if the file tops 10 MB)
Reads   _work/frames/0001..0504.png and _work/intro-audio.wav,
writes  _work/intro.mp4 (H.264 yuv420p faststart + AAC 48 kHz 192k) and prints probe stats.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
WORK = ROOT / "_work"
FRAMES = WORK / "frames"
AUDIO = WORK / "intro-audio.wav"
OUT = WORK / "intro.mp4"
SIZE_BUDGET = 10 * 1024 * 1024


def main() -> None:
    crf = sys.argv[1] if len(sys.argv) > 1 else "20"
    frames = sorted(FRAMES.glob("*.png"))
    if len(frames) != 504:
        raise SystemExit(f"expected 504 frames, found {len(frames)} in {FRAMES}")
    if not AUDIO.exists():
        raise SystemExit(f"missing {AUDIO} — run make_audio.py first")
    subprocess.check_call([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-framerate", "24", "-i", str(FRAMES / "%04d.png"),
        "-i", str(AUDIO),
        "-c:v", "libx264", "-preset", "slow", "-crf", crf, "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "192k",
        "-shortest", "-movflags", "+faststart", "-map_metadata", "-1",
        str(OUT),
    ])
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-print_format", "json",
        "-show_format", "-show_streams", str(OUT),
    ]))
    size = int(probe["format"]["size"])
    duration = float(probe["format"]["duration"])
    streams = {s["codec_type"]: s["codec_name"] for s in probe["streams"]}
    print(f"{OUT.name}: {size / 1e6:.2f} MB, {duration:.3f} s, {streams}")
    if size > SIZE_BUDGET:
        print(f"WARNING: over the 10 MB budget — retry with a higher crf, e.g. "
              f"python mux.py {int(crf) + 3}")


if __name__ == "__main__":
    main()
