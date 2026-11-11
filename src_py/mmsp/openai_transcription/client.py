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


import io
import math
import wave
from typing import Any, AsyncIterator

from openai import AsyncOpenAI

from ..base_client import LLMClient
from ..errors import InvalidMessageError, UnsupportedContentError, UnsupportedParameterError
from ..types import UniConfig, UniEvent, UniMessage
from ..utils import openai_client_options, resolve_credentials


# The extension an endpoint reads an upload's format from, by MIME type; another audio type takes
# its subtype
_EXTENSIONS = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "aac",
}


class OpenaiTranscriptionClient(LLMClient):
    """OpenAI Audio Transcriptions-compatible client: speech to text by `POST /audio/transcriptions`.

    Each message is one request, its one audio item the file, uploaded in OpenAI's multipart form;
    the endpoint answers with one JSON.
    """

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        base_url: str | None = None,
        default_headers: dict[str, str] | None = None,
    ):
        """Initialize OpenAI-compatible transcription client with model, API key, and base URL."""
        self._model = model
        key, url = resolve_credentials(self.__class__.__name__, "openai-transcription", api_key, base_url)
        self._client = AsyncOpenAI(
            api_key=key,
            base_url=url,
            **openai_client_options("openai-transcription", base_url, key, default_headers),
        )
        self._history: list[UniMessage] = []

    def transform_uni_config_to_model_config(self, config: UniConfig) -> dict[str, Any]:
        """Transform universal configuration to the transcription form fields besides the file."""
        if config.get("fast_mode"):
            raise UnsupportedParameterError(
                self.__class__.__name__, "fast_mode", "OpenAI transcription does not support fast mode."
            )

        return {"model": self._model}

    def transform_uni_message_to_model_input(self, messages: list[UniMessage]) -> list[tuple[str, bytes, str]]:
        """Transform universal messages to the files to transcribe, one per message.

        Each file is its name, its bytes and its MIME type. Headerless PCM (`audio/l16`, `audio/pcm`)
        is wrapped in a WAV header built from the rate and channels its MIME type names.
        """
        files = []
        for message_index, msg in enumerate(messages):
            audio = None
            for item in msg["content_items"]:
                if item["type"] != "inline_data.done" or not item["mime_type"].lower().startswith("audio/"):
                    raise UnsupportedContentError(
                        self.__class__.__name__,
                        item["type"],
                        "OpenAI transcription only supports audio inline_data items.",
                    )
                if audio is not None:
                    raise InvalidMessageError(
                        self.__class__.__name__,
                        f"message {message_index} holds more than one audio item; "
                        f"{self.__class__.__name__} transcribes one per message",
                        item_type="inline_data",
                        message_index=message_index,
                    )
                audio = item
            if audio is None:
                raise InvalidMessageError(
                    self.__class__.__name__,
                    f"message {message_index} has nothing {self.__class__.__name__} can send",
                    message_index=message_index,
                )

            media_type, _, parameters = audio["mime_type"].partition(";")
            media_type = media_type.strip().lower()
            data = audio["data"]
            if media_type in ("audio/l16", "audio/pcm"):
                pcm_format = {}
                for parameter in parameters.split(";"):
                    name, _, value = parameter.partition("=")
                    pcm_format[name.strip().lower()] = value.strip()
                if not pcm_format.get("rate"):
                    raise InvalidMessageError(
                        self.__class__.__name__,
                        f"message {message_index} holds PCM audio whose MIME type {audio['mime_type']!r} names no rate",
                        item_type="inline_data",
                        message_index=message_index,
                    )
                # 16-bit little-endian samples, as the Gemini clients and OpenRouter send them
                buffer = io.BytesIO()
                with wave.open(buffer, "wb") as wav:
                    wav.setnchannels(int(pcm_format.get("channels") or 1))
                    wav.setsampwidth(2)
                    wav.setframerate(int(pcm_format["rate"]))
                    wav.writeframes(data)
                data, media_type = buffer.getvalue(), "audio/wav"

            extension = _EXTENSIONS.get(media_type, media_type.split("/")[-1])
            files.append((f"audio.{extension}", data, media_type))
        return files

    def transform_model_output_to_uni_event(self, model_output: tuple[int, dict[str, Any]]) -> UniEvent:
        """Transform one transcription answer into a universal event carrying its text.

        model_output pairs the index of the message transcribed with the JSON the endpoint answered.
        The message's index is the item's id, so that each message's text is one item.
        """
        message_index, answer = model_output
        return {
            "role": "assistant",
            "event_type": "delta",
            "content_items": [
                {"type": "text.delta", "text": answer["text"], "fidelity": {"item_id": str(message_index)}}
            ],
            "usage_metadata": None,
            "finish_reason": None,
        }

    async def _streaming_response_internal(
        self,
        messages: list[UniMessage],
        config: UniConfig,
    ) -> AsyncIterator[UniEvent]:
        """Transcribe each message's audio using an OpenAI Audio Transcriptions-compatible API."""
        params = self.transform_uni_config_to_model_config(config)
        prompt_tokens = None
        for message_index, file in enumerate(self.transform_uni_message_to_model_input(messages)):
            answer = await self._client.post(
                "/audio/transcriptions",
                cast_to=object,
                body=params,
                files=[("file", file)],
                # the SDK sends the body and the files as a multipart form when the request names that type
                options={"headers": {"Content-Type": "multipart/form-data"}},
            )
            yield self.transform_model_output_to_uni_event((message_index, answer))

            # billed by the second of audio, a fraction rounded up
            seconds = (answer.get("usage") or {}).get("seconds")
            if seconds is not None:
                prompt_tokens = (prompt_tokens or 0) + math.ceil(seconds)

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
