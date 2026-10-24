# MMSP-RFC-0010 支持全部思考等级

- Feature Name: `thinking_levels_usable`
- Start Date: 2026-10-24
- RFC PR: [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)
- Kind: rule

[English](MMSP-RFC-0010-thinking-levels-usable.md)

## Summary
[summary]: #summary

没有客户端会拒绝某个 `ThinkingLevel`：无论什么模型，都没有客户端为 `thinking_level` 抛出 `UnsupportedParameterError`。每个官方客户端按一张固定的表，把每个级别映射到该模型这一代的某个设置上，不发出警告：
- 模型有这个级别时，就用这个级别本身；
- 模型没有时，用模型接受的另一个级别：Claude 4.6 以 `high` 运行 `xhigh`，Gemini 以 `high` 运行 `xhigh` 和 `max`；
- 对于 `none`，模型有自己的关闭开关时就用它，例如 Claude Sonnet 5 上的 `disabled`，GPT-6 Luna 和 Kimi K3 系列上的 `none`；
- 对于没有关闭开关的模型上的 `none`，用它允许的最少思考：Claude Opus 5.5 上的最低 effort，Claude Sonnet 5.5 上的 `between_tools`，Gemini 上的 `minimal` 或 `low`。

## Motivation
[motivation]: #motivation

调用方只设一次 `ThinkingLevel`，换模型只换名字。如果客户端因为模型缺少某个级别而抛出异常，调用方就又得按模型分支，而这正是 MMSP 要消除的。这条规则的来历：
- [#166](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/166) 按每个 Gemini 模型限制了级别；
- [#176](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/176) 按厂商映射了 `max`；
- [#293](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/293) 补上了一个缺口：原先 `none` 什么也不发送，Claude Opus 5 仍然在思考；
- [#294](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/294) 让 `none` 在 Kimi K3 系列上关闭思考。

项目负责人的规则是「支持全部思考等级」：每个级别在每个客户端上都能用。这条规则最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0006。

## Rule
[rule]: #rule

- 经由兼容客户端时，由端点决定某个级别实际如何运行；模型无法接受客户端发送的值时，端点可能拒绝请求：
  - `ant-messages` 对 `none` 发送 `disabled`；
  - `openai-responses` 把级别作为它的 effort 发送，在 Luna 以外的 GPT-6 上把 `none` 发成 `low`（[MMSP-RFC-0011](MMSP-RFC-0011-explicit-parameters.zh.md)）；
  - `openai-chat` 不发送级别，由端点按它的默认值运行；
  - 它的 vLLM 适配器只发送聊天模板的思考开关；
  - `mmsp` 客户端把级别转发给它的服务端。
- 每个客户端、每一代模型的映射写在网站的配置页 [`site/src/docs/configuration.zh.md`](../../site/src/docs/configuration.zh.md) 上，表中的每一行在两个包的映射测试中都有对应的用例（[MMSP-RFC-0011](MMSP-RFC-0011-explicit-parameters.zh.md)）。

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/<client>/client.py` / `src_ts/src/<client>/client.ts` 中各客户端的配置转换。
- `src_py/tests/test_thinking_level_mapping.py`、`src_ts/tests/thinking-level-mapping.test.ts`。
- `errors.py` / `errors.ts` 中 `UnsupportedParameterError` 的文档字符串。
- `site/src/docs/configuration.en.md` / `configuration.zh.md`。
