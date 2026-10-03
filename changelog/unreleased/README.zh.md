# Unreleased

[English](README.md)

- [2026-10-02] 新增 MMSP 服务端，通过 HTTP 提供其环境能访问的所有模型（`python -m mmsp.integration.server`、`npm run server`），并新增调用它的 `mmsp` 客户端；不属于 MMSP 错误的错误以新增的 `UpstreamError` 抛出。([详情](2026-10-02-mmsp-server.zh.md), [#247](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/247))
