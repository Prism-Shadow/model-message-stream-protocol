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
named by its `server_model_id`. `POST /v1/stream` streams one stateless response of the model a
request names, and `GET /v1/models` lists the models in OpenAI's list shape. Requests carry one of
the `api_keys` as a bearer token, or none when the list is empty. The table comes from a JSON file
(`load_server_config`) or from code, and a client's base URL is `http://host:port/v1`. The wire
protocol is the one `mmsp.wire` describes, and the mmsp client (`client_type="mmsp"`) speaks it.
"""

import asyncio
import concurrent.futures
import hmac
import json
import os
import threading
import time
from contextlib import suppress
from typing import Any, TypedDict

from flask import Flask, Response, jsonify, request
from werkzeug.exceptions import MethodNotAllowed, NotFound, RequestEntityTooLarge

from .. import AutoLLMClient
from ..abort_signal import AbortSignal
from ..base_client import LLMClient
from ..wire import (
    DEFAULT_HOST,
    DEFAULT_PORT,
    KEEPALIVE_SECONDS,
    MODELS_PATH,
    STREAM_PATH,
    decode_wire,
    encode_wire,
    server_base_url,
    to_wire_error,
)


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
    """One row of the models table: an upstream model and the id clients name it by. Every column is required."""

    model_id: str  # the upstream model id, as AutoLLMClient takes it
    base_url: str  # the upstream endpoint
    api_key: str  # the upstream key
    server_model_id: str  # the id clients name
    client_type: str  # the upstream client type, one of AutoLLMClient's


class ServerConfig(TypedDict):
    """What a config file holds: the models table and the keys clients may send."""

    models: list[ModelRow]
    api_keys: list[str]


_COLUMNS = ("model_id", "base_url", "api_key", "server_model_id", "client_type")
# the ids are names, not settings, so a `$` in them is taken as written
_RESOLVED_COLUMNS = ("base_url", "api_key", "client_type")


def _error_response(status: int, error_type: str, message: str) -> tuple[Response, int]:
    """The answer to a request the server refuses before streaming anything."""
    return jsonify({"error": {"type": error_type, "message": message}}), status


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
    if not isinstance(config, dict) or not isinstance(config.get("models"), list):
        raise ValueError(f"{prefix}the config must be a JSON object with a models list.")
    api_keys = config.get("api_keys", [])
    if not isinstance(api_keys, list):
        raise ValueError(f"{prefix}api_keys must be a list.")

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
    with open(path, encoding="utf-8") as file:
        text = file.read()
    try:
        config = json.loads(text)
    except ValueError as exc:
        raise ValueError(f"{path}: not valid JSON: {exc}") from exc
    return resolve_server_config(config, str(path))


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
        for column in _COLUMNS:
            if not isinstance(row.get(column), str) or not row[column]:
                raise ValueError(f"models[{i}]: {column} must be a non-empty string.")
        server_model_id = row["server_model_id"]
        if server_model_id in seen:
            raise ValueError(
                f"models[{i}]: server_model_id '{server_model_id}' is already used by models[{seen[server_model_id]}]."
            )
        seen[server_model_id] = i
    api_keys = [] if api_keys is None else api_keys
    if not isinstance(api_keys, list) or not all(isinstance(key, str) and key for key in api_keys):
        raise ValueError("api_keys must be a list of non-empty strings.")

    # after the whole table is checked, so every structural fault is reported before a client's own refusal
    upstreams: dict[str, LLMClient] = {}
    for i, row in enumerate(models):
        try:
            upstreams[row["server_model_id"]] = AutoLLMClient(
                model=row["model_id"], api_key=row["api_key"], base_url=row["base_url"], client_type=row["client_type"]
            )
        except Exception as exc:
            raise ValueError(f"models[{i}] '{row['server_model_id']}': {str(exc) or type(exc).__name__}") from exc
    created = int(time.time())

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
            f"No route for {request.method} {request.path}; the server serves POST /v1/stream and GET /v1/models.",
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
            return _error_response(401, "AuthenticationError", "Invalid or missing API key.")

        return None

    @app.route(STREAM_PATH, methods=["POST"])
    def stream() -> Response | tuple[Response, int]:
        """Stream one stateless response of the model the request names."""
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return _error_response(400, "InvalidRequestError", "Request body must be a JSON object.")

        model = data.get("model")
        if not isinstance(model, str) or not model:
            return _error_response(400, "InvalidRequestError", "model must be a non-empty string.")

        messages = data.get("messages")
        if not isinstance(messages, list):
            return _error_response(400, "InvalidRequestError", "messages must be a list of messages.")

        config = {} if data.get("config") is None else data["config"]
        if not isinstance(config, dict):
            return _error_response(400, "InvalidRequestError", "config must be an object.")

        upstream = upstreams.get(model)
        if upstream is None:
            return _error_response(
                404,
                "NotFoundError",
                f"The model '{model}' does not exist; GET /v1/models lists the models this server serves.",
            )

        def generate():
            """Generate streaming response using the persistent event loop."""
            signal = AbortSignal()
            async_gen = None
            loop = _get_event_loop()
            try:
                # decoded here, so that a message the client cannot read is an error event like any other
                request_messages = [decode_wire(message) for message in messages]

                async def stream_events():
                    async for event in upstream.streaming_response(request_messages, config, signal):
                        yield f"data: {json.dumps(encode_wire(event), ensure_ascii=False)}\n\n"

                async_gen = stream_events()
                while True:
                    next_event = asyncio.run_coroutine_threadsafe(async_gen.__anext__(), loop)
                    # a comment while the model is silent, so that no proxy or client times out a long thought;
                    # writing it is also how a disconnect is noticed before the next event
                    while not concurrent.futures.wait([next_event], timeout=KEEPALIVE_SECONDS).done:
                        yield ": keep-alive\n\n"
                    try:
                        yield next_event.result()
                    except StopAsyncIteration:
                        break

                yield "data: [DONE]\n\n"
            except (asyncio.CancelledError, concurrent.futures.CancelledError):
                yield "data: [DONE]\n\n"
            except GeneratorExit:
                # the caller went away: the upstream request is cancelled, and nothing more is written
                signal.abort("client disconnected")
                if async_gen is not None:
                    with suppress(Exception):
                        asyncio.run_coroutine_threadsafe(async_gen.aclose(), loop).result(timeout=1)
                raise
            except Exception as exc:
                # the status went out with the first byte, so a failure travels as an event of its own
                yield f"data: {json.dumps({'error': to_wire_error(exc)}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
            finally:
                signal.abort("request ended")

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

    return app


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
    print(f"Starting MMSP server at {server_base_url(host, port)}")
    print("Serving models: " + ", ".join(app.config["MMSP_SERVER_MODEL_IDS"]))
    if not api_keys:
        print("Open server: api_keys is empty, every request is accepted")
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
