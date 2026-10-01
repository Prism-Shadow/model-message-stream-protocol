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


from collections.abc import AsyncIterator
from dataclasses import dataclass
from types import SimpleNamespace

import pytest
from google.auth.credentials import AnonymousCredentials
from google.oauth2 import service_account

from mmsp import AutoLLMClient, UnsupportedOperationError


@dataclass
class ListCase:
    expected_client: str
    model: str
    client_type: str | None
    expected: list[str]


# What a gateway fronting several vendors answers with.
SERVED_IDS = [
    "gpt-5.6",
    "claude-sonnet-5",
    "claude-opus-4-6",
    "deepseek-v4",
    "deepseek-flash",
    "glm-5.3",
    "kimi-k3",
    "gemini-3.7-flash",
    "MiniMax-M3",
]

# A client named by its type speaks for the whole listing; a client deduced from a model id keeps
# the ids of its own family.
SDK_LIST_CASES = [
    ListCase(expected_client="OpenAIOfficialClient", model="gpt-5.6", client_type=None, expected=["gpt-5.6"]),
    ListCase(
        expected_client="AnthropicOfficialClient",
        model="claude-sonnet-5",
        client_type=None,
        expected=["claude-sonnet-5", "claude-opus-4-6"],
    ),
    ListCase(
        expected_client="DeepSeekOfficialClient",
        model="deepseek-v4",
        client_type=None,
        # the whole deepseek- family, versioned ids and version-free ones alike
        expected=["deepseek-v4", "deepseek-flash"],
    ),
    ListCase(expected_client="ZAIOfficialClient", model="glm-5.3", client_type=None, expected=["glm-5.3"]),
    ListCase(expected_client="MoonshotOfficialClient", model="kimi-k3", client_type=None, expected=["kimi-k3"]),
    ListCase(expected_client="MiniMaxOfficialClient", model="MiniMax-M3", client_type=None, expected=["MiniMax-M3"]),
    ListCase(
        expected_client="OpenAIOfficialClient", model="gpt-5.6", client_type="openai-official", expected=SERVED_IDS
    ),
    ListCase(expected_client="OpenaiChatClient", model="gpt-5.6", client_type="openai-chat", expected=SERVED_IDS),
    ListCase(
        expected_client="OpenaiResponsesClient", model="gpt-5.6", client_type="openai-responses", expected=SERVED_IDS
    ),
    ListCase(
        expected_client="AntMessagesClient",
        model="claude-sonnet-5",
        client_type="ant-messages",
        expected=SERVED_IDS,
    ),
    ListCase(
        expected_client="OpenaiEmbeddingClient",
        model="qwen3-embedding",
        client_type="openai-embedding",
        expected=SERVED_IDS,
    ),
]


async def _aiter(items: list[object]) -> AsyncIterator[object]:
    for item in items:
        yield item


class _FakeModelsEndpoint:
    """Stands in for an SDK models resource whose list() is an async iterator of models."""

    def __init__(self, ids: list[str]) -> None:
        self._ids = ids

    def list(self) -> AsyncIterator[object]:
        return _aiter([SimpleNamespace(id=model_id) for model_id in self._ids])


class _FakeGeminiModelsEndpoint:
    """The Gemini SDK awaits list() before iterating, and names arrive path-qualified."""

    def __init__(self, names: list[str]) -> None:
        self._names = names

    async def list(self) -> AsyncIterator[object]:
        return _aiter([SimpleNamespace(name=name) for name in self._names])


def _install_fake_models(client: AutoLLMClient, fake: object) -> None:
    client._client._client = SimpleNamespace(models=fake)  # noqa: SLF001


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "case", SDK_LIST_CASES, ids=[f"{case.model}:{case.client_type or 'auto'}" for case in SDK_LIST_CASES]
)
async def test_clients_return_the_ids_the_endpoint_serves(case: ListCase):
    client = AutoLLMClient(model=case.model, api_key="test-key", client_type=case.client_type)
    assert type(client._client).__name__ == case.expected_client  # noqa: SLF001
    _install_fake_models(client, _FakeModelsEndpoint(SERVED_IDS))

    assert await client.list_models() == case.expected


@pytest.mark.asyncio
async def test_gemini_client_strips_the_path_from_model_names():
    client = AutoLLMClient(model="gemini-3.7-flash", api_key="test-key")
    assert type(client._client).__name__ == "GeminiOfficialClient"  # noqa: SLF001
    fake = _FakeGeminiModelsEndpoint(["models/gemini-3.7-flash", "publishers/google/models/gemini-3.7-pro"])
    client._client._client = SimpleNamespace(aio=SimpleNamespace(models=fake))  # noqa: SLF001

    assert await client.list_models() == ["gemini-3.7-flash", "gemini-3.7-pro"]


# A Vertex AI service-account key, which the google-genai client recognizes by its leading brace.
SERVICE_ACCOUNT_KEY = '{"project_id": "test-project"}'


VERTEX_LISTING = ["gemini-3.8-flash", "gemini-embedding-2", "gemini-2.5-flash", "spicy-mayo"]
GEMINI_FAMILY = ["gemini-3.8-flash", "gemini-embedding-2", "gemini-2.5-flash"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("api_key", "client_type", "expected_client", "expected"),
    [
        ("test-key", None, "GeminiOfficialClient", GEMINI_FAMILY),
        (SERVICE_ACCOUNT_KEY, "google-genai", "GoogleGenaiClient", VERTEX_LISTING),
        ("test-key", "google-genai", "GoogleGenaiClient", VERTEX_LISTING),
    ],
)
async def test_gemini_clients_list_the_family_of_a_deduced_client_and_everything_for_a_named_one(
    api_key: str, client_type: str | None, expected_client: str, expected: list[str], monkeypatch
):
    # google-auth parses a real key's private key while the client is constructed
    monkeypatch.setattr(
        service_account.Credentials, "from_service_account_info", lambda _info, scopes=None: AnonymousCredentials()
    )
    client = AutoLLMClient(model="gemini-3.8-flash", api_key=api_key, client_type=client_type)
    assert type(client._client).__name__ == expected_client  # noqa: SLF001
    fake = _FakeGeminiModelsEndpoint([f"publishers/google/models/{model_id}" for model_id in VERTEX_LISTING])
    client._client._client = SimpleNamespace(aio=SimpleNamespace(models=fake))  # noqa: SLF001

    assert await client.list_models() == expected


@pytest.mark.asyncio
async def test_claude_client_reports_that_bedrock_cannot_list_models():
    client = AutoLLMClient(model="claude-sonnet-5", api_key="access-key,secret-key", base_url="bedrock://us-east-1")

    with pytest.raises(UnsupportedOperationError, match="Bedrock"):
        await client.list_models()
