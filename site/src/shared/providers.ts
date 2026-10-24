// Who serves an endpoint and who made a model, from the base URL and the model id alone: the
// catalog's columns at build time, and the status page's names for whatever the probe reports,
// in the browser.
import type { Locale } from "./i18n";

type Text = Record<Locale, string>;

export interface Provider {
  id: string;
  name: string;
  mark?: string;
  keyEnv: string;
  // what the key variable holds, where it is not a plain token, and what to export in its place
  keyHint?: Text;
  keyValue?: string;
  // the vendor's own endpoint, which its official client calls by default
  official?: { client: string; baseUrl: string };
}

export interface Vendor {
  id: string;
  name: string;
  mark?: string;
}

// keyed by the start of the base URL; an endpoint none of them serves is named by its host
export const PROVIDERS: (Provider & { prefixes: string[] })[] = [
  {
    id: "openai",
    name: "OpenAI",
    mark: "openai",
    prefixes: ["https://api.openai.com"],
    keyEnv: "OPENAI_API_KEY",
    official: { client: "openai-official", baseUrl: "https://api.openai.com/v1" },
  },
  {
    id: "anthropic",
    name: "Anthropic",
    mark: "anthropic",
    prefixes: ["https://api.anthropic.com"],
    keyEnv: "ANTHROPIC_API_KEY",
    official: { client: "anthropic-official", baseUrl: "https://api.anthropic.com" },
  },
  {
    id: "google",
    name: "Gemini API",
    mark: "gemini",
    prefixes: ["https://generativelanguage.googleapis.com"],
    keyEnv: "GEMINI_API_KEY",
    official: { client: "google-official", baseUrl: "https://generativelanguage.googleapis.com" },
  },
  {
    id: "zai",
    name: "Z.ai",
    mark: "zai",
    prefixes: ["https://api.z.ai"],
    keyEnv: "ZAI_API_KEY",
    official: { client: "zai-official", baseUrl: "https://api.z.ai/api/paas/v4/" },
  },
  {
    id: "moonshot",
    name: "Moonshot",
    mark: "moonshot",
    prefixes: ["https://api.moonshot.cn", "https://api.moonshot.ai"],
    keyEnv: "MOONSHOT_API_KEY",
    official: { client: "moonshot-official", baseUrl: "https://api.moonshot.cn/v1" },
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    mark: "deepseek",
    prefixes: ["https://api.deepseek.com"],
    keyEnv: "DEEPSEEK_API_KEY",
    official: { client: "deepseek-official", baseUrl: "https://api.deepseek.com" },
  },
  {
    id: "minimax",
    name: "MiniMax",
    mark: "minimax",
    prefixes: ["https://api.minimax.io", "https://api.minimaxi.com"],
    keyEnv: "MINIMAX_API_KEY",
    official: { client: "minimax-official", baseUrl: "https://api.minimax.io/v1" },
  },
  { id: "openrouter", name: "OpenRouter", mark: "openrouter", prefixes: ["https://openrouter.ai"], keyEnv: "OPENROUTER_API_KEY" },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    mark: "siliconflow",
    prefixes: ["https://api.siliconflow.cn", "https://api.siliconflow.com"],
    keyEnv: "SILICONFLOW_API_KEY",
  },
  { id: "tokendance", name: "TokenDance", mark: "tokendance", prefixes: ["https://tokendance.space/gateway"], keyEnv: "TOKENDANCE_API_KEY" },
  {
    id: "vertex",
    name: "Vertex AI",
    mark: "vertex",
    prefixes: ["https://aiplatform.googleapis.com"],
    keyEnv: "VERTEX_API_KEY",
    keyHint: { en: "service-account JSON", zh: "服务账号 JSON" },
    keyValue: '"$(cat service-account.json)"',
  },
  {
    id: "bedrock",
    name: "Amazon Bedrock",
    mark: "bedrock",
    prefixes: ["bedrock://"],
    keyEnv: "BEDROCK_API_KEY",
    keyHint: { en: "ACCESS,SECRET", zh: "ACCESS,SECRET" },
    keyValue: "ACCESS,SECRET",
  },
];

export function providerOf(baseUrl: string): Provider {
  const known = PROVIDERS.find((provider) => provider.prefixes.some((prefix) => baseUrl.startsWith(prefix)));
  if (known) return known;
  let host = baseUrl;
  try {
    host = new URL(baseUrl).hostname;
  } catch {}
  // api.modelverse.cn reads MODELVERSE_API_KEY, as the test catalog names it
  const label = host.split(".").at(-2) ?? "";
  return { id: host, name: host, keyEnv: /^[a-z][a-z0-9-]*$/.test(label) ? `${label.replaceAll("-", "_").toUpperCase()}_API_KEY` : "API_KEY" };
}

// the maker of a model, from its id as any provider spells it: `claude-opus-5-5`,
// `anthropic/claude-opus-5.5`, `global.anthropic.claude-opus-5-5`
const VENDORS: [RegExp, Vendor][] = [
  [/anthropic|claude/, { id: "anthropic", name: "Anthropic", mark: "anthropic" }],
  [/(^|\/)(openai\/|gpt-|text-embedding-)/, { id: "openai", name: "OpenAI", mark: "openai" }],
  [/(^|\/)(google\/|gemini|gemma)/, { id: "google", name: "Google", mark: "gemini" }],
  [/deepseek/, { id: "deepseek", name: "DeepSeek", mark: "deepseek" }],
  [/(^|\/)(z-ai\/|zai-org\/|glm)/, { id: "zai", name: "Z.ai", mark: "zai" }],
  [/moonshotai\/|(^|\/)kimi/, { id: "moonshot", name: "Moonshot AI", mark: "moonshot" }],
  [/minimax/, { id: "minimax", name: "MiniMax", mark: "minimax" }],
  [/qwen/, { id: "qwen", name: "Qwen", mark: "qwen" }],
  [/nvidia\/|nemotron/, { id: "nvidia", name: "NVIDIA", mark: "nvidia" }],
  [/stepfun\/|(^|\/)step-/, { id: "stepfun", name: "StepFun", mark: "stepfun" }],
  [/tencent\/|hunyuan|(^|\/)hy\d/, { id: "tencent", name: "Tencent", mark: "hunyuan" }],
  [/x-ai\/|grok/, { id: "xai", name: "xAI", mark: "xai" }],
  [/xiaomi\/|(^|\/)mimo/, { id: "xiaomi", name: "Xiaomi", mark: "xiaomi" }],
  [/meituan|longcat/, { id: "meituan", name: "Meituan", mark: "longcat" }],
];

export function vendorOf(model: string): Vendor | null {
  const lowered = model.toLowerCase();
  return VENDORS.find(([pattern]) => pattern.test(lowered))?.[1] ?? null;
}
