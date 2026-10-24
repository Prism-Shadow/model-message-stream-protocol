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
import { GoogleOfficialClient } from "./google_official";
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
import { MmspClient } from "./mmsp";
import {
  COMPATIBLE_CLIENT_TYPES,
  OFFICIAL_CLIENT_TYPES,
  clientTypeForModel,
  routedClientType,
} from "./credentials";
import { RoutingError, UnsupportedOperationError } from "./errors";
import { UniConfig, UniEvent, UniMessage } from "./types";

type LLMClientConstructor = new (options: {
  model: string;
  apiKey?: string;
  baseUrl?: string | null;
  defaultHeaders?: Record<string, string>;
}) => LLMClient;

function clientTypes(): string {
  return (
    `official clients: ${OFFICIAL_CLIENT_TYPES.join(", ")}; ` +
    `compatible clients: ${COMPATIBLE_CLIENT_TYPES.join(", ")}`
  );
}

/**
 * The client class of a client type routedClientType returns.
 *
 * @param clientType - A canonical client type
 * @param model - The model id the client is created for, carried by the error
 */
function clientClass(clientType: string, model: string): LLMClientConstructor {
  switch (clientType) {
    case "openai-official":
      return OpenAIOfficialClient;
    case "anthropic-official":
      return AnthropicOfficialClient;
    case "google-official":
      return GoogleOfficialClient;
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
      return OpenaiChatClient;
    case "openai-chat-vllm-adapter":
      return OpenaiChatVllmAdapterClient;
    case "openai-embedding":
      return OpenaiEmbeddingClient;
    case "ant-messages":
      return AntMessagesClient;
    case "google-genai":
      return GoogleGenaiClient;
    case "mmsp":
      return MmspClient;
    default:
      throw new RoutingError({
        model,
        clientType,
        message: `No client class for client type ${clientType}.`,
      });
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
  // the official client the model id's family names, whose ids a deduced client lists
  private _family: string | null;
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
    const clientType = routedClientType(options.model, named);
    if (clientType === null) {
      throw new RoutingError({
        model: options.model,
        clientType: named || null,
        message: named
          ? `Unknown client type ${JSON.stringify(named)}. Pass one of the ${clientTypes()}.`
          : `No client for model ${JSON.stringify(options.model)}: its family is not known. ` +
            `Pass clientType, one of the ${clientTypes()}.`,
      });
    }
    this._family = clientTypeForModel(options.model);
    this._named = Boolean(named);
    const ClientClass = clientClass(clientType, options.model);
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
    throw new UnsupportedOperationError({
      client: "AutoLLMClient",
      operation: "_streamingResponseInternal",
      message: "Please use streamingResponse instead.",
    });
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
      (modelId) => clientTypeForModel(modelId) === this._family,
    );
  }
}
