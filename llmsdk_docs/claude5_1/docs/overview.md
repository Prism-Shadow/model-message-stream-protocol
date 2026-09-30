---
title: Claude Fable 5.1
url: https://platform.claude.com/docs/en/models/fable-5-1/overview
description: "Claude Fable 5.1 at a glance: what it's for, model IDs on every platform, context window, output limits, pricing, availability, and resources for building with it."
---

**Latest.** Released September 1, 2026.

For demanding reasoning and long-horizon agentic work

Model ID: `claude-fable-5-1`

Context window: 1M tokens · Max output: 128K tokens · Input pricing: $10 / MTok · Output pricing: $50 / MTok

[Announcement](https://www.anthropic.com/claude-fable-and-mythos-5-1) · [What’s new](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1) · [Migration guide](https://platform.claude.com/docs/en/models/fable-5-1/migration-guide)

## Overview

Claude Fable 5.1 extends Claude Fable 5 at the same input and output prices, with cache reads at a quarter of the cost, and brings stronger long-running agentic coding, multistep research, and document, spreadsheet, and slide work. For most workloads, start with Claude Opus 5 (see [Choosing a model](https://platform.claude.com/docs/en/about-claude/models/choosing-a-model)). Use Claude Fable 5.1 for demanding reasoning and long-horizon agentic work, or when your evals on Claude Opus 5 at higher effort still fall short. Claude Mythos 5.1 offers the same capabilities to [Project Glasswing](https://anthropic.com/glasswing) participants only.

If you already call Claude Fable 5, three changes are breaking: [forced tool use returns an error](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1#forced-tool-use-is-not-supported), [earlier models can't read its thinking blocks](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1#thinking-blocks-are-tied-to-the-model-that-produced-them), and [editing earlier turns invalidates thinking blocks](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1#editing-earlier-turns-invalidates-thinking-blocks). Five are additive: [per-message effort](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1#change-effort-mid-conversation-beta) (beta), [turn-scoped system messages](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1#turn-scoped-system-messages-beta) (beta), [readable progress updates between tool calls](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1#progress-updates-between-tool-calls-beta) (`display: "updates"`, beta), a [lower cache read price](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1#pricing), and [content provenance](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1#content-provenance).

[What's new in Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1)

## Claude Fable 5.1 and Claude Mythos 5.1

[Claude Mythos 5.1](https://platform.claude.com/docs/en/models/mythos-5-1/overview) offers the same capabilities by invitation only, as part of [Project Glasswing](https://anthropic.com/glasswing). It shares Claude Fable 5.1's specifications and pricing. For access, contact your Anthropic, AWS, or Google Cloud account team.

## How it compares

| Model                                                                               | Context | Max output | Price / MTok | Latency  | Thinking             | Default effort | Knowledge cutoff |
| :---------------------------------------------------------------------------------- | :------ | :--------- | :----------- | :------- | :------------------- | :------------- | :--------------- |
| **Claude Fable 5.1** (this model)                                                   | 1M      | 128K       | $10 / $50    | Slower   | Adaptive (always on) | `high`         | Jun 2026         |
| [Claude Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/overview)     | 1M      | 128K       | $4 / $20     | Moderate | Adaptive (always on) | `medium`       | Jun 2026         |
| [Claude Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/overview) | 1M      | 128K       | $2 / $10     | Fast     | Adaptive             | `high`         | Jun 2026         |
| [Claude Haiku 4.5](https://platform.claude.com/docs/en/models/haiku-4-5/overview)   | 200K    | 64K        | $1 / $5      | Fastest  | Extended             | —              | Feb 2025         |

* **Context:** 1M tokens is roughly 555k words or 2.5M Unicode characters on the current tokenizer (introduced with Claude Opus 4.7); models before it fit about 750k words in 1M tokens. 200k tokens is roughly 150k words.
* **Max output:** Synchronous Messages API limit. On the Message Batches API, Claude Opus 5.5, Claude Opus 5, Claude Sonnet 5.5, Claude Sonnet 5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, and Claude Sonnet 4.6 support up to 300k output tokens with the output-300k-2026-03-24 beta header.
* **Price / MTok:** Input / output, base price per million tokens. Batch API requests are 50% off; prompt caching reads cost 10% of the base input price (2.5% on Claude Fable 5.1 and Claude Mythos 5.1, 5% on Claude Opus 5.5). See Pricing for the full list.
* **Latency:** Comparative latency, relative to the current lineup, as published in the models overview. Actual latency depends on prompt length, output length, and thinking effort.
* **Thinking:** Adaptive thinking lets the model decide how much to think, steered by effort. Extended thinking is the manual budget\_tokens mode on earlier models.
* **Default effort:** The effort parameter’s default on the Claude API. Models without a value don’t support the parameter.
* **Knowledge cutoff:** Reliable knowledge cutoff: the date through which the model’s knowledge is most extensive and reliable.

## Specifications

### Model IDs

| Platform                                                                                               | Model ID                     |
| :----------------------------------------------------------------------------------------------------- | :--------------------------- |
| Claude API                                                                                             | `claude-fable-5-1`           |
| [Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock)       | `anthropic.claude-fable-5-1` |
| [Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai)              | `claude-fable-5-1`           |
| [Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry) | `claude-fable-5-1`           |
| [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws) | `claude-fable-5-1`           |

### Pricing

| Feature                                                                                | Value                            |
| :------------------------------------------------------------------------------------- | :------------------------------- |
| Input                                                                                  | $10 / MTok                       |
| Output                                                                                 | $50 / MTok                       |
| [5m cache write](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | $12.50 / MTok                    |
| [1h cache write](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | $20 / MTok                       |
| [Cache read](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)     | $0.25 / MTok                     |
| [Batch API](https://platform.claude.com/docs/en/build-with-claude/batch-processing)    | 50% discount on input and output |

[Full price list](https://platform.claude.com/docs/en/about-claude/pricing)

### Capabilities

| Feature                                                                                 | Value                  |
| :-------------------------------------------------------------------------------------- | :--------------------- |
| [Context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) | 1M tokens              |
| Max output                                                                              | 128K tokens            |
| [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)              | Adaptive (always on)   |
| [Default effort](https://platform.claude.com/docs/en/build-with-claude/effort)          | `high`                 |
| Comparative latency                                                                     | Slower                 |
| Input → output                                                                          | Text and images → text |
| Reliable knowledge cutoff                                                               | Jun 2026               |
| Training data cutoff                                                                    | Jun 2026               |

### Availability

| Feature                                                                       | Value                                                                                                                                                                                                                                                                                                                                                                                                                   |
| :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Status](https://platform.claude.com/docs/en/about-claude/model-deprecations) | Active (latest)                                                                                                                                                                                                                                                                                                                                                                                                         |
| Released                                                                      | September 1, 2026                                                                                                                                                                                                                                                                                                                                                                                                       |
| Retirement                                                                    | Not sooner than September 1, 2027                                                                                                                                                                                                                                                                                                                                                                                       |
| Platforms                                                                     | Claude API, [Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), [Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai), [Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry), [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws) |

## Resources

<CardGroup cols={3}>
  <Card title="Prompting Claude Fable 5.1" icon="lightbulb" href="https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1">
    Model-specific prompting guidance for long-horizon and agentic work.
  </Card>

  <Card title="Migrating to Claude Fable 5.1" icon="arrow-right" href="https://platform.claude.com/docs/en/models/fable-5-1/migration-guide">
    What changes when you move from Claude Fable 5, Claude Opus 5, or Claude Opus 4.8.
  </Card>

  <Card title="Preserved thinking" icon="brain" href="https://platform.claude.com/docs/en/build-with-claude/thinking#preserved-thinking">
    When this model's thinking blocks stay usable: across model switches and across changes to the conversation.
  </Card>

  <Card title="Per-message effort" icon="sliders" href="https://platform.claude.com/docs/en/build-with-claude/effort#change-effort-mid-conversation-beta">
    Change the effort level partway through a conversation without invalidating the prompt cache.
  </Card>

  <Card title="Refusals and fallback" icon="shield" href="https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback">
    Handle classifier refusals and retry on another Claude model.
  </Card>

  <Card title="Adaptive thinking" icon="brain" href="https://platform.claude.com/docs/en/build-with-claude/thinking">
    The only thinking mode on Claude Fable 5.1. Steer depth with `effort`.
  </Card>
</CardGroup>

## Reference

<CardGroup cols={3}>
  <Card title="System prompt" icon="text" href="https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5-1">
    The system prompt Claude Fable 5.1 uses on claude.ai and the Claude apps.
  </Card>

  <Card title="System card" icon="file" href="https://www.anthropic.com/claude-fable-5-1-mythos-5-1-system-card">
    Safety evaluations and deployment decisions for Claude Fable 5.1 and Claude Mythos 5.1.
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
