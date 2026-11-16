> Source: https://aistudio.google.com/docs/whats-new-gemini-4-hydrogen.md (snapshot 2026-11-16)

# What's new in Gemini 4 Hydrogen

Gemini 4 Hydrogen (`gemini-4-hydrogen`) brings cutting-edge intelligence to everyone, with speed and efficiency for everyday coding and agentic workflows.

Gemini 4 Hydrogen is available on both the free and paid tiers in Google AI Studio and the Gemini API (across both GenerateContent and the Interactions API). Like [Gemini 4 Carbon](/docs/whats-new-gemini-4-carbon) and [Gemini 4 Argon](/docs/whats-new-gemini-4-argon), it features a unified 1M-token context window and long decode up to 1M tokens. It also adds a fourth thinking level, [`xhigh`](/docs/thinking#understanding-thinking-levels), alongside `low`, `medium`, and the default `high`.

{% card-grid %}
  {% card description="View token limits, supported capabilities, and full specifications." href="/docs/models/gemini-4-hydrogen" icon="id_card" title="Model card" /%}

  {% card description="Build full-stack web apps in AI Studio Build." href="https://aistudio.google.com/apps?model=gemini-4-hydrogen" icon="experiment" title="Build in AI Studio" /%}

  {% card description="Upgrade existing workloads with the Gemini 3.8 Flash migration checklist." href="/docs/whats-new-gemini-4-hydrogen#migrate-from-gemini-3-8-flash" icon="rocket_launch" title="Migrate from 3.8 Flash" /%}

{% /card-grid %}

This guide explains what's new in Gemini 4 Hydrogen, API changes, code examples, and migration guidance.

## New model  {% id="new-model" %}

| Model | Model ID | Thinking levels | Paid tier price |
| :--- | :--- | :--- | :--- |
| Gemini 4 Hydrogen | `gemini-4-hydrogen` | `low`, `medium`, `high` (default), `xhigh` | $1.50 / 1M input, $7.50 / 1M output |

For full specifications, see the [Gemini 4 Hydrogen model page](/docs/models/gemini-4-hydrogen) and [Latest Gemini models](/docs/latest-model).

## Quickstart  {% id="quickstart" %}

Send a request to `gemini-4-hydrogen` using the Interactions API. By default, the model uses the `high` thinking level and a 64K synchronous output token limit.

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-4-hydrogen",
      input="Build an interactive single-file HTML token bucket rate-limiter simulator with live sliders for burst size and request traffic."
  )
  
  print(interaction.output_text)
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  
  const client = new GoogleGenAI({});
  
  const interaction = await client.interactions.create({
    model: "gemini-4-hydrogen",
    input: "Build an interactive single-file HTML token bucket rate-limiter simulator with live sliders for burst size and request traffic.",
  });
  
  console.log(interaction.output_text);
  ```

  {% /tab %}

  {% tab label="REST" %}
  ```bash
  curl "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
      "model": "gemini-4-hydrogen",
      "input": "Build an interactive single-file HTML token bucket rate-limiter simulator with live sliders for burst size and request traffic."
    }'
  ```

  {% /tab %}

{% /tabs %}

## What's new in Gemini 4 Hydrogen  {% id="whats-new-gemini-4-hydrogen" %}

* **Fast agentic execution:** Writes cleaner code, cuts fabricated claims by more than 5x compared to [Gemini 3.8 Flash](/docs/whats-new-gemini-3.8) by flagging missing context instead of guessing, batches read and search tool calls in parallel, and better adapts when tool calls fail.
* **Four configurable thinking levels:** Supports `low`, `medium`, `high` (default), and a new `xhigh` level, giving you finer control over latency and cost and deeper reasoning when tasks need it. See the [thinking levels](/docs/whats-new-gemini-4-hydrogen#understanding-thinking-levels) section for details.
* **Built for multi-model orchestration:** Works standalone for coding and agentic work, or pairs with Carbon and Argon to power parallel worker and verifier agents at lower latency without driving up token cost.
* **Stronger multimodal reasoning:** Reads and synthesizes tables, charts, dense PDFs, images, audio, and video with higher accuracy, and uses [agentic video understanding](/docs/video-understanding#agentic-video-understanding) to inspect specific frames and visual details.
* **Unified 1M context window and long decode:** Input, thinking, and output tokens share one 1,048,576-token window. Responses can run past 64K up to 1M tokens using background execution or client-side continuation. See [Long decode](/docs/long-decode).
* **Default model for Managed Agents:** The [Antigravity agent](/docs/antigravity-agent) now uses Gemini 4 Hydrogen (`gemini-4-hydrogen`) by default.

## Choosing between Hydrogen, Carbon, Argon, and other models  {% id="choosing-between-models" %}

Gemini 4 Hydrogen, [Gemini 4 Argon](/docs/whats-new-gemini-4-argon), and [Gemini 4 Carbon](/docs/whats-new-gemini-4-carbon) share the same 1M unified context window, long decode architecture, and built-in tools. Pick the model that matches your reasoning depth, latency, and cost target:

* **Gemini 4 Hydrogen (`gemini-4-hydrogen`):** Fast and efficient while handling complex agentic workflows, at $1.50 per 1M input tokens and $7.50 per 1M output tokens. Use it for everyday coding, interactive web apps, tool-using agents, multimodal document workflows, and parallel subagent execution. **Recommended upgrade from Gemini 3.8 Flash and earlier Gemini 3 and 2.5 models.**
* **Gemini 4 Carbon (`gemini-4-carbon`):** Our strongest frontier model. Carbon spends more thinking tokens per turn to test hypotheses and verify edge cases on hard architecture, debugging, science, and security audits.
* **Gemini 4 Argon (`gemini-4-argon`):** Use Argon when you want a model that can handle the majority of advanced long-horizon tasks with lower token use than Carbon.
* **Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`):** Our fastest, lowest-cost model. Keep Flash-Lite for high-volume classification, routing, and sub-second latency targets.

You can also pair Carbon and Hydrogen in one workflow. Have Carbon plan system interfaces or resolve hard roadblocks, then delegate code edits, parallel subagent tasks, and test runs to Hydrogen. For a full comparison, see [Latest Gemini models](/docs/latest-model#compare-models).

## Understanding thinking levels  {% id="understanding-thinking-levels" %}

The [thinking level](/docs/thinking) is your main control over quality, latency, and token use in Gemini 4 Hydrogen. The model defaults to `high` and introduces `xhigh`.

| Thinking level | Token use | When to use |
| :--- | :--- | :--- |
| `low` | Fewest tokens, lowest latency | Cost- and latency-sensitive workloads, such as fast chat and high-throughput processing. Still capable on agentic tasks. |
| `medium` | Lower token use, faster responses | Interactive coding, live UI prototyping, responsive chat, and latency-sensitive tool calls. |
| `high` (default) | Balanced intelligence and speed | Recommended default for most tasks, including complex coding, agentic execution, tool calling, and multimodal knowledge work. |
| `xhigh` | Most tokens, deepest reasoning | Reserve for hard, multi-step coding and agentic problems where `high` falls short, when you can trade higher latency and token use. |

Start with `high` for most complex tasks, and reserve `xhigh` for hard, multi-step problems where `high` falls short. Using `xhigh` increases latency and token use and can cause overthinking on simpler prompts. Run your evaluations at all four levels with a high `max_output_tokens` so the limit doesn't cut answers short. Then pick the lowest `thinking_level` that meets your quality bar. To learn more, see the [thinking guide](/docs/thinking).

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-4-hydrogen",
      input="Audit this payment retry queue for race conditions and rewrite the lock acquisition logic.",
      generation_config={
          "thinking_level": "xhigh"
      }
  )
  
  print(interaction.output_text)
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  
  const client = new GoogleGenAI({});
  
  const interaction = await client.interactions.create({
    model: "gemini-4-hydrogen",
    input: "Audit this payment retry queue for race conditions and rewrite the lock acquisition logic.",
    generation_config: {
      thinking_level: "xhigh",
    },
  });
  
  console.log(interaction.output_text);
  ```

  {% /tab %}

  {% tab label="REST" %}
  ```bash
  curl "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
      "model": "gemini-4-hydrogen",
      "input": "Audit this payment retry queue for race conditions and rewrite the lock acquisition logic.",
      "generation_config": {
        "thinking_level": "xhigh"
      }
    }'
  ```

  {% /tab %}

{% /tabs %}

## Larger output and long decode  {% id="long-decode" %}

Gemini 4 Hydrogen supports synchronous outputs up to 65,536 tokens and long decode up to the 1M unified context window:

* **Control reasoning depth with `thinking_level`:** The `thinking_level` field sets how much reasoning the model performs before answering. The `max_output_tokens` field caps combined thinking and output tokens, so leave enough room for the final answer.
* **Generate past 64K tokens with background execution or continuation:** Synchronous responses support up to 65,536 tokens per hop across both streaming and non-streaming requests. To generate longer outputs, set `max_output_tokens` above 65,536 (up to 1,048,576 minus your input tokens) and set `background` to `true` so our servers continue in 64K-token hops, or use client-side continuation in the latest Google GenAI SDKs.

{% tabs %}
  {% tab label="Python" %}
  ```python
  import time
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-4-hydrogen",
      input="Generate a complete multi-module migration specification and test suite for this service.",
      background=True,
      generation_config={
          "max_output_tokens": 262144,
          "thinking_level": "high",
      },
  )
  
  while interaction.status in ("in_progress", "queued"):
      time.sleep(5)
      interaction = client.interactions.get(id=interaction.id)
  
  # Join text across all 64K continuation hops.
  text = "".join(
      content.text
      for step in interaction.steps
      if step.type == "model_output"
      for content in step.content
      if content.type == "text"
  )
  print(text)
  print("Status:", interaction.status)
  print("Usage:", interaction.usage)
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  
  const client = new GoogleGenAI({});
  
  let interaction = await client.interactions.create({
    model: "gemini-4-hydrogen",
    input: "Generate a complete multi-module migration specification and test suite for this service.",
    background: true,
    generation_config: {
      max_output_tokens: 262144,
      thinking_level: "high",
    },
  });
  
  while (interaction.status === "in_progress" || interaction.status === "queued") {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    interaction = await client.interactions.get(interaction.id);
  }
  
  // Join text across all 64K continuation hops.
  const text = interaction.steps
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((content) => content.type === "text")
    .map((content) => content.text)
    .join("");
  console.log(text);
  console.log("Status:", interaction.status);
  console.log("Usage:", interaction.usage);
  ```

  {% /tab %}

  {% tab label="REST" %}
  ```bash
  ID=$(curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "gemini-4-hydrogen",
      "input": "Generate a complete multi-module migration specification and test suite for this service.",
      "background": true,
      "generation_config": {
        "max_output_tokens": 262144,
        "thinking_level": "high"
      }
    }' | jq -r '.id')
  
  while true; do
    RESP=$(curl -s "https://generativelanguage.googleapis.com/v1beta/interactions/$ID" \
      -H "x-goog-api-key: $GEMINI_API_KEY")
    STATUS=$(echo "$RESP" | jq -r '.status')
    if [[ "$STATUS" != "in_progress" && "$STATUS" != "queued" ]]; then
      echo "$RESP" | jq -r '[.steps[]? | select(.type == "model_output") | .content[]? | select(.type == "text") | .text] | join("")'
      break
    fi
    sleep 5
  done
  ```

  {% /tab %}

{% /tabs %}

{% callout type="note" %}
  If you set `background` to `true` without setting `max_output_tokens`, the server stops after 65,536 tokens.

{% /callout %}

Background execution is the recommended way to run long decode. For custom retry control or unstored interactions, use client-side continuation in the [Interactions API](/docs/long-decode#client-side-continuation) or the [GenerateContent API](/docs/long-decode?generate-content=true). For streaming and token counting details, see the [long decode guide](/docs/long-decode).

### Setting output token limits  {% id="setting-output-token-limits" %}

The `max_output_tokens` field caps combined thinking and output tokens for a response. Use these starting values to prevent truncated answers while bounding spend:

* **Standard tasks:** Keep the 65,536 default or omit `max_output_tokens`.
* **Existing apps with a low cap:** Remove hardcoded low caps (such as 8,192) or raise `max_output_tokens` to 65,536. To use fewer tokens, lower the thinking level instead.
* **Long outputs and multi-step tasks:** Set `background` to `true` and set `max_output_tokens` to 131,072 or 262,144, up to 1,048,576 minus your input tokens.

## Updated Antigravity agent  {% id="managed-agents" %}

Due to its improved performance and reasoning, the [Antigravity agent](/docs/antigravity-agent) in Gemini Managed Agents is now built with Gemini 4 Hydrogen (`gemini-4-hydrogen`) by default.

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  
  client = genai.Client(http_options={"api_version": "v1beta"})
  
  interaction = client.interactions.create(
      agent="antigravity-preview-09-2026",
      input=(
          "Audit https://web.dev for performance, Core Web Vitals, and SEO. "
          "Query Google's PageSpeed Insights API for both Mobile and Desktop strategies. "
          "Check search indexing with Google Search for site:web.dev. "
          "Format the output as a side-by-side scorecard table with prioritized fixes."
      ),
      environment="remote",
  )
  
  print(interaction.output_text)
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  
  const client = new GoogleGenAI({ httpOptions: { apiVersion: "v1beta" } });
  
  const interaction = await client.interactions.create({
    agent: "antigravity-preview-09-2026",
    input:
      "Audit https://web.dev for performance, Core Web Vitals, and SEO. " +
      "Query Google's PageSpeed Insights API for both Mobile and Desktop strategies. " +
      "Check search indexing with Google Search for site:web.dev. " +
      "Format the output as a side-by-side scorecard table with prioritized fixes.",
    environment: "remote",
  }, { timeout: 300000 });
  
  console.log(interaction.output_text);
  ```

  {% /tab %}

  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "Content-Type: application/json" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -d '{
      "agent": "antigravity-preview-09-2026",
      "input": "Audit https://web.dev for performance, Core Web Vitals, and SEO. Query Google'\''s PageSpeed Insights API for both Mobile and Desktop strategies. Check search indexing with Google Search for site:web.dev. Format the output as a side-by-side scorecard table with prioritized fixes.",
      "environment": "remote"
    }'
  ```

  {% /tab %}

{% /tabs %}

The underlying Gemini model [can be configured](/docs/antigravity-agent#model-selection) using `agent_config`.

## Migration checklist  {% id="migration-checklist" %}

{% callout type="note" %}
  If you use a coding agent that supports skills, such as Antigravity, install the [gemini-api-dev skill](/docs/coding-agents#gemini-api-dev) to automate this upgrade:

  ```none
  /gemini-api-dev migrate my app to Gemini 4 Hydrogen
  ```

{% /callout %}

### Migrate from Gemini 3.8 Flash and earlier  {% id="migrate-from-gemini-3-8-flash" %}

Gemini 4 Hydrogen uses the same Gemini 4 API design as Carbon and Argon. Review these changes when upgrading from `gemini-3.8-flash` or earlier Gemini 3 models:

* **Update model ID:** Change your model string from `gemini-3.8-flash` to `gemini-4-hydrogen`.
* **Account for the unified 1M context window:** Gemini 3.8 Flash separates 1M input and 64K output budgets. Hydrogen shares one 1,048,576-token window across input, thinking, and output tokens while keeping the 65,536 single-request default and cap across both streaming and non-streaming calls. Remove hardcoded low `max_output_tokens` caps or raise them to 65,536.
* **Configure `thinking_level`:** Hydrogen defaults to `high` rather than `medium`, adds `xhigh`, and rejects `minimal` with an error. Test `medium` and `high` on your evaluation suite to balance speed and cost.
* **Move off explicit context caching:** Gemini 4 Hydrogen does not support explicit caching (`cachedContents` and `caches.create`). Remove `cached_content` fields from requests. [Implicit caching](/docs/caching) runs by default on prompts of at least 4,096 tokens and discounts cached input tokens by 95% on cache hits.
* **Remove sampling parameters:** Remove `temperature`, `top_p`, and `top_k` from requests. The server ignores in-range custom values if sent. Out-of-range values return a `400` validation error.
* **Declare native tools or structured output schemas:** Do not prompt the model via system instructions to emit custom raw-text JSON tool calls with zero declared tools, which can return `MALFORMED_FUNCTION_CALL`. Always declare tools natively with [function calling](/docs/function-calling) or constrain JSON responses with [structured outputs](/docs/structured-output).
* **Preserve conversation state and thought signatures:** Use `previous_interaction_id` in the Interactions API for multi-turn and tool-calling sessions. In client-managed `generateContent` histories, return prior model turns and thought signatures unchanged across every turn. Do not copy a thought signature across parallel `functionCall` parts.
* **Use background execution for outputs past 64K:** Set `background` to `true` and `max_output_tokens` above 65,536 for responses longer than 64K tokens (or use client-side continuation in the latest SDKs).
* **Review token billing estimates:** We count and bill every token the model processes, including thinking tokens and internal grounding system instructions and function declarations.

### Migrate from or pair with Gemini 4 Carbon and Argon  {% id="migrate-from-gemini-4-argon" %}

If you run `gemini-4-carbon` or `gemini-4-argon` today, adding or switching to `gemini-4-hydrogen` requires no request schema changes:

* **Update model ID:** Set `model` to `gemini-4-hydrogen` for standalone requests or subagent turns.
* **Check default thinking level:** Hydrogen defaults to `high` and supports `xhigh`, whereas Carbon and Argon default to `medium` and cap at `high`. Set `thinking_level` when you want `medium` or `xhigh` behavior.
* **64K non-streaming hops:** Hydrogen supports up to 65,536 tokens per non-streaming hop across REST and SDK calls, compared to 32,768 tokens per non-streaming REST hop on Carbon and Argon.
* **Switch models across turns:** Route planning turns to `gemini-4-carbon` and execution turns to `gemini-4-hydrogen` in one multi-turn session using `previous_interaction_id` (or by preserving [thought steps in stateless mode](/docs/thinking#stateless-mode); see [multi-turn model compatibility](/docs/interactions-overview#limitations)).

## Pricing  {% id="pricing" %}

Gemini 4 Hydrogen is available on the free tier of the Gemini API and in Google AI Studio, and uses flat standard pricing on the paid tier across the full 1M context window:

* **Free tier:** Free of charge (rate-limited; see [rate limits](/docs/rate-limits))
* **Input tokens:** $1.50 per 1M tokens
  *   **Cached input tokens:** Implicit caching discounts cached input by 95%, to $0.075 per 1M tokens.

* **Output tokens, including thinking tokens:** $7.50 per 1M tokens

We count and bill every token the model processes, including thinking tokens and internal tool system instructions and function declarations when using grounding. Grounding with Google Search remains billed per query.

For complete tier details and rate limits, see the [pricing page](/docs/pricing#gemini-4-hydrogen) and [rate limits page](/docs/rate-limits).

## Other models  {% id="other-models" %}

* [Latest Gemini models](/docs/latest-model)
* [Gemini 4 Carbon](/docs/whats-new-gemini-4-carbon)
* [Gemini 4 Argon](/docs/whats-new-gemini-4-argon)
* [Gemini 3.8 Flash](/docs/whats-new-gemini-3.8)
* [Gemini 3.6 Flash and 3.5 Flash-Lite](/docs/whats-new-gemini-3.6)
* [See all models](/docs/models)

## What's next  {% id="whats-next" %}

* Read the [long decode guide](/docs/long-decode) for streaming, reconnection, and token counting.
* Learn how thinking levels and thought summaries work in the [thinking guide](/docs/thinking).
* Learn about asynchronous jobs in the [background execution guide](/docs/background-execution).
* Configure managed coding workflows in the [Antigravity agent guide](/docs/antigravity-agent).
* Test and refine prompts in [Google AI Studio](https://aistudio.google.com/prompts/new_chat?model=gemini-4-hydrogen).

