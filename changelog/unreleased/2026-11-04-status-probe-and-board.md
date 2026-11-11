# The status probe retries a length-cut thinking-only answer, watches four more channels, and the board's day card can be entered

- **Date:** 2026-11-04
- **Type:** process
- **Scope:** `status`, `site`
- **PR:** [#315](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/315)

[中文版](2026-11-04-status-probe-and-board.zh.md)

## What changed

- `probe.py`: an answer that was all thinking and stopped at `max_tokens` (`EmptyResponseError` with finish reason `length`) no longer failed its sample. The sample was asked once more with twice the `max_tokens`, and that second answer decided it. Its usage was the sum of both answers, and `retried` in the run file kept the first answer's error. This is what turned TokenDance `deepseek-v4.1-flash` degraded on 2026-11-03: one of its three answers spent all 2,048 tokens thinking. A thinking-only answer that stopped for any other reason still failed.
- `targets.json`: four channels joined the three probed daily: TokenDance `glm-5.3-flash` (`zai-official`), `qwen3.8-flash` and `mimo-v2.6-flash` (`openai-responses`), and Bedrock `global.anthropic.claude-sonnet-4-6` (`anthropic-official`). Each TokenDance channel answered a live probe on 2026-11-04. The test host has no Bedrock key; that channel is the one the CI catalog already runs. Scheduled runs start from `main`, so the new channels and the retry apply once `dev` reaches `main`.
- `/status/`: a day's card took the pointer. It stayed open while the pointer crossed from a bar into it, so its date, figures and error could be selected and copied, and closed 200 ms after the pointer left both. Clicking into it no longer closed it. The card showed the whole error (at most 200 characters) instead of three lines.
- `/status/`: the strips ended on the newest day a run had probed: today once today's run landed, yesterday until then. A day no run probed at all still got its grey bar once it was over. Before this change, today's grey bar showed from midnight UTC until the 04:30 run.
- `/status/`: ‹ was grey when no day was left before the window. It used to stay enabled until the branch's files had been read, and a click did nothing.
