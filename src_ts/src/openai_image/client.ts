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
import {
  InvalidMessageError,
  ProviderStreamError,
  UnsupportedContentError,
  UnsupportedParameterError,
} from "../errors";
import { UniConfig, UniEvent, UniMessage } from "../types";
import { openaiClientOptions, resolveCredentials } from "../utils";

/** One image an answer lists, as far as the client reads it. */
interface GeneratedImage {
  b64_json?: string;
  url?: string;
  // OpenRouter names each image's type
  media_type?: string;
}

/** What an image generation endpoint answers, as far as the client reads it. */
interface ImageAnswer {
  data: GeneratedImage[];
  // OpenAI names the format of all its images
  output_format?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

// Gemini's 1K and 2K sizes for each aspect ratio of ImageConfig; every one keeps OpenAI's rules:
// sides divisible by 16, 655,360 to 8,294,400 pixels, no edge above 3840, no ratio beyond 3:1
const SIZES: Record<string, Record<string, string>> = {
  "1:1": { "1K": "1024x1024", "2K": "2048x2048" },
  "2:3": { "1K": "848x1264", "2K": "1696x2528" },
  "3:2": { "1K": "1264x848", "2K": "2528x1696" },
  "3:4": { "1K": "896x1200", "2K": "1792x2400" },
  "4:3": { "1K": "1200x896", "2K": "2400x1792" },
  "9:16": { "1K": "768x1376", "2K": "1536x2752" },
  "16:9": { "1K": "1376x768", "2K": "2752x1536" },
  "21:9": { "1K": "1584x672", "2K": "3168x1344" },
};

/**
 * OpenAI Images-compatible client: image generation by `POST /images/generations`.
 *
 * The endpoint answers each request with one JSON, whatever `stream` says: OpenAI sends a single
 * `image_generation.completed` event, OpenRouter ignores the flag, and TokenDance sends events of
 * its own. Each message is one request, its text the prompt.
 */
export class OpenaiImageClient extends LLMClient {
  protected _model: string;
  private _client: OpenAI;

  /**
   * Initialize OpenAI-compatible image generation client with model, API key, and base URL.
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
      "openai-image",
      options,
    );
    this._client = new OpenAI({
      apiKey: key,
      baseURL: url,
      ...openaiClientOptions("openai-image", {
        baseUrl: options.baseUrl,
        apiKey: key,
        defaultHeaders: options.defaultHeaders,
      }),
    });
  }

  /**
   * Transform universal configuration to the image generation request fields besides the prompt.
   *
   * `response_format` is never sent: OpenAI refuses it on its GPT Image models, and every endpoint
   * answers with `b64_json` or `url` without it.
   */
  transformUniConfigToModelConfig(config: UniConfig): Record<string, string> {
    if (config.fast_mode) {
      throw new UnsupportedParameterError({
        client: this.constructor.name,
        parameter: "fast_mode",
        message: "OpenAI image generation does not support fast mode.",
      });
    }

    const params: Record<string, string> = { model: this._model };
    const aspectRatio = config.image_config?.aspect_ratio;
    const imageSize = config.image_config?.image_size;
    if (aspectRatio !== undefined || imageSize !== undefined) {
      const size = SIZES[aspectRatio ?? "1:1"]?.[imageSize ?? "1K"];
      if (size === undefined) {
        throw new UnsupportedParameterError({
          client: this.constructor.name,
          parameter: "image_config",
          message: `OpenAI image generation does not support aspect_ratio ${JSON.stringify(aspectRatio ?? null)} with image_size ${JSON.stringify(imageSize ?? null)}.`,
        });
      }
      params.size = size;
    }
    return params;
  }

  /**
   * Transform universal messages to the prompts to send, one per message.
   */
  transformUniMessageToModelInput(messages: UniMessage[]): string[] {
    const prompts: string[] = [];
    for (const [messageIndex, msg] of messages.entries()) {
      let msgText = "";
      for (const item of msg.content_items) {
        if (item.type !== "text.done") {
          throw new UnsupportedContentError({
            client: this.constructor.name,
            itemType: item.type,
            message:
              "OpenAI image generation only supports text content items.",
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
      prompts.push(msgText);
    }
    return prompts;
  }

  /**
   * Transform one image generation answer into a universal event carrying its images.
   *
   * modelOutput pairs the JSON the endpoint answered with the bytes of each image it lists. An
   * image's MIME type is its `media_type` (OpenRouter), else the answer's `output_format` (OpenAI),
   * else the type its bytes show (TokenDance names neither).
   */
  transformModelOutputToUniEvent(
    modelOutput: [ImageAnswer, Buffer[]],
  ): UniEvent {
    const [answer, images] = modelOutput;
    return {
      role: "assistant",
      event_type: "delta",
      content_items: answer.data.map((image, index) => {
        const data = images[index];
        let mimeType: string;
        if (image.media_type) {
          mimeType = image.media_type;
        } else if (answer.output_format) {
          mimeType = `image/${answer.output_format}`;
        } else if (
          data.subarray(0, 8).equals(Buffer.from("\x89PNG\r\n\x1a\n", "latin1"))
        ) {
          mimeType = "image/png";
        } else if (
          data.subarray(0, 4).toString("latin1") === "RIFF" &&
          data.subarray(8, 12).toString("latin1") === "WEBP"
        ) {
          mimeType = "image/webp";
        } else if (
          ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("latin1"))
        ) {
          mimeType = "image/gif";
        } else {
          mimeType = "image/jpeg";
        }
        return {
          type: "inline_data.delta" as const,
          data,
          mime_type: mimeType,
        };
      }),
      usage_metadata: null,
      finish_reason: null,
    };
  }

  /**
   * The bytes of one image an answer lists: its `b64_json` decoded, else its `url` downloaded.
   *
   * The `url` points at the gateway's object storage, not at the endpoint, so the download goes
   * through a fetch of its own and carries no credential, neither the key nor the default headers
   * (MMSP-RFC-0006 §7).
   *
   * @throws ProviderStreamError The download answered with an HTTP error, whose status is the code.
   */
  private async _imageBytes(
    image: GeneratedImage,
    signal?: AbortSignal,
  ): Promise<Buffer> {
    if (image.b64_json) {
      return Buffer.from(image.b64_json, "base64");
    }

    const response = await fetch(image.url!, { signal });
    if (!response.ok) {
      throw new ProviderStreamError({
        client: this.constructor.name,
        code: response.status,
        message: `The generated image could not be downloaded: ${response.status} ${response.statusText}`,
      });
    }
    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Generate images using an OpenAI Images-compatible API, one request per message.
   */
  async *_streamingResponseInternal(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    const params = this.transformUniConfigToModelConfig(options.config);
    let promptTokens: number | null = null;
    let responseTokens: number | null = null;
    for (const prompt of this.transformUniMessageToModelInput(
      options.messages,
    )) {
      const answer = await this._client.post<ImageAnswer>(
        "/images/generations",
        {
          body: { ...params, prompt },
          signal: options.signal,
        },
      );
      const images: Buffer[] = [];
      for (const image of answer.data) {
        images.push(await this._imageBytes(image, options.signal));
      }
      yield this.transformModelOutputToUniEvent([answer, images]);

      // OpenAI reports input and output tokens, OpenRouter prompt and completion tokens, and
      // TokenDance the output tokens alone; each count is summed over the requests
      const usage = answer.usage ?? {};
      const promptCount = usage.input_tokens ?? usage.prompt_tokens;
      if (promptCount !== undefined && promptCount !== null) {
        promptTokens = (promptTokens ?? 0) + promptCount;
      }
      const responseCount = usage.output_tokens ?? usage.completion_tokens;
      if (responseCount !== undefined && responseCount !== null) {
        responseTokens = (responseTokens ?? 0) + responseCount;
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
        response_tokens: responseTokens,
      },
      finish_reason: "stop",
    };
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
