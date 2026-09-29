# openai-chat-vllm-adapter Model Artifacts

This directory holds the upstream prompt-formatting artifacts for every model the
`openai_chat_vllm_adapter` client serves. vLLM passes `chat_template_kwargs` straight
into the served model's chat template, so the template *is* the parameter contract: the
switch that turns thinking on, the effort levels that are accepted, and the default that
applies when a key is omitted are all readable here rather than inferred from vendor prose.

The per-model thinking-switch table these artifacts back is
[`_MODEL_THINKING_PROFILES`](../../src_py/mmsp/openai_chat_vllm_adapter/client.py)
(and its TypeScript twin in
[`src_ts/src/openai_chat_vllm_adapter/client.ts`](../../src_ts/src/openai_chat_vllm_adapter/client.ts)).

## Chat templates

`chat_templates/` stores each template **byte-identical to upstream**, so it can be diffed
against the model repository and fed to Jinja unchanged. That rules out the usual
`> Source:` header line — a Markdown header would corrupt the template — so provenance is
recorded in the table below instead. None of these files ends in a newline, matching upstream,
so `.pre-commit-config.yaml` excludes this directory from `end-of-file-fixer`.

| Model | File | Upstream source | Snapshot | License | MD5 |
|---|---|---|---|---|---|
| `Qwen/Qwen3.8-Flash-Next` | [qwen3.8-flash-next.jinja](./chat_templates/qwen3.8-flash-next.jinja) | https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/main/chat_template.jinja | 2026-09-04 | [Qwen Community License 1.0](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/blob/main/LICENSE) | `519239a4908bb1f805bbce5fa8c8a242` |
| `Qwen/Qwen3.8-27B` | [qwen3.8-27b.jinja](./chat_templates/qwen3.8-27b.jinja) | https://huggingface.co/Qwen/Qwen3.8-27B/raw/main/chat_template.jinja | 2026-09-04 | [Apache-2.0](https://huggingface.co/Qwen/Qwen3.8-27B/blob/main/LICENSE) | `519239a4908bb1f805bbce5fa8c8a242` |
| `Qwen/Qwen3.6-35B-A3B` | [qwen3.6-35b-a3b.jinja](./chat_templates/qwen3.6-35b-a3b.jinja) | https://huggingface.co/Qwen/Qwen3.6-35B-A3B/raw/main/chat_template.jinja | 2026-09-04 | [Apache-2.0](https://huggingface.co/Qwen/Qwen3.6-35B-A3B/blob/main/LICENSE) | `52b6d51ae5b203cb67e64b648494dad2` |
| `Qwen/Qwen3.5-0.8B` | [qwen3.5-0.8b.jinja](./chat_templates/qwen3.5-0.8b.jinja) | https://huggingface.co/Qwen/Qwen3.5-0.8B/raw/main/chat_template.jinja | 2026-09-04 | [Apache-2.0](https://huggingface.co/Qwen/Qwen3.5-0.8B/blob/main/LICENSE) | `3dd635d8e716410fb409839dfac61ea9` |
| `Qwen/Qwen3.5-9B` | [qwen3.5-9b.jinja](./chat_templates/qwen3.5-9b.jinja) | https://huggingface.co/Qwen/Qwen3.5-9B/raw/main/chat_template.jinja | 2026-09-04 | [Apache-2.0](https://huggingface.co/Qwen/Qwen3.5-9B/blob/main/LICENSE) | `94f89e03284d911fc65d06422439fd79` |

`Qwen3.8-Flash-Next` and `Qwen3.8-27B` publish the **same template, byte for byte** (note
the shared MD5). Both files are kept so either model can be looked up by name; edit both
together, or neither.

`Qwen/Qwen3.8-Flash-Next` is the one model here that is not Apache-2.0. The Qwen Community
License 1.0 adds an attribution condition above 100M monthly active users or US$20M monthly
revenue; the other four Qwen repositories ship plain Apache-2.0.

### What the templates read

| Model | Thinking switch | Effort key | Accepted effort values | Default when the key is absent |
|---|---|---|---|---|
| `Qwen3.8-Flash-Next` | `enable_thinking` | `reasoning_effort` | `xhigh`, `medium`, `low` | thinking on, effort `xhigh` |
| `Qwen3.8-27B` | `enable_thinking` | `reasoning_effort` | `xhigh`, `medium`, `low` | thinking on, effort `xhigh` |
| `Qwen3.6-35B-A3B` | `enable_thinking` | — | — | thinking on |
| `Qwen3.5-0.8B` | `enable_thinking` | — | — | **thinking off** |
| `Qwen3.5-9B` | `enable_thinking` | — | — | thinking on |

Three details that only the templates make visible:

- **The 3.8 templates validate `reasoning_effort` and abort on anything else.** An
  unrecognised value raises `Unexpected reasoning effort ...`, so the request fails rather
  than degrading. `xhigh` and `low` inject a reasoning instruction into the system prompt;
  `medium` injects none, which is why it reads as the neutral setting.
- **`reasoning_effort` is only consulted while thinking is on.** The whole block sits under
  `enable_thinking is undefined or enable_thinking is true`, so pairing
  `enable_thinking: false` with an effort value silently drops the effort.
- **`Qwen3.5-0.8B` inverts the default.** It emits the reasoning block only for
  `enable_thinking is defined and enable_thinking is true`; every other template here emits
  it unless `enable_thinking` is explicitly `false`. Omitting the key therefore means
  "thinking off" on `Qwen3.5-0.8B` and "thinking on" everywhere else. The adapter always
  sends the key explicitly, which is what keeps this from mattering in practice.

The 3.8 templates additionally read `preserve_thinking` (default true), which keeps
`reasoning_content` from earlier assistant turns in the prompt. The adapter does not set it.

### Where the artifacts constrain the adapter's table

Every profile in `_MODEL_THINKING_PROFILES` follows the artifact it is read off; no profile
sends a value its model rejects. What the artifacts do force is coarser granularity than
AgentHub's six levels, in two places:

- **`DeepSeek-V4-Pro` and `DeepSeek-V4-Flash` render `LOW` through `XHIGH` identically.** Their
  encoding module asserts `reasoning_effort in ['max', None, 'high']`, so `low` is not an option
  at all and `high` is the lowest value they take; of the values that pass, only `max` changes
  the rendered prompt. `DeepSeek-V4-Flash-Vision-Exp` has its own copy of that module, which
  accepts `low`/`high`/`max`, so it keeps `LOW` distinct and takes a separate profile. See
  [docs/deepseek-v4-encoding.md](./docs/deepseek-v4-encoding.md).
- **Both Qwen3.8 models clamp `HIGH`, `XHIGH` and `MAX` onto `xhigh`.** Their shared template
  accepts only `xhigh`, `medium` and `low`, and `xhigh` is the strongest of the three. Because
  the template defaults the key to `xhigh`, a model on this template that is *not* sent
  `reasoning_effort` runs every level at full effort; the adapter therefore sends the key to
  both of them.

## Models that publish no chat template

- [deepseek-v4-encoding.md](./docs/deepseek-v4-encoding.md) - DeepSeek-V4-Pro,
  DeepSeek-V4-Flash and DeepSeek-V4-Flash-Vision-Exp ship no template at all; their
  parameter contract lives in an `encoding/encoding_dsv4.py` reference implementation.

## Adding a model

When a model is added to `openai_chat_vllm_adapter`, add its prompt-formatting artifact here
in the same commit:

1. Fetch `https://huggingface.co/<org>/<model>/raw/main/chat_template.jinja` with `curl`
   (not a summarising fetch tool — Jinja must survive verbatim) and save it to
   `chat_templates/<lowercased-model-id>.jinja` unmodified.
2. Add a row to the provenance table with the source URL, the snapshot date, the license the
   model repository actually states, and the file's MD5. Check the license per repository;
   sibling models under the same org do not always match.
3. Add a row to *What the templates read* covering the thinking switch, the effort key, its
   accepted values, and the behaviour when the key is absent.
4. Update the thinking profile in both `client.py` and `client.ts` to match what the template
   reads.

If the vendor publishes no `chat_template.jinja` (the URL returns 404 and
`tokenizer_config.json` carries no `chat_template` key), do not invent one. Find the artifact
that actually defines the prompt format — an `encoding/` module, a tokenizer plugin — and add
a note under `docs/` that cites it, pins its checksum, and quotes the code that decides the
request parameters. `deepseek-v4-encoding.md` is the worked example.
