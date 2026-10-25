# Copyright 2025 Prism Shadow. and/or its affiliates
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from typing import Literal, NotRequired, TypedDict


Modality = Literal["Text", "Image", "Video", "Audio", "Embed"]
Currency = Literal["USD", "CNY"]


class ModelPricing(TypedDict):
    """List prices per million tokens for MMSP's usage buckets.

    Keys mirror ``usage_metadata``: ``cached_tokens`` (cache-hit price, absent when the
    platform publishes none), ``prompt_tokens`` (non-cached input), and
    ``thoughts_tokens``/``response_tokens``, which both carry the vendor's output price.
    Values are in the currency requested from ``list_supported_models``.
    """

    currency: Currency
    prompt_tokens: float
    thoughts_tokens: float
    response_tokens: float
    cached_tokens: NotRequired[float]


class SupportedModel(TypedDict):
    """One supported model entry.

    (model, base_url, client) maps directly onto the AutoLLMClient constructor:
    ``AutoLLMClient(model=entry["model"], base_url=entry["base_url"], client_type=entry["client"])``.
    Modalities describe what is usable through that client; ``context_window`` and
    ``pricing`` are omitted where the platform publishes no authoritative value.

    ``pricing`` is always the LIST price. A running promotion is deliberately not recorded:
    the registry's job is the catalog price, and applying a promotion is the consumer's.
    """

    model: str
    base_url: str
    client: str
    input_modalities: list[Modality]
    output_modalities: list[Modality]
    context_window: NotRequired[int]
    pricing: NotRequired[ModelPricing]


_GOOGLE = "https://generativelanguage.googleapis.com"
_ANTHROPIC = "https://api.anthropic.com"
_OPENAI = "https://api.openai.com/v1"
_ZAI = "https://api.z.ai/api/paas/v4/"
_MOONSHOT = "https://api.moonshot.cn/v1"
_DEEPSEEK = "https://api.deepseek.com"
_OPENROUTER = "https://openrouter.ai/api/v1"
_SILICONFLOW = "https://api.siliconflow.cn/v1"
_MINIMAX = "https://api.minimax.io/v1"
_VERTEX = "https://aiplatform.googleapis.com"
_BEDROCK = "bedrock://us-east-1"
_TOKENDANCE = "https://tokendance.space/gateway/v1"
_TOKENDANCE_ANTHROPIC = "https://tokendance.space/gateway"

# Display convention shared with the MMSP apps: prices are stored in USD (official CNY
# list prices pre-converted at 7 CNY/USD), so requesting CNY shows the vendor's numbers.
_CNY_PER_USD = 7.0


def _usd(prompt: float, output: float, cached: float | None = None) -> ModelPricing:
    # thoughts and response tokens are both billed at the vendor's output price
    pricing: ModelPricing = {
        "currency": "USD",
        "prompt_tokens": prompt,
        "thoughts_tokens": output,
        "response_tokens": output,
    }
    if cached is not None:
        pricing["cached_tokens"] = cached
    return pricing


def _cny(prompt: float, output: float, cached: float | None = None) -> ModelPricing:
    """Declare a CNY-denominated official list price; storage stays USD (converted at 7 CNY/USD)."""

    def rate(value: float) -> float:
        return round(value / _CNY_PER_USD, 6)

    return _usd(rate(prompt), rate(output), rate(cached) if cached is not None else None)


# Prices in USD per million tokens (CNY list prices pre-converted at 7 CNY/USD). Each platform
# section names where its data was read and when. Gateway rows list only the input modalities
# their client can send: the OpenAI-protocol clients carry text and images, not video or audio.
_SUPPORTED_MODELS: list[SupportedModel] = [
    # --- Official vendor endpoints (55 rows; list prices from each vendor's pricing page; the rows
    # added 2026-10-24 name their page and read date)
    {
        "model": "gemini-4-argon",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text", "Image", "Video", "Audio"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(4.0, 20.0, cached=0.2),
    },
    {
        "model": "gemini-3.8-flash",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text", "Image", "Video", "Audio"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        # Google runs a launch discount through 2026-12-31 on this row and on the two flash
        # rows below; the list price is stored regardless, because applying a running
        # promotion belongs to the consumer, not to the registry.
        "pricing": _usd(1.5, 7.5, cached=0.15),
    },
    {
        "model": "gemini-3.7-flash",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text", "Image", "Video", "Audio"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.5, 7.5, cached=0.15),
    },
    {
        "model": "gemini-3.6-flash",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text", "Image", "Video", "Audio"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.5, 7.5, cached=0.15),
    },
    {
        "model": "gemini-3.5-flash-lite",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text", "Image", "Video", "Audio"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.3, 2.5, cached=0.03),
    },
    {
        "model": "gemini-3.5-flash",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text", "Image", "Video", "Audio"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.5, 9.0, cached=0.15),
    },
    {
        # ai.google.dev/gemini-api/docs/pricing (read 2026-10-24), the tier for prompts up to 200K
        # tokens; above, $4 input, $18 output, $0.40 cache read
        "model": "gemini-3.1-pro-preview",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text", "Image", "Video", "Audio"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(2.0, 12.0, cached=0.2),
    },
    {
        # ai.google.dev/gemini-api/docs/pricing (read 2026-10-24); audio input costs $0.50 and its
        # cache read $0.05
        "model": "gemini-3.1-flash-lite",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text", "Image", "Video", "Audio"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.25, 1.5, cached=0.025),
    },
    {
        # ai.google.dev/gemini-api/docs/pricing (read 2026-10-24); audio input costs $1 and its cache
        # read $0.10
        "model": "gemini-3-flash-preview",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text", "Image", "Video", "Audio"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.5, 3.0, cached=0.05),
    },
    {
        "model": "gemini-3.1-flash-lite-image",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Image"],
    },
    {
        "model": "gemini-3.1-flash-image",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Image"],
    },
    {
        "model": "gemini-3.8-flash-tts",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Audio"],
    },
    {
        "model": "gemini-3.8-flash-lite-tts",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Audio"],
    },
    {
        "model": "gemini-3.1-flash-tts-preview",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Audio"],
    },
    {
        "model": "gemini-embedding-2",
        "base_url": _GOOGLE,
        "client": "google-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Embed"],
    },
    {
        # cache reads are 2.5% of the input price
        "model": "claude-fable-5-1",
        "base_url": _ANTHROPIC,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(10.0, 50.0, cached=0.25),
    },
    {
        # cache reads are 5% of the input price
        "model": "claude-opus-5-5",
        "base_url": _ANTHROPIC,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(4.0, 20.0, cached=0.2),
    },
    {
        "model": "claude-sonnet-5-5",
        "base_url": _ANTHROPIC,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(2.0, 10.0, cached=0.1),
    },
    {
        "model": "claude-haiku-5-5",
        "base_url": _ANTHROPIC,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        # official list price for prompts up to 100K tokens; every rate is 5x above it
        "pricing": _usd(0.1, 0.5, cached=0.01),
    },
    {
        "model": "claude-fable-5",
        "base_url": _ANTHROPIC,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(10.0, 50.0, cached=1.0),
    },
    {
        "model": "claude-opus-5",
        "base_url": _ANTHROPIC,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(5.0, 25.0, cached=0.5),
    },
    {
        "model": "claude-sonnet-5",
        "base_url": _ANTHROPIC,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(2.0, 10.0, cached=0.2),
    },
    {
        "model": "claude-opus-4-8",
        "base_url": _ANTHROPIC,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(5.0, 25.0, cached=0.5),
    },
    {
        # platform.claude.com/docs/en/about-claude/pricing (read 2026-10-24); the 1M window as the
        # penguin-harness catalog and OpenRouter's Anthropic endpoint list it
        "model": "claude-opus-4-7",
        "base_url": _ANTHROPIC,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(5.0, 25.0, cached=0.5),
    },
    {
        "model": "claude-sonnet-4-6",
        "base_url": _ANTHROPIC,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(3.0, 15.0, cached=0.3),
    },
    {
        # official list price per 1M tokens: $0.1 cached input, $2 uncached input, $2.5 cache
        # writes, $10 output, above 272K input tokens 2x input and cache and 1.5x output. The
        # prompt bucket carries the cache-write rate, as for gpt-6-astra.
        "model": "gpt-6.1-sol",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(2.5, 10.0, cached=0.1),
    },
    {
        # official list price per 1M tokens: $1 cached input, $10 uncached input, $12.5 cache
        # writes, $50 output, all doubled above 272K input tokens except output, which is 1.5x.
        # The prompt bucket carries the cache-write rate: the usage buckets do not separate
        # cache-written input from plain input.
        "model": "gpt-6-astra",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(12.5, 50.0, cached=1.0),
    },
    {
        # Official/OpenRouter base tier, 2026-10-14; prompt includes the cache-write premium.
        "model": "gpt-6-luna",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(0.125, 0.5, cached=0.01),
    },
    {
        # official standard-tier list price; the bare gpt-5.6 alias also routes here
        "model": "gpt-5.6-sol",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(5.0, 30.0, cached=0.5),
    },
    {
        # the bare alias of gpt-5.6-sol, at that row's list price;
        # developers.openai.com/api/docs/pricing (read 2026-10-24) shows Sol's promotional $4 input,
        # $20 output, $0.40 cache read through at least 2026-11-21
        "model": "gpt-5.6",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(5.0, 30.0, cached=0.5),
    },
    {
        "model": "gpt-5.6-terra",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(2.0, 12.0, cached=0.2),
    },
    {
        "model": "gpt-5.6-luna",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(0.2, 1.2, cached=0.02),
    },
    {
        "model": "gpt-5.5",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(5.0, 30.0, cached=0.5),
    },
    {
        # developers.openai.com/api/docs/pricing (read 2026-10-24), the tier under 272K context ($60
        # input, $270 output above); no cache price
        "model": "gpt-5.5-pro",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(30.0, 180.0),
    },
    {
        # developers.openai.com/api/docs/pricing (read 2026-10-24), the tier under 272K context ($5
        # input, $22.50 output, $0.50 cache read above)
        "model": "gpt-5.4",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(2.5, 15.0, cached=0.25),
    },
    {
        # developers.openai.com/api/docs/pricing (read 2026-10-24), the tier under 272K context ($60
        # input, $270 output above); no cache price
        "model": "gpt-5.4-pro",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(30.0, 180.0),
    },
    {
        # developers.openai.com/api/docs/pricing (read 2026-10-24)
        "model": "gpt-5.4-mini",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 400000,
        "pricing": _usd(0.75, 4.5, cached=0.075),
    },
    {
        # developers.openai.com/api/docs/pricing (read 2026-10-24)
        "model": "gpt-5.4-nano",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 400000,
        "pricing": _usd(0.2, 1.25, cached=0.02),
    },
    {
        "model": "MiniMax-M3",
        "base_url": _MINIMAX,
        "client": "minimax-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        # official list price for the <=512K-input tier; rates double above it
        "pricing": _usd(0.3, 1.2, cached=0.06),
    },
    {
        # official pay-as-you-go list price, one tier (guides/pricing-paygo, 2026-10-19)
        "model": "MiniMax-M3.1-Flash",
        "base_url": _MINIMAX,
        "client": "minimax-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.15, 0.6, cached=0.015),
    },
    {
        "model": "text-embedding-3-large",
        "base_url": _OPENAI,
        "client": "openai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Embed"],
        "pricing": _usd(0.13, 0.0),
    },
    {
        "model": "glm-5.3",
        "base_url": _ZAI,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(1.4, 4.4, cached=0.26),
    },
    {
        "model": "glm-5.3-flash",
        "base_url": _ZAI,
        "client": "zai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        # official list price (verified 2026-08-26); a launch discount halves all three rates
        # through 2026-09-09 (UTC+8)
        "pricing": _usd(0.15, 0.5, cached=0.03),
    },
    {
        "model": "glm-5.2",
        "base_url": _ZAI,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(1.4, 4.4, cached=0.26),
    },
    {
        "model": "glm-5.1",
        "base_url": _ZAI,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 200000,
        "pricing": _usd(1.4, 4.4, cached=0.26),
    },
    {
        # docs.z.ai/guides/overview/pricing (read 2026-10-24); the 200K window from the
        # penguin-harness catalog
        "model": "glm-5",
        "base_url": _ZAI,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 200000,
        "pricing": _usd(1.0, 3.2, cached=0.2),
    },
    {
        # official list price (2026-10-23); the default 5m cache write costs the input price, so
        # the prompt bucket is exact; only the 1h write of prompt_caching enhance costs 2x
        "model": "kimi-k3.1-pro",
        "base_url": _MOONSHOT,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(13.0, 68.0, cached=1.3),
    },
    {
        # image input verified live 2026-10-23; the cache-hit price is the standard model's
        "model": "kimi-k3.1-pro-highspeed",
        "base_url": _MOONSHOT,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(26.0, 136.0, cached=1.3),
    },
    {
        "model": "kimi-k3",
        "base_url": _MOONSHOT,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(20.0, 100.0, cached=2.0),
    },
    {
        "model": "kimi-k2.6",
        "base_url": _MOONSHOT,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _cny(6.5, 27.0, cached=1.1),
    },
    {
        # Moonshot's pricing page (read 2026-10-24) no longer lists K2.5 and closes the K2 series to
        # new users from 2026-10-31; the price and window are the penguin-harness catalog's
        "model": "kimi-k2.5",
        "base_url": _MOONSHOT,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _cny(4.0, 21.0, cached=0.7),
    },
    {
        # DeepSeek-V4.1-Flash; DeepSeek also serves deepseek-v4-flash and
        # deepseek-v4-flash-vision-exp with it, at this price (official page 2026-09-30)
        "model": "deepseek-flash",
        "base_url": _DEEPSEEK,
        "client": "deepseek-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        # official off-peak list price; peak-hour rates (Beijing 9:00-12:00, 14:00-18:00,
        # weekdays) are double
        "pricing": _cny(1.0, 4.0, cached=0.02),
    },
    {
        "model": "deepseek-v4-flash",
        "base_url": _DEEPSEEK,
        "client": "deepseek-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        # official off-peak list price effective 2026-09-10 (verified 2026-09-08 against
        # the official adjustment); peak-hour rates (Beijing 9:00-12:00, 14:00-18:00) are
        # double
        "pricing": _cny(1.0, 4.0, cached=0.02),
    },
    {
        "model": "deepseek-v4-flash-vision-exp",
        "base_url": _DEEPSEEK,
        "client": "deepseek-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        # priced as deepseek-v4-flash; official off-peak list price effective 2026-09-10
        # (verified 2026-09-08 against the official adjustment), and peak-hour rates
        # (Beijing 9:00-12:00, 14:00-18:00) are double
        "pricing": _cny(1.0, 4.0, cached=0.02),
    },
    {
        "model": "deepseek-v4-pro",
        "base_url": _DEEPSEEK,
        "client": "deepseek-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        # official off-peak list price (verified 2026-08-18); peak-hour rates
        # (Beijing 9:00-12:00, 14:00-18:00) are double
        "pricing": _cny(4.5, 13.5, cached=0.15),
    },
    # --- OpenRouter (123 rows; USD prices, context windows and modalities from the live models API
    # https://openrouter.ai/api/v1/models and each model's /api/v1/models/{slug}/endpoints list,
    # read 2026-10-24). The API quotes one endpoint per model; where that endpoint runs a promotion
    # (a nonzero `discount` in its /endpoints entry), the row stores the model vendor's own endpoint
    # at its undiscounted rate, or the quoted endpoint's undiscounted rate when the vendor serves
    # none there. A vendor's own promotion that the API quotes as the plain price is not recorded
    # either: the vendor's list price is stored. Rows whose model id names a family with an official
    # client (deepseek/, moonshotai/, z-ai/) use that client; the rest use openai-responses.
    {
        "model": "amazon/nova-premier-v1",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(2.5, 12.5, cached=0.625),
    },
    {
        "model": "amazon/nova-2-lite-v1",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.3, 2.5),
    },
    {
        "model": "anthropic/claude-fable-5.1",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(10.0, 50.0, cached=0.25),
    },
    {
        "model": "anthropic/claude-opus-5.5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(4.0, 20.0, cached=0.2),
    },
    {
        "model": "anthropic/claude-sonnet-5.5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(2.0, 10.0, cached=0.1),
    },
    {
        # rates for prompts up to 100K tokens; the listing bills every rate 5x from 100,000 prompt
        # tokens
        "model": "anthropic/claude-haiku-5.5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.1, 0.5, cached=0.01),
    },
    {
        "model": "anthropic/claude-fable-5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(10.0, 50.0, cached=1.0),
    },
    {
        "model": "anthropic/claude-opus-5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(5.0, 25.0, cached=0.5),
    },
    {
        "model": "anthropic/claude-opus-4.8",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(5.0, 25.0, cached=0.5),
    },
    {
        "model": "anthropic/claude-opus-4.7",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(5.0, 25.0, cached=0.5),
    },
    {
        "model": "anthropic/claude-opus-4.6",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(5.0, 25.0, cached=0.5),
    },
    {
        "model": "anthropic/claude-sonnet-5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(2.0, 10.0, cached=0.2),
    },
    {
        "model": "anthropic/claude-haiku-4.5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 200000,
        "pricing": _usd(1.0, 5.0, cached=0.1),
    },
    {
        "model": "bytedance-seed/seed-2-1-turbo",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.5, 2.5),
    },
    {
        # rates for prompts up to 128K tokens ($1 input, $6 output above); the listing's
        # expiration_date is 2026-11-11
        "model": "bytedance-seed/seed-2.0-code",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.5, 3.0),
    },
    {
        # rates for prompts up to 128K tokens ($0.50 input, $4 output above)
        "model": "bytedance-seed/seed-2.0-lite",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.25, 2.0),
    },
    {
        # rates for prompts up to 128K tokens ($0.20 input, $0.80 output above)
        "model": "bytedance-seed/seed-2.0-mini",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.1, 0.4),
    },
    {
        "model": "cohere/command-a-plus",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 192000,
        "pricing": _usd(0.3, 1.5, cached=0.15),
    },
    {
        "model": "cohere/command-a",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 256000,
        "pricing": _usd(2.5, 10.0),
    },
    {
        # the quoted OpenInference endpoint (fp4), no discount; DeepSeek serves none for this id
        "model": "deepseek/deepseek-v4.1-flash",
        "base_url": _OPENROUTER,
        "client": "deepseek-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.02, 1.0, cached=0.015),
    },
    {
        # DeepSeek's own endpoint; its weekday peak hours (UTC 01:00-04:00, 06:00-10:00) cost double
        "model": "deepseek/deepseek-v4.1-flash-1017",
        "base_url": _OPENROUTER,
        "client": "deepseek-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.15, 0.6, cached=0.003),
    },
    {
        # DeepSeek's own endpoint; its weekday peak hours (UTC 01:00-04:00, 06:00-10:00) cost double
        "model": "deepseek/deepseek-v4-pro-0813",
        "base_url": _OPENROUTER,
        "client": "deepseek-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.66, 1.98, cached=0.022),
    },
    {
        # the quoted Relace endpoint (fp4), no discount; DeepSeek serves none for this id
        "model": "deepseek/deepseek-v4-flash-0731",
        "base_url": _OPENROUTER,
        "client": "deepseek-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.0422, 0.1694, cached=0.028),
    },
    {
        # the quoted DeepInfra endpoint runs a 51% discount ($0.2156 input, $0.6468 output); DeepSeek
        # serves none for this id
        "model": "deepseek/deepseek-v4-flash-vision-exp",
        "base_url": _OPENROUTER,
        "client": "deepseek-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.44, 1.32, cached=0.014),
    },
    {
        # the quoted GMICloud endpoint runs a 35% discount ($0.091 input, $0.182 output)
        "model": "deepseek/deepseek-v4-flash",
        "base_url": _OPENROUTER,
        "client": "deepseek-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.14, 0.28, cached=0.028),
    },
    {
        # the quoted StreamLake endpoint runs an 88% discount ($0.2088 input, $0.4176 output)
        "model": "deepseek/deepseek-v4-pro",
        "base_url": _OPENROUTER,
        "client": "deepseek-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.74, 3.48, cached=0.145),
    },
    {
        # deepseek-official sends DeepSeek V4's request shape to every id, so this V3.2 row takes the
        # generic Responses client
        "model": "deepseek/deepseek-v3.2",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 163840,
        "pricing": _usd(0.28, 0.42, cached=0.028),
    },
    {
        # Google's introductory 50% off runs on every endpoint through 2026-11-30 (the API quotes $2
        # input, $10 output); the Google AI Studio list rate is stored
        "model": "google/gemini-4-argon",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(4.0, 20.0, cached=0.2),
    },
    {
        # Google's launch discount halves every endpoint through 2026-12-31 (the API quotes the Vertex
        # us endpoint at $0.825 input, $4.125 output); the Google AI Studio list rate is stored
        "model": "google/gemini-3.8-flash",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.5, 7.5, cached=0.15),
    },
    {
        # a 50% discount runs on every endpoint (the API quotes $0.75 input, $3.75 output); the Google
        # AI Studio list rate is stored. Google's own pricing page no longer lists 3.7 Flash
        "model": "google/gemini-3.7-flash",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.5, 7.5, cached=0.15),
    },
    {
        # the API quotes Google's launch price ($0.75 input, $3.75 output, $0.075 cache read) with no
        # discount flag; ai.google.dev/gemini-api/docs/pricing runs it through 2026-12-31 and lists
        # the stored price from 2027-01-01
        "model": "google/gemini-3.6-flash",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.5, 7.5, cached=0.15),
    },
    {
        "model": "google/gemini-3.5-flash",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.5, 9.0, cached=0.15),
    },
    {
        "model": "google/gemini-3.5-flash-lite",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.3, 2.5, cached=0.03),
    },
    {
        # rates for prompts up to 200K tokens; above, $4 input, $18 output, $0.40 cache read
        "model": "google/gemini-3.1-pro-preview",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(2.0, 12.0, cached=0.2),
    },
    {
        "model": "google/gemma-4-31b-it",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.2, 0.4),
    },
    {
        "model": "google/gemma-4-26b-a4b-it:free",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.0, 0.0),
    },
    {
        # Inception's endpoint, the only one, runs a 50% discount ($0.10 input, $0.35 output)
        "model": "inception/mercury-3",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.2, 0.7, cached=0.02),
    },
    {
        # Inception's endpoint, the only one, runs an 80% discount ($0.04 input, $0.15 output)
        "model": "inception/mercury-2.5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 260000,
        "pricing": _usd(0.2, 0.75, cached=0.02),
    },
    {
        # the quoted DeepInfra and Novita endpoints run a 75% discount ($0.075 input, $0.225 output);
        # inclusionAI serves none
        "model": "inclusionai/ling-3.1-flash",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.3, 0.9, cached=0.06),
    },
    {
        "model": "inclusionai/ling-3.0-flash-vl",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 131072,
        "pricing": _usd(0.06, 0.18, cached=0.012),
    },
    {
        # AtlasCloud's endpoint, the only one, runs a 60% discount ($0.30 input, $1.20 output)
        "model": "meituan/longcat-2.0",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048756,
        "pricing": _usd(0.75, 3.0, cached=0.015),
    },
    {
        "model": "meta/muse-wonder",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(4.0, 20.0, cached=0.2),
    },
    {
        "model": "meta/muse-spark-1.3",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.25, 4.25, cached=0.15),
    },
    {
        "model": "meta/muse-spark-open",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.25, 4.25, cached=0.15),
    },
    {
        "model": "meta/muse-glimmer-30b",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 131072,
        "pricing": _usd(0.3, 1.2, cached=0.04),
    },
    {
        "model": "meta-llama/llama-4-maverick",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 524288,
        "pricing": _usd(0.1875, 0.6525, cached=0.05),
    },
    {
        "model": "meta-llama/llama-4-scout",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1310720,
        "pricing": _usd(0.1, 0.3),
    },
    {
        # the paid listing; the minimax-m3.1-flash:free slug has no endpoint left
        "model": "minimax/minimax-m3.1-flash",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.15, 0.6, cached=0.015),
    },
    {
        "model": "minimax/minimax-m3",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.3, 1.2, cached=0.06),
    },
    {
        "model": "minimax/minimax-m2.7",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 204800,
        "pricing": _usd(0.3, 1.2, cached=0.06),
    },
    {
        "model": "minimax/minimax-m2.5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 204800,
        "pricing": _usd(0.3, 1.2, cached=0.03),
    },
    {
        "model": "mistralai/mistral-large-4-0",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.36, 4.18, cached=0.14),
    },
    {
        "model": "mistralai/mistral-medium-3-5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(1.5, 7.5),
    },
    {
        "model": "mistralai/mistral-small-2603",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.15, 0.6, cached=0.015),
    },
    {
        "model": "mistralai/devstral-2512",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.4, 2.0, cached=0.04),
    },
    {
        "model": "mistralai/codestral-2508",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 256000,
        "pricing": _usd(0.3, 0.9, cached=0.03),
    },
    {
        "model": "mistralai/ministral-14b-2512",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.2, 0.2, cached=0.02),
    },
    {
        # the slug's `moonshotai/highspeed` endpoint (4/20/0.2) is a provider route, not a model id
        "model": "moonshotai/kimi-k3.1-pro",
        "base_url": _OPENROUTER,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(2.0, 10.0, cached=0.2),
    },
    {
        # the quoted InferenceNet endpoint (fp4), no discount; Moonshot AI's own bills $3 input, $15
        # output, $0.30 cache read
        "model": "moonshotai/kimi-k3",
        "base_url": _OPENROUTER,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.239, 10.8, cached=0.21),
    },
    {
        # the quoted Inceptron endpoint (int4), no discount; Moonshot AI's own bills $0.95 input, $4
        # output, $0.19 cache read
        "model": "moonshotai/kimi-k2.7-code",
        "base_url": _OPENROUTER,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.6712, 3.35, cached=0.15),
    },
    {
        "model": "moonshotai/kimi-k2.6",
        "base_url": _OPENROUTER,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.65, 3.41, cached=0.15),
    },
    {
        # the quoted SiliconFlow endpoint (int4), no discount; Moonshot AI serves none
        "model": "moonshotai/kimi-k2.5",
        "base_url": _OPENROUTER,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.5, 2.5, cached=0.15),
    },
    {
        "model": "nvidia/nemotron-3.5-super-vl",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.15, 0.5, cached=0.02),
    },
    {
        "model": "nvidia/nemotron-3.5-super-vl:free",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.0, 0.0),
    },
    {
        "model": "nvidia/nemotron-3.5-lightning",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.07, 0.2, cached=0.04),
    },
    {
        "model": "nvidia/nemotron-3.5-lightning:free",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.0, 0.0),
    },
    {
        "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.0, 0.0),
    },
    {
        "model": "nvidia/nemotron-3-super-120b-a12b",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.3, 2.4, cached=0.15),
    },
    {
        # $2 input, $10 output, $0.1 cache read, $2.5 cache write; the prompt bucket carries the
        # cache-write rate
        "model": "openai/gpt-6.1-sol",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(2.5, 10.0, cached=0.1),
    },
    {
        # default OpenAI endpoint, no discount: $10 input, $50 output, $1 cache read, $12.5 cache
        # write per 1M tokens; the prompt bucket carries the cache-write rate
        "model": "openai/gpt-6-astra",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(12.5, 50.0, cached=1.0),
    },
    {
        # $0.1 input, $0.5 output, $0.01 cache read, $0.125 cache write; the prompt bucket carries the
        # cache-write rate
        "model": "openai/gpt-6-luna",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(0.125, 0.5, cached=0.01),
    },
    {
        # the API quotes OpenAI's promotional $4 input, $20 output, $0.40 cache read with no discount
        # flag (developers.openai.com/api/docs/pricing runs it through at least 2026-11-21); the list
        # price of the official row is stored
        "model": "openai/gpt-5.6-sol",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(5.0, 30.0, cached=0.5),
    },
    {
        "model": "openai/gpt-5.6-terra",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(2.0, 12.0, cached=0.2),
    },
    {
        "model": "openai/gpt-5.6-luna",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(0.2, 1.2, cached=0.02),
    },
    {
        "model": "openai/gpt-5.5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(5.0, 30.0, cached=0.5),
    },
    {
        # rates for prompts under 272K tokens ($60 input, $270 output above); no cache price
        "model": "openai/gpt-5.5-pro",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(30.0, 180.0),
    },
    {
        # rates for prompts under 272K tokens ($5 input, $22.50 output, $0.50 cache read above)
        "model": "openai/gpt-5.4",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(2.5, 15.0, cached=0.25),
    },
    {
        # rates for prompts under 272K tokens ($60 input, $270 output above); no cache price
        "model": "openai/gpt-5.4-pro",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(30.0, 180.0),
    },
    {
        "model": "openai/gpt-5.4-mini",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 400000,
        "pricing": _usd(0.75, 4.5, cached=0.075),
    },
    {
        "model": "openai/gpt-5.4-nano",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 400000,
        "pricing": _usd(0.2, 1.25, cached=0.02),
    },
    {
        "model": "openai/gpt-5.3-codex",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 400000,
        "pricing": _usd(1.75, 14.0, cached=0.175),
    },
    {
        "model": "openai/gpt-oss-120b",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 131072,
        "pricing": _usd(0.15, 0.6, cached=0.075),
    },
    {
        # the Free Models Router: each request goes to a free model with the features it needs; window
        # and modalities as the models API lists them
        "model": "openrouter/free",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 200000,
        "pricing": _usd(0.0, 0.0),
    },
    {
        # web search is billed on top, at $5 per 1,000 requests
        "model": "perplexity/sonar-pro",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 200000,
        "pricing": _usd(3.0, 15.0),
    },
    {
        # web search is billed on top, at $5 per 1,000 requests
        "model": "perplexity/sonar-reasoning-pro",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 128000,
        "pricing": _usd(2.0, 8.0),
    },
    {
        # web search is billed on top, at $5 per 1,000 requests
        "model": "perplexity/sonar",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 127072,
        "pricing": _usd(1.0, 1.0),
    },
    {
        "model": "qwen/qwen3.8-max-prime",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(4.0, 12.0, cached=0.5),
    },
    {
        "model": "qwen/qwen3.8-max-0902",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(2.0, 6.0, cached=0.25),
    },
    {
        # not in the models list: OpenRouter resolves the id to qwen/qwen3.8-max-0902, and the window,
        # modalities and price are that model's Alibaba endpoints'
        "model": "qwen/qwen3.8-max",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(2.0, 6.0, cached=0.25),
    },
    {
        "model": "qwen/qwen3.8-2.4t-a95b",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(2.0, 6.0, cached=0.25),
    },
    {
        "model": "qwen/qwen3.8-flash",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.15, 0.47, cached=0.016),
    },
    {
        "model": "qwen/qwen3.8-omni-flash",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.15, 0.47, cached=0.016),
    },
    {
        # the quoted ModelRun endpoint (fp4), no discount; Alibaba's own bills $0.425 input, $2.55
        # output, $0.085 cache read
        "model": "qwen/qwen3.8-27b",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.2, 2.5, cached=0.09),
    },
    {
        # rates for prompts up to 256K tokens ($0.96 input, $3.84 output, $0.192 cache read above)
        "model": "qwen/qwen3.7-plus",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.32, 1.28, cached=0.064),
    },
    {
        # rates for prompts up to 32K tokens; $0.10 / $0.40 / $0.02 to 256K, then $0.20 / $0.80 /
        # $0.04
        "model": "qwen/qwen3.7-flash",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.03, 0.13, cached=0.006),
    },
    {
        "model": "qwen/qwen3.6-35b-a3b",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.1, 0.95, cached=0.05),
    },
    {
        "model": "qwen/qwen3-coder-next",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.12, 0.8, cached=0.07),
    },
    {
        # absent from the chat-only models API; window and price from its /endpoints list (DeepInfra)
        "model": "qwen/qwen3-embedding-4b",
        "base_url": _OPENROUTER,
        "client": "openai-embedding",
        "input_modalities": ["Text"],
        "output_modalities": ["Embed"],
        "context_window": 32768,
        "pricing": _usd(0.02, 0.0),
    },
    {
        "model": "recursive/flint-v1.0:free",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.0, 0.0),
    },
    {
        "model": "stepfun/step-5-preview",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.0, 2.7, cached=0.1),
    },
    {
        "model": "stepfun/step-3.7-flash",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.2, 1.15, cached=0.04),
    },
    {
        "model": "stepfun/step-3.5-flash",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.1, 0.3),
    },
    {
        # Tencent's endpoint at its UTC 16:00-24:00 rate; UTC 00:00-16:00 costs $0.834 input, $2.501
        # output, $0.042 cache read
        "model": "tencent/hy4-preview",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.7506, 2.2509, cached=0.0378),
    },
    {
        # Tencent's endpoint at its UTC 16:00-24:00 rate; UTC 00:00-16:00 costs $0.132 input, $0.528
        # output, $0.033 cache read
        "model": "tencent/hy3",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.0825, 0.33, cached=0.020625),
    },
    {
        # Together's endpoint, the only one
        "model": "thinkingmachines/inkling",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 524288,
        "pricing": _usd(1.0, 4.05, cached=0.17),
    },
    {
        # rates for prompts under 200K tokens; every rate doubles above
        "model": "x-ai/grok-4.7",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 500000,
        "pricing": _usd(2.0, 6.0, cached=0.5),
    },
    {
        # rates for prompts under 200K tokens; every rate doubles above
        "model": "x-ai/grok-4.6",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 500000,
        "pricing": _usd(2.0, 6.0, cached=0.5),
    },
    {
        "model": "x-ai/grok-4.5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 500000,
        "pricing": _usd(2.0, 6.0, cached=0.3),
    },
    {
        # rates for prompts under 200K tokens; every rate doubles above
        "model": "x-ai/grok-4.3",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(1.25, 2.5, cached=0.2),
    },
    {
        # rates for prompts under 200K tokens; every rate doubles above
        "model": "x-ai/grok-build-0.1",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 256000,
        "pricing": _usd(1.0, 2.0, cached=0.2),
    },
    {
        "model": "xiaomi/mimo-v2.6-pro",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(0.435, 0.87, cached=0.0036),
    },
    {
        "model": "xiaomi/mimo-v2.6-pro-ultraspeed",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(4.35, 8.7, cached=0.036),
    },
    {
        "model": "xiaomi/mimo-v2.6-flash",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(0.14, 0.28, cached=0.0028),
    },
    {
        # the quoted GMICloud endpoint runs a 30% discount ($0.3045 input, $0.609 output); Xiaomi
        # serves none
        "model": "xiaomi/mimo-v2.5-pro",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(0.435, 0.87, cached=0.004),
    },
    {
        # the quoted GMICloud endpoint runs a 15% discount ($0.119 input, $0.238 output); Xiaomi
        # serves none
        "model": "xiaomi/mimo-v2.5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(0.14, 0.28, cached=0.003),
    },
    {
        # Alibaba's endpoint, the only one
        "model": "z-ai/glm-5.3-prime",
        "base_url": _OPENROUTER,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(2.8, 8.8, cached=0.56),
    },
    {
        # the quoted Wafer endpoint, no discount; Z.AI's own bills $1.4 input, $4.4 output, $0.26
        # cache read
        "model": "z-ai/glm-5.3",
        "base_url": _OPENROUTER,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.079, 1.4, cached=0.078),
    },
    {
        "model": "z-ai/glm-5.3-flashx",
        "base_url": _OPENROUTER,
        "client": "zai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.37, 1.25, cached=0.09),
    },
    {
        "model": "z-ai/glm-5.3-flash",
        "base_url": _OPENROUTER,
        "client": "zai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.15, 0.5, cached=0.03),
    },
    {
        # the quoted Wafer endpoint, no discount; Z.AI's own bills $1.4 input, $4.4 output, $0.26
        # cache read
        "model": "z-ai/glm-5.2",
        "base_url": _OPENROUTER,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.0341, 7.0, cached=0.033),
    },
    {
        "model": "z-ai/glm-5.1",
        "base_url": _OPENROUTER,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 204800,
        "pricing": _usd(1.4, 4.4, cached=0.26),
    },
    {
        "model": "z-ai/glm-5",
        "base_url": _OPENROUTER,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 204800,
        "pricing": _usd(1.0, 3.2, cached=0.2),
    },
    {
        # the quoted Cloudflare endpoint, no discount; no cache price
        "model": "z-ai/glm-4.7-flash",
        "base_url": _OPENROUTER,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 200000,
        "pricing": _usd(0.0605, 0.4),
    },
    # SiliconFlow (CNY list prices from https://siliconflow.cn/pricing, context windows and image
    # input from the model records that page embeds, read 2026-10-19; no public pricing API).
    # Its DeepSeek Flash rows store the 02:00-08:00 (Beijing) rate, as the DeepSeek rows store
    # their off-peak rate.
    {
        # the other 18 hours cost double: 2/8/0.04 CNY
        "model": "deepseek-ai/DeepSeek-V4.1-Flash",
        "base_url": _SILICONFLOW,
        "client": "openai-chat",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(1.0, 4.0, cached=0.02),
    },
    {
        # the other 18 hours cost double: 3/9/0.3 CNY
        "model": "deepseek-ai/DeepSeek-V4-Flash",
        "base_url": _SILICONFLOW,
        "client": "openai-chat",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(1.5, 4.5, cached=0.15),
    },
    {
        "model": "deepseek-ai/DeepSeek-V4-Pro",
        "base_url": _SILICONFLOW,
        "client": "openai-chat",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(12.0, 24.0, cached=1.0),
    },
    {
        "model": "meituan-longcat/LongCat-2.0",
        "base_url": _SILICONFLOW,
        "client": "openai-chat",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(5.0, 20.0, cached=0.1),
    },
    {
        "model": "moonshotai/Kimi-K2.7-Code",
        "base_url": _SILICONFLOW,
        "client": "openai-chat",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _cny(6.5, 27.0, cached=1.3),
    },
    {
        "model": "zai-org/GLM-5.3",
        "base_url": _SILICONFLOW,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(8.0, 28.0, cached=2.0),
    },
    {
        "model": "zai-org/GLM-5.3-Flash",
        "base_url": _SILICONFLOW,
        "client": "zai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(0.8, 2.8, cached=0.23),
    },
    {
        "model": "zai-org/GLM-5.2",
        "base_url": _SILICONFLOW,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(8.0, 28.0, cached=2.0),
    },
    {
        "model": "Pro/zai-org/GLM-5.1",
        "base_url": _SILICONFLOW,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 202752,
        # list price for prompts under 32K tokens; from 32K on it is 8/28/2 CNY
        "pricing": _cny(6.0, 24.0, cached=1.3),
    },
    {
        "model": "Pro/moonshotai/Kimi-K2.6",
        "base_url": _SILICONFLOW,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _cny(6.5, 27.0, cached=1.1),
    },
    {
        "model": "Qwen/Qwen3.8-27B",
        "base_url": _SILICONFLOW,
        "client": "openai-chat",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _cny(3.0, 12.0),
    },
    {
        "model": "tencent/Hy4-preview",
        "base_url": _SILICONFLOW,
        "client": "openai-chat",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(6.0, 18.0, cached=0.3),
    },
    {
        # the pricing page's chat table does not list embedding models
        "model": "Qwen/Qwen3-Embedding-8B",
        "base_url": _SILICONFLOW,
        "client": "openai-embedding",
        "input_modalities": ["Text"],
        "output_modalities": ["Embed"],
        "context_window": 32768,
    },
    # Google Vertex AI (google-genai with a service-account JSON key, which pins location
    # "global"; list prices of the global endpoint from
    # https://cloud.google.com/vertex-ai/generative-ai/pricing, read 2026-10-19)
    {
        # a promotion runs through 2026-11-30: $2 input, $10 output, $0.1 cache read
        "model": "gemini-4-argon",
        "base_url": _VERTEX,
        "client": "google-genai",
        "input_modalities": ["Text", "Image", "Video", "Audio"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(4.0, 20.0, cached=0.2),
    },
    {
        # the intro price runs through 2026-12-31 on this row and the next: $0.75 input,
        # $3.75 output, $0.075 cache read
        "model": "gemini-3.8-flash",
        "base_url": _VERTEX,
        "client": "google-genai",
        "input_modalities": ["Text", "Image", "Video", "Audio"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.5, 7.5, cached=0.15),
    },
    {
        "model": "gemini-3.7-flash",
        "base_url": _VERTEX,
        "client": "google-genai",
        "input_modalities": ["Text", "Image", "Video", "Audio"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.5, 7.5, cached=0.15),
    },
    {
        # text and image output are billed apart ($3 and $60 per 1M), which one output rate
        # cannot carry
        "model": "gemini-3.1-flash-image",
        "base_url": _VERTEX,
        "client": "google-genai",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Image"],
    },
    {
        # not on the pricing page
        "model": "gemini-3.1-flash-tts-preview",
        "base_url": _VERTEX,
        "client": "google-genai",
        "input_modalities": ["Text"],
        "output_modalities": ["Audio"],
    },
    {
        # online text-input rate; output tokens are free
        "model": "gemini-embedding-2",
        "base_url": _VERTEX,
        "client": "google-genai",
        "input_modalities": ["Text"],
        "output_modalities": ["Embed"],
        "pricing": _usd(0.2, 0.0),
    },
    # Amazon Bedrock (anthropic-official with "ACCESS_KEY,SECRET_KEY" as the key; Global
    # cross-Region inference profiles, ids and context windows from each model card, prices of
    # the Global table for US East (N. Virginia) at https://aws.amazon.com/bedrock/pricing/, read
    # 2026-10-19; the geo profiles us./eu./jp./au. cost 10% more)
    {
        "model": "global.anthropic.claude-fable-5-1",
        "base_url": _BEDROCK,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(10.0, 50.0, cached=0.25),
    },
    {
        "model": "global.anthropic.claude-opus-5-5",
        "base_url": _BEDROCK,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(4.0, 20.0, cached=0.2),
    },
    {
        "model": "global.anthropic.claude-sonnet-5-5",
        "base_url": _BEDROCK,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(2.0, 10.0, cached=0.1),
    },
    {
        "model": "global.anthropic.claude-haiku-5-5",
        "base_url": _BEDROCK,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        # list price for prompts up to 100K tokens; every rate is 5x above it
        "pricing": _usd(0.1, 0.5, cached=0.01),
    },
    {
        "model": "global.anthropic.claude-fable-5",
        "base_url": _BEDROCK,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(10.0, 50.0, cached=1.0),
    },
    {
        "model": "global.anthropic.claude-opus-5",
        "base_url": _BEDROCK,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(5.0, 25.0, cached=0.5),
    },
    {
        "model": "global.anthropic.claude-sonnet-5",
        "base_url": _BEDROCK,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(2.0, 10.0, cached=0.2),
    },
    {
        "model": "global.anthropic.claude-opus-4-8",
        "base_url": _BEDROCK,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(5.0, 25.0, cached=0.5),
    },
    {
        "model": "global.anthropic.claude-sonnet-4-6",
        "base_url": _BEDROCK,
        "client": "anthropic-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(3.0, 15.0, cached=0.3),
    },
    # TokenDance (CNY prices at the `items` rate of the public catalog
    # https://tokendance.space/portal/api/models/all, read 2026-10-19; each row's client speaks
    # a protocol the catalog lists for the model, and its price is that protocol's)
    {
        # this row and the next take the gateway's Chat Completions path; weekday peak rates
        # (09:00-12:00, 14:00-18:00 Beijing) are double on both
        "model": "deepseek-v4.1-flash-1017",
        "base_url": _TOKENDANCE,
        "client": "openai-chat",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _cny(0.8, 3.2, cached=0.016),
    },
    {
        "model": "deepseek-v4.1-flash",
        "base_url": _TOKENDANCE,
        "client": "openai-chat",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _cny(0.8, 3.2, cached=0.016),
    },
    {
        # served over Chat Completions and Messages only, so not through deepseek-official
        "model": "deepseek-v4-pro",
        "base_url": _TOKENDANCE,
        "client": "openai-chat",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(8.1, 24.3, cached=0.27),
    },
    {
        # the catalog prices this model on Chat Completions and Messages (2.1/8.4 CNY below 512K
        # input tokens) but not on the Responses protocol minimax-official speaks
        "model": "minimax-m3",
        "base_url": _TOKENDANCE,
        "client": "minimax-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
    },
    {
        # its Chat Completions stream ends in a chunk without `delta`, which openai-chat cannot read
        "model": "minimax-m3.1-flash",
        "base_url": _TOKENDANCE_ANTHROPIC,
        "client": "ant-messages",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _cny(1.0, 4.0, cached=0.1),
    },
    {
        # catalog 2026-10-23, whose context window is 1000000 rather than Moonshot's 1048576
        "model": "kimi-k3.1-pro",
        "base_url": _TOKENDANCE,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _cny(13.0, 68.0, cached=1.3),
    },
    {
        "model": "kimi-k3",
        "base_url": _TOKENDANCE,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _cny(20.0, 100.0, cached=2.0),
    },
    {
        "model": "kimi-k2.6",
        "base_url": _TOKENDANCE,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _cny(5.2, 21.6, cached=1.04),
    },
    {
        "model": "glm-5.3",
        "base_url": _TOKENDANCE,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _cny(7.2, 25.2, cached=1.8),
    },
    {
        "model": "glm-5.3-flash",
        "base_url": _TOKENDANCE,
        "client": "zai-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _cny(0.72, 2.52, cached=0.207),
    },
    {
        "model": "glm-5.2",
        "base_url": _TOKENDANCE,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _cny(6.4, 22.4, cached=1.6),
    },
    {
        "model": "qwen3.8-flash",
        "base_url": _TOKENDANCE,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _cny(0.8, 2.7, cached=0.1),
    },
    {
        "model": "qwen3.8-max",
        "base_url": _TOKENDANCE,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _cny(10.8, 32.4, cached=1.35),
    },
    {
        "model": "mimo-v2.6-flash",
        "base_url": _TOKENDANCE,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _cny(1.0, 2.0, cached=0.02),
    },
    {
        "model": "step-5-preview",
        "base_url": _TOKENDANCE,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _cny(7.0, 20.0, cached=0.35),
    },
    {
        "model": "hy4-preview",
        "base_url": _TOKENDANCE,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1024000,
        "pricing": _cny(6.0, 18.0, cached=0.3),
    },
    {
        "model": "qwen3.7-text-embedding",
        "base_url": _TOKENDANCE,
        "client": "openai-embedding",
        "input_modalities": ["Text"],
        "output_modalities": ["Embed"],
        "context_window": 128000,
        "pricing": _cny(0.5, 0.0),
    },
]


def _convert_pricing(pricing: ModelPricing, currency: Currency) -> ModelPricing:
    if currency == "USD":
        return dict(pricing)

    converted: ModelPricing = {
        "currency": "CNY",
        "prompt_tokens": 0.0,
        "thoughts_tokens": 0.0,
        "response_tokens": 0.0,
    }
    for key in ("prompt_tokens", "thoughts_tokens", "response_tokens", "cached_tokens"):
        if key in pricing:
            converted[key] = round(pricing[key] * _CNY_PER_USD, 6)
    return converted


def list_supported_models(currency: Currency = "USD") -> list[SupportedModel]:
    """List supported models with base URL, client, modalities, context window, and pricing.

    Covers the official vendor endpoints plus OpenRouter, SiliconFlow, Google Vertex AI, Amazon
    Bedrock and TokenDance; ``client`` is the ``client_type`` token that routes the model to its protocol client.
    Prices are per million tokens for MMSP's usage buckets (cached_tokens,
    prompt_tokens, thoughts_tokens, response_tokens), stored in USD and converted to
    ``currency`` at 7 CNY/USD on request.
    """
    entries: list[SupportedModel] = []
    for entry in _SUPPORTED_MODELS:
        copied = dict(entry)
        copied["input_modalities"] = list(entry["input_modalities"])
        copied["output_modalities"] = list(entry["output_modalities"])
        if "pricing" in entry:
            copied["pricing"] = _convert_pricing(entry["pricing"], currency)
        entries.append(copied)
    return entries
