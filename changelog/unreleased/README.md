# Unreleased

[中文版](README.zh.md)

- [2026-10-02] An MMSP server streams every model its environment reaches over HTTP (`python -m mmsp.integration.server`, `npm run server`), and the `mmsp` client calls it; an error that is not an MMSP error comes back as the new `UpstreamError`. ([details](2026-10-02-mmsp-server.md), [#247](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/247))
