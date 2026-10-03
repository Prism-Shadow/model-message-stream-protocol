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
from typing import Any, AsyncIterator, Callable

import pytest
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
from mmsp.integration.server import create_server_app
from mmsp.types import ContentItem, UniConfig, UniEvent, UniMessage


# Every client the server routes to here is a scripted one, so nothing reaches a vendor; the
# environment still decides what /v1/models lists and whether the server wants a key.
_SERVER_ENV = [
    "CLIENT_TYPE",
    "MMSP_SERVER_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "ZAI_API_KEY",
    "MOONSHOT_API_KEY",
    "DEEPSEEK_API_KEY",
    "MINIMAX_API_KEY",
]

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


class FailingListClient(ScriptedClient):
    async def list_models(self) -> list[str]:
        raise RuntimeError("401 unauthorized")


@pytest.fixture(autouse=True)
def _controlled_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in _SERVER_ENV:
        monkeypatch.delenv(name, raising=False)
    # the client under test reaches the local server directly, whatever proxy the environment names
    monkeypatch.setenv("no_proxy", "127.0.0.1")


@pytest.fixture
def constructions() -> list[tuple[str, str | None]]:
    """The (model, client_type) of every client the server constructed."""
    return []


@pytest.fixture
def route_to(monkeypatch: pytest.MonkeyPatch, constructions: list[tuple[str, str | None]]):
    """Routes every model the server is asked for to the client `upstream(model)` builds."""

    def patch(upstream: Callable[[str], LLMClient]) -> None:
        def fake_auto_client(model: str, client_type: str | None = None) -> LLMClient:
            constructions.append((model, client_type))
            return upstream(model)

        monkeypatch.setattr(server, "AutoLLMClient", fake_auto_client)

    return patch


@pytest.fixture
def serve():
    """Serves an app on a free local port and returns its base URL."""
    http_servers = []

    def start(app) -> str:
        http_server = make_server("127.0.0.1", 0, app, threaded=True)
        threading.Thread(target=http_server.serve_forever, daemon=True).start()
        http_servers.append(http_server)
        return f"http://127.0.0.1:{http_server.server_port}"

    yield start
    for http_server in http_servers:
        http_server.shutdown()
        http_server.server_close()


def _mmsp_client(url: str) -> AutoLLMClient:
    return AutoLLMClient(model="gpt-5.5", client_type="mmsp", base_url=url, api_key="test-key")


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
async def test_stream_through_the_server_equals_the_upstream_stream(case: StreamCase, route_to, serve):
    route_to(lambda model: ScriptedClient(case.script, model))
    url = serve(create_server_app())

    expected = [event async for event in ScriptedClient(case.script).streaming_response(_messages(), {})]
    actual = [event async for event in _mmsp_client(url).streaming_response(_messages(), {})]

    assert _strip(actual) == _strip(expected)
    assert _done_items(actual) == case.done_items
    assert_stream_grammar(actual)


@pytest.mark.asyncio
async def test_thinking_only_response_raises_the_upstream_empty_response_error(route_to, serve):
    script = [_delta({"type": "thinking.delta", "thinking": "Hmm.", "fidelity": {"item_id": "0"}}), _stop()]
    route_to(lambda model: ScriptedClient(script, model))
    url = serve(create_server_app())

    with pytest.raises(EmptyResponseError) as exc_info:
        async for _ in _mmsp_client(url).streaming_response(_messages(), {}):
            pass

    assert exc_info.value.client == "ScriptedClient"
    assert exc_info.value.finish_reason == "stop"
    assert exc_info.value.usage_metadata == USAGE
    assert str(exc_info.value) == str(await _direct_error(script, {}))


@pytest.mark.asyncio
async def test_unsupported_parameter_raises_the_upstream_unsupported_parameter_error(route_to, serve):
    script = [_delta({"type": "text.delta", "text": "Hi"}), _stop()]
    route_to(lambda model: ScriptedClient(script, model))
    url = serve(create_server_app())

    with pytest.raises(UnsupportedParameterError) as exc_info:
        async for _ in _mmsp_client(url).streaming_response(_messages(), {"temperature": 0.1}):
            pass

    assert exc_info.value.client == "ScriptedClient"
    assert exc_info.value.parameter == "temperature"
    assert str(exc_info.value) == "ScriptedClient does not support temperature."


@pytest.mark.asyncio
async def test_unparsable_tool_call_arguments_raise_the_upstream_parse_error(route_to, serve):
    script = [
        _delta({"type": "tool_call.delta", "name": "f", "arguments": '{"a":', "tool_call_id": "call_1"}),
        _stop("tool_call"),
    ]
    route_to(lambda model: ScriptedClient(script, model))
    url = serve(create_server_app())

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
async def test_other_upstream_failure_raises_an_upstream_error_after_the_deltas_before_it(route_to, serve):
    script = [
        _delta({"type": "text.delta", "text": "Hel", "fidelity": {"item_id": "0"}}),
        RuntimeError("connection reset"),
    ]
    route_to(lambda model: ScriptedClient(script, model))
    url = serve(create_server_app())

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
    app = create_server_app()

    with app.test_client() as client:
        if isinstance(body, str):
            response = client.post("/v1/stream", data=body, content_type="application/json")
        else:
            response = client.post("/v1/stream", json=body)

    assert response.status_code == 400
    assert response.get_json() == {"error": {"type": "InvalidRequestError", "message": message}}


def test_server_with_a_key_refuses_requests_without_it(route_to):
    route_to(lambda model: ScriptedClient([], model))
    app = create_server_app(api_key="secret")
    refusal = {"error": {"type": "AuthenticationError", "message": "Invalid or missing API key."}}

    with app.test_client() as client:
        missing = client.post("/v1/stream", json={"model": "gpt-5.5", "messages": []})
        wrong = client.get("/v1/models", headers={"Authorization": "Bearer guess"})
        right = client.get("/v1/models", headers={"Authorization": "Bearer secret"})

    assert (missing.status_code, missing.get_json()) == (401, refusal)
    assert (wrong.status_code, wrong.get_json()) == (401, refusal)
    assert right.status_code == 200


def test_server_reads_its_key_from_the_environment(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("MMSP_SERVER_API_KEY", "secret")
    app = create_server_app()

    with app.test_client() as client:
        response = client.get("/v1/models")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_client_with_a_wrong_key_raises_an_upstream_error_with_the_status(route_to, serve):
    route_to(lambda model: ScriptedClient([], model))
    url = serve(create_server_app(api_key="secret"))

    with pytest.raises(UpstreamError) as exc_info:
        async for _ in _mmsp_client(url).streaming_response(_messages(), {}):
            pass

    assert exc_info.value.status == 401
    assert exc_info.value.error_type == "AuthenticationError"
    assert str(exc_info.value) == "Invalid or missing API key."


def test_model_of_no_known_family_is_refused_with_the_routing_error():
    app = create_server_app()

    with app.test_client() as client:
        response = client.post("/v1/stream", json={"model": "qwen3.6", "messages": _messages()})

    assert response.status_code == 400
    assert response.get_json()["error"]["type"] == "InvalidRequestError"
    assert "Pass client_type" in response.get_json()["error"]["message"]


def test_failing_stream_ends_with_an_error_event_then_the_done_marker(route_to):
    script = [
        _delta({"type": "text.delta", "text": "Hel", "fidelity": {"item_id": "0"}}),
        RuntimeError("connection reset"),
    ]
    route_to(lambda model: ScriptedClient(script, model))
    app = create_server_app()

    with app.test_client() as client:
        response = client.post("/v1/stream", json={"model": "gpt-5.5", "messages": _messages()})

    assert response.status_code == 200
    assert response.mimetype == "text/event-stream"
    events = _sse_events(response.data)
    assert json.loads(events[-2]) == {"error": {"type": "RuntimeError", "message": "connection reset"}}
    assert events[-1] == "[DONE]"


def test_server_refuses_to_route_to_an_mmsp_server(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("CLIENT_TYPE", "mmsp")

    with pytest.raises(ValueError, match="CLIENT_TYPE=mmsp"):
        create_server_app()


@pytest.mark.asyncio
async def test_models_lists_each_official_client_whose_key_the_environment_holds(
    monkeypatch: pytest.MonkeyPatch, route_to, constructions, serve
):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-openai")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant")
    route_to(lambda model: ScriptedClient([], model))
    app = create_server_app()
    expected = ["gpt--a", "gpt--b", "claude--a", "claude--b"]

    with app.test_client() as client:
        response = client.get("/v1/models")

    assert response.status_code == 200
    assert response.get_json() == {"models": expected}
    # built by family alone, so each listing keeps the ids that route to that client
    assert constructions == [("gpt-", None), ("claude-", None)]
    assert await _mmsp_client(serve(app)).list_models() == expected


@pytest.mark.asyncio
async def test_models_lists_the_endpoint_of_the_client_type_whole(
    monkeypatch: pytest.MonkeyPatch, route_to, constructions, serve
):
    monkeypatch.setenv("CLIENT_TYPE", "openai-chat")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-openai")
    route_to(lambda model: ScriptedClient([], model))
    app = create_server_app()

    with app.test_client() as client:
        response = client.get("/v1/models")

    assert response.get_json() == {"models": ["-a", "-b"]}
    assert constructions == [("", None)]
    assert await _mmsp_client(serve(app)).list_models() == ["-a", "-b"]


def test_models_without_any_vendor_key_is_empty(route_to):
    route_to(lambda model: ScriptedClient([], model))
    app = create_server_app()

    with app.test_client() as client:
        response = client.get("/v1/models")

    assert response.get_json() == {"models": []}


@pytest.mark.asyncio
async def test_failing_listing_is_a_bad_gateway(monkeypatch: pytest.MonkeyPatch, route_to, serve):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-openai")
    route_to(lambda model: FailingListClient([], model))
    app = create_server_app()

    with app.test_client() as client:
        response = client.get("/v1/models")

    assert response.status_code == 502
    assert response.get_json() == {"error": {"type": "RuntimeError", "message": "401 unauthorized"}}
    with pytest.raises(UpstreamError) as exc_info:
        await _mmsp_client(serve(app)).list_models()
    assert exc_info.value.status == 502
    assert exc_info.value.error_type == "RuntimeError"


@pytest.mark.asyncio
async def test_aborting_the_client_cancels_the_upstream_through_the_server(route_to, serve):
    upstream = SlowScriptedClient()
    route_to(lambda model: upstream)
    url = serve(create_server_app())
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
    monkeypatch: pytest.MonkeyPatch, route_to, serve
):
    monkeypatch.setattr(server, "KEEPALIVE_SECONDS", 0.05)
    script = [_delta({"type": "text.delta", "text": "Hello", "fidelity": {"item_id": "0"}}), _stop()]
    route_to(lambda model: SilentScriptedClient(script, model))
    app = create_server_app()

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
