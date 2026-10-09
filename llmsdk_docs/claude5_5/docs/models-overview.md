---
title: Models overview
url: https://platform.claude.com/docs/en/models/overview
description: Claude is a family of state-of-the-art large language models developed by Anthropic. This guide introduces the available models and compares their performance.
---

# Models overview

Claude is a family of state-of-the-art large language models developed by Anthropic. Compare the current lineup, find the model ID for every platform, and open each model's page for its full specs and resources.

<HomeQuickChip icon="Signpost" href="https://platform.claude.com/docs/en/about-claude/models/choosing-a-model">
  Choosing a model
</HomeQuickChip>

<HomeQuickChip icon="DollarSign" href="https://platform.claude.com/docs/en/about-claude/pricing">
  Pricing
</HomeQuickChip>

<HomeQuickChip icon="ArrowUpCircle" href="https://platform.claude.com/docs/en/about-claude/models/migration-guide">
  Migration guide
</HomeQuickChip>

## Compare models

If you're unsure which model to use, start with [Claude Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/overview) for most workloads. Use [Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/overview) for demanding reasoning and long-horizon agentic work, or when your evals on Claude Opus 5.5 at higher effort still fall short. All current models support text and image input, text output, multilingual capabilities, vision, and tool use. Each model's page lists the platforms it's available on.

| Feature                                                                                                   | Claude Fable 5.1                                                                  | Claude Opus 5.5                                                                 | Claude Sonnet 5.5                                                                   | Claude Haiku 5.5                                                                         |
| :-------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- | :------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| Description                                                                                               | For demanding reasoning and long-horizon agentic work                             | For long-running agentic coding and knowledge work                              | The best combination of speed and intelligence                                      | For high-volume, latency-sensitive tasks such as classification, extraction, and routing |
| Model page                                                                                                | [Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/overview) | [Claude Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/overview) | [Claude Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/overview) | [Claude Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview)        |
| Comparative latency                                                                                       | Slower                                                                            | Moderate                                                                        | Fast                                                                                | Fastest                                                                                  |
| [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)                                       | $10 / input MTok, $50 / output MTok                                               | $4 / input MTok, $20 / output MTok                                              | $2 / input MTok, $10 / output MTok                                                  | From $0.10 / input MTok, From $0.50 / output MTok                                        |
| Claude API ID                                                                                             | `claude-fable-5-1`                                                                | `claude-opus-5-5`                                                               | `claude-sonnet-5-5`                                                                 | `claude-haiku-5-5`                                                                       |
| [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)                                | Adaptive (always on)                                                              | Adaptive (always on)                                                            | Adaptive                                                                            | Adaptive                                                                                 |
| [Default effort](https://platform.claude.com/docs/en/build-with-claude/effort)                            | `high`                                                                            | `medium`                                                                        | `high`                                                                              | `medium`                                                                                 |
| [Context window](https://platform.claude.com/docs/en/build-with-claude/context-windows)                   | 1M tokens                                                                         | 1M tokens                                                                       | 1M tokens                                                                           | 1M tokens                                                                                |
| Max output                                                                                                | 128K tokens                                                                       | 128K tokens                                                                     | 128K tokens                                                                         | 128K tokens                                                                              |
| Reliable knowledge cutoff                                                                                 | Jun 2026                                                                          | Jun 2026                                                                        | Jun 2026                                                                            | Jun 2026                                                                                 |
| Training data cutoff                                                                                      | Jun 2026                                                                          | Jun 2026                                                                        | Jun 2026                                                                            | Jun 2026                                                                                 |
| [Retirement](https://platform.claude.com/docs/en/about-claude/model-deprecations)                         | Not sooner than September 1, 2027                                                 | Not sooner than September 22, 2027                                              | Not sooner than September 28, 2027                                                  | Not sooner than October 7, 2027                                                          |
| Claude API alias                                                                                          | `claude-fable-5-1`                                                                | `claude-opus-5-5`                                                               | `claude-sonnet-5-5`                                                                 | `claude-haiku-5-5`                                                                       |
| [Amazon Bedrock ID](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock)       | `anthropic.claude-fable-5-1`                                                      | `anthropic.claude-opus-5-5`                                                     | `anthropic.claude-sonnet-5-5`                                                       | `anthropic.claude-haiku-5-5`                                                             |
| [Google Cloud ID](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai)              | `claude-fable-5-1`                                                                | `claude-opus-5-5`                                                               | `claude-sonnet-5-5`                                                                 | `claude-haiku-5-5`                                                                       |
| [Microsoft Foundry ID](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry) | `claude-fable-5-1`                                                                | `claude-opus-5-5`                                                               | `claude-sonnet-5-5`                                                                 | `claude-haiku-5-5`                                                                       |
| [Claude Platform on AWS ID](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws) | `claude-fable-5-1`                                                                | `claude-opus-5-5`                                                               | `claude-sonnet-5-5`                                                                 | `claude-haiku-5-5`                                                                       |

* **Comparative latency:** Relative to the current lineup. Actual latency depends on prompt length, output length, and thinking effort.
* **Pricing:** Base price per million tokens. Batch API requests are 50% off; prompt cache reads cost 10% of the base input price (2.5% on Claude Fable 5.1 and Claude Mythos 5.1, 5% on Claude Opus 5.5 and Claude Sonnet 5.5). See Pricing for cache writes, long-context, and per-platform pricing.
* **Claude API ID:** Every Claude model ID is a pinned snapshot, including the dateless IDs used from the 4.6 generation on.
* **Thinking:** Adaptive thinking lets the model decide how much to think, steered by effort. Extended thinking is the manual thinking.type “enabled” + budget\_tokens mode on earlier models; it is deprecated on Claude Opus 4.6 and Claude Sonnet 4.6 and not accepted on later models.
* **Default effort:** The effort parameter’s default on the Claude API. Set effort explicitly to use a different level.
* **Context window:** 1M tokens is roughly 555k words or 2.5M Unicode characters on the current tokenizer (introduced with Claude Opus 4.7); models before it fit about 750k words in 1M tokens. 200k tokens is roughly 150k words.
* **Max output:** Synchronous Messages API limit. On the Message Batches API, Claude Opus 5.5, Claude Opus 5, Claude Sonnet 5.5, Claude Sonnet 5, Claude Haiku 5.5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, and Claude Sonnet 4.6 support up to 300k output tokens with the output-300k-2026-03-24 beta header.
* **Reliable knowledge cutoff:** The date through which the model’s knowledge is most extensive and reliable. Training data cutoff (under Additional details) is the broader range of data used. See Anthropic’s Transparency Hub for details.
* **Retirement:** Anthropic’s commitment for the platforms that Anthropic operates. Amazon Bedrock and Google Cloud set their own dates.
* **Claude API alias:** For models before the 4.6 generation, the alias is a convenience pointer that resolves to the dated ID. Dateless IDs are their own pinned snapshot; the alias row repeats them.
* **Amazon Bedrock ID:** The ID on Bedrock’s Messages-API endpoint (Claude Opus 4.7 and later, plus Claude Haiku 4.5); a model offered only through Bedrock’s InvokeModel integration shows that ID instead. Bedrock offers global endpoints (dynamic routing) and regional endpoints (guaranteed data routing) for Claude Sonnet 4.5 and later, and sets its own lifecycle dates.
* **Google Cloud ID:** Google Cloud offers global, multi-region, and regional endpoints, and sets its own lifecycle dates.
* **Microsoft Foundry ID:** Foundry deployments default to the Claude API model ID (the alias, where one exists); the deployment name is what you send. Foundry follows the Claude API lifecycle schedule.
* **Claude Platform on AWS ID:** Claude Platform on AWS uses the Claude API model IDs (the dateless form where the Claude API has an alias), not Bedrock-style IDs, and follows Anthropic’s first-party model lifecycle.

See [Model IDs and versioning](https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions) and [Pricing](https://platform.claude.com/docs/en/about-claude/pricing).

Legacy models (still available): [Claude Fable 5](https://platform.claude.com/docs/en/models/fable-5/overview), [Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/overview), [Claude Opus 4.8](https://platform.claude.com/docs/en/models/opus-4-8/overview), [Claude Opus 4.7](https://platform.claude.com/docs/en/models/opus-4-7/overview), [Claude Opus 4.6](https://platform.claude.com/docs/en/models/opus-4-6/overview), [Claude Opus 4.5](https://platform.claude.com/docs/en/models/opus-4-5/overview), [Claude Sonnet 5](https://platform.claude.com/docs/en/models/sonnet-5/overview), [Claude Sonnet 4.6](https://platform.claude.com/docs/en/models/sonnet-4-6/overview), [Claude Haiku 4.5](https://platform.claude.com/docs/en/models/haiku-4-5/overview).

Once you've picked a model, [learn how to make your first API call](https://platform.claude.com/docs/en/get-started). To understand how model IDs, aliases, and snapshots work, see [Model IDs and versioning](https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions); for the reliable-knowledge and training-data cutoffs behind each model, see [Anthropic's Transparency Hub](https://www.anthropic.com/transparency).

## Using the Models API

You can query model capabilities and token limits programmatically with the [Models API](https://platform.claude.com/docs/en/api/models/list). The response includes `max_input_tokens`, `max_tokens`, and a `capabilities` object for every available model.

Each model in the response also has a `line` field, which names the model line it belongs to. Claude Opus 4.5 and Claude Opus 4.6 both report `opus`. Use `line` to group models, for example, in a model picker. `line` is `null` when a model belongs to no line. Read `line` instead of inferring it from the model's `id`. Anthropic might add more lines, so don't treat the set of values as fixed.

Each model's `capabilities` object includes `thinking.types.disabled`, which reports whether the model accepts `thinking: {type: "disabled"}`, the setting that [turns thinking off](https://platform.claude.com/docs/en/build-with-claude/thinking#turning-thinking-off). `supported` is `false` when the model rejects `"disabled"` with a 400 error, and `true` on a model that doesn't support thinking. Even when `supported` is `true`, the API can still reject a `"disabled"` request for another reason. One such reason is an [effort](https://platform.claude.com/docs/en/build-with-claude/effort) level that the model doesn't allow with thinking off.

Each model's `capabilities` object also includes `server_tools`, which reports whether the model accepts the [web search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) and [code execution](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool) tools. It doesn't cover other server tools, such as web fetch. `server_tools.web_search.supported` and `server_tools.code_execution.supported` are `true` when the model accepts at least one version of that tool, not necessarily every version. `server_tools.supported` is `true` when the model accepts at least one of the two tools. Even when a tool is supported, your organization's settings can still cause a request that uses it to fail. For example, an administrator can [disable web search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool#how-to-use-web-search).

The top-level `code_execution` capability is a different check. It reports whether code that Claude runs in the code execution tool can call the request's other tools, as in [programmatic tool calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling). For Claude Haiku 4.5, for example, the Models API reports `server_tools.code_execution.supported` as `true` and `code_execution.supported` as `false`.

## Prompt and output performance

Current Claude models excel in:

* **Performance:** Top-tier results in reasoning, coding, multilingual tasks, long-context handling, honesty, and image processing. See [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) for general and model-specific prompting guidance.
* **Engaging responses:** Claude models are ideal for applications that require rich, human-like interactions. If you prefer more concise responses, adjust your prompts to guide the model toward the desired output length. Refer to the [prompt engineering guides](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering) for details.
* **Output quality:** When migrating from a previous model generation, you may notice larger improvements in overall performance. If you're on Claude Opus 5 or earlier, see the [Claude Opus 5.5 migration guide](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide).

## Get started with Claude

If you're ready to start exploring what Claude can do for you, dive in! Whether you're a developer looking to integrate Claude into your applications or a user wanting to experience the power of AI firsthand, the following resources can help.

<CardGroup cols={3}>
  <Card title="Intro to Claude" icon="check" href="https://platform.claude.com/docs/en/intro">
    Explore Claude's capabilities and development flow.
  </Card>

  <Card title="Quickstart" icon="lightning" href="https://platform.claude.com/docs/en/get-started">
    Learn how to make your first API call in minutes.
  </Card>

  <Card title="Choosing a model" icon="compass" href="https://platform.claude.com/docs/en/about-claude/models/choosing-a-model">
    Establish criteria and pick the right model for your use case.
  </Card>

  <Card title="Pricing" icon="coins" href="https://platform.claude.com/docs/en/about-claude/pricing">
    Complete pricing, including batch discounts and prompt caching rates.
  </Card>

  <Card title="Model deprecations" icon="clock" href="https://platform.claude.com/docs/en/about-claude/model-deprecations">
    Lifecycle status and retirement commitments for every model.
  </Card>

  <Card title="Claude Console" icon="code" href="https://platform.claude.com/">
    Craft and test prompts directly in your browser.
  </Card>
</CardGroup>

Looking to chat with Claude? Visit [claude.ai](https://claude.ai). If you have questions, reach out to the [support team](https://support.claude.com/) or the [Discord community](https://www.anthropic.com/discord).
