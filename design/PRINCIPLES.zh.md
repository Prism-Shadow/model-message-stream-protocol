# 设计原则

[English](PRINCIPLES.md)

以下是 MMSP 在两个包中对每个模型都遵守的不变量。代码与原则不一致时，以原则为准：要么修正代码，要么先经 RFC 修改原则（见 [README](README.zh.md)）。每条原则由一段规范性陈述、必要的细节和实现位置组成。这组原则由 [MRFC-0001](rfcs/MRFC-0001-rfc-process.zh.md) 采纳。

## PRN-001 所有模型共用一套协议

调用任何模型都使用同样的三种结构：输入 `UniConfig`，输入与输出 `UniMessage`，输出 `UniEvent`。内容项只能是 `types.py` / `types.ts` 定义的类型之一，消息只包含完整的 `.done` 内容项。消息和事件中不会出现服务商自己的类型。

- 服务商的功能要么以协议中的 `UniConfig` 键或内容项字段进入 MMSP，要么以不透明的 `fidelity` 附在所属的内容项上（PRN-007），绝不成为某个客户端独有的键或字段。
- 只要传输格式能表达顺序，消息转换就保持助手回合中各内容项的顺序（先思考，再文本，再工具调用）。
- 修改任何结构（内容项的类型或字段、`UniConfig` 的键、`UniEvent` 的字段）都是修改协议，须经 RFC。

实现位置：`src_py/mmsp/types.py`、`src_ts/src/types.ts`；`base_client.py` / `baseClient.ts` 中 `LLMClient` 的抽象转换方法；`src_py/tests/test_message_order.py`、`src_ts/tests/message-order.test.ts`；共享的 e2e 测试（PRN-008）。

## PRN-002 同一套流语法，由基类收尾

一条流由若干 `delta` 事件组成，每个事件恰好携带一个内容项，最后由恰好一个 `stop` 事件结束；`stop` 事件携带用量和结束原因，不携带内容项。每个内容项都以连续的 `.delta` 片段流出，随后是它唯一的 `.done` 内容项；内容项之间从不交错，按顺序排列的 `.done` 内容项就是助手消息。一条流要么以 `stop` 事件结束，要么以异常结束，不会两者兼有。

- 客户端只产出 delta，从不产出 `.done` 内容项；由 `StreamItems` 判断每个内容项在哪里结束，并为它收尾。客户端各个 `stop` 事件上的用量和结束原因，合并进唯一的公开 `stop` 事件。
- 客户端产出违反这套语法的内容（`.done` 内容项、带用量的 delta 事件、同一内容项上两份不同的 fidelity）时，在任何模式下都抛出 `StreamProtocolError`：这是客户端的缺陷，绝不修补。
- 不含任何通用内容的线上事件就是空的 delta 事件；客户端不认识的事件会被跳过，因此网关自己插入的帧无法终止一次生成；设置 `MMSP_DEBUG` 后改为抛出异常。

实现位置：`src_py/mmsp/base_client.py` 中的 `_PublicStream` 与 `src_py/mmsp/stream_items.py` 中的 `StreamItems`，以及 `baseClient.ts`、`streamItems.ts` 中的对应实现；`src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`，共享的 e2e 测试用它检查每一条流；`test_stream_protocol.py`、`test_stream_items.py`、`test_unknown_events.py` 及其对应的 TypeScript 测试。

## PRN-003 路由是显式的

`AutoLLMClient` 根据传入的 `client_type` 和一张客户端类型表构造客户端。未传入客户端类型时，由模型 id 开头的模型族前缀指定该厂商的官方客户端；不属于任何已知模型族的 id 会抛出异常，要求传入客户端类型。路由没有别的规则：模型 id 只按前缀匹配，从不按子串或版本匹配。

- 厂商的新一代模型放进该厂商的官方客户端。官方客户端用明确的版本区分各代（`"gpt-6" in self._model`，绝不用 `"gpt" in model`），并让旧的各代继续可用，直到项目负责人决定下线其中一代。
- 兼容客户端只实现一种线上协议，可用于提供该协议的任何端点。
- 新增一行（一个模型族、一个客户端类型）是普通改动；改变这些表的含义须经 RFC。

实现位置：`src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts` 中的表与 `routed_client_type`，`auto_client.py` / `autoClient.ts` 通过它路由；`test_client.py::test_client_type_or_model_family_names_the_client`、`::test_a_model_of_no_known_family_asks_for_a_client_type`、`::test_model_catalog_routes_to_its_client_group` 及其对应的 Jest 测试。

## PRN-004 凭据只发往它被指定的地方

传给客户端的密钥总会被使用，无论 base URL 是什么。未传入密钥时，客户端只在未传入 base URL、或传入的正是它自己的默认端点时，读取它的 `<P>_API_KEY`。未带密钥而传入其他 base URL 时，客户端在构造时、发出任何请求之前抛出 `ApiKeyRequiredError`；只有 `mmsp` 客户端会把这样的 URL 当作开放的服务端，不带密钥调用。

- `CLIENT_CREDENTIALS` 声明每种客户端类型的密钥变量、base URL 变量与默认端点。客户端通过它解析密钥与端点，自己不从环境变量中读取这两者。

实现位置：`src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts` 中的 `CLIENT_CREDENTIALS` 与 `environment_credential`，由 `utils.py` / `utils.ts` 中的 `resolve_credentials` / `resolveCredentials` 应用，每个客户端构造时都会调用；`src_py/tests/test_env_credentials.py`、`src_ts/tests/env-credentials.test.ts`，它们在受控的环境变量下构造每一种客户端类型，并读取其 SDK 实际持有的凭据；`test_credentials.py` / `credentials.test.ts`。

## PRN-005 每个思考级别在每个客户端上都可用

没有客户端会拒绝某个 `ThinkingLevel`：无论什么模型，都没有客户端为 `thinking_level` 抛出 `UnsupportedParameterError`。模型没有与某个级别完全对应的设置时，它的官方客户端改为发送模型接受的设置，不发出警告：Kimi K3 无法关闭思考，因此以 `low` 运行 `none`；Gemini 以 `high` 运行 `xhigh` 和 `max`。

- 经由兼容客户端时，由端点决定某个级别实际如何运行；模型无法接受客户端发送的值时，端点可能拒绝请求。`mmsp` 客户端把级别转发给它的服务端。

实现位置：各客户端的 `_convert_thinking_level*` 方法；`src_py/tests/test_thinking_level_mapping.py`、`src_ts/tests/thinking-level-mapping.test.ts`；`errors.py` / `errors.ts` 中 `UnsupportedParameterError` 的文档字符串。

## PRN-006 被拒绝的值抛出有类型的错误

客户端因模型无法接受而拒绝 `temperature`、`tool_choice`、`prompt_caching`、`fast_mode` 或 `tts_config` 的某个值时，在请求发出之前抛出 `UnsupportedParameterError`，并指明客户端与参数。客户端根本无法执行的操作抛出 `UnsupportedOperationError`。`thinking_level` 从不被拒绝（PRN-005）。

- `mmsp` 客户端把其服务端的拒绝作为 `UpstreamError` 抛出，其 `error_type` 为 `UnsupportedParameterError`。

实现位置：`src_py/mmsp/errors.py`、`src_ts/src/errors.ts`；各客户端的 `transform_uni_config_to_model_config` / `transformUniConfigToModelConfig`；`test_list_models.py` / `list-models.test.ts`；`test_mmsp_server.py` / `mmsp-server.test.ts`；`test_client.py::test_gemini_tts_config_rejects_a_speaker_list_it_cannot_voice` 及其对应的 Jest 测试。

## PRN-007 回传最小化，fidelity 是例外通道

客户端回传助手回合时，依据其内容项的通用字段和 `fidelity` 重建请求，只额外补上服务商对回合所缺部分要求的替代内容（一个占位的思考签名、一个空的推理字段）。`fidelity` 只存放没有通用字段承载、回传时又要发回的线上数据，例如思考签名、加密的推理内容、phase，或严格的上游要求的推理字段名；它绝不存放服务商会重新生成或忽略的 id，也绝不复制通用字段的内容。使用方把它当作不透明数据，原样传回。

- 在流中，一个内容项最多只有一个 delta 携带它的 fidelity，该内容项的 `.done` 会再带一次。
- Claude 只接受带有它自己签发的签名的思考块，因此回传给 Claude 时，不带签名的思考内容项会被略去。
- 线上格式带有调用 id 时，`tool_call_id` 保存服务商的调用 id，回传时发回；线上格式同时带有内容项 id 和调用 id 时，它保存的是调用 id，结果依靠调用 id 对应到它的调用。

实现位置：`types.py` / `types.ts` 中的 `Fidelity`；`StreamItems`，它让每个内容项只有一份 fidelity，并去掉 `item_id`；各客户端的消息转换；`src_py/tests/test_reasoning_fidelity.py`、`test_reasoning_replay_without_thinking.py`、`test_tool_call_arguments.py` 及其对应的 Jest 测试。

## PRN-008 两个包，一份契约

`mmsp` 与 `@prismshadow/mmsp` 拥有相同的客户端、映射、错误类和流，名称一致，只随各语言的大小写与惯用写法而不同；一个包缺少、或与另一个包做法不同的行为，都是缺陷。一项改动在同一个 PR 中同时落到两个包，并附上相互对应的测试。

- 两个包发出的请求体相同。SDK 类型参数之外的键走各自 SDK 的通道：OpenAI Python SDK 用 `extra_body`，openai-node 直接放在请求体顶层。
- 共享的 e2e 测试 `src_py/tests/test_client.py` 与 `src_ts/tests/client.test.ts` 是每个客户端都要满足的同一份契约。模型以它在 `.github/ci/models.json` 中的条目进入这些测试，条目写明能力标记与密钥变量。没有共享测试按模型名分支，也没有模型拥有专属的测试文件。
- 共享测试失败时，除非证明并非如此，都视为客户端有错。任何更大范围的测试改动，都需要项目负责人逐项明确批准。
- 离开测试模型清单的一代模型仍然受支持，并照常路由（PRN-003）。

实现位置：`src_py/tests/` 与 `src_ts/tests/` 下成对的测试文件；`.github/ci/models.json`，两套测试共同读取的唯一模型清单；`.github/ci/plan.py`、`.github/ci/README.md` 与 `.github/workflows/ci.yml`；`test_client.py::test_model_catalog_routes_to_its_client_group` 及其对应的 Jest 测试。
