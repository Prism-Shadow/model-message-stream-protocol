> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 使用 Kimi API 的流式输出功能

> 使用 Kimi API SSE 流式输出降低首 token 等待时间，解析增量响应并获取最终用量数据。

Kimi 大模型收到问题后会先进行推理，再逐个 Token 生成回答；流式输出（Streaming）让模型每生成一定数量的 Tokens（通常是 1 个 Token）就立即发送给客户端，而不是等全部生成完毕再一次性返回。等待完整回复通常要数秒，问题复杂、回复较长时可能拉长到 10 秒甚至 20 秒；开启流式输出后，用户能第一时间看到第一个 Token，显著减少等待时间。当你与 [Kimi 智能助手](https://kimi.com) 对话时，回复逐字“跳”出来，就是流式输出的效果。

## 开启流式输出

在请求中设置 `stream=True` 即可开启流式输出。此时 SDK 返回一个可迭代对象，用循环逐个读取数据块（chunk）：每个 chunk 的结构与 completion 相似，但 `message` 字段被替换为 `delta` 字段。如果需要在流式响应中获取 Tokens 用量，建议同时传入 `stream_options: {"include_usage": true}`（Python SDK 中写作 `{"include_usage": True}`）。

`delta` 中可能出现三类增量数据：

* `content`：正文内容，逐片段下发；
* `reasoning_content`：思考模型的推理内容，先于 `content` 和 `tool_calls` 下发。SDK 的类型定义中未声明该字段，Python 中需通过 `hasattr`/`getattr` 读取；
* `tool_calls`：工具调用。同一个工具调用的片段共享相同的 `index`；`id`、`type`、`function.name` 只在第一个片段中出现一次，`function.arguments` 是 JSON 字符串片段，必须追加拼接、不能覆盖，待流传输结束后再解析为 JSON。

以下示例演示如何在流式输出中折叠这三类增量数据：

本页示例默认使用最新模型 `kimi-k3.1-pro`。K3.1 Pro 使用请求顶层 `reasoning_effort` 配置推理强度（支持 `"low"` / `"high"` / `"max"`，默认 `"max"`）。换用 `kimi-k3.1-pro-highspeed` 等其他模型时，需要替换 `model` 字段，并根据模型支持情况调整参数配置，详见[模型参数参考](https://platform.kimi.com/docs/api/models-overview.md)。

**python**

```python theme={null}
import os
import json
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["MOONSHOT_API_KEY"], # 运行前请设置 MOONSHOT_API_KEY 环境变量
    base_url="https://api.moonshot.cn/v1",
)

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "查询指定城市的实时天气。",
            "parameters": {
                "type": "object",
                "required": ["city"],
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称，例如北京",
                    }
                },
            },
        },
    }
]

stream = client.chat.completions.create(
    model="kimi-k3.1-pro",
    messages=[
        {"role": "system", "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"},
        {"role": "user", "content": "北京今天天气怎么样？"},
    ],
    tools=tools,
    stream=True, # <-- 开启流式输出
    stream_options={"include_usage": True}, # <-- 请求最后的 usage 数据块
)

usage = None
finish_reason = None
reasoning_content = "" # <-- 折叠后的推理内容（思考模型）
tool_calls = []        # <-- 重建后的 tool calls，每个 index 对应一条

for chunk in stream:
    chunk_usage = chunk.usage
    if chunk_usage is None and chunk.choices:
        chunk_usage = getattr(chunk.choices[0], "usage", None)
    if chunk_usage:
        usage = chunk_usage
    if not chunk.choices:
        continue

    choice = chunk.choices[0]
    delta = choice.delta

    if choice.finish_reason:
        finish_reason = choice.finish_reason

    # reasoning_content 先于 content 和 tool_calls 到达；SDK 类型未声明该字段，用 hasattr/getattr 读取
    if hasattr(delta, "reasoning_content"):
        reasoning_fragment = getattr(delta, "reasoning_content")
        if reasoning_fragment:
            reasoning_content += reasoning_fragment # <-- 追加，不要覆盖
            print(reasoning_fragment, end="")

    if delta.content:
        print(delta.content, end="")

    for tool_call in delta.tool_calls or []:
        index = tool_call.index # <-- 同一个 tool call 的片段共享相同的 index
        while len(tool_calls) <= index:
            tool_calls.append({"id": "", "type": "", "name": "", "arguments": ""})
        current = tool_calls[index]
        if tool_call.id: # <-- id、type、name 只在第一个片段出现
            current["id"] = tool_call.id
        if tool_call.type:
            current["type"] = tool_call.type
        if tool_call.function:
            if tool_call.function.name:
                current["name"] = tool_call.function.name
            if tool_call.function.arguments:
                current["arguments"] += tool_call.function.arguments # <-- 追加，不要覆盖

# finish_reason 为 "tool_calls" 时，执行工具并将 assistant 消息（含 tool_calls 和折叠后的
# reasoning_content，即 Preserved Thinking）与工具结果追加到 messages 后再次调用 API
if finish_reason == "tool_calls":
    for tool_call in tool_calls:
        arguments = json.loads(tool_call["arguments"]) # <-- 折叠完成后再解析 JSON
        print(f"\ntool_call: {tool_call['id']} {tool_call['name']}({arguments})")

if usage:
    print("\ntotal_tokens:", usage.total_tokens)
```

**node.js**

```js theme={null}
const OpenAI = require('openai')

const client = new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY, // 运行前请设置 MOONSHOT_API_KEY 环境变量
    baseURL: "https://api.moonshot.cn/v1",
})

const tools = [
    {
        type: "function",
        function: {
            name: "get_weather",
            description: "查询指定城市的实时天气。",
            parameters: {
                type: "object",
                required: ["city"],
                properties: {
                    city: {
                        type: "string",
                        description: "城市名称，例如北京",
                    },
                },
            },
        },
    },
]

async function main() {
    const stream = await client.chat.completions.create({
        model: "kimi-k3.1-pro",
        messages: [
            {role: "system", content: "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"},
            {role: "user", content: "北京今天天气怎么样？"},
        ],
        tools: tools,
        stream: true, // <-- 开启流式输出
        stream_options: {include_usage: true}, // <-- 请求最后的 usage 数据块
    })

    let usage;
    let finishReason;
    let reasoningContent = ""; // <-- 折叠后的推理内容（思考模型）
    const toolCalls = [];      // <-- 重建后的 tool calls，每个 index 对应一条

    for await (const chunk of stream) {
        const chunkUsage = chunk.usage ?? chunk.choices[0]?.usage;
        if (chunkUsage) usage = chunkUsage;
        if (chunk.choices.length === 0) continue;

        const choice = chunk.choices[0];
        const delta = choice.delta;

        if (choice.finish_reason) finishReason = choice.finish_reason;

        // reasoning_content 先于 content 和 tool_calls 到达；SDK 类型未声明该字段，但会出现在解析后的对象上
        if (delta.reasoning_content) {
            reasoningContent += delta.reasoning_content; // <-- 追加，不要覆盖
            process.stdout.write(delta.reasoning_content);
        }

        if (delta.content) {
            process.stdout.write(delta.content);
        }

        for (const toolCall of delta.tool_calls ?? []) {
            const index = toolCall.index; // <-- 同一个 tool call 的片段共享相同的 index
            while (toolCalls.length <= index) {
                toolCalls.push({id: "", type: "", name: "", arguments: ""});
            }
            const current = toolCalls[index];
            if (toolCall.id) current.id = toolCall.id; // <-- id、type、name 只在第一个片段出现
            if (toolCall.type) current.type = toolCall.type;
            if (toolCall.function) {
                if (toolCall.function.name) current.name = toolCall.function.name;
                if (toolCall.function.arguments) {
                    current.arguments += toolCall.function.arguments; // <-- 追加，不要覆盖
                }
            }
        }
    }

    // finish_reason 为 "tool_calls" 时，执行工具并将 assistant 消息（含 tool_calls 和折叠后的
    // reasoning_content，即 Preserved Thinking）与工具结果追加到 messages 后再次调用 API
    if (finishReason === "tool_calls") {
        for (const toolCall of toolCalls) {
            const args = JSON.parse(toolCall.arguments); // <-- 折叠完成后再解析 JSON
            console.log(`\ntool_call: ${toolCall.id} ${toolCall.name}(${JSON.stringify(args)})`);
        }
    }

    if (usage) console.log("\ntotal_tokens:", usage.total_tokens);
}

main()
```

当 `finish_reason` 为 `tool_calls` 时，表示模型请求你执行工具。执行完成后，将 assistant 消息（包括其 `tool_calls`，以及思考模型折叠后的 `reasoning_content`，即[保留式思考（Preserved Thinking）](https://platform.kimi.com/docs/guide/use-thinking-models.md)）与工具结果一起追加到 `messages` 中，再次调用 API；完整流程见[使用 Kimi API 完成 Tool Calls](https://platform.kimi.com/docs/guide/use-kimi-api-to-complete-tool-calls.md)。`tool_call.type` 与声明时的工具类型一致（`function` 或 `builtin_function`）。

## 解析 SSE 响应体

开启流式输出后，接口不再返回 JSON 格式的响应（`Content-Type: application/json`），而是返回 `Content-Type: text/event-stream`（SSE），服务端得以源源不断地向客户端传输 Tokens。[SSE](https://kimi.com/share/cr7boh3dqn37a5q9tds0) 的响应体如下所示：

```text theme={null}
data: {"id":"cmpl-1305b94c570f447fbde3180560736287","object":"chat.completion.chunk","created":1698999575,"model":"kimi-k3.1-pro","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"cmpl-1305b94c570f447fbde3180560736287","object":"chat.completion.chunk","created":1698999575,"model":"kimi-k3.1-pro","choices":[{"index":0,"delta":{"content":"你好"},"finish_reason":null}]}

...

data: {"id":"cmpl-1305b94c570f447fbde3180560736287","object":"chat.completion.chunk","created":1698999575,"model":"kimi-k3.1-pro","choices":[{"index":0,"delta":{"content":"。"},"finish_reason":null}]}

data: {"id":"cmpl-1305b94c570f447fbde3180560736287","object":"chat.completion.chunk","created":1698999575,"model":"kimi-k3.1-pro","choices":[{"index":0,"delta":{},"finish_reason":"stop","usage":{"prompt_tokens":19,"completion_tokens":13,"total_tokens":32}}]}

data: {"id":"cmpl-1305b94c570f447fbde3180560736287","object":"chat.completion.chunk","created":1698999575,"model":"kimi-k3.1-pro","choices":[],"usage":{"prompt_tokens":19,"completion_tokens":13,"total_tokens":32}}

data: [DONE]
```

响应体中的每个数据块均以 `data: ` 为前缀，紧跟一个合法的 JSON 对象，并以两个换行符 `\n\n` 结束。所有数据块传输完成后，服务端发送 `data: [DONE]` 标识传输结束，此时可断开网络连接。

*注意：请始终使用 `data: [DONE]` 判断数据是否传输完成，而不是使用 `finish_reason` 或其他方式。如果未收到 `data: [DONE]`，即使已经获取了 `finish_reason=stop`，也不应视作传输完成；换句话说，在收到 `data: [DONE]` 之前，都应视作 **消息是不完整的**。*

流式输出过程中，`content` 字段会逐块下发；`role` 不会在每个数据块中重复出现，仅出现在第一个数据块。对于思考模型，`reasoning_content` 同样以增量片段的形式先于 `content` 下发；当模型决定调用工具时，`delta.tool_calls` 会携带工具调用片段——同一个调用的片段共享相同的 `index`，`id`/`type`/`function.name` 仅在第一个片段中出现，`function.arguments` 为 JSON 字符串片段，需追加拼接后再解析。传入 `stream_options: {"include_usage": true}` 后，服务端会在 `[DONE]` 前返回一个最终统计数据块：该数据块的 `choices` 为空，本次请求的总用量位于顶层 `usage` 字段。

## 统计 Tokens 用量

计算 Tokens 有两种方式。推荐在请求中传入 `stream_options: {"include_usage": true}`，等所有数据块传输完毕后读取最后一个统计数据块顶层的 `usage` 字段，查看本次请求产生的 `prompt_tokens`/`completion_tokens`/`total_tokens`：

```text theme={null}
...

data: {"id":"cmpl-1305b94c570f447fbde3180560736287","object":"chat.completion.chunk","created":1698999575,"model":"kimi-k3.1-pro","choices":[],"usage":{"prompt_tokens":19,"completion_tokens":13,"total_tokens":32}}
                                                                                                                                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                                                                                                            读取最后一个统计数据块顶层的 usage 字段
data: [DONE]
```

> [!NOTE]
>
> 最终统计数据块不包含模型输出，因此 `choices` 为空。解析流式响应时，不要假设每个 chunk 都存在 `choices[0]`；请从最终统计 chunk 的 `chunk.usage` 读取总用量。

但流式输出可能因网络连接中断、客户端程序错误等不可控因素被打断，此时最后一个数据块尚未到达，也就无从得知本次请求消耗的 Tokens。为避免统计失败，建议保存已收到的每个数据块的内容，并在请求结束后（无论是否成功结束）调用 Tokens 计算接口统计实际消耗量：

**python**

```python theme={null}
import os
import httpx
from openai import OpenAI

client = OpenAI(
    api_key = os.environ["MOONSHOT_API_KEY"], # 运行前请设置 MOONSHOT_API_KEY 环境变量
    base_url = "https://api.moonshot.cn/v1",
)

stream = client.chat.completions.create(
    model = "kimi-k3.1-pro",
    messages = [
        {"role": "system", "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"},
        {"role": "user", "content": "你好，我叫李雷，1+1等于多少？"}
    ],
    stream=True, # <-- 注意这里，我们通过设置 stream=True 开启流式输出模式
)


def estimate_token_count(input: str) -> int:
    """
    在这里实现你的 Tokens 计算逻辑，或是直接调用我们的 Tokens 计算接口计算 Tokens

    https://api.moonshot.cn/v1/tokenizers/estimate-token-count
    """
    header = {
        "Authorization": f"Bearer {os.environ['MOONSHOT_API_KEY']}",
    }
    data = {
        "model": "kimi-k3.1-pro",
        "messages": [
            {"role": "user", "content": input},
        ]
    }
    r = httpx.post("https://api.moonshot.cn/v1/tokenizers/estimate-token-count", headers=header, json=data)
    r.raise_for_status()
    return r.json()["data"]["total_tokens"]


completion = []
for chunk in stream:
    delta = chunk.choices[0].delta
    if delta.content:
        completion.append(delta.content)


print("completion_tokens:", estimate_token_count("".join(completion)))
```

**node.js**

```js theme={null}
const axios = require('axios');
const OpenAI = require('openai');

client = new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY,
    baseURL: "https://api.moonshot.cn/v1",
})


async function estimate_token_count(input_messages) {
    /*
    在这里实现你的 Tokens 计算逻辑，或是直接调用我们的 Tokens 计算接口计算 Tokens

    https://api.moonshot.cn/v1/tokenizers/estimate-token-count
    */
    header = {
        "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}`,
    }
    data = {
        "model": "kimi-k3.1-pro",
        "messages": input_messages,
    }
    r = await axios.post("https://api.moonshot.cn/v1/tokenizers/estimate-token-count", data, {headers: header})
    .catch(function (error) {
        console.log(error)
    })
    return r.data.data.total_tokens
}

async function main() {

    const stream = await client.chat.completions.create({
        model: "kimi-k3.1-pro",
        messages: [
            {role: "system", content: "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"},
            {role: "user", content: "你好，我叫李雷，1+1等于多少？"}
        ],
        stream: true, // <-- 注意这里，我们通过设置 stream=True 开启流式输出模式
    })

    const completion = [];
    for await (chunk of stream) {
        const delta = chunk.choices[0].delta
        if (delta.content) {
            completion.push(delta.content)
        }
    }

    console.log("completion_tokens:", await estimate_token_count(completion.join("")))
}

main()
```

## 终止流式输出

需要提前终止输出时，直接关闭 HTTP 网络连接或丢弃后续数据块即可，例如在循环中 `break`：

```python theme={null}
for chunk in stream:
	if condition:
		break
```

## 不用 SDK 直接处理 SSE

在没有 SDK 的语言环境，或 SDK 无法满足你的业务逻辑时，可以直接对接 HTTP 接口来处理流式输出。以下示例演示如何逐行读取并解析 [SSE](https://kimi.com/share/cr7boh3dqn37a5q9tds0) 响应体，详细说明见代码注释：

**python**

```python theme={null}
import os
import json
import httpx # 我们使用 httpx 库来执行我们的 HTTP 请求


request_data = {
    "model": "kimi-k3.1-pro",
    "messages": [
        # 具体的 messages
    ],
    "stream": True,
    "stream_options": {"include_usage": True},
}

headers = {
    "Authorization": f"Bearer {os.environ['MOONSHOT_API_KEY']}",
}

usage = None

# 使用 httpx.stream 在数据到达时逐行读取 SSE 响应，避免等待整个响应缓冲完成
with httpx.stream(
    "POST",
    "https://api.moonshot.cn/v1/chat/completions",
    headers=headers,
    json=request_data,
) as response:
    response.raise_for_status()

    for line in response.iter_lines():
        if not line.startswith("data: "):
            continue

        payload = line.removeprefix("data: ")
        if payload == "[DONE]":
            break

        chunk = json.loads(payload)
        choices = chunk.get("choices", [])
        chunk_usage = chunk.get("usage")
        if chunk_usage is None and choices:
            chunk_usage = choices[0].get("usage")
        if chunk_usage:
            usage = chunk_usage
        if not choices:
            continue

        choice = choices[0]
        delta = choice["delta"]
        role = delta.get("role")
        if role:
            print("role:", role)
        content = delta.get("content")
        if content:
            print(content, end="")

if usage:
    print("\ntotal_tokens:", usage["total_tokens"])
```

**node.js**

```js theme={null}
const axios = require('axios'); // 使用 axios 库来执行 HTTP 请求

const requestData = {
    "model": "kimi-k3.1-pro",
    "messages": [
        // 具体的 messages
    ],
    "stream": true,
    "stream_options": {"include_usage": true},
};

// 使用 axios 向 Kimi 大模型发出 chat 请求，并获得响应 r
axios.post("https://api.moonshot.cn/v1/chat/completions", requestData, {
    headers: {
        "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}`,
    },
    responseType: 'stream',
}).then(response => {
    let buffer = '';
    let usage;
    response.data.on('data', rawChunk => {
        buffer += rawChunk.toString();
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? '';

        for (const event of events) {
            const dataLines = event
                .split(/\r?\n/)
                .filter(line => line.startsWith('data: '))
                .map(line => line.slice(6));
            if (dataLines.length === 0) continue;

            const payload = dataLines.join('\n');
            if (payload === '[DONE]') {
                if (usage) console.log("\ntotal_tokens:", usage.total_tokens);
                response.data.destroy();
                return;
            }

            try {
                const chunk = JSON.parse(payload);
                const choices = chunk.choices || [];
                const chunkUsage = chunk.usage ?? choices[0]?.usage;
                if (chunkUsage) usage = chunkUsage;
                if (choices.length === 0) {
                    continue;
                }
                const choice = choices[0];
                const delta = choice.delta;
                const role = delta.role;
                if (role) {
                    console.log("role:", role);
                }
                const content = delta.content;
                if (content) {
                    process.stdout.write(content);
                }
            } catch (error) {
                console.error("Error parsing JSON:", error);
            }
        }
    });
}).catch(error => {
    console.error("Error in request:", error);
});
```

无论使用哪种语言，处理流式输出的基本步骤相同：

1. 发起 HTTP 请求，并在请求体中将 `stream` 参数设置为 `true`；
2. 检查响应 `Headers` 中的 `Content-Type`，为 `text/event-stream` 即表示当前响应是流式输出；
3. 逐行读取响应内容并解析数据块（JSON 格式），通过 `data: ` 前缀和换行符 `\n` 判断数据块的起止位置；
4. 数据块内容为 `[DONE]` 时表示传输完成。

## 多个回复（`n` 参数）

> [!NOTE]
>
> 当前模型（`kimi-k3.1-pro`、`kimi-k3`、`kimi-k2.7-code`、`kimi-k2.6`）的 `n` 固定为 `1`，暂不支持一次请求返回多个回复；传入大于 1 的 `n` 会返回 400 错误（`invalid n: only 1 is allowed for this model`），流式与非流式请求均如此。各模型的参数约束详见[模型参数参考](https://platform.kimi.com/docs/api/models-overview.md)。
