---
description: 一次响应的四个 token 计数，以及它们如何相加。
---

`stop` 事件是每条流的最后一个事件，它在 `usage_metadata` 里带有本次请求的 token 计数。

```json
{"cached_tokens": 120, "prompt_tokens": 412, "thoughts_tokens": 31, "response_tokens": 27}
```

| 字段 | 计数 |
| --- | --- |
| `cached_tokens` | 从提供商缓存读取的输入 token |
| `prompt_tokens` | 未命中缓存的输入 token |
| `thoughts_tokens` | 花在思考上的输出 token |
| `response_tokens` | 回答本身的输出 token |

## 总计

```text
input_tokens  = cached_tokens + prompt_tokens
output_tokens = thoughts_tokens + response_tokens
total_tokens  = input_tokens + output_tokens
```

提供商没有报告的计数为 null。把它当作零。

## 在哪里读取

从 `stop` 事件读取计数，读一次即可。`delta` 事件带的是 null，不需要跨事件累加。

有状态调用记录的助手消息带有同样的 `usage_metadata`，所以存下来的历史保留了每一轮的开销。

抛出 `EmptyResponseError` 的响应同样花了 token。这个错误带有它的 `usage_metadata`。
