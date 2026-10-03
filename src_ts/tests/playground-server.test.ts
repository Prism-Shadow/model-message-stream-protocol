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

import * as fs from "fs";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { createChatApp } from "../src/integration/playground";
import { ModelRow, loadServerConfig } from "../src/integration/server";

// The rows build real upstream clients, whose constructors touch no network, and the live checks
// reach the MMSP server the playground starts on a port the system picks. Node's fetch ignores
// the proxy variables unless NODE_USE_ENV_PROXY is set, so 127.0.0.1 is reached directly.
const PROBE_ENV = ["PROBE_UPSTREAM_KEY", "PROBE_SERVER_KEY", "NOPE_KEY"];

const PORT_MESSAGE = "port must be an integer between 0 and 65535.";
const HOST_MESSAGE = "host must be a non-empty string.";

// the page saves here; the app reads the variable once, when it is created
const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "mmsp-playground-"));
const CONFIG_PATH = path.join(configDir, "server.json");
const savedConfigEnv = process.env.MMSP_SERVER_CONFIG;
process.env.MMSP_SERVER_CONFIG = CONFIG_PATH;

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
 * Saves a config on 127.0.0.1 and a port the system picks, unless the body names others.
 */
function save(body: Record<string, unknown>) {
  return request(app)
    .put("/server/api/config")
    .send({ host: "127.0.0.1", port: 0, ...body });
}

/**
 * Saves a config, as save does, and expects the save to succeed.
 */
async function saved(body: Record<string, unknown>): Promise<void> {
  const response = await save(body);
  expect([response.status, response.body.error]).toEqual([200, undefined]);
}

function start() {
  return request(app).post("/server/api/start").send({});
}

function restart() {
  return request(app).post("/server/api/restart").send({});
}

function stop() {
  return request(app).post("/server/api/stop").send({});
}

async function status(): Promise<unknown> {
  return (await request(app).get("/server/api/status")).body;
}

async function savedBody(): Promise<unknown> {
  return (await request(app).get("/server/api/config")).body;
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
let log: jest.SpiedFunction<typeof console.log>;

beforeEach(() => {
  savedEnv = Object.fromEntries(
    PROBE_ENV.map((name) => [name, process.env[name]]),
  );
  for (const name of PROBE_ENV) {
    delete process.env[name];
  }
  fs.rmSync(CONFIG_PATH, { force: true });
  // a start and a stop print their lines, which only the console test reads
  log = jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(async () => {
  await stop();
  log.mockRestore();
  for (const [name, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

afterAll(() => {
  fs.rmSync(configDir, { recursive: true, force: true });
  if (savedConfigEnv === undefined) {
    delete process.env.MMSP_SERVER_CONFIG;
  } else {
    process.env.MMSP_SERVER_CONFIG = savedConfigEnv;
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
      "listenState",
      "serverToggle",
      "serverToggleLabel",
      "saveButton",
      "restartButton",
      "dashboardLink",
      "configPath",
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
      "rowKey(",
      "configKey(",
      "renderStates()",
      "saveDraft()",
      "restoreTable()",
      "loadServerConfig()",
      "saveServerConfig()",
      "refreshStatus()",
      "renderStatus(",
      "toggleServer()",
      "startServer()",
      "restartServer()",
      "stopServer()",
      "markRow(",
      "mmsp.playground.server",
      "mmsp.playground.theme",
      "/server/api",
      // the client type starts at Auto and the base URL at the client's default
      ">Auto<",
      'placeholder="Default"',
      // the server hands the page the chat page's client types and default endpoints
      '"openai-official"',
      "setTheme('dark')",
    ]) {
      expect(response.text).toContain(fragment);
    }
    // a client type no longer fills the base URL
    expect(response.text).not.toContain("filledBaseUrl");
    expect(response.text).not.toContain("restoreDraft()");
    expect(response.text).not.toContain("__PLAYGROUND_DEFAULTS__");
    expect(response.text).not.toContain("<select");
    expect(response.text).not.toContain("0.6");
  });

  test("status is stopped before a start", async () => {
    const response = await request(app).get("/server/api/status");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ running: false });
  });

  test("config is absent before a save", async () => {
    const response = await request(app).get("/server/api/config");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      path: CONFIG_PATH,
      exists: false,
      config: null,
    });
  });

  test("save writes the CLI config file and reads it back", async () => {
    process.env.PROBE_SERVER_KEY = "srv";
    const auto = {
      model_id: "gpt-5.5",
      api_key: "sk-test",
      server_model_id: "gpt",
    };
    const written = {
      models: [
        auto,
        row({
          model_id: "claude-sonnet-5-5",
          server_model_id: "claude",
          client_type: "ant-messages",
        }),
      ],
      api_keys: ["$PROBE_SERVER_KEY"],
      host: "127.0.0.1",
      port: 25760,
    };

    const response = await request(app)
      .put("/server/api/config")
      .send({
        // the keys come in another order, and a key the file does not know is dropped
        port: 25760,
        host: "127.0.0.1",
        api_keys: ["$PROBE_SERVER_KEY"],
        models: [
          {
            server_model_id: "gpt",
            note: "dropped",
            api_key: "sk-test",
            model_id: "gpt-5.5",
          },
          written.models[1],
        ],
      });

    expect(response.status).toBe(200);
    const body = { path: CONFIG_PATH, exists: true, config: written };
    expect(response.body).toEqual(body);
    expect(Object.keys(response.body.config.models[0])).toEqual([
      "model_id",
      "api_key",
      "server_model_id",
    ]);
    expect(fs.readFileSync(CONFIG_PATH, "utf-8")).toBe(
      JSON.stringify(written, null, 2) + "\n",
    );
    expect(fs.existsSync(`${CONFIG_PATH}.tmp`)).toBe(false);
    expect(await savedBody()).toEqual(body);
    expect(loadServerConfig(CONFIG_PATH)).toEqual({
      models: written.models,
      api_keys: ["srv"],
    });
  });

  test("save fills the default host and port", async () => {
    const response = await request(app)
      .put("/server/api/config")
      .send({ models: [] });

    expect(response.status).toBe(200);
    expect(response.body.config).toEqual({
      models: [],
      api_keys: [],
      host: "127.0.0.1",
      port: 25752,
    });
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
      "a row not an object",
      { models: [row(), "x"] },
      "models[1] must be an object.",
    ],
    [
      "a cell not a string",
      { models: [{ ...row(), client_type: 5 }] },
      "models[0]: client_type must be a string.",
    ],
    [
      "a key not a string",
      { models: [row()], api_keys: ["k", null] },
      "api_keys[1] must be a string.",
    ],
    ["an empty host", { models: [row()], host: " " }, HOST_MESSAGE],
    ["a port of text", { models: [row()], port: "abc" }, PORT_MESSAGE],
    ["a port out of range", { models: [row()], port: 70000 }, PORT_MESSAGE],
    ["a boolean port", { models: [row()], port: true }, PORT_MESSAGE],
  ])("save refuses a malformed body: %s", async (_name, body, message) => {
    const response = Array.isArray(body)
      ? await request(app).put("/server/api/config").send(body)
      : await save(body as Record<string, unknown>);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: message });
    expect(fs.existsSync(CONFIG_PATH)).toBe(false);
  });

  test("a body that is not JSON is refused by a save and ignored by a start", async () => {
    const refused = await request(app)
      .put("/server/api/config")
      .set("Content-Type", "application/json")
      .send("not json");

    expect([refused.status, refused.body]).toEqual([
      400,
      { error: "Request body must be a JSON object." },
    ]);
    await saved({ models: [row()] });
    const started = await request(app)
      .post("/server/api/start")
      .set("Content-Type", "application/json")
      .send("not json");
    expect(started.status).toBe(200);
    expect(started.body.models).toEqual(["gpt-5.5"]);
  });

  test("save reports an unreadable file", async () => {
    fs.writeFileSync(CONFIG_PATH, "not json");

    const notJson = (await savedBody()) as Record<string, unknown>;

    expect(Object.keys(notJson)).toEqual(["path", "exists", "config", "error"]);
    expect(notJson).toMatchObject({
      path: CONFIG_PATH,
      exists: true,
      config: null,
    });
    const prefix = `${CONFIG_PATH}: not valid JSON: `;
    expect((notJson.error as string).slice(0, prefix.length)).toBe(prefix);
    const refused = await start();
    expect([refused.status, refused.body]).toEqual([
      400,
      { error: notJson.error },
    ]);

    fs.writeFileSync(CONFIG_PATH, "[]");
    const shape = `${CONFIG_PATH}: the config must be a JSON object with a models list.`;
    expect(await savedBody()).toEqual({
      path: CONFIG_PATH,
      exists: true,
      config: null,
      error: shape,
    });

    // a save replaces what cannot be read
    await saved({ models: [row()] });
    expect(((await savedBody()) as { config: unknown }).config).toEqual({
      models: [row()],
      api_keys: [],
      host: "127.0.0.1",
      port: 0,
    });
  });

  test("save reports a file it cannot write", async () => {
    // a directory where the file goes cannot be replaced by a file
    fs.mkdirSync(CONFIG_PATH);

    try {
      const response = await save({ models: [row()] });

      expect(response.status).toBe(500);
      const prefix = `Cannot write ${CONFIG_PATH}: `;
      expect(response.body.error.slice(0, prefix.length)).toBe(prefix);
    } finally {
      fs.rmSync(CONFIG_PATH, { recursive: true, force: true });
      fs.rmSync(`${CONFIG_PATH}.tmp`, { force: true });
    }
  });

  test("start without a saved config is refused", async () => {
    const response = await start();

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: `No saved config at ${CONFIG_PATH}; save the table first.`,
    });
    expect(await status()).toEqual({ running: false });
  });

  test("start serves the saved table and stop closes it", async () => {
    await saved({
      models: [
        row(),
        row({
          model_id: "claude-sonnet-5-5",
          server_model_id: "claude",
          client_type: "ant-messages",
        }),
      ],
    });
    const view = ((await savedBody()) as { config: unknown }).config;

    // the body is ignored: the saved file is what runs
    const started = await request(app)
      .post("/server/api/start")
      .send({ models: [row({ server_model_id: "ignored" })], port: 1 });

    expect(started.status).toBe(200);
    expect(Object.keys(started.body)).toEqual([
      "running",
      "host",
      "port",
      "base_url",
      "dashboard_url",
      "models",
      "open",
      "config",
    ]);
    const {
      port,
      base_url: baseUrl,
      dashboard_url: dashboardUrl,
    } = started.body;
    expect(started.body.running).toBe(true);
    expect(started.body.host).toBe("127.0.0.1");
    expect(port).toBeGreaterThan(0);
    expect(baseUrl).toBe(`http://127.0.0.1:${port}/v1`);
    expect(dashboardUrl).toBe(`http://127.0.0.1:${port}/`);
    expect(started.body.models).toEqual(["gpt-5.5", "claude"]);
    expect(started.body.open).toBe(true);
    expect(started.body.config).toEqual(view);
    expect(await listModels(baseUrl)).toEqual({
      status: 200,
      ids: ["gpt-5.5", "claude"],
    });
    const dashboard = await fetch(dashboardUrl);
    expect(dashboard.status).toBe(200);
    expect(dashboard.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect((await fetch(`${baseUrl}/metrics`)).status).toBe(200);
    expect(await status()).toEqual(started.body);

    const stopped = await stop();

    expect(stopped.status).toBe(200);
    expect(stopped.body).toEqual({ running: false });
    expect(await status()).toEqual({ running: false });
    await expect(fetch(`${baseUrl}/models`)).rejects.toThrow();
  });

  test("start and stop print the console lines", async () => {
    await saved({ models: [row()] });

    const started = await start();
    const baseUrl = started.body.base_url;
    await stop();

    expect(log.mock.calls).toEqual([
      [`Starting MMSP server at ${baseUrl}`],
      ["Serving models: gpt-5.5"],
      [`Dashboard at ${started.body.dashboard_url}`],
      ["Open server: api_keys is empty, every request is accepted"],
      [`Stopped MMSP server at ${baseUrl}`],
    ]);
  });

  test("start while running is refused", async () => {
    await saved({ models: [row()] });
    const first = await start();
    expect(first.status).toBe(200);

    const second = await start();

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
    await saved({ models: [row()] });

    const responses = await Promise.all([start(), start()]);

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

  test("restart applies the saved table", async () => {
    await saved({ models: [row()] });
    const first = await start();
    expect(first.status).toBe(200);
    await saved({ models: [row({ server_model_id: "renamed" })] });

    // a save alone changes nothing that runs
    expect(await status()).toEqual(first.body);
    const restarted = await restart();

    expect(restarted.status).toBe(200);
    expect(restarted.body.models).toEqual(["renamed"]);
    expect(restarted.body.config.models).toEqual([
      row({ server_model_id: "renamed" }),
    ]);
    expect(await listModels(restarted.body.base_url)).toEqual({
      status: 200,
      ids: ["renamed"],
    });
    expect(await status()).toEqual(restarted.body);
    if (restarted.body.port !== first.body.port) {
      await expect(fetch(`${first.body.base_url}/models`)).rejects.toThrow();
    }
    expect(log.mock.calls.map(([line]) => line)).toContain(
      `Stopped MMSP server at ${first.body.base_url}`,
    );
  });

  test("restart keeps the old server when the new table is refused", async () => {
    await saved({ models: [row()] });
    const first = await start();
    await saved({ models: [row({ client_type: "nope" })] });

    const refused = await restart();

    expect(refused.status).toBe(400);
    const prefix = "models[0] 'gpt-5.5': Unknown client type";
    expect(refused.body.error.slice(0, prefix.length)).toBe(prefix);
    expect(await status()).toEqual(first.body);
    expect(await listModels(first.body.base_url)).toEqual({
      status: 200,
      ids: ["gpt-5.5"],
    });

    await saved({ models: [row({ api_key: "$NOPE_KEY" })] });
    expect((await restart()).body).toEqual({
      error:
        "models[0].api_key references $NOPE_KEY, which is not set in the environment.",
    });
    expect(await status()).toEqual(first.body);
  });

  test("restart when stopped starts", async () => {
    await saved({ models: [row()] });

    const restarted = await restart();

    expect(restarted.status).toBe(200);
    expect(restarted.body.models).toEqual(["gpt-5.5"]);
    expect(await status()).toEqual(restarted.body);
  });

  test("restart stops the old server when the new port is in use", async () => {
    const blocker = net.createServer();
    await new Promise<void>((resolve) =>
      blocker.listen(0, "127.0.0.1", () => resolve()),
    );
    const { port } = blocker.address() as net.AddressInfo;

    try {
      await saved({ models: [row()] });
      const first = await start();
      await saved({ models: [row()], port });

      const response = await restart();

      expect(response.status).toBe(400);
      const prefix = `Cannot listen on 127.0.0.1:${port}: `;
      expect(response.body.error.slice(0, prefix.length)).toBe(prefix);
      expect(await status()).toEqual({ running: false });
      await expect(fetch(`${first.body.base_url}/models`)).rejects.toThrow();
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });

  test("start refuses a saved listen pair it cannot use", async () => {
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ models: [row()], host: "" }),
    );
    expect((await start()).body).toEqual({ error: HOST_MESSAGE });

    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ models: [row()], port: 70000 }),
    );
    expect((await start()).body).toEqual({ error: PORT_MESSAGE });
    expect(await status()).toEqual({ running: false });
  });

  test("start names the row the server refuses", async () => {
    await saved({ models: [row({ client_type: "nope" })] });
    const unknownType = await start();

    expect(unknownType.status).toBe(400);
    const prefix = "models[0] 'gpt-5.5': Unknown client type";
    expect(unknownType.body.error.slice(0, prefix.length)).toBe(prefix);

    const keyless: Partial<ModelRow> = row();
    delete keyless.api_key;
    await saved({ models: [keyless] });
    const missingKey = await start();

    expect(missingKey.status).toBe(400);
    expect(missingKey.body).toEqual({
      error: "models[0]: api_key must be a non-empty string.",
    });

    await saved({ models: [] });
    expect((await start()).body).toEqual({
      error: "models is empty: the server needs at least one model row.",
    });

    await saved({ models: [row()], api_keys: [""] });
    expect((await start()).body).toEqual({
      error: "api_keys[0] must be a non-empty string.",
    });
    expect(await status()).toEqual({ running: false });
  });

  test("start resolves environment references", async () => {
    process.env.PROBE_UPSTREAM_KEY = "sk-probe";
    process.env.PROBE_SERVER_KEY = "srv";
    await saved({
      models: [row({ api_key: "$PROBE_UPSTREAM_KEY" })],
      api_keys: ["${PROBE_SERVER_KEY}"],
    });

    const started = await start();

    expect(started.status).toBe(200);
    expect(started.body.open).toBe(false);
    // the status reports the config as typed
    expect(started.body.config.api_keys).toEqual(["${PROBE_SERVER_KEY}"]);
    expect(started.body.config.models[0].api_key).toBe("$PROBE_UPSTREAM_KEY");
    expect((await listModels(started.body.base_url)).status).toBe(401);
    expect(
      await listModels(started.body.base_url, { Authorization: "Bearer srv" }),
    ).toEqual({ status: 200, ids: ["gpt-5.5"] });

    await stop();
    await saved({ models: [row({ api_key: "$NOPE_KEY" })] });
    const refused = await start();

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
      await saved({ models: [row()], port });
      const response = await start();

      expect(response.status).toBe(400);
      const prefix = `Cannot listen on 127.0.0.1:${port}: `;
      expect(response.body.error.slice(0, prefix.length)).toBe(prefix);
      expect(response.body.error.toLowerCase()).toContain("in use");
      expect(await status()).toEqual({ running: false });
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });

  test("start builds an auto row", async () => {
    // no client type and no base URL: the official client the id names, at its own endpoint,
    // whose constructor reaches no network
    await saved({
      models: [
        { model_id: "gpt-5.5", api_key: "sk-test", server_model_id: "gpt" },
      ],
    });

    const started = await start();

    expect(started.status).toBe(200);
    expect(started.body.models).toEqual(["gpt"]);
    expect(started.body.config.models).toEqual([
      { model_id: "gpt-5.5", api_key: "sk-test", server_model_id: "gpt" },
    ]);
  });
});
