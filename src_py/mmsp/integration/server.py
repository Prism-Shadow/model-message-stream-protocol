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
MMSP server: the MMSP stream of every model the server's environment can reach, over HTTP.

`POST /v1/stream` streams one stateless response of the model the request names, routed as
`AutoLLMClient(model=...)` routes it: by the CLIENT_TYPE variable, else by the model id's family,
with the vendor keys of the server's environment. `GET /v1/models` lists the model ids it can route.
The wire protocol is the one `mmsp.wire` describes, and the mmsp client (`client_type="mmsp"`)
speaks it.
"""

import asyncio
import concurrent.futures
import hmac
import json
import os
import threading
from contextlib import suppress

from flask import Flask, Response, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

from .. import AutoLLMClient
from ..abort_signal import AbortSignal
from ..wire import (
    DEFAULT_HOST,
    DEFAULT_PORT,
    KEEPALIVE_SECONDS,
    MODELS_PATH,
    STREAM_PATH,
    decode_wire,
    encode_wire,
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


# The vendor key each official client reads, and an id of its family to construct it with.
_OFFICIAL_KEYS = {
    "openai-official": ("OPENAI_API_KEY", "gpt-"),
    "anthropic-official": ("ANTHROPIC_API_KEY", "claude-"),
    "gemini-official": ("GEMINI_API_KEY", "gemini-"),
    "zai-official": ("ZAI_API_KEY", "glm-"),
    "moonshot-official": ("MOONSHOT_API_KEY", "kimi-"),
    "deepseek-official": ("DEEPSEEK_API_KEY", "deepseek-"),
    "minimax-official": ("MINIMAX_API_KEY", "minimax-"),
}


def _error_response(status: int, error_type: str, message: str) -> tuple[Response, int]:
    """The answer to a request the server refuses before streaming anything."""
    return jsonify({"error": {"type": error_type, "message": message}}), status


def create_server_app(api_key: str | None = None) -> Flask:
    """
    Create the MMSP server's Flask application.

    Args:
        api_key: The key every request must carry as a bearer token; MMSP_SERVER_API_KEY when omitted,
            and no key at all when neither is set

    Returns:
        Flask application instance
    """
    if (os.getenv("CLIENT_TYPE") or "").strip().lower() == "mmsp":
        raise ValueError(
            "CLIENT_TYPE=mmsp would route the MMSP server to an MMSP server; unset it or name another client type."
        )

    api_key = api_key or os.getenv("MMSP_SERVER_API_KEY") or None
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024
    app.json.ensure_ascii = False

    @app.errorhandler(RequestEntityTooLarge)
    def request_entity_too_large(_error: RequestEntityTooLarge) -> tuple[Response, int]:
        """Refuse a request whose inline images or audio exceed the body limit."""
        return _error_response(413, "InvalidRequestError", "Request body is too large.")

    @app.before_request
    def authenticate() -> tuple[Response, int] | None:
        """Refuse a /v1/ request that does not carry the server's key, when it has one."""
        if api_key is None or not request.path.startswith("/v1/"):
            return None

        # constant-time, so the time a refusal takes tells nothing about the key
        if not hmac.compare_digest(request.headers.get("Authorization", "").encode(), f"Bearer {api_key}".encode()):
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

        try:
            client = AutoLLMClient(model=model)
        except Exception as exc:  # an unknown family or client type, or a vendor key the environment lacks
            return _error_response(400, "InvalidRequestError", str(exc) or type(exc).__name__)

        def generate():
            """Generate streaming response using the persistent event loop."""
            signal = AbortSignal()
            async_gen = None
            loop = _get_event_loop()
            try:
                # decoded here, so that a message the client cannot read is an error event like any other
                request_messages = [decode_wire(message) for message in messages]

                async def stream_events():
                    async for event in client.streaming_response(request_messages, config, signal):
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
    def list_models() -> Response | tuple[Response, int]:
        """List the model ids the server can route."""
        if os.getenv("CLIENT_TYPE"):
            # the client CLIENT_TYPE names serves every id its endpoint lists
            families = [""]
        else:
            # each official client whose key the environment holds, filtered down to its own family
            families = [family for key_env, family in _OFFICIAL_KEYS.values() if os.getenv(key_env)]

        models: list[str] = []
        try:
            loop = _get_event_loop()
            for family in families:
                client = AutoLLMClient(model=family)
                models.extend(asyncio.run_coroutine_threadsafe(client.list_models(), loop).result())
        except Exception as exc:  # one misconfigured vendor fails the listing, since the operator must see it
            return jsonify({"error": to_wire_error(exc)}), 502

        return jsonify({"models": models})

    return app


def start_server(
    host: str = DEFAULT_HOST, port: int = DEFAULT_PORT, api_key: str | None = None, debug: bool = False
) -> None:
    """
    Start the MMSP server.

    Args:
        host: Host address to bind to
        port: Port number to listen on
        api_key: The key every request must carry as a bearer token; MMSP_SERVER_API_KEY when omitted
        debug: Enable debug mode
    """
    app = create_server_app(api_key)
    print(f"Starting MMSP server at http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Start the MMSP server")
    parser.add_argument("--host", type=str, default=DEFAULT_HOST, help="Host address to bind to")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port number to listen on")
    parser.add_argument(
        "--api-key",
        type=str,
        default=None,
        help="The key every request must carry as a bearer token (default: MMSP_SERVER_API_KEY, else none)",
    )
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")

    args = parser.parse_args()

    start_server(host=args.host, port=args.port, api_key=args.api_key, debug=args.debug)
