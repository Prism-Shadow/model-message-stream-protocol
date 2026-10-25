# MMSP-RFC-0010 Trace Recording

- Feature Name: `trace_recording`
- Start Date: 2026-10-24
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: spec

[中文版](MMSP-RFC-0010-trace-recording.zh.md)

## Abstract

A trace is the record MMSP writes of a conversation when a request's `UniConfig` carries a `trace_id`: the messages sent, the assistant message that answered them and the config, written as two files under the cache directory before the `stop` event is yielded. This document specifies when a trace is saved, which trace ids are accepted, what a trace contains, the files and their format, and how the tracer's viewer reads them.

## 1. Introduction

The owner asked for this specification in these words: 写一下 trace 的逻辑. A caller that can read every turn as it happened finds a wrong tool argument or a runaway thought in seconds rather than reconstructing it from logs, and a harness that reviews its own traces can change its prompts, tools or code and run again. The trace is one record in one format for every model, so it is specified with the protocol rather than left to each client.

[#17](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/17) added `trace_id` and the tracer, which saved the history after a stateful turn; [#34](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/34) and [#38](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/38) brought the writer and the viewer to TypeScript; [#96](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/96) added `created_at` and the viewer's rounds; [#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223) moved the save into `streaming_response`, before the `stop` is yielded, so that a caller who stops reading at the `stop` still finds the trace. The two writers differed in how they named the files, in the timestamp, and in where a trace id could reach; [#300](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/300) made them one and has `streaming_response` refuse an id outside the cache directory.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- *Trace id*: the `trace_id` string of a request's `UniConfig`, a path relative to the cache directory in which `/` separates directories.
- *Cache directory*: the directory the environment variable `MMSP_CACHE_DIR` names, or `cache` without it, relative to the working directory, read each time `streaming_response` handles a trace id.
- *Tracer*: the `Tracer` class of `mmsp.integration.tracer` / `integration/tracer`, which writes the trace files and serves the viewer.

## 3. When a Trace Is Saved

- `streaming_response` / `streamingResponse` MUST save the trace when the config carries a `trace_id`, after the stream's items are closed and its `stop` is built and immediately before the `stop` is yielded, so the trace is on disk when the caller sees the `stop`. It MUST NOT save it at any other point.
- A `streaming_response` that raises before it yields its `stop`, whether with a provider's error, `IncompleteStreamError`, `EmptyResponseError`, `StreamProtocolError` or the abort error ([MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.md#3-interrupting-a-stream) §3), saves no trace, and neither does one whose generator is closed before its `stop`.
- A stateful call saves through `streaming_response`, so its trace is the whole conversation so far.
- Through the `mmsp` client the `trace_id` travels in the config: the server's upstream client saves the trace under the server's cache directory, and the `mmsp` client MUST NOT save one.
- `moonshot-official` also sends the trace id as `prompt_cache_key` on the Kimi K2 generation. No other provider client sends it to its provider.

## 4. Trace Ids

- A trace id names files under the cache directory; a `/` in it makes subdirectories.
- `streaming_response` MUST reject a trace id whose files would resolve outside the cache directory, such as an absolute path, an id whose `..` segments leave the directory, or an id that names the directory itself (`.`, `agent/..`), before the request goes out. It raises `UnsupportedParameterError` naming `trace_id` ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#31-before-the-request) §3.1), whose message reads `<client> does not support trace_id '<id>': it must be a relative path that stays inside the cache directory.` An id whose files resolve inside the cache directory is normalized as `path.resolve` normalizes a path, so `agent/../kept` writes `kept.json`; an empty `trace_id` saves no trace.
- Through the `mmsp` client the server's upstream client checks the id against the server's cache directory, and the caller gets an `UpstreamError` whose `error_type` (`errorType`) is `UnsupportedParameterError` ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#4-relay-through-the-server) §4).

## 5. What a Trace Contains

- The history: the request's messages, with legacy item types converted and `created_at` stamped ([MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#63-created_at) §6.3), followed by the assistant message built from the stream, with its complete items, its `usage_metadata` and `finish_reason`, and the `created_at` of the `stop` event.
- The config as given, with `model` added, the model id of the client that saved it; `trace_id` stays in it.
- The time of the save.
- The assistant message MUST NOT carry `fidelity.item_id`, which `StreamItems` strips before an item goes out ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) §5). A trace holds no delta and no turn that did not complete (§3).
- A client's key, base URL and headers are constructor arguments, not `UniConfig` keys, so they never reach a trace. A caller SHOULD NOT put a secret into the config, because the trace keeps the config.

## 6. Files and Format

- A save writes `<trace_id>.json` and `<trace_id>.txt` under the cache directory, each suffix appended to the normalized id, so `run.v2` writes `run.v2.json` and `run.v2.txt`. Missing directories are created. Each save MUST rewrite both files whole: a later save under the same id replaces the earlier one, so one trace id holds one conversation at its latest state.
- `<trace_id>.json` is `{"history": [...], "config": {...}, "timestamp": "..."}`, written as UTF-8 with CJK text unescaped and with every bytes value, such as the `data` of an `inline_data.done` or `inline_thinking.done` item, as base64 text. `timestamp` is the time of the save in UTC, in ISO 8601 with milliseconds and a trailing `Z`, the form of JavaScript's `toISOString()`: `2026-10-24T09:30:00.000Z`.
- `<trace_id>.txt` is a transcript for a reader: the config without `trace_id`, then each message numbered, with its role, its items, its usage and its finish reason. A program SHOULD read the `.json`; the layout of the transcript is not specified.

## 7. Reading Traces

- The tracer's viewer (`create_web_app` / `createWebApp`, or `start_web_server` / `startWebServer` on port 25750 by default) lists the cache directory, renders a `.json` trace round by round, and shows any other file as plain text.
- It converts the item types of trace files written before 0.5.0 when it loads them ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#7-one-shape-per-input) §7).
- It MUST refuse, with 403, a requested path that, with symlinks resolved, is neither the cache directory nor inside it, by the same check the writer uses, and it MUST leave such entries out of its listings.
- The playground serves the viewer at `/tracer/` on its cache directory; an MMSP server the playground starts runs in the playground's process, so its traces appear there too.

## 8. Conformance

- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`, which save the trace before the `stop`; `src_py/mmsp/integration/tracer.py` / `src_ts/src/integration/tracer.ts`, the writer and the viewer; `src_py/mmsp/mmsp/client.py` / `src_ts/src/mmsp/client.ts`, which save nothing.
- `src_py/tests/test_tracer.py` / `src_ts/tests/tracer.test.ts`: a traced response is on disk before its stop event reaches the caller; its fidelity is saved without `item_id`; both files are written, a later save overwrites them and their directories are created; trace files saved before 0.5.0 render with the current item types; file names append the suffix to the normalized id; the timestamp is UTC with milliseconds and a `Z`; ids that leave the cache directory are refused; and the viewer refuses, with 403, a path outside the cache directory, symlinks included.
- `src_py/tests/test_stream_protocol.py` / `src_ts/tests/stream-protocol.test.ts`, which check that a refused trace id raises `UnsupportedParameterError` before the client's request.
- `src_py/tests/test_interruption.py` / `src_ts/tests/interruption.test.ts`, which stream with a `trace_id` and check that a stream aborted, closed or left before its `stop` saves nothing.
- `site/src/docs/tracing.en.md` / `tracing.zh.md`; the Traces section of `server.en.md` / `server.zh.md`; the `trace_id` table of `configuration.en.md` / `configuration.zh.md`.
