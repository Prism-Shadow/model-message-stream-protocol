# MMSP-RFC-0012 把思考计为输出计价

- **Date:** 2026-11-20
- **Type:** process
- **Scope:** `design`

[English](2026-11-20-no-thinking-price-rfc.md)

## 变更内容

- 新增 `change` 类 RFC [MMSP-RFC-0012](../../design/rfcs/MMSP-RFC-0012-thinking-priced-as-output.zh.md) 思考按输出计价（中英文），并列入 `design/README.md` 的索引：`ModelPricing` 不含思考单价，一轮调用的 `thoughts_tokens` 在每一行都计为输出、按 `response_tokens` 计费，厂商为思考另列单价的行也是如此。`usage_metadata` 中的 `thoughts_tokens` 计数保留。
