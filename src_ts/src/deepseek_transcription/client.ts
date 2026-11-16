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

/** What DeepSeek's speech to text answers. */
interface TranscriptionAnswer {
  request_id: string;
  text: string;
  duration_ms?: number;
}

/** One file to transcribe: its name, its bytes and its MIME type. */
type AudioFile = [string, Buffer, string];

// The extension an upload is named with, by MIME type; another audio type takes its subtype
const EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
};

/**
 * 16-bit little-endian PCM, as the Gemini clients and DeepSeek's speech send it, behind the
 * 44-byte header of a WAV file.
 */
function pcmToWav(pcm: Buffer, rate: number, channels: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "latin1");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "latin1");
  header.write("fmt ", 12, "latin1");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "latin1");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/**
 * DeepSeek's speech to text (`deepseek-asr`) by `POST /v1/tools/asr` under the base URL.
 *
 * Each message is one request, its one audio item the form's `file`; the endpoint reads the
 * format from the bytes, taking 16-bit PCM WAV and Ogg Opus, and answers with one JSON. The
 * OpenAI SDK carries the requests, as DeepSeek answers errors in OpenAI's format.
 */
export class DeepSeekTranscriptionClient extends LLMClient {
  protected _model: string;
  private _client: OpenAI;

  /**
   * Initialize the DeepSeek transcription client with model, API key, and base URL.
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
      "deepseek-transcription",
      options,
    );
    // The wrapped OpenAI SDK falls back to OPENAI_API_KEY when handed undefined, which would send
    // an OpenAI credential to the DeepSeek host, so fail loudly instead.
    if (!key) {
      throw new ApiKeyRequiredError({
        client: this.constructor.name,
        clientType: "deepseek-transcription",
        baseUrl: null,
      });
    }
    this._client = new OpenAI({
      apiKey: key,
      baseURL:
        url || CLIENT_CREDENTIALS["deepseek-transcription"].defaultBaseUrl,
      ...openaiClientOptions("deepseek-transcription", {
        baseUrl: options.baseUrl,
        apiKey: key,
        defaultHeaders: options.defaultHeaders,
      }),
    });
  }

  /**
   * Transform universal configuration to the transcription form fields besides the file: none.
   */
  transformUniConfigToModelConfig(config: UniConfig): Record<string, string> {
    if (config.fast_mode) {
      throw new UnsupportedParameterError({
        client: this.constructor.name,
        parameter: "fast_mode",
        message: "DeepSeek transcription does not support fast mode.",
      });
    }

    return {};
  }

  /**
   * Transform universal messages to the files to transcribe, one per message.
   *
   * Headerless PCM (`audio/l16`, `audio/pcm`) is wrapped in a WAV header built from the rate and
   * channels its MIME type names.
   */
  transformUniMessageToModelInput(messages: UniMessage[]): AudioFile[] {
    const files: AudioFile[] = [];
    for (const [messageIndex, msg] of messages.entries()) {
      let audio: { data: Buffer; mime_type: string } | null = null;
      for (const item of msg.content_items) {
        if (
          item.type !== "inline_data.done" ||
          !item.mime_type.toLowerCase().startsWith("audio/")
        ) {
          throw new UnsupportedContentError({
            client: this.constructor.name,
            itemType: item.type,
            message:
              "DeepSeek transcription only supports audio inline_data items.",
          });
        }
        if (audio !== null) {
          throw new InvalidMessageError({
            client: this.constructor.name,
            message: `message ${messageIndex} holds more than one audio item; ${this.constructor.name} transcribes one per message`,
            itemType: "inline_data",
            messageIndex,
          });
        }
        audio = item;
      }
      if (audio === null) {
        throw new InvalidMessageError({
          client: this.constructor.name,
          message: `message ${messageIndex} has nothing ${this.constructor.name} can send`,
          messageIndex,
        });
      }

      const [rawMediaType, ...parameters] = audio.mime_type.split(";");
      let mediaType = rawMediaType.trim().toLowerCase();
      let data = audio.data;
      if (mediaType === "audio/l16" || mediaType === "audio/pcm") {
        const pcmFormat: Record<string, string> = {};
        for (const parameter of parameters) {
          const [name, value = ""] = parameter.split("=");
          pcmFormat[name.trim().toLowerCase()] = value.trim();
        }
        if (!pcmFormat.rate) {
          throw new InvalidMessageError({
            client: this.constructor.name,
            message: `message ${messageIndex} holds PCM audio whose MIME type ${JSON.stringify(audio.mime_type)} names no rate`,
            itemType: "inline_data",
            messageIndex,
          });
        }
        data = pcmToWav(
          data,
          Number(pcmFormat.rate),
          Number(pcmFormat.channels || 1),
        );
        mediaType = "audio/wav";
      }

      const extension = EXTENSIONS[mediaType] ?? mediaType.split("/")[1];
      files.push([`audio.${extension}`, data, mediaType]);
    }
    return files;
  }

  /**
   * Transform one transcription answer into a universal event carrying its text.
   *
   * modelOutput pairs the index of the message transcribed with the JSON the endpoint answered.
   * The message's index is the item's id, so that each message's text is one item.
   */
  transformModelOutputToUniEvent(
    modelOutput: [number, TranscriptionAnswer],
  ): UniEvent {
    const [messageIndex, answer] = modelOutput;
    return {
      role: "assistant",
      event_type: "delta",
      content_items: [
        {
          type: "text.delta",
          text: answer.text,
          fidelity: { item_id: String(messageIndex) },
        },
      ],
      usage_metadata: null,
      finish_reason: null,
    };
  }

  /**
   * Transcribe each message's audio through DeepSeek's speech to text.
   */
  async *_streamingResponseInternal(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    const params = this.transformUniConfigToModelConfig(options.config);
    let promptTokens: number | null = null;
    for (const [
      messageIndex,
      [name, data, mimeType],
    ] of this.transformUniMessageToModelInput(options.messages).entries()) {
      const form = new FormData();
      for (const [field, value] of Object.entries(params)) {
        form.append(field, value);
      }
      form.append(
        "file",
        new Blob([new Uint8Array(data)], { type: mimeType }),
        name,
      );
      // a FormData body goes out as a multipart form, its boundary set by fetch
      const answer = await this._client.post<TranscriptionAnswer>(
        "/v1/tools/asr",
        {
          body: form,
          signal: options.signal,
        },
      );
      yield this.transformModelOutputToUniEvent([messageIndex, answer]);

      // billed by the second of audio, a fraction rounded up
      const durationMs = answer.duration_ms;
      if (durationMs !== undefined && durationMs !== null) {
        promptTokens = (promptTokens ?? 0) + Math.ceil(durationMs / 1000);
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
        response_tokens: 0,
      },
      finish_reason: "stop",
    };
  }

  /**
   * DeepSeek's speech to text has no models endpoint.
   *
   * @throws UnsupportedOperationError Always.
   */
  async listModels(): Promise<string[]> {
    throw new UnsupportedOperationError({
      client: this.constructor.name,
      operation: "listModels",
      message: "DeepSeek's speech to text has no models endpoint.",
    });
  }
}
