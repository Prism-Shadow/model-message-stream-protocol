# MMSP-RFC-0002、0003 与 0009 把工具调用的参数保留为 JSON 文本

- **Date:** 2026-11-17
- **Type:** process
- **Scope:** `design`
- **PR:** [#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339)

[English](2026-11-17-tool-call-arguments-text-rfc.md)

## 变更内容

- [MMSP-RFC-0002](../../design/rfcs/MMSP-RFC-0002-message-protocol.zh.md) 消息协议在原文上修改（中英文），并在引言中写入这一案例。§3.4 规定 `tool_call` 内容项的 `arguments` 是字符串，即模型写出的调用参数 JSON 文本；线路接收字符串时回放原样发送它，只有线路要求对象时才解析。
- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) 消息请求在原文上修改（中英文），并在引言中写入这一案例。§4.3 规定 `StreamItems` 在拼接后的文本能解析为 JSON 对象时保留这段文本（片段拼接为空时为 `{}`），不再保留解析后的对象；§3.3 规定 `arguments` 不是对象 JSON 文本的工具调用在请求之前抛出 `InvalidMessageError`。
- [MMSP-RFC-0009](../../design/rfcs/MMSP-RFC-0009-protocol-conversion.zh.md) 协议转换在原文上修改（中英文），并在引言中写入这一案例。§7 规定 0.5.8 及更早版本以对象记录的工具调用 `arguments` 读取到 0.6.0 为止，由 `normalize_legacy_messages` 转换为它的 JSON 文本。
