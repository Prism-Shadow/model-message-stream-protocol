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
from typing import Any, AsyncIterator

import httpx
from openai import AsyncOpenAI

from ..base_client import LLMClient
from ..errors import (
    InvalidMessageError,
    ProviderStreamError,
    UnsupportedContentError,
    UnsupportedParameterError,
)
from ..types import UniConfig, UniEvent, UniMessage
from ..utils import openai_client_options, resolve_credentials


# Gemini's 1K and 2K sizes for each aspect ratio of ImageConfig; every one keeps OpenAI's rules:
# sides divisible by 16, 655,360 to 8,294,400 pixels, no edge above 3840, no ratio beyond 3:1
_SIZES = {
    "1:1": {"1K": "1024x1024", "2K": "2048x2048"},
    "2:3": {"1K": "848x1264", "2K": "1696x2528"},
    "3:2": {"1K": "1264x848", "2K": "2528x1696"},
    "3:4": {"1K": "896x1200", "2K": "1792x2400"},
    "4:3": {"1K": "1200x896", "2K": "2400x1792"},
    "9:16": {"1K": "768x1376", "2K": "1536x2752"},
    "16:9": {"1K": "1376x768", "2K": "2752x1536"},
    "21:9": {"1K": "1584x672", "2K": "3168x1344"},
}


class OpenaiImageClient(LLMClient):
    """OpenAI Images-compatible client: image generation by `POST /images/generations`.

    The endpoint answers each request with one JSON, whatever `stream` says: OpenAI sends a single
    `image_generation.completed` event, OpenRouter ignores the flag, and TokenDance sends events of
    its own. Each message is one request, its text the prompt.
    """

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        base_url: str | None = None,
        default_headers: dict[str, str] | None = None,
    ):
        """Initialize OpenAI-compatible image generation client with model, API key, and base URL."""
        self._model = model
        key, url = resolve_credentials(self.__class__.__name__, "openai-image", api_key, base_url)
        self._client = AsyncOpenAI(
            api_key=key,
            base_url=url,
            **openai_client_options("openai-image", base_url, key, default_headers),
        )
        self._history: list[UniMessage] = []

    def transform_uni_config_to_model_config(self, config: UniConfig) -> dict[str, Any]:
        """Transform universal configuration to the image generation request fields besides the prompt.

        `response_format` is never sent: OpenAI refuses it on its GPT Image models, and every
        endpoint answers with `b64_json` or `url` without it.
        """
        if config.get("fast_mode"):
            raise UnsupportedParameterError(
                self.__class__.__name__, "fast_mode", "OpenAI image generation does not support fast mode."
            )

        params: dict[str, Any] = {"model": self._model}
        image_config = config.get("image_config") or {}
        aspect_ratio = image_config.get("aspect_ratio")
        image_size = image_config.get("image_size")
        if aspect_ratio is not None or image_size is not None:
            size = _SIZES.get(aspect_ratio or "1:1", {}).get(image_size or "1K")
            if size is None:
                raise UnsupportedParameterError(
                    self.__class__.__name__,
                    "image_config",
                    "OpenAI image generation does not support this image_config: aspect_ratio takes 1:1, 2:3, "
                    "3:2, 3:4, 4:3, 9:16, 16:9 or 21:9, and image_size 1K or 2K.",
                )
            params["size"] = size
        return params

    def transform_uni_message_to_model_input(self, messages: list[UniMessage]) -> list[str]:
        """Transform universal messages to the prompts to send, one per message."""
        prompts = []
        for message_index, msg in enumerate(messages):
            msg_text = ""
            for item in msg["content_items"]:
                if item["type"] != "text.done":
                    raise UnsupportedContentError(
                        self.__class__.__name__,
                        item["type"],
                        "OpenAI image generation only supports text content items.",
                    )
                msg_text += item["text"]
            if not msg_text:
                raise InvalidMessageError(
                    self.__class__.__name__,
                    f"message {message_index} has nothing {self.__class__.__name__} can send",
                    message_index=message_index,
                )
            prompts.append(msg_text)
        return prompts

    def transform_model_output_to_uni_event(self, model_output: tuple[dict[str, Any], list[bytes]]) -> UniEvent:
        """Transform one image generation answer into a universal event carrying its images.

        model_output pairs the JSON the endpoint answered with the bytes of each image it lists. An
        image's MIME type is its `media_type` (OpenRouter), else the answer's `output_format` (OpenAI),
        else the type its bytes show (TokenDance names neither).
        """
        answer, images = model_output
        content_items = []
        for image, data in zip(answer["data"], images):
            if image.get("media_type"):
                mime_type = image["media_type"]
            elif answer.get("output_format"):
                mime_type = f"image/{answer['output_format']}"
            elif data.startswith(b"\x89PNG\r\n\x1a\n"):
                mime_type = "image/png"
            elif data[:4] == b"RIFF" and data[8:12] == b"WEBP":
                mime_type = "image/webp"
            elif data[:6] in (b"GIF87a", b"GIF89a"):
                mime_type = "image/gif"
            else:
                mime_type = "image/jpeg"
            content_items.append({"type": "inline_data.delta", "data": data, "mime_type": mime_type})

        return {
            "role": "assistant",
            "event_type": "delta",
            "content_items": content_items,
            "usage_metadata": None,
            "finish_reason": None,
        }

    async def _image_bytes(self, image: dict[str, Any]) -> bytes:
        """The bytes of one image an answer lists: its `b64_json` decoded, else its `url` downloaded.

        The `url` points at the gateway's object storage, not at the endpoint, so the download goes
        through a client of its own and carries no credential, neither the key nor the default
        headers (MMSP-RFC-0006 §7).

        Raises:
            ProviderStreamError: The download answered with an HTTP error, whose status is the code.
        """
        if image.get("b64_json"):
            return base64.b64decode(image["b64_json"])

        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(image["url"])
        if response.is_error:
            raise ProviderStreamError(
                self.__class__.__name__,
                response.status_code,
                f"The generated image could not be downloaded: {response.status_code} {response.reason_phrase}",
            )
        return response.content

    async def _streaming_response_internal(
        self,
        messages: list[UniMessage],
        config: UniConfig,
    ) -> AsyncIterator[UniEvent]:
        """Generate images using an OpenAI Images-compatible API, one request per message."""
        params = self.transform_uni_config_to_model_config(config)
        prompt_tokens = None
        response_tokens = None
        for prompt in self.transform_uni_message_to_model_input(messages):
            answer = await self._client.post("/images/generations", cast_to=object, body={**params, "prompt": prompt})
            images = [await self._image_bytes(image) for image in answer["data"]]
            yield self.transform_model_output_to_uni_event((answer, images))

            # OpenAI reports input and output tokens, OpenRouter prompt and completion tokens, and
            # TokenDance the output tokens alone; each count is summed over the requests
            usage = answer.get("usage") or {}
            prompt_count = usage.get("input_tokens")
            if prompt_count is None:
                prompt_count = usage.get("prompt_tokens")
            if prompt_count is not None:
                prompt_tokens = (prompt_tokens or 0) + prompt_count
            response_count = usage.get("output_tokens")
            if response_count is None:
                response_count = usage.get("completion_tokens")
            if response_count is not None:
                response_tokens = (response_tokens or 0) + response_count

        yield {
            "role": "assistant",
            "event_type": "stop",
            "content_items": [],
            "usage_metadata": {
                "cached_tokens": None,
                "prompt_tokens": prompt_tokens,
                "thoughts_tokens": None,
                "response_tokens": response_tokens,
            },
            "finish_reason": "stop",
        }

    async def list_models(self) -> list[str]:
        """
        List the model ids the configured endpoint serves.

        Returns:
            list[str]: The model ids, in the order the endpoint returned them.
        """
        return [model.id async for model in self._client.models.list()]
