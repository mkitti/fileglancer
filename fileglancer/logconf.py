"""
Log output configuration: human-readable text (the default) or JSON.

Setting ``log_format: json`` (or ``FGC_LOG_FORMAT=json``) turns every record
into a single-line JSON object using Elastic Common Schema field names, which
a log shipper can parse straight off stdout and hand to Kibana. ECS fields are
written as dotted keys ("http.response.status_code") rather than nested dicts:
Elasticsearch expands them on ingest, so the indexed document is the same one
without any dict-building here.

Kept free of Fileglancer imports so the setuid user worker can configure its
logging without pulling in the server's auth stack.
"""
import json
import logging
import sys
import traceback
from datetime import timezone
from importlib.metadata import PackageNotFoundError, version

from loguru import logger

SERVICE_NAME = "fileglancer"

try:
    SERVICE_VERSION = version("fileglancer")
except PackageNotFoundError:  # running from a source tree that was never installed
    SERVICE_VERSION = "unknown"


def json_sink(message):
    """Write one loguru record as one line of ECS-shaped JSON on stdout."""
    record = message.record
    payload = {
        "@timestamp": record["time"].astimezone(timezone.utc)
                      .isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "log.level": record["level"].name.lower(),
        "log.logger": record["name"],
        "message": record["message"],
        "service.name": SERVICE_NAME,
        "service.version": SERVICE_VERSION,
        "process.pid": record["process"].id,
    }
    # Anything bound with logger.bind()/contextualize() is already keyed by its
    # ECS name, so it merges straight in.
    payload.update(record["extra"])

    exception = record["exception"]
    if exception:
        payload["error.type"] = getattr(exception.type, "__name__", "Exception")
        payload["error.message"] = str(exception.value)
        payload["error.stack_trace"] = "".join(traceback.format_exception(
            exception.type, exception.value, exception.traceback))

    sys.stdout.write(json.dumps(payload, default=str) + "\n")
    sys.stdout.flush()


class InterceptHandler(logging.Handler):
    """Route stdlib logging (uvicorn, sqlalchemy) into loguru.

    Only installed in JSON mode, so that a shipper sees one format on the
    stream instead of JSON lines mixed with uvicorn's plain text.
    """

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
        frame, depth = logging.currentframe(), 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1
        # Report the stdlib logger's own name rather than the frame loguru
        # would infer, which is always the logging module itself.
        logger.opt(depth=depth, exception=record.exc_info).bind(
            **{"log.logger": record.name}).log(level, record.getMessage())


def configure_logging(log_level: str = "INFO", log_format: str = "text",
                      text_sink=sys.stderr, colorize: bool = None):
    """Point loguru at the human-readable sink, or at the ECS JSON sink.

    ``text_sink``/``colorize`` only apply to text mode; the CLI passes a click
    sink so its output stays on the click stream.
    """
    logger.remove()
    if log_format == "json":
        logger.add(json_sink, level=log_level, format="{message}")
        logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
        # Uvicorn installs its own handlers and turns off propagation, so its
        # lines would stay plain text on a stream that is otherwise all JSON.
        # Hand them to the root logger, which now goes through loguru.
        for name in ("uvicorn", "uvicorn.error", "uvicorn.asgi"):
            uvicorn_logger = logging.getLogger(name)
            uvicorn_logger.handlers = []
            uvicorn_logger.propagate = True
    else:
        logger.add(text_sink, level=log_level, colorize=colorize)


def disable_uvicorn_access_log():
    """Silence Uvicorn's own access logger, which AccessLogMiddleware replaces.

    Left enabled, every request is logged twice: once here with the username and
    duration, once by Uvicorn without them. Uvicorn's ``--no-access-log`` does
    the same thing from the outside, but it has to be remembered on every launch
    command, and it was missing from several. Doing it where the middleware is
    installed covers any way the app is started.

    Matches what Uvicorn's own ``access_log=False`` does. Safe to call more than
    once, and safe at import time: Uvicorn configures logging before it imports
    the app, including in each --reload/--workers subprocess.
    """
    access_logger = logging.getLogger("uvicorn.access")
    access_logger.handlers = []
    access_logger.propagate = False
