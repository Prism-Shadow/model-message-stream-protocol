> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 动态加载工具

> 按需将工具定义追加到 Kimi 对话中，减少 token 消耗、提高工具选择准确性并保留前缀缓存。

当你的应用需要挂载大量工具时，如果把所有工具的声明一次性放进请求顶层的 `tools` 字段，会遇到 **工具定义膨胀（Tool Definition Bloat）** 问题：每个请求都要携带全部工具的描述和参数 schema，token 消耗高；候选工具越多，模型也越容易选错工具、构造出错误的调用参数。

动态加载工具（Dynamically Loaded Tools）允许你在对话过程中 **按需注入工具**：先只挂载少量核心工具，当对话进展到需要某个工具时，再把它动态插入 `messages` 中，从而同时降低 token 消耗、提升工具选择的准确性。由于工具声明只会 **追加** 在 `messages` 尾部，已有对话前缀保持不变，这种注入方式不会破坏已建立的前缀缓存，可以与 [上下文缓存](https://platform.kimi.com/docs/guide/context-caching.md) 叠加使用以进一步降低成本和延迟。关于这一设计背后的思路（Lazy-Load、工具目录）与组合实践，见 [Kimi K3 API 工具调用最佳实践](https://platform.kimi.com/docs/guide/kimi-k3-tool-calling-best-practice.md)。

![动态加载工具示意：从“带上整个工具箱”到“按需取用所需工具”](https://mintcdn.com/moonshotcn/yK6w_PTw9H6ntFDS/assets/pics/dynamically-loaded-tools.jpg?fit=max\&auto=format\&n=yK6w_PTw9H6ntFDS\&q=85\&s=27e41365a449fe8550c41199491a3b7a)

## 在 messages 中注入工具声明

在 `messages` 中插入一条 `role` 为 `system` 的消息，并通过该消息的 `tools` 字段声明要加载的工具。声明格式与请求顶层 `tools` 字段的格式完全一致，且需要提供工具的 **完整信息**（`name`、`description`、`parameters`）：

```json theme={null}
{
  "messages": [
    {
      "role": "system",
      "content": "You are Kimi, an AI assistant developed by Moonshot AI.\nYou are capable of a wide range of tasks, including:\n📝 Q&A & Explanation – Answer all kinds of questions, ranging from scientific knowledge to daily life matters\n✍️ Writing Assistance – Draft essays, emails and reports, or polish your written text\n💻 Coding Support – Write and debug code, and explain technical concepts\n🔍 Analysis & Summarization – Process lengthy documents, extract key points and analyze data\n🌍 Translation – Support mutual translation between multiple languages\n💡 Brainstorming – Help you expand ideas and generate creative inspirations\nYou also accept extremely long context inputs, making you ideal for users who need analysis or summaries of lengthy documents."
    },
    {
      "role": "user",
      "content": "Calculate fuel consumption."
    },
    {
      "role": "system",
      "tools": [
        {
          "type": "function",
          "function": {
            "name": "Calculator",
            "description": "计算器，只支持单个算术表达式的求值",
            "parameters": {
              "type": "object",
              "properties": {
                "expr": {
                  "type": "string",
                  "description": "算术表达式，支持四则运算、指数运算、对数函数、三角函数，使用 javascript 语法"
                }
              },
              "required": ["expr"]
            }
          }
        }
      ]
    }
  ]
}
```

几点说明：

* 携带 `tools` 的 `system` 消息与普通的 input messages **地位相同**：它出现在 `messages` 列表的哪个位置，工具就从哪个位置开始对模型可见；
* 动态加载的工具与请求顶层 `tools` 字段声明的全局工具 **并存**，模型可以同时看到两类工具；
* 动态注入的工具声明必须是 **完整** 的工具定义，不能只传工具名或引用全局已声明的工具。

**curl**

```bash theme={null}
$ curl https://api.moonshot.cn/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MOONSHOT_API_KEY" \
    -d '{
        "model": "kimi-k3.1-pro",
        "messages": [
            {
                "role": "system",
                "content": "You are Kimi, an AI assistant developed by Moonshot AI.\nYou are capable of a wide range of tasks, including:\n📝 Q&A & Explanation – Answer all kinds of questions, ranging from scientific knowledge to daily life matters\n✍️ Writing Assistance – Draft essays, emails and reports, or polish your written text\n💻 Coding Support – Write and debug code, and explain technical concepts\n🔍 Analysis & Summarization – Process lengthy documents, extract key points and analyze data\n🌍 Translation – Support mutual translation between multiple languages\n💡 Brainstorming – Help you expand ideas and generate creative inspirations\nYou also accept extremely long context inputs, making you ideal for users who need analysis or summaries of lengthy documents."
            },
            {
                "role": "user",
                "content": "帮我计算一下 23 * 47 的结果。"
            },
            {
                "role": "system",
                "tools": [
                    {
                        "type": "function",
                        "function": {
                            "name": "Calculator",
                            "description": "计算器，只支持单个算术表达式的求值",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "expr": {
                                        "type": "string",
                                        "description": "算术表达式，支持四则运算、指数运算、对数函数、三角函数，使用 javascript 语法"
                                    }
                                },
                                "required": ["expr"]
                            }
                        }
                    }
                ]
            }
        ]
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
        {"role": "system", "content": "You are Kimi, an AI assistant developed by Moonshot AI.\nYou are capable of a wide range of tasks, including:\n📝 Q&A & Explanation – Answer all kinds of questions, ranging from scientific knowledge to daily life matters\n✍️ Writing Assistance – Draft essays, emails and reports, or polish your written text\n💻 Coding Support – Write and debug code, and explain technical concepts\n🔍 Analysis & Summarization – Process lengthy documents, extract key points and analyze data\n🌍 Translation – Support mutual translation between multiple languages\n💡 Brainstorming – Help you expand ideas and generate creative inspirations\nYou also accept extremely long context inputs, making you ideal for users who need analysis or summaries of lengthy documents."},
        {"role": "user", "content": "帮我计算一下 23 * 47 的结果。"},
        # 动态加载工具：在对话中插入一条携带 tools 的 system 消息
        {
            "role": "system",
            "tools": [
                {
                    "type": "function",
                    "function": {
                        "name": "Calculator",
                        "description": "计算器，只支持单个算术表达式的求值",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "expr": {
                                    "type": "string",
                                    "description": "算术表达式，支持四则运算、指数运算、对数函数、三角函数，使用 javascript 语法",
                                }
                            },
                            "required": ["expr"],
                        },
                    },
                }
            ],
        },
    ],
)

print(completion.choices[0].message.tool_calls)
```

## 用动态加载实现 Tool Search

API 层面没有专门的 tool search 接口。如果你的工具数量很多，可以组合「自定义 search 工具 + 动态加载工具」来自行实现 tool search：

1. 在请求顶层 `tools` 中只声明一个 `search_tools` 工具，由你的后端实现，按关键词返回匹配的工具名称和简介；
2. 在 system prompt 中声明可被搜索的关键词（例如工具目录、领域标签），引导模型在需要工具时先调用 `search_tools`；
3. 根据 `search_tools` 返回的结果，由你的应用把对应工具的 **完整声明** 通过一条携带 `tools` 的 `system` 消息动态插入 `messages`；
4. 模型即可在后续生成中直接调用这些新加载的工具。

这样无论工具总量有多大，每一轮请求中实际存在的工具声明都只有少量几个，上下文窗口和模型的选择压力都可控。

## 对上下文缓存的影响

动态加载工具可以与 [上下文缓存](https://platform.kimi.com/docs/guide/context-caching.md) 叠加使用。上下文缓存按前缀匹配：只有当前请求与之前请求完全一致的前缀部分才能命中缓存，前缀中任何位置发生变化，该位置之后的缓存都会失效。因此工具声明的注入方式直接决定缓存命中率，遵循以下原则可以在按需加载工具的同时保持较高的缓存命中率：

* **追加，不要插入**：新的工具声明一律追加到 `messages` 末尾，已有前缀保持不变，不影响已建立的缓存；向对话中间插入或修改任何消息（包括已注入的工具声明），都会使变更位置之后的缓存无法命中；
* **保留已注入的声明**：动态工具声明按请求生效，不会被服务端记住。建议在后续请求中原样保留已加载的工具声明，这样工具保持可用、前缀保持稳定，有利于持续命中缓存；你也可以根据业务需要自行决定是否继续携带。若不再携带，该工具声明即失效，如果工具未在其他位置声明，模型将无法调用它；同时由于 `messages` 发生变化，变更位置之后的前缀缓存也可能无法命中；
* **核心工具固定在顶层声明，之后不再改动**：把每轮都要用的核心工具放在请求顶层 `tools` 字段做全局声明，声明之后保持内容不变。顶层全局工具声明不影响缓存命中，保持稳定即可让前缀缓存持续有效；只有按需使用的工具才做动态注入。

| 操作 | 对前缀缓存的影响 |
| :- | :- |
| 在 `messages` 末尾追加工具声明 | 不影响已有前缀缓存 |
| 后续请求原样保留已注入的工具声明 | 前缀保持稳定，有利于持续命中缓存 |
| 删除、修改对话中间的消息，或在中间插入新声明 | 变更位置之后的缓存可能无法命中 |
| 在顶层 `tools` 字段声明全局工具 | 不影响缓存命中 |

注意缓存按块存储：不足一整块的部分无法写入缓存，会计为缓存未命中。详见 [上下文缓存](https://platform.kimi.com/docs/guide/context-caching.md)。

## 注意事项

* 动态工具声明与全局 `tools` 声明 **格式完全统一**，接入方无需维护两套 schema，迁移成本低；
* 携带 `tools` 的 `system` 消息同样会占用上下文长度，请只对当前对话真正需要的工具做动态注入；
* 动态加载工具目前仅 `kimi-k3.1-pro`、`kimi-k3` 支持，在其他模型（如 `kimi-k2.6`）上请求会返回 `tokenization failed` 错误；
* 携带 `tools` 的 `system` 消息不能再携带 `content` 字段，否则请求会以 400 报错（`cannot be used with content`）；使用 OpenAI SDK 时可直接在 `messages` 中透传 `tools` 字段，无需 `extra_body`。

## 相关阅读

* [Kimi K3 API 工具调用最佳实践](https://platform.kimi.com/docs/guide/kimi-k3-tool-calling-best-practice.md)：动态加载、tool\_choice 与推理强度的组合实践
* [工具调用约束](https://platform.kimi.com/docs/guide/use-tool-choice.md)：通过 `tool_choice` 约束模型的工具调用行为
* [使用 Kimi API 完成工具调用](https://platform.kimi.com/docs/guide/use-kimi-api-to-complete-tool-calls.md)：工具调用的完整流程与示例
* [模型参数参考](https://platform.kimi.com/docs/api/models-overview.md)：各模型对 `tool_choice` 等参数的支持差异
