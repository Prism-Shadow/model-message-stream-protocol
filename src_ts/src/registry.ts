// Copyright 2025 Prism Shadow. and/or its affiliates
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

export type Modality = "Text" | "Image" | "Video" | "Audio" | "Embed";
export type Currency = "USD" | "CNY";

/**
 * List prices per million tokens for MMSP's usage buckets.
 *
 * Keys mirror `usage_metadata`: `cached_tokens` (cache-hit price, absent when
 * the platform publishes none), `prompt_tokens` (non-cached input), and
 * `thoughts_tokens`/`response_tokens`, which both carry the vendor's output
 * price. Values are in the currency requested from listSupportedModels.
 */
export interface ModelPricing {
  currency: Currency;
  prompt_tokens: number;
  thoughts_tokens: number;
  response_tokens: number;
  cached_tokens?: number;
}

/**
 * One supported model entry.
 *
 * (model, base_url, client) maps directly onto the AutoLLMClient constructor:
 * `new AutoLLMClient({ model, baseUrl: base_url, clientType: client })`.
 * Modalities describe what is usable through that client; `context_window` and
 * `pricing` are omitted where the platform publishes no authoritative value.
 *
 * `pricing` is always the LIST price. A running promotion is deliberately not recorded: the
 * registry's job is the catalog price, and applying a promotion is the consumer's.
 */
export interface SupportedModel {
  model: string;
  base_url: string;
  client: string;
  input_modalities: Modality[];
  output_modalities: Modality[];
  context_window?: number;
  pricing?: ModelPricing;
}

const GOOGLE = "https://generativelanguage.googleapis.com";
const ANTHROPIC = "https://api.anthropic.com";
const OPENAI = "https://api.openai.com/v1";
const ZAI = "https://api.z.ai/api/paas/v4/";
const MOONSHOT = "https://api.moonshot.cn/v1";
const DEEPSEEK = "https://api.deepseek.com";
const OPENROUTER = "https://openrouter.ai/api/v1";
const SILICONFLOW = "https://api.siliconflow.cn/v1";
const MINIMAX = "https://api.minimax.io/v1";
const VERTEX = "https://aiplatform.googleapis.com";
const BEDROCK = "bedrock://us-east-1";
const TOKENDANCE = "https://tokendance.space/gateway/v1";
const TOKENDANCE_ANTHROPIC = "https://tokendance.space/gateway";

// Display convention shared with the MMSP apps: prices are stored in USD
// (official CNY list prices pre-converted at 7 CNY/USD), so requesting CNY
// shows the vendor's numbers.
const CNY_PER_USD = 7.0;

function usd(prompt: number, output: number, cached?: number): ModelPricing {
  // thoughts and response tokens are both billed at the vendor's output price
  return {
    currency: "USD",
    prompt_tokens: prompt,
    thoughts_tokens: output,
    response_tokens: output,
    ...(cached !== undefined ? { cached_tokens: cached } : {}),
  };
}

/**
 * Declare a CNY-denominated official list price; storage stays USD (converted
 * at 7 CNY/USD).
 */
function cny(prompt: number, output: number, cached?: number): ModelPricing {
  const rate = (v: number): number => Math.round((v / CNY_PER_USD) * 1e6) / 1e6;
  return usd(
    rate(prompt),
    rate(output),
    cached !== undefined ? rate(cached) : undefined,
  );
}

// Prices in USD per million tokens (CNY list prices pre-converted at 7 CNY/USD).
// Each platform section names where its data was read and when. Gateway rows
// list only the input modalities their client can send: the OpenAI-protocol
// clients carry text and images, not video or audio.
const SUPPORTED_MODELS: SupportedModel[] = [
  // official vendor endpoints
  {
    model: "gemini-4-argon",
    base_url: GOOGLE,
    client: "google-official",
    input_modalities: ["Text", "Image", "Video", "Audio"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(4.0, 20.0, 0.2),
  },
  {
    model: "gemini-3.8-flash",
    base_url: GOOGLE,
    client: "google-official",
    input_modalities: ["Text", "Image", "Video", "Audio"],
    output_modalities: ["Text"],
    context_window: 1048576,
    // Google runs a launch discount through 2026-12-31 on this row and on the two flash
    // rows below; the list price is stored regardless, because applying a running
    // promotion belongs to the consumer, not to the registry.
    pricing: usd(1.5, 7.5, 0.15),
  },
  {
    model: "gemini-3.7-flash",
    base_url: GOOGLE,
    client: "google-official",
    input_modalities: ["Text", "Image", "Video", "Audio"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(1.5, 7.5, 0.15),
  },
  {
    model: "gemini-3.6-flash",
    base_url: GOOGLE,
    client: "google-official",
    input_modalities: ["Text", "Image", "Video", "Audio"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(1.5, 7.5, 0.15),
  },
  {
    model: "gemini-3.5-flash-lite",
    base_url: GOOGLE,
    client: "google-official",
    input_modalities: ["Text", "Image", "Video", "Audio"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(0.3, 2.5, 0.03),
  },
  {
    model: "gemini-3.5-flash",
    base_url: GOOGLE,
    client: "google-official",
    input_modalities: ["Text", "Image", "Video", "Audio"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(1.5, 9.0, 0.15),
  },
  {
    model: "gemini-3.1-flash-lite-image",
    base_url: GOOGLE,
    client: "google-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Image"],
  },
  {
    model: "gemini-3.1-flash-image",
    base_url: GOOGLE,
    client: "google-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Image"],
  },
  {
    model: "gemini-3.8-flash-tts",
    base_url: GOOGLE,
    client: "google-official",
    input_modalities: ["Text"],
    output_modalities: ["Audio"],
  },
  {
    model: "gemini-3.8-flash-lite-tts",
    base_url: GOOGLE,
    client: "google-official",
    input_modalities: ["Text"],
    output_modalities: ["Audio"],
  },
  {
    model: "gemini-3.1-flash-tts-preview",
    base_url: GOOGLE,
    client: "google-official",
    input_modalities: ["Text"],
    output_modalities: ["Audio"],
  },
  {
    model: "gemini-embedding-2",
    base_url: GOOGLE,
    client: "google-official",
    input_modalities: ["Text"],
    output_modalities: ["Embed"],
  },
  {
    // cache reads are 2.5% of the input price
    model: "claude-fable-5-1",
    base_url: ANTHROPIC,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(10.0, 50.0, 0.25),
  },
  {
    // cache reads are 5% of the input price
    model: "claude-opus-5-5",
    base_url: ANTHROPIC,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(4.0, 20.0, 0.2),
  },
  {
    model: "claude-sonnet-5-5",
    base_url: ANTHROPIC,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(2.0, 10.0, 0.1),
  },
  {
    model: "claude-haiku-5-5",
    base_url: ANTHROPIC,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    // official list price for prompts up to 100K tokens; every rate is 5x above it
    pricing: usd(0.1, 0.5, 0.01),
  },
  {
    model: "claude-fable-5",
    base_url: ANTHROPIC,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(10.0, 50.0, 1.0),
  },
  {
    model: "claude-opus-5",
    base_url: ANTHROPIC,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(5.0, 25.0, 0.5),
  },
  {
    model: "claude-sonnet-5",
    base_url: ANTHROPIC,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(2.0, 10.0, 0.2),
  },
  {
    model: "claude-opus-4-8",
    base_url: ANTHROPIC,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(5.0, 25.0, 0.5),
  },
  {
    model: "claude-sonnet-4-6",
    base_url: ANTHROPIC,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(3.0, 15.0, 0.3),
  },
  {
    // official list price per 1M tokens: $0.1 cached input, $2 uncached input, $2.5 cache
    // writes, $10 output, above 272K input tokens 2x input and cache and 1.5x output. The
    // prompt bucket carries the cache-write rate, as for gpt-6-astra.
    model: "gpt-6.1-sol",
    base_url: OPENAI,
    client: "openai-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(2.5, 10.0, 0.1),
  },
  {
    // official list price per 1M tokens: $1 cached input, $10 uncached input, $12.5 cache
    // writes, $50 output, all doubled above 272K input tokens except output, which is 1.5x.
    // The prompt bucket carries the cache-write rate: the usage buckets do not separate
    // cache-written input from plain input.
    model: "gpt-6-astra",
    base_url: OPENAI,
    client: "openai-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(12.5, 50.0, 1.0),
  },
  {
    // Official/OpenRouter base tier, 2026-10-14; prompt includes the cache-write premium.
    model: "gpt-6-luna",
    base_url: OPENAI,
    client: "openai-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(0.125, 0.5, 0.01),
  },
  {
    // official standard-tier list price; the bare gpt-5.6 alias also routes here
    model: "gpt-5.6-sol",
    base_url: OPENAI,
    client: "openai-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(5.0, 30.0, 0.5),
  },
  {
    model: "gpt-5.6-terra",
    base_url: OPENAI,
    client: "openai-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(2.0, 12.0, 0.2),
  },
  {
    model: "gpt-5.6-luna",
    base_url: OPENAI,
    client: "openai-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(0.2, 1.2, 0.02),
  },
  {
    model: "gpt-5.5",
    base_url: OPENAI,
    client: "openai-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(5.0, 30.0, 0.5),
  },
  {
    model: "MiniMax-M3",
    base_url: MINIMAX,
    client: "minimax-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    // official list price for the <=512K-input tier; rates double above it
    pricing: usd(0.3, 1.2, 0.06),
  },
  {
    // official pay-as-you-go list price, one tier (guides/pricing-paygo, 2026-10-19)
    model: "MiniMax-M3.1-Flash",
    base_url: MINIMAX,
    client: "minimax-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(0.15, 0.6, 0.015),
  },
  {
    model: "text-embedding-3-large",
    base_url: OPENAI,
    client: "openai-official",
    input_modalities: ["Text"],
    output_modalities: ["Embed"],
    pricing: usd(0.13, 0.0),
  },
  {
    model: "glm-5.3",
    base_url: ZAI,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(1.4, 4.4, 0.26),
  },
  {
    model: "glm-5.3-flash",
    base_url: ZAI,
    client: "zai-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    // official list price (verified 2026-08-26); a launch discount halves all three
    // rates through 2026-09-09 (UTC+8)
    pricing: usd(0.15, 0.5, 0.03),
  },
  {
    model: "glm-5.2",
    base_url: ZAI,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(1.4, 4.4, 0.26),
  },
  {
    model: "glm-5.1",
    base_url: ZAI,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 200000,
    pricing: usd(1.4, 4.4, 0.26),
  },
  {
    // official list price (2026-10-23); the default 5m cache write costs the input price, so
    // the prompt bucket is exact; only the 1h write of prompt_caching enhance costs 2x
    model: "kimi-k3.1-pro",
    base_url: MOONSHOT,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(13.0, 68.0, 1.3),
  },
  {
    // image input verified live 2026-10-23; the cache-hit price is the standard model's
    model: "kimi-k3.1-pro-highspeed",
    base_url: MOONSHOT,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(26.0, 136.0, 1.3),
  },
  {
    model: "kimi-k3",
    base_url: MOONSHOT,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(20.0, 100.0, 2.0),
  },
  {
    model: "kimi-k2.6",
    base_url: MOONSHOT,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 262144,
    pricing: cny(6.5, 27.0, 1.1),
  },
  {
    // DeepSeek-V4.1-Flash; DeepSeek also serves deepseek-v4-flash and
    // deepseek-v4-flash-vision-exp with it, at this price (official page 2026-09-30)
    model: "deepseek-flash",
    base_url: DEEPSEEK,
    client: "deepseek-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    // official off-peak list price; peak-hour rates (Beijing 9:00-12:00, 14:00-18:00,
    // weekdays) are double
    pricing: cny(1.0, 4.0, 0.02),
  },
  {
    model: "deepseek-v4-flash",
    base_url: DEEPSEEK,
    client: "deepseek-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    // official off-peak list price effective 2026-09-10 (verified 2026-09-08 against
    // the official adjustment); peak-hour rates (Beijing 9:00-12:00, 14:00-18:00) are
    // double
    pricing: cny(1.0, 4.0, 0.02),
  },
  {
    model: "deepseek-v4-flash-vision-exp",
    base_url: DEEPSEEK,
    client: "deepseek-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    // priced as deepseek-v4-flash; official off-peak list price effective 2026-09-10
    // (verified 2026-09-08 against the official adjustment), and peak-hour rates
    // (Beijing 9:00-12:00, 14:00-18:00) are double
    pricing: cny(1.0, 4.0, 0.02),
  },
  {
    model: "deepseek-v4-pro",
    base_url: DEEPSEEK,
    client: "deepseek-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    // official off-peak list price (verified 2026-08-18); peak-hour rates
    // (Beijing 9:00-12:00, 14:00-18:00) are double
    pricing: cny(4.5, 13.5, 0.15),
  },
  // OpenRouter (USD prices, context windows and modalities from the live models API,
  // https://openrouter.ai/api/v1/models, read 2026-10-19). The API quotes one endpoint per
  // model; where that endpoint runs a promotion (a nonzero `discount` in the model's
  // /endpoints list), the row stores the model vendor's own endpoint at its undiscounted
  // rate, or the quoted endpoint's undiscounted rate when the vendor serves none there.
  {
    model: "anthropic/claude-fable-5.1",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(10.0, 50.0, 0.25),
  },
  {
    model: "anthropic/claude-opus-5.5",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(4.0, 20.0, 0.2),
  },
  {
    model: "anthropic/claude-sonnet-5.5",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(2.0, 10.0, 0.1),
  },
  {
    model: "anthropic/claude-haiku-5.5",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(0.1, 0.5, 0.01),
  },
  {
    model: "anthropic/claude-fable-5",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(10.0, 50.0, 1.0),
  },
  {
    model: "anthropic/claude-opus-5",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(5.0, 25.0, 0.5),
  },
  {
    model: "anthropic/claude-opus-4.8",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(5.0, 25.0, 0.5),
  },
  {
    model: "anthropic/claude-opus-4.7",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(5.0, 25.0, 0.5),
  },
  {
    model: "anthropic/claude-sonnet-5",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(2.0, 10.0, 0.2),
  },
  {
    model: "deepseek/deepseek-v4.1-flash",
    base_url: OPENROUTER,
    client: "deepseek-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(0.028, 0.08, 0.0016),
  },
  {
    // DeepSeek's own endpoint; its weekday peak hours (UTC 01:00-04:00, 06:00-10:00) cost double
    model: "deepseek/deepseek-v4.1-flash-1017",
    base_url: OPENROUTER,
    client: "deepseek-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(0.15, 0.6, 0.003),
  },
  {
    // the quoted GMICloud endpoint runs a 35% discount ($0.091 input, $0.182 output)
    model: "deepseek/deepseek-v4-flash",
    base_url: OPENROUTER,
    client: "deepseek-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(0.14, 0.28, 0.028),
  },
  {
    // the quoted StreamLake endpoint runs a 78.34% discount ($0.376884 input, $0.753768 output)
    model: "deepseek/deepseek-v4-pro",
    base_url: OPENROUTER,
    client: "deepseek-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(1.74, 3.48, 0.145),
  },
  {
    // Google's launch discount halves every endpoint through 2026-12-31 (the API quotes the
    // Vertex us endpoint at $0.825 input, $4.125 output); the Google AI Studio list rate is stored
    model: "google/gemini-3.8-flash",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(1.5, 7.5, 0.15),
  },
  {
    model: "google/gemini-3.5-flash",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(1.5, 9.0, 0.15),
  },
  {
    model: "minimax/minimax-m3",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(0.3, 1.2, 0.06),
  },
  {
    // models API 2026-10-19: the free variant is the only OpenRouter listing of MiniMax-M3.1-Flash
    model: "minimax/minimax-m3.1-flash:free",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(0, 0),
  },
  {
    // models API 2026-10-23; the slug's `moonshotai/highspeed` endpoint (4/20/0.2) is a
    // provider route, not a model id
    model: "moonshotai/kimi-k3.1-pro",
    base_url: OPENROUTER,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(2.0, 10.0, 0.2),
  },
  {
    // models API 2026-10-23
    model: "moonshotai/kimi-k3",
    base_url: OPENROUTER,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(0.239, 10.8, 0.21),
  },
  {
    model: "moonshotai/kimi-k2.6",
    base_url: OPENROUTER,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 262144,
    pricing: usd(0.65, 3.41, 0.15),
  },
  {
    model: "nvidia/nemotron-3-ultra-550b-a55b:free",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(0.0, 0.0),
  },
  {
    // models API 2026-10-19: $2 input, $10 output, $0.1 cache read, $2.5 cache write
    model: "openai/gpt-6.1-sol",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(2.5, 10.0, 0.1),
  },
  {
    // models API 2026-10-19, default OpenAI endpoint, no discount: $10 input, $50 output,
    // $1 cache read, $12.5 cache write per 1M tokens
    model: "openai/gpt-6-astra",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(12.5, 50.0, 1.0),
  },
  {
    // Official/OpenRouter base tier, 2026-10-14; prompt includes the cache-write premium.
    model: "openai/gpt-6-luna",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(0.125, 0.5, 0.01),
  },
  {
    model: "openai/gpt-5.6-sol",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(4.0, 20.0, 0.4),
  },
  {
    model: "openai/gpt-5.6-terra",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(2.0, 12.0, 0.2),
  },
  {
    model: "openai/gpt-5.6-luna",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(0.2, 1.2, 0.02),
  },
  {
    model: "openai/gpt-5.5",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(5.0, 30.0, 0.5),
  },
  {
    model: "qwen/qwen3.8-27b",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(0.24, 2.2, 0.05),
  },
  {
    model: "qwen/qwen3-embedding-4b",
    base_url: OPENROUTER,
    client: "openai-embedding",
    input_modalities: ["Text"],
    output_modalities: ["Embed"],
    context_window: 32768,
    pricing: usd(0.02, 0.0),
  },
  {
    model: "stepfun/step-3.7-flash",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 262144,
    pricing: usd(0.2, 1.15, 0.04),
  },
  {
    model: "tencent/hy3",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 262144,
    pricing: usd(0.0825, 0.33, 0.020625),
  },
  {
    model: "x-ai/grok-4.5",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 500000,
    pricing: usd(2.0, 6.0, 0.3),
  },
  {
    model: "xiaomi/mimo-v2.5",
    base_url: OPENROUTER,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1050000,
    pricing: usd(0.14, 0.28, 0.0028),
  },
  {
    model: "z-ai/glm-5.3",
    base_url: OPENROUTER,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(0.079, 1.4, 0.078),
  },
  {
    model: "z-ai/glm-5.2",
    base_url: OPENROUTER,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(0.62, 2.42, 0.14),
  },
  {
    // the quoted StreamLake endpoint runs a 31% discount; Z.AI's own endpoint is stored
    model: "z-ai/glm-5.1",
    base_url: OPENROUTER,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 204800,
    pricing: usd(1.4, 4.4, 0.26),
  },
  // SiliconFlow (CNY list prices from https://siliconflow.cn/pricing, context windows and image
  // input from the model records that page embeds, read 2026-10-19; no public pricing API).
  // Its DeepSeek Flash rows store the 02:00-08:00 (Beijing) rate, as the DeepSeek rows store
  // their off-peak rate.
  {
    // the other 18 hours cost double: 2/8/0.04 CNY
    model: "deepseek-ai/DeepSeek-V4.1-Flash",
    base_url: SILICONFLOW,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(1.0, 4.0, 0.02),
  },
  {
    // the other 18 hours cost double: 3/9/0.3 CNY
    model: "deepseek-ai/DeepSeek-V4-Flash",
    base_url: SILICONFLOW,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(1.5, 4.5, 0.15),
  },
  {
    model: "deepseek-ai/DeepSeek-V4-Pro",
    base_url: SILICONFLOW,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(12.0, 24.0, 1.0),
  },
  {
    model: "meituan-longcat/LongCat-2.0",
    base_url: SILICONFLOW,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(5.0, 20.0, 0.1),
  },
  {
    model: "moonshotai/Kimi-K2.7-Code",
    base_url: SILICONFLOW,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 262144,
    pricing: cny(6.5, 27.0, 1.3),
  },
  {
    model: "zai-org/GLM-5.3",
    base_url: SILICONFLOW,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(8.0, 28.0, 2.0),
  },
  {
    model: "zai-org/GLM-5.3-Flash",
    base_url: SILICONFLOW,
    client: "zai-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(0.8, 2.8, 0.23),
  },
  {
    model: "zai-org/GLM-5.2",
    base_url: SILICONFLOW,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(8.0, 28.0, 2.0),
  },
  {
    model: "Pro/zai-org/GLM-5.1",
    base_url: SILICONFLOW,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 202752,
    // list price for prompts under 32K tokens; from 32K on it is 8/28/2 CNY
    pricing: cny(6.0, 24.0, 1.3),
  },
  {
    model: "Pro/moonshotai/Kimi-K2.6",
    base_url: SILICONFLOW,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 262144,
    pricing: cny(6.5, 27.0, 1.1),
  },
  {
    model: "Qwen/Qwen3.8-27B",
    base_url: SILICONFLOW,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 262144,
    pricing: cny(3.0, 12.0),
  },
  {
    model: "tencent/Hy4-preview",
    base_url: SILICONFLOW,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(6.0, 18.0, 0.3),
  },
  {
    // the pricing page's chat table does not list embedding models
    model: "Qwen/Qwen3-Embedding-8B",
    base_url: SILICONFLOW,
    client: "openai-embedding",
    input_modalities: ["Text"],
    output_modalities: ["Embed"],
    context_window: 32768,
  },
  // Google Vertex AI (google-genai with a service-account JSON key, which pins location
  // "global"; list prices of the global endpoint from
  // https://cloud.google.com/vertex-ai/generative-ai/pricing, read 2026-10-19)
  {
    // a promotion runs through 2026-11-30: $2 input, $10 output, $0.1 cache read
    model: "gemini-4-argon",
    base_url: VERTEX,
    client: "google-genai",
    input_modalities: ["Text", "Image", "Video", "Audio"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(4.0, 20.0, 0.2),
  },
  {
    // the intro price runs through 2026-12-31 on this row and the next: $0.75 input,
    // $3.75 output, $0.075 cache read
    model: "gemini-3.8-flash",
    base_url: VERTEX,
    client: "google-genai",
    input_modalities: ["Text", "Image", "Video", "Audio"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(1.5, 7.5, 0.15),
  },
  {
    model: "gemini-3.7-flash",
    base_url: VERTEX,
    client: "google-genai",
    input_modalities: ["Text", "Image", "Video", "Audio"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: usd(1.5, 7.5, 0.15),
  },
  {
    // text and image output are billed apart ($3 and $60 per 1M), which one output rate
    // cannot carry
    model: "gemini-3.1-flash-image",
    base_url: VERTEX,
    client: "google-genai",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Image"],
  },
  {
    // not on the pricing page
    model: "gemini-3.1-flash-tts-preview",
    base_url: VERTEX,
    client: "google-genai",
    input_modalities: ["Text"],
    output_modalities: ["Audio"],
  },
  {
    // online text-input rate; output tokens are free
    model: "gemini-embedding-2",
    base_url: VERTEX,
    client: "google-genai",
    input_modalities: ["Text"],
    output_modalities: ["Embed"],
    pricing: usd(0.2, 0.0),
  },
  // Amazon Bedrock (anthropic-official with "ACCESS_KEY,SECRET_KEY" as the key; Global
  // cross-Region inference profiles, ids and context windows from each model card, prices of
  // the Global table for US East (N. Virginia) at https://aws.amazon.com/bedrock/pricing/, read
  // 2026-10-19; the geo profiles us./eu./jp./au. cost 10% more)
  {
    model: "global.anthropic.claude-fable-5-1",
    base_url: BEDROCK,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(10.0, 50.0, 0.25),
  },
  {
    model: "global.anthropic.claude-opus-5-5",
    base_url: BEDROCK,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(4.0, 20.0, 0.2),
  },
  {
    model: "global.anthropic.claude-sonnet-5-5",
    base_url: BEDROCK,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(2.0, 10.0, 0.1),
  },
  {
    model: "global.anthropic.claude-haiku-5-5",
    base_url: BEDROCK,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    // list price for prompts up to 100K tokens; every rate is 5x above it
    pricing: usd(0.1, 0.5, 0.01),
  },
  {
    model: "global.anthropic.claude-fable-5",
    base_url: BEDROCK,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(10.0, 50.0, 1.0),
  },
  {
    model: "global.anthropic.claude-opus-5",
    base_url: BEDROCK,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(5.0, 25.0, 0.5),
  },
  {
    model: "global.anthropic.claude-sonnet-5",
    base_url: BEDROCK,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(2.0, 10.0, 0.2),
  },
  {
    model: "global.anthropic.claude-opus-4-8",
    base_url: BEDROCK,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(5.0, 25.0, 0.5),
  },
  {
    model: "global.anthropic.claude-sonnet-4-6",
    base_url: BEDROCK,
    client: "anthropic-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: usd(3.0, 15.0, 0.3),
  },
  // --- TokenDance (61 rows; CNY prices at the `items` rate of the public catalog
  // https://tokendance.space/portal/api/models/all, read 2026-10-24; each row's client speaks
  // a protocol the catalog lists for the model, and its price is that protocol's, at the lowest
  // tier where the catalog tiers it by prompt length)
  {
    // this row and the next take the gateway's Chat Completions path; weekday peak rates
    // (09:00-12:00, 14:00-18:00 Beijing) are double on both
    model: "deepseek-v4.1-flash-1017",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(0.8, 3.2, 0.016),
  },
  {
    model: "deepseek-v4.1-flash",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(0.8, 3.2, 0.016),
  },
  {
    // served over Chat Completions and Messages only, so not through deepseek-official
    model: "deepseek-v4-pro",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(8.1, 24.3, 0.27),
  },
  {
    // weekday peak rates (09:00-12:00, 14:00-18:00 Beijing) are 7.2/21.6/0.24 CNY
    model: "deepseek-v4-pro-0813",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(4.5, 13.5, 0.15),
  },
  {
    // weekday peak rates (09:00-12:00, 14:00-18:00 Beijing) are 2.4/7.2/0.08 CNY
    model: "deepseek-v4-flash-0731",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(1.5, 4.5, 0.05),
  },
  {
    // the Chat Completions price names its output rate `output_tokens`; the Messages price is
    // the same 1/2/0.2 CNY
    model: "deepseek-v4-flash",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(1.0, 2.0, 0.2),
  },
  {
    // the catalog prices this model on Chat Completions and Messages (2.1/8.4 CNY below 512K
    // input tokens) but not on the Responses protocol minimax-official speaks
    model: "minimax-m3",
    base_url: TOKENDANCE,
    client: "minimax-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
  },
  {
    // its Chat Completions stream ends in a chunk without `delta`, which openai-chat cannot read
    model: "minimax-m3.1-flash",
    base_url: TOKENDANCE_ANTHROPIC,
    client: "ant-messages",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(1.0, 4.0, 0.1),
  },
  {
    // this row and the next follow minimax-m3.1-flash onto Messages, assuming the gateway's
    // Chat Completions stream ends without `delta` for them too
    model: "minimax-m2.7",
    base_url: TOKENDANCE_ANTHROPIC,
    client: "ant-messages",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 200000,
    pricing: cny(1.68, 6.72, 0.336),
  },
  {
    model: "minimax-m2.5",
    base_url: TOKENDANCE_ANTHROPIC,
    client: "ant-messages",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 200000,
    pricing: cny(1.89, 7.56, 0.189),
  },
  {
    // catalog 2026-10-23, whose context window is 1000000 rather than Moonshot's 1048576
    model: "kimi-k3.1-pro",
    base_url: TOKENDANCE,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(13.0, 68.0, 1.3),
  },
  {
    model: "kimi-k3",
    base_url: TOKENDANCE,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(20.0, 100.0, 2.0),
  },
  {
    model: "kimi-k2.7-code",
    base_url: TOKENDANCE,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 262144,
    pricing: cny(5.2, 21.6, 1.04),
  },
  {
    model: "kimi-k2.6",
    base_url: TOKENDANCE,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 262144,
    pricing: cny(5.2, 21.6, 1.04),
  },
  {
    model: "kimi-k2.5",
    base_url: TOKENDANCE,
    client: "moonshot-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(4.0, 21.0, 0.8),
  },
  {
    model: "glm-5.3",
    base_url: TOKENDANCE,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(7.2, 25.2, 1.8),
  },
  {
    model: "glm-5.3-flash",
    base_url: TOKENDANCE,
    client: "zai-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(0.72, 2.52, 0.207),
  },
  {
    // zai-official sends images for every glm-5.3-flash id, this one included
    model: "glm-5.3-flashx",
    base_url: TOKENDANCE,
    client: "zai-official",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(2.0, 7.0, 0.57),
  },
  {
    model: "glm-5.2",
    base_url: TOKENDANCE,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(6.4, 22.4, 1.6),
  },
  {
    model: "glm-5.1",
    base_url: TOKENDANCE,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 202752,
    pricing: cny(7.2, 25.2, 1.8),
  },
  {
    // prompts up to 32K tokens; 6/22/1.2 CNY above
    model: "glm-5",
    base_url: TOKENDANCE,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 200000,
    pricing: cny(4.0, 18.0, 0.8),
  },
  {
    // openai-chat, which forwards images, as zai-official does only for glm-5.3-flash ids;
    // prompts up to 32K tokens, 7/26/1.8 CNY above
    model: "glm-5v-turbo",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 202752,
    pricing: cny(5.0, 22.0, 1.2),
  },
  {
    // prompts up to 32K tokens; 4/16/0.8 CNY above
    model: "glm-4.7",
    base_url: TOKENDANCE,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 200000,
    pricing: cny(3.0, 14.0, 0.6),
  },
  {
    // openai-chat for its images, as glm-5v-turbo; prompts up to 32K tokens, 2/6/0.4 CNY above
    model: "glm-4.6v",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 128000,
    pricing: cny(1.0, 3.0, 0.2),
  },
  {
    // prompts up to 32K tokens; 1.2/8/0.24 CNY above
    model: "glm-4.5-air",
    base_url: TOKENDANCE,
    client: "zai-official",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 128000,
    pricing: cny(0.8, 6.0, 0.16),
  },
  {
    model: "qwen3.8-flash",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(0.8, 2.7, 0.1),
  },
  {
    model: "qwen3.8-max",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(10.8, 32.4, 1.35),
  },
  {
    model: "qwen3.8-max-0902",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(12.0, 36.0, 1.5),
  },
  {
    model: "qwen3.7-max",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(9.6, 28.8, 1.92),
  },
  {
    // prompts up to 256K tokens; 4.8/19.2/0.96 CNY above
    model: "qwen3.7-plus",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(1.6, 6.4, 0.32),
  },
  {
    // prompts up to 256K tokens, 6.4/38.4/0.64 CNY above; the catalog names the output rate
    // `output_tokens`
    model: "qwen3.6-plus",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(1.6, 9.6, 0.16),
  },
  {
    // prompts up to 128K tokens; 2/12/0.2 CNY to 256K and 4/24/0.4 above, and cache writes
    // cost 1, 2.5 and 5 CNY by the same tiers
    model: "qwen3.5-plus",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(0.8, 4.8, 0.08),
  },
  {
    // prompts up to 128K tokens; 0.8/8/0.08 CNY to 256K and 1.2/12/0.12 above
    model: "qwen3.5-flash",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(0.2, 2.0, 0.02),
  },
  {
    // prompts up to 128K tokens; 1.6/12.8 CNY above
    model: "qwen3.5-35b-a3b",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(0.4, 3.2),
  },
  {
    // prompts up to 32K tokens; 1.5/15/0.3 CNY to 128K and 3/30/0.6 above
    model: "qwen3-vl-plus",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(1.0, 10.0, 0.2),
  },
  {
    model: "mimo-v2.6-flash",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(1.0, 2.0, 0.02),
  },
  {
    model: "mimo-v2.6-pro",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(3.0, 6.0, 0.025),
  },
  {
    model: "mimo-v2.6-ultraspeed",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(30.0, 60.0, 0.25),
  },
  {
    model: "mimo-v2.5-pro",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(3.0, 6.0, 0.025),
  },
  {
    // the Responses price names its output rate `text_output_tokens`; Chat Completions lists
    // the same 1/2/0.02 CNY
    model: "mimo-v2.5",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1048576,
    pricing: cny(1.0, 2.0, 0.02),
  },
  {
    model: "step-5-preview",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(7.0, 20.0, 0.35),
  },
  {
    // openai-chat: the catalog prices Chat Completions only, though it also lists Responses
    // and Messages
    model: "step-3.7-flash",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(1.08, 6.48, 0.216),
  },
  {
    model: "step-3.5-flash",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(0.7, 2.1, 0.14),
  },
  {
    model: "hy4-preview",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1024000,
    pricing: cny(6.0, 18.0, 0.3),
  },
  {
    model: "hy3",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(1.0, 4.0, 0.25),
  },
  {
    // prompts up to 16K tokens; 1.6/6.4/0.6 CNY to 32K and 2/8/0.8 above
    model: "hy3-preview",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(1.2, 4.0, 0.4),
  },
  {
    model: "seed-2.1-pro",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(3.0, 15.0, 0.6),
  },
  {
    model: "seed-2.1-turbo",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(1.5, 7.5, 0.3),
  },
  {
    // prompts up to 32K tokens on this row and the next; 2.4/12/0.48 CNY to 128K and
    // 4.8/24/0.96 above
    model: "seed-2.0-pro",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(1.6, 8.0, 0.32),
  },
  {
    model: "seed-2.0-code",
    base_url: TOKENDANCE,
    client: "openai-responses",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(1.6, 8.0, 0.32),
  },
  {
    // prompts up to 32K tokens; 0.45/2.7/0.09 CNY to 128K and 0.9/5.4/0.18 above
    model: "seed-2.0-lite",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(0.3, 1.8, 0.06),
  },
  {
    // prompts up to 32K tokens; 0.2/2/0.04 CNY to 128K and 0.4/4/0.08 above
    model: "seed-2.0-mini",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(0.1, 1.0, 0.02),
  },
  {
    model: "seed-evolving",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(3.0, 15.0, 0.6),
  },
  {
    model: "longcat-2.0",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(2.0, 8.0, 0.04),
  },
  {
    model: "ling-3.1-flash",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(0.5, 1.5, 0.1),
  },
  {
    model: "ling-3.0-flash",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 256000,
    pricing: cny(0.14, 0.42, 0.028),
  },
  {
    model: "spark-x2.5-4b",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(0.0, 0.0, 0.0),
  },
  {
    model: "spark-x2.5-1.7b",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text"],
    output_modalities: ["Text"],
    context_window: 1000000,
    pricing: cny(0.0, 0.0, 0.0),
  },
  {
    model: "dots-3-note-preview",
    base_url: TOKENDANCE,
    client: "openai-chat",
    input_modalities: ["Text", "Image"],
    output_modalities: ["Text"],
    context_window: 512000,
    pricing: cny(0.0, 0.0, 0.0),
  },
  {
    model: "qwen3.7-text-embedding",
    base_url: TOKENDANCE,
    client: "openai-embedding",
    input_modalities: ["Text"],
    output_modalities: ["Embed"],
    context_window: 128000,
    pricing: cny(0.5, 0.0),
  },
  {
    model: "qwen-text-embedding-v4",
    base_url: TOKENDANCE,
    client: "openai-embedding",
    input_modalities: ["Text"],
    output_modalities: ["Embed"],
    context_window: 8000,
    pricing: cny(0.5, 0.0),
  },
];

function convertPricing(
  pricing: ModelPricing,
  currency: Currency,
): ModelPricing {
  if (currency === "USD") {
    return { ...pricing };
  }

  const round = (v: number): number => Math.round(v * CNY_PER_USD * 1e6) / 1e6;
  return {
    currency: "CNY",
    prompt_tokens: round(pricing.prompt_tokens),
    thoughts_tokens: round(pricing.thoughts_tokens),
    response_tokens: round(pricing.response_tokens),
    ...(pricing.cached_tokens !== undefined
      ? { cached_tokens: round(pricing.cached_tokens) }
      : {}),
  };
}

/**
 * List supported models with base URL, client, modalities, context window, and
 * pricing.
 *
 * Covers the official vendor endpoints plus OpenRouter, SiliconFlow, Google
 * Vertex AI, Amazon Bedrock and TokenDance; `client` is the `clientType` token
 * that routes the model to its protocol client. Prices are per million tokens for MMSP's usage buckets
 * (cached_tokens, prompt_tokens, thoughts_tokens, response_tokens), stored in
 * USD and converted to `currency` at 7 CNY/USD on request.
 */
export function listSupportedModels(
  currency: Currency = "USD",
): SupportedModel[] {
  return SUPPORTED_MODELS.map((entry) => ({
    ...entry,
    input_modalities: [...entry.input_modalities],
    output_modalities: [...entry.output_modalities],
    ...(entry.pricing
      ? { pricing: convertPricing(entry.pricing, currency) }
      : {}),
  }));
}
