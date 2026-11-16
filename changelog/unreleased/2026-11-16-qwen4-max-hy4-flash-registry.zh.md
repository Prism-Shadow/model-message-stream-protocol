# Qwen4 Max、Hy4 Flash、Gemini 4 Hydrogen、Ling 3.2 Flash 与 Seedream 5.5 加入注册表

- **Date:** 2026-11-16
- **Type:** feature
- **Scope:** `registry`, `site`
- **PR:** [#TBD](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/TBD)

[English](2026-11-16-qwen4-max-hy4-flash-registry.md)

## 变更内容

- 两个包的注册表新增阿里巴巴的 Qwen4 Max，即 OpenRouter 上的 `qwen/qwen4-max`，以及 TokenDance、DashScope 与 Qwen Token Plan 上的 `qwen4-max`；另新增 OpenRouter 上腾讯的 `tencent/hy4-flash`、Google 的 `google/gemini-4-hydrogen`、inclusionAI 的 `inclusionai/ling-3.2-flash:free` 和 ByteDance Seed 的 `bytedance-seed/seedream-5-5`（从 353 条增至 361 条）。

## 注册表元数据

| 模型 | Base URL | 客户端 | 模态 | 上下文 | 每百万 tokens 价格 |
| --- | --- | --- | --- | --- | --- |
| `google/gemini-4-hydrogen` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image → Text | 1,048,576 | 输入 $1.5，缓存 $0.075，输出 $7.5 |
| `inclusionai/ling-3.2-flash:free` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image → Text | 1,048,576 | 输入 $0，输出 $0 |
| `qwen/qwen4-max` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image → Text | 1,000,000 | 输入 $1.5，缓存 $0.075，输出 $4.5 |
| `tencent/hy4-flash` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image → Text | 1,048,576 | 输入 $0.07，缓存 $0.003，输出 $0.281 |
| `bytedance-seed/seedream-5-5` | `https://openrouter.ai/api/v1` | `openai-image` | Text → Image | — | 输入 $0，输出 $4.790419 |
| `qwen4-max` | `https://tokendance.space/gateway/v1` | `openai-responses` | Text, Image → Text | 1,000,000 | 输入 ¥10，缓存 ¥0.5，输出 ¥30 |
| `qwen4-max` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `openai-chat` | Text, Image → Text | 1,000,000 | 输入 ¥10，缓存 ¥0.5，输出 ¥30 |
| `qwen4-max` | `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` | `openai-chat` | Text, Image → Text | 1,000,000 | 输入 ¥10，缓存 ¥0.5，输出 ¥30 |

OpenRouter 对 `tencent/hy4-flash` 按半价报价（$0.035、$0.0015、$0.1405），注册表记录未打折的价格。`bytedance-seed/seedream-5-5` 每张图片 $0.02（高分辨率版本 $0.035），注册表记录的是 models API 给出的 `image_output` 单价，1K 图片（4,096 个 token）约合 $0.02，2K 图片（16,384 个）约合其四倍。OpenRouter（$1.875）与千问模型页（5 分钟 ¥12.5，1 小时 ¥20）为 Qwen4 Max 标出的缓存写入价格未记录。
