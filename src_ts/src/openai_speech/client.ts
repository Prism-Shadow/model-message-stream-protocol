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
import type { SpeechCreateParams } from "openai/resources/audio/speech";
import { LLMClient } from "../baseClient";
import {
  InvalidMessageError,
  UnsupportedContentError,
  UnsupportedParameterError,
} from "../errors";
import { UniConfig, UniEvent, UniMessage } from "../types";
import { openaiClientOptions, resolveCredentials } from "../utils";

/** The request's fields besides the input; a voice is optional, whatever the SDK's type says. */
type SpeechParams = Omit<SpeechCreateParams, "input" | "voice"> & {
  voice?: SpeechCreateParams["voice"];
};

/**
 * OpenAI Audio Speech-compatible client: text to speech by `POST /audio/speech`.
 *
 * The endpoint streams the audio's bytes as it makes them, in its default format. Each message is
 * one request, its text the input, and its speech one item.
 */
export class OpenaiSpeechClient extends LLMClient {
  protected _model: string;
  private _client: OpenAI;

  /**
   * Initialize OpenAI-compatible speech client with model, API key, and base URL.
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
      "openai-speech",
      options,
    );
    this._client = new OpenAI({
      apiKey: key,
      baseURL: url,
      ...openaiClientOptions("openai-speech", {
        baseUrl: options.baseUrl,
        apiKey: key,
        defaultHeaders: options.defaultHeaders,
      }),
    });
  }

  /**
   * Transform universal configuration to the speech request fields besides the input.
   *
   * No `response_format` is sent, so the endpoint answers in its default format: headerless PCM
   * on OpenRouter, MP3 on OpenAI.
   */
  transformUniConfigToModelConfig(config: UniConfig): SpeechParams {
    if (config.fast_mode) {
      throw new UnsupportedParameterError({
        client: this.constructor.name,
        parameter: "fast_mode",
        message: "OpenAI speech does not support fast mode.",
      });
    }

    // without tts_config the endpoint speaks in its default voice
    const params: SpeechParams = { model: this._model };
    const ttsConfig = config.tts_config;
    if (ttsConfig && ttsConfig.length > 0) {
      if (ttsConfig.length > 1) {
        throw new UnsupportedParameterError({
          client: this.constructor.name,
          parameter: "tts_config",
          message: `OpenAI speech does not support ${ttsConfig.length} speakers; tts_config takes 1 entry.`,
        });
      }
      params.voice = ttsConfig[0].voice;
    }
    return params;
  }

  /**
   * Transform universal messages to the inputs to speak, one per message.
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
            message: "OpenAI speech only supports text content items.",
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
   * Transform one chunk of a speech response into a universal event carrying its audio.
   *
   * modelOutput holds the index of the message spoken, the response's content type and the chunk.
   * The message's index is the item's id, so that each message's speech is one item. Headerless
   * PCM, `audio/pcm;rate=44100;channels=1` on the wire, is named `audio/l16` with its rate and
   * channels, as the Gemini clients name theirs; any other format keeps its type.
   */
  transformModelOutputToUniEvent(
    modelOutput: [number, string, Buffer],
  ): UniEvent {
    const [messageIndex, contentType, chunk] = modelOutput;
    const [mediaType, ...parameters] = contentType.split(";");
    const mimeType =
      mediaType.trim().toLowerCase() === "audio/pcm"
        ? [
            "audio/l16",
            ...parameters.map((part) => part.trim()).filter((part) => part),
          ].join("; ")
        : contentType;

    return {
      role: "assistant",
      event_type: "delta",
      content_items: [
        {
          type: "inline_data.delta",
          data: chunk,
          mime_type: mimeType,
          fidelity: { item_id: String(messageIndex) },
        },
      ],
      usage_metadata: null,
      finish_reason: null,
    };
  }

  /**
   * Speak each message using an OpenAI Audio Speech-compatible API, streaming the audio as it arrives.
   */
  async *_streamingResponseInternal(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    const params = this.transformUniConfigToModelConfig(options.config);
    let promptTokens = 0;
    for (const [messageIndex, text] of this.transformUniMessageToModelInput(
      options.messages,
    ).entries()) {
      // the SDK's type requires a voice, which an endpoint does not: without one it speaks in its own
      const response = await this._client.audio.speech.create(
        { ...params, input: text } as SpeechCreateParams,
        { signal: options.signal },
      );
      const contentType = response.headers.get("content-type") ?? "";
      const reader = response.body!.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          yield this.transformModelOutputToUniEvent([
            messageIndex,
            contentType,
            Buffer.from(value),
          ]);
        }
      } finally {
        // closes the body when this generator is closed before the audio ends
        await reader.cancel().catch(() => {});
      }
      // the endpoint reports no usage; Fish Audio bills the input's UTF-8 bytes
      promptTokens += Buffer.byteLength(text, "utf8");
    }

    yield {
      role: "assistant",
      event_type: "stop",
      content_items: [],
      usage_metadata: {
        cached_tokens: null,
        prompt_tokens: promptTokens,
        thoughts_tokens: null,
        response_tokens: 0,
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
