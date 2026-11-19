# README 路由示例与 RFC 重编号记录

- **Date:** 2026-11-20
- **Type:** process
- **Scope:** `design`, `site`, `skills`, `utils`
- **PR:** [#354](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/354)

[English](2026-11-20-readme-routing-and-rfc-renumbering-record.md)

## 变更内容

- [`README.md`](../../README.md) 与 [`README.zh.md`](../../README.zh.md) 中的 OpenRouter GLM-5.3 示例传入 `client_type="zai-official"`（TypeScript 中为 `clientType`）；此前 `z-ai/glm-5.3` 的 id 不以任何已知家族开头，`AutoLLMClient` 会抛出 `RoutingError`。
- 两份 README 在可省略 `client_type` 的模型家族中补上 `jina-`，并说明其他模型 ID 必须指定 `client_type`；模型索引链接补上末尾斜杠。
- 两份 README 以及 `skills/mmsp-python/reference/models.md` 与 `skills/mmsp-typescript/reference/models.md` 的嵌入示例改用注册表所列的 SiliconFlow 嵌入模型 `Qwen/Qwen3-Embedding-8B`，替换 `Qwen/Qwen3-Embedding-0.6B`。
- [MMSP-RFC-0001](../../design/rfcs/MMSP-RFC-0001-rfc-process.zh.md) 在中英文的 Introduction 与 §5 中记录 2026-11-18 将 `MMSP-RFC-0014` 重编号为 `MMSP-RFC-0011`，[`design/README.md`](../../design/README.md)、[`design/README.zh.md`](../../design/README.zh.md) 与 `site/astro.config.mjs` 的重定向注释在 2026-10-24 的两次重编号之外一并注明此次重编号。
- `src_py/mmsp/utils.py` 与 `src_ts/src/utils.ts` 中 `prompt_cache_key` 的文档注释改为引用 `MMSP-RFC-0011`，替换 `MMSP-RFC-0014`。
