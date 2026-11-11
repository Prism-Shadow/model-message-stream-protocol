# Hy4 与 ERNIE 5.5 Flash Preview 加入注册表

- **Date:** 2026-11-11
- **Type:** feature
- **Scope:** `registry`, `site`
- **PR:** pending

[English](2026-11-11-hy4-ernie-registry.md)

## 变更内容

- 两个包的注册表新增 OpenRouter 与 TokenDance 上的腾讯 `hy4`，以及 TokenDance 上的百度 `ernie-5.5-flash-preview`（从 344 条增至 347 条）。
- 模型索引把 ERNIE 归到百度名下，使用 lobe-icons 的文心图标。`/models/` 从 1,176,575 字节增至 1,187,556 字节（gzip 后从 55,841 增至 56,697），`/models.json` 从 114,407 增至 115,414（6,865 增至 6,921）。

## 注册表元数据

| 模型 | Base URL | 客户端 | 输入 | 上下文 | 每百万 tokens 价格 |
| --- | --- | --- | --- | --- | --- |
| `tencent/hy4` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image | 1,048,576 | 输入 $0.834，缓存 $0.042，输出 $2.501 |
| `hy4` | `https://tokendance.space/gateway/v1` | `openai-responses` | Text, Image | 1,024,000 | 输入 ¥3，缓存 ¥0.15，输出 ¥9 |
| `ernie-5.5-flash-preview` | `https://tokendance.space/gateway/v1` | `openai-chat` | Text | 1,000,000 | 输入 ¥0.5，缓存 ¥0.05，输出 ¥2 |

OpenRouter 对 `tencent/hy4` 按半价报价（$0.417、$0.021、$1.2505），注册表记录未打折的价格。TokenDance 在北京时间 08:00 至 22:00 按 ¥1、¥0.1、¥4 计费 `ernie-5.5-flash-preview`，注册表记录这段时间以外的价格。
