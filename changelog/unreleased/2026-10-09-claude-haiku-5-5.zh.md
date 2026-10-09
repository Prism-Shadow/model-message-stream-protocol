# 支持 Claude Haiku 5.5

- **Date:** 2026-10-09
- **Type:** feature
- **Scope:** `anthropic_official`, `registry`

[English](2026-10-09-claude-haiku-5-5.md)

## 变更内容

- `anthropic-official` 支持 `claude-haiku-5-5`，在各平台按版本匹配，包括带 `anthropic.` 前缀的 Bedrock id：
  - `thinking_level="none"` 发送 `low` 档位的自适应思考，与 Opus 5.5 和 Fable 5.1 相同；其余档位发送同名的思考档位。
  - `tool_choice="required"` 和工具名列表抛出 `UnsupportedParameterError`，与 Opus 5.5 和 Sonnet 5.5 相同。
  - `fast_mode` 抛出 `UnsupportedParameterError`。
- `list_supported_models` 列出 `claude-haiku-5-5`，每百万 token 输入 0.10 美元、输出 0.50 美元，缓存读取 0.01 美元，这是提示不超过 100K token 时的价格（超过后每项价格均为 5 倍）；OpenRouter 上的 `anthropic/claude-haiku-5.5` 价格相同。`claude-sonnet-5-5` 和 `anthropic/claude-sonnet-5.5` 的缓存读取降到 0.10 美元。
- 端到端测试新增 `claude-haiku-5-5`。
- `llmsdk_docs/claude5_5/` 新增 Haiku 5.5 的页面和 Anthropic 的价格页面。站点和 skill 列出了新模型。
