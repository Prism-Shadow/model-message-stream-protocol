# 聊天切换模型后开始新对话；server 页面可测试模型行、开放时提示、启动前确认

- **Date:** 2026-10-10
- **Type:** feature
- **Scope:** `integration`
- **PR:** [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)

[English](2026-10-10-playground-server-ux.md)

## 变更内容

- 聊天页面：向另一个条目（模型 id、client type 或 base URL）发送消息时开始新对话：页面清空会话（`/api/clear`），画出分隔线"New conversation with <model> · the messages above are not sent"，按 Enter 前输入框提示已说明。只改 key 或额外 header 时对话继续；`/api/chat` 重建客户端时保留该会话的历史，不再悄悄清空。
- server 页面 Models：展开的行上的 Test 和 Test all 通过 `POST /server/api/test`（`{"model": row}`，按页面上的内容，`$VAR` 从 Playground 的环境读取）把一条短提示直接发给上游，显示 Passed 及首个 token、总耗时、输出 token 数和 TPS，或 Failed 及上游的错误信息；一次最多三行，每行 60 秒。
- server 页面：运行中的服务端没有 key 时，页面顶部显示横幅，说明能访问其 URL 的任何人都可以使用这些模型，并提供 Add a key。
- server 页面：Start 和 Apply 先弹出对话框，列出监听 URL、模型数和已保存文件中的 key（没有 key 时附开放服务端警告）；Enter 或按钮确认，Escape 取消；对话框打开时 Ctrl/Cmd+S 无效。
