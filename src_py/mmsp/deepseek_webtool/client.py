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

from typing import Any, AsyncIterator

from openai import AsyncOpenAI

from ..base_client import LLMClient
from ..credentials import CLIENT_CREDENTIALS
from ..errors import (
    ApiKeyRequiredError,
    InvalidMessageError,
    UnsupportedContentError,
    UnsupportedOperationError,
    UnsupportedParameterError,
)
from ..types import UniConfig, UniEvent, UniMessage
from ..utils import openai_client_options, resolve_credentials


class DeepSeekWebtoolClient(LLMClient):
    """DeepSeek's web tools: Search (`deepseek-search`) and Fetch (`deepseek-fetch`).

    Both are plain JSON endpoints, `/v1/tools/search` and `/v1/tools/fetch` under the base URL, billed
    per request; a gateway such as TokenDance serves them under the same paths. The OpenAI SDK carries
    the requests, as DeepSeek answers errors in OpenAI's format.
    """

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        base_url: str | None = None,
        default_headers: dict[str, str] | None = None,
    ):
        """Initialize the DeepSeek web tools client with model, API key, and base URL."""
        self._model = model
        if "-fetch" in model.lower():
            self._tool = "fetch"
        elif "-search" in model.lower():
            self._tool = "search"
        else:
            raise UnsupportedOperationError(
                self.__class__.__name__,
                "streaming_response",
                f"{model} names neither DeepSeek's search nor its fetch: the id must contain -search or -fetch.",
            )

        key, url = resolve_credentials(self.__class__.__name__, "deepseek-webtool", api_key, base_url)
        # The wrapped OpenAI SDK falls back to OPENAI_API_KEY when handed None, which would send an
        # OpenAI credential to the DeepSeek host, so fail loudly instead.
        if not key:
            raise ApiKeyRequiredError(self.__class__.__name__, "deepseek-webtool", None)
        self._client = AsyncOpenAI(
            api_key=key,
            base_url=url or CLIENT_CREDENTIALS["deepseek-webtool"].default_base_url,
            **openai_client_options("deepseek-webtool", base_url, key, default_headers),
        )
        self._history: list[UniMessage] = []

    def transform_uni_config_to_model_config(self, config: UniConfig) -> dict[str, Any]:
        """Transform universal configuration to the Search or Fetch request fields besides the query or URL."""
        if config.get("fast_mode"):
            raise UnsupportedParameterError(
                self.__class__.__name__, "fast_mode", "DeepSeek web tools do not support fast mode."
            )

        params: dict[str, Any] = {}
        webtool_config = config.get("webtool_config") or {}
        if self._tool == "search" and webtool_config.get("count") is not None:
            params["count"] = webtool_config["count"]
        return params

    def transform_uni_message_to_model_input(self, messages: list[UniMessage]) -> list[str]:
        """Transform universal messages to the queries or URLs to send, one per message."""
        texts = []
        for message_index, msg in enumerate(messages):
            msg_text = ""
            for item in msg["content_items"]:
                if item["type"] != "text.done":
                    raise UnsupportedContentError(
                        self.__class__.__name__, item["type"], "DeepSeek web tools only support text content items."
                    )
                msg_text += item["text"]
            if not msg_text:
                raise InvalidMessageError(
                    self.__class__.__name__,
                    f"message {message_index} has nothing {self.__class__.__name__} can send",
                    message_index=message_index,
                )
            texts.append(msg_text)
        return texts

    def transform_model_output_to_uni_event(self, model_output: tuple[str, dict[str, Any]]) -> UniEvent:
        """Transform one Search or Fetch answer into a universal event carrying its web tool item.

        model_output pairs the query or URL sent with the JSON the endpoint answered: a fetch answers
        with the page's title and Markdown but not its address, which is the URL sent.
        """
        sent, answer = model_output
        if self._tool == "search":
            # the long summary DeepSeek writes for a model to read; content stays empty without need_content
            webdata = [
                {"title": result["title"], "content": result["summary"], "url": result["url"]}
                for result in answer["results"]
            ]
        else:
            webdata = [{"title": answer["title"], "content": answer["content"], "url": sent}]

        return {
            "role": "assistant",
            "event_type": "delta",
            "content_items": [{"type": "webtool.delta", "webdata": webdata}],
            "usage_metadata": None,
            "finish_reason": None,
        }

    async def _streaming_response_internal(
        self,
        messages: list[UniMessage],
        config: UniConfig,
    ) -> AsyncIterator[UniEvent]:
        """Search the web or fetch a page through DeepSeek, one request per message."""
        params = self.transform_uni_config_to_model_config(config)
        requests = 0
        for text in self.transform_uni_message_to_model_input(messages):
            body = {"query": text, **params} if self._tool == "search" else {"url": text, **params}
            answer = await self._client.post(f"/v1/tools/{self._tool}", cast_to=object, body=body)
            requests += 1
            yield self.transform_model_output_to_uni_event((text, answer))

        # DeepSeek bills a request, not tokens, so each request counts as one prompt token
        yield {
            "role": "assistant",
            "event_type": "stop",
            "content_items": [],
            "usage_metadata": {
                "cached_tokens": None,
                "prompt_tokens": requests,
                "thoughts_tokens": None,
                "response_tokens": None,
            },
            "finish_reason": "stop",
        }

    async def list_models(self) -> list[str]:
        """DeepSeek's web tools have no models endpoint.

        Raises:
            UnsupportedOperationError: Always.
        """
        raise UnsupportedOperationError(
            self.__class__.__name__, "list_models", "DeepSeek's web tools have no models endpoint."
        )
