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

import openai

from ...plugin import ClientPlugin
from ...types import ThinkingLevel, UniConfig


# Mistral's scale has no `medium`, so the middle level takes `high`, the next value it knows; `none`
# names nothing to send, because a model that reasons by default has no off switch there and one
# that waits to be asked is off already.
_REASONING_EFFORT = {
    ThinkingLevel.LOW: "low",
    ThinkingLevel.MEDIUM: "high",
    ThinkingLevel.HIGH: "high",
    ThinkingLevel.XHIGH: "xhigh",
    ThinkingLevel.MAX: "max",
}


def _chunk_text(value: Any) -> str:
    """The text of a content chunk's own field: a string, a text block or a list of them."""
    if isinstance(value, str):
        return value

    if isinstance(value, list):
        return "".join(_chunk_text(block) for block in value)

    if isinstance(value, dict) and isinstance(value.get("text"), str):
        return value["text"]

    return ""


class MistralPlugin(ClientPlugin):
    """
    Mistral's endpoint, which differs from Chat Completions in three ways.

    It streams a model's thinking inside `delta.content`, as a list of content chunks next to the
    answer's: `[{"type": "thinking", "thinking": [{"type": "text", "text": "…"}]}, {"type": "text",
    "text": "…"}]`. It refuses a replayed `reasoning_content` or `reasoning` with 422
    `extra_forbidden` and takes the thinking back only as such a chunk. And it turns a model's
    reasoning on only through `reasoning_effort`, which it validates per model, refusing the whole
    request for a model that does not reason; its model list says which ones do.
    """

    hosts = ("mistral.ai",)

    def __init__(self, model: str, base_url: str, sdk: Any) -> None:
        super().__init__(model, base_url, sdk)
        # whether the model list says this model reasons, read once per client
        self._reasons: bool | None = None

    async def _model_reasons(self) -> bool:
        """Whether Mistral's model list marks this model `capabilities.reasoning`; anything else reads as no."""
        if self._reasons is None:
            try:
                entries = [entry async for entry in self.sdk.models.list()]
            except openai.APIError:
                # without the list nothing says the model takes the parameter, and one it does
                # not take fails the whole request
                return False

            entry = next((entry for entry in entries if entry.id == self.model), None)
            capabilities = getattr(entry, "capabilities", None) or {}
            self._reasons = isinstance(capabilities, dict) and capabilities.get("reasoning") is True

        return self._reasons

    async def on_request(self, config: UniConfig, request: dict[str, Any]) -> None:
        for message in request["messages"]:
            # an unknown field goes out under both names with the same text
            reasoning_content = message.pop("reasoning_content", None)
            reasoning = message.pop("reasoning", None)
            thinking = reasoning_content or reasoning
            if thinking:
                content = message.get("content") or []
                if isinstance(content, str):
                    content = [{"type": "text", "text": content}]

                # the form the endpoint streamed: the thinking first, then the answer
                message["content"] = [
                    {"type": "thinking", "thinking": [{"type": "text", "text": thinking}], "closed": True},
                    *content,
                ]

        effort = _REASONING_EFFORT.get(config.get("thinking_level"))
        if effort is not None and await self._model_reasons():
            request["reasoning_effort"] = effort

    def on_wire_event(self, wire_event: Any) -> None:
        for choice in wire_event.choices or []:
            delta = choice.delta
            if not isinstance(delta.content, list):
                continue

            # read as the transform reads any endpoint: the thinking in `reasoning_content`, the
            # answer's text in `content`
            thinking = ""
            text = ""
            for chunk in delta.content:
                if isinstance(chunk, str):
                    text += chunk
                elif isinstance(chunk, dict) and chunk.get("type") == "thinking":
                    thinking += _chunk_text(chunk.get("thinking"))
                elif isinstance(chunk, dict):
                    text += _chunk_text(chunk.get("text"))

            delta.content = text or None
            if thinking:
                delta.reasoning_content = (getattr(delta, "reasoning_content", None) or "") + thinking
