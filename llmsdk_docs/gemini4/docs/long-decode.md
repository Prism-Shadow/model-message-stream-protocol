> Source: https://ai.google.dev/gemini-api/docs/long-decode.md.txt (snapshot 2026-10-14)

Long decode lets Gemini 4 Argon generate past 64K tokens for deep reasoning tasks, up to the unified 1M-token context window (1,048,576 tokens shared across input, thinking, and output). On the Interactions API, you enable long decode with background execution so our servers automatically generate and combine each 64K hop into a single interaction.

## How long decode works

A single model call generates up to 64K tokens. When a response needs more than 64K tokens, the server generates it in 64K hops that continue from where the previous hop stopped. Each hop adds a `model_output` step to `interaction.steps` under the same interaction ID, so you join those steps to read the full response:

1. You create an interaction with `background: true` and `max_output_tokens` greater than 65,536, up to 1M.
2. The server generates the first hop, up to 64K tokens.
3. The server starts the next hop from where the last one stopped, and repeats until the model finishes or uses all of `max_output_tokens`.
4. You poll the interaction, or stream it, to get the result.

### Python

    import time
    from google import genai

    client = genai.Client()

    interaction = client.interactions.create(
        model="gemini-4-argon",
        input="Write a complete, rigorous proof of the prime number theorem.",
        background=True,
        generation_config={
            "max_output_tokens": 262144,
            "thinking_level": "high",
        },
    )

    while interaction.status in ("in_progress", "queued"):
        time.sleep(5)
        interaction = client.interactions.get(id=interaction.id)

    # Each hop adds a model_output step, so join the text of all of them.
    text = "".join(
        content.text
        for step in interaction.steps
        if step.type == "model_output"
        for content in step.content
        if content.type == "text"
    )
    print(text)
    print("Status:", interaction.status)
    print("Usage:", interaction.usage)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    let interaction = await client.interactions.create({
      model: "gemini-4-argon",
      input: "Write a complete, rigorous proof of the prime number theorem.",
      background: true,
      generation_config: {
        max_output_tokens: 262144,
        thinking_level: "high",
      },
    });

    while (interaction.status === "in_progress" || interaction.status === "queued") {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      interaction = await client.interactions.get(interaction.id);
    }

    // Each hop adds a model_output step, so join the text of all of them.
    const text = interaction.steps
      .filter((step) => step.type === "model_output")
      .flatMap((step) => step.content ?? [])
      .filter((content) => content.type === "text")
      .map((content) => content.text)
      .join("");
    console.log(text);
    console.log("Status:", interaction.status);
    console.log("Usage:", interaction.usage);

### REST

    # 1. Create the background interaction. It returns an ID right away.
    ID=$(curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "model": "gemini-4-argon",
        "input": "Write a complete, rigorous proof of the prime number theorem.",
        "background": true,
        "generation_config": {"max_output_tokens": 262144, "thinking_level": "high"}
      }' | jq -r '.id')

    # 2. Poll until the status is no longer in_progress or queued.
    #    The REST response has no output_text field, so join the text of every model_output step.
    while true; do
      RESP=$(curl -s "https://generativelanguage.googleapis.com/v1beta/interactions/$ID" \
        -H "x-goog-api-key: $GEMINI_API_KEY")
      STATUS=$(echo "$RESP" | jq -r '.status')
      if [[ "$STATUS" != "in_progress" && "$STATUS" != "queued" ]]; then
        echo "$RESP" | jq -r '[.steps[]? | select(.type == "model_output") | .content[]? | select(.type == "text") | .text] | join("")'
        echo "$RESP" | jq '{status, usage}'
        break
      fi
      sleep 5
    done

## Output limits

Streaming and non-streaming interactions default to a 64K output token limit, so responses up to 64K tokens need no code changes. To generate past 64K tokens, turn on background execution and raise `max_output_tokens`.

| How you create the interaction | Output limit |
|---|---|
| `background: false` (streaming or non-streaming) | 65,536 tokens. Values greater than 65,536 return a 400 error. Long decode coming soon. |
| `background: true`, `max_output_tokens` not set | 65,536 tokens |
| `background: true`, `max_output_tokens` greater than 65,536 | Your `max_output_tokens`, up to 1,048,576 minus your input |

> [!IMPORTANT]
> **Important:** Always set `max_output_tokens` greater than 65,536 for long decode. Also check the value in your agent framework or evaluation tool. A low value, such as 8,192, stops the model before it finishes thinking.

## When to use long decode

Most requests finish within 64K tokens. Use long decode only when one response needs more thinking and output than that.

| Workload | Use long decode? | Why |
|---|---|---|
| Hard math, science, research, and formal proofs | Yes | The model can spend more than 64K tokens to explore and check its reasoning. |
| The hardest coding and agentic tasks | Yes | Some tasks need more than 64K tokens of thinking and code in one response. Most coding and agentic tasks finish under 64K. |
| Evaluation tools that stop at the output limit | Yes | Long decode prevents cut-off answers when the model spends a whole 64K response on thinking. |
| Chat, Q\&A, summarization, classification, and extraction | No | These tasks finish well under 32K tokens. |
| Requests for a fixed length, such as "write a 700,000-word book" | No | The model doesn't follow length targets. |
| Agents that call tools in many short turns | No | Each turn is short. Large outputs on each turn fill the shared context window fast. |
| Prompts near the input limit | No | Output can use only 1,048,576 tokens minus your input. |
| Latency-sensitive requests | No | Long decode can run for several minutes. |

Setting a high `max_output_tokens` gives the model room to think longer on hard problems, but the model still decides how much to write. To control how much reasoning effort the model uses, set [`thinking_level`](https://ai.google.dev/gemini-api/docs/thinking).

## Choose how to run long decode

Background execution is the easiest way to run long decode on the Interactions API. Client-side continuation, where your code starts each hop, is available with the GenerateContent API. It's coming soon to the Interactions API as a more advanced option for managing your own resilience.

|   | Background execution (Interactions API) | Client-side continuation (GenerateContent API) |
|---|---|---|
| **Who starts each hop** | Our servers | The Google GenAI SDK, or your own code |
| **Tokens per request** | Your `max_output_tokens`, in one interaction | 64K per stream, 32K per non-streaming request |
| **Run time** | Up to 24 hours | 20 minutes |
| **Storage** | Requires `store: true` | Nothing stored on the server. |
| **Best for** | The easiest way to run long decode | Finer-grained control over retries, so you can build your own backoff, error handling, and resilience |

To use client-side continuation, see [long decode with the GenerateContent API](https://ai.google.dev/gemini-api/docs/generate-content/long-decode).

## Stream long decode

To stream outputs and thought summaries as they arrive, add `stream: true` and `thinking_summaries: "auto"`. Long streams can drop, so your client must reconnect. Follow the reconnect pattern in the [background execution guide](https://ai.google.dev/gemini-api/docs/background-execution). Long decode adds these rules:

- **Save the interaction ID:** Read it from the `interaction.created` event.
- **Save every `event_id`:** An `event_id` can arrive on `interaction.status_update` events, not only on text deltas.
- **Reconnect with `last_event_id`:** Call `interactions.get` with `stream: true` and the last `event_id`. The stream continues after that event.
- **Read to the end:** After you reconnect, read the stream to the end before you check the status. The server replays missed events, even after the interaction completes.
- **Set long timeouts:** Set HTTP read timeouts to 15 to 20 minutes per stream.
- **Expect output in 5K-token chunks:** After the first 64K tokens (about the first 10 minutes), the stream sends output in chunks of about 5,000 tokens. Pauses between chunks are normal. The interaction isn't stuck, so keep the connection open.

## Background status

A background interaction can run for up to 24 hours. Once the status is no longer `in_progress` or `queued`, handle the terminal state using this table:

| Status | Meaning | What to do |
|---|---|---|
| `completed` | The model finished. | Join the `model_output` steps in `steps` and read `usage`. To continue the conversation, pass this interaction's `id` as `previous_interaction_id`. |
| `requires_action` | The model asked for a tool call. | Run the tool. Then send the result with this interaction's `id`. |
| `incomplete` | The model used all of `max_output_tokens`. Text can be empty if the model was still thinking. | Send the request again with a higher `max_output_tokens`. |
| `failed` | The server couldn't finish, or the interaction ran longer than 24 hours. | Retry the request. If it fails again, share the interaction `id` with support. |
| `cancelled` | You cancelled the interaction. | Read `usage` to see the billed tokens. |

To stop a running interaction, call `client.interactions.cancel(id=interaction.id)` in Python, `client.interactions.cancel(interaction.id)` in JavaScript, or `POST /v1beta/interactions/{id}/cancel` in REST.

## Set `max_output_tokens`

`max_output_tokens` sets the combined limit for thinking and output across the interaction. Lowering it doesn't make the model think more concisely, and instead cuts the response off sooner.

| Your workload | Recommended `max_output_tokens` |
|---|---|
| Existing apps with a limit lower than 32K | Raise to 32,768. Background execution isn't needed. |
| Long coding and agentic tasks | Start at 65,536 (the default). Background execution isn't needed. |
| Complex reasoning, hard math, science, and proofs | Set `background: true` and start at 262,144, up to 1,048,576 minus your input tokens. |

To use fewer tokens, lower `thinking_level`. Use `high` for the hardest reasoning tasks. Use `medium` (the default) for most coding and agentic work.

## Count tokens

`interaction.usage` reports the totals across all hops. Read these fields: `total_input_tokens`, `total_cached_tokens`, `total_output_tokens`, `total_thought_tokens`, and `total_tokens`.

`total_input_tokens` adds up the input tokens of every hop. Each hop sends your prompt plus everything generated so far back to the model as input, so the same tokens are counted again in every later hop. For example, a 1,000-token prompt that produces 200,000 tokens of thinking and output takes four hops:

| Hop | Input sent to the model | Input tokens |
|---|---|---|
| 1 | Prompt | 1,000 |
| 2 | Prompt + hop 1 | 66,536 |
| 3 | Prompt + hops 1 and 2 | 132,072 |
| 4 | Prompt + hops 1 to 3 | 197,608 |
| **Total** |   | **397,216** |

`total_input_tokens` reports about 397,000 tokens (with repeated hop inputs automatically discounted 95% by implicit caching), even though the actual context size is only about 201,000 tokens: the 1,000-token prompt plus 200,000 tokens of thinking and output.

> [!IMPORTANT]
> **Important:** `total_input_tokens` is the sum of every hop's input, not the size of your context. Don't use it to decide when to summarize or trim your conversation history (context compaction). To estimate the context size, add your prompt size to `total_output_tokens` and `total_thought_tokens`.

During a stream, both `step.stop` and `interaction.status_update` events include `usage` (cumulative for the interaction). Read the latest `usage` value instead of adding them together.

## Understand billing

You pay for every token in every hop, including hops that contain only thinking.

- **Cache discount:** Implicit caching discounts the repeated input in each hop by 95%. Cached input costs $0.10 per 1M tokens instead of $2.00 during the introductory period.
- **Cancelled and failed interactions:** You pay for all work completed before the interaction ends.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Output stops at 64K | `background` is `false`, or `max_output_tokens` isn't set. Set `background: true` and `max_output_tokens` greater than 65,536. |
| 400: "max_output_tokens greater than 65536 is not yet supported with background=false." | Long decode without background execution isn't available yet. Set `background: true`. |
| 400: "store=true is required for background interactions" | Background execution needs `store: true`. |
| Status `incomplete` with empty text | The model used all tokens on thinking. Raise `max_output_tokens` or lower `thinking_level`. |
| Context compaction starts too early | Your agent framework or evaluation tool reads `total_input_tokens`. See [Count tokens](https://ai.google.dev/gemini-api/docs/long-decode#count-tokens). |

## Limitations

- **No long decode without background execution:** Interactions with `background: false` stop at 65,536 tokens. Support is coming soon.
- **No length targets:** The model doesn't follow token-length or word-count targets.

## Next steps

- [What's new in Gemini 4 Argon](https://ai.google.dev/gemini-api/docs/latest-model)
- [Background execution](https://ai.google.dev/gemini-api/docs/background-execution)
- [Thinking](https://ai.google.dev/gemini-api/docs/thinking)
- [Long decode with the GenerateContent API](https://ai.google.dev/gemini-api/docs/generate-content/long-decode)