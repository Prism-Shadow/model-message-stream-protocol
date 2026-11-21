# MMSP-RFC-0002 规定 CI 只测各厂商最新一代中最小的模型

- **Date:** 2026-11-21
- **Type:** process
- **Scope:** `design`, `skills`
- **PR:** [#__PR__](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/__PR__)

[English](2026-11-21-ci-smallest-model-rfc.md)

## 变更内容

- [MMSP-RFC-0002](../../design/rfcs/MMSP-RFC-0002-message-protocol.zh.md) 消息协议在原文上修改（中英文），并在引言中写入这一案例。§7 规定 `.github/ci/models.json` 中每个官方客户端在厂商自有端点上只有一个文本模型，即厂商最新一代中最小的模型，不收录同代更大的档位。厂商提供的其他每种模态保留各自的用例，Amazon Bedrock 保留 CI key 唯一能访问的那个 Claude 模型，兼容客户端、网关与 `slow` 用例不受此规则约束。
- `mmsp-dev` skill：第 4 阶段改写为同一条清单规则，不再是每个模型族只留最新版本。
