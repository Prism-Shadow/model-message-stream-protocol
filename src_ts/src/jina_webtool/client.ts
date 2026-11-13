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
import { LLMClient } from "../baseClient";
import { CLIENT_CREDENTIALS } from "../credentials";
import {
  ApiKeyRequiredError,
  InvalidMessageError,
  UnsupportedContentError,
  UnsupportedOperationError,
  UnsupportedParameterError,
} from "../errors";
import { UniConfig, UniEvent, UniMessage, WebData } from "../types";
import { openaiClientOptions, resolveCredentials } from "../utils";

/** One page of a Jina Search or Reader answer, as far as the client reads it. */
interface JinaPage {
  title?: string;
  description?: string;
  content?: string;
  url: string;
}

/** What Jina's Search or Reader answers, as far as the client reads it. */
interface JinaAnswer {
  data: JinaPage[] | JinaPage;
  meta?: { usage?: { tokens?: number } } | null;
}

/**
 * Jina's web tools: Search (`jina-search`, on s.jina.ai) and Reader (`jina-fetch`, on r.jina.ai).
 *
 * Both are plain JSON endpoints billed in tokens: a search posts to `/search`, a read to `/`, under
 * the endpoint of its model unless a base URL is passed. The OpenAI SDK carries the requests, so a
 * failure is raised as the SDK's status error in both packages.
 */
export class JinaWebtoolClient extends LLMClient {
  protected _model: string;
  private _tool: "search" | "fetch";
  private _client: OpenAI;

  /**
   * Initialize the Jina web tools client with model, API key, and base URL.
   */
  constructor(options: {
    model: string;
    apiKey?: string;
    baseUrl?: string | null;
    defaultHeaders?: Record<string, string>;
  }) {
    super();
    this._model = options.model;
    if (options.model.toLowerCase().includes("-fetch")) {
      this._tool = "fetch";
    } else if (options.model.toLowerCase().includes("-search")) {
      this._tool = "search";
    } else {
      throw new UnsupportedOperationError({
        client: this.constructor.name,
        operation: "streamingResponse",
        message: `${options.model} names neither Jina's search nor its reader: the id must contain -search or -fetch.`,
      });
    }

    const { apiKey: key, baseUrl: url } = resolveCredentials(
      this.constructor.name,
      "jina-webtool",
      options,
    );
    // The wrapped OpenAI SDK falls back to OPENAI_API_KEY when handed undefined, which would send
    // an OpenAI credential to the Jina hosts, so fail loudly instead.
    if (!key) {
      throw new ApiKeyRequiredError({
        client: this.constructor.name,
        clientType: "jina-webtool",
        baseUrl: null,
      });
    }
    // Jina reads a page on its default endpoint and searches on its other one
    const credentials = CLIENT_CREDENTIALS["jina-webtool"];
    const defaultUrl =
      this._tool === "fetch"
        ? credentials.defaultBaseUrl
        : credentials.otherBaseUrls![0];
    this._client = new OpenAI({
      apiKey: key,
      baseURL: url || defaultUrl,
      ...openaiClientOptions("jina-webtool", {
        baseUrl: options.baseUrl,
        apiKey: key,
        defaultHeaders: options.defaultHeaders,
      }),
    });
  }

  /**
   * Transform universal configuration to the Search or Reader request fields besides the query or URL.
   */
  transformUniConfigToModelConfig(config: UniConfig): Record<string, number> {
    if (config.fast_mode) {
      throw new UnsupportedParameterError({
        client: this.constructor.name,
        parameter: "fast_mode",
        message: "Jina web tools do not support fast mode.",
      });
    }

    const params: Record<string, number> = {};
    const count = config.webtool_config?.count;
    if (this._tool === "search" && count !== undefined) {
      params.num = count;
    }
    return params;
  }

  /**
   * Transform universal messages to the queries or URLs to send, one per message.
   */
  transformUniMessageToModelInput(messages: UniMessage[]): string[] {
    const texts: string[] = [];
    for (const [messageIndex, msg] of messages.entries()) {
      let msgText = "";
      for (const item of msg.content_items) {
        if (item.type !== "text.done") {
          throw new UnsupportedContentError({
            client: this.constructor.name,
            itemType: item.type,
            message: "Jina web tools only support text content items.",
          });
        }
        msgText += item.text;
      }
      if (!msgText) {
        throw new InvalidMessageError({
          client: this.constructor.name,
          message: `message ${messageIndex} has nothing ${this.constructor.name} can send`,
          messageIndex,
        });
      }
      texts.push(msgText);
    }
    return texts;
  }

  /**
   * Transform one Search or Reader answer into a universal event carrying its web tool item.
   */
  transformModelOutputToUniEvent(modelOutput: JinaAnswer): UniEvent {
    let webdata: WebData[];
    if (this._tool === "search") {
      // sent with X-Respond-With: no-content, a result carries its description and no page body
      webdata = (modelOutput.data as JinaPage[]).map((page) => ({
        title: page.title ?? "",
        content: page.description ?? "",
        url: page.url,
      }));
    } else {
      const page = modelOutput.data as JinaPage;
      webdata = [
        { title: page.title ?? "", content: page.content ?? "", url: page.url },
      ];
    }

    return {
      role: "assistant",
      event_type: "delta",
      content_items: [{ type: "webtool.delta", webdata }],
      usage_metadata: null,
      finish_reason: null,
    };
  }

  /**
   * Search the web or read a page through Jina, one request per message.
   */
  async *_streamingResponseInternal(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    const params = this.transformUniConfigToModelConfig(options.config);
    let promptTokens: number | null = null;
    for (const text of this.transformUniMessageToModelInput(options.messages)) {
      let answer: JinaAnswer;
      if (this._tool === "search") {
        answer = await this._client.post<JinaAnswer>("/search", {
          body: { q: text, ...params },
          // the results' descriptions only: reading every result page costs its tokens and time
          headers: { "X-Respond-With": "no-content" },
          signal: options.signal,
        });
      } else {
        answer = await this._client.post<JinaAnswer>("/", {
          body: { url: text, ...params },
          signal: options.signal,
        });
      }

      yield this.transformModelOutputToUniEvent(answer);
      // the tokens Jina bills for the request, summed over the requests
      const tokens = answer.meta?.usage?.tokens;
      if (tokens !== undefined && tokens !== null) {
        promptTokens = (promptTokens ?? 0) + tokens;
      }
    }

    yield {
      role: "assistant",
      event_type: "stop",
      content_items: [],
      usage_metadata: {
        cached_tokens: null,
        prompt_tokens: promptTokens,
        thoughts_tokens: null,
        response_tokens: null,
      },
      finish_reason: "stop",
    };
  }

  /**
   * Jina's web tools have no models endpoint.
   *
   * @throws UnsupportedOperationError Always.
   */
  async listModels(): Promise<string[]> {
    throw new UnsupportedOperationError({
      client: this.constructor.name,
      operation: "listModels",
      message: "Jina's web tools have no models endpoint.",
    });
  }
}
