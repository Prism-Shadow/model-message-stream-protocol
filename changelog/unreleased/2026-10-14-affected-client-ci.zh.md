# 按客户端选择 CI 与发布测试门禁

- **Date:** 2026-10-14
- **Type:** process
- **Scope:** `.github`, `tests`
- **PR:** [#255](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/255)

[English](2026-10-14-affected-client-ci.md)

## 变更内容

- `ci.yml` 根据 PR 改动选择客户端模型测试，包含传递依赖该客户端的实现，并在公共模块修改及发布验证时测试全部客户端。
- `models.json` 将 Python 和 TypeScript 的模型用例、能力标记、端点设置和慢速测试标记统一到一份清单；不以已知模型家族开头的网关用例补充了显式客户端类型。
- `MMSP_TEST_CLIENTS` 在两套测试中选择客户端分组。CI 启用了慢速用例并要求选中用例的 API 密钥，fork PR 运行离线检查。
- `CI passed` 汇总了必需的检查。PyPI 和 npm 发布均等待待发布提交的双语言全量测试通过。
