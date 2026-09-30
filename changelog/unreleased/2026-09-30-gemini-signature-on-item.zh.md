# Gemini 把没有摘要的思考签名放在它所签的内容项上

- **Date:** 2026-09-30
- **Type:** fix
- **Scope:** `gemini_official`
- **Breaking:** no

[English](2026-09-30-gemini-signature-on-item.md)

## 变更内容

- 不要思考摘要时，Interactions API 的每个回复都以一个只含签名的 thought 步骤开头。`gemini-official` 以前把它流式输出为一个 `thinking` 为空的 `thinking.done`。现在签名放进下一个步骤开启的文本、图片或工具调用的 `fidelity`，与 `gemini-generate-content` 的记录方式一致。
- 带摘要的 thought 步骤照旧把签名留在自己的思考项上。
- 含旧式空思考项的历史照常回放。

## 兼容性

- 从空 `thinking.done` 读取签名的代码，改从下一个内容项的 `fidelity` 读取。原样回传 `fidelity` 的代码无需改动。
