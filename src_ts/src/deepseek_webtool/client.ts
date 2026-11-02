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

/** One result of DeepSeek's Search, as far as the client reads it. */
interface SearchResult {
  title: string;
  url: string;
  summary: string;
}

/** What DeepSeek's Search answers, as far as the client reads it. */
interface SearchAnswer {
  results: SearchResult[];
}

/** What DeepSeek's Fetch answers. */
interface FetchAnswer {
  title: string;
  content: string;
}

/**
 * DeepSeek's web tools: Search (`deepseek-search`) and Fetch (`deepseek-fetch`).
 *
 * Both are plain JSON endpoints, `/v1/tools/search` and `/v1/tools/fetch` under the base URL,
 * billed per request; a gateway such as TokenDance serves them under the same paths. The OpenAI
 * SDK carries the requests, as DeepSeek answers errors in OpenAI's format.
 */
export class DeepSeekWebtoolClient extends LLMClient {
  protected _model: string;
  private _tool: "search" | "fetch";
  private _client: OpenAI;

  /**
   * Initialize the DeepSeek web tools client with model, API key, and base URL.
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
        message: `${options.model} names neither DeepSeek's search nor its fetch: the id must contain -search or -fetch.`,
      });
    }

    const { apiKey: key, baseUrl: url } = resolveCredentials(
      this.constructor.name,
      "deepseek-webtool",
      options,
    );
    // The wrapped OpenAI SDK falls back to OPENAI_API_KEY when handed undefined, which would send
    // an OpenAI credential to the DeepSeek host, so fail loudly instead.
    if (!key) {
      throw new ApiKeyRequiredError({
        client: this.constructor.name,
        clientType: "deepseek-webtool",
        baseUrl: null,
      });
    }
    this._client = new OpenAI({
      apiKey: key,
      baseURL: url || CLIENT_CREDENTIALS["deepseek-webtool"].defaultBaseUrl,
      ...openaiClientOptions("deepseek-webtool", {
        baseUrl: options.baseUrl,
        apiKey: key,
        defaultHeaders: options.defaultHeaders,
      }),
    });
  }

  /**
   * Transform universal configuration to the Search or Fetch request fields besides the query or URL.
   */
  transformUniConfigToModelConfig(config: UniConfig): Record<string, number> {
    if (config.fast_mode) {
      throw new UnsupportedParameterError({
        client: this.constructor.name,
        parameter: "fast_mode",
        message: "DeepSeek web tools do not support fast mode.",
      });
    }

    const params: Record<string, number> = {};
    const count = config.webtool_config?.count;
    if (this._tool === "search" && count !== undefined) {
      params.count = count;
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
            message: "DeepSeek web tools only support text content items.",
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
   * Transform one Search or Fetch answer into a universal event carrying its web tool item.
   *
   * modelOutput pairs the query or URL sent with the JSON the endpoint answered: a fetch answers
   * with the page's title and Markdown but not its address, which is the URL sent.
   */
  transformModelOutputToUniEvent(
    modelOutput: [string, SearchAnswer | FetchAnswer],
  ): UniEvent {
    const [sent, answer] = modelOutput;
    let webdata: WebData[];
    if (this._tool === "search") {
      // the long summary DeepSeek writes for a model to read; content stays empty without need_content
      webdata = (answer as SearchAnswer).results.map((result) => ({
        title: result.title,
        content: result.summary,
        url: result.url,
      }));
    } else {
      const page = answer as FetchAnswer;
      webdata = [{ title: page.title, content: page.content, url: sent }];
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
   * Search the web or fetch a page through DeepSeek, one request per message.
   */
  async *_streamingResponseInternal(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    const params = this.transformUniConfigToModelConfig(options.config);
    let requests = 0;
    for (const text of this.transformUniMessageToModelInput(options.messages)) {
      const body =
        this._tool === "search"
          ? { query: text, ...params }
          : { url: text, ...params };
      const answer = await this._client.post<SearchAnswer | FetchAnswer>(
        `/v1/tools/${this._tool}`,
        { body, signal: options.signal },
      );
      requests += 1;
      yield this.transformModelOutputToUniEvent([text, answer]);
    }

    // DeepSeek bills a request, not tokens, so each request counts as one prompt token
    yield {
      role: "assistant",
      event_type: "stop",
      content_items: [],
      usage_metadata: {
        cached_tokens: null,
        prompt_tokens: requests,
        thoughts_tokens: null,
        response_tokens: null,
      },
      finish_reason: "stop",
    };
  }

  /**
   * DeepSeek's web tools have no models endpoint.
   *
   * @throws UnsupportedOperationError Always.
   */
  async listModels(): Promise<string[]> {
    throw new UnsupportedOperationError({
      client: this.constructor.name,
      operation: "listModels",
      message: "DeepSeek's web tools have no models endpoint.",
    });
  }
}
