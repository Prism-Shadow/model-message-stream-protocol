# 两个包的追踪文件名、时间戳与路径检查统一

- **Date:** 2026-10-25
- **Type:** fix
- **Scope:** `tracer`, `base_client`
- **Breaking:** yes — 部分 trace id 的保存文件名会改变，或在请求前就抛出 `UnsupportedParameterError`

[English](2026-10-25-trace-writer.md)

## 变更内容

- `trace_id`：两个包都把 `.json` 和 `.txt` 直接接在原样的 trace id 后面。Python 原先用 `Path.with_suffix`，会替换掉点号后面的部分，所以 `v1.2` 保存成了 `v1.json`；以 `..` 结尾的 id 则会在流跑完之后抛出裸 `ValueError`。id 按 `path.resolve` 的方式规范化：`agent/../kept` 保存为 `kept.json`，`agent/run/..` 保存为 `agent.json`，`trailing/` 保存为 `trailing.json`，TypeScript 原先保存成 `trailing/.json`。
- JSON 中的 `timestamp`：Python 改为写入带毫秒和 `Z` 的 UTC ISO 8601，与 `new Date().toISOString()` 的格式一致，不再写不带时区的本地时间。两个查看器都把这两种时间按本地时间显示。
- `Tracer.resolve_trace_path` / `Tracer.resolveTracePath` 拒绝绝对路径的 trace id，以及解析符号链接后 `.json` 或 `.txt` 文件会落在缓存目录之外的 id：跳出目录的 `..`、指向外部的符号链接、空 id，以及指向目录本身的 id，例如 `.` 或 `agent/..`。拒绝时抛出 `UnsupportedParameterError(client, "trace_id", "<client> does not support trace_id '<id>': it must be a relative path that stays inside the cache directory.")`。`save_history` / `saveHistory` 通过它保存，client 为 `Tracer`。TypeScript 原先把 `/agent/conv` 这类绝对路径的 id 保存在缓存目录下，Python 则直接写到它指向的位置。
- 设置了 `config.trace_id` 时，`streaming_response` / `streamingResponse` 在请求发出之前调用它，被拒绝的 id 会带着客户端的名字抛出，不消耗 token。MMSP 服务端会把调用方的 `trace_id` 转给上游客户端，因此被拒绝的 id 在任何上游请求之前，就以 `UnsupportedParameterError` 事件返回给调用方。
- tracer 查看器按写入端的同一规则，对解析符号链接后既不是缓存目录、也不在其中的路径返回 403，目录列表也不再列出符号链接指向外部的条目。原先的字符串前缀检查会经由 `/../cache2/...` 把 `cache2/` 这类同名前缀的兄弟目录也提供出去，TypeScript 也不解析符号链接。
- 查看器对链接逐段做百分号编码，TypeScript 查看器会解码请求路径，因此名字带空格、`#`、`%` 或中日韩文字的追踪都能从链接打开。TypeScript 原先对这些一律返回 404。
- `MMSP_CACHE_DIR` 为空，或 Python 中 `cache_dir` 为空时，两个包都使用默认的工作目录下的 `cache`。Python 原先直接使用工作目录本身。

## 兼容性

- 绝对路径、空串、`.`，或者会跳出缓存目录的 trace id，现在会在发出请求前抛出 `UnsupportedParameterError`。请改用 `agent/conv` 这样的相对 id（TypeScript 原先会把 `/agent/conv` 存进缓存目录里）。
- Python 中带点号的 trace id 现在按完整 id 保存，`v1.2` 保存为 `v1.2.json`，原先是 `v1.json`。已有的追踪文件需要改名，才能按它的 id 读到。
- TypeScript 中以斜杠结尾的 trace id 现在保存为 `trailing.json`，原先是 `trailing/.json`。
- 查看器不再提供那些经符号链接后指向缓存目录之外的路径。
