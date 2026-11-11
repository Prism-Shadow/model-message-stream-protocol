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
from ...types import ThinkingLevel, UniConfig
from ...utils import openai_image_detail


# The GPT-6 models that take the "none" reasoning effort. A gateway serving GPT-6 Astra or GPT-6.1 Sol
# forwards the effort to OpenAI, which rejects "none" and "minimal" with a 400 (verified live 2026-09-09
# against api.openai.com); GPT-6 Luna and GPT-6.1 Terra accept it, on OpenRouter too (verified live
# 2026-10-14 and 2026-11-02).
_GPT6_NONE_EFFORT = ("gpt-6-luna", "gpt-6.1-terra")


class GptPlugin(ClientPlugin):
    """
    What GPT-5.6 and GPT-6 need of a Responses endpoint that forwards to OpenAI.

    The rest of GPT-6 has no off switch, so `none` runs at the lowest effort it accepts. And both
    generations read an image at its own size by default and refuse one over 30,000 patches, so an
    image part of a message or of a tool result asks for `detail: "high"`, which has the API fit the
    image into its patch budget instead.
    """

    models = r"gpt-5\.6|gpt-6"

    async def on_request(self, config: UniConfig, request: dict[str, Any]) -> None:
        if (
            config.get("thinking_level") == ThinkingLevel.NONE
            and "gpt-6" in self.model
            and not any(model in self.model for model in _GPT6_NONE_EFFORT)
        ):
            request["reasoning"]["effort"] = "low"

        for entry in request["input"]:
            parts = entry.get("content") if entry.get("type") == "message" else entry.get("output")
            if not isinstance(parts, list):
                continue

            for part in parts:
                if part.get("type") == "input_image":
                    if detail := openai_image_detail(self.model, part["image_url"]):
                        part["detail"] = detail
