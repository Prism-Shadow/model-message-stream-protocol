# 模型监测页：状态卡片、每个渠道一行、可翻页的天数范围，数据在构建时写入页面

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `site`, `.github`
- **PR:** [#283](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/283)

[English](2026-10-23-site-status-page.md)

## 变更内容

- `/status/` 顶部改为一张卡片。卡片的边框和顶部色带采用总体状态的颜色（全部正常为绿色，有渠道降级为琥珀色，故障为红色，无数据或未配置密钥为灰色），色带内显示该状态的图标和文字。色带下方是「N 前检测」链接（在新标签页打开该次运行），其后是「下次检测：N 小时后」，悬停可见本地时间，依据构建时读取的 `.github/workflows/status.yml` 中的 `cron` 推算；再下方是 **立即检测一次** 按钮和本月探测费用。按钮的说明不再显示为正文，改为按钮的 `title` 和 `aria-describedby` 描述；按钮旁的进度提示在点击后才出现。
- 探测状态由圆点改为图标（`site/src/shared/status.ts` 中的 `statusIcon()`）：正常为绿色圆形中的对勾（绿色取代了品牌蓝），降级为带感叹号的三角形，故障为叉号，无密钥为横线，未探测的日子为空心圆环。
- 每个渠道的区块以一行开头：左侧是状态图标、厂商、模型 id 和服务商，右侧是 TTFT、TPS、本月费用和可用比例（`100% uptime` / `可用率 100%`）；在手机上这些数字换到下一行。柱条位于这一行下方，占满区块宽度。柱条下方「90 天前 … 今天」的坐标文字已移除。
- 柱条高 16 px，宽度不超过 20 px。区块上方的切换控件可显示 7、30 或 90 天，所选天数记在 `mmsp-site.status-range` 中；旁边的翻页控件（`‹ 7月26日 – 10月23日 ›`）按所选天数前后移动这一时间窗口，最早可翻到探测文件中最早的一天。可用比例按所显示的天数计算，每条柱条以窗口的日期命名。
- `.github/status/probe.py` 在 `history.json` 中保留 365 天（原为 90 天），并把每一天永久保存在按 UTC 年份划分的 `history/YYYY.json` 中，首次运行时从 `history.json` 补齐。
- 每根逐日柱条都改为按钮，悬停、聚焦或轻触时弹出当天的卡片：日期、当天状态、应答的采样数（`3/3`）、TTFT、TPS 和费用，失败的日子还显示脱敏后的错误。方向键、Home 和 End 在日子之间移动，Esc 关闭卡片；在手机上轻触柱条区域以外即关闭。
- 看板铺满页面栏宽，右边缘与顶栏对齐，不再止于 64 rem。
- `site/src/components/StatusBoard.astro` 把构建时读到的探测文件 `latest.json`、`history.json`、`monthly.json`（`statusAtBuild()`，其中历史数据只取最近 180 天）嵌入页面，在发出任何请求之前就据此绘制；随后在后台读取 `status-data` 分支，只有分支上有更新的运行时才重绘。继续往前翻页时读取分支上完整的 `history.json`，再读取窗口所涉年份的归档文件。
- `site/src/shared/status.ts` 的读取函数去掉了 `cache: "no-store"`，请求 8 秒无响应即放弃，raw.githubusercontent.com 无响应时改用 GitHub contents API（`https://api.github.com/repos/Prism-Shadow/model-message-stream-protocol/contents/<file>?ref=<status-data|commit>`）；「立即检测一次」读取已发布提交的文件时同样如此。
- 状态文件中每个目标的键改为以 `+` 连接的注册表三元组（`deepseek-official+https://api.deepseek.com+deepseek-flash`），不再用 `|`，因为 `|` 会拆开运行摘要表格的单元格。`.github/status/probe.py` 读取 `latest.json`、`history.json`、`monthly.json` 时把 `|` 键改写为新键，站点读取此前写入的文件时也做同样的改写（`site/src/shared/status.ts` 中的 `withCurrentKeys()`）。`/status/` 上各区块的锚点保持不变。
- `.github/status/targets.json` 改为通过 `openai-chat` 探测 TokenDance 的 `deepseek-v4.1-flash`，不再使用 `deepseek-official`。
- `.github/workflows/pages.yml` 检出 `status-data` 分支，并以指向它的 `MMSP_STATUS_DIR` 构建站点。`.github/workflows/status.yml` 增加 `actions: write` 权限，每次推送了新数据的运行之后都会在 `main` 上启动 `pages.yml`。
- `.github/status/probe.py` 在 `history.json` 的每一天中同时写入 `ok`、`samples` 和 `error`。
