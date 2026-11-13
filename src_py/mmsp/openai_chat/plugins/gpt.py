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
from ...utils import openai_image_detail


class GptPlugin(ClientPlugin):
    """
    GPT-5.6 and GPT-6 read an image at its own size by default and refuse one over 30,000 patches.

    `detail: "high"` has the API fit such an image into its patch budget instead, so the image parts
    of the prompt and of the user message that carries a tool result's images ask for it.
    """

    models = r"gpt-5\.6|gpt-6"

    async def on_request(self, config: UniConfig, request: dict[str, Any]) -> None:
        for message in request["messages"]:
            if not isinstance(message.get("content"), list):
                continue

            for part in message["content"]:
                if part.get("type") == "image_url":
                    if detail := openai_image_detail(self.model, part["image_url"]["url"]):
                        part["image_url"]["detail"] = detail
