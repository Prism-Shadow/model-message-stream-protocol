> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 如何在 Kimi API 中使用官方工具

> 查看 Kimi 开放平台可用的官方工具，并了解如何在 Chat Completions API 中配置和调用它们。

Kimi 开放平台提供一批官方工具，你可以将它们集成到自己的应用中（除联网搜索 `web-search` 按次收费外，其余官方工具目前限时免费；当工具负载达到容量上限时，可能采取临时的限流措施）。本页列出可用的官方工具，并演示如何通过 Kimi API 调用和执行它们。

> [!NOTE]
>
> 在 `kimi-k3.1-pro` 上使用联网搜索等官方工具时，请使用本页介绍的 Formula API 官方工具通道（OpenAI 协议，标准 `function` tool）；下文示例已在 `kimi-k3.1-pro` 上实测通过。

## 选择要使用的官方工具

下表列出当前可用的官方工具：

| 工具名称 | 工具描述 |
| - | - |
| `convert` | 单位转换工具，支持长度、质量、体积、温度、面积、时间、能量、压力、速度和货币的单位换算 |
| `web-search` | 实时信息及互联网检索工具。价格与可用性详情请见 [联网搜索价格](https://platform.kimi.com/docs/pricing/websearch.md) |
| `rethink` | 智能整理想法工具 |
| `random-choice` | 随机选择工具 |
| `mew` | 随机产生猫的叫声和祝福的工具 |
| `memory` | 记忆存储和检索系统工具，支持对话历史、用户偏好等数据的持久化 |
| `excel` | Excel 和 CSV 文件的分析工具 |
| `date` | 日期时间处理工具 |
| `base64` | Base64 编码与解码工具 |
| `fetch` | URL 内容提取 Markdown 格式化工具 |

## 完整示例：调用 `web_search` 官方工具

以下 Python 示例以 `web-search` 官方工具为例，演示完整调用链路（仅依赖 `requests`）。你也可以前往 [Kimi 开发工作台](https://platform.kimi.com/playground) 交互式体验 Kimi 模型和工具的能力。

通过 Formula API 使用官方工具遵循 OpenAI 协议的标准 `function` tool 流程，共 4 步：

1. `GET /v1/formulas/{uri}/tools` — 获取工具声明（`uri` 如 `moonshot/web-search:latest`）；
2. `POST /v1/chat/completions` — 带上工具声明，模型返回标准 `function` 类型的 `tool_calls`；
3. `POST /v1/formulas/{uri}/fibers` — 按 `tool_calls` 原样执行（`name` + `arguments` 原样透传，此步产生 tool\_call 计费）；
4. `POST /v1/chat/completions` — 带上 assistant 消息（含 `tool_calls`）和 `role: "tool"` 的结果，得到最终回答。

示例默认使用 `moonshot/web-search:latest`，把 `FORMULA_URI` 换成其他官方工具的 formula URI 即可体验：`moonshot/convert:latest`、`moonshot/web-search:latest`、`moonshot/rethink:latest`、`moonshot/random-choice:latest`、`moonshot/mew:latest`、`moonshot/memory:latest`、`moonshot/excel:latest`、`moonshot/date:latest`、`moonshot/base64:latest`、`moonshot/fetch:latest`

本页示例默认使用最新模型 `kimi-k3.1-pro`。K3.1 Pro 使用请求顶层 `reasoning_effort` 配置推理强度（支持 `"low"` / `"high"` / `"max"`，默认 `"max"`）。换用 `kimi-k3.1-pro-highspeed` 等其他模型时，需要替换 `model` 字段，并根据模型支持情况调整参数配置，详见[模型参数参考](https://platform.kimi.com/docs/api/models-overview.md)。

```python theme={null}
import os

import requests

BASE_URL = "https://api.moonshot.cn/v1"
API_KEY = os.environ["MOONSHOT_API_KEY"]
FORMULA_URI = "moonshot/web-search:latest"


def call(method: str, path: str, body: dict | None = None) -> dict:
    resp = requests.request(
        method,
        BASE_URL + path,
        headers={"Authorization": f"Bearer {API_KEY}"},
        json=body,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


# 1. 获取工具声明
tools = call("GET", f"/formulas/{FORMULA_URI}/tools")["tools"]

messages = [
    {"role": "system", "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手。"},
    {"role": "user", "content": "月之暗面最近有什么消息"},
]

while True:
    # 2. 带上工具声明请求模型（每次请求都要带上完整的 tools）
    resp = call("POST", "/chat/completions",
                {"model": "kimi-k3.1-pro", "messages": messages, "tools": tools})
    message = resp["choices"][0]["message"]
    tool_calls = message.get("tool_calls") or []
    if not tool_calls:
        # 没有 tool_calls，输出最终回答
        print(message["content"])
        break

    # 原样保留 assistant 消息（含 tool_calls），后续轮次必须带上
    messages.append({k: v for k, v in message.items()
                     if k in ("role", "content", "tool_calls")})

    for tc in tool_calls:
        fn = tc["function"]
        # 3. 按 tool_calls 原样执行 fiber（arguments 原样透传，此步产生 tool_call 计费）
        fiber = call("POST", f"/formulas/{FORMULA_URI}/fibers",
                     {"name": fn["name"], "arguments": fn["arguments"]})
        ctx = fiber.get("context", {})
        result = ctx.get("output") or ctx.get("encrypted_output") or ""
        # 4. 以 role=tool 消息回传结果，tool_call_id 与 tool_calls[].id 一一对齐
        messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})
```

运行前只需安装 `requests` 并设置 `MOONSHOT_API_KEY` 环境变量。

## 理解 Formula 概念

调用官方工具前，需要先了解 Formula：它是一个轻量脚本引擎集合，可以把 Python 脚本转化为“可被 AI 一键触发的瞬态算力”——开发者只需专注于代码编写，启动、调度、隔离、计费、回收等工作都由平台负责。

Formula 通过语义化的 URI（如 `moonshot/web-search:latest`）调用，每个 formula 包含声明（告诉 AI 能干什么）和实现（Python 代码），平台自动处理所有底层细节（启动、隔离、回收等），让工具可以在社区中轻松分享和复用。你可以在 Kimi Playground 中体验和调试这些工具，也可以通过 API 在应用中调用它们。

## 直接调用 Formula 执行工具

formula URI 一般由 3 个部分组成，例如 `moonshot/web-search:latest`：`web-search` 是它的 `name`；namespace 目前只支持 `moonshot`；`latest` 是默认的 tag。

例如需要调用 web search 时，可以发送这样的 HTTP 请求：

```bash theme={null}
export FORMULA_URI="moonshot/web-search:latest"
export MOONSHOT_BASE_URL="https://api.moonshot.cn/v1"

curl -X POST ${MOONSHOT_BASE_URL}/formulas/${FORMULA_URI}/fibers \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $MOONSHOT_API_KEY" \
-d '{
  "name": "web_search",
  "arguments": "{\"query\": \"月之暗面最近有什么消息\"}"
}'
```

`web-search` 在创建时被设置为 protected，它的结果会出现在 `context.encrypted_output` 字段中，格式类似 `----MOONSHOT ENCRYPTED BEGIN----... ----MOONSHOT ENCRYPTED END----`，该内容可以直接塞到 tool 调用里使用。

## 在 Chat Completions 中接入官方工具

如 [3214567是素数吗? 一个 Tool Calls 的调用案例介绍](https://platform.kimi.com/docs/api/tool-use) 所示，在 Chat Completions 中使用官方工具时，需要让 Formula API 和模型对齐几个关键信息。

### 获取工具定义并追加到 `tools` 字段

给定 formula URI（例如 `moonshot/web-search:latest`），直接把它拼接到 URL 里请求工具声明：

```bash theme={null}
curl ${MOONSHOT_BASE_URL}/formulas/${FORMULA_URI}/tools \
    -H "Authorization: Bearer $MOONSHOT_API_KEY"
```

返回示例：

```json theme={null}
{
  "object": "list",
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "web_search",
        "description": "Search the web for information",
        "parameters": {
          "type": "object",
          "properties": {
            "query": {
              "description": "What to search for",
              "type": "string"
            }
          },
          "required": [ "query" ]
        }
      }
    }
  ]
}
```

取返回中的 `tools` 字段（总是一个 array of dict）追加到请求的 `tools` 列表中即可，平台保证这个列表是 API 兼容的。

需要注意：

* 如果 `type=function`，要保证 `function.name` 在一次 API 请求中唯一，否则该 chat completion 请求会被视为非法请求并立即返回 400（`invalid_request_error`，错误信息形如 `function name get_weather is duplicated`）；
* 如果同时使用多个 formula，需要自己维护 `function.name` -> `formula_uri` 的映射，以备后用。

### 处理模型返回的工具调用

如果 chat completion 返回 `finish_reason=tool_calls`，说明模型触发了工具调用，返回内容类似：

```json theme={null}
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "tool_calls": [
          {
            "id": "web_search:0",
            "type": "function",
            "function": {
              "name": "web_search",
              "arguments": "{\"query\": \"天蓝色的 RGB 是什么？\" }"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ]
}
```

通过 `choices[0].message.tool_calls[0].function.name` 可以发现需要调用 `web_search`，而 `web_search` 对应的 `formula_uri` 是 `moonshot/web-search:latest`。完整复制返回中的 `choices[0].message.tool_calls[0].function` 作为 body，向 `${MOONSHOT_BASE_URL}/formulas/${FORMULA_URI}/fibers` 发出请求即可。

注意，模型输出的 `function.arguments` 虽然内容是合法的 JSON，但格式上仍然是一个 encoded string，你不需要转义，直接作为调用的 body 即可。

### 处理 Fiber 执行结果并继续对话

Fiber 是一次具体执行的“进程快照”，包含日志、Tracing、资源用量，方便调试与审计。POST 返回的 `status` 可能是 `succeeded` 或各种类型的错误；成功时结果类似：

```json theme={null}
{
  "id": "fiber-f43p7sby7ny111houyq1",
  "object": "fiber",
  "created_at": 1753440997,
  "lambda_id": "lambda-f3w8y6qcoqgi11h8q7ui",
  "status": "succeeded",
  "context": {
    "input": "{\"name\":\"web_search\",\"arguments\":\"{\\\"query\\\": \\\"天蓝色的 RGB 是什么？\\\" }\"}",
    "encrypted_output": "----MOONSHOT ENCRYPTED BEGIN----+nf6...DSM=----MOONSHOT ENCRYPTED END----"
  },
  "formula": "moonshot/web-search:latest",
  "organization_id": "staff",
  "project_id": "proj-88a5894a985646b5902b70909748ba16"
}
```

搜索类工具返回的可能是 `encrypted_output`，一般情况下返回的是 `output`——这个 output 就是下一轮的输入。继续请求时，messages 按如下方式排列：

```javascript theme={null}
messages = [
  /* other messages */
  { /* 上一轮模型的返回内容 */
    "role": "assistant",
    "tool_calls": [
      {
        "id": "web_search:0",
        "type": "function",
        "function": {
          "name": "web_search",
          "arguments": "{\"query\": \"天蓝色的 RGB 是什么？\" }"
        }
      }
    ]
  },
  { /* 你需要补充的信息 */
    "role": "tool",
    "tool_call_id": "web_search:0",  /* 注意这儿的 id 需要和前面的 tool_calls[].id 对齐 */
    "content": "----MOONSHOT ENCRYPTED BEGIN----+nf6...DSM=----MOONSHOT ENCRYPTED END----"
  }
]
```

之后模型就可以做进一步的推理。

## 注意事项

* 模型可能返回超过一个 `tool_calls`，必须对所有 `tool_calls` 都给出返回，模型才会继续，否则会认为请求不合法而拒绝请求；
* assistant 消息带 `tool_calls` 时，接下来必须是与 `tool_calls` 完全一致的几条 `role=tool` 消息，且 `tool_call_id` 与前面的 `tool_calls.id` 一一对齐：
  * 有多个 `tool_calls` 时顺序不敏感；
  * 模型输出的 `tool_calls` 的 id 一定是唯一的，`role=tool` 消息的 id 也必须与之对齐；
  * 唯一性要求仅针对当轮 `tool_calls`-response 的局部，对整个 conversation 或全局不敏感。
