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


import base64
import json
import threading
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import anthropic
import openai
import pytest

from mmsp import AutoLLMClient, PromptCaching, ThinkingLevel, UnsupportedParameterError
from mmsp.utils import prompt_cache_key


@dataclass
class BodyCase:
    name: str
    client_type: str
    model: str
    # None is the local server itself; a bedrock:// URL reaches it through ANTHROPIC_BEDROCK_BASE_URL
    base_url: str | None
    api_key: str
    config: dict[str, Any]
    # a None value means the body carries no such field
    expected: dict[str, Any]
    # fields the client leaves to the SDK, whose default for them differs between SDK versions
    unpinned: list[str] = field(default_factory=list)


# The SDK lines disagree on what reaches the request body: 1.0 dropped temperature from
# messages.create, and 2.0 moved Bedrock's default anthropic_version to the new API version.
BODY_CASES = [
    BodyCase(
        name="ant-messages-temperature",
        client_type="ant-messages",
        model="claude-sonnet-5",
        base_url=None,
        api_key="test-key",
        config={"temperature": 0.5},
        expected={"temperature": 0.5},
    ),
    BodyCase(
        name="ant-messages-default",
        client_type="ant-messages",
        model="claude-sonnet-5",
        base_url=None,
        api_key="test-key",
        config={},
        expected={"temperature": None},
    ),
    BodyCase(
        name="anthropic-official-api",
        client_type="anthropic-official",
        model="claude-sonnet-4-6",
        base_url=None,
        api_key="test-key",
        config={},
        expected={"anthropic_version": None},
    ),
    BodyCase(
        name="anthropic-official-bedrock-legacy-version",
        client_type="anthropic-official",
        model="global.anthropic.claude-sonnet-4-6",
        base_url="bedrock://us-east-1",
        api_key="AKIAEXAMPLE,secret-EXAMPLE",
        config={},
        expected={"anthropic_version": "bedrock-2023-05-31"},
    ),
    BodyCase(
        name="anthropic-official-bedrock-sdk-version",
        client_type="anthropic-official",
        model="global.anthropic.claude-opus-5-5",
        base_url="bedrock://us-east-1",
        api_key="AKIAEXAMPLE,secret-EXAMPLE",
        config={},
        expected={},
        unpinned=["anthropic_version"],
    ),
]


class _BodyHandler(BaseHTTPRequestHandler):
    """Records the JSON body of a request and refuses it, so no stream has to be parsed."""

    received_body: dict[str, Any] = {}

    def do_POST(self) -> None:  # noqa: N802 - the name is BaseHTTPRequestHandler's
        length = int(self.headers.get("Content-Length", "0"))
        type(self).received_body = json.loads(self.rfile.read(length) or b"{}")
        body = json.dumps({"type": "error", "error": {"type": "invalid_request_error", "message": "recorded"}})
        self.send_response(400)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body.encode())

    def log_message(self, *args: object) -> None:
        """Keep the request log out of the test output."""


@pytest.fixture
def body_server(monkeypatch: pytest.MonkeyPatch):
    for name in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL", "AWS_BEARER_TOKEN_BEDROCK"):
        monkeypatch.delenv(name, raising=False)
    server = ThreadingHTTPServer(("127.0.0.1", 0), _BodyHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_address[1]}"
    monkeypatch.setenv("ANTHROPIC_BEDROCK_BASE_URL", url)
    try:
        yield url
    finally:
        server.shutdown()
        server.server_close()


@pytest.mark.asyncio
@pytest.mark.parametrize("case", BODY_CASES, ids=[case.name for case in BODY_CASES])
async def test_request_body_on_every_sdk_version(case: BodyCase, body_server: str):
    _BodyHandler.received_body = {}
    client = AutoLLMClient(
        model=case.model, api_key=case.api_key, base_url=case.base_url or body_server, client_type=case.client_type
    )
    messages = [{"role": "user", "content_items": [{"type": "text.done", "text": "Hi"}]}]

    with pytest.raises(anthropic.BadRequestError):
        async for _ in client.streaming_response(messages=messages, config=case.config):
            pass

    body = _BodyHandler.received_body
    assert body["messages"]
    assert {name: body.get(name) for name in case.expected} == case.expected
    model_config = client._client.transform_uni_config_to_model_config(case.config)  # noqa: SLF001
    for name in case.unpinned:
        assert name not in model_config and name not in model_config.get("extra_body", {})


SESSION_ID = "8d2f0c4e-7a1b-4c3d-9e5f-0a1b2c3d4e5f"
# 65 characters go out as the SHA-256 hex digest of their UTF-8 bytes; 64 emoji, 128 UTF-16 units
# long, are 64 characters and go out as they are
LONG_SESSION_ID = "会" * 65
LONG_SESSION_KEY = "f3d8cc68018e7e0a0aa2c74cfddfc7515e10785943068732c6ed311eb6f074c5"
EMOJI_SESSION_ID = "😀" * 64


@dataclass
class SessionCase:
    name: str
    client_type: str
    model: str
    config: dict[str, Any]
    # the prompt_cache_key of the body; None means the body carries none
    expected: str | None


SESSION_CASES = [
    SessionCase("openai-official", "openai-official", "gpt-6-luna", {"session_id": SESSION_ID}, SESSION_ID),
    SessionCase(
        "openai-official-long", "openai-official", "gpt-6-luna", {"session_id": LONG_SESSION_ID}, LONG_SESSION_KEY
    ),
    SessionCase(
        "openai-official-emoji", "openai-official", "gpt-6-luna", {"session_id": EMOJI_SESSION_ID}, EMOJI_SESSION_ID
    ),
    SessionCase("openai-official-empty", "openai-official", "gpt-6-luna", {"session_id": ""}, None),
    SessionCase("openai-official-unset", "openai-official", "gpt-6-luna", {}, None),
    SessionCase("openai-responses", "openai-responses", "openai/gpt-6-luna", {"session_id": SESSION_ID}, SESSION_ID),
    SessionCase("openai-chat", "openai-chat", "gpt-6-luna", {"session_id": SESSION_ID}, SESSION_ID),
    SessionCase("openai-chat-long", "openai-chat", "gpt-6-luna", {"session_id": LONG_SESSION_ID}, LONG_SESSION_KEY),
    SessionCase(
        "openai-chat-vllm-adapter",
        "openai-chat-vllm-adapter",
        "Qwen/Qwen3.6-35B-A3B",
        {"session_id": SESSION_ID},
        SESSION_ID,
    ),
    SessionCase("moonshot-official-k3", "moonshot-official", "kimi-k3.1-pro", {"session_id": SESSION_ID}, SESSION_ID),
    SessionCase("moonshot-official-k2", "moonshot-official", "kimi-k2.6", {"session_id": SESSION_ID}, SESSION_ID),
    SessionCase("minimax-official", "minimax-official", "MiniMax-M3", {"session_id": SESSION_ID}, SESSION_ID),
    SessionCase(
        "minimax-official-long", "minimax-official", "MiniMax-M3", {"session_id": LONG_SESSION_ID}, LONG_SESSION_KEY
    ),
    SessionCase("deepseek-official", "deepseek-official", "deepseek-v4-flash", {"session_id": SESSION_ID}, None),
    SessionCase("zai-official", "zai-official", "glm-5.3", {"session_id": SESSION_ID}, None),
    SessionCase("openai-embedding", "openai-embedding", "text-embedding-3-large", {"session_id": SESSION_ID}, None),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("case", SESSION_CASES, ids=[case.name for case in SESSION_CASES])
async def test_session_id_reaches_the_wire_as_prompt_cache_key(case: SessionCase, body_server: str):
    _BodyHandler.received_body = {}
    client = AutoLLMClient(model=case.model, api_key="test-key", base_url=body_server, client_type=case.client_type)
    messages = [{"role": "user", "content_items": [{"type": "text.done", "text": "Hi"}]}]

    with pytest.raises(openai.BadRequestError):
        async for _ in client.streaming_response(messages=messages, config=case.config):
            pass

    body = _BodyHandler.received_body
    assert body["model"] == case.model
    assert body.get("prompt_cache_key") == case.expected
    assert "prompt_cache_key" in body or case.expected is None
    assert "session_id" not in body


IGNORING_CLIENTS = [
    ("anthropic-official", "claude-sonnet-5"),
    ("ant-messages", "claude-sonnet-5"),
    ("google-official", "gemini-3.8-flash"),
    ("google-genai", "gemini-3.8-flash"),
    ("openai-embedding", "text-embedding-3-large"),
    ("deepseek-official", "deepseek-v4-flash"),
    ("zai-official", "glm-5.3"),
]


@pytest.mark.parametrize(("client_type", "model"), IGNORING_CLIENTS)
def test_session_id_changes_nothing_where_no_prompt_cache_key_exists(client_type: str, model: str):
    client = AutoLLMClient(model=model, api_key="test-key", client_type=client_type)._client  # noqa: SLF001
    config = {"max_tokens": 100}

    with_session = client.transform_uni_config_to_model_config({**config, "session_id": SESSION_ID})
    assert with_session == client.transform_uni_config_to_model_config(config)


def test_kimi_k2_sends_no_trace_id_as_prompt_cache_key():
    client = AutoLLMClient(model="kimi-k2.6", api_key="test-key", client_type="moonshot-official")._client  # noqa: SLF001

    assert "prompt_cache_key" not in client.transform_uni_config_to_model_config({"trace_id": "agent1/session_001"})


def test_mmsp_client_forwards_session_id():
    client = AutoLLMClient(model="gpt-6-luna", api_key="test-key", client_type="mmsp")._client  # noqa: SLF001

    assert client.transform_uni_config_to_model_config({"session_id": LONG_SESSION_ID}) == {
        "session_id": LONG_SESSION_ID
    }


@pytest.mark.parametrize(
    ("session_id", "expected"),
    [
        ("x" * 64, "x" * 64),
        ("x" * 65, "9537c5fdf120482f7d58d25e9ed583f52c02b4e304ea814db1633ad565aed7e9"),
        (EMOJI_SESSION_ID, EMOJI_SESSION_ID),
        (LONG_SESSION_ID, LONG_SESSION_KEY),
    ],
    ids=["64-ascii", "65-ascii", "64-emoji", "65-cjk"],
)
def test_prompt_cache_key_keeps_64_characters_and_digests_more(session_id: str, expected: str):
    assert prompt_cache_key(session_id) == expected


WEATHER_TOOL = {
    "name": "get_weather",
    "description": "Get the current weather in a given location",
    "parameters": {"type": "object", "properties": {"location": {"type": "string"}}, "required": ["location"]},
}
# the documented allowed-tools object of the Responses API, type included
RESPONSES_ALLOWED_TOOLS = {
    "type": "allowed_tools",
    "mode": "required",
    "tools": [{"type": "function", "name": "get_weather"}],
}
CHAT_ALLOWED_TOOLS = {
    "type": "allowed_tools",
    "allowed_tools": {"mode": "auto", "tools": [{"type": "function", "function": {"name": "get_weather"}}]},
}


@dataclass
class OpenAIBodyCase:
    name: str
    client_type: str
    model: str
    config: dict[str, Any]
    # a None value means the body carries no such field
    expected: dict[str, Any]


OPENAI_BODY_CASES = [
    OpenAIBodyCase(
        "openai-official-tool-list",
        "openai-official",
        "gpt-6.1-terra",
        {"tools": [WEATHER_TOOL], "tool_choice": ["get_weather"]},
        {"tool_choice": RESPONSES_ALLOWED_TOOLS},
    ),
    OpenAIBodyCase(
        "openai-responses-tool-list",
        "openai-responses",
        "openai/gpt-6.1-terra",
        {"tools": [WEATHER_TOOL], "tool_choice": ["get_weather"]},
        {"tool_choice": RESPONSES_ALLOWED_TOOLS},
    ),
    OpenAIBodyCase(
        "openai-chat-tool-list",
        "openai-chat",
        "gpt-6.1-terra",
        {"tools": [WEATHER_TOOL], "tool_choice": ["get_weather"]},
        {"tool_choice": CHAT_ALLOWED_TOOLS},
    ),
    OpenAIBodyCase(
        "openai-official-enhance-gpt-6",
        "openai-official",
        "gpt-6.1-terra",
        {"prompt_caching": PromptCaching.ENHANCE},
        {"prompt_cache_options": {"ttl": "12h"}},
    ),
    OpenAIBodyCase(
        "openai-official-enhance-gpt-5.6",
        "openai-official",
        "gpt-5.6-luna",
        {"prompt_caching": PromptCaching.ENHANCE},
        {"prompt_cache_options": {"ttl": "12h"}},
    ),
    OpenAIBodyCase(
        "openai-official-enable",
        "openai-official",
        "gpt-6.1-terra",
        {"prompt_caching": PromptCaching.ENABLE},
        {"prompt_cache_options": None},
    ),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("case", OPENAI_BODY_CASES, ids=[case.name for case in OPENAI_BODY_CASES])
async def test_openai_clients_send_tool_lists_and_cache_lifetime(case: OpenAIBodyCase, body_server: str):
    _BodyHandler.received_body = {}
    client = AutoLLMClient(model=case.model, api_key="test-key", base_url=body_server, client_type=case.client_type)
    messages = [{"role": "user", "content_items": [{"type": "text.done", "text": "Hi"}]}]

    with pytest.raises(openai.BadRequestError):
        async for _ in client.streaming_response(messages=messages, config=case.config):
            pass

    body = _BodyHandler.received_body
    assert body["model"] == case.model
    assert {name: body.get(name) for name in case.expected} == case.expected


@pytest.mark.parametrize(
    ("client_type", "model", "prompt_caching"),
    [
        ("openai-official", "gpt-5.5", PromptCaching.ENHANCE),
        ("openai-official", "gpt-6.1-terra", PromptCaching.DISABLE),
        ("openai-responses", "openai/gpt-6.1-terra", PromptCaching.ENHANCE),
        ("openai-chat", "gpt-6.1-terra", PromptCaching.ENHANCE),
    ],
)
def test_openai_clients_refuse_the_prompt_caching_they_cannot_send(
    client_type: str, model: str, prompt_caching: PromptCaching
):
    client = AutoLLMClient(model=model, api_key="test-key", client_type=client_type)._client  # noqa: SLF001

    with pytest.raises(UnsupportedParameterError, match="prompt_caching"):
        client.transform_uni_config_to_model_config({"prompt_caching": prompt_caching})


# Gemini Omni: a local Interactions endpoint that records the request and streams the events the live
# API streamed for the default video on 2026-11-06 (a signed thought step, then one video delta)
OMNI_MODEL = "gemini-omni-1.2-flash"
OMNI_VIDEO = b"\x00\x00\x00\x18ftypmp42 a whole video"
OMNI_URI = "https://generativelanguage.googleapis.com/v1beta/files/abc123:download?alt=media"


def _omni_stream(video_delta: dict[str, Any]) -> bytes:
    usage = {
        "total_tokens": 58539,
        "total_input_tokens": 33,
        "total_cached_tokens": 0,
        "total_output_tokens": 57920,
        "output_tokens_by_modality": [{"modality": "video", "tokens": 57920}],
        "total_thought_tokens": 586,
    }
    events = [
        {"event_type": "interaction.created", "interaction": {"id": "", "status": "in_progress", "model": OMNI_MODEL}},
        {"event_type": "step.start", "index": 0, "step": {"type": "thought"}},
        {"event_type": "step.delta", "index": 0, "delta": {"type": "thought_signature", "signature": "c2ln"}},
        {"event_type": "step.stop", "index": 0},
        {"event_type": "step.start", "index": 1, "step": {"type": "model_output"}},
        {"event_type": "step.delta", "index": 1, "delta": video_delta},
        {"event_type": "step.stop", "index": 1},
        {
            "event_type": "interaction.completed",
            "interaction": {"id": "", "status": "completed", "usage": usage, "model": OMNI_MODEL},
        },
    ]
    frames = "".join(f"event: {event['event_type']}\ndata: {json.dumps(event)}\n\n" for event in events)
    return (frames + "event: done\ndata: [DONE]\n\n").encode()


class _OmniHandler(BaseHTTPRequestHandler):
    """Records the JSON body of a request and answers with a recorded Interactions stream."""

    received_body: dict[str, Any] = {}
    stream: bytes = b""

    def do_POST(self) -> None:  # noqa: N802 - the name is BaseHTTPRequestHandler's
        length = int(self.headers.get("Content-Length", "0"))
        type(self).received_body = json.loads(self.rfile.read(length) or b"{}")
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Content-Length", str(len(type(self).stream)))
        self.end_headers()
        self.wfile.write(type(self).stream)

    def log_message(self, *args: object) -> None:
        """Keep the request log out of the test output."""


@pytest.fixture
def omni_server():
    server = ThreadingHTTPServer(("127.0.0.1", 0), _OmniHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()


@pytest.mark.asyncio
async def test_gemini_omni_sends_the_newest_message_at_the_video_defaults_and_streams_the_video(omni_server: str):
    _OmniHandler.received_body = {}
    _OmniHandler.stream = _omni_stream(
        {"type": "video", "mime_type": "video/mp4", "data": base64.b64encode(OMNI_VIDEO).decode()}
    )
    client = AutoLLMClient(model=OMNI_MODEL, api_key="test-key", base_url=omni_server)
    messages = [
        {"role": "user", "content_items": [{"type": "text.done", "text": "A paper boat on a stream."}]},
        {"role": "assistant", "content_items": [{"type": "text.done", "text": "Here it is."}]},
        {"role": "user", "content_items": [{"type": "text.done", "text": "The same boat at night."}]},
    ]
    config = {"max_tokens": 1000, "thinking_level": ThinkingLevel.MEDIUM, "system_prompt": "Shoot it on film."}

    events = [event async for event in client.streaming_response(messages=messages, config=config)]

    body = _OmniHandler.received_body
    # the newest message alone, no max_output_tokens and no response_format (16:9, 720p, 10 s, inline)
    assert body["model"] == OMNI_MODEL
    assert body["input"] == [{"type": "user_input", "content": [{"type": "text", "text": "The same boat at night."}]}]
    assert body["generation_config"] == {"thinking_level": "high"}
    assert body["system_instruction"] == "Shoot it on film."
    assert body["stream"] is True
    assert body["store"] is False
    assert "response_format" not in body
    assert [item for event in events for item in event["content_items"] if item["type"].endswith(".done")] == [
        {"type": "thinking.done", "thinking": "", "fidelity": {"signature": "c2ln"}},
        {"type": "inline_data.done", "data": OMNI_VIDEO, "mime_type": "video/mp4"},
    ]
    assert events[-1]["usage_metadata"] == {
        "cached_tokens": 0,
        "prompt_tokens": 33,
        "thoughts_tokens": 586,
        "response_tokens": 57920,
    }
    assert events[-1]["finish_reason"] == "stop"


@pytest.mark.asyncio
async def test_gemini_omni_returns_a_video_delivered_by_uri_as_text(omni_server: str):
    _OmniHandler.stream = _omni_stream({"type": "video", "mime_type": "video/mp4", "uri": OMNI_URI})
    client = AutoLLMClient(model=OMNI_MODEL, api_key="test-key", base_url=omni_server)
    messages = [{"role": "user", "content_items": [{"type": "text.done", "text": "A paper boat on a stream."}]}]

    events = [event async for event in client.streaming_response(messages=messages, config={})]

    done_items = [item for event in events for item in event["content_items"] if item["type"].endswith(".done")]
    assert done_items[-1] == {"type": "text.done", "text": OMNI_URI}


@pytest.mark.parametrize(
    "config",
    [
        {"tools": [{"name": "get_weather", "description": "Get the weather", "parameters": {"type": "object"}}]},
        {"tool_choice": "auto"},
        {"image_config": {"aspect_ratio": "16:9"}},
        {"fast_mode": True},
    ],
    ids=["tools", "tool_choice", "image_config", "fast_mode"],
)
def test_gemini_omni_refuses_what_it_cannot_send(config: dict[str, Any]):
    client = AutoLLMClient(model=OMNI_MODEL, api_key="test-key")._client  # noqa: SLF001

    with pytest.raises(UnsupportedParameterError, match="Gemini Omni does not support") as exc_info:
        client.transform_uni_config_to_model_config(config)

    assert exc_info.value.parameter == next(iter(config))
