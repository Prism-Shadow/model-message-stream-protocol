---
title: Claude Sonnet 5.5
url: https://platform.claude.com/docs/en/models/sonnet-5-5/overview
description: "Claude Sonnet 5.5 at a glance: what it's for, model IDs on every platform, context window, output limits, pricing, availability, and the guides and resources for building with it."
---

**Latest.** Released September 28, 2026.

The best combination of speed and intelligence

Model ID: `claude-sonnet-5-5`

Context window: 1M tokens · Max output: 128K tokens · Input pricing: $2 / MTok · Output pricing: $10 / MTok

[Announcement](https://www.anthropic.com/claude-sonnet-5-5) · [What’s new](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5) · [Migration guide](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide)

## Overview

Claude Sonnet 5.5 offers the best combination of speed and intelligence. Five breaking changes affect code already running on Claude Sonnet 5:

* [Turn off up-front thinking with `between_tools`](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5#turn-off-up-front-thinking).
* [Forced tool use returns an error](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5#forced-tool-use-is-not-supported).
* [Thinking blocks are tied to the model and the conversation](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5#thinking-blocks-are-tied-to-the-model-that-produced-them).
* [On the Claude API and Google Cloud, the earlier `computer_20251124` computer use tool is not accepted](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5#computer-20251124-is-not-supported).
* [The advisor tool rejects Claude Opus 4.8, Claude Opus 4.7, Claude Sonnet 5, and Claude Haiku 5.5 as advisors](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5#advisor-tool-pairings).

One more change alters the response shape without failing any request: [text between tool calls comes back in `thinking` blocks](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5#text-between-tool-calls). An application that streams that text to its users goes quiet between tool calls until it sets a `display` value that returns the text, or turns off up-front thinking with `between_tools`.

[What's new in Claude Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5)

## How it compares

| Model                                                                             | Context | Max output | Price / MTok       | Latency  | Thinking             | Default effort | Knowledge cutoff |
| :-------------------------------------------------------------------------------- | :------ | :--------- | :----------------- | :------- | :------------------- | :------------- | :--------------- |
| [Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/overview) | 1M      | 128K       | $10 / $50          | Slower   | Adaptive (always on) | `high`         | Jun 2026         |
| [Claude Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/overview)   | 1M      | 128K       | $4 / $20           | Moderate | Adaptive (always on) | `medium`       | Jun 2026         |
| **Claude Sonnet 5.5** (this model)                                                | 1M      | 128K       | $2 / $10           | Fast     | Adaptive             | `high`         | Jun 2026         |
| [Claude Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview) | 1M      | 128K       | From $0.10 / $0.50 | Fastest  | Adaptive             | `medium`       | Jun 2026         |

* **Context:** 1M tokens is roughly 555k words or 2.5M Unicode characters on the current tokenizer (introduced with Claude Opus 4.7); models before it fit about 750k words in 1M tokens. 200k tokens is roughly 150k words.
* **Max output:** Synchronous Messages API limit. On the Message Batches API, Claude Opus 5.5, Claude Opus 5, Claude Sonnet 5.5, Claude Sonnet 5, Claude Haiku 5.5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, and Claude Sonnet 4.6 support up to 300k output tokens with the output-300k-2026-03-24 beta header.
* **Price / MTok:** Input / output, base price per million tokens. Batch API requests are 50% off; prompt caching reads cost 10% of the base input price (2.5% on Claude Fable 5.1 and Claude Mythos 5.1, 5% on Claude Opus 5.5 and Claude Sonnet 5.5). See Pricing for the full list.
* **Latency:** Comparative latency, relative to the current lineup, as published in the models overview. Actual latency depends on prompt length, output length, and thinking effort.
* **Thinking:** Adaptive thinking lets the model decide how much to think, steered by effort. Extended thinking is the manual budget\_tokens mode on earlier models.
* **Default effort:** The effort parameter’s default on the Claude API. Models without a value don’t support the parameter.
* **Knowledge cutoff:** Reliable knowledge cutoff: the date through which the model’s knowledge is most extensive and reliable.

## Specifications

### Model IDs

| Platform                                                                                               | Model ID                      |
| :----------------------------------------------------------------------------------------------------- | :---------------------------- |
| Claude API                                                                                             | `claude-sonnet-5-5`           |
| [Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock)       | `anthropic.claude-sonnet-5-5` |
| [Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai)              | `claude-sonnet-5-5`           |
| [Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry) | `claude-sonnet-5-5`           |
| [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws) | `claude-sonnet-5-5`           |

### Pricing

| Feature                                                                                | Value                            |
| :------------------------------------------------------------------------------------- | :------------------------------- |
| Input                                                                                  | $2 / MTok                        |
| Output                                                                                 | $10 / MTok                       |
| [5m cache write](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | $2.50 / MTok                     |
| [1h cache write](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | $4 / MTok                        |
| [Cache read](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)     | $0.10 / MTok                     |
| [Batch API](https://platform.claude.com/docs/en/build-with-claude/batch-processing)    | 50% discount on input and output |

[Full price list](https://platform.claude.com/docs/en/about-claude/pricing)

### Capabilities

| Feature                                                                                                                     | Value                  |
| :-------------------------------------------------------------------------------------------------------------------------- | :--------------------- |
| [Context window](https://platform.claude.com/docs/en/build-with-claude/context-windows)                                     | 1M tokens              |
| Max output                                                                                                                  | 128K tokens            |
| [Max output (Batch API, beta)](https://platform.claude.com/docs/en/build-with-claude/batch-processing#extended-output-beta) | 300K tokens            |
| [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)                                                  | Adaptive               |
| [Default effort](https://platform.claude.com/docs/en/build-with-claude/effort)                                              | `high`                 |
| Comparative latency                                                                                                         | Fast                   |
| Input → output                                                                                                              | Text and images → text |
| Reliable knowledge cutoff                                                                                                   | Jun 2026               |
| Training data cutoff                                                                                                        | Jun 2026               |

### Availability

| Feature                                                                       | Value                                                                                                                                                                                                                                                                                                                                                                                                                   |
| :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Status](https://platform.claude.com/docs/en/about-claude/model-deprecations) | Active (latest)                                                                                                                                                                                                                                                                                                                                                                                                         |
| Released                                                                      | September 28, 2026                                                                                                                                                                                                                                                                                                                                                                                                      |
| Retirement                                                                    | Not sooner than September 28, 2027                                                                                                                                                                                                                                                                                                                                                                                      |
| Platforms                                                                     | Claude API, [Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), [Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai), [Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry), [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws) |

## Good to know

* Adaptive thinking is on by default. The lowest thinking setting is `between_tools`, which turns off up-front thinking. It works at `high` effort or below. See [What's new in Claude Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5#turn-off-up-front-thinking).
* Setting `temperature`, `top_p`, or `top_k` to a non-default value returns a 400 error.
* The minimum cacheable prompt length is 512 tokens. See [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#cache-limitations).
* On the [Message Batches API](https://platform.claude.com/docs/en/build-with-claude/batch-processing#extended-output-beta), Claude Sonnet 5.5 supports up to 300k output tokens with the `output-300k-2026-03-24` beta header.
* Query limits and capabilities programmatically with the [Models API](https://platform.claude.com/docs/en/api/models/list).

## Resources

<CardGroup cols={3}>
  <Card title="Prompting Claude Sonnet 5.5" icon="lightbulb" href="https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5">
    Behavioral differences and prompting patterns specific to Claude Sonnet 5.5.
  </Card>

  <Card title="Effort" icon="sliders" href="https://platform.claude.com/docs/en/build-with-claude/effort">
    The control for thinking depth, latency, and cost. Choose a level per workload.
  </Card>

  <Card title="Adaptive thinking" icon="brain" href="https://platform.claude.com/docs/en/build-with-claude/thinking">
    How adaptive thinking works, which thinking settings each model accepts, and how thinking blocks are preserved.
  </Card>
</CardGroup>

## Reference

<CardGroup cols={3}>
  <Card title="System prompt" icon="text" href="https://platform.claude.com/docs/en/release-notes/system-prompts/claude-sonnet-5-5">
    The system prompt Claude Sonnet 5.5 uses on claude.ai and the Claude apps.
  </Card>

  <Card title="System card" icon="file" href="https://www.anthropic.com/document/claude-sonnet-5-5-system-card">
    Safety evaluations and deployment decisions for Claude Sonnet 5.5.
  </Card>

  <Card title="Pricing" icon="coins" href="https://platform.claude.com/docs/en/about-claude/pricing">
    Full price list, including batch discounts and prompt caching rates.
  </Card>

  <Card title="Model IDs and versioning" icon="fingerprint" href="https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions">
    How model IDs, aliases, and pinned snapshots work.
  </Card>

  <Card title="Model deprecations" icon="clock" href="https://platform.claude.com/docs/en/about-claude/model-deprecations">
    Lifecycle status and retirement commitments for every Claude model.
  </Card>
</CardGroup>
