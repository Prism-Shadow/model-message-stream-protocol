# MMSP-RFC-0006 每个思考级别在每个客户端上都可用

- Feature Name: `thinking_levels_usable`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[English](MMSP-RFC-0006-thinking-levels-usable.md)

## Summary
[summary]: #summary

没有客户端会拒绝某个 `ThinkingLevel`：无论什么模型，都没有客户端为 `thinking_level` 抛出 `UnsupportedParameterError`。模型没有与某个级别完全对应的设置时，它的官方客户端改为发送模型接受的设置，不发出警告：Kimi K3 无法关闭思考，因此以 `low` 运行 `none`；Gemini 以 `high` 运行 `xhigh` 和 `max`。

## Motivation
[motivation]: #motivation

调用方只设一次 `ThinkingLevel`，换模型只换名字；如果客户端因为模型缺少某个级别而抛出异常，调用方就又得按模型分支，而这正是 MMSP 要消除的。[#166](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/166) 把各级别限制在每个 Gemini 模型接受的范围内，[#176](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/176) 按厂商映射了 `max` 级别；本 RFC 陈述的是项目负责人定下的规则：任何客户端都不能因为思考级别而抛出异常。在此之前，这条规则能否成立，只取决于每个新客户端的作者有没有读到 mmsp-dev skill 里对的那一条。

## Rule
[rule]: #rule

- 经由兼容客户端时，由端点决定某个级别实际如何运行；模型无法接受客户端发送的值时，端点可能拒绝请求。`mmsp` 客户端把级别转发给它的服务端。

## Enforced by
[enforced-by]: #enforced-by

各客户端的 `_convert_thinking_level*` 方法；`src_py/tests/test_thinking_level_mapping.py`、`src_ts/tests/thinking-level-mapping.test.ts`；`errors.py` / `errors.ts` 中 `UnsupportedParameterError` 的文档字符串。
