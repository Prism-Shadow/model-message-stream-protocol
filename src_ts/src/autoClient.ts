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

import { LLMClient } from "./baseClient";
import { GeminiOfficialClient } from "./gemini_official";
import { GoogleGenaiClient } from "./google_genai";
import { AnthropicOfficialClient } from "./anthropic_official";
import { OpenAIOfficialClient } from "./openai_official";
import { ZAIOfficialClient } from "./zai_official";
import { MoonshotOfficialClient } from "./moonshot_official";
import { OpenaiChatClient } from "./openai_chat";
import { OpenaiResponsesClient } from "./openai_responses";
import { AntMessagesClient } from "./ant_messages";
import { OpenaiEmbeddingClient } from "./openai_embedding";
import { DeepSeekOfficialClient } from "./deepseek_official";
import { MiniMaxOfficialClient } from "./minimax_official";
import { OpenaiChatVllmAdapterClient } from "./openai_chat_vllm_adapter";
import { UniConfig, UniEvent, UniMessage } from "./types";

type LLMClientConstructor = new (options: {
  model: string;
  apiKey?: string;
  baseUrl?: string | null;
  defaultHeaders?: Record<string, string>;
}) => LLMClient;

// An official client speaks its vendor's own API, knows the vendor's models, and reads the
// vendor's key from the environment.
export const OFFICIAL_CLIENT_TYPES = [
  "openai-official",
  "anthropic-official",
  "gemini-official",
  "zai-official",
  "moonshot-official",
  "deepseek-official",
  "minimax-official",
] as const;

// A compatible client speaks one wire protocol for whatever endpoint serves it.
export const COMPATIBLE_CLIENT_TYPES = [
  "openai-responses",
  "openai-chat",
  "openai-chat-vllm-adapter",
  "openai-embedding",
  "ant-messages",
  "google-genai",
] as const;

// Without a client type, the family a model id begins with names its official client.
export const MODEL_FAMILIES: [string, string][] = [
  ["gpt-", "openai-official"],
  ["text-embedding-", "openai-official"],
  ["claude-", "anthropic-official"],
  ["gemini-", "gemini-official"],
  ["glm-", "zai-official"],
  ["kimi-", "moonshot-official"],
  ["deepseek-", "deepseek-official"],
  ["minimax-", "minimax-official"],
];

/**
 * The official client a model id routes to on its own, or null when its family is unknown.
 *
 * @param model - The model id, in any casing
 * @returns One of OFFICIAL_CLIENT_TYPES, or null
 */
export function clientTypeForModel(model: string): string | null {
  const lowered = model.toLowerCase();
  for (const [prefix, clientType] of MODEL_FAMILIES) {
    if (lowered.startsWith(prefix)) {
      return clientType;
    }
  }
  return null;
}

function clientTypes(): string {
  return (
    `official clients: ${OFFICIAL_CLIENT_TYPES.join(", ")}; ` +
    `compatible clients: ${COMPATIBLE_CLIENT_TYPES.join(", ")}`
  );
}

/**
 * The client class a client type names, or null when no client is named so.
 *
 * @param clientType - A lowercased client type
 * @param model - The model id, which tells an official client's embedding models apart
 */
function clientClass(
  clientType: string,
  model: string,
): LLMClientConstructor | null {
  switch (clientType) {
    case "openai-official":
      // OpenAI serves embedding models through its Embeddings API
      return model.toLowerCase().startsWith("text-embedding-")
        ? OpenaiEmbeddingClient
        : OpenAIOfficialClient;
    case "anthropic-official":
      return AnthropicOfficialClient;
    case "gemini-official":
      return GeminiOfficialClient;
    case "zai-official":
      return ZAIOfficialClient;
    case "moonshot-official":
      return MoonshotOfficialClient;
    case "deepseek-official":
      return DeepSeekOfficialClient;
    case "minimax-official":
      return MiniMaxOfficialClient;
    case "openai-responses":
      return OpenaiResponsesClient;
    case "openai-chat":
    case "openai":
      return OpenaiChatClient;
    case "openai-chat-vllm-adapter":
      return OpenaiChatVllmAdapterClient;
    case "openai-embedding":
      return OpenaiEmbeddingClient;
    case "ant-messages":
      return AntMessagesClient;
    case "google-genai":
    case "gemini-generate-content":
      return GoogleGenaiClient;
    default:
      return null;
  }
}

/**
 * The one client to call: it creates the client a client type names and forwards to it.
 *
 * A client type is one of OFFICIAL_CLIENT_TYPES or COMPATIBLE_CLIENT_TYPES, given as
 * `clientType` or as the CLIENT_TYPE environment variable. Without one, the family the model
 * id begins with names its official client: `gpt-` routes to `openai-official`, `claude-` to
 * `anthropic-official`, and so on. A model id of no known family throws, and asks for a
 * client type.
 *
 * This client is stateful - it knows the model name at initialization and maintains
 * conversation history for that specific model.
 */
export class AutoLLMClient extends LLMClient {
  private _client: LLMClient;
  private _clientType: string;
  // a client named explicitly speaks for whatever its endpoint serves (see listModels)
  private _named: boolean;

  /**
   * Initialize AutoLLMClient with a model and, unless the model id names it, a client type.
   *
   * @param options - Configuration object with model, apiKey, baseUrl, clientType and defaultHeaders
   */
  constructor(options: {
    model: string;
    apiKey?: string;
    baseUrl?: string | null;
    clientType?: string | null;
    defaultHeaders?: Record<string, string>;
  }) {
    super();
    const named = options.clientType || process.env.CLIENT_TYPE;
    const clientType = named
      ? named.toLowerCase()
      : clientTypeForModel(options.model);
    if (clientType === null) {
      throw new Error(
        `No client for model ${JSON.stringify(options.model)}: its family is not known. ` +
          `Pass clientType, one of the ${clientTypes()}.`,
      );
    }
    const ClientClass = clientClass(clientType, options.model);
    if (ClientClass === null) {
      throw new Error(
        `Unknown client type ${JSON.stringify(named)}. Pass one of the ${clientTypes()}.`,
      );
    }
    this._clientType = clientType;
    this._named = Boolean(named);
    this._client = new ClientClass({
      model: options.model,
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      defaultHeaders: options.defaultHeaders,
    });
  }

  /**
   * Delegate to underlying client's transformUniConfigToModelConfig.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformUniConfigToModelConfig(config: UniConfig): any {
    return this._client.transformUniConfigToModelConfig(config);
  }

  /**
   * Delegate to underlying client's transformUniMessageToModelInput.
   */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  transformUniMessageToModelInput(
    messages: UniMessage[],
    signal?: AbortSignal,
  ): any {
    return this._client.transformUniMessageToModelInput(messages, signal);
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  /**
   * Delegate to underlying client's transformModelOutputToUniEvent.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformModelOutputToUniEvent(modelOutput: any): UniEvent {
    return this._client.transformModelOutputToUniEvent(modelOutput);
  }

  /**
   * Not implemented - use streamingResponse instead.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, require-yield
  async *_streamingResponseInternal(_options: any): AsyncGenerator<UniEvent> {
    throw new Error("Please use streamingResponse instead.");
  }

  /**
   * Route to underlying client's streamingResponse.
   */
  async *streamingResponse(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    for await (const event of this._client.streamingResponse({
      messages: options.messages,
      config: options.config,
      signal: options.signal,
    })) {
      yield event;
    }
  }

  /**
   * Route to underlying client's streamingResponseStateful.
   */
  async *streamingResponseStateful(options: {
    message: UniMessage;
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    for await (const event of this._client.streamingResponseStateful({
      message: options.message,
      config: options.config,
      signal: options.signal,
    })) {
      yield event;
    }
  }

  /**
   * Clear history in the underlying client.
   */
  clearHistory(): void {
    this._client.clearHistory();
  }

  /**
   * Get history from the underlying client.
   */
  getHistory(): UniMessage[] {
    return this._client.getHistory();
  }

  /**
   * Set history in the underlying client.
   */
  setHistory(history: UniMessage[]): void {
    this._client.setHistory(history);
  }

  /**
   * List the model ids the endpoint serves that this client can be used for.
   *
   * A client named by its type speaks for whatever the endpoint serves, so its listing is
   * returned whole. A client deduced from a model id serves the ids that deduce to it as well,
   * so a gateway fronting many vendors is filtered down to that client's own models.
   *
   * @returns The model ids, in the order the endpoint returned them.
   */
  async listModels(): Promise<string[]> {
    const modelIds = await this._client.listModels();
    if (this._named) {
      return modelIds;
    }
    return modelIds.filter(
      (modelId) => clientTypeForModel(modelId) === this._clientType,
    );
  }
}
