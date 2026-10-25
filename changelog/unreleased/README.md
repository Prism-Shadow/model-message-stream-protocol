# Unreleased

[中文版](README.zh.md)

- [2026-10-24] Restated the RFCs as ten specifications with noun titles, MMSP-RFC-0001 The RFC Process to MMSP-RFC-0010 Trace Recording, each with an Abstract, numbered sections and the BCP 14 key words; merged the rules of 0.5.5 and of the first renumbering into them by topic, specified the identical prefix and trace recording, and redirected every old RFC URL to the specification that holds its content. ([details](2026-10-24-rfc-specifications.md), [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298), [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301))
- [2026-10-24] The base client built the public stream inline in both packages, folding `_PublicStream` / `PublicStream`, `_delta_event` / `deltaEvent` and `_StatefulCall` into `streaming_response` / `streamingResponse` and the stateful call. ([details](2026-10-24-base-client-inline.md), [#297](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/297))
