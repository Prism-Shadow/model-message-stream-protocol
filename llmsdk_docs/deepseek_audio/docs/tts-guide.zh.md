> Source: https://api-docs.deepseek.com/zh-cn/guides/tts.md (snapshot 2026-11-16)

# 语音合成

把文字转换为自然语音，例如朗读 Chatbot 的回答。

| 方式 | 请求                                              | 输入                | 输出          |
| -- | ----------------------------------------------- | ----------------- | ----------- |
| 整段 | `POST https://api.deepseek.com/v1/tools/tts`    | JSON 请求体中的完整文本    | 在响应体中流式返回音频 |
| 流式 | WebSocket `wss://api.deepseek.com/v1/tools/tts` | 分段发送的文本，例如模型仍在生成时 | 音频帧         |

***

## 音色

| `voice_id` | 音色       |
| ---------- | -------- |
| `stella`   | 海星，女声，默认 |
| `tide`     | 暗潮，男声    |

***

## 语种

普通话（`zh`）、粤语（`yue`）、英语（`en`）、日语（`ja`）、韩语（`ko`）、马来语（`ms`）、阿拉伯语（`ar`）、印尼语（`id`）、泰语（`th`）、越南语（`vi`）。

没有语种参数，语种根据文本自动识别。

***

## 整段合成

以 JSON 发送文本：

| 字段                | 是否必填 | 说明                                                    |
| ----------------- | ---- | ----------------------------------------------------- |
| `text`            | 是    | 要朗读的文本，不能为空，最多 10,000 个 [计费字符](#billing)。请求体最大 64 KiB |
| `voice_id`        | 否    | `stella`（默认）或 `tide`                                  |
| `format`          | 否    | `wav`（默认）或 `pcm`                                      |
| `filter_markdown` | 否    | 朗读前是否去掉 Markdown 格式，默认为 `true`                        |

```bash
curl https://api.deepseek.com/v1/tools/tts \
  -H "Authorization: Bearer <DeepSeek API Key>" \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，我是 DeepSeek。", "voice_id": "stella"}' \
  --output speech.wav
```

音频边合成边返回，单次请求最多返回 30 分钟的音频。`wav` 返回 `audio/wav`；`pcm` 返回 24 kHz、16 位、单声道的原始 PCM。

| 状态码   | 原因                                         |
| ----- | ------------------------------------------ |
| `400` | 没有可朗读的文本，或文本未通过内容审核（`Content Exists Risk`） |
| `429` | 账号同时进行的请求数超过上限                             |
| `503` | 服务繁忙，请稍后重试                                 |
| `504` | 合成超时                                       |

如果音频已经开始返回后合成失败，响应会中途断开，请把提前结束的响应视为失败。

不支持调节语速，也不支持中断后续传。

***

## WebSocket 流式合成

1. 连接 `wss://api.deepseek.com/v1/tools/tts`，可选查询参数：`voice_id`、`format`（默认 `pcm`，也可以是 `opus`）、`filter_markdown`。`opus` 返回不带容器的 Opus 数据包，不能直接保存为 Ogg 文件。
2. 鉴权有两种方式：带上请求头 `Authorization: Bearer <API Key>`；或者通过 WebSocket 子协议传入，即 `Sec-WebSocket-Protocol: tts, bearer.<API Key>`。
3. 以 JSON 文本消息发送文字：`{"event": "text", "text": "..."}`，最后一段之后发送 `{"event": "finish_text"}`。
4. 音频通过二进制消息下发。会话以文本消息 `{"event": "finish", "code": "...", "message": "..."}` 结束，`code` 为 `success` 或错误码，例如 `invalid_input`、`content_filter`、`input_timeout`、`service_error`。

限制：60 秒内没有收到文字时会话结束；单次会话最长 30 分钟；单次会话的文字最多 10,000 个计费字符、64 KiB。服务端每 25 秒发送一次 WebSocket ping。

Python 示例，使用 `websockets` 包：

```python
# Set DEEPSEEK_API_KEY to your API key before running this example.
# Requires the websockets package, version 14 or later.
import asyncio
import json
import os

import websockets


async def main():
    url = "wss://api.deepseek.com/v1/tools/tts?voice_id=stella&format=pcm"
    headers = {"Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}"}
    async with websockets.connect(url, additional_headers=headers) as ws:
        for chunk in ["Hello ", "from ", "DeepSeek."]:
            await ws.send(json.dumps({"event": "text", "text": chunk}))
        await ws.send(json.dumps({"event": "finish_text"}))

        with open("speech.pcm", "wb") as f:
            async for message in ws:
                if isinstance(message, bytes):
                    f.write(message)  # raw 16-bit signed mono PCM at 24 kHz
                    continue
                finish = json.loads(message)
                if finish["code"] != "success":
                    raise RuntimeError(f"{finish['code']}: {finish['message']}")
                break


asyncio.run(main())
```

***

<a id="billing"></a>

## 计费

| 计费单位        | 刊例价 | 限时折扣价（5 折） |
| ----------- | --- | ---------- |
| 每 10,000 字符 | 3 元 | 1.5 元      |

汉字算 2 个字符，英文字母、数字、空格等其他字符算 1 个。

***

<a id="rate-limits"></a>

## 限速

每个账号最多同时进行 50 个请求，超过返回 `429`。
