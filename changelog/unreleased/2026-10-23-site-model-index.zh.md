# 模型索引：延迟与吞吐两列、行尾的代码按钮、小米标志

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `site`
- **PR:** [#284](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/284)

[English](2026-10-23-site-model-index.md)

## 变更内容

- 模型索引（`/models/`）用「延迟」和「吞吐」两列取代了状态列。已探测的条目在一行内显示首 token 延迟（`835 ms`、`3.11 s`）与每秒 token 数（`101 tok/s`），两者都链接到模型监测页上对应的渠道。正常的渠道只显示数字；降级的渠道在延迟前加一个琥珀色圆点；故障的渠道显示红色圆点和「故障」。探测未覆盖或因缺少密钥而未探测的条目显示 `—`。按延迟排序时最短的在前，按吞吐排序时最高的在前，没有数值的条目排在最后。
- 这两列在构建时根据状态探测的 `latest.json`（`statusAtBuild()`）写入页面，因此无需向 GitHub 发请求即可显示。页面在浏览器中从 `status-data` 分支读取 `latest.json`，分支上有更新的运行时重绘这两列。计数行显示每日探测的条目数。
- 集成代码改由每行最后一格、最右侧的 `<>` 按钮打开，不再由模型单元格打开。在手机上，按钮位于该行第一行的末尾，只有已探测的条目会多出第四行显示延迟与吞吐。集成代码对话框在价格旁列出该条目的延迟与吞吐。
- 新增 `site/src/shared/catalog-status.ts`：`metricCells()` 在构建时和浏览器中绘制这两个单元格。
- `/models.json` 中各条目的 `status_key` 改用空格而非 `|` 连接（`deepseek-official https://api.deepseek.com deepseek-flash`），`status.key` 为 `client base_url model`。`catalog-status.ts` 中的 `withCurrentKeys()` 在构建时和浏览器中改写以 `|` 写成的 `latest.json` 的键，因此模型索引无论读到哪种形式都能填出延迟与吞吐。指向模型监测页的链接锚点不变。
- 小米的条目（OpenRouter 上的 `xiaomi/mimo-v2.5`、TokenDance 上的 `mimo-v2.6-flash`）显示了小米标志：`marks.ts` 新增 Simple Icons 的 MI 图形（CC0），颜色为 `#FF6900`，`providers.ts` 中的小米厂商使用该标志。
- 从 `i18n.ts` 中删除了 `models.columns.status`。
