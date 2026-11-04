// The web page a provider keeps for a model, which the Model Index opens from a row and from its
// dialog: the model's own page where the provider has one per model, and its model or price list
// where it does not. The page computes it in the browser from the row's provider and model id, so
// the HTML carries no link per row. Every registry row's page was fetched and checked on 2026-11-04;
// a provider with no public page, as a vLLM server on this machine, has no rule.

const VERTEX = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models";
// Vertex AI's docs have no page for these, so they open the list of Google's models
const VERTEX_UNLISTED = new Set(["gemini-3.1-flash-tts-preview"]);
// Fireworks files these under DeepSeek's account and the rest of the registry's under its own
const FIREWORKS_DEEPSEEK = new Set(["deepseek-v4p1-flash", "deepseek-v4-flash-0731", "deepseek-v4-pro-0813"]);

const RULES: Record<string, (model: string) => string> = {
  openrouter: (model) => `https://openrouter.ai/${model}`,
  tokendance: (model) => `https://tokendance.space/models/${model}`,
  openai: (model) => `https://developers.openai.com/api/docs/models/${model}`,
  google: (model) => `https://ai.google.dev/gemini-api/docs/models/${model}`,
  // gemini-3.8-flash is gemini/3-8-flash
  vertex: (model) => (VERTEX_UNLISTED.has(model) ? `${VERTEX}/google-models` : `${VERTEX}/gemini/${model.replace(/^gemini-/, "").replaceAll(".", "-")}`),
  anthropic: () => "https://platform.claude.com/docs/en/models/overview",
  // global.anthropic.claude-sonnet-4-6 is model-card-anthropic-claude-sonnet-4-6, without the
  // inference profile's geography
  bedrock: (model) =>
    `https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-${model.replace(/^(global|us|eu|apac)\./, "").replaceAll(".", "-")}.html`,
  zai: (model) => `https://docs.z.ai/guides/llm/${model}`,
  // accounts/fireworks/models/kimi-k3 is fireworks/kimi-k3
  fireworks: (model) => {
    const name = model.split("/").at(-1)!;
    return `https://fireworks.ai/models/${FIREWORKS_DEEPSEEK.has(name) ? "deepseek-ai" : "fireworks"}/${name}`;
  },
  modelscope: (model) => `https://modelscope.cn/models/${model}`,
  // SiliconFlow's model list, searched for the one model
  siliconflow: (model) => `https://www.siliconflow.cn/models?q=${encodeURIComponent(model)}`,
  atlascloud: (model) => `https://www.atlascloud.ai/models/${model}`,
  deepseek: (model) =>
    /^deepseek-(search|fetch)$/.test(model) ? "https://api-docs.deepseek.com/guides/search/" : "https://api-docs.deepseek.com/quick_start/pricing/",
  moonshot: () => "https://platform.moonshot.cn/docs/pricing/chat",
  minimax: () => "https://platform.minimax.io/docs/guides/models-intro",
  "opencode-go": () => "https://opencode.ai/docs/go/",
  dashscope: () => "https://help.aliyun.com/zh/model-studio/models",
  "qwen-token-plan": () => "https://help.aliyun.com/zh/model-studio/token-plan-overview",
  "penguin-go": () => "https://go.penguin.ooo",
  jina: () => "https://jina.ai/reader/",
};

export const modelPage = (provider: string, model: string): string | undefined => RULES[provider]?.(model);
