# One trace file name, timestamp and path check in both packages

- **Date:** 2026-10-25
- **Type:** fix
- **Scope:** `tracer`, `base_client`

[中文版](2026-10-25-trace-writer.zh.md)

## What changed

- `trace_id`: both packages appended `.json` and `.txt` to the trace id as given. Python had replaced what followed a dot through `Path.with_suffix`, so `v1.2` had saved `v1.json`, and an id ending in `..` had raised a bare `ValueError` after the stream ran. The id was normalized as `path.resolve` normalizes it: `agent/../kept` saved `kept.json`, `agent/run/..` saved `agent.json`, and `trailing/` saved `trailing.json`, where TypeScript had saved `trailing/.json`.
- The JSON `timestamp`: Python wrote UTC ISO 8601 with milliseconds and a `Z`, the format of `new Date().toISOString()`, in place of naive local time. Both viewers showed either in local time.
- `Tracer.resolve_trace_path` / `Tracer.resolveTracePath` refused a trace id that is absolute, or whose `.json` or `.txt` file, symlinks resolved, would be outside the cache directory: a `..` that escapes, a symlink that leads outside, an empty id, and an id that names the directory itself such as `.` or `agent/..`. It raised `UnsupportedParameterError(client, "trace_id", "<client> does not support trace_id '<id>': it must be a relative path that stays inside the cache directory.")`. `save_history` / `saveHistory` saved through it, with `Tracer` as the client. TypeScript had saved an absolute id such as `/agent/conv` under the cache directory, and Python had written it where it pointed.
- `streaming_response` / `streamingResponse` called it when `config.trace_id` is set, before the request, so a refused id raised with the client's name and spent no tokens. The MMSP server forwards a caller's `trace_id` to its upstream client, so a refused id reached the caller as an `UnsupportedParameterError` event before any upstream request.
- The tracer viewer answered 403 for any path that, symlinks resolved, is neither the cache directory nor inside it, by the writer's rule, and left entries whose symlinks lead outside out of its listings. Its string-prefix check had served a sibling such as `cache2/` through `/../cache2/...`, and TypeScript had not resolved symlinks.
- The viewer percent-encoded each segment of its links, and the TypeScript viewer decoded the request path, so traces named with a space, a `#`, a `%` or CJK opened from their links. TypeScript had answered 404 for each.
- An empty `MMSP_CACHE_DIR`, or an empty `cache_dir` in Python, meant the default `cache` under the working directory in both packages. Python had used the working directory itself.
