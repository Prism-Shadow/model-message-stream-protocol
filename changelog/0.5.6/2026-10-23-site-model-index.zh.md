# 模型索引：延迟与吞吐两列、行尾的代码按钮、小米标志

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `site`
- **PR:** [#284](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/284)

[English](2026-10-23-site-model-index.md)

## 变更内容

- 模型索引（`/models/`）用「延迟」和「吞吐」两列取代了状态列。已探测的条目在一行内显示以秒计的首 token 延迟（`0.84`、`3.11`、`28.0`）与每秒 token 数（`101`），两者都链接到模型监测页上对应的渠道。正常的渠道只显示数字；降级的渠道在延迟前加一个琥珀色圆点；故障的渠道显示红色圆点和「故障」。探测未覆盖或因缺少密钥而未探测的条目显示 `—`。按延迟排序时最短的在前，按吞吐排序时最高的在前，没有数值的条目排在最后。
- 单位移到了列标题中，以更小的灰色字跟在列名之后：延迟为 `s`，吞吐为 `tok/s`，输入、输出、缓存为 `$/M` 或 `¥/M`，随 USD / CNY 切换而变，悬停提示为「USD 每百万 tokens」。单元格只显示数字，工具栏不再显示「每百万 tokens」。在手机上，每个数值跟在列名和单位之后；一行放不下某条目的三个价格时，数值移到列名下方。
- 这两列在构建时根据状态探测的 `latest.json`（`statusAtBuild()`）写入页面，因此无需向 GitHub 发请求即可显示。页面在浏览器中从 `status-data` 分支读取 `latest.json`，分支上有更新的运行时重绘这两列。表格上方的统计行不再显示每日探测的条目数，显示为 `121 个模型 · 12 个服务商`。
- 集成代码改由每行最后一格、最右侧的 `<>` 按钮打开（该列标题为「代码」），不再由模型单元格打开。在手机上，按钮位于该行第一行的末尾，只有已探测的条目会多出第四行显示延迟与吞吐。集成代码对话框在价格旁列出该条目带单位的延迟与吞吐。
- 集成代码对话框的「复制」按钮变为两个。「复制代码」复制当前标签页的文件；「复制给 Agent」复制一段页面语言的 Markdown 提示词，由 `catalog.ts` 中的 `agentPromptFor()` 生成：目标、该条目的信息（包、`client_type`、`base_url`、模型 id、密钥环境变量及其格式、模态、上下文窗口、美元标价）、TypeScript 与 Python 程序、接入项目的步骤，以及 `llms.txt`、`/models.json` 和快速开始文档的链接。两个按钮各自显示「已复制」或「复制失败」。
- 新增 `site/src/shared/catalog-status.ts`：`metricCells()` 在构建时和浏览器中绘制这两个单元格，表格中为纯数字，对话框中带单位。
- `/models.json` 中各条目的 `status_key` 改用 `+` 而非 `|` 连接（`deepseek-official+https://api.deepseek.com+deepseek-flash`），`status.key` 为 `client+base_url+model`。模型索引在构建时和浏览器中通过 `status.ts` 的 `withCurrentKeys()` 读取 `latest.json`，它会改写以 `|` 写成的文件的键，因此无论读到哪种形式都能填出延迟与吞吐。指向模型监测页的链接锚点不变。
- 小米的条目（OpenRouter 上的 `xiaomi/mimo-v2.5`、TokenDance 上的 `mimo-v2.6-flash`）显示了小米标志：`marks.ts` 新增 Simple Icons 的 MI 图形（CC0），颜色为 `#FF6900`，`providers.ts` 中的小米厂商使用该标志。
- 从 `i18n.ts` 中删除了 `models.columns.status` 和 `models.probed`。
