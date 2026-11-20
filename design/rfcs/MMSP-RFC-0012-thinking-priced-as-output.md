# MMSP-RFC-0012 Thinking Priced as Output

- Feature Name: `thinking_price`
- Start Date: 2026-11-20
- Kind: change

[中文版](MMSP-RFC-0012-thinking-priced-as-output.zh.md)

## Abstract

A model has **no price for thinking of its own**: the registry's **`ModelPricing`** holds no thinking price, and a turn's **`thoughts_tokens`** are billed as output, at **`response_tokens`**. The `thoughts_tokens` count of `usage_metadata` stays.

## 1. Introduction

- **Two rows priced thinking apart**: The registry keyed its prices by the usage buckets, `thoughts_tokens` included. That key carried the output price except on two `google-official` rows whose vendor lists thinking at its text rate: `gemini-omni-1.2-flash` ($9 per million against $12 video output, [#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318)) and `gemini-nano-banana-2.1` ($7.50 against $30 image output, [#349](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/349)).
- **Owner decision, 2026-11-20**: A model has no separate thinking price. Thinking is billed as output, at the output price, in MMSP and in PenguinHarness, whose accounting already counts thinking as output.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Output tokens**: `thoughts_tokens + response_tokens` of a `stop` event's `usage_metadata` ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#5-how-a-stream-ends) §5).
- **Output price**: A registry row's `pricing.response_tokens`.

## 3. The Price of Thinking

- **No thinking key**: `ModelPricing` (Python and TypeScript) MUST hold only `currency`, `prompt_tokens`, `response_tokens` and the optional `cached_tokens`. `list_supported_models` / `listSupportedModels` MUST return no other price key, in USD or in CNY.
- **Billed as output**: A turn's thinking tokens MUST be priced at the output price, so its output costs `(thoughts_tokens + response_tokens) × pricing.response_tokens` per million tokens. The consumers in this repository (the status probe, `/models.json`, the usage docs and the skills) MUST compute it so.
- **A vendor's separate rate**: A row whose vendor lists thinking at another rate MUST store its output price only; its comment MAY name the vendor's rate.
- **Counts unchanged**: Clients MUST keep reporting `thoughts_tokens` apart in `usage_metadata`; only its price goes.

## 4. Drawbacks

- **Above the bill on two rows**: Where the vendor bills thinking below its output rate, the computed cost exceeds the bill by the difference: $22.50 per million thinking tokens on `gemini-nano-banana-2.1` and $3 on `gemini-omni-1.2-flash` (list prices read 2026-11-19 and 2026-11-06).
- **Breaking**: A caller that read `pricing.thoughts_tokens` (a TypeScript compile error, a Python `KeyError`) reads `pricing.response_tokens` instead.

## 5. Rationale and Alternatives

- **One output price**: A consumer prices every model's output with one number, as PenguinHarness does; a second output price that only some rows set is one more price every consumer has to carry.
- **Keep `thoughts_tokens` equal to `response_tokens`**: Would keep old callers compiling, but leaves a key naming a price that no longer exists, which a later row could set apart again.
