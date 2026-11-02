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


class JinaWebtoolClient(LLMClient):
    """Jina's web tools: Search (`jina-search`, on s.jina.ai) and Reader (`jina-fetch`, on r.jina.ai).

    Both are plain JSON endpoints billed in tokens: a search posts to `/search`, a read to `/`, under
    the endpoint of its model unless a base URL is passed. The OpenAI SDK carries the requests, so a
    failure is raised as the SDK's status error in both packages.
    """

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        base_url: str | None = None,
        default_headers: dict[str, str] | None = None,
    ):
        """Initialize the Jina web tools client with model, API key, and base URL."""
        self._model = model
        if "-fetch" in model.lower():
            self._tool = "fetch"
        elif "-search" in model.lower():
            self._tool = "search"
        else:
            raise UnsupportedOperationError(
                self.__class__.__name__,
                "streaming_response",
                f"{model} names neither Jina's search nor its reader: the id must contain -search or -fetch.",
            )

        key, url = resolve_credentials(self.__class__.__name__, "jina-webtool", api_key, base_url)
        # The wrapped OpenAI SDK falls back to OPENAI_API_KEY when handed None, which would send an
        # OpenAI credential to the Jina hosts, so fail loudly instead.
        if not key:
            raise ApiKeyRequiredError(self.__class__.__name__, "jina-webtool", None)
        # Jina reads a page on its default endpoint and searches on its other one
        credentials = CLIENT_CREDENTIALS["jina-webtool"]
        default_url = credentials.default_base_url if self._tool == "fetch" else credentials.other_base_urls[0]
        self._client = AsyncOpenAI(
            api_key=key,
            base_url=url or default_url,
            **openai_client_options("jina-webtool", base_url, key, default_headers),
        )
        self._history: list[UniMessage] = []

    def transform_uni_config_to_model_config(self, config: UniConfig) -> dict[str, Any]:
        """Transform universal configuration to the Search or Reader request fields besides the query or URL."""
        if config.get("fast_mode"):
            raise UnsupportedParameterError(
                self.__class__.__name__, "fast_mode", "Jina web tools do not support fast mode."
            )

        params: dict[str, Any] = {}
        webtool_config = config.get("webtool_config") or {}
        if self._tool == "search" and webtool_config.get("count") is not None:
            params["num"] = webtool_config["count"]
        return params

    def transform_uni_message_to_model_input(self, messages: list[UniMessage]) -> list[str]:
        """Transform universal messages to the queries or URLs to send, one per message."""
        texts = []
        for message_index, msg in enumerate(messages):
            msg_text = ""
            for item in msg["content_items"]:
                if item["type"] != "text.done":
                    raise UnsupportedContentError(
                        self.__class__.__name__, item["type"], "Jina web tools only support text content items."
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

    def transform_model_output_to_uni_event(self, model_output: dict[str, Any]) -> UniEvent:
        """Transform one Search or Reader answer into a universal event carrying its web tool item."""
        if self._tool == "search":
            # sent with X-Respond-With: no-content, a result carries its description and no page body
            webdata = [
                {"title": page.get("title", ""), "content": page.get("description", ""), "url": page["url"]}
                for page in model_output["data"]
            ]
        else:
            page = model_output["data"]
            webdata = [{"title": page.get("title", ""), "content": page.get("content", ""), "url": page["url"]}]

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
        """Search the web or read a page through Jina, one request per message."""
        params = self.transform_uni_config_to_model_config(config)
        prompt_tokens = None
        for text in self.transform_uni_message_to_model_input(messages):
            if self._tool == "search":
                answer = await self._client.post(
                    "/search",
                    cast_to=object,
                    body={"q": text, **params},
                    # the results' descriptions only: reading every result page costs its tokens and time
                    options={"headers": {"X-Respond-With": "no-content"}},
                )
            else:
                answer = await self._client.post("/", cast_to=object, body={"url": text, **params})

            yield self.transform_model_output_to_uni_event(answer)
            # the tokens Jina bills for the request, summed over the requests
            usage = (answer.get("meta") or {}).get("usage") or {}
            if usage.get("tokens") is not None:
                prompt_tokens = (prompt_tokens or 0) + usage["tokens"]

        yield {
            "role": "assistant",
            "event_type": "stop",
            "content_items": [],
            "usage_metadata": {
                "cached_tokens": None,
                "prompt_tokens": prompt_tokens,
                "thoughts_tokens": None,
                "response_tokens": None,
            },
            "finish_reason": "stop",
        }

    async def list_models(self) -> list[str]:
        """Jina's web tools have no models endpoint.

        Raises:
            UnsupportedOperationError: Always.
        """
        raise UnsupportedOperationError(
            self.__class__.__name__, "list_models", "Jina's web tools have no models endpoint."
        )
