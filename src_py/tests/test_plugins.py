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

"""Client plugins: where they are enabled and where their hooks run (MMSP-RFC-0009 §9)."""

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

import pytest
from stream_grammar import assert_stream_grammar

from mmsp import AutoLLMClient
from mmsp.plugin import ClientPlugin, enabled_plugins


class _Hosts(ClientPlugin):
    hosts = ("example.ai",)


class _Models(ClientPlugin):
    models = r"gpt-6"


class _Both(ClientPlugin):
    hosts = ("example.ai",)
    models = r"gpt-6"


class _Neither(ClientPlugin):
    pass


@pytest.mark.parametrize(
    ("model", "base_url", "expected"),
    [
        ("gpt-6", "https://example.ai/v1", [_Hosts, _Models, _Both]),
        # a host matches its subdomains too, and a model pattern ignores case
        ("GPT-6-Luna", "https://api.example.ai/v1", [_Hosts, _Models, _Both]),
        ("gpt-5.5", "https://api.example.ai/v1", [_Hosts]),
        ("openai/gpt-6.1-sol", "https://gateway.test/v1", [_Models]),
        # a host is matched whole, never as a substring of another
        ("gpt-5.5", "https://notexample.ai/v1", []),
        ("gpt-5.5", "https://example.ai.evil.test/v1", []),
    ],
)
def test_a_plugin_is_enabled_where_every_condition_it_declares_matches(
    model: str, base_url: str, expected: list[type[ClientPlugin]]
):
    plugins = enabled_plugins((_Hosts, _Models, _Both, _Neither), model, base_url, sdk=None)
    assert [type(plugin) for plugin in plugins] == expected
    assert all((plugin.model, plugin.base_url) == (model, base_url) for plugin in plugins)


@pytest.mark.parametrize(
    ("model", "base_url", "client_type", "expected"),
    [
        ("mistral-medium-latest", "https://api.mistral.ai/v1", "openai-chat", ["MistralPlugin"]),
        ("z-ai/glm-5.3", "https://openrouter.ai/api/v1", "openai-chat", ["OpenRouterPlugin"]),
        ("openai/gpt-6-luna", "https://openrouter.ai/api/v1", "openai-chat", ["OpenRouterPlugin", "GptPlugin"]),
        ("anthropic/claude-sonnet-5", "https://openrouter.ai/api", "ant-messages", ["OpenRouterPlugin"]),
        ("openai/gpt-6.1-terra", "https://openrouter.ai/api/v1", "openai-responses", ["GptPlugin"]),
        ("qwen3.8-flash", "https://tokendance.space/gateway/v1", "openai-responses", []),
        ("glm-5.3", "https://api.test.invalid/v1", "openai-chat", []),
    ],
)
def test_a_client_builds_the_plugins_its_endpoint_and_model_match(
    model: str, base_url: str, client_type: str, expected: list[str]
):
    client = AutoLLMClient(model=model, api_key="test-key", base_url=base_url, client_type=client_type)
    assert [type(plugin).__name__ for plugin in client._client._plugins] == expected  # noqa: SLF001


def test_an_official_client_has_no_plugins():
    client = AutoLLMClient(model="gpt-6-luna", api_key="test-key")
    assert client._client._plugins == ()  # noqa: SLF001


class _FakeStream:
    def __init__(self, chunks: list[Any]) -> None:
        self._chunks = iter(chunks)

    async def __aenter__(self) -> "_FakeStream":
        return self

    async def __aexit__(self, *_exc_info: object) -> None:
        return None

    def __aiter__(self) -> AsyncIterator[Any]:
        return self

    async def __anext__(self) -> Any:
        try:
            return next(self._chunks)
        except StopIteration:
            raise StopAsyncIteration from None


def _chunk(content: str | None, finish_reason: str | None = None, usage: Any = None) -> SimpleNamespace:
    delta = SimpleNamespace(content=content, tool_calls=None)
    return SimpleNamespace(choices=[SimpleNamespace(delta=delta, finish_reason=finish_reason)], usage=usage)


def _usage(completion_tokens: int, reasoning_tokens: int) -> SimpleNamespace:
    return SimpleNamespace(
        prompt_tokens=5,
        completion_tokens=completion_tokens,
        prompt_tokens_details=None,
        completion_tokens_details=SimpleNamespace(reasoning_tokens=reasoning_tokens),
    )


def _install(client: AutoLLMClient, chunks: list[Any], calls: list[str]) -> None:
    async def create(**kwargs: Any) -> _FakeStream:
        calls.append(f"create:{kwargs.get('marked')}")
        return _FakeStream(chunks)

    client._client._client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))  # noqa: SLF001


class _Recorder(ClientPlugin):
    models = r"."

    def __init__(self, calls: list[str]) -> None:
        super().__init__("glm-5.3", "https://api.test.invalid/v1", None)
        self.calls = calls

    async def on_request(self, config: Any, request: dict[str, Any]) -> None:
        self.calls.append(f"on_request:{len(request['messages'])}")
        request["marked"] = True

    def on_wire_event(self, wire_event: Any) -> None:
        self.calls.append(f"on_wire_event:{wire_event.choices[0].delta.content}")
        wire_event.choices[0].delta.content = (wire_event.choices[0].delta.content or "").upper() or None

    def on_event(self, event: Any) -> None:
        texts = [item["text"] for item in event["content_items"] if item["type"] == "text.delta"]
        self.calls.append(f"on_event:{''.join(texts)}")


@pytest.mark.asyncio
async def test_the_hooks_run_before_the_request_before_the_event_transform_and_after_it():
    calls: list[str] = []
    client = AutoLLMClient(
        model="glm-5.3", api_key="test-key", base_url="https://api.test.invalid/v1", client_type="openai-chat"
    )
    client._client._plugins = (_Recorder(calls),)  # noqa: SLF001
    _install(client, [_chunk("hi"), _chunk(None, "stop", _usage(1, 0))], calls)

    events = [
        event
        async for event in client.streaming_response(
            messages=[{"role": "user", "content_items": [{"type": "text.done", "text": "Hello"}]}], config={}
        )
    ]
    assert_stream_grammar(events)
    # the request the plugin changed is the one sent, and the event transform reads the wire event
    # the plugin changed
    assert calls == [
        "on_request:1",
        "create:True",
        "on_wire_event:hi",
        "on_event:HI",
        "on_wire_event:None",
        "on_event:",
    ]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("base_url", "expected"), [("https://openrouter.ai/api/v1", 4), ("https://api.test.invalid/v1", -2)]
)
async def test_openrouter_completion_tokens_without_the_reasoning_are_corrected(base_url: str, expected: int):
    client = AutoLLMClient(model="z-ai/glm-5.3", api_key="test-key", base_url=base_url, client_type="openai-chat")
    _install(client, [_chunk("hi"), _chunk(None, "stop", _usage(completion_tokens=4, reasoning_tokens=6))], [])

    events = [
        event
        async for event in client.streaming_response(
            messages=[{"role": "user", "content_items": [{"type": "text.done", "text": "Hello"}]}], config={}
        )
    ]
    assert events[-1]["usage_metadata"]["response_tokens"] == expected


@pytest.mark.asyncio
async def test_mistral_takes_no_empty_reasoning_field_on_a_tool_calling_turn():
    client = AutoLLMClient(
        model="mistral-medium-latest",
        api_key="test-key",
        base_url="https://api.mistral.ai/v1",
        client_type="openai-chat",
    )
    request = {
        "messages": [
            {"role": "user", "content": [{"type": "text", "text": "Weather?"}]},
            {"role": "assistant", "tool_calls": [{"id": "call_1"}], "reasoning_content": "", "reasoning": ""},
        ]
    }
    for plugin in client._client._plugins:  # noqa: SLF001
        await plugin.on_request({}, request)

    assert request["messages"][1] == {"role": "assistant", "tool_calls": [{"id": "call_1"}]}
    assert "reasoning_effort" not in request
