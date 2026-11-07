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
import base64
import json
import mimetypes
from typing import Any, AsyncIterator

import httpx
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionChunk, ChatCompletionMessageParam

from ..base_client import LLMClient
from ..credentials import CLIENT_CREDENTIALS
from ..errors import InvalidMessageError, UnsupportedParameterError
from ..types import (
    EventContentItem,
    EventType,
    Fidelity,
    FinishReason,
    PromptCaching,
    ThinkingLevel,
    ToolChoice,
    UniConfig,
    UniEvent,
    UniMessage,
    UsageMetadata,
)
from ..utils import (
    fix_openrouter_usage_metadata,
    openai_client_options,
    openai_image_detail,
    prompt_cache_key,
    resolve_credentials,
)


class OpenaiChatClient(LLMClient):
    """OpenAI Chat Completions-compatible client implementation."""

    # the client type whose credentials this class reads; the vLLM adapter subclass names its own
    _CLIENT_TYPE = "openai-chat"

    #: How a thinking level reaches an endpoint that takes OpenAI's ``reasoning_effort``. Mistral's
    #: scale has no ``medium``, so the middle level takes ``high``, the next value it does know;
    #: ``none`` names nothing to send, because a model that reasons by default offers no way to turn
    #: it off and one that waits to be asked is off already.
    _REASONING_EFFORT: dict[str, str | None] = {
        "none": None,
        "low": "low",
        "medium": "high",
        "high": "high",
        "xhigh": "xhigh",
        "max": "max",
    }

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        base_url: str | None = None,
        default_headers: dict[str, str] | None = None,
    ):
        """Initialize OpenAI-compatible chat client with model, API key, and base URL."""
        self._model = model
        key, url = resolve_credentials(self.__class__.__name__, self._CLIENT_TYPE, api_key, base_url)
        # The OpenAI SDK fills a key and an endpoint it is handed as None from OPENAI_API_KEY and
        # OPENAI_BASE_URL, and sends a key with every request. So the SDK is handed this client type's
        # own default endpoint, and a client of an open server with no key sends the placeholder EMPTY,
        # as vLLM's docs do for a server started without --api-key.
        credentials = CLIENT_CREDENTIALS[self._CLIENT_TYPE]
        sdk_key = key or ("EMPTY" if credentials.open_server else None)
        self._client = AsyncOpenAI(
            api_key=sdk_key,
            base_url=url or credentials.default_base_url,
            **openai_client_options(self._CLIENT_TYPE, base_url, sdk_key, default_headers),
        )
        self._history: list[UniMessage] = []
        #: whether this model reasons, asked of the endpoint once and cached (see _reasoning_effort)
        self._reasoning_task: asyncio.Task[bool] | None = None

    async def _convert_image_url_to_base64(self, url: str) -> str:
        """Convert image URL to base64-encoded string.

        Args:
            url: Image URL to convert

        Returns:
            Base64-encoded image string
        """
        if url.startswith("data:"):
            return url

        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            image_bytes = response.content
            mime_type = mimetypes.guess_type(url)[0] or "image/jpeg"
            base64_string = base64.b64encode(image_bytes).decode("utf-8")
            return f"data:{mime_type};base64,{base64_string}"

    def _convert_tool_choice(self, tool_choice: ToolChoice) -> str | dict[str, Any]:
        """Convert ToolChoice to OpenAI Chat Completions tool_choice format."""
        if isinstance(tool_choice, list):
            return {
                "type": "allowed_tools",
                "allowed_tools": {
                    "mode": "auto",
                    "tools": [{"type": "function", "function": {"name": name}} for name in tool_choice],
                },
            }

        return tool_choice

    def _convert_image_url(self, data_url: str) -> dict[str, Any]:
        """Convert a fetched image to an image_url part, at the detail the API needs to read it."""
        image_url = {"url": data_url}
        if detail := openai_image_detail(self._model, data_url):
            image_url["detail"] = detail

        return {"type": "image_url", "image_url": image_url}

    def transform_uni_config_to_model_config(self, config: UniConfig) -> dict[str, Any]:
        """
        Transform universal configuration to OpenAI Chat Completions configuration.

        Args:
            config: Universal configuration dict

        Returns:
            OpenAI Chat Completions configuration dictionary
        """
        openai_config = {"model": self._model, "stream": True, "stream_options": {"include_usage": True}}

        if config.get("max_tokens") is not None:
            openai_config["max_completion_tokens"] = config["max_tokens"]

        if config.get("temperature") is not None:
            openai_config["temperature"] = config["temperature"]

        if config.get("tools") is not None:
            openai_config["tools"] = [{"type": "function", "function": tool} for tool in config["tools"]]

        if config.get("tool_choice") is not None:
            openai_config["tool_choice"] = self._convert_tool_choice(config["tool_choice"])

        if config.get("fast_mode"):
            openai_config["service_tier"] = "priority"

        if config.get("prompt_caching") is not None and config["prompt_caching"] != PromptCaching.ENABLE:
            raise UnsupportedParameterError(
                self.__class__.__name__, "prompt_caching", "prompt_caching must be ENABLE for OpenAI."
            )

        if config.get("session_id"):
            openai_config["prompt_cache_key"] = prompt_cache_key(config["session_id"])

        return openai_config

    async def transform_uni_message_to_model_input(
        self, messages: list[UniMessage]
    ) -> list[ChatCompletionMessageParam]:
        """
        Transform universal message format to OpenAI Chat Completions message format.

        Args:
            messages: List of universal message dictionaries

        Returns:
            List of OpenAI Chat Completions message dictionaries
        """
        openai_messages = []
        # The reasoning field this upstream has produced so far, if any. A turn the model
        # answered without thinking still has to carry that field, empty, when it made tool
        # calls: DeepSeek stops thinking part-way through a long tool chain, and then rejects
        # the replay of that turn with "the reasoning_content in the thinking mode must be
        # passed back to the API". It waives that only for tool_call ids it issued itself,
        # which a relay that reissues ids takes away. A conversation that never produced a
        # reasoning field never receives one.
        replay_fields: set[str | None] = set()

        for message_index, msg in enumerate(messages):
            message_start = len(openai_messages)
            content_parts = []  # may be empty for tool results
            tool_calls = []  # may be empty for no tool calls
            thinking = ""
            thinking_fields: set[str | None] = set()
            reasoning_details: list[dict[str, Any]] = []
            for item in msg["content_items"]:
                if item["type"] == "text.done":
                    content_parts.append({"type": "text", "text": item["text"]})
                elif item["type"] == "image_url.done":
                    base64_image = await self._convert_image_url_to_base64(item["image_url"])
                    content_parts.append(self._convert_image_url(base64_image))
                elif item["type"] == "thinking.done":
                    thinking += item["thinking"]
                    fidelity = item.get("fidelity") or {}
                    thinking_fields.add(fidelity.get("reasoning_field"))
                    if item["thinking"]:
                        replay_fields.add(fidelity.get("reasoning_field"))

                    # a gateway's encrypted reasoning block, rebuilt from the recorded keys; the
                    # format marks the data as a block of this protocol, so encrypted reasoning a
                    # Responses client recorded off its own server is not sent as one
                    if fidelity.get("encrypted_content") is not None and fidelity.get("format") is not None:
                        block = {
                            "type": "reasoning.encrypted",
                            "data": fidelity["encrypted_content"],
                            "format": fidelity["format"],
                        }
                        if fidelity.get("reasoning_id") is not None:
                            block["id"] = fidelity["reasoning_id"]

                        reasoning_details.append(block)

                    # 0.5.5 recorded the block as received; read until 0.6.0
                    reasoning_details.extend(fidelity.get("reasoning_details", []))
                elif item["type"] == "tool_call.done":
                    tool_calls.append(
                        {
                            "id": item["tool_call_id"],
                            "type": "function",
                            "function": {
                                "name": item["name"],
                                "arguments": json.dumps(item["arguments"], ensure_ascii=False),
                            },
                        }
                    )
                elif item["type"] == "tool_result.done":
                    if "tool_call_id" not in item:
                        raise InvalidMessageError(
                            self.__class__.__name__,
                            "tool_call_id is required for tool result.",
                            item_type="tool_result",
                        )

                    # Chat Completions lets a tool message carry text only, and a server that
                    # validates the schema rejects the whole request over an image part in one.
                    # The images ride in the user message that follows the turn's tool messages,
                    # the one place every OpenAI-compatible server reads them.
                    if "images" in item and item["images"]:
                        for image_url in item["images"]:
                            content_parts.append(
                                self._convert_image_url(await self._convert_image_url_to_base64(image_url))
                            )

                    # the plain string is the form every OpenAI-compatible server accepts
                    openai_messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": item["tool_call_id"],
                            "content": item["text"],
                        }
                    )
                else:
                    raise InvalidMessageError(
                        self.__class__.__name__, f"Unknown item type: {item['type']}", item_type=item["type"]
                    )

            message = {"role": msg["role"]}
            if content_parts:
                message["content"] = content_parts

            if tool_calls:
                message["tool_calls"] = tool_calls

            # This turn's own fidelity when it thought; otherwise the field the upstream has
            # produced, with `thinking` still "" — the empty value keeps the turn replayable.
            fields = thinking_fields if thinking else replay_fields
            if thinking or (tool_calls and replay_fields):
                # send thinking back through the exact field the upstream produced (recorded
                # in the item fidelity); servers may reject the spelling they did not emit
                if fields == {"reasoning_content"}:
                    message["reasoning_content"] = thinking
                elif fields == {"reasoning"}:
                    message["reasoning"] = thinking
                else:
                    # the field is unknown, so both spellings go out; a server reads the one it knows
                    message["reasoning_content"] = thinking
                    message["reasoning"] = thinking

            # a gateway hands the model its encrypted reasoning or thought signature only from the
            # blocks it sent; without them it accepts the turn and the reasoning is lost
            if reasoning_details:
                message["reasoning_details"] = reasoning_details

            # a message of tool results went out as its tool messages; one of thinking alone is an
            # assistant turn with neither content nor tool calls
            if not content_parts and not tool_calls and len(openai_messages) == message_start:
                raise InvalidMessageError(
                    self.__class__.__name__,
                    f"message {message_index} has nothing {self.__class__.__name__} can send",
                    message_index=message_index,
                )

            # message may be empty for tool results
            if len(message.keys()) > 1:
                openai_messages.append(message)

        return openai_messages

    def transform_model_output_to_uni_event(self, model_output: ChatCompletionChunk) -> UniEvent:
        """
        Transform one OpenAI Chat Completions streaming chunk into a universal event.

        Chat Completions gives an item no identity, so each delta's item_id is the wire field that
        carried it: an item runs until a delta arrives from another field, or names the next tool call.

        Args:
            model_output: OpenAI streaming chunk

        Returns:
            Universal event dictionary
        """
        event_type: EventType = "delta"
        content_items: list[EventContentItem] = []
        usage_metadata: UsageMetadata | None = None
        finish_reason: FinishReason | None = None

        # gateways inject content-free heartbeat chunks on long generations, whose choices
        # the SDK leaves as None rather than an empty list
        if model_output.choices:
            choice = model_output.choices[0]
            delta = choice.delta

            # the thinking field name differs by server (reasoning_content or reasoning); record the
            # wire field that carried each delta so a replay reproduces the field the upstream
            # produced. The reasoning goes before the content because a chunk may end the
            # reasoning and begin the answer.
            reasoning_content = getattr(delta, "reasoning_content", None)
            reasoning = getattr(delta, "reasoning", None)
            # A gateway may stream the reasoning as reasoning_details blocks and mirror their text
            # in `reasoning`. A reasoning.summary or reasoning.text block is the thinking text. A
            # reasoning.encrypted block is opaque data the gateway takes back only as it sent it:
            # its data is the item's encrypted_content, with the block's format and the id by
            # which a gateway binds a thought signature to the call it signs. The block arrives
            # whole, so its delta carries the item's one fidelity.
            reasoning_details = getattr(delta, "reasoning_details", None)
            if reasoning_details:
                for block in reasoning_details:
                    fidelity: Fidelity = {"item_id": "reasoning_details"}
                    if block["type"] == "reasoning.encrypted":
                        fidelity["encrypted_content"] = block["data"]
                        if block.get("format") is not None:
                            fidelity["format"] = block["format"]
                        if block.get("id") is not None:
                            fidelity["reasoning_id"] = block["id"]

                    content_items.append(
                        {
                            "type": "thinking.delta",
                            "thinking": block.get("summary") or block.get("text") or "",
                            "fidelity": fidelity,
                        }
                    )
            elif reasoning_content and reasoning:
                # ambiguous origin: record no reasoning_field so a replay sends both fields back
                content_items.append(
                    {
                        "type": "thinking.delta",
                        "thinking": reasoning_content,
                        "fidelity": {"item_id": "reasoning_content"},
                    }
                )
            elif reasoning_content:
                content_items.append(
                    {
                        "type": "thinking.delta",
                        "thinking": reasoning_content,
                        "fidelity": {"item_id": "reasoning_content", "reasoning_field": "reasoning_content"},
                    }
                )
            elif reasoning:
                content_items.append(
                    {
                        "type": "thinking.delta",
                        "thinking": reasoning,
                        "fidelity": {"item_id": "reasoning", "reasoning_field": "reasoning"},
                    }
                )

            if delta.content:
                content_items.append({"type": "text.delta", "text": delta.content, "fidelity": {"item_id": "content"}})

            if delta.tool_calls:
                for tool_call in delta.tool_calls:
                    content_items.append(
                        {
                            "type": "tool_call.delta",
                            "name": tool_call.function.name or "",
                            "arguments": tool_call.function.arguments or "",
                            "tool_call_id": tool_call.id or tool_call.function.name or "",
                            "fidelity": {"item_id": "tool_calls"},
                        }
                    )

            if choice.finish_reason:
                event_type = "stop"
                finish_reason_mapping = {
                    "stop": "stop",
                    "length": "length",
                    "tool_calls": "tool_call",
                    "content_filter": "stop",
                }
                finish_reason = finish_reason_mapping.get(choice.finish_reason, "unknown")

        if model_output.usage:
            event_type = "stop"

            if model_output.usage.prompt_tokens_details:
                cached_tokens = model_output.usage.prompt_tokens_details.cached_tokens
            else:
                cached_tokens = None

            if model_output.usage.completion_tokens_details:
                reasoning_tokens = model_output.usage.completion_tokens_details.reasoning_tokens
            else:
                reasoning_tokens = None

            if cached_tokens is not None:
                prompt_tokens = model_output.usage.prompt_tokens - cached_tokens
            else:
                prompt_tokens = model_output.usage.prompt_tokens

            if reasoning_tokens is not None:
                response_tokens = model_output.usage.completion_tokens - reasoning_tokens
            else:
                response_tokens = model_output.usage.completion_tokens

            usage_metadata = {
                "cached_tokens": cached_tokens,
                "prompt_tokens": prompt_tokens,
                "thoughts_tokens": reasoning_tokens,
                "response_tokens": response_tokens,
            }
            usage_metadata = fix_openrouter_usage_metadata(usage_metadata, str(self._client.base_url))

        return {
            "role": "assistant",
            "event_type": event_type,
            "content_items": content_items,
            "usage_metadata": usage_metadata,
            "finish_reason": finish_reason,
        }

    async def _model_reasons(self) -> bool:
        """
        Whether the endpoint says this model reasons, read from its model list.

        An endpoint that publishes no capabilities, which is every OpenAI-compatible server but
        Mistral's, answers False: it takes no reasoning parameter, and a request that carries one
        is rejected whole. So does a model that answers False itself, one that reasons without
        being asked.
        """
        try:
            base_url = str(self._client.base_url)
            if not base_url.endswith("/"):
                base_url += "/"

            headers = {"Authorization": f"Bearer {self._client.api_key}"} if self._client.api_key else {}
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{base_url}models", headers=headers)

            if response.status_code != 200:
                return False

            entry = next(
                (model for model in response.json().get("data") or [] if model.get("id") == self._model), None
            )
            return bool(entry and (entry.get("capabilities") or {}).get("reasoning") is True)
        except Exception:
            return False

    async def _reasoning_effort(self, thinking_level: ThinkingLevel | None) -> str | None:
        """
        The ``reasoning_effort`` this model takes for a thinking level, or None to send none.

        Whether a model reasons is the endpoint's to say, so it is asked once per client and the
        answer is cached; until then, and for every endpoint that publishes no capabilities, the
        request is exactly what it was.
        """
        effort = self._REASONING_EFFORT.get(str(thinking_level)) if thinking_level else None
        if effort is None:
            return None

        if self._reasoning_task is None:
            self._reasoning_task = asyncio.ensure_future(self._model_reasons())

        return effort if await self._reasoning_task else None

    async def _streaming_response_internal(
        self,
        messages: list[UniMessage],
        config: UniConfig,
    ) -> AsyncIterator[UniEvent]:
        """Stream generate using OpenAI Chat Completions-compatible API."""
        openai_config = self.transform_uni_config_to_model_config(config)
        reasoning_effort = await self._reasoning_effort(config.get("thinking_level"))
        if reasoning_effort is not None:
            openai_config["reasoning_effort"] = reasoning_effort

        openai_messages = await self.transform_uni_message_to_model_input(messages)

        if config.get("system_prompt"):
            openai_messages.insert(0, {"role": "system", "content": config["system_prompt"]})

        stream = await self._client.chat.completions.create(**openai_config, messages=openai_messages)

        async with stream:
            async for chunk in stream:
                yield self.transform_model_output_to_uni_event(chunk)

    async def list_models(self) -> list[str]:
        """
        List the model ids the configured endpoint serves.

        Returns:
            list[str]: The model ids, in the order the endpoint returned them.
        """
        return [model.id async for model in self._client.models.list()]
