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

from openai import AsyncOpenAI, omit

from ..base_client import LLMClient
from ..errors import InvalidMessageError, UnsupportedContentError, UnsupportedParameterError
from ..types import UniConfig, UniEvent, UniMessage
from ..utils import openai_client_options, resolve_credentials


class OpenaiSpeechClient(LLMClient):
    """OpenAI Audio Speech-compatible client: text to speech by `POST /audio/speech`.

    The endpoint streams the audio's bytes as it makes them, in its default format. Each message is
    one request, its text the input, and its speech one item.
    """

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        base_url: str | None = None,
        default_headers: dict[str, str] | None = None,
    ):
        """Initialize OpenAI-compatible speech client with model, API key, and base URL."""
        self._model = model
        key, url = resolve_credentials(self.__class__.__name__, "openai-speech", api_key, base_url)
        self._client = AsyncOpenAI(
            api_key=key,
            base_url=url,
            **openai_client_options("openai-speech", base_url, key, default_headers),
        )
        self._history: list[UniMessage] = []

    def transform_uni_config_to_model_config(self, config: UniConfig) -> dict[str, Any]:
        """Transform universal configuration to the speech request fields besides the input.

        No `response_format` is sent, so the endpoint answers in its default format: headerless PCM
        on OpenRouter, MP3 on OpenAI.
        """
        if config.get("fast_mode"):
            raise UnsupportedParameterError(
                self.__class__.__name__, "fast_mode", "OpenAI speech does not support fast mode."
            )

        # without tts_config the endpoint speaks in its default voice; the SDK's signature requires
        # a voice, so an absent one is passed as omit, which it leaves out of the body
        params: dict[str, Any] = {"model": self._model, "voice": omit}
        tts_config = config.get("tts_config")
        if tts_config:
            if len(tts_config) > 1:
                raise UnsupportedParameterError(
                    self.__class__.__name__,
                    "tts_config",
                    f"OpenAI speech does not support {len(tts_config)} speakers; tts_config takes 1 entry.",
                )
            params["voice"] = tts_config[0]["voice"]
        return params

    def transform_uni_message_to_model_input(self, messages: list[UniMessage]) -> list[str]:
        """Transform universal messages to the inputs to speak, one per message."""
        texts = []
        for message_index, msg in enumerate(messages):
            msg_text = ""
            for item in msg["content_items"]:
                if item["type"] != "text.done":
                    raise UnsupportedContentError(
                        self.__class__.__name__, item["type"], "OpenAI speech only supports text content items."
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
        Headerless PCM, `audio/pcm;rate=44100;channels=1` on the wire, is named `audio/l16` with its
        rate and channels, as the Gemini clients name theirs; any other format keeps its type.
        """
        message_index, content_type, chunk = model_output
        media_type, _, parameters = content_type.partition(";")
        if media_type.strip().lower() == "audio/pcm":
            mime_type = "; ".join(["audio/l16", *(part.strip() for part in parameters.split(";") if part.strip())])
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
        """Speak each message using an OpenAI Audio Speech-compatible API, streaming the audio as it arrives."""
        params = self.transform_uni_config_to_model_config(config)
        prompt_tokens = 0
        for message_index, text in enumerate(self.transform_uni_message_to_model_input(messages)):
            # closed with this generator, so that closing it closes the provider's request
            async with self._client.audio.speech.with_streaming_response.create(input=text, **params) as response:
                content_type = response.headers.get("content-type", "")
                async for chunk in response.iter_bytes():
                    yield self.transform_model_output_to_uni_event((message_index, content_type, chunk))
            # the endpoint reports no usage; Fish Audio bills the input's UTF-8 bytes
            prompt_tokens += len(text.encode("utf-8"))

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
        """
        List the model ids the configured endpoint serves.

        Returns:
            list[str]: The model ids, in the order the endpoint returned them.
        """
        return [model.id async for model in self._client.models.list()]
