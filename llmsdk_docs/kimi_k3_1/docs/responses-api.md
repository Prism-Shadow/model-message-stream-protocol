> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Responses API

> 创建一次模型响应。传入文本或图片，生成文本或 JSON 输出；也可以让模型调用你定义的函数工具，或使用服务端执行的联网搜索。

> **调用示例**
>
> ```python Python theme={null}
> import os
>
> from openai import OpenAI
>
> client = OpenAI(
>     api_key=os.environ["MOONSHOT_API_KEY"],
>     base_url="https://api.moonshot.cn/v1",
> )
>
> response = client.responses.create(
>     model="kimi-k3.1-pro",
>     instructions="你是 Kimi，一个由 Moonshot AI 提供的人工智能助手。",
>     input="用一句话解释什么是上下文缓存。",
> )
>
> print(response.output_text)
> ```
>
> ```javascript Node.js theme={null}
> import OpenAI from "openai";
>
> const client = new OpenAI({
>     apiKey: process.env.MOONSHOT_API_KEY,
>     baseURL: "https://api.moonshot.cn/v1",
> });
>
> const response = await client.responses.create({
>     model: "kimi-k3.1-pro",
>     instructions: "你是 Kimi，一个由 Moonshot AI 提供的人工智能助手。",
>     input: "用一句话解释什么是上下文缓存。",
> });
>
> console.log(response.output_text);
> ```
>
> ```bash cURL theme={null}
> curl https://api.moonshot.cn/v1/responses \
>     --header "Content-Type: application/json" \
>     --header "Authorization: Bearer $MOONSHOT_API_KEY" \
>     --data '{
>         "model": "kimi-k3.1-pro",
>         "instructions": "你是 Kimi，一个由 Moonshot AI 提供的人工智能助手。",
>         "input": "用一句话解释什么是上下文缓存。"
>     }'
> ```

> **工具调用 Tool Use**
>
> `tools` 支持四种工具类型：`function`、`namespace`、`custom`（仅 `apply_patch`）与 `web_search`，其他类型不支持。前三种由你在本地执行：模型返回调用请求，你执行后把结果回传；`web_search` 由服务端执行，无需你处理。
>
> **函数调用**
>
> 通过 `tools` 传入 JSON Schema 定义的函数，模型可决定在适当时机调用它们：
>
> ```json theme={null}
> {
>   "model": "kimi-k3.1-pro",
>   "input": "北京今天天气怎么样？",
>   "tools": [
>     {
>       "type": "function",
>       "name": "get_weather",
>       "description": "获取指定城市的天气",
>       "parameters": {
>         "type": "object",
>         "properties": {
>           "city": {"type": "string", "description": "城市名称"}
>         },
>         "required": ["city"]
>       }
>     }
>   ]
> }
> ```
>
> 模型决定调用时，`output` 中会包含 `function_call` item，`arguments` 是参数的 JSON 字符串：
>
> ```json theme={null}
> {
>   "type": "function_call",
>   "id": "fc_IrcmDq5JNO0JhWdEpsuZnL9J",
>   "status": "completed",
>   "call_id": "get_weather_0",
>   "name": "get_weather",
>   "arguments": "{\"city\":\"北京\"}"
> }
> ```
>
> 在本地执行后，把上一轮的 `output` 原样追加到 `input`，再追加一条 `function_call_output`（`call_id` 必须与 `function_call` 中的一致），发起下一次请求：
>
> ```json theme={null}
> {
>   "model": "kimi-k3.1-pro",
>   "input": [
>     {"type": "message", "role": "user", "content": "北京今天天气怎么样？"},
>     {"type": "function_call", "call_id": "get_weather_0", "name": "get_weather", "arguments": "{\"city\":\"北京\"}"},
>     {"type": "function_call_output", "call_id": "get_weather_0", "output": "晴，25°C"}
>   ],
>   "tools": [
>     {
>       "type": "function",
>       "name": "get_weather",
>       "description": "获取指定城市的天气",
>       "parameters": {
>         "type": "object",
>         "properties": {
>           "city": {"type": "string", "description": "城市名称"}
>         },
>         "required": ["city"]
>       }
>     }
>   ]
> }
> ```
>
> **联网搜索**
>
> 在 `tools` 中加入 `{"type": "web_search"}`，服务端会先根据输入判断是否需要搜索，需要时执行搜索并把结果注入模型上下文，模型基于搜索结果作答：
>
> ```json theme={null}
> {
>   "model": "kimi-k3.1-pro",
>   "input": "今天有什么重大新闻？",
>   "tools": [
>     {"type": "web_search"}
>   ]
> }
> ```
>
> 执行了搜索时，`output` 最前面会多出一个 `web_search_call` item。在 `include` 中加入 `web_search_call.action.sources` 可以拿到搜索命中的网页来源：
>
> ```json theme={null}
> {
>   "type": "web_search_call",
>   "id": "ws_dackjbcdo9rs73fo3oig",
>   "status": "completed",
>   "action": {
>     "type": "search",
>     "query": "2026年9月3日 重大新闻",
>     "sources": [
>       {"type": "url", "url": "https://example.com/news/1", "title": "新闻标题"}
>     ]
>   }
> }
> ```

> **上下文缓存（Cache Write）**
>
> Kimi API 会对重复的请求前缀自动启用上下文缓存，命中部分以更低价格计费且响应更快。通过 `prompt_cache_options` 可以控制缓存写入行为：
>
> | 参数 | 类型 | 说明 |
> | - | - | - |
> | `prompt_cache_options` | object | 上下文缓存写入选项。不传时默认开启缓存写入（`5m` 档） |
> | `prompt_cache_options.mode` | `"implicit"` | 缓存写入模式，仅支持 `implicit`：自动将请求前缀写入缓存 |
> | `prompt_cache_options.ttl` | `"5m"` \| `"1h"` | 缓存写入的有效期，仅支持 `5m`、`1h` 两档（默认 `5m`），两档缓存相互独立 |
>
> ```json theme={null}
> {
>   "model": "kimi-k3.1-pro",
>   "input": "你好",
>   "prompt_cache_options": { "mode": "implicit", "ttl": "1h" }
> }
> ```
>
> 不传 `prompt_cache_options` 时，默认自动开启缓存写入（`5m` 档）。响应顶层会回显服务端实际应用的 `prompt_cache_options`，以其返回为准。
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
> `usage.input_tokens` 始终为总输入 Token 数，其内部分类通过 `input_tokens_details` 返回：
>
> | 字段 | 说明 |
> | - | - |
> | `usage.input_tokens_details.cached_tokens` | 命中缓存的 Token 数量（缓存读取） |
> | `usage.input_tokens_details.cache_write_tokens` | 本次写入缓存的 Token 数量（缓存写入） |
>
> `cached_tokens`、`cache_write_tokens` 与未缓存部分互斥，三者之和等于 `input_tokens`，即未缓存部分 = `input_tokens` − `cached_tokens` − `cache_write_tokens`。
>
> > [!NOTE]
> >
> > Context Caching 的机制背景详见[上下文缓存指南](https://platform.kimi.com/docs/guide/context-caching.md)。


## OpenAPI

````yaml POST /v1/responses
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
  /v1/responses:
    post:
      tags:
        - Responses
      summary: 创建一次模型响应
      description: >-
        创建一次模型响应。传入文本或图片，生成文本或 JSON 输出；也可以让模型调用你定义的函数工具。`stream` 为 `true` 时以 SSE
        事件流返回。
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
              $ref: '#/components/schemas/ResponsesRequest'
      responses:
        '200':
          description: 响应创建成功
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
                $ref: '#/components/schemas/ResponsesResponse'
            text/event-stream:
              schema:
                $ref: '#/components/schemas/ResponsesStreamEvent'
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
        '403':
          description: 无权访问该资源
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '429':
          description: 请求过于频繁或额度不足
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
    ResponsesRequest:
      type: object
      required:
        - model
        - input
      properties:
        model:
          type: string
          description: >-
            使用的模型 ID。本接口当前支持 `kimi-k3.1-pro`、`kimi-k3.1-pro-highspeed` 和
            `kimi-k3`。
          example: kimi-k3.1-pro
        input:
          description: 本次请求的输入。传字符串等价于一条 user 消息；传数组时按顺序给出带类型的 item，可包含历史对话、工具调用与工具结果。
          oneOf:
            - type: string
            - type: array
              items:
                $ref: '#/components/schemas/ResponsesInputItem'
        instructions:
          type: string
          description: 顶层系统指令，作为最靠前的指令生效。
        stream:
          type: boolean
          default: false
          description: 为 true 时以 SSE 事件流返回响应。
        max_output_tokens:
          type: integer
          description: >-
            本次响应最多生成的 Token 数量。Kimi K3
            系列（`kimi-k3.1-pro`、`kimi-k3.1-pro-highspeed`、`kimi-k3`）默认为
            131072，最大可设置为 1048576。此值为期望返回的 Token 长度，而非输入加输出的总长度。达到上限时 `status` 为
            `incomplete`，`incomplete_details.reason` 为 `max_output_tokens`。
        reasoning:
          type: object
          description: 推理相关配置。
          properties:
            effort:
              type: string
              enum:
                - low
                - high
                - max
              default: max
              description: 推理强度。档位越高，模型推理越充分，通常也会带来更高的延迟与推理 Token 消耗。
        text:
          type: object
          description: 输出文本配置。
          properties:
            format:
              type: object
              required:
                - type
                - schema
              description: 用 JSON Schema 约束输出结构。
              properties:
                type:
                  type: string
                  enum:
                    - json_schema
                name:
                  type: string
                  description: Schema 名称，缺省为 `output`。
                schema:
                  type: object
                  description: 描述输出结构的 JSON Schema。
                strict:
                  type: boolean
                  description: 是否严格按 Schema 约束输出。
        tools:
          type: array
          description: 模型可调用的工具列表。
          items:
            $ref: '#/components/schemas/ResponsesTool'
        tool_choice:
          $ref: '#/components/schemas/ResponsesToolChoice'
        include:
          type: array
          items:
            type: string
            enum:
              - web_search_call.results
              - web_search_call.action.sources
          description: >-
            要额外返回的字段，仅在使用 `web_search` 工具时有效。`web_search_call.action.sources`
            返回搜索命中的网页来源；`web_search_call.results` 返回图片搜索结果。
        prompt_cache_key:
          type: string
          description: 上下文缓存标识，同一会话使用相同取值可提升缓存命中率。
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
    ResponsesResponse:
      type: object
      description: 一次模型响应。
      properties:
        id:
          type: string
          description: 响应的唯一标识符。
          example: resp_68f0c1c2d3e4f5a6b7c8d9e0
        object:
          type: string
          enum:
            - response
        created_at:
          type: integer
          description: 响应创建时的 Unix 时间戳。
        completed_at:
          type:
            - integer
            - 'null'
          description: >-
            响应结束时的 Unix 时间戳。`status` 为 `completed` 或 `incomplete` 时给出，为
            `in_progress` 或 `failed` 时是 `null`。
        status:
          type: string
          enum:
            - in_progress
            - completed
            - incomplete
            - failed
          description: 响应状态。流式的起手快照为 `in_progress`。
        model:
          type: string
          description: 产生本次响应的模型。
        output:
          type: array
          description: 输出 item 数组，顺序为 web_search_call（如有）、reasoning、message、工具调用。
          items:
            $ref: '#/components/schemas/ResponsesOutputItem'
        usage:
          oneOf:
            - $ref: '#/components/schemas/ResponsesUsage'
            - type: 'null'
        incomplete_details:
          type:
            - object
            - 'null'
          description: '`status` 为 `incomplete` 时给出原因。'
          properties:
            reason:
              type: string
              enum:
                - max_output_tokens
                - content_filter
        error:
          type:
            - object
            - 'null'
          description: '`status` 为 `failed` 时给出错误信息。'
          properties:
            code:
              type: string
            message:
              type: string
        instructions:
          type:
            - string
            - 'null'
        reasoning:
          type:
            - object
            - 'null'
        text:
          type:
            - object
            - 'null'
        tools:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/ResponsesTool'
        tool_choice:
          oneOf:
            - $ref: '#/components/schemas/ResponsesToolChoice'
            - type: 'null'
        max_output_tokens:
          type:
            - integer
            - 'null'
        temperature:
          type:
            - number
            - 'null'
        top_p:
          type:
            - number
            - 'null'
        metadata:
          type:
            - object
            - 'null'
        parallel_tool_calls:
          type: boolean
        service_tier:
          type:
            - string
            - 'null'
        store:
          type: boolean
          description: 固定为 `false`。
        background:
          type:
            - boolean
            - 'null'
          description: 固定为 `false`。
        previous_response_id:
          type:
            - string
            - 'null'
          description: 固定为 `null`。
        conversation:
          type:
            - object
            - 'null'
          description: 固定为 `null`。
        prompt_cache_options:
          type: object
          description: 服务端实际应用的上下文缓存写入选项。当请求省略 prompt_cache_options 时，以此处返回的 mode 和 ttl 为准
          properties:
            mode:
              type: string
              enum:
                - implicit
              description: 实际应用的写入模式
            ttl:
              type: string
              enum:
                - 5m
                - 1h
              description: 实际应用的缓存有效期
    ResponsesStreamEvent:
      type: object
      description: >-
        `stream: true` 时返回的单个 SSE 事件。SSE 帧形如 `event: <type>` 加 `data:
        <json>`，事件体的其余字段随 `type` 变化。
      required:
        - type
        - sequence_number
      properties:
        type:
          type: string
          enum:
            - response.created
            - response.in_progress
            - response.output_item.added
            - response.output_item.done
            - response.content_part.added
            - response.content_part.done
            - response.output_text.delta
            - response.output_text.done
            - response.reasoning_summary_part.added
            - response.reasoning_summary_part.done
            - response.reasoning_summary_text.delta
            - response.reasoning_summary_text.done
            - response.function_call_arguments.delta
            - response.function_call_arguments.done
            - response.custom_tool_call_input.delta
            - response.custom_tool_call_input.done
            - response.web_search_call.in_progress
            - response.web_search_call.searching
            - response.web_search_call.completed
            - response.completed
            - response.incomplete
            - response.failed
            - error
        sequence_number:
          type: integer
          description: 事件序号，从 0 开始单调递增。
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
    ResponsesInputItem:
      description: input 数组的元素，按 `type` 区分。省略 `type` 时按 `message` 处理。
      oneOf:
        - $ref: '#/components/schemas/ResponsesMessageItem'
        - $ref: '#/components/schemas/ResponsesReasoningItem'
        - $ref: '#/components/schemas/ResponsesFunctionCallItem'
        - $ref: '#/components/schemas/ResponsesFunctionCallOutputItem'
        - $ref: '#/components/schemas/ResponsesCustomToolCallItem'
        - $ref: '#/components/schemas/ResponsesCustomToolCallOutputItem'
        - $ref: '#/components/schemas/ResponsesWebSearchCallItem'
        - $ref: '#/components/schemas/ResponsesAdditionalToolsItem'
    ResponsesTool:
      description: >-
        工具定义，按 `type` 区分。支持 `function`、`custom`（仅 `apply_patch`）、`namespace` 与
        `web_search`，其他工具类型不支持。
      oneOf:
        - $ref: '#/components/schemas/ResponsesFunctionTool'
        - $ref: '#/components/schemas/ResponsesCustomTool'
        - $ref: '#/components/schemas/ResponsesNamespaceTool'
        - $ref: '#/components/schemas/ResponsesWebSearchTool'
      discriminator:
        propertyName: type
        mapping:
          function: '#/components/schemas/ResponsesFunctionTool'
          custom: '#/components/schemas/ResponsesCustomTool'
          namespace: '#/components/schemas/ResponsesNamespaceTool'
          web_search: '#/components/schemas/ResponsesWebSearchTool'
    ResponsesToolChoice:
      type: string
      enum:
        - auto
      description: 控制工具调用行为。取 `auto` 时由模型自行决定是否调用工具。
    ResponsesOutputItem:
      description: output 数组的元素，按 `type` 区分。
      oneOf:
        - $ref: '#/components/schemas/ResponsesOutputReasoningItem'
        - $ref: '#/components/schemas/ResponsesOutputMessageItem'
        - $ref: '#/components/schemas/ResponsesOutputFunctionCallItem'
        - $ref: '#/components/schemas/ResponsesOutputCustomToolCallItem'
        - $ref: '#/components/schemas/ResponsesOutputWebSearchCallItem'
      discriminator:
        propertyName: type
        mapping:
          reasoning: '#/components/schemas/ResponsesOutputReasoningItem'
          message: '#/components/schemas/ResponsesOutputMessageItem'
          function_call: '#/components/schemas/ResponsesOutputFunctionCallItem'
          custom_tool_call: '#/components/schemas/ResponsesOutputCustomToolCallItem'
          web_search_call: '#/components/schemas/ResponsesOutputWebSearchCallItem'
    ResponsesUsage:
      type: object
      description: 本次响应的 Token 用量。
      properties:
        input_tokens:
          type: integer
          description: 输入 Token 数量，含命中缓存的部分。
        input_tokens_details:
          type: object
          properties:
            cached_tokens:
              type: integer
              description: 命中上下文缓存的 Token 数量。
            cache_write_tokens:
              type: integer
              description: 写入上下文缓存的 Token 数量。
        output_tokens:
          type: integer
          description: 输出 Token 数量，含推理 Token。
        output_tokens_details:
          type: object
          properties:
            reasoning_tokens:
              type: integer
              description: 推理消耗的 Token 数量。
        total_tokens:
          type: integer
          description: 总 Token 数量。
    ResponsesMessageItem:
      type: object
      title: 消息
      description: 一条对话消息。`type` 可省略。
      required:
        - role
        - content
      properties:
        type:
          type: string
          enum:
            - message
        role:
          type: string
          enum:
            - user
            - assistant
            - developer
          description: 消息角色。`developer` 按系统指令处理。
        content:
          description: 消息内容，字符串或 content part 数组。
          oneOf:
            - type: string
            - type: array
              items:
                $ref: '#/components/schemas/ResponsesInputContentPart'
        status:
          type: string
          enum:
            - completed
    ResponsesReasoningItem:
      type: object
      title: 推理
      description: 回放上一轮的推理内容。`content` 优先于 `summary`。
      required:
        - type
      properties:
        type:
          type: string
          enum:
            - reasoning
        id:
          type: string
        summary:
          type: array
          items:
            type: object
            required:
              - type
              - text
            properties:
              type:
                type: string
                enum:
                  - summary_text
              text:
                type: string
        content:
          type: array
          items:
            type: object
            required:
              - type
              - text
            properties:
              type:
                type: string
                enum:
                  - reasoning_text
              text:
                type: string
        status:
          type: string
          enum:
            - completed
    ResponsesFunctionCallItem:
      type: object
      title: 函数调用
      description: 回放一次函数调用。
      required:
        - type
        - call_id
        - name
        - arguments
      properties:
        type:
          type: string
          enum:
            - function_call
        id:
          type: string
        call_id:
          type: string
          description: 与对应 `function_call_output` 配对的调用 ID。
        name:
          type: string
        namespace:
          type: string
          description: 工具所属的命名空间，调用命名空间工具时返回。
        arguments:
          type: string
          description: 函数参数的 JSON 字符串。
        status:
          type: string
          enum:
            - completed
    ResponsesFunctionCallOutputItem:
      type: object
      title: 函数调用结果
      description: 函数调用的执行结果。
      required:
        - type
        - call_id
        - output
      properties:
        type:
          type: string
          enum:
            - function_call_output
        call_id:
          type: string
          description: 与对应 `function_call` 相同的调用 ID。
        output:
          description: 工具返回的内容。
          oneOf:
            - type: string
            - type: array
              items:
                $ref: '#/components/schemas/ResponsesInputContentPart'
        status:
          type: string
          enum:
            - completed
    ResponsesCustomToolCallItem:
      type: object
      title: 自定义工具调用
      description: 回放一次自定义工具调用。
      required:
        - type
        - call_id
        - name
        - input
      properties:
        type:
          type: string
          enum:
            - custom_tool_call
        id:
          type: string
        call_id:
          type: string
          description: 与对应 `custom_tool_call_output` 配对的调用 ID。
        name:
          type: string
        namespace:
          type: string
          description: 工具所属的命名空间，调用命名空间工具时返回。
        input:
          type: string
          description: 模型生成的自由文本输入。
        status:
          type: string
          enum:
            - completed
    ResponsesCustomToolCallOutputItem:
      type: object
      title: 自定义工具调用结果
      description: 自定义工具调用的执行结果。
      required:
        - type
        - call_id
        - output
      properties:
        type:
          type: string
          enum:
            - custom_tool_call_output
        call_id:
          type: string
          description: 与对应 `custom_tool_call` 相同的调用 ID。
        output:
          description: 工具返回的内容。
          oneOf:
            - type: string
            - type: array
              items:
                $ref: '#/components/schemas/ResponsesInputContentPart'
        status:
          type: string
          enum:
            - completed
    ResponsesWebSearchCallItem:
      type: object
      title: 联网搜索调用
      description: 回放上一轮的联网搜索调用。仅用于保留历史，转换时会被忽略；搜索结果已包含在其后的 assistant 消息中。
      required:
        - type
      properties:
        type:
          type: string
          enum:
            - web_search_call
        id:
          type: string
        status:
          type: string
          enum:
            - completed
        action:
          type: object
          properties:
            type:
              type: string
              enum:
                - search
            query:
              type: string
    ResponsesAdditionalToolsItem:
      type: object
      title: 动态工具
      description: 在对话中途追加可调用的工具，作用范围从该 item 所在位置开始。
      required:
        - type
        - role
        - tools
      properties:
        type:
          type: string
          enum:
            - additional_tools
        id:
          type: string
        role:
          type: string
          enum:
            - developer
        tools:
          type: array
          items:
            $ref: '#/components/schemas/ResponsesTool'
    ResponsesFunctionTool:
      type: object
      title: 函数工具
      description: 用 JSON Schema 描述参数的函数工具。
      required:
        - type
        - name
      properties:
        type:
          type: string
          enum:
            - function
        name:
          type: string
          description: 函数名称。必须符合正则表达式：^[a-zA-Z_][a-zA-Z0-9-_]{0,127}$
          pattern: ^[a-zA-Z_][a-zA-Z0-9-_]{0,127}$
        description:
          type: string
        parameters:
          type: object
          description: 描述函数参数的 JSON Schema。
        strict:
          type: boolean
    ResponsesCustomTool:
      type: object
      title: 自定义工具
      description: >-
        接收自由文本输入的自定义工具。当前仅支持名为 `apply_patch` 的自定义工具，且必须提供 `grammar` + `lark`
        格式定义；模型调用时在 output 中返回 `custom_tool_call` item。
      required:
        - type
        - name
        - format
      properties:
        type:
          type: string
          enum:
            - custom
        name:
          type: string
          enum:
            - apply_patch
          description: 工具名称，当前仅支持 `apply_patch`。
        description:
          type: string
        format:
          type: object
          description: 输入格式约束。当前仅支持 `grammar` 类型与 `lark` 语法。
          required:
            - type
            - syntax
            - definition
          properties:
            type:
              type: string
              enum:
                - grammar
            syntax:
              type: string
              enum:
                - lark
            definition:
              type: string
              description: Lark 语法定义。
    ResponsesNamespaceTool:
      type: object
      title: 命名空间工具
      description: 把一组函数工具或自定义工具收纳到同一个命名空间下。
      required:
        - type
        - name
        - description
        - tools
      properties:
        type:
          type: string
          enum:
            - namespace
        name:
          type: string
        description:
          type: string
        tools:
          type: array
          items:
            oneOf:
              - $ref: '#/components/schemas/ResponsesFunctionTool'
              - $ref: '#/components/schemas/ResponsesCustomTool'
    ResponsesWebSearchTool:
      type: object
      title: 联网搜索工具
      description: >-
        由服务端执行的联网搜索工具。加入后服务端会先根据输入判断是否需要搜索；需要时执行搜索并把结果注入模型上下文，同时在 output 中返回一个
        `web_search_call` item。每个请求最多包含一个 `web_search`
        工具。`search_context_size`、`blocked_domains`、`filters.blocked_domains`
        不支持，传入会返回
        `invalid_request_error`；`user_location`、`external_web_access`、`indexed_web_access`
        会被忽略。
      required:
        - type
      properties:
        type:
          type: string
          enum:
            - web_search
        filters:
          type: object
          description: 搜索范围过滤。
          properties:
            allowed_domains:
              type: array
              items:
                type: string
              maxItems: 100
              description: 仅在这些域名内搜索，最多 100 个。
        search_content_types:
          type: array
          items:
            type: string
            enum:
              - text
              - image
          default:
            - text
          description: 搜索结果类型，默认仅 `text`。包含 `image` 时会额外执行图片搜索。
        image_settings:
          type: object
          description: 图片搜索设置，仅在 `search_content_types` 包含 `image` 时生效。
          properties:
            max_results:
              type: integer
              minimum: 1
              maximum: 10
              default: 3
              description: 最多返回的图片数量。
            caption:
              type: boolean
              default: false
              description: 是否为图片生成说明文字。
    ResponsesOutputReasoningItem:
      type: object
      title: 推理
      description: 模型的推理内容。
      properties:
        type:
          type: string
          enum:
            - reasoning
        id:
          type: string
          example: rs_68f0c1c2d3e4f5a6b7c8d9e0
        summary:
          type: array
          description: 推理内容。
          items:
            type: object
            properties:
              type:
                type: string
                enum:
                  - summary_text
              text:
                type: string
        encrypted_content:
          type:
            - string
            - 'null'
          description: 固定为 `null`。
        status:
          type: string
          enum:
            - in_progress
            - completed
    ResponsesOutputMessageItem:
      type: object
      title: 消息
      description: 模型的文本回复。
      properties:
        type:
          type: string
          enum:
            - message
        id:
          type: string
          example: msg_68f0c1c2d3e4f5a6b7c8d9e0
        role:
          type: string
          enum:
            - assistant
        content:
          type: array
          items:
            type: object
            properties:
              type:
                type: string
                enum:
                  - output_text
              text:
                type: string
              annotations:
                type: array
                items: {}
        status:
          type: string
          enum:
            - in_progress
            - completed
    ResponsesOutputFunctionCallItem:
      type: object
      title: 函数调用
      description: 模型发起的函数调用。
      properties:
        type:
          type: string
          enum:
            - function_call
        id:
          type: string
          example: fc_68f0c1c2d3e4f5a6b7c8d9e0
        call_id:
          type: string
          description: 回传结果时在 `function_call_output` 中使用该值。
        name:
          type: string
        namespace:
          type: string
          description: 调用命名空间工具时返回。
        arguments:
          type: string
          description: 函数参数的 JSON 字符串。
        status:
          type: string
          enum:
            - in_progress
            - completed
    ResponsesOutputCustomToolCallItem:
      type: object
      title: 自定义工具调用
      description: 模型发起的自定义工具调用。
      properties:
        type:
          type: string
          enum:
            - custom_tool_call
        id:
          type: string
          example: ctc_68f0c1c2d3e4f5a6b7c8d9e0
        call_id:
          type: string
          description: 回传结果时在 `custom_tool_call_output` 中使用该值。
        name:
          type: string
        namespace:
          type: string
          description: 调用命名空间工具时返回。
        input:
          type: string
          description: 模型生成的自由文本输入。
        status:
          type: string
          enum:
            - in_progress
            - completed
    ResponsesOutputWebSearchCallItem:
      type: object
      title: 联网搜索调用
      description: 服务端执行的联网搜索调用。仅在请求包含 `web_search` 工具且服务端判断需要搜索时返回，位于 output 数组最前面。
      properties:
        type:
          type: string
          enum:
            - web_search_call
        id:
          type: string
          example: ws_68f0c1c2d3e4f5a6b7c8d9e0
        status:
          type: string
          enum:
            - in_progress
            - completed
        action:
          type: object
          description: 本次搜索的动作。
          properties:
            type:
              type: string
              enum:
                - search
            query:
              type: string
              description: 实际使用的搜索关键词。
            sources:
              type: array
              description: 搜索命中的网页来源。仅在 `include` 包含 `web_search_call.action.sources` 时返回。
              items:
                type: object
                properties:
                  type:
                    type: string
                    enum:
                      - url
                  url:
                    type: string
                  title:
                    type: string
        results:
          type: array
          description: >-
            图片搜索结果。仅在 `include` 包含 `web_search_call.results` 且
            `search_content_types` 包含 `image` 时返回。
          items:
            type: object
            properties:
              type:
                type: string
                enum:
                  - image_result
              image_url:
                type: string
              thumbnail_url:
                type: string
              source_website_url:
                type: string
              caption:
                type: string
                description: 图片说明文字，仅在开启 `image_settings.caption` 时返回。
    ResponsesInputContentPart:
      description: content 数组的元素，按 `type` 区分。
      oneOf:
        - type: object
          title: 输入文本
          required:
            - type
            - text
          properties:
            type:
              type: string
              enum:
                - input_text
            text:
              type: string
        - type: object
          title: 输入图片
          required:
            - type
            - image_url
          properties:
            type:
              type: string
              enum:
                - input_image
            image_url:
              type: string
              description: >-
                图片的 data URL，例如 `data:image/png;base64,<base64>`。不支持公网 http(s)
                URL。
            detail:
              type: string
              enum:
                - auto
                - low
                - high
                - original
        - type: object
          title: 输出文本
          description: 回放 assistant 历史文本时使用。
          required:
            - type
            - text
          properties:
            type:
              type: string
              enum:
                - output_text
            text:
              type: string
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: >-
        Authorization 请求头需要一个 Bearer 令牌。使用 MOONSHOT_API_KEY 作为令牌。这是一个服务端密钥，请在
        [API 密钥页面](https://platform.kimi.com/console/api-keys) 生成。

````