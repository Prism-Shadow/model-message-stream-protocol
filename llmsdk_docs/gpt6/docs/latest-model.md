---
latestModelInfo:
  model: gpt-6.2-astra
  migrationGuide: /api/docs/guides/latest-model/gpt-6.2-astra.md#migration-quickstart
  promptingGuide: /api/docs/guides/latest-model/gpt-6.2-astra.md#prompting-best-practices
---

# Using GPT-6.2

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

<a id="gpt-6.2-astra-gpt-62-astra-and-gpt-62-sol"></a>

Use [GPT-6.2 Astra](https://developers.openai.com/api/docs/models/gpt-6.2-astra) for the most demanding tasks or [GPT-6.2 Sol](https://developers.openai.com/api/docs/models/gpt-6.2-sol) for complex work at lower cost.

## What's new

Starting with GPT-6.2, the API will drop reasoning items when it detects mid-conversation changes to the conversation history (prefix edits), model downgrade, end user, or organization. When the model loses access to reasoning items, answer quality can decline and the model may use more tokens to repeat earlier work. Review your integration to identify edits such as changes to instructions or tool calls. To preserve reasoning and keep earlier input eligible for [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching), [keep the prefix unchanged](https://developers.openai.com/api/docs/guides/keep-prefix-unchanged) when you change settings between responses.

<a id="prompting-best-practices" className="scroll-mt-[110px]"></a>

## Prompting best practices

Use the following prompts as a starting point across the GPT-6.2 model family. The examples address behaviors we’ve seen when working with GPT-6.2 Astra and Sol. If you recognize one in your own application, try the prompt in that section.

### GPT-6.2 Astra behavior

- **[Writing style](#writing-style).** The model’s writing tends to be more concise and direct by default. When migrating, revisit instructions like “be concise” in your system prompt.
- **[Task completion](#task-completion).** When the user’s intent is unclear, the model may propose a next step and wait for confirmation. For longer tasks, give it room to make reasonable assumptions and keep working.
- **[Coding style](#coding-style).** The model tends to write more efficient, high-quality code than its predecessors. Describe any project conventions that should guide how it writes or edits code.
- **[Frontend design](#frontend-design).** If the interface needs a particular look, specify the imagery and typography it should use.

<a id="gpt-6.2-astra-prompt-patterns-for-api-applications"></a>
<a id="gpt-6.2-astra-personality-and-writing-style"></a>

### Writing style

GPT-6.2 Astra is more concise and direct by default than earlier models. Its tone can be tuned to suit the application, from a professional colleague to a more conversational assistant.

Use the following prompt if you want to use the model as a collaborator and thought partner for day to day work.

```text
Write using terminology the user and sources use. Keep technical details and use domain-specific language when they make the explanation more precise. Use the active voice and keep closely related details together. Cover the key points up front, and avoid references that the reader can only make sense of later in the response. Give the user enough context to follow your reasoning.
```

Prompt the model to adapt to the audience it is drafting material for, such as writing in documents, emails, messages and external posts.

```text
When drafting a message or any other material on behalf of the user to be sent to an external audience, consider who will read it and tailor the content to that intended audience. The intended audience likely does not have the same context as the user, so ensure that you provide the background information or reasoning required for the audience to understand the content. When reviewing or editing existing content, preserve the author’s content and wording, and follow the user's instruction carefully for what edits they want.
```

During longer tasks, the model can carry shorthand from its reasoning or from other agents into its final answer. Remind it to write a self-contained response that’s clear to someone who hasn’t followed the progress updates.

```text
Treat your final answer as the user's first look at your work, and not as a continuation of intermediate commentary. The final answer must always be fully self-contained: users should never need to read earlier commentary updates for context, since they are collapsed when the final answer is shown to the user.

Write the final answer and all other human-facing material anew for the intended reader. Do not copy or closely paraphrase your reasoning or adopt its writing style. Do not carry over working shorthand, jargon, or abbreviations from your reasoning, tool calls, or instructions to subagents and automations.
```

<a id="gpt-6.2-astra-initiative-and-follow-through"></a>
<a id="gpt-6.2-astra-subagent-delegation"></a>

### Task completion

For work that can proceed without supervision, specify the outcome the model should complete and which decisions need the user’s input.

```text
Avoid stopping to end the turn while the task is incomplete or if there is an authorized next step you can take, and instead take the next steps within task scope to progress the user's request. If your final response before ending the turn is a suggested next step, a plan, a request to the user for a routine decision, instructions for a task to execute, or similar handoff to the user, take these steps yourself to make progress towards what the user asked for. Make sure that you have authorization to do so, and flag any assumptions or decisions you maketo the user.

Only stop to clarify with the user if there is significant change in task scope, you are concretely blocked, have a decision that the user needs to resolve, or before irreversible or destructive actions.
```

<a id="gpt-6.2-astra-testing-and-verification"></a>
<a id="gpt-6.2-astra-ask-for-an-exhaustive-pass"></a>

Ask the model to verify that it has completed the requested work. Higher reasoning effort can help it persist through the final checks on complex or long-running tasks. In the Responses API, set the level with `reasoning.effort`. [Reasoning effort](https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort)

```text
Bias towards action, and persist until you've completed the task the user asked for. Avoid stopping to end the turn while the task is incomplete or if there is an authorized next step you can take, and instead take the next steps within task scope to progress the user's request. Make sure that you have accounted for every part of the user's request, and persist until you've delivered a result that fully satisfies the user's goal. If a task requires sustained work, do all the necessary work until the intended outcome is completely fulfilled.

Progress autonomously towards the user's goal (e.g. creating isolated worktrees / checkouts if needed, resolving merge conflicts, creating draft PRs etc) unless they are clearly destructive or irreversible. Before ending a turn or calling your work complete, check that your work fully satisfies what the user asked for. If any steps remain or any part of the result still needs verification, follow through on this work before finishing.
```

<a id="gpt-6.2-astra-instruction-following"></a>
<a id="gpt-6.2-astra-intent-understanding"></a>
<a id="gpt-6.2-astra-interpreting-ambiguous-requests"></a>

When a detail is unclear, give the model room to state what it’s assuming and continue with the task.

```text
Make reasonable, reversible assumptions to carry work forward and state them if it progresses the task within scope. Do not second guess yourself, stop after describing what you could do, offer to do the work, or provide a partial answer unless there is no way you can proceed.
```

With an async tool such as `request_user_input_async` in your application, GPT-6.2 can ask the user for clarification and continue work that doesn’t depend on the answer. [Add an async question tool](https://developers.openai.com/api/docs/guides/async-tool-calling#add-a-tool-to-ask-the-user-for-input)

<a id="gpt-6.2-astra-code-changes"></a>

### Coding style

Describe the codebase’s conventions and any behavior that existing callers rely on. For example, specify when to reuse existing logic, how narrowly to scope a change, and when to add a test for behavior the existing suite doesn’t cover.

```text
Above all, be thorough in producing high-quality, correct code that completely fulfills the user's task. Keep the code easy to read and verify that the user-requested outcome works as they intend. Follow these instructions when coding:

(a) Reuse existing logic in the user's repo when you can. You should reuse existing classes, methods, representations, and APIs in the codebase as long as they preserve correctness. Before consolidating or removing code, preserve the behavior its callers rely on unless the task requires changing it.
(b) Skip new tests unless requested, required by the repo, or needed to catch a specific regression existing tests would miss.
(c) Make sure that code is human readable. Do not use fewer lines, shorter variable names, minified formatting, or dense one-liners as substitutes for simplicity. Ensure that comments and variable names are readable and understandable to a human. Code-golfed expressions count as overly complex when they encode many branches, conditions, or hidden assumptions.
(d) Avoid unnecessary indirection and abstraction. Helper functions, utility functions, and class abstractions can add cognitive complexity even when they do not add branches.
```

<a id="gpt-6.2-astra-visual-review"></a>
<a id="gpt-6.2-astra-visual-work-and-frontend-design"></a>

### Frontend design

If the application depends on a specific visual style, describe it in the prompt. Specify the kinds of images it should use and the typography it should follow, including a particular typeface when that matters. Keep interface copy focused on what people need to know or do.

```text
When generating webpages or apps with a frontend user interface, follow these instructions:

- When choosing visuals, generally prefer realistic images from ImageGen or image search that suit the project's style and purpose. Use SVGs when the user specifically asks for them.
- Include a text element only when it provides information the user needs, helps them navigate or act, or fulfills an explicit content request. Remove decorative numbering, filler badges, redundant headings, and explanatory copy that merely restates what the surrounding interface already makes clear, while preserving necessary labels, instructions, and status feedback.
```

For visual work, share a reference from your design software, or give GPT-6.2 access to the [image generation tool](https://developers.openai.com/api/docs/guides/tools-image-generation) and ask it to create one with GPT Image. A reference can enrich your prompt with details that are hard to describe in words. Once it captures the look you want, ask the model to build the asset, render it, and refine it against the reference.

## Migration quickstart

<a id="gpt-6.2-astra-migrate-with-codex"></a>

To migrate an API application to GPT-6.2 Astra with a coding agent, use the [OpenAI Docs skill](https://github.com/openai/codex/tree/main/codex-rs/skills/src/assets/samples/openai-docs).

<a id="gpt-6.2-astra-choose-a-reasoning-effort"></a>
<a id="gpt-6.2-astra-zdr-data-residency-and-service-tiers"></a>
<a id="gpt-6.2-astra-limitations"></a>
<a id="gpt-6.2-astra-data-residency-and-service-tiers"></a>

### Update API and model parameters

Set `model` to `gpt-6.2-astra` or `gpt-6.2-sol`, then check the following:

- **Reasoning effort:** Start with `medium` for a new integration. If you currently use `none` or `minimal`, use `low` instead. Use `reasoning.effort` in Responses or `reasoning_effort` in Chat Completions.
- **Tool calling:** Use the [**Responses API**](https://developers.openai.com/api/docs/guides/migrate-to-responses#migrating-from-chat-completions). GPT-6.2 Astra and GPT-6.2 Sol support Chat Completions, but tool calling requires Responses.
- **Unsupported parameters:** When migrating Chat Completions requests, omit `temperature`, `top_p`, `logprobs`, and `top_logprobs`. For Responses requests, omit `temperature`, `top_p`, and `top_logprobs` and remove `message.output_text.logprobs` from `include`.
- **Prompt caching:** When migrating from GPT-5.5 or earlier, replace `prompt_cache_retention` with `prompt_cache_options.ttl` set to `"30m"`. Review the [**prompt caching changes**](https://developers.openai.com/api/docs/guides/prompt-caching#summary-of-model-differences), including cache boundaries and cache-write billing.
- **Zero Data Retention:** GPT-6.2 Astra and Sol support Zero Data Retention (ZDR) for approved organizations on eligible endpoints and features. With ZDR enabled, the Responses API treats `store` as `false`. For multi-turn work, pass the prior output items back in order, including encrypted reasoning items. See [Zero Data Retention](https://developers.openai.com/api/docs/guides/your-data#zero-data-retention) for eligibility and endpoint behavior.
- **Service tiers and regions:** Both models support US and EU data residency with Standard, Fast, and Batch processing. Ultrafast supports US data residency only. See [data residency](https://developers.openai.com/api/docs/guides/data-residency#which-models-and-features-are-eligible-for-data-residency) and [pricing](https://developers.openai.com/api/docs/pricing#text-tokens).
- **Prompting:** See [**Prompting best practices**](#prompting-best-practices) for guidance.