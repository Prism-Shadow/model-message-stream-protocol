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
  UnsupportedContentError,
  UnsupportedParameterError,
} from "../errors";
import { UniConfig, UniEvent, UniMessage } from "../types";
import { openaiClientOptions, resolveCredentials } from "../utils";

/** What a transcription endpoint answers, as far as the client reads it. */
interface TranscriptionAnswer {
  text: string;
  usage?: { seconds?: number };
}

/** One file to transcribe: its name, its bytes and its MIME type. */
type AudioFile = [string, Buffer, string];

// The extension an endpoint reads an upload's format from, by MIME type; another audio type takes
// its subtype
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
 * 16-bit little-endian PCM, as the Gemini clients and OpenRouter send it, behind the 44-byte
 * header of a WAV file.
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
 * OpenAI Audio Transcriptions-compatible client: speech to text by `POST /audio/transcriptions`.
 *
 * Each message is one request, its one audio item the file, uploaded in OpenAI's multipart form;
 * the endpoint answers with one JSON.
 */
export class OpenaiTranscriptionClient extends LLMClient {
  protected _model: string;
  private _client: OpenAI;

  /**
   * Initialize OpenAI-compatible transcription client with model, API key, and base URL.
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
      "openai-transcription",
      options,
    );
    this._client = new OpenAI({
      apiKey: key,
      baseURL: url,
      ...openaiClientOptions("openai-transcription", {
        baseUrl: options.baseUrl,
        apiKey: key,
        defaultHeaders: options.defaultHeaders,
      }),
    });
  }

  /**
   * Transform universal configuration to the transcription form fields besides the file.
   */
  transformUniConfigToModelConfig(config: UniConfig): Record<string, string> {
    if (config.fast_mode) {
      throw new UnsupportedParameterError({
        client: this.constructor.name,
        parameter: "fast_mode",
        message: "OpenAI transcription does not support fast mode.",
      });
    }

    return { model: this._model };
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
              "OpenAI transcription only supports audio inline_data items.",
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
   * Transcribe each message's audio using an OpenAI Audio Transcriptions-compatible API.
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
        "/audio/transcriptions",
        {
          body: form,
          signal: options.signal,
        },
      );
      yield this.transformModelOutputToUniEvent([messageIndex, answer]);

      // billed by the second of audio, a fraction rounded up
      const seconds = answer.usage?.seconds;
      if (seconds !== undefined && seconds !== null) {
        promptTokens = (promptTokens ?? 0) + Math.ceil(seconds);
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
