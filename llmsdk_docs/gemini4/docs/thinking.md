> Source: https://ai.google.dev/gemini-api/docs/thinking.md.txt (snapshot 2026-10-14)

[Gemini models](https://ai.google.dev/gemini-api/docs/models) use a
"thinking process" that significantly improves their reasoning and multi-step
planning abilities, making them highly effective for complex tasks such as
coding, advanced mathematics, and data analysis.

When you use a thinking model, Gemini reasons internally before responding. The Interactions API surfaces this reasoning via `thought` steps, dedicated steps that appear chronologically alongside function calls, user inputs or model outputs in the `steps` array.

Every thought step contains two fields:

| Field | Required | Description |
|---|---|---|
| `signature` | ✅ Yes | An encrypted representation of the model's internal reasoning state. Always present, even when the model performs minimal reasoning. |
| `summary` | ❌ No | An array of content (text and/or images) summarizing the reasoning. May be empty depending on the [`thinking_summaries`](https://ai.google.dev/api/interactions-api) config, whether the model performed enough reasoning, or the content type (for example, image latents may not have text summaries). |

> [!NOTE]
> **Note:** The Interactions API handles thoughts and signatures differently than the `generateContent` API: - In the `generateContent` API, there are no dedicated thought blocks. Because of this, signatures are metadata that can be attached to any part, such as living inside `functionCall` parts or the final part of a response. - In the Interactions API, thoughts are a first-class representation as dedicated `thought` steps. Because of this signatures are limited exclusively to two known locations, `thought` steps, or built-in tool steps (like `google_search_call`/ `google_search_result`). They never appear on user inputs, model outputs, or standard function calls.

## Interactions with thinking

Initiating an interaction with a thinking model is similar to any other interaction request. Specify one of the [models with thinking support](https://ai.google.dev/gemini-api/docs/thinking#thinking-levels) in the `model` field:

### Python

    from google import genai

    client = genai.Client()

    interaction = client.interactions.create(
        model="gemini-3.8-flash",
        input="Explain the concept of Occam's Razor and provide a simple, everyday example."
    )
    print(interaction.output_text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    const interaction = await client.interactions.create({
        model: "gemini-3.8-flash",
        input: "Explain the concept of Occam's Razor and provide a simple, everyday example."
    });
    console.log(interaction.output_text);

### Java

    import com.google.genai.Client;
    import com.google.genai.gaos.models.interactions.CreateModelInteraction;
    import com.google.genai.gaos.models.interactions.Interaction;
    import com.google.genai.gaos.models.interactions.InteractionsInput;
    import com.google.genai.gaos.models.interactions.Model;
    import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;

    Client client = new Client();

    CreateModelInteraction params =
        CreateModelInteraction.builder()
            .model(Model.of("gemini-3.8-flash"))
            .input(
                InteractionsInput.of(
                    "Explain the concept of Occam's Razor and provide a simple, everyday example."))
            .build();

    Interaction interaction =
        client.interactions.create(CreateInteractionRequestBody.of(params)).interaction().get();

    System.out.println(interaction.outputText().orElse(""));

### Go

    package main

    import (
        "context"
        "fmt"
        "log"

        "google.golang.org/genai"
        "google.golang.org/genai/interactions/models/interactions"
        "google.golang.org/genai/interactions/models/operations"
    )

    func main() {
        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }

        res, err := client.Interactions.Create(ctx, operations.CreateInteractionRequest{
            Body: operations.NewCreateInteractionRequestBody(interactions.CreateModelInteraction{
                Model: interactions.Model("gemini-3.8-flash"),
                Input: interactions.NewInteractionsInput("Explain the concept of Occam's Razor and provide a simple, everyday example."),
            }),
        })
        if err != nil {
            log.Fatal(err)
        }

        if res.Interaction.OutputText != nil {
            fmt.Println(*res.Interaction.OutputText)
        }
    }

### REST

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
        "model": "gemini-3.8-flash",
        "input": "Explain the concept of Occam'\''s Razor and provide a simple example."
      }'

## Thought summaries

Thought summaries provide insights into the model's internal reasoning process.
By default, only the final output is returned. You can enable thought summaries
with `thinking_summaries`:

### Python

    from google import genai

    client = genai.Client()

    interaction = client.interactions.create(
        model="gemini-3.8-flash",
        input="What is the sum of the first 50 prime numbers?",
        generation_config={
            "thinking_summaries": "auto"
        }
    )

    for step in interaction.steps:
        if step.type == "thought":
            print("Thought summary:")
            if step.summary:
                for content_block in step.summary:
                    if content_block.type == "text":
                        print(content_block.text)
            print()
        elif step.type == "model_output":
            for content_block in step.content:
                if content_block.type == "text":
                    print("Answer:")
                    print(content_block.text)
                    print()

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    const interaction = await client.interactions.create({
        model: "gemini-3.8-flash",
        input: "What is the sum of the first 50 prime numbers?",
        generation_config: {
            thinking_summaries: "auto"
        }
    });

    for (const step of interaction.steps) {
        if (step.type === "thought") {
            console.log("Thought summary:");
            if (step.summary) {
                for (const contentBlock of step.summary) {
                    if (contentBlock.type === "text") console.log(contentBlock.text);
                }
            }
        } else if (step.type === "model_output") {
            for (const contentBlock of step.content) {
                if (contentBlock.type === "text") {
                    console.log("Answer:");
                    console.log(contentBlock.text);
                }
            }
        }
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.gaos.models.interactions.Content;
    import com.google.genai.gaos.models.interactions.CreateModelInteraction;
    import com.google.genai.gaos.models.interactions.GenerationConfig;
    import com.google.genai.gaos.models.interactions.Interaction;
    import com.google.genai.gaos.models.interactions.InteractionsInput;
    import com.google.genai.gaos.models.interactions.Model;
    import com.google.genai.gaos.models.interactions.ModelOutputStep;
    import com.google.genai.gaos.models.interactions.Step;
    import com.google.genai.gaos.models.interactions.TextContent;
    import com.google.genai.gaos.models.interactions.ThinkingSummaries;
    import com.google.genai.gaos.models.interactions.ThoughtStep;
    import com.google.genai.gaos.models.interactions.ThoughtSummaryContent;
    import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;
    import java.util.Collections;

    Client client = new Client();

    CreateModelInteraction params =
        CreateModelInteraction.builder()
            .model(Model.of("gemini-3.8-flash"))
            .input(InteractionsInput.of("What is the sum of the first 50 prime numbers?"))
            .generationConfig(
                GenerationConfig.builder().thinkingSummaries(ThinkingSummaries.AUTO).build())
            .build();

    Interaction interaction =
        client.interactions.create(CreateInteractionRequestBody.of(params)).interaction().get();

    for (Step step : interaction.steps().orElse(Collections.emptyList())) {
      if (step instanceof ThoughtStep thoughtStep) {
        System.out.println("Thought summary:");
        for (ThoughtSummaryContent contentBlock : thoughtStep.summary().orElse(Collections.emptyList())) {
          if (contentBlock instanceof TextContent textContent) {
            System.out.println(textContent.text().orElse(""));
          }
        }
        System.out.println();
      } else if (step instanceof ModelOutputStep outputStep) {
        for (Content contentBlock : outputStep.content().orElse(Collections.emptyList())) {
          if (contentBlock instanceof TextContent textContent) {
            System.out.println("Answer:");
            System.out.println(textContent.text().orElse(""));
            System.out.println();
          }
        }
      }
    }

### Go

    package main

    import (
        "context"
        "fmt"
        "log"

        "google.golang.org/genai"
        "google.golang.org/genai/interactions/models/interactions"
        "google.golang.org/genai/interactions/models/operations"
    )

    func main() {
        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }

        res, err := client.Interactions.Create(ctx, operations.CreateInteractionRequest{
            Body: operations.NewCreateInteractionRequestBody(interactions.CreateModelInteraction{
                Model: interactions.Model("gemini-3.8-flash"),
                Input: interactions.NewInteractionsInput("Provide a list of 3 famous physicists and their key contributions"),
                GenerationConfig: &interactions.GenerationConfig{
                    ThinkingLevel: interactions.ThinkingLevelLow.ToPointer(),
                },
            }),
        })
        if err != nil {
            log.Fatal(err)
        }

        if res.Interaction.OutputText != nil {
            fmt.Println(*res.Interaction.OutputText)
        }
    }

### REST

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
        "model": "gemini-3.8-flash",
        "input": "What is the sum of the first 50 prime numbers?",
        "generation_config": {
          "thinking_summaries": "auto"
        }
      }'

A thought block may contain **only a signature with no summary** in these cases:

- Simple requests, where the model didn't reason enough to generate a summary
- `thinking_summaries: "none"`, where summaries are explicitly disabled
- Certain thought content types, such as images, may not have text summaries

Your code should always handle thought blocks where `summary` is empty or absent.

## Streaming with thinking

Use streaming to receive incremental thought summaries during generation.
Thought blocks are delivered using Server-Sent Events (SSE) with two distinct
delta types:

| Delta type | Contains | When sent |
|---|---|---|
| `thought_summary` | Text or image summary content | One or more deltas with incremental summary |
| `thought_signature` | The cryptographic signature | the last delta before `step.stop` |

### Python

    from google import genai

    client = genai.Client()

    prompt = """
    Alice, Bob, and Carol each live in a different house on the same street: red, green, and blue.
    Alice does not live in the red house.
    Bob does not live in the green house.
    Carol does not live in the red or green house.
    Which house does each person live in?
    """

    thoughts = ""
    answer = ""

    stream = client.interactions.create(
        model="gemini-3.8-flash",
        input=prompt,
        generation_config={
            "thinking_summaries": "auto"
        },
        stream=True
    )

    for event in stream:
        if event.event_type == "step.delta":
            if event.delta.type == "thought_summary":
                if not thoughts:
                    print("Thinking...")
                summary_text = event.delta.content.text
                print(f"[Thought] {summary_text}", end="")
                thoughts += summary_text
            elif event.delta.type == "text" and event.delta.text:
                if not answer:
                    print("\nAnswer:")
                print(event.delta.text, end="")
                answer += event.delta.text

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    const prompt = `Alice, Bob, and Carol each live in a different house on the same
    street: red, green, and blue. Alice does not live in the red house.
    Bob does not live in the green house.
    Carol does not live in the red or green house.
    Which house does each person live in?`;

    let thoughts = "";
    let answer = "";

    const stream = await client.interactions.create({
        model: "gemini-3.8-flash",
        input: prompt,
        generation_config: {
            thinking_summaries: "auto"
        },
        stream: true
    });

    for await (const event of stream) {
        if (event.event_type === "step.delta") {
            if (event.delta.type === "thought_summary") {
                if (!thoughts) console.log("Thinking...");
                const text = event.delta.content?.text || "";
                process.stdout.write(`[Thought] ${text}`);
                thoughts += text;
            } else if (event.delta.type === "text" && event.delta.text) {
                if (!answer) console.log("\nAnswer:");
                process.stdout.write(event.delta.text);
                answer += event.delta.text;
            }
        }
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.gaos.models.interactions.Content;
    import com.google.genai.gaos.models.interactions.CreateModelInteraction;
    import com.google.genai.gaos.models.interactions.GenerationConfig;
    import com.google.genai.gaos.models.interactions.InteractionSSEEvent;
    import com.google.genai.gaos.models.interactions.InteractionSSEStreamEvent;
    import com.google.genai.gaos.models.interactions.InteractionsInput;
    import com.google.genai.gaos.models.interactions.Model;
    import com.google.genai.gaos.models.interactions.StepDelta;
    import com.google.genai.gaos.models.interactions.StepDeltaData;
    import com.google.genai.gaos.models.interactions.TextContent;
    import com.google.genai.gaos.models.interactions.TextDelta;
    import com.google.genai.gaos.models.interactions.ThinkingSummaries;
    import com.google.genai.gaos.models.interactions.ThoughtSummaryDelta;
    import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;
    import com.google.genai.gaos.models.operations.CreateInteractionResponse;
    import com.google.genai.gaos.utils.EventStream;

    Client client = new Client();

    String prompt =
        "Alice, Bob, and Carol each live in a different house on the same street: red, green, and blue.\n"
            + "Alice does not live in the red house.\n"
            + "Bob does not live in the green house.\n"
            + "Carol does not live in the red or green house.\n"
            + "Which house does each person live in?";

    StringBuilder thoughts = new StringBuilder();
    StringBuilder answer = new StringBuilder();

    CreateModelInteraction params =
        CreateModelInteraction.builder()
            .model(Model.of("gemini-3.8-flash"))
            .input(InteractionsInput.of(prompt))
            .generationConfig(
                GenerationConfig.builder().thinkingSummaries(ThinkingSummaries.AUTO).build())
            .stream(true)
            .build();

    CreateInteractionResponse response =
        client.interactions.create(CreateInteractionRequestBody.of(params));

    try (EventStream<InteractionSSEStreamEvent> stream = response.events()) {
      for (InteractionSSEStreamEvent streamEvent : stream) {
        InteractionSSEEvent event = streamEvent.data().orElse(null);
        if (event instanceof StepDelta stepDelta) {
          StepDeltaData delta = stepDelta.delta().orElse(null);
          if (delta instanceof ThoughtSummaryDelta thoughtDelta) {
            Content content = thoughtDelta.content().orElse(null);
            if (content instanceof TextContent textContent) {
              if (thoughts.length() == 0) {
                System.out.println("Thinking...");
              }
              String summaryText = textContent.text().orElse("");
              System.out.print("[Thought] " + summaryText);
              thoughts.append(summaryText);
            }
          } else if (delta instanceof TextDelta textDelta) {
            String text = textDelta.text().orElse("");
            if (!text.isEmpty()) {
              if (answer.length() == 0) {
                System.out.println("\nAnswer:");
              }
              System.out.print(text);
              answer.append(text);
            }
          }
        }
      }
    }

### Go

    package main

    import (
        "context"
        "fmt"
        "log"

        "google.golang.org/genai"
        "google.golang.org/genai/interactions/models/interactions"
        "google.golang.org/genai/interactions/models/operations"
    )

    func main() {
        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }

        res, err := client.Interactions.Create(ctx, operations.CreateInteractionRequest{
            Body: operations.NewCreateInteractionRequestBody(interactions.CreateModelInteraction{
                Model: interactions.Model("gemini-3.8-flash"),
                Input: interactions.NewInteractionsInput("What is the sum of the first 50 prime numbers?"),
                GenerationConfig: &interactions.GenerationConfig{
                    ThinkingLevel:     interactions.ThinkingLevelHigh.ToPointer(),
                    ThinkingSummaries: interactions.ThinkingSummariesAuto.ToPointer(),
                },
            }),
        })
        if err != nil {
            log.Fatal(err)
        }

        for _, step := range res.Interaction.Steps {
            if thought := step.ThoughtStep; thought != nil {
                for _, part := range thought.Summary {
                    if part.TextContent != nil {
                        fmt.Printf("Thought summary:\n%s\n\n", part.TextContent.Text)
                    }
                }
            }
        }

        if res.Interaction.OutputText != nil {
            fmt.Printf("Answer:\n%s\n", *res.Interaction.OutputText)
        }
    }

### REST

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      --no-buffer \
      -d '{
        "model": "gemini-3.8-flash",
        "input": "Alice, Bob, and Carol each live in a different house on the same street: red, green, and blue. Alice does not live in the red house. Bob does not live in the green house. Carol does not live in the red or green house. Which house does each person live in?",
        "generation_config": {
          "thinking_summaries": "auto"
        },
        "stream": true
      }'

The streaming response uses Server-Sent Events (SSE) and is composed of steps
and events, for example:

    event: interaction.created
    data: {"interaction":{"id":"v1_xxx","status":"in_progress","object":"interaction","model":"gemini-3.8-flash"},"event_type":"interaction.created"}

    event: step.start
    data: {"index":0,"step":{"signature":"","summary":[{"text":"**Evaluating the clues**\n\nI'm considering...","type":"text"}],"type":"thought"},"event_type":"step.start"}

    event: step.delta
    data: {"index":0,"delta":{"signature":"EpoGCpcGAXLI2nx/...","type":"thought_signature"},"event_type":"step.delta"}

    event: step.stop
    data: {"index":0,"event_type":"step.stop"}

    event: step.start
    data: {"index":1,"step":{"content":[{"text":"Based on the clues provided, here","type":"text"}],"type":"model_output"},"event_type":"step.start"}

    event: step.delta
    data: {"index":1,"delta":{"text":" is the answer to your question...","type":"text"},"event_type":"step.delta"}

    event: step.stop
    data: {"index":1,"event_type":"step.stop"}

    event: interaction.completed
    data: {"interaction":{"id":"v1_xxx","status":"completed","usage":{"total_tokens":530,"total_input_tokens":62,"total_output_tokens":171,"total_thought_tokens":297}},"event_type":"interaction.completed"}

    event: done
    data: [DONE]

## Controlling thinking

Gemini models engage in dynamic thinking by default, automatically adjusting
the amount of reasoning effort based on the complexity of the request. You can control this behavior using the `thinking_level` parameter.

| Model | Default Thinking | Levels Supported |
|---|---|---|
| gemini-4-argon | On (medium) | low, medium, high |
| gemini-3.8-flash | On (medium) | low, medium, high |
| gemini-3.6-flash | On (medium) | minimal, low, medium, high |
| gemini-3.5-flash-lite | On (minimal) | minimal, low, medium, high |
| gemini-3.1-pro-preview | On (high) | low, medium, high |
| gemini-3.1-flash-lite-image | On (minimal) | minimal, high |
| gemini-3-flash-preview | On (high) | minimal, low, medium, high |
| gemini-3-pro-preview | On (high) | low, high |
| gemini-2.5-pro | On | low, medium, high |
| gemini-2.5-flash | On | low, medium, high |
| gemini-2.5-flash-lite | Off | low, medium, high |
| gemini-robotics-er-2-preview | On (high) | minimal, low, medium, high |

### Python

    from google import genai

    client = genai.Client()

    interaction = client.interactions.create(
        model="gemini-3.8-flash",
        input="Provide a list of 3 famous physicists and their key contributions",
        generation_config={
            "thinking_level": "low"
        }
    )
    print(interaction.output_text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    const interaction = await client.interactions.create({
        model: "gemini-3.8-flash",
        input: "Provide a list of 3 famous physicists and their key contributions",
        generation_config: {
            thinking_level: "low"
        }
    });
    console.log(interaction.output_text);

### Java

    import com.google.genai.Client;
    import com.google.genai.gaos.models.interactions.CreateModelInteraction;
    import com.google.genai.gaos.models.interactions.GenerationConfig;
    import com.google.genai.gaos.models.interactions.Interaction;
    import com.google.genai.gaos.models.interactions.InteractionsInput;
    import com.google.genai.gaos.models.interactions.Model;
    import com.google.genai.gaos.models.interactions.ThinkingLevel;
    import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;

    Client client = new Client();

    CreateModelInteraction params =
        CreateModelInteraction.builder()
            .model(Model.of("gemini-3.8-flash"))
            .input(
                InteractionsInput.of(
                    "Provide a list of 3 famous physicists and their key contributions"))
            .generationConfig(GenerationConfig.builder().thinkingLevel(ThinkingLevel.LOW).build())
            .build();

    Interaction interaction =
        client.interactions.create(CreateInteractionRequestBody.of(params)).interaction().get();

    System.out.println(interaction.outputText().orElse(""));

### Go

    package main

    import (
        "context"
        "fmt"
        "log"

        "google.golang.org/genai"
        "google.golang.org/genai/interactions/models/interactions"
        "google.golang.org/genai/interactions/models/operations"
    )

    func main() {
        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }

        res, err := client.Interactions.Create(ctx, operations.CreateInteractionRequest{
            Body: operations.NewCreateInteractionRequestBody(interactions.CreateModelInteraction{
                Model: interactions.Model("gemini-3.8-pro"),
                Input: interactions.NewInteractionsInput("What is the sum of the first 50 prime numbers?"),
                GenerationConfig: &interactions.GenerationConfig{
                    ThinkingLevel:     interactions.ThinkingLevelHigh.ToPointer(),
                    ThinkingSummaries: interactions.ThinkingSummariesAuto.ToPointer(),
                },
                Stream: genai.Ptr(true),
            }),
        })
        if err != nil {
            log.Fatal(err)
        }
        stream := res.InteractionSSEStreamEvent
        defer stream.Close()

        for stream.Next() {
            event := stream.Value()
            if stepDelta := event.GetDataStepDelta(); stepDelta != nil {
                if thoughtDelta := stepDelta.GetDeltaThoughtSummary(); thoughtDelta != nil {
                    if textContent := thoughtDelta.GetContentText(); textContent != nil {
                        fmt.Printf("[Thought Summary] %s\n", textContent.Text)
                    }
                }
                if textDelta := stepDelta.GetDeltaText(); textDelta != nil {
                    fmt.Print(textDelta.GetText())
                }
            }
        }
        if err := stream.Err(); err != nil {
            log.Fatal(err)
        }
    }

### REST

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
        "model": "gemini-3.8-flash",
        "input": "Provide a list of 3 famous physicists and their key contributions",
        "generation_config": {
          "thinking_level": "low"
        }
      }'

### Token limits and `max_output_tokens`

The [`max_output_tokens`](https://ai.google.dev/api/interactions-api#request-body) generation
parameter sets the maximum number of tokens a response can generate, including
thought tokens.

When set, this parameter acts as a hard cutoff enforced by the infrastructure
without changing how the model allocates its thinking budget
(`thinking_level`).

If the model hits this limit while reasoning, it stops generating with status
`"incomplete"` and returns truncated or empty output (while still billing for
any thinking tokens generated). To reduce cost or latency without truncating
responses, lower `thinking_level` (`low` or `medium`) instead of setting a
small `max_output_tokens`.

For Gemini 4 models (`gemini-4-argon`), keep the following context and output limits in mind:

- **Shared 1M context window:** Input, thinking, and output tokens share a single 1M-token context window (`1,048,576` tokens). If your input tokens plus `max_output_tokens` exceed 1,048,576 tokens, the API automatically caps the output limit to the remaining space in the context window (`1,048,576` minus your input tokens).
- **Default synchronous output cap (64K):** When `background=False` (for both streaming and non-streaming requests), the default and maximum `max_output_tokens` cap is `65,536` tokens. Setting `max_output_tokens > 65536` with `background=False` returns a `400` error.
- **Long decode (up to 1M tokens):** To allow Gemini 4 to reason and generate beyond `65,536` tokens (up to `1,048,576` tokens), set `background=True` and configure `max_output_tokens` greater than `65,536`. See [Long decode](https://ai.google.dev/gemini-api/docs/long-decode) for details.

## Thought signatures

Thought signatures are encrypted representations of the model's internal reasoning. They are required to maintain reasoning continuity across multi-turn interactions.

The Interactions API makes handling thought signatures much simpler than the `generateContent` API.

### Stateful mode (Recommended)

By default, when you use the Interactions API in stateful mode (by setting `store: true` and passing the `previous_interaction_id` in subsequent turns), the server automatically manages the conversation state, including all thought blocks and signatures. In this mode, you do not need to do anything regarding signatures. They are handled entirely on the server side.

### Stateless mode

If you are managing the conversation state yourself (stateless mode) and passing the full history of inputs and outputs in each request:

- You **MUST** always resend all `thought` blocks exactly as they were received from the model.
- You should **NOT** remove or modify thought blocks from the history, as they contain the signatures required for the model to continue its reasoning.
- When switching models within a session, you should still resend the previous model's thought blocks. The backend manages compatibility.

> [!NOTE]
> **Note:** Built-in tools such as Google Search can carry their own distinct signatures on the call/result blocks. In stateless mode, you must also resend these tool result signatures in subsequent turns.

## Pricing

When thinking is turned on, response pricing is the sum of output
tokens and thinking tokens. You can get the total number of generated thinking
tokens from the `total_thought_tokens` field.

### Python

    print("Thoughts tokens:", interaction.usage.total_thought_tokens)
    print("Output tokens:", interaction.usage.total_output_tokens)

### JavaScript

    console.log(`Thoughts tokens: ${interaction.usage.total_thought_tokens}`);
    console.log(`Output tokens: ${interaction.usage.total_output_tokens}`);

### Java

    import com.google.genai.Client;
    import com.google.genai.gaos.models.interactions.CreateModelInteraction;
    import com.google.genai.gaos.models.interactions.Interaction;
    import com.google.genai.gaos.models.interactions.InteractionsInput;
    import com.google.genai.gaos.models.interactions.Model;
    import com.google.genai.gaos.models.interactions.Usage;
    import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;

    Client client = new Client();

    CreateModelInteraction params =
        CreateModelInteraction.builder()
            .model(Model.of("gemini-3.8-flash"))
            .input(InteractionsInput.of("Explain the concept of Occam's Razor."))
            .build();

    Interaction interaction =
        client.interactions.create(CreateInteractionRequestBody.of(params)).interaction().get();

    if (interaction.usage().isPresent()) {
      Usage usage = interaction.usage().get();
      System.out.println("Thoughts tokens: " + usage.totalThoughtTokens().orElse(0));
      System.out.println("Output tokens: " + usage.totalOutputTokens().orElse(0));
    }

### Go

    package main

    import (
        "context"
        "fmt"
        "log"

        "google.golang.org/genai"
        "google.golang.org/genai/interactions/models/interactions"
        "google.golang.org/genai/interactions/models/operations"
    )

    func main() {
        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }

        // Turn 1: Execute a reasoning + tool use interaction
        turn1, err := client.Interactions.Create(ctx, operations.CreateInteractionRequest{
            Body: operations.NewCreateInteractionRequestBody(interactions.CreateModelInteraction{
                Model: interactions.Model("gemini-3.8-pro"),
                Input: interactions.NewInteractionsInput("Compare the GDP growth of Japan and Germany in 2025."),
                Tools: []interactions.Tool{
                    interactions.NewTool(interactions.GoogleSearch{}),
                },
                GenerationConfig: &interactions.GenerationConfig{
                    ThinkingLevel: interactions.ThinkingLevelHigh.ToPointer(),
                },
            }),
        })
        if err != nil {
            log.Fatal(err)
        }

        // Turn 2: Pass PreviousInteractionID so thought signatures are automatically preserved
        turn2, err := client.Interactions.Create(ctx, operations.CreateInteractionRequest{
            Body: operations.NewCreateInteractionRequestBody(interactions.CreateModelInteraction{
                Model:                 interactions.Model("gemini-3.8-pro"),
                PreviousInteractionID: turn1.Interaction.ID,
                Input:                 interactions.NewInteractionsInput("Now summarize that comparison in a 3-row markdown table."),
            }),
        })
        if err != nil {
            log.Fatal(err)
        }

        if turn2.Interaction.OutputText != nil {
            fmt.Println(*turn2.Interaction.OutputText)
        }
    }

Thinking models generate full thoughts to improve the quality of the final
response, and then output [summaries](https://ai.google.dev/gemini-api/docs/thinking#summaries) to provide insight into the
thought process. Pricing is based on the full thought tokens the model needs to
generate, despite only the summary being output from the API.

> [!NOTE]
> **Note:** Because `max_output_tokens` applies to the combined total of thinking tokens and output tokens, setting a low limit can truncate responses. See [Token limits and `max_output_tokens`](https://ai.google.dev/gemini-api/docs/thinking#token-limits) for details.

You can learn more about tokens in the [Token counting](https://ai.google.dev/gemini-api/docs/tokens) guide.

## Best practices

Use thinking models efficiently by following these guidelines.

- **Review reasoning**: Analyze thought summaries to understand failures and improve prompts.
- **Control thinking budget**: Prompt the model to think less for lengthy outputs to save tokens.
- **Simple tasks**: Use minimal or low thinking for fact retrieval or classification (e.g., "Where was DeepMind founded?").
- **Moderate tasks**: Use default thinking for comparing concepts or creative reasoning (e.g., Compare electric and hybrid cars).
- **Complex tasks**: Use maximum thinking for advanced coding, math, or multi-step planning (e.g., Solve AIME math problems).

## What's next

- [Text generation](https://ai.google.dev/gemini-api/docs/text-generation): Basic text responses
- [Function calling](https://ai.google.dev/gemini-api/docs/function-calling): Connect to tools
- [Gemini 4 guide](https://ai.google.dev/gemini-api/docs/latest-model): What's new in Gemini 4
- [Gemini 3 guide](https://ai.google.dev/gemini-api/docs/gemini-3): Model-specific features