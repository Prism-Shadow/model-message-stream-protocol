---
title: Migrating to Claude Opus 5.5
url: https://platform.claude.com/docs/en/models/opus-5-5/migration-guide
description: "Migrate to Claude Opus 5.5 from earlier Opus models or Claude Sonnet 5: request settings that return errors, thinking blocks in every response, and a checklist for each starting model."
---

<Note>
  This guide covers migrating [Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages) code. If you use [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview), no changes beyond updating the model name are required.
</Note>

<Tip>
  **Automate your migration with the Claude API skill.** In Claude Code, run `/claude-api migrate` to invoke the bundled [Claude API skill](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/claude-api-skill#migrating-to-a-newer-claude-model). It works for any current Claude model as the target:

  ```text wrap
  /claude-api migrate this project to claude-opus-5-5
  ```

  The skill applies the model ID swap and, as needed, breaking parameter changes, prefill replacement, and effort calibration for your target model across your code base, then produces a checklist of items to verify manually. It asks you to confirm the migration scope (entire working directory, a subdirectory, or a specific file list) before editing any files. The skill also detects Amazon Bedrock and Claude Platform on AWS clients and adjusts model ID formats and feature changes for those platforms.
</Tip>

This page lists the code changes for moving to Claude Opus 5.5 from [Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-5), [Claude Opus 4.8](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-4-8), [Claude Opus 4.7](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-47), [Claude Opus 4.6 and earlier Opus models](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-46), or [Claude Sonnet 5](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-sonnet-5). Every reader needs [What every request to Claude Opus 5.5 must satisfy](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#request-requirements) and [Handle thinking in every response](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#thinking-in-every-response). Then go to the section for your current model: its first sentence names the other sections that apply to you. The [migration checklist](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migration-checklist) lists every change by starting model.

Claude Opus 5.5 costs less than Claude Opus 5 ($4 / $20 USD per million input / output tokens, compared with $5 / $25; see [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)). For feature support, see [What's new in Claude Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5#feature-support). For behavioral differences and model-specific prompting patterns, see [Prompting Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5).

## What every request to Claude Opus 5.5 must satisfy

Whichever model you are coming from, a request to `claude-opus-5-5` must meet the following. Where an item says a setting is rejected, the API returns a 400 error.

* **Model ID:** Use `claude-opus-5-5`, a fixed model ID with no date suffix. On Amazon Bedrock, Claude Platform on AWS, Google Cloud, and Microsoft Foundry, use that platform's model ID; see [Availability](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5#availability).
* **Thinking:** Send no `thinking` field, or send `thinking: {"type": "adaptive"}`, which is equivalent: [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) is always on. `thinking: {"type": "disabled"}` and manual thinking budgets (`thinking: {"type": "enabled", "budget_tokens": N}`) are rejected. See the [before and after for thinking](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#thinking-cant-be-disabled).
* **Effort:** Control thinking depth with the [effort parameter](https://platform.claude.com/docs/en/build-with-claude/effort), the only request parameter that controls it. All five levels (`low`, `medium`, `high`, `xhigh`, `max`) are supported, and the default is `medium`. See [Recommended effort levels for Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/effort#recommended-effort-levels-for-claude-opus-5-5).
* **Tool choice:** Use `tool_choice` `{"type": "auto"}` (the default) or `{"type": "none"}`. Forcing a tool call with `{"type": "any"}` or `{"type": "tool", "name": "..."}` is rejected. See the [before and after for tool choice](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#forced-tool-use).
* **Sampling parameters:** Omit `temperature`, `top_p`, and `top_k`, or leave them at their defaults: any other value is rejected. Use prompting to guide the model's behavior.
* **Prefill:** Don't end `messages` with a prefilled assistant turn: it is rejected. Use [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) or system prompt instructions instead.
* **Computer use:** On the Claude API and Google Cloud, declare computer use as the `computer_toolset_20260801` toolset; the earlier `computer_20251124` tool is rejected there. See the [computer use breaking change](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#computer-use-toolset).
* **Context window:** No context-window beta header is needed. The [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) is the default, and a header sent for older models has no effect.

The following request satisfies every item in the list: effort is set, and there is no `thinking` field. The SDK tabs that print text select it by block type, because `thinking` blocks come first.

<CodeGroup>
  ```bash cURL
  curl https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d '{
      "model": "claude-opus-5-5",
      "max_tokens": 4096,
      "messages": [{
        "role": "user",
        "content": "Analyze the trade-offs between microservices and monolithic architectures"
      }],
      "output_config": {
        "effort": "medium"
      }
    }'
  ```

  ```bash CLI
  ant messages create \
    --model claude-opus-5-5 \
    --max-tokens 4096 \
    --output-config '{effort: medium}' \
    --message '{role: user, content: "Analyze the trade-offs between microservices and monolithic architectures"}'
  ```

  ```python Python
  client = anthropic.Anthropic()

  response = client.messages.create(
      model="claude-opus-5-5",
      max_tokens=4096,
      messages=[
          {
              "role": "user",
              "content": "Analyze the trade-offs between microservices and monolithic architectures",
          }
      ],
      output_config={"effort": "medium"},
  )

  for block in response.content:
      if block.type == "text":
          print(block.text)
  ```

  ```typescript TypeScript
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: "Analyze the trade-offs between microservices and monolithic architectures"
      }
    ],
    output_config: {
      effort: "medium"
    }
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  console.log(textBlock?.text);
  ```

  ```csharp C#
  AnthropicClient client = new();

  var parameters = new MessageCreateParams
  {
      Model = Model.ClaudeOpus5_5,
      MaxTokens = 4096,
      Messages = [
          new() {
              Role = Role.User,
              Content = "Analyze the trade-offs between microservices and monolithic architectures"
          }
      ],
      OutputConfig = new OutputConfig
      {
          Effort = Effort.Medium
      }
  };

  var message = await client.Messages.Create(parameters);
  Console.WriteLine(message);
  ```

  ```go Go
  client := anthropic.NewClient()

  response, err := client.Messages.New(context.TODO(), anthropic.MessageNewParams{
  	Model:     anthropic.ModelClaudeOpus5_5,
  	MaxTokens: 4096,
  	Messages: []anthropic.MessageParam{
  		anthropic.NewUserMessage(anthropic.NewTextBlock("Analyze the trade-offs between microservices and monolithic architectures")),
  	},
  	OutputConfig: anthropic.OutputConfigParam{
  		Effort: anthropic.OutputConfigEffortMedium,
  	},
  })
  if err != nil {
  	log.Fatal(err)
  }
  for _, block := range response.Content {
  	if textBlock, ok := block.AsAny().(anthropic.TextBlock); ok {
  		fmt.Println(textBlock.Text)
  	}
  }
  ```

  ```java Java
  import com.anthropic.models.messages.OutputConfig;

  void main() {
      AnthropicClient client = AnthropicOkHttpClient.fromEnv();

      MessageCreateParams params = MessageCreateParams.builder()
          .model(Model.CLAUDE_OPUS_5_5)
          .maxTokens(4096L)
          .addUserMessage("Analyze the trade-offs between microservices and monolithic architectures")
          .outputConfig(OutputConfig.builder()
              .effort(OutputConfig.Effort.MEDIUM)
              .build())
          .build();

      Message response = client.messages().create(params);
      response.content().stream()
          .flatMap(block -> block.text().stream())
          .forEach(textBlock -> IO.println(textBlock.text()));
  }
  ```

  ```php PHP
  $client = new Client();

  $message = $client->messages->create(
      maxTokens: 4096,
      messages: [
          ['role' => 'user', 'content' => 'Analyze the trade-offs between microservices and monolithic architectures']
      ],
      model: 'claude-opus-5-5',
      outputConfig: ['effort' => 'medium'],
  );

  foreach ($message->content as $block) {
      if ($block->type === 'text') {
          echo $block->text, PHP_EOL;
      }
  }
  ```

  ```ruby Ruby
  client = Anthropic::Client.new

  message = client.messages.create(
    model: "claude-opus-5-5",
    max_tokens: 4096,
    messages: [
      { role: "user", content: "Analyze the trade-offs between microservices and monolithic architectures" }
    ],
    output_config: {
      effort: "medium"
    }
  )

  message.content.each do |block|
    puts block.text if block.type == :text
  end
  ```
</CodeGroup>

## Handle thinking in every response

Thinking runs on every Claude Opus 5.5 request, so every response can begin with `thinking` blocks, and `max_tokens` covers thinking plus text. If your code already runs with thinking on, items 1 to 3 are likely in place: check items 4 and 5. If it ran without thinking, on any earlier model, each item is a change.

1. **`max_tokens` covers thinking plus text:** On Claude Opus 4.8 and earlier Opus models, requests without a `thinking` field run without thinking. Claude Opus 5 and Claude Sonnet 5 accept `thinking: {"type": "disabled"}`. On Claude Opus 5.5, every request runs with [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking). `max_tokens` remains a hard limit on total output, thinking plus response text, so revisit it for workloads that ran without thinking. Thinking tokens are billed as output tokens even when the thinking text is not returned to you, so such a workload can produce more output tokens per request. See [Cost control](https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost#cost-control). To spend fewer tokens on thinking, lower the [effort](https://platform.claude.com/docs/en/build-with-claude/effort) level. If you run at `xhigh` or `max` effort, set a large `max_tokens` so the model has room to think and act; start at 64k tokens and tune from there. If your prompts were tuned for running without thinking, see [Prompts written for thinking disabled](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#prompts-written-for-thinking-disabled).

2. **Responses begin with thinking blocks:** A response can begin with one or more `thinking` blocks before the first `text` block. Code that reads the reply by position, such as `content[0].text` or a stream handler that treats the first `content_block_start` event as text, breaks on these responses. Select content blocks by their `type` field instead: read `text` from the blocks whose `type` is `"text"`, and branch on the block type when handling stream events.

3. **Return thinking blocks unmodified in tool-use loops:** If you run a tool-use loop, pass the `thinking` blocks from each assistant response back to the API complete and unmodified when you return tool results, including blocks whose `thinking` field is empty. Echo the assistant message as received rather than filtering its content blocks by type or rebuilding it: the API rejects edited, reordered, or partially dropped thinking blocks with a 400 error. See [Preserving thinking blocks](https://platform.claude.com/docs/en/build-with-claude/thinking#preserving-thinking-blocks).

4. **Thinking text is omitted by default:** `thinking.display` defaults to `"omitted"`, so `thinking` blocks arrive with an empty `thinking` field alongside their `signature`. Treat the `thinking` field as display text only. To receive readable summaries instead, set `thinking.display` to `"summarized"`:

   <CodeGroup exclude="shell">
     ```python Python
     thinking = {
         "type": "adaptive",
         "display": "summarized",
     }
     ```

     ```typescript TypeScript
     const thinking = {
       type: "adaptive",
       display: "summarized"
     };
     ```

     ```csharp C#
     var thinking = new ThinkingConfigAdaptive { Display = Display.Summarized };
     ```

     ```go Go
     thinking := anthropic.ThinkingConfigParamUnion{
     	OfAdaptive: &anthropic.ThinkingConfigAdaptiveParam{
     		Display: anthropic.ThinkingConfigAdaptiveDisplaySummarized,
     	},
     }
     ```

     ```java Java
     ThinkingConfigAdaptive thinking = ThinkingConfigAdaptive.builder()
         .display(ThinkingConfigAdaptive.Display.SUMMARIZED)
         .build();
     ```

     ```php PHP
     $thinking = ['type' => 'adaptive', 'display' => 'summarized'];
     ```

     ```ruby Ruby
     thinking = {
       type: "adaptive",
       display: "summarized"
     }
     ```
   </CodeGroup>

   If your product streams reasoning to users, the default appears as a long pause before output begins; set `display: "summarized"` to restore visible progress during thinking. See [Controlling thinking display](https://platform.claude.com/docs/en/build-with-claude/thinking#controlling-thinking-display).

5. **Text between tool calls arrives in thinking blocks:** The short notes the model writes between tool calls come back as `thinking` blocks, which are empty at the default display. See [Text between tool calls is returned in thinking blocks](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#text-between-tool-calls).

## Migration checklist by starting model

Work down the groups and stop after the one that names your current model: every item up to that point applies to you. If you are on Claude Opus 5, the first group is the whole list. If you are on Claude Sonnet 5, apply the first group and the last.

### Every starting model

* Update the model ID to `claude-opus-5-5`.
* Remove `thinking: {"type": "disabled"}` and `thinking: {"type": "enabled", ...}`; choose an effort level instead.
* Set `effort` explicitly: the default is `medium`, where Claude Opus 5's is `high`.
* Replace `tool_choice` types `any` and `tool` with `auto` plus strict tool use or structured outputs.
* If you use computer use on the Claude API or Google Cloud, declare `computer_toolset_20260801` (no beta header) instead of `computer_20251124` and update your agent loop for the toolset. On Amazon Bedrock, keep `computer_20251124`; check the computer use tool's [Compatibility](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool#compatibility) section for other platforms.
* If a router or fallback can move a conversation from Claude Opus 5.5 to another model, expect that model to run without Claude Opus 5.5's thinking blocks (Claude Fable 5.1 and Claude Mythos 5.1 on the Claude API are the exception and keep them). Claude Opus 5.5 itself reads thinking from Claude Opus 5 and earlier Opus, Sonnet, and Haiku models, but not from Claude Fable or Claude Mythos models.
* Read content blocks by `type`, and pass `thinking` blocks back unmodified in tool-use loops.
* If your interface renders text between tool calls, set `display: "updates"` (beta) or `"summarized"` and render the non-empty `thinking` blocks.
* If your code edits earlier turns, the `system` prompt, or `tools` mid-conversation, follow [Preserved thinking](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking).
* Handle `stop_reason: "refusal"` and configure fallback.
* Re-baseline cost and latency at your chosen effort level.
* If your code disabled thinking, revisit `max_tokens`, which covers thinking plus response text; at `xhigh` or `max` effort, start at 64k. See [Handle thinking in every response](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#thinking-in-every-response).

### Claude Opus 4.8 or earlier

* Review workloads that ran without a `thinking` field: on Claude Opus 5.5 they run with thinking, and thinking can't be disabled. Revisit `max_tokens`, which remains a hard limit on total output (thinking plus response text), and lower `effort` where you want less thinking. Thinking tokens are billed as output tokens, so these workloads can produce more output tokens per request.
* Verify any code that parses the `thinking` field treats it as display text only. Set `display: "summarized"` to receive readable summaries.
* Review prompts near the caching minimum: prompts of 512 tokens or more can create cache entries.
* If your organization has a [Priority Tier](https://platform.claude.com/docs/en/api/service-tiers#supported-models) commitment, plan capacity separately: Priority Tier is not supported on Claude Opus 5.5.
* If you run at `xhigh` or `max` effort, raise `max_tokens` to at least 64k as a starting point.
* For agentic workloads, consider [task budgets](https://platform.claude.com/docs/en/build-with-claude/task-budgets) (beta) and mid-conversation tool changes (beta).

### Claude Opus 4.7 or earlier

* Run a fresh [effort](https://platform.claude.com/docs/en/build-with-claude/effort) sweep on your own evals rather than carrying over a setting tuned for an earlier model.
* Remove any context-window beta header.
* If you rebuild conversation history to update instructions, consider switching to a mid-conversation system message to preserve prompt cache hits.
* Verify your stop-reason handling reads `stop_details` on refusals.
* If you want fast mode, which Claude Opus 4.7 rejects, set `speed: "fast"` with the `fast-mode-2026-02-01` beta header on the Claude API.

### Claude Opus 4.6 or earlier

* Remove `temperature`, `top_p`, and `top_k` from request payloads.
* Replace `thinking: {"type": "enabled", "budget_tokens": N}` with `thinking: {"type": "adaptive"}` plus the [effort parameter](https://platform.claude.com/docs/en/build-with-claude/effort), or remove the `thinking` field entirely; adaptive thinking is always on.
* If your UI displays thinking content, explicitly opt in to thinking summarization.
* Re-benchmark end-to-end cost and latency under the updated tokenization.
* Re-tune `max_tokens` to account for the updated tokenization, including compaction triggers.
* Re-test any client-side token-count estimations.
* If your application sends images, re-budget for [high-resolution image support](https://platform.claude.com/docs/en/build-with-claude/vision#high-resolution-image-support-on-claude-opus-4-7) (up to approximately 3x more image tokens per full-resolution image). Downsample before sending if you do not need the additional fidelity.
* If you consume pointing or bounding-box coordinates from the model, remove any scale-factor conversion; coordinates are 1:1 with actual image pixels on Claude Opus 4.7 and later models.
* Review the [behavior changes](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#behavior-changes) that began in Claude Opus 4.7.
* If your product does legitimate security work, apply to the [Cyber Verification Program](https://support.claude.com/en/articles/14604842-real-time-cyber-safeguards-on-claude-opus-and-sonnet) for access to lower restrictions on cyber content.

### Claude Opus 4.5 or earlier

* Remove any assistant-message prefills; Claude Opus 4.6 already rejects them.
* Verify tool call JSON parsing uses a standard JSON parser.
* Move from `client.beta.messages.create` to `client.messages.create`: adaptive thinking and effort need no beta namespace.
* Remove the `effort-2025-11-24` beta header (the effort parameter does not require it).
* Remove the `fine-grained-tool-streaming-2025-05-14` beta header.
* Remove the `interleaved-thinking-2025-05-14` beta header (adaptive thinking enables interleaved thinking automatically).
* Migrate `output_format` to `output_config.format` (if applicable).

### Claude 4.1 or earlier

* Update tool versions (`text_editor_20250728`, `code_execution_20260521`).
* Handle the `refusal` stop reason.
* Handle the `model_context_window_exceeded` stop reason.
* Verify tool string parameter handling for trailing newlines.
* Remove legacy beta headers (`token-efficient-tools-2025-02-19`, `output-128k-2025-02-19`).
* Review and update prompts following [prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).

### Claude Sonnet 5 only

* If you rebuild conversation history to update instructions, consider switching to a mid-conversation system message to preserve prompt cache hits.
* Review prompts near the caching minimum: prompts of 512 tokens or more can create cache entries.

## Migrating to Claude Opus 5.5 from Claude Opus 5

First work through [What every request to Claude Opus 5.5 must satisfy](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#request-requirements) and [Handle thinking in every response](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#thinking-in-every-response). Every starting model needs the changes in this section. They are the request settings that Claude Opus 5.5 rejects and the response changes that come with it. The checklist for this section is the first group of the [migration checklist](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migration-checklist).

### Update your model name

```python
model = "claude-opus-5"  # Before
model = "claude-opus-5-5"  # After
```

`claude-opus-5-5` is a fixed model ID with no date suffix, the same scheme as `claude-opus-5`. On Amazon Bedrock, Claude Platform on AWS, Google Cloud, and Microsoft Foundry, use that platform's model ID; see [Availability](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5#availability).

### Breaking changes

Each change is explained in [What's new in Claude Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5#breaking-changes); this section gives the code change for each.

#### Thinking can't be disabled

`thinking: {"type": "disabled"}` and `thinking: {"type": "enabled", "budget_tokens": N}` both return a 400 error (`"thinking.type.disabled" is not supported for this model.` or `"thinking.type.enabled" is not supported for this model.`). Remove the `thinking` field and pick an [effort](https://platform.claude.com/docs/en/build-with-claude/effort) level; where you disabled thinking to save tokens, use a lower one. Responses then begin with `thinking` blocks, so select content blocks by `type` and pass `thinking` blocks back unmodified with tool results. See [Thinking can't be disabled](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5#thinking-cant-be-disabled).

Before. Claude Opus 5 accepts this request, and Claude Opus 5.5 rejects it with a 400 error:

<CodeGroup>
  ```bash cURL
  curl https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d '{
      "model": "claude-opus-5",
      "max_tokens": 16000,
      "thinking": {"type": "disabled"},
      "messages": [{"role": "user", "content": "..."}]
    }'
  ```

  ```bash CLI
  ant messages create \
    --model claude-opus-5 \
    --max-tokens 16000 \
    --thinking '{type: disabled}' \
    --message '{role: user, content: "..."}'
  ```

  ```python Python
  client.messages.create(
      model="claude-opus-5",
      max_tokens=16000,
      thinking={"type": "disabled"},
      messages=[{"role": "user", "content": "..."}],
  )
  ```

  ```typescript TypeScript
  await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content: "..." }]
  });
  ```

  ```csharp C#
  await client.Messages.Create(new MessageCreateParams
  {
      Model = Model.ClaudeOpus5,
      MaxTokens = 16000,
      Thinking = new ThinkingConfigDisabled(),
      Messages = [new() { Role = Role.User, Content = "..." }],
  });
  ```

  ```go Go
  client.Messages.New(context.TODO(), anthropic.MessageNewParams{
  	Model:     anthropic.ModelClaudeOpus5,
  	MaxTokens: 16000,
  	Thinking: anthropic.ThinkingConfigParamUnion{
  		OfDisabled: &anthropic.ThinkingConfigDisabledParam{},
  	},
  	Messages: []anthropic.MessageParam{
  		anthropic.NewUserMessage(anthropic.NewTextBlock("...")),
  	},
  })
  ```

  ```java Java
  MessageCreateParams params = MessageCreateParams.builder()
      .model(Model.CLAUDE_OPUS_5)
      .maxTokens(16000L)
      .thinking(ThinkingConfigDisabled.builder().build())
      .addUserMessage("...")
      .build();

  client.messages().create(params);
  ```

  ```php PHP
  $client->messages->create(
      model: Model::CLAUDE_OPUS_5,
      maxTokens: 16000,
      thinking: ThinkingConfigDisabled::with(),
      messages: [['role' => 'user', 'content' => '...']],
  );
  ```

  ```ruby Ruby
  client.messages.create(
    model: Anthropic::Model::CLAUDE_OPUS_5,
    max_tokens: 16000,
    thinking: Anthropic::ThinkingConfigDisabled.new,
    messages: [{ role: "user", content: "..." }]
  )
  ```
</CodeGroup>

After:

<CodeGroup>
  ```bash cURL
  # thinking is always on; effort is the control
  curl https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d '{
      "model": "claude-opus-5-5",
      "max_tokens": 16000,
      "output_config": {"effort": "low"},
      "messages": [{"role": "user", "content": "..."}]
    }'
  ```

  ```bash CLI
  # thinking is always on; effort is the control
  ant messages create \
    --model claude-opus-5-5 \
    --max-tokens 16000 \
    --output-config '{effort: low}' \
    --message '{role: user, content: "..."}'
  ```

  ```python Python
  client.messages.create(
      model="claude-opus-5-5",
      max_tokens=16000,
      output_config={"effort": "low"},  # thinking is always on; effort is the control
      messages=[{"role": "user", "content": "..."}],
  )
  ```

  ```typescript TypeScript
  await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low" }, // thinking is always on; effort is the control
    messages: [{ role: "user", content: "..." }]
  });
  ```

  ```csharp C#
  await client.Messages.Create(new MessageCreateParams
  {
      Model = Model.ClaudeOpus5_5,
      MaxTokens = 16000,
      OutputConfig = new() { Effort = Effort.Low }, // thinking is always on; effort is the control
      Messages = [new() { Role = Role.User, Content = "..." }],
  });
  ```

  ```go Go
  client.Messages.New(context.TODO(), anthropic.MessageNewParams{
  	Model:     anthropic.ModelClaudeOpus5_5,
  	MaxTokens: 16000,
  	OutputConfig: anthropic.OutputConfigParam{
  		Effort: anthropic.OutputConfigEffortLow, // thinking is always on; effort is the control
  	},
  	Messages: []anthropic.MessageParam{
  		anthropic.NewUserMessage(anthropic.NewTextBlock("...")),
  	},
  })
  ```

  ```java Java
  MessageCreateParams params = MessageCreateParams.builder()
      .model(Model.CLAUDE_OPUS_5_5)
      .maxTokens(16000L)
      // thinking is always on; effort is the control
      .outputConfig(OutputConfig.builder()
          .effort(OutputConfig.Effort.LOW)
          .build())
      .addUserMessage("...")
      .build();

  client.messages().create(params);
  ```

  ```php PHP
  $client->messages->create(
      model: Model::CLAUDE_OPUS_5_5,
      maxTokens: 16000,
      // thinking is always on; effort is the control
      outputConfig: OutputConfig::with(effort: Effort::LOW),
      messages: [['role' => 'user', 'content' => '...']],
  );
  ```

  ```ruby Ruby
  client.messages.create(
    model: Anthropic::Model::CLAUDE_OPUS_5_5,
    max_tokens: 16000,
    # thinking is always on; effort is the control
    output_config: { effort: Anthropic::OutputConfig::Effort::LOW },
    messages: [{ role: "user", content: "..." }]
  )
  ```
</CodeGroup>

#### Forced tool use is not supported

`tool_choice` types `any` and `tool` return a 400 error (`tool_choice: type "tool" and "any" are not supported for this model.`), including on the token counting endpoint. Use `auto` with [strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use) or [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), and say in the prompt when the tool applies. Strict tool use accepts a subset of JSON Schema, so check each tool's `input_schema` before you add `strict: true`. Every object in the schema must set `additionalProperties: false`; see [JSON Schema limitations](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#json-schema-limitations). See [Forced tool use is not supported](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5#forced-tool-use-is-not-supported).

Before. Claude Opus 5 accepts this request, and Claude Opus 5.5 rejects it with a 400 error:

<CodeGroup>
  ```bash cURL
  curl https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d '{
      "model": "claude-opus-5",
      "max_tokens": 1024,
      "tools": [{
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "input_schema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "The city and state, e.g. San Francisco, CA"
            }
          },
          "required": ["location"],
          "additionalProperties": false
        }
      }],
      "tool_choice": {"type": "tool", "name": "get_weather"},
      "messages": [{"role": "user", "content": "What'\''s the weather in Paris?"}]
    }'
  ```

  ```bash CLI
  ant messages create <<'YAML'
  model: claude-opus-5
  max_tokens: 1024
  tools:
    - name: get_weather
      description: Get the current weather in a given location
      input_schema:
        type: object
        properties:
          location:
            type: string
            description: The city and state, e.g. San Francisco, CA
        required: [location]
        additionalProperties: false
  tool_choice:
    type: tool
    name: get_weather
  messages:
    - role: user
      content: What's the weather in Paris?
  YAML
  ```

  ```python Python
  client.messages.create(
      model="claude-opus-5",
      max_tokens=1024,
      tools=tools,
      tool_choice={"type": "tool", "name": "get_weather"},
      messages=[{"role": "user", "content": "What's the weather in Paris?"}],
  )
  ```

  ```typescript TypeScript
  await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    tools,
    tool_choice: { type: "tool", name: "get_weather" },
    messages: [{ role: "user", content: "What's the weather in Paris?" }]
  });
  ```

  ```csharp C#
  await client.Messages.Create(new MessageCreateParams
  {
      Model = Model.ClaudeOpus5,
      MaxTokens = 1024,
      Tools = [.. tools],
      ToolChoice = new ToolChoiceTool { Name = "get_weather" },
      Messages = [new() { Role = Role.User, Content = "What's the weather in Paris?" }],
  });
  ```

  ```go Go
  client.Messages.New(context.TODO(), anthropic.MessageNewParams{
  	Model:      anthropic.ModelClaudeOpus5,
  	MaxTokens:  1024,
  	Tools:      tools,
  	ToolChoice: anthropic.ToolChoiceParamOfTool("get_weather"),
  	Messages: []anthropic.MessageParam{
  		anthropic.NewUserMessage(anthropic.NewTextBlock("What's the weather in Paris?")),
  	},
  })
  ```

  ```java Java
  MessageCreateParams params = MessageCreateParams.builder()
      .model(Model.CLAUDE_OPUS_5)
      .maxTokens(1024L)
      .tools(tools)
      .toolChoice(ToolChoiceTool.of("get_weather"))
      .addUserMessage("What's the weather in Paris?")
      .build();

  client.messages().create(params);
  ```

  ```php PHP
  $client->messages->create(
      model: Model::CLAUDE_OPUS_5,
      maxTokens: 1024,
      tools: $tools,
      toolChoice: ToolChoiceTool::with(name: 'get_weather'),
      messages: [['role' => 'user', 'content' => "What's the weather in Paris?"]],
  );
  ```

  ```ruby Ruby
  client.messages.create(
    model: Anthropic::Model::CLAUDE_OPUS_5,
    max_tokens: 1024,
    tools: tools,
    tool_choice: Anthropic::ToolChoiceTool.new(name: "get_weather"),
    messages: [{ role: "user", content: "What's the weather in Paris?" }]
  )
  ```
</CodeGroup>

After:

<CodeGroup>
  ```bash cURL
  # strict tool use: every call matches the tool's input_schema
  curl https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d '{
      "model": "claude-opus-5-5",
      "max_tokens": 1024,
      "tools": [{
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "input_schema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "The city and state, e.g. San Francisco, CA"
            }
          },
          "required": ["location"],
          "additionalProperties": false
        },
        "strict": true
      }],
      "tool_choice": {"type": "auto"},
      "messages": [{
        "role": "user",
        "content": "What'\''s the weather in Paris? Use the get_weather tool."
      }]
    }'
  ```

  ```bash CLI
  ant messages create <<'YAML'
  model: claude-opus-5-5
  max_tokens: 1024
  tools:
    - name: get_weather
      description: Get the current weather in a given location
      input_schema:
        type: object
        properties:
          location:
            type: string
            description: The city and state, e.g. San Francisco, CA
        required: [location]
        additionalProperties: false
      # strict tool use: every call matches the tool's input_schema
      strict: true
  tool_choice:
    type: auto
  messages:
    - role: user
      content: What's the weather in Paris? Use the get_weather tool.
  YAML
  ```

  ```python Python
  client.messages.create(
      model="claude-opus-5-5",
      max_tokens=1024,
      # strict tool use: every call matches the tool's input_schema
      tools=[{**tool, "strict": True} for tool in tools],
      tool_choice={"type": "auto"},
      messages=[
          {
              "role": "user",
              "content": "What's the weather in Paris? Use the get_weather tool.",
          }
      ],
  )
  ```

  ```typescript TypeScript
  await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 1024,
    // strict tool use: every call matches the tool's input_schema
    tools: tools.map((tool) => ({ ...tool, strict: true })),
    tool_choice: { type: "auto" },
    messages: [
      {
        role: "user",
        content: "What's the weather in Paris? Use the get_weather tool."
      }
    ]
  });
  ```

  ```csharp C#
  await client.Messages.Create(new MessageCreateParams
  {
      Model = Model.ClaudeOpus5_5,
      MaxTokens = 1024,
      // strict tool use: every call matches the tool's input_schema
      Tools = [.. tools.Select(tool => tool with { Strict = true })],
      ToolChoice = new ToolChoiceAuto(),
      Messages =
      [
          new()
          {
              Role = Role.User,
              Content = "What's the weather in Paris? Use the get_weather tool.",
          },
      ],
  });
  ```

  ```go Go
  // strict tool use: every call matches the tool's input_schema
  var strictTools []anthropic.ToolUnionParam
  for _, tool := range tools {
  	strictTool := *tool.OfTool
  	strictTool.Strict = anthropic.Bool(true)
  	strictTools = append(strictTools, anthropic.ToolUnionParam{OfTool: &strictTool})
  }
  client.Messages.New(context.TODO(), anthropic.MessageNewParams{
  	Model:      anthropic.ModelClaudeOpus5_5,
  	MaxTokens:  1024,
  	Tools:      strictTools,
  	ToolChoice: anthropic.ToolChoiceUnionParam{OfAuto: &anthropic.ToolChoiceAutoParam{}},
  	Messages: []anthropic.MessageParam{
  		anthropic.NewUserMessage(
  			anthropic.NewTextBlock("What's the weather in Paris? Use the get_weather tool."),
  		),
  	},
  })
  ```

  ```java Java
  MessageCreateParams params = MessageCreateParams.builder()
      .model(Model.CLAUDE_OPUS_5_5)
      .maxTokens(1024L)
      // strict tool use: every call matches the tool's input_schema
      .tools(tools.stream()
          .map(tool -> tool.tool()
              .map(customTool -> customTool.toBuilder().strict(true).build())
              .map(ToolUnion::ofTool)
              .orElse(tool))
          .toList())
      .toolChoice(ToolChoiceAuto.builder().build())
      .addUserMessage("What's the weather in Paris? Use the get_weather tool.")
      .build();

  client.messages().create(params);
  ```

  ```php PHP
  $client->messages->create(
      model: Model::CLAUDE_OPUS_5_5,
      maxTokens: 1024,
      // strict tool use: every call matches the tool's input_schema
      tools: array_map(fn (Tool $tool) => $tool->withStrict(true), $tools),
      toolChoice: ToolChoiceAuto::with(),
      messages: [
          [
              'role' => 'user',
              'content' => "What's the weather in Paris? Use the get_weather tool.",
          ],
      ],
  );
  ```

  ```ruby Ruby
  client.messages.create(
    model: Anthropic::Model::CLAUDE_OPUS_5_5,
    max_tokens: 1024,
    # strict tool use: every call matches the tool's input_schema
    tools: tools.map { |tool| tool.merge(strict: true) },
    tool_choice: Anthropic::ToolChoiceAuto.new,
    messages: [
      { role: "user", content: "What's the weather in Paris? Use the get_weather tool." }
    ]
  )
  ```
</CodeGroup>

#### Thinking blocks are tied to the model and the conversation

On the Claude API, Claude Fable 5.1 and Claude Mythos 5.1 read Claude Opus 5.5 thinking blocks; no other model does. A router or fallback that moves a conversation from Claude Opus 5.5 to any other model runs those turns without them. In the other direction, Claude Opus 5.5 reads thinking blocks from Claude Opus 5 and earlier Opus, Sonnet, and Haiku models, but not from Claude Fable or Claude Mythos models. Keep the conversation append-only (no edits to the `system` prompt, `tools`, or earlier messages mid-conversation) so the blocks stay valid; Claude Code, claude.ai, Claude Managed Agents, and the Claude Agent SDK already do. Enforcement matches Claude Fable 5.1 on every platform: for accounts created on or after August 31, 2026, 00:00 UTC, replaying a thinking block after such an edit returns a 400 error by default. There is no code change for append-only integrations. See [Thinking blocks are tied to the model and the conversation](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5#thinking-blocks-are-tied-to-the-model-that-produced-them) and [Preserved thinking](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking).

#### The `computer_20251124` computer use tool is not supported on the Claude API and Google Cloud

On the Claude API and Google Cloud, a `tools` entry of type `computer_20251124` returns a 400 error (`'claude-opus-5-5' does not support tool types: computer_20251124.`, followed by the tool types the model accepts). Declare the `computer_toolset_20260801` toolset instead: drop the beta header and send the entry with no `name` or display dimensions. In your agent loop, handle member `tool_use` blocks (the action is the block's `name`, not `input.action`), several of them per turn, and echo `toolset_name` on every result. The request change is shown below; the agent-loop changes are listed in [Migrate from `computer_20251124`](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool#migrate-from-computer-20251124). On Amazon Bedrock, the earlier `computer_20251124` tool continues to work on Claude Opus 5.5 as it does on Claude Opus 5, so no change is needed there; for other platforms, see the computer use tool's [Compatibility](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool#compatibility) section. See [The `computer_20251124` computer use tool is not supported on the Claude API and Google Cloud](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5#computer-20251124-is-not-supported).

Before. Claude Opus 5 accepts this request, and on the Claude API and Google Cloud, Claude Opus 5.5 rejects it with a 400 error:

<CodeGroup>
  ```bash cURL
  curl https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "anthropic-beta: computer-use-2025-11-24" \
    -H "content-type: application/json" \
    -d '{
      "model": "claude-opus-5",
      "max_tokens": 4096,
      "tools": [{
        "type": "computer_20251124",
        "name": "computer",
        "display_width_px": 1024,
        "display_height_px": 768
      }],
      "messages": [{"role": "user", "content": "Open the display settings."}]
    }'
  ```

  ```bash CLI
  ant beta:messages create \
    --model claude-opus-5 \
    --max-tokens 4096 \
    --beta computer-use-2025-11-24 \
    --tool '{
      type: computer_20251124,
      name: computer,
      display_width_px: 1024,
      display_height_px: 768
    }' \
    --message '{role: user, content: "Open the display settings."}'
  ```

  ```python Python
  client.beta.messages.create(
      model="claude-opus-5",
      max_tokens=4096,
      betas=["computer-use-2025-11-24"],
      tools=[
          {
              "type": "computer_20251124",
              "name": "computer",
              "display_width_px": 1024,
              "display_height_px": 768,
          }
      ],
      messages=[{"role": "user", "content": "Open the display settings."}],
  )
  ```

  ```typescript TypeScript
  await client.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    betas: ["computer-use-2025-11-24"],
    tools: [
      {
        type: "computer_20251124",
        name: "computer",
        display_width_px: 1024,
        display_height_px: 768
      }
    ],
    messages: [{ role: "user", content: "Open the display settings." }]
  });
  ```

  ```csharp C#
  await client.Beta.Messages.Create(new MessageCreateParams
  {
      Model = Model.ClaudeOpus5,
      MaxTokens = 4096,
      Betas = [AnthropicBeta.ComputerUse2025_11_24],
      Tools =
      [
          new BetaToolComputerUse20251124
          {
              DisplayWidthPx = 1024,
              DisplayHeightPx = 768,
          },
      ],
      Messages = [new() { Role = Role.User, Content = "Open the display settings." }],
  });
  ```

  ```go Go
  client.Beta.Messages.New(context.TODO(), anthropic.BetaMessageNewParams{
  	Model:     anthropic.ModelClaudeOpus5,
  	MaxTokens: 4096,
  	Betas:     []anthropic.AnthropicBeta{anthropic.AnthropicBetaComputerUse2025_11_24},
  	Tools: []anthropic.BetaToolUnionParam{
  		{OfComputerUseTool20251124: &anthropic.BetaToolComputerUse20251124Param{
  			DisplayWidthPx:  1024,
  			DisplayHeightPx: 768,
  		}},
  	},
  	Messages: []anthropic.BetaMessageParam{
  		anthropic.NewBetaUserMessage(anthropic.NewBetaTextBlock("Open the display settings.")),
  	},
  })
  ```

  ```java Java
  MessageCreateParams params = MessageCreateParams.builder()
      .model(Model.CLAUDE_OPUS_5)
      .maxTokens(4096L)
      .addBeta(AnthropicBeta.COMPUTER_USE_2025_11_24)
      .addTool(BetaToolComputerUse20251124.builder()
          .displayWidthPx(1024L)
          .displayHeightPx(768L)
          .build())
      .addUserMessage("Open the display settings.")
      .build();

  client.beta().messages().create(params);
  ```

  ```php PHP
  $client->beta->messages->create(
      model: Model::CLAUDE_OPUS_5,
      maxTokens: 4096,
      betas: [AnthropicBeta::COMPUTER_USE_2025_11_24],
      tools: [
          BetaToolComputerUse20251124::with(
              displayWidthPx: 1024,
              displayHeightPx: 768,
          ),
      ],
      messages: [['role' => 'user', 'content' => 'Open the display settings.']],
  );
  ```

  ```ruby Ruby
  client.beta.messages.create(
    model: Anthropic::Model::CLAUDE_OPUS_5,
    max_tokens: 4096,
    betas: [Anthropic::AnthropicBeta::COMPUTER_USE_2025_11_24],
    tools: [
      Anthropic::Beta::BetaToolComputerUse20251124.new(
        name: :computer,
        display_width_px: 1024,
        display_height_px: 768
      )
    ],
    messages: [{ role: "user", content: "Open the display settings." }]
  )
  ```
</CodeGroup>

After:

<CodeGroup>
  ```bash cURL
  # no beta header; the toolset entry takes no name or display size
  curl https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d '{
      "model": "claude-opus-5-5",
      "max_tokens": 4096,
      "tools": [{"type": "computer_toolset_20260801"}],
      "messages": [{"role": "user", "content": "Open the display settings."}]
    }'
  ```

  ```bash CLI
  # no beta header; the toolset entry takes no name or display size
  ant messages create \
    --model claude-opus-5-5 \
    --max-tokens 4096 \
    --tool '{type: computer_toolset_20260801}' \
    --message '{role: user, content: "Open the display settings."}'
  ```

  ```python Python
  client.messages.create(
      model="claude-opus-5-5",
      max_tokens=4096,
      # no beta header; the toolset entry takes no name or display size
      tools=[{"type": "computer_toolset_20260801"}],
      messages=[{"role": "user", "content": "Open the display settings."}],
  )
  ```

  ```typescript TypeScript
  await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4096,
    // no beta header; the toolset entry takes no name or display size
    tools: [{ type: "computer_toolset_20260801" }],
    messages: [{ role: "user", content: "Open the display settings." }]
  });
  ```

  ```csharp C#
  await client.Messages.Create(new MessageCreateParams
  {
      Model = Model.ClaudeOpus5_5,
      MaxTokens = 4096,
      // no beta header; the toolset entry takes no name or display size
      Tools = [new ComputerToolset20260801()],
      Messages = [new() { Role = Role.User, Content = "Open the display settings." }],
  });
  ```

  ```go Go
  client.Messages.New(context.TODO(), anthropic.MessageNewParams{
  	Model:     anthropic.ModelClaudeOpus5_5,
  	MaxTokens: 4096,
  	// no beta header; the toolset entry takes no name or display size
  	Tools: []anthropic.ToolUnionParam{
  		{OfComputerToolset20260801: &anthropic.ComputerToolset20260801Param{}},
  	},
  	Messages: []anthropic.MessageParam{
  		anthropic.NewUserMessage(anthropic.NewTextBlock("Open the display settings.")),
  	},
  })
  ```

  ```java Java
  MessageCreateParams params = MessageCreateParams.builder()
      .model(Model.CLAUDE_OPUS_5_5)
      .maxTokens(4096L)
      // no beta header; the toolset entry takes no name or display size
      .addTool(ComputerToolset20260801.builder().build())
      .addUserMessage("Open the display settings.")
      .build();

  client.messages().create(params);
  ```

  ```php PHP
  $client->messages->create(
      model: Model::CLAUDE_OPUS_5_5,
      maxTokens: 4096,
      // no beta header; the toolset entry takes no name or display size
      tools: [ComputerToolset20260801::with()],
      messages: [['role' => 'user', 'content' => 'Open the display settings.']],
  );
  ```

  ```ruby Ruby
  client.messages.create(
    model: Anthropic::Model::CLAUDE_OPUS_5_5,
    max_tokens: 4096,
    # no beta header; the toolset entry takes no name or display size
    tools: [Anthropic::ComputerToolset20260801.new],
    messages: [{ role: "user", content: "Open the display settings." }]
  )
  ```
</CodeGroup>

### Text between tool calls is returned in thinking blocks

On Claude Opus 5, text the model writes between tool calls comes back as `text` blocks. On Claude Opus 5.5, as on Claude Fable 5.1, that narration comes back as [progress-update `thinking` blocks](https://platform.claude.com/docs/en/build-with-claude/thinking#progress-updates), at most one before each tool call. At the default `thinking.display` of `"omitted"`, their `thinking` field is empty. No request fails, but an application that streams that text to its users as progress updates goes quiet between tool calls. To restore the updates, read them from `thinking` blocks and set a `display` value that returns their text: `"updates"` (beta, `thinking-display-updates-2026-08-18` header) returns the progress updates while reasoning stays hidden, and `"summarized"` returns both, mixed together. Then render each non-empty `thinking` block ahead of the `tool_use` block it precedes, and pass the blocks back unchanged with the rest of the assistant turn. See [User-facing progress updates](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#user-facing-progress-updates).

### Safety classifiers and fallback

Claude Opus 5.5 can return `stop_reason: "refusal"` with a `stop_details` category. Its classifiers cover a broader set of categories than Claude Opus 5's, so expect `stop_details.category` values such as `"bio"` and `"reasoning_extraction"` in addition to `"cyber"`; see the [refusal category table](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback#refusal-response). Handle refusals and configure [server-side fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback#server-side-fallback) or your own retry (server-side fallback doesn't retry requests declined with `"reasoning_extraction"`; that refusal is returned to you); see [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback) and [Safeguard refusals](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#safeguard-refusals).

### Recommended changes

1. **Re-run your effort sweep.** Effort is the only thinking control on Claude Opus 5.5, and its default is `medium` where Claude Opus 5's is `high`, so a request that omits `effort` now runs at `medium`. Step down where quality holds, and step up for the most demanding work. See [Effort](https://platform.claude.com/docs/en/build-with-claude/effort).
2. **Re-evaluate model-specific prompt instructions.** Instructions tuned for Claude Opus 5's behavior may no longer be needed; see [Prompting Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5). If you ran with thinking disabled, also see [Prompts written for thinking disabled](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#prompts-written-for-thinking-disabled).
3. **Test in a development environment** before switching production traffic.

## Migrating to Claude Opus 5.5 from Claude Opus 4.8

First work through [What every request to Claude Opus 5.5 must satisfy](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#request-requirements), [Handle thinking in every response](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#thinking-in-every-response), and [Migrating to Claude Opus 5.5 from Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-5). Use `claude-opus-4-8` as the model ID you replace. That last section applies to code on Claude Opus 4.8 as written, because Claude Opus 4.8, like Claude Opus 5:

* Accepts `thinking: {"type": "disabled"}`, forced tool choice, and the `computer_20251124` tool.
* Returns the text between tool calls as `text` blocks.
* Defaults to `high` effort.

This section adds what changed between Claude Opus 4.8 and Claude Opus 5. For a checklist, see the first two groups of the [migration checklist](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migration-checklist).

### What changed

1. **Thinking runs on requests that omitted it:** On Claude Opus 4.8, thinking is off unless you ask for it. On Claude Opus 5.5, a request with no `thinking` field runs with thinking, so every item in [Handle thinking in every response](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#thinking-in-every-response) is a change for that code. If your code never sent a `thinking` field, there is nothing to remove under the [before and after for thinking](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#thinking-cant-be-disabled).

2. **Lower prompt caching minimum:** The minimum cacheable prompt length on Claude Opus 5.5 is 512 tokens, down from 1,024 tokens on Claude Opus 4.8. Prompts that were too short to cache on Claude Opus 4.8 can create cache entries, with no code changes required. See [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#cache-limitations) for per-model minimums.

3. **Priority Tier is not supported:** [Priority Tier](https://platform.claude.com/docs/en/api/service-tiers#supported-models) is not supported on Claude Opus 5.5, while Claude Opus 4.8 keeps it. If your organization has a Priority Tier commitment, plan capacity separately.

### Recommended changes

These are not required but will improve your experience:

1. **Consider task budgets (beta):** For agentic workloads, [task budgets](https://platform.claude.com/docs/en/build-with-claude/task-budgets) tell the model how many tokens it has for a full agentic loop. They require the `task-budgets-2026-03-13` beta header.

2. **Consider mid-conversation tool changes (beta):** Mid-conversation tool changes let you add or remove tools between turns of a conversation without invalidating [prompt cache](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) hits on earlier turns. Changing the `tools` array itself invalidates the cached prefix. On the Claude API, send the `inline-tools-2026-09-15` beta header. The older `mid-conversation-tool-changes-2026-07-01` header still works for changes that name a tool by reference, on the Claude API, Amazon Bedrock, and Google Cloud.

## Migrating to Claude Opus 5.5 from Claude Opus 4.7

First work through [What every request to Claude Opus 5.5 must satisfy](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#request-requirements), [Handle thinking in every response](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#thinking-in-every-response), [Migrating to Claude Opus 5.5 from Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-5), and [Migrating to Claude Opus 5.5 from Claude Opus 4.8](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-4-8). Use `claude-opus-4-7` as the model ID you replace. Those sections apply to code on Claude Opus 4.7 as written. Like Claude Opus 4.8, it accepts `thinking: {"type": "disabled"}`, forced tool choice, and the `computer_20251124` tool. It defaults to `high` effort and runs without thinking unless you ask for it.

This section adds what changed after Claude Opus 4.7. If your code is on Claude Opus 4.6 or earlier, continue with [Migrating to Claude Opus 5.5 from Claude Opus 4.6 and earlier Opus models](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-46) after this section. It adds the breaking changes that took effect in Claude Opus 4.7. For a checklist, see the first three groups of the [migration checklist](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migration-checklist).

### What changed

None of these items adds a breaking change to those in the earlier sections; they are worth checking after you swap the model ID.

1. **Effort levels recalibrated:** The token allocation behind each effort level changes on Claude Opus 5.5 compared to Claude Opus 4.7. The default is `medium`, where Claude Opus 4.7's is `high`. Run a fresh effort sweep on your own evals rather than carrying over a setting tuned for Claude Opus 4.7. See [Effort](https://platform.claude.com/docs/en/build-with-claude/effort).

2. **1M context window is the default:** Claude Opus 5.5 serves the full 1M token [context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) by default with no beta header. If your client passes a context-window beta header for compatibility with older models, remove it.

3. **Mid-conversation system messages:** On the Claude API, Amazon Bedrock, and Google Cloud, Claude Opus 5.5 accepts `role: "system"` messages immediately after a user turn in the `messages` array (subject to [placement rules](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages#limitations)). Use the top-level `system` field for instructions that apply from the start. Claude Opus 4.7 rejects `role: "system"` in `messages` with a 400 error. If you maintain code paths that rebuild the full message history to update instructions, you can simplify them and preserve [prompt cache](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) hits on earlier turns.

4. **Refusal stop details:** When the model declines a request, Claude Opus 5.5 returns a `stop_details` object that names the category of refusal, alongside the `refusal` stop reason. Claude Opus 4.7 returns the same object, so this matters only if your stop-reason handling does not read it yet. No beta header is required, and there is no opt-out. If your stop-reason handling doesn't read it yet, see [Handling stop reasons](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons). Claude Opus 5.5 declines in more categories; see [Safety classifiers and fallback](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#safety-classifiers-and-fallback).

5. **Fast mode:** Claude Opus 5.5 supports [fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) (research preview) on the Claude API. Fast mode is not available on Claude Opus 4.7, where requests with `speed: "fast"` return an error. Set `speed: "fast"` with the `fast-mode-2026-02-01` beta header.

6. **Computer use toolset and browser use tool:** On the Claude API and Google Cloud, Claude Opus 5.5 supports [computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) as the `computer_toolset_20260801` toolset and the [browser use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool) for tasks inside webpages. Claude Opus 4.7 supports neither. On those platforms Claude Opus 5.5 doesn't accept the earlier `computer_20251124` tool; see the [computer use breaking change](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#computer-use-toolset).

## Migrating to Claude Opus 5.5 from Claude Opus 4.6 and earlier Opus models

First work through every earlier section, in page order. They are [What every request to Claude Opus 5.5 must satisfy](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#request-requirements), [Handle thinking in every response](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#thinking-in-every-response), and the sections for [Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-5), [Claude Opus 4.8](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-4-8), and [Claude Opus 4.7](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-47). Those sections apply to code on Claude Opus 4.6 as written. Like Claude Opus 4.7, it accepts `thinking: {"type": "disabled"}`, forced tool choice, and the `computer_20251124` tool. It defaults to `high` effort and runs without thinking unless you ask for it. Claude Opus 4.5 and earlier Opus models also accept `thinking: {"type": "disabled"}` and forced tool choice, and run without thinking unless you ask for it, so those sections apply to them too.

This section adds what changed in Claude Opus 4.7, with `claude-opus-4-6` as the model ID you replace. Its two subsections add what changed before that, for readers on [Claude Opus 4.5 or earlier](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-45) and [Claude 4.1 or earlier](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-4-1-or-earlier). For a checklist, see the [migration checklist](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migration-checklist) up to the group that names your model.

### Breaking changes

1. **Extended thinking removed:** `thinking: {"type": "enabled", "budget_tokens": N}` is no longer supported on Claude Opus 4.7 and later models and returns a 400 error. Switch to [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) (`thinking: {"type": "adaptive"}`) and use the [effort parameter](https://platform.claude.com/docs/en/build-with-claude/effort) to control thinking depth. On Claude Opus 5.5, adaptive thinking is always on: `thinking: {"type": "adaptive"}` is valid and equivalent to omitting the `thinking` field entirely.

   Before (Claude Opus 4.6):

   <CodeGroup>
     ```bash cURL
     curl https://api.anthropic.com/v1/messages \
       -H "x-api-key: $ANTHROPIC_API_KEY" \
       -H "anthropic-version: 2023-06-01" \
       -H "content-type: application/json" \
       -d '{
         "model": "claude-opus-4-6",
         "max_tokens": 16000,
         "thinking": {
           "type": "enabled",
           "budget_tokens": 10000
         },
         "messages": [
           {
             "role": "user",
             "content": "..."
           }
         ]
       }'
     ```

     ```bash CLI
     ant messages create <<'YAML'
     model: claude-opus-4-6
     max_tokens: 16000
     thinking:
       type: enabled
       budget_tokens: 10000
     messages:
       - role: user
         content: "..."
     YAML
     ```

     ```python Python
     client.messages.create(
         model="claude-opus-4-6",
         max_tokens=16000,
         thinking={"type": "enabled", "budget_tokens": 10000},
         messages=[{"role": "user", "content": "..."}],
     )
     ```

     ```typescript TypeScript
     await client.messages.create({
       model: "claude-opus-4-6",
       max_tokens: 16000,
       thinking: { type: "enabled", budget_tokens: 10000 },
       messages: [{ role: "user", content: "..." }]
     });
     ```

     ```csharp C#
     using Anthropic;
     using Anthropic.Models.Messages;

     AnthropicClient client = new();

     var parameters = new MessageCreateParams
     {
         Model = "claude-opus-4-6",
         MaxTokens = 16000,
         Thinking = new ThinkingConfigEnabled(budgetTokens: 10000),
         Messages = [new() { Role = Role.User, Content = "..." }]
     };

     var response = await client.Messages.Create(parameters);
     Console.WriteLine(response);
     ```

     ```go Go
     client := anthropic.NewClient()

     response, err := client.Messages.New(context.TODO(), anthropic.MessageNewParams{
     	Model:     "claude-opus-4-6",
     	MaxTokens: 16000,
     	Thinking:  anthropic.ThinkingConfigParamOfEnabled(10000),
     	Messages: []anthropic.MessageParam{
     		anthropic.NewUserMessage(anthropic.NewTextBlock("...")),
     	},
     })
     if err != nil {
     	log.Fatal(err)
     }
     fmt.Println(response)
     ```

     ```java Java
     AnthropicClient client = AnthropicOkHttpClient.fromEnv();

     MessageCreateParams params = MessageCreateParams.builder()
         .model("claude-opus-4-6")
         .maxTokens(16000L)
         .enabledThinking(10000L)
         .addUserMessage("...")
         .build();

     Message response = client.messages().create(params);
     IO.println(response);
     ```

     ```php PHP
     $client = new Client();

     $message = $client->messages->create(
         maxTokens: 16000,
         messages: [['role' => 'user', 'content' => '...']],
         model: 'claude-opus-4-6',
         thinking: ['type' => 'enabled', 'budget_tokens' => 10000],
     );
     ```

     ```ruby Ruby
     client = Anthropic::Client.new

     message = client.messages.create(
       model: "claude-opus-4-6",
       max_tokens: 16000,
       thinking: {
         type: "enabled",
         budget_tokens: 10000
       },
       messages: [
         { role: "user", content: "..." }
       ]
     )
     ```
   </CodeGroup>

   After (Claude Opus 5.5), where the model ID, `thinking`, and `output_config` lines differ:

   <CodeGroup>
     ```bash cURL
     curl https://api.anthropic.com/v1/messages \
       -H "x-api-key: $ANTHROPIC_API_KEY" \
       -H "anthropic-version: 2023-06-01" \
       -H "content-type: application/json" \
       -d '{
         "model": "claude-opus-5-5",
         "max_tokens": 16000,
         "thinking": {
           "type": "adaptive"
         },
         "output_config": {
           "effort": "high"
         },
         "messages": [
           {
             "role": "user",
             "content": "..."
           }
         ]
       }'
     ```

     ```bash CLI
     ant messages create <<'YAML'
     model: claude-opus-5-5
     max_tokens: 16000
     thinking:
       type: adaptive
     output_config:
       effort: high
     messages:
       - role: user
         content: "..."
     YAML
     ```

     ```python Python
     client.messages.create(
         model="claude-opus-5-5",
         max_tokens=16000,
         thinking={"type": "adaptive"},
         output_config={"effort": "high"},  # or "max", "xhigh", "medium", "low"
         messages=[{"role": "user", "content": "..."}],
     )
     ```

     ```typescript TypeScript
     await client.messages.create({
       model: "claude-opus-5-5",
       max_tokens: 16000,
       thinking: { type: "adaptive" },
       output_config: { effort: "high" }, // or "max", "xhigh", "medium", "low"
       messages: [{ role: "user", content: "..." }]
     });
     ```

     ```csharp C#
     using Anthropic;
     using Anthropic.Models.Messages;

     AnthropicClient client = new();

     var parameters = new MessageCreateParams
     {
         Model = "claude-opus-5-5",
         MaxTokens = 16000,
         Thinking = new ThinkingConfigAdaptive(),
         OutputConfig = new OutputConfig { Effort = Effort.High }, // or Max, Xhigh, Medium, Low
         Messages = [new() { Role = Role.User, Content = "..." }]
     };

     var response = await client.Messages.Create(parameters);
     Console.WriteLine(response);
     ```

     ```go Go
     client := anthropic.NewClient()

     response, err := client.Messages.New(context.TODO(), anthropic.MessageNewParams{
     	Model:     "claude-opus-5-5",
     	MaxTokens: 16000,
     	Thinking: anthropic.ThinkingConfigParamUnion{
     		OfAdaptive: &anthropic.ThinkingConfigAdaptiveParam{},
     	},
     	OutputConfig: anthropic.OutputConfigParam{
     		Effort: anthropic.OutputConfigEffortHigh, // or Max, Xhigh, Medium, Low
     	},
     	Messages: []anthropic.MessageParam{
     		anthropic.NewUserMessage(anthropic.NewTextBlock("...")),
     	},
     })
     if err != nil {
     	log.Fatal(err)
     }
     fmt.Println(response)
     ```

     ```java Java
     AnthropicClient client = AnthropicOkHttpClient.fromEnv();

     MessageCreateParams params = MessageCreateParams.builder()
         .model("claude-opus-5-5")
         .maxTokens(16000L)
         .thinking(ThinkingConfigAdaptive.builder().build())
         .outputConfig(OutputConfig.builder()
             .effort(OutputConfig.Effort.HIGH) // or MAX, XHIGH, MEDIUM, LOW
             .build())
         .addUserMessage("...")
         .build();

     Message response = client.messages().create(params);
     IO.println(response);
     ```

     ```php PHP
     $client = new Client();

     $message = $client->messages->create(
         maxTokens: 16000,
         messages: [['role' => 'user', 'content' => '...']],
         model: 'claude-opus-5-5',
         thinking: ['type' => 'adaptive'],
         outputConfig: ['effort' => 'high'], // or 'max', 'xhigh', 'medium', 'low'
     );
     ```

     ```ruby Ruby
     client = Anthropic::Client.new

     message = client.messages.create(
       model: "claude-opus-5-5",
       max_tokens: 16000,
       thinking: {
         type: "adaptive"
       },
       output_config: {
         effort: "high" # or "max", "xhigh", "medium", "low"
       },
       messages: [
         { role: "user", content: "..." }
       ]
     )
     ```
   </CodeGroup>

   Adaptive thinking is steerable through prompting and the [effort parameter](https://platform.claude.com/docs/en/build-with-claude/effort), which replaces the thinking budget as the way to control how much the model reasons. Run an effort sweep on your own evals rather than translating a `budget_tokens` value. The [effort levels table](https://platform.claude.com/docs/en/build-with-claude/effort#effort-levels) describes when to use each level, and [Recommended effort levels for Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/effort#recommended-effort-levels-for-claude-opus-5-5) covers this model.

2. **Sampling parameters removed:** Setting `temperature`, `top_p`, or `top_k` to any non-default value on Claude Opus 4.7 and later models, including Claude Opus 5.5, returns a 400 error. The Python SDK (v1.0 and later) does not define them, and passing them raises a `TypeError`. The safest migration path is to omit these parameters entirely from request payloads. Prompting is the recommended way to guide model behavior on Claude Opus 5.5. If you were using `temperature = 0` for determinism, note that it never guaranteed identical outputs on prior models.

3. **Thinking content omitted by default:** Thinking blocks still appear in the response stream on Claude Opus 4.7 and later models, but their `thinking` field is empty unless you explicitly opt in. This is a silent change from Claude Opus 4.6, where the default was to return summarized thinking text. To restore it, see item 4 of [Handle thinking in every response](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#thinking-in-every-response).

4. **Updated token counting:** Claude Opus 4.7 introduced a new tokenizer, which later Opus models, including Claude Opus 5.5, also use. It contributes to improved performance on a wide range of tasks, and it may use roughly 1x to 1.35x as many tokens when processing text compared to models before Claude Opus 4.7 (up to \~35% more, varying by content).

   [`/v1/messages/count_tokens`](https://platform.claude.com/docs/en/build-with-claude/token-counting) returns a different number of tokens for Claude Opus 5.5 than it did for Claude Opus 4.6. Token efficiency can vary by workload shape.

   Update your `max_tokens` parameters to give additional headroom, including compaction triggers, and re-test any code path that estimates tokens client-side or assumes a fixed token-to-character ratio. Use the [Token counting endpoint](https://platform.claude.com/docs/en/build-with-claude/token-counting) to verify. Prompting interventions, [`task_budget`](https://platform.claude.com/docs/en/build-with-claude/task-budgets), and [`effort`](https://platform.claude.com/docs/en/build-with-claude/effort) can help control costs; these controls may trade off model intelligence.

5. **Prefill removal (already in effect on Claude Opus 4.6):** Prefilling assistant messages returns a 400 error on Claude Opus 4.6 and later Opus models, including Claude Opus 5.5, so this is a change only if you come from Claude Opus 4.5 or earlier. Use [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), system prompt instructions, or `output_config.format` instead.

### Behavior changes

Claude Opus 4.7 introduced behavioral differences from Claude Opus 4.6 that are not API breaking changes. These three affect code or scaffolding:

1. **Built-in progress updates in agentic traces:** Claude Opus 4.7 provides more regular, higher-quality updates to the user throughout long agentic traces. If you've added scaffolding to force interim status messages ("After every 3 tool calls, summarize progress"), try removing it. On Claude Opus 5.5 these updates arrive in `thinking` blocks, which are empty at the default `thinking.display`. To receive them, see [Text between tool calls is returned in thinking blocks](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#text-between-tool-calls). To shape their length and contents, see [User-facing progress updates](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#user-facing-progress-updates).

2. **Real-time cybersecurity safeguards:** Newly added in Claude Opus 4.7, requests that involve prohibited or high-risk topics may lead to refusals. For legitimate security work such as penetration testing, vulnerability research, or red-teaming, apply to the [Cyber Verification Program](https://support.claude.com/en/articles/14604842-real-time-cyber-safeguards-on-claude-opus-and-sonnet) to request reduced restrictions. The application route depends on how you access Claude.

3. **High-resolution image support:** Claude Opus 4.7 is the first Claude model with high-resolution image support. Maximum image resolution is 2,576 pixels on the long edge, up from 1,568 pixels on prior models. This unlocks gains on vision-heavy workloads and is particularly valuable for computer use, screenshot understanding, and document analysis.

   High-resolution support is automatic and requires no beta header or client-side opt-in. Two things to plan for:

   * Full-resolution images can use up to approximately 3x more image tokens than on prior models (up to 4,784 tokens per image, compared to the previous cap of roughly 1,600 tokens per image). Re-budget `max_tokens` and cost expectations for image-heavy workloads, or downsample before sending if you do not need the additional fidelity.
   * Pointing and bounding-box coordinates returned by the model are 1:1 with actual image pixels on Claude Opus 4.7, so no scale-factor conversion is required.

   See [High-resolution image support on Claude Opus 4.7](https://platform.claude.com/docs/en/build-with-claude/vision#high-resolution-image-support-on-claude-opus-4-7) for details.

For prompt-side differences, see [Prompting Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5) and [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).

### Migrating from Claude Opus 4.5 or earlier

If you are migrating from Claude Opus 4.5, Claude Opus 4.1, or an earlier model directly to Claude Opus 5.5, read this page from the top: first work through every earlier section, in page order. Then work through the [breaking changes for migrating from Claude Opus 4.6](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#opus-46-breaking-changes) earlier in this section. Then apply the following cumulative changes, which took effect between Claude Opus 4.5 and Claude Opus 4.7. If you are on Claude Opus 4.1 or earlier, continue with [Migrating from Claude 4.1 or earlier](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-4-1-or-earlier) after this subsection.

#### Breaking changes

1. **Prefill removal** is covered in the [breaking changes for migrating from Claude Opus 4.6](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#opus-46-breaking-changes).

2. **Tool parameter quoting:** Claude Opus 4.6 and later models may produce slightly different JSON string escaping in tool call arguments (for example, different handling of Unicode escapes or forward slash escaping). If you parse tool call `input` as a raw string rather than using a JSON parser, verify your parsing logic. Standard JSON parsers (such as `json.loads()` or `JSON.parse()`) handle these differences automatically.

#### Recommended changes

The first item is required on Claude Opus 5.5; the rest are recommended.

1. **Migrate to adaptive thinking (required):** `thinking: {"type": "enabled", "budget_tokens": N}` returns a 400 error on Claude Opus 4.7 and later models. The before and after is item 1 of the [breaking changes for migrating from Claude Opus 4.6](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#opus-46-breaking-changes). The migration also moves from `client.beta.messages.create` to `client.messages.create`: adaptive thinking and effort do not require the beta SDK namespace or any beta headers.

2. **Remove effort beta header:** The effort parameter does not require a beta header. Remove `betas=["effort-2025-11-24"]` from your requests.

3. **Remove fine-grained tool streaming beta header:** Fine-grained tool streaming does not require a beta header. Remove `betas=["fine-grained-tool-streaming-2025-05-14"]` from your requests.

4. **Remove interleaved thinking beta header:** With adaptive thinking, interleaved thinking is automatic on every model that supports adaptive thinking. Remove `betas=["interleaved-thinking-2025-05-14"]` from your requests.

5. **Migrate to output\_config.format:** If using structured outputs, update `output_format={...}` to `output_config={"format": {...}}`. The `output_format` parameter is deprecated and will be removed in the future. To use it anyway, add the `structured-outputs-2025-11-13` beta header. Without it, the API returns a 400 error. The Python SDK (v1.0 and later) does not accept `output_format={...}` on `client.beta.messages.create()` or `count_tokens()`. The `output_format=Model` argument of the `parse()` and `stream()` helpers is unchanged.

### Migrating from Claude 4.1 or earlier

If you're migrating from Claude Opus 4.1 or earlier models directly to Claude Opus 5.5, first apply everything in [Migrating from Claude Opus 4.5 or earlier](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-45). That subsection starts with every earlier section, so in effect you read this page from the top. Then apply the additional changes in this subsection.

#### Additional breaking changes

1. **Remove sampling parameters:** Covered in [Sampling parameters removed](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#opus-46-breaking-changes).

2. **Update tool versions**

   <Warning>
     This is a breaking change when migrating from Claude 3.x models.
   </Warning>

   Update to the current tool versions. Remove any code using the `undo_edit` command.

   <CodeGroup exclude="shell">
     ```python Python
     # Before
     tools = [{"type": "text_editor_20250124", "name": "str_replace_editor"}]

     # After
     tools = [{"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"}]
     ```

     ```typescript TypeScript
     // Before
     const legacyTools = [{ type: "text_editor_20250124", name: "str_replace_editor" }];

     // After
     const tools = [{ type: "text_editor_20250728", name: "str_replace_based_edit_tool" }];
     ```

     ```csharp C#
     var parameters = new MessageCreateParams
     {
         // Before: {"type": "text_editor_20250124", "name": "str_replace_editor"}
         // After:
         Tools = [new ToolTextEditor20250728()],
         // ...
     };
     ```

     ```go Go
     params := anthropic.MessageNewParams{
     	// Before: {"type": "text_editor_20250124", "name": "str_replace_editor"}
     	// After:
     	Tools: []anthropic.ToolUnionParam{
     		{OfTextEditor20250728: &anthropic.ToolTextEditor20250728Param{}},
     	},
     	// ...
     }
     ```

     ```java Java
     MessageCreateParams params = MessageCreateParams.builder()
         // Before: {"type": "text_editor_20250124", "name": "str_replace_editor"}
         // After:
         .addTool(ToolTextEditor20250728.builder().build())
         // ...
         .build();
     ```

     ```php PHP
     $message = $client->messages->create(
         // Before: ['type' => 'text_editor_20250124', 'name' => 'str_replace_editor']
         // After:
         tools: [new ToolTextEditor20250728()],
         // ...
     );
     ```

     ```ruby Ruby
     # Before
     legacy_tools = [{type: "text_editor_20250124", name: "str_replace_editor"}]

     # After
     tools = [{type: "text_editor_20250728", name: "str_replace_based_edit_tool"}]
     ```
   </CodeGroup>

   * **Text editor:** Use `text_editor_20250728` and `str_replace_based_edit_tool`. See [Text editor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool) documentation for details.
   * **Code execution:** Upgrade to `code_execution_20260521`. See [Code execution tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool#upgrade-to-latest-tool-version) documentation for migration instructions.
   * **Computer use:** On the Claude API and Google Cloud, Claude Opus 5.5 accepts computer use only as the `computer_toolset_20260801` toolset: the earlier `computer_20250124` and `computer_20251124` tools are rejected there. See the [computer use breaking change](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#computer-use-toolset).

3. **Handle the `refusal` stop reason**

   Update your application to [handle `refusal` stop reasons](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/handle-streaming-refusals):

   <CodeGroup exclude="shell">
     ```python Python
     response = client.messages.create(...)

     if response.stop_reason == "refusal":
         # Handle refusal appropriately
         pass
     ```

     ```typescript TypeScript
     const response = await client.messages.create(/* ... */);

     if (response.stop_reason === "refusal") {
       // Handle refusal appropriately
     }
     ```

     ```csharp C#
     var response = await client.Messages.Create(...);

     if (response.StopReason?.Value() == StopReason.Refusal)
     {
         // Handle refusal appropriately
     }
     ```

     ```go Go
     response, _ := client.Messages.New(ctx, params) // your existing request

     if response.StopReason == anthropic.StopReasonRefusal {
     	// Handle refusal appropriately
     }
     ```

     ```java Java
     Message response = client.messages().create(...);

     StopReason reason = response.stopReason().orElse(StopReason.END_TURN);
     if (reason.equals(StopReason.REFUSAL)) {
         // Handle refusal appropriately
     }
     ```

     ```php PHP
     $response = $client->messages->create(...);

     if ($response->stopReason === 'refusal') {
         // Handle refusal appropriately
     }
     ```

     ```ruby Ruby
     response = client.messages.create(...)

     if response.stop_reason == :refusal
       # Handle refusal appropriately
     end
     ```
   </CodeGroup>

4. **Handle the `model_context_window_exceeded` stop reason**

   Claude 4.5 and later models return a `model_context_window_exceeded` stop reason when generation stops because of hitting the context window limit, rather than the requested `max_tokens` limit. Update your application to handle this new stop reason:

   <CodeGroup exclude="shell">
     ```python Python
     response = client.messages.create(...)

     if response.stop_reason == "model_context_window_exceeded":
         # Handle context window limit appropriately
         pass
     ```

     ```typescript TypeScript
     const response = await client.messages.create(/* ... */);

     if (response.stop_reason === "model_context_window_exceeded") {
       // Handle context window limit appropriately
     }
     ```

     ```csharp C#
     var response = await client.Messages.Create(...);

     if (response.StopReason?.Raw() == "model_context_window_exceeded")
     {
         // Handle context window limit appropriately
     }
     ```

     ```go Go
     response, _ := client.Messages.New(ctx, params) // your existing request

     if response.StopReason == "model_context_window_exceeded" {
     	// Handle context window limit appropriately
     }
     ```

     ```java Java
     Message response = client.messages().create(...);

     StopReason reason = response.stopReason().orElse(StopReason.END_TURN);
     if (reason.equals(StopReason.of("model_context_window_exceeded"))) {
         // Handle context window limit appropriately
     }
     ```

     ```php PHP
     $response = $client->messages->create(...);

     if ($response->stopReason === 'model_context_window_exceeded') {
         // Handle context window limit appropriately
     }
     ```

     ```ruby Ruby
     response = client.messages.create(...)

     if response.stop_reason == :model_context_window_exceeded
       # Handle context window limit appropriately
     end
     ```
   </CodeGroup>

5. **Verify tool parameter handling (trailing newlines)**

   Claude 4.5 and later models preserve trailing newlines in tool call string parameters that were previously stripped. If your tools rely on exact string matching against tool call parameters, verify your logic handles trailing newlines correctly.

6. **Update your prompts for behavioral changes**

   Claude 4 and later models have a more concise, direct communication style and require explicit direction. Review [prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) for optimization guidance.

#### Additional recommended changes

* **Remove legacy beta headers:** Remove `token-efficient-tools-2025-02-19` and `output-128k-2025-02-19`. All Claude 4 and later models have built-in token-efficient tool use and these headers have no effect.

## Migrating to Claude Opus 5.5 from Claude Sonnet 5

Work through [What every request to Claude Opus 5.5 must satisfy](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#request-requirements), [Handle thinking in every response](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#thinking-in-every-response), and [Migrating to Claude Opus 5.5 from Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-5). Use `claude-sonnet-5` as the model ID you replace. That last section applies to code on Claude Sonnet 5 as written, because Claude Sonnet 5, like Claude Opus 5:

* Runs with thinking on by default and accepts `thinking: {"type": "disabled"}`, in its case at any effort level.
* Accepts forced tool choice and the `computer_20251124` tool.
* Returns the text between tool calls as `text` blocks.
* Defaults to `high` effort.

Manual extended thinking, non-default sampling parameters, and assistant prefill return a 400 error on both models, so nothing changes there. None of the required changes in the sections for Claude Opus 4.8, Claude Opus 4.7, and Claude Opus 4.6 apply to you.

### What changed

1. **Mid-conversation system messages:** On the Claude API, Amazon Bedrock, and Google Cloud, Claude Opus 5.5 accepts `role: "system"` messages immediately after a user turn in the `messages` array (subject to [placement rules](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages#limitations)). This feature is not available on Claude Sonnet 5. If you maintain code paths that rebuild the full message history to update instructions, you can simplify them and preserve [prompt cache](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) hits on earlier turns.

2. **Lower prompt caching minimum:** The minimum cacheable prompt length on Claude Opus 5.5 is 512 tokens, down from 1,024 tokens on Claude Sonnet 5. Prompts that were too short to cache on Claude Sonnet 5 can create cache entries, with no code changes required. See [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#cache-limitations) for per-model minimums.
