> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 使用 response_format 控制模型输出格式

> 使用 `response_format` 启用 JSON Mode 或 Structured Output，并处理模式、结构和 Partial Mode 限制。

Kimi API 通过 `response_format` 参数约束聊天补全的输出格式。它支持两种模式：

| 模式 | `type` 值 | 说明 | 适用场景 |
| - | - | - | - |
| **JSON Mode** | `json_object` | 保证输出为合法 JSON Object，但不约束具体字段 | 简单 JSON 输出、字段灵活的场景 |
| **Structured Output** | `json_schema` | 通过 JSON Schema 精确定义字段名、类型、嵌套结构 | 需要严格结构、对接下游系统的场景 |

本文档重点介绍 `response_format` 的 **`json_schema` 模式（即 Structured Output）**，包括参数用法、模型差异、常见问题与错误处理。JSON Mode 的基础用法可参考 [JSON Mode](https://platform.kimi.com/docs/guide/use-json-mode-feature-of-kimi-api.md)。

## response\_format 基本结构

```python theme={null}
response_format={
    "type": "json_schema",           # 或 "json_object"
    "json_schema": {                 # json_schema 模式必填
        "name": "schema_name",
        "strict": True,
        "schema": { ... }            # 你的 JSON Schema
    }
}
```

* `type` 为 `json_object` 时，不需要 `json_schema` 字段。
* `type` 为 `json_schema` 时，必须提供 `json_schema.name` 和 `json_schema.schema`。

## Structured Output 的优势

与 JSON Mode 相比，Structured Output 的优势在于：

* **结构严格受控**：模型输出必须完全遵循你定义的 JSON Schema，字段名、类型、嵌套层级都一一对应。
* **无需在 prompt 中反复描述格式**：将格式要求从 schema 中剥离，降低 prompt 工程的复杂度。
* **下游系统对接更可靠**：输出可直接被 `json.loads` 解析为强类型对象，无需额外的容错处理。

> **模型差异提示**：不同模型对 JSON Schema 的支持程度存在差异。
>
> * `kimi-k3.1-pro`、`kimi-k3` 稳定支持 Structured Output，嵌套对象、数组、`anyOf` 等均能正常处理。
> * `kimi-k2.7-code` 对 Structured Output 的支持最稳，包括嵌套对象、数组、`anyOf` / `oneOf` / `$ref` / `additionalProperties: true` 等都能正常处理。
> * `kimi-k2.6` 在复杂 schema 下偶有不稳定表现，例如 `$ref` 可能返回 Markdown 代码块、`oneOf` 可能被忽略、`partial=true` 可能输出 schema 外字段。使用 `kimi-k2.6` 时建议优先使用简单 schema，并在业务层做二次校验。

## 快速开始

### 基本用法

在 `response_format` 中将 `type` 设为 `"json_schema"`，并传入 `json_schema` 对象：

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
        {
            "role": "system",
            "content": "你是一个新闻摘要助手。"
        },
        {
            "role": "user",
            "content": "请总结以下新闻：今日，人工智能技术领域迎来重大突破..."
        }
    ],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "news_summary",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "新闻标题"},
                    "author": {"type": "string", "description": "作者或来源"},
                    "publish_time": {"type": "string", "description": "发布时间，ISO 8601 格式"},
                    "summary": {"type": "string", "description": "200 字以内的摘要"},
                    "keywords": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "3-5 个关键词"
                    }
                },
                "required": ["title", "author", "summary", "keywords"]
            }
        }
    }
)

import json
result = json.loads(completion.choices[0].message.content)
print(result["title"])
print(result["keywords"])
```

### 输出示例

```json theme={null}
{
  "title": "人工智能技术取得重大突破",
  "author": "科技日报",
  "publish_time": "2024-06-19",
  "summary": "研究人员在深度学习模型效率优化方面取得新进展...",
  "keywords": ["人工智能", "深度学习", "模型优化", "技术突破"]
}
```

### 关于 reasoning\_content

`kimi-k3`、`kimi-k2.7-code` 等思考模型在返回 `content` 的同时，可能还会返回 `reasoning_content`。请只解析 `choices[0].message.content` 作为最终 JSON，不要直接用 `json.loads` 处理整个响应对象。

```python theme={null}
content = completion.choices[0].message.content
result = json.loads(content)
```

## 参数说明

| 参数 | 类型 | 说明 |
| - | - | - |
| `type` | `"json_schema"` \| `"json_object"` | 必须设置，二选一 |
| `json_schema.name` | string | Schema 的标识名称，用于日志和调试 |
| `json_schema.strict` | boolean | 是否严格按 schema 约束输出。建议显式设置为 `true` |
| `json_schema.schema` | object | JSON Schema 对象，定义输出结构 |

> **注意**：`strict` 为 `true`、`false` 或省略时，`kimi-k2.7-code` 对 schema 的遵守程度都较高；`kimi-k2.6` 在 `strict=false` 或省略时更容易输出 schema 外字段。建议始终显式设置 `strict: true`。

## `strict` 模式说明

`json_schema.strict` 建议设置为 `true`，表示 **强制** 模型输出必须完全匹配 schema 定义。此时你的 schema 需要符合 **MFJS（Moonshot Flavored JSON Schema）** 规范。

> **MFJS 的模型差异**：
>
> * `kimi-k2.7-code` 对 `anyOf` / `oneOf` / `$ref` / `additionalProperties: true` 等特性的支持已比较完善，通常不会触发 MFJS 报错。
> * `kimi-k2.6` 在复杂 schema 下更可能触碰 MFJS 限制，建议保持 schema 简单。

如果 `strict` 设为 `false`，API 仅保证输出为合法 JSON 对象，但不强制约束内部字段结构。这在 schema 较复杂或你希望给予模型更大灵活性时可以使用。

### 如何校验 schema 是否符合 MFJS

可以使用 `walle` CLI 工具快速自检 schema 的兼容性：

```bash theme={null}
# 安装 walle 工具
go install github.com/moonshotai/walle/cmd/walle@latest

# 校验你的 schema
walle -schema 'your_schema_json' -level strict
```

> 即使 schema 包含 `anyOf` / `oneOf` / `$ref`，API 也常能正常返回 `200`，且响应中**不会出现 `warning` 字段**。因此 `walle` 更适合作为静态检查入口，实际兼容性请以目标模型的在线调用结果为准。

## 嵌套对象与数组示例

Structured Output 支持任意深度的嵌套对象和数组，这在 `kimi-k2.7-code` 上表现稳定：

```python theme={null}
response_format={
    "type": "json_schema",
    "json_schema": {
        "name": "meeting_minutes",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "meeting_title": {"type": "string"},
                "date": {"type": "string"},
                "attendees": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "role": {"type": "string"},
                            "present": {"type": "boolean"}
                        },
                        "required": ["name", "role", "present"]
                    }
                },
                "agenda_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "topic": {"type": "string"},
                            "discussion": {"type": "string"},
                            "action_items": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "assignee": {"type": "string"},
                                        "task": {"type": "string"},
                                        "deadline": {"type": "string"}
                                    },
                                    "required": ["assignee", "task"]
                                }
                            }
                        },
                        "required": ["topic", "discussion"]
                    }
                }
            },
            "required": ["meeting_title", "date", "attendees", "agenda_items"]
        }
    }
}
```

## JSON Mode 与 Structured Output 的对比

| 特性 | `json_object` | `json_schema` + `strict: true` |
| - | - | - |
| 输出合法性 | 保证合法 JSON Object | 保证合法 JSON Object |
| 字段名 | 不保证，模型可能"自由发挥" | 强制固定 |
| 字段类型 | 不强制 | 强制匹配 |
| 额外字段 | 可能擅自增加 | 禁止（`additionalProperties: false`） |
| 字段缺失 | 可能省略 | `required` 字段必现，可用联合类型声明可为 `null` |
| 实现机制 | Prompt 引导 | Token 级约束解码（CFG），在采样阶段过滤非法 token |
| 使用场景 | 快速原型、非关键路径 | 生产环境、API 对接、数据入库 |
| strict 校验 | 无 | 有（MFJS 规范） |

约束解码对结构的保证以 schema 符合 MFJS 规范为前提；复杂 schema 在 `kimi-k2.6` 等模型上仍可能不稳定，详见上方的模型差异提示。对于需要下游消费的结构化数据，建议始终使用 `json_schema` + `strict: true`，避免在业务层编写大量防御性代码。

## 注意事项

1. **Schema 需符合 MFJS 规范**：`strict=true` 时，建议使用 `walle` CLI 工具预先校验 schema。常见的 MFJS 约束在 `kimi-k2.7-code` 上已大幅放宽，但在 `kimi-k2.6` 上仍可能触发。

2. **提示词仍需提供上下文**：虽然格式由 schema 约束，但模型仍需理解 **业务内容**。请在 system prompt 或 user prompt 中清晰描述任务目标和数据来源。

3. **`additionalProperties`**：
   * 设置为 `false` 时，模型不会输出 schema 中未定义的字段。
   * 设置为 `true` 或不指定时，`kimi-k2.7-code` 允许输出额外字段；`kimi-k2.6` 也可能输出额外字段，但稳定性不如 `kimi-k2.7-code`。

4. **用可为 `null` 的联合类型表达缺失信息**：声明在 `required` 中的字段必然出现在输出中。当输入缺少对应信息时，如果字段只声明了单一类型（如 `"integer"`），模型可能编造内容或返回空字符串；建议改用联合类型声明可为 `null`（如 `"type": ["integer", "null"]`），让模型用 `null` 显式表示"信息缺失"，而不是字符串 `"未知"` 或字段消失——下游可以直接 `json.loads` 后做强类型转换，无需防御性处理。注意 `kimi-k2.6` 仍可能返回空字符串（如 `"employee_id": ""`），建议在业务层保留一层空值校验。

5. **错误处理**：当 schema 过于复杂或 prompt 与 schema 矛盾时，模型可能输出不完整的 JSON（`finish_reason="length"`）。建议检查 `finish_reason` 并适当增大 `max_tokens`。

6. **与 Partial Mode 的兼容性**：
   * `kimi-k2.7-code` 在简单 schema 下与 `partial=true` 混用通常正常，但复杂 schema 仍可能破坏结构约束。
   * `kimi-k2.6` 在 `partial=true` 下更容易输出 schema 外字段，因此 **不建议** 在该模型上混用。

7. **前缀缓存（Prefix Cache）**：是否设置 `response_format` **不会破坏前缀缓存**，可以放心按请求粒度调整该参数，不影响缓存命中率。

## 常见错误

### `invalid_request_error`

Schema 格式本身不合法（例如 `json_schema.schema` 不是 object）时，API 会返回 `400`，错误类型为 `invalid_request_error`：

```json theme={null}
{
  "error": {
    "message": "Invalid request: the `response_format.json_schema.schema` field in the request (expected type dict[string,interface]) is illegal...",
    "type": "invalid_request_error"
  }
}
```

请检查 schema 是否为合法的 JSON Schema 对象。

### 输出被截断（`finish_reason="length"`）

模型在输出完整 JSON 之前达到了 `max_tokens` 限制。建议：

* 增大 `max_tokens`（例如 4096 或更高）
* 简化 schema 的嵌套层级
* 缩短输入文本长度

### 字段类型不匹配 / 输出 Markdown 代码块

在 `kimi-k2.6` 等旧模型上，可能出现以下情况：

* 返回的 `content` 包含 Markdown 代码块（如 `json ... `），导致 `json.loads` 失败。
* `oneOf` / `$ref` 等复杂 schema 未被严格遵守。

建议：

* 使用 `kimi-k2.7-code` 进行 Structured Output 调用。
* 如果必须使用 `kimi-k2.6`，在业务层先 stripping Markdown 标记，再对解析结果做 schema 字段校验。
