# MiniMax M-series TypeScript Quick Start

MiniMax documents an OpenAI Responses API-compatible endpoint at `https://api.minimax.io/v1/responses`.

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "<MiniMax API Key or M Plan / Token Plan Subscription Key>",
  baseURL: "https://api.minimax.io/v1",
});

const stream = await client.responses.create({
  model: "MiniMax-M3.1-Flash",
  input: "Explain the purpose of a hash function.",
  reasoning: { effort: "low" },
  stream: true,
});

for await (const event of stream) {
  console.log(event);
}
```

`MiniMax-M3.1-Flash` always reasons: `reasoning.effort` accepts `low`, `medium`, `high`, `xhigh` and `max` (default `max`), and `none` returns HTTP 400 (code 2013). `MiniMax-M3` reasons only when `effort` is set to a value other than `none`, and the value does not tune its depth.

Use a **Subscription Key** for M Plan or Token Plan quota and Credits, or a separate API Key for pay-as-you-go billing. The keys are not interchangeable.

For multi-turn tool use, preserve and replay the full assistant response, including reasoning output and function-call items, before adding matching function-call output items.

Sources:

- https://platform.minimax.io/docs/guides/text-generation
- https://platform.minimax.io/docs/api-reference/responses-create
- https://platform.minimax.io/docs/guides/text-m3-function-call
- https://platform.minimax.io/docs/m-plan/intro
