#!/usr/bin/env python3
"""Upscale a generated 16:9 clip locally with Real-ESRGAN and verify the result.

Default production path:
- decode every video frame to PNG
- Real-ESRGAN animevideov3 at 2x on Vulkan
- downsample to 1920x1080 with Lanczos
- H.264 CRF 18, no audio
- full decode verification and JSON report

This intentionally avoids interpolation and extra sharpening. Temporal consistency is reviewed
separately before a clip becomes canonical.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import tempfile
import time
from fractions import Fraction
from pathlib import Path
from typing import Any

DEFAULT_REALESRGAN = Path(
    "/home/flx/.local/opt/realesrgan-ncnn-vulkan-20220424/realesrgan-ncnn-vulkan"
)


def run(command: list[str], *, capture: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )


def probe(path: Path) -> dict[str, Any]:
    result = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=codec_name,width,height,r_frame_rate,avg_frame_rate",
            "-show_entries",
            "format=duration,size",
            "-of",
            "json",
            str(path),
        ],
        capture=True,
    )
    payload = json.loads(result.stdout)
    stream = payload["streams"][0]
    rate_text = stream.get("avg_frame_rate") or stream["r_frame_rate"]
    rate = Fraction(rate_text)
    if rate <= 0:
        raise ValueError(f"invalid frame rate: {rate_text}")
    return {
        "codec": stream["codec_name"],
        "width": int(stream["width"]),
        "height": int(stream["height"]),
        "fps_fraction": rate_text,
        "fps": float(rate),
        "duration": float(payload["format"]["duration"]),
        "size": int(payload["format"]["size"]),
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def temporary_video_path(output: Path) -> Path:
    return output.resolve().with_suffix(output.suffix + ".tmp.mp4")


def temporary_report_path(report: Path) -> Path:
    return report.resolve().with_suffix(report.suffix + ".tmp")


def validate_artifact_paths(
    source: Path, output: Path, report: Path
) -> tuple[Path, Path, Path]:
    resolved = (source.resolve(), output.resolve(), report.resolve())
    source_path, output_path, report_path = resolved
    temporary_paths = (
        temporary_video_path(output_path),
        temporary_report_path(report_path),
    )
    if len(set((*resolved, *temporary_paths))) != 5:
        raise ValueError(
            "input, output, report, and their derived temporary paths must be distinct"
        )
    if output_path.suffix.lower() != ".mp4":
        raise ValueError("output must use the .mp4 extension")
    if report_path.suffix.lower() != ".json":
        raise ValueError("report must use the .json extension")
    return source_path, output_path, report_path


def _move_existing_to_backup(path: Path) -> Path | None:
    if not path.exists():
        return None
    descriptor, backup_text = tempfile.mkstemp(
        prefix=f".{path.name}.backup-", dir=path.parent
    )
    os.close(descriptor)
    backup = Path(backup_text)
    backup.unlink()
    path.replace(backup)
    return backup


def publish_artifacts(
    temporary_output: Path, temporary_report: Path, output: Path, report: Path
) -> None:
    backups: dict[Path, Path] = {}
    published: list[Path] = []
    try:
        for target in (output, report):
            backup = _move_existing_to_backup(target)
            if backup is not None:
                backups[target] = backup
        temporary_output.replace(output)
        published.append(output)
        temporary_report.replace(report)
        published.append(report)
    except Exception:
        for target in published:
            target.unlink(missing_ok=True)
        for target, backup in backups.items():
            if backup.exists():
                backup.replace(target)
        raise
    else:
        for backup in backups.values():
            backup.unlink(missing_ok=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--target", default="1920x1080", help="Final WIDTHxHEIGHT")
    parser.add_argument("--model", default="realesr-animevideov3")
    parser.add_argument("--scale", type=int, choices=(2, 3, 4), default=2)
    parser.add_argument("--tile", type=int, default=256)
    parser.add_argument("--gpu", type=int, default=0)
    parser.add_argument("--crf", type=int, default=18)
    parser.add_argument("--preset", default="slow")
    parser.add_argument("--audio", choices=("strip", "preserve"), default="strip")
    parser.add_argument("--realesrgan", type=Path, default=DEFAULT_REALESRGAN)
    parser.add_argument("--report", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    requested_report = args.report or args.output.with_suffix(".upscale.json")
    source, output, report = validate_artifact_paths(args.input, args.output, requested_report)
    binary = args.realesrgan.resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    if not binary.is_file():
        raise FileNotFoundError(binary)
    try:
        width_text, height_text = args.target.lower().split("x", 1)
        target_width, target_height = int(width_text), int(height_text)
    except ValueError as exc:
        raise ValueError("--target must be WIDTHxHEIGHT") from exc
    if target_width <= 0 or target_height <= 0:
        raise ValueError("target dimensions must be positive")

    source_info = probe(source)
    source_ratio = source_info["width"] / source_info["height"]
    target_ratio = target_width / target_height
    if abs(source_ratio - target_ratio) > 0.01:
        raise ValueError(
            f"aspect ratio mismatch: source {source_info['width']}x{source_info['height']} "
            f"vs target {target_width}x{target_height}"
        )

    output.parent.mkdir(parents=True, exist_ok=True)
    report.parent.mkdir(parents=True, exist_ok=True)
    temporary_output = temporary_video_path(output)
    temp_report = temporary_report_path(report)
    temporary_output.unlink(missing_ok=True)
    temp_report.unlink(missing_ok=True)
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="moc-upscale-") as work_text:
        work = Path(work_text)
        decoded = work / "decoded"
        upscaled = work / "upscaled"
        decoded.mkdir()
        upscaled.mkdir()

        run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(source),
                "-map",
                "0:v:0",
                "-vsync",
                "0",
                str(decoded / "%08d.png"),
            ]
        )
        decoded_count = len(list(decoded.glob("*.png")))
        if decoded_count == 0:
            raise RuntimeError("ffmpeg decoded zero frames")

        run(
            [
                str(binary),
                "-i",
                str(decoded),
                "-o",
                str(upscaled),
                "-n",
                args.model,
                "-s",
                str(args.scale),
                "-t",
                str(args.tile),
                "-g",
                str(args.gpu),
                "-j",
                "2:2:2",
                "-f",
                "png",
            ]
        )
        upscaled_count = len(list(upscaled.glob("*.png")))
        if upscaled_count != decoded_count:
            raise RuntimeError(
                f"frame count mismatch: decoded {decoded_count}, upscaled {upscaled_count}"
            )

        encode = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-framerate",
            source_info["fps_fraction"],
            "-i",
            str(upscaled / "%08d.png"),
        ]
        if args.audio == "preserve":
            encode += ["-i", str(source)]
        encode += [
            "-map",
            "0:v:0",
        ]
        if args.audio == "preserve":
            encode += ["-map", "1:a?", "-c:a", "aac", "-b:a", "192k", "-shortest"]
        else:
            encode += ["-an"]
        encode += [
            "-vf",
            f"scale={target_width}:{target_height}:flags=lanczos,format=yuv420p",
            "-c:v",
            "libx264",
            "-preset",
            args.preset,
            "-crf",
            str(args.crf),
            "-movflags",
            "+faststart",
            str(temporary_output),
        ]
        run(encode)
        run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-i",
                str(temporary_output),
                "-f",
                "null",
                "-",
            ]
        )
        output_info = probe(temporary_output)
        if (output_info["width"], output_info["height"]) != (target_width, target_height):
            raise RuntimeError(f"unexpected output dimensions: {output_info}")
        duration_delta = abs(output_info["duration"] - source_info["duration"])
        if duration_delta > max(0.1, 1.5 / source_info["fps"]):
            raise RuntimeError(f"duration drift too large: {duration_delta:.3f}s")

    payload = {
        "source": str(source),
        "output": str(output),
        "source_info": source_info,
        "output_info": output_info,
        "frame_count": decoded_count,
        "model": args.model,
        "scale": args.scale,
        "target": [target_width, target_height],
        "audio": args.audio,
        "elapsed_seconds": round(time.monotonic() - started, 3),
        "sha256": sha256(temporary_output),
        "status": "technical_pass_temporal_visual_qa_required",
    }
    temp_report.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    publish_artifacts(temporary_output, temp_report, output, report)
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
