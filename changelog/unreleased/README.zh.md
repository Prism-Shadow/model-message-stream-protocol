# Unreleased

[English](README.md)

- [2026-10-09] Gemini 官方客户端改名为 `google-official`（别名 `gemini-official`），与其他官方客户端一样以厂商命名；类名改为 `GoogleOfficialClient`。([详情](2026-10-09-google-official.zh.md))
- [2026-10-02] 新增 MMSP 服务端，通过 HTTP 把一张表里的模型提供为 MMSP 流（`python -m mmsp.integration.server --config FILE`、`npm run server -- --config FILE`）；Playground 的 `/server/` 页面把表保存到配置文件，据此启动服务端并画出其最近 60 天的指标；新增调用它的 `mmsp` 客户端；服务端报告的错误以新增的 `UpstreamError` 抛出。([详情](2026-10-02-mmsp-server.zh.md), [#247](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/247))
