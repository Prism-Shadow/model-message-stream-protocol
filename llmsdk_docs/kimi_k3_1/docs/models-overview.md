> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 模型参数参考

> 对比 Kimi 各模型系列在 Chat Completions API 中的默认参数、可调范围与使用约束。

## 参数对比

<table>
  <thead>
    <tr />
  </thead>

  <tbody />
</table>

> [!NOTE]
>
> 当 `temperature` 接近 0 时，`n` 只能为 1，否则将返回 `invalid_request_error`。

## 模型参数配置差异

切换模型时，除了替换 `model` 字段，还需要注意各模型对请求参数的支持范围和默认值不同：

`kimi-k3.1-pro` 和 `kimi-k3.1-pro-highspeed` 的参数约束也与 `kimi-k3` 完全一致。下表中 `kimi-k3` 一列，以及下文针对 `kimi-k3` 的参数配置和迁移说明，均适用于这两个模型。

| 参数 | `kimi-k3` | `kimi-k2.7-code` | `kimi-k2.6` |
| - | - | - | - |
| 上下文窗口 | 1M tokens | 256K tokens | 256K tokens |
| `thinking` | — | 可省略；显式设置时仅接受 `{"type":"enabled","keep":"all"}` | `{"type":"enabled"}`（默认）、`{"type":"disabled"}`、`{"type":"enabled","keep":"all"}` |
| `reasoning_effort` | `"low"` / `"high"` / `"max"`（默认 `"max"`） | 不支持 | 不支持 |
| `tool_choice` | `auto` / `none` / `required` | 不支持 `required` | 不支持 `required` |
| `temperature` | 固定 `1.0` | 固定 `1.0` | 思考 `1.0` / 非思考 `0.6` |
| `top_p` | 固定 `0.95` | 固定 `0.95` | 固定 `0.95` |
| `n` | 固定 `1` | 固定 `1` | 固定 `1` |
| `presence_penalty` / `frequency_penalty` | 固定 `0` | 固定 `0` | 固定 `0` |

> [!NOTE]
>
> 表中"固定"表示该参数不可修改：传入其他值会报错，建议不要显式传入。

### `thinking`

`thinking` 是 K2.x 专属请求参数：

* `kimi-k2.6`：支持 `{"type": "enabled"}`（默认）、`{"type": "disabled"}`、`{"type": "enabled", "keep": "all"}` 三种配置。
* `kimi-k2.7-code`：思考默认开启，仅支持 `{"type": "enabled", "keep": "all"}`，传入其他配置会报错。从 `kimi-k2.6` 切换时，需要按 Preserved Thinking 的要求在 `messages` 中回传历史 `reasoning_content`。

详见[使用思考模式](https://platform.kimi.com/docs/guide/use-thinking-models.md)。

### `reasoning_effort`

K3 始终进行推理思考且保留式思考（Preserved Thinking）始终开启。通过请求顶层 `reasoning_effort` 配置推理强度，支持 `"low"` / `"high"` / `"max"` 三档，默认 `"max"`。详见[推理强度](https://platform.kimi.com/docs/guide/use-reasoning-effort.md)。

> [!WARNING]
>
> 切换档位会破坏前缀缓存命中，建议在会话开始前确定 `effort` 档位，避免中途切换。

### `tool_choice`

`kimi-k3` 支持 `auto` / `none` / `required` 三档；`kimi-k2.6` 与 `kimi-k2.7-code` 不支持 `required`，传入会报错。详见[工具调用约束](https://platform.kimi.com/docs/guide/use-tool-choice.md)。

### `temperature`

* `kimi-k2.6`：思考模式固定 `1.0`，非思考模式固定 `0.6`，传入其他值报错；
* `kimi-k2.7-code`：固定 `1.0`，传入其他值报错。
* `kimi-k3`：固定 `1.0`，传入其他值报错。

建议调用以上模型时不要显式传入 `temperature`。

`kimi-k2.7-code-highspeed` 与 `kimi-k2.7-code` 为同一模型、参数约束完全一致，仅输出速度不同。

### 常见问题

**从 `kimi-k2.6` 切换到 `kimi-k3`，需要改代码吗？**

将 `model` 替换为 `kimi-k3`，并移除 K2.x 的 `thinking` 配置；如需显式设置推理强度，使用顶层 `reasoning_effort`。K3 的多轮对话和工具调用需要把 API 返回的完整 assistant message 原样回传到 `messages`，包括可能返回的 `reasoning_content`。

**从 `kimi-k2.7-code` 切换到 `kimi-k3`，需要改代码吗？**

替换 `model` 即可，并继续原样回传完整 assistant message；如需显式设置推理强度，使用顶层 `reasoning_effort`。

**原来代码里用的是 OpenAI 的 `reasoning_effort`，切到 `kimi-k3` 需要改吗？**

不需要。K3 支持顶层 `reasoning_effort`，可选值为 `"low"` / `"high"` / `"max"`，默认 `"max"`。

**`tool_choice: "required"` 在 `kimi-k2.6` / `kimi-k2.7-code` 上能用吗？**

不能。这两个模型不支持 `required`，传入会报错；`kimi-k3.1-pro`、`kimi-k3.1-pro-highspeed` 和 `kimi-k3` 支持该档位。

## Kimi K2.7 Code 系列 — thinking 参数

`kimi-k2.7-code` 系列包含 `kimi-k2.7-code` 及其高速版 `kimi-k2.7-code-highspeed`，二者为同一模型、参数约束完全一致（含上方表格与 `thinking` 行为），仅输出速度不同，下文统称 `kimi-k2.7-code`。

`kimi-k2.7-code` 面向代码场景，除 `thinking` 外的参数约束与 `kimi-k2.6` 完全一致。与 `kimi-k2.6` 不同的是，它 **始终开启思考、不可禁用**（传入 `{"type": "disabled"}` 会报错），且 **Preserved Thinking 始终开启**（`thinking.keep` 不传或传 `"all"` 都按 `"all"` 处理，传入其他非法值会报错）。因此调用时无需传入 `thinking` 参数，只需切换 `model` 即可，模型始终输出 `reasoning_content`。详细用法见[使用思考模式](https://platform.kimi.com/docs/guide/use-thinking-models.md)。

## Kimi K2.6 — thinking 参数

Kimi K2.6 支持通过 `thinking` 参数控制是否启用深度思考。接受 `{"type": "enabled"}` 或 `{"type": "disabled"}`。

由于 OpenAI SDK 没有原生的 `thinking` 参数，需要使用 `extra_body` 传递：

```python Python theme={null}
completion = client.chat.completions.create(
    model="kimi-k2.6",
    messages=[
        {"role": "user", "content": "你好"}
    ],
    extra_body={
        "thinking": {"type": "disabled"}
    },
    max_tokens=1024*32,
)
```

```bash cURL theme={null}
curl https://api.moonshot.cn/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MOONSHOT_API_KEY" \
  -d '{
    "model": "kimi-k2.6",
    "messages": [
      {"role": "user", "content": "你好"}
    ],
    "thinking": {"type": "disabled"}
  }'
```
