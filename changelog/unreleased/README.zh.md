# 未发布

[English](README.md)

- [2026-10-25] 两个包都把追踪保存为 id 加 `.json` 和 `.txt`，按 `toISOString` 的格式写入 UTC 时间戳，并在请求发出之前，用 `UnsupportedParameterError` 拒绝空的、绝对路径的，或文件会落到缓存目录之外的 trace id；查看器在解析符号链接后采用同一规则，名字需要百分号编码的追踪也能打开。([详情](2026-10-25-trace-writer.zh.md))
- [2026-10-24] 规则 RFC 按项目负责人十二个标题的顺序重编号为 MMSP-RFC-0002 至 MMSP-RFC-0013，每篇都按 0.5.6 的代码重新表述，新增关于历史消息、模型请求参数与中断请求的规则，并把异常类型的规则扩展到所有异常；旧的 RFC 地址跳转到现在承载其内容的 RFC。([详情](2026-10-24-rfc-renumbering.zh.md), [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298))
- [2026-10-24] 两个包的基类客户端都改为直接在方法内构建公开的流，把 `_PublicStream` / `PublicStream`、`_delta_event` / `deltaEvent` 和 `_StatefulCall` 合并进 `streaming_response` / `streamingResponse` 与有状态调用。([详情](2026-10-24-base-client-inline.zh.md), [#297](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/297))
