"""Loopback-only HTTP sidecar for bounded Kerni template selection."""

from __future__ import annotations

import argparse
import json
import logging
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import cast

from world_agent.kerni import (
    DeterministicSelector,
    HermesSelector,
    KerniTemplateRequest,
    ProtocolError,
    TemplateSelector,
    resolve_template,
)

HOST = "127.0.0.1"
DEFAULT_PORT = 8791
MAX_BODY_BYTES = 2048
logger = logging.getLogger(__name__)


class KerniHTTPServer(ThreadingHTTPServer):
    """HTTP server carrying an immutable selector dependency."""

    def __init__(self, port: int, selector: TemplateSelector) -> None:
        self.selector = selector
        super().__init__((HOST, port), KerniRequestHandler)


class KerniRequestHandler(BaseHTTPRequestHandler):
    """No CORS, no remote bind, no generic proxying, exact endpoint only."""

    server_version = "KerniSidecar/1"
    sys_version = ""

    def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
        if self.path != "/health":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return
        self._send_json(
            HTTPStatus.OK,
            {"authority": "suggestion_only", "backend": "ready", "status": "ok"},
        )

    def do_POST(self) -> None:  # noqa: N802 - stdlib handler API
        if self.path != "/v1/kerni/template":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return
        raw_length = self.headers.get("Content-Length", "")
        if not raw_length.isdigit() or not 0 < int(raw_length) <= MAX_BODY_BYTES:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid_body_length"})
            return
        if self.headers.get_content_type() != "application/json":
            self._send_json(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, {"error": "json_required"})
            return
        try:
            raw = self.rfile.read(int(raw_length))
            decoded = json.loads(raw)
            if type(decoded) is not dict:
                raise ProtocolError("request body must be an object")
            request = KerniTemplateRequest.from_mapping(decoded)
        except (UnicodeDecodeError, json.JSONDecodeError, ProtocolError):
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid_capability"})
            return
        server = cast(KerniHTTPServer, self.server)
        response = resolve_template(request, server.selector)
        self._send_json(HTTPStatus.OK, response.to_mapping())

    def _send_json(self, status: HTTPStatus, body: dict[str, object]) -> None:
        payload = json.dumps(body, separators=(",", ":"), sort_keys=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format: str, *args: object) -> None:
        logger.info("%s - %s", self.client_address[0], format % args)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Loopback-only Kerni template sidecar")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument(
        "--backend",
        choices=("mock", "hermes"),
        default="mock",
        help="mock is free/deterministic; hermes invokes a zero-tool one-shot per request",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if not 1024 <= args.port <= 65535:
        raise SystemExit("port must be between 1024 and 65535")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    selector: TemplateSelector = (
        HermesSelector() if args.backend == "hermes" else DeterministicSelector()
    )
    server = KerniHTTPServer(args.port, selector)
    logger.info("Kerni sidecar listening on http://%s:%d backend=%s", HOST, args.port, args.backend)
    try:
        server.serve_forever(poll_interval=0.2)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
