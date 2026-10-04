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

import asyncio
import json
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from typing import Any, AsyncIterator, Callable

import pytest
from flask import Flask
from stream_grammar import assert_stream_grammar
from werkzeug.serving import make_server

from mmsp import AutoLLMClient, UnsupportedParameterError, UpstreamError, base_client
from mmsp.abort_signal import AbortSignal
from mmsp.base_client import LLMClient
from mmsp.integration import server
from mmsp.integration.server import (
    LATENCY_WINDOW,
    RETENTION_S,
    ModelRow,
    ServerMetrics,
    announce_server,
    create_server_app,
    load_server_config,
    read_history,
    read_server_config,
    resolve_server_config,
    start_server,
)
from mmsp.types import ContentItem, UniConfig, UniEvent, UniMessage
from mmsp.wire import decode_wire, server_base_url


# Every upstream the server builds here is a scripted client, so nothing reaches a vendor; the
# table decides what is served and which keys open it.
_SERVER_ENV = ["MMSP_SERVER_CONFIG", "PROBE_UPSTREAM_KEY", "PROBE_SERVER_KEY", "PROBE_BASE_URL"]

USAGE = {"cached_tokens": None, "prompt_tokens": 3, "thoughts_tokens": None, "response_tokens": 5}

PNG = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"


def _delta(item: dict[str, Any]) -> UniEvent:
    return {
        "role": "assistant",
        "event_type": "delta",
        "content_items": [item],
        "usage_metadata": None,
        "finish_reason": None,
    }


def _stop(finish_reason: str = "stop") -> UniEvent:
    return {
        "role": "assistant",
        "event_type": "stop",
        "content_items": [],
        "usage_metadata": USAGE,
        "finish_reason": finish_reason,
    }


def _messages() -> list[UniMessage]:
    return [{"role": "user", "content_items": [{"type": "text.done", "text": "你好"}]}]


class ScriptedClient(LLMClient):
    """An upstream client that yields a scripted list of client events, raising the exceptions in it."""

    def __init__(self, script: list[UniEvent | Exception], model: str = "scripted") -> None:
        self._model = model
        self._history = []
        self._script = script

    def transform_uni_config_to_model_config(self, config: UniConfig) -> dict[str, Any]:
        if config.get("temperature") is not None:
            raise UnsupportedParameterError(
                "ScriptedClient", "temperature", "ScriptedClient does not support temperature."
            )
        return dict(config)

    def transform_uni_message_to_model_input(self, messages: list[UniMessage]) -> list[UniMessage]:
        return messages

    def transform_model_output_to_uni_event(self, model_output: UniEvent) -> UniEvent:
        return model_output

    async def list_models(self) -> list[str]:
        return [f"{self._model}-a", f"{self._model}-b"]

    async def _streaming_response_internal(
        self,
        messages: list[UniMessage],
        config: UniConfig,
    ) -> AsyncIterator[UniEvent]:
        self.transform_uni_config_to_model_config(config)
        for event in self._script:
            await asyncio.sleep(0)
            if isinstance(event, Exception):
                raise event
            yield event


class SlowScriptedClient(ScriptedClient):
    """Streams a text delta every 50 ms until told to stop, and records that its stream was closed."""

    def __init__(self, model: str = "scripted") -> None:
        super().__init__([], model)
        self.stop = threading.Event()
        self.cleaned = threading.Event()

    async def _streaming_response_internal(
        self,
        messages: list[UniMessage],
        config: UniConfig,
    ) -> AsyncIterator[UniEvent]:
        try:
            while not self.stop.is_set():
                yield _delta({"type": "text.delta", "text": "tick", "fidelity": {"item_id": "0"}})
                await asyncio.sleep(0.05)
        finally:
            self.cleaned.set()


class SilentScriptedClient(ScriptedClient):
    """Stays silent for half a second before it streams its script, as a model does while it thinks."""

    async def _streaming_response_internal(
        self,
        messages: list[UniMessage],
        config: UniConfig,
    ) -> AsyncIterator[UniEvent]:
        await asyncio.sleep(0.5)
        async for event in super()._streaming_response_internal(messages, config):
            yield event


@pytest.fixture(autouse=True)
def _controlled_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in _SERVER_ENV:
        monkeypatch.delenv(name, raising=False)
    # the client under test reaches the local server directly, whatever proxy the environment names
    monkeypatch.setenv("no_proxy", "127.0.0.1")


Construction = tuple[str, str | None, str | None, str | None]


@pytest.fixture
def constructions() -> list[Construction]:
    """The (model, client_type, api_key, base_url) of every upstream the server constructed."""
    return []


@pytest.fixture
def use_upstream(monkeypatch: pytest.MonkeyPatch, constructions: list[Construction]):
    """Builds every row's upstream with `factory(model)` in place of `AutoLLMClient`."""

    def patch(factory: Callable[[str], LLMClient]) -> None:
        def fake_auto_client(
            model: str,
            api_key: str | None = None,
            base_url: str | None = None,
            client_type: str | None = None,
            default_headers: dict[str, str] | None = None,
        ) -> LLMClient:
            constructions.append((model, client_type, api_key, base_url))
            return factory(model)

        monkeypatch.setattr(server, "AutoLLMClient", fake_auto_client)

    return patch


@pytest.fixture
def serve():
    """Serves an app on a free local port and returns the base URL a client is given."""
    http_servers = []

    def start(app) -> str:
        http_server = make_server("127.0.0.1", 0, app, threaded=True)
        threading.Thread(target=http_server.serve_forever, daemon=True).start()
        http_servers.append(http_server)
        return f"http://127.0.0.1:{http_server.server_port}/v1"

    yield start
    for http_server in http_servers:
        http_server.shutdown()
        http_server.server_close()


def _row(model_id: str, server_model_id: str | None = None, **overrides: str) -> ModelRow:
    return {
        "model_id": model_id,
        "base_url": "https://upstream.example/v1",
        "api_key": "sk-upstream",
        "server_model_id": server_model_id or model_id,
        "client_type": "openai-responses",
        **overrides,
    }


def _server_app(models: list[ModelRow] | None = None, api_keys: list[str] | None = None) -> Flask:
    return create_server_app(models or [_row("gpt-5.5")], api_keys)


def _mmsp_client(url: str, model: str = "gpt-5.5") -> AutoLLMClient:
    return AutoLLMClient(model=model, client_type="mmsp", base_url=url, api_key="test-key")


def _write_config(path: Path, config: Any) -> Path:
    path.write_text(json.dumps(config, ensure_ascii=False), encoding="utf-8")
    return path


def _strip(events: list[UniEvent]) -> list[dict[str, Any]]:
    """The events without their timestamps, which each side stamps on its own."""
    return [{name: value for name, value in event.items() if name != "created_at"} for event in events]


def _done_items(events: list[UniEvent]) -> list[ContentItem]:
    return [item for event in events for item in event["content_items"] if item["type"].endswith(".done")]


async def _direct_error(script: list[UniEvent | Exception], config: UniConfig) -> Exception:
    """What the scripted client raises when it is called in process."""
    with pytest.raises(Exception) as exc_info:
        async for _ in ScriptedClient(script).streaming_response(_messages(), config):
            pass
    return exc_info.value


def _sse_events(body: bytes) -> list[str]:
    return [chunk.removeprefix("data: ") for chunk in body.decode().split("\n\n") if chunk]


@dataclass
class StreamCase:
    name: str
    script: list[UniEvent]
    done_items: list[ContentItem]


STREAM_CASES = [
    # GPT's commentary then its final answer: two text items told apart by their ids only
    StreamCase(
        name="two_text_items_of_different_phase",
        script=[
            _delta({"type": "text.delta", "text": "", "fidelity": {"item_id": "0", "phase": "commentary"}}),
            _delta({"type": "text.delta", "text": "Checking.", "fidelity": {"item_id": "0"}}),
            _delta({"type": "text.delta", "text": "", "fidelity": {"item_id": "1", "phase": "final_answer"}}),
            _delta({"type": "text.delta", "text": "Done.", "fidelity": {"item_id": "1"}}),
            _stop(),
        ],
        done_items=[
            {"type": "text.done", "text": "Checking.", "fidelity": {"phase": "commentary"}},
            {"type": "text.done", "text": "Done.", "fidelity": {"phase": "final_answer"}},
        ],
    ),
    StreamCase(
        name="tool_call",
        script=[
            _delta(
                {
                    "type": "tool_call.delta",
                    "name": "get_weather",
                    "arguments": "",
                    "tool_call_id": "call_1",
                    "fidelity": {"item_id": "fc_1"},
                }
            ),
            _delta(
                {
                    "type": "tool_call.delta",
                    "name": "",
                    "arguments": '{"city": ',
                    "tool_call_id": "",
                    "fidelity": {"item_id": "fc_1"},
                }
            ),
            _delta(
                {
                    "type": "tool_call.delta",
                    "name": "",
                    "arguments": '"巴黎"}',
                    "tool_call_id": "",
                    "fidelity": {"item_id": "fc_1"},
                }
            ),
            _stop("tool_call"),
        ],
        done_items=[
            {"type": "tool_call.done", "name": "get_weather", "arguments": {"city": "巴黎"}, "tool_call_id": "call_1"}
        ],
    ),
    # Anthropic's signature arrives on an empty thinking delta after the thinking text
    StreamCase(
        name="thinking_with_signature",
        script=[
            _delta({"type": "thinking.delta", "thinking": "Let me think.", "fidelity": {"item_id": "0"}}),
            _delta({"type": "thinking.delta", "thinking": "", "fidelity": {"item_id": "0", "signature": "sig-1"}}),
            _delta({"type": "text.delta", "text": "Hello", "fidelity": {"item_id": "1"}}),
            _stop(),
        ],
        done_items=[
            {"type": "thinking.done", "thinking": "Let me think.", "fidelity": {"signature": "sig-1"}},
            {"type": "text.done", "text": "Hello"},
        ],
    ),
    StreamCase(
        name="image",
        script=[
            _delta(
                {
                    "type": "inline_data.delta",
                    "data": PNG,
                    "mime_type": "image/png",
                    "fidelity": {"item_id": "inline_data"},
                }
            ),
            _delta({"type": "text.delta", "text": "A pixel.", "fidelity": {"item_id": "text"}}),
            _stop(),
        ],
        done_items=[
            {"type": "inline_data.done", "data": PNG, "mime_type": "image/png"},
            {"type": "text.done", "text": "A pixel."},
        ],
    ),
    StreamCase(
        name="audio",
        script=[
            _delta(
                {
                    "type": "inline_data.delta",
                    "data": chunk,
                    "mime_type": "audio/pcm; rate=24000; channels=1",
                    "fidelity": {"item_id": "0"},
                }
            )
            for chunk in (b"\x01\x02", b"\x03\x04", b"\x05\x06")
        ]
        + [_stop()],
        done_items=[
            {
                "type": "inline_data.done",
                "data": b"\x01\x02\x03\x04\x05\x06",
                "mime_type": "audio/pcm; rate=24000; channels=1",
            }
        ],
    ),
    # gemini_official's thought signature after an image thought: fidelity alone, under the image's id
    StreamCase(
        name="image_thought_with_signature",
        script=[
            _delta(
                {"type": "inline_thinking.delta", "data": PNG, "mime_type": "image/png", "fidelity": {"item_id": "1"}}
            ),
            _delta({"type": "thinking.delta", "thinking": "", "fidelity": {"item_id": "1", "signature": "sig-image"}}),
            _delta({"type": "text.delta", "text": "Here it is.", "fidelity": {"item_id": "2"}}),
            _stop(),
        ],
        done_items=[
            {
                "type": "inline_thinking.done",
                "data": PNG,
                "mime_type": "image/png",
                "fidelity": {"signature": "sig-image"},
            },
            {"type": "text.done", "text": "Here it is."},
        ],
    ),
    StreamCase(
        name="two_embeddings",
        script=[
            _delta({"type": "embedding.delta", "embedding": [0.1, 0.2]}),
            _delta({"type": "embedding.delta", "embedding": [0.3, 0.4]}),
            _stop(),
        ],
        done_items=[
            {"type": "embedding.done", "embedding": [0.1, 0.2]},
            {"type": "embedding.done", "embedding": [0.3, 0.4]},
        ],
    ),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("case", STREAM_CASES, ids=[case.name for case in STREAM_CASES])
async def test_stream_through_the_server_equals_the_upstream_stream(case: StreamCase, use_upstream, serve):
    use_upstream(lambda model: ScriptedClient(case.script, model))
    url = serve(_server_app())

    expected = [event async for event in ScriptedClient(case.script).streaming_response(_messages(), {})]
    actual = [event async for event in _mmsp_client(url).streaming_response(_messages(), {})]

    assert _strip(actual) == _strip(expected)
    assert _done_items(actual) == case.done_items
    assert_stream_grammar(actual)


@pytest.mark.asyncio
async def test_client_yields_the_server_events_as_sent(monkeypatch: pytest.MonkeyPatch, use_upstream, serve):
    script = next(case.script for case in STREAM_CASES if case.name == "two_text_items_of_different_phase")
    use_upstream(lambda model: ScriptedClient(script, model))
    # one wall clock for the server's two responses, so that it stamps their events alike
    monkeypatch.setattr(base_client, "time", SimpleNamespace(time=lambda: 1790000000.0))
    app = _server_app()

    with app.test_client() as client:
        response = client.post("/v1/stream", json={"model": "gpt-5.5", "messages": _messages()})
    raw = [decode_wire(json.loads(event)) for event in _sse_events(response.data) if event != "[DONE]"]
    actual = [event async for event in _mmsp_client(serve(app)).streaming_response(_messages(), {})]

    assert actual == raw


@pytest.mark.asyncio
async def test_thinking_only_response_raises_an_upstream_error_carrying_the_empty_response_error(use_upstream, serve):
    script = [_delta({"type": "thinking.delta", "thinking": "Hmm.", "fidelity": {"item_id": "0"}}), _stop()]
    use_upstream(lambda model: ScriptedClient(script, model))
    url = serve(_server_app())

    with pytest.raises(UpstreamError) as exc_info:
        async for _ in _mmsp_client(url).streaming_response(_messages(), {}):
            pass

    direct = await _direct_error(script, {})
    assert exc_info.value.client == "MmspClient"
    assert exc_info.value.status is None
    assert exc_info.value.error_type == "EmptyResponseError"
    assert str(exc_info.value) == str(direct)
    assert exc_info.value.error == {
        "type": "EmptyResponseError",
        "message": str(direct),
        "client": "ScriptedClient",
        "finish_reason": "stop",
        "usage_metadata": USAGE,
    }


@pytest.mark.asyncio
async def test_unsupported_parameter_raises_an_upstream_error_carrying_the_unsupported_parameter_error(
    use_upstream, serve
):
    script = [_delta({"type": "text.delta", "text": "Hi"}), _stop()]
    use_upstream(lambda model: ScriptedClient(script, model))
    url = serve(_server_app())

    with pytest.raises(UpstreamError) as exc_info:
        async for _ in _mmsp_client(url).streaming_response(_messages(), {"temperature": 0.1}):
            pass

    assert exc_info.value.client == "MmspClient"
    assert exc_info.value.error_type == "UnsupportedParameterError"
    assert exc_info.value.error["parameter"] == "temperature"
    assert exc_info.value.error["client"] == "ScriptedClient"
    assert str(exc_info.value) == "ScriptedClient does not support temperature."


@pytest.mark.asyncio
async def test_unparsable_tool_call_arguments_raise_an_upstream_error_carrying_the_parse_error(use_upstream, serve):
    script = [
        _delta({"type": "tool_call.delta", "name": "f", "arguments": '{"a":', "tool_call_id": "call_1"}),
        _stop("tool_call"),
    ]
    use_upstream(lambda model: ScriptedClient(script, model))
    url = serve(_server_app())

    with pytest.raises(UpstreamError) as exc_info:
        async for _ in _mmsp_client(url).streaming_response(_messages(), {}):
            pass

    direct = await _direct_error(script, {})
    assert exc_info.value.error_type == "ToolCallArgumentParseError"
    assert exc_info.value.error["tool_name"] == "f"
    assert exc_info.value.error["tool_call_id"] == "call_1"
    assert exc_info.value.error["raw_arguments_preview"] == '{"a":'
    assert exc_info.value.error["raw_arguments_length"] == 5
    assert str(exc_info.value) == str(direct)


@pytest.mark.asyncio
async def test_other_upstream_failure_raises_an_upstream_error_after_the_deltas_before_it(use_upstream, serve):
    script = [
        _delta({"type": "text.delta", "text": "Hel", "fidelity": {"item_id": "0"}}),
        RuntimeError("connection reset"),
    ]
    use_upstream(lambda model: ScriptedClient(script, model))
    url = serve(_server_app())

    events = []
    with pytest.raises(UpstreamError) as exc_info:
        async for event in _mmsp_client(url).streaming_response(_messages(), {}):
            events.append(event)

    assert [event["content_items"] for event in events] == [[{"type": "text.delta", "text": "Hel"}]]
    assert exc_info.value.client == "MmspClient"
    assert exc_info.value.status is None
    assert exc_info.value.error_type == "RuntimeError"
    assert str(exc_info.value) == "connection reset"
    assert exc_info.value.error == {"type": "RuntimeError", "message": "connection reset"}


@pytest.mark.parametrize(
    "body, message",
    [
        ("not json", "Request body must be a JSON object."),
        ({}, "model must be a non-empty string."),
        ({"model": "gpt-5.5"}, "messages must be a list of messages."),
        ({"model": "gpt-5.5", "messages": [], "config": []}, "config must be an object."),
    ],
    ids=["not_json", "no_model", "no_messages", "config_not_an_object"],
)
def test_malformed_stream_request_is_refused(body: Any, message: str):
    app = _server_app()

    with app.test_client() as client:
        if isinstance(body, str):
            response = client.post("/v1/stream", data=body, content_type="application/json")
        else:
            response = client.post("/v1/stream", json=body)

    assert response.status_code == 400
    assert response.get_json() == {"error": {"type": "InvalidRequestError", "message": message}}


def test_server_with_a_key_refuses_requests_without_it(use_upstream):
    use_upstream(lambda model: ScriptedClient([], model))
    app = _server_app(api_keys=["secret"])
    refusal = {"error": {"type": "AuthenticationError", "message": "Invalid or missing API key."}}

    with app.test_client() as client:
        missing = client.post("/v1/stream", json={"model": "gpt-5.5", "messages": []})
        wrong = client.get("/v1/models", headers={"Authorization": "Bearer guess"})
        right = client.get("/v1/models", headers={"Authorization": "Bearer secret"})

    assert (missing.status_code, missing.get_json()) == (401, refusal)
    assert (wrong.status_code, wrong.get_json()) == (401, refusal)
    assert right.status_code == 200


@pytest.mark.asyncio
async def test_client_with_a_wrong_key_raises_an_upstream_error_with_the_status(use_upstream, serve):
    use_upstream(lambda model: ScriptedClient([], model))
    url = serve(_server_app(api_keys=["secret"]))

    with pytest.raises(UpstreamError) as exc_info:
        async for _ in _mmsp_client(url).streaming_response(_messages(), {}):
            pass

    assert exc_info.value.status == 401
    assert exc_info.value.error_type == "AuthenticationError"
    assert str(exc_info.value) == "Invalid or missing API key."
    assert exc_info.value.error == {"type": "AuthenticationError", "message": "Invalid or missing API key."}


def test_failing_stream_ends_with_an_error_event_then_the_done_marker(use_upstream):
    script = [
        _delta({"type": "text.delta", "text": "Hel", "fidelity": {"item_id": "0"}}),
        RuntimeError("connection reset"),
    ]
    use_upstream(lambda model: ScriptedClient(script, model))
    app = _server_app()

    with app.test_client() as client:
        response = client.post("/v1/stream", json={"model": "gpt-5.5", "messages": _messages()})

    assert response.status_code == 200
    assert response.mimetype == "text/event-stream"
    events = _sse_events(response.data)
    assert json.loads(events[-2]) == {"error": {"type": "RuntimeError", "message": "connection reset"}}
    assert events[-1] == "[DONE]"


@pytest.mark.asyncio
async def test_models_lists_every_row_in_openai_format(use_upstream, serve):
    use_upstream(lambda model: ScriptedClient([], model))
    app = _server_app([_row("claude-sonnet-5-5", "claude"), _row("gpt-5.5")])

    with app.test_client() as client:
        response = client.get("/v1/models")

    assert response.status_code == 200
    body = response.get_json()
    assert [list(body), list(body["data"][0])] == [["object", "data"], ["id", "object", "created", "owned_by"]]
    created = [entry.pop("created") for entry in body["data"]]
    assert body == {
        "object": "list",
        "data": [
            {"id": "claude", "object": "model", "owned_by": "mmsp"},
            {"id": "gpt-5.5", "object": "model", "owned_by": "mmsp"},
        ],
    }
    assert isinstance(created[0], int)
    assert created[0] == created[1]
    assert await _mmsp_client(serve(app)).list_models() == ["claude", "gpt-5.5"]


@pytest.mark.asyncio
async def test_each_row_streams_its_own_upstream_with_its_own_columns(use_upstream, constructions, serve):
    scripts = {
        "gpt-5.5": [_delta({"type": "text.delta", "text": "from gpt", "fidelity": {"item_id": "0"}}), _stop()],
        "claude-sonnet-5-5": [
            _delta({"type": "text.delta", "text": "from claude", "fidelity": {"item_id": "0"}}),
            _stop(),
        ],
    }
    use_upstream(lambda model: ScriptedClient(scripts[model], model))
    app = _server_app(
        [
            _row("gpt-5.5"),
            _row(
                "claude-sonnet-5-5",
                "claude",
                base_url="https://gw.example",
                api_key="sk-row",
                client_type="ant-messages",
            ),
        ]
    )
    url = serve(app)

    assert constructions == [
        ("gpt-5.5", "openai-responses", "sk-upstream", "https://upstream.example/v1"),
        ("claude-sonnet-5-5", "ant-messages", "sk-row", "https://gw.example"),
    ]
    for model, upstream_model in (("gpt-5.5", "gpt-5.5"), ("claude", "claude-sonnet-5-5")):
        expected = [
            event async for event in ScriptedClient(scripts[upstream_model]).streaming_response(_messages(), {})
        ]
        actual = [event async for event in _mmsp_client(url, model).streaming_response(_messages(), {})]
        assert _strip(actual) == _strip(expected)

    # the upstream id is not an alias of the row
    with app.test_client() as client:
        response = client.post("/v1/stream", json={"model": "claude-sonnet-5-5", "messages": _messages()})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_request_for_a_model_not_in_the_table_is_not_found(serve):
    app = _server_app()
    message = "The model 'gpt-4' does not exist; GET /v1/models lists the models this server serves."

    with app.test_client() as client:
        response = client.post("/v1/stream", json={"model": "gpt-4", "messages": _messages()})

    assert response.status_code == 404
    assert response.get_json() == {"error": {"type": "NotFoundError", "message": message}}
    with pytest.raises(UpstreamError) as exc_info:
        async for _ in _mmsp_client(serve(app), "gpt-4").streaming_response(_messages(), {}):
            pass
    assert exc_info.value.status == 404
    assert exc_info.value.error_type == "NotFoundError"
    assert exc_info.value.error["type"] == "NotFoundError"
    assert str(exc_info.value) == message


@pytest.mark.asyncio
async def test_server_accepts_any_of_its_keys(use_upstream, serve):
    script = [_delta({"type": "text.delta", "text": "Hi", "fidelity": {"item_id": "0"}}), _stop()]
    use_upstream(lambda model: ScriptedClient(script, model))
    app = _server_app(api_keys=["k1", "k2"])

    with app.test_client() as client:
        statuses = [
            client.get("/v1/models", headers={"Authorization": f"Bearer {key}"}).status_code
            for key in ("k1", "k2", "k3")
        ]
        missing = client.get("/v1/models")

    assert statuses == [200, 200, 401]
    assert missing.status_code == 401
    mmsp_client = AutoLLMClient(model="gpt-5.5", client_type="mmsp", base_url=serve(app), api_key="k2")
    events = [event async for event in mmsp_client.streaming_response(_messages(), {})]
    assert _done_items(events) == [{"type": "text.done", "text": "Hi"}]


def test_server_without_keys_is_open():
    for app in (_server_app(), _server_app(api_keys=[])):
        with app.test_client() as client:
            assert client.get("/v1/models").status_code == 200


def test_empty_table_refuses_to_start():
    with pytest.raises(ValueError) as exc_info:
        create_server_app(models=[])

    assert str(exc_info.value) == "models is empty: the server needs at least one model row."


@pytest.mark.parametrize("column", ["model_id", "api_key", "server_model_id"])
def test_row_with_a_missing_or_empty_column_refuses_to_start(column: str):
    missing = {name: value for name, value in _row("gpt-5.5").items() if name != column}
    empty = {**_row("gpt-5.5"), column: ""}

    for row in (missing, empty):
        with pytest.raises(ValueError) as exc_info:
            create_server_app([row])
        assert str(exc_info.value) == f"models[0]: {column} must be a non-empty string."


def test_row_without_client_type_or_base_url_builds_with_the_defaults(use_upstream, constructions):
    use_upstream(lambda model: ScriptedClient([], model))
    bare: ModelRow = {"model_id": "gpt-5.5", "api_key": "sk-a", "server_model_id": "gpt"}
    empty: ModelRow = {
        "model_id": "claude-sonnet-5-5",
        "api_key": "sk-b",
        "server_model_id": "claude",
        "base_url": "",
        "client_type": "",
    }

    app = create_server_app([bare, empty])

    assert constructions == [("gpt-5.5", None, "sk-a", None), ("claude-sonnet-5-5", None, "sk-b", None)]
    with app.test_client() as client:
        assert [model["id"] for model in client.get("/v1/models").get_json()["data"]] == ["gpt", "claude"]
    # None reads as absent, as a JSON null in a file does
    create_server_app([{**bare, "base_url": None, "client_type": None}])
    for column in ("base_url", "client_type"):
        with pytest.raises(ValueError) as exc_info:
            create_server_app([{**bare, column: 5}])
        assert str(exc_info.value) == f"models[0]: {column} must be a string."


def test_duplicate_server_model_id_refuses_to_start():
    with pytest.raises(ValueError) as exc_info:
        create_server_app([_row("gpt-5.5"), _row("gpt-5.5-mini", "gpt-5.5")])

    assert str(exc_info.value) == "models[1]: server_model_id 'gpt-5.5' is already used by models[0]."


def test_row_the_upstream_client_refuses_names_the_row_and_a_relay_row_builds():
    with pytest.raises(ValueError) as exc_info:
        create_server_app([_row("gpt-5.5"), _row("qwen3.8", client_type="nope")])
    assert str(exc_info.value).startswith("models[1] 'qwen3.8': Unknown client type")

    # a row may name another MMSP server as its upstream
    relay = create_server_app(
        [_row("claude", "claude-relayed", base_url="http://127.0.0.1:1/v1", api_key="none", client_type="mmsp")]
    )
    with relay.test_client() as client:
        assert [model["id"] for model in client.get("/v1/models").get_json()["data"]] == ["claude-relayed"]

    with pytest.raises(ValueError) as exc_info:
        create_server_app([_row("gpt-5.5")], api_keys=[1])
    assert str(exc_info.value) == "api_keys[0] must be a non-empty string."
    with pytest.raises(ValueError) as exc_info:
        create_server_app([_row("gpt-5.5")], api_keys=["k", ""])
    assert str(exc_info.value) == "api_keys[1] must be a non-empty string."
    with pytest.raises(ValueError) as exc_info:
        create_server_app([_row("gpt-5.5")], api_keys="k")
    assert str(exc_info.value) == "api_keys must be a list of non-empty strings."


def test_unknown_route_is_a_json_not_found():
    app = _server_app()

    with app.test_client() as client:
        unprefixed = client.get("/models")
        wrong_method = client.get("/v1/stream")

    assert unprefixed.status_code == 404
    assert unprefixed.get_json() == {
        "error": {
            "type": "NotFoundError",
            "message": "No route for GET /models; the server serves POST /v1/stream, GET /v1/models"
            " and GET /v1/metrics.",
        }
    }
    # a known path with another method, which Flask alone would answer with a 405
    assert wrong_method.status_code == 404
    assert wrong_method.get_json() == {
        "error": {
            "type": "NotFoundError",
            "message": "No route for GET /v1/stream; the server serves POST /v1/stream, GET /v1/models"
            " and GET /v1/metrics.",
        }
    }

    # routes are case-sensitive, so a path that slips past the /v1/ key check names no route either
    with _server_app(api_keys=["secret"]).test_client() as client:
        uppercase = client.get("/V1/models")
    assert uppercase.status_code == 404
    assert uppercase.get_json() == {
        "error": {
            "type": "NotFoundError",
            "message": "No route for GET /V1/models; the server serves POST /v1/stream, GET /v1/models"
            " and GET /v1/metrics.",
        }
    }


@pytest.mark.asyncio
async def test_aborting_the_client_cancels_the_upstream_through_the_server(use_upstream, serve):
    upstream = SlowScriptedClient()
    use_upstream(lambda model: upstream)
    url = serve(_server_app())
    signal = AbortSignal()
    stream = _mmsp_client(url).streaming_response(_messages(), {}, signal)

    try:
        first = await anext(stream)
        assert first["content_items"] == [{"type": "text.delta", "text": "tick"}]

        signal.abort("stop")
        with pytest.raises(asyncio.CancelledError):
            await anext(stream)

        # the server only notices the closed connection when it next writes, at the next delta
        assert upstream.cleaned.wait(5)
    finally:
        upstream.stop.set()


@pytest.mark.asyncio
async def test_silent_upstream_is_kept_alive_with_comments_the_client_skips(
    monkeypatch: pytest.MonkeyPatch, use_upstream, serve
):
    monkeypatch.setattr(server, "KEEPALIVE_SECONDS", 0.05)
    script = [_delta({"type": "text.delta", "text": "Hello", "fidelity": {"item_id": "0"}}), _stop()]
    use_upstream(lambda model: SilentScriptedClient(script, model))
    app = _server_app()

    with app.test_client() as client:
        response = client.post("/v1/stream", json={"model": "gpt-5.5", "messages": _messages()})

    chunks = response.data.decode().split("\n\n")
    first_event = next(index for index, chunk in enumerate(chunks) if chunk.startswith("data: "))
    # half a second of silence at one comment every 50 ms; a loaded machine may write fewer
    assert first_event >= 2
    assert set(chunks[:first_event]) == {": keep-alive"}

    expected = [event async for event in ScriptedClient(script).streaming_response(_messages(), {})]
    actual = [event async for event in _mmsp_client(serve(app)).streaming_response(_messages(), {})]
    assert _strip(actual) == _strip(expected)


def test_load_server_config_resolves_environment_references(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, use_upstream, constructions
):
    monkeypatch.setenv("PROBE_BASE_URL", "https://probe.example/v1")
    monkeypatch.setenv("PROBE_UPSTREAM_KEY", "sk-probe")
    monkeypatch.setenv("PROBE_SERVER_KEY", "srv-probe")
    path = _write_config(
        tmp_path / "server.json",
        {
            "models": [
                _row("claude-sonnet-5-5", "claude", base_url="$PROBE_BASE_URL", api_key="$PROBE_UPSTREAM_KEY"),
                _row("gpt-5.5"),
                # the ids are names, read as written
                _row("$literal"),
            ],
            "api_keys": ["${PROBE_SERVER_KEY}", "second-key"],
        },
    )

    config = load_server_config(path)

    assert config == {
        "models": [
            _row("claude-sonnet-5-5", "claude", base_url="https://probe.example/v1", api_key="sk-probe"),
            _row("gpt-5.5"),
            _row("$literal"),
        ],
        "api_keys": ["srv-probe", "second-key"],
    }
    use_upstream(lambda model: ScriptedClient([], model))
    app = create_server_app(**config)
    with app.test_client() as client:
        response = client.get("/v1/models", headers={"Authorization": "Bearer srv-probe"})
    assert [model["id"] for model in response.get_json()["data"]] == ["claude", "gpt-5.5", "$literal"]
    assert constructions[0] == ("claude-sonnet-5-5", "openai-responses", "sk-probe", "https://probe.example/v1")


def test_load_server_config_refuses_an_unset_reference(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    path = tmp_path / "server.json"
    cases = [
        (
            {"models": [_row("gpt-5.5", api_key="$PROBE_UPSTREAM_KEY")]},
            "models[0].api_key references $PROBE_UPSTREAM_KEY",
        ),
        (
            {"models": [_row("gpt-5.5", base_url="${PROBE_BASE_URL}")]},
            "models[0].base_url references ${PROBE_BASE_URL}",
        ),
        ({"models": [_row("gpt-5.5")], "api_keys": ["$PROBE_SERVER_KEY"]}, "api_keys[0] references $PROBE_SERVER_KEY"),
    ]

    for config, reference in cases:
        _write_config(path, config)
        with pytest.raises(ValueError) as exc_info:
            load_server_config(path)
        assert str(exc_info.value) == f"{path}: {reference}, which is not set in the environment."

    # empty is as good as unset
    monkeypatch.setenv("PROBE_UPSTREAM_KEY", "")
    _write_config(path, cases[0][0])
    with pytest.raises(ValueError) as exc_info:
        load_server_config(path)
    assert str(exc_info.value) == (
        f"{path}: models[0].api_key references $PROBE_UPSTREAM_KEY, which is not set in the environment."
    )


def test_load_server_config_refuses_a_file_that_is_not_a_config(tmp_path: Path):
    path = tmp_path / "server.json"
    path.write_text("not json", encoding="utf-8")
    with pytest.raises(ValueError) as exc_info:
        load_server_config(path)
    assert str(exc_info.value).startswith(f"{path}: not valid JSON: ")

    for config, message in (
        ([], "the config must be a JSON object with a models list."),
        ({"models": [], "api_keys": "k"}, "api_keys must be a list."),
    ):
        _write_config(path, config)
        with pytest.raises(ValueError) as exc_info:
            load_server_config(path)
        assert str(exc_info.value) == f"{path}: {message}"

    # an empty table is create_server_app's to refuse
    assert load_server_config(_write_config(path, {"models": []})) == {"models": [], "api_keys": []}


def test_resolve_server_config_without_a_source_has_no_prefix(monkeypatch: pytest.MonkeyPatch):
    config = {"models": [_row("gpt-5.5", api_key="$PROBE_UPSTREAM_KEY")]}
    with pytest.raises(ValueError) as exc_info:
        resolve_server_config(config)
    assert (
        str(exc_info.value) == "models[0].api_key references $PROBE_UPSTREAM_KEY, which is not set in the environment."
    )

    monkeypatch.setenv("PROBE_UPSTREAM_KEY", "sk-probe")
    assert resolve_server_config(config) == {"models": [_row("gpt-5.5", api_key="sk-probe")], "api_keys": []}
    # the request body it came from is left as it was
    assert config == {"models": [_row("gpt-5.5", api_key="$PROBE_UPSTREAM_KEY")]}


def test_start_server_prints_the_base_url_the_models_and_whether_it_is_open(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], tmp_path: Path
):
    monkeypatch.setattr(Flask, "run", lambda self, **kwargs: None)
    models = [_row("claude-sonnet-5-5", "claude"), _row("gpt-5.5")]

    start_server(models, host="127.0.0.1", port=25999)
    assert capsys.readouterr().out == (
        "Starting MMSP server at http://127.0.0.1:25999/v1\n"
        "Serving models: claude, gpt-5.5\n"
        "Open server: api_keys is empty, every request is accepted\n"
    )

    start_server(models, api_keys=["k"], host="127.0.0.1", port=25999)
    assert capsys.readouterr().out == (
        "Starting MMSP server at http://127.0.0.1:25999/v1\nServing models: claude, gpt-5.5\n"
    )

    # a history file changes nothing printed, and a server that counted nothing writes none
    start_server(models, api_keys=["k"], host="127.0.0.1", port=25999, metrics_path=str(tmp_path / "m.json"))
    assert capsys.readouterr().out == (
        "Starting MMSP server at http://127.0.0.1:25999/v1\nServing models: claude, gpt-5.5\n"
    )
    assert not (tmp_path / "m.json").exists()


def test_announce_server_prints_the_three_lines(capsys: pytest.CaptureFixture[str]):
    announce_server("127.0.0.1", 25752, ["claude", "gpt-5.5"], True)
    assert capsys.readouterr().out == (
        "Starting MMSP server at http://127.0.0.1:25752/v1\n"
        "Serving models: claude, gpt-5.5\n"
        "Open server: api_keys is empty, every request is accepted\n"
    )

    announce_server("::1", 8080, ["claude"], False)
    assert capsys.readouterr().out == "Starting MMSP server at http://[::1]:8080/v1\nServing models: claude\n"


def test_server_base_url_brackets_an_ipv6_host():
    assert server_base_url("127.0.0.1", 25752) == "http://127.0.0.1:25752/v1"
    assert server_base_url("::1", 25752) == "http://[::1]:25752/v1"


def test_read_server_config_returns_the_file_as_written(tmp_path: Path):
    path = tmp_path / "server.json"
    config = {
        "models": [{"model_id": "gpt-5.5", "api_key": "$PROBE_UPSTREAM_KEY", "server_model_id": "gpt-5.5"}],
        "api_keys": ["${PROBE_SERVER_KEY}"],
        "host": "0.0.0.0",
        "port": 8080,
        "note": "kept",
    }
    _write_config(path, config)

    assert read_server_config(path) == config
    assert read_server_config(str(path)) == config
    with pytest.raises(FileNotFoundError):
        read_server_config(tmp_path / "missing.json")

    path.write_text("not json", encoding="utf-8")
    with pytest.raises(ValueError) as exc_info:
        read_server_config(path)
    assert str(exc_info.value).startswith(f"{path}: not valid JSON: ")
    for shape, message in (
        ([], "the config must be a JSON object with a models list."),
        ({"api_keys": []}, "the config must be a JSON object with a models list."),
        ({"models": [], "api_keys": "k"}, "api_keys must be a list."),
    ):
        _write_config(path, shape)
        with pytest.raises(ValueError) as exc_info:
            read_server_config(path)
        assert str(exc_info.value) == f"{path}: {message}"


def _metrics(app: Flask, headers: dict[str, str] | None = None) -> dict[str, Any]:
    with app.test_client() as client:
        response = client.get("/v1/metrics", headers=headers or {})
    assert response.status_code == 200
    return response.get_json()


_COUNTS = ("requests", "successes", "failures", "disconnects", "in_flight", "success_rate")
_NO_LATENCY = {"first_event": {"p50": None, "p90": None}, "total": {"p50": None, "p90": None}}
_NO_TOKENS = {"prompt": 0, "cached": 0, "thoughts": 0, "response": 0}
_OUTPUT = ("tokens_out", "thoughts", "response", "generation_ms", "tps")
# the window's sums and columns of the total, which alone count the refusals
_TOTAL_SUMMARY = [*_COUNTS, "refused", *_OUTPUT, "latency_ms"]
_TOTAL_COLUMNS = [
    "requests",
    "successes",
    "failures",
    "disconnects",
    "refused",
    *_OUTPUT,
    "p50",
    "p90",
    "first_event_p50",
    "first_event_p90",
]
_WINDOW_ERROR = "window must be an integer number of seconds from 10 to 5184000."
_RANGE_ERROR = "from and to must be unix seconds, from before to and at most 5184000 seconds apart."
_QUERY_ERROR = "window cannot be combined with from and to."
_COLUMNS_ERROR = "columns must be an integer from 1 to 1440."


def _counts(series: dict[str, Any]) -> dict[str, Any]:
    return {name: series[name] for name in _COUNTS}


def test_metrics_count_a_success_with_its_latency_and_tokens(use_upstream):
    script = [_delta({"type": "text.delta", "text": "Hi", "fidelity": {"item_id": "0"}}), _stop()]
    use_upstream(lambda model: ScriptedClient(script, model))
    app = _server_app([_row("claude-sonnet-5-5", "claude"), _row("gpt-5.5")])
    before = _metrics(app)

    with app.test_client() as client:
        response = client.post("/v1/stream", json={"model": "claude", "messages": _messages()})
        assert _sse_events(response.data)[-1] == "[DONE]"
        created = client.get("/v1/models").get_json()["data"][0]["created"]
    metrics = _metrics(app)

    assert list(metrics) == [
        "started_at",
        "since",
        "uptime_s",
        *_COUNTS,
        "latency_ms",
        "tokens",
        "tokens_out",
        "generation_ms",
        "tps",
        "refused",
        "last_request_at",
        "errors",
        "models",
    ]
    assert (before["requests"], before["last_request_at"]) == (0, None)
    assert metrics["started_at"] == created
    # a store without a history file begins its history when it starts
    assert metrics["since"] == metrics["started_at"]
    assert metrics["uptime_s"] >= 0
    claude, gpt = metrics["models"]
    assert list(claude) == [
        "id",
        *_COUNTS,
        "latency_ms",
        "tokens",
        "tokens_out",
        "generation_ms",
        "tps",
        "last_request_at",
        "last_outcome",
        "last_error",
    ]
    for series in (metrics, claude):
        assert _counts(series) == {
            "requests": 1,
            "successes": 1,
            "failures": 0,
            "disconnects": 0,
            "in_flight": 0,
            "success_rate": 1.0,
        }
        first_event, total = series["latency_ms"]["first_event"], series["latency_ms"]["total"]
        assert first_event["p50"] == first_event["p90"]
        assert total["p50"] == total["p90"]
        assert 0 <= first_event["p50"] <= total["p50"]
        assert series["tokens"] == {"prompt": 3, "cached": 0, "thoughts": 0, "response": 5}
        assert series["tokens_out"] == 5
        assert series["generation_ms"] >= 1
        assert series["tps"] == int(5 * 10000 / series["generation_ms"] + 0.5) / 10
    assert (claude["id"], claude["last_outcome"], claude["last_error"]) == ("claude", "success", None)
    assert isinstance(claude["last_request_at"], float)
    assert claude["last_request_at"] == metrics["last_request_at"]
    assert metrics["refused"] == {"unauthorized": 0, "invalid_request": 0, "unknown_model": 0}
    assert metrics["errors"] == []
    # every row is reported from the start, with nothing counted
    assert gpt == {
        "id": "gpt-5.5",
        "requests": 0,
        "successes": 0,
        "failures": 0,
        "disconnects": 0,
        "in_flight": 0,
        "success_rate": None,
        "latency_ms": _NO_LATENCY,
        "tokens": _NO_TOKENS,
        "tokens_out": 0,
        "generation_ms": 0,
        "tps": None,
        "last_request_at": None,
        "last_outcome": None,
        "last_error": None,
    }


def test_metrics_count_a_failure_with_its_error(use_upstream):
    scripts = {
        "gpt-5.5": [
            _delta({"type": "text.delta", "text": "Hel", "fidelity": {"item_id": "0"}}),
            RuntimeError("connection reset"),
        ],
        "claude-sonnet-5-5": [_delta({"type": "text.delta", "text": "Hi", "fidelity": {"item_id": "0"}}), _stop()],
    }
    use_upstream(lambda model: ScriptedClient(scripts[model], model))
    app = _server_app([_row("gpt-5.5"), _row("claude-sonnet-5-5", "claude")])

    with app.test_client() as client:
        for model in ("gpt-5.5", "claude"):
            response = client.post("/v1/stream", json={"model": model, "messages": _messages()})
            assert _sse_events(response.data)[-1] == "[DONE]"
    metrics = _metrics(app)

    gpt, claude = metrics["models"]
    assert _counts(gpt) == {
        "requests": 1,
        "successes": 0,
        "failures": 1,
        "disconnects": 0,
        "in_flight": 0,
        "success_rate": 0.0,
    }
    assert gpt["latency_ms"] == _NO_LATENCY
    assert gpt["tokens"] == _NO_TOKENS
    assert gpt["tokens_out"] == 0
    assert gpt["tps"] is None
    assert gpt["last_outcome"] == "failure"
    assert list(gpt["last_error"]) == ["at", "message"]
    assert gpt["last_error"]["message"] == "connection reset"
    assert isinstance(gpt["last_error"]["at"], float)
    assert metrics["errors"] == [{"at": gpt["last_error"]["at"], "model": "gpt-5.5", "message": "connection reset"}]
    assert (claude["success_rate"], claude["last_error"]) == (1.0, None)
    assert _counts(metrics) == {
        "requests": 2,
        "successes": 1,
        "failures": 1,
        "disconnects": 0,
        "in_flight": 0,
        "success_rate": 0.5,
    }
    assert metrics["tokens"] == claude["tokens"]


@pytest.mark.asyncio
async def test_metrics_count_a_disconnect_apart_from_failures(use_upstream, serve):
    upstream = SlowScriptedClient()
    use_upstream(lambda model: upstream)
    app = _server_app()
    signal = AbortSignal()
    stream = _mmsp_client(serve(app)).streaming_response(_messages(), {}, signal)

    try:
        await anext(stream)
        assert _counts(_metrics(app))["in_flight"] == 1

        signal.abort("stop")
        with pytest.raises(asyncio.CancelledError):
            await anext(stream)
        assert upstream.cleaned.wait(5)
        # the server counts the disconnect once its generator is closed, just after the upstream's
        for _ in range(250):
            metrics = _metrics(app)
            if metrics["disconnects"]:
                break
            await asyncio.sleep(0.02)
    finally:
        upstream.stop.set()

    model = metrics["models"][0]
    for series in (metrics, model):
        assert _counts(series) == {
            "requests": 1,
            "successes": 0,
            "failures": 0,
            "disconnects": 1,
            "in_flight": 0,
            "success_rate": None,
        }
        assert series["latency_ms"] == _NO_LATENCY
    assert (model["last_outcome"], model["last_error"]) == ("disconnect", None)


def test_metrics_count_refusals_without_touching_the_models(use_upstream):
    use_upstream(lambda model: ScriptedClient([], model))
    app = _server_app(api_keys=["secret"])
    key = {"Authorization": "Bearer secret"}

    with app.test_client() as client:
        assert client.post("/v1/stream", json={"model": "gpt-5.5", "messages": []}).status_code == 401
        assert client.post("/v1/stream", json={}, headers=key).status_code == 400
        assert client.post("/v1/stream", json={"model": "gpt-4", "messages": []}, headers=key).status_code == 404
    metrics = _metrics(app, key)

    assert metrics["refused"] == {"unauthorized": 1, "invalid_request": 1, "unknown_model": 1}
    assert _counts(metrics) == {
        "requests": 0,
        "successes": 0,
        "failures": 0,
        "disconnects": 0,
        "in_flight": 0,
        "success_rate": None,
    }
    assert metrics["last_request_at"] is None
    assert (metrics["models"][0]["requests"], metrics["models"][0]["last_outcome"]) == (0, None)


def test_metrics_percentiles_are_nearest_rank_over_the_last_thousand():
    moment = [0.0]
    metrics = ServerMetrics(["m"], now=lambda: moment[0], clock=lambda: 1790000000.1234)

    def request(first_event_ms: int, total_ms: int) -> None:
        moment[0] = 0.0
        sample = metrics.begin("m")
        moment[0] = first_event_ms / 1000
        metrics.first_event(sample)
        moment[0] = total_ms / 1000
        # a later event is not the first, and a request ends once
        metrics.first_event(sample)
        metrics.finish(sample, "success")
        metrics.finish(sample, "failure", error="late")

    for total_ms in range(100, 1001, 100):
        request(total_ms // 2, total_ms)
    snapshot = metrics.snapshot()

    assert snapshot["latency_ms"] == {"first_event": {"p50": 250, "p90": 450}, "total": {"p50": 500, "p90": 900}}
    assert snapshot["models"][0]["latency_ms"] == snapshot["latency_ms"]
    assert (snapshot["successes"], snapshot["failures"]) == (10, 0)
    assert (snapshot["started_at"], snapshot["uptime_s"], snapshot["last_request_at"]) == (
        1790000000,
        0,
        1790000000.123,
    )

    for _ in range(LATENCY_WINDOW):
        request(5, 10)
    snapshot = metrics.snapshot()

    # the first ten fell out of the window
    assert snapshot["latency_ms"] == {"first_event": {"p50": 5, "p90": 5}, "total": {"p50": 10, "p90": 10}}
    assert snapshot["successes"] == 1010


def test_metrics_sum_output_tokens_and_tps_over_generation_time():
    moment = [0.0]
    metrics = ServerMetrics(["m"], now=lambda: moment[0], clock=lambda: 1790000000.0 + moment[0])

    def request(begin: float, first_event: float, end: float, usage: dict[str, int]) -> None:
        moment[0] = begin
        sample = metrics.begin("m")
        moment[0] = first_event
        metrics.first_event(sample)
        moment[0] = end
        metrics.finish(sample, "success", usage=usage)

    request(0.0, 0.5, 2.5, {"thoughts_tokens": 20, "response_tokens": 80})
    # its first event is its stop event: a generation of 0 ms, counted as 1 ms
    request(3.0, 3.2, 3.2, {"response_tokens": 5})
    snapshot = metrics.snapshot()
    total = metrics.window(60)["total"]

    for series in (snapshot, snapshot["models"][0]):
        assert series["tokens"] == {"prompt": 0, "cached": 0, "thoughts": 20, "response": 85}
        assert (series["tokens_out"], series["generation_ms"], series["tps"]) == (105, 2001, 52.5)
    assert {name: total[name] for name in _OUTPUT} == {
        "tokens_out": 105,
        "thoughts": 20,
        "response": 85,
        "generation_ms": 2001,
        "tps": 52.5,
    }
    # both requests began in the bucket of 1790000000, the last of the six
    assert {name: total["series"][name] for name in _OUTPUT} == {
        "tokens_out": [0, 0, 0, 0, 0, 105],
        "thoughts": [0, 0, 0, 0, 0, 20],
        "response": [0, 0, 0, 0, 0, 85],
        "generation_ms": [0, 0, 0, 0, 0, 2001],
        "tps": [None, None, None, None, None, 52.5],
    }

    moment[0] = 15.0
    assert metrics.window(60)["total"]["series"]["tps"] == [None, None, None, None, 52.5, None]


def test_metrics_window_counts_a_request_in_the_bucket_it_began_in():
    wall = [1790000005.0]
    metrics = ServerMetrics(["m"], now=lambda: wall[0], clock=lambda: wall[0])

    sample = metrics.begin("m")
    wall[0] = 1790000017.0
    metrics.first_event(sample)
    metrics.finish(sample, "success", usage={"response_tokens": 7})
    window = metrics.window(60)

    assert list(window) == ["seconds", "bucket_s", "start", "end", "total", "models", "previous"]
    # the current bucket ends the window, which covers the whole minute, before the history included
    assert (window["seconds"], window["bucket_s"], window["start"], window["end"]) == (60, 10, 1789999960, 1790000020)
    total, model = window["total"], window["models"][0]
    assert list(total) == [*_TOTAL_SUMMARY, "series"]
    assert list(total["series"]) == _TOTAL_COLUMNS
    assert list(model) == ["id", *(name for name in _TOTAL_SUMMARY if name != "refused"), "series"]
    assert list(model["series"]) == [name for name in _TOTAL_COLUMNS if name != "refused"]
    assert model["id"] == "m"
    for series in (total["series"], model["series"]):
        assert series["requests"] == [0, 0, 0, 0, 1, 0]
        assert series["successes"] == [0, 0, 0, 0, 1, 0]
        assert series["tokens_out"] == [0, 0, 0, 0, 7, 0]
        assert series["thoughts"] == [0, 0, 0, 0, 0, 0]
        assert series["response"] == [0, 0, 0, 0, 7, 0]
        assert series["p90"] == [None, None, None, None, 12000, None]
    assert total["series"]["refused"] == [0, 0, 0, 0, 0, 0]
    assert total["in_flight"] == 0
    assert total["latency_ms"] == {"first_event": {"p50": 12000, "p90": 12000}, "total": {"p50": 12000, "p90": 12000}}
    assert window["previous"] is None


def test_metrics_window_slices_the_range_and_reports_the_previous_window():
    wall = [1790000000.0]
    metrics = ServerMetrics(["m"], now=lambda: wall[0], clock=lambda: wall[0])

    for minute in range(30):
        wall[0] = 1790000001.0 + 60 * minute
        sample = metrics.begin("m")
        metrics.first_event(sample)
        metrics.finish(sample, "success")
    five = metrics.window(300)
    hour = metrics.window(3600)

    assert len(five["total"]["series"]["requests"]) == 30
    assert sum(five["total"]["series"]["requests"]) == five["total"]["requests"] == 5
    assert list(five["previous"]) == _TOTAL_SUMMARY
    assert five["previous"]["requests"] == 5
    # the hour before the end began before the history, so it has no hour to compare with
    assert hour["previous"] is None
    assert hour["start"] == hour["end"] - 3600
    assert len(hour["total"]["series"]["requests"]) == 360
    assert hour["total"]["requests"] == 30


def test_metrics_roll_ten_second_buckets_into_minutes_after_two_hours():
    wall = [1790000005.0]
    metrics = ServerMetrics(["m"], now=lambda: wall[0], clock=lambda: wall[0])

    metrics.finish(metrics.begin("m"), "success")
    late = metrics.begin("m")
    wall[0] += 7300
    metrics.finish(metrics.begin("m"), "success")

    # the bucket of 1790000000 is in the minute of 1789999980
    assert len(metrics._total.tiers[0]) == 1
    assert list(metrics._total.tiers[1]) == [1789999980]
    minute = metrics._total.tiers[1][1789999980]
    assert (minute.requests, minute.successes, minute.failures) == (2, 1, 0)
    assert list(metrics._models["m"].tiers[1]) == [1789999980]
    # the ten-second columns of the last two hours begin after that minute
    window = metrics.window(7200)
    assert (window["total"]["requests"], window["total"]["successes"], window["total"]["failures"]) == (1, 1, 0)

    # begun in a bucket that has since moved: counted into the minute that holds it now
    metrics.finish(late, "failure", error="late")
    assert minute.failures == 1
    old = metrics.between(1789999980, 1790000040)
    assert old["bucket_s"] == 60
    assert (old["total"]["series"]["requests"], old["total"]["series"]["failures"]) == ([2], [1])
    snapshot = metrics.snapshot()
    assert (snapshot["requests"], snapshot["successes"], snapshot["failures"]) == (3, 2, 1)


def test_metrics_roll_minutes_into_hours_and_thin_the_samples():
    moment = [0.0]
    wall = [1789999980.0]
    metrics = ServerMetrics(["m"], now=lambda: moment[0], clock=lambda: wall[0])

    # the six ten-second buckets of the minute of 1789999980, with latencies 1..20, 21..40, ..., 101..120 ms
    for step in range(6):
        wall[0] = 1789999980.0 + 10 * step
        for total_ms in range(20 * step + 1, 20 * step + 21):
            moment[0] = 0.0
            sample = metrics.begin("m")
            moment[0] = total_ms / 1000
            metrics.finish(sample, "success")
    wall[0] = 1789999980.0 + 7300
    metrics.refused("unknown_model")
    minute = metrics.between(1789999980, 1790000040, 1)

    assert minute["bucket_s"] == 60
    assert minute["total"]["series"]["requests"] == [120]
    # the nearest rank over 64 evenly spaced of the 120; all of them would give 108
    assert minute["total"]["series"]["p90"] == [107]
    assert len(metrics._total.tiers[1][1789999980].total_ms) == 64

    wall[0] = 1789999980.0 + 172800 + 3600
    metrics.refused("unknown_model")
    hour = metrics.between(1789999200, 1790002800, 1)

    assert 1789999980 not in metrics._total.tiers[1]
    assert metrics._total.tiers[2][1789999200].requests == 120
    assert (hour["bucket_s"], hour["total"]["series"]["requests"], hour["total"]["series"]["p90"]) == (
        3600,
        [120],
        [107],
    )


def test_metrics_pick_the_column_span_from_the_range_and_the_columns_asked():
    metrics = ServerMetrics(["m"], clock=lambda: 1790000000.0)
    # a history that began long ago, so that every range lies inside it
    metrics.since = 1780000000

    for args, bucket_s, columns in (
        ((900, 90), 10, 90),
        ((900, 30), 30, 30),
        ((3600, 90), 60, 60),
        ((21600, 90), 300, 72),
        ((86400, 90), 1200, 72),
        ((86400,), 300, 288),
        ((604800, 90), 7200, 84),
        ((2592000, 90), 43200, 60),
        # no span of at most 12 hours gives 30 columns of 30 days
        ((2592000, 30), 43200, 60),
    ):
        window = metrics.window(*args)
        assert (window["bucket_s"], len(window["total"]["series"]["requests"])) == (bucket_s, columns), args
        # the current column is the last one
        assert window["end"] == (1790000000 // bucket_s + 1) * bucket_s, args
        assert window["start"] == window["end"] - columns * bucket_s, args

    ten_days_ago = 1790000000 - 864000
    old = metrics.between(ten_days_ago, ten_days_ago + 3600, 90)
    # ten days back only hours are stored, so an hour's range has hour columns
    assert old["bucket_s"] == 3600
    assert old["start"] % 3600 == old["end"] % 3600 == 0
    assert old["start"] <= ten_days_ago < ten_days_ago + 3600 <= old["end"]
    assert len(old["total"]["series"]["requests"]) == (old["end"] - old["start"]) // 3600


def test_metrics_between_is_the_range_aligned_outward():
    wall = [1790000005.0]
    metrics = ServerMetrics(["m"], now=lambda: wall[0], clock=lambda: wall[0])

    metrics.finish(metrics.begin("m"), "success")
    wall[0] = 1790000200.0
    window = metrics.between(1790000005, 1790000125, 360)
    future = metrics.between(1790000300, 1790000400)

    assert (window["seconds"], window["bucket_s"], window["start"], window["end"]) == (120, 10, 1790000000, 1790000130)
    assert window["total"]["series"]["requests"] == [1, *[0] * 12]
    # the 130 seconds before it began before the history
    assert window["previous"] is None
    assert future["total"]["series"]["requests"] == [0] * 10
    assert future["previous"]["requests"] == 0


def test_metrics_window_percentiles_are_over_the_first_sixty_four_samples_of_a_bucket():
    moment = [0.0]
    metrics = ServerMetrics(["m"], now=lambda: moment[0], clock=lambda: 1790000000.0)

    for total_ms in range(1, 101):
        moment[0] = 0.0
        sample = metrics.begin("m")
        moment[0] = total_ms / 1000
        metrics.finish(sample, "success")
    window = metrics.window(10)

    # the nearest rank of 1..64
    assert window["total"]["series"]["requests"] == [100]
    assert window["total"]["series"]["p90"] == [58]
    assert window["total"]["latency_ms"]["total"]["p90"] == 58
    # the since-start percentiles keep every one of the hundred
    assert metrics.snapshot()["latency_ms"]["total"]["p90"] == 90


def test_metrics_refuse_a_bad_query():
    app = _server_app()

    with app.test_client() as client:
        for query, message in (
            ("window=abc", _WINDOW_ERROR),
            ("window=5", _WINDOW_ERROR),
            ("window=5184001", _WINDOW_ERROR),
            ("window=300&from=1&to=2", _QUERY_ERROR),
            ("from=1", _RANGE_ERROR),
            ("to=2", _RANGE_ERROR),
            ("from=2&to=1", _RANGE_ERROR),
            ("from=a&to=2", _RANGE_ERROR),
            ("from=1&to=5184002", _RANGE_ERROR),
            ("columns=0", _COLUMNS_ERROR),
            ("columns=1441", _COLUMNS_ERROR),
            ("columns=x", _COLUMNS_ERROR),
        ):
            response = client.get(f"/v1/metrics?{query}")
            assert response.status_code == 400, query
            assert response.get_json() == {"error": {"type": "InvalidRequestError", "message": message}}, query
        assert client.post("/v1/stream", json={"model": "nope", "messages": []}).status_code == 404
        response = client.get("/v1/metrics?window=300&columns=90")
        to = int(time.time())
        ranged = client.get(f"/v1/metrics?from={to - 3600}&to={to}")
        columns_only = client.get("/v1/metrics?columns=90")

    assert response.status_code == 200
    body = response.get_json()
    assert list(body) == [*_metrics(app), "window"]
    assert (body["window"]["seconds"], body["window"]["bucket_s"]) == (300, 10)
    assert len(body["window"]["total"]["series"]["requests"]) == 30
    assert sum(body["window"]["total"]["series"]["refused"]) == body["window"]["total"]["refused"] == 1
    assert ranged.status_code == 200
    assert ranged.get_json()["window"]["seconds"] == 3600
    # columns alone names no range
    assert columns_only.status_code == 200
    assert "window" not in columns_only.get_json()
    # a bad query is no refusal: refusals count stream requests
    assert body["refused"] == {"unauthorized": 0, "invalid_request": 0, "unknown_model": 1}


def test_metrics_keep_the_latest_hundred_errors():
    metrics = ServerMetrics(["m"])

    for i in range(125):
        metrics.finish(metrics.begin("m"), "failure", error=f"error {i}")
    errors = metrics.snapshot()["errors"]

    assert [entry["message"] for entry in errors] == [f"error {i}" for i in range(124, 24, -1)]
    assert {(tuple(entry), entry["model"]) for entry in errors} == {(("at", "model", "message"), "m")}


def test_metrics_require_the_key():
    app = _server_app(api_keys=["secret"])

    with app.test_client() as client:
        refused = client.get("/v1/metrics")
        root = client.get("/")
    metrics = _metrics(app, {"Authorization": "Bearer secret"})

    assert refused.status_code == 401
    assert metrics["refused"]["unauthorized"] == 1
    # the root serves nothing, and is outside /v1/, so it names no route rather than asking for the key
    assert root.status_code == 404
    assert root.get_json() == {
        "error": {
            "type": "NotFoundError",
            "message": "No route for GET /; the server serves POST /v1/stream, GET /v1/models and GET /v1/metrics.",
        }
    }


def test_create_server_app_exposes_its_metrics(tmp_path: Path):
    app = _server_app([_row("claude-sonnet-5-5", "claude"), _row("gpt-5.5")])

    metrics = app.config["MMSP_SERVER_METRICS"]

    assert isinstance(metrics, ServerMetrics)
    assert [model["id"] for model in metrics.snapshot()["models"]] == ["claude", "gpt-5.5"]
    # the object the routes count into, so what it reports is what GET /v1/metrics reports
    with app.test_client() as client:
        assert client.post("/v1/stream", json={"model": "nope", "messages": []}).status_code == 404
    assert metrics.snapshot()["refused"]["unknown_model"] == 1
    assert _metrics(app)["refused"] == metrics.snapshot()["refused"]

    # with a history file, the store keeps it, and writes it at close once it counted something
    path = tmp_path / "m.json"
    persisted = create_server_app([_row("gpt-5.5")], metrics_path=str(path))
    store = persisted.config["MMSP_SERVER_METRICS"]
    assert (metrics.path, store.path) == (None, str(path))
    with persisted.test_client() as client:
        assert client.post("/v1/stream", json={"model": "nope", "messages": []}).status_code == 404
    assert not path.exists()
    store.close()
    # the refusal, counted in the total's ten-second bucket
    assert [bucket[4] for _, bucket in read_history(path)["total"]["10"]] == [1]


def _fixed_clock() -> float:
    return 1790000000.0


def test_metrics_persist_their_history_and_a_new_server_continues_it(tmp_path: Path):
    path = tmp_path / "h.json"
    wall = [1790000000.0]
    metrics = ServerMetrics(["m"], now=lambda: wall[0], clock=lambda: wall[0], path=str(path), save_every_s=0)

    for outcome in ("success", "success", "failure"):
        sample = metrics.begin("m")
        metrics.first_event(sample)
        metrics.finish(sample, outcome, error="upstream down" if outcome == "failure" else None)
    metrics.save()
    text = path.read_text(encoding="utf-8")
    history = json.loads(text)

    # one line, compact, as the TypeScript server writes it, an integral moment as an integer
    assert text == json.dumps(history, ensure_ascii=False, separators=(",", ":")) + "\n"
    assert '"errors":[{"at":1790000000,"model":"m","message":"upstream down"}]' in text
    assert list(history) == ["version", "since", "saved_at", "errors", "total", "models"]
    assert (history["version"], history["since"], history["saved_at"]) == (1, 1790000000, 1790000000)
    assert list(history["total"]) == ["10", "60", "3600"]
    # requests, successes, failures, disconnects, refused, tokens_out, thoughts, response, generation_ms, samples
    assert history["total"]["10"] == [[1790000000, [3, 2, 1, 0, 0, 0, 0, 0, 2, [0, 0], [0, 0]]]]
    assert (history["total"]["60"], history["total"]["3600"]) == ([], [])
    assert list(history["models"]) == ["m"]
    assert history["models"]["m"] == history["total"]

    # nothing changed since the last write, so nothing is written
    path.unlink()
    metrics.save()
    assert not path.exists()

    path.write_text(text, encoding="utf-8")
    wall[0] += 600
    again = ServerMetrics(["m"], now=lambda: wall[0], clock=lambda: wall[0], path=str(path), save_every_s=0)
    snapshot = again.snapshot()

    assert (again.since, again.started_at) == (1790000000, 1790000600)
    # the since-start counters are this run's, the history and its errors continue
    assert (snapshot["started_at"], snapshot["since"], snapshot["requests"]) == (1790000600, 1790000000, 0)
    assert snapshot["errors"] == [{"at": 1790000000, "model": "m", "message": "upstream down"}]
    assert again.window(3600)["total"]["requests"] == 3

    again.finish(again.begin("m"), "success")
    again.close()
    again.close()
    assert [start for start, _ in read_history(path)["total"]["10"]] == [1790000000, 1790000600]


def test_metrics_history_that_cannot_be_read_starts_fresh_and_says_so(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    path = tmp_path / "h.json"
    path.write_text("not json", encoding="utf-8")

    metrics = ServerMetrics(["m"], clock=_fixed_clock, path=str(path), save_every_s=0)

    out = capsys.readouterr().out
    assert out.startswith(f"Metrics history at {path} could not be read (not valid JSON: ")
    assert out.endswith("; starting fresh.\n")
    assert out.count("\n") == 1
    assert metrics.since == metrics.started_at
    assert ServerMetrics.from_history(path) is None

    valid = {"version": 1, "since": 0, "errors": [], "total": {"10": [], "60": [], "3600": []}, "models": {}}
    bucket = [1, 1, 0, 0, 0, 0, 0, 0, 1, [5], [3]]
    for shape in (
        {"version": 2},
        [],
        {**valid, "version": True},
        {**valid, "total": {"10": [], "60": []}},
        {**valid, "errors": [{"at": 1}]},
        {**valid, "total": {**valid["total"], "10": [[0, bucket[:10]]]}},
        {**valid, "models": {"m": {**valid["total"], "10": [[0, [-1, *bucket[1:]]]]}}},
    ):
        path.write_text(json.dumps(shape), encoding="utf-8")
        with pytest.raises(ValueError) as exc_info:
            read_history(path)
        assert str(exc_info.value) == "not a version 1 metrics history", shape
    fresh = ServerMetrics(["m"], clock=_fixed_clock, path=str(path), save_every_s=0)
    assert capsys.readouterr().out == (
        f"Metrics history at {path} could not be read (not a version 1 metrics history); starting fresh.\n"
    )

    # the next write replaces the file
    fresh.finish(fresh.begin("m"), "success")
    fresh.save()
    assert [stored[0] for _, stored in read_history(path)["total"]["10"]] == [1]
    assert ServerMetrics.from_history(tmp_path / "missing.json") is None
    history = ServerMetrics.from_history(path, clock=_fixed_clock)
    assert history is not None
    assert (history.path, history.since) == (None, 1790000000)
    assert history.window(3600)["total"]["requests"] == 1
    assert history.snapshot()["models"] == []
    assert capsys.readouterr().out == ""


def test_metrics_thin_the_samples_of_a_history_on_reading(tmp_path: Path):
    path = tmp_path / "h.json"
    samples = list(range(1, 121))
    total = {"10": [[1790000000, [120, 120, 0, 0, 0, 0, 0, 0, 120, samples, samples[:5]]]], "60": [], "3600": []}
    history = {"version": 1, "since": 1790000000, "saved_at": 1790000000, "errors": [], "total": total, "models": {}}
    path.write_text(json.dumps(history), encoding="utf-8")

    metrics = ServerMetrics(["m"], clock=_fixed_clock, path=str(path), save_every_s=0)

    bucket = metrics._total.tiers[0][1790000000]
    assert (len(bucket.total_ms), bucket.first_event_ms) == (64, [1, 2, 3, 4, 5])
    assert metrics.window(10)["total"]["series"]["p90"] == [107]


def test_metrics_keep_a_removed_models_history_in_the_file(tmp_path: Path):
    path = str(tmp_path / "h.json")
    first = ServerMetrics(["m", "n"], clock=_fixed_clock, path=path, save_every_s=0)
    for model_id in ("m", "n", "n"):
        first.finish(first.begin(model_id), "success")
    first.close()

    without = ServerMetrics(["m"], clock=_fixed_clock, path=path, save_every_s=0)
    window = without.window(3600)

    assert [model["id"] for model in window["models"]] == ["m"]
    assert window["total"]["requests"] == 3
    without.finish(without.begin("m"), "success")
    without.close()
    # the table's series first, then the ones it no longer serves
    assert list(read_history(path)["models"]) == ["m", "n"]

    back = ServerMetrics(["n", "m"], clock=_fixed_clock, path=path, save_every_s=0)
    assert [(model["id"], model["requests"]) for model in back.window(3600)["models"]] == [("n", 2), ("m", 2)]


def test_metrics_drop_what_is_older_than_sixty_days():
    wall = [1790000000.0]
    metrics = ServerMetrics(["m"], now=lambda: wall[0], clock=lambda: wall[0])

    metrics.finish(metrics.begin("m"), "success")
    wall[0] += RETENTION_S + 3600
    metrics.refused("unknown_model")

    assert [list(tier) for tier in metrics._total.tiers] == [[int(wall[0]) // 10 * 10], [], []]
    assert [list(tier) for tier in metrics._models["m"].tiers] == [[], [], []]
    window = metrics.window(RETENTION_S)
    assert (window["total"]["requests"], window["total"]["refused"]) == (0, 1)
    assert metrics.snapshot()["requests"] == 1
