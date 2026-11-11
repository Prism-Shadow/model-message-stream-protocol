# 规范中的客户端插件

- **Date:** 2026-11-11
- **Type:** process
- **Scope:** `design`
- **PR:** pending

[English](2026-11-11-client-plugins-rfcs.md)

## 变更内容

- [MMSP-RFC-0009](../../design/rfcs/MMSP-RFC-0009-protocol-conversion.zh.md) 协议转换在原文上修改，在 §2 和新增的 §9 规定了插件（Conformance 改为 §10）。兼容客户端在转换方法中像其参考客户端那样讲它的协议，不在那里按 base URL 分支，也不按自己协议的标记之外的模型 id 分支；某一个端点或某一家厂商的模型在协议之外需要的处理写成插件。插件是 `ClientPlugin` 的子类，单独放在客户端 `plugins/` 文件夹下的一个文件里，列在该文件夹的 `PLUGINS` 中，声明 `hosts`（每个主机匹配它本身及其子域名）和/或 `models`（在模型 id 中不区分大小写查找的正则表达式）。它声明的每一项都匹配时才启用，客户端在构造函数中一次构建这个列表。调用方既不能增加插件，也不能关闭插件。客户端在配置与消息转换之后调用 `on_request`，在事件转换之前调用 `on_wire_event`，在它之后调用 `on_event`，每个钩子都就地修改它的参数。插件把端点的线上格式改成转换方法读取的形状并反向改回，可以在客户端的生命周期内保留它从端点读到的信息，并经客户端的 SDK 对象发出自己的请求。
- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) 消息请求：§6.1 把兼容客户端的转换方法限定为只读取自己协议的标记，并写明由 `openai-chat` 与 `openai-responses` 的 `gpt` 插件处理 GPT-6 的 `none` 以及 GPT-5.6 与 GPT-6 的图片 `detail`。§6.3 规定 `openai-chat` 在 Mistral 的端点上经其 `mistral` 插件发送 `reasoning_effort`，只对 Mistral 模型列表标明会推理的模型发送：`low` 发 `low`，`medium` 与 `high` 发 `high`，`xhigh` 与 `max` 原样发送，`none` 不发送。
- [MMSP-RFC-0004](../../design/rfcs/MMSP-RFC-0004-message-fidelity.zh.md) 消息保真：§4 增加了 Mistral 的端点两个推理字段都拒绝，它把 Chat Completions 回合的思考作为思考块放在内容之前发回，文本为空时不发送任何字段。
- `AGENTS.md` 和 mmsp-dev skill 写明了插件规则。
