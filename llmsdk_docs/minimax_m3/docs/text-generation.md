> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Model Invocation

> MiniMax LLMs, supporting multilingual programming, Agent workflows and complex task scenarios.

## Model Overview

MiniMax offers multiple LLMs to meet different scenario requirements. **MiniMax-M3.1-Flash** is the latest M-series language model for agentic reasoning, tool use, coding, and long-context tasks, and it supports tuning thinking depth with `effort`. **MiniMax-M3** also remains available.

### Supported Models

| Model Name | Context Window | Description |
| :- | :- | :- |
| <span style={{whiteSpace:"nowrap"}}>MiniMax-M3.1-Flash</span> | 1,000,000 | **Frontier multimodal coding model with 1M context window and tunable thinking depth**. An ultra-efficient open-weight model for everyday work. |
| MiniMax-M3 | 1,000,000 | **Frontier multimodal coding model with 1M context window** |

<Note>
  For details on how tps (Tokens Per Second) is calculated, please refer to [FAQ > About APIs](/docs/faq/about-apis#q-how-is-tps-tokens-per-second-calculated-for-llms).
</Note>

### **MiniMax M3.1-Flash** Key Highlights

<AccordionGroup>
  <Accordion title="1M-token context">
    MiniMax-M3.1-Flash supports up to a 1,000,000-token context window for long documents, codebases, and multi-step agent sessions.
  </Accordion>

  <Accordion title="Agent and coding workflows">
    MiniMax-M3.1-Flash is designed for agentic reasoning, tool use, coding, and structured task execution.
  </Accordion>

  <Accordion title="Tunable thinking depth (effort)">
    Tune thinking depth with `effort`, which accepts `low`, `medium`, `high`, `xhigh`, and `max`; higher levels think more thoroughly. When omitted, the default is `max`. See [Thinking](#thinking).
  </Accordion>

  <Accordion title="Multimodal chat input">
    Supports multimodal inputs, including text, images, and video, for a wide range of content understanding and analysis scenarios.
  </Accordion>
</AccordionGroup>

***

## URL Configuration

Before calling MiniMax models, prepare the following:

| Field | Value |
| :- | :- |
| `base_url` (Anthropic-compatible, recommended) | `https://api.minimax.io/anthropic` |
| `base_url` (OpenAI-compatible) | `https://api.minimax.io/v1` |
| `api_key` | [Get Subscription Key](https://platform.minimax.io/console/plan) |
| `model` | See [Supported Models](#supported-models) above |

***

## Calling Example

MiniMax accepts both Anthropic-style and OpenAI-style request formats. The two examples below are equivalent non-streaming calls; flip `stream` to `true` to switch to streaming responses.

### Anthropic-Compatible (Recommended)

Supports thinking blocks, interleaved thinking, and other advanced features — this is the default path.

<CodeGroup>
  ```bash curl theme={null}
  curl https://api.minimax.io/anthropic/v1/messages \
    -H "Authorization: Bearer <MINIMAX_API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "MiniMax-M3.1-Flash",
      "output_config": {"effort": "max"},
      "max_tokens": 4096,
      "messages": [
        {"role": "user", "content": "Hi, how are you?"}
      ]
    }'
  ```

  ```python Python theme={null}
  # Please install the Anthropic SDK first: `pip install anthropic`
  import anthropic

  client = anthropic.Anthropic(
      base_url="https://api.minimax.io/anthropic",
      api_key="<MINIMAX_API_KEY>",
  )

  message = client.messages.create(
      model="MiniMax-M3.1-Flash",
      output_config={"effort": "max"},
      max_tokens=4096,
      messages=[
          {"role": "user", "content": "Hi, how are you?"}
      ],
  )

  for block in message.content:
      if block.type == "thinking":
          print(f"Thinking:\n{block.thinking}\n")
      elif block.type == "text":
          print(f"Text:\n{block.text}\n")
  ```

  ```javascript Node.js theme={null}
  // Please install the Anthropic SDK first: `npm install @anthropic-ai/sdk`
  import Anthropic from "@anthropic-ai/sdk";

  const client = new Anthropic({
    baseURL: "https://api.minimax.io/anthropic",
    apiKey: "<MINIMAX_API_KEY>",
  });

  const message = await client.messages.create({
    model: "MiniMax-M3.1-Flash",
    output_config: { effort: "max" },
    max_tokens: 4096,
    messages: [
      { role: "user", content: "Hi, how are you?" },
    ],
  });

  for (const block of message.content) {
    if (block.type === "thinking") {
      console.log(`Thinking:\n${block.thinking}\n`);
    } else if (block.type === "text") {
      console.log(`Text:\n${block.text}\n`);
    }
  }
  ```
</CodeGroup>

### OpenAI-Compatible

Already wired up to the OpenAI SDK? Swap `base_url` and `model` for the values below and you can keep using your existing client without migrating to a new SDK.

<CodeGroup>
  ```bash curl theme={null}
  curl https://api.minimax.io/v1/chat/completions \
    -H "Authorization: Bearer <MINIMAX_API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "MiniMax-M3.1-Flash",
      "reasoning_effort": "max",
      "messages": [
        {"role": "user", "content": "Hi, how are you?"}
      ]
    }'
  ```

  ```python Python theme={null}
  # Please install the OpenAI SDK first: `pip install openai`
  from openai import OpenAI

  client = OpenAI(
      base_url="https://api.minimax.io/v1",
      api_key="<MINIMAX_API_KEY>",
  )

  response = client.chat.completions.create(
      model="MiniMax-M3.1-Flash",
      reasoning_effort="max",
      messages=[
          {"role": "user", "content": "Hi, how are you?"},
      ],
  )

  print(response.choices[0].message.content)
  ```

  ```javascript Node.js theme={null}
  // Please install the OpenAI SDK first: `npm install openai`
  import OpenAI from "openai";

  const client = new OpenAI({
    baseURL: "https://api.minimax.io/v1",
    apiKey: "<MINIMAX_API_KEY>",
  });

  const response = await client.chat.completions.create({
    model: "MiniMax-M3.1-Flash",
    reasoning_effort: "max",
    messages: [
      { role: "user", content: "Hi, how are you?" },
    ],
  });

  console.log(response.choices[0].message.content);
  ```
</CodeGroup>

***

## Thinking

MiniMax-M3.1-Flash reasons before it answers, breaking a complex problem into steps before producing a response. This measurably improves accuracy on agentic reasoning, tool use, coding, and maths. Thinking is **on by default and needs no configuration**.

Thinking content comes back separately from the answer: on the OpenAI-compatible protocol, thinking is always returned on `reasoning_content` while `content` holds only the final answer, ready to display without parsing it out of `<think>` tags.

### Thinking depth (effort)

`effort` accepts `low`, `medium`, `high`, `xhigh`, and `max`. Higher levels think more thoroughly and produce more output tokens at higher latency. For `MiniMax-M3.1-Flash`, omitting `effort` defaults to `max`. The field name differs per protocol:

| Protocol | Thinking depth field | Where thinking content is returned | Output limit field |
| :- | :- | :- | :- |
| Anthropic-compatible | `output_config.effort` | `thinking` content block | `max_tokens` |
| OpenAI-compatible | `reasoning_effort` | `reasoning_content` field | `max_tokens` / `max_completion_tokens` |
| OpenAI Responses | `reasoning.effort` | `type: "reasoning"` output item | `max_output_tokens` |

For the Anthropic-compatible API, explicitly set `output_config.effort` to `max`:

```json theme={null}
{
  "model": "MiniMax-M3.1-Flash",
  "max_tokens": 4096,
  "output_config": {"effort": "max"},
  "messages": [{"role": "user", "content": "Hello"}]
}
```

### Limitations

Thinking cannot be turned off. Sending `thinking: {"type": "disabled"}` or `effort: "none"` returns `400`:

```text theme={null}
model "MiniMax-M3.1-Flash" requires adaptive thinking
```

To reduce the latency and token usage of thinking, lower the `effort` level rather than trying to disable thinking.

***

## API Reference

<Columns cols={2}>
  <Card title="Anthropic API Compatible (Recommended)" icon="book-open" href="/docs/api-reference/text-anthropic-api" cta="View Docs">
    Call MiniMax models via Anthropic SDK, supporting streaming output and Interleaved Thinking
  </Card>

  <Card title="OpenAI API Compatible" icon="book-open" href="/docs/api-reference/text-openai-api" cta="View Docs">
    Call MiniMax models via OpenAI SDK
  </Card>

  <Card title="Using MiniMax M-series Models in AI Coding Tools" icon="code" href="/docs/m-plan/openclaw" cta="View Docs">
    Use MiniMax M-series models in Claude Code, Cursor, and other tools
  </Card>

  <Card title="Chat Model" icon="messages-square" href="/docs/guides/text-chat" cta="View Docs">
    M2-her chat model, designed for role-playing and multi-turn dialogue scenarios
  </Card>
</Columns>

***

## Contact Us

If you encounter any issues while using MiniMax models:

* Contact our technical support team through official channels such as email [Model@minimax.io](mailto:Model@minimax.io)
* Submit an Issue on our [Github](https://github.com/MiniMax-AI/MiniMax-M2.7/issues) repository

## Related Links

* [Anthropic SDK Documentation](https://docs.anthropic.com/en/api/client-sdks)
* [OpenAI SDK Documentation](https://platform.openai.com/docs/libraries)
* [MiniMax M3.1-Flash](https://www.minimax.io/blog/minimax-m31f)
