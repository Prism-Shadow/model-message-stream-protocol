---
description: 一次响应的四个 token 计数，以及它们如何相加。
---

每条流的最后一个事件 `stop` 会携带本次请求的 token 计数，位于 `usage_metadata` 字段中。

```json
{"cached_tokens": 120, "prompt_tokens": 412, "thoughts_tokens": 31, "response_tokens": 27}
```

| 字段 | 计数 |
| --- | --- |
| `cached_tokens` | 从服务商缓存读取的输入 token |
| `prompt_tokens` | 未命中缓存的输入 token |
| `thoughts_tokens` | 用于思考的输出 token |
| `response_tokens` | 回答本身的输出 token |

## 总计

```text
input_tokens  = cached_tokens + prompt_tokens
output_tokens = thoughts_tokens + response_tokens
total_tokens  = input_tokens + output_tokens
```

服务商未报告的计数为 null，应视为零。

## 读取位置

从 `stop` 事件读取计数，只需读取一次。`delta` 事件中的该字段为 null，无需跨事件累加。

有状态调用记录的助手消息也包含相同的 `usage_metadata`，因此存储的历史会话会保留每一轮的成本。

即使响应抛出了 `EmptyResponseError`，也已消耗 token。该错误同样包含其 `usage_metadata`。
