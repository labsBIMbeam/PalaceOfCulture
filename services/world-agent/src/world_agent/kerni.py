"""Capability-bounded template selection for the embodied Kerni companion."""

from __future__ import annotations

import os
import re
import subprocess
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Protocol

AUTHORITY = "suggestion_only"
REQUEST_KEYS = frozenset({"request_id", "phase", "allowed_templates"})
RESPONSE_KEYS = frozenset({"authority", "phase", "request_id", "template_id"})
REQUEST_ID_RE = re.compile(r"^kerni-[0-9]+-[0-9]+$")
PHASE_TEMPLATES: dict[int, tuple[str, str]] = {
    0: ("welcome", "raccoon_reveal"),
    1: ("observe_calling", "no_correct_class"),
    2: ("suggest_small_start", "anti_masterpiece"),
    3: ("place_choice", "draft_not_destiny"),
    4: ("respect_empty_chair", "ghost_friend_detector"),
    5: ("point_next_rib", "copper_drama"),
    6: ("seek_chorus", "anti_hero_button"),
    7: ("honest_legacy", "chair_audit"),
}


class ProtocolError(ValueError):
    """The caller did not satisfy the exact local capability protocol."""


@dataclass(frozen=True, slots=True)
class KerniTemplateRequest:
    request_id: str
    phase: int
    allowed_templates: tuple[str, ...]

    @classmethod
    def from_mapping(cls, value: Mapping[str, object]) -> KerniTemplateRequest:
        if frozenset(value) != REQUEST_KEYS:
            raise ProtocolError("request keys must match the exact Kerni schema")
        request_id = value["request_id"]
        phase = value["phase"]
        templates = value["allowed_templates"]
        if type(request_id) is not str or not REQUEST_ID_RE.fullmatch(request_id):
            raise ProtocolError("invalid request capability")
        if type(phase) is not int or phase not in PHASE_TEMPLATES:
            raise ProtocolError("invalid phase")
        if type(templates) is not list or any(type(item) is not str for item in templates):
            raise ProtocolError("allowed_templates must be a string array")
        allowed = tuple(templates)
        if allowed != PHASE_TEMPLATES[phase]:
            raise ProtocolError("template capability does not match phase")
        return cls(request_id=request_id, phase=phase, allowed_templates=allowed)


@dataclass(frozen=True, slots=True)
class KerniTemplateResponse:
    request_id: str
    phase: int
    template_id: str
    authority: str = AUTHORITY

    def to_mapping(self) -> dict[str, object]:
        return {
            "authority": self.authority,
            "phase": self.phase,
            "request_id": self.request_id,
            "template_id": self.template_id,
        }


class TemplateSelector(Protocol):
    def select(self, request: KerniTemplateRequest) -> str:
        """Return one template ID from the request capability."""
        ...


class DeterministicSelector:
    """Free offline selector used by tests and local demos."""

    def select(self, request: KerniTemplateRequest) -> str:
        checksum = sum(request.request_id.encode("ascii"))
        return request.allowed_templates[checksum % len(request.allowed_templates)]


class HermesSelector:
    """Zero-tool, no-memory Hermes one-shot selector.

    Hermes sees only a phase number and canonical IDs. It never receives player text, world
    objects, credentials, file paths, or a mutation capability. Invalid output is handled by the
    application-owned deterministic fallback in ``resolve_template``.
    """

    def __init__(self, *, timeout_seconds: float = 20.0) -> None:
        self.timeout_seconds = timeout_seconds

    def select(self, request: KerniTemplateRequest) -> str:
        choices = ", ".join(request.allowed_templates)
        prompt = (
            "You are Kerni's bounded comedy selector, not a game authority. "
            "Return exactly one template ID and nothing else. "
            f"Workshop phase={request.phase}. Allowed IDs: {choices}. "
            "Prefer the dry-funny option when it fits."
        )
        command = [
            "hermes",
            "--safe-mode",
            "-t",
            "__kerni_zero_tools__",
            "-z",
            prompt,
        ]
        env = {
            key: value
            for key, value in os.environ.items()
            if key in {"HOME", "LANG", "LC_ALL", "PATH", "XDG_CONFIG_HOME", "XDG_DATA_HOME"}
        }
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            cwd="/",
            env=env,
            text=True,
            timeout=self.timeout_seconds,
        )
        if completed.returncode != 0:
            return ""
        return completed.stdout.strip()


def resolve_template(
    request: KerniTemplateRequest,
    selector: TemplateSelector,
) -> KerniTemplateResponse:
    """Select within the capability or fail closed to its first canonical template."""
    try:
        selected = selector.select(request)
    except (OSError, subprocess.SubprocessError):
        selected = ""
    if selected not in request.allowed_templates:
        selected = request.allowed_templates[0]
    return KerniTemplateResponse(
        request_id=request.request_id,
        phase=request.phase,
        template_id=selected,
    )
