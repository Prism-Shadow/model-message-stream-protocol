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

import os
from typing import Any, AsyncIterator

from .abort_signal import AbortSignal
from .base_client import LLMClient
from .types import UniConfig, UniEvent, UniMessage


# An official client speaks its vendor's own API, knows the vendor's models, and reads the
# vendor's key from the environment.
OFFICIAL_CLIENT_TYPES = (
    "openai-official",
    "anthropic-official",
    "gemini-official",
    "zai-official",
    "moonshot-official",
    "deepseek-official",
    "minimax-official",
)

# A compatible client speaks one wire protocol for whatever endpoint serves it.
COMPATIBLE_CLIENT_TYPES = (
    "openai-responses",
    "openai-chat",
    "openai-chat-vllm-adapter",
    "openai-embedding",
    "ant-messages",
    "gemini-generate-content",
)

# Without a client type, the family a model id begins with names its official client.
_MODEL_FAMILIES = (
    ("gpt-", "openai-official"),
    ("text-embedding-", "openai-official"),
    ("claude-", "anthropic-official"),
    ("gemini-", "gemini-official"),
    ("glm-", "zai-official"),
    ("kimi-", "moonshot-official"),
    ("deepseek-", "deepseek-official"),
    ("minimax-", "minimax-official"),
)


def client_type_for_model(model: str) -> str | None:
    """
    The official client a model id routes to on its own, or None when its family is unknown.

    Args:
        model: The model id, in any casing.

    Returns:
        str | None: One of OFFICIAL_CLIENT_TYPES, or None.
    """
    lowered = model.lower()
    for prefix, client_type in _MODEL_FAMILIES:
        if lowered.startswith(prefix):
            return client_type
    return None


def _client_types() -> str:
    return (
        f"official clients: {', '.join(OFFICIAL_CLIENT_TYPES)}; "
        f"compatible clients: {', '.join(COMPATIBLE_CLIENT_TYPES)}"
    )


def _client_class(client_type: str, model: str, api_key: str | None) -> type[LLMClient] | None:
    """
    The client class a client type names. Each is imported here, so that no client pays for
    another vendor's SDK.

    Args:
        client_type: A lowercased client type.
        model: The model id, which tells an official client's embedding models apart.
        api_key: The key, which tells a Vertex AI service account apart.

    Returns:
        type[LLMClient] | None: The class, or None when no client is named so.
    """
    match client_type:
        case "openai-official":
            # OpenAI serves embedding models through its Embeddings API
            if model.lower().startswith("text-embedding-"):
                from .openai_embedding import OpenaiEmbeddingClient

                return OpenaiEmbeddingClient
            from .openai_official import OpenAIOfficialClient

            return OpenAIOfficialClient
        case "anthropic-official":
            from .anthropic_official import AnthropicOfficialClient

            return AnthropicOfficialClient
        case "gemini-official":
            # Vertex AI serves none of the Gemini models through the Interactions API, so a
            # service-account JSON key, which only Vertex AI takes, speaks generateContent
            if (api_key or os.getenv("GEMINI_API_KEY") or "").startswith("{"):
                from .gemini_generate_content import GeminiGenerateContentClient

                return GeminiGenerateContentClient
            from .gemini_official import GeminiOfficialClient

            return GeminiOfficialClient
        case "zai-official":
            from .zai_official import ZAIOfficialClient

            return ZAIOfficialClient
        case "moonshot-official":
            from .moonshot_official import MoonshotOfficialClient

            return MoonshotOfficialClient
        case "deepseek-official":
            from .deepseek_official import DeepSeekOfficialClient

            return DeepSeekOfficialClient
        case "minimax-official":
            from .minimax_official import MiniMaxOfficialClient

            return MiniMaxOfficialClient
        case "openai-responses":
            from .openai_responses import OpenaiResponsesClient

            return OpenaiResponsesClient
        case "openai-chat" | "openai":
            from .openai_chat import OpenaiChatClient

            return OpenaiChatClient
        case "openai-chat-vllm-adapter":
            from .openai_chat_vllm_adapter import OpenaiChatVllmAdapterClient

            return OpenaiChatVllmAdapterClient
        case "openai-embedding":
            from .openai_embedding import OpenaiEmbeddingClient

            return OpenaiEmbeddingClient
        case "ant-messages":
            from .ant_messages import AntMessagesClient

            return AntMessagesClient
        case "gemini-generate-content":
            from .gemini_generate_content import GeminiGenerateContentClient

            return GeminiGenerateContentClient
    return None


class AutoLLMClient(LLMClient):
    """
    The one client to call: it creates the client a client type names and forwards to it.

    A client type is one of OFFICIAL_CLIENT_TYPES or COMPATIBLE_CLIENT_TYPES, given as
    `client_type` or as the CLIENT_TYPE environment variable. Without one, the family the model
    id begins with names its official client: `gpt-` routes to `openai-official`, `claude-` to
    `anthropic-official`, and so on. A model id of no known family raises, and asks for a
    client type.

    This client is stateful - it knows the model name at initialization and maintains
    conversation history for that specific model.
    """

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        base_url: str | None = None,
        client_type: str | None = None,
        default_headers: dict[str, str] | None = None,
    ):
        """
        Initialize AutoLLMClient with a model and, unless the model id names it, a client type.

        Args:
            model: Model identifier
            api_key: Optional API key
            base_url: Optional base URL for API requests
            client_type: The client to use; deduced from the model id when omitted
            default_headers: Optional headers sent with every request, for endpoints that demand their own
        """
        named = client_type or os.getenv("CLIENT_TYPE")
        self._client_type = named.lower() if named else client_type_for_model(model)
        if self._client_type is None:
            raise ValueError(
                f"No client for model {model!r}: its family is not known. "
                f"Pass client_type, one of the {_client_types()}."
            )
        client_class = _client_class(self._client_type, model, api_key)
        if client_class is None:
            raise ValueError(f"Unknown client type {named!r}. Pass one of the {_client_types()}.")
        # a client named explicitly speaks for whatever its endpoint serves (see list_models)
        self._named = bool(named)
        self._client = client_class(model=model, api_key=api_key, base_url=base_url, default_headers=default_headers)

    def transform_uni_config_to_model_config(self, config: UniConfig) -> Any:
        """Delegate to underlying client's transform_uni_config_to_model_config."""
        return self._client.transform_uni_config_to_model_config(config)

    def transform_uni_message_to_model_input(self, messages: list[UniMessage]) -> Any:
        """Delegate to underlying client's transform_uni_message_to_model_input."""
        return self._client.transform_uni_message_to_model_input(messages)

    def transform_model_output_to_uni_event(self, model_output: Any) -> UniEvent:
        """Delegate to underlying client's transform_model_output_to_uni_event."""
        return self._client.transform_model_output_to_uni_event(model_output)

    async def _streaming_response_internal(
        self,
        messages: list[UniMessage],
        config: UniConfig,
    ) -> AsyncIterator[UniEvent]:
        raise NotImplementedError("Please use streaming_response instead.")

    async def streaming_response(
        self,
        messages: list[UniMessage],
        config: UniConfig,
        signal: AbortSignal | None = None,
    ) -> AsyncIterator[UniEvent]:
        """Route to underlying client's streaming_response."""
        async for event in self._client.streaming_response(
            messages=messages,
            config=config,
            signal=signal,
        ):
            yield event

    async def streaming_response_stateful(
        self,
        message: UniMessage,
        config: UniConfig,
        signal: AbortSignal | None = None,
    ) -> AsyncIterator[UniEvent]:
        """Route to underlying client's streaming_response_stateful."""
        async for event in self._client.streaming_response_stateful(
            message=message,
            config=config,
            signal=signal,
        ):
            yield event

    def clear_history(self) -> None:
        """Clear history in the underlying client."""
        self._client.clear_history()

    def get_history(self) -> list[UniMessage]:
        """Get history from the underlying client."""
        return self._client.get_history()

    def set_history(self, history: list[UniMessage]) -> None:
        """Set history in the underlying client."""
        self._client.set_history(history)

    async def list_models(self) -> list[str]:
        """
        List the model ids the endpoint serves that this client can be used for.

        A client named by its type speaks for whatever the endpoint serves, so its listing is
        returned whole. A client deduced from a model id serves the ids that deduce to it as well,
        so a gateway fronting many vendors is filtered down to that client's own models.

        Returns:
            list[str]: The model ids, in the order the endpoint returned them.
        """
        model_ids = await self._client.list_models()
        if self._named:
            return model_ids
        return [model_id for model_id in model_ids if client_type_for_model(model_id) == self._client_type]
