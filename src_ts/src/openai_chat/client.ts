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
import * as path from "path";
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";
import { LLMClient } from "../baseClient";
import { CLIENT_CREDENTIALS } from "../credentials";
import { InvalidMessageError, UnsupportedParameterError } from "../errors";
import {
  EventContentItem,
  EventType,
  Fidelity,
  FinishReason,
  PromptCaching,
  ToolChoice,
  UniConfig,
  UniEvent,
  UniMessage,
  UsageMetadata,
} from "../types";
import {
  fixOpenrouterUsageMetadata,
  openaiClientOptions,
  openaiImageDetail,
  resolveCredentials,
} from "../utils";

/**
 * OpenAI Chat Completions-compatible client implementation.
 */
export class OpenaiChatClient extends LLMClient {
  // the client type whose credentials this class reads; the vLLM adapter subclass names its own
  protected static readonly clientType: string = "openai-chat";
  protected _model: string;
  private _client: OpenAI;

  /**
   * Initialize OpenAI-compatible chat client with model, API key, and base URL.
   */
  constructor(options: {
    model: string;
    apiKey?: string;
    baseUrl?: string | null;
    defaultHeaders?: Record<string, string>;
  }) {
    super();
    this._model = options.model;
    const { apiKey: key, baseUrl: url } = resolveCredentials(
      this.constructor.name,
      new.target.clientType,
      options,
    );
    // The OpenAI SDK fills a key and an endpoint it is not handed from OPENAI_API_KEY and
    // OPENAI_BASE_URL, and sends a key with every request. So the SDK is handed this client type's
    // own default endpoint, and a client of an open server with no key sends the placeholder EMPTY,
    // as vLLM's docs do for a server started without --api-key.
    const { defaultBaseUrl, openServer } =
      CLIENT_CREDENTIALS[new.target.clientType];
    const sdkKey = key ?? (openServer ? "EMPTY" : undefined);
    this._client = new OpenAI({
      apiKey: sdkKey,
      baseURL: url || defaultBaseUrl,
      ...openaiClientOptions(new.target.clientType, {
        baseUrl: options.baseUrl,
        apiKey: sdkKey,
        defaultHeaders: options.defaultHeaders,
      }),
    });
  }

  /**
   * Detect MIME type from URL extension for image.
   */
  private _detectImageMimeType(url: string): string {
    const ext = path.extname(url).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      ".bmp": "image/bmp",
      ".gif": "image/gif",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".tiff": "image/tiff",
      ".webp": "image/webp",
    };
    return mimeTypes[ext] || "image/jpeg";
  }

  /**
   * Convert image URL to base64-encoded data URL.
   */
  private async _convertImageUrlToBase64(
    url: string,
    signal?: AbortSignal,
  ): Promise<string> {
    if (url.startsWith("data:")) {
      return url;
    }

    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new InvalidMessageError({
        client: this.constructor.name,
        message: `Failed to fetch image: ${response.status} ${response.statusText}`,
        itemType: "image_url",
      });
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = this._detectImageMimeType(url);
    const base64String = buffer.toString("base64");
    return `data:${mimeType};base64,${base64String}`;
  }

  /**
   * Convert ToolChoice to OpenAI Chat Completions tool_choice format.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _convertToolChoice(toolChoice: ToolChoice): any {
    if (Array.isArray(toolChoice)) {
      return {
        type: "allowed_tools",
        allowed_tools: {
          mode: "auto",
          tools: toolChoice.map((name) => ({
            type: "function",
            function: { name },
          })),
        },
      };
    }

    return toolChoice;
  }

  /**
   * Convert a fetched image to an image_url part, at the detail the API needs
   * to read it.
   */
  private _convertImageUrl(dataUrl: string): {
    type: "image_url";
    image_url: { url: string; detail?: "high" };
  } {
    const detail = openaiImageDetail(this._model, dataUrl);
    return detail
      ? { type: "image_url", image_url: { url: dataUrl, detail } }
      : { type: "image_url", image_url: { url: dataUrl } };
  }

  /**
   * Transform universal configuration to OpenAI Chat Completions configuration.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformUniConfigToModelConfig(config: UniConfig): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openaiConfig: any = {
      model: this._model,
      stream: true,
      stream_options: { include_usage: true },
    };

    if (config.max_tokens !== undefined) {
      openaiConfig.max_completion_tokens = config.max_tokens;
    }

    if (config.temperature !== undefined) {
      openaiConfig.temperature = config.temperature;
    }

    if (config.tools !== undefined) {
      openaiConfig.tools = config.tools.map((tool) => ({
        type: "function",
        function: tool,
      }));
    }

    if (config.tool_choice !== undefined) {
      openaiConfig.tool_choice = this._convertToolChoice(config.tool_choice);
    }

    if (config.fast_mode) {
      openaiConfig.service_tier = "priority";
    }

    if (
      config.prompt_caching !== undefined &&
      config.prompt_caching !== PromptCaching.ENABLE
    ) {
      throw new UnsupportedParameterError({
        client: this.constructor.name,
        parameter: "prompt_caching",
        message: "prompt_caching must be ENABLE for OpenAI.",
      });
    }

    return openaiConfig;
  }

  /**
   * Transform universal message format to OpenAI Chat Completions message format.
   */
  async transformUniMessageToModelInput(
    messages: UniMessage[],
    signal?: AbortSignal,
  ): Promise<ChatCompletionMessageParam[]> {
    const openaiMessages: ChatCompletionMessageParam[] = [];
    // The reasoning field this upstream has produced so far, if any. A turn the model answered
    // without thinking still has to carry that field, empty, when it made tool calls: DeepSeek
    // stops thinking part-way through a long tool chain, and then rejects the replay of that
    // turn with "the reasoning_content in the thinking mode must be passed back to the API".
    // It waives that only for tool_call ids it issued itself, which a relay that reissues ids
    // takes away. A conversation that never produced a reasoning field never receives one.
    const replayFields = new Set<string | undefined>();

    for (const [messageIndex, msg] of messages.entries()) {
      const messageStart = openaiMessages.length;
      const contentParts: Array<{
        type: string;
        text?: string;
        image_url?: { url: string; detail?: "high" };
      }> = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolCalls: any[] = [];
      let thinking = "";
      const thinkingFields = new Set<string | undefined>();
      const reasoningDetails: Record<string, unknown>[] = [];

      for (const item of msg.content_items) {
        if (item.type === "text.done") {
          contentParts.push({ type: "text", text: item.text });
        } else if (item.type === "image_url.done") {
          const base64Image = await this._convertImageUrlToBase64(
            item.image_url,
            signal,
          );
          contentParts.push(this._convertImageUrl(base64Image));
        } else if (item.type === "thinking.done") {
          thinking += item.thinking;
          const fidelity = item.fidelity ?? {};
          thinkingFields.add(fidelity.reasoning_field);
          if (item.thinking) replayFields.add(fidelity.reasoning_field);

          // a gateway's encrypted reasoning block, rebuilt from the recorded
          // keys; the format marks the data as a block of this protocol, so
          // encrypted reasoning a Responses client recorded off its own server
          // is not sent as one
          if (fidelity.encrypted_content != null && fidelity.format != null) {
            const block: Record<string, unknown> = {
              type: "reasoning.encrypted",
              data: fidelity.encrypted_content,
              format: fidelity.format,
            };
            if (fidelity.reasoning_id != null) block.id = fidelity.reasoning_id;
            reasoningDetails.push(block);
          }

          // 0.5.5 recorded the block as received; read until 0.6.0
          reasoningDetails.push(...(fidelity.reasoning_details ?? []));
        } else if (item.type === "tool_call.done") {
          toolCalls.push({
            id: item.tool_call_id,
            type: "function",
            function: {
              name: item.name,
              arguments: JSON.stringify(item.arguments, null, 0),
            },
          });
        } else if (item.type === "tool_result.done") {
          if (!item.tool_call_id) {
            throw new InvalidMessageError({
              client: this.constructor.name,
              message: "tool_call_id is required for tool result.",
              itemType: "tool_result",
            });
          }

          // Chat Completions lets a tool message carry text only, and a server that
          // validates the schema rejects the whole request over an image part in one.
          // The images ride in the user message that follows the turn's tool messages,
          // the one place every OpenAI-compatible server reads them.
          if (item.images && item.images.length > 0) {
            for (const imageUrl of item.images) {
              const base64Image = await this._convertImageUrlToBase64(
                imageUrl,
                signal,
              );
              contentParts.push(this._convertImageUrl(base64Image));
            }
          }

          // the plain string is the form every OpenAI-compatible server accepts
          openaiMessages.push({
            role: "tool",
            tool_call_id: item.tool_call_id,
            content: item.text,
          });
        } else {
          throw new InvalidMessageError({
            client: this.constructor.name,
            message: `Unknown item type: ${(item as { type: string }).type}`,
            itemType: (item as { type: string }).type,
          });
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message: any = { role: msg.role };
      if (contentParts.length > 0) {
        message.content = contentParts;
      }

      if (toolCalls.length > 0) {
        message.tool_calls = toolCalls;
      }

      // This turn's own fidelity when it thought; otherwise the field the upstream has
      // produced, with `thinking` still "" — the empty value is what keeps the turn replayable.
      const fields = thinking ? thinkingFields : replayFields;
      if (thinking || (toolCalls.length > 0 && replayFields.size > 0)) {
        // send thinking back through the exact field the upstream produced (recorded
        // in the item fidelity); servers may reject the spelling they did not emit
        if (fields.size === 1 && fields.has("reasoning_content")) {
          message.reasoning_content = thinking;
        } else if (fields.size === 1 && fields.has("reasoning")) {
          message.reasoning = thinking;
        } else {
          // the field is unknown, so both spellings go out; a server reads the one it knows
          message.reasoning_content = thinking;
          message.reasoning = thinking;
        }
      }

      // a gateway hands the model its encrypted reasoning or thought signature
      // only from the blocks it sent; without them it accepts the turn and the
      // reasoning is lost
      if (reasoningDetails.length > 0) {
        message.reasoning_details = reasoningDetails;
      }

      // a message of tool results went out as its tool messages; one of thinking alone is an
      // assistant turn with neither content nor tool calls
      if (
        contentParts.length === 0 &&
        toolCalls.length === 0 &&
        openaiMessages.length === messageStart
      ) {
        throw new InvalidMessageError({
          client: this.constructor.name,
          message: `message ${messageIndex} has nothing ${this.constructor.name} can send`,
          messageIndex,
        });
      }

      if (Object.keys(message).length > 1) {
        openaiMessages.push(message);
      }
    }

    return openaiMessages;
  }

  /**
   * Transform one OpenAI Chat Completions streaming chunk into a universal event.
   *
   * Chat Completions gives an item no identity, so each delta's item_id is the wire field
   * that carried it: an item runs until a delta arrives from another field, or names the next
   * tool call.
   */
  transformModelOutputToUniEvent(modelOutput: ChatCompletionChunk): UniEvent {
    let eventType: EventType = "delta";
    const contentItems: EventContentItem[] = [];
    let usageMetadata: UsageMetadata | null = null;
    let finishReason: FinishReason | null = null;

    // gateways inject content-free heartbeat chunks on long generations, whose
    // choices arrive as undefined rather than an empty list
    if (modelOutput.choices?.length) {
      const choice = modelOutput.choices[0];
      const delta = choice?.delta;

      // the thinking field name differs by server (reasoning_content or
      // reasoning); record the wire field that carried each delta so a replay
      // reproduces the field the upstream produced. The reasoning goes before
      // the content because a chunk may end the reasoning and begin the answer.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reasoningContent = (delta as any)?.reasoning_content;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reasoning = (delta as any)?.reasoning;
      // A gateway may stream the reasoning as reasoning_details blocks and
      // mirror their text in `reasoning`. A reasoning.summary or reasoning.text
      // block is the thinking text. A reasoning.encrypted block is opaque data
      // the gateway takes back only as it sent it: its data is the item's
      // encrypted_content, with the block's format and the id by which a
      // gateway binds a thought signature to the call it signs. The block
      // arrives whole, so its delta carries the item's one fidelity.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reasoningDetails = (delta as any)?.reasoning_details;
      if (reasoningDetails?.length) {
        for (const block of reasoningDetails) {
          const fidelity: Fidelity = { item_id: "reasoning_details" };
          if (block.type === "reasoning.encrypted") {
            fidelity.encrypted_content = block.data;
            if (block.format != null) fidelity.format = block.format;
            if (block.id != null) fidelity.reasoning_id = block.id;
          }

          contentItems.push({
            type: "thinking.delta",
            thinking: block.summary || block.text || "",
            fidelity,
          });
        }
      } else if (reasoningContent && reasoning) {
        // ambiguous origin: record no reasoning_field so a replay sends both fields back
        contentItems.push({
          type: "thinking.delta",
          thinking: reasoningContent,
          fidelity: { item_id: "reasoning_content" },
        });
      } else if (reasoningContent) {
        contentItems.push({
          type: "thinking.delta",
          thinking: reasoningContent,
          fidelity: {
            item_id: "reasoning_content",
            reasoning_field: "reasoning_content",
          },
        });
      } else if (reasoning) {
        contentItems.push({
          type: "thinking.delta",
          thinking: reasoning,
          fidelity: { item_id: "reasoning", reasoning_field: "reasoning" },
        });
      }

      if (delta?.content) {
        contentItems.push({
          type: "text.delta",
          text: delta.content,
          fidelity: { item_id: "content" },
        });
      }

      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          contentItems.push({
            type: "tool_call.delta",
            name: toolCall.function?.name || "",
            arguments: toolCall.function?.arguments || "",
            tool_call_id: toolCall.id || toolCall.function?.name || "",
            fidelity: { item_id: "tool_calls" },
          });
        }
      }

      if (choice?.finish_reason) {
        eventType = "stop";
        const finishReasonMapping: { [key: string]: FinishReason } = {
          stop: "stop",
          length: "length",
          tool_calls: "tool_call",
          content_filter: "stop",
        };
        finishReason = finishReasonMapping[choice.finish_reason] || "unknown";
      }
    }

    if (modelOutput.usage) {
      eventType = "stop";

      const cachedTokens =
        modelOutput.usage.prompt_tokens_details?.cached_tokens ?? null;
      const reasoningTokens =
        modelOutput.usage.completion_tokens_details?.reasoning_tokens ?? null;

      const promptTokens =
        cachedTokens !== null
          ? modelOutput.usage.prompt_tokens - cachedTokens
          : modelOutput.usage.prompt_tokens;
      const responseTokens =
        reasoningTokens !== null
          ? modelOutput.usage.completion_tokens - reasoningTokens
          : modelOutput.usage.completion_tokens;

      usageMetadata = {
        cached_tokens: cachedTokens,
        prompt_tokens: promptTokens,
        thoughts_tokens: reasoningTokens,
        response_tokens: responseTokens,
      };
      usageMetadata = fixOpenrouterUsageMetadata(
        usageMetadata,
        this._client.baseURL,
      );
    }

    return {
      role: "assistant",
      event_type: eventType,
      content_items: contentItems,
      usage_metadata: usageMetadata,
      finish_reason: finishReason,
    };
  }

  /**
   * Stream generate using OpenAI Chat Completions-compatible API.
   */
  async *_streamingResponseInternal(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    const openaiConfig = this.transformUniConfigToModelConfig(options.config);
    const openaiMessages = await this.transformUniMessageToModelInput(
      options.messages,
      options.signal,
    );

    if (options.config.system_prompt) {
      openaiMessages.unshift({
        role: "system",
        content: options.config.system_prompt,
      });
    }

    const params: ChatCompletionCreateParamsStreaming = {
      ...openaiConfig,
      messages: openaiMessages,
      stream: true,
    };

    const stream = await this._client.chat.completions.create(params, {
      signal: options.signal,
    });

    for await (const chunk of stream) {
      yield this.transformModelOutputToUniEvent(chunk);
    }
  }

  /**
   * List the model ids the configured endpoint serves.
   *
   * @returns The model ids, in the order the endpoint returned them.
   */
  async listModels(): Promise<string[]> {
    const models: string[] = [];
    for await (const model of this._client.models.list()) {
      models.push(model.id);
    }

    return models;
  }
}
