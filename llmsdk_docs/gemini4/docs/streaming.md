> Source: https://ai.google.dev/gemini-api/docs/streaming.md.txt (snapshot 2026-10-14)

When creating an Interaction, you can set `stream: true` to incrementally stream the response using [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) (SSE).

### Python

    from google import genai

    client = genai.Client()

    stream = client.interactions.create(
        model="gemini-3.8-flash",
        input="Count from 1 to 25.",
        stream=True,
    )
    for event in stream:
        if event.event_type == "step.delta":
            if event.delta.type == "text":
                print(event.delta.text, end="", flush=True)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    const stream = await client.interactions.create({
        model: "gemini-3.8-flash",
        input: "Count from 1 to 25.",
        stream: true,
    });
    for await (const event of stream) {
        if (event.event_type === "step.delta") {
            if (event.delta.type === "text") {
                process.stdout.write(event.delta.text);
            }
        }
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.gaos.models.interactions.CreateModelInteraction;
    import com.google.genai.gaos.models.interactions.InteractionSSEEvent;
    import com.google.genai.gaos.models.interactions.InteractionSSEStreamEvent;
    import com.google.genai.gaos.models.interactions.InteractionsInput;
    import com.google.genai.gaos.models.interactions.Model;
    import com.google.genai.gaos.models.interactions.StepDelta;
    import com.google.genai.gaos.models.interactions.StepDeltaData;
    import com.google.genai.gaos.models.interactions.TextDelta;
    import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;
    import com.google.genai.gaos.models.operations.CreateInteractionResponse;
    import com.google.genai.gaos.utils.EventStream;

    Client client = new Client();

    CreateModelInteraction params =
        CreateModelInteraction.builder()
            .model(Model.of("gemini-3.8-flash"))
            .input(InteractionsInput.of("Count from 1 to 25."))
            .stream(true)
            .build();

    CreateInteractionResponse response =
        client.interactions.create(CreateInteractionRequestBody.of(params));

    try (EventStream<InteractionSSEStreamEvent> events = response.events()) {
      for (InteractionSSEStreamEvent streamEvent : events) {
        InteractionSSEEvent event = streamEvent.data().orElse(null);
        if (event instanceof StepDelta stepDelta) {
          StepDeltaData data = stepDelta.delta().orElse(null);
          if (data instanceof TextDelta textDelta) {
            textDelta.text().ifPresent(System.out::print);
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
                Model:  interactions.Model("gemini-3.8-flash"),
                Input:  interactions.NewInteractionsInput("Explain quantum computing in simple terms."),
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
      -H "Content-Type: application/json" \
      --no-buffer \
      -d '{
        "model": "gemini-3.8-flash",
        "input": "Count from 1 to 25.",
        "stream": true
      }'

    event: interaction.created
    data: {"interaction":{"id":"v1_...","status":"in_progress","object":"interaction","model":"gemini-3.8-flash"},"event_type":"interaction.created"}

    event: interaction.status_update
    data: {"interaction_id":"v1_...","status":"in_progress","event_type":"interaction.status_update"}

    event: step.start
    data: {"index":0,"step":{"type":"thought"},"event_type":"step.start"}

    event: step.delta
    data: {"index":0,"delta":{"signature":"...","type":"thought_signature"},"event_type":"step.delta"}

    event: step.stop
    data: {"index":0,"event_type":"step.stop"}

    event: step.start
    data: {"index":1,"step":{"type":"model_output"},"event_type":"step.start"}

    event: step.delta
    data: {"index":1,"delta":{"text":"1, 2, 3, 4, 5, 6, ","type":"text"},"event_type":"step.delta"}

    event: step.delta
    data: {"index":1,"delta":{"text":"7, 8, 9, 10, 11, 12, 13,","type":"text"},"event_type":"step.delta"}

    ...

    event: step.stop
    data: {"index":1,"event_type":"step.stop"}

    event: interaction.completed
    data: {"interaction":{"id":"v1_...","status":"completed","usage":{"total_tokens":346,"total_input_tokens":11,"input_tokens_by_modality":[{"modality":"text","tokens":11}],"total_cached_tokens":0,"total_output_tokens":90,"total_tool_use_tokens":0,"total_thought_tokens":245},"created":"2026-05-12T18:44:51Z","updated":"2026-05-12T18:44:51Z","service_tier":"standard","object":"interaction","model":"gemini-3.8-flash"},"event_type":"interaction.completed"}

    event: done
    data: [DONE]

## Event types

Each server-sent event includes a named `event_type` and associated JSON data. The Interactions API uses a symmetric streaming model where all content---text, tool calls, thinking---flows through a consistent **step-based** event.

Each stream follows this event flow:

1. `interaction.created`: The interaction is created, includes metadata (ID, model, status).
2. A series of **steps** , each consisting of:
   - A `step.start` event, indicating the step type (e.g., `model_output`, `thought`, `function_call`).
   - One or more `step.delta` events with incremental data for that step.
   - A `step.stop` event marking the step as complete.
3. An `interaction.completed` event with final `usage` statistics.

When you set `stream: false`, the API returns a single `interaction` object with a `steps` array. Each element in `steps` is the fully assembled version of one `step.start` → `step.delta`(s) → `step.stop` cycle.

### `interaction.created`

Sent when the interaction is first created. Contains the interaction ID, model, and initial status.

    event: interaction.created
    data: {"interaction": {"id": "...", "model": "gemini-3.8-flash", "status": "in_progress", "object": "interaction"}, "event_type": "interaction.created"}

### `interaction.status_update`

Signals an interaction-level status transition. May appear between steps.

    event: interaction.status_update
    data: {"interaction_id": "...", "status": "in_progress", "event_type": "interaction.status_update"}

### `step.start`

Marks the beginning of a new step. Contains the step `type` and `index`. The step type determines which delta types to expect and how the step appears in a non-streaming response:

| Step Type | Expected Delta Types | Description |
|---|---|---|
| `model_output` | `text`, `image`, `audio` | The model's final response content. |
| `thought` | `thought_signature`, `thought_summary` | Chain-of-thought reasoning. `summary` is only present when `thinking_summaries` is enabled. |
| `function_call` | `arguments_delta` | A request for the client to execute a function. Sets interaction status to `requires_action`. |
| Server-side tools | Varies by tool | Tools executed by the API (e.g., `google_search_call`, `google_search_result`, `code_execution_call`, `code_execution_result`). |

See the [Interactions API reference](https://ai.google.dev/api/interactions-api) for the full list.

    event: step.start
    data: {"index": 0, "step": {"type": "model_output"}, "event_type": "step.start"}

For function calls, the step includes the function name, id and empty arguments `{}`.

    event: step.start
    data: {"index": 0, "step": {"type": "function_call", "id":"un6k8t18", "name": "get_weather", "arguments":{}}, "event_type": "step.start"}

### `step.delta`

Incremental data for the current step. The `delta` object contains a `type` field that determines its shape.

**Examples:**

**`text`:** Incremental text token from a `model_output` step:

    event: step.delta
    data: {"index": 0, "delta": {"type": "text", "text": "Hello, my name is Phil"}, "event_type": "step.delta"}

    event: step.delta
    data: {"index": 0, "delta": {"type": "text", "text": ", and I live in Germany." }, "event_type": "step.delta"}

**`image`:** Base64-encoded image data from a `model_output` step:

    event: step.delta
    data: {"index": 0, "delta": {"type": "image", "mime_type": "image/jpeg", "data": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCg..."}, "event_type": "step.delta"}

**`thought_summary`:** Thinking summary content from a `thought` step:

    event: step.delta
    data: {"index": 0, "delta": {"type": "thought_summary", "content": {"type": "text", "text": "I need to find the GCD..."}}, "event_type": "step.delta"}

**`arguments_delta`:** (Partial) JSON string for function call arguments. Must be accumulated across deltas:

    event: step.delta
    data: {"index": 0, "delta": {"type": "arguments_delta", "arguments": "{\"location\": \"San Francisco, CA\"}"}, "event_type": "step.delta"}

These are some of the most common delta types. For the complete list of all delta types, see the [Interactions API reference](https://ai.google.dev/api/interactions-api).

### `step.stop`

Marks the end of a step. Contains the step `index`.

    event: step.stop
    data: {"index": 0, "event_type": "step.stop"}

When using the [Antigravity Agent](https://ai.google.dev/gemini-api/docs/antigravity-agent), the
`step.stop` event may also include usage statistics:

- **`usage`**: The accumulated usage (running total) since the start of the interaction.
- **`step_usage`**: The usage of this specific step.

    event: step.stop
    data: {"index": 2, "event_type": "step.stop", "usage": {"total_tokens": 4650, "total_input_tokens": 3577, "total_output_tokens": 305, "total_cached_tokens": 0}, "step_usage": {"total_tokens": 303, "total_input_tokens": 31, "total_output_tokens": 3, "total_cached_tokens": 0}}

### `interaction.completed`

Sent when the interaction is finished. Contains the final interaction object with `usage` statistics. In non-streaming mode, this is the top-level response object itself. Does not include `steps` in the response.

    event: interaction.completed
    data: {"interaction": {"id": "v1_abc123", "status": "completed", "usage": {"total_input_tokens": 7, "total_output_tokens": 12, "total_tokens": 19}}, "event_type": "interaction.completed"}

### `error`

Sent when an error occurs during the interaction. Contains an error object with a message and code.

    event: error
    data: {"error":{"message":"Deadline expired before operation could complete.","code":"gateway_timeout"},"event_type":"error"}

## Streaming with tools

The Interactions API supports streaming with both client-side tools (function
calling) and server-side tools (Google Search, Code Execution, etc.) in a single
request. During streaming, tool invocations appear as typed steps in the event
stream. For function calls, the `step.start` event delivers the function name,
and `step.delta` events stream the arguments as JSON strings
(`arguments_delta`). You must accumulate these deltas to get the full arguments.
Server-side tools like Google Search are executed automatically by the API,
producing `google_search_call` and `google_search_result` steps.

### Streaming with function calling

To perform function calling with streaming, the client must handle a multi-turn
conversation:

1. **Turn 1 (Function Request):** Call `interactions.create` with `stream: true` and your defined `tools`. The API will stream a `function_call` step. You must accumulate the incremental argument JSON strings (`arguments_delta`) from `step.delta` events until the interaction completes with the status `requires_action`.
2. **Turn 2 (Sending Result):** Call `interactions.create` again, passing the `previous_interaction_id` (matching the ID of the first interaction) and sending a `function_result` block within the `input` array. This resumes the stream, allowing the model to generate its final response.

### Python

    from google import genai

    client = genai.Client()

    weather_tool = {
        "type": "function",
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state, e.g. San Francisco, CA"
                }
            },
            "required": ["location"]
        }
    }

    # Turn 1: Request function call
    stream = client.interactions.create(
        model="gemini-3.8-flash",
        tools=[weather_tool],
        input="What is the weather in Paris right now?",
        stream=True,
    )

    first_interaction_id = None
    func_call_id = None
    func_call_name = None
    func_args_accumulated = ""

    for event in stream:
        if event.event_type == "interaction.created":
            first_interaction_id = event.interaction.id
        elif event.event_type == "step.start":
            step = event.step
            if step.type == "function_call":
                func_call_id = step.id
                func_call_name = step.name
        elif event.event_type == "step.delta":
            if event.delta.type == "arguments_delta":
                func_args_accumulated += event.delta.arguments

    # Turn 2: Execute tool and send the result back to resume stream
    if func_call_id:
        # Execute weather_tool using accumulated arguments
        dummy_result = {
            "content": [{"type": "text", "text": '{"weather": "Sunny and 22°C"}'}]
        }

        stream2 = client.interactions.create(
            model="gemini-3.8-flash",
            previous_interaction_id=first_interaction_id,
            input=[{
                "type": "function_result",
                "name": func_call_name,
                "call_id": func_call_id,
                "result": dummy_result
            }],
            stream=True,
        )

        for event in stream2:
            if event.event_type == "step.delta":
                if event.delta.type == "text":
                    print(event.delta.text, end="", flush=True)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    const weatherTool = {
        type: "function",
        name: "get_weather",
        description: "Get the current weather in a given location",
        parameters: {
            type: "object",
            properties: {
                location: {
                    type: "string",
                    description: "The city and state, e.g. San Francisco, CA"
                }
            },
            required: ["location"]
        }
    };

    // Turn 1: Request function call
    const stream = await client.interactions.create({
        model: "gemini-3.8-flash",
        tools: [weatherTool],
        input: "What is the weather in Paris right now?",
        stream: true,
    });

    let firstInteractionId = null;
    let funcCallId = null;
    let funcCallName = null;
    let funcArgsAccumulated = "";

    for await (const event of stream) {
        if (event.event_type === "interaction.created") {
            firstInteractionId = event.interaction.id;
        } else if (event.event_type === "step.start") {
            const step = event.step;
            if (step.type === "function_call") {
                funcCallId = step.id;
                funcCallName = step.name;
            }
        } else if (event.event_type === "step.delta") {
            if (event.delta.type === "arguments_delta") {
                funcArgsAccumulated += event.delta.arguments;
            }
        }
    }

    // Turn 2: Execute tool and send the result back to resume stream
    if (funcCallId && firstInteractionId && funcCallName) {
        const dummyResult = {
            content: [{ type: "text", text: '{"weather": "Sunny and 22°C"}' }]
        };

        const stream2 = await client.interactions.create({
            model: "gemini-3.8-flash",
            previous_interaction_id: firstInteractionId,
            input: [{
                type: "function_result",
                name: funcCallName,
                call_id: funcCallId,
                result: dummyResult
            }],
            stream: true,
        });

        for await (const event of stream2) {
            if (event.event_type === "step.delta") {
                if (event.delta.type === "text") {
                    process.stdout.write(event.delta.text);
                }
            }
        }
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.gaos.models.interactions.ArgumentsDelta;
    import com.google.genai.gaos.models.interactions.CreateModelInteraction;
    import com.google.genai.gaos.models.interactions.Function;
    import com.google.genai.gaos.models.interactions.FunctionCallStep;
    import com.google.genai.gaos.models.interactions.FunctionResultStep;
    import com.google.genai.gaos.models.interactions.FunctionResultStepResultUnion;
    import com.google.genai.gaos.models.interactions.InteractionCreatedEvent;
    import com.google.genai.gaos.models.interactions.InteractionSSEEvent;
    import com.google.genai.gaos.models.interactions.InteractionSSEStreamEvent;
    import com.google.genai.gaos.models.interactions.InteractionSseEventInteraction;
    import com.google.genai.gaos.models.interactions.InteractionsInput;
    import com.google.genai.gaos.models.interactions.Model;
    import com.google.genai.gaos.models.interactions.Step;
    import com.google.genai.gaos.models.interactions.StepDelta;
    import com.google.genai.gaos.models.interactions.StepDeltaData;
    import com.google.genai.gaos.models.interactions.StepStart;
    import com.google.genai.gaos.models.interactions.TextContent;
    import com.google.genai.gaos.models.interactions.TextDelta;
    import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;
    import com.google.genai.gaos.models.operations.CreateInteractionResponse;
    import com.google.genai.gaos.utils.EventStream;
    import java.util.Arrays;
    import java.util.HashMap;
    import java.util.Map;

    Client client = new Client();

    Map<String, Object> locationProp = new HashMap<>();
    locationProp.put("type", "string");
    locationProp.put("description", "The city and state, e.g. San Francisco, CA");

    Map<String, Object> properties = new HashMap<>();
    properties.put("location", locationProp);

    Map<String, Object> parameters = new HashMap<>();
    parameters.put("type", "object");
    parameters.put("properties", properties);
    parameters.put("required", Arrays.asList("location"));

    Function weatherTool =
        Function.builder()
            .name("get_weather")
            .description("Get the current weather in a given location")
            .parameters(parameters)
            .build();

    // Turn 1: Request function call
    CreateModelInteraction params =
        CreateModelInteraction.builder()
            .model(Model.of("gemini-3.8-flash"))
            .tools(Arrays.asList(weatherTool))
            .input(InteractionsInput.of("What is the weather in Paris right now?"))
            .stream(true)
            .build();

    CreateInteractionResponse response =
        client.interactions.create(CreateInteractionRequestBody.of(params));

    String firstInteractionId = null;
    String funcCallId = null;
    String funcCallName = null;
    StringBuilder funcArgsAccumulated = new StringBuilder();

    try (EventStream<InteractionSSEStreamEvent> stream = response.events()) {
      for (InteractionSSEStreamEvent streamEvent : stream) {
        InteractionSSEEvent event = streamEvent.data().orElse(null);
        if (event instanceof InteractionCreatedEvent createdEvent) {
          firstInteractionId =
              createdEvent.interaction().flatMap(InteractionSseEventInteraction::id).orElse(null);
        } else if (event instanceof StepStart stepStart) {
          Step step = stepStart.step().orElse(null);
          if (step instanceof FunctionCallStep fcStep) {
            funcCallId = fcStep.id().orElse(null);
            funcCallName = fcStep.name().orElse(null);
          }
        } else if (event instanceof StepDelta stepDelta) {
          StepDeltaData delta = stepDelta.delta().orElse(null);
          if (delta instanceof ArgumentsDelta argsDelta) {
            funcArgsAccumulated.append(argsDelta.arguments().orElse(""));
          }
        }
      }
    }

    // Turn 2: Execute tool and send the result back to resume stream
    if (funcCallId != null && firstInteractionId != null && funcCallName != null) {
      FunctionResultStep resultStep =
          FunctionResultStep.builder()
              .name(funcCallName)
              .callId(funcCallId)
              .result(
                  FunctionResultStepResultUnion.of(
                      Arrays.asList(TextContent.builder().text("{\"weather\": \"Sunny and 22°C\"}").build())))
              .build();

      CreateModelInteraction params2 =
          CreateModelInteraction.builder()
              .model(Model.of("gemini-3.8-flash"))
              .previousInteractionId(firstInteractionId)
              .input(InteractionsInput.ofStep(Arrays.asList(resultStep)))
              .stream(true)
              .build();

      CreateInteractionResponse response2 =
          client.interactions.create(CreateInteractionRequestBody.of(params2));

      try (EventStream<InteractionSSEStreamEvent> stream2 = response2.events()) {
        for (InteractionSSEStreamEvent streamEvent : stream2) {
          InteractionSSEEvent event = streamEvent.data().orElse(null);
          if (event instanceof StepDelta stepDelta) {
            StepDeltaData delta = stepDelta.delta().orElse(null);
            if (delta instanceof TextDelta textDelta) {
              textDelta.text().ifPresent(System.out::print);
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
                Model: interactions.Model("gemini-3.8-pro"),
                Input: interactions.NewInteractionsInput("Solve the Monty Hall problem step-by-step."),
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
                        fmt.Printf("[Thought] %s\n", textContent.Text)
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

**Turn 1:** Request function call

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      --no-buffer \
      -d '{
        "model": "gemini-3.8-flash",
        "input": "What is the weather in Paris right now?",
        "stream": true,
        "tools": [
          {
            "type": "function",
            "name": "get_weather",
            "description": "Get the current weather in a given location",
            "parameters": {
              "type": "object",
              "properties": {
                "location": {
                  "type": "string",
                  "description": "The city and state, e.g. San Francisco, CA"
                }
              },
              "required": ["location"]
            }
          }
        ]
      }'

**Turn 2:** Send the function result using the `previous_interaction_id` and `call_id` from Turn 1

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      --no-buffer \
      -d '{
        "model": "gemini-3.8-flash",
        "previous_interaction_id": "v1_ChdGUVFJYXBXVUdLVEF4TjhQ...",
        "stream": true,
        "input": [
          {
            "type": "function_result",
            "name": "get_weather",
            "call_id": "CALL_ID",
            "result": {
              "content": [
                {
                  "type": "text",
                  "text": "{\"weather\": \"Sunny and 22°C\"}"
                }
              ]
            }
          }
        ]
      }'

### Streaming with multiple tools

The following example uses both a `function` tool and `google_search` in one request:

### Python

    from google import genai

    client = genai.Client()

    tools = [
        {"type": "google_search"},
        {
            "type": "function",
            "name": "get_weather",
            "description": "Get the current weather in a given location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA"
                    }
                },
                "required": ["location"]
            }
        }
    ]

    stream = client.interactions.create(
        model="gemini-3.8-flash",
        tools=tools,
        input="Search what is the largest mountain in Europe and what the weather is there right now?",
        stream=True,
    )
    for event in stream:
        if event.event_type == "step.start":
            step = event.step
            print(f"\n--- Step {event.index}: {step.type} ---")
            # Show details for tool steps
            if step.type == "google_search_call":
                print(f"  Search ID: {step.id}")
            elif step.type == "google_search_result":
                print(f"  Result for: {step.call_id}")
            elif step.type == "function_call":
                print(f"  Function: {step.name}({step.arguments})")
        elif event.event_type == "step.delta":
            if event.delta.type == "text":
                print(event.delta.text, end="", flush=True)
            elif event.delta.type == "google_search_call":
                print(f"  Queries: {event.delta.arguments}")
            elif event.delta.type == "arguments_delta":
                print(f"  Args chunk: {event.delta.arguments}", end="", flush=True)
        elif event.event_type == "interaction.completed":
            print(f"\n\nStatus: {event.interaction.status}")
            if event.interaction.status == "requires_action":
                print("Action required: provide function call results to continue.")

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    const tools = [
        { type: "google_search" },
        {
            type: "function",
            name: "get_weather",
            description: "Get the current weather in a given location",
            parameters: {
                type: "object",
                properties: {
                    location: {
                        type: "string",
                        description: "The city and state, e.g. San Francisco, CA"
                    }
                },
                required: ["location"]
            }
        }
    ];

    const stream = await client.interactions.create({
        model: "gemini-3.8-flash",
        tools: tools,
        input: "Search what is the largest mountain in Europe and what the weather is there right now?",
        stream: true,
    });
    for await (const event of stream) {
        if (event.event_type === "step.start") {
            const step = event.step;
            console.log(`\n--- Step ${event.index}: ${step.type} ---`);
            // Show details for tool steps
            if (step.type === "google_search_call") {
                console.log(`  Search ID: ${step.id}`);
            } else if (step.type === "google_search_result") {
                console.log(`  Result for: ${step.call_id}`);
            } else if (step.type === "function_call") {
                console.log(`  Function: ${step.name}(${JSON.stringify(step.arguments)})`);
            }
        } else if (event.event_type === "step.delta") {
            if (event.delta.type === "text") {
                process.stdout.write(event.delta.text);
            } else if (event.delta.type === "google_search_call") {
                console.log(`  Queries: ${JSON.stringify(event.delta.arguments?.queries)}`);
            } else if (event.delta.type === "arguments_delta") {
                process.stdout.write(`  Args chunk: ${event.delta.arguments}`);
            }
        } else if (event.event_type === "interaction.completed") {
            console.log(`\n\nStatus: ${event.interaction.status}`);
            if (event.interaction.status === "requires_action") {
                console.log("Action required: provide function call results to continue.");
            }
        }
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.gaos.models.interactions.ArgumentsDelta;
    import com.google.genai.gaos.models.interactions.CreateModelInteraction;
    import com.google.genai.gaos.models.interactions.Function;
    import com.google.genai.gaos.models.interactions.FunctionCallStep;
    import com.google.genai.gaos.models.interactions.GoogleSearch;
    import com.google.genai.gaos.models.interactions.GoogleSearchCallDelta;
    import com.google.genai.gaos.models.interactions.GoogleSearchCallStep;
    import com.google.genai.gaos.models.interactions.GoogleSearchResultStep;
    import com.google.genai.gaos.models.interactions.InteractionCompletedEvent;
    import com.google.genai.gaos.models.interactions.InteractionSSEEvent;
    import com.google.genai.gaos.models.interactions.InteractionSSEStreamEvent;
    import com.google.genai.gaos.models.interactions.InteractionSseEventInteractionStatus;
    import com.google.genai.gaos.models.interactions.InteractionsInput;
    import com.google.genai.gaos.models.interactions.Model;
    import com.google.genai.gaos.models.interactions.Step;
    import com.google.genai.gaos.models.interactions.StepDelta;
    import com.google.genai.gaos.models.interactions.StepDeltaData;
    import com.google.genai.gaos.models.interactions.StepStart;
    import com.google.genai.gaos.models.interactions.TextDelta;
    import com.google.genai.gaos.models.interactions.Tool;
    import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;
    import com.google.genai.gaos.models.operations.CreateInteractionResponse;
    import com.google.genai.gaos.utils.EventStream;
    import java.util.Arrays;
    import java.util.Collections;
    import java.util.HashMap;
    import java.util.List;
    import java.util.Map;

    Client client = new Client();

    Map<String, Object> locationProp = new HashMap<>();
    locationProp.put("type", "string");
    locationProp.put("description", "The city and state, e.g. San Francisco, CA");

    Map<String, Object> properties = new HashMap<>();
    properties.put("location", locationProp);

    Map<String, Object> parameters = new HashMap<>();
    parameters.put("type", "object");
    parameters.put("properties", properties);
    parameters.put("required", Arrays.asList("location"));

    List<Tool> tools =
        Arrays.asList(
            new GoogleSearch(),
            Function.builder()
                .name("get_weather")
                .description("Get the current weather in a given location")
                .parameters(parameters)
                .build());

    CreateModelInteraction params =
        CreateModelInteraction.builder()
            .model(Model.of("gemini-3.8-flash"))
            .tools(tools)
            .input(
                InteractionsInput.of(
                    "Search what is the largest mountain in Europe and what the weather is there right now?"))
            .stream(true)
            .build();

    CreateInteractionResponse response =
        client.interactions.create(CreateInteractionRequestBody.of(params));

    try (EventStream<InteractionSSEStreamEvent> stream = response.events()) {
      for (InteractionSSEStreamEvent streamEvent : stream) {
        InteractionSSEEvent event = streamEvent.data().orElse(null);
        if (event instanceof StepStart stepStart) {
          Step step = stepStart.step().orElse(null);
          if (step != null) {
            System.out.printf("%n--- Step %d: %s ---%n", stepStart.index().orElse(0), step.type());
            if (step instanceof GoogleSearchCallStep searchCall) {
              System.out.println("  Search ID: " + searchCall.id().orElse(""));
            } else if (step instanceof GoogleSearchResultStep searchResult) {
              System.out.println("  Result for: " + searchResult.callId().orElse(""));
            } else if (step instanceof FunctionCallStep fcStep) {
              System.out.printf(
                  "  Function: %s(%s)%n",
                  fcStep.name().orElse(""), fcStep.arguments().orElse(Collections.emptyMap()));
            }
          }
        } else if (event instanceof StepDelta stepDelta) {
          StepDeltaData delta = stepDelta.delta().orElse(null);
          if (delta instanceof TextDelta textDelta) {
            textDelta.text().ifPresent(System.out::print);
          } else if (delta instanceof GoogleSearchCallDelta searchDelta) {
            System.out.println("  Queries: " + searchDelta.arguments().orElse(null));
          } else if (delta instanceof ArgumentsDelta argsDelta) {
            System.out.print("  Args chunk: " + argsDelta.arguments().orElse(""));
          }
        } else if (event instanceof InteractionCompletedEvent completedEvent) {
          completedEvent
              .interaction()
              .ifPresent(
                  interaction -> {
                    String status =
                        interaction
                            .status()
                            .map(InteractionSseEventInteractionStatus::value)
                            .orElse("");
                    System.out.println("\n\nStatus: " + status);
                    if ("requires_action".equals(status)) {
                      System.out.println("Action required: provide function call results to continue.");
                    }
                  });
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

        weatherTool := interactions.NewTool(interactions.Function{
            Name:        genai.Ptr("get_weather"),
            Description: genai.Ptr("Gets the current weather for a given location."),
            Parameters: map[string]any{
                "type": "object",
                "properties": map[string]any{
                    "location": map[string]any{"type": "string"},
                },
                "required": []string{"location"},
            },
        })

        res, err := client.Interactions.Create(ctx, operations.CreateInteractionRequest{
            Body: operations.NewCreateInteractionRequestBody(interactions.CreateModelInteraction{
                Model:  interactions.Model("gemini-3.8-flash"),
                Input:  interactions.NewInteractionsInput("What is the weather in Tokyo and Paris?"),
                Tools:  []interactions.Tool{weatherTool},
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
            if stepStart := event.GetDataStepStart(); stepStart != nil {
                if call := stepStart.GetStepFunctionCall(); call != nil {
                    fmt.Printf("\n[Function Call Started] %s (id: %s)\n", call.Name, call.ID)
                }
            }
            if stepDelta := event.GetDataStepDelta(); stepDelta != nil {
                if argsDelta := stepDelta.GetDeltaArgumentsDelta(); argsDelta != nil && argsDelta.Arguments != nil {
                    fmt.Printf("[Args Delta] %s\n", *argsDelta.Arguments)
                }
                if textDelta := stepDelta.GetDeltaText(); textDelta != nil {
                    fmt.Print(textDelta.GetText())
                }
            }
            if completed := event.GetDataInteractionCompleted(); completed != nil {
                interaction := completed.Interaction
                if interaction.Status == interactions.InteractionSseEventInteractionStatusRequiresAction {
                    fmt.Printf("\nStream paused: Waiting for tool outputs for interaction %s\n", interaction.ID)
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
      -H "Content-Type: application/json" \
      --no-buffer \
      -d '{
        "model": "gemini-3.8-flash",
        "input": "Search what is the largest mountain in Europe and what the weather is there right now?",
        "stream": true,
        "tools": [
          { "type": "google_search" },
          {
            "type": "function",
            "name": "get_weather",
            "description": "Get the current weather in a given location",
            "parameters": {
              "type": "object",
              "properties": {
                "location": {
                  "type": "string",
                  "description": "The city and state, e.g. San Francisco, CA"
                }
              },
              "required": ["location"]
            }
          }
        ]
      }'

    event: interaction.created
    data: {"interaction":{"id":"v1_...","status":"in_progress","object":"interaction","model":"gemini-3.8-flash"},"event_type":"interaction.created"}

    event: interaction.status_update
    data: {"interaction_id":"v1_...","status":"in_progress","event_type":"interaction.status_update"}

    event: step.start
    data: {"index":0,"step":{"id":"mkutnkgn","signature":"","type":"google_search_call"},"event_type":"step.start"}

    event: step.delta
    data: {"index":0,"delta":{"signature":"...","type":"google_search_call","arguments":{"queries":["largest mountain in Europe"]}},"event_type":"step.delta"}

    event: step.stop
    data: {"index":0,"event_type":"step.stop"}

    event: step.start
    data: {"index":1,"step":{"call_id":"mkutnkgn","signature":"","type":"google_search_result"},"event_type":"step.start"}

    event: step.delta
    data: {"index":1,"delta":{"signature":"...","type":"google_search_result","is_error":false},"event_type":"step.delta"}

    event: step.stop
    data: {"index":1,"event_type":"step.stop"}

    event: step.start
    data: {"index":2,"step":{"type":"thought"},"event_type":"step.start"}

    event: step.delta
    data: {"index":2,"delta":{"signature":"...","type":"thought_signature"},"event_type":"step.delta"}

    event: step.stop
    data: {"index":2,"event_type":"step.stop"}

    event: step.start
    data: {"index":3,"step":{"id":"ktr5aysg","type":"function_call","name":"get_weather","arguments":{}},"event_type":"step.start"}

    event: step.delta
    data: {"index":3,"delta":{"arguments":"{\"location\":\"Mount Elbrus, Russia\"}","type":"arguments_delta"},"event_type":"step.delta"}

    event: step.stop
    data: {"index":3,"event_type":"step.stop"}

    event: interaction.completed
    data: {"interaction":{"id":"v1_...","status":"requires_action","usage":{"total_tokens":299,"total_input_tokens":138,"input_tokens_by_modality":[{"modality":"text","tokens":138}],"total_cached_tokens":0,"total_output_tokens":20,"total_tool_use_tokens":0,"total_thought_tokens":141},"created":"2026-05-12T17:24:26Z","updated":"2026-05-12T17:24:26Z","service_tier":"standard","object":"interaction","model":"gemini-3.8-flash"},"event_type":"interaction.completed"}

    event: done
    data: [DONE]

## Streaming with thinking

When the model uses thinking, you'll receive `thought` steps with two distinct delta types: `thought_summary` (incremental text or image summary content), and `thought_signature` (an encrypted representation of the model's internal reasoning, sent as the last delta before `step.stop`). If `thinking_summaries` is enabled, `thought_summary` deltas stream a summary of the model's reasoning. For more details on thinking, see the [Thinking guide](https://ai.google.dev/gemini-api/docs/thinking).

### Python

    from google import genai

    client = genai.Client()

    stream = client.interactions.create(
        model="gemini-3.8-flash",
        input="What is the greatest common divisor of 1071 and 462?",
        generation_config={
            "thinking_summaries": "auto"
        },
        stream=True,
    )
    for event in stream:
        if event.event_type == "step.start":
            print(f"\n--- Step: {event.step.type} ---")
        elif event.event_type == "step.delta":
            if event.delta.type == "thought_summary":
                if event.delta.content.type == "text":
                    print(event.delta.content.text, end="", flush=True)
            elif event.delta.type == "text":
                print(event.delta.text, end="", flush=True)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    const stream = await client.interactions.create({
        model: "gemini-3.8-flash",
        input: "What is the greatest common divisor of 1071 and 462?",
        generation_config: {
            thinking_summaries: "auto",
        },
        stream: true,
    });
    for await (const event of stream) {
        if (event.event_type === "step.start") {
            console.log(`\n--- Step: ${event.step.type} ---`);
        } else if (event.event_type === "step.delta") {
            if (event.delta.type === "thought_summary") {
                if (event.delta.content.type === "text") {
                    process.stdout.write(event.delta.content.text);
                }
            } else if (event.delta.type === "text") {
                process.stdout.write(event.delta.text);
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
    import com.google.genai.gaos.models.interactions.Step;
    import com.google.genai.gaos.models.interactions.StepDelta;
    import com.google.genai.gaos.models.interactions.StepDeltaData;
    import com.google.genai.gaos.models.interactions.StepStart;
    import com.google.genai.gaos.models.interactions.TextContent;
    import com.google.genai.gaos.models.interactions.TextDelta;
    import com.google.genai.gaos.models.interactions.ThinkingSummaries;
    import com.google.genai.gaos.models.interactions.ThoughtSummaryDelta;
    import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;
    import com.google.genai.gaos.models.operations.CreateInteractionResponse;
    import com.google.genai.gaos.utils.EventStream;

    Client client = new Client();

    CreateModelInteraction params =
        CreateModelInteraction.builder()
            .model(Model.of("gemini-3.8-flash"))
            .input(InteractionsInput.of("What is the greatest common divisor of 1071 and 462?"))
            .generationConfig(
                GenerationConfig.builder().thinkingSummaries(ThinkingSummaries.AUTO).build())
            .stream(true)
            .build();

    CreateInteractionResponse response =
        client.interactions.create(CreateInteractionRequestBody.of(params));

    try (EventStream<InteractionSSEStreamEvent> stream = response.events()) {
      for (InteractionSSEStreamEvent streamEvent : stream) {
        InteractionSSEEvent event = streamEvent.data().orElse(null);
        if (event instanceof StepStart stepStart) {
          Step step = stepStart.step().orElse(null);
          if (step != null) {
            System.out.printf("%n--- Step: %s ---%n", step.type());
          }
        } else if (event instanceof StepDelta stepDelta) {
          StepDeltaData delta = stepDelta.delta().orElse(null);
          if (delta instanceof ThoughtSummaryDelta thoughtDelta) {
            Content content = thoughtDelta.content().orElse(null);
            if (content instanceof TextContent textContent) {
              textContent.text().ifPresent(System.out::print);
            }
          } else if (delta instanceof TextDelta textDelta) {
            textDelta.text().ifPresent(System.out::print);
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
                Input: interactions.NewInteractionsInput("What are the top news stories in AI today, and calculate 2^64 - 1?"),
                Tools: []interactions.Tool{
                    interactions.NewTool(interactions.GoogleSearch{}),
                    interactions.NewTool(interactions.CodeExecution{}),
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
            if stepStart := event.GetDataStepStart(); stepStart != nil {
                step := stepStart.Step
                if searchCall := step.GoogleSearchCallStep; searchCall != nil {
                    fmt.Printf("[Google Search Started] id: %s\n", searchCall.ID)
                } else if searchRes := step.GoogleSearchResultStep; searchRes != nil {
                    fmt.Printf("[Google Search Results Received] for call_id: %s\n", searchRes.CallID)
                } else if codeCall := step.CodeExecutionCallStep; codeCall != nil {
                    fmt.Printf("[Code Execution Started] id: %s\n", codeCall.ID)
                } else if codeRes := step.CodeExecutionResultStep; codeRes != nil {
                    fmt.Printf("[Code Execution Finished] output: %s\n", codeRes.Result)
                }
            }
            if stepDelta := event.GetDataStepDelta(); stepDelta != nil {
                if searchDelta := stepDelta.GetDeltaGoogleSearchCall(); searchDelta != nil {
                    fmt.Printf("[Search Queries] %v\n", searchDelta.Arguments.Queries)
                }
                if codeDelta := stepDelta.GetDeltaCodeExecutionCall(); codeDelta != nil {
                    fmt.Printf("[Code Delta] %s\n", codeDelta.Arguments.Code)
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
      -H "Content-Type: application/json" \
      --no-buffer \
      -d '{
        "model": "gemini-3.8-flash",
        "input": "What is the greatest common divisor of 1071 and 462?",
        "stream": true,
        "generation_config": {
          "thinking_summaries": "auto"
        }
      }'

    event: interaction.created
    data: {"interaction":{"id":"v1_...","status":"in_progress","object":"interaction","model":"gemini-3.8-flash"},"event_type":"interaction.created"}

    event: interaction.status_update
    data: {"interaction_id":"v1_...","status":"in_progress","event_type":"interaction.status_update"}

    event: step.start
    data: {"index":0,"step":{"type":"thought"},"event_type":"step.start"}

    event: step.delta
    data: {"index":0,"delta":{"content":{"text":"**Implementing Euclidean Algorithm**\n\nI've just worked through a detailed example applying the Euclidean algorithm to find the GCD of 1071 and 462, confirming its step-by-step nature. The calculations went smoothly, tracking the remainders until zero. My focus is now solidifying the implementation logic, ensuring accuracy and considering potential edge cases. I'll translate this example into code.\n\n\n","type":"text"},"type":"thought_summary"},"event_type":"step.delta"}

    event: step.delta
    data: {"index":0,"delta":{"signature":"...","type":"thought_signature"},"event_type":"step.delta"}

    event: step.stop
    data: {"index":0,"event_type":"step.stop"}

    event: step.start
    data: {"index":1,"step":{"type":"model_output"},"event_type":"step.start"}

    ...

## Streaming with agents

The Interactions API supports agents like Deep Research. Agents use `background=True` and return results asynchronously, but you can also stream agent interactions to receive progress updates and intermediate steps as they happen. For more details, see the [Background execution guide](https://ai.google.dev/gemini-api/docs/background-execution) and the [Deep Research guide](https://ai.google.dev/gemini-api/docs/deep-research).

### Python

    from google import genai

    client = genai.Client()

    stream = client.interactions.create(
        agent="deep-research-preview-04-2026",
        input="Research the latest advances in quantum computing.",
        stream=True,
        background=True,
        agent_config={
            "type": "deep-research",
            "thinking_summaries": "auto"
        }
    )
    for event in stream:
        if event.event_type == "step.start":
            print(f"\n--- Step: {event.step.type} ---")
        elif event.event_type == "step.delta":
            if event.delta.type == "text":
                print(event.delta.text, end="", flush=True)
            elif event.delta.type == "thought_summary":
                if event.delta.content.type == "text":
                    print(event.delta.content.text, end="", flush=True)
        elif event.event_type == "interaction.completed":
            print(f"\n\nTotal Tokens: {event.interaction.usage.total_tokens}")

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    const stream = await client.interactions.create({
        agent: "deep-research-preview-04-2026",
        input: "Research the latest advances in quantum computing.",
        stream: true,
        background: true,
        agent_config: {
            type: "deep-research",
            thinking_summaries: "auto"
        }
    });
    for await (const event of stream) {
        if (event.event_type === "step.start") {
            console.log(`\n--- Step: ${event.step.type} ---`);
        } else if (event.event_type === "step.delta") {
            if (event.delta.type === "text") {
                process.stdout.write(event.delta.text);
            } else if (event.delta.type === "thought_summary") {
                if (event.delta.content.type === "text") {
                    process.stdout.write(event.delta.content.text);
                }
            }
        } else if (event.event_type === "interaction.completed") {
            console.log(`\n\nTotal Tokens: ${event.interaction.usage.total_tokens}`);
        }
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.gaos.models.interactions.Content;
    import com.google.genai.gaos.models.interactions.CreateAgentInteraction;
    import com.google.genai.gaos.models.interactions.DeepResearchAgentConfig;
    import com.google.genai.gaos.models.interactions.InteractionCompletedEvent;
    import com.google.genai.gaos.models.interactions.InteractionSSEEvent;
    import com.google.genai.gaos.models.interactions.InteractionSSEStreamEvent;
    import com.google.genai.gaos.models.interactions.InteractionSseEventInteraction;
    import com.google.genai.gaos.models.interactions.InteractionsInput;
    import com.google.genai.gaos.models.interactions.Step;
    import com.google.genai.gaos.models.interactions.StepDelta;
    import com.google.genai.gaos.models.interactions.StepDeltaData;
    import com.google.genai.gaos.models.interactions.StepStart;
    import com.google.genai.gaos.models.interactions.TextContent;
    import com.google.genai.gaos.models.interactions.TextDelta;
    import com.google.genai.gaos.models.interactions.ThinkingSummaries;
    import com.google.genai.gaos.models.interactions.ThoughtSummaryDelta;
    import com.google.genai.gaos.models.interactions.Usage;
    import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;
    import com.google.genai.gaos.models.operations.CreateInteractionResponse;
    import com.google.genai.gaos.utils.EventStream;

    Client client = new Client();

    CreateAgentInteraction params =
        CreateAgentInteraction.builder()
            .agent("deep-research-preview-04-2026")
            .input(InteractionsInput.of("Research the latest advances in quantum computing."))
            .stream(true)
            .background(true)
            .agentConfig(
                DeepResearchAgentConfig.builder()
                    .thinkingSummaries(ThinkingSummaries.AUTO)
                    .build())
            .build();

    CreateInteractionResponse response =
        client.interactions.create(CreateInteractionRequestBody.of(params));

    try (EventStream<InteractionSSEStreamEvent> stream = response.events()) {
      for (InteractionSSEStreamEvent streamEvent : stream) {
        InteractionSSEEvent event = streamEvent.data().orElse(null);
        if (event instanceof StepStart stepStart) {
          Step step = stepStart.step().orElse(null);
          if (step != null) {
            System.out.printf("%n--- Step: %s ---%n", step.type());
          }
        } else if (event instanceof StepDelta stepDelta) {
          StepDeltaData delta = stepDelta.delta().orElse(null);
          if (delta instanceof TextDelta textDelta) {
            textDelta.text().ifPresent(System.out::print);
          } else if (delta instanceof ThoughtSummaryDelta thoughtDelta) {
            Content content = thoughtDelta.content().orElse(null);
            if (content instanceof TextContent textContent) {
              textContent.text().ifPresent(System.out::print);
            }
          }
        } else if (event instanceof InteractionCompletedEvent completedEvent) {
          completedEvent
              .interaction()
              .flatMap(InteractionSseEventInteraction::usage)
              .flatMap(Usage::totalTokens)
              .ifPresent(tokens -> System.out.println("\n\nTotal Tokens: " + tokens));
        }
      }
    }

### Go

    package main

    import (
        "context"
        "encoding/base64"
        "fmt"
        "log"
        "os"

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
                Model: interactions.Model("gemini-3.1-flash-image-preview"),
                Input: interactions.NewInteractionsInput("Generate a watercolor illustration of a lighthouse at sunset and describe the scene."),
                ResponseFormat: genai.Ptr(interactions.NewCreateModelInteractionResponseFormat([]interactions.ResponseFormat{
                    interactions.NewResponseFormat(interactions.TextResponseFormat{}),
                    interactions.NewResponseFormat(interactions.ImageResponseFormat{}),
                })),
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
                if textDelta := stepDelta.GetDeltaText(); textDelta != nil {
                    fmt.Print(textDelta.GetText())
                }
                if imgDelta := stepDelta.GetDeltaImage(); imgDelta != nil && imgDelta.Data != nil {
                    imageBytes, err := base64.StdEncoding.DecodeString(*imgDelta.Data)
                    if err != nil {
                        log.Fatal(err)
                    }
                    if err := os.WriteFile("lighthouse.png", imageBytes, 0644); err != nil {
                        log.Fatal(err)
                    }
                    fmt.Println("\n[Saved lighthouse.png]")
                }
            }
            if completed := event.GetDataInteractionCompleted(); completed != nil {
                // You can also access the final image using interaction.GetOutputImage() on a non-streamed or retrieved interaction
                fmt.Println("\nGeneration complete!")
            }
        }
        if err := stream.Err(); err != nil {
            log.Fatal(err)
        }
    }

### REST

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      --no-buffer \
      -d '{
        "agent": "deep-research-preview-04-2026",
        "input": "Research the latest advances in quantum computing.",
        "stream": true,
        "background": true,
        "agent_config": {
          "type": "deep-research",
          "thinking_summaries": "auto"
        }
      }'

    event: interaction.created
    data: {"interaction":{"id":"v1_...","status":"in_progress","object":"interaction","agent":"deep-research-preview-04-2026"},"event_type":"interaction.created"}

    event: interaction.status_update
    data: {"interaction_id":"v1_...","status":"in_progress","event_type":"interaction.status_update"}

    event: step.start
    data: {"index":0,"step":{"type":"thought"},"event_type":"step.start"}

    event: step.delta
    data: {"index":0,"delta":{"content":{"text":"***Generating research plan***\n\nTo best answer your request, I'm starting by constructing a comprehensive research plan. This will outline the key areas I need to investigate and the strategy I'll use to connect them."},"type":"thought_summary"},"event_type":"step.delta"}

    ... (additional thought steps) ...

    event: step.stop
    data: {"index":0,"event_type":"step.stop"}

    event: step.start
    data: {"index":1,"step":{"type":"model_output"},"event_type":"step.start"}

    event: step.delta
    data: {"index":1,"delta":{"text":"# The Quantum Inflection Point: Exhaustive Analysis of Hardware, Algorithms, and Market Dynamics in 2026\n\n## Executive Summary\n\n..."},"event_type":"step.delta"}

    event: step.stop
    data: {"index":1,"event_type":"step.stop"}

    event: interaction.completed
    data: {"interaction":{"id":"v1_...","status":"completed","usage":{"total_tokens":1117031,"total_input_tokens":428865,"total_output_tokens":22294,"total_thought_tokens":26213},"created":"2026-05-12T17:24:27Z","updated":"2026-05-12T17:24:27Z","object":"interaction","agent":"deep-research-preview-04-2026"},"event_type":"interaction.completed"}

    event: done
    data: [DONE]

## Streaming image generation

The Interactions API supports streaming multiple output modalities simultaneously. By requesting both `text` and `image` in the `response_format`, you can receive interleaved text and generated images in the same stream.

The following example uses `gemini-3.1-flash-image` (Nano Banana 2) to search for information and generate a story with interleaved illustrations.

### Python

    from google import genai

    client = genai.Client()

    stream = client.interactions.create(
        model="gemini-3.1-flash-image",
        tools=[{"type": "google_search", "search_types": ["web_search", "image_search"]}],
        input="Search for the history of the Colosseum and write a short illustrated story about a gladiator named Marcus. Interleave text and generated images.",
        response_format=[
            {"type": "text"},
            {"type": "image"}
        ],
        stream=True,
    )

    for event in stream:
        if event.event_type == "step.delta":
            if event.delta.type == "text":
                print(event.delta.text, end="", flush=True)
            elif event.delta.type == "image":
                print(f"\n[Image chunk: {len(event.delta.data)} bytes]", end="", flush=True)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    const stream = await client.interactions.create({
        model: "gemini-3.1-flash-image",
        tools: [{ type: "google_search", search_types: ["web_search", "image_search"] }],
        input: "Search for the history of the Colosseum and write a short illustrated story about a gladiator named Marcus. Interleave text and generated images.",
        response_format: [
            { type: "text" },
            { type: "image" }
        ],
        stream: true,
    });

    for await (const event of stream) {
        if (event.event_type === "step.delta") {
            if (event.delta.type === "text") {
                process.stdout.write(event.delta.text);
            } else if (event.delta.type === "image") {
                console.log(`\n[Image chunk: ${event.delta.data.length} bytes]`);
            }
        }
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.gaos.models.interactions.CreateModelInteraction;
    import com.google.genai.gaos.models.interactions.CreateModelInteractionResponseFormat;
    import com.google.genai.gaos.models.interactions.GoogleSearch;
    import com.google.genai.gaos.models.interactions.GoogleSearchSearchType;
    import com.google.genai.gaos.models.interactions.ImageDelta;
    import com.google.genai.gaos.models.interactions.ImageResponseFormat;
    import com.google.genai.gaos.models.interactions.InteractionSSEEvent;
    import com.google.genai.gaos.models.interactions.InteractionSSEStreamEvent;
    import com.google.genai.gaos.models.interactions.InteractionsInput;
    import com.google.genai.gaos.models.interactions.Model;
    import com.google.genai.gaos.models.interactions.ResponseFormat;
    import com.google.genai.gaos.models.interactions.StepDelta;
    import com.google.genai.gaos.models.interactions.StepDeltaData;
    import com.google.genai.gaos.models.interactions.TextDelta;
    import com.google.genai.gaos.models.interactions.TextResponseFormat;
    import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;
    import com.google.genai.gaos.models.operations.CreateInteractionResponse;
    import com.google.genai.gaos.utils.EventStream;
    import java.util.Arrays;

    Client client = new Client();

    CreateModelInteraction params =
        CreateModelInteraction.builder()
            .model(Model.of("gemini-3.1-flash-image"))
            .tools(
                Arrays.asList(
                    GoogleSearch.builder()
                        .searchTypes(
                            Arrays.asList(
                                GoogleSearchSearchType.of("web_search"),
                                GoogleSearchSearchType.of("image_search")))
                        .build()))
            .input(
                InteractionsInput.of(
                    "Search for the history of the Colosseum and write a short illustrated story about a gladiator named Marcus. Interleave text and generated images."))
            .responseFormat(
                CreateModelInteractionResponseFormat.of(
                    Arrays.asList(
                        ResponseFormat.of(TextResponseFormat.builder().build()),
                        ResponseFormat.of(ImageResponseFormat.builder().build()))))
            .stream(true)
            .build();

    CreateInteractionResponse response =
        client.interactions.create(CreateInteractionRequestBody.of(params));

    try (EventStream<InteractionSSEStreamEvent> stream = response.events()) {
      for (InteractionSSEStreamEvent streamEvent : stream) {
        InteractionSSEEvent event = streamEvent.data().orElse(null);
        if (event instanceof StepDelta stepDelta) {
          StepDeltaData delta = stepDelta.delta().orElse(null);
          if (delta instanceof TextDelta textDelta) {
            textDelta.text().ifPresent(System.out::print);
          } else if (delta instanceof ImageDelta imageDelta) {
            imageDelta
                .data()
                .ifPresent(data -> System.out.printf("%n[Image chunk: %d bytes]", data.length()));
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

        var interactionID string
        var lastEventID *string

        res, err := client.Interactions.Create(ctx, operations.CreateInteractionRequest{
            Body: operations.NewCreateInteractionRequestBody(interactions.CreateModelInteraction{
                Model:  interactions.Model("gemini-3.8-pro"),
                Input:  interactions.NewInteractionsInput("Write a detailed 5-section guide to distributed consensus algorithms."),
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
            if created := event.GetDataInteractionCreated(); created != nil {
                interactionID = created.Interaction.ID
                if created.EventID != nil {
                    lastEventID = created.EventID
                }
            }
            if stepDelta := event.GetDataStepDelta(); stepDelta != nil {
                if stepDelta.EventID != nil {
                    lastEventID = stepDelta.EventID
                }
                if textDelta := stepDelta.GetDeltaText(); textDelta != nil {
                    fmt.Print(textDelta.GetText())
                }
            }
        }

        if err := stream.Err(); err != nil {
            fmt.Printf("\nStream interrupted (%v). Resuming...\n", err)
            if interactionID != "" && lastEventID != nil {
                resumedRes, err := client.Interactions.Get(ctx, operations.GetInteractionByIDRequest{
                    ID:          interactionID,
                    Stream:      genai.Ptr(true),
                    LastEventID: lastEventID,
                })
                if err != nil {
                    log.Fatal(err)
                }
                resumedStream := resumedRes.InteractionSSEStreamEvent
                defer resumedStream.Close()

                for resumedStream.Next() {
                    event := resumedStream.Value()
                    if stepDelta := event.GetDataStepDelta(); stepDelta != nil {
                        if textDelta := stepDelta.GetDeltaText(); textDelta != nil {
                            fmt.Print(textDelta.GetText())
                        }
                    }
                }
                if err := resumedStream.Err(); err != nil {
                    log.Fatal(err)
                }
            }
        }
    }

### REST

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      --no-buffer \
      -d '{
        "model": "gemini-3.1-flash-image",
        "input": "Search for the history of the Colosseum and write a short illustrated story about a gladiator named Marcus. Interleave text and generated images.",
        "stream": true,
        "tools": [
          { "type": "google_search",
            "search_types": ["web_search", "image_search"]
          }
        ],
        "generation_config": {
          "thinking_summaries": "auto"
        },
        "response_format": [
          { "type": "text" }, { "type": "image"}
        ]
      }'

    event: interaction.created
    data: {"interaction":{"id":"v1_...","status":"in_progress","object":"interaction","model":"gemini-3.1-flash-image"},"event_type":"interaction.created"}

    event: interaction.status_update
    data: {"interaction_id":"v1_...","status":"in_progress","event_type":"interaction.status_update"}

    event: step.start
    data: {"index":0,"step":{"type":"model_output"},"event_type":"step.start"}

    event: step.delta
    data: {"index":0,"delta":{"text":"Here is a short illustrated story about the Colosseum...\n\n### Part 1: The New Flavian Amphitheater\n\n...","type":"text"},"event_type":"step.delta"}

    ...

    event: step.stop
    data: {"index":0,"event_type":"step.stop"}

    event: step.start
    data: {"index":1,"step":{"type":"thought"},"event_type":"step.start"}

    event: step.delta
    data: {"index":1,"delta":{"signature":"...","type":"thought_signature"},"event_type":"step.delta"}

    event: step.stop
    data: {"index":1,"event_type":"step.stop"}

    event: step.start
    data: {"index":2,"step":{"type":"model_output"},"event_type":"step.start"}

    event: step.delta
    data: {"index":2,"delta":{"mime_type":"image/jpeg","data":"/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCg...","type":"image"},"event_type":"step.delta"}

    event: step.delta
    data: {"index":2,"delta":{"text":"### Part 2: The Hypogeum and the Wait\n\n...","type":"text"},"event_type":"step.delta"}

    ...

    event: step.stop
    data: {"index":2,"event_type":"step.stop"}

    event: step.start
    data: {"index":3,"step":{"type":"thought"},"event_type":"step.start"}

    event: step.delta
    data: {"index":3,"delta":{"signature":"...","type":"thought_signature"},"event_type":"step.delta"}

    event: step.stop
    data: {"index":3,"event_type":"step.stop"}

    event: step.start
    data: {"index":4,"step":{"type":"model_output"},"event_type":"step.start"}

    event: step.delta
    data: {"index":4,"delta":{"mime_type":"image/jpeg","data":"/9j/4AAQSkZJRgABAQAAAQABAAD/...","type":"image"},"event_type":"step.delta"}

    event: step.delta
    data: {"index":4,"delta":{"text":"### Part 3: The Moment of Spectacle\n\n...","type":"text"},"event_type":"step.delta"}

    ...

    event: step.stop
    data: {"index":4,"event_type":"step.stop"}

    event: interaction.completed
    data: {"interaction":{"id":"v1_...","status":"completed","usage":{"total_tokens":6128,"total_input_tokens":29,"total_output_tokens":6099,"output_tokens_by_modality":[{"modality":"image","tokens":4480}]}},"event_type":"interaction.completed"}

    event: done
    data: [DONE]

## Handling unknown events

In accordance with the API's versioning policy, new event types and delta types may be added over time. Your code should handle unknown event types gracefully---log and skip any events you don't recognize rather than throwing an error.

## What's next

- Learn more about the [Interactions API](https://ai.google.dev/gemini-api/docs/interactions-overview).
- Explore [Function calling](https://ai.google.dev/gemini-api/docs/function-calling) with tools.
- Learn about [Thinking](https://ai.google.dev/gemini-api/docs/thinking) for enhanced reasoning.
- Try the [Deep Research agent](https://ai.google.dev/gemini-api/docs/deep-research) for long-running tasks.
- See the [Interactions API reference](https://ai.google.dev/api/interactions-api) for all event types and delta types.