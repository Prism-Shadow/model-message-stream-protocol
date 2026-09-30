---
description: MMSP 抛出的错误，每个错误携带什么，以及该怎么处理。
---

MMSP 抛出的每个错误都是 `MMSPError`。在 Python 中它是 `ValueError` 的子类，在 TypeScript 中它继承 `Error`。

一条流以它的 `stop` 事件或一个异常结束，二者不会同时出现。抛出异常时，`stop` 事件不会发送，有状态历史保持原样。

## 流式过程中

| 错误 | 何时抛出 | 携带 |
| --- | --- | --- |
| `ToolCallArgumentParseError` | 工具调用的参数格式错误、被截断，或不是一个 JSON 对象。在原本该出现 `tool_call.done` 的位置抛出。 | `client`、工具名、工具调用 id、原始参数的长度和预览 |
| `EmptyResponseError` | 响应只有思考，没有别的内容就结束了。这样的消息在下一轮送回会得到 400。在原本该出现 `stop` 事件的位置抛出。 | `client`、结束原因，以及 `usage_metadata`，token 仍可计数 |
| `StreamProtocolError` | 某个客户端产生的流违反了[文法](/zh/docs/streaming/)。这是 MMSP 的 bug，不是模型输出的问题。 | `client` |

对于 `ToolCallArgumentParseError`，记录预览，然后重试或重新提示模型。绝不要用不完整的参数运行工具。

Python 把这些字段命名为 `tool_name`、`tool_call_id`、`raw_arguments_length`、`raw_arguments_preview`、`finish_reason` 和 `usage_metadata`；TypeScript 命名为 `toolName`、`toolCallId`、`rawArgumentsLength`、`rawArgumentsPreview`、`finishReason` 和 `usageMetadata`。

## 请求发出之前

| 错误 | 何时抛出 | 携带 |
| --- | --- | --- |
| `UnsupportedParameterError` | 模型拒绝某个 `UniConfig` 值，比如给固定温度的模型传 `temperature`。 | `client`、`parameter` |
| `UnsupportedOperationError` | 端点无法提供的调用，比如在 Amazon Bedrock 上列出模型。 | `client`、`operation` |

思考级别从不抛错。每个客户端都会把你要求的级别映射到模型支持的最接近的一档。

## MMSP 不认识的输出

网关会往流里塞自己的帧：心跳、计费提示。MMSP 会跳过它不认识的东西，所以一个这样的帧不会中断一次长生成。

把环境变量 `MMSP_DEBUG` 设成 `0`、`false`、`no`、`off` 之外的任何值，它就改为抛错。接入新提供商时你会想要这个。
