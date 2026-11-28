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

import math
import re
from typing import Any

from ...plugin import ClientPlugin
from ...types import UniConfig


class GeminiPlugin(ClientPlugin):
    """
    What Gemini TTS models need on an OpenAI Audio Speech-compatible endpoint.

    OpenRouter's `/api/v1/audio/speech` refuses a Gemini TTS request without `voice` (`400 "An
    explicit voice is required for this TTS provider."`, verified live 2026-11-19), so an unset
    `tts_config` speaks in `"Kore"`, matching the Gemini clients.

    The speech is billed by its audio tokens, which the raw audio of the answer does not report, so
    each response counts Google's 25 audio tokens a second (llmsdk_docs/gemini4/docs/pricing.md) of
    its 16-bit PCM, the seconds from its byte length and the rate and channels of its content type,
    rounded up (MMSP-RFC-0013 §6). OpenRouter billed 46 audio tokens for 88,320 bytes of 24 kHz mono,
    1.84 s (verified live 2026-11-28).
    """

    models = r"gemini-.*tts"

    async def on_request(self, config: UniConfig, request: dict[str, Any]) -> None:
        if not config.get("tts_config"):
            request["voice"] = "Kore"

    def on_wire_event(self, wire_event: Any) -> None:
        content_type = wire_event["content_type"]
        rate = re.search(r"rate=(\d+)", content_type)
        if content_type.partition(";")[0].strip().lower() != "audio/pcm" or rate is None:
            return

        channels = re.search(r"channels=(\d+)", content_type)
        bytes_per_second = 2 * (int(channels.group(1)) if channels else 1) * int(rate.group(1))
        wire_event["response_tokens"] = math.ceil(wire_event["audio_bytes"] * 25 / bytes_per_second)
