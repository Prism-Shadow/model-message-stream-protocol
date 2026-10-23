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

"""Every streaming client stops at once: an abort, aclose() or break closes the provider's connection.

Each client streams from a local upstream that sends three text deltas in the client's protocol and
then stays silent until the client closes the connection, whose instant it records.
"""

import asyncio
import json
import math
import time
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager, suppress
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pytest

from mmsp import AutoLLMClient
from mmsp.abort_signal import AbortSignal
from mmsp.credentials import CLIENT_CREDENTIALS
from mmsp.types import UniEvent, UniMessage


# How long after the caller stops a stream the provider's connection may stay open.
CLOSE_BOUND_S = 0.2

# A model of each client type; a client type missing here fails its cases rather than going untested.
MODELS = {
    "openai-official": "gpt-5.5",
    "anthropic-official": "claude-sonnet-5-5",
    "google-official": "gemini-4-argon",
    "zai-official": "glm-5.3",
    "moonshot-official": "kimi-k3",
    "deepseek-official": "deepseek-flash",
    "minimax-official": "MiniMax-M3.1-Flash",
    "openai-responses": "gpt-5.6",
    "openai-chat": "gpt-5.6",
    "openai-chat-vllm-adapter": "Qwen/Qwen3.8-27B",
    "ant-messages": "claude-sonnet-5",
    "google-genai": "gemini-3.8-flash",
    "mmsp": "gpt-5.5",
}

# openai-embedding answers with one response, not a stream
STREAMING_CLIENT_TYPES = [client_type for client_type in CLIENT_CREDENTIALS if client_type != "openai-embedding"]

# the SDKs that end their stream quietly when their request is aborted
QUIET_ON_ABORT_CLIENT_TYPES = ["openai-chat", "ant-messages"]

TEXTS = ("one ", "two ", "three ")

HISTORY: list[UniMessage] = [
    {"role": "user", "content_items": [{"type": "text.done", "text": "Hello"}]},
    {"role": "assistant", "content_items": [{"type": "text.done", "text": "Hi"}]},
]

# a stream that reached its stop would be saved under MMSP_CACHE_DIR
CONFIG = {"trace_id": "interrupted"}


def _sse(data: dict[str, Any], event: str | None = None) -> bytes:
    name = f"event: {event}\n" if event else ""
    return f"{name}data: {json.dumps(data)}\n\n".encode()


def _script(target: str) -> list[bytes]:
    """The opening of a stream in the protocol the request path names: three text deltas.

    Under /complete/ a Chat Completions or Messages stream also carries its finish reason and usage,
    all a response sends but the closing of its connection.
    """
    path = target.split("?")[0]
    complete = path.startswith("/complete/")
    if path.endswith(":streamGenerateContent"):
        return [
            _sse({"candidates": [{"content": {"role": "model", "parts": [{"text": text}]}, "index": 0}]})
            for text in TEXTS
        ]
    if path.endswith("/chat/completions"):
        chunks = [{"index": 0, "delta": {"content": text}, "finish_reason": None} for text in TEXTS]
        if complete:
            chunks.append({"index": 0, "delta": {}, "finish_reason": "stop"})
        script = [
            _sse(
                {"id": "chatcmpl-0", "object": "chat.completion.chunk", "created": 0, "model": "m", "choices": [chunk]}
            )
            for chunk in chunks
        ]
        if complete:
            usage = {"prompt_tokens": 3, "completion_tokens": 3, "total_tokens": 6}
            chunk = {"id": "chatcmpl-0", "object": "chat.completion.chunk", "created": 0, "model": "m", "choices": []}
            script.append(_sse({**chunk, "usage": usage}))
        return script
    if path.endswith("/responses"):
        return [
            _sse(
                {
                    "type": "response.output_text.delta",
                    "item_id": "msg_0",
                    "output_index": 0,
                    "content_index": 0,
                    "delta": text,
                    "logprobs": [],
                    "sequence_number": index,
                },
                "response.output_text.delta",
            )
            for index, text in enumerate(TEXTS)
        ]
    if path.endswith("/messages"):
        message = {
            "id": "msg_0",
            "type": "message",
            "role": "assistant",
            "model": "m",
            "content": [],
            "stop_reason": None,
            "stop_sequence": None,
            "usage": {"input_tokens": 3, "output_tokens": 1},
        }
        script = [
            _sse({"type": "message_start", "message": message}, "message_start"),
            _sse(
                {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}},
                "content_block_start",
            ),
        ]
        script += [
            _sse(
                {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": text}},
                "content_block_delta",
            )
            for text in TEXTS
        ]
        if complete:
            script += [
                _sse({"type": "content_block_stop", "index": 0}, "content_block_stop"),
                _sse(
                    {
                        "type": "message_delta",
                        "delta": {"stop_reason": "end_turn", "stop_sequence": None},
                        "usage": {"output_tokens": 3},
                    },
                    "message_delta",
                ),
            ]
        return script
    if path.endswith("/interactions"):
        return [
            _sse({"event_type": "step.delta", "index": 0, "delta": {"type": "text", "text": text}}, "step.delta")
            for text in TEXTS
        ]
    if path.endswith("/stream"):
        return [
            _sse(
                {
                    "role": "assistant",
                    "event_type": "delta",
                    "content_items": [{"type": "text.delta", "text": text}],
                    "usage_metadata": None,
                    "finish_reason": None,
                    "created_at": 0,
                }
            )
            for text in TEXTS
        ]
    raise AssertionError(f"the upstream has no script for {target}")


@dataclass
class _Connection:
    target: str
    writer: asyncio.StreamWriter
    closed: asyncio.Event = field(default_factory=asyncio.Event)
    closed_at: float | None = None


class _Upstream:
    """Answers every request with its script, then stays silent until the client closes the connection."""

    def __init__(self) -> None:
        self.url = ""
        self.connections: list[_Connection] = []

    async def handle(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        head = await reader.readuntil(b"\r\n\r\n")
        request_line, *header_lines = head.decode().split("\r\n")
        target = request_line.split(" ")[1]
        headers = {
            name.strip().lower(): value.strip()
            for name, value in (line.split(":", 1) for line in header_lines if line)
        }
        if headers.get("transfer-encoding") == "chunked":
            while size := int((await reader.readline()).strip(), 16):
                await reader.readexactly(size + 2)
            await reader.readline()
        else:
            await reader.readexactly(int(headers.get("content-length", "0")))

        connection = _Connection(target, writer)
        self.connections.append(connection)
        writer.write(b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nTransfer-Encoding: chunked\r\n\r\n")
        for event in _script(target):
            writer.write(b"%x\r\n%s\r\n" % (len(event), event))
        await writer.drain()

        # the client sends nothing more, so a read returns only once it closes the connection
        with suppress(ConnectionError):
            while await reader.read(1024):
                pass
        connection.closed_at = time.monotonic()
        connection.closed.set()
        writer.close()

    async def closed_after(self, since: float) -> float:
        """Seconds from `since` until the client closed the connection, waiting no longer than the bound."""
        [connection] = self.connections
        with suppress(TimeoutError):
            await asyncio.wait_for(connection.closed.wait(), max(0.0, since + CLOSE_BOUND_S - time.monotonic()))
        return (connection.closed_at or math.inf) - since


@asynccontextmanager
async def _serve() -> AsyncIterator[_Upstream]:
    upstream = _Upstream()
    server = await asyncio.start_server(upstream.handle, "127.0.0.1", 0)
    upstream.url = f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}"
    try:
        yield upstream
    finally:
        # a connection a failing case left open ends here, so that the server can close
        for connection in upstream.connections:
            connection.writer.close()
        server.close()
        await server.wait_closed()


@pytest.fixture
def cache_dir(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    """Where a trace would be saved; the client under test reaches the local upstream directly."""
    for name in ("http_proxy", "https_proxy", "all_proxy", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("no_proxy", "127.0.0.1")
    monkeypatch.setenv("NO_PROXY", "127.0.0.1")
    monkeypatch.delenv("MMSP_DEBUG", raising=False)
    monkeypatch.setenv("MMSP_CACHE_DIR", str(tmp_path / "traces"))
    return tmp_path / "traces"


def _client(client_type: str, base_url: str) -> AutoLLMClient:
    client = AutoLLMClient(
        model=MODELS[client_type], api_key="test", base_url=f"{base_url}/v1", client_type=client_type
    )
    client.set_history(HISTORY)
    return client


def _open(client: AutoLLMClient, stateful: bool, signal: AbortSignal | None = None) -> AsyncIterator[UniEvent]:
    message: UniMessage = {"role": "user", "content_items": [{"type": "text.done", "text": "Count to a thousand."}]}
    if stateful:
        return client.streaming_response_stateful(message=message, config=CONFIG, signal=signal)
    return client.streaming_response(messages=[message], config=CONFIG, signal=signal)


def _text(events: list[UniEvent]) -> str:
    return "".join(item["text"] for event in events for item in event["content_items"] if item["type"] == "text.delta")


async def _read_to_first_text(stream: AsyncIterator[UniEvent], events: list[UniEvent]) -> None:
    while not _text(events):
        events.append(await anext(stream))


async def _read_on(stream: AsyncIterator[UniEvent], events: list[UniEvent]) -> BaseException | None:
    """Reads the stream to its end, and returns what it raised: an abort is a CancelledError."""
    try:
        async for event in stream:
            events.append(event)
    except BaseException as error:
        return error
    return None


async def _until(condition: Callable[[], bool]) -> None:
    while not condition():
        await asyncio.sleep(0.005)


def _assert_stopped_without_closing(events: list[UniEvent]) -> None:
    """The caller got the deltas that arrived, and neither a done item nor a stop."""
    assert TEXTS[0] in _text(events)
    assert not [event for event in events if event["event_type"] == "stop"]
    assert not [item for event in events for item in event["content_items"] if item["type"].endswith(".done")]


def _assert_nothing_recorded(client: AutoLLMClient, cache_dir: Path) -> None:
    assert client.get_history() == HISTORY
    assert not cache_dir.exists() or not any(cache_dir.iterdir())


@pytest.mark.asyncio
@pytest.mark.parametrize("stateful", [False, True], ids=["stateless", "stateful"])
@pytest.mark.parametrize("client_type", STREAMING_CLIENT_TYPES)
async def test_an_abort_while_the_caller_waits_closes_the_connection(
    client_type: str, stateful: bool, cache_dir: Path
):
    async with _serve() as upstream:
        client = _client(client_type, upstream.url)
        signal = AbortSignal()
        stream = _open(client, stateful, signal)
        events: list[UniEvent] = []
        await _read_to_first_text(stream, events)
        reader = asyncio.create_task(_read_on(stream, events))
        await asyncio.wait_for(_until(lambda: _text(events) == "".join(TEXTS)), 5)
        # the reader now waits through the upstream's silence, and the abort comes from another task
        await asyncio.sleep(0.05)

        aborted_at = time.monotonic()
        signal.abort("stop")
        error = await reader

        assert await upstream.closed_after(aborted_at) < CLOSE_BOUND_S
        assert isinstance(error, asyncio.CancelledError)
        assert error.args == ("stop",)
        _assert_stopped_without_closing(events)
        _assert_nothing_recorded(client, cache_dir)


@pytest.mark.asyncio
@pytest.mark.parametrize("stateful", [False, True], ids=["stateless", "stateful"])
@pytest.mark.parametrize("client_type", STREAMING_CLIENT_TYPES)
async def test_an_abort_while_the_caller_is_busy_closes_the_connection_by_its_next_read(
    client_type: str, stateful: bool, cache_dir: Path
):
    async with _serve() as upstream:
        client = _client(client_type, upstream.url)
        signal = AbortSignal()
        stream = _open(client, stateful, signal)
        events: list[UniEvent] = []
        await _read_to_first_text(stream, events)

        signal.abort("stop")
        await asyncio.sleep(0.05)
        error = await _read_on(stream, events)
        returned_at = time.monotonic()

        assert await upstream.closed_after(returned_at) < CLOSE_BOUND_S
        assert isinstance(error, asyncio.CancelledError)
        assert error.args == ("stop",)
        _assert_stopped_without_closing(events)
        _assert_nothing_recorded(client, cache_dir)


@pytest.mark.asyncio
@pytest.mark.parametrize("stateful", [False, True], ids=["stateless", "stateful"])
@pytest.mark.parametrize("client_type", STREAMING_CLIENT_TYPES)
async def test_aclose_closes_the_connection(client_type: str, stateful: bool, cache_dir: Path):
    async with _serve() as upstream:
        client = _client(client_type, upstream.url)
        stream = _open(client, stateful)
        events: list[UniEvent] = []
        await _read_to_first_text(stream, events)

        await stream.aclose()
        returned_at = time.monotonic()

        assert await upstream.closed_after(returned_at) < CLOSE_BOUND_S
        _assert_stopped_without_closing(events)
        _assert_nothing_recorded(client, cache_dir)


@pytest.mark.asyncio
@pytest.mark.parametrize("stateful", [False, True], ids=["stateless", "stateful"])
@pytest.mark.parametrize("client_type", STREAMING_CLIENT_TYPES)
async def test_leaving_the_loop_closes_the_connection(client_type: str, stateful: bool, cache_dir: Path):
    async with _serve() as upstream:
        client = _client(client_type, upstream.url)
        events: list[UniEvent] = []

        async for event in _open(client, stateful):
            events.append(event)
            if _text(events):
                break
        # the generator left behind is closed by the event loop's finalizer, which is scheduled here
        left_at = time.monotonic()

        assert await upstream.closed_after(left_at) < CLOSE_BOUND_S
        _assert_stopped_without_closing(events)
        _assert_nothing_recorded(client, cache_dir)


@pytest.mark.asyncio
@pytest.mark.parametrize("client_type", QUIET_ON_ABORT_CLIENT_TYPES)
async def test_an_abort_after_the_last_event_records_nothing(client_type: str, cache_dir: Path):
    async with _serve() as upstream:
        client = _client(client_type, f"{upstream.url}/complete")
        signal = AbortSignal()
        stream = _open(client, True, signal)
        events: list[UniEvent] = []
        reader = asyncio.create_task(_read_on(stream, events))
        await asyncio.wait_for(_until(lambda: _text(events) == "".join(TEXTS)), 5)
        # the finish reason and the usage are in; only the closing of the connection is missing
        await asyncio.sleep(0.05)

        signal.abort("stop")
        error = await reader

        assert isinstance(error, asyncio.CancelledError)
        assert error.args == ("stop",)
        _assert_stopped_without_closing(events)
        _assert_nothing_recorded(client, cache_dir)
