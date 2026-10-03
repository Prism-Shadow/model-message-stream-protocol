---
description: MMSP 抛出的错误，每个错误携带什么，以及该怎么处理。
---

MMSP 抛出的每个错误都是 `MMSPError`。在 Python 中它是 `ValueError` 的子类，在 TypeScript 中它继承 `Error`。

流式响应以 `stop` 事件结束，也可能因异常终止，二者不会同时发生。抛出异常时，`stop` 事件不会发送，有状态的历史记录保持原样。

## 流式过程中

| 错误 | 何时抛出 | 携带 |
| --- | --- | --- |
| `ToolCallArgumentParseError` | 工具调用的参数格式错误、被截断，或不是一个 JSON 对象。在原本该出现 `tool_call.done` 的位置抛出。 | `client`、工具名、工具调用 id、原始参数的长度和预览 |
| `EmptyResponseError` | 响应只有思考，没有别的内容就结束了。这样的消息在下一轮送回会得到 400。在原本该出现 `stop` 事件的位置抛出。 | `client`、结束原因，以及 `usage_metadata`，token 仍可计数 |
| `StreamProtocolError` | 某个客户端产生的流违反了[文法](/zh/docs/streaming/)。这是 MMSP 的 bug，不是模型输出的问题。 | `client` |

遇到 `ToolCallArgumentParseError`，记录预览后重试或重新提示模型。切勿使用不完整的参数运行工具。

Python 将这些字段命名为 `tool_name`、`tool_call_id`、`raw_arguments_length`、`raw_arguments_preview`、`finish_reason` 和 `usage_metadata`；TypeScript 命名为 `toolName`、`toolCallId`、`rawArgumentsLength`、`rawArgumentsPreview`、`finishReason` 和 `usageMetadata`。

## 请求发出之前

| 错误 | 何时抛出 | 携带 |
| --- | --- | --- |
| `UnsupportedParameterError` | 模型拒绝某个 `UniConfig` 值，比如给固定温度的模型传 `temperature`。 | `client`、`parameter` |
| `UnsupportedOperationError` | 端点无法提供的调用，比如在 Amazon Bedrock 上列出模型。 | `client`、`operation` |

思考级别从不抛错。每个客户端都会把你要求的级别映射到模型支持的最接近的一档。

## 经由 MMSP 服务端

[`mmsp` 客户端](/zh/docs/server/)抛出的就是服务端那一侧客户端抛出的错误。

| 错误 | 何时抛出 | 携带 |
| --- | --- | --- |
| 上面五种错误 | 服务端的客户端抛出了其中一种 | 相同的字段；`client` 是服务端那一侧的客户端 |
| `UpstreamError` | 其他所有情况：服务端拒绝了请求（key 不对、无法路由的模型），或它的客户端抛出了别的错误 | `client`、`status`、`error_type` |

`status` 是被拒请求的 HTTP 状态码；若上游 SDK 报告了状态码（比如 429），则是上游的状态码。TypeScript 中类型字段名为 `errorType`。

## MMSP 不认识的输出

网关会往流里插入自己的帧，比如心跳、计费提示。MMSP 会跳过它不认识的内容，因此这类帧不会中断一次长生成。

将环境变量 `MMSP_DEBUG` 设为 `0`、`false`、`no`、`off` 之外的任何值，遇到不认识的帧就会抛错。接入新服务商时，你会需要这个功能。
