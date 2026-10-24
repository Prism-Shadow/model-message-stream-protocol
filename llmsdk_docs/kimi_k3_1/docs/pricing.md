> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 模型推理价格说明

> 了解 Kimi 模型推理的 token 计费单位、输入输出计费方式、缓存优惠和各模型价格入口。

## 模型定价

### K3 系列模型

K3 系列模型均支持 1,048,576 tokens 上下文窗口。

<table>
  <thead>
    <tr />
  </thead>

  <tbody />
</table>

注：Kimi API 对重复的请求前缀 **自动启用** 上下文缓存计费，缓存有效期（time-to-live，TTL）默认为 5min。TTL 设置及成本优化建议详见 [上下文缓存最佳实践](https://platform.kimi.com/docs/guide/context-caching.md)。

### K2 系列模型

K2 系列模型均支持 262,144 tokens 上下文窗口。

> [!NOTE]
>
> 尊敬的 Kimi 用户，K2 系列模型将于 2026 年 10 月 31 日起停止向新注册用户开放，已注册用户不受影响；我们计划在 12 月底下线所有 K2 系列模型，请提前做好 [迁移准备](https://platform.kimi.com/docs/guide/kimi-k3-1-pro-quickstart.md)。

<table>
  <thead>
    <tr />
  </thead>

  <tbody />
</table>

此处 1 MTok = 1,000,000 tokens，表格中的价格代表每消耗 1 MTok 的价格。

## 计费基本概念

> [!NOTE]
>
> Kimi API 开放平台提供的模型推理服务是「按量计费」模式，不提供订阅制方案，请注意与 Kimi 会员、Kimi Code 等产品区分，[查看产品差异](https://platform.kimi.com/docs/guide/product-plans.md)。

### 计费单元

Token：代表常见的字符序列，每个汉字使用的 Token 数目可能是不同的。例如，单个汉字"夔"可能会被分解为若干 Token 的组合，而像"中国"这样短且常见的短语则可能会使用单个 Token。大致来说，对于一段通常的中文文本，1 个 Token 大约相当于 1.5-2 个汉字。具体每次调用实际产生的 Tokens 数量可以通过调用 [计算 Token API](https://platform.kimi.com/docs/api/estimate.md) 来获得。

### 计费逻辑

模型推理接口对 Input 和 Output 均实行按量计费。对于 K3 系列模型，缓存写入按 TTL（5min / 1h）单独计费；缓存命中的输入仅按缓存命中价格计费，不再重复收取缓存写入费用。如果您上传并抽取文档内容，并将抽取的文档内容作为 Input 传输给模型，那么文档内容也将按量计费。文件相关接口（文件内容抽取/文件存储）**限时免费**，即您只上传并抽取文档时，文件接口本身不产生费用。关于如何提高缓存命中率、选择合适的 TTL 档位，详见 [上下文缓存最佳实践](https://platform.kimi.com/docs/guide/context-caching.md) 。

## 模型说明

各模型的能力介绍与适用场景见对应的模型指南：

* [Kimi K3.1 Pro 模型介绍](https://platform.kimi.com/docs/guide/kimi-k3-1-pro-quickstart.md)
* [Kimi K3 模型介绍](https://platform.kimi.com/docs/guide/kimi-k3-quickstart.md)
* [Kimi K2.7 Code 模型介绍](https://platform.kimi.com/docs/guide/kimi-k2-7-code-quickstart.md)
* [Kimi K2.6 模型介绍](https://platform.kimi.com/docs/guide/kimi-k2-6-quickstart.md)
