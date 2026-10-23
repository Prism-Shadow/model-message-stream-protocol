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

import http from "http";
import { AddressInfo } from "net";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import { ApiKeyRequiredError, AutoLLMClient } from "../src";
import {
  CLIENT_CREDENTIALS,
  COMPATIBLE_CLIENT_TYPES,
  OFFICIAL_CLIENT_TYPES,
  environmentCredential,
} from "../src/credentials";

// Each case builds a client under a controlled environment and reads the credential its vendor
// SDK instance ends up holding; nothing here reaches the network, and the cases at the end read
// what a request to a local server actually carries. The OpenAI and Anthropic SDKs fill every
// credential they are not handed from their own environment variables, so a client that hands
// them undefined sends whatever those variables hold to its own host.

const CREDENTIAL_ENV = [
  "CLIENT_TYPE",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "DEEPSEEK_API_KEY",
  "DEEPSEEK_BASE_URL",
  "ZAI_API_KEY",
  "ZAI_BASE_URL",
  "MOONSHOT_API_KEY",
  "MOONSHOT_BASE_URL",
  "MINIMAX_API_KEY",
  "MINIMAX_BASE_URL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_BEDROCK_BASE_URL",
  "GEMINI_API_KEY",
  "GEMINI_BASE_URL",
  "GOOGLE_API_KEY",
  "GOOGLE_GEMINI_BASE_URL",
  "MMSP_API_KEY",
  "MMSP_BASE_URL",
  "VLLM_API_KEY",
  "VLLM_BASE_URL",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_ADMIN_KEY",
  "OPENAI_WEBHOOK_SECRET",
  "OPENAI_CUSTOM_HEADERS",
];

let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv = Object.fromEntries(
    CREDENTIAL_ENV.map((name) => [name, process.env[name]]),
  );
  for (const name of CREDENTIAL_ENV) {
    delete process.env[name];
  }
});

afterEach(() => {
  for (const [name, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

function routedClientName(client: AutoLLMClient): string {
  return (client as unknown as { _client: object })._client.constructor.name;
}

function sdkOf(client: AutoLLMClient): unknown {
  return (client as unknown as { _client: { _client: unknown } })._client
    ._client;
}

function openaiCredentialOf(client: AutoLLMClient): {
  apiKey: string;
  baseURL: string;
} {
  const sdk = sdkOf(client) as { apiKey: string; baseURL: string };
  return { apiKey: sdk.apiKey, baseURL: sdk.baseURL };
}

// The headers the Anthropic SDK attaches to every request it sends.
async function anthropicAuthHeadersOf(
  client: AutoLLMClient,
): Promise<Record<string, string>> {
  const sdk = sdkOf(client) as {
    authHeaders(opts: object): Promise<{ values: Headers } | undefined>;
  };
  const headers = await sdk.authHeaders({});
  return Object.fromEntries(headers ? [...headers.values.entries()] : []);
}

function mmspCredentialOf(client: AutoLLMClient): {
  authorization: string | undefined;
  baseUrl: string;
} {
  const mmsp = (
    client as unknown as {
      _client: { _baseUrl: string; _headers: Record<string, string> };
    }
  )._client;
  return { authorization: mmsp._headers.Authorization, baseUrl: mmsp._baseUrl };
}

interface VendorCase {
  expectedClient: string;
  model: string;
  keyEnv: string;
}

// The vendor clients built on the OpenAI SDK: each reads its own variable and nothing else.
const VENDOR_CASES: VendorCase[] = [
  {
    expectedClient: "DeepSeekOfficialClient",
    model: "deepseek-v4-flash",
    keyEnv: "DEEPSEEK_API_KEY",
  },
  {
    expectedClient: "ZAIOfficialClient",
    model: "glm-5.3",
    keyEnv: "ZAI_API_KEY",
  },
  {
    expectedClient: "MoonshotOfficialClient",
    model: "kimi-k3",
    keyEnv: "MOONSHOT_API_KEY",
  },
  {
    expectedClient: "MiniMaxOfficialClient",
    model: "MiniMax-M3",
    keyEnv: "MINIMAX_API_KEY",
  },
];

describe.each(VENDOR_CASES)("$expectedClient credentials", (testCase) => {
  const missing = `${testCase.keyEnv} is required for ${testCase.expectedClient}.`;

  test("with only OPENAI_API_KEY set, refuses to build rather than send it", () => {
    process.env.OPENAI_API_KEY = "sk-openai-PROBE";

    expect(() => new AutoLLMClient({ model: testCase.model })).toThrow(missing);
  });

  test("with no key at all, names its own variable", () => {
    expect(() => new AutoLLMClient({ model: testCase.model })).toThrow(missing);
  });

  test("uses its own variable, not OPENAI_API_KEY", () => {
    process.env.OPENAI_API_KEY = "sk-openai-PROBE";
    process.env[testCase.keyEnv] = "sk-vendor-PROBE";

    const client = new AutoLLMClient({ model: testCase.model });

    expect(routedClientName(client)).toBe(testCase.expectedClient);
    expect(openaiCredentialOf(client).apiKey).toBe("sk-vendor-PROBE");
  });

  test("uses an explicit key over both variables", () => {
    process.env.OPENAI_API_KEY = "sk-openai-PROBE";
    process.env[testCase.keyEnv] = "sk-vendor-PROBE";

    const client = new AutoLLMClient({
      model: testCase.model,
      apiKey: "sk-explicit-PROBE",
    });

    expect(openaiCredentialOf(client).apiKey).toBe("sk-explicit-PROBE");
  });
});

// What a built client holds: the key its SDK sends and the endpoint it calls.
interface Held {
  apiKey: string | undefined;
  baseUrl: string;
}

async function openaiHeld(client: AutoLLMClient): Promise<Held> {
  const { apiKey, baseURL } = openaiCredentialOf(client);
  return { apiKey, baseUrl: baseURL };
}

async function anthropicHeld(client: AutoLLMClient): Promise<Held> {
  const headers = await anthropicAuthHeadersOf(client);
  return {
    apiKey: headers["x-api-key"],
    baseUrl: (sdkOf(client) as { baseURL: string }).baseURL,
  };
}

async function googleHeld(client: AutoLLMClient): Promise<Held> {
  const sdk = sdkOf(client) as {
    apiKey?: string;
    apiClient: { getBaseUrl(): string };
  };
  return { apiKey: sdk.apiKey, baseUrl: sdk.apiClient.getBaseUrl() };
}

async function mmspHeld(client: AutoLLMClient): Promise<Held> {
  const { authorization, baseUrl } = mmspCredentialOf(client);
  return { apiKey: authorization?.replace(/^Bearer /, ""), baseUrl };
}

// One case per client type: a model it serves and how to read back what its SDK holds.
const CLIENT_CASES: Record<
  string,
  { model: string; held: (client: AutoLLMClient) => Promise<Held> }
> = {
  "openai-official": { model: "gpt-6-astra", held: openaiHeld },
  "anthropic-official": { model: "claude-sonnet-5", held: anthropicHeld },
  "google-official": { model: "gemini-3.8-flash", held: googleHeld },
  "zai-official": { model: "glm-5.3", held: openaiHeld },
  "moonshot-official": { model: "kimi-k3", held: openaiHeld },
  "deepseek-official": { model: "deepseek-v4-flash", held: openaiHeld },
  "minimax-official": { model: "MiniMax-M3", held: openaiHeld },
  "openai-responses": { model: "gpt-5.6", held: openaiHeld },
  "openai-chat": { model: "gpt-5.6", held: openaiHeld },
  "openai-chat-vllm-adapter": {
    model: "Qwen/Qwen3.6-35B-A3B",
    held: openaiHeld,
  },
  "openai-embedding": { model: "text-embedding-3-large", held: openaiHeld },
  "ant-messages": { model: "claude-sonnet-5", held: anthropicHeld },
  "google-genai": { model: "gemini-3.8-flash", held: googleHeld },
  mmsp: { model: "gpt-5.5", held: mmspHeld },
};

const OTHER_BASE_URL = "https://gateway.example/v1";
const ENV_BASE_URL = "https://env.example/v1";

// An endpoint as the rule compares it: the host's case and trailing slashes ignored.
function endpoint(url: string): string {
  return url.toLowerCase().replace(/\/+$/, "");
}

// The same endpoint spelled otherwise: the host in capitals, with a trailing slash.
function respelled(url: string): string {
  return url
    .replace(/^([a-z]+:\/\/)([^/]+)/, (_, scheme, host) =>
      `${scheme}${host.toUpperCase()}`,
    )
    .replace(/\/?$/, "/");
}

test("every client type has a row of CLIENT_CREDENTIALS and a case here", () => {
  const clientTypes = [...OFFICIAL_CLIENT_TYPES, ...COMPATIBLE_CLIENT_TYPES];

  expect(Object.keys(CLIENT_CREDENTIALS).sort()).toEqual(clientTypes.sort());
  expect(Object.keys(CLIENT_CASES).sort()).toEqual(clientTypes.sort());
});

// Each scenario reads what environmentCredential says the client does, then builds the client and
// checks that it does exactly that.
describe.each(Object.keys(CLIENT_CREDENTIALS))(
  "%s: environmentCredential and the client agree",
  (clientType) => {
    const { apiKeyEnv, baseUrlEnv, defaultBaseUrl } =
      CLIENT_CREDENTIALS[clientType];
    const { model, held } = CLIENT_CASES[clientType];
    const build = (options: { apiKey?: string; baseUrl?: string } = {}) =>
      new AutoLLMClient({ model, clientType, ...options });

    beforeEach(() => {
      process.env[apiKeyEnv] = "sk-env-PROBE";
    });

    test("a key passed in goes to the base URL passed in", async () => {
      process.env[baseUrlEnv] = ENV_BASE_URL;

      const client = build({
        apiKey: "sk-explicit-PROBE",
        baseUrl: OTHER_BASE_URL,
      });

      const { apiKey, baseUrl } = await held(client);
      expect([apiKey, endpoint(baseUrl)]).toEqual([
        "sk-explicit-PROBE",
        endpoint(OTHER_BASE_URL),
      ]);
    });

    test("a key passed in without a base URL goes to the endpoint of its base URL variable", async () => {
      process.env[baseUrlEnv] = ENV_BASE_URL;

      const { apiKey, baseUrl } = await held(
        build({ apiKey: "sk-explicit-PROBE" }),
      );

      expect([apiKey, endpoint(baseUrl)]).toEqual([
        "sk-explicit-PROBE",
        endpoint(ENV_BASE_URL),
      ]);
    });

    test("no key and no base URL: both come from the environment", async () => {
      process.env[baseUrlEnv] = ENV_BASE_URL;

      expect(environmentCredential(clientType)).toEqual({
        kind: "env",
        apiKeyEnv,
        baseUrlEnv,
      });
      const { apiKey, baseUrl } = await held(build());
      expect([apiKey, endpoint(baseUrl)]).toEqual([
        "sk-env-PROBE",
        endpoint(ENV_BASE_URL),
      ]);
    });

    test("no key, no base URL and no base URL variable: the environment's key goes to the default endpoint", async () => {
      const { apiKey, baseUrl } = await held(build());

      expect([apiKey, endpoint(baseUrl)]).toEqual([
        "sk-env-PROBE",
        endpoint(defaultBaseUrl),
      ]);
    });
  },
);

describe.each(
  Object.keys(CLIENT_CREDENTIALS).filter(
    (clientType) => !CLIENT_CREDENTIALS[clientType].openServer,
  ),
)("%s: a base URL passed without a key", (clientType) => {
  const { apiKeyEnv, baseUrlEnv, defaultBaseUrl } =
    CLIENT_CREDENTIALS[clientType];
  const { model, held } = CLIENT_CASES[clientType];

  beforeEach(() => {
    process.env[apiKeyEnv] = "sk-env-PROBE";
    process.env[baseUrlEnv] = ENV_BASE_URL;
  });

  test("the default endpoint, spelled otherwise, takes the environment's key and ignores the base URL variable", async () => {
    const passed = respelled(defaultBaseUrl);

    expect(environmentCredential(clientType, passed)).toEqual({
      kind: "env",
      apiKeyEnv,
      baseUrlEnv: null,
    });
    const { apiKey, baseUrl } = await held(
      new AutoLLMClient({ model, clientType, baseUrl: passed }),
    );
    expect([apiKey, endpoint(baseUrl)]).toEqual([
      "sk-env-PROBE",
      endpoint(defaultBaseUrl),
    ]);
  });

  test("another endpoint is refused before any request, naming both fixes", () => {
    expect(environmentCredential(clientType, OTHER_BASE_URL)).toEqual({
      kind: "required",
      apiKeyEnv,
      baseUrlEnv,
    });
    let refusal: unknown;
    try {
      new AutoLLMClient({ model, clientType, baseUrl: OTHER_BASE_URL });
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(ApiKeyRequiredError);
    expect(refusal).toMatchObject({
      clientType,
      apiKeyEnv,
      baseUrlEnv,
      baseUrl: OTHER_BASE_URL,
    });
    expect((refusal as Error).message).toContain(
      `Pass apiKey, or drop baseUrl and set ${apiKeyEnv}, plus ${baseUrlEnv} for an endpoint other than ${defaultBaseUrl}.`,
    );
  });
});

interface AnthropicCase {
  expectedClient: string;
  model: string;
  clientType?: string;
  // ant-messages sends its key through both header conventions, claude-5 as x-api-key only
  keyAsBearer: boolean;
}

const ANTHROPIC_CASES: AnthropicCase[] = [
  {
    expectedClient: "AnthropicOfficialClient",
    model: "claude-sonnet-5",
    keyAsBearer: false,
  },
  {
    expectedClient: "AntMessagesClient",
    model: "claude-sonnet-5",
    clientType: "ant-messages",
    keyAsBearer: true,
  },
];

function keyHeaders(key: string, keyAsBearer: boolean): Record<string, string> {
  return keyAsBearer
    ? { "x-api-key": key, authorization: `Bearer ${key}` }
    : { "x-api-key": key };
}

describe.each(ANTHROPIC_CASES)("$expectedClient credentials", (testCase) => {
  test("a configured key goes out without ANTHROPIC_AUTH_TOKEN", async () => {
    process.env.ANTHROPIC_AUTH_TOKEN = "tok-env-PROBE";

    const client = new AutoLLMClient({
      model: testCase.model,
      clientType: testCase.clientType,
      apiKey: "sk-row-KEY",
      baseUrl: "https://proxy.example/anthropic",
    });

    expect(routedClientName(client)).toBe(testCase.expectedClient);
    expect(await anthropicAuthHeadersOf(client)).toEqual(
      keyHeaders("sk-row-KEY", testCase.keyAsBearer),
    );
  });

  test("ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL still apply, ANTHROPIC_AUTH_TOKEN does not", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-PROBE";
    process.env.ANTHROPIC_BASE_URL = "https://gateway.example/anthropic/";
    process.env.ANTHROPIC_AUTH_TOKEN = "tok-env-PROBE";

    const client = new AutoLLMClient({
      model: testCase.model,
      clientType: testCase.clientType,
    });

    expect((sdkOf(client) as { baseURL: string }).baseURL).toBe(
      "https://gateway.example/anthropic/",
    );
    expect(await anthropicAuthHeadersOf(client)).toEqual(
      keyHeaders("sk-ant-PROBE", testCase.keyAsBearer),
    );
  });

  test("with no key configured, ANTHROPIC_AUTH_TOKEN is not sent either", async () => {
    process.env.ANTHROPIC_AUTH_TOKEN = "tok-env-PROBE";

    const client = new AutoLLMClient({
      model: testCase.model,
      clientType: testCase.clientType,
    });

    expect(await anthropicAuthHeadersOf(client)).toEqual({});
  });
});

describe("AnthropicOfficialClient on Bedrock", () => {
  test("sends no Anthropic credential to AWS", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-PROBE";
    process.env.ANTHROPIC_AUTH_TOKEN = "tok-env-PROBE";

    const client = new AutoLLMClient({
      model: "claude-sonnet-5",
      apiKey: "AKIAEXAMPLE,secret-EXAMPLE",
      baseUrl: "bedrock://us-east-1",
    });

    expect((sdkOf(client) as object).constructor.name).toBe("AnthropicBedrock");
    expect(await anthropicAuthHeadersOf(client)).toEqual({});
  });
});

// The mmsp client, which MMSP_API_KEY and MMSP_BASE_URL belong to.
describe("MmspClient credentials", () => {
  test("with a baseUrl and no key passed in, sends no key", () => {
    process.env.MMSP_API_KEY = "mm-env-PROBE";

    // an open server needs no key, and MMSP_API_KEY is not sent to another endpoint
    const client = new AutoLLMClient({
      model: "gpt-5.5",
      clientType: "mmsp",
      baseUrl: "https://gateway.example/mmsp/",
    });

    expect(environmentCredential("mmsp", "https://gateway.example/mmsp/")).toEqual(
      { kind: "keyless" },
    );
    expect(mmspCredentialOf(client)).toEqual({
      authorization: undefined,
      baseUrl: "https://gateway.example/mmsp",
    });
  });

  test("with the default endpoint and no key passed in, sends no key either", () => {
    process.env.MMSP_API_KEY = "mm-env-PROBE";

    const client = new AutoLLMClient({
      model: "gpt-5.5",
      clientType: "mmsp",
      baseUrl: "http://127.0.0.1:25752/v1",
    });

    expect(environmentCredential("mmsp", "http://127.0.0.1:25752/v1")).toEqual(
      { kind: "keyless" },
    );
    expect(mmspCredentialOf(client).authorization).toBeUndefined();
  });

  test("without a key or a baseUrl, sends no key to the local server", () => {
    const client = new AutoLLMClient({ model: "gpt-5.5", clientType: "mmsp" });

    expect(mmspCredentialOf(client)).toEqual({
      authorization: undefined,
      baseUrl: "http://127.0.0.1:25752/v1",
    });
  });
});

// The vLLM adapter, which VLLM_API_KEY and VLLM_BASE_URL belong to. vLLM serves without a key
// unless it is started with one, so the adapter calls its server keyless when it has none, with
// the placeholder EMPTY because the OpenAI SDK sends a key with every request.
describe("OpenaiChatVllmAdapterClient credentials", () => {
  const model = "Qwen/Qwen3.6-35B-A3B";
  const clientType = "openai-chat-vllm-adapter";

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-openai-PROBE";
    process.env.OPENAI_BASE_URL = "https://openai-env.example/v1";
  });

  test("without a key or a base URL, calls the local vLLM server keyless and reads nothing of OpenAI's", () => {
    const client = new AutoLLMClient({ model, clientType });

    expect(environmentCredential(clientType)).toEqual({
      kind: "env",
      apiKeyEnv: "VLLM_API_KEY",
      baseUrlEnv: "VLLM_BASE_URL",
    });
    expect(openaiCredentialOf(client)).toEqual({
      apiKey: "EMPTY",
      baseURL: "http://127.0.0.1:8000/v1",
    });
  });

  test("with VLLM_API_KEY set and no base URL, sends it to the local vLLM server", () => {
    process.env.VLLM_API_KEY = "vllm-env-PROBE";

    const client = new AutoLLMClient({ model, clientType });

    expect(openaiCredentialOf(client)).toEqual({
      apiKey: "vllm-env-PROBE",
      baseURL: "http://127.0.0.1:8000/v1",
    });
  });

  test("with a base URL and no key, calls it keyless rather than refusing", () => {
    process.env.VLLM_API_KEY = "vllm-env-PROBE";

    // VLLM_API_KEY is not sent to an endpoint named in code, the default one included
    for (const baseUrl of [
      "https://gpu-box.example/v1",
      "http://127.0.0.1:8000/v1",
    ]) {
      const client = new AutoLLMClient({ model, clientType, baseUrl });

      expect(environmentCredential(clientType, baseUrl)).toEqual({
        kind: "keyless",
      });
      expect(openaiCredentialOf(client)).toEqual({
        apiKey: "EMPTY",
        baseURL: baseUrl,
      });
    }
  });

  describe("on the wire", () => {
    let server: http.Server;
    let origin: string;
    let authorization: string | undefined;

    beforeAll(async () => {
      server = http.createServer((req, res) => {
        authorization = req.headers.authorization;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ object: "list", data: [{ id: model }] }));
      });
      await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", resolve);
      });
      origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    });

    beforeEach(() => {
      authorization = undefined;
    });

    test("the server VLLM_BASE_URL names is sent the placeholder, not OPENAI_API_KEY", async () => {
      process.env.VLLM_BASE_URL = `${origin}/v1`;

      const client = new AutoLLMClient({ model, clientType });

      await expect(client.listModels()).resolves.toEqual([model]);
      expect(authorization).toBe("Bearer EMPTY");
    });

    test("the server VLLM_BASE_URL names is sent VLLM_API_KEY when it is set", async () => {
      process.env.VLLM_BASE_URL = `${origin}/v1`;
      process.env.VLLM_API_KEY = "vllm-env-PROBE";

      const client = new AutoLLMClient({ model, clientType });

      await expect(client.listModels()).resolves.toEqual([model]);
      expect(authorization).toBe("Bearer vllm-env-PROBE");
    });

    test("a base URL passed without a key is sent the placeholder, not VLLM_API_KEY", async () => {
      process.env.VLLM_API_KEY = "vllm-env-PROBE";

      const client = new AutoLLMClient({
        model,
        clientType,
        baseUrl: `${origin}/v1`,
      });

      await expect(client.listModels()).resolves.toEqual([model]);
      expect(authorization).toBe("Bearer EMPTY");
    });
  });
});

// The rest of OpenAI's environment: the OpenAI SDK fills the organization, the project, the admin
// key and the webhook secret it is not handed from OPENAI_ORG_ID, OPENAI_PROJECT_ID,
// OPENAI_ADMIN_KEY and OPENAI_WEBHOOK_SECRET, and adds every header OPENAI_CUSTOM_HEADERS lists.
// Like the key, it goes only to the endpoint the environment's key goes to.
describe("OpenAI's environment beyond the key", () => {
  let server: http.Server;
  let origin: string;
  let received: http.IncomingHttpHeaders | undefined;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      received = req.headers;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ object: "list", data: [{ id: "m1" }] }));
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    received = undefined;
    process.env.OPENAI_ORG_ID = "org-env-PROBE";
    process.env.OPENAI_PROJECT_ID = "proj-env-PROBE";
    process.env.OPENAI_ADMIN_KEY = "admin-env-PROBE";
    process.env.OPENAI_WEBHOOK_SECRET = "whsec-env-PROBE";
  });

  // What reached the server of OpenAI's environment, and the key that came with it.
  async function sent(client: AutoLLMClient) {
    await client.listModels();
    expect(received).toBeDefined();
    const headers = received as http.IncomingHttpHeaders;
    return {
      authorization: headers.authorization,
      organization: headers["openai-organization"],
      project: headers["openai-project"],
      custom: headers["x-env-probe"],
    };
  }

  // Every client built on the OpenAI SDK, at an endpoint that is not OpenAI's default one.
  test.each([
    ["openai-official", "gpt-6-astra"],
    ["openai-responses", "gpt-5.6"],
    ["openai-chat", "gpt-5.6"],
    ["openai-embedding", "text-embedding-3-large"],
    ["deepseek-official", "deepseek-v4-flash"],
    ["zai-official", "glm-5.3"],
    ["moonshot-official", "kimi-k3"],
    ["minimax-official", "MiniMax-M3"],
  ])(
    "%s at another endpoint sends none of it, and an Authorization header in OPENAI_CUSTOM_HEADERS does not replace its key",
    async (clientType, model) => {
      process.env.OPENAI_CUSTOM_HEADERS =
        "X-Env-Probe: from-env\nAuthorization: Bearer env-auth-PROBE";

      const client = new AutoLLMClient({
        model,
        clientType,
        apiKey: "sk-explicit-PROBE",
        baseUrl: `${origin}/v1`,
      });

      expect(await sent(client)).toEqual({
        authorization: "Bearer sk-explicit-PROBE",
        organization: undefined,
        project: undefined,
        custom: undefined,
      });
    },
  );

  test("the vLLM adapter calls its server keyless with none of it", async () => {
    process.env.OPENAI_CUSTOM_HEADERS = "X-Env-Probe: from-env";

    const client = new AutoLLMClient({
      model: "Qwen/Qwen3.6-35B-A3B",
      clientType: "openai-chat-vllm-adapter",
      baseUrl: `${origin}/v1`,
    });

    expect(await sent(client)).toEqual({
      authorization: "Bearer EMPTY",
      organization: undefined,
      project: undefined,
      custom: undefined,
    });
  });

  test("another vendor's client at the endpoint its own variable names sends none of it", async () => {
    process.env.OPENAI_CUSTOM_HEADERS = "X-Env-Probe: from-env";
    process.env.DEEPSEEK_API_KEY = "sk-deepseek-PROBE";
    process.env.DEEPSEEK_BASE_URL = `${origin}/v1`;

    const client = new AutoLLMClient({ model: "deepseek-v4-flash" });

    expect(await sent(client)).toEqual({
      authorization: "Bearer sk-deepseek-PROBE",
      organization: undefined,
      project: undefined,
      custom: undefined,
    });
  });

  test("an OpenAI client at the endpoint OpenAI's environment names still sends all of it", async () => {
    process.env.OPENAI_CUSTOM_HEADERS = "X-Env-Probe: from-env";
    process.env.OPENAI_API_KEY = "sk-env-PROBE";
    process.env.OPENAI_BASE_URL = `${origin}/v1`;

    const client = new AutoLLMClient({
      model: "gpt-5.6",
      clientType: "openai-chat",
    });

    expect(await sent(client)).toEqual({
      authorization: "Bearer sk-env-PROBE",
      organization: "org-env-PROBE",
      project: "proj-env-PROBE",
      custom: "from-env",
    });
  });
});
