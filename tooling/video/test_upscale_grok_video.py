import importlib.util
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("upscale_grok_video.py")
SPEC = importlib.util.spec_from_file_location("upscale_grok_video", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ArtifactPathTests(unittest.TestCase):
    def test_accepts_distinct_mp4_and_json_paths(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source.mp4"
            output = root / "out" / "episode.mp4"
            report = root / "reports" / "episode.json"
            resolved = MODULE.validate_artifact_paths(source, output, report)
            self.assertEqual(resolved, (source.resolve(), output.resolve(), report.resolve()))

    def test_rejects_report_overwriting_video(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "episode.mp4"
            with self.assertRaisesRegex(ValueError, "distinct"):
                MODULE.validate_artifact_paths(Path(temporary) / "source.mp4", output, output)

    def test_rejects_source_overwriting(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "episode.mp4"
            with self.assertRaisesRegex(ValueError, "distinct"):
                MODULE.validate_artifact_paths(source, source, source.with_suffix(".json"))

    def test_rejects_mislabeled_non_mp4_output(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            with self.assertRaisesRegex(ValueError, "mp4"):
                MODULE.validate_artifact_paths(
                    root / "source.mp4", root / "episode.webm", root / "episode.json"
                )

    def test_requires_json_report_extension(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            with self.assertRaisesRegex(ValueError, "json"):
                MODULE.validate_artifact_paths(
                    root / "source.mp4", root / "episode.mp4", root / "report.txt"
                )

    def test_rejects_input_aliasing_derived_video_temporary(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / "episode.mp4"
            source = MODULE.temporary_video_path(output)
            with self.assertRaisesRegex(ValueError, "temporary"):
                MODULE.validate_artifact_paths(source, output, root / "episode.json")

    def test_rejects_input_aliasing_derived_report_temporary(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            report = root / "episode.json"
            source = MODULE.temporary_report_path(report)
            with self.assertRaisesRegex(ValueError, "temporary"):
                MODULE.validate_artifact_paths(source, root / "episode.mp4", report)

    def test_publish_rolls_back_existing_artifacts_when_report_publish_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / "episode.mp4"
            report = root / "episode.json"
            temporary_output = MODULE.temporary_video_path(output)
            missing_temporary_report = MODULE.temporary_report_path(report)
            output.write_bytes(b"old-video")
            report.write_text("old-report", encoding="utf-8")
            temporary_output.write_bytes(b"new-video")
            with self.assertRaises(FileNotFoundError):
                MODULE.publish_artifacts(
                    temporary_output, missing_temporary_report, output, report
                )
            self.assertEqual(output.read_bytes(), b"old-video")
            self.assertEqual(report.read_text(encoding="utf-8"), "old-report")


if __name__ == "__main__":
    unittest.main()
