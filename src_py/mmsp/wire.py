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
The wire protocol an MMSP server and the mmsp client speak.

`POST /v1/stream` takes `{"model", "messages", "config"}` and answers with server-sent events: one
`data: <json>` line per event of the public stream, then `data: [DONE]`. A client's base URL ends with
`/v1` and the client appends `/stream` and `/models`. `GET /v1/models` lists the models of the
server's table in OpenAI's list shape (`{"object": "list", "data": [{"id": ...}, ...]}`); a model id
not in the table is a 404 `NotFoundError`. JSON has no bytes, so every bytes value travels as base64
text, and only the `data` of `inline_data.*` and `inline_thinking.*` items, the protocol's byte fields,
is decoded back.
While the model is silent, the server writes an SSE comment every KEEPALIVE_SECONDS, which a reader
skips; it keeps proxies and clients from timing out a long thought.
An error is `{"error": {"type", "message", ...}}`: the HTTP body when the server refuses a request,
or one event followed by `data: [DONE]` once the stream has begun. The five MMSP errors travel with
their fields and are raised again as themselves; every other error is raised as an `UpstreamError`.
"""

import base64
from typing import Any

from .errors import (
    EmptyResponseError,
    MMSPError,
    StreamProtocolError,
    ToolCallArgumentParseError,
    UnsupportedOperationError,
    UnsupportedParameterError,
    UpstreamError,
)


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 25752
API_PREFIX = "/v1"  # a base URL ends with it, as OpenAI's and vLLM's do
DEFAULT_BASE_URL = "http://127.0.0.1:25752/v1"
STREAM_ROUTE = "/stream"  # what a client appends to its base URL
MODELS_ROUTE = "/models"
STREAM_PATH = "/v1/stream"  # what the server serves (API_PREFIX + the route)
MODELS_PATH = "/v1/models"
KEEPALIVE_SECONDS = 15


def server_base_url(host: str, port: int) -> str:
    """
    The base URL a client of a server listening on host and port uses.

    Args:
        host: The host the server listens on; an IPv6 address goes in brackets.
        port: The port it listens on.

    Returns:
        `http://host:port/v1`.
    """
    return f"http://{f'[{host}]' if ':' in host else host}:{port}{API_PREFIX}"


def encode_wire(value: Any) -> Any:
    """
    A JSON-ready copy of an event or a message: every bytes value, wherever it sits, as base64 text.

    Args:
        value: An event, a message, or any value inside one.

    Returns:
        The copy, with dicts and lists copied and every other value returned as it is.
    """
    if isinstance(value, bytes):
        return base64.b64encode(value).decode("ascii")
    if isinstance(value, dict):
        return {key: encode_wire(item) for key, item in value.items()}
    if isinstance(value, list):
        return [encode_wire(item) for item in value]
    return value


def decode_wire(record: dict[str, Any]) -> dict[str, Any]:
    """
    A copy of an event or a message parsed from JSON, with the data of its inline items as bytes again.

    Args:
        record: A UniEvent or a UniMessage as it arrived on the wire.

    Returns:
        The copy, in which no other field is touched: bytes an old history kept inside a fidelity stay text.
    """
    content_items = []
    for item in record.get("content_items") or []:
        if item["type"].startswith(("inline_data.", "inline_thinking.")) and isinstance(item.get("data"), str):
            item = {**item, "data": base64.b64decode(item["data"])}
        content_items.append(item)
    return {**record, "content_items": content_items}


def to_wire_error(exc: BaseException) -> dict[str, Any]:
    """
    The JSON an exception travels as: an MMSP error with its fields, any other error by its class name.

    Args:
        exc: What a client raised.

    Returns:
        The error object, without the `{"error": ...}` around it.
    """
    if isinstance(exc, UnsupportedParameterError):
        return {
            "type": "UnsupportedParameterError",
            "message": str(exc),
            "client": exc.client,
            "parameter": exc.parameter,
        }
    if isinstance(exc, UnsupportedOperationError):
        return {
            "type": "UnsupportedOperationError",
            "message": str(exc),
            "client": exc.client,
            "operation": exc.operation,
        }
    if isinstance(exc, EmptyResponseError):
        return {
            "type": "EmptyResponseError",
            "message": str(exc),
            "client": exc.client,
            "finish_reason": exc.finish_reason,
            "usage_metadata": exc.usage_metadata,
        }
    if isinstance(exc, StreamProtocolError):
        # the constructor that raises it again adds the prefix back
        return {
            "type": "StreamProtocolError",
            "message": str(exc).removeprefix(f"{exc.client} broke the streaming protocol: "),
            "client": exc.client,
        }
    if isinstance(exc, ToolCallArgumentParseError):
        return {
            "type": "ToolCallArgumentParseError",
            "message": str(exc),
            "client": exc.client,
            "tool_name": exc.tool_name,
            "tool_call_id": exc.tool_call_id,
            "raw_arguments_length": exc.raw_arguments_length,
            "raw_arguments_preview": exc.raw_arguments_preview,
        }

    error: dict[str, Any] = {"type": type(exc).__name__, "message": str(exc) or type(exc).__name__}
    # the OpenAI and Anthropic SDKs keep the upstream's HTTP status here, the 401 or 429 a caller acts on
    status = getattr(exc, "status_code", None)
    if isinstance(status, int):
        error["status"] = status
    return error


def from_wire_error(error: dict[str, Any], status: int | None, client: str = "MmspClient") -> MMSPError:
    """
    The exception a wire error stands for: the MMSP error it was, or an UpstreamError.

    Args:
        error: The error object of a response body or of an error event.
        status: The HTTP status of a refused request, None for an error inside a stream.
        client: The client an UpstreamError is raised by.

    Returns:
        The exception to raise.
    """
    error_type = error.get("type")
    message = error.get("message") or error_type or "unknown error"
    match error_type:
        case "UnsupportedParameterError":
            return UnsupportedParameterError(error.get("client"), error.get("parameter"), message)
        case "UnsupportedOperationError":
            return UnsupportedOperationError(error.get("client"), error.get("operation"), message)
        case "EmptyResponseError":
            return EmptyResponseError(error.get("client"), error.get("finish_reason"), error.get("usage_metadata"))
        case "StreamProtocolError":
            return StreamProtocolError(error.get("client"), message)
        case "ToolCallArgumentParseError":
            exc = ToolCallArgumentParseError(
                error.get("client"),
                error.get("tool_name"),
                error.get("tool_call_id"),
                error.get("raw_arguments_preview") or "",
                message.rpartition("): ")[2],
            )
            # the raw arguments stayed on the server, so the length, the preview (which a long preview
            # would truncate twice) and the message are the upstream's own
            exc.raw_arguments_length = error.get("raw_arguments_length")
            exc.raw_arguments_preview = error.get("raw_arguments_preview")
            exc.args = (message,)
            return exc

    return UpstreamError(client, status if status is not None else error.get("status"), error_type, message)
