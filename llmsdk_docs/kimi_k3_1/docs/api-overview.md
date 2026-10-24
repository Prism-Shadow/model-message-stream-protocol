> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# API 概述

> 查看 Kimi API 的服务地址、认证方式、请求格式、兼容性和主要接口入口。

## 服务地址

```
https://api.moonshot.cn
```

不同兼容协议的 `base_url` 不同，见下方「协议兼容性」。

## 协议兼容性

Kimi API 兼容三种 API 格式，您可以直接复用对应的官方 SDK 和工具：

| 兼容 API | base\_url | 接口 | 可用 SDK / 工具 |
| - | - | - | - |
| OpenAI Chat Completions | `https://api.moonshot.cn/v1` | [`/chat/completions`](https://platform.kimi.com/docs/api/chat) | OpenAI 官方 SDK（Python / Node.js），以及 LangChain、Dify、Coze 等第三方工具和框架 |
| OpenAI Responses | `https://api.moonshot.cn/v1` | [`/responses`](https://platform.kimi.com/docs/api/responses) | OpenAI 官方 SDK（Python / Node.js） |
| Anthropic Messages | `https://api.moonshot.cn/anthropic` | [`/messages`](https://platform.kimi.com/docs/api/messages) | Anthropic 官方 SDK、Claude Code 等工具 |

如果您的项目原本在使用 OpenAI 或 Anthropic 的官方 API，只需将 `base_url` 和 API Key 替换为 Kimi 的配置即可迁移，无需修改其他代码。

> [!NOTE]
>
> 使用 OpenAI 兼容接口时，部分参数为 Kimi 专有扩展：`thinking` 参数需要通过 SDK 的 `extra_body` 传递；`partial` 是写在 messages 中 assistant 消息上的字段（`"partial": true`），不是顶层请求参数。详见[工具调用](https://platform.kimi.com/docs/api/tool-use)和 [Partial Mode](https://platform.kimi.com/docs/api/partial)。

## 认证

所有 API 请求需要在 HTTP 头中携带 API Key：

```
Authorization: Bearer $MOONSHOT_API_KEY
```

API Key 可在 [Kimi 开放平台控制台](https://platform.kimi.com/console/api-keys) 创建和管理。

> [!WARNING]
>
> API Key 是敏感信息，请妥善保管。不要在客户端代码、公开仓库或日志中暴露。建议通过环境变量管理。

使用官方 SDK 时，在初始化时传入 API Key 和对应协议的 `base_url`。

OpenAI 兼容接口：

```python Python theme={null}
import os

from openai import OpenAI

client = OpenAI(
    api_key=os.environ["MOONSHOT_API_KEY"],
    base_url="https://api.moonshot.cn/v1",
)
```

```javascript Node.js theme={null}
const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY,
    baseURL: "https://api.moonshot.cn/v1",
});
```

Anthropic 兼容接口：

```python Python theme={null}
import os

from anthropic import Anthropic

client = Anthropic(
    api_key=os.environ["MOONSHOT_API_KEY"],
    base_url="https://api.moonshot.cn/anthropic",
)
```

```javascript Node.js theme={null}
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({
    apiKey: process.env.MOONSHOT_API_KEY,
    baseURL: "https://api.moonshot.cn/anthropic",
});
```

## 错误处理

请求失败时返回包含 `error.type` 和 `error.message` 的 JSON 错误响应，完整的错误类型、错误消息和排障建议请参阅[错误说明](https://platform.kimi.com/docs/api/errors.md)。

## API 端点一览

| 端点 | 方法 | 协议 | 说明 |
| - | - | - | - |
| `/v1/chat/completions` | POST | OpenAI | [创建对话补全](https://platform.kimi.com/docs/api/chat.md) |
| `/v1/responses` | POST | OpenAI | [Responses API](https://platform.kimi.com/docs/api/responses.md) |
| `/anthropic/v1/messages` | POST | Anthropic | [Messages API](https://platform.kimi.com/docs/api/messages.md) |
| `/v1/models` | GET | OpenAI | [列出模型](https://platform.kimi.com/docs/api/list-models.md) |
| `/v1/tokenizers/estimate-token-count` | POST | OpenAI | [计算 Token](https://platform.kimi.com/docs/api/estimate.md) |
| `/v1/users/me/balance` | GET | OpenAI | [查询余额](https://platform.kimi.com/docs/api/balance.md) |
| `/v1/tools/search` | POST | Kimi | [联网搜索 Basic](https://platform.kimi.com/docs/api/tools-search.md) |
| `/v1/tools/search_pro` | POST | Kimi | [联网搜索 Pro](https://platform.kimi.com/docs/api/tools-search-pro.md) |
| `/v1/tools/fetch` | POST | Kimi | [网页抓取](https://platform.kimi.com/docs/api/tools-fetch.md) |
| `/v1/files` | POST | OpenAI | [上传文件](https://platform.kimi.com/docs/api/files-upload.md) |
| `/v1/files` | GET | OpenAI | [列出文件](https://platform.kimi.com/docs/api/files-list.md) |
| `/v1/files/{file_id}` | GET | OpenAI | [获取文件信息](https://platform.kimi.com/docs/api/files-retrieve.md) |
| `/v1/files/{file_id}` | DELETE | OpenAI | [删除文件](https://platform.kimi.com/docs/api/files-delete.md) |
| `/v1/files/{file_id}/content` | GET | OpenAI | [获取文件内容](https://platform.kimi.com/docs/api/files-content.md) |
| `/v1/batches` | POST | OpenAI | [创建批处理任务](https://platform.kimi.com/docs/api/batch-create.md) |
| `/v1/batches` | GET | OpenAI | [列出批处理任务](https://platform.kimi.com/docs/api/batch-list.md) |
| `/v1/batches/{batch_id}` | GET | OpenAI | [获取批处理任务详情](https://platform.kimi.com/docs/api/batch-retrieve.md) |
| `/v1/batches/{batch_id}/cancel` | POST | OpenAI | [取消批处理任务](https://platform.kimi.com/docs/api/batch-cancel.md) |

## 下一步

> **[快速开始](https://platform.kimi.com/docs/api/quickstart)**
>
> 发送第一个 API 请求

> **[Responses API](https://platform.kimi.com/docs/api/responses.md)**
>
> OpenAI Responses 兼容接口

> **[Messages API](https://platform.kimi.com/docs/api/messages.md)**
>
> Anthropic Messages 兼容接口

> **[模型列表](https://platform.kimi.com/docs/api/list-models.md)**
>
> 查看当前可用模型
