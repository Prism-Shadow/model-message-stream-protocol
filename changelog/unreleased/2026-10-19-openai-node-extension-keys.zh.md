# TypeScript 中 GLM 与 Kimi K2 的扩展参数送达 API

- **Date:** 2026-10-19
- **Type:** fix
- **Scope:** `zai_official`, `moonshot_official`, `tests`

[English](2026-10-19-openai-node-extension-keys.md)

## 变更内容

- TypeScript 的 `ZAIOfficialClient` 原先把 `tool_stream` 和 `thinking` 放在字面量 `extra_body` 键中，而 openai-node 会原样发送请求体。现在两者都放在请求体顶层，与 Python 客户端一致：GLM 5.3 之前的各代模型在 `ThinkingLevel.NONE` 下关闭思考，工具调用参数分片流式返回。
- TypeScript 的 `MoonshotOfficialClient` 把 Kimi K2 系列的 `thinking` 开关放到请求体顶层，`kimi-k2.6` 在 `ThinkingLevel.NONE` 下关闭思考。
- 测试：GLM 思考等级测试改为在 TypeScript 配置的顶层读取 `thinking` 与 `tool_stream`；两种语言新增思考开关参数表，覆盖 `kimi-k2.6` 与 `glm-5.2`。
