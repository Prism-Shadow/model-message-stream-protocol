> Source: https://aistudio.google.com/docs/whats-new-gemini-4-neon.md (snapshot 2026-11-19)

# What's new in Gemini 4 Neon

Gemini 4 Neon (`gemini-4-neon`) brings frontier-level intelligence with fast end-to-end task completion across complex software engineering, knowledge work, and science workflows. It sits between [Gemini 4 Hydrogen](/docs/whats-new-gemini-4-hydrogen) and [Gemini 4 Carbon](/docs/whats-new-gemini-4-carbon) for high-frequency complex tasks.

Gemini 4 Neon is available on the paid tier of the Gemini API (across both `generateContent` and the Interactions API) and with Google AI Pro and Ultra plans in Google AI Studio. Like the other Gemini 4 models, it features a unified 1M-token context window and long decode up to 1M tokens. It supports four thinking levels: `low`, `medium`, `high` (default), and [`xhigh`](/docs/thinking#understanding-thinking-levels).

{% card-grid %}
  {% card description="View token limits, supported capabilities, and full specifications." href="/docs/models/gemini-4-neon" icon="id_card" title="Model card" /%}

  {% card description="Test prompts with Gemini 4 Neon in Google AI Studio." href="https://aistudio.google.com/prompts/new_chat?model=gemini-4-neon" icon="experiment" title="Try in AI Studio" /%}

  {% card description="Move existing workloads to Gemini 4 Neon with the migration checklist." href="/docs/whats-new-gemini-4-neon#migration-checklist" icon="rocket_launch" title="Migrate to Neon" /%}

{% /card-grid %}

This guide explains what's new in Gemini 4 Neon, API changes, code examples, and migration guidance.

## New model  {% id="new-model" %}

| Model | Model ID | Thinking levels | Paid tier price |
| :--- | :--- | :--- | :--- |
| Gemini 4 Neon | `gemini-4-neon` | `low`, `medium`, `high` (default), `xhigh` | $3.00 / 1M input, $15.00 / 1M output |

For full specifications, see the [Gemini 4 Neon model page](/docs/models/gemini-4-neon) and [Latest Gemini models](/docs/latest-model).

## Quickstart  {% id="quickstart" %}

Send a request to `gemini-4-neon` using the Interactions API. By default, the model uses the `high` thinking level and a 64K synchronous output token limit.

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-4-neon",
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
    model: "gemini-4-neon",
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
      "model": "gemini-4-neon",
      "input": "Build an interactive single-file HTML token bucket rate-limiter simulator with live sliders for burst size and request traffic."
    }'
  ```

  {% /tab %}

{% /tabs %}

## What's new in Gemini 4 Neon  {% id="whats-new-gemini-4-neon" %}

* **Frontier-level intelligence with fast end-to-end task completion:** Delivers frontier-level quality across complex software engineering, knowledge work, and science workflows with leaner token usage and faster end-to-end task completion, at $3.00 per 1M input tokens and $15.00 per 1M output tokens.
* **Built for complex software engineering and agentic execution:** Completes repository-level debugging and multi-file refactoring in fewer steps with clean edits. Across long sessions with many tool calls, Neon reduces redundant file reads, handles context compaction reliably, and minimizes fabricated claims and task shortcuts.
* **Knowledge work, science, and analytical reasoning:** Synthesizes dense documents, spreadsheets, charts, and multi-step tool outputs across its 1M-token context window into structured deliverables, with strong performance on legal, finance, science, and quantitative tasks.
* **Cybersecurity and reliability:** Writes code with fewer security vulnerabilities, improves root-cause vulnerability patching, and reduces agentic overreach and under-service in multi-step workflows. Dual-use offensive cyberdefense capabilities are available to defenders through the [Fairwind Program](https://deepmind.google/fairwind-program/).
* **Four configurable thinking levels:** Supports `low`, `medium`, `high` (default), and `xhigh`, letting you tune reasoning depth, latency, and token spend for each workload. See the [thinking levels](/docs/whats-new-gemini-4-neon#understanding-thinking-levels) section for details.
* **Unified 1M context window and long decode:** Input, thinking, and output tokens share one 1,048,576-token window. Responses can run past 64K up to 1M tokens using background execution or client-side continuation. See [Long decode](/docs/long-decode).
* **Supported in Managed Agents:** The [Antigravity agent](/docs/antigravity-agent) in Gemini Managed Agents supports `gemini-4-neon`, either standalone or paired with Hydrogen in multi-model workflows.

## Choosing between Neon, Carbon, Hydrogen, and other models  {% id="choosing-between-models" %}

Gemini 4 Neon sits between [Gemini 4 Hydrogen](/docs/whats-new-gemini-4-hydrogen) and [Gemini 4 Carbon](/docs/whats-new-gemini-4-carbon). Use Neon for complex software engineering, knowledge work, and science workflows where you want frontier-level intelligence with fast end-to-end task completion. Use Carbon for your hardest architecture, debugging, science, and security problems. Keep Hydrogen as the default for everyday coding and agentic workflows, and [Gemini 3.5 Flash-Lite](/docs/whats-new-gemini-3.6) for high-volume, low-latency tasks.

For side-by-side comparisons, specialized model recommendations, and multi-model code examples, see [Choosing a model](/docs/choosing-a-model).

## Understanding thinking levels  {% id="understanding-thinking-levels" %}

The [thinking level](/docs/thinking) is your main control over quality, latency, and token use in Gemini 4 Neon. The model defaults to `high` and supports `xhigh`.

| Thinking level | Token use | When to use |
| :--- | :--- | :--- |
| `low` | Fewest tokens, lowest latency | Cost- and latency-sensitive workloads, such as fast chat and high-throughput processing. Still capable on agentic tasks. |
| `medium` | Lower token use, faster responses | Interactive coding, live UI prototyping, responsive chat, and latency-sensitive tool calls. |
| `high` (default) | Balanced intelligence and speed | Recommended default for most tasks, including complex coding, agentic execution, tool calling, and multimodal knowledge work. |
| `xhigh` | Most tokens, deepest reasoning | Reserve for hard, multi-step engineering, analytical, and scientific problems where `high` falls short, when you can trade higher latency and token use. |

Start with `high` for most complex tasks, and reserve `xhigh` for hard, multi-step problems where `high` falls short. Using `xhigh` increases latency and token use. Run your evaluations at all four levels with a high `max_output_tokens` so the limit doesn't cut answers short. Then pick the lowest `thinking_level` that meets your quality bar. To learn more, see the [thinking guide](/docs/thinking).

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-4-neon",
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
    model: "gemini-4-neon",
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
      "model": "gemini-4-neon",
      "input": "Audit this payment retry queue for race conditions and rewrite the lock acquisition logic.",
      "generation_config": {
        "thinking_level": "xhigh"
      }
    }'
  ```

  {% /tab %}

{% /tabs %}

## Larger output and long decode  {% id="long-decode" %}

Gemini 4 Neon supports synchronous outputs up to 65,536 tokens and long decode up to the 1M unified context window:

* **Control reasoning depth with `thinking_level`:** The `thinking_level` field sets how much reasoning the model performs before answering. The `max_output_tokens` field caps combined thinking and output tokens, so leave enough room for the final answer.
* **Generate past 64K tokens with background execution or continuation:** Synchronous responses support up to 65,536 tokens per hop across both streaming and non-streaming requests. To generate longer outputs, set `max_output_tokens` above 65,536 (up to 1,048,576 minus your input tokens) and set `background` to `true` so our servers continue in 64K-token hops, or use client-side continuation in the latest Google GenAI SDKs.

{% tabs %}
  {% tab label="Python" %}
  ```python
  import time
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-4-neon",
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
    model: "gemini-4-neon",
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
      "model": "gemini-4-neon",
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

Background execution is the recommended way to run long decode. For custom retry control or unstored interactions, use client-side continuation in the [Interactions API](/docs/long-decode#client-side-continuation) or the [`generateContent` API](/docs/long-decode?generate-content=true). For streaming and token counting details, see the [long decode guide](/docs/long-decode).

### Setting output token limits  {% id="setting-output-token-limits" %}

The `max_output_tokens` field caps combined thinking and output tokens for a response. Use these starting values to prevent truncated answers while bounding spend:

* **Standard tasks:** Keep the 65,536 default or omit `max_output_tokens`.
* **Existing apps with a low cap:** Remove hardcoded low caps (such as 8,192) or raise `max_output_tokens` to 65,536. To use fewer tokens, lower the thinking level instead.
* **Long outputs and multi-step tasks:** Set `background` to `true` and set `max_output_tokens` to 131,072 or 262,144, up to 1,048,576 minus your input tokens.

## Migration checklist  {% id="migration-checklist" %}

{% callout type="note" %}
  If you use a coding agent that supports skills, such as Antigravity, install the [gemini-api-dev skill](/docs/coding-agents#gemini-api-dev) to automate this upgrade:

  ```none
  /gemini-api-dev migrate my app to Gemini 4 Neon
  ```

{% /callout %}

### Migrate from Gemini 4 Carbon, Argon, or Hydrogen  {% id="migrate-from-gemini-4" %}

If you run another Gemini 4 model today, switching to `gemini-4-neon` requires no request schema changes:

* **Update model ID:** Set `model` to `gemini-4-neon`.
* **Check default thinking level:** Neon defaults to `high` and supports `xhigh`, like Hydrogen. Carbon and Argon default to `medium` and cap at `high`. Set `thinking_level` when you want different behavior.
* **Use a paid tier project:** Neon is available on the paid tier only (not on the free tier).

### Migrate from Gemini 3 and earlier  {% id="migrate-from-gemini-3" %}

Gemini 4 Neon uses the same Gemini 4 API design as Carbon, Argon, and Hydrogen. Review these changes when upgrading from `gemini-3.8-flash` or earlier Gemini 3 models:

* **Update model ID:** Change your model string to `gemini-4-neon`.
* **Account for the unified 1M context window:** Gemini 3.8 Flash separates 1M input and 64K output budgets. Neon shares one 1,048,576-token window across input, thinking, and output tokens while keeping the 65,536 single-request default and cap across both streaming and non-streaming calls. Remove hardcoded low `max_output_tokens` caps or raise them to 65,536.
* **Configure `thinking_level`:** Neon defaults to `high` rather than `medium`, adds `xhigh`, and rejects `minimal` with an error. Test `medium` and `high` on your evaluation suite to balance speed and cost.
* **Move off explicit context caching:** Gemini 4 Neon does not support explicit caching (`cachedContents` and `caches.create`). Remove `cached_content` fields from requests. [Implicit caching](/docs/caching) runs by default on prompts of at least 4,096 tokens and discounts cached input tokens by 95% on cache hits.
* **Remove sampling parameters:** Remove `temperature`, `top_p`, and `top_k` from requests. The server ignores in-range custom values if sent. Out-of-range values return a `400` validation error.
* **Declare native tools or structured output schemas:** Do not prompt the model via system instructions to emit custom raw-text JSON tool calls with zero declared tools, which can return `MALFORMED_FUNCTION_CALL`. Always declare tools natively with [function calling](/docs/function-calling) or constrain JSON responses with [structured outputs](/docs/structured-output).
* **Preserve conversation state and thought signatures:** Use `previous_interaction_id` in the Interactions API for multi-turn and tool-calling sessions. In client-managed `generateContent` histories, return prior model turns and thought signatures unchanged across every turn. Do not copy a thought signature across parallel `functionCall` parts.
* **Use background execution for outputs past 64K:** Set `background` to `true` and `max_output_tokens` above 65,536 for responses longer than 64K tokens (or use client-side continuation in the latest SDKs).
* **Increase client timeouts:** Hard prompts can take several minutes. Use background execution, or set HTTP client timeouts to at least 15 minutes.
* **Review token billing estimates:** We count and bill every token the model processes, including thinking tokens and internal grounding system instructions and function declarations.

## Pricing  {% id="pricing" %}

Gemini 4 Neon is available on the paid tier of the Gemini API only. It uses flat pricing across the full 1M context window:

* **Input tokens:** $3.00 per 1M tokens
  *   **Cached input tokens:** Implicit caching discounts cached input by 95%, to $0.15 per 1M tokens.

* **Output tokens, including thinking tokens:** $15.00 per 1M tokens

We count and bill every token the model processes, including thinking tokens and internal tool system instructions and function declarations when using grounding. Grounding with Google Search remains billed per query.

For complete tier details and rate limits, see the [pricing page](/docs/pricing#gemini-4-neon) and [rate limits page](/docs/rate-limits).

## Other models  {% id="other-models" %}

* [Latest Gemini models](/docs/latest-model)
* [Gemini 4 Carbon](/docs/whats-new-gemini-4-carbon)
* [Gemini 4 Argon](/docs/whats-new-gemini-4-argon)
* [Gemini 4 Hydrogen](/docs/whats-new-gemini-4-hydrogen)
* [Gemini 3.8 Flash](/docs/whats-new-gemini-3.8)
* [Gemini 3.6 Flash and 3.5 Flash-Lite](/docs/whats-new-gemini-3.6)
* [See all models](/docs/models)

## What's next  {% id="whats-next" %}

* Compare models and multi-model patterns in [Choosing a model](/docs/choosing-a-model).
* Read the [long decode guide](/docs/long-decode) for streaming, reconnection, and token counting.
* Learn how thinking levels and thought summaries work in the [thinking guide](/docs/thinking).
* Learn about asynchronous jobs in the [background execution guide](/docs/background-execution).
* Test and refine prompts in [Google AI Studio](https://aistudio.google.com/prompts/new_chat?model=gemini-4-neon).

