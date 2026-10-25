# Unreleased

[中文版](README.zh.md)

- [2026-10-25] Both packages saved a trace as its id plus `.json` and `.txt`, wrote the timestamp in UTC as `toISOString` does, and refused, before the request, an empty or absolute trace id or one whose files would resolve outside the cache directory with `UnsupportedParameterError`; the viewer applied the same rule, symlinks resolved, and opened traces whose names need percent-encoding. ([details](2026-10-25-trace-writer.md), [#300](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/300))
- [2026-10-24] Renumbered the rule RFCs to MMSP-RFC-0002 to MMSP-RFC-0013 in the order of the owner's twelve titles, restated each from the code at 0.5.6, added the rules on history, request parameters and interruption, and widened the typed-error rule to every error; the old RFC URLs redirect to the RFCs that hold their content. ([details](2026-10-24-rfc-renumbering.md), [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298))
- [2026-10-24] The base client built the public stream inline in both packages, folding `_PublicStream` / `PublicStream`, `_delta_event` / `deltaEvent` and `_StatefulCall` into `streaming_response` / `streamingResponse` and the stateful call. ([details](2026-10-24-base-client-inline.md), [#297](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/297))
