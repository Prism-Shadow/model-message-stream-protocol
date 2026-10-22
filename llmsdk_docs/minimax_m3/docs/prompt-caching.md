> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Prompt Caching

> Prompt caching effectively reduces latency and costs.

# Features

* **Automatic Caching**: Automatically identifies repeated context content without changing API call methods
* **Cost Reduction**: Input tokens that hit the cache are billed at a lower price, significantly saving costs
* **Speed Improvement**: Reduces processing time for repeated content, accelerating model response

This mechanism is particularly suitable for the following scenarios:

* System prompt reuse: In multi-turn conversations, system prompts typically remain unchanged
* Fixed tool lists: Tools used in a category of tasks are often consistent
* Multi-turn conversation history: In complex conversations, historical messages often contain a lot of repeated information

Scenarios that meet the above conditions can effectively save token consumption and speed up response times using the caching mechanism.

# Code Examples

<Tabs>
  <Tab title="Anthropic SDK Example">
    **Install SDK**

    ```bash theme={null} theme={null}
    pip install anthropic
    ```

    **Environment Variable Setup**

    ```bash theme={null} theme={null}
    export ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
    export ANTHROPIC_API_KEY=${YOUR_API_KEY}
    ```

    **First Request - Establish Cache**

    ```python theme={null} theme={null}
      import anthropic

      client = anthropic.Anthropic()

    response1 = client.messages.create(
          model="MiniMax-M3.1-Flash",
        system="You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n",
          messages=[
              {
                  "role": "user",
                  "content": [
                      {
                          "type": "text",
                        "text": "<the entire contents of 'Pride and Prejudice'>"
                    }
                ]
            },
        ],
        max_tokens=10240,
    )

    print("First request result:")
    for block in response1.content:
        if block.type == "thinking":
            print(f"Thinking:\n{block.thinking}\n")
        elif block.type == "text":
            print(f"Output:\n{block.text}\n")
    print(f"Input Tokens: {response1.usage.input_tokens}")
    print(f"Output Tokens: {response1.usage.output_tokens}")
    print(f"Cache Hit Tokens: {response1.usage.cache_read_input_tokens}")

    ```

    **Second Request - Reuse Cache**

    ```python theme={null} theme={null}
    response2 = client.messages.create(
        model="MiniMax-M3.1-Flash",
        system="You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n",
        messages=[
              {
                  "role": "user",
                  "content": [
                      {
                          "type": "text",
                        "text": "<the entire contents of 'Pride and Prejudice'>"
                    }
                ]
            },
        ],
        max_tokens=10240,
    )

    print("\nSecond request result:")
    for block in response2.content:
        if block.type == "thinking":
            print(f"Thinking:\n{block.thinking}\n")
        elif block.type == "text":
            print(f"Output:\n{block.text}\n")
    print(f"Input Tokens: {response2.usage.input_tokens}")
    print(f"Output Tokens: {response2.usage.output_tokens}")
    print(f"Cache Hit Tokens: {response2.usage.cache_read_input_tokens}")
    ```

    **Response includes context cache token usage information:**

    ```json theme={null} theme={null}
    {
        "usage": {
            "input_tokens": 108,
            "output_tokens": 91,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 14813
        }
    }
    ```
  </Tab>

  <Tab title="OpenAI SDK Example">
    **Install SDK**

    ```bash theme={null} theme={null}
    pip install openai
    ```

    **Environment Variable Setup**

    ```bash theme={null} theme={null}
    export OPENAI_BASE_URL=https://api.minimax.io/v1
    export OPENAI_API_KEY=${YOUR_API_KEY}
    ```

    **First Request - Establish Cache**

    ```python theme={null} theme={null}
    from openai import OpenAI

    client = OpenAI()

    response1 = client.chat.completions.create(
        model="MiniMax-M3.1-Flash",
        messages=[
            {"role": "system", "content": "You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n"},
            {"role": "user", "content": "<the entire contents of 'Pride and Prejudice'>"},
        ],
        # Set reasoning_split=True to separate thinking content into reasoning_details field
        extra_body={"reasoning_split": True},
    )

    print("First request result:")
    print(f"Response: {response1.choices[0].message.content}")
    print(f"Total Tokens: {response1.usage.total_tokens}")
    print(f"Cached Tokens: {response1.usage.prompt_tokens_details.cached_tokens if hasattr(response1.usage, 'prompt_tokens_details') else 0}")

    ```

    **Second Request - Reuse Cache**

    ```python theme={null} theme={null}
    response2 = client.chat.completions.create(
        model="MiniMax-M3.1-Flash",
        messages=[
            {"role": "system", "content": "You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n"},
            {"role": "user", "content": "<the entire contents of 'Pride and Prejudice'>"},
        ],
        # Set reasoning_split=True to separate thinking content into reasoning_details field
        extra_body={"reasoning_split": True},
    )

    print("\nSecond request result:")
    print(f"Response: {response2.choices[0].message.content}")
    print(f"Total Tokens: {response2.usage.total_tokens}")
    print(f"Cached Tokens: {response2.usage.prompt_tokens_details.cached_tokens if hasattr(response2.usage, 'prompt_tokens_details') else 0}")
    ```

    **Response includes context cache token usage information:**

    ```json theme={null} theme={null}
    {
        "usage": {
            "prompt_tokens": 1200,
            "completion_tokens": 300,
            "total_tokens": 1500,
            "prompt_tokens_details": {
                "cached_tokens": 800
            }
        }
    }
    ```
  </Tab>
</Tabs>

# Important Notes

* Caching applies to API calls with 512 or more input tokens
* Caching uses prefix matching, constructed in the order of "tool list → system prompts → user messages". Changes to any module's content may affect caching effectiveness
* Supported models: MiniMax-M3.1-Flash, MiniMax-M3, MiniMax-M2.7 series, MiniMax-M2.5 series, MiniMax-M2.1 series

# Best Practices

* Place static or repeated content (including tool list, system prompts, user messages) at the beginning of the conversation, and put dynamic user information at the end of the conversation to maximize cache utilization
* Monitor cache performance through the usage tokens returned by the API, and regularly analyze to optimize your usage strategy

# Pricing

Prompt caching uses differentiated pricing:

* Cache hit tokens: Billed at discounted price
* New input tokens: Billed at standard input price
* Output tokens: Billed at standard output price

> See the [Pay as You Go pricing](https://platform.minimax.io/docs/pricing/overview#models/text) page for details.

Pricing formula:

```
Cost per request = New input tokens × Input price
                 + Cache hit tokens × Cache hit price
                 + Output tokens × Output price

Where:
- New input tokens = Total input tokens − Cache hit tokens
- Prices are per 1M tokens; see the Pay as You Go pricing page for the actual values
```

Cache hit tokens are returned in the response `usage`:

* Anthropic-compatible API: `usage.cache_read_input_tokens`; `usage.input_tokens` is the number of new input tokens
* OpenAI-compatible API: `usage.prompt_tokens_details.cached_tokens`; `usage.prompt_tokens` is the total number of input tokens
