"""Tests for the access log middleware."""

import asyncio

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from loguru import logger

from fileglancer.log import AccessLogMiddleware
from fileglancer.settings import Settings


def _app_and_lines():
    """A minimal app behind AccessLogMiddleware, plus the lines it logs."""
    app = FastAPI()
    app.add_middleware(AccessLogMiddleware, settings=Settings())

    @app.get("/api/content/{rest:path}")
    async def content(rest: str):
        return {"ok": True}

    lines = []
    sink_id = logger.add(lambda msg: lines.append(msg), format="{message}")
    return app, lines, sink_id


def test_percent_encoding_is_logged_as_sent():
    """The logged path keeps the client's encoding instead of decoding it.

    A decoded path no longer round-trips to the request that was actually made,
    which matters when the difference is a literal '%' in a filename.
    """
    app, lines, sink_id = _app_and_lines()
    try:
        with TestClient(app) as client:
            client.get("/api/content/share/img_1%25_0.2%25.zarr")
    finally:
        logger.remove(sink_id)

    assert len(lines) == 1, lines
    assert "img_1%25_0.2%25.zarr" in lines[0], lines[0]


def test_control_characters_never_reach_the_log():
    """Control characters in a decoded path must not reach the log line.

    Driven through a hand-built ASGI scope rather than TestClient, because httpx
    normalizes control characters away and cannot express what a hostile client
    sends. Over the wire, '%1B' in the target becomes a real ESC in
    scope["path"]. Starlette's URL happens to drop CR/LF (urlsplit strips them)
    but ESC and '|' survive it, so the escaping here is doing real work: ESC can
    recolour a terminal tailing the log, and '|' is loguru's field separator.
    """
    app, lines, sink_id = _app_and_lines()
    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.3"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        # What the server hands us: path decoded, raw_path as sent.
        "path": "/api/content/x\n\x1b[2J2026-01-01 | INFO | FORGED",
        "raw_path": b"/api/content/x%0A%1B[2J2026-01-01%20|%20INFO%20|%20FORGED",
        "query_string": b"",
        "headers": [(b"host", b"testserver")],
        "client": ("10.0.0.1", 1234),
        "server": ("testserver", 80),
        "root_path": "",
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        pass

    try:
        asyncio.run(app(scope, receive, send))
    finally:
        logger.remove(sink_id)

    assert len(lines) == 1, lines
    logged = lines[0]
    # loguru's sink appends one trailing newline; the message must add none.
    assert logged.rstrip("\n").count("\n") == 0, repr(logged)
    assert "\x1b" not in logged, repr(logged)
    # The encoded form is what gets logged, so both stay inert.
    assert "%0A" in logged and "%1B" in logged, repr(logged)


def test_token_requests_log_the_username_and_token_id():
    """A token request must be traceable to a user and a specific token.

    Before this, the middleware resolved identity from the session cookie only,
    so every programmatic request logged '-' -- an admin investigating a
    misbehaving script had nothing to go on. The token id is the public half
    and is what the GUI shows, so it points at the exact token to revoke.
    """
    app = FastAPI()
    app.add_middleware(AccessLogMiddleware, settings=Settings())

    @app.get("/api/files/{name}")
    async def files(name: str, request: Request):
        # Stands in for auth.get_user_from_token, which sets these once a
        # bearer token resolves.
        request.state.fg_username = "alice"
        request.state.fg_token_id = "a1b2c3d4e5f6"
        return {"ok": True}

    lines = []
    sink_id = logger.add(lambda msg: lines.append(msg), format="{message}")
    try:
        with TestClient(app) as client:
            client.get("/api/files/share")
    finally:
        logger.remove(sink_id)

    assert len(lines) == 1, lines
    assert "[alice fgt:a1b2c3d4e5f6]" in lines[0], lines[0]
    assert "[-]" not in lines[0], lines[0]


def test_unauthenticated_requests_still_log_a_dash():
    """No identity to attribute, so the field stays '-'."""
    app, lines, sink_id = _app_and_lines()
    try:
        with TestClient(app) as client:
            client.get("/api/content/share/file.txt")
    finally:
        logger.remove(sink_id)

    assert len(lines) == 1, lines
    assert "[-]" in lines[0], lines[0]
