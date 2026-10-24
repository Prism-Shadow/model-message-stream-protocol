> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Chat Completions API

> 创建对话补全：向 Kimi 模型发送消息并获取回复，支持流式输出、工具调用与视觉输入。

创建一个对话补全请求，模型将根据输入的消息列表生成回复。

> **Content 字段说明**
>
> `content` 字段支持以下两种形式：
>
> **纯文本字符串**
>
> ```json theme={null}
> { "content": "你好" }
> ```
>
> **对象数组**（用于多模态输入）
>
> 数组中每个元素通过 `type` 字段区分类型：
>
> ```json theme={null}
> {
>     "content": [
>         { "type": "text", "text": "描述这张图片" },
>         { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } },
>         { "type": "video_url", "video_url": { "url": "data:video/mp4;base64,..." } }
>     ]
> }
> ```
>
> 其中 `image_url` 和 `video_url` 也支持直接传入字符串，效果等同于对象形式中的 `url` 字段：
>
> ```json theme={null}
> { "type": "image_url", "image_url": "data:image/png;base64,..." }
> ```
>
> #### 参数说明
>
> 数组中每个元素的字段说明如下：
>
> | 参数名称 | 是否必须 | 说明 | 类型 |
> | - | - | - | - |
> | `type` | required | 内容类型 | `"text"` \| `"image_url"` \| `"video_url"` |
> | `text` | 当 `type=text` 时必填 | 文本内容 | string |
> | `image_url` | 当 `type=image_url` 时必填 | 用于传输图片，支持对象形式 `{"url": "..."}` 或直接传入 URL 字符串 | object \| string |
> | `video_url` | 当 `type=video_url` 时必填 | 用于传输视频，支持对象形式 `{"url": "..."}` 或直接传入 URL 字符串 | object \| string |
>
> 当 `image_url` 传入对象时，其字段说明如下：
>
> | 参数名称 | 是否必须 | 说明 | 类型 |
> | - | - | - | - |
> | `url` | required | 使用 base64 编码或通过 file id 指定的图片内容 | string |
>
> 当 `video_url` 传入对象时，其字段说明如下：
>
> | 参数名称 | 是否必须 | 说明 | 类型 |
> | - | - | - | - |
> | `url` | required | 使用 base64 编码或通过 file id 指定的视频内容，例如 `data:video/mp4;base64,...` | string |
>
> > [!NOTE]
> >
> > 无论使用对象形式（`url` 字段）还是字符串简写，均支持以下两种格式：
> >
> > * base64 编码：`data:image/png;base64,...` 或 `data:video/mp4;base64,...`
> > * 文件引用：`ms://<file_id>`
> >
> > 详见[使用 Kimi 视觉模型](https://platform.kimi.com/docs/guide/use-kimi-vision-model.md)。
>
> #### 调用示例
>
> ```python python expandable theme={null}
> import os
> import base64
>
> from openai import OpenAI
> from openai.types.chat import ChatCompletion
>
> client: OpenAI = OpenAI(
>     api_key=os.environ.get("MOONSHOT_API_KEY"),
>     base_url="https://api.moonshot.cn/v1",
> )
>
> # 对图片进行 base64 编码
> with open("您的图片地址", "rb") as f:
>     img_base: str = base64.b64encode(f.read()).decode("utf-8")
>
> response: ChatCompletion = client.chat.completions.create(
>     model="kimi-k3.1-pro",
>     messages=[
>         {
>             "role": "user",
>             "content": [
>                 {
>                     "type": "image_url",
>                     "image_url": {
>                         "url": f"data:image/jpeg;base64,{img_base}",
>                     },
>                 },
>                 {
>                     "type": "text",
>                     "text": "请描述这个图片",
>                 },
>             ],
>         }
>     ],
> )
> print(response.choices[0].message.content)
> ```
>
> ```bash curl expandable theme={null}
> curl https://api.moonshot.cn/v1/chat/completions \
>     -H "Content-Type: application/json" \
>     -H "Authorization: Bearer $MOONSHOT_API_KEY" \
>     -d '{
>         "model": "kimi-k3.1-pro",
>         "messages": [
>             {
>                 "role": "user",
>                 "content": [
>                     {
>                         "type": "image_url",
>                         "image_url": {
>                             "url": "data:image/jpeg;base64,/9j/4AAQ..."
>                         }
>                     },
>                     {
>                         "type": "text",
>                         "text": "请描述这个图片"
>                     }
>                 ]
>             }
>         ]
>     }'
> ```
>
> ```javascript node.js expandable theme={null}
> const fs = require("fs");
> const OpenAI = require("openai");
>
> const client = new OpenAI({
>     apiKey: process.env.MOONSHOT_API_KEY,
>     baseURL: "https://api.moonshot.cn/v1",
> });
>
> async function main() {
>     // 对图片进行 base64 编码
>     const imgBase = fs.readFileSync("您的图片地址").toString("base64");
>
>     const response = await client.chat.completions.create({
>         model: "kimi-k3.1-pro",
>         messages: [
>             {
>                 role: "user",
>                 content: [
>                     {
>                         type: "image_url",
>                         image_url: {
>                             url: `data:image/jpeg;base64,${imgBase}`,
>                         },
>                     },
>                     {
>                         type: "text",
>                         text: "请描述这个图片",
>                     },
>                 ],
>             },
>         ],
>     });
>     console.log(response.choices[0].message.content);
> }
>
> main();
> ```

> **响应格式**
>
> ### 非流式响应
>
> ```json theme={null}
> {
>     "id": "chatcmpl-6adb0d416a4a9c1d0fe639e3",
>     "object": "chat.completion",
>     "created": 1792740676,
>     "model": "kimi-k3.1-pro",
>     "choices": [
>         {
>             "index": 0,
>             "message": {
>                 "content": "1 + 1 = 2",
>                 "role": "assistant",
>                 "reasoning_content": "The user is asking a simple math question in Chinese: \"1+1 等于多少？\" (What is 1+1?)\n\nThis is a trivial arithmetic question. The answer is 2. I should respond in Chinese since the conversation is in Chinese. Keep it simple and direct."
>             },
>             "finish_reason": "stop"
>         }
>     ],
>     "usage": {
>         "completion_tokens": 82,
>         "prompt_tokens": 309,
>         "total_tokens": 391,
>         "completion_tokens_details": {
>             "reasoning_tokens": 60
>         },
>         "prompt_tokens_details": {
>             "cache_write_tokens": 256
>         }
>     }
> }
> ```
>
> ### 流式响应
>
> 设置 `stream=true` 和 `stream_options.include_usage=true`；先返回 `reasoning_content`，再返回 `content`，最后的统计块为 `choices: []`，总用量位于顶层 `usage`。
>
> ```text theme={null}
> data: {"id":"chatcmpl-6adb0ef5ba679679914a2719","object":"chat.completion.chunk","created":1792741109,"model":"kimi-k3.1-pro","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}],"system_fingerprint":"fpv0_dd3f7976"}
>
> data: {"id":"chatcmpl-6adb0ef5ba679679914a2719","object":"chat.completion.chunk","created":1792741109,"model":"kimi-k3.1-pro","choices":[{"index":0,"delta":{"reasoning_content":"The"},"finish_reason":null}],"system_fingerprint":"fpv0_dd3f7976"}
>
> ...
>
> data: {"id":"chatcmpl-6adb0ef5ba679679914a2719","object":"chat.completion.chunk","created":1792741109,"model":"kimi-k3.1-pro","choices":[{"index":0,"delta":{"content":"1"},"finish_reason":null}],"system_fingerprint":"fpv0_dd3f7976"}
>
> ...
>
> data: {"id":"chatcmpl-6adb0ef5ba679679914a2719","object":"chat.completion.chunk","created":1792741109,"model":"kimi-k3.1-pro","choices":[],"usage":{"prompt_tokens":309,"completion_tokens":101,"total_tokens":410,"completion_tokens_details":{"reasoning_tokens":71},"prompt_tokens_details":{"cache_write_tokens":256}}}
>
> data: [DONE]
> ```
>
> > [!NOTE]
> >
> > 响应示例中的模型名称会根据请求中的 model 参数返回。当使用 `kimi-k3.1-pro` 模型时，响应中的 `"model"` 字段将显示为 `"kimi-k3.1-pro"`。

> **上下文缓存（Cache Write）**
>
> Cache Write 适用于 `kimi-k3.1-pro`、`kimi-k3.1-pro-highspeed` 和 `kimi-k3`。Kimi API 会对重复的请求前缀自动启用上下文缓存，命中部分以更低价格计费且响应更快。通过 `prompt_cache_options` 可以控制缓存写入行为：
>
> | 参数 | 类型 | 说明 |
> | - | - | - |
> | `prompt_cache_options` | object | 上下文缓存写入选项。不传时默认开启缓存写入（`5m` 档） |
> | `prompt_cache_options.mode` | `"implicit"` | 缓存写入模式，仅支持 `implicit`：自动将请求前缀写入缓存 |
> | `prompt_cache_options.ttl` | `"5m"` \| `"1h"` | 缓存写入的有效期，仅支持 `5m`、`1h` 两档（默认 `5m`），两档缓存相互独立 |
>
> ```json theme={null}
> {
>     "model": "kimi-k3.1-pro",
>     "messages": [{"role": "user", "content": "你好"}],
>     "prompt_cache_options": { "mode": "implicit", "ttl": "1h" }
> }
> ```
>
> **行为说明**
>
> * 缓存以组织（org）为粒度隔离，组织之间不共享缓存。
> * 相同前缀的请求在缓存有效期内命中后，缓存的有效期会按原 TTL 刷新；命中部分只收取缓存读取费用，不再收取缓存写入费用。
> * 缓存写入按 TTL 分别计费，价格详见[产品定价](https://platform.kimi.com/docs/pricing/chat.md)。
> * 不支持手动清除缓存，已缓存的前缀在至少 5 分钟不活动后自动过期。
> * 暂不支持显式缓存断点：`content` 中出现 `prompt_cache_breakpoint` 时请求会被拒绝（HTTP 400）。
>
> **用量字段**
>
> `usage.prompt_tokens` 始终为总输入 Token 数，其内部分类通过 `prompt_tokens_details` 返回：
>
> | 字段 | 说明 |
> | - | - |
> | `usage.prompt_tokens_details.cached_tokens` | 命中缓存的 Token 数量（缓存读取） |
> | `usage.prompt_tokens_details.cache_write_tokens` | 本次写入缓存的 Token 数量（缓存写入） |
>
> `cached_tokens`、`cache_write_tokens` 与未缓存部分互斥，三者之和等于 `prompt_tokens`，即未缓存部分 = `prompt_tokens` − `cached_tokens` − `cache_write_tokens`。
>
> 上方非流式响应中，输入为 309 Token，其中缓存写入 256 Token；输出为 82 Token，总计 309 + 82 = 391 Token。缓存读写已包含在 `prompt_tokens` 中，输出包含推理与正文，不应重复累加。
>
> 流式请求中，完整的缓存读写明细仅在最后一个 chunk 的 `usage` 字段中返回（需设置 `stream_options.include_usage=true`）。Chat Completions 的响应不回显实际应用的 mode/ttl（与 Responses API 不同），请从请求发起侧记录所用取值。
>
> > [!NOTE]
> >
> > Context Caching 的机制背景详见[上下文缓存指南](https://platform.kimi.com/docs/guide/context-caching.md)。

> **多轮对话**
>
> Kimi API 是无状态的，本身不具有记忆功能。要实现多轮对话，需在每次请求时把前一轮的 assistant 回复（以及工具执行结果，如适用）原样追加到 `messages` 数组中再发送。
>
> ```python theme={null}
> messages = [
>     {"role": "system", "content": "你是 Kimi。"},
>     {"role": "user", "content": "你好，我叫李雷。"}
> ]
>
> completion = client.chat.completions.create(model="kimi-k3.1-pro", messages=messages)
> reply = completion.choices[0].message
>
> # 原样保留完整 assistant 回复，包括 reasoning_content 和可能的 tool_calls
> messages.append(reply.model_dump(exclude_none=True))
> messages.append({"role": "user", "content": "1+1 等于多少？"})
>
> completion = client.chat.completions.create(model="kimi-k3.1-pro", messages=messages)
> print(completion.choices[0].message.content)
> ```
>
> 当对话历史过长时，建议只保留最近的若干条消息，或做消息压缩，以避免超出模型的上下文长度限制。
>
> > [!NOTE]
> >
> > 详见 [配置多轮对话参数](https://platform.kimi.com/docs/guide/engage-in-multi-turn-conversations-using-kimi-api.md)。

> **JSON Mode**
>
> 通过 `response_format` 参数可约束模型输出格式：
>
> * `{"type": "text"}`（默认）：普通文本输出
> * `{"type": "json_object"}`：强制输出合法 JSON Object
> * `{"type": "json_schema", "json_schema": {...}}`：按给定 JSON Schema 输出结构化数据（Structured Output）
>
> 使用 `json_object` 时，**必须在 system prompt 或 user prompt 中明确描述期望的 JSON 字段和类型**，否则模型可能输出不符合预期的结果。
>
> ```json theme={null}
> {
>   "model": "kimi-k3.1-pro",
>   "messages": [
>     {"role": "system", "content": "请输出 JSON，包含 title、author、summary 字段。"},
>     {"role": "user", "content": "总结这篇文章：递归通过把问题分解为更小的同类子问题来求解，并通过终止条件结束调用。"}
>   ],
>   "response_format": {"type": "json_object"}
> }
> ```
>
> > [!NOTE]
> >
> > 详见 [使用 Kimi API 的 JSON Mode](https://platform.kimi.com/docs/guide/use-json-mode-feature-of-kimi-api.md)。

> **工具调用 Tool Use**
>
> 通过 `tools` 参数传入 JSON Schema 定义的外部工具，模型可决定在适当时机调用它们。
>
> **请求示例**
>
> ```json theme={null}
> {
>   "model": "kimi-k3.1-pro",
>   "messages": [{"role": "user", "content": "北京今天天气怎么样？"}],
>   "tools": [
>     {
>       "type": "function",
>       "function": {
>         "name": "get_weather",
>         "description": "获取指定城市的天气",
>         "parameters": {
>           "type": "object",
>           "properties": {
>             "city": {"type": "string", "description": "城市名称"}
>           },
>           "required": ["city"]
>         }
>       }
>     }
>   ]
> }
> ```
>
> **响应中的 `tool_calls`**
>
> 当 `finish_reason` 为 `"tool_calls"` 时，模型返回 `tool_calls` 数组，包含 `id`、`function.name` 和 `function.arguments`：
>
> ```json theme={null}
> {
>   "choices": [{
>     "message": {
>       "role": "assistant",
>       "content": "",
>       "reasoning_content": "用户问北京今天天气。需要调用天气工具。工具只需 city。调用 get_weather 城市北京。然后基于结果回答。注意当前日期系统提供2026-04-25，但天气工具会返回指定城市天气（可能实时）。调用。",
>       "tool_calls": [
>         {
>           "id": "get_weather_0_995b2511",
>           "type": "function",
>           "function": {
>             "arguments": "{\"city\":\"北京\"}",
>             "name": "get_weather"
>           }
>         }
>       ]
>     },
>     "finish_reason": "tool_calls"
>   }]
> }
> ```
>
> **提交工具执行结果**
>
> 在本地执行工具后，先将响应中的完整 assistant message（包括 `reasoning_content` 和 `tool_calls`）原样追加到原请求的 `messages`，再追加以下工具结果；`tool_call_id` 必须与 assistant 消息中的工具调用 `id` 对应：
>
> ```json theme={null}
> {"role": "tool", "tool_call_id": "get_weather_0_995b2511", "content": "晴，25°C"}
> ```
>
> > [!NOTE]
> >
> > 详见 [使用 Kimi API 完成工具调用](https://platform.kimi.com/docs/guide/use-kimi-api-to-complete-tool-calls.md)。

> **思考模式与 Preserved Thinking**
>
> Kimi K3 系列始终开启思考与 Preserved Thinking，使用顶层 `reasoning_effort`（支持 `"low"`、`"high"`、`"max"`，默认 `"max"`），不使用下方 K2.x 的 `thinking` 参数。`kimi-k2.6` 和 `kimi-k2.7-code` 支持思考模式，模型在输出最终答案前会先输出推理过程（`reasoning_content`）。
>
> **K2.x 请求参数**
>
> | 字段 | 类型 | 说明 |
> | - | - | - |
> | `thinking.type` | `"enabled"` \| `"disabled"` | 思考开关（`kimi-k2.7-code` 始终为 `enabled`，不可关闭） |
> | `thinking.keep` | `null` \| `"all"` | Preserved Thinking：是否将历史轮次的 `reasoning_content` 保留在上下文。`kimi-k2.6` 默认 `null`（不保留），可选 `"all"`；`kimi-k2.7-code` 固定为 `"all"`（保留），传入其他值报错 |
>
> **响应字段**
>
> 非流式响应中，`choices[0].message` 包含：
>
> | 字段 | 说明 |
> | - | - |
> | `content` | 最终答案 |
> | `reasoning_content` | 推理过程（仅在思考模式启用时返回） |
>
> ```json theme={null}
> {
>   "choices": [{
>     "message": {
>       "role": "assistant",
>       "content": "1 + 1 = 2",
>       "reasoning_content": "The user is asking a simple math question in Chinese: \"1+1 等于多少？\" (What is 1+1?)\n\nThis is a trivial arithmetic question. The answer is 2. I should respond in Chinese since the conversation is in Chinese. Keep it simple and direct."
>     }
>   }]
> }
> ```
>
> > [!WARNING]
> >
> > 多轮对话中若使用思考模式，请务必将每一轮 assistant 消息的 `reasoning_content` 原样保留在 `messages` 中，否则模型可能丢失推理上下文。
>
> > [!NOTE]
> >
> > 详见 [配置思考模式](https://platform.kimi.com/docs/guide/use-thinking-models.md)。

> **流式输出 Streaming**
>
> 设置 `stream: true` 可启用流式输出，模型会以 Server-Sent Events (SSE) 格式逐段返回生成的内容。推荐在聊天、代码生成、长文本输出等实时性要求高的场景中使用。
>
> ```python theme={null}
> completion = client.chat.completions.create(
>     model="kimi-k3.1-pro",
>     messages=[{"role": "user", "content": "请解释什么是递归。"}],
>     stream=True,
>     stream_options={"include_usage": True},
> )
>
> for chunk in completion:
>     if chunk.usage is not None:
>         print("\nusage:", chunk.usage.model_dump())
>     if not chunk.choices:
>         continue
>     delta = chunk.choices[0].delta
>     reasoning: str = getattr(delta, "reasoning_content", None) or ""
>     if reasoning:
>         print(reasoning, end="")
>     if delta.content:
>         print(delta.content, end="")
> ```
>
> **SSE 响应格式**
>
> 每一行以 `data:` 开头，内容为 JSON 对象。先接收 `delta.reasoning_content`，再接收 `delta.content`；`finish_reason="stop"` 表示生成结束，其后的统计块 `choices` 为空，需从顶层 `usage` 读取用量：
>
> ```text theme={null}
> data: {"id":"chatcmpl-6adb0efa76cd871ffe47cb4d","object":"chat.completion.chunk","created":1792741114,"model":"kimi-k3.1-pro","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}],"system_fingerprint":"fpv0_6e24f0d2"}
>
> data: {"id":"chatcmpl-6adb0efa76cd871ffe47cb4d","object":"chat.completion.chunk","created":1792741114,"model":"kimi-k3.1-pro","choices":[{"index":0,"delta":{"reasoning_content":"The"},"finish_reason":null}],"system_fingerprint":"fpv0_6e24f0d2"}
>
> ...
>
> data: {"id":"chatcmpl-6adb0efa76cd871ffe47cb4d","object":"chat.completion.chunk","created":1792741114,"model":"kimi-k3.1-pro","choices":[{"index":0,"delta":{"content":"#"},"finish_reason":null}],"system_fingerprint":"fpv0_6e24f0d2"}
>
> ...
>
> data: {"id":"chatcmpl-6adb0efa76cd871ffe47cb4d","object":"chat.completion.chunk","created":1792741114,"model":"kimi-k3.1-pro","choices":[],"usage":{"prompt_tokens":90,"completion_tokens":1139,"total_tokens":1229,"completion_tokens_details":{"reasoning_tokens":620},"prompt_tokens_details":{"cache_write_tokens":0}}}
>
> data: [DONE]
> ```
>
> **`stream_options`**
>
> 通过 `stream_options: {"include_usage": true}` 可在最后一个 chunk（`data: [DONE]` 之前）额外获取 `usage` 字段，显示本次请求的 Token 消耗：
>
> ```python theme={null}
> stream=True,
> stream_options={"include_usage": True}
> ```
>
> > [!NOTE]
> >
> > 详见 [利用 Kimi API 的流式输出功能](https://platform.kimi.com/docs/guide/utilize-the-streaming-output-feature-of-kimi-api.md)。

> **Partial Mode**
>
> Partial Mode（Prefill）允许你在 `messages` 的最后一条 assistant 消息中预填输出前缀，从而引导模型按照你期望的格式或方向继续生成。
>
> **开启方式**
>
> 在 `messages` 数组末尾添加一条 `role="assistant"` 的消息，并设置 `partial: true`：
>
> ````python theme={null}
> completion = client.chat.completions.create(
>     model="kimi-k3.1-pro",
>     messages=[
>         {"role": "user", "content": "用 Python 实现快速排序。"},
>         {"role": "assistant", "content": "```python\n", "partial": True}
>     ]
> )
> ````
>
> 模型从预填的代码块前缀之后续写；返回的 `content` 不包含该前缀。
>
> **常见用途**
>
> * 强制模型以特定格式开头（如 JSON 的 `{` 或 Markdown 代码块前缀）
>
> * 角色扮演中保持角色名称前缀（配合 `name` 字段）
>
> * 在 `finish_reason="length"` 且已有正文时，将已生成的正文作为前缀，并回传原 `reasoning_content` 继续生成
>
> > [!WARNING]
> >
> > 请勿将 Partial Mode 与 `response_format={"type": "json_object"}` 混用，否则可能获得预期外的模型回复。如需引导 JSON 输出，建议直接使用 [Structured Output](https://platform.kimi.com/docs/guide/response_format.md) 或单独设置 `partial: true` 并预填 `{`。
>
> > [!NOTE]
> >
> > 详见 [使用 Kimi API 的 Partial Mode](https://platform.kimi.com/docs/guide/use-partial-mode-feature-of-kimi-api.md)。


## OpenAPI

````yaml POST /v1/chat/completions
openapi: 3.1.0
info:
  title: Moonshot AI API
  version: 1.0.0
  description: Moonshot AI / Kimi 大语言模型服务 API
servers:
  - url: https://api.moonshot.cn
    description: 生产环境
security: []
paths:
  /v1/chat/completions:
    post:
      tags:
        - Chat
      summary: 创建聊天补全
      description: 为聊天消息创建补全结果。支持标准聊天、Partial Mode 和 Tool Use（函数调用）。
      parameters:
        - name: X-Msh-Request-Nonce
          in: header
          required: false
          description: >-
            客户端生成的随机 nonce（推荐使用 UUID v4），携带后即开启请求签名：Kimi API 会在响应头中返回
            `Msh-Request-Timestamp` 与 `Msh-Request-Signature`，用于事后证明该请求确实由 Kimi
            API 处理。只允许一个非空的 Header
            值；值不合法时请求照常执行，但不返回上述响应头。详见[校验请求签名](/api/signatures-verify)。
          schema:
            type: string
            minLength: 1
            example: 7d929748-0ae6-41c2-ab5d-a186498ad721
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/KimiK31ProChatRequest'
                - $ref: '#/components/schemas/KimiK3ChatRequest'
                - $ref: '#/components/schemas/KimiK27CodeChatRequest'
                - $ref: '#/components/schemas/KimiK26ChatRequest'
              discriminator:
                propertyName: model
                mapping:
                  kimi-k3.1-pro: '#/components/schemas/KimiK31ProChatRequest'
                  kimi-k3.1-pro-highspeed: '#/components/schemas/KimiK31ProChatRequest'
                  kimi-k3: '#/components/schemas/KimiK3ChatRequest'
                  kimi-k2.7-code: '#/components/schemas/KimiK27CodeChatRequest'
                  kimi-k2.7-code-highspeed: '#/components/schemas/KimiK27CodeChatRequest'
                  kimi-k2.6: '#/components/schemas/KimiK26ChatRequest'
      responses:
        '200':
          description: 聊天补全响应
          headers:
            Msh-Request-Timestamp:
              description: >-
                Kimi API 接受本次请求时的 Unix 毫秒时间戳。仅当请求携带合法的 `X-Msh-Request-Nonce`
                时返回。
              schema:
                type: integer
                format: int64
                example: 1786338000123
            Msh-Request-Signature:
              description: >-
                以 `reqsigv1_` 为前缀的签名 token，由 Kimi API 基于 nonce、timestamp 和请求中的
                `model` 签发，可通过 `POST /v1/signatures/verify` 校验。仅当请求携带合法的
                `X-Msh-Request-Nonce` 时返回。
              schema:
                type: string
                example: reqsigv1_<opaque-token>
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChatCompletionResponse'
            text/event-stream:
              schema:
                $ref: '#/components/schemas/ChatCompletionChunk'
        '400':
          description: 请求错误 - 参数无效
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: 未授权 - API 密钥无效或缺失
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: 服务器错误
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      security:
        - bearerAuth: []
components:
  schemas:
    KimiK31ProChatRequest:
      title: kimi-k3.1-pro 系列
      allOf:
        - $ref: '#/components/schemas/KimiK3ChatRequestBase'
        - type: object
          properties:
            model:
              type: string
              description: 模型 ID
              enum:
                - kimi-k3.1-pro
                - kimi-k3.1-pro-highspeed
              default: kimi-k3.1-pro
          required:
            - model
    KimiK3ChatRequest:
      title: kimi-k3
      allOf:
        - $ref: '#/components/schemas/KimiK3ChatRequestBase'
        - type: object
          properties:
            model:
              type: string
              description: 模型 ID
              enum:
                - kimi-k3
              default: kimi-k3
          required:
            - model
    KimiK27CodeChatRequest:
      title: kimi-k2.7-code
      allOf:
        - $ref: '#/components/schemas/ChatRequestBase'
        - type: object
          properties:
            model:
              type: string
              description: >-
                模型 ID。可选 `kimi-k2.7-code` 或其高速版
                `kimi-k2.7-code-highspeed`；两者为同一模型、参数完全一致，高速版输出速度约 180
                Tokens/s（短上下文场景可达 260 Tokens/s）。
              enum:
                - kimi-k2.7-code
                - kimi-k2.7-code-highspeed
              default: kimi-k2.7-code
            thinking:
              type: object
              description: >-
                控制 kimi-k2.7-code 模型是否启用思考能力，以及是否完整保留多轮对话中的
                reasoning_content。可选参数，默认值为 {"type": "enabled", "keep": "all"}。


                与 kimi-k2.6 的差异：

                - `type` 仅支持 `"enabled"`。与 kimi-k2.6 不同，不支持 `"disabled"` —
                传入会报错。该模型始终开启思考。

                - `keep` 仅接受合法值 `"all"`；不传或传 `"all"` 时服务端均按 `"all"`
                处理，传入其他非法值会报错。因此该模型始终启用 Preserved Thinking。
              properties:
                type:
                  type: string
                  enum:
                    - enabled
                  description: >-
                    启用思考能力。对 kimi-k2.7-code 仅接受 `"enabled"`；传入 `"disabled"`
                    会报错。这与同时支持 `"disabled"` 的 kimi-k2.6 不同。
                keep:
                  type:
                    - string
                    - 'null'
                  enum:
                    - all
                    - null
                  description: >-
                    控制是否保留历史对话轮次（previous turns）的 reasoning_content，从而启用
                    Preserved Thinking。


                    - 对 kimi-k2.7-code，该参数仅接受合法值 `"all"`：传 `"all"`、传 `null`
                    或不传表现完全一致，服务端均按 `"all"` 处理 — 始终保留历史轮次的
                    reasoning_content；传入其他非法值会报错。这与 kimi-k2.6 不同，k2.6 默认为
                    `null`（除非显式设为 `"all"`，否则不保留历史思考）。

                    - 由于 Preserved Thinking 始终开启，请把每一轮历史 assistant 消息中的
                    reasoning_content 原样保留在 messages 中。

                    - 注意：该参数只影响历史轮次的 reasoning_content；不改变模型在当前 turn
                    内是否产生/输出思考内容（由 `type` 控制）。关于使用方式的最佳实践，详见 [Preserved
                    Thinking](/guide/use-thinking-models#preserved-thinking)。
              required:
                - type
              additionalProperties: false
          required:
            - model
    KimiK26ChatRequest:
      title: kimi-k2.6
      allOf:
        - $ref: '#/components/schemas/ChatRequestBase'
        - type: object
          properties:
            model:
              type: string
              description: 模型 ID
              enum:
                - kimi-k2.6
              default: kimi-k2.6
            thinking:
              type: object
              description: >-
                控制 kimi-k2.6 模型是否启用思考能力，以及是否完整保留多轮对话中的
                reasoning_content。可选参数，默认值为 {"type": "enabled"}。
              properties:
                type:
                  type: string
                  enum:
                    - enabled
                    - disabled
                  description: 启用或禁用思考能力
                keep:
                  type:
                    - string
                    - 'null'
                  enum:
                    - all
                    - null
                  description: >-
                    控制是否保留历史对话轮次（previous turns）的 reasoning_content，从而启用
                    Preserved Thinking。默认为 `null`，即不保留历史轮次的思考内容。


                    - `null`（默认）或不传：服务端会忽略历史 turns 的 reasoning_content。

                    - `"all"`：保留历史 turns 的 reasoning_content 并随上下文一同提供给模型，启用
                    Preserved Thinking。使用时需把每一轮历史 assistant 消息中的
                    reasoning_content 原样保留在 messages 中。推荐与 `type: "enabled"`
                    搭配使用。

                    - 注意：该参数只影响历史轮次的 reasoning_content；不改变模型在当前 turn
                    内是否产生/输出思考内容（由 `type` 控制）。关于使用方式的最佳实践，详见 [Preserved
                    Thinking](/guide/use-thinking-models#preserved-thinking)。
              required:
                - type
              additionalProperties: false
          required:
            - model
    ChatCompletionResponse:
      type: object
      properties:
        id:
          type: string
          description: 补全结果的唯一标识符
        object:
          type: string
          description: 对象类型
          example: chat.completion
        created:
          type: integer
          description: 补全创建时的 Unix 时间戳
        model:
          type: string
          description: 用于补全的模型
        choices:
          type: array
          description: 补全选项列表
          items:
            type: object
            properties:
              index:
                type: integer
              message:
                type: object
                properties:
                  role:
                    type: string
                    enum:
                      - assistant
                  content:
                    type:
                      - string
                      - 'null'
                    description: 助手的消息内容
                  tool_calls:
                    type: array
                    description: 模型发起的工具调用
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        type:
                          type: string
                          enum:
                            - function
                        function:
                          type: object
                          properties:
                            name:
                              type: string
                            arguments:
                              type: string
                              description: 函数参数的 JSON 字符串
                  reasoning_content:
                    type:
                      - string
                      - 'null'
                    description: 推理过程（仅在思考模式启用时返回）
              finish_reason:
                type: string
                enum:
                  - stop
                  - length
                  - tool_calls
        usage:
          type: object
          properties:
            prompt_tokens:
              type: integer
              description: 提示中的 Token 数量
            completion_tokens:
              type: integer
              description: 补全中的 Token 数量
            total_tokens:
              type: integer
              description: 使用的总 Token 数量
            cached_tokens:
              type: integer
              description: 命中缓存的 Token 数量
            prompt_tokens_details:
              type: object
              description: >-
                输入 Token 的分类明细。cached_tokens、cache_write_tokens 与未缓存部分互斥，三者之和等于
                prompt_tokens
              properties:
                cached_tokens:
                  type: integer
                  description: 命中缓存的 Token 数量
                cache_write_tokens:
                  type: integer
                  description: 本次写入缓存的 Token 数量。按写入时的 TTL 计费，详见 prompt_cache_options
              required:
                - cached_tokens
                - cache_write_tokens
    ChatCompletionChunk:
      type: object
      properties:
        id:
          type: string
          description: 补全结果的唯一标识符
        object:
          type: string
          description: 对象类型
          example: chat.completion.chunk
        created:
          type: integer
          description: 补全创建时的 Unix 时间戳
        model:
          type: string
          description: 用于补全的模型
        choices:
          type: array
          description: 补全选项列表
          items:
            $ref: '#/components/schemas/ChoiceDelta'
        usage:
          type:
            - object
            - 'null'
          description: Token 使用统计。包含 usage 的最终 chunk 中为对象，其他 chunk 中为 null
          properties:
            prompt_tokens:
              type: integer
              description: 提示中的 Token 数量
            completion_tokens:
              type: integer
              description: 补全中的 Token 数量
            total_tokens:
              type: integer
              description: 使用的总 Token 数量
            cached_tokens:
              type: integer
              description: 命中缓存的 Token 数量
            prompt_tokens_details:
              type: object
              description: >-
                输入 Token 的分类明细。cached_tokens、cache_write_tokens 与未缓存部分互斥，三者之和等于
                prompt_tokens
              properties:
                cached_tokens:
                  type: integer
                  description: 命中缓存的 Token 数量
                cache_write_tokens:
                  type: integer
                  description: 本次写入缓存的 Token 数量。按写入时的 TTL 计费，详见 prompt_cache_options
              required:
                - cached_tokens
                - cache_write_tokens
    ErrorResponse:
      type: object
      properties:
        error:
          type: object
          properties:
            message:
              type: string
              description: 描述错误原因的错误消息
            type:
              type: string
              description: 错误类型
            code:
              type: string
              description: 错误码
          required:
            - message
      required:
        - error
    KimiK3ChatRequestBase:
      allOf:
        - $ref: '#/components/schemas/ChatRequestCommon'
        - type: object
          properties:
            messages:
              type: array
              description: 对话消息列表。
              items:
                $ref: '#/components/schemas/KimiK3Message'
            reasoning_effort:
              type: string
              enum:
                - low
                - high
                - max
              default: max
              description: >-
                Kimi K3 系列始终启用思考，并开启 Preserved Thinking。推理强度支持 low、high 和
                max，默认为 max。
          required:
            - messages
    ChatRequestBase:
      type: object
      properties:
        logprobs:
          type: boolean
          default: false
          description: >-
            是否返回输出 Token 的对数概率。设置为 true 时，在响应 message 的 logprobs 字段中返回每个输出 Token
            的对数概率信息
        top_logprobs:
          type: integer
          minimum: 0
          maximum: 20
          description: >-
            指定在每个 Token 位置返回概率最高的候选 Token 数量（0-20），各候选 Token 附带对数概率。使用此参数时必须将
            logprobs 设置为 true
        prediction:
          type: object
          description: Predicted Output 配置。当模型响应的大部分内容可以提前预知时（例如重新生成仅有少量修改的文件），可显著降低响应延迟
          properties:
            type:
              type: string
              enum:
                - content
              description: 预测内容类型，当前仅支持 content
            content:
              oneOf:
                - type: string
                - type: array
                  items:
                    type: object
              description: >-
                需要模型匹配的静态预测内容，例如正在重新生成的文本文件内容。可以是 string，也可以是
                array[object]（数组元素仅支持 type 为 text 的文本内容）
        messages:
          type: array
          description: >-
            包含迄今为止对话的消息列表。每个元素格式为 {"role": "user", "content": "你好"}。role 支持
            system、user、assistant、tool 其一，content 不得为空。content 字段可以是 string，也可以是
            array[object]（用于多模态输入）
          items:
            $ref: '#/components/schemas/Message'
        max_tokens:
          type: integer
          deprecated: true
          description: 已弃用，请使用 max_completion_tokens
        max_completion_tokens:
          type: integer
          description: >-
            聊天补全生成的最大 Token 数量。默认值因模型而异：Kimi K3
            系列（kimi-k3.1-pro、kimi-k3.1-pro-highspeed、kimi-k3）默认为 131072，最大可设置为
            1048576。如果结果达到最大 Token 数而未结束，finish reason 将为 "length"；否则为
            "stop"。此值为期望返回的 Token 长度，而非输入加输出的总长度。如果输入 Token 数（`prompt_tokens`）与
            `max_completion_tokens` 之和超过模型上下文窗口，API
            会根据剩余上下文空间自动调低本次请求的生成上限，并继续处理请求。输入 Token 数本身必须小于模型上下文窗口。
        response_format:
          type: object
          description: >-
            控制模型输出格式。默认值为 {"type": "text"}，即纯文本输出。设置为 {"type": "json_object"}
            可启用 JSON 模式，确保输出为合法 JSON 对象（需在 prompt 中引导模型输出 JSON 并指定格式）。设置为
            {"type": "json_schema"} 可启用 Structured Output，按指定的 JSON Schema
            约束输出结构（推荐，需配合 json_schema 字段使用）。如果您在使用 JSON Schema 时遇到校验问题，欢迎到 walle
            GitHub Issues (https://github.com/MoonshotAI/walle/issues) 提交反馈。
          properties:
            type:
              type: string
              enum:
                - text
                - json_object
                - json_schema
              description: >-
                输出格式类型。text：默认，纯文本输出；json_object：保证输出为合法 JSON 对象；json_schema：按指定
                JSON Schema 约束输出（推荐，需配合 json_schema 字段使用）
            json_schema:
              type: object
              description: 当 type 为 json_schema 时使用，定义输出应遵循的 JSON Schema
              properties:
                name:
                  type: string
                  description: Schema 名称，用于标识
                strict:
                  type: boolean
                  default: true
                  description: >-
                    是否严格按 schema 约束输出。默认为 true。为 true 时 schema 需符合 MFJS
                    规范，不符合会返回错误或 warning；为 false 时仅保证输出为合法 JSON 对象，不强制约束内部结构。
                schema:
                  type: object
                  description: >-
                    JSON Schema 对象，定义输出应遵循的结构。需符合 MFJS（Moonshot Flavored JSON
                    Schema）规范。可使用 walle CLI 工具自检：go install
                    github.com/moonshotai/walle/cmd/walle@latest && walle
                    -schema '你的schema' -level strict
                  additionalProperties: true
              required:
                - name
                - schema
        stop:
          oneOf:
            - type: string
            - type: array
              items:
                type: string
              maxItems: 5
          default: null
          description: 停用词，完全匹配时将停止输出。匹配到的词本身不会被输出。最多允许 5 个字符串，每个不超过 32 字节
        stream:
          type: boolean
          default: false
          description: 是否以流式方式返回响应，默认 false
        stream_options:
          type: object
          description: 流式响应选项
          properties:
            include_usage:
              type: boolean
              default: false
              description: >-
                如果设置，将在 data: [DONE] 消息之前额外发送一个 chunk。该 chunk 的 usage 字段显示整个请求的
                Token 使用统计，choices 字段为空数组。其他所有 chunk 也会包含 usage 字段，但值为
                null。注意：如果流中断，可能无法收到包含总 Token 用量的最终 chunk
        tools:
          type: array
          description: 模型可调用的工具列表
          items:
            $ref: '#/components/schemas/ToolDefinition'
        prompt_cache_key:
          type: string
          default: null
          description: >-
            用于缓存相似请求的响应以优化缓存命中率。对于 Coding Agent，通常是代表单个会话的 session id 或 task
            id；退出并恢复会话时应保持不变。对于 Kimi Code Plan，此字段为必填以提高缓存命中率。对于其他多轮对话
            Agent，也建议使用此字段
        prompt_cache_options:
          type: object
          description: 上下文缓存写入选项。不传时默认开启缓存写入（5m 档）：系统自动将请求前缀写入 5m 档缓存
          properties:
            mode:
              type: string
              enum:
                - implicit
              default: implicit
              description: 缓存写入模式，仅支持 implicit：自动将请求前缀写入缓存
            ttl:
              type: string
              enum:
                - 5m
                - 1h
              default: 5m
              description: 缓存写入的有效期，5m 与 1h 两档缓存相互独立。相同前缀的请求在有效期内命中后，缓存有效期按原 TTL 刷新
        safety_identifier:
          type: string
          description: 用于检测可能违反使用政策的用户的稳定标识符。应为唯一标识每个用户的字符串。建议对用户名或邮箱进行哈希处理以避免发送可识别信息
        tool_choice:
          oneOf:
            - type: string
              enum:
                - auto
                - none
                - required
              description: auto：模型自行决定是否调用工具；none：不调用工具；required：强制调用工具
            - type: object
              description: 强制调用指定工具
              properties:
                type:
                  type: string
                  enum:
                    - function
                function:
                  type: object
                  properties:
                    name:
                      type: string
                      description: 要调用的函数名称
                  required:
                    - name
              required:
                - type
                - function
          description: >-
            控制模型是否调用工具。`auto`（默认）：模型自行决定是否调用工具；`none`：不调用工具；`required`：强制调用工具；也可传入特定函数对象强制调用指定工具。
      required:
        - messages
    ChoiceDelta:
      type: object
      properties:
        index:
          type: integer
          description: 选项索引
        delta:
          type: object
          description: 增量内容对象
          properties:
            role:
              type: string
              description: 消息角色（仅在首个 chunk 中出现）
            content:
              type: string
              description: 消息内容片段
            tool_calls:
              type: array
              description: 模型发起的工具调用片段
              items:
                type: object
                properties:
                  id:
                    type: string
                  type:
                    type: string
                    enum:
                      - function
                  function:
                    type: object
                    properties:
                      name:
                        type: string
                      arguments:
                        type: string
                        description: 函数参数的 JSON 字符串
        finish_reason:
          type:
            - string
            - 'null'
          enum:
            - stop
            - length
            - tool_calls
            - null
          description: 停止原因，仅在最后一个 chunk 中出现
        usage:
          type: object
          description: Token 使用统计（可选）
          properties:
            prompt_tokens:
              type: integer
              description: 提示中的 Token 数量
            completion_tokens:
              type: integer
              description: 补全中的 Token 数量
            total_tokens:
              type: integer
              description: 使用的总 Token 数量
    ChatRequestCommon:
      type: object
      properties:
        logprobs:
          type: boolean
          default: false
          description: >-
            是否返回输出 Token 的对数概率。设置为 true 时，在响应 message 的 logprobs 字段中返回每个输出 Token
            的对数概率信息
        top_logprobs:
          type: integer
          minimum: 0
          maximum: 20
          description: >-
            指定在每个 Token 位置返回概率最高的候选 Token 数量（0-20），各候选 Token 附带对数概率。使用此参数时必须将
            logprobs 设置为 true
        prediction:
          type: object
          description: Predicted Output 配置。当模型响应的大部分内容可以提前预知时（例如重新生成仅有少量修改的文件），可显著降低响应延迟
          properties:
            type:
              type: string
              enum:
                - content
              description: 预测内容类型，当前仅支持 content
            content:
              oneOf:
                - type: string
                - type: array
                  items:
                    type: object
              description: >-
                需要模型匹配的静态预测内容，例如正在重新生成的文本文件内容。可以是 string，也可以是
                array[object]（数组元素仅支持 type 为 text 的文本内容）
        max_tokens:
          type: integer
          deprecated: true
          description: 已弃用，请使用 max_completion_tokens
        max_completion_tokens:
          type: integer
          description: >-
            聊天补全生成的最大 Token 数量。默认值因模型而异：Kimi K3
            系列（kimi-k3.1-pro、kimi-k3.1-pro-highspeed、kimi-k3）默认为 131072，最大可设置为
            1048576。如果结果达到最大 Token 数而未结束，finish reason 将为 "length"；否则为
            "stop"。此值为期望返回的 Token 长度，而非输入加输出的总长度。如果输入 Token 数（`prompt_tokens`）与
            `max_completion_tokens` 之和超过模型上下文窗口，API
            会根据剩余上下文空间自动调低本次请求的生成上限，并继续处理请求。输入 Token 数本身必须小于模型上下文窗口。
        response_format:
          type: object
          description: >-
            控制模型输出格式。默认值为 {"type": "text"}，即纯文本输出。设置为 {"type": "json_object"}
            可启用 JSON 模式，确保输出为合法 JSON 对象（需在 prompt 中引导模型输出 JSON 并指定格式）。设置为
            {"type": "json_schema"} 可启用 Structured Output，按指定的 JSON Schema
            约束输出结构（推荐，需配合 json_schema 字段使用）。如果您在使用 JSON Schema 时遇到校验问题，欢迎到 walle
            GitHub Issues (https://github.com/MoonshotAI/walle/issues) 提交反馈。
          properties:
            type:
              type: string
              enum:
                - text
                - json_object
                - json_schema
              description: >-
                输出格式类型。text：默认，纯文本输出；json_object：保证输出为合法 JSON 对象；json_schema：按指定
                JSON Schema 约束输出（推荐，需配合 json_schema 字段使用）
            json_schema:
              type: object
              description: 当 type 为 json_schema 时使用，定义输出应遵循的 JSON Schema
              properties:
                name:
                  type: string
                  description: Schema 名称，用于标识
                strict:
                  type: boolean
                  default: true
                  description: >-
                    是否严格按 schema 约束输出。默认为 true。为 true 时 schema 需符合 MFJS
                    规范，不符合会返回错误或 warning；为 false 时仅保证输出为合法 JSON 对象，不强制约束内部结构。
                schema:
                  type: object
                  description: >-
                    JSON Schema 对象，定义输出应遵循的结构。需符合 MFJS（Moonshot Flavored JSON
                    Schema）规范。可使用 walle CLI 工具自检：go install
                    github.com/moonshotai/walle/cmd/walle@latest && walle
                    -schema '你的schema' -level strict
                  additionalProperties: true
              required:
                - name
                - schema
        stop:
          oneOf:
            - type: string
            - type: array
              items:
                type: string
              maxItems: 5
          default: null
          description: 停用词，完全匹配时将停止输出。匹配到的词本身不会被输出。最多允许 5 个字符串，每个不超过 32 字节
        stream:
          type: boolean
          default: false
          description: 是否以流式方式返回响应，默认 false
        stream_options:
          type: object
          description: 流式响应选项
          properties:
            include_usage:
              type: boolean
              default: false
              description: >-
                如果设置，将在 data: [DONE] 消息之前额外发送一个 chunk。该 chunk 的 usage 字段显示整个请求的
                Token 使用统计，choices 字段为空数组。其他所有 chunk 也会包含 usage 字段，但值为
                null。注意：如果流中断，可能无法收到包含总 Token 用量的最终 chunk
        tools:
          type: array
          description: 模型可调用的工具列表
          items:
            $ref: '#/components/schemas/ToolDefinition'
        prompt_cache_key:
          type: string
          default: null
          description: >-
            用于缓存相似请求的响应以优化缓存命中率。对于 Coding Agent，通常是代表单个会话的 session id 或 task
            id；退出并恢复会话时应保持不变。对于 Kimi Code Plan，此字段为必填以提高缓存命中率。对于其他多轮对话
            Agent，也建议使用此字段
        prompt_cache_options:
          type: object
          description: 上下文缓存写入选项。不传时默认开启缓存写入（5m 档）：系统自动将请求前缀写入 5m 档缓存
          properties:
            mode:
              type: string
              enum:
                - implicit
              default: implicit
              description: 缓存写入模式，仅支持 implicit：自动将请求前缀写入缓存
            ttl:
              type: string
              enum:
                - 5m
                - 1h
              default: 5m
              description: 缓存写入的有效期，5m 与 1h 两档缓存相互独立。相同前缀的请求在有效期内命中后，缓存有效期按原 TTL 刷新
        safety_identifier:
          type: string
          description: 用于检测可能违反使用政策的用户的稳定标识符。应为唯一标识每个用户的字符串。建议对用户名或邮箱进行哈希处理以避免发送可识别信息
        tool_choice:
          oneOf:
            - type: string
              enum:
                - auto
                - none
                - required
              description: auto：模型自行决定是否调用工具；none：不调用工具；required：强制调用工具
            - type: object
              description: 强制调用指定工具
              properties:
                type:
                  type: string
                  enum:
                    - function
                function:
                  type: object
                  properties:
                    name:
                      type: string
                      description: 要调用的函数名称
                  required:
                    - name
              required:
                - type
                - function
          description: >-
            控制模型是否调用工具。`auto`（默认）：模型自行决定是否调用工具；`none`：不调用工具；`required`：强制调用工具；也可传入特定函数对象强制调用指定工具。
    KimiK3Message:
      oneOf:
        - $ref: '#/components/schemas/Message'
          title: 标准消息
        - $ref: '#/components/schemas/KimiK3DynamicToolMessage'
          title: 动态工具消息
      description: 支持标准对话消息和用于动态加载工具的 system 消息。
    Message:
      type: object
      properties:
        role:
          type: string
          enum:
            - system
            - user
            - assistant
            - tool
          example: user
          description: 消息发送者的角色，支持 system、user、assistant、tool
        content:
          oneOf:
            - type: string
            - type: array
              items:
                oneOf:
                  - title: text
                    type: object
                    properties:
                      type:
                        type: string
                        enum:
                          - text
                      text:
                        type: string
                    required:
                      - type
                      - text
                  - title: image_url
                    type: object
                    properties:
                      type:
                        type: string
                        enum:
                          - image_url
                      image_url:
                        oneOf:
                          - type: object
                            properties:
                              url:
                                type: string
                            required:
                              - url
                          - type: string
                    required:
                      - type
                      - image_url
                  - title: video_url
                    type: object
                    properties:
                      type:
                        type: string
                        enum:
                          - video_url
                      video_url:
                        oneOf:
                          - type: object
                            properties:
                              url:
                                type: string
                            required:
                              - url
                          - type: string
                    required:
                      - type
                      - video_url
          example: 你好
          description: 消息内容。可以是纯文本字符串，也可以是包含 text/image_url/video_url 类型的对象数组（用于多模态输入）
        name:
          type: string
          default: null
          description: 消息发送者的名称（可选）
        partial:
          type: boolean
          default: false
          description: 在最后一条 assistant 消息中设置为 true 以启用 Partial Mode
      required:
        - role
        - content
    ToolDefinition:
      type: object
      properties:
        type:
          type: string
          enum:
            - function
        function:
          type: object
          properties:
            name:
              type: string
              description: 函数名称。必须符合正则表达式：^[a-zA-Z_][a-zA-Z0-9-_]{0,127}$
              pattern: ^[a-zA-Z_][a-zA-Z0-9-_]{0,127}$
            description:
              type: string
              description: 函数功能描述
            parameters:
              type: object
              description: >-
                函数参数，JSON Schema 格式。需符合 [MFJS（Moonshot Flavored JSON
                Schema）规范](https://github.com/MoonshotAI/walle/blob/main/docs/mfjs-spec.zh.md)。
              additionalProperties: true
            strict:
              type: boolean
              default: true
              description: >-
                是否严格按 parameters schema 约束工具调用参数的输出。默认为 true。设为 false 时仅保证输出为合法
                JSON 对象，不强制约束内部结构。
          required:
            - name
            - parameters
      required:
        - type
        - function
    KimiK3DynamicToolMessage:
      type: object
      description: 通过 tools 字段声明后续对话可用的工具。role 必须为 system，且不能包含 content 字段。
      properties:
        role:
          type: string
          enum:
            - system
          description: 动态加载工具消息的角色，固定为 system
        tools:
          type: array
          description: 从该消息位置开始可供模型调用的工具列表
          items:
            $ref: '#/components/schemas/ToolDefinition'
      required:
        - role
        - tools
      additionalProperties: false
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: >-
        Authorization 请求头需要一个 Bearer 令牌。使用 MOONSHOT_API_KEY 作为令牌。这是一个服务端密钥，请在
        [API 密钥页面](https://platform.kimi.com/console/api-keys) 生成。

````