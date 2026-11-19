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

from typing import Any

from ...plugin import ClientPlugin
from ...types import UniConfig


class GeminiPlugin(ClientPlugin):
    """
    What Gemini TTS models need on an OpenAI Audio Speech-compatible endpoint.

    OpenRouter's `/api/v1/audio/speech` refuses a Gemini TTS request without `voice` (`400 "An
    explicit voice is required for this TTS provider."`, verified live 2026-11-19), so an unset
    `tts_config` speaks in `"Kore"`, matching the Gemini clients.
    """

    models = r"gemini-.*tts"

    async def on_request(self, config: UniConfig, request: dict[str, Any]) -> None:
        if not config.get("tts_config"):
            request["voice"] = "Kore"
