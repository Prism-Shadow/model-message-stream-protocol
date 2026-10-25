# 未发布

[English](README.md)

- [2026-10-25] 状态卡片改为以上次探测（链接到那次运行）和预计的下次探测为主，各显示本地时间并附相对时间；本月的探测费用和次数改为卡片底部的小字备注，此前各月移入它的提示框。([详情](2026-10-25-status-probe-times.zh.md))
- [2026-10-25] 注册表从 125 条增至 345 条，覆盖 penguin-harness 目录中所有在用的条目，新增 OpenCode Go、Fireworks AI、DashScope、Qwen Token Plan、Atlas Cloud、Penguin Go、ModelScope 和 vLLM 分组，另有 87 个 OpenRouter 模型、44 个 TokenDance 模型和较早的官方模型；模型索引改为按需从 `kits.json` 获取集成代码，Playground 的模型菜单由新增的 `GET /api/registry` 填充。([详情](2026-10-25-model-list.zh.md), [#302](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/302))
- [2026-10-24] RFC 重新表述为十项以名词为题的规范，从 MMSP-RFC-0001 RFC 流程到 MMSP-RFC-0010 轨迹记录，每篇都有 Abstract、编号的各节与 BCP 14 关键词；0.5.5 与第一次重编号的规则按主题并入其中，新写了完全相同的前缀与轨迹记录的规范，每个旧的 RFC 地址都跳转到现在承载其内容的规范。([详情](2026-10-24-rfc-specifications.zh.md), [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298), [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301))
- [2026-10-25] 两个包都把追踪保存为 id 加 `.json` 和 `.txt`，按 `toISOString` 的格式写入 UTC 时间戳，并在请求发出之前，用 `UnsupportedParameterError` 拒绝空的、绝对路径的，或文件会落到缓存目录之外的 trace id；查看器在解析符号链接后采用同一规则，名字需要百分号编码的追踪也能打开。([详情](2026-10-25-trace-writer.zh.md), [#300](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/300))
- [2026-10-24] 两个包的基类客户端都改为直接在方法内构建公开的流，把 `_PublicStream` / `PublicStream`、`_delta_event` / `deltaEvent` 和 `_StatefulCall` 合并进 `streaming_response` / `streamingResponse` 与有状态调用。([详情](2026-10-24-base-client-inline.zh.md), [#297](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/297))
