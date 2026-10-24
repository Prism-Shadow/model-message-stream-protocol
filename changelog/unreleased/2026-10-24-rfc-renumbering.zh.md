# 规则 RFC 按项目负责人的顺序重编号并重新表述

- **Date:** 2026-10-24
- **Type:** process
- **Scope:** `design`, `site`, `skills`, `docs`

[English](2026-10-24-rfc-renumbering.md)

## 变更内容

- 规则 RFC 按项目负责人十二个标题的顺序改为 MMSP-RFC-0002 至 MMSP-RFC-0013，这些标题也成了各篇中文版的 H1，依次是：消息协议须统一，请求须异步流式，消息结构保持精简，重要字段不能丢弃，客户端路由须显式，保护密钥安全，历史消息不改变，异常要有类型，支持全部思考等级，模型请求参数不模糊匹配，允许中断请求，实现代码须直观。[MMSP-RFC-0001](../../design/rfcs/MMSP-RFC-0001-rfc-process.zh.md) 仍是 RFC 流程，新增一张从 0.5.5 编号到新编号的对照表。
- 0.5.5 各条规则的内容按主题移入对应的 RFC：流语法仍在 MMSP-RFC-0003；路由移入 MMSP-RFC-0006，客户端内部按显式版本区分则移入 MMSP-RFC-0011；凭据范围移入 MMSP-RFC-0007；思考等级移入 MMSP-RFC-0010；有类型的拒绝移入 MMSP-RFC-0009；最小化回传移入 MMSP-RFC-0004，其中 `tool_call_id` 与无签名的思考移入 MMSP-RFC-0005；两个包遵守同一份契约并入 MMSP-RFC-0002；stop 元数据、`IncompleteStreamError` 与思考的往返转换并入 MMSP-RFC-0005；直白的转换移入 MMSP-RFC-0013，其中「不带冗余」移入 MMSP-RFC-0004。原 MMSP-RFC-0009 与 MMSP-RFC-0011 的文件已删除。
- 按 0.5.6 的代码新写了四条规则：MMSP-RFC-0008 来自 [#291](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/291) 的历史深拷贝；MMSP-RFC-0009 从被拒绝的值扩展到所有异常，来自 [#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288) 与 [#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290)；MMSP-RFC-0011 以 [#289](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/289) 的配置页为对照表；MMSP-RFC-0012 来自 [#292](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/292) 的中断处理。
- 每条规则都按 0.5.6 的代码重新表述，下面这些说法按代码做了改正：embedding 来自不支持流式的端点；`google-genai` 在一个回合的第一个调用没有任何签名时，给它放上占位的思考签名；`ant-messages` 以 `{type: "tool", name}` 强制调用某个工具；Claude Fable 5 以最低的 effort 运行 `none`；Kimi K3 原样接受 `none`（[#294](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/294)）；网关的加密推理块记录为 `encrypted_content`、`format` 与 `reasoning_id`（[#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287)）；没有拿到任何密钥的客户端也会抛出 `ApiKeyRequiredError`（[#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288)）；中止错误是 MMSP 在 `integration/` 之外唯一抛出的内置错误；调用方在两次读取之间忙于别的事时中止 Python 的 `mmsp` 客户端，它在调用方下一次读取时关闭请求；早先版本在内容项内部记录、读取到 0.6.0 为止的形状，是以 bytes 保存的思考签名、不带通道的推理内容项和 0.5.5 的网关推理块，而等于函数名的工具调用 id 仍由 `google-genai` 记录。`Enforced by` 一节只写文件，不写私有类。
- `design/README.md` 与 `design/README.zh.md` 的索引改用新编号，并记下这次重编号。`AGENTS.md` 与 `mmsp-dev` skill 按内容改引新编号，并加入关于历史消息（MMSP-RFC-0008）与中断请求（MMSP-RFC-0012）的规则。0.5.5 各条目中的 RFC 链接改指现在承载其内容的 RFC，编号有变的加注「现为 MMSP-RFC-NNNN」。`site/astro.config.mjs` 把每个旧 RFC 地址（`/docs/` 与 `/rfcs/` 下，两种语言）跳转到现在承载其内容的 RFC。
