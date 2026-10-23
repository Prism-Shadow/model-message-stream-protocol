# Unreleased

[中文版](README.zh.md)

- [2026-10-23] The Chat Completions client recorded a gateway's encrypted reasoning block as `encrypted_content`, `format` and `reasoning_id` and rebuilt it on replay, in place of the block kept whole. ([details](2026-10-23-openai-chat-generic-fidelity.md), [#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287))
- [2026-10-23] The site's top bar became Overview, Docs, RFC, Model Index, Model Status and Changelog, and the site build gained a reader for the status probe's files. ([details](2026-10-23-site-top-bar.md), [#282](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/282))
- [2026-10-23] A token count of 0 stayed 0 in both packages instead of becoming null, and the Responses-compatible clients reported a count the server left out as null instead of 0. ([details](2026-10-23-usage-zero-counts.md), [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279))
- [2026-10-23] Made the live E2E tests retry an `IncompleteStreamError` as they retry a rate limit. ([details](2026-10-23-e2e-retry-incomplete-stream.md), [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280))
