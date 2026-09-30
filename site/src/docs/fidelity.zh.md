---
description: 内容项携带的线上数据，让提供商在下一轮再次接受它。
---

提供商会给模型的产出附上数据，并要求原样拿回：思考块上的签名、消息上的阶段、推理的加密副本。你的代码用不上它们，但下一次请求少了它们就会失败或降级。

MMSP 把这些数据放在同一个地方：内容项的 `fidelity` 字段。

```json
{"type": "thinking.done", "thinking": "Let me check", "fidelity": {"signature": "EuYB..."}}
```

## 它装着什么

| 提供商 | 内容项 | Fidelity |
| --- | --- | --- |
| Anthropic | `thinking.done` | 思考块的 `signature`，或被隐去的思考块的数据 |
| OpenAI Responses | `thinking.done` | 推理到达时所在的 `channel`、`encrypted_content`，以及服务端要求送回的其他东西 |
| OpenAI Responses | `text.done` | 消息的 `phase` |
| Chat Completions | `thinking.done` | 服务端使用的 `reasoning_field`：`reasoning_content` 或 `reasoning` |
| Gemini | 任何一项 | 思考 `signature` |

## 规则

- **它是不透明的。** `fidelity` 是任意 JSON 对象。原样送回，不要修改，也不要丢弃。
- **它属于内容项。** 让它跟着到达时所在的那一项，按内容项到达的顺序。有状态调用两点都会做到。
- **一条流里每项只出现一次。** 一个组里最多一个 `.delta` 带它，`.done` 项带同样的值。带来它的那个片段可以是空的。

## 在提供商之间迁移对话

历史的内容对每家提供商读起来都一样，所以一段对话可以换到另一个模型上继续。Fidelity 是不能迁移的部分：签名只对签发它的提供商有意义。

另外两个限制来自提供商本身：

- **Gemini 签名绑定签发它的端点。** 用 Gemini API key 记录的历史不能带着签名迁移到 Vertex AI key 上，反过来也不行。
- **Gemini 要求调用了工具的轮次里有签名的思考。** 当该轮次来自另一家提供商时，MMSP 会用 Google 为模型未产生的思考所记载的占位签名开头，使请求被接受。
