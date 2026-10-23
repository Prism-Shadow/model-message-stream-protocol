---
description: MMSP 抛出的错误，每个错误携带什么，以及该怎么处理。
---

MMSP 抛出的每个错误都是 `MMSPError`，并按出错的原因命名。在 Python 中它是 `ValueError` 的子类，`ProviderStreamError` 同时也是 `RuntimeError`；在 TypeScript 中它继承 `Error`。捕获这些内置类的代码仍会捕获每一个 MMSP 错误。

流式响应以 `stop` 事件结束，也可能因异常终止，二者不会同时发生。抛出异常时，`stop` 事件不会发送，有状态的历史记录保持原样。

## 流式过程中

| 错误 | 何时抛出 | 携带 |
| --- | --- | --- |
| `ToolCallArgumentParseError` | 工具调用的参数格式错误、被截断，或不是一个 JSON 对象。在原本该出现 `tool_call.done` 的位置抛出。 | `client`、工具名、工具调用 id、原始参数的长度和预览 |
| `EmptyResponseError` | 响应只有思考，没有别的内容就结束了。这样的消息在下一轮送回会得到 400。在原本该出现 `stop` 事件的位置抛出。 | `client`、结束原因，以及 `usage_metadata`，token 仍可计数 |
| `IncompleteStreamError` | 服务商的流在用量或结束原因到达之前就结束了。这是一条中途断开的流，重试即可。在原本该出现 `stop` 事件的位置抛出。 | `client`、`missing`，以及已经到达的 `finish_reason` 和 `usage_metadata` |
| `StreamProtocolError` | 某个客户端产生的流违反了[文法](/zh/docs/streaming/)。这是 MMSP 的 bug，不是模型输出的问题。 | `client` |
| `ProviderStreamError` | 服务商在一条已打开的流中报告了错误，比如 Gemini Interactions 的 `error` 事件。 | `client`、`code`，以及服务商给出的消息 |

遇到 `ToolCallArgumentParseError`，记录预览后重试或重新提示模型。切勿使用不完整的参数运行工具。

Python 将这些字段命名为 `tool_name`、`tool_call_id`、`raw_arguments_length`、`raw_arguments_preview`、`finish_reason` 和 `usage_metadata`；TypeScript 命名为 `toolName`、`toolCallId`、`rawArgumentsLength`、`rawArgumentsPreview`、`finishReason` 和 `usageMetadata`。

## 请求发出之前

| 错误 | 何时抛出 | 携带 |
| --- | --- | --- |
| `UnsupportedParameterError` | 模型拒绝某个 `UniConfig` 值，比如给固定温度的模型传 `temperature`。 | `client`、`parameter` |
| `UnsupportedContentError` | 格式正确、但模型无法接收的内容项：发给纯文本模型的图片，发给嵌入或语音模型的非文本内容项。 | `client`、`item_type` |
| `InvalidMessageError` | 消息无法按原样发送：未知类型的内容项、没有 `tool_call_id` 的工具结果、不是合法 base64 或无法获取的图片、缺少说话人标签的 TTS 脚本，或者一条在线路上没有任何可发送内容的消息。 | `client`、`item_type`、`message_index` |
| `UnsupportedOperationError` | 端点无法提供的调用，比如在 Amazon Bedrock 上列出模型。 | `client`、`operation` |
| `ConcurrentCallError` | 同一个客户端上一次有状态调用尚未结束时，又调用了 `streaming_response_stateful`。一份历史记录不能同时记录两轮对话：请等第一次调用的 `stop` 事件或它的错误。 | `client` |
| `RoutingError` | `client_type` 和模型 id 都没有指明客户端：`client_type` 未知，或者没有给出 `client_type` 而模型 id 不属于任何已知家族（[模型选择](/zh/docs/models/)）。由 `AutoLLMClient` 抛出。 | `model`、`client_type` |
| `ApiKeyRequiredError` | 构造客户端时传入了 `base_url` 而没有 `api_key`，且该 URL 不是客户端的默认端点，环境变量中的 key 不能发往那里（[规则](/zh/docs/client/)）；或者，客户端没有 key 就无法调用它的端点，却既没有传入 key，它的 `<P>_API_KEY` 也没有设置，此时 `base_url` 为 `None`。由构造函数抛出。 | `client`、`client_type`、`api_key_env`、`base_url_env`、`base_url` |

错误不针对某一个内容项或某一条消息时，`item_type` 和 `message_index` 为 `None`。`ApiKeyRequiredError` 的消息给出解决办法：传入 key，或设置环境变量；若传了 `base_url`，则去掉它并设置环境变量。TypeScript 将这些字段命名为 `itemType`、`messageIndex`、`clientType`、`apiKeyEnv`、`baseUrlEnv` 和 `baseUrl`（Python 中为 `None` 的地方是 `null`），方法名为 `streamingResponseStateful`。

思考级别从不抛错。每个客户端都会把你要求的级别映射到模型支持的最接近的一档。

## 经由 MMSP 服务端

服务端报告的任何错误，[`mmsp` 客户端](/zh/docs/server/)都以同一个错误抛出。

| 错误 | 何时抛出 | 携带 |
| --- | --- | --- |
| `UpstreamError` | 服务端拒绝了请求（key 不对、不在它的表里的模型、请求体格式错误），或它的客户端抛出了错误 | `client`、`status`、`error_type`、`message`、`error` |

`client` 是 `MmspClient`。`status` 是被拒请求的 HTTP 状态码；否则，若错误带有上游的状态码（比如 429），则是该状态码。`error_type` 是服务端那一侧的类名，比如 `AuthenticationError`、`NotFoundError`、`EmptyResponseError`、`InvalidMessageError` 或 `RuntimeError`。`error` 是服务端发来的错误对象：每个 MMSP 错误都带着自己的字段到达，字段名与 Python 相同，比如 `parameter`、`item_type` 或 `usage_metadata`。TypeScript 中这两个字段名为 `errorType` 和 `error`。

## MMSP 不认识的输出

网关会往流里插入自己的帧，比如心跳、计费提示。MMSP 会跳过它不认识的内容，因此这类帧不会中断一次长生成。

将环境变量 `MMSP_DEBUG` 设为 `0`、`false`、`no`、`off` 之外的任何值，遇到不认识的帧就会抛出 `UnknownEventError`，携带 `client` 和 `event`（该帧的预览）。接入新服务商时，你会需要这个功能。
