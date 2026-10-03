# Unreleased

[中文版](README.zh.md)

- [2026-10-02] An MMSP server serves the models of a table over HTTP as MMSP streams (`python -m mmsp.integration.server --config FILE`, `npm run server -- --config FILE`), and the `mmsp` client calls it; an error that is not an MMSP error comes back as the new `UpstreamError`. ([details](2026-10-02-mmsp-server.md), [#247](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/247))
