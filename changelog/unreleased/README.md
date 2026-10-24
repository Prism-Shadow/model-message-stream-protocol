# Unreleased

[中文版](README.zh.md)

- [2026-10-24] Renumbered the rule RFCs to MMSP-RFC-0002 to MMSP-RFC-0013 in the order of the owner's twelve titles, restated each from the code at 0.5.6, added the rules on history, request parameters and interruption, and widened the typed-error rule to every error; the old RFC URLs redirect to the RFCs that hold their content. ([details](2026-10-24-rfc-renumbering.md), [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298))
- [2026-10-24] The base client built the public stream inline in both packages, folding `_PublicStream` / `PublicStream`, `_delta_event` / `deltaEvent` and `_StatefulCall` into `streaming_response` / `streamingResponse` and the stateful call. ([details](2026-10-24-base-client-inline.md), [#297](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/297))
