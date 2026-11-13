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
import { openaiImageDetail } from "../../utils";

/**
 * GPT-5.6 and GPT-6 read an image at its own size by default and refuse one over 30,000 patches.
 *
 * `detail: "high"` has the API fit such an image into its patch budget instead, so the image parts
 * of the prompt and of the user message that carries a tool result's images ask for it.
 */
export class GptPlugin extends ClientPlugin {
  static readonly models = "gpt-5\\.6|gpt-6";

  async onRequest(
    _config: UniConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: Record<string, any>,
  ): Promise<void> {
    for (const message of request.messages) {
      if (!Array.isArray(message.content)) continue;

      for (const part of message.content) {
        if (part?.type !== "image_url") continue;

        const detail = openaiImageDetail(this.model, part.image_url.url);
        if (detail) part.image_url.detail = detail;
      }
    }
  }
}
