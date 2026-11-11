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
import { ThinkingLevel, type UniConfig } from "../../types";
import { openaiImageDetail } from "../../utils";

/**
 * The GPT-6 models that take the "none" reasoning effort. A gateway serving
 * GPT-6 Astra or GPT-6.1 Sol forwards the effort to OpenAI, which rejects
 * "none" and "minimal" with a 400 (verified live 2026-09-09 against
 * api.openai.com); GPT-6 Luna and GPT-6.1 Terra accept it, on OpenRouter too
 * (verified live 2026-10-14 and 2026-11-02).
 */
const GPT6_NONE_EFFORT = ["gpt-6-luna", "gpt-6.1-terra"];

/**
 * What GPT-5.6 and GPT-6 need of a Responses endpoint that forwards to OpenAI.
 *
 * The rest of GPT-6 has no off switch, so `none` runs at the lowest effort it accepts. And both
 * generations read an image at its own size by default and refuse one over 30,000 patches, so an
 * image part of a message or of a tool result asks for `detail: "high"`, which has the API fit the
 * image into its patch budget instead.
 */
export class GptPlugin extends ClientPlugin {
  static readonly models = "gpt-5\\.6|gpt-6";

  async onRequest(
    config: UniConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: Record<string, any>,
  ): Promise<void> {
    if (
      config.thinking_level === ThinkingLevel.NONE &&
      this.model.includes("gpt-6") &&
      !GPT6_NONE_EFFORT.some((model) => this.model.includes(model))
    ) {
      request.reasoning.effort = "low";
    }

    for (const entry of request.input) {
      const parts = entry?.type === "message" ? entry.content : entry?.output;
      if (!Array.isArray(parts)) continue;

      for (const part of parts) {
        if (part?.type !== "input_image") continue;

        const detail = openaiImageDetail(this.model, part.image_url);
        if (detail) part.detail = detail;
      }
    }
  }
}
