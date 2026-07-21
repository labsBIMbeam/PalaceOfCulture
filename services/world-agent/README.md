# world-agent (Tier 3 · Python)

The autonomous **suggestion-only** culture and atmosphere service. The broader Bitcoin/Nostr signal
engine is still scaffolded, but the bounded Kerni template selector is implemented and tested.

It never writes truth or game state. The app owns every spoken line and world-changing decision.

## Kerni sidecar

The sidecar binds only to `127.0.0.1:8791`. A request contains exactly:

```json
{
  "request_id": "kerni-12345-1",
  "phase": 4,
  "allowed_templates": ["respect_empty_chair", "ghost_friend_detector"]
}
```

The selector may return only one offered ID. Arbitrary prose, extra fields, wrong phase lists and
invalid model output fail closed to a canonical template. No player text, identity, world object,
file path or mutation capability enters the service.

```bash
# Free deterministic development mode
uv run kerni-sidecar --backend mock

# Optional configured model call per E press — may incur provider cost
uv run kerni-sidecar --backend hermes
```

Hermes mode uses:

```text
--safe-mode
-t __kerni_zero_tools__
-z <phase-and-template-only prompt>
```

The empty toolset was verified against Hermes' local tool resolver. Safe mode excludes project
rules, SOUL, memory, skills, plugins and MCP servers. The service is never auto-started by Godot.
Enable the game client explicitly with `--kerni-live`.

## Development

```bash
uv sync
uv run pytest -q
uv run ruff check .
uv run ruff format --check .
```

Python ≥ 3.12, stdlib HTTP server, type hints on all signatures, `logging` not `print()`, 100-column
limit.
