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

import * as net from "net";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import { createChatApp } from "../src/integration/playground";
import { ModelRow } from "../src/integration/server";

// The rows build real upstream clients, whose constructors touch no network, and the live checks
// reach the MMSP server the playground starts on a port the system picks. Node's fetch ignores
// the proxy variables unless NODE_USE_ENV_PROXY is set, so 127.0.0.1 is reached directly.
const PROBE_ENV = ["PROBE_UPSTREAM_KEY", "PROBE_SERVER_KEY", "NOPE_KEY"];

const PORT_MESSAGE = "port must be an integer between 0 and 65535.";

const app = createChatApp();

/**
 * A row of the models table: an openai-chat upstream at an address nothing serves.
 */
function row(overrides: Partial<ModelRow> = {}): ModelRow {
  return {
    model_id: "gpt-5.5",
    base_url: "http://127.0.0.1:1/v1",
    api_key: "sk-test",
    server_model_id: "gpt-5.5",
    client_type: "openai-chat",
    ...overrides,
  };
}

/**
 * Starts the server on 127.0.0.1 and a port the system picks, unless the body names others.
 */
function start(body: Record<string, unknown>) {
  return request(app)
    .post("/server/api/start")
    .send({ host: "127.0.0.1", port: 0, ...body });
}

function stop() {
  return request(app).post("/server/api/stop").send({});
}

async function status(): Promise<unknown> {
  return (await request(app).get("/server/api/status")).body;
}

/**
 * What a running server's model list answers: the status, and the ids when it lists them.
 */
async function listModels(
  baseUrl: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; ids: string[] }> {
  const response = await fetch(`${baseUrl}/models`, { headers });
  const body = (await response.json()) as { data?: { id: string }[] };
  return {
    status: response.status,
    ids: (body.data ?? []).map((model) => model.id),
  };
}

let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv = Object.fromEntries(
    PROBE_ENV.map((name) => [name, process.env[name]]),
  );
  for (const name of PROBE_ENV) {
    delete process.env[name];
  }
});

afterEach(async () => {
  await stop();
  for (const [name, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe("Playground server page", () => {
  test("serves the server page", async () => {
    const response = await request(app).get("/server/");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(response.text).toContain("<title>MMSP Server</title>");
    expect(response.text).toContain('<span class="brand-sub">Server</span>');
    for (const id of [
      "modelRows",
      "addRowButton",
      "apiKeyRows",
      "addKeyButton",
      "keysNote",
      "hostInput",
      "portInput",
      "serverToggle",
      "serverToggleLabel",
      "statusDot",
      "statusText",
      "statusUrl",
      "statusModels",
      "serverError",
      "keyVisibilityToggle",
      "themeToggle",
    ]) {
      expect(response.text).toContain(`id="${id}"`);
    }
    for (const fragment of [
      "addRow(",
      "removeRow(",
      "addKey(",
      "removeKey(",
      "handleModelIdInput(",
      "handleRowClientType(",
      "toggleKeyVisibility()",
      "collectConfig()",
      "saveDraft()",
      "restoreDraft()",
      "refreshStatus()",
      "renderStatus(",
      "toggleServer()",
      "startServer()",
      "stopServer()",
      "markRow(",
      "mmsp.playground.server",
      "mmsp.playground.theme",
      "/server/api",
      // the server hands the page the chat page's client types and default endpoints
      '"openai-official"',
      "setTheme('dark')",
    ]) {
      expect(response.text).toContain(fragment);
    }
    expect(response.text).not.toContain("__PLAYGROUND_DEFAULTS__");
    expect(response.text).not.toContain("<select");
    expect(response.text).not.toContain("0.6");
  });

  test("status is stopped before a start", async () => {
    const response = await request(app).get("/server/api/status");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ running: false });
  });

  test("start serves the table and stop closes it", async () => {
    const started = await start({
      models: [
        row(),
        row({
          model_id: "claude-sonnet-5-5",
          server_model_id: "claude",
          client_type: "ant-messages",
        }),
      ],
    });

    expect(started.status).toBe(200);
    expect(Object.keys(started.body)).toEqual([
      "running",
      "host",
      "port",
      "base_url",
      "models",
      "open",
    ]);
    const { port, base_url: baseUrl } = started.body;
    expect(started.body.running).toBe(true);
    expect(started.body.host).toBe("127.0.0.1");
    expect(port).toBeGreaterThan(0);
    expect(baseUrl).toBe(`http://127.0.0.1:${port}/v1`);
    expect(started.body.models).toEqual(["gpt-5.5", "claude"]);
    expect(started.body.open).toBe(true);
    expect(await listModels(baseUrl)).toEqual({
      status: 200,
      ids: ["gpt-5.5", "claude"],
    });
    expect(await status()).toEqual(started.body);

    const stopped = await stop();

    expect(stopped.status).toBe(200);
    expect(stopped.body).toEqual({ running: false });
    expect(await status()).toEqual({ running: false });
    await expect(fetch(`${baseUrl}/models`)).rejects.toThrow();
  });

  test("start while running is refused", async () => {
    const first = await start({ models: [row()] });
    expect(first.status).toBe(200);

    const second = await start({ models: [row()] });

    expect(second.status).toBe(409);
    expect(second.body).toEqual({
      error: "The server is running; stop it first.",
    });
    expect(await listModels(first.body.base_url)).toEqual({
      status: 200,
      ids: ["gpt-5.5"],
    });
    expect(await status()).toEqual(first.body);
  });

  test("two simultaneous starts bind one server", async () => {
    const responses = await Promise.all([
      start({ models: [row()] }),
      start({ models: [row()] }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    const started = responses.find((response) => response.status === 200)!;
    expect(await status()).toEqual(started.body);
  });

  test("stop when stopped is fine", async () => {
    const response = await stop();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ running: false });
  });

  test.each<[string, unknown, string]>([
    ["a list", [], "Request body must be a JSON object."],
    [
      "models not a list",
      { models: "x" },
      "the config must be a JSON object with a models list.",
    ],
    [
      "api_keys not a list",
      { models: [], api_keys: "k" },
      "api_keys must be a list.",
    ],
    [
      "an empty table",
      { models: [] },
      "models is empty: the server needs at least one model row.",
    ],
    ["a port of text", { models: [row()], port: "abc" }, PORT_MESSAGE],
    ["a port out of range", { models: [row()], port: 70000 }, PORT_MESSAGE],
    ["a boolean port", { models: [row()], port: true }, PORT_MESSAGE],
    [
      "an empty host",
      { models: [row()], host: "" },
      "host must be a non-empty string.",
    ],
  ])("start refuses a malformed body: %s", async (_name, body, message) => {
    const response = Array.isArray(body)
      ? await request(app).post("/server/api/start").send(body)
      : await start(body as Record<string, unknown>);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: message });
    expect(await status()).toEqual({ running: false });
  });

  test("start names the row the server refuses", async () => {
    const unknownType = await start({
      models: [row({ client_type: "nope" })],
    });

    expect(unknownType.status).toBe(400);
    const prefix = "models[0] 'gpt-5.5': Unknown client type";
    expect(unknownType.body.error.slice(0, prefix.length)).toBe(prefix);

    const keyless: Partial<ModelRow> = row();
    delete keyless.api_key;
    const missingKey = await start({ models: [keyless] });

    expect(missingKey.status).toBe(400);
    expect(missingKey.body).toEqual({
      error: "models[0]: api_key must be a non-empty string.",
    });
    expect(await status()).toEqual({ running: false });
  });

  test("start resolves environment references", async () => {
    process.env.PROBE_UPSTREAM_KEY = "sk-probe";
    process.env.PROBE_SERVER_KEY = "srv";

    const started = await start({
      models: [row({ api_key: "$PROBE_UPSTREAM_KEY" })],
      api_keys: ["${PROBE_SERVER_KEY}"],
    });

    expect(started.status).toBe(200);
    expect(started.body.open).toBe(false);
    expect((await listModels(started.body.base_url)).status).toBe(401);
    expect(
      await listModels(started.body.base_url, { Authorization: "Bearer srv" }),
    ).toEqual({ status: 200, ids: ["gpt-5.5"] });

    await stop();
    const refused = await start({
      models: [row({ api_key: "$NOPE_KEY" })],
    });

    expect(refused.status).toBe(400);
    expect(refused.body).toEqual({
      error:
        "models[0].api_key references $NOPE_KEY, which is not set in the environment.",
    });
  });

  test("start reports a port in use", async () => {
    const blocker = net.createServer();
    await new Promise<void>((resolve) =>
      blocker.listen(0, "127.0.0.1", () => resolve()),
    );
    const { port } = blocker.address() as net.AddressInfo;

    try {
      const response = await start({ models: [row()], port });

      expect(response.status).toBe(400);
      const prefix = `Cannot listen on 127.0.0.1:${port}: `;
      expect(response.body.error.slice(0, prefix.length)).toBe(prefix);
      expect(response.body.error.toLowerCase()).toContain("in use");
      expect(await status()).toEqual({ running: false });
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });
});
