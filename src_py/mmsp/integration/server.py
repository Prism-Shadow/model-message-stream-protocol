#!/usr/bin/env python
# Copyright 2025 Prism Shadow. and/or its affiliates
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
MMSP server: the models of a table, over HTTP as MMSP streams.

The server serves the rows of its models table. Each row is an upstream model, built once with
`AutoLLMClient(model=model_id, api_key=api_key, base_url=base_url, client_type=client_type)` and
named by its `server_model_id`; a row without a client type or a base URL gets the official client
its model id names and that client's default endpoint. `POST /v1/stream` streams one stateless
response of the model a request names, `GET /v1/models` lists the models in OpenAI's list shape, and
`GET /v1/metrics` reports what the server has served since it started, which the dashboard at `/`
shows. Requests to `/v1/` carry one of the `api_keys` as a bearer token, or none when the list is
empty. The table comes from a JSON file (`load_server_config`) or from code, and a client's base URL
is `http://host:port/v1`. The wire protocol is the one `mmsp.wire` describes, and the mmsp client
(`client_type="mmsp"`) speaks it.
"""

import asyncio
import concurrent.futures
import hmac
import json
import math
import os
import threading
import time
from collections import deque
from collections.abc import Callable
from contextlib import suppress
from dataclasses import dataclass, field
from typing import Any, Literal, NotRequired, TypedDict

from flask import Flask, Response, jsonify, request
from werkzeug.exceptions import MethodNotAllowed, NotFound, RequestEntityTooLarge

from .. import AutoLLMClient
from ..abort_signal import AbortSignal
from ..base_client import LLMClient
from ..wire import (
    DEFAULT_HOST,
    DEFAULT_PORT,
    KEEPALIVE_SECONDS,
    METRICS_PATH,
    MODELS_PATH,
    STREAM_PATH,
    decode_wire,
    encode_wire,
    server_base_url,
    server_dashboard_url,
    to_wire_error,
)
from .dashboard_page import DASHBOARD_TEMPLATE


# Global event loop and lock for thread-safe async operations
_event_loop: asyncio.AbstractEventLoop | None = None
_loop_lock = threading.Lock()


def _get_event_loop() -> asyncio.AbstractEventLoop:
    """Get or create the global event loop for async operations."""
    global _event_loop
    if _event_loop is None or _event_loop.is_closed():
        with _loop_lock:
            # Double-check after acquiring lock
            if _event_loop is None or _event_loop.is_closed():
                _event_loop = asyncio.new_event_loop()

                # Start the loop in a background thread
                def run_loop():
                    asyncio.set_event_loop(_event_loop)
                    _event_loop.run_forever()

                loop_thread = threading.Thread(target=run_loop, daemon=True)
                loop_thread.start()

    return _event_loop


class ModelRow(TypedDict):
    """
    One row of the models table: an upstream model and the id clients name it by.

    `base_url` and `client_type` may be empty or absent.
    """

    model_id: str  # the upstream model id, as AutoLLMClient takes it
    api_key: str  # the upstream key
    server_model_id: str  # the id clients name
    base_url: NotRequired[str]  # empty or absent: the client's default endpoint (its variable, else the vendor's)
    client_type: NotRequired[str]  # empty or absent: the official client the model id names


class ServerConfig(TypedDict):
    """What a config file holds: the models table and the keys clients may send."""

    models: list[ModelRow]
    api_keys: list[str]


_COLUMNS = ("model_id", "base_url", "api_key", "server_model_id", "client_type")
_REQUIRED_COLUMNS = ("model_id", "api_key", "server_model_id")
_OPTIONAL_COLUMNS = ("base_url", "client_type")
# the ids are names, not settings, so a `$` in them is taken as written
_RESOLVED_COLUMNS = ("base_url", "api_key", "client_type")

LATENCY_WINDOW = 1000  # the latest successes per model the latency percentiles are taken over


@dataclass
class RequestSample:
    """One request the metrics follow, from `ServerMetrics.begin` to its outcome."""

    model_id: str
    started: float  # metrics.now() at begin
    first_event: float | None = None
    done: bool = False


@dataclass
class _Series:
    """The counters of one model, or of the whole server."""

    requests: int = 0
    successes: int = 0
    failures: int = 0
    disconnects: int = 0
    first_event_ms: deque[int] = field(default_factory=lambda: deque(maxlen=LATENCY_WINDOW))
    total_ms: deque[int] = field(default_factory=lambda: deque(maxlen=LATENCY_WINDOW))
    tokens: dict[str, int] = field(default_factory=lambda: {"prompt": 0, "cached": 0, "thoughts": 0, "response": 0})
    last_request_at: float | None = None
    last_outcome: str | None = None
    last_error: dict[str, Any] | None = None


def _percentile(samples: deque[int], p: int) -> int | None:
    """The nearest-rank percentile of the samples, None when there are none."""
    if not samples:
        return None
    values = sorted(samples)
    return values[math.ceil(p / 100 * len(values)) - 1]


class ServerMetrics:
    """
    What a server has served since it started, per model and in total.

    A request is counted when it reaches a model and ends one of three ways: a success streamed its
    stop event, a failure ended with an error event, and a disconnect is a caller that went away, which
    is not the server's failure. The latencies are those of the latest LATENCY_WINDOW successes. A
    request refused before it reaches a model counts as a refusal of the server only.

    Args:
        model_ids: The server's model ids, in table order
        now: The monotonic clock the latencies are measured with, in seconds
        clock: The wall clock the timestamps are read from, in unix seconds
    """

    def __init__(
        self, model_ids: list[str], now: Callable[[], float] = time.monotonic, clock: Callable[[], float] = time.time
    ) -> None:
        self.now = now
        self.clock = clock
        self.started_at = int(clock())
        self._lock = threading.Lock()
        self._total = _Series()
        self._models = {model_id: _Series() for model_id in model_ids}
        self._refused = {"unauthorized": 0, "invalid_request": 0, "unknown_model": 0}

    def _timestamp(self) -> float:
        """The wall clock in unix seconds, to the millisecond."""
        return round(self.clock(), 3)

    def begin(self, model_id: str) -> RequestSample:
        """Count a request to a model and start its clock."""
        with self._lock:
            at = self._timestamp()
            for series in (self._models[model_id], self._total):
                series.requests += 1
                series.last_request_at = at
            return RequestSample(model_id=model_id, started=self.now())

    def first_event(self, sample: RequestSample) -> None:
        """Note the moment a request's first event went out; later calls change nothing."""
        with self._lock:
            if sample.first_event is None:
                sample.first_event = self.now()

    def finish(
        self,
        sample: RequestSample,
        outcome: Literal["success", "failure", "disconnect"],
        error: str | None = None,
        usage: dict[str, Any] | None = None,
    ) -> None:
        """Count how a request ended; a request already finished is not counted again."""
        with self._lock:
            if sample.done:
                return
            sample.done = True
            model = self._models[sample.model_id]
            if outcome == "success":
                total_ms = int((self.now() - sample.started) * 1000 + 0.5)
                first_event_ms = (
                    None if sample.first_event is None else int((sample.first_event - sample.started) * 1000 + 0.5)
                )
                for series in (model, self._total):
                    series.successes += 1
                    series.total_ms.append(total_ms)
                    if first_event_ms is not None:
                        series.first_event_ms.append(first_event_ms)
                    for bucket in ("prompt", "cached", "thoughts", "response"):
                        count = (usage or {}).get(f"{bucket}_tokens")
                        if count is not None:
                            series.tokens[bucket] += count
            elif outcome == "failure":
                model.failures += 1
                self._total.failures += 1
                model.last_error = {"at": self._timestamp(), "message": error}
            else:
                model.disconnects += 1
                self._total.disconnects += 1
            model.last_outcome = outcome

    def refused(self, kind: Literal["unauthorized", "invalid_request", "unknown_model"]) -> None:
        """Count a request the server refused before it reached a model."""
        with self._lock:
            self._refused[kind] += 1

    @staticmethod
    def _counts(series: _Series) -> dict[str, Any]:
        """The counters, rates, latencies and tokens a model and the total share, in the order they are reported."""
        finished = series.successes + series.failures
        return {
            "requests": series.requests,
            "successes": series.successes,
            "failures": series.failures,
            "disconnects": series.disconnects,
            "in_flight": series.requests - series.successes - series.failures - series.disconnects,
            "success_rate": round(series.successes / finished, 4) if finished else None,
            "latency_ms": {
                "first_event": {
                    "p50": _percentile(series.first_event_ms, 50),
                    "p90": _percentile(series.first_event_ms, 90),
                },
                "total": {"p50": _percentile(series.total_ms, 50), "p90": _percentile(series.total_ms, 90)},
            },
            "tokens": dict(series.tokens),
        }

    def snapshot(self) -> dict[str, Any]:
        """
        Everything counted so far, as `GET /v1/metrics` reports it.

        Returns:
            The totals, the refusals, and one entry per model in table order.
        """
        with self._lock:
            return {
                "started_at": self.started_at,
                "uptime_s": int(self.clock()) - self.started_at,
                **self._counts(self._total),
                "refused": dict(self._refused),
                "last_request_at": self._total.last_request_at,
                "models": [
                    {
                        "id": model_id,
                        **self._counts(series),
                        "last_request_at": series.last_request_at,
                        "last_outcome": series.last_outcome,
                        "last_error": None if series.last_error is None else dict(series.last_error),
                    }
                    for model_id, series in self._models.items()
                ],
            }


def _error_response(status: int, error_type: str, message: str) -> tuple[Response, int]:
    """The answer to a request the server refuses before streaming anything."""
    return jsonify({"error": {"type": error_type, "message": message}}), status


def _check_config_shape(config: Any, prefix: str) -> None:
    """Refuse a config that is not an object with a models list, or whose api_keys is not a list."""
    if not isinstance(config, dict) or not isinstance(config.get("models"), list):
        raise ValueError(f"{prefix}the config must be a JSON object with a models list.")
    if not isinstance(config.get("api_keys", []), list):
        raise ValueError(f"{prefix}api_keys must be a list.")


def resolve_server_config(config: Any, source: str = "") -> ServerConfig:
    """
    Check a config's shape and resolve the environment references of its cells.

    `config` is what a config file or a request body holds: `{"models": [...], "api_keys": [...]}`.
    A `base_url`, `api_key` or `client_type` cell of a row, or an entry of `api_keys`, that starts
    with `$` is read from the environment (`$NAME` and `${NAME}` both name NAME). `source` prefixes
    every message (the file's path for `load_server_config`); empty, the messages carry no prefix.
    The rows are checked by `create_server_app`, as rows from code are.

    Returns:
        `{"models": rows, "api_keys": keys}` with those cells replaced, `api_keys` defaulting to [].
        The input is not modified.

    Raises:
        ValueError: When the config is not an object with a models list, api_keys is not a list, or a
        reference names a variable that is unset or empty.
    """
    prefix = f"{source}: " if source else ""
    _check_config_shape(config, prefix)
    api_keys = config.get("api_keys", [])

    def resolve(cell: object, where: str) -> object:
        """The value a cell stands for: the variable it names, or the cell itself."""
        if not isinstance(cell, str) or not cell.startswith("$"):
            return cell
        name = cell[1:]
        if name.startswith("{") and name.endswith("}"):
            name = name[1:-1]
        value = os.getenv(name)
        if not value:
            raise ValueError(f"{prefix}{where} references {cell}, which is not set in the environment.")
        return value

    models = []
    for i, row in enumerate(config["models"]):
        # a row that is not an object is left for create_server_app to refuse
        if isinstance(row, dict):
            row = dict(row)
            for column in _RESOLVED_COLUMNS:
                if column in row:
                    row[column] = resolve(row[column], f"models[{i}].{column}")
        models.append(row)
    return {"models": models, "api_keys": [resolve(key, f"api_keys[{i}]") for i, key in enumerate(api_keys)]}


def read_server_config(path: str | os.PathLike[str]) -> dict[str, Any]:
    """
    Read a config file as written: parsed and shape-checked, its `$VAR` cells unresolved, every key kept.

    The playground keeps `host` and `port` in the file too; `load_server_config` reads only the table and the keys.

    Args:
        path: The JSON file: `{"models": [...], "api_keys": [...]}`

    Returns:
        The parsed object

    Raises:
        FileNotFoundError: When there is no file.
        ValueError: When the file is not JSON, or not an object with a models list and a list of api_keys;
        every message starts with the path.
    """
    with open(path, encoding="utf-8") as file:
        text = file.read()
    try:
        config = json.loads(text)
    except ValueError as exc:
        raise ValueError(f"{path}: not valid JSON: {exc}") from exc
    _check_config_shape(config, f"{path}: ")
    return config


def load_server_config(path: str | os.PathLike[str]) -> ServerConfig:
    """
    Read a config file, with the environment references of its cells resolved.

    The cells are resolved as `resolve_server_config` resolves them, and every message starts with the path.

    Args:
        path: The JSON file: `{"models": [...], "api_keys": [...]}`

    Returns:
        The models table and the keys, with those cells replaced and `api_keys` defaulting to an empty list

    Raises:
        ValueError: When the file is not JSON, not a config, or references a variable that is unset or empty.
    """
    return resolve_server_config(read_server_config(path), str(path))


def create_server_app(models: list[ModelRow], api_keys: list[str] | None = None) -> Flask:
    """
    Create the MMSP server's Flask application, with the upstream client of every row built.

    The rows are taken as they are: code that has its rows reads its own environment, and only
    `load_server_config` resolves `$` cells.

    Args:
        models: The models table, served in its order
        api_keys: The keys a request may carry as a bearer token; an empty or omitted list is an open server

    Returns:
        Flask application instance

    Raises:
        ValueError: When the table or the keys are malformed, or a row's upstream client refuses to build.
    """
    if not isinstance(models, list):
        raise ValueError("models must be a list of model rows.")
    if not models:
        raise ValueError("models is empty: the server needs at least one model row.")
    seen: dict[str, int] = {}
    for i, row in enumerate(models):
        if not isinstance(row, dict):
            raise ValueError(f"models[{i}] must be an object.")
        for column in _REQUIRED_COLUMNS:
            if not isinstance(row.get(column), str) or not row[column]:
                raise ValueError(f"models[{i}]: {column} must be a non-empty string.")
        for column in _OPTIONAL_COLUMNS:
            if row.get(column) is not None and not isinstance(row[column], str):
                raise ValueError(f"models[{i}]: {column} must be a string.")
        server_model_id = row["server_model_id"]
        if server_model_id in seen:
            raise ValueError(
                f"models[{i}]: server_model_id '{server_model_id}' is already used by models[{seen[server_model_id]}]."
            )
        seen[server_model_id] = i
    api_keys = [] if api_keys is None else api_keys
    if not isinstance(api_keys, list):
        raise ValueError("api_keys must be a list of non-empty strings.")
    for i, key in enumerate(api_keys):
        if not isinstance(key, str) or not key:
            raise ValueError(f"api_keys[{i}] must be a non-empty string.")

    # after the whole table is checked, so every structural fault is reported before a client's own refusal
    upstreams: dict[str, LLMClient] = {}
    for i, row in enumerate(models):
        try:
            # without a client type AutoLLMClient routes by the model id's family and honours CLIENT_TYPE,
            # as it does everywhere
            upstreams[row["server_model_id"]] = AutoLLMClient(
                model=row["model_id"],
                api_key=row["api_key"],
                base_url=row.get("base_url") or None,
                client_type=row.get("client_type") or None,
            )
        except Exception as exc:
            raise ValueError(f"models[{i}] '{row['server_model_id']}': {str(exc) or type(exc).__name__}") from exc
    metrics = ServerMetrics(list(upstreams))
    created = metrics.started_at

    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024
    app.json.ensure_ascii = False
    # Flask sorts keys by default; the bodies keep the order they are written in, as the TypeScript server's do
    app.json.sort_keys = False
    app.config["MMSP_SERVER_MODEL_IDS"] = list(upstreams)

    @app.errorhandler(RequestEntityTooLarge)
    def request_entity_too_large(_error: RequestEntityTooLarge) -> tuple[Response, int]:
        """Refuse a request whose inline images or audio exceed the body limit."""
        return _error_response(413, "InvalidRequestError", "Request body is too large.")

    @app.errorhandler(NotFound)
    @app.errorhandler(MethodNotAllowed)
    def no_route(_error: NotFound | MethodNotAllowed) -> tuple[Response, int]:
        """Refuse a path or a method the server does not serve, in JSON."""
        # Flask would answer GET /v1/stream with a 405 page; to a client it is a route that does not exist
        return _error_response(
            404,
            "NotFoundError",
            f"No route for {request.method} {request.path}; the server serves POST /v1/stream, GET /v1/models,"
            " GET /v1/metrics and the dashboard at /.",
        )

    expected = [f"Bearer {key}".encode() for key in api_keys]

    @app.before_request
    def authenticate() -> tuple[Response, int] | None:
        """Refuse a /v1/ request that does not carry one of the server's keys, when it has any."""
        if not expected or not request.path.startswith("/v1/"):
            return None

        given = request.headers.get("Authorization", "").encode()
        # constant-time per key, so the time a refusal takes tells nothing about the keys
        if not any(hmac.compare_digest(given, candidate) for candidate in expected):
            metrics.refused("unauthorized")
            return _error_response(401, "AuthenticationError", "Invalid or missing API key.")

        return None

    def invalid_request(message: str) -> tuple[Response, int]:
        """Count and refuse a stream request the server cannot read."""
        metrics.refused("invalid_request")
        return _error_response(400, "InvalidRequestError", message)

    @app.route(STREAM_PATH, methods=["POST"])
    def stream() -> Response | tuple[Response, int]:
        """Stream one stateless response of the model the request names."""
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return invalid_request("Request body must be a JSON object.")

        model = data.get("model")
        if not isinstance(model, str) or not model:
            return invalid_request("model must be a non-empty string.")

        messages = data.get("messages")
        if not isinstance(messages, list):
            return invalid_request("messages must be a list of messages.")

        config = {} if data.get("config") is None else data["config"]
        if not isinstance(config, dict):
            return invalid_request("config must be an object.")

        upstream = upstreams.get(model)
        if upstream is None:
            metrics.refused("unknown_model")
            return _error_response(
                404,
                "NotFoundError",
                f"The model '{model}' does not exist; GET /v1/models lists the models this server serves.",
            )
        sample = metrics.begin(model)

        def generate():
            """Generate streaming response using the persistent event loop."""
            signal = AbortSignal()
            async_gen = None
            loop = _get_event_loop()
            outcome = error = usage = None
            try:
                # decoded here, so that a message the client cannot read is an error event like any other
                request_messages = [decode_wire(message) for message in messages]

                async_gen = upstream.streaming_response(request_messages, config, signal)
                while True:
                    next_event = asyncio.run_coroutine_threadsafe(async_gen.__anext__(), loop)
                    # a comment while the model is silent, so that no proxy or client times out a long thought;
                    # writing it is also how a disconnect is noticed before the next event
                    while not concurrent.futures.wait([next_event], timeout=KEEPALIVE_SECONDS).done:
                        yield ": keep-alive\n\n"
                    try:
                        event = next_event.result()
                    except StopAsyncIteration:
                        break
                    metrics.first_event(sample)
                    if event["event_type"] == "stop":
                        usage = event.get("usage_metadata")
                    yield f"data: {json.dumps(encode_wire(event), ensure_ascii=False)}\n\n"

                # the stop event went out, so a caller gone before the marker leaves this a success
                outcome = "success"
                yield "data: [DONE]\n\n"
            except (asyncio.CancelledError, concurrent.futures.CancelledError):
                outcome, error = "failure", "cancelled"
                yield "data: [DONE]\n\n"
            except GeneratorExit:
                # the caller went away: the upstream request is cancelled, and nothing more is written
                signal.abort("client disconnected")
                if async_gen is not None:
                    with suppress(Exception):
                        asyncio.run_coroutine_threadsafe(async_gen.aclose(), loop).result(timeout=1)
                raise
            except Exception as exc:
                outcome, error = "failure", str(exc) or type(exc).__name__
                # the status went out with the first byte, so a failure travels as an event of its own
                yield f"data: {json.dumps({'error': to_wire_error(exc)}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
            finally:
                signal.abort("request ended")
                # a generator closed before it decided is a caller that went away
                metrics.finish(sample, outcome or "disconnect", error=error, usage=usage)

        return Response(generate(), mimetype="text/event-stream", headers={"Cache-Control": "no-cache"})

    @app.route(MODELS_PATH, methods=["GET"])
    def list_models() -> Response:
        """The models of the table, in the list shape OpenAI-style tools read."""
        return jsonify(
            {
                "object": "list",
                "data": [
                    {"id": model_id, "object": "model", "created": created, "owned_by": "mmsp"}
                    for model_id in upstreams
                ],
            }
        )

    @app.route(METRICS_PATH, methods=["GET"])
    def server_metrics() -> Response:
        """What the server has served since it started, per model and in total."""
        return jsonify(metrics.snapshot())

    @app.route("/", methods=["GET"])
    def dashboard() -> Response:
        """The dashboard page, which holds no secret: it asks for a key and reads GET /v1/metrics with it."""
        return Response(DASHBOARD_TEMPLATE, mimetype="text/html")

    return app


def announce_server(host: str, port: int, model_ids: list[str], open: bool) -> None:
    """
    Print where the server listens, what it serves, where its dashboard is, and whether it is open.

    Args:
        host: The host it listens on
        port: The port it listens on
        model_ids: The ids it serves, in table order
        open: Whether it accepts every request, having no keys
    """
    print(f"Starting MMSP server at {server_base_url(host, port)}")
    print("Serving models: " + ", ".join(model_ids))
    print(f"Dashboard at {server_dashboard_url(host, port)}")
    if open:
        print("Open server: api_keys is empty, every request is accepted")


def start_server(
    models: list[ModelRow],
    api_keys: list[str] | None = None,
    *,
    host: str = DEFAULT_HOST,
    port: int = DEFAULT_PORT,
    debug: bool = False,
) -> None:
    """
    Start the MMSP server.

    Args:
        models: The models table, served in its order
        api_keys: The keys a request may carry as a bearer token; an empty or omitted list is an open server
        host: Host address to bind to
        port: Port number to listen on
        debug: Enable debug mode
    """
    app = create_server_app(models, api_keys)
    announce_server(host, port, app.config["MMSP_SERVER_MODEL_IDS"], not api_keys)
    app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Start the MMSP server, which serves the models of its table as MMSP streams"
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help='The JSON config file: {"models": [...], "api_keys": [...]} (default: MMSP_SERVER_CONFIG)',
    )
    parser.add_argument("--host", type=str, default=DEFAULT_HOST, help="Host address to bind to")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port number to listen on")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")

    args = parser.parse_args()
    config_path = args.config or os.getenv("MMSP_SERVER_CONFIG")
    if not config_path:
        parser.error("A config file is required: pass --config PATH or set MMSP_SERVER_CONFIG.")

    config = load_server_config(config_path)
    start_server(config["models"], config["api_keys"], host=args.host, port=args.port, debug=args.debug)
