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

// What a host can know about MMSP's clients without building one: which client a model reaches,
// and where that client takes its key and its endpoint from. This module imports nothing and reads
// no environment, so a browser bundle may hold it (`@prismshadow/mmsp/credentials`). AutoLLMClient
// routes through it and every client resolves its credentials through it (`resolveCredentials`
// in `utils`), so what it says a client does is what the client does.

// An official client speaks its vendor's own API, knows the vendor's models, and reads the
// vendor's key from the environment.
export const OFFICIAL_CLIENT_TYPES = [
  "openai-official",
  "anthropic-official",
  "google-official",
  "zai-official",
  "moonshot-official",
  "deepseek-official",
  "minimax-official",
] as const;

// A compatible client speaks one wire protocol for whatever endpoint serves it.
export const COMPATIBLE_CLIENT_TYPES = [
  "openai-responses",
  "openai-chat",
  "openai-chat-vllm-adapter",
  "openai-embedding",
  "ant-messages",
  "google-genai",
  "mmsp",
] as const;

// Without a client type, the family a model id begins with names its official client.
export const MODEL_FAMILIES: [string, string][] = [
  ["gpt-", "openai-official"],
  ["text-embedding-", "openai-official"],
  ["claude-", "anthropic-official"],
  ["gemini-", "google-official"],
  ["glm-", "zai-official"],
  ["kimi-", "moonshot-official"],
  ["deepseek-", "deepseek-official"],
  ["minimax-", "minimax-official"],
];

// The earlier names of three client types, still accepted.
const CLIENT_TYPE_ALIASES = new Map([
  ["openai", "openai-chat"],
  ["gemini-official", "google-official"],
  ["gemini-generate-content", "google-genai"],
]);

/** Where a client takes its key and its endpoint from. */
export interface ClientCredentials {
  /** The variable holding the key, read when no key is passed (see environmentCredential). */
  apiKeyEnv: string;
  /** The variable holding the endpoint, read when no base URL is passed. */
  baseUrlEnv: string;
  /** The endpoint when no base URL is passed and baseUrlEnv is unset. */
  defaultBaseUrl: string;
  /** A base URL passed without a key is an open server, which is sent no key. */
  openServer?: boolean;
}

const OPENAI: ClientCredentials = {
  apiKeyEnv: "OPENAI_API_KEY",
  baseUrlEnv: "OPENAI_BASE_URL",
  defaultBaseUrl: "https://api.openai.com/v1",
};
const ANTHROPIC: ClientCredentials = {
  apiKeyEnv: "ANTHROPIC_API_KEY",
  baseUrlEnv: "ANTHROPIC_BASE_URL",
  defaultBaseUrl: "https://api.anthropic.com",
};
const GEMINI: ClientCredentials = {
  apiKeyEnv: "GEMINI_API_KEY",
  baseUrlEnv: "GEMINI_BASE_URL",
  defaultBaseUrl: "https://generativelanguage.googleapis.com",
};

/** Every client type's credentials, by its canonical name. */
export const CLIENT_CREDENTIALS: Readonly<Record<string, ClientCredentials>> = {
  "openai-official": OPENAI,
  "anthropic-official": ANTHROPIC,
  "google-official": GEMINI,
  "zai-official": {
    apiKeyEnv: "ZAI_API_KEY",
    baseUrlEnv: "ZAI_BASE_URL",
    defaultBaseUrl: "https://api.z.ai/api/paas/v4/",
  },
  "moonshot-official": {
    apiKeyEnv: "MOONSHOT_API_KEY",
    baseUrlEnv: "MOONSHOT_BASE_URL",
    defaultBaseUrl: "https://api.moonshot.cn/v1",
  },
  "deepseek-official": {
    apiKeyEnv: "DEEPSEEK_API_KEY",
    baseUrlEnv: "DEEPSEEK_BASE_URL",
    defaultBaseUrl: "https://api.deepseek.com",
  },
  "minimax-official": {
    apiKeyEnv: "MINIMAX_API_KEY",
    baseUrlEnv: "MINIMAX_BASE_URL",
    defaultBaseUrl: "https://api.minimax.io/v1",
  },
  "openai-responses": OPENAI,
  "openai-chat": OPENAI,
  "openai-chat-vllm-adapter": OPENAI,
  "openai-embedding": OPENAI,
  "ant-messages": ANTHROPIC,
  "google-genai": GEMINI,
  mmsp: {
    apiKeyEnv: "MMSP_API_KEY",
    baseUrlEnv: "MMSP_BASE_URL",
    defaultBaseUrl: "http://127.0.0.1:25752/v1",
    openServer: true,
  },
};

/**
 * What a client handed no key does with the base URL it is handed:
 *
 * - `env`: it reads `apiKeyEnv`, and `baseUrlEnv` when that is not null (no base URL was passed);
 * - `keyless`: it sends no key, as an open MMSP server takes;
 * - `required`: it refuses with ApiKeyRequiredError before any request.
 */
export type EnvironmentCredential =
  | { kind: "env"; apiKeyEnv: string; baseUrlEnv: string | null }
  | { kind: "keyless" }
  | { kind: "required"; apiKeyEnv: string; baseUrlEnv: string };

function canonicalClientType(clientType: string): string | null {
  const lowered = clientType.toLowerCase();
  const canonical = CLIENT_TYPE_ALIASES.get(lowered) ?? lowered;
  return Object.prototype.hasOwnProperty.call(CLIENT_CREDENTIALS, canonical)
    ? canonical
    : null;
}

// Scheme and host compared case-insensitively and the path without trailing slashes; anything
// after the path compared as written.
function normalizedEndpoint(url: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)([\s\S]*)$/i.exec(
    url.trim(),
  );
  if (match === null) {
    return null;
  }
  const [, scheme, host, path, rest] = match;
  return `${scheme.toLowerCase()}://${host.toLowerCase()}${path.replace(/\/+$/, "")}${rest}`;
}

/**
 * The official client a model id routes to on its own, or null when its family is unknown.
 *
 * @param model - The model id, in any casing
 * @returns One of OFFICIAL_CLIENT_TYPES, or null
 */
export function clientTypeForModel(model: string): string | null {
  const lowered = model.toLowerCase();
  for (const [prefix, clientType] of MODEL_FAMILIES) {
    if (lowered.startsWith(prefix)) {
      return clientType;
    }
  }
  return null;
}

/**
 * The client AutoLLMClient builds for a model: the client type passed in (in any casing, an
 * earlier name accepted), else the official client of the model id's family. `openai-official`
 * serves a `text-embedding-` model through `openai-embedding`.
 *
 * @param model - The model id
 * @param clientType - The client type passed in, if any
 * @returns A key of CLIENT_CREDENTIALS, or null for an unknown client type or family
 */
export function routedClientType(
  model: string,
  clientType?: string | null,
): string | null {
  const routed = clientType
    ? canonicalClientType(clientType)
    : clientTypeForModel(model);
  if (
    routed === "openai-official" &&
    model.toLowerCase().startsWith("text-embedding-")
  ) {
    return "openai-embedding";
  }
  return routed;
}

/**
 * What a client does for its key when it is handed none. Without a base URL it reads `<P>_API_KEY`
 * and `<P>_BASE_URL`. With its own default endpoint (trailing slashes and the host's case
 * ignored) it reads `<P>_API_KEY` for that endpoint. With any other base URL it refuses, because
 * the environment's key was not given for that endpoint, except the `mmsp` client, which calls an
 * open server keyless.
 *
 * @param clientType - A client type, in any casing, an earlier name accepted
 * @param baseUrl - The base URL passed to the client, if any
 * @returns What the client does, or null for an unknown client type
 */
export function environmentCredential(
  clientType: string,
  baseUrl?: string | null,
): EnvironmentCredential | null {
  const canonical = canonicalClientType(clientType);
  if (canonical === null) {
    return null;
  }
  const { apiKeyEnv, baseUrlEnv, defaultBaseUrl, openServer } =
    CLIENT_CREDENTIALS[canonical];
  if (!baseUrl) {
    return { kind: "env", apiKeyEnv, baseUrlEnv };
  }
  if (openServer) {
    return { kind: "keyless" };
  }
  if (normalizedEndpoint(baseUrl) === normalizedEndpoint(defaultBaseUrl)) {
    return { kind: "env", apiKeyEnv, baseUrlEnv: null };
  }
  return { kind: "required", apiKeyEnv, baseUrlEnv };
}
