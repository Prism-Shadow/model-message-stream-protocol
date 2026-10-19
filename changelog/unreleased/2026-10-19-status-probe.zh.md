# 每日模型状态探测

- **Date:** 2026-10-19
- **Type:** process
- **Scope:** `.github`

[English](2026-10-19-status-probe.md)

## 变更内容

- `status.yml` 每天 04:30 UTC 运行 `.github/status/probe.py`，也可手动触发并只探测部分目标，结果提交到 `status-data` 分支，首次运行时创建该分支。
- `targets.json` 以注册表三元组加密钥变量名列出探测通道：DeepSeek API 上的 `deepseek-flash`，Vertex AI 上的 `gemini-3.8-flash`。
- `probe.py` 通过 `AutoLLMClient` 对每个目标流式请求三次，记录状态（`up`、`degraded`、`down`、`nokey`）、TTFT 与 TPS 的中位数、累计用量，以及按注册表美元标价计算的费用。错误信息记为一行，其中的密钥被遮盖。
- 每次运行写出 `latest.json`、保留 90 天的 `history.json`、由当月各次运行重新汇总的 `monthly.json`，以及每天一个、收录当天全部运行的 `runs/YYYY-MM-DD.json`。
- `plan.py` 对探测相关的改动只运行离线检查，`pytest.yml` 用 Python 包的 ruff 配置检查 `.github/status`。
