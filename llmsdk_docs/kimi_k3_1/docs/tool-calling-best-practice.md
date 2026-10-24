> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Kimi K3 API 工具调用最佳实践

> 工具数量较多时，结合动态加载、tool_choice 与推理强度设计工具调用流程。

当 Agent 可用的工具达到几十上百个时，不要把所有工具定义一次性放进请求——它们会占掉大量上下文，还会让模型更容易选错工具。本页介绍一套在 Kimi K3 上的工具编排方式：先用一个搜索工具检索候选工具，再按需把工具定义动态注入对话。

## 先声明一个搜索工具，而不是全部工具

会话开始时，在请求顶层 `tools` 中只声明一个由你后端实现的 `search_tools` 工具，以及少量每轮都可能用到的核心工具：

```json theme={null}
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_tools",
        "description": "按关键词搜索可用工具，返回工具名称和简介",
        "parameters": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "搜索关键词，例如 github、database"
            }
          },
          "required": ["query"]
        }
      }
    }
  ]
}
```

在 system prompt 中告知模型可搜索的领域标签（例如工具目录、业务域），引导它在需要工具时先调用 `search_tools`。这样无论工具总量多大，每轮请求里的工具声明都只有少量几个。

## 用 tool\_choice 强制首轮检索

模型可以选择不调用任何工具、直接凭记忆作答。为了确保它先检索再回答，首轮请求设置 `tool_choice: "required"`：

```json theme={null}
{
  "model": "kimi-k3.1-pro",
  "messages": [{"role": "user", "content": "帮我创建一个 GitHub PR"}],
  "tools": ["..."],
  "tool_choice": "required"
}
```

检索完成后，后续请求把 `tool_choice` 恢复为 `"auto"`。修改 `tool_choice` 不会破坏前缀缓存，可以按请求粒度调整。各取值含义见[工具调用约束](https://platform.kimi.com/docs/guide/use-tool-choice.md)。

## 按需注入工具定义

`search_tools` 返回候选工具后，由你的应用把对应工具的完整声明，通过一条携带 `tools` 的 `system` 消息插入 `messages`。工具从该消息所在的位置开始对模型可见：

```json theme={null}
{
  "role": "system",
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "create_github_pr",
        "description": "在指定仓库创建 Pull Request",
        "parameters": {
          "type": "object",
          "properties": {}
        }
      }
    }
  ]
}
```

动态声明的格式与顶层 `tools` 完全一致，不需要维护两套 schema；注入的工具与顶层声明的全局工具并存。动态工具声明按请求生效，不会被服务端记住。下一轮可以继续携带原声明，让工具保持可用并复用前缀缓存；也可以移除该声明。如果工具未在其他位置声明，模型将无法调用这个工具，同时后续前缀可能无法命中缓存。完整用法见[动态加载工具](https://platform.kimi.com/docs/guide/use-dynamic-tool-loading.md)。

> [!NOTE]
>
> 缓存按块存储，不足一整块的部分无法写入缓存，会计为缓存未命中。详见[上下文缓存](https://platform.kimi.com/docs/guide/context-caching.md)。

## 按任务复杂度确定推理强度

请求顶层 `reasoning_effort` 支持 `low` / `high` / `max` 三档，默认 `max`。

建议在会话开始前确定该配置。在 `messages` 末尾追加动态工具声明，不会影响已有前缀的缓存；删除或修改之前的工具声明，可能影响变更位置之后的缓存命中。修改 `tool_choice` 不会破坏前缀缓存。配置说明见[推理强度](https://platform.kimi.com/docs/guide/use-reasoning-effort.md)。

## 完整流程

1. 会话开始：顶层 `tools` 只放 `search_tools` 和少量核心工具；
2. 首轮检索：`tool_choice: "required"` 强制模型调用 `search_tools`；
3. 按需注入：按检索结果用 `system` 消息动态插入工具定义；
4. 直接调用：模型在后续生成中调用已加载的工具；
5. 推理强度：会话开始前确定顶层 `reasoning_effort` 配置。

## 相关阅读

* [动态加载工具](https://platform.kimi.com/docs/guide/use-dynamic-tool-loading.md)
* [工具调用约束](https://platform.kimi.com/docs/guide/use-tool-choice.md)
* [如何解决重复调用问题](https://platform.kimi.com/docs/guide/tool-call-repeat.md)
* [推理强度](https://platform.kimi.com/docs/guide/use-reasoning-effort.md)
* [使用 Kimi API 完成工具调用](https://platform.kimi.com/docs/guide/use-kimi-api-to-complete-tool-calls.md)
* [模型参数参考](https://platform.kimi.com/docs/api/models-overview.md)
