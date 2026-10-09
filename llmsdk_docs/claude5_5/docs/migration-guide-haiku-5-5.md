---
title: Claude Haiku 5.5 migration guide
url: https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide
description: Switch to Claude Haiku 5.5 from earlier Haiku models with this migration guide. The guidance to enable Claude Haiku 5.5 includes the new model ID, settings that return errors, thinking changes, and a checklist for each starting model.
---

<Note>
  This guide covers migrating [Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages) code. If you use [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview), no changes beyond updating the model name are required.
</Note>

<Tip>
  **Automate your migration with the Claude API skill.** In Claude Code, run `/claude-api migrate` to invoke the bundled [Claude API skill](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/claude-api-skill#migrating-to-a-newer-claude-model). It works for any current Claude model as the target:

  ```text wrap
  /claude-api migrate this project to claude-haiku-5-5
  ```

  The skill applies the model ID swap and, as needed, breaking parameter changes, prefill replacement, and effort calibration for your target model across your code base, then produces a checklist of items to verify manually. It asks you to confirm the migration scope (entire working directory, a subdirectory, or a specific file list) before editing any files. The skill also detects Amazon Bedrock and Claude Platform on AWS clients and adjusts model ID formats and feature changes for those platforms.
</Tip>

This guide covers moving code that calls Claude Haiku 4.5 to Claude Haiku 5.5. For code that calls Claude Haiku 3.5 or Claude Haiku 3, also make the changes in [Migrating to Claude Haiku 5.5 from Claude Haiku 3.5 and earlier Haiku models](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#migrating-from-haiku-35). To move up to a Sonnet or Opus model instead, see [Upgrade between model versions](https://platform.claude.com/docs/en/about-claude/models/migration-guide). For how long Claude Haiku 4.5 stays available, see [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations).

## Migration checklist by starting model

Work down the groups and stop after the one that names your current model. If you are on Claude Haiku 4.5, the first group is the whole list. Each item is one change to make in your code.

### Every starting model

1. Replace the model ID with the Claude Haiku 5.5 ID for your platform. See [Use the Claude Haiku 5.5 model ID](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#use-the-claude-haiku-5-5-model-id).
2. Recount your prompts, and revisit `max_tokens` limits and cost estimates, because the same text counts as more tokens and large images count as more visual tokens. See [Recount tokens](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#recount-tokens).
3. If your requests send `thinking: {"type": "enabled", "budget_tokens": N}`, change `thinking` to `{"type": "adaptive"}`. See [Configure thinking](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#configure-thinking).
4. If your code reads the first content block as the answer, select blocks by `type` instead. See [Configure thinking](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#configure-thinking).
5. Remove `temperature`, `top_p`, and `top_k` from your requests. See [Remove sampling parameters](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#remove-sampling-parameters).
6. If your requests end `messages` with an assistant turn for the model to continue, end them with a user turn instead. See [Replace assistant prefill](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#replace-assistant-prefill).
7. If you use computer use, replace `computer_20250124`: on the Claude API and Google Cloud, with the `computer_toolset_20260801` toolset; on Amazon Bedrock, with `computer_20251124` and the `computer-use-2025-11-24` beta header. See [Move computer use to the toolset](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#computer-use-toolset).
8. If you replay stored conversations through a different account, replay each one through the account that produced it. See [Replay thinking blocks through the account that produced them](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#replay-thinking-blocks-through-the-producing-account).
9. If your code changes `system`, `tools`, or earlier `messages` between requests in a conversation and sends thinking blocks back, keep the conversation append-only. See [Keep earlier turns unchanged](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#keep-earlier-turns-unchanged).
10. Handle `stop_reason: "refusal"`. Claude Haiku 5.5 runs safety classifiers that can decline a request, and it has no server-side fallback. See [Safeguard refusals](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5#safeguard-refusals).
11. If you use [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) (`output_config.format` or `strict: true` tools) on Amazon Bedrock, describe the format in the prompt or use a tool without `strict`, and validate the output in your code. Structured outputs aren't available for Claude Haiku 5.5 on Amazon Bedrock.

If your organization has a [Priority Tier](https://platform.claude.com/docs/en/api/service-tiers#supported-models) commitment on Claude Haiku 4.5, plan capacity separately: Priority Tier is not supported on Claude Haiku 5.5.

### Claude Haiku 3.5 or earlier

1. Replace the Claude Haiku 3.5 or Claude Haiku 3 model ID with the Claude Haiku 5.5 ID for your platform. See [Migrating to Claude Haiku 5.5 from Claude Haiku 3.5 and earlier Haiku models](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#migrating-from-haiku-35).
2. If you use the legacy `code_execution_20250522` tool, move to `code_execution_20250825` or later.
3. If you use the text editor tool, move to `text_editor_20250728`.
4. Handle the `refusal` and `model_context_window_exceeded` stop reasons.
5. If your code matches tool call string parameters exactly, allow for trailing newlines.
6. Review your prompts.

## Use the Claude Haiku 5.5 model ID

Replace the Claude Haiku 4.5 model ID with the Claude Haiku 5.5 ID for your platform.

| Platform               | Claude Haiku 4.5                                  | Claude Haiku 5.5             |
| ---------------------- | ------------------------------------------------- | ---------------------------- |
| Claude API             | `claude-haiku-4-5-20251001` or `claude-haiku-4-5` | `claude-haiku-5-5`           |
| Amazon Bedrock         | `anthropic.claude-haiku-4-5`                      | `anthropic.claude-haiku-5-5` |
| Claude Platform on AWS | `claude-haiku-4-5`                                | `claude-haiku-5-5`           |
| Google Cloud           | `claude-haiku-4-5@20251001`                       | `claude-haiku-5-5`           |
| Microsoft Foundry      | `claude-haiku-4-5`                                | `claude-haiku-5-5`           |

`claude-haiku-5-5` is a fixed model ID with no date suffix and no separate alias.

## Recount tokens

Claude Haiku 5.5 uses the same newer tokenizer as Claude 4.7 and later models. As with all models that use this tokenizer, the same input text produces approximately 30% more tokens on Claude Haiku 5.5 than on Claude Haiku 4.5. The exact increase depends on the content. Requests, responses, and streaming events keep the same shape. What changes is anything you measure or budget in tokens:

* `usage` fields and [token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting) results are higher for the same text.
* A given number of tokens holds less text.
* A `max_tokens` limit tuned for Claude Haiku 4.5 may cut off equivalent output.
* Cost estimates made from Claude Haiku 4.5's token counts need recomputing with Claude Haiku 5.5's counts and [prices](https://platform.claude.com/docs/en/about-claude/pricing), including its higher prices for long prompts. See [Long context pricing](https://platform.claude.com/docs/en/about-claude/pricing#long-context-pricing).

Large images can also cost more tokens. Claude Haiku 5.5 uses the high-resolution image tier, which downscales images above 2,576 pixels on the long edge or 4,784 visual tokens. Claude Haiku 4.5 and earlier Haiku models use the standard tier, which downscales images above 1,568 pixels on the long edge or 1,568 visual tokens. An image of 2,000 by 1,500 pixels costs about 2.5 times as many visual tokens on Claude Haiku 5.5 as on Claude Haiku 4.5. See [Resolution and token cost](https://platform.claude.com/docs/en/build-with-claude/vision#evaluate-image-size).

Count your prompts with `model` set to `claude-haiku-5-5` rather than reusing counts measured on Claude Haiku 4.5.

## Configure thinking

Claude Haiku 5.5 configures thinking differently from Claude Haiku 4.5. A `thinking` value of `{"type": "enabled", "budget_tokens": N}` returns a 400 error, so a request that sends it needs a new `thinking` value.

Before, a request to Claude Haiku 4.5 set `thinking` to `enabled` with a token budget:

```json
{
  "model": "claude-haiku-4-5",
  "max_tokens": 16000,
  "thinking": { "type": "enabled", "budget_tokens": 8000 },
  "messages": [{ "role": "user", "content": "..." }]
}
```

After, the same request to Claude Haiku 5.5 uses adaptive thinking. The `thinking` value changes, and `output_config.effort` sets how much the model thinks:

```json
{
  "model": "claude-haiku-5-5",
  "max_tokens": 16000,
  "thinking": { "type": "adaptive" },
  "output_config": { "effort": "medium" },
  "messages": [{ "role": "user", "content": "..." }]
}
```

Adaptive thinking is on by default, so a response can begin with one or more `thinking` blocks even when the request doesn't set `thinking`. Leave `thinking` unset or set it to `{"type": "adaptive"}`, and use [effort](https://platform.claude.com/docs/en/build-with-claude/effort) as the lever: where Claude Haiku 4.5 ran without thinking, or with a small budget to save tokens, choose a lower effort level. At a lower level the model thinks less, and it can skip thinking entirely on simpler requests. For prompting guidance, see [Use effort to control thinking](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5#use-effort-to-control-thinking). Select content blocks by their `type` field rather than by position, and pass `thinking` blocks back unmodified with tool results.

Thinking tokens count toward `max_tokens`, so a request with a small `max_tokens` can stop with `stop_reason: "max_tokens"` after a `thinking` block and before any text. If you set a small `max_tokens` for Claude Haiku 4.5, raise it to leave room for thinking, or choose a lower [effort](https://platform.claude.com/docs/en/build-with-claude/effort) level.

Thinking blocks from earlier assistant turns stay in context and count as input tokens, where Claude Haiku 4.5 kept only the latest turn's. Multi-turn conversations therefore carry more input tokens than the tokenizer change alone explains. To remove older blocks, use [thinking block clearing](https://platform.claude.com/docs/en/build-with-claude/context-editing#thinking-block-clearing). See [Thinking block preservation by model](https://platform.claude.com/docs/en/build-with-claude/thinking#thinking-block-preservation-by-model).

By default, Claude Haiku 5.5 returns each `thinking` block with an empty `thinking` field and only a `signature`, where Claude Haiku 4.5 returned summarized thinking. To receive summarized thinking, set `thinking: {"type": "adaptive", "display": "summarized"}`.

Claude Haiku 5.5 accepts a forced `tool_choice` (`any` or a named tool), but the response starts with the tool call and has no `thinking` block. To let the model think before it calls a tool, use `tool_choice: {"type": "auto"}` and say in the prompt when to use the tool.

Claude Haiku 5.5 reads thinking blocks from Claude Sonnet 5, Claude Opus 4.8, Claude Haiku 4.5, and earlier models, so a conversation you switch from Claude Haiku 4.5 onto Claude Haiku 5.5 keeps its reasoning. It doesn't read blocks from Claude Opus 5, Claude Opus 5.5, Claude Sonnet 5.5, or any Claude Fable or Claude Mythos model; the API drops those without an error. On the Claude API and Google Cloud, Claude Opus 5.5 and Claude Sonnet 5.5 read Claude Haiku 5.5's blocks. See [Switching models mid-conversation](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking#switching-models).

## Remove sampling parameters

Claude Haiku 4.5 accepts `temperature`, `top_p`, and `top_k`. On Claude Haiku 5.5, omit all three and use prompting to guide the model's behavior instead. If a request includes `temperature`, it must be `1`. If it includes `top_p`, it must be `0.99`, its default. Any other `temperature` or `top_p` value returns a 400 error, including a `top_p` of `1`. So does any `top_k` value, and so does a request that includes both `temperature` and `top_p`.

## Replace assistant prefill

A prefill is a final assistant turn in `messages` that the model continues. Claude Haiku 4.5 accepts one when thinking is off. Claude Haiku 5.5 rejects it with a 400 error, even with thinking turned off. End `messages` with a user turn, and replace each prefill according to what it was for:

* **Output format:** use [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), or tools with enum fields for classification. On Amazon Bedrock, structured outputs aren't available for Claude Haiku 5.5. There, describe the format in the prompt or use a tool without `strict`, and validate the output in your code.
* **Preambles:** ask in the system prompt for a direct answer.
* **Continuations:** move them to the user message, for example "Your previous response was interrupted and ended with `[previous_response]`. Continue from where you left off."
* **Context reminders:** put them in the user turn.

## Move computer use to the toolset

Claude Haiku 4.5 supports [computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) through the `computer_20250124` tool, with the `computer-use-2025-01-24` beta header. On the Claude API and Google Cloud, Claude Haiku 5.5 supports computer use only through the `computer_toolset_20260801` toolset, and a request that declares `computer_20250124` returns a 400 error. On Amazon Bedrock, Claude Haiku 5.5 doesn't accept `computer_20250124` either; use the `computer_20251124` tool version with the `computer-use-2025-11-24` beta header.

To move an integration to the toolset, drop the `computer-use-2025-01-24` beta header and replace the `tools` entry with `{"type": "computer_toolset_20260801"}`. Then make the other request and agent-loop changes in [Migrate from `computer_20251124`](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool#migrate-from-computer-20251124): dispatch on each member `tool_use` block's `name` and `toolset_name` rather than on `input.action`, handle every such block in a turn, and echo `toolset_name` on results. Zoom is on by default in the toolset; if your environment doesn't implement it, add `"configs": {"zoom": {"enabled": false}}`. If you send the `fine-grained-tool-streaming-2025-05-14` beta header, remove it. Alongside a toolset entry, it returns a 400 error. For other platforms, see the computer use tool's [Compatibility](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool#compatibility) section.

On the Claude API and Google Cloud, Claude Haiku 5.5 also supports the [browser use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool) (`browser_toolset_20260801`) for tasks inside webpages. Claude Haiku 4.5 doesn't support it.

## Replay thinking blocks through the account that produced them

Thinking blocks from Claude Haiku 5.5 work only in the account that produced them, or in an account linked to it. When another account sends one of these blocks, the API drops the block before the model sees it, and the request succeeds without that reasoning. This affects code that stores conversations and replays them through a different account, for example a service that serves several customers from one conversation store. Replay each conversation through the account that produced it. See [Thinking blocks stay with the account that produced them](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking#account-bound-thinking).

## Keep earlier turns unchanged

A Claude Haiku 5.5 thinking block stays valid only while everything sent before it is unchanged: a request that sends a thinking block back after a change to `system`, `tools`, or earlier `messages` returns a 400 error. Claude Haiku 4.5 doesn't run this check. Keep conversations append-only. On accounts created before August 31, 2026, 00:00 UTC, the error comes only on requests that set `thinking.block_binding.prefix_mismatch_behavior`. For the changes that trigger the error and what to do instead, see [Who needs to change anything](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking#who-is-affected).

## Migrating to Claude Haiku 5.5 from Claude Haiku 3.5 and earlier Haiku models

Claude Haiku 3.5 is retired on the Claude API and Amazon Bedrock, and Claude Haiku 3 is retired on the Claude API and Google Cloud. Requests to a retired model fail. Google Cloud lists Claude Haiku 3.5 as deprecated and available only to existing customers. See [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations).

From either model, first apply every preceding section, then these changes:

* **Model ID:** Replace `claude-3-5-haiku-20241022`, its alias `claude-3-5-haiku-latest`, or `claude-3-haiku-20240307` with `claude-haiku-5-5`. On Google Cloud, replace `claude-3-5-haiku@20241022` with `claude-haiku-5-5`. On Amazon Bedrock, use the Claude Haiku 5.5 ID from [Use the Claude Haiku 5.5 model ID](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide#use-the-claude-haiku-5-5-model-id).
* **Code execution:** Claude Haiku 5.5 accepts `code_execution_20250825` and later versions. If you use the legacy Python-only `code_execution_20250522`, move to one of them. See [Upgrade to latest tool version](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool#upgrade-to-latest-tool-version).
* **Text editor:** If you use the text editor tool, move to `text_editor_20250728` (tool name `str_replace_based_edit_tool`), which has no `undo_edit` command. See [Text editor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool).
* **Stop reasons:** Handle `refusal` and `model_context_window_exceeded`. See [Handling stop reasons](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons).
* **Trailing newlines:** Claude 4.5 and later models keep trailing newlines in tool call string parameters. If your code matches those strings exactly, allow for them.
* **Prompts:** Claude 4 and later models have a more concise, direct communication style and need explicit direction. Review your prompts against [Prompting Claude Haiku 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5) and [prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).
