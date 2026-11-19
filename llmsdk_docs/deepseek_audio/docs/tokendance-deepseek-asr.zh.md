> Source: TokenDance catalog `https://tokendance.space/portal/api/models/deepseek-asr` and model page `https://tokendance.space/models/deepseek-asr` (read 2026-11-19). TokenDance bills ¥0.00011 per second (`items` rate; `reference` rate ¥0.00022 per second) for `deepseek-asr`.

# 使用 deepseek-asr

将 `YOUR_API_KEY` 替换为你的密钥即可调用。

## DeepSeek 语音识别 协议

```bash title="cURL"
curl https://tokendance.space/gateway/deepseek/v1/tools/asr \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@sample.wav"
```

### 模型说明

【限时折扣】DeepSeek ASR 是一款面向开发者的语音转文字 API，上传录音即可获得完整的转写文本，适合用在聊天助手的语音输入、语音留言和短录音转写等场景。它能自动识别中文、粤语、英语、日语等 21 种语言，支持 16 位 PCM WAV 和 Ogg Opus 格式，单段音频最长 120 秒、最大 8 MiB。

### 计费说明

- 协议：`deepseek:asr`（对应网关基础地址 `https://tokendance.space/gateway/deepseek`）
- 计费项：`deepseek:asr:audio_seconds`
- 实际费率（`items`）：¥0.00011 / 秒（参考原价 `reference`：¥0.00022 / 秒）
