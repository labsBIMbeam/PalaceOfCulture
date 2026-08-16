"""Generate the street-cast voice lines with edge-tts — free neural voices, no API key.

Same engine and voice casting as TCG600nap/art/video-intro/cinematic/story/make_voices.py:
the five established speakers keep their exact voices; everyone else draws deterministically
from a gender-matched pool (the parametric avatar gender is the in-game presentation).
Kerni gets the small bright familiar voice, pitched up.

Run:  python tooling/street-cast-vo/make_voices.py     (after export_lines.ts)
Writes apps/web/public/vo/cast/<file>.mp3 — idempotent, existing files are kept.
"""

from __future__ import annotations

import asyncio
import json
import random
from pathlib import Path

import edge_tts

HERE = Path(__file__).resolve().parent
LINES = HERE / "lines.json"
OUT = HERE.parent.parent / "apps" / "web" / "public" / "vo" / "cast"

# The established cast (TCG600nap intro VO) — never recast these.
ESTABLISHED: dict[str, tuple[str, str]] = {
    "michael1011": ("en-GB-RyanNeural", "-8%"),
    "rootzoll": ("en-US-GuyNeural", "-2%"),
    "sat": ("en-US-RogerNeural", "+4%"),
    "flx": ("en-US-ChristopherNeural", "+6%"),
    "blackcoffee": ("en-US-EricNeural", "-12%"),
}

# Only voices actually served by the Edge endpoint (validated against list_voices() at run time).
MASCULINE = [
    "en-US-SteffanNeural",
    "en-GB-ThomasNeural",
    "en-AU-WilliamNeural",
    "en-IE-ConnorNeural",
    "en-CA-LiamNeural",
    "en-US-AndrewMultilingualNeural",
    "en-US-BrianMultilingualNeural",
]
FEMININE = [
    "en-US-AriaNeural",
    "en-US-JennyNeural",
    "en-US-MichelleNeural",
    "en-GB-SoniaNeural",
    "en-GB-LibbyNeural",
    "en-GB-MaisieNeural",
    "en-AU-NatashaNeural",
    "en-CA-ClaraNeural",
    "en-IE-EmilyNeural",
    "en-US-AvaMultilingualNeural",
    "en-US-EmmaMultilingualNeural",
]
KERNI_VOICE = ("en-US-AnaNeural", "+8%", "+18Hz")  # small, bright, slightly synthetic
FALLBACK = {"masculine": "en-US-SteffanNeural", "feminine": "en-US-AriaNeural"}

RATES = ["-10%", "-6%", "-3%", "+0%", "+3%", "+6%"]


def fnv(value: str) -> int:
    """Stable string hash (same maths as the roster's trait picker)."""
    h = 2166136261
    for ch in value:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def cast_voice(speaker: str, gender: str, available: set[str]) -> tuple[str, str, str]:
    """(voice, rate, pitch) for a speaker — established first, then the gender pool."""
    key = speaker.lower()
    if gender == "familiar":
        return KERNI_VOICE
    if key in ESTABLISHED:
        voice, rate = ESTABLISHED[key]
        return (voice, rate, "+0Hz")
    pool = FEMININE if gender == "feminine" else MASCULINE
    h = fnv(key)
    voice = pool[h % len(pool)]
    if available and voice not in available:
        voice = FALLBACK["feminine" if gender == "feminine" else "masculine"]
    return (voice, RATES[(h >> 8) % len(RATES)], "+0Hz")


async def synth(file: str, text: str, voice: str, rate: str, pitch: str) -> None:
    path = OUT / f"{file}.mp3"
    if path.exists() and path.stat().st_size > 500:
        return
    last: Exception | None = None
    for attempt in range(4):
        try:
            comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
            await comm.save(str(path))
            return
        except Exception as err:  # noqa: BLE001 — endpoint hiccups; retried with backoff
            last = err
            await asyncio.sleep(0.8 * (attempt + 1))
    raise RuntimeError(f"tts failed for {file}") from last


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    try:
        available = {v["ShortName"] for v in await edge_tts.list_voices()}
    except Exception:  # noqa: BLE001 — offline catalog fetch; pools are the curated fallback
        available = set()
    lines = json.loads(LINES.read_text(encoding="utf-8"))
    random.Random(21).shuffle(
        lines
    )  # spread speakers across the run, politer to the endpoint
    for entry in lines:
        voice, rate, pitch = cast_voice(entry["speaker"], entry["gender"], available)
        await synth(entry["file"], entry["text"], voice, rate, pitch)
        size = (OUT / f"{entry['file']}.mp3").stat().st_size
        print(f"{entry['file']}: {voice} {rate} {pitch} ({size} bytes)")
        await asyncio.sleep(0.25)
    print(f"done: {len(lines)} lines in {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
