# MMSP-RFC-0010 Trace Recording

- Feature Name: `trace_recording`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#307](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/307)
- Kind: spec

[中文版](MMSP-RFC-0010-trace-recording.zh.md)

## Abstract

When `UniConfig` carries a **`trace_id`**, MMSP records the conversation—request messages, assistant reply, and config—as **two files** (`<trace_id>.json` and `<trace_id>.txt`) under the **cache directory** right before yielding **`stop`**. This spec defines save timing, `trace_id` path checks, trace contents, file formats, and the tracer viewer.

## 1. Introduction

- **Core motivation** (`写一下 trace 的逻辑`): One uniform trace format across models lets callers spot bad tool args or runaway thoughts in seconds and lets harnesses inspect runs to iterate on prompts, tools, or code.
- **Tracer history**:
  - **Initial & TS port**: [#17](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/17) added `trace_id` and post-turn stateful saves; [#34](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/34) and [#38](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/38) ported writer and viewer to TypeScript; [#96](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/96) added `created_at` and viewer rounds.
  - **Pre-`stop` save** ([#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223)): Moved saving into `streaming_response` before yielding `stop` so callers stopping on `stop` always find the trace.
  - **Unification & path safety** ([#300](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/300)): Unified file naming, timestamps, and cache-directory containment across Python and TypeScript.
- **2026-11-02 — Decoupled from prompt cache** ([#307](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/307), [MMSP-RFC-0014](MMSP-RFC-0014-prompt-cache-sessions.md)): `session_id` replaced `trace_id` as the prompt cache key (`moonshot-official` stopped sending `trace_id` as `prompt_cache_key` on Kimi K2), so `trace_id` never reaches a provider.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Trace id**: The `UniConfig.trace_id` string, a relative path under the cache directory separated by `/`.
- **Cache directory**: `MMSP_CACHE_DIR` (or `cache` relative to cwd when unset), read each time `streaming_response` handles a `trace_id`.
- **Tracer**: `Tracer` in `mmsp.integration.tracer` / `integration/tracer`, which writes traces and serves the viewer.

## 3. When a Trace Is Saved

- **Right before `stop`**: When config carries a `trace_id`, `streaming_response` / `streamingResponse` MUST save the trace after items close and `stop` is built, immediately before yielding `stop`, and MUST NOT save at any other point.
- **No save on error or early close**: Saves nothing if `streaming_response` raises before `stop` (provider error, `IncompleteStreamError`, `EmptyResponseError`, `StreamProtocolError`, or abort error per [MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.md#3-interrupting-a-stream) §3) or if the generator closes early.
- **Stateful calls**: Save via `streaming_response`, capturing the full conversation so far.
- **`mmsp` client**: Forwards `trace_id` in `config` so the server's upstream client saves under the server's cache directory; the `mmsp` client MUST NOT save locally.
- **Never sent upstream**: Provider clients never send `trace_id`; prompt cache keys come from `session_id` ([MMSP-RFC-0014](MMSP-RFC-0014-prompt-cache-sessions.md)).

## 4. Trace Ids

- **Subpath normalization**: `/` creates subdirectories under the cache directory; valid ids normalize via `path.resolve` (`agent/../kept` -> `kept.json`), and an empty `trace_id` saves nothing.
- **Containment check**: Before sending a request, `streaming_response` MUST reject any `trace_id` resolving outside the cache directory or to the directory itself (absolute paths, escaping `..`, `.`, `agent/..`), raising `UnsupportedParameterError` for `trace_id` ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#31-before-the-request) §3.1):
  `<client> does not support trace_id '<id>': it must be a relative path that stays inside the cache directory.`
- **`mmsp` server relay**: The server's upstream client checks `trace_id` against the server's cache directory; failures return `UpstreamError` with `error_type` (`errorType`) `UnsupportedParameterError` ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#4-relay-through-the-server) §4).

## 5. What a Trace Contains

- **History**: Request messages (legacy types converted and `created_at` stamped per [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#63-created_at) §6.3) plus the completed assistant message (complete items, `usage_metadata`, `finish_reason`, and the `stop` event's `created_at`).
- **Config & timestamp**: The given config with `model` (client model id) added and `trace_id` kept, plus the save time.
- **No transient state**: The assistant message MUST NOT carry `fidelity.item_id` (stripped by `StreamItems` per [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) §5). Holds no deltas or incomplete turns (§3).
- **No secrets**: Client keys, base URLs, and headers are constructor args; callers SHOULD NOT put secrets in `UniConfig`.

## 6. Files and Format

- **Full overwrite**: Each save MUST rewrite `<trace_id>.json` and `<trace_id>.txt` whole under the cache directory (appending suffixes to the normalized id, e.g., `run.v2.json` / `run.v2.txt`, creating missing directories) so one `trace_id` holds the latest conversation state.

| File | Format & Contents |
| --- | --- |
| `<trace_id>.json` | UTF-8 JSON `{"history": [...], "config": {...}, "timestamp": "..."}` with unescaped CJK, base64 `bytes` (`inline_data.done` / `inline_thinking.done` `data`), and UTC ISO 8601 `timestamp` with ms and `Z` (`toISOString()`, e.g., `2026-10-24T09:30:00.000Z`). |
| `<trace_id>.txt` | Reader transcript: config (without `trace_id`) then numbered messages (role, items, usage, finish reason). Programs SHOULD read `.json`; transcript layout is unspecified. |

## 7. Reading Traces

- **Viewer**: `create_web_app` / `createWebApp` (or `start_web_server` / `startWebServer`, default port `25750`) lists the cache directory, renders `.json` traces by round, and shows other files as plain text.
- **Legacy conversion**: Converts pre-0.5.0 item types on load ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#7-one-shape-per-input) §7).
- **Path & symlink guard**: MUST refuse (`403`) and omit from listings any path that, with symlinks resolved, is neither the cache directory nor inside it.
- **Playground**: Serves `/tracer/` on its cache directory, including traces from its in-process MMSP server.

## 8. Conformance

- **Code**: `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`, `src_py/mmsp/integration/tracer.py` / `src_ts/src/integration/tracer.ts`, and `src_py/mmsp/mmsp/client.py` / `src_ts/src/mmsp/client.ts`.
- **Tests**: `src_py/tests/test_tracer.py` / `src_ts/tests/tracer.test.ts` (pre-`stop` disk write, no `item_id`, file overwrite + mkdir, pre-0.5.0 normalization, dotted suffixes, UTC `Z` timestamp, path rejection, viewer `403` with symlinks), `src_py/tests/test_stream_protocol.py` / `src_ts/tests/stream-protocol.test.ts` (pre-request `UnsupportedParameterError`), and `src_py/tests/test_interruption.py` / `src_ts/tests/interruption.test.ts` (no save on abort/close before `stop`).
- **Docs**: `site/src/docs/tracing.en.md` / `tracing.zh.md`, Traces in `server.en.md` / `server.zh.md`, and `trace_id` in `configuration.en.md` / `configuration.zh.md`.
