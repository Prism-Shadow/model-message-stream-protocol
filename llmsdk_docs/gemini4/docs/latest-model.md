> Source: https://ai.google.dev/gemini-api/docs/latest-model.md.txt (snapshot 2026-11-10)

# Latest Gemini models

Build with Google's latest models for reasoning, coding, and native media generation through one unified API. Start with `gemini-3.8-flash` for everyday apps and agents. Use `gemini-4-carbon` or `gemini-4-argon` for complex reasoning, or pick a specialized model below.

{% button href="/docs/thinking" variant="ais" %}Choosing a model{% /button %} {% button href="/docs/models" variant="primary" %}View all models{% /button %}

## Compare Gemini models  {% class="hide-from-toc" id="compare-models" %}

Every Gemini model below accepts text, images, audio, video, and PDFs. All four models support [Google Search grounding](/docs/google-search), [code execution](/docs/code-execution), [function calling](/docs/function-calling), [computer use](/docs/computer-use), and [structured outputs](/docs/structured-output).

{% card-grid columns="4" %}
  {% card title="Gemini 4 Carbon" variant="model-card" %}
  {% section class="model-specs" %}
  *   *Model ID* **`gemini-4-carbon`**
  *   *Price (1M)* **$2.00 / $10.00 (intro thru Nov 30)**
  *   *Speed* **Deliberate**
  *   *Context* **1M unified tokens**
  *   *Max output* **64K default / 1M [long decode](/docs/long-decode)**
  *   *Thinking* **`low`, `medium` (default), `high`**

  {% /section %}

  {% section class="card-actions" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-4-carbon" tooltip="Try Gemini 4 Carbon in AI Studio" variant="primary" %}Try in AI Studio{% /button %} {% button href="/docs/models/gemini-4-carbon" icon="arrow_forward" tooltip="View Gemini 4 Carbon model specs" variant="icon-primary" /%}

  {% /section %}

  {% /card %}

  {% card title="Gemini 4 Argon" variant="model-card" %}
  {% section class="model-specs" %}
  *   *Model ID* **`gemini-4-argon`**
  *   *Price (1M)* **$2.00 / $10.00 (intro thru Nov 30)**
  *   *Speed* **Moderate**
  *   *Context* **1M unified tokens**
  *   *Max output* **64K default / 1M [long decode](/docs/long-decode)**
  *   *Thinking* **`low`, `medium` (default), `high`**

  {% /section %}

  {% section class="card-actions" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-4-argon" tooltip="Try Gemini 4 Argon in AI Studio" variant="primary" %}Try in AI Studio{% /button %} {% button href="/docs/models/gemini-4-argon" icon="arrow_forward" tooltip="View Gemini 4 Argon model specs" variant="icon-primary" /%}

  {% /section %}

  {% /card %}

  {% card title="Gemini 3.8 Flash" variant="model-card" %}
  {% section class="model-specs" %}
  *   *Model ID* **`gemini-3.8-flash`**
  *   *Price (1M)* **$0.75 / $3.75 (intro thru Dec 31)**
  *   *Speed* **Fast**
  *   *Context* **1M input tokens**
  *   *Max output* **64K tokens**
  *   *Thinking* **`low`, `medium` (default), `high`**

  {% /section %}

  {% section class="card-actions" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-3.8-flash" tooltip="Try Gemini 3.8 Flash in AI Studio" variant="primary" %}Try in AI Studio{% /button %} {% button href="/docs/models/gemini-3.8-flash" icon="arrow_forward" tooltip="View Gemini 3.8 Flash model specs" variant="icon-primary" /%}

  {% /section %}

  {% /card %}

  {% card title="Gemini 3.5 Flash-Lite" variant="model-card" %}
  {% section class="model-specs" %}
  *   *Model ID* **`gemini-3.5-flash-lite`**
  *   *Price (1M)* **$0.30 / $2.50**
  *   *Speed* **Fastest**
  *   *Context* **1M input tokens**
  *   *Max output* **64K tokens**
  *   *Thinking* **`minimal` (default), `low`, `medium`, `high`**

  {% /section %}

  {% section class="card-actions" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-3.5-flash-lite" tooltip="Try Gemini 3.5 Flash-Lite in AI Studio" variant="primary" %}Try in AI Studio{% /button %} {% button href="/docs/models/gemini-3.5-flash-lite" icon="arrow_forward" tooltip="View Gemini 3.5 Flash-Lite model specs" variant="icon-primary" /%}

  {% /section %}

  {% /card %}

{% /card-grid %}

## What's new guides  {% class="hide-from-toc" id="whats-new-guides" %}

Read the What's new guides for new features, API changes, code examples, and migration steps.

{% card-grid columns="4" %}
  {% card description="Our strongest reasoning model for agentic coding, multimodal precision, scientific and security reasoning, and choosing between Carbon and Argon." href="/docs/whats-new-gemini-4-carbon" icon="spark" title="What's new in Gemini 4 Carbon" variant="stacked-icon" /%}

  {% card description="Our efficient Gemini 4 frontier reasoning model, with faster responses and lower token spend per turn compared to Carbon, unified 1M context, and long decode." href="/docs/whats-new-gemini-4-argon" icon="psychology" title="What's new in Gemini 4 Argon" variant="stacked-icon" /%}

  {% card description="Recommended default for everyday apps and agents, plus low-latency Live voice agents and 130-language Flash TTS." href="/docs/whats-new-gemini-3.8" icon="rocket_launch" title="What's new in Gemini 3.8 Flash" variant="stacked-icon" /%}

  {% card description="Fastest, lowest-cost Flash-Lite model for high-throughput subagents, routing, and step-by-step migration from Gemini 2.5." href="/docs/whats-new-gemini-3.6" icon="bolt" title="What's new in Gemini 3.6 and 3.5 Flash-Lite" variant="stacked-icon" /%}

{% /card-grid %}

## Latest models across modalities  {% class="hide-from-toc" id="latest-by-modality" %}

Pick the current recommended model ID when starting a project across text, images, video, or speech.

{% card-grid columns="2" %}
  {% card description="Multimodal understanding, software engineering, structured extraction, and tool-using agents." icon="psychology" title="Text, code, and reasoning" variant="stacked-icon" %}
  {% section class="model-specs" %}
  *   *Flagship reasoning* **[`gemini-4-carbon`](/docs/models/gemini-4-carbon), [`gemini-4-argon`](/docs/models/gemini-4-argon)**
  *   *Default general-purpose* **[`gemini-3.8-flash`](/docs/models/gemini-3.8-flash)**
  *   *High-volume and low-cost* **[`gemini-3.5-flash-lite`](/docs/models/gemini-3.5-flash-lite)**

  {% /section %}

  {% section class="card-actions" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-3.8-flash" tooltip="Open text chat in AI Studio" variant="primary" %}Try in AI Studio{% /button %} {% button href="/docs/text-generation" icon="arrow_forward" tooltip="Read text generation guide" variant="icon-primary" /%}

  {% /section %}

  {% /card %}

  {% card description="Conversational image generation, multi-turn editing, character consistency, and accurate text rendering up to 4K." icon="banana_spark" title=Images (Nano Banana) variant="stacked-icon" %}
  {% section class="model-specs" %}
  *   *Default high-efficiency* **[`gemini-nano-banana-2.1`](/docs/models/gemini-nano-banana-2.1)**
  *   *Studio 4K and layouts* **[`gemini-3-pro-image`](/docs/models/gemini-3-pro-image)**
  *   *Ultra-low latency* **[`gemini-3.1-flash-lite-image`](/docs/models/gemini-3.1-flash-lite-image)**

  {% /section %}

  {% section class="card-actions" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-nano-banana-2.1" tooltip="Try Nano Banana 2.1 in AI Studio" variant="primary" %}Try in AI Studio{% /button %} {% button href="/docs/image-generation" icon="arrow_forward" tooltip="Read image generation guide" variant="icon-primary" /%}

  {% /section %}

  {% /card %}

  {% card description="Generate and edit up to 4K video with synchronized audio using Gemini Omni, stream live video, or analyze long videos." icon="movie_filter" title="Video" variant="stacked-icon" %}
  {% section class="model-specs" %}
  *   *Video generation and editing* **[`gemini-omni-1.2-flash`](/docs/models/gemini-omni-flash)**
  *   *Video understanding* **[`gemini-4-carbon`](/docs/models/gemini-4-carbon), [`gemini-4-argon`](/docs/models/gemini-4-argon), [`gemini-3.8-flash`](/docs/models/gemini-3.8-flash)**
  *   *Live video streaming* **[`gemini-3.8-live`](/docs/models/gemini-3.8-live)**

  {% /section %}

  {% section class="card-actions" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-omni-1.2-flash" tooltip="Try Gemini Omni 1.2 Flash in AI Studio" variant="primary" %}Try in AI Studio{% /button %} {% button href="/docs/omni" icon="arrow_forward" tooltip="Read Gemini Omni Flash guide" variant="icon-primary" /%}

  {% /section %}

  {% /card %}

  {% card description="Sub-second bidirectional voice agents, expressive text-to-speech in 130 languages, and diarized transcription." icon="graphic_eq" title="Audio and speech" variant="stacked-icon" %}
  {% section class="model-specs" %}
  *   *Live voice agents* **[`gemini-3.8-live`](/docs/models/gemini-3.8-live)**
  *   *Studio text-to-speech* **[`gemini-3.8-flash-tts`](/docs/models/gemini-3.8-flash-tts)**
  *   *Speech-to-text* **[`gemini-3.5-transcribe`](/docs/models/gemini-3.5-transcribe)**

  {% /section %}

  {% section class="card-actions" %}
  {% button href="https://aistudio.google.com/live" tooltip="Try Gemini 3.8 Live in AI Studio" variant="primary" %}Try in AI Studio{% /button %} {% button href="/docs/live-api" icon="arrow_forward" tooltip="Read Live API guide" variant="icon-primary" /%}

  {% /section %}

  {% /card %}

{% /card-grid %}

## Quickstart  {% class="hide-from-toc" id="quickstart" %}

Send your first request using the Google GenAI SDK and the [Interactions API](/docs/interactions-overview). Swap `model` to test any tier.

{% tabs %}
  {% tab filename="quickstart.py" label="Python" %}
  ```python
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-4-carbon",
      input="Explain gravity to a skeptical cat in three short sentences.",
  )
  
  print(interaction.output_text)
  ```

  {% /tab %}

  {% tab filename="quickstart.js" label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  
  const client = new GoogleGenAI({});
  
  const interaction = await client.interactions.create({
    model: "gemini-4-carbon",
    input: "Explain gravity to a skeptical cat in three short sentences.",
  });
  
  console.log(interaction.output_text);
  ```

  {% /tab %}

  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "gemini-4-carbon",
      "input": "Explain gravity to a skeptical cat in three short sentences."
    }'
  ```

  {% /tab %}

{% /tabs %}

## Set up your coding agent  {% class="hide-from-toc" id="coding-agents" %}

Give your coding agent live access to the latest Gemini models, SDK syntax, and documentation so it always builds with up-to-date information.

```bash
# Connect the live Gemini Docs MCP server
npx add-mcp "https://gemini-api-docs-mcp.dev"

# Install official Gemini API agent skills
npx skills add google-gemini/gemini-skills --skill gemini-api-dev --global

# Or install the bundled Antigravity plugin
agy plugin install https://github.com/google-gemini/gemini-skills
```

You can also append `.md` to any documentation URL or feed [`llms.txt`](https://aistudio.google.com/llms.txt) to your agent. See [Coding agent setup](/docs/coding-agents) for editor configs and `AGENTS.md` templates.

## Specialized models  {% class="hide-from-toc" id="specialized-models" %}

Beyond the general-purpose and media models above, the Gemini API includes specialized endpoints:

* **[Managed Agents](/docs/agents):** [`antigravity-preview-09-2026`](/docs/antigravity-agent) for coding and tool orchestration, and [`deep-research-preview-04-2026`](/docs/deep-research) for autonomous multi-step research.
* **[Embeddings](/docs/embeddings):** [`gemini-embedding-2`](/docs/models/gemini-embedding-2) for multimodal text, image, audio, video, and PDF search and RAG.
* **[Music generation](/docs/music-generation):** [`lyria-3.5`](/docs/models/lyria-3.5) for studio-grade instrumental and vocal tracks.
* **[Robotics](/docs/robotics-overview):** [`gemini-robotics-er-2-preview`](/docs/models/gemini-robotics-er-2-preview) for spatial reasoning and embodied planning.

## What's next  {% class="hide-from-toc" id="whats-next" %}

* Browse the full endpoint catalog on [All models](/docs/models).
* Tune reasoning depth and latency in the [Thinking guide](/docs/thinking).
* Review [Pricing](/docs/pricing), [Rate limits](/docs/rate-limits), [Context caching](/docs/caching), and [Batch API (50% cost reduction)](/docs/batch-api).
* Check sunset dates on [Deprecations](/docs/deprecations) and recent updates in [Release notes](/docs/changelog).

