> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 常见错误码说明

> 查询 Kimi API 的 HTTP 状态码、错误类型、常见原因和对应的排查处理方法。

当请求失败时，API 会返回包含错误信息的 JSON 响应：

```json theme={null}
{
    "error": {
        "type": "content_filter",
        "message": "The request was rejected because it was considered high risk"
    }
}
```

## 错误列表

## 400 — 请求错误

| error type | 典型 message | 原因与处理 |
| - | - | - |
| `content_filter` | The request was rejected because it was considered high risk | 输入或模型输出触发内容安全审查。请修改提示词，避免敏感/高风险内容。 |
| `invalid_request_error` | 请求格式错误、缺少必填参数或参数类型非法。对照接口文档检查请求体。 | |
| `invalid_request_error` | Input token length too long | 输入 Token 数达到或超过模型上下文窗口。缩短输入或换用更大上下文模型。 |
| `invalid_request_error` | Invalid purpose: xxx, only \`file-extract\`, \`batch\`, \`batch\_output\`, \`lambda\`, \`image\` and \`video\` accepted | 文件上传的 purpose 字段不合法，需为上述取值之一。 |
| `invalid_request_error` | File size is too large, max file size is 100MB, please confirm and re-upload the file | 上传文件超过 100MB 限制。压缩或拆分后重新上传。 |
| `invalid_request_error` | File size is zero, please confirm and re-upload the file | 上传文件大小为 0。检查文件是否损坏或为空。 |
| `invalid_request_error` | 上传文件总数超过上限。删除不再使用的早期文件后重试。 | |

## 401 — 认证错误

| error type | 典型 message | 原因与处理 |
| - | - | - |
| `invalid_authentication_error` | Invalid Authentication | API Key 无效或格式错误。请检查 `Authorization: Bearer &lt;key&gt;`。 |
| `incorrect_api_key_error` | Incorrect API key provided | 未提供 API Key 或 Key 错误。 |

**平台 Key 隔离说明**：`platform.kimi.com`（中国站）与 `platform.kimi.ai`（国际站）的账户、余额和 API Key 完全独立，混用会返回 401。请确认调用端点与 Key 所属平台一致。

## 403 — 权限错误

| error type | 典型 message | 原因与处理 |
| - | - | - |
| `permission_denied_error` | The API you are accessing is not open | 该 API 暂未对当前账号开放。 |
| `permission_denied_error` | You are not allowed to get other user info | 不允许访问其他用户信息。请检查接口权限范围。 |
| `permission_denied_error` | Your IP is not allowed to access this organization | 调用 IP 不在组织白名单内（国际站常见）。联系管理员添加 IP。 |

## 404 — 资源不存在

| error type | 典型 message | 原因与处理 |
| - | - | - |
| `resource_not_found_error` | 模型不存在，或当前账号无权限访问该模型。检查 model 参数拼写及账号 tier。 | |

## 429 — 速率限制 / 额度不足

| error type | 典型 message | 原因与处理 |
| - | - | - |
| `engine_overloaded_error` | The engine is currently overloaded, please try again later | 服务节点负载较高（如高峰期容量压力）。按照 `Retry-After` 提示等待、降低并发并使用指数退避重试；该错误由服务端容量导致，充值或提升 Tier 不能直接消除。 |
| `exceeded_current_quota_error` | 账户欠费或已停用。检查余额与账单。 | |
| `exceeded_current_quota_error` | 账户 token 额度不足。充值后再试。 | |
| `rate_limit_reached_error` | 触发组织级并发限制。降低并发或等待指定时间后重试。 | |
| `rate_limit_reached_error` | 触发组织级 RPM（每分钟请求数）限制。按响应提示等待后重试。 | |
| `rate_limit_reached_error` | 触发组织级 TPM（每分钟 token 数）限制。降低调用频率或升级 tier。 | |
| `rate_limit_reached_error` | 触发组织级 TPD（每日 token 数）限制。次日恢复或升级套餐。 | |

## 499 / 500 / 503 / 504 — 连接与服务端错误

| HTTP | error type | 原因与处理 |
| - | - | - |
| 499 | `client_closed_request` | 客户端在服务端返回前断开连接。常见于流式响应被中间代理切断或用户主动取消。检查 KeepAlive 与超时设置。 |
| 500 | `server_error` / `unexpected_output` | 服务端内部错误。请稍后重试；若持续出现，请附带 `request_id` 联系支持。 |
| 503 | `server_unavailable` | 服务暂时不可用。稍后重试，通常与节点扩容/维护有关。 |
| 504 | `504 Gateway Time-out` | 服务端 900 秒无响应，网关返回 HTML 超时页面。常见于非流式长请求，建议改用流式输出（`stream: true`）。 |

## 排障建议

* **收到 401**：先确认是否使用了正确平台的 API Key
* **收到 429**：先根据 `error.type` 区分原因：节点过载请退避重试，组织限速可降低并发或升级用户等级，余额不足请充值，详见 [充值与限速](https://platform.kimi.com/docs/pricing/limits.md)
* **收到 500**：请稍后重试，如持续出现请附带 `request_id` 联系支持团队 [api-service@moonshot.ai](mailto:api-service@moonshot.ai)
* **收到 504**：服务端 900 秒无响应导致网关超时，建议改用流式输出（`stream: true`）
