---
description: 内容项携带的协议层数据，用于让服务商在下一轮对话中识别并接受它。
---

服务商会为模型的输出附加一些数据，并要求在后续请求中完整返回，例如思考块的签名、消息的阶段、推理内容的加密副本。你的代码通常不需要处理这些数据，但下一轮请求少了它们，就会失败，或者模型的表现变差。

MMSP 统一将这些数据存放在内容项的 `fidelity` 字段中。

```json
{"type": "thinking.done", "thinking": "Let me check", "fidelity": {"signature": "EuYB..."}}
```

## 存储内容

| 服务商 | 内容项 | Fidelity |
| --- | --- | --- |
| Anthropic | `thinking.done` | 思考块的 `signature`，或被隐去思考块的数据 |
| OpenAI Responses | `thinking.done` | 推理所在的 `channel`、`encrypted_content`，以及服务端要求返回的其他数据 |
| OpenAI Responses | `text.done` | 消息的 `phase` |
| Chat Completions | `thinking.done` | 服务端使用的 `reasoning_field`：`reasoning_content` 或 `reasoning` |
| Gemini | 任何内容项 | 思考 `signature` |

## 使用规则

- **数据不透明。** `fidelity` 是一个任意的 JSON 对象。请原样返回，不要修改，也不要丢弃。
- **数据属于内容项。** 应将其与对应的内容项一起保存，并保持内容项到达的顺序。有状态调用会自动处理这两点。
- **每个内容项在流里只带一次。** 一个内容组中最多只有一个 `.delta` 携带它，`.done` 项会携带相同的值。携带它的片段本身可以是空的。

## 跨服务商迁移对话

对话历史的内容对各服务商是通用的，因此一段对话可以切换到另一个模型上继续。但 Fidelity 数据无法迁移：签名等数据仅对签发它的服务商有意义。

此外，服务商自身还有两个限制：

- **Gemini 签名与签发它的端点绑定。** 使用 Gemini API key 记录的对话历史，无法带着签名迁移到 Vertex AI key 上，反之亦然。
- **Gemini 要求在调用了工具的轮次中提供已签名的思考。** 如果该轮次来自其他服务商，MMSP 会使用 Google 文档中为模型未生成的思考所规定的占位签名作为开头，以确保请求被接受。
