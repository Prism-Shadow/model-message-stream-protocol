# Unreleased

[中文版](README.zh.md)

- [2026-10-02] An MMSP server serves the models of a table over HTTP as MMSP streams (`python -m mmsp.integration.server --config FILE`, `npm run server -- --config FILE`); the playground's `/server/` page saves a table to a config file, starts one from it and draws its metrics over time, and the `mmsp` client calls it; an error the server reports comes back as the new `UpstreamError`. ([details](2026-10-02-mmsp-server.md), [#247](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/247))
