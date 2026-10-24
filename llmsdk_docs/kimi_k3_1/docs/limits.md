> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 充值与限速

> 查看 Kimi 开放平台的充值要求、账户等级与 RPM、TPM、TPD 限速，以及提升额度的方式。

为了整体资源分配的公平性，同时防止恶意攻击，我们目前将基于账户的累计充值金额进行速率限制，具体如下表：

<table>
  <thead>
    <tr />
  </thead>

  <tbody />
</table>

## 限速概念解释

* 并发: 同一时间内我们最多处理的来自您的请求数
* RPM: requests per minute 指一分钟内您最多向我们发起的请求数
* TPM: tokens per minute 指一分钟内您最多和我们交互的token数
* TPD: tokens per day 指一天内您最多和我们交互的token数
* 联网搜索 QPS: 联网搜索接口（`/v1/tools/search`、`/v1/tools/search_pro`）每秒最多发起的请求数。该额度独立于左侧各列：不占用 RPM、TPM、TPD 与并发额度，也不被它们消耗

其他细节请参考[速率限制](https://platform.kimi.com/docs/introduction.md#速率限制)一节。

## 联网搜索限速

联网搜索接口（`/v1/tools/search`、`/v1/tools/search_pro`）按上表「联网搜索 QPS」列限速，并遵循以下规则：

* 联网搜索 QPS 与表中其他限速互相独立：调用搜索接口只消耗搜索 QPS 额度，不消耗 RPM、TPM、TPD 与并发额度；反之，聊天等接口的用量也不会占用搜索 QPS。
* 两个搜索接口分别计数、互不占额：例如 Tier1 账户每秒可调用 `/v1/tools/search` 3 次，同时每秒还可调用 `/v1/tools/search_pro` 3 次。
* 超出限制时接口返回 HTTP 429，响应头携带 `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset`，可据此退避重试。

接口定价详见[联网搜索定价](https://platform.kimi.com/docs/pricing/websearch.md)。

## 为什么要做限速？

速率限制是API接口的常见做法，主要有以下几个考量：

* 有助于防止滥用或误用API。例如，恶意行为者可能会通过大量请求来淹没API，试图使其过载或导致服务中断。通过设置速率限制，我们可以防范这样的行为。
* 速率限制有助于确保每个人都能公平地访问API。如果一个人或组织发出过多的请求，可能会拖慢所有人的API。通过限制单个用户可以发出的请求数量，那么尽可能多的人有机会使用API而不会遇到速度减慢的问题。
* 速率限制可以帮助我们管理集群总负载。如果对API的请求急剧增加，可能会给服务器带来压力并导致性能问题。通过设置速率限制将可以帮助为所有用户维护一个平稳且一致的体验。

## 特别说明

* 我们将全力保障用户的正常使用，但当集群负载达到容量上限时，我们可能会采取临时的限流措施，对各类限速进行调整。
* 代金券不计入累计充值总额
* 当系统检测到账户存在异常行为时，会触发风控限速策略，该限制一旦触发即无法解除。
