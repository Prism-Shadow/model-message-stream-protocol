# 未发布

[English](README.md)

- [2026-10-24] RFC 重新表述为十项以名词为题的规范，从 MMSP-RFC-0001 RFC 流程到 MMSP-RFC-0010 轨迹记录，每篇都有 Abstract、编号的各节与 BCP 14 关键词；0.5.5 与第一次重编号的规则按主题并入其中，新写了完全相同的前缀与轨迹记录的规范，每个旧的 RFC 地址都跳转到现在承载其内容的规范。([详情](2026-10-24-rfc-specifications.zh.md), [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298), [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301))
- [2026-10-24] 两个包的基类客户端都改为直接在方法内构建公开的流，把 `_PublicStream` / `PublicStream`、`_delta_event` / `deltaEvent` 和 `_StatefulCall` 合并进 `streaming_response` / `streamingResponse` 与有状态调用。([详情](2026-10-24-base-client-inline.zh.md), [#297](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/297))
