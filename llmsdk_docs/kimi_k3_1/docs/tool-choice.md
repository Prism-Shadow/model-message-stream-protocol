> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 工具调用约束

> 使用 `tool_choice` 让 Kimi 自动选择、强制或禁止工具调用，并结合工具定义提高可靠性。

声明工具（`tools`）后，模型默认自行判断本轮是否需要调用工具。`tool_choice` 参数让你显式控制这个行为：强制调用、完全禁止，或保持默认。

## 强制模型调用工具：`"required"`

当工作流必须走工具链路时使用——例如强制检索、强制查询数据库，不允许模型凭记忆直接作答：

```json theme={null}
{
  "tool_choice": "required"
}
```

模型在本轮必须至少调用一个工具。使用时请确保请求中声明了可调用的工具。一个典型用法是工具搜索模式：首轮用 `"required"` 强制模型调用 `search_tools`，检索完成后恢复 `"auto"`，详见 [Kimi K3 API 工具调用最佳实践](https://platform.kimi.com/docs/guide/kimi-k3-tool-calling-best-practice.md)。

## 禁止工具调用：`"none"`

当请求只需要纯文本回复、不希望模型误触发工具时使用：

```json theme={null}
{
  "tool_choice": "none"
}
```

模型会直接输出文本，不产生任何 `tool_calls`，同时降低延迟与 token 消耗。

## 让模型自行决定：`"auto"`（默认）

不传入 `tool_choice` 时即为 `"auto"`：模型根据上下文自行决定是否调用工具，适合常规对话。

## 强制调用指定工具：传入函数对象

除了三个枚举值，`tool_choice` 还可以传入一个函数对象，强制模型调用指定工具：

```json theme={null}
{
  "tool_choice": {"type": "function", "function": {"name": "get_weather"}}
}
```

> [!NOTE]
>
> 指定函数调用当前与思考开启不兼容：思考开启时传入会返回 400 错误（`tool_choice 'specified' is incompatible with thinking enabled`）。

## 完整请求示例

以下示例声明了一个天气查询工具，并用 `tool_choice: "required"` 强制模型调用它：

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
                "content": "今天北京的天气怎么样？"
            }
        ],
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "查询指定城市的实时天气",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "city": {
                                "type": "string",
                                "description": "城市名称"
                            }
                        },
                        "required": ["city"]
                    }
                }
            }
        ],
        "tool_choice": "required"
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
        {"role": "user", "content": "今天北京的天气怎么样？"},
    ],
    tools=[
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "查询指定城市的实时天气",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "city": {"type": "string", "description": "城市名称"}
                    },
                    "required": ["city"],
                },
            },
        }
    ],
    # 强制模型至少调用一个工具；不传入时默认为 "auto"
    tool_choice="required",
)

print(completion.choices[0].message.tool_calls)
```

## 注意事项

* `tool_choice` 是请求级参数，每次请求独立生效，只对本次生成的工具选择行为产生约束；
* 是否设置 `tool_choice` **不会破坏前缀缓存**，可以放心按请求粒度调整该参数；
* 如果模型反复调用同一个工具且参数完全相同，参见 [如何解决重复调用问题](https://platform.kimi.com/docs/guide/tool-call-repeat.md)。

## 相关阅读

* [Kimi K3 API 工具调用最佳实践](https://platform.kimi.com/docs/guide/kimi-k3-tool-calling-best-practice.md)：动态加载、tool\_choice 与推理强度的组合实践
* [动态加载工具](https://platform.kimi.com/docs/guide/use-dynamic-tool-loading.md)：工具数量较多时按需注入工具定义，降低 token 消耗、提升选择准确率
* [使用 Kimi API 完成工具调用](https://platform.kimi.com/docs/guide/use-kimi-api-to-complete-tool-calls.md)：工具调用的完整流程与示例
* [模型参数参考](https://platform.kimi.com/docs/api/models-overview.md)：各模型对 `tool_choice` 参数的支持差异
