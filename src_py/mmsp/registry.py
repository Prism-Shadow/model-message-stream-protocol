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
    # official vendor endpoints
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
    # OpenRouter (USD prices, context windows and modalities from the live models API,
    # https://openrouter.ai/api/v1/models, read 2026-10-19). The API quotes one endpoint per
    # model; where that endpoint runs a promotion (a nonzero `discount` in the model's
    # /endpoints list), the row stores the model vendor's own endpoint at its undiscounted
    # rate, or the quoted endpoint's undiscounted rate when the vendor serves none there.
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
        "model": "anthropic/claude-sonnet-5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(2.0, 10.0, cached=0.2),
    },
    {
        "model": "deepseek/deepseek-v4.1-flash",
        "base_url": _OPENROUTER,
        "client": "deepseek-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.028, 0.08, cached=0.0016),
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
        # the quoted StreamLake endpoint runs a 78.34% discount ($0.376884 input, $0.753768 output)
        "model": "deepseek/deepseek-v4-pro",
        "base_url": _OPENROUTER,
        "client": "deepseek-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(1.74, 3.48, cached=0.145),
    },
    {
        # Google's launch discount halves every endpoint through 2026-12-31 (the API quotes the
        # Vertex us endpoint at $0.825 input, $4.125 output); the Google AI Studio list rate is stored
        "model": "google/gemini-3.8-flash",
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
        "model": "minimax/minimax-m3",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.3, 1.2, cached=0.06),
    },
    {
        # models API 2026-10-19: the free variant is the only OpenRouter listing of MiniMax-M3.1-Flash
        "model": "minimax/minimax-m3.1-flash:free",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0, 0),
    },
    {
        "model": "moonshotai/kimi-k3",
        "base_url": _OPENROUTER,
        "client": "moonshot-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.239, 11.936, cached=0.21),
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
        "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.0, 0.0),
    },
    {
        # models API 2026-10-19: $2 input, $10 output, $0.1 cache read, $2.5 cache write
        "model": "openai/gpt-6.1-sol",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(2.5, 10.0, cached=0.1),
    },
    {
        # models API 2026-10-19, default OpenAI endpoint, no discount: $10 input, $50 output,
        # $1 cache read, $12.5 cache write per 1M tokens
        "model": "openai/gpt-6-astra",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(12.5, 50.0, cached=1.0),
    },
    {
        # Official/OpenRouter base tier, 2026-10-14; prompt includes the cache-write premium.
        "model": "openai/gpt-6-luna",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(0.125, 0.5, cached=0.01),
    },
    {
        "model": "openai/gpt-5.6-sol",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(4.0, 20.0, cached=0.4),
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
        "model": "qwen/qwen3.8-27b",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _usd(0.24, 2.2, cached=0.05),
    },
    {
        "model": "qwen/qwen3-embedding-4b",
        "base_url": _OPENROUTER,
        "client": "openai-embedding",
        "input_modalities": ["Text"],
        "output_modalities": ["Embed"],
        "context_window": 32768,
        "pricing": _usd(0.02, 0.0),
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
        "model": "tencent/hy3",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 262144,
        "pricing": _usd(0.0825, 0.33, cached=0.020625),
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
        "model": "xiaomi/mimo-v2.5",
        "base_url": _OPENROUTER,
        "client": "openai-responses",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1050000,
        "pricing": _usd(0.14, 0.28, cached=0.0028),
    },
    {
        "model": "z-ai/glm-5.3",
        "base_url": _OPENROUTER,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.079, 1.4, cached=0.078),
    },
    {
        "model": "z-ai/glm-5.2",
        "base_url": _OPENROUTER,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 1048576,
        "pricing": _usd(0.62, 2.42, cached=0.14),
    },
    {
        # the quoted StreamLake endpoint runs a 31% discount; Z.AI's own endpoint is stored
        "model": "z-ai/glm-5.1",
        "base_url": _OPENROUTER,
        "client": "zai-official",
        "input_modalities": ["Text"],
        "output_modalities": ["Text"],
        "context_window": 204800,
        "pricing": _usd(1.4, 4.4, cached=0.26),
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
        # weekday peak rates (09:00-12:00, 14:00-18:00 Beijing) are double on this row and the next
        "model": "deepseek-v4.1-flash-1017",
        "base_url": _TOKENDANCE,
        "client": "deepseek-official",
        "input_modalities": ["Text", "Image"],
        "output_modalities": ["Text"],
        "context_window": 1000000,
        "pricing": _cny(0.8, 3.2, cached=0.016),
    },
    {
        "model": "deepseek-v4.1-flash",
        "base_url": _TOKENDANCE,
        "client": "deepseek-official",
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
