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
import { UniConfig, UniEvent, UniMessage } from "../types";
import { openaiClientOptions, resolveCredentials } from "../utils";

/** The request's fields besides the text. */
interface SpeechParams {
  format: "pcm";
  voice_id?: string;
}

// The Han ideographs, which DeepSeek bills as two characters each: the CJK Unified Ideographs with
// Extension A, the CJK Compatibility Ideographs, and the Supplementary and Tertiary Ideographic
// Planes, which hold Extensions B to J and the Compatibility Ideographs Supplement
const HAN =
  /[\u{3400}-\u{4dbf}\u{4e00}-\u{9fff}\u{f900}-\u{faff}\u{20000}-\u{3ffff}]/gu;

/**
 * DeepSeek's text to speech (`deepseek-tts`) by `POST /v1/tools/tts` under the base URL.
 *
 * The endpoint streams the audio's bytes as it makes them. Each message is one request, its text
 * the input, and its speech one item. The OpenAI SDK carries the requests, as DeepSeek answers
 * errors in OpenAI's format.
 */
export class DeepSeekSpeechClient extends LLMClient {
  protected _model: string;
  private _client: OpenAI;

  /**
   * Initialize the DeepSeek speech client with model, API key, and base URL.
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
      "deepseek-speech",
      options,
    );
    // The wrapped OpenAI SDK falls back to OPENAI_API_KEY when handed undefined, which would send
    // an OpenAI credential to the DeepSeek host, so fail loudly instead.
    if (!key) {
      throw new ApiKeyRequiredError({
        client: this.constructor.name,
        clientType: "deepseek-speech",
        baseUrl: null,
      });
    }
    this._client = new OpenAI({
      apiKey: key,
      baseURL: url || CLIENT_CREDENTIALS["deepseek-speech"].defaultBaseUrl,
      ...openaiClientOptions("deepseek-speech", {
        baseUrl: options.baseUrl,
        apiKey: key,
        defaultHeaders: options.defaultHeaders,
      }),
    });
  }

  /**
   * Transform universal configuration to the speech request fields besides the text.
   *
   * The audio is asked for as headerless PCM, whose chunks join into the whole; DeepSeek's
   * default, WAV, opens with a header that cannot know the audio's length while it streams.
   */
  transformUniConfigToModelConfig(config: UniConfig): SpeechParams {
    if (config.fast_mode) {
      throw new UnsupportedParameterError({
        client: this.constructor.name,
        parameter: "fast_mode",
        message: "DeepSeek speech does not support fast mode.",
      });
    }

    // without tts_config DeepSeek speaks in its default voice, stella
    const params: SpeechParams = { format: "pcm" };
    const ttsConfig = config.tts_config;
    if (ttsConfig && ttsConfig.length > 0) {
      if (ttsConfig.length > 1) {
        throw new UnsupportedParameterError({
          client: this.constructor.name,
          parameter: "tts_config",
          message: `DeepSeek speech does not support ${ttsConfig.length} speakers; tts_config takes 1 entry.`,
        });
      }
      params.voice_id = ttsConfig[0].voice;
    }
    return params;
  }

  /**
   * Transform universal messages to the texts to speak, one per message.
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
            message: "DeepSeek speech only supports text content items.",
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
   * PCM, `audio/pcm; rate=24000; encoding=signed-integer; bits=16; channels=1` on the wire, is
   * named `audio/l16` with its rate and channels, as the Gemini clients name theirs; any other
   * format keeps its type.
   */
  transformModelOutputToUniEvent(
    modelOutput: [number, string, Buffer],
  ): UniEvent {
    const [messageIndex, contentType, chunk] = modelOutput;
    // a chunk holding less than a frame adds nothing until the next one completes it
    if (chunk.length === 0) {
      return {
        role: "assistant",
        event_type: "delta",
        content_items: [],
        usage_metadata: null,
        finish_reason: null,
      };
    }

    const [mediaType, ...parameters] = contentType.split(";");
    let mimeType = contentType;
    if (mediaType.trim().toLowerCase() === "audio/pcm") {
      const pcmFormat: Record<string, string> = {};
      for (const parameter of parameters) {
        const [name, value = ""] = parameter.split("=");
        pcmFormat[name.trim().toLowerCase()] = value.trim();
      }
      mimeType = [
        "audio/l16",
        ...["rate", "channels"]
          .filter((name) => pcmFormat[name])
          .map((name) => `${name}=${pcmFormat[name]}`),
      ].join("; ");
    }

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
   * Speak each message through DeepSeek's text to speech, streaming the audio as it arrives.
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
      // the SDK hands back the response unread, its body streamed, as its own speech endpoint does
      const response = await this._client
        .post("/v1/tools/tts", {
          body: { text, ...params },
          signal: options.signal,
        })
        .asResponse();
      const contentType = response.headers.get("content-type") ?? "";
      // raw PCM goes out in whole frames, one 16-bit sample per channel, so that each fragment
      // plays as it arrives: the first bytes of a frame a chunk splits wait for the next chunk
      const channels = /channels=(\d+)/.exec(contentType);
      const frameSize = 2 * (channels ? Number(channels[1]) : 1);
      const isPcm =
        contentType.split(";")[0].trim().toLowerCase() === "audio/pcm";
      let pending = Buffer.alloc(0);
      const reader = response.body!.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          pending = Buffer.concat([pending, value]);
          const whole = isPcm
            ? pending.length - (pending.length % frameSize)
            : pending.length;
          yield this.transformModelOutputToUniEvent([
            messageIndex,
            contentType,
            pending.subarray(0, whole),
          ]);
          pending = pending.subarray(whole);
        }
        if (pending.length > 0) {
          yield this.transformModelOutputToUniEvent([
            messageIndex,
            contentType,
            pending,
          ]);
        }
      } finally {
        // closes the body when this generator is closed before the audio ends
        await reader.cancel().catch(() => {});
      }
      // the endpoint reports no usage; DeepSeek bills characters, a Han character as two
      promptTokens += [...text].length + (text.match(HAN)?.length ?? 0);
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
   * DeepSeek's text to speech has no models endpoint.
   *
   * @throws UnsupportedOperationError Always.
   */
  async listModels(): Promise<string[]> {
    throw new UnsupportedOperationError({
      client: this.constructor.name,
      operation: "listModels",
      message: "DeepSeek's text to speech has no models endpoint.",
    });
  }
}
