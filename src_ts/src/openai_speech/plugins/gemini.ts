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

import { ClientPlugin } from "../../plugin";
import type { UniConfig } from "../../types";

/**
 * What Gemini TTS models need on an OpenAI Audio Speech-compatible endpoint.
 *
 * OpenRouter's `/api/v1/audio/speech` refuses a Gemini TTS request without `voice` (`400 "An
 * explicit voice is required for this TTS provider."`, verified live 2026-11-19), so an unset
 * `tts_config` speaks in `"Kore"`, matching the Gemini clients.
 *
 * The speech is billed by its audio tokens, which the raw audio of the answer does not report, so
 * each response counts Google's 25 audio tokens a second (llmsdk_docs/gemini4/docs/pricing.md) of
 * its 16-bit PCM, the seconds from its byte length and the rate and channels of its content type,
 * rounded up (MMSP-RFC-0013 §6). OpenRouter billed 46 audio tokens for 88,320 bytes of 24 kHz mono,
 * 1.84 s (verified live 2026-11-28).
 */
export class GeminiPlugin extends ClientPlugin {
  static readonly models = "gemini-.*tts";

  async onRequest(
    config: UniConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: Record<string, any>,
  ): Promise<void> {
    if (!config.tts_config || config.tts_config.length === 0) {
      request.voice = "Kore";
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onWireEvent(wireEvent: any): void {
    const contentType: string = wireEvent.content_type;
    const rate = /rate=(\d+)/.exec(contentType);
    if (
      contentType.split(";")[0].trim().toLowerCase() !== "audio/pcm" ||
      rate === null
    ) {
      return;
    }

    const channels = /channels=(\d+)/.exec(contentType);
    const bytesPerSecond =
      2 * (channels ? Number(channels[1]) : 1) * Number(rate[1]);
    wireEvent.response_tokens = Math.ceil(
      (wireEvent.audio_bytes * 25) / bytesPerSecond,
    );
  }
}
