# 未发布

[English](README.md)

- [2026-10-25] 注册表从 125 条增至 345 条，覆盖 penguin-harness 目录中所有在用的条目，新增 OpenCode Go、Fireworks AI、DashScope、Qwen Token Plan、Atlas Cloud、Penguin Go、ModelScope 和 vLLM 分组，另有 87 个 OpenRouter 模型、44 个 TokenDance 模型和较早的官方模型；模型索引改为按需从 `kits.json` 获取集成代码，Playground 的模型菜单由新增的 `GET /api/registry` 填充。([详情](2026-10-25-model-list.zh.md), [#302](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/302))
- [2026-10-24] 规则 RFC 按项目负责人十二个标题的顺序重编号为 MMSP-RFC-0002 至 MMSP-RFC-0013，每篇都按 0.5.6 的代码重新表述，新增关于历史消息、模型请求参数与中断请求的规则，并把异常类型的规则扩展到所有异常；旧的 RFC 地址跳转到现在承载其内容的 RFC。([详情](2026-10-24-rfc-renumbering.zh.md), [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298))
- [2026-10-24] 两个包的基类客户端都改为直接在方法内构建公开的流，把 `_PublicStream` / `PublicStream`、`_delta_event` / `deltaEvent` 和 `_StatefulCall` 合并进 `streaming_response` / `streamingResponse` 与有状态调用。([详情](2026-10-24-base-client-inline.zh.md), [#297](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/297))
