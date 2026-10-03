# Unreleased

[English](README.md)

- [2026-10-02] 新增 MMSP 服务端，通过 HTTP 把一张表里的模型提供为 MMSP 流（`python -m mmsp.integration.server --config FILE`、`npm run server -- --config FILE`）；Playground 的 `/server/` 页面把表保存到配置文件，据此启动服务端并画出其指标随时间的变化；新增调用它的 `mmsp` 客户端；服务端报告的错误以新增的 `UpstreamError` 抛出。([详情](2026-10-02-mmsp-server.zh.md), [#247](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/247))
