// Copyright 2025 Prism Shadow. and/or its affiliates
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Compatibility with the content item types used before 0.5.0, and with tool call arguments
// recorded as an object up to 0.5.8. Scheduled for removal in 0.6.0, together with every call to
// normalizeLegacyMessages.

import { UniMessage } from "./types";

const LEGACY_ITEM_TYPES = new Set([
  "text",
  "image_url",
  "inline_data",
  "thinking",
  "inline_thinking",
  "tool_call",
  "tool_result",
  "embedding",
]);

let warned = false;
let warnedArguments = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasObjectArguments(item: any): boolean {
  return (
    (item.type === "tool_call" || item.type === "tool_call.done") &&
    typeof item.arguments !== "string"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeItem(item: any): any {
  if (LEGACY_ITEM_TYPES.has(item.type)) {
    item = { ...item, type: `${item.type}.done` };
  }
  if (hasObjectArguments(item)) {
    // JSON.stringify writes them as the clients sent them
    item = { ...item, arguments: JSON.stringify(item.arguments ?? null) };
  }
  return item;
}

/**
 * Convert messages recorded before 0.5.0 to the current content item types.
 *
 * A legacy item type such as `text` becomes `text.done`, a stray `partial_tool_call` is
 * dropped, and a tool call's arguments recorded as an object become its JSON text. Messages
 * already in the current format are returned as they are; a message that needed converting
 * is returned as a copy, so the caller's data is never modified.
 *
 * @param messages - Messages that may carry legacy content item types
 * @returns The messages with current content item types only
 */
export function normalizeLegacyMessages(messages: UniMessage[]): UniMessage[] {
  return messages.map((message) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = message.content_items as any[];
    const legacyTypes = items.some(
      (item) =>
        LEGACY_ITEM_TYPES.has(item.type) || item.type === "partial_tool_call",
    );
    const objectArguments = items.some(hasObjectArguments);
    if (!legacyTypes && !objectArguments) {
      return message;
    }

    if (objectArguments && !warnedArguments) {
      warnedArguments = true;
      process.emitWarning(
        "A tool call whose arguments is an object is deprecated and will stop being accepted in " +
          "MMSP 0.6.0; arguments is the JSON text of the call's arguments, as the model wrote it",
        "DeprecationWarning",
      );
    }

    if (legacyTypes && !warned) {
      warned = true;
      process.emitWarning(
        "Content item types without the .done suffix (text, tool_call, ...) are deprecated " +
          "and will stop being accepted in MMSP 0.6.0; use text.done, tool_call.done, ...",
        "DeprecationWarning",
      );
    }

    return {
      ...message,
      content_items: items
        .filter((item) => item.type !== "partial_tool_call")
        .map(normalizeItem),
    };
  });
}
