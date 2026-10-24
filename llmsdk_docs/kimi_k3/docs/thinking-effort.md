> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 推理强度

> 使用 `reasoning_effort` 在 `low`、`high` 和 `max` 之间调节 Kimi K3.1 Pro 的推理深度、延迟与 token 消耗。

Kimi K3.1 Pro 始终进行推理，并通过请求顶层 `reasoning_effort` 配置 **推理强度**。该字段支持 `"low"` / `"high"` / `"max"` 三档，默认 `"max"`。

## 设置推理强度

在 Chat Completions 请求顶层设置 `reasoning_effort`：

```json theme={null}
{
  "model": "kimi-k3.1-pro",
  "messages": [{"role": "user", "content": "请推导一下这个数列的通项公式：1, 4, 9, 25, 64, ..."}],
  "reasoning_effort": "high"
}
```

从 K2.x 迁移到 K3 时，移除 K2.x 的 `thinking` 配置，并按需使用顶层 `reasoning_effort`。

**curl**

```bash theme={null}
$ curl https://api.moonshot.cn/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MOONSHOT_API_KEY" \
    -d '{
        "model": "kimi-k3.1-pro",
        "messages": [
            {
                "role": "user",
                "content": "请推导一下这个数列的通项公式：1, 4, 9, 25, 64, ..."
            }
        ],
        "reasoning_effort": "high"
    }'
```

**python**

```python theme={null}
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["MOONSHOT_API_KEY"],
    base_url="https://api.moonshot.cn/v1",
)

completion = client.chat.completions.create(
    model="kimi-k3.1-pro",
    messages=[
        {"role": "user", "content": "请推导一下这个数列的通项公式：1, 4, 9, 25, 64, ..."},
    ],
    reasoning_effort="high",
)

message = completion.choices[0].message
if hasattr(message, "reasoning_content"):
    print(getattr(message, "reasoning_content"))
print(message.content)
```

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
| - | - | - | - |
| `reasoning_effort` | string | 否 | K3 的顶层推理强度字段，支持 `"low"` / `"high"` / `"max"`，默认 `"max"`。 |

K3 的多轮对话和工具调用必须将 API 返回的完整 assistant message 原样回传到 `messages`，包括 `reasoning_content` 和 `tool_calls`。

## 相关阅读

* [Kimi K3 API 工具调用最佳实践](https://platform.kimi.com/docs/guide/kimi-k3-tool-calling-best-practice.md)：工具调用场景中的推理强度配置建议
* [使用思考模式](https://platform.kimi.com/docs/guide/use-thinking-models.md)：各模型的思考行为与保留式思考（Preserved Thinking）
* [模型参数参考](https://platform.kimi.com/docs/api/models-overview.md)：各模型的参数配置差异
