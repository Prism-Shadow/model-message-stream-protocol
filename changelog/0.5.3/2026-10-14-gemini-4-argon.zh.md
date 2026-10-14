# 支持 Gemini 4 Argon

- **Date:** 2026-10-14
- **Type:** feature
- **Scope:** `google_official`, `google_genai`, `registry`, `tests`, `llmsdk_docs`

[English](2026-10-14-gemini-4-argon.md)

## 变更内容

- Python 与 TypeScript 注册表新增 `gemini-4-argon`，支持文本、图片、视频和音频输入，
  文本输出，以及共享的 1,048,576-token 上下文窗口。
- `google-official` 与 `google-genai` 为 Argon 将 `NONE` 映射到 `low`，保留 `LOW`、
  `MEDIUM` 和 `HIGH`，并将 `XHIGH`/`MAX` 映射到 `high`。未指定思考档位时保留 API
  默认的 `medium`。
- `gemini-4-argon` 替换了两个客户端在共享测试中 Gemini API 分组的 `gemini-3.8-flash`
  条目，保留了已有 Vertex AI 条目。
- `llmsdk_docs/gemini4/` 保存了官方模型、Interactions API、思考、函数调用、流式事件、
  定价与长输出文档快照。

## 注册表元数据

记录的标准原价为每百万 tokens：输入 4 美元、输出及思考 20 美元、缓存读取 0.20 美元。
截至 2026-11-30 的优惠价（2、10、0.10 美元）按注册表的原价约定不计入。

## 输出限制

同步流式输出最多 65,536 tokens，包含思考。更长输出需要 Google 的存储式后台执行，
不在 MMSP 的无状态流式接口范围内。Argon 仅支持隐式缓存。
