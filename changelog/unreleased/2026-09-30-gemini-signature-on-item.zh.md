# Gemini 把思考签名记录在它所签的内容项上

- **Date:** 2026-09-30
- **Type:** fix
- **Scope:** `gemini_official`, `stream_items`
- **Breaking:** no

[English](2026-09-30-gemini-signature-on-item.md)

## 变更内容

- Interactions API 中 thought 步骤的签名签的是它后面的那个步骤。`gemini-official` 现在把签名记录在该步骤的文本、图片或工具调用的 `fidelity` 里，与 `gemini-generate-content` 一致。以前签名放在思考项上。不要思考摘要时（默认如此），每个回复都会多出一个 `thinking` 为空、只含签名的 `thinking.done`。
- 思考摘要现在是一个不带签名的 `thinking.done`，后面跟着带签名的内容项。
- 回放时，紧跟在无签名 thought 后面的带签名内容项会把签名交给那个 thought 步骤，请求与 API 流出的一致。本次改动之前记录的历史照常回放。
- 流组装：在内容项之前单独发出的 fidelity 现在会等待该项的内容。同类内容照旧跟在它后面发出；不同类的内容在第一个 delta 上携带它；该 id 下没有内容时，照旧以携带它的那一类单独成项。其他客户端流出的内容项不变。

## 兼容性

- 从 `thinking.done` 读取 Gemini 签名的代码，改从下一个内容项的 `fidelity` 读取。原样回传 `fidelity` 的代码无需改动。
