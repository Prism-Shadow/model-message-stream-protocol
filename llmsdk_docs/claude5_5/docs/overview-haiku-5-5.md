---
title: Claude Haiku 5.5
url: https://platform.claude.com/docs/en/models/haiku-5-5/overview
description: "Claude Haiku 5.5 at a glance: what it's for, model IDs on every platform, context window, output limits, pricing, availability, and the guides and resources for building with it."
---

**Latest.** Released October 7, 2026.

For high-volume, latency-sensitive tasks such as classification, extraction, and routing

Model ID: `claude-haiku-5-5`

Context window: 1M tokens · Max output: 128K tokens · Input pricing: From $0.10 / MTok · Output pricing: From $0.50 / MTok

[Announcement](https://www.anthropic.com/claude-haiku-5-5) · [What’s new](https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5) · [Migration guide](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide)

## Overview

Claude Haiku 5.5 is built for high-volume, latency-sensitive work such as classification, routing, extraction, and subagent tasks. It supports adaptive thinking with the effort parameter, a 1M token context window, and up to 128k output tokens. It uses the same newer tokenizer as Claude 4.7 and later models, so the same text counts as approximately 30% more tokens than on Claude Haiku 4.5. Its thinking blocks work only in the account that produced them, or in an account linked to it.

For code changes, see the [migration guide](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide). For model IDs, pricing, and limits, see the [Claude Haiku 5.5 overview](https://platform.claude.com/docs/en/models/haiku-5-5/overview). For prompting guidance, see [Prompting Claude Haiku 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5).

[What's new in Claude Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5)

## How it compares

| Model                                                                               | Context | Max output | Price / MTok       | Latency  | Thinking             | Default effort | Knowledge cutoff |
| :---------------------------------------------------------------------------------- | :------ | :--------- | :----------------- | :------- | :------------------- | :------------- | :--------------- |
| [Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/overview)   | 1M      | 128K       | $10 / $50          | Slower   | Adaptive (always on) | `high`         | Jun 2026         |
| [Claude Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/overview)     | 1M      | 128K       | $4 / $20           | Moderate | Adaptive (always on) | `medium`       | Jun 2026         |
| [Claude Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/overview) | 1M      | 128K       | $2 / $10           | Fast     | Adaptive             | `high`         | Jun 2026         |
| **Claude Haiku 5.5** (this model)                                                   | 1M      | 128K       | From $0.10 / $0.50 | Fastest  | Adaptive             | `medium`       | Jun 2026         |

* **Context:** 1M tokens is roughly 555k words or 2.5M Unicode characters on the current tokenizer (introduced with Claude Opus 4.7); models before it fit about 750k words in 1M tokens. 200k tokens is roughly 150k words.
* **Max output:** Synchronous Messages API limit. On the Message Batches API, Claude Opus 5.5, Claude Opus 5, Claude Sonnet 5.5, Claude Sonnet 5, Claude Haiku 5.5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, and Claude Sonnet 4.6 support up to 300k output tokens with the output-300k-2026-03-24 beta header.
* **Price / MTok:** Input / output, base price per million tokens. Batch API requests are 50% off; prompt caching reads cost 10% of the base input price (2.5% on Claude Fable 5.1 and Claude Mythos 5.1, 5% on Claude Opus 5.5 and Claude Sonnet 5.5). See Pricing for the full list.
* **Latency:** Comparative latency, relative to the current lineup, as published in the models overview. Actual latency depends on prompt length, output length, and thinking effort.
* **Thinking:** Adaptive thinking lets the model decide how much to think, steered by effort. Extended thinking is the manual budget\_tokens mode on earlier models.
* **Default effort:** The effort parameter’s default on the Claude API. Models without a value don’t support the parameter.
* **Knowledge cutoff:** Reliable knowledge cutoff: the date through which the model’s knowledge is most extensive and reliable.

## Specifications

### Model IDs

| Platform                                                                                               | Model ID                     |
| :----------------------------------------------------------------------------------------------------- | :--------------------------- |
| Claude API                                                                                             | `claude-haiku-5-5`           |
| [Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock)       | `anthropic.claude-haiku-5-5` |
| [Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai)              | `claude-haiku-5-5`           |
| [Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry) | `claude-haiku-5-5`           |
| [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws) | `claude-haiku-5-5`           |

### Pricing

| Feature                                                                                | Value                                                                                         |
| :------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| Input                                                                                  | $0.10 / MTok for prompts up to 100,000 tokens; $0.50 / MTok for prompts over 100,000 tokens   |
| Output                                                                                 | $0.50 / MTok for prompts up to 100,000 tokens; $2.50 / MTok for prompts over 100,000 tokens   |
| [5m cache write](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | $0.125 / MTok for prompts up to 100,000 tokens; $0.625 / MTok for prompts over 100,000 tokens |
| [1h cache write](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | $0.20 / MTok for prompts up to 100,000 tokens; $1 / MTok for prompts over 100,000 tokens      |
| [Cache read](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)     | $0.01 / MTok for prompts up to 100,000 tokens; $0.05 / MTok for prompts over 100,000 tokens   |
| [Batch API](https://platform.claude.com/docs/en/build-with-claude/batch-processing)    | 50% discount on input and output                                                              |

[Full price list](https://platform.claude.com/docs/en/about-claude/pricing)

### Capabilities

| Feature                                                                                                                     | Value                  |
| :-------------------------------------------------------------------------------------------------------------------------- | :--------------------- |
| [Context window](https://platform.claude.com/docs/en/build-with-claude/context-windows)                                     | 1M tokens              |
| Max output                                                                                                                  | 128K tokens            |
| [Max output (Batch API, beta)](https://platform.claude.com/docs/en/build-with-claude/batch-processing#extended-output-beta) | 300K tokens            |
| [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)                                                  | Adaptive               |
| [Default effort](https://platform.claude.com/docs/en/build-with-claude/effort)                                              | `medium`               |
| Comparative latency                                                                                                         | Fastest                |
| Input → output                                                                                                              | Text and images → text |
| Reliable knowledge cutoff                                                                                                   | Jun 2026               |
| Training data cutoff                                                                                                        | Jun 2026               |

### Availability

| Feature                                                                       | Value                                                                                                                                                                                                                                                                                                                                                                                                                   |
| :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Status](https://platform.claude.com/docs/en/about-claude/model-deprecations) | Active (latest)                                                                                                                                                                                                                                                                                                                                                                                                         |
| Released                                                                      | October 7, 2026                                                                                                                                                                                                                                                                                                                                                                                                         |
| Retirement                                                                    | Not sooner than October 7, 2027                                                                                                                                                                                                                                                                                                                                                                                         |
| Platforms                                                                     | Claude API, [Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), [Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai), [Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry), [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws) |

## Good to know

* Adaptive thinking is on by default. Control thinking depth with the [effort parameter](https://platform.claude.com/docs/en/build-with-claude/effort).
* Omit `temperature`, `top_p`, and `top_k`. See [Remove sampling parameters](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#remove-sampling-parameters) for the values that return a 400 error.
* On the [Message Batches API](https://platform.claude.com/docs/en/build-with-claude/batch-processing#extended-output-beta), Claude Haiku 5.5 supports up to 300k output tokens with the `output-300k-2026-03-24` beta header.
* The minimum cacheable prompt length is 512 tokens. See [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#cache-limitations).
* Query limits and capabilities programmatically with the [Models API](https://platform.claude.com/docs/en/api/models/list).

## Resources

<CardGroup cols={3}>
  <Card title="Prompting Claude Haiku 5.5" icon="lightbulb" href="https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5">
    Behavioral differences and prompting patterns specific to Claude Haiku 5.5.
  </Card>

  <Card title="Reduce latency" icon="lightning" href="https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency">
    Choose a model and effort level, shape prompts, and stream output for faster responses.
  </Card>

  <Card title="Adaptive thinking" icon="brain" href="https://platform.claude.com/docs/en/build-with-claude/thinking">
    Claude Haiku 5.5 determines when and how much to think. Steer depth with `effort`.
  </Card>

  <Card title="Context windows" icon="stack" href="https://platform.claude.com/docs/en/build-with-claude/context-windows">
    How the context window is counted and managed.
  </Card>
</CardGroup>

## Reference

<CardGroup cols={3}>
  <Card title="System prompt" icon="text" href="https://platform.claude.com/docs/en/release-notes/system-prompts/claude-haiku-5-5">
    The system prompt Claude Haiku 5.5 uses on claude.ai and the Claude apps.
  </Card>

  <Card title="System card" icon="file" href="https://www.anthropic.com/document/claude-haiku-5-5-system-card">
    Safety evaluations and deployment decisions for Claude Haiku 5.5.
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
