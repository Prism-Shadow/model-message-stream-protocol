> Source: https://ai.google.dev/gemini-api/docs/whats-new-gemini-4-carbon.md.txt (snapshot 2026-11-10)

# What's new in Gemini 4 Carbon

Gemini 4 Carbon (`gemini-4-carbon`) is our strongest reasoning model, built for sustained agentic workflows across complex software engineering, multimodal knowledge work, scientific reasoning, and cybersecurity defense. On hard problems, Carbon spends more thinking tokens to explore hypotheses, verify its work, and check edge cases before responding.

Gemini 4 Carbon is available on the paid tier of the Gemini API and in Google AI Studio. Like [Gemini 4 Argon](/docs/whats-new-gemini-4-argon), it supports a unified 1M-token context window, long decode up to 1M tokens, and tunable thinking levels (`low`, `medium`, `high`) at the same per-token price.

{% card-grid %}
  {% card description="Test prompts and multimodal files with Gemini 4 Carbon in AI Studio." href="https://aistudio.google.com/prompts/new_chat?model=gemini-4-carbon" icon="chat" title="Try in Playground" /%}

  {% card description="Build and verify full-stack web and 3D apps with Gemini 4 Carbon." href="https://aistudio.google.com/apps?model=gemini-4-carbon" icon="experiment" title="Build in AI Studio" /%}

  {% card description="Read practical prompting and multi-agent patterns for Gemini 4 Carbon." href="https://aistudio.google.com/learn/gemini-4-carbon-developer-guide" icon="rocket_launch" title="Developer guide" /%}

{% /card-grid %}

This guide explains what's new in Gemini 4 Carbon, how to choose between Carbon and Argon, API changes, code examples, and migration guidance.

## New model  {% id="new-model" %}

| Model | Model ID | Default thinking level | Pricing | Description |
| :--- | :--- | :---: | :--- | :--- |
| Gemini 4 Carbon | `gemini-4-carbon` | `medium` | Available through Nov 30, 2026 at an introductory price of $2/1M input tokens and $10/1M output tokens ($4/1M input and $20/1M output thereafter). See [pricing](/docs/pricing) for details. | Our strongest reasoning model, built for sustained agentic coding, multimodal knowledge work, scientific discovery, and cybersecurity defense. |

For complete details, see the [Gemini 4 Carbon model page](/docs/models/gemini-4-carbon) and [Latest Gemini models](/docs/latest-model). For introductory pricing details, see the [pricing section](/docs/whats-new-gemini-4-carbon#pricing) on this page or the [pricing page](/docs/pricing#gemini-4-carbon).

## Quickstart  {% id="quickstart" %}

Use the following example to send a request to `gemini-4-carbon` with the recommended default `thinking_level` (`medium`) and a 64K output token limit:

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-4-carbon",
      input="Write a three.js script that renders a realistic 3D black hole with gravitational lensing."
  )
  
  print(interaction.output_text)
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  
  const client = new GoogleGenAI({});
  
  const interaction = await client.interactions.create({
    model: "gemini-4-carbon",
    input: "Write a three.js script that renders a realistic 3D black hole with gravitational lensing.",
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
      "model": "gemini-4-carbon",
      "input": "Write a three.js script that renders a realistic 3D black hole with gravitational lensing."
    }'
  ```

  {% /tab %}

{% /tabs %}

## What's new in Gemini 4 Carbon  {% id="whats-new-gemini-4-carbon" %}

* **Extended verification and agentic coding:** Runs deeper build-and-verify loops across complex repositories, frontend UI design, and 3D scenes, isolating root causes and checking fixes against tests.
* **Higher precision on multimodal knowledge work:** Stronger source grounding with fewer unsupported claims across dense PDFs, spreadsheets, slides, and workspace data, paired with strict adherence to output schemas.
* **Scientific and cybersecurity reasoning:** Improved performance on formal proofs, experimental data analysis, vulnerability discovery, and root-cause patching.
* **Unified 1M context window and long decode:** Input, thinking, and output tokens share one 1,048,576-token window, and a single response can now go past 64K tokens, up to 1M tokens minus your input. See [Long decode](/docs/long-decode).
* **Supported in Managed Agents:** The [Antigravity agent](/docs/antigravity-agent) in Gemini Managed Agents now supports `gemini-4-carbon`.

## Choosing between Carbon, Argon, and other models  {% id="choosing-between-models" %}

Gemini 4 Carbon and [Gemini 4 Argon](/docs/whats-new-gemini-4-argon) share the same 1M unified context window, built-in tools, and per-token pricing. The main difference is how many thinking tokens each model spends per turn:

* **Gemini 4 Carbon (`gemini-4-carbon`):** Built for tasks that push the limits of reasoning depth. Carbon spends more thinking tokens per turn to explore thoroughly and verify its work, which increases per-turn token use and latency compared to Argon. Use it for complex root-cause debugging, architectural design, dense multimodal synthesis, scientific proofs, and security auditing.
* **Gemini 4 Argon (`gemini-4-argon`):** Our efficient Gemini 4 frontier reasoning model, ideal for most advanced software engineering and knowledge work tasks. It delivers Gemini 4 intelligence with faster responses and lower token spend per turn compared to Carbon on interactive coding, day-to-day feature work, and fast production loops.

For more guidance on model selection, see [Latest Gemini models](/docs/latest-model#compare-models).

## Understanding thinking levels  {% id="understanding-thinking-levels" %}

The [thinking level](/docs/thinking) is your main control over quality, latency, and token use in Gemini 4 Carbon:

| Thinking level | Token use | When to use |
| :--- | :--- | :--- |
| `low` | Fewest tokens, lowest latency | Simpler tasks and cost-sensitive work. Also works for analysis and writing tasks that need light thinking. Quality can drop on hard tasks. |
| `medium` (default) | Balanced | Recommended for most tasks, including complex code and agentic use cases. |
| `high` | Most tokens, slowest first token | Complex reasoning, hard math and science, and the most difficult code or agent tasks. Pairs well with long decode for long outputs. |

Run your evaluations at all three levels, then pick the lowest level that meets your quality bar. To learn more, see the [thinking guide](/docs/thinking).

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-4-carbon",
      input="Analyze this payment processing pipeline for race conditions during retry attempts and rewrite the transaction locks safely.",
      generation_config={
          "thinking_level": "medium"  # Balanced reasoning effort for complex tasks
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
    model: "gemini-4-carbon",
    input: "Analyze this payment processing pipeline for race conditions during retry attempts and rewrite the transaction locks safely.",
    generation_config: {
      thinking_level: "medium", // Balanced reasoning effort for complex tasks
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
      "model": "gemini-4-carbon",
      "input": "Analyze this payment processing pipeline for race conditions during retry attempts and rewrite the transaction locks safely.",
      "generation_config": {
        "thinking_level": "medium"
      }
    }'
  ```

  {% /tab %}

{% /tabs %}

## Larger output and long decode  {% id="long-decode" %}

Gemini 4 Carbon can think longer on hard math, science, and coding problems.

* **Use `thinking_level` to control reasoning depth:** `thinking_level` sets how deeply the model reasons before answering. `max_output_tokens` caps your combined thinking and output tokens. The response stops once thinking plus output hits `max_output_tokens`, so set it high enough to leave room for the final answer.
* **Generate past 64K tokens with background execution:** Standard synchronous responses stop at 65,536 tokens. To generate longer responses, set `background=True` and raise `max_output_tokens` above 65,536 (up to the unified 1M-token context window, minus your input tokens). Our servers generate the response in 64K-token continuation hops for you. Each hop adds a `model_output` step to `interaction.steps`, so join the text across all `model_output` steps when the interaction finishes.

{% tabs %}
  {% tab label="Python" %}
  ```python
  import time
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-4-carbon",
      input="Write a complete, rigorous proof of the prime number theorem.",
      background=True,
      generation_config={
          "max_output_tokens": 262144,
          "thinking_level": "high",
      },
  )
  
  while interaction.status in ("in_progress", "queued"):
      time.sleep(5)
      interaction = client.interactions.get(id=interaction.id)
  
  # Each hop adds a model_output step, so join the text of all of them.
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
    model: "gemini-4-carbon",
    input: "Write a complete, rigorous proof of the prime number theorem.",
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
  
  // Each hop adds a model_output step, so join the text of all of them.
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
      "model": "gemini-4-carbon",
      "input": "Write a complete, rigorous proof of the prime number theorem.",
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
  If you set `background: true` without defining `max_output_tokens`, the server stops after 64K tokens.

{% /callout %}

Background execution is the recommended way to run long decode. It runs the continuation loop server-side until the model finishes or reaches `max_output_tokens`. If you need finer-grained control over retries, backoff, and error handling (or don't want your interactions stored), you can use client-side continuation in the [Interactions API](/docs/long-decode#client-side-continuation) or the [GenerateContent API](/docs/long-decode?generate-content=true). For streaming, reconnection, token counting, and when to use long decode, see the [long decode guide](/docs/long-decode).

### Setting output token limits  {% id="setting-output-token-limits" %}

`max_output_tokens` sets the maximum combined thinking and output tokens for a response. Set it high enough that thinking doesn't cut the answer short, and low enough to limit spend when a hard prompt uses all of it.

Use these values as a starting point:

* **Standard tasks:** Keep the default of 65,536 or don't set any value.
* **Existing apps with a limit lower than 32K:** Raise `max_output_tokens` to at least 32,768. Gemini 4 Carbon can spend more of the limit on thinking than earlier models. To use fewer tokens, lower the thinking level instead.
* **Complex reasoning and coding:** Set `background: true` and set `max_output_tokens` to 131,072 or 262,144, up to 1,048,576 minus your input tokens.

## Gemini 4 Carbon in Managed Agents  {% id="managed-agents" %}

The [Antigravity agent](/docs/antigravity-agent) in Gemini Managed Agents supports Gemini 4 Carbon. To use it, set the model in `agent_config`:

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      agent="antigravity-preview-09-2026",
      input=(
          "Audit https://web.dev for performance, Core Web Vitals, and SEO. "
          "Query Google's PageSpeed Insights API for both Mobile and Desktop strategies. "
          "Check search indexing with Google Search for site:web.dev. "
          "Format the output as a side-by-side scorecard table with prioritized fixes."
      ),
      environment="remote",
      agent_config={
          "type": "antigravity",
          "model": "gemini-4-carbon",
      },
  )
  
  print(interaction.output_text)
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  
  const client = new GoogleGenAI({});
  
  const interaction = await client.interactions.create({
    agent: "antigravity-preview-09-2026",
    input:
      "Audit https://web.dev for performance, Core Web Vitals, and SEO. " +
      "Query Google's PageSpeed Insights API for both Mobile and Desktop strategies. " +
      "Check search indexing with Google Search for site:web.dev. " +
      "Format the output as a side-by-side scorecard table with prioritized fixes.",
    environment: "remote",
    agent_config: {
      type: "antigravity",
      model: "gemini-4-carbon",
    },
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
      "environment": "remote",
      "agent_config": {
        "type": "antigravity",
        "model": "gemini-4-carbon"
      }
    }'
  ```

  {% /tab %}

{% /tabs %}

For more options, see [model selection](/docs/antigravity-agent#model-selection) in the Antigravity agent guide.

## Migration checklist  {% id="migration-checklist" %}

{% callout type="note" %}
  Automate this migration with a coding agent. If you use a coding agent that supports skills (like Antigravity), install the [gemini-api-dev skill](/docs/coding-agents#gemini-api-dev) and run:

  ```none
  /gemini-api-dev migrate my app to Gemini 4 Carbon
  ```

{% /callout %}

### Migrate from Gemini 4 Argon  {% id="migrate-from-gemini-4-argon" %}

If you already run `gemini-4-argon`, upgrading to `gemini-4-carbon` requires no request schema changes:

* **Update model ID:** Change your model string from `gemini-4-argon` to `gemini-4-carbon`.
* **Account for longer thinking:** Carbon spends more thinking tokens per turn than Argon on complex tasks. Keep `thinking_level` at `medium` (default) unless a workload needs `high`, and make sure your `max_output_tokens` and HTTP timeouts allow for longer reasoning passes.
* **Keep Argon where speed matters:** Retain [`gemini-4-argon`](/docs/whats-new-gemini-4-argon) when you want faster responses and lower token spend per turn compared to Carbon on interactive coding, day-to-day feature work, and fast production loops.

### Migrate from Gemini 3 and earlier  {% id="migrate-to-gemini-4-carbon" %}

* **Update model ID:** Change your target model string to `gemini-4-carbon`.
* **Review `max_output_tokens`:** If you set it explicitly today, consider raising it. We recommend at least 32,768, since Gemini 4 Carbon can spend more of the limit on thinking.
* **Configure thinking level:** Choose `low`, `medium` (default), or `high`, and test your workload at all three.
* **Move off explicit context caching:** Explicit caching (`cachedContents` / `caches.create`) is not supported on Gemini 4 Carbon. Remove calls that create or reference `cached_content` from your requests. [Implicit caching](/docs/caching) is enabled by default for prompts of at least 4,096 tokens and discounts cached input tokens by 95% on cache hits.
* **Remove sampling parameters:** Remove `temperature`, `top_p`, and `top_k` from your requests. If provided, they are ignored.
* **Use background execution for long outputs:** For tasks that need more than 64K tokens, set `background` to true and `max_output_tokens` greater than 65,536.
* **Increase client timeouts:** Hard prompts can take several minutes. Use background execution, or set HTTP client timeouts to at least 15 minutes.
* **Keep conversation state on the server:** Use `previous_interaction_id` for multi-turn and function calling conversations.
* **Review your cost estimates:** Every token the model processes is billed, including internal tool system instructions and function declarations when using grounding (see [Pricing](/docs/whats-new-gemini-4-carbon#pricing)).

## Pricing  {% id="pricing" %}

Gemini 4 Carbon is available at introductory pricing through November 30, 2026:

* **Input tokens:** $2.00 per 1M tokens ($4.00 starting December 1, 2026)  *   **Cached input tokens:** Implicit caching discounts cached input by 95%, to $0.10 per 1M tokens ($0.20 starting December 1, 2026).

* **Output tokens, including thinking tokens:** $10.00 per 1M tokens ($20.00 starting December 1, 2026)

Every token the model processes is counted and billed, including thinking tokens and internal tool system instructions and function declarations when using grounding. Grounding with Google Search also remains billed per query.

Gemini 4 Carbon is not available on the Free tier. For complete pricing tiers, see the [pricing page](/docs/pricing#gemini-4-carbon).

## Other models  {% id="other-models" %}

* [Latest Gemini models](/docs/latest-model)
* [Gemini 4 Argon](/docs/whats-new-gemini-4-argon)
* [Gemini 3.8 Flash](/docs/whats-new-gemini-3.8)
* [Gemini 3.6 Flash and 3.5 Flash-Lite](/docs/whats-new-gemini-3.6)
* [See all models](/docs/models)

## What's next  {% id="whats-next" %}

* Read the [Gemini 4 Carbon developer guide](https://aistudio.google.com/learn/gemini-4-carbon-developer-guide) for prompting and multi-agent patterns.
* Read the [long decode guide](/docs/long-decode) for streaming, reconnection, and token counting.
* Learn how thinking levels and thought summaries work in the [thinking guide](/docs/thinking).
* Learn about long-running jobs in the [background execution guide](/docs/background-execution).
* Process Word, PowerPoint, and Excel files in the [document understanding guide](/docs/document-processing#office-documents).
* Test and refine prompts in [Google AI Studio](https://aistudio.google.com/prompts/new_chat?model=gemini-4-carbon).

