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

import OpenAI from "openai";

import { ClientPlugin } from "../../plugin";
import { ThinkingLevel, type UniConfig } from "../../types";

// Mistral's scale has no `medium`, so the middle level takes `high`, the next value it knows; `none`
// names nothing to send, because a model that reasons by default has no off switch there and one
// that waits to be asked is off already.
const REASONING_EFFORT: Partial<Record<ThinkingLevel, string>> = {
  [ThinkingLevel.LOW]: "low",
  [ThinkingLevel.MEDIUM]: "high",
  [ThinkingLevel.HIGH]: "high",
  [ThinkingLevel.XHIGH]: "xhigh",
  [ThinkingLevel.MAX]: "max",
};

/**
 * The text of a content chunk's own field: a string, a text block or a list of them.
 */
function chunkText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(chunkText).join("");
  if (value && typeof value === "object") {
    const text = (value as { text?: unknown }).text;
    if (typeof text === "string") return text;
  }

  return "";
}

/**
 * Mistral's endpoint, which differs from Chat Completions in three ways.
 *
 * It streams a model's thinking inside `delta.content`, as a list of content chunks next to the
 * answer's: `[{type: "thinking", thinking: [{type: "text", text: "…"}]}, {type: "text", text: "…"}]`.
 * It refuses a replayed `reasoning_content` or `reasoning` with 422 `extra_forbidden` and takes the
 * thinking back only as such a chunk. And it turns a model's reasoning on only through
 * `reasoning_effort`, which it validates per model, refusing the whole request for a model that
 * does not reason; its model list says which ones do.
 */
export class MistralPlugin extends ClientPlugin {
  static readonly hosts = ["mistral.ai"];

  // whether the model list says this model reasons, read once per client
  private _reasons: boolean | null = null;

  /**
   * Whether Mistral's model list marks this model `capabilities.reasoning`; anything else reads
   * as no.
   */
  private async _modelReasons(signal?: AbortSignal): Promise<boolean> {
    if (this._reasons === null) {
      let reasons = false;
      try {
        for await (const entry of (this.sdk as OpenAI).models.list({
          signal,
        })) {
          if (entry.id === this.model) {
            const capabilities = (
              entry as unknown as { capabilities?: { reasoning?: unknown } }
            ).capabilities;
            reasons = capabilities?.reasoning === true;
            break;
          }
        }
      } catch (error) {
        // without the list nothing says the model takes the parameter, and one it does not take
        // fails the whole request
        if (error instanceof OpenAI.APIError && !(error instanceof OpenAI.APIUserAbortError)) {
          return false;
        }
        throw error;
      }
      this._reasons = reasons;
    }

    return this._reasons;
  }

  async onRequest(
    config: UniConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: Record<string, any>,
    signal?: AbortSignal,
  ): Promise<void> {
    for (const message of request.messages) {
      // an unknown field goes out under both names with the same text
      const thinking = message.reasoning_content || message.reasoning;
      delete message.reasoning_content;
      delete message.reasoning;
      if (thinking) {
        const content =
          typeof message.content === "string"
            ? [{ type: "text", text: message.content }]
            : (message.content ?? []);
        // the form the endpoint streamed: the thinking first, then the answer
        message.content = [
          {
            type: "thinking",
            thinking: [{ type: "text", text: thinking }],
            closed: true,
          },
          ...content,
        ];
      }
    }

    const level = config.thinking_level;
    const effort = level ? REASONING_EFFORT[level] : undefined;
    if (effort !== undefined && (await this._modelReasons(signal))) {
      request.reasoning_effort = effort;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onWireEvent(wireEvent: any): void {
    for (const choice of wireEvent.choices ?? []) {
      const delta = choice?.delta;
      if (!Array.isArray(delta?.content)) continue;

      // read as the transform reads any endpoint: the thinking in `reasoning_content`, the
      // answer's text in `content`
      let thinking = "";
      let text = "";
      for (const chunk of delta.content) {
        if (typeof chunk === "string") {
          text += chunk;
        } else if (chunk?.type === "thinking") {
          thinking += chunkText(chunk.thinking);
        } else {
          text += chunkText(chunk?.text);
        }
      }

      delta.content = text || null;
      if (thinking) delta.reasoning_content = (delta.reasoning_content ?? "") + thinking;
    }
  }
}
