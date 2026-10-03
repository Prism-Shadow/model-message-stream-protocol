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
from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncIterator, Callable

import pytest
from flask import Flask
from stream_grammar import assert_stream_grammar
from werkzeug.serving import make_server

from mmsp import (
    AutoLLMClient,
    EmptyResponseError,
    ToolCallArgumentParseError,
    UnsupportedParameterError,
    UpstreamError,
)
from mmsp.abort_signal import AbortSignal
from mmsp.base_client import LLMClient
from mmsp.integration import server
from mmsp.integration.server import (
    ModelRow,
    create_server_app,
    load_server_config,
    resolve_server_config,
    start_server,
)
from mmsp.types import ContentItem, UniConfig, UniEvent, UniMessage
from mmsp.wire import server_base_url


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
async def test_thinking_only_response_raises_the_upstream_empty_response_error(use_upstream, serve):
    script = [_delta({"type": "thinking.delta", "thinking": "Hmm.", "fidelity": {"item_id": "0"}}), _stop()]
    use_upstream(lambda model: ScriptedClient(script, model))
    url = serve(_server_app())

    with pytest.raises(EmptyResponseError) as exc_info:
        async for _ in _mmsp_client(url).streaming_response(_messages(), {}):
            pass

    assert exc_info.value.client == "ScriptedClient"
    assert exc_info.value.finish_reason == "stop"
    assert exc_info.value.usage_metadata == USAGE
    assert str(exc_info.value) == str(await _direct_error(script, {}))


@pytest.mark.asyncio
async def test_unsupported_parameter_raises_the_upstream_unsupported_parameter_error(use_upstream, serve):
    script = [_delta({"type": "text.delta", "text": "Hi"}), _stop()]
    use_upstream(lambda model: ScriptedClient(script, model))
    url = serve(_server_app())

    with pytest.raises(UnsupportedParameterError) as exc_info:
        async for _ in _mmsp_client(url).streaming_response(_messages(), {"temperature": 0.1}):
            pass

    assert exc_info.value.client == "ScriptedClient"
    assert exc_info.value.parameter == "temperature"
    assert str(exc_info.value) == "ScriptedClient does not support temperature."


@pytest.mark.asyncio
async def test_unparsable_tool_call_arguments_raise_the_upstream_parse_error(use_upstream, serve):
    script = [
        _delta({"type": "tool_call.delta", "name": "f", "arguments": '{"a":', "tool_call_id": "call_1"}),
        _stop("tool_call"),
    ]
    use_upstream(lambda model: ScriptedClient(script, model))
    url = serve(_server_app())

    with pytest.raises(ToolCallArgumentParseError) as exc_info:
        async for _ in _mmsp_client(url).streaming_response(_messages(), {}):
            pass

    direct = await _direct_error(script, {})
    assert exc_info.value.client == "ScriptedClient"
    assert exc_info.value.tool_name == "f"
    assert exc_info.value.tool_call_id == "call_1"
    assert exc_info.value.raw_arguments_preview == '{"a":'
    assert exc_info.value.raw_arguments_length == 5
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


@pytest.mark.parametrize("column", ["model_id", "base_url", "api_key", "server_model_id", "client_type"])
def test_row_with_a_missing_or_empty_column_refuses_to_start(column: str):
    missing = {name: value for name, value in _row("gpt-5.5").items() if name != column}
    empty = {**_row("gpt-5.5"), column: ""}

    for row in (missing, empty):
        with pytest.raises(ValueError) as exc_info:
            create_server_app([row])
        assert str(exc_info.value) == f"models[0]: {column} must be a non-empty string."


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
            "message": "No route for GET /models; the server serves POST /v1/stream and GET /v1/models.",
        }
    }
    # a known path with another method, which Flask alone would answer with a 405
    assert wrong_method.status_code == 404
    assert wrong_method.get_json() == {
        "error": {
            "type": "NotFoundError",
            "message": "No route for GET /v1/stream; the server serves POST /v1/stream and GET /v1/models.",
        }
    }

    # routes are case-sensitive, so a path that slips past the /v1/ key check names no route either
    with _server_app(api_keys=["secret"]).test_client() as client:
        uppercase = client.get("/V1/models")
    assert uppercase.status_code == 404
    assert uppercase.get_json() == {
        "error": {
            "type": "NotFoundError",
            "message": "No route for GET /V1/models; the server serves POST /v1/stream and GET /v1/models.",
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
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
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


def test_server_base_url_brackets_an_ipv6_host():
    assert server_base_url("127.0.0.1", 25752) == "http://127.0.0.1:25752/v1"
    assert server_base_url("::1", 25752) == "http://[::1]:25752/v1"
