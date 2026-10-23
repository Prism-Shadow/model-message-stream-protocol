# 模型监测页：一张总览卡片、可用率标注、逐日卡片，数据在构建时写入页面

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `site`, `.github`
- **PR:** [#283](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/283)

[English](2026-10-23-site-status-page.md)

## 变更内容

- `/status/` 顶部改为一张带边框的卡片，内含总体状态、「N 前检测」链接、**立即检测一次** 按钮和本月探测费用。按钮的说明不再显示为正文，改为按钮的 `title` 和 `aria-describedby` 描述；按钮旁的进度提示在点击后才出现。
- 每个渠道柱条之后的可用比例显示为 `100% uptime` / `可用率 100%`；柱条下方「90 天前 … 今天」的坐标文字已移除。
- 90 根逐日柱条都改为按钮，悬停、聚焦或轻触时弹出当天的卡片：日期、当天状态、应答的采样数（`3/3`）、TTFT、TPS 和费用，失败的日子还显示脱敏后的错误。方向键、Home 和 End 在日子之间移动，Esc 关闭卡片；在手机上轻触柱条区域以外即关闭。
- 看板铺满页面栏宽，右边缘与顶栏对齐，不再止于 64 rem。
- `site/src/components/StatusBoard.astro` 把构建时读到的探测文件 `latest.json`、`history.json`、`monthly.json`（`statusAtBuild()`）嵌入页面，在发出任何请求之前就据此绘制；随后在后台读取 `status-data` 分支，只有分支上有更新的运行时才重绘。
- `site/src/shared/status.ts` 的读取函数去掉了 `cache: "no-store"`，请求 8 秒无响应即放弃，raw.githubusercontent.com 无响应时改用 GitHub contents API（`https://api.github.com/repos/Prism-Shadow/model-message-stream-protocol/contents/<file>?ref=<status-data|commit>`）；「立即检测一次」读取已发布提交的文件时同样如此。
- `.github/workflows/pages.yml` 检出 `status-data` 分支，并以指向它的 `MMSP_STATUS_DIR` 构建站点。`.github/workflows/status.yml` 增加 `actions: write` 权限，每次推送了新数据的运行之后都会在 `main` 上启动 `pages.yml`。
- `.github/status/probe.py` 在 `history.json` 的每一天中同时写入 `ok`、`samples` 和 `error`。
