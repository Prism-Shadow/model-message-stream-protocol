> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Messages API

> 以 Anthropic Messages API 兼容的格式调用 Kimi 模型，支持流式输出、工具调用、图片输入、思考与结构化输出。

以 Anthropic Messages API 兼容的格式调用 Kimi 模型。已经在使用 Anthropic SDK、Claude Code 等工具的开发者，只需把 base URL 指向 `https://api.moonshot.cn/anthropic`，即可直接调用 Kimi 模型。

> **上下文缓存（Cache Write）**
>
> 通过顶层 `cache_control` 控制上下文缓存的写入行为（仅顶层传入时生效，`messages` 消息体内的 `cache_control` 标记会被忽略）：
>
> | 参数 | 类型 | 说明 |
> | - | - | - |
> | `cache_control` | object | 上下文缓存写入选项，仅顶层传入时生效；不传时默认按 `5m` TTL 读写缓存 |
> | `cache_control.type` | `"ephemeral"` | 缓存类型，固定为 `ephemeral` |
> | `cache_control.ttl` | `"5m"` \| `"1h"` | 缓存写入的有效期，仅支持 `5m`、`1h` 两档（默认 `5m`），两档缓存相互独立 |
>
> * 传入顶层 `cache_control`：将请求前缀按指定 TTL 写入缓存。
> * 不传 `cache_control`：默认按 `5m` TTL 读写缓存；发生缓存写入时，按 `5m` 档计费。
>
> ```json theme={null}
> {
>     "model": "kimi-k3.1-pro",
>     "cache_control": { "type": "ephemeral", "ttl": "1h" },
>     "messages": [{"role": "user", "content": "你好"}]
> }
> ```
>
> **行为说明**
>
> * 缓存以组织（org）为粒度隔离，组织之间不共享缓存。
> * 相同前缀的请求在缓存有效期内命中后，缓存的有效期会按原 TTL 刷新；命中部分只收取缓存读取费用，不再收取缓存写入费用。
> * 缓存写入按 TTL 分别计费，价格详见[产品定价](https://platform.kimi.com/docs/pricing/chat.md)。
> * 不支持手动清除缓存，已缓存的前缀在至少 5 分钟不活动后自动过期。
>
> **用量字段**
>
> | 字段 | 说明 |
> | - | - |
> | `usage.input_tokens` | 既未命中缓存、也未用于创建缓存条目的输入 Token 数 |
> | `usage.cache_read_input_tokens` | 命中缓存的输入 Token 数（缓存读取） |
> | `usage.cache_creation_input_tokens` | 创建新缓存条目时写入缓存的输入 Token 数（缓存写入） |
> | `usage.cache_creation.ephemeral_5m_input_tokens` | 写入 `5m` 档缓存的输入 Token 数 |
> | `usage.cache_creation.ephemeral_1h_input_tokens` | 写入 `1h` 档缓存的输入 Token 数 |
>
> 总输入 = `input_tokens` + `cache_read_input_tokens` + `cache_creation_input_tokens`。
>
> > [!NOTE]
> >
> > 本页 `input_tokens` 的口径与 Chat Completions / Responses API 不同：这两个 API 的 `prompt_tokens` / `input_tokens` 始终为总输入，缓存读写部分在各自的 details 字段中拆分。
>
> > [!NOTE]
> >
> > Context Caching 的机制背景详见[上下文缓存指南](https://platform.kimi.com/docs/guide/context-caching.md)。


## OpenAPI

````yaml POST /anthropic/v1/messages
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
  /anthropic/v1/messages:
    post:
      tags:
        - Messages
      summary: Messages API
      description: 以 Anthropic Messages API 兼容的格式调用 Kimi 模型，支持流式输出、工具调用、图片输入、思考与结构化输出。
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
              $ref: '#/components/schemas/MessagesRequest'
      responses:
        '200':
          description: 消息响应
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
                $ref: '#/components/schemas/MessagesResponse'
            text/event-stream:
              schema:
                $ref: '#/components/schemas/MessagesStreamEvent'
        '400':
          description: 请求错误 - 参数无效
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessagesErrorResponse'
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
                $ref: '#/components/schemas/MessagesErrorResponse'
      security:
        - bearerAuth: []
components:
  schemas:
    MessagesRequest:
      title: Kimi K3 系列
      type: object
      properties:
        model:
          type: string
          description: >-
            使用的模型 ID。本接口当前支持 `kimi-k3.1-pro`、`kimi-k3.1-pro-highspeed` 和
            `kimi-k3`。
          enum:
            - kimi-k3.1-pro
            - kimi-k3.1-pro-highspeed
            - kimi-k3
          default: kimi-k3.1-pro
        messages:
          type: array
          description: 对话消息列表。若最后一条为 assistant 消息，模型会从该消息内容之后继续生成（Partial Mode）。
          items:
            $ref: '#/components/schemas/MessagesMessageParam'
        max_tokens:
          type: integer
          minimum: 1
          description: 本次生成的最大 Token 数，必填。达到上限而未结束时 `stop_reason` 为 `max_tokens`。
        system:
          oneOf:
            - type: string
            - type: array
              items:
                $ref: '#/components/schemas/MessagesTextBlockParam'
          description: 系统提示，可为字符串或 text 块数组
        stream:
          type: boolean
          default: false
          description: 是否以 Server-Sent Events 流式返回，默认 false
        stop_sequences:
          type: array
          items:
            type: string
          maxItems: 5
          description: 停用词，完全匹配时停止输出，匹配到的词本身不会被输出。最多 5 个，每个不超过 32 字节。
        tools:
          type: array
          description: 模型可调用的工具列表
          items:
            $ref: '#/components/schemas/MessagesTool'
        tool_choice:
          $ref: '#/components/schemas/MessagesToolChoice'
        metadata:
          type: object
          properties:
            user_id:
              type: string
              description: >-
                标识终端用户或会话的稳定 ID，用于提高缓存命中率与滥用检测。建议使用哈希后的值，不要传入可识别个人身份的信息。对 Coding
                Agent 建议传 session id 并在会话期间保持不变。
        cache_control:
          type: object
          description: >-
            上下文缓存写入选项，仅在顶层传入时生效，messages 消息体内的 cache_control 标记会被忽略。不传时默认按 5m
            TTL 读写缓存
          properties:
            type:
              type: string
              enum:
                - ephemeral
              description: 缓存类型，固定为 ephemeral
            ttl:
              type: string
              enum:
                - 5m
                - 1h
              default: 5m
              description: 缓存写入的有效期，5m 与 1h 两档缓存相互独立。相同前缀的请求在有效期内命中后，缓存有效期按原 TTL 刷新
          required:
            - type
        output_config:
          type: object
          description: 输出配置：推理强度与结构化输出
          properties:
            effort:
              type: string
              enum:
                - low
                - high
                - max
              default: max
              description: 推理强度，支持 low、high、max，默认 max。切换档位会破坏前缀缓存命中，建议在会话开始前确定。
            format:
              type: object
              description: 结构化输出。设置后模型输出严格遵循给定 JSON Schema 的 JSON。
              properties:
                type:
                  type: string
                  enum:
                    - json_schema
                schema:
                  type: object
                  description: 输出需遵循的 JSON Schema
                  additionalProperties: true
              required:
                - type
                - schema
      required:
        - model
        - messages
        - max_tokens
    MessagesResponse:
      type: object
      properties:
        id:
          type: string
          description: 本次响应的唯一标识符
        type:
          type: string
          enum:
            - message
          example: message
        role:
          type: string
          enum:
            - assistant
        model:
          type: string
          description: 请求中指定的模型
        content:
          type: array
          description: 内容块列表，顺序为 thinking → text → tool_use
          items:
            oneOf:
              - title: thinking
                type: object
                properties:
                  type:
                    type: string
                    enum:
                      - thinking
                  thinking:
                    type: string
                  signature:
                    type: string
                required:
                  - type
                  - thinking
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
              - title: tool_use
                type: object
                properties:
                  type:
                    type: string
                    enum:
                      - tool_use
                  id:
                    type: string
                  name:
                    type: string
                  input:
                    type: object
                    additionalProperties: true
                required:
                  - type
                  - id
                  - name
                  - input
        stop_reason:
          type:
            - string
            - 'null'
          enum:
            - end_turn
            - max_tokens
            - tool_use
            - refusal
            - null
          description: >-
            停止原因。`end_turn`：自然结束（含命中 `stop_sequences`）；`max_tokens`：达到
            max_tokens 上限；`tool_use`：模型发起工具调用；`refusal`：触发内容安全审查。
        stop_sequence:
          type:
            - string
            - 'null'
          description: 匹配到的停用词
        usage:
          type: object
          description: Token 用量
          properties:
            input_tokens:
              type: integer
              description: >-
                输入 Token 数（不含命中缓存与写入缓存的部分）。总输入 = input_tokens +
                cache_read_input_tokens + cache_creation_input_tokens
            output_tokens:
              type: integer
              description: 输出 Token 数（含推理 Token）
            cache_read_input_tokens:
              type: integer
              description: 命中缓存的输入 Token 数
            cache_creation_input_tokens:
              type: integer
              description: 写入缓存的输入 Token 数
            cache_creation:
              type: object
              description: 缓存写入按 TTL 的明细
              properties:
                ephemeral_5m_input_tokens:
                  type: integer
                  description: 写入 5m 档缓存的输入 Token 数
                ephemeral_1h_input_tokens:
                  type: integer
                  description: 写入 1h 档缓存的输入 Token 数
              required:
                - ephemeral_5m_input_tokens
                - ephemeral_1h_input_tokens
            output_tokens_details:
              type: object
              properties:
                thinking_tokens:
                  type: integer
                  description: 输出 Token 中用于推理的部分
    MessagesStreamEvent:
      oneOf:
        - title: message_start
          type: object
          properties:
            type:
              type: string
              enum:
                - message_start
            message:
              $ref: '#/components/schemas/MessagesResponse'
          required:
            - type
            - message
        - title: content_block_start
          type: object
          properties:
            type:
              type: string
              enum:
                - content_block_start
            index:
              type: integer
            content_block:
              oneOf:
                - title: thinking
                  type: object
                  properties:
                    type:
                      type: string
                      enum:
                        - thinking
                    thinking:
                      type: string
                    signature:
                      type: string
                  required:
                    - type
                    - thinking
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
                - title: tool_use
                  type: object
                  properties:
                    type:
                      type: string
                      enum:
                        - tool_use
                    id:
                      type: string
                    name:
                      type: string
                    input:
                      type: object
                      additionalProperties: true
                  required:
                    - type
                    - id
                    - name
                    - input
          required:
            - type
            - index
            - content_block
        - title: content_block_delta
          type: object
          properties:
            type:
              type: string
              enum:
                - content_block_delta
            index:
              type: integer
            delta:
              type: object
              properties:
                type:
                  type: string
                  enum:
                    - text_delta
                    - thinking_delta
                    - signature_delta
                    - input_json_delta
                text:
                  type: string
                  description: '`text_delta` 的文本片段'
                thinking:
                  type: string
                  description: '`thinking_delta` 的推理片段'
                signature:
                  type: string
                  description: '`signature_delta` 的签名'
                partial_json:
                  type: string
                  description: '`input_json_delta` 的工具入参 JSON 片段，需拼接后解析'
              required:
                - type
          required:
            - type
            - index
            - delta
        - title: content_block_stop
          type: object
          properties:
            type:
              type: string
              enum:
                - content_block_stop
            index:
              type: integer
          required:
            - type
            - index
        - title: message_delta
          type: object
          properties:
            type:
              type: string
              enum:
                - message_delta
            delta:
              type: object
              properties:
                stop_reason:
                  type:
                    - string
                    - 'null'
                  enum:
                    - end_turn
                    - max_tokens
                    - tool_use
                    - refusal
                    - null
                  description: >-
                    停止原因。`end_turn`：自然结束（含命中 `stop_sequences`）；`max_tokens`：达到
                    max_tokens 上限；`tool_use`：模型发起工具调用；`refusal`：触发内容安全审查。
                stop_sequence:
                  type:
                    - string
                    - 'null'
            usage:
              type: object
              properties:
                input_tokens:
                  type: integer
                  description: >-
                    输入 Token 数（不含命中缓存与写入缓存的部分）。总输入 = input_tokens +
                    cache_read_input_tokens + cache_creation_input_tokens
                output_tokens:
                  type: integer
                  description: 输出 Token 数（含推理 Token）
                cache_read_input_tokens:
                  type: integer
                  description: 命中缓存的输入 Token 数
                cache_creation_input_tokens:
                  type: integer
                  description: 写入缓存的输入 Token 数
                cache_creation:
                  type: object
                  description: 缓存写入按 TTL 的明细
                  properties:
                    ephemeral_5m_input_tokens:
                      type: integer
                      description: 写入 5m 档缓存的输入 Token 数
                    ephemeral_1h_input_tokens:
                      type: integer
                      description: 写入 1h 档缓存的输入 Token 数
                  required:
                    - ephemeral_5m_input_tokens
                    - ephemeral_1h_input_tokens
                output_tokens_details:
                  type: object
                  properties:
                    thinking_tokens:
                      type: integer
                      description: 输出 Token 中用于推理的部分
          required:
            - type
            - delta
        - title: message_stop
          type: object
          properties:
            type:
              type: string
              enum:
                - message_stop
          required:
            - type
      description: >-
        流式事件。每个 SSE 帧的 `event` 与 `data.type` 一致，顺序为 message_start →
        (content_block_start → content_block_delta… → content_block_stop)… →
        message_delta → message_stop。
    MessagesErrorResponse:
      type: object
      properties:
        type:
          type: string
          enum:
            - error
        error:
          type: object
          properties:
            type:
              type: string
              description: 错误类型，取值见[错误说明](/api/errors)
            message:
              type: string
              description: 描述错误原因的错误消息
          required:
            - type
            - message
        request_id:
          type: string
          description: 请求 ID，反馈问题时请附上
      required:
        - type
        - error
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
    MessagesMessageParam:
      type: object
      properties:
        role:
          type: string
          enum:
            - user
            - assistant
          example: user
          description: 消息角色，支持 user、assistant。系统提示请使用顶层 `system` 字段。
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
                        description: 文本内容
                    required:
                      - type
                      - text
                  - title: image
                    type: object
                    properties:
                      type:
                        type: string
                        enum:
                          - image
                      source:
                        type: object
                        description: >-
                          图片来源。`type` 为 `base64` 时需同时提供 `media_type` 与
                          `data`；`type` 为 `url` 时通过 `url` 传入 `ms://<file_id>`
                          文件引用。
                        properties:
                          type:
                            type: string
                            enum:
                              - base64
                              - url
                          media_type:
                            type: string
                            enum:
                              - image/jpeg
                              - image/png
                              - image/gif
                              - image/webp
                            description: 图片 MIME 类型，仅 `type=base64` 时需要
                          data:
                            type: string
                            description: base64 编码的图片内容，仅 `type=base64` 时需要
                          url:
                            type: string
                            description: >-
                              通过文件 ID 引用已上传的图片，格式为 `ms://<file_id>`，仅 `type=url`
                              时需要。上传方式见[上传文件](/api/files-upload)。
                        required:
                          - type
                    required:
                      - type
                      - source
                  - title: thinking
                    type: object
                    description: >-
                      模型的推理过程。多轮对话时请把响应中的 thinking 块（含 `signature`）原样放回
                      assistant 消息中。
                    properties:
                      type:
                        type: string
                        enum:
                          - thinking
                      thinking:
                        type: string
                        description: 推理内容
                      signature:
                        type: string
                        description: 推理内容的签名，回传时需原样保留
                    required:
                      - type
                      - thinking
                  - title: tool_use
                    type: object
                    description: 模型发起的工具调用（出现在 assistant 消息中）
                    properties:
                      type:
                        type: string
                        enum:
                          - tool_use
                      id:
                        type: string
                        description: 工具调用 ID，提交结果时需与 `tool_use_id` 对应
                      name:
                        type: string
                        description: 工具名称
                      input:
                        type: object
                        description: 工具入参
                        additionalProperties: true
                    required:
                      - type
                      - id
                      - name
                      - input
                  - title: tool_result
                    type: object
                    description: 工具执行结果（出现在 user 消息中）
                    properties:
                      type:
                        type: string
                        enum:
                          - tool_result
                      tool_use_id:
                        type: string
                        description: 对应 tool_use 块的 `id`
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
                                      description: 文本内容
                                  required:
                                    - type
                                    - text
                                - title: image
                                  type: object
                                  properties:
                                    type:
                                      type: string
                                      enum:
                                        - image
                                    source:
                                      type: object
                                      description: >-
                                        图片来源。`type` 为 `base64` 时需同时提供
                                        `media_type` 与 `data`；`type` 为 `url` 时通过
                                        `url` 传入 `ms://<file_id>` 文件引用。
                                      properties:
                                        type:
                                          type: string
                                          enum:
                                            - base64
                                            - url
                                        media_type:
                                          type: string
                                          enum:
                                            - image/jpeg
                                            - image/png
                                            - image/gif
                                            - image/webp
                                          description: 图片 MIME 类型，仅 `type=base64` 时需要
                                        data:
                                          type: string
                                          description: base64 编码的图片内容，仅 `type=base64` 时需要
                                        url:
                                          type: string
                                          description: >-
                                            通过文件 ID 引用已上传的图片，格式为 `ms://<file_id>`，仅
                                            `type=url`
                                            时需要。上传方式见[上传文件](/api/files-upload)。
                                      required:
                                        - type
                                  required:
                                    - type
                                    - source
                        description: 工具返回内容，可为字符串或 text / image 块数组
                    required:
                      - type
                      - tool_use_id
                      - content
          example: 你好
          description: >-
            消息内容。可以是纯文本字符串，也可以是内容块数组（text / image / thinking / tool_use /
            tool_result）。
      required:
        - role
        - content
    MessagesTextBlockParam:
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
    MessagesTool:
      type: object
      properties:
        type:
          type: string
          enum:
            - custom
          description: 工具类型，可省略
        name:
          type: string
          description: 工具名称。必须符合正则表达式：^[a-zA-Z_][a-zA-Z0-9-_]{0,127}$
          pattern: ^[a-zA-Z_][a-zA-Z0-9-_]{0,127}$
        description:
          type: string
          description: 工具功能描述
        input_schema:
          type: object
          description: >-
            工具入参的 JSON Schema，顶层 `type` 必须为 `object`。需符合 [MFJS（Moonshot Flavored
            JSON
            Schema）规范](https://github.com/MoonshotAI/walle/blob/main/docs/mfjs-spec.zh.md)。
          additionalProperties: true
      required:
        - name
        - input_schema
    MessagesToolChoice:
      type: object
      description: 控制模型是否调用工具。`auto`（默认）：模型自行决定；`any`：强制调用任意工具；`none`：不调用工具。
      properties:
        type:
          type: string
          enum:
            - auto
            - any
            - none
          default: auto
      required:
        - type
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: >-
        Authorization 请求头需要一个 Bearer 令牌。使用 MOONSHOT_API_KEY 作为令牌。这是一个服务端密钥，请在
        [API 密钥页面](https://platform.kimi.com/console/api-keys) 生成。

````