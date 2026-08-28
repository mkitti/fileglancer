"""Tests for the access log middleware."""

import asyncio
import json
import logging

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from loguru import logger

from fileglancer.log import AccessLogMiddleware
from fileglancer.logconf import configure_logging
from fileglancer.settings import Settings


@pytest.fixture(autouse=True)
def restore_logging():
    """JSON mode reroutes stdlib logging globally; undo it between tests."""
    root = logging.getLogger()
    handlers, level = root.handlers[:], root.level
    yield
    configure_logging("INFO", "text")
    root.handlers, root.level = handlers, level


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


def test_json_mode_logs_one_ecs_object_per_request(capsys):
    """JSON mode must emit a parseable ECS record with a duration to aggregate."""
    app = FastAPI()
    app.add_middleware(AccessLogMiddleware, settings=Settings())

    @app.get("/api/files/{name}")
    async def files(name: str, request: Request):
        request.state.fg_username = "alice"
        request.state.fg_token_id = "a1b2c3d4e5f6"
        logger.info("handling the request")
        return {"ok": True}

    configure_logging("INFO", "json")
    try:
        with TestClient(app) as client:
            response = client.get("/api/files/share?x=1")
    finally:
        configure_logging("INFO", "text")

    records = [json.loads(line) for line in capsys.readouterr().out.splitlines()]
    access = [r for r in records if r.get("event.dataset") == "fileglancer.access"]
    assert len(access) == 1, records
    record = access[0]

    assert record["service.name"] == "fileglancer"
    assert record["http.request.method"] == "GET"
    assert record["http.response.status_code"] == 200
    assert record["url.path"] == "/api/files/share"
    assert record["url.query"] == "x=1"
    assert record["user.name"] == "alice"
    assert record["labels.token_id"] == "a1b2c3d4e5f6"
    assert record["labels.endpoint"] == "files"
    # The whole point: a number Kibana can take percentiles of.
    assert isinstance(record["event.duration"], int) and record["event.duration"] > 0

    # The id is returned to the client and shared with every line logged while
    # serving the request, so both can be found from a single bug report.
    assert response.headers["x-request-id"] == record["trace.id"]
    handler_line = [r for r in records if r["message"] == "handling the request"]
    assert handler_line and handler_line[0]["trace.id"] == record["trace.id"]


def test_json_mode_records_exceptions(capsys):
    """A logged exception must arrive as ECS error fields, not a wall of text."""
    configure_logging("INFO", "json")
    try:
        try:
            raise ValueError("boom")
        except ValueError:
            logger.exception("it broke")
    finally:
        configure_logging("INFO", "text")

    record = json.loads(capsys.readouterr().out.strip())
    assert record["error.type"] == "ValueError"
    assert record["error.message"] == "boom"
    assert "ValueError: boom" in record["error.stack_trace"]


def test_text_mode_is_the_default_and_stays_human_readable(capsys):
    """Default settings must log exactly as before, not JSON."""
    assert Settings().log_format == "text"

    app, lines, sink_id = _app_and_lines()
    try:
        with TestClient(app) as client:
            client.get("/api/content/share/file.txt")
    finally:
        logger.remove(sink_id)

    assert '"GET /api/content/share/file.txt HTTP/1.1" 200 - ' in lines[0]
    assert "{" not in lines[0], lines[0]
