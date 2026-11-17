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

# Compatibility with the content item types used before 0.5.0, and with tool call arguments recorded
# as an object up to 0.5.8. Scheduled for removal in 0.6.0, together with every call to
# normalize_legacy_messages.

import json
import warnings

from .types import UniMessage


_LEGACY_ITEM_TYPES = {
    "text",
    "image_url",
    "inline_data",
    "thinking",
    "inline_thinking",
    "tool_call",
    "tool_result",
    "embedding",
}

_warned = False
_warned_arguments = False


def _has_object_arguments(item: dict) -> bool:
    return item["type"] in ("tool_call", "tool_call.done") and not isinstance(item.get("arguments"), str)


def normalize_legacy_messages(messages: list[UniMessage]) -> list[UniMessage]:
    """Convert messages recorded before 0.5.0 to the current content item types.

    A legacy item type such as `text` becomes `text.done`, a stray `partial_tool_call` is
    dropped, and a tool call's arguments recorded as an object become its JSON text. Messages
    already in the current format are returned as they are; a message that needed converting
    is returned as a copy, so the caller's data is never modified.

    Args:
        messages: Messages that may carry legacy content item types

    Returns:
        The messages with current content item types only
    """
    global _warned, _warned_arguments
    normalized: list[UniMessage] = []
    for message in messages:
        items = message["content_items"]
        legacy_types = any(item["type"] in _LEGACY_ITEM_TYPES or item["type"] == "partial_tool_call" for item in items)
        object_arguments = any(_has_object_arguments(item) for item in items)
        if not legacy_types and not object_arguments:
            normalized.append(message)
            continue

        if object_arguments and not _warned_arguments:
            _warned_arguments = True
            warnings.warn(
                "A tool call whose arguments is an object is deprecated and will stop being accepted in "
                "MMSP 0.6.0; arguments is the JSON text of the call's arguments, as the model wrote it",
                FutureWarning,
                stacklevel=2,
            )

        if legacy_types and not _warned:
            _warned = True
            warnings.warn(
                "Content item types without the .done suffix (text, tool_call, ...) are deprecated "
                "and will stop being accepted in MMSP 0.6.0; use text.done, tool_call.done, ...",
                FutureWarning,
                stacklevel=2,
            )

        normalized.append(
            {
                **message,
                "content_items": [_normalize_item(item) for item in items if item["type"] != "partial_tool_call"],
            }
        )

    return normalized


def _normalize_item(item: dict) -> dict:
    if item["type"] in _LEGACY_ITEM_TYPES:
        item = {**item, "type": f"{item['type']}.done"}
    if _has_object_arguments(item):
        # the separators json.dumps writes are the ones the clients sent these arguments with
        item = {**item, "arguments": json.dumps(item.get("arguments"), ensure_ascii=False)}
    return item
