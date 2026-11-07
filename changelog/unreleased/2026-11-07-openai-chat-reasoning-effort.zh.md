# OpenAI Chat 客户端把思考等级发成 reasoning_effort

- **Date:** 2026-11-07
- **Type:** fix
- **Scope:** `openai_chat`
- **Issue:** [#321](https://github.com/Prism-Shadow/model-message-stream-protocol/issues/321)

[English](2026-11-07-openai-chat-reasoning-effort.md)

## 变更内容

- `transformUniConfigToModelConfig` / `transform_uni_config_to_model_config` 不发任何推理参数，因此 `UniConfig.thinking_level` 到不了 `openai-chat` 端点：只在被要求时才推理的模型，无论调用方设成什么等级都直接作答。
- 现在等级以 `reasoning_effort` 发出——`low` 发 `low`，`medium` 与 `high` 发 `high`，`xhigh` 发 `xhigh`，`max` 发 `max`，`none` 不发，因为默认推理的端点没有关闭开关，而等待被要求的本来已关闭。`medium` 变成 `high`，是因为该档位没有 `medium`，且不认识的取值会被整条拒收（`400 … supported values: ['none', 'low', 'high', 'xhigh', 'max']`）。
- 某个模型是否接受这个参数由端点自己回答：`_reasoningEffort` / `_reasoning_effort` 从端点的模型列表读取 `capabilities.reasoning`，每个客户端只问一次，只对回答为是的模型返回映射后的值。回答为否的模型，以及所有不提供能力信息的端点——vLLM 适配器也在其中——什么都不发，请求与原来一致。
- 这次查询是异步的，因此放在 `_streamingResponseInternal` / `_streaming_response_internal` 里配置转换之后，而不是放进转换函数本身——后者要为覆盖它的适配器保持同步。
- `tests/thinking-level-mapping` 与 `tests/test_thinking_level_mapping.py` 覆盖映射、开关判断与请求体。
