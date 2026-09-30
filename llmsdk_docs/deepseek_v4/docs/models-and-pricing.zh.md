Source: https://api-docs.deepseek.com/zh-cn/quick_start/pricing (retrieved 2026-09-30)

模型 & 价格
本页目录模型 & 价格

下表所列模型价格以“百万 tokens”为单位。Token 是模型用来表示自然语言文本的的最小单位，可以是一个词、一个数字或一个标点符号等。我们将根据模型输入和输出的总 token 数进行计量计费。

模型细节​

 | 模型 | deepseek-flash(1) | deepseek-v4-pro
 | BASE URL (OpenAI 格式) | https://api.deepseek.com
 | BASE URL (Anthropic 格式) | https://api.deepseek.com/anthropic
 | 模型版本 | DeepSeek-V4.1-Flash | DeepSeek-V4-Pro-0813
 | 思考模式 | 支持非思考与思考模式（默认）
切换方式详见思考模式
 | 上下文长度 | 1M
 | 输出长度 | 最大 384K
 | 功能 | Json Output | 支持 | 支持
 | Tool Calls | 支持 | 支持
 | Responses API | 支持 | 支持
 | Anthropic API | 支持 | 支持
 | 对话前缀续写（Beta） | 支持 | 支持
 | FIM 补全（Beta） | 仅非思考模式支持 | 仅非思考模式支持
 | 图像理解 | 支持 | 不支持
 | 价格(2) | 百万tokens输入
（缓存命中） | 空闲时段 | 0.02元 | 0.15元
 | 高峰时段 | 0.04元 | 0.30元
 | 百万tokens输入
（缓存未命中） | 空闲时段 | 1元 | 4.5元
 | 高峰时段 | 2元 | 9.0元
 | 百万tokens输出 | 空闲时段 | 4元 | 13.5元
 | 高峰时段 | 8元 | 27.0元
 | 并发限制(3) | 2500 | 500

(1) 模型名请使用 deepseek-flash。旧模型名 deepseek-v4-flash、deepseek-v4-flash-vision-exp 仍可调用，但对应模型已下线，请求将由 DeepSeek-V4.1-Flash 模型提供服务，并按 Flash 价格计费。
(2) 空闲时段价格为高峰时段价格的一半。北京时间周一至周五（不含中国法定节假日）9:00 - 12:00、14:00 - 18:00 为高峰时段；其余时段，包括周末及中国法定节假日全天均为空闲时段。
(3) 更多并发限制细节，请参考限速与隔离。

扣费规则​

扣减费用 = token 消耗量 × 模型单价，对应的费用将直接从充值余额或赠送余额中进行扣减。
当充值余额与赠送余额同时存在时，优先扣减赠送余额。

产品价格可能发生变动，DeepSeek 保留修改价格的权利。请您依据实际用量按需充值，定期查看此页面以获知最新价格信息。
