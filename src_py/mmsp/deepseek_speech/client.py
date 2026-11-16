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


import re
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


# The Han ideographs, which DeepSeek bills as two characters each: the CJK Unified Ideographs with
# Extension A, the CJK Compatibility Ideographs, and the Supplementary and Tertiary Ideographic
# Planes, which hold Extensions B to J and the Compatibility Ideographs Supplement
_HAN = re.compile("[\U00003400-\U00004dbf\U00004e00-\U00009fff\U0000f900-\U0000faff\U00020000-\U0003ffff]")


class DeepSeekSpeechClient(LLMClient):
    """DeepSeek's text to speech (`deepseek-tts`) by `POST /v1/tools/tts` under the base URL.

    The endpoint streams the audio's bytes as it makes them. Each message is one request, its text
    the input, and its speech one item. The OpenAI SDK carries the requests, as DeepSeek answers
    errors in OpenAI's format.
    """

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        base_url: str | None = None,
        default_headers: dict[str, str] | None = None,
    ):
        """Initialize the DeepSeek speech client with model, API key, and base URL."""
        self._model = model
        key, url = resolve_credentials(self.__class__.__name__, "deepseek-speech", api_key, base_url)
        # The wrapped OpenAI SDK falls back to OPENAI_API_KEY when handed None, which would send an
        # OpenAI credential to the DeepSeek host, so fail loudly instead.
        if not key:
            raise ApiKeyRequiredError(self.__class__.__name__, "deepseek-speech", None)
        self._client = AsyncOpenAI(
            api_key=key,
            base_url=url or CLIENT_CREDENTIALS["deepseek-speech"].default_base_url,
            **openai_client_options("deepseek-speech", base_url, key, default_headers),
        )
        self._history: list[UniMessage] = []

    def transform_uni_config_to_model_config(self, config: UniConfig) -> dict[str, Any]:
        """Transform universal configuration to the speech request fields besides the text.

        The audio is asked for as headerless PCM, whose chunks join into the whole; DeepSeek's
        default, WAV, opens with a header that cannot know the audio's length while it streams.
        """
        if config.get("fast_mode"):
            raise UnsupportedParameterError(
                self.__class__.__name__, "fast_mode", "DeepSeek speech does not support fast mode."
            )

        # without tts_config DeepSeek speaks in its default voice, stella
        params: dict[str, Any] = {"format": "pcm"}
        tts_config = config.get("tts_config")
        if tts_config:
            if len(tts_config) > 1:
                raise UnsupportedParameterError(
                    self.__class__.__name__,
                    "tts_config",
                    f"DeepSeek speech does not support {len(tts_config)} speakers; tts_config takes 1 entry.",
                )
            params["voice_id"] = tts_config[0]["voice"]
        return params

    def transform_uni_message_to_model_input(self, messages: list[UniMessage]) -> list[str]:
        """Transform universal messages to the texts to speak, one per message."""
        texts = []
        for message_index, msg in enumerate(messages):
            msg_text = ""
            for item in msg["content_items"]:
                if item["type"] != "text.done":
                    raise UnsupportedContentError(
                        self.__class__.__name__, item["type"], "DeepSeek speech only supports text content items."
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

    def transform_model_output_to_uni_event(self, model_output: tuple[int, str, bytes]) -> UniEvent:
        """Transform one chunk of a speech response into a universal event carrying its audio.

        model_output holds the index of the message spoken, the response's content type and the
        chunk. The message's index is the item's id, so that each message's speech is one item.
        Headerless PCM, `audio/pcm; rate=24000; encoding=signed-integer; bits=16; channels=1` on
        the wire, is named `audio/l16` with its rate and channels, as the Gemini clients name theirs;
        any other format keeps its type.
        """
        message_index, content_type, chunk = model_output
        media_type, _, parameters = content_type.partition(";")
        if media_type.strip().lower() == "audio/pcm":
            pcm_format = {}
            for parameter in parameters.split(";"):
                name, _, value = parameter.partition("=")
                pcm_format[name.strip().lower()] = value.strip()
            mime_type = "; ".join(
                ["audio/l16", *(f"{name}={pcm_format[name]}" for name in ("rate", "channels") if pcm_format.get(name))]
            )
        else:
            mime_type = content_type

        return {
            "role": "assistant",
            "event_type": "delta",
            "content_items": [
                {
                    "type": "inline_data.delta",
                    "data": chunk,
                    "mime_type": mime_type,
                    "fidelity": {"item_id": str(message_index)},
                }
            ],
            "usage_metadata": None,
            "finish_reason": None,
        }

    async def _streaming_response_internal(
        self,
        messages: list[UniMessage],
        config: UniConfig,
    ) -> AsyncIterator[UniEvent]:
        """Speak each message through DeepSeek's text to speech, streaming the audio as it arrives."""
        params = self.transform_uni_config_to_model_config(config)
        prompt_tokens = 0
        for message_index, text in enumerate(self.transform_uni_message_to_model_input(messages)):
            # the SDK hands back the response unread, its body streamed, as with_streaming_response does
            response = await self._client.post(
                "/v1/tools/tts",
                cast_to=bytes,
                body={"text": text, **params},
                options={"headers": {"X-Stainless-Raw-Response": "stream"}},
            )
            # closed with this generator, so that closing it closes the provider's request
            try:
                content_type = response.headers.get("content-type", "")
                async for chunk in response.iter_bytes():
                    yield self.transform_model_output_to_uni_event((message_index, content_type, chunk))
            finally:
                await response.close()
            # the endpoint reports no usage; DeepSeek bills characters, a Han character as two
            prompt_tokens += len(text) + len(_HAN.findall(text))

        yield {
            "role": "assistant",
            "event_type": "stop",
            "content_items": [],
            "usage_metadata": {
                "cached_tokens": None,
                "prompt_tokens": prompt_tokens,
                "thoughts_tokens": None,
                "response_tokens": 0,
            },
            "finish_reason": "stop",
        }

    async def list_models(self) -> list[str]:
        """DeepSeek's text to speech has no models endpoint.

        Raises:
            UnsupportedOperationError: Always.
        """
        raise UnsupportedOperationError(
            self.__class__.__name__, "list_models", "DeepSeek's text to speech has no models endpoint."
        )
