---
latestModelInfo:
  model: gpt-6-astra
  migrationGuide: /api/docs/guides/latest-model/gpt-6-astra.md#migration-quickstart
  promptingGuide: /api/docs/guides/latest-model/gpt-6-astra.md#prompting-best-practices
---

# Using GPT-6

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

Choose a GPT-6 model based on the reasoning your task requires, speed, and cost.



- [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra)

  **Highest intelligence**

  For the most demanding reasoning, coding, and professional work.

- [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol)

  **Balanced speed, cost, and intelligence**

  Near-Astra performance for complex work at a lower cost.

- [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)

  **Fastest and most cost-effective**

  Strong performance for focused, high-volume tasks.



To get started, set `model` in a [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses) request. If you already use [`gpt-6-sol`](https://developers.openai.com/api/docs/models/gpt-6-sol), review the [migration guidance](#migration-quickstart) before switching to GPT-6.1 Sol.

### GPT-6 Astra

GPT-6 Astra is our most intelligent model yet, with state-of-the-art performance in computer use, browsing, software engineering, science, and professional work. It can carry out multi-step workflows across code, browsers, and professional software. In [several evaluations](https://openai.com/index/gpt-6-astra/), Astra achieved stronger results using substantially fewer output tokens. Its estimated API cost per task was lower than earlier models despite its higher per-token pricing.

GPT-6 Astra is also our most aligned model yet. It excels at exercising care, respecting task boundaries, and communicating transparently. When instructions leave room for interpretation, it uses the context it has to fill in routine gaps and asks focused questions when the answer could change the outcome. It incorporates new requirements, changes course when asked, and answers side questions without losing track of the broader task.

All GPT-6 Astra users also have access to [Fast mode](https://developers.openai.com/api/docs/guides/fast-mode) and the new [Ultrafast mode](https://developers.openai.com/api/docs/guides/ultrafast-mode) for our fastest API speeds.

<a id="gpt-61-sol"></a>
<a id="gpt-6.1-sol"></a>

### GPT-6.1 Sol

Use GPT-6.1 Sol for complex coding, computer use, and professional work when you
want near-Astra performance at a lower cost. Compare it with Astra on your tasks
to assess the tradeoff between quality and cost.

Set `reasoning.effort` to `low`, `medium` (default), `high`, `xhigh`, or `max`.
Use the Responses API for tool calling. Chat Completions supports requests
without tools. The `none` and `minimal` reasoning efforts are not supported.

See the [model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol) for specifications,
pricing, and availability, or [model selection](https://developers.openai.com/api/docs/guides/model-selection#when-to-consider-gpt-61-sol)
for guidance on choosing a model.

<a id="gpt-6-astra-what-is-new" className="scroll-mt-[110px]"></a>

## What's new

- **Async tool calling:** GPT-6 can continue reasoning, call other tools, or answer independent parts of a request while your application runs a tool. Set `async: true` on a function or custom tool and return its result when ready using the original `call_id`. Your application still executes the tool and manages pending work. See [Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling) for basic usage and a developer-defined wait-tool pattern.
- **Mid-turn steering:** Send additional user instructions while GPT-6 is working, such as a correction or a change in requirements. Over a WebSocket connection, the Responses API preserves completed work and includes the update in a continuation. See [Mid-turn steering](https://developers.openai.com/api/docs/guides/steering) for the event flow and tool-result handling.
- **Change reasoning mid-conversation while preserving cache:** Add a `configuration_update` input item to increase reasoning effort for difficult work or reduce it for routine follow-ups without rewriting the original prompt prefix. The updated reasoning effort applies until another `configuration_update` input item overrides it. See [Change reasoning mid-conversation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation) for examples and compatibility.
- **Misalignment monitoring:** As part of our [strengthened safeguards](https://openai.com/index/path-to-astra/) for GPT-6 Astra, our systems asynchronously monitor for misalignment and trigger alerts when necessary. See [Misalignment monitoring](https://developers.openai.com/api/docs/guides/safety-checks/misalignment-monitoring) for more information.

GPT-6 also supports the existing API capabilities available with GPT-5.6, including [computer use](https://developers.openai.com/api/docs/guides/tools-computer-use), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [Programmatic Tool Calling](https://developers.openai.com/api/docs/guides/tools-programmatic-tool-calling), [multi-agent orchestration](https://developers.openai.com/api/docs/guides/responses-multi-agent), [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching), [persisted reasoning](https://developers.openai.com/api/docs/guides/reasoning#preserve-reasoning-across-calls), [compaction](https://developers.openai.com/api/docs/guides/compaction), and [pro mode](https://developers.openai.com/api/docs/guides/reasoning#reasoning-mode).

## Limitations

- GPT-6 Astra and GPT-6.1 Sol do not support the `none` reasoning effort; GPT-6 Sol and GPT-6 Luna do.
- Fast mode is not available with EU data residency for GPT-6 Astra, GPT-6 Sol, or GPT-6 Luna. [Ultrafast mode](https://developers.openai.com/api/docs/guides/ultrafast-mode) supports US data residency and global processing only. It does not support EU or other non-US regional processing endpoints. See [data residency eligibility](https://developers.openai.com/api/docs/guides/your-data#which-models-and-features-are-eligible-for-data-residency).

<a id="prompting-best-practices" className="scroll-mt-[110px]"></a>

## Prompting best practices

Use the following prompts as a starting point across the GPT-6 model family. They address behavior observed with GPT-6 Astra; evaluate them with your chosen model and workload.

### GPT-6 Astra behavior

- [Initiative and follow-through](#initiative-and-follow-through): The model is designed to be a more effective collaborator and is thus more likely to ask the user a question when additional input could materially change the result. This can cause it to stop when the user may expect it to make reasonable assumptions and persist.
- [Instruction following](#instruction-following): GPT-6 Astra is stronger at general instruction following than our previous models, giving you greater control over its behavior. It can be more sensitive to instructions contained in skills and other files, such as `AGENTS.md`. We **strongly recommend** auditing skills and other files accessible to your model for instructions that could influence its behavior.
- [Personality and writing style](#personality-and-writing-style): The model tends toward detailed, formatted responses and may use recurring phrases across sessions. Specify the writing style and structure your application needs.
- [Subagent delegation](#subagent-delegation): The model may delegate less often than desired for your workflow. Specify when and how much it should use subagents for parallel work.
- [Testing and verification](#testing-and-verification): For coding tasks, the model tends to be thorough in testing before considering a task complete. For smaller tasks, this can result in broader tests than the task requires.

### Initiative and follow-through

GPT-6 Astra is generally better than GPT-5.6 Sol and earlier models at staying coherent during long tasks. It is also more likely to ask for clarification where earlier models would make assumptions.

To encourage more autonomous work, start with this prompt:

```text
You should infer the user's intent and task scope from the instructions and prior conversation context. Your job is to bias towards action and carry the user's intended task to completion.

When the user expresses intent to perform new work or fix an existing issue, persist until the user's intended goal is complete. Progress autonomously towards the user's goal (e.g. creating isolated worktrees / checkouts if needed, resolving merge conflicts, read-only actions, creating draft PRs etc.) unless they are clearly destructive or irreversible.
```

When the user’s intent is unclear, the model is more likely to ask the user for clarification to proceed. Prompt the model to follow through if the user’s prompt implies authorization:

```text
When the user's prompt indicates a request for action, such as "can you...", "I want to...", "help me..." and similar expressions, treat these as instructions to do the work and take action. Do not stop at acknowledging capability (e.g. "Yes…"), proposing a plan, or offering to continue. Do not settle for a partial or "helpful enough" solution that does not fully satisfy the user's task to save time, effort or tokens. If a task requires sustained work, complete all the necessary work until the intended outcome is fulfilled.
```

Prompt the model to ask for approval only after preparing a concrete, reviewable result. This avoids blocking the task before the model has done the work it can, and often leads to quicker task completion.

```text
Before asking the user clarifying questions, you should complete the work that is already authorized from context and necessary to make the proposed action concrete and reviewable. The user should be approving a concrete, reviewable result. For example, before deploying a change, writing to an external application, merging a PR or publishing a site, do all the required work first so that user approval is the final step. You don't need user permission for reversible tasks, read-only actions, reviews or fixes, or anything for which authorization is provided earlier in the session or strongly implied from the task instruction.

Do not introduce unsolicited warnings, disclaimers, approval flows, or safety/compliance checklists due to hypothetical risk.
```

The model also likes to ask non-blocking questions as it’s working by default, so adjust these prompts to match the level of autonomy your application needs.

### Instruction following

GPT-6 Astra is better able to follow longer instructions, but can also be more sensitive to information in context. For example, unclear or conflicting guidance in a skill file may cause the model to pause and block work early. Make the priority of user instructions and skills explicit.

```text
The user's instructions take precedence over guidelines provided in a skill. If explicit user instructions conflict with a skill's instructions, prioritize the user's instructions.
```

Asking the model to identify the skill and instruction that caused it to pause or change direction can also be effective in providing transparency into model behavior.

```text
If a skill causes you to ask for permission or confirmation, pause, leave requested work unfinished, or diverge from the user's intent, name and link to the exact SKILL.md file you read, quote the relevant instruction, and briefly explain how it applies. Distinguish explicit skill requirements from your interpretation of guidelines.
```

Use this prompt to find silent and conflicting guidance when your application loads many skills and instruction files such as `AGENTS.md`.

### Personality and writing style

GPT-6 Astra tends to use lists, tables and Markdown to make responses scannable. If your application needs prose with less formatting, specify that preference.

```text
Default to using clear, concise paragraphs, each developing one main idea. Use lists only when the information is genuinely parallel, sequential, or easier to compare, and avoid nested lists unless the hierarchy cannot be expressed clearly in prose. Use plain, simple language: familiar words, concrete examples, and precise verbs. Prefer active voice and direct statements.

Make sure to state the main point clearly and early, then develop it with the explanation and detail the reader needs. Let each sentence build on what came before. Develop the points that matter and provide enough support to be useful.
```

For technical communication, the following prompt helps strike a balance between using clear, coherent language while remaining domain appropriate:

```text
Use plain language over jargon, and reference technical details only to the degree that it helps illustrate an idea or your work to the user. Communicate complex concepts in a clear and cohesive manner, and calibrate your writing to the level of background knowledge assumed from the user's prompt and context.
```

To reduce jargon and stock phrases in writing, start with this prompt:

```text
Avoid using slop words or phrases like "Bottom Line:" in conclusions, "delve," "foster," "leverage," "it's worth noting," "importantly," "Question? Answer." or "This isn't about X. It's about Y.", "genuinely" or hyphenated compound descriptions and adjectives. Do not use concluding summary statements such as "In short:..", "The simplest mental model is:...".

State the intended action directly. Avoid adding what you won't do, what will remain unchanged, or how you'll separate or categorize results. Do not use contrastive framing such as "X, not Y" that introduces an unprompted alternative that the user didn't ask about. Avoid invented compound labels like "exact-head checks" and "editorial-row layouts", vague qualifiers, and canned transitions; use plain verbs and prepositions to state the actual relationship directly.
```

### Subagent delegation

GPT-6 Astra is trained to be able to divide and delegate work to subagents that work in parallel. If you are implementing a multi-agent system in your harness, use the following prompt to tune how much GPT-6 Astra should delegate work:

```text
If at any point you can parallelize work by delegating tasks to another agent (no matter if you are the root or subagent), you should do so using collaboration tools if it could save time or improve quality.
```

Messages between agents may contain grammar or spacing errors. Use this prompt to make inter-agent messages easier to read:

```text
Messages that you send to other agents and your final answer may be read by a human, so ensure they are legible. Always put proper spaces between words and/or numbers.
```

The model tends to respond well to prompting for how and when it should delegate work to subagents, so tune this behavior to fit with your harness and multi-agent implementation.

### Testing and verification

For coding tasks, calibrate how much testing and verification a change requires. This can help avoid unnecessary tests or repeated checks for small changes.

```text
Do not write tests for reversible, low-impact changes that mirror the implementation. If you do choose to verify your work with tests, make sure that the tests are meaningful and necessary to verify implementation.

Run tests appropriate to the change and complete required checks. Once those pass, broaden or repeat testing only when new changes, failures, or unresolved concerns justify it; otherwise, continue toward completing the task.
```

## Migration quickstart

### Migrate with Codex

Codex can apply the recommended changes in this guide with the [OpenAI Docs skill](https://github.com/openai/codex/tree/main/codex-rs/skills/src/assets/samples/openai-docs).

```text
$openai-docs migrate this project to the GPT-6 model family
```

To use this skill in other coding agents, download it from the [Codex repository](https://github.com/openai/codex/tree/main/codex-rs/skills/src/assets/samples/openai-docs).

### Update API and model parameters

Set `model` to `gpt-6-astra`, `gpt-6.1-sol`, or `gpt-6-luna`, then check the following:

- **Reasoning effort:** Preserve your current effective [reasoning effort](https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort) where supported. GPT-6 Astra and GPT-6.1 Sol do not support `none`; use `low` instead. GPT-6 Sol and GPT-6 Luna support `none`. If your existing request uses `minimal`, start with `low` and compare results on representative tasks. Use `reasoning.effort` in Responses or `reasoning_effort` in Chat Completions.
- **Tool calling:** Use the [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses#migrating-from-chat-completions). GPT-6 Astra and GPT-6.1 Sol support Chat Completions, but tool calling requires Responses. GPT-6 Sol and GPT-6 Luna support function calling in Chat Completions only with `reasoning_effort: "none"`. Use Responses for reasoning with tools.
- **Unsupported parameters:** When reasoning effort is not `none`, remove `temperature`, `top_p`, and `top_logprobs`. For Chat Completions, also remove `logprobs`. For Responses, remove `message.output_text.logprobs` from `include`.
- **Data residency:** Fast mode is not available with EU data residency for GPT-6 Astra, GPT-6 Sol, or GPT-6 Luna. [Ultrafast mode](https://developers.openai.com/api/docs/guides/ultrafast-mode) supports US data residency and global processing only. It does not support EU or other non-US regional processing endpoints. Fast mode for GPT-6 Astra does not include a latency SLA. See [Fast mode compatibility](https://developers.openai.com/api/docs/guides/fast-mode#is-fast-mode-compatible-with-data-residency-zero-data-retention-and-a-baa).
- **Changing reasoning effort:** If your application changes effort between responses, use `configuration_update` items in standard, single-agent requests. Keep request-level `reasoning.effort` unchanged to preserve the prompt prefix for caching. Check the [compatibility limits](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation) before adopting this feature.
- **Prompt caching:** When migrating from GPT-5.5 or earlier, replace `prompt_cache_retention` with `prompt_cache_options.ttl` set to `"30m"`. Review the [prompt caching changes](https://developers.openai.com/api/docs/guides/prompt-caching#summary-of-model-differences), including cache boundaries and cache-write billing.
- **Unnecessary approval pauses:** If you run into issues where the model keeps asking for approval before proceeding, use the [initiative and follow-through guidance](#initiative-and-follow-through) to prompt for more autonomous execution. See the rest of [Prompting best practices](#prompting-best-practices) for guidance on instruction following, writing style, subagent delegation, and testing.