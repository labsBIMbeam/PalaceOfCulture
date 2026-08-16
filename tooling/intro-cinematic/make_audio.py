"""Synthesize the full 21 s intro soundtrack — deterministic, pure sines, no samples.

House style follows TCG600nap/art/video-intro/*/make_bed.py: stdlib only, seeded,
nothing below ~65 Hz. Cue table: docs/design/intro-cinematic.md ("Sound").
Writes tooling/intro-cinematic/_work/intro-audio.wav (48 kHz stereo 16-bit).
"""

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

SR = 48000
DUR = 21.0
N = int(SR * DUR)
OUT = Path(__file__).with_name("_work") / "intro-audio.wav"

RNG = random.Random(21)

# C minor voicing, mid-bass and up (no sub)
C2, G2, C3, EB3, G3, C4 = 65.41, 98.00, 130.81, 155.56, 196.00, 261.63
PENTA = [
    523.25,
    622.25,
    698.46,
    783.99,
    932.33,
    1046.50,
    1244.51,
]  # C5 Eb5 F5 G5 Bb5 C6 Eb6

LEFT = [0.0] * N
RIGHT = [0.0] * N


def add(
    t0: float,
    dur: float,
    freq,
    env,
    amp: float,
    pan: float = 0.0,
    harmonics: tuple[tuple[float, float], ...] = ((1.0, 1.0),),
) -> None:
    """Additive helper. freq/env are callables of local time u in [0, dur]."""
    i0 = max(0, int(t0 * SR))
    i1 = min(N, int((t0 + dur) * SR))
    gain_l = math.sqrt(0.5 * (1.0 - pan))
    gain_r = math.sqrt(0.5 * (1.0 + pan))
    phase = [0.0] * len(harmonics)
    for i in range(i0, i1):
        u = i / SR - t0
        f = freq(u)
        s = 0.0
        for h, (mult, weight) in enumerate(harmonics):
            phase[h] += 2 * math.pi * f * mult / SR
            s += weight * math.sin(phase[h])
        v = amp * env(u) * s
        LEFT[i] += v * gain_l
        RIGHT[i] += v * gain_r


def gauss_env(dur: float, attack: float):
    def env(u: float) -> float:
        a = min(1.0, u / attack) if attack > 0 else 1.0
        d = max(0.0, 1.0 - u / dur)
        return a * d * d

    return env


def exp_env(tau: float, attack: float = 0.002):
    def env(u: float) -> float:
        a = min(1.0, u / attack) if attack > 0 else 1.0
        return a * math.exp(-u / tau)

    return env


def const(x: float):
    return lambda _u: x


# ---------------------------------------------------------------- cues


def tick(t0: float, amp: float = 0.34) -> None:
    """Block-clock tick: dry, woody, no noise — a fast high blip over a tiny low knock."""
    add(t0, 0.045, const(1900.0), exp_env(0.010), amp, 0.0, ((1.0, 1.0), (2.0, 0.25)))
    add(t0 + 0.004, 0.09, const(238.0), exp_env(0.028, 0.004), amp * 0.55)


def heartbeat(t0: float) -> None:
    add(t0, 0.42, const(70.0), gauss_env(0.42, 0.07), 0.20)
    add(t0 + 0.18, 0.30, const(70.0), gauss_env(0.30, 0.06), 0.12)


def bed() -> None:
    """The pad: enters at 3.0 s, breathes, swells into the reformation, resolves warm."""
    start, end = 3.0, 20.9

    def level(t: float) -> float:
        if t < start or t > end:
            return 0.0
        fade_in = min(1.0, (t - start) / 2.2)
        fade_out = min(1.0, (end - t) / 1.6)
        if t < 12.5:
            swell = 0.30 + 0.05 * (t - start) / 9.5
        elif t < 16.5:
            swell = 0.35 + 0.08 * (t - 12.5) / 4.0
        else:
            swell = 0.43 + 0.05 * (t - 16.5) / 4.5
        return fade_in * fade_out * swell

    voices = [
        (C2, 0.30, 0.0, 0.0),
        (G2, 0.22, 0.3, 0.0),
        (C3, 0.15, 0.7, 0.0),
        (EB3, 0.085, 1.1, 0.0),  # breathing minor colour
        (G3, 0.07, 0.5, 16.0),  # joins for the cascade
        (C4, 0.06, 1.4, 18.9),  # the warm resolve on the title
    ]
    two_pi = 2 * math.pi
    for i in range(int(start * SR), min(N, int(end * SR))):
        t = i / SR
        g = level(t)
        if g <= 0.0:
            continue
        breath = 0.5 + 0.5 * math.sin(two_pi * 0.045 * t)
        s = 0.0
        for freq, weight, ph, t_on in voices:
            if t < t_on:
                continue
            w = weight * (min(1.0, (t - t_on) / 2.5) if t_on > 0 else 1.0)
            if freq == EB3:
                w *= 0.55 + 0.45 * breath
            s += w * math.sin(two_pi * freq * t + ph)
        LEFT[i] += g * s
        RIGHT[i] += g * (s * 0.97 + 0.03 * math.sin(two_pi * C3 * t + 1.9))


def chirp(t0: float, synthetic: bool) -> None:
    """Kerni's two-note motif — warbly as a raccoon, quantized as a lantern."""
    notes = [(783.99, 0.13), (1046.50, 0.17)]
    gap = 0.05
    t = t0
    for base, dur in notes:
        if synthetic:
            freq = const(base)
            harm = ((1.0, 1.0), (2.0, 0.30))
            amp = 0.15
        else:

            def freq(u: float, base=base, dur=dur) -> float:
                scoop = 0.955 + 0.045 * min(1.0, u / 0.04)
                vib = 1.0 + 0.028 * math.sin(2 * math.pi * 6.2 * u)
                return base * scoop * vib

            harm = ((1.0, 1.0), (2.0, 0.18))
            amp = 0.14
        add(
            t, dur, freq, gauss_env(dur, 0.015), amp, 0.06 if synthetic else -0.04, harm
        )
        t += dur + gap


def shimmer() -> None:
    """Sparse high grains that follow the dissolve, then densify and rise as they converge."""
    t = 7.5
    while t < 14.5:
        if t < 9.0:
            density = 2.0 + 6.0 * (t - 7.5) / 1.5
        elif t < 12.5:
            density = 8.0 + 2.0 * (t - 9.0) / 3.5
        else:
            density = 12.0
        t += RNG.expovariate(density)
        if t >= 14.5:
            break
        if t < 12.5:
            f = RNG.uniform(4200.0, 7000.0)
        else:  # convergence: the band rises with the orbit
            lift = (t - 12.5) / 2.0
            f = RNG.uniform(4200.0 + 1400.0 * lift, 7000.0 + 1800.0 * lift)
        dur = RNG.uniform(0.06, 0.14)
        add(
            t,
            dur,
            const(f),
            gauss_env(dur, 0.018),
            RNG.uniform(0.045, 0.085),
            RNG.uniform(-0.7, 0.7),
        )


def whum_and_ping() -> None:
    def sweep(u: float) -> float:
        return 98.0 - 33.0 * min(1.0, u / 1.0)

    add(14.55, 1.5, sweep, gauss_env(1.5, 0.30), 0.30)
    add(
        14.95,
        0.55,
        const(880.0),
        exp_env(0.16, 0.003),
        0.15,
        0.05,
        ((1.0, 1.0), (2.0, 0.4)),
    )


def zap_sparks() -> None:
    """Seven lamp ignitions, one every 0.3 s, panned with the lamp sides (R first)."""
    for i, f in enumerate(PENTA):
        t0 = 16.8 + 0.3 * i
        pan = 0.45 if i % 2 == 0 else -0.45
        add(
            t0,
            0.34,
            const(f),
            exp_env(0.11, 0.002),
            0.16,
            pan,
            ((1.0, 1.0), (2.0, 0.35), (3.0, 0.12)),
        )
        add(t0, 0.02, const(f * 4.0), exp_env(0.006), 0.05, pan)  # the tiny strike


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tick(0.70)
    heartbeat(1.50)
    heartbeat(2.30)
    bed()
    chirp(5.50, synthetic=False)
    shimmer()
    whum_and_ping()
    chirp(15.30, synthetic=True)
    zap_sparks()
    tick(20.50, amp=0.30)

    peak = max(1e-9, max(max(abs(v) for v in LEFT), max(abs(v) for v in RIGHT)))
    norm = min(2.2, 0.86 / peak)  # normalize to the sibling mixes' 0.86 ceiling
    with wave.open(str(OUT), "w") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        buf = bytearray()
        for lv, rv in zip(LEFT, RIGHT):
            buf += struct.pack("<hh", int(lv * norm * 32000), int(rv * norm * 32000))
        w.writeframes(buf)
    print(f"wrote {OUT} ({DUR:.1f}s, peak {peak:.3f}, norm {norm:.3f})")


if __name__ == "__main__":
    main()
