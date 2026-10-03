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

/**
 * Playground for interacting with LLMs.
 *
 * This module provides a web interface for chatting with language models,
 * with support for config editing, streaming responses, and message cards
 * showing token usage and stop reasons.
 */

import express, { Express, NextFunction, Request, Response } from "express";
import * as fs from "fs";
import http from "http";
import { AddressInfo } from "net";
import * as path from "path";
import {
  AutoLLMClient,
  COMPATIBLE_CLIENT_TYPES,
  MODEL_FAMILIES,
  OFFICIAL_CLIENT_TYPES,
} from "../autoClient";
import { UniMessage, UniConfig } from "../types";
import { DEFAULT_HOST, DEFAULT_PORT, serverBaseUrl } from "../wire";
import {
  COLUMNS,
  ServerConfig,
  ServerMetrics,
  announceServer,
  createServerApp,
  readServerConfig,
  resolveServerConfig,
} from "./server";
import { SERVER_TEMPLATE } from "./serverPage";
import { Tracer } from "./tracer";

const sessionClients: Map<string, AutoLLMClient> = new Map();
const sessionClientOptions: Map<string, PlaygroundClientOptions> = new Map();
const sessionAbortControllers: Map<string, AbortController> = new Map();

/**
 * The server page's config file as the page compares it: rows and keys as written, host and port
 * with the defaults filled.
 */
interface SavedConfig {
  models: unknown[];
  api_keys: unknown[];
  host: string;
  port: number;
}

/**
 * The MMSP server the playground started, until it is stopped.
 */
interface RunningServer {
  server: http.Server;
  host: string;
  port: number;
  modelIds: string[];
  open: boolean;
  /** The saved config it was started from */
  config: SavedConfig;
  metrics: ServerMetrics;
}

// one server per process, dying with it; a start or restart in flight counts as running, so that
// two cannot both bind
let mmspServer: RunningServer | null = null;
let mmspServerStarting = false;

interface PlaygroundConfig extends UniConfig {
  model?: string;
  api_key?: string;
  base_url?: string;
  client_type?: string;
  default_headers?: Record<string, string>;
}

interface PlaygroundClientOptions {
  model: string;
  apiKey?: string;
  baseUrl?: string;
  clientType?: string;
  defaultHeaders?: Record<string, string>;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getClientOptions(config: PlaygroundConfig): PlaygroundClientOptions {
  return {
    model: normalizeOptionalString(config.model) || "gpt-5.6-luna",
    apiKey: normalizeOptionalString(config.api_key),
    baseUrl: normalizeOptionalString(config.base_url),
    clientType: normalizeOptionalString(config.client_type),
    defaultHeaders: config.default_headers,
  };
}

function getRequestConfig(config: PlaygroundConfig): UniConfig {
  const requestConfig = { ...config };
  delete requestConfig.model;
  delete requestConfig.api_key;
  delete requestConfig.base_url;
  delete requestConfig.client_type;
  delete requestConfig.default_headers;
  return requestConfig;
}

function clientOptionsChanged(
  previous: PlaygroundClientOptions | undefined,
  next: PlaygroundClientOptions,
): boolean {
  return (
    !previous ||
    previous.model !== next.model ||
    previous.apiKey !== next.apiKey ||
    previous.baseUrl !== next.baseUrl ||
    previous.clientType !== next.clientType ||
    JSON.stringify(previous.defaultHeaders) !==
      JSON.stringify(next.defaultHeaders)
  );
}

/**
 * Serialize objects for JSON, converting Buffer to base64.
 *
 * @param obj - Object to serialize
 * @returns JSON-serializable object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeForJson(obj: any): any {
  if (Buffer.isBuffer(obj)) {
    return obj.toString("base64");
  } else if (obj && typeof obj === "object") {
    if (Array.isArray(obj)) {
      return obj.map((item) => serializeForJson(item));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = serializeForJson(value);
      }
      return result;
    }
  }
  return obj;
}

/**
 * Create an Express web application for chatting with LLMs.
 *
 * @returns Express application instance
 */
// The endpoint each client type reaches when it is given no base URL: the environment's, else the
// vendor's own. The playground fills the Base URL field with it and leaves it out of requests.
const DEFAULT_BASE_URLS: Record<string, [string, string]> = {
  "openai-official": ["OPENAI_BASE_URL", "https://api.openai.com/v1"],
  "anthropic-official": ["ANTHROPIC_BASE_URL", "https://api.anthropic.com"],
  "gemini-official": [
    "GEMINI_BASE_URL",
    "https://generativelanguage.googleapis.com",
  ],
  "zai-official": ["ZAI_BASE_URL", "https://api.z.ai/api/paas/v4/"],
  "moonshot-official": ["MOONSHOT_BASE_URL", "https://api.moonshot.cn/v1"],
  "deepseek-official": ["DEEPSEEK_BASE_URL", "https://api.deepseek.com"],
  "minimax-official": ["MINIMAX_BASE_URL", "https://api.minimax.io/v1"],
  "openai-responses": ["OPENAI_BASE_URL", "https://api.openai.com/v1"],
  "openai-chat": ["OPENAI_BASE_URL", "https://api.openai.com/v1"],
  "openai-chat-vllm-adapter": ["OPENAI_BASE_URL", "https://api.openai.com/v1"],
  "openai-embedding": ["OPENAI_BASE_URL", "https://api.openai.com/v1"],
  "ant-messages": ["ANTHROPIC_BASE_URL", "https://api.anthropic.com"],
  "google-genai": [
    "GEMINI_BASE_URL",
    "https://generativelanguage.googleapis.com",
  ],
  mmsp: ["MMSP_BASE_URL", "http://127.0.0.1:25752/v1"],
};

/**
 * The client types, their model families and default endpoints, as the page script reads them.
 */
function playgroundDefaults(): string {
  return JSON.stringify({
    official: OFFICIAL_CLIENT_TYPES,
    compatible: COMPATIBLE_CLIENT_TYPES,
    families: MODEL_FAMILIES,
    baseUrls: Object.fromEntries(
      Object.entries(DEFAULT_BASE_URLS).map(([name, [env, url]]) => [
        name,
        process.env[env] || url,
      ]),
    ),
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const HOST_MESSAGE = "host must be a non-empty string.";
const PORT_MESSAGE = "port must be an integer between 0 and 65535.";

function isHost(host: unknown): host is string {
  return typeof host === "string" && host.trim() !== "";
}

function isPort(port: unknown): port is number {
  return (
    typeof port === "number" &&
    Number.isInteger(port) &&
    port >= 0 &&
    port <= 65535
  );
}

/**
 * Where the server page saves its table: MMSP_SERVER_CONFIG, else server.json in the tracer's
 * cache directory.
 */
function serverConfigPath(): string {
  const named = process.env.MMSP_SERVER_CONFIG;
  return named
    ? path.resolve(named)
    : path.resolve(process.env.MMSP_CACHE_DIR || "cache", "server.json");
}

/**
 * The four keys the page compares: rows and keys as written, host and port with the defaults
 * filled.
 */
function savedConfigView(config: Record<string, unknown>): SavedConfig {
  return {
    models: config.models as unknown[],
    api_keys: (config.api_keys ?? []) as unknown[],
    host: ("host" in config ? config.host : DEFAULT_HOST) as string,
    port: ("port" in config ? config.port : DEFAULT_PORT) as number,
  };
}

/**
 * Write the config file whole: to a sibling first, then moved over the old one.
 */
function writeSavedConfig(configPath: string, config: SavedConfig): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const temporary = `${configPath}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(config, null, 2) + "\n");
  fs.renameSync(temporary, configPath);
}

/**
 * The server page's status: `{ running: false }`, or where the server listens, what it serves, and
 * the saved config it was started from.
 */
function mmspServerStatus(): Record<string, unknown> {
  if (mmspServer === null) {
    return { running: false };
  }
  const { host, port, modelIds, open, config } = mmspServer;
  return {
    running: true,
    host,
    port,
    base_url: serverBaseUrl(host, port),
    models: modelIds,
    open,
    config,
  };
}

/**
 * Stop the MMSP server the playground started, ending its open streams; nothing when none runs.
 */
async function stopMmspServer(): Promise<void> {
  const running = mmspServer;
  if (running === null) {
    return;
  }
  mmspServer = null;
  // a destroyed stream aborts its upstream request through the server's close handler
  running.server.closeAllConnections();
  await new Promise<void>((resolve) => running.server.close(() => resolve()));
  console.log(
    `Stopped MMSP server at ${serverBaseUrl(running.host, running.port)}`,
  );
}

/**
 * Create the server page's app: the page at `/`, and `/api/config`, `/api/status`, `/api/start`,
 * `/api/restart`, `/api/stop`, `/api/metrics`. Start and restart serve the saved config file,
 * never a request body. The parent app parses the JSON bodies.
 *
 * @param configPath - The absolute path of the config file the page saves
 * @returns Express application instance, mounted at /server
 */
function createServerPageApp(configPath: string): Express {
  const app = express();

  /**
   * The config file as `GET /api/config` reports it: its path, whether it exists, and its
   * contents, or why they cannot be read.
   */
  const savedConfigBody = (): Record<string, unknown> => {
    let config: Record<string, unknown>;
    try {
      config = readServerConfig(configPath);
    } catch (error) {
      if ((error as { code?: unknown }).code === "ENOENT") {
        return { path: configPath, exists: false, config: null };
      }
      return {
        path: configPath,
        exists: true,
        config: null,
        error: errorMessage(error),
      };
    }
    return { path: configPath, exists: true, config: savedConfigView(config) };
  };

  /**
   * Start the server from the saved config, or with `restart` put it in place of the running one.
   * Nothing is stopped until the new table is checked and its app is built.
   */
  const launch = async (res: Response, restart: boolean) => {
    const refuse = (status: number, message: string) =>
      res.status(status).json({ error: message });
    let saved: Record<string, unknown>;
    try {
      saved = readServerConfig(configPath);
    } catch (error) {
      return refuse(
        400,
        (error as { code?: unknown }).code === "ENOENT"
          ? `No saved config at ${configPath}; save the table first.`
          : errorMessage(error),
      );
    }
    const view = savedConfigView(saved);
    const { host, port } = view;
    if (!isHost(host)) {
      return refuse(400, HOST_MESSAGE);
    }
    if (!isPort(port)) {
      return refuse(400, PORT_MESSAGE);
    }
    let config: ServerConfig;
    try {
      config = resolveServerConfig({
        models: view.models,
        api_keys: view.api_keys,
      });
    } catch (error) {
      return refuse(400, errorMessage(error));
    }
    if (mmspServerStarting || (!restart && mmspServer !== null)) {
      return refuse(409, "The server is running; stop it first.");
    }

    mmspServerStarting = true;
    try {
      let serverApp: Express;
      try {
        serverApp = createServerApp({
          models: config.models,
          apiKeys: config.api_keys,
        });
      } catch (error) {
        return refuse(400, errorMessage(error));
      }
      await stopMmspServer();
      const server = http.createServer(serverApp);
      try {
        await new Promise<void>((resolve, reject) => {
          server.once("error", reject);
          server.listen(port, host, () => {
            server.off("error", reject);
            resolve();
          });
        });
      } catch (error) {
        return refuse(
          400,
          `Cannot listen on ${host}:${port}: ${errorMessage(error)}`,
        );
      }
      mmspServer = {
        server,
        host,
        // the bound port, so that port 0 reports the one the system chose
        port: (server.address() as AddressInfo).port,
        modelIds: serverApp.locals.serverModelIds as string[],
        open: config.api_keys.length === 0,
        config: view,
        metrics: serverApp.locals.metrics as ServerMetrics,
      };
      announceServer(
        host,
        mmspServer.port,
        mmspServer.modelIds,
        mmspServer.open,
      );
      return res.json(mmspServerStatus());
    } finally {
      mmspServerStarting = false;
    }
  };

  app.get("/", (_req: Request, res: Response) => {
    res
      .type("html")
      .send(
        SERVER_TEMPLATE.replace(
          "__PLAYGROUND_DEFAULTS__",
          playgroundDefaults(),
        ),
      );
  });

  app.get("/api/config", (_req: Request, res: Response) => {
    res.json(savedConfigBody());
  });

  app.put("/api/config", (req: Request, res: Response) => {
    const refuse = (status: number, message: string) =>
      res.status(status).json({ error: message });
    // express leaves an empty object behind for a body of another content type
    const body: unknown = req.is("application/json") ? req.body : null;
    if (!isObject(body)) {
      return refuse(400, "Request body must be a JSON object.");
    }
    const { models } = body;
    if (!Array.isArray(models)) {
      return refuse(
        400,
        "the config must be a JSON object with a models list.",
      );
    }
    const apiKeys = "api_keys" in body ? body.api_keys : [];
    if (!Array.isArray(apiKeys)) {
      return refuse(400, "api_keys must be a list.");
    }
    for (const [i, row] of models.entries()) {
      if (!isObject(row)) {
        return refuse(400, `models[${i}] must be an object.`);
      }
      for (const column of COLUMNS) {
        if (column in row && typeof row[column] !== "string") {
          return refuse(400, `models[${i}]: ${column} must be a string.`);
        }
      }
    }
    for (const [i, key] of apiKeys.entries()) {
      if (typeof key !== "string") {
        return refuse(400, `api_keys[${i}] must be a string.`);
      }
    }
    const host = "host" in body ? body.host : DEFAULT_HOST;
    if (!isHost(host)) {
      return refuse(400, HOST_MESSAGE);
    }
    const port = "port" in body ? body.port : DEFAULT_PORT;
    if (!isPort(port)) {
      return refuse(400, PORT_MESSAGE);
    }

    // the file the CLI reads, plus where to listen: only the known columns, as the page typed them
    const config: SavedConfig = {
      models: (models as Record<string, unknown>[]).map((row) =>
        Object.fromEntries(
          COLUMNS.filter((column) => column in row).map((column) => [
            column,
            row[column],
          ]),
        ),
      ),
      api_keys: apiKeys,
      host,
      port,
    };
    try {
      writeSavedConfig(configPath, config);
    } catch (error) {
      return refuse(500, `Cannot write ${configPath}: ${errorMessage(error)}`);
    }
    return res.json({ path: configPath, exists: true, config });
  });

  app.get("/api/status", (_req: Request, res: Response) => {
    res.json(mmspServerStatus());
  });

  app.post("/api/start", (_req: Request, res: Response) => launch(res, false));

  app.post("/api/restart", (_req: Request, res: Response) => launch(res, true));

  app.post("/api/stop", async (_req: Request, res: Response) => {
    await stopMmspServer();
    res.json({ running: false });
  });

  // read in-process, so the page needs no server key
  app.get("/api/metrics", (_req: Request, res: Response) => {
    res.json(
      mmspServer === null
        ? { running: false }
        : { running: true, ...mmspServer.metrics.snapshot() },
    );
  });

  return app;
}

export function createChatApp(): Express {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(
    (
      err: { message?: string; status?: number; type?: string },
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      if (err.status === 413 || err.type === "entity.too.large") {
        return res.status(413).json({
          error:
            "Request body is too large. Please upload fewer or smaller images.",
        });
      }
      // the server page's start and restart read no body, and its save refuses one that is not a
      // JSON object, as the Python playground does
      if (
        err.type === "entity.parse.failed" &&
        req.path.startsWith("/server/api/")
      ) {
        req.body = undefined;
        return next();
      }
      next(err);
    },
  );
  app.use("/tracer", new Tracer().createWebApp({ basePath: "/tracer" }));
  app.use("/server", createServerPageApp(serverConfigPath()));

  const CHAT_TEMPLATE = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <title>MMSP Playground</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Cstyle%3E.d{fill:%23111116}@media (prefers-color-scheme: dark){.d{fill:%232a2a33}}%3C/style%3E%3Cpath d=%22M15.5 0H25a7 7 0 0 1 7 7v9.5H15.5Z%22 class=%22d%22/%3E%3Cpath d=%22M0 15.5h16.5V32H7a7 7 0 0 1-7-7Z%22 class=%22d%22/%3E%3Cpath d=%22M0 16V7a7 7 0 0 1 7-7h9v16Z%22 fill=%22%23477dfb%22/%3E%3Cpath d=%22M16 16h16v9a7 7 0 0 1-7 7h-9Z%22 fill=%22%23477dfb%22/%3E%3Cg fill=%22%23fff%22 font-family=%22ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif%22 font-size=%2210.5%22 font-weight=%22700%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3E%3Ctext x=%228.5%22 y=%228.5%22%3EM%3C/text%3E%3Ctext x=%2223.5%22 y=%228.5%22%3EM%3C/text%3E%3Ctext x=%228.5%22 y=%2223.5%22%3ES%3C/text%3E%3Ctext x=%2223.5%22 y=%2223.5%22%3EP%3C/text%3E%3C/g%3E%3C/svg%3E">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
      <script>
          // the stored theme applies before the first paint; without one the page follows the system
          try {
              const theme = localStorage.getItem('mmsp.playground.theme');
              if (theme === 'light' || theme === 'dark') {
                  document.documentElement.dataset.theme = theme;
              }
          } catch (error) {
              // storage refused: the system theme it is
          }
      </script>
      <style>
          :root {
              --bg: #f5f5f6;
              --panel: #fafafa;
              --surface: #ffffff;
              --raised: #f0f0f2;
              --hover: rgba(20, 22, 28, 0.05);
              --ring: rgba(20, 22, 28, 0.09);
              --ring-strong: rgba(20, 22, 28, 0.17);
              --text: #16181d;
              --muted: #5c616c;
              --subtle: #8a8f99;
              --accent: #2f6fed;
              --accent-soft: rgba(47, 111, 237, 0.14);
              --on-accent: #ffffff;
              --green: #16945b;
              --green-soft: rgba(22, 148, 91, 0.12);
              --amber: #b16a0a;
              --amber-soft: rgba(177, 106, 10, 0.12);
              --red: #d23b3b;
              --red-soft: rgba(210, 59, 59, 0.1);
              --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(20, 22, 28, 0.04);
              --shadow-menu: 0 0 0 1px var(--ring), 0 12px 32px -10px rgba(20, 22, 28, 0.22);
              --shadow-composer: 0 0 0 1px var(--ring), 0 10px 30px -14px rgba(20, 22, 28, 0.25);
              --ease: cubic-bezier(0.23, 1, 0.32, 1);
              --font: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
              --mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
              color-scheme: light;
          }

          @media (prefers-color-scheme: dark) {
              :root:not([data-theme="light"]) {
                  --bg: #1b1c1f;
                  --panel: #18191c;
                  --surface: #222327;
                  --raised: #28292e;
                  --hover: rgba(255, 255, 255, 0.05);
                  --ring: rgba(255, 255, 255, 0.08);
                  --ring-strong: rgba(255, 255, 255, 0.15);
                  --text: #eceef1;
                  --muted: #a3a8b1;
                  --subtle: #6f747e;
                  --accent: #4d8ef7;
                  --accent-soft: rgba(77, 142, 247, 0.2);
                  --green: #43c283;
                  --green-soft: rgba(67, 194, 131, 0.14);
                  --amber: #e3a646;
                  --amber-soft: rgba(227, 166, 70, 0.14);
                  --red: #f06a6a;
                  --red-soft: rgba(240, 106, 106, 0.14);
                  --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.3);
                  --shadow-menu: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 16px 36px -10px rgba(0, 0, 0, 0.65);
                  --shadow-composer: 0 0 0 1px rgba(255, 255, 255, 0.09), 0 14px 36px -14px rgba(0, 0, 0, 0.7);
                  color-scheme: dark;
              }
          }

          :root[data-theme="dark"] {
              --bg: #1b1c1f;
              --panel: #18191c;
              --surface: #222327;
              --raised: #28292e;
              --hover: rgba(255, 255, 255, 0.05);
              --ring: rgba(255, 255, 255, 0.08);
              --ring-strong: rgba(255, 255, 255, 0.15);
              --text: #eceef1;
              --muted: #a3a8b1;
              --subtle: #6f747e;
              --accent: #4d8ef7;
              --accent-soft: rgba(77, 142, 247, 0.2);
              --green: #43c283;
              --green-soft: rgba(67, 194, 131, 0.14);
              --amber: #e3a646;
              --amber-soft: rgba(227, 166, 70, 0.14);
              --red: #f06a6a;
              --red-soft: rgba(240, 106, 106, 0.14);
              --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.3);
              --shadow-menu: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 16px 36px -10px rgba(0, 0, 0, 0.65);
              --shadow-composer: 0 0 0 1px rgba(255, 255, 255, 0.09), 0 14px 36px -14px rgba(0, 0, 0, 0.7);
              color-scheme: dark;
          }

          *, *::before, *::after {
              box-sizing: border-box;
          }

          html, body {
              height: 100%;
              margin: 0;
          }

          body {
              background: var(--bg);
              color: var(--text);
              font: 14px/1.55 var(--font);
              -webkit-font-smoothing: antialiased;
              text-rendering: optimizeLegibility;
          }

          button, input, textarea {
              font: inherit;
              color: inherit;
          }

          button {
              cursor: pointer;
              background: none;
              border: 0;
              padding: 0;
          }

          button:disabled {
              cursor: not-allowed;
          }

          a {
              color: inherit;
              text-decoration: none;
          }

          svg {
              flex: none;
          }

          .hidden {
              display: none !important;
          }

          .mono {
              font-family: var(--mono);
          }

          :focus-visible {
              outline: 2px solid var(--accent);
              outline-offset: 2px;
          }

          ::selection {
              background: var(--accent-soft);
          }

          /* layout */

          .app {
              display: flex;
              height: 100vh;
              height: 100dvh;
              overflow: hidden;
          }

          .sidebar {
              width: 320px;
              flex: none;
              display: flex;
              flex-direction: column;
              background: var(--panel);
              box-shadow: 1px 0 0 var(--ring);
              z-index: 20;
              transition: margin-left 0.3s var(--ease);
          }

          .app.sidebar-collapsed .sidebar {
              margin-left: -321px;
          }

          .sidebar-head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              height: 56px;
              padding: 0 16px 0 20px;
              flex: none;
          }

          .brand {
              display: flex;
              align-items: center;
              gap: 8px;
              min-width: 0;
          }


          .brand-mark {
              width: 22px;
              height: 22px;
              flex: none;
              align-self: center;
          }

          .mark-bg {
              fill: #111116;
          }

          @media (prefers-color-scheme: dark) {
              :root:not([data-theme="light"]) .mark-bg {
                  fill: #2a2a33;
              }
          }

          :root[data-theme="dark"] .mark-bg {
              fill: #2a2a33;
          }

          .brand-name {
              margin: 0;
              font-size: 15px;
              font-weight: 600;
              letter-spacing: -0.01em;
          }

          .brand-sub {
              color: var(--subtle);
              font-size: 13px;
          }

          .sidebar-scroll {
              flex: 1;
              overflow-y: auto;
              padding: 4px 20px 28px;
              scrollbar-gutter: stable;
          }

          .group + .group {
              margin-top: 28px;
          }

          .group-title {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 14px;
              color: var(--subtle);
              font-size: 12px;
              font-weight: 500;
          }

          .group-title::after {
              content: "";
              flex: 1;
              height: 1px;
              background: var(--ring);
          }

          .field + .field {
              margin-top: 14px;
          }

          .field-head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              margin-bottom: 6px;
              min-height: 18px;
          }

          .field-label {
              color: var(--muted);
              font-size: 12.5px;
              font-weight: 500;
          }

          .field-note {
              margin: 6px 0 0;
              color: var(--subtle);
              font-size: 12px;
              line-height: 1.45;
          }

          .field-error {
              margin: 6px 0 0;
              color: var(--red);
              font-size: 12px;
              line-height: 1.45;
              overflow-wrap: anywhere;
          }

          .link-btn {
              color: var(--accent);
              font-size: 12px;
              font-weight: 500;
              border-radius: 4px;
              transition: opacity 0.15s;
          }

          .link-btn:hover {
              opacity: 0.8;
          }

          .link-btn:disabled {
              opacity: 0.5;
          }

          .status-text {
              color: var(--subtle);
              font-size: 12px;
          }

          .control {
              display: block;
              width: 100%;
              min-height: 34px;
              padding: 7px 10px;
              background: var(--surface);
              border: 0;
              border-radius: 8px;
              box-shadow: 0 0 0 1px var(--ring);
              font-size: 13px;
              line-height: 20px;
              transition: box-shadow 0.15s var(--ease), background-color 0.15s;
          }

          .control::placeholder {
              color: var(--subtle);
          }

          .control:hover {
              box-shadow: 0 0 0 1px var(--ring-strong);
          }

          .control:focus, .control:focus-visible {
              outline: none;
              box-shadow: 0 0 0 1px var(--accent), 0 0 0 4px var(--accent-soft);
          }

          .control.invalid {
              box-shadow: 0 0 0 1px var(--red), 0 0 0 4px var(--red-soft);
          }

          textarea.control {
              resize: vertical;
              min-height: 64px;
          }

          .control.code {
              font-family: var(--mono);
              font-size: 12px;
              line-height: 18px;
          }

          .input-wrap {
              position: relative;
          }

          .input-wrap .control {
              padding-right: 40px;
          }

          .input-action {
              position: absolute;
              top: 3px;
              right: 3px;
              width: 28px;
              height: 28px;
              display: grid;
              place-items: center;
              border-radius: 6px;
              color: var(--subtle);
              transition: color 0.15s, background-color 0.15s;
          }

          .input-action:hover {
              color: var(--text);
              background: var(--hover);
          }

          .input-tag {
              position: absolute;
              top: 50%;
              right: 8px;
              transform: translateY(-50%);
              padding: 1px 6px;
              border-radius: 999px;
              background: var(--raised);
              color: var(--subtle);
              font-size: 11px;
              pointer-events: none;
          }

          /* comboboxes */

          [data-combobox] {
              position: relative;
          }

          .combo-button {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              text-align: left;
          }

          .combo-button[aria-expanded="true"] {
              box-shadow: 0 0 0 1px var(--accent), 0 0 0 4px var(--accent-soft);
          }

          .combo-button [data-combobox-label] {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
          }

          .combo-button svg {
              color: var(--subtle);
              transition: transform 0.2s var(--ease);
          }

          .combo-button[aria-expanded="true"] svg {
              transform: rotate(180deg);
          }

          [data-combobox-menu] {
              position: absolute;
              z-index: 30;
              top: calc(100% + 6px);
              left: 0;
              right: 0;
              max-height: 320px;
              overflow-y: auto;
              padding: 4px;
              background: var(--surface);
              border-radius: 10px;
              box-shadow: var(--shadow-menu);
              transform-origin: top center;
              animation: menu-in 0.18s var(--ease);
          }

          @keyframes menu-in {
              from {
                  opacity: 0;
                  transform: translateY(-4px) scale(0.98);
              }
          }

          .menu-search {
              position: sticky;
              top: -4px;
              margin: -4px -4px 4px;
              padding: 8px 8px 6px;
              background: var(--surface);
              box-shadow: 0 1px 0 var(--ring);
              z-index: 1;
          }

          .menu-search input {
              width: 100%;
              height: 30px;
              padding: 0 8px;
              border: 0;
              border-radius: 6px;
              background: var(--raised);
              font-size: 13px;
          }

          .menu-search input:focus {
              outline: none;
              box-shadow: 0 0 0 1px var(--accent);
          }

          .menu-heading {
              padding: 8px 8px 4px;
              color: var(--subtle);
              font-size: 11.5px;
              font-weight: 500;
          }

          .menu-empty {
              padding: 10px 8px;
              color: var(--subtle);
              font-size: 12.5px;
          }

          .combo-option {
              position: relative;
              display: block;
              width: 100%;
              padding: 6px 28px 6px 8px;
              border-radius: 6px;
              text-align: left;
              font-size: 13px;
              line-height: 18px;
              transition: background-color 0.1s;
          }

          .combo-option span {
              display: block;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
          }

          .combo-option::after {
              content: attr(data-description);
              display: block;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              color: var(--subtle);
              font-family: var(--mono);
              font-size: 11px;
              line-height: 16px;
          }

          .combo-option[data-description=""]::after {
              display: none;
          }

          .combo-option:hover, .combo-option:focus-visible {
              outline: none;
              background: var(--hover);
          }

          .combo-option[aria-selected="true"] {
              background: var(--accent-soft);
          }

          .combo-option[aria-selected="true"]::before {
              content: "";
              position: absolute;
              right: 9px;
              top: 50%;
              width: 10px;
              height: 6px;
              margin-top: -5px;
              border-left: 1.75px solid var(--accent);
              border-bottom: 1.75px solid var(--accent);
              transform: rotate(-45deg);
          }

          /* segmented controls */

          .segmented {
              position: relative;
              display: flex;
              padding: 3px;
              border-radius: 9px;
              background: var(--raised);
              box-shadow: inset 0 0 0 1px var(--ring);
          }

          .segmented button {
              position: relative;
              z-index: 1;
              flex: 1;
              min-width: 0;
              height: 26px;
              padding: 0 6px;
              border-radius: 6px;
              color: var(--muted);
              font-size: 12.5px;
              font-weight: 500;
              white-space: nowrap;
              transition: color 0.15s;
          }

          .segmented button:hover {
              color: var(--text);
          }

          .segmented button[aria-checked="true"] {
              color: var(--text);
          }

          .seg-thumb {
              position: absolute;
              top: 3px;
              bottom: 3px;
              left: 0;
              width: 0;
              border-radius: 6px;
              background: var(--surface);
              box-shadow: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.12);
              transition: transform 0.25s var(--ease), width 0.25s var(--ease);
          }

          .theme-toggle {
              width: 64px;
              flex: none;
          }

          .theme-toggle button {
              display: grid;
              place-items: center;
              padding: 0;
          }

          /* main column */

          .main {
              position: relative;
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
          }

          .topbar {
              display: flex;
              align-items: center;
              gap: 10px;
              height: 56px;
              padding: 0 14px;
              flex: none;
              box-shadow: 0 1px 0 var(--ring);
          }

          .topbar-model {
              display: flex;
              align-items: baseline;
              gap: 8px;
              min-width: 0;
          }

          .topbar-model #headerModel {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-weight: 500;
          }

          .topbar-model #headerClientType {
              color: var(--subtle);
              font-size: 12px;
              white-space: nowrap;
          }

          .topbar-actions {
              display: flex;
              align-items: center;
              gap: 4px;
              margin-left: auto;
          }

          .icon-btn {
              display: inline-grid;
              place-items: center;
              width: 32px;
              height: 32px;
              border-radius: 8px;
              color: var(--muted);
              transition: color 0.15s, background-color 0.15s;
          }

          .icon-btn:hover {
              color: var(--text);
              background: var(--hover);
          }

          .ghost-btn {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              height: 32px;
              padding: 0 10px;
              border-radius: 8px;
              color: var(--muted);
              font-size: 13px;
              font-weight: 500;
              white-space: nowrap;
              transition: color 0.15s, background-color 0.15s;
          }

          .ghost-btn:hover {
              color: var(--text);
              background: var(--hover);
          }

          .messages {
              flex: 1;
              overflow-y: auto;
              scrollbar-gutter: stable both-edges;
          }

          .thread {
              max-width: 760px;
              margin: 0 auto;
              padding: 32px 20px 24px;
          }

          .empty-state {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 6px;
              min-height: 100%;
              padding: 40px 20px;
              text-align: center;
          }

          .empty-state h2 {
              margin: 0;
              font-size: 20px;
              font-weight: 600;
              letter-spacing: -0.015em;
          }

          .empty-state p {
              margin: 0;
              color: var(--muted);
          }

          /* messages */

          .msg {
              margin-bottom: 28px;
              animation: msg-in 0.35s var(--ease);
          }

          @keyframes msg-in {
              from {
                  opacity: 0;
                  transform: translateY(6px);
              }
          }

          .msg-head {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 8px;
              color: var(--subtle);
              font-size: 12px;
          }

          .msg-model {
              color: var(--muted);
              font-weight: 500;
          }

          .msg-user {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
          }

          .msg-user .msg-head {
              margin-bottom: 6px;
          }

          .bubble {
              max-width: min(85%, 600px);
              padding: 10px 14px;
              border-radius: 18px 18px 6px 18px;
              background: var(--raised);
              box-shadow: inset 0 0 0 1px var(--ring);
          }

          .bubble-images {
              display: flex;
              flex-wrap: wrap;
              justify-content: flex-end;
              gap: 6px;
              margin-bottom: 6px;
          }

          .bubble-images img {
              max-width: 220px;
              max-height: 220px;
              border-radius: 12px;
              object-fit: cover;
          }

          .bubble-images:last-child {
              margin-bottom: 0;
          }

          .message-content {
              white-space: pre-wrap;
              overflow-wrap: anywhere;
          }

          .message-content:empty {
              display: none;
          }

          .msg-assistant .message-content {
              white-space: normal;
          }

          .msg-assistant .message-content:empty {
              display: block;
          }

          .text-content {
              white-space: pre-wrap;
              overflow-wrap: anywhere;
              line-height: 1.65;
          }

          .text-content + *, * + .text-content {
              margin-top: 10px;
          }

          .pending {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              color: var(--muted);
              font-size: 13px;
          }

          .pending-grid {
              display: grid;
              grid-template-columns: repeat(3, 3px);
              gap: 2px;
          }

          .pending-grid i {
              width: 3px;
              height: 3px;
              border-radius: 1px;
              background: var(--subtle);
              animation: pixel 1.2s infinite ease-in-out;
          }

          .pending-grid i:nth-child(2), .pending-grid i:nth-child(4) { animation-delay: 0.15s; }
          .pending-grid i:nth-child(3), .pending-grid i:nth-child(5), .pending-grid i:nth-child(7) { animation-delay: 0.3s; }
          .pending-grid i:nth-child(6), .pending-grid i:nth-child(8) { animation-delay: 0.45s; }
          .pending-grid i:nth-child(9) { animation-delay: 0.6s; }

          @keyframes pixel {
              0%, 100% { opacity: 0.25; }
              50% { opacity: 1; background: var(--text); }
          }

          .shimmer {
              background: linear-gradient(90deg, var(--subtle) 0%, var(--subtle) 35%, var(--text) 50%, var(--subtle) 65%, var(--subtle) 100%);
              background-size: 250% 100%;
              -webkit-background-clip: text;
              background-clip: text;
              color: transparent;
              animation: shimmer 1.8s linear infinite;
          }

          @keyframes shimmer {
              from { background-position: 100% 0; }
              to { background-position: -150% 0; }
          }

          .elapsed {
              color: var(--subtle);
              font-family: var(--mono);
              font-size: 12px;
              font-variant-numeric: tabular-nums;
          }

          .thinking {
              margin: 2px 0 12px;
          }

          .thinking-head {
              display: inline-flex;
              align-items: center;
              gap: 7px;
              padding: 2px 0;
              color: var(--muted);
              font-size: 13px;
              transition: color 0.15s;
          }

          .thinking-head:hover {
              color: var(--text);
          }

          .thinking-head .chevron {
              transition: transform 0.25s var(--ease);
          }

          .thinking.open .thinking-head .chevron {
              transform: rotate(180deg);
          }

          .thinking-body {
              display: grid;
              grid-template-rows: 0fr;
              opacity: 0;
              transition: grid-template-rows 0.35s var(--ease), opacity 0.25s var(--ease);
          }

          .thinking.open .thinking-body {
              grid-template-rows: 1fr;
              opacity: 1;
          }

          .thinking-inner {
              overflow: hidden;
          }

          .thinking-text strong {
              color: var(--text);
              font-weight: 500;
          }

          .thinking-text {
              margin: 8px 0 2px 6px;
              padding: 2px 0 2px 16px;
              box-shadow: inset 1px 0 0 var(--ring-strong);
              color: var(--muted);
              font-size: 13px;
              line-height: 1.6;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
          }

          .tool {
              margin: 4px 0 12px;
              border-radius: 12px;
              background: var(--surface);
              box-shadow: var(--shadow-card);
              overflow: hidden;
          }

          .tool-head {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 8px 12px;
              font-size: 13px;
          }

          .tool-icon {
              display: grid;
              place-items: center;
              width: 22px;
              height: 22px;
              border-radius: 6px;
              background: var(--amber-soft);
              color: var(--amber);
          }

          .tool-name {
              font-family: var(--mono);
              font-size: 12.5px;
              font-weight: 500;
          }

          .tool-state {
              margin-left: auto;
              color: var(--subtle);
              font-size: 12px;
          }

          .tool-args {
              margin: 0;
              padding: 10px 12px;
              max-height: 280px;
              overflow: auto;
              background: var(--raised);
              box-shadow: inset 0 1px 0 var(--ring);
              font-family: var(--mono);
              font-size: 12px;
              line-height: 1.6;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
          }

          .tool-args:empty {
              display: none;
          }

          .media {
              margin: 4px 0 12px;
          }

          .media img {
              display: block;
              max-width: min(100%, 420px);
              border-radius: 12px;
              box-shadow: var(--shadow-card);
          }

          .audio-box {
              display: inline-flex;
              align-items: center;
              gap: 10px;
              margin: 4px 0 12px;
              padding: 8px 12px;
              border-radius: 12px;
              background: var(--surface);
              box-shadow: var(--shadow-card);
              color: var(--muted);
              font-size: 13px;
          }

          .audio-box {
              max-width: 100%;
          }

          .audio-box audio {
              flex: 1 1 auto;
              min-width: 0;
              height: 36px;
              max-width: 320px;
          }

          .inline-data {
              display: inline-block;
              margin: 4px 0 12px;
              padding: 6px 10px;
              border-radius: 8px;
              background: var(--raised);
              color: var(--muted);
              font-family: var(--mono);
              font-size: 12px;
          }

          .embedding-content {
              margin: 4px 0 12px;
              border-radius: 12px;
              background: var(--surface);
              box-shadow: var(--shadow-card);
              overflow: hidden;
          }

          .embedding-head {
              display: flex;
              justify-content: space-between;
              gap: 8px;
              padding: 8px 12px;
              color: var(--muted);
              font-size: 12.5px;
          }

          .embedding-content code {
              display: block;
              padding: 10px 12px;
              background: var(--raised);
              box-shadow: inset 0 1px 0 var(--ring);
              font-family: var(--mono);
              font-size: 12px;
              overflow-wrap: anywhere;
          }

          .error-banner {
              margin: 4px 0 12px;
              padding: 8px 12px;
              border-radius: 10px;
              background: var(--red-soft);
              color: var(--red);
              font-size: 13px;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
          }

          .interrupted {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              margin-top: 8px;
              color: var(--amber);
              font-size: 12.5px;
              font-weight: 500;
          }

          .msg-foot {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              gap: 6px 14px;
              margin-top: 12px;
              color: var(--subtle);
              font-size: 12px;
          }

          .reason {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              height: 22px;
              padding: 0 8px;
              border-radius: 999px;
              background: var(--raised);
              color: var(--muted);
              font-family: var(--mono);
              font-size: 11.5px;
          }

          .reason::before {
              content: "";
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: currentColor;
          }

          .reason-stop { background: var(--green-soft); color: var(--green); }
          .reason-tool_call { background: var(--amber-soft); color: var(--amber); }
          .reason-length, .reason-unknown { background: var(--red-soft); color: var(--red); }

          .usage {
              display: inline-flex;
              flex-wrap: wrap;
              gap: 4px 12px;
              font-family: var(--mono);
              font-size: 11.5px;
              font-variant-numeric: tabular-nums;
          }

          .usage b {
              color: var(--muted);
              font-weight: 500;
          }

          .copy-btn {
              width: 26px;
              height: 26px;
              margin-left: auto;
              border-radius: 6px;
          }

          /* composer */

          .composer-wrap {
              flex: none;
              padding: 0 20px 20px;
          }

          .composer {
              max-width: 760px;
              margin: 0 auto;
              padding: 10px 10px 8px 14px;
              border-radius: 20px;
              background: var(--surface);
              box-shadow: var(--shadow-composer);
              transition: box-shadow 0.2s var(--ease);
          }

          .composer:focus-within {
              box-shadow: 0 0 0 1px var(--ring-strong), 0 0 0 4px var(--accent-soft), 0 14px 36px -14px rgba(0, 0, 0, 0.3);
          }

          .composer.dragging {
              box-shadow: 0 0 0 1.5px var(--accent), 0 0 0 5px var(--accent-soft);
          }

          .previews {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              padding: 2px 0 10px;
          }

          .preview {
              position: relative;
              animation: msg-in 0.25s var(--ease);
          }

          .preview img {
              display: block;
              width: 56px;
              height: 56px;
              object-fit: cover;
              border-radius: 10px;
              box-shadow: 0 0 0 1px var(--ring);
          }

          .preview button {
              position: absolute;
              top: -6px;
              right: -6px;
              display: grid;
              place-items: center;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: var(--text);
              color: var(--bg);
              box-shadow: 0 0 0 2px var(--surface);
              opacity: 0;
              transition: opacity 0.15s;
          }

          .preview:hover button, .preview button:focus-visible {
              opacity: 1;
          }

          #messageInput {
              display: block;
              width: 100%;
              min-height: 24px;
              max-height: 200px;
              padding: 4px 0;
              border: 0;
              outline: none;
              resize: none;
              background: transparent;
              font-size: 14.5px;
              line-height: 22px;
          }

          #messageInput::placeholder {
              color: var(--subtle);
          }

          .composer-bar {
              display: flex;
              align-items: center;
              gap: 6px;
              margin-top: 6px;
          }

          .composer-hint {
              color: var(--subtle);
              font-size: 12px;
          }

          .send-btn {
              display: grid;
              place-items: center;
              width: 32px;
              height: 32px;
              margin-left: auto;
              border-radius: 50%;
              background: var(--text);
              color: var(--bg);
              transition: transform 0.2s var(--ease), opacity 0.15s, background-color 0.15s;
          }

          .send-btn:hover:not(:disabled) {
              transform: scale(1.06);
          }

          .send-btn:active:not(:disabled) {
              transform: scale(0.94);
          }

          .send-btn:disabled {
              opacity: 0.25;
          }

          .scrim {
              display: none;
          }

          @media (max-width: 900px) {
              .sidebar {
                  position: fixed;
                  top: 0;
                  bottom: 0;
                  left: 0;
                  width: min(340px, 88vw);
                  margin-left: 0 !important;
                  transform: translateX(-102%);
                  transition: transform 0.32s var(--ease);
                  box-shadow: var(--shadow-menu);
                  z-index: 40;
              }

              .app.sidebar-open .sidebar {
                  transform: none;
              }

              .scrim {
                  display: block;
                  position: fixed;
                  inset: 0;
                  z-index: 35;
                  background: rgba(0, 0, 0, 0.35);
                  opacity: 0;
                  pointer-events: none;
                  transition: opacity 0.3s var(--ease);
              }

              .app.sidebar-open .scrim {
                  opacity: 1;
                  pointer-events: auto;
              }

              .ghost-btn .label-wide, .composer-hint {
                  display: none;
              }

              .thread {
                  padding: 24px 16px 16px;
              }

              .composer-wrap {
                  padding: 0 12px 12px;
              }
          }

          @media (prefers-reduced-motion: reduce) {
              *, *::before, *::after {
                  animation-duration: 0.01ms !important;
                  animation-iteration-count: 1 !important;
                  transition-duration: 0.01ms !important;
              }
          }
      </style>
  </head>
  <body>
      <div class="app" id="app">
          <aside class="sidebar" id="configPanel" aria-label="Settings">
              <div class="sidebar-head">
                  <div class="brand">
                      <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M15.5 0H25a7 7 0 0 1 7 7v9.5H15.5Z" class="mark-bg"></path><path d="M0 15.5h16.5V32H7a7 7 0 0 1-7-7Z" class="mark-bg"></path><path d="M0 16V7a7 7 0 0 1 7-7h9v16Z" fill="#477dfb"></path><path d="M16 16h16v9a7 7 0 0 1-7 7h-9Z" fill="#477dfb"></path><g fill="#fff" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="10.5" font-weight="700" text-anchor="middle" dominant-baseline="central"><text x="8.5" y="8.5">M</text><text x="23.5" y="8.5">M</text><text x="8.5" y="23.5">S</text><text x="23.5" y="23.5">P</text></g></svg>
                      <h1 class="brand-name">MMSP</h1>
                      <span class="brand-sub">Playground</span>
                  </div>
                  <div class="segmented theme-toggle" id="themeToggle" role="radiogroup" aria-label="Theme">
                      <span class="seg-thumb" aria-hidden="true"></span>
                      <button type="button" role="radio" aria-checked="false" aria-label="Light theme" title="Light" data-theme-choice="light" onclick="setTheme('light')">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
                      </button>
                      <button type="button" role="radio" aria-checked="false" aria-label="Dark theme" title="Dark" data-theme-choice="dark" onclick="setTheme('dark')">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path></svg>
                      </button>
                  </div>
              </div>

              <div class="sidebar-scroll">
                  <section class="group">
                      <div class="group-title"><span>Connection</span></div>

                      <div class="field">
                          <div class="field-head">
                              <label class="field-label" for="modelComboboxButton">Model</label>
                              <span>
                                  <span id="listModelsStatus" class="status-text"></span>
                                  <button type="button" id="listModelsButton" class="link-btn" onclick="listModels()">List models</button>
                              </span>
                          </div>
                          <div id="modelCombobox" data-combobox>
                              <input id="modelSelect" type="hidden" value="gpt-6.1-sol" data-combobox-value>
                              <button id="modelComboboxButton" type="button" role="combobox" aria-controls="modelComboboxMenu" aria-expanded="false" class="control combo-button" onclick="toggleCombobox('modelCombobox')" onkeydown="handleComboboxKeydown(event, 'modelCombobox')" data-combobox-button>
                                  <span data-combobox-label>GPT 6.1 Sol</span>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
                              </button>
                              <div id="modelComboboxMenu" class="hidden" role="listbox" aria-labelledby="modelComboboxButton" data-combobox-menu onkeydown="handleMenuKeydown(event, 'modelCombobox')">
                                  <div class="menu-search">
                                      <input id="modelFilterInput" type="text" autocomplete="off" spellcheck="false" placeholder="Filter models" aria-label="Filter models" oninput="filterModelOptions()">
                                  </div>
                                  <button type="button" role="option" aria-selected="true" class="combo-option" data-combobox-option data-value="gpt-6.1-sol" data-label="GPT 6.1 Sol" data-description="gpt-6.1-sol" onclick="selectComboboxOption('modelCombobox', this)"><span>GPT 6.1 Sol</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="text-embedding-3-large" data-label="Text Embedding 3 Large" data-description="text-embedding-3-large" onclick="selectComboboxOption('modelCombobox', this)"><span>Text Embedding 3 Large</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="gemini-3.8-flash" data-label="Gemini 3.8 Flash" data-description="gemini-3.8-flash" onclick="selectComboboxOption('modelCombobox', this)"><span>Gemini 3.8 Flash</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="gemini-3.1-flash-image" data-label="Gemini 3.1 Flash Image" data-description="gemini-3.1-flash-image" onclick="selectComboboxOption('modelCombobox', this)"><span>Gemini 3.1 Flash Image</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="gemini-3.8-flash-tts" data-label="Gemini 3.8 Flash TTS" data-description="gemini-3.8-flash-tts" onclick="selectComboboxOption('modelCombobox', this)"><span>Gemini 3.8 Flash TTS</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="gemini-embedding-2" data-label="Gemini Embedding 2" data-description="gemini-embedding-2" onclick="selectComboboxOption('modelCombobox', this)"><span>Gemini Embedding 2</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="claude-sonnet-5-5" data-label="Claude Sonnet 5.5" data-description="claude-sonnet-5-5" onclick="selectComboboxOption('modelCombobox', this)"><span>Claude Sonnet 5.5</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="claude-opus-5-5" data-label="Claude Opus 5.5" data-description="claude-opus-5-5" onclick="selectComboboxOption('modelCombobox', this)"><span>Claude Opus 5.5</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="claude-fable-5-1" data-label="Claude Fable 5.1" data-description="claude-fable-5-1" onclick="selectComboboxOption('modelCombobox', this)"><span>Claude Fable 5.1</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="glm-5.3-flash" data-label="GLM 5.3 Flash" data-description="glm-5.3-flash" onclick="selectComboboxOption('modelCombobox', this)"><span>GLM 5.3 Flash</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="kimi-k3" data-label="Kimi K3" data-description="kimi-k3" onclick="selectComboboxOption('modelCombobox', this)"><span>Kimi K3</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="MiniMax-M3" data-label="MiniMax M3" data-description="MiniMax-M3" onclick="selectComboboxOption('modelCombobox', this)"><span>MiniMax M3</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="deepseek-flash" data-label="DeepSeek Flash" data-description="deepseek-flash" onclick="selectComboboxOption('modelCombobox', this)"><span>DeepSeek Flash</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="__custom__" data-label="Custom model" data-description="Type any model id" onclick="selectComboboxOption('modelCombobox', this)"><span>Custom model</span></button>
                                  <div id="modelFilterEmpty" class="menu-empty hidden">No model matches</div>
                              </div>
                          </div>
                          <p id="listModelsError" class="field-error hidden"></p>
                          <div id="customModelWrapper" class="hidden" style="margin-top: 8px;">
                              <input id="customModelInput" type="text" autocomplete="off" spellcheck="false" placeholder="Model id" class="control code" oninput="updateHeader()">
                          </div>
                      </div>

                      <div class="field">
                          <div class="field-head">
                              <label class="field-label" for="clientTypeComboboxButton">Client type</label>
                          </div>
                          <div id="clientTypeCombobox" data-combobox>
                              <input id="clientTypeSelect" type="hidden" value="" data-combobox-value>
                              <button id="clientTypeComboboxButton" type="button" role="combobox" aria-controls="clientTypeComboboxMenu" aria-expanded="false" class="control combo-button" onclick="toggleCombobox('clientTypeCombobox')" onkeydown="handleComboboxKeydown(event, 'clientTypeCombobox')" data-combobox-button>
                                  <span class="mono" data-combobox-label>Auto</span>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
                              </button>
                              <div id="clientTypeComboboxMenu" class="hidden" role="listbox" aria-labelledby="clientTypeComboboxButton" data-combobox-menu onkeydown="handleMenuKeydown(event, 'clientTypeCombobox')"></div>
                          </div>
                      </div>

                      <div class="field">
                          <div class="field-head">
                              <label class="field-label" for="apiKeyInput">API key</label>
                          </div>
                          <div class="input-wrap">
                              <input type="password" id="apiKeyInput" autocomplete="off" spellcheck="false" oninput="handleApiKeyInput()" placeholder="From the environment when empty" class="control">
                              <button type="button" id="apiKeyVisibilityToggle" aria-label="Show API key" title="Show API key" class="input-action" onclick="toggleApiKeyVisibility()">
                                  <svg id="apiKeyVisibilityShowIcon" class="hidden" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                  <svg id="apiKeyVisibilityHideIcon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.7 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.3 4.3"></path><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a10.9 10.9 0 0 0 5.4-1.4"></path><path d="M9.9 9.9A3 3 0 0 0 14.1 14.1"></path><path d="M3 3l18 18"></path></svg>
                              </button>
                          </div>
                      </div>

                      <div class="field">
                          <div class="field-head">
                              <label class="field-label" for="baseUrlInput">Base URL</label>
                          </div>
                          <div class="input-wrap">
                              <input type="url" id="baseUrlInput" spellcheck="false" oninput="handleBaseUrlInput()" placeholder="The provider's own endpoint" class="control" style="padding-right: 68px;">
                              <span id="baseUrlDefaultTag" class="input-tag hidden">default</span>
                          </div>
                      </div>

                      <div class="field">
                          <div class="field-head">
                              <label class="field-label" for="extraHeadersInput">Extra headers</label>
                          </div>
                          <textarea id="extraHeadersInput" rows="2" spellcheck="false" placeholder='{"X-Title": "MMSP"}' class="control code" oninput="getExtraHeaders()"></textarea>
                          <p class="field-note">A JSON object, for endpoints that ask for headers of their own.</p>
                      </div>
                  </section>

                  <section class="group">
                      <div class="group-title"><span>Generation</span></div>

                      <div class="field">
                          <div class="field-head">
                              <label class="field-label" for="thinkingLevelComboboxButton">Thinking level</label>
                          </div>
                          <div id="thinkingLevelCombobox" data-combobox>
                              <input id="thinkingLevelSelect" type="hidden" value="" data-combobox-value>
                              <button id="thinkingLevelComboboxButton" type="button" role="combobox" aria-controls="thinkingLevelComboboxMenu" aria-expanded="false" class="control combo-button" onclick="toggleCombobox('thinkingLevelCombobox')" onkeydown="handleComboboxKeydown(event, 'thinkingLevelCombobox')" data-combobox-button>
                                  <span data-combobox-label>Default</span>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
                              </button>
                              <div id="thinkingLevelComboboxMenu" class="hidden" role="listbox" aria-labelledby="thinkingLevelComboboxButton" data-combobox-menu onkeydown="handleMenuKeydown(event, 'thinkingLevelCombobox')">
                                  <button type="button" role="option" aria-selected="true" class="combo-option" data-combobox-option data-value="" data-label="Default" data-description="The provider's default" onclick="selectComboboxOption('thinkingLevelCombobox', this)"><span>Default</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="none" data-label="None" data-description="No thinking" onclick="selectComboboxOption('thinkingLevelCombobox', this)"><span>None</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="low" data-label="Low" data-description="low" onclick="selectComboboxOption('thinkingLevelCombobox', this)"><span>Low</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="medium" data-label="Medium" data-description="medium" onclick="selectComboboxOption('thinkingLevelCombobox', this)"><span>Medium</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="high" data-label="High" data-description="high" onclick="selectComboboxOption('thinkingLevelCombobox', this)"><span>High</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="xhigh" data-label="XHigh" data-description="xhigh" onclick="selectComboboxOption('thinkingLevelCombobox', this)"><span>XHigh</span></button>
                                  <button type="button" role="option" aria-selected="false" class="combo-option" data-combobox-option data-value="max" data-label="Max" data-description="max" onclick="selectComboboxOption('thinkingLevelCombobox', this)"><span>Max</span></button>
                              </div>
                          </div>
                      </div>

                      <div class="field">
                          <div class="field-head">
                              <span class="field-label" id="thinkingSummaryLabel">Thinking summary</span>
                          </div>
                          <div id="thinkingSummaryCombobox" class="segmented" role="radiogroup" aria-labelledby="thinkingSummaryLabel" data-segmented>
                              <input id="thinkingSummaryCheckbox" type="hidden" value="" data-combobox-value>
                              <span class="seg-thumb" aria-hidden="true"></span>
                              <button type="button" role="radio" aria-checked="true" data-combobox-option data-value="" data-label="Default" onclick="selectComboboxOption('thinkingSummaryCombobox', this)">Default</button>
                              <button type="button" role="radio" aria-checked="false" data-combobox-option data-value="true" data-label="On" onclick="selectComboboxOption('thinkingSummaryCombobox', this)">On</button>
                              <button type="button" role="radio" aria-checked="false" data-combobox-option data-value="false" data-label="Off" onclick="selectComboboxOption('thinkingSummaryCombobox', this)">Off</button>
                          </div>
                      </div>

                      <div class="field">
                          <div class="field-head">
                              <span class="field-label" id="toolChoiceLabel">Tool choice</span>
                          </div>
                          <div id="toolChoiceCombobox" class="segmented" role="radiogroup" aria-labelledby="toolChoiceLabel" data-segmented>
                              <input id="toolChoiceSelect" type="hidden" value="" data-combobox-value>
                              <span class="seg-thumb" aria-hidden="true"></span>
                              <button type="button" role="radio" aria-checked="true" data-combobox-option data-value="" data-label="Default" onclick="selectComboboxOption('toolChoiceCombobox', this)">Default</button>
                              <button type="button" role="radio" aria-checked="false" data-combobox-option data-value="auto" data-label="Auto" onclick="selectComboboxOption('toolChoiceCombobox', this)">Auto</button>
                              <button type="button" role="radio" aria-checked="false" data-combobox-option data-value="required" data-label="Required" onclick="selectComboboxOption('toolChoiceCombobox', this)">Required</button>
                              <button type="button" role="radio" aria-checked="false" data-combobox-option data-value="none" data-label="None" onclick="selectComboboxOption('toolChoiceCombobox', this)">None</button>
                          </div>
                      </div>

                      <div class="field">
                          <div class="field-head">
                              <label class="field-label" for="systemPromptInput">System prompt</label>
                          </div>
                          <textarea id="systemPromptInput" rows="3" class="control" placeholder="You are a helpful assistant."></textarea>
                      </div>

                      <div class="field">
                          <div class="field-head">
                              <label class="field-label" for="toolsInput">Tools</label>
                          </div>
                          <textarea id="toolsInput" rows="4" spellcheck="false" placeholder='[{"name": "get_weather", "description": "...", "parameters": {...}}]' class="control code" oninput="validateTools()"></textarea>
                          <p id="toolsError" class="field-error hidden">Not valid JSON. The request goes out without tools.</p>
                      </div>

                      <div class="field">
                          <div class="field-head">
                              <label class="field-label" for="traceIdInput">Trace ID</label>
                          </div>
                          <input type="text" id="traceIdInput" spellcheck="false" placeholder="session_001" class="control">
                          <p class="field-note">Requests with a trace ID are recorded for the tracer.</p>
                      </div>
                  </section>
              </div>
          </aside>
          <div class="scrim" onclick="toggleConfig()"></div>

          <main class="main">
              <header class="topbar">
                  <button type="button" class="icon-btn" onclick="toggleConfig()" aria-label="Toggle settings" title="Settings">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M9 4v16"></path></svg>
                  </button>
                  <div class="topbar-model">
                      <span id="headerModel">gpt-6.1-sol</span>
                      <span id="headerClientType" class="mono"></span>
                  </div>
                  <div class="topbar-actions">
                      <a href="https://github.com/Prism-Shadow/model-message-stream-protocol" target="_blank" rel="noopener noreferrer" class="ghost-btn" title="GitHub">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"></path></svg>
                          <span class="label-wide">GitHub</span>
                      </a>
                      <a href="/tracer/" target="_blank" rel="noopener noreferrer" class="ghost-btn" title="Open Tracer">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4"></path></svg>
                          <span class="label-wide">Open Tracer</span>
                      </a>
                      <a href="/server/" target="_blank" rel="noopener noreferrer" class="ghost-btn" title="Open Server">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect><path d="M6 6h.01M6 18h.01"></path></svg>
                          <span class="label-wide">Open Server</span>
                      </a>
                      <button type="button" class="ghost-btn" onclick="clearChat()" title="New chat">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                          <span class="label-wide">New chat</span>
                      </button>
                  </div>
              </header>

              <div class="messages" id="messagesContainer">
                  <div class="empty-state" id="emptyState">
                      <h2>Start a conversation</h2>
                      <p>Messages go to <span class="mono" id="emptyStateModel">gpt-6.1-sol</span>, and every stream item shows as it arrives.</p>
                  </div>
                  <div class="thread hidden" id="thread"></div>
              </div>

              <div class="composer-wrap">
                  <div class="composer" id="composer">
                      <div id="imagePreviewContainer" class="previews hidden"></div>
                      <textarea id="messageInput" rows="1" placeholder="Message gpt-6.1-sol" aria-label="Message"></textarea>
                      <div class="composer-bar">
                          <input type="file" id="imageInput" accept="image/*" multiple class="hidden" onchange="handleImageSelect(event)">
                          <button type="button" class="icon-btn" onclick="document.getElementById('imageInput').click()" aria-label="Attach images" title="Attach images">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.4 11.1-8.8 8.8a5.5 5.5 0 0 1-7.8-7.8l8.8-8.8a3.7 3.7 0 0 1 5.2 5.2l-8.8 8.8a1.8 1.8 0 0 1-2.6-2.6l8.1-8.1"></path></svg>
                          </button>
                          <span class="composer-hint">Enter to send, Shift+Enter for a new line</span>
                          <button type="button" class="send-btn" id="sendButton" onclick="sendMessage()" aria-label="Send" title="Send" disabled>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"></path></svg>
                          </button>
                          <button type="button" class="send-btn hidden" id="stopButton" onclick="stopGeneration()" aria-label="Stop" title="Stop" disabled>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"></rect></svg>
                          </button>
                      </div>
                  </div>
              </div>
          </main>
      </div>

      <script>
          let isStreaming = false;
          let sessionId = Math.random().toString(36).substring(7);
          let selectedImages = [];
          let lastMessageTimestamp = null;
          let currentAbortController = null;

          const ICONS = {
              sparkle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c.4 4.6 2.4 7.4 10 10-7.6 2.6-9.6 5.4-10 10-.4-4.6-2.4-7.4-10-10 7.6-2.6 9.6-5.4 10-10Z"></path></svg>',
              chevron: '<svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>',
              tool: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.3-2.3a4 4 0 0 0-5-5L2 10l8-8Z"></path></svg>',
              copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"></path></svg>',
              check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
              audio: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"></path></svg>',
              close: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>'
          };

          function escapeHtml(text) {
              const div = document.createElement('div');
              div.textContent = text;
              return div.innerHTML;
          }

          function formatTimestamp(ms) {
              if (!ms) return '';
              const d = new Date(ms);
              const pad = n => n.toString().padStart(2, '0');
              return \`\${d.getFullYear()}-\${pad(d.getMonth()+1)}-\${pad(d.getDate())} \${pad(d.getHours())}:\${pad(d.getMinutes())}:\${pad(d.getSeconds())}\`;
          }

          function formatClock(ms) {
              if (!ms) return '';
              const d = new Date(ms);
              const pad = n => n.toString().padStart(2, '0');
              return \`\${pad(d.getHours())}:\${pad(d.getMinutes())}\`;
          }

          function formatDuration(ms) {
              if (ms < 1000) return \`\${Math.round(ms)} ms\`;
              if (ms < 60000) return \`\${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s\`;
              return \`\${Math.floor(ms / 60000)} min \${Math.round((ms % 60000) / 1000)} s\`;
          }

          function formatCount(n) {
              return Number(n).toLocaleString('en-US');
          }

          const AUDIO_MIME_TYPES = ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/aac', 'audio/mp4'];

          function isAudioMimeType(mimeType) {
              const value = (mimeType || '').toLowerCase();
              return !value || value === 'application/octet-stream' || value.startsWith('audio/');
          }

          function base64ToBytes(base64) {
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i);
              }
              return bytes;
          }

          function bytesToBase64(bytes) {
              let binary = '';
              const chunkSize = 0x8000;
              for (let i = 0; i < bytes.length; i += chunkSize) {
                  binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
              }
              return btoa(binary);
          }

          function concatBase64Chunks(chunks) {
              const parts = chunks.map(base64ToBytes);
              const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
              let offset = 0;
              for (const part of parts) {
                  bytes.set(part, offset);
                  offset += part.length;
              }
              return bytes;
          }

          function pcmFormatFromMimeType(mimeType) {
              // Gemini TTS labels its raw PCM as "audio/l16; rate=24000; channels=1"
              const params = {};
              for (const parameter of (mimeType || '').split(';').slice(1)) {
                  const [key, value] = parameter.split('=');
                  params[key.trim()] = Number(value);
              }
              return { sampleRate: params.rate || 24000, channels: params.channels || 1 };
          }

          function pcmBytesToWavDataUrl(pcmBytes, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
              const header = new ArrayBuffer(44);
              const view = new DataView(header);
              const byteRate = sampleRate * channels * bitsPerSample / 8;
              const blockAlign = channels * bitsPerSample / 8;

              const writeString = (offset, value) => {
                  for (let i = 0; i < value.length; i++) {
                      view.setUint8(offset + i, value.charCodeAt(i));
                  }
              };

              writeString(0, 'RIFF');
              view.setUint32(4, 36 + pcmBytes.length, true);
              writeString(8, 'WAVE');
              writeString(12, 'fmt ');
              view.setUint32(16, 16, true);
              view.setUint16(20, 1, true);
              view.setUint16(22, channels, true);
              view.setUint32(24, sampleRate, true);
              view.setUint32(28, byteRate, true);
              view.setUint16(32, blockAlign, true);
              view.setUint16(34, bitsPerSample, true);
              writeString(36, 'data');
              view.setUint32(40, pcmBytes.length, true);

              const wavBytes = new Uint8Array(44 + pcmBytes.length);
              wavBytes.set(new Uint8Array(header), 0);
              wavBytes.set(pcmBytes, 44);
              return \`data:audio/wav;base64,\${bytesToBase64(wavBytes)}\`;
          }

          function renderAudioPlayer(mimeType, chunks) {
              const bytes = concatBase64Chunks(chunks);
              if (AUDIO_MIME_TYPES.includes(mimeType)) {
                  return \`\${ICONS.audio}<audio controls preload="metadata"><source src="data:\${mimeType};base64,\${bytesToBase64(bytes)}" type="\${mimeType}"></audio>\`;
              }

              const format = pcmFormatFromMimeType(mimeType);
              const wavDataUrl = pcmBytesToWavDataUrl(bytes, format.sampleRate, format.channels);
              return \`\${ICONS.audio}<audio controls preload="metadata"><source src="\${wavDataUrl}" type="audio/wav"></audio>\`;
          }

          function audioProgressLabel(audioStream) {
              if (AUDIO_MIME_TYPES.includes(audioStream.mimeType)) {
                  return \`Receiving audio, \${Math.round(audioStream.bytes / 1024)} KB\`;
              }

              // raw PCM carries no duration, so 16-bit samples turn the byte count into seconds
              const format = pcmFormatFromMimeType(audioStream.mimeType);
              const seconds = audioStream.bytes / (format.sampleRate * format.channels * 2);
              return \`Receiving audio, \${seconds.toFixed(1)} s\`;
          }

          function appendAudioChunk(contentDiv, item, audioStream) {
              if (!audioStream.container) {
                  audioStream.mimeType = (item.mime_type || '').toLowerCase();
                  audioStream.container = document.createElement('div');
                  audioStream.container.className = 'audio-box';
                  audioStream.container.innerHTML = \`\${ICONS.audio}<span class="shimmer"></span>\`;
                  contentDiv.appendChild(audioStream.container);
              }

              audioStream.chunks.push(item.data);
              audioStream.bytes += Math.floor(item.data.length * 3 / 4);
              audioStream.container.querySelector('span').textContent = audioProgressLabel(audioStream);
          }

          function finalizeAudioStream(audioStream, autoplay = false) {
              if (audioStream.finalized || !audioStream.container) {
                  return;
              }

              audioStream.finalized = true;
              audioStream.container.innerHTML = renderAudioPlayer(audioStream.mimeType, audioStream.chunks);
              if (autoplay) {
                  // a browser that blocks autoplay leaves the player sitting there ready to press
                  audioStream.container.querySelector('audio').play().catch(() => {});
              }
          }

          function renderInlineData(item) {
              const mimeType = (item.mime_type || '').toLowerCase();
              if (mimeType.startsWith('image/')) {
                  return \`<figure class="media"><img src="data:\${mimeType || 'image/png'};base64,\${item.data}" alt="Generated image"></figure>\`;
              }

              return \`<div class="inline-data">Inline data: \${escapeHtml(item.mime_type || 'application/octet-stream')}</div>\`;
          }

          function renderEmbedding(item) {
              const values = Array.isArray(item.embedding) ? item.embedding.slice(0, 5) : [];
              const size = Array.isArray(item.embedding) ? item.embedding.length : 0;
              const preview = escapeHtml(\`[\${values.join(', ')}\${size > values.length ? ', …' : ''}]\`);
              return \`<div class="embedding-content"><div class="embedding-head"><span>Embedding</span><span class="mono">\${formatCount(size)} dimensions</span></div><code>\${preview}</code></div>\`;
          }

          // Every stream item gets the element its kind reads best in; the stream loop only feeds it text.
          function openStreamItem(contentDiv, kind, started = performance.now()) {
              const item = { kind, text: '', name: '', started, root: null, container: null };
              if (kind === 'thinking') {
                  item.root = document.createElement('div');
                  item.root.className = 'thinking open';
                  item.root.innerHTML = \`<button type="button" class="thinking-head" onclick="toggleThinking(this)" aria-expanded="true">\${ICONS.sparkle}<span class="thinking-label shimmer">Thinking</span>\${ICONS.chevron}</button><div class="thinking-body"><div class="thinking-inner"><div class="thinking-text"></div></div></div>\`;
                  item.container = item.root.querySelector('.thinking-text');
              } else if (kind === 'tool_call') {
                  item.root = document.createElement('div');
                  item.root.className = 'tool';
                  item.root.innerHTML = \`<div class="tool-head"><span class="tool-icon">\${ICONS.tool}</span><span class="tool-name"></span><span class="tool-state shimmer">Calling</span></div><pre class="tool-args"></pre>\`;
                  item.container = item.root.querySelector('.tool-args');
              } else {
                  item.root = document.createElement('div');
                  item.root.className = 'text-content';
                  item.container = item.root;
              }
              contentDiv.appendChild(item.root);
              return item;
          }

          function finishStreamItem(item) {
              if (!item) {
                  return;
              }
              if (item.kind === 'thinking') {
                  // a thinking item that carries only a signature has nothing to show
                  if (!item.text.trim()) {
                      item.root.remove();
                      return;
                  }
                  const label = item.root.querySelector('.thinking-label');
                  label.classList.remove('shimmer');
                  label.textContent = \`Thought for \${formatDuration(performance.now() - item.started)}\`;
                  // the answer matters more once it starts; the thinking stays one click away
                  setThinkingOpen(item.root, false);
              } else if (item.kind === 'tool_call') {
                  const state = item.root.querySelector('.tool-state');
                  state.classList.remove('shimmer');
                  state.textContent = 'Tool call';
              }
          }

          function setThinkingOpen(root, open) {
              root.classList.toggle('open', open);
              root.querySelector('.thinking-head').setAttribute('aria-expanded', open ? 'true' : 'false');
          }

          function toggleThinking(button) {
              const root = button.closest('.thinking');
              setThinkingOpen(root, !root.classList.contains('open'));
          }

          // summaries title their paragraphs in **bold**, the only markdown worth reading here
          function renderThinking(text) {
              return escapeHtml(text.trim()).replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
          }

          function prettyArguments(text) {
              try {
                  return JSON.stringify(JSON.parse(text), null, 2);
              } catch (error) {
                  return text;
              }
          }

          function addImageFiles(files) {
              const maxFileSize = 10 * 1024 * 1024;
              const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

              Array.from(files).forEach(file => {
                  if (!allowedTypes.includes(file.type)) {
                      alert(\`File "\${file.name}" is not a valid image type. Please upload JPEG, PNG, GIF, or WebP images.\`);
                      return;
                  }

                  if (file.size > maxFileSize) {
                      alert(\`File "\${file.name}" is too large. Maximum file size is 10MB.\`);
                      return;
                  }

                  const reader = new FileReader();
                  reader.onload = function(e) {
                      const base64Data = e.target.result;
                      if (typeof base64Data === 'string' && base64Data.startsWith('data:image/')) {
                          selectedImages.push(base64Data);
                          updateImagePreview();
                      }
                  };
                  reader.readAsDataURL(file);
              });
          }

          function handleImageSelect(event) {
              const files = event.target.files;
              if (!files || files.length === 0) return;
              addImageFiles(files);
              event.target.value = '';
          }

          function updateImagePreview() {
              const container = document.getElementById('imagePreviewContainer');
              updateSendState();
              if (selectedImages.length === 0) {
                  container.classList.add('hidden');
                  container.innerHTML = '';
                  return;
              }

              container.classList.remove('hidden');
              container.innerHTML = selectedImages.map((img, idx) => \`
                  <div class="preview">
                      <img src="\${img}" alt="Attached image \${idx + 1}">
                      <button type="button" onclick="removeImage(\${idx})" aria-label="Remove image \${idx + 1}">\${ICONS.close}</button>
                  </div>
              \`).join('');
          }

          function removeImage(idx) {
              selectedImages.splice(idx, 1);
              updateImagePreview();
          }

          function isNarrowScreen() {
              return window.matchMedia('(max-width: 900px)').matches;
          }

          function toggleConfig() {
              const app = document.getElementById('app');
              if (isNarrowScreen()) {
                  app.classList.toggle('sidebar-open');
              } else {
                  app.classList.toggle('sidebar-collapsed');
              }
              requestAnimationFrame(updateAllSegmentThumbs);
          }

          function setTheme(theme) {
              document.documentElement.dataset.theme = theme;
              try {
                  localStorage.setItem('mmsp.playground.theme', theme);
              } catch (error) {
                  // a browser that refuses storage keeps the choice for this page only
              }
              updateThemeToggle();
          }

          function updateThemeToggle() {
              const stored = document.documentElement.dataset.theme;
              const theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
              document.querySelectorAll('#themeToggle [data-theme-choice]').forEach((button) => {
                  button.setAttribute('aria-checked', button.dataset.themeChoice === theme ? 'true' : 'false');
              });
              updateSegmentThumb(document.getElementById('themeToggle'));
          }

          // the thumb glides under the checked segment of a segmented control
          function updateSegmentThumb(root) {
              const thumb = root && root.querySelector('.seg-thumb');
              const checked = root && root.querySelector('[aria-checked="true"]');
              if (!thumb || !checked || !checked.offsetWidth) {
                  return;
              }
              thumb.style.width = checked.offsetWidth + 'px';
              thumb.style.transform = \`translateX(\${checked.offsetLeft}px)\`;
          }

          function updateAllSegmentThumbs() {
              document.querySelectorAll('.segmented').forEach(updateSegmentThumb);
          }

          function closeCombobox(comboboxId) {
              const root = document.getElementById(comboboxId);
              if (!root) {
                  return;
              }
              const menu = root.querySelector('[data-combobox-menu]');
              const button = root.querySelector('[data-combobox-button]');
              if (!menu || !button) {
                  return;
              }
              menu.classList.add('hidden');
              button.setAttribute('aria-expanded', 'false');
          }

          function closeComboboxes(exceptId) {
              document.querySelectorAll('[data-combobox]').forEach((root) => {
                  if (root.id !== exceptId) {
                      closeCombobox(root.id);
                  }
              });
          }

          function visibleOptions(menu) {
              return Array.from(menu.querySelectorAll('[data-combobox-option]')).filter((option) => !option.classList.contains('hidden'));
          }

          function toggleCombobox(comboboxId) {
              const root = document.getElementById(comboboxId);
              const menu = root.querySelector('[data-combobox-menu]');
              const isOpen = !menu.classList.contains('hidden');
              closeComboboxes(comboboxId);
              if (isOpen) {
                  closeCombobox(comboboxId);
                  return;
              }
              menu.classList.remove('hidden');
              root.querySelector('[data-combobox-button]').setAttribute('aria-expanded', 'true');

              const filter = menu.querySelector('.menu-search input');
              if (filter) {
                  filter.value = '';
                  filterModelOptions();
                  filter.focus();
              }
              const selected = menu.querySelector('[data-combobox-option][aria-selected="true"]');
              if (selected) {
                  selected.scrollIntoView({ block: 'nearest' });
                  if (!filter) {
                      selected.focus();
                  }
              }
          }

          function selectComboboxOption(comboboxId, option) {
              const root = document.getElementById(comboboxId);
              root.querySelector('[data-combobox-value]').value = option.dataset.value || '';
              const label = root.querySelector('[data-combobox-label]');
              if (label) {
                  label.textContent = option.dataset.label || 'Default';
              }

              root.querySelectorAll('[data-combobox-option]').forEach((item) => {
                  const isSelected = item === option;
                  item.setAttribute(item.getAttribute('role') === 'radio' ? 'aria-checked' : 'aria-selected', isSelected ? 'true' : 'false');
              });
              updateSegmentThumb(root.classList.contains('segmented') ? root : null);

              const wasOpen = root.querySelector('[data-combobox-button][aria-expanded="true"]');
              closeCombobox(comboboxId);
              if (wasOpen) {
                  wasOpen.focus();
              }
              if (comboboxId === 'modelCombobox') {
                  handleModelSelectChange();
              } else if (comboboxId === 'clientTypeCombobox' && !settingClientType) {
                  handleClientTypeChange();
              }

              updateHeader();
              saveConfig();
          }

          function handleComboboxKeydown(event, comboboxId) {
              if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  toggleCombobox(comboboxId);
              } else if (event.key === 'Escape') {
                  closeCombobox(comboboxId);
              }
          }

          // arrows walk the open menu, Escape hands focus back to its button
          function handleMenuKeydown(event, comboboxId) {
              const root = document.getElementById(comboboxId);
              const menu = root.querySelector('[data-combobox-menu]');
              const options = visibleOptions(menu);
              const index = options.indexOf(document.activeElement);
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  const step = event.key === 'ArrowDown' ? 1 : -1;
                  const next = index < 0 ? (step > 0 ? 0 : options.length - 1) : Math.min(Math.max(index + step, 0), options.length - 1);
                  if (options[next]) {
                      options[next].focus();
                  }
              } else if (event.key === 'Enter' && index < 0 && options.length) {
                  event.preventDefault();
                  selectComboboxOption(comboboxId, options[0]);
              } else if (event.key === 'Escape') {
                  event.preventDefault();
                  closeCombobox(comboboxId);
                  root.querySelector('[data-combobox-button]').focus();
              }
          }

          function filterModelOptions() {
              const input = document.getElementById('modelFilterInput');
              const query = input.value.trim().toLowerCase();
              let shown = 0;
              document.querySelectorAll('#modelComboboxMenu [data-combobox-option]').forEach((option) => {
                  const text = \`\${option.dataset.label} \${option.dataset.value}\`.toLowerCase();
                  const match = !query || option.dataset.value === '__custom__' || text.includes(query);
                  option.classList.toggle('hidden', !match);
                  if (match && option.dataset.value !== '__custom__') {
                      shown += 1;
                  }
              });
              document.getElementById('modelFilterEmpty').classList.toggle('hidden', shown > 0);
          }

          document.addEventListener('click', (event) => {
              const target = event.target;
              if (!(target instanceof Element)) {
                  return;
              }
              if (!target.closest('[data-combobox]')) {
                  closeComboboxes();
              }
          });

          // the client types, their model families, and the endpoint each type reaches when no base
          // URL is given (the environment's or the vendor's own), as the server knows them
          const PLAYGROUND = __PLAYGROUND_DEFAULTS__;
          // the base URL the field was last filled with, which counts as no base URL at all
          let filledBaseUrl = '';
          // set while the page picks a client type itself, which is not the user changing it
          let settingClientType = false;

          const CLIENT_TYPE_DESCRIPTIONS = {
              'openai-official': 'OpenAI',
              'anthropic-official': 'Anthropic',
              'gemini-official': 'Google Gemini',
              'zai-official': 'Z.AI',
              'moonshot-official': 'Moonshot',
              'deepseek-official': 'DeepSeek',
              'minimax-official': 'MiniMax',
              'openai-responses': 'OpenAI Responses',
              'openai-chat': 'OpenAI Chat Completions',
              'openai-chat-vllm-adapter': 'Chat Completions on vLLM',
              'openai-embedding': 'OpenAI Embeddings',
              'ant-messages': 'Anthropic Messages',
              'google-genai': 'Google generateContent',
              'mmsp': 'MMSP server'
          };

          function clientTypeOption(value, label, description) {
              const option = document.createElement('button');
              option.type = 'button';
              option.setAttribute('role', 'option');
              option.setAttribute('aria-selected', 'false');
              option.className = 'combo-option';
              option.setAttribute('data-combobox-option', '');
              option.dataset.value = value;
              option.dataset.label = label;
              option.dataset.description = description;
              const text = document.createElement('span');
              text.textContent = label;
              if (value) {
                  text.className = 'mono';
              }
              option.appendChild(text);
              option.onclick = () => selectComboboxOption('clientTypeCombobox', option);
              return option;
          }

          function populateClientTypes() {
              const menu = document.getElementById('clientTypeComboboxMenu');
              menu.appendChild(clientTypeOption('', 'Auto', 'The official client the model id names'));
              [['Official: the vendor’s own API', PLAYGROUND.official], ['Compatible: any endpoint serving the protocol', PLAYGROUND.compatible]].forEach(([title, types]) => {
                  const header = document.createElement('div');
                  header.className = 'menu-heading';
                  header.textContent = title;
                  menu.appendChild(header);
                  types.forEach((type) => menu.appendChild(clientTypeOption(type, type, CLIENT_TYPE_DESCRIPTIONS[type] || '')));
              });
              selectComboboxOption('clientTypeCombobox', menu.querySelector('[data-combobox-option]'));
          }

          function setClientType(value) {
              const option = document.querySelector('#clientTypeComboboxMenu [data-combobox-option][data-value="' + value + '"]')
                  || document.querySelector('#clientTypeComboboxMenu [data-combobox-option][data-value=""]');
              settingClientType = true;
              try {
                  selectComboboxOption('clientTypeCombobox', option);
              } finally {
                  settingClientType = false;
              }
          }

          function familyClientType(model) {
              const lowered = (model || '').toLowerCase();
              const family = PLAYGROUND.families.find(([prefix]) => lowered.startsWith(prefix));
              return family ? family[1] : '';
          }

          function endpointHost(url) {
              try { return new URL(url).host; } catch (error) { return url; }
          }

          // an entry is a model id, a client type, an API key and a base URL; entries alike in all four are one
          function entryKey(modelId, clientType, apiKey, baseUrl) {
              const type = clientType || familyClientType(modelId);
              return JSON.stringify([modelId, type, apiKey || '', baseUrl || PLAYGROUND.baseUrls[type] || '']);
          }

          function optionEntryKey(option) {
              return entryKey(option.dataset.value, option.dataset.clientType || '', option.dataset.apiKey || '', option.dataset.baseUrl || '');
          }

          function selectedModelOption() {
              const modelSelect = document.getElementById('modelSelect');
              if (modelSelect.value === '__custom__') {
                  return null;
              }
              // the selected element, not the first with that id: two entries may share a model id
              return document.querySelector('#modelComboboxMenu [data-combobox-option][aria-selected="true"]');
          }

          function getSelectedClientType() {
              return document.getElementById('clientTypeSelect').value;
          }

          // the client the request will reach: the one chosen, else the one the model id names
          function effectiveClientType() {
              return getSelectedClientType() || familyClientType(getSelectedModel());
          }

          function updateBaseUrlTag() {
              const value = document.getElementById('baseUrlInput').value.trim();
              document.getElementById('baseUrlDefaultTag').classList.toggle('hidden', !value || value !== filledBaseUrl);
          }

          function fillBaseUrl(value) {
              document.getElementById('baseUrlInput').value = value;
              filledBaseUrl = value;
              updateBaseUrlTag();
          }

          // the top bar, the empty state and the composer name the model a message goes to
          function updateHeader() {
              const model = getSelectedModel() || 'a custom model';
              const clientType = effectiveClientType();
              document.getElementById('headerModel').textContent = model;
              document.getElementById('headerClientType').textContent = clientType || 'client type required';
              document.getElementById('emptyStateModel').textContent = model;
              document.getElementById('messageInput').placeholder = \`Message \${model}\`;
          }

          function handleModelSelectChange() {
              const useCustom = document.getElementById('modelSelect').value === '__custom__';
              document.getElementById('customModelWrapper').classList.toggle('hidden', !useCustom);
              if (useCustom) {
                  document.getElementById('customModelInput').focus();
                  return;
              }

              // a model keeps its client type, base URL and API key: a built-in starts from the ones its id
              // names, a listed model from the ones its listing ran under
              const option = selectedModelOption();
              const clientType = (option && option.dataset.clientType) || familyClientType(option && option.dataset.value);
              setClientType(clientType);
              document.getElementById('apiKeyInput').value = (option && option.dataset.apiKey) || '';
              const defaultUrl = PLAYGROUND.baseUrls[effectiveClientType()] || '';
              fillBaseUrl((option && option.dataset.baseUrl) || defaultUrl);
              filledBaseUrl = defaultUrl;
              updateBaseUrlTag();
          }

          function handleClientTypeChange() {
              const option = selectedModelOption();
              if (option) {
                  option.dataset.clientType = getSelectedClientType();
              }
              // an untouched base URL follows the client type to its default
              const input = document.getElementById('baseUrlInput');
              if (input.value.trim() === filledBaseUrl) {
                  fillBaseUrl(PLAYGROUND.baseUrls[effectiveClientType()] || '');
                  if (option) {
                      delete option.dataset.baseUrl;
                  }
              } else {
                  filledBaseUrl = PLAYGROUND.baseUrls[effectiveClientType()] || '';
                  updateBaseUrlTag();
              }
              saveConfig();
          }

          function handleBaseUrlInput() {
              const option = selectedModelOption();
              if (option) {
                  option.dataset.baseUrl = document.getElementById('baseUrlInput').value.trim();
              }
              updateBaseUrlTag();
          }

          function handleApiKeyInput() {
              const option = selectedModelOption();
              if (option) {
                  const value = document.getElementById('apiKeyInput').value.trim();
                  if (value) {
                      option.dataset.apiKey = value;
                  } else {
                      delete option.dataset.apiKey;
                  }
              }
          }

          function getSelectedModel() {
              const modelSelect = document.getElementById('modelSelect');
              if (modelSelect.value === '__custom__') {
                  return document.getElementById('customModelInput').value.trim();
              }
              return modelSelect.value;
          }

          function toggleApiKeyVisibility() {
              const input = document.getElementById('apiKeyInput');
              const toggle = document.getElementById('apiKeyVisibilityToggle');
              const showIcon = document.getElementById('apiKeyVisibilityShowIcon');
              const hideIcon = document.getElementById('apiKeyVisibilityHideIcon');
              const shouldShow = input.type === 'password';

              input.type = shouldShow ? 'text' : 'password';
              toggle.setAttribute('aria-label', shouldShow ? 'Hide API key' : 'Show API key');
              toggle.setAttribute('title', shouldShow ? 'Hide API key' : 'Show API key');
              showIcon.classList.toggle('hidden', !shouldShow);
              hideIcon.classList.toggle('hidden', shouldShow);
          }

          function addListedModels(modelIds) {
              const menu = document.getElementById('modelComboboxMenu');
              const options = Array.from(menu.querySelectorAll('[data-combobox-option]'));
              const known = new Set(options.filter((option) => option.dataset.value !== '__custom__').map(optionEntryKey));
              const customOption = options.find((option) => option.dataset.value === '__custom__') || null;
              // a listed model is served by the endpoint that listed it, so it takes the current
              // client type, base URL and API key
              const clientType = effectiveClientType();
              const baseUrl = document.getElementById('baseUrlInput').value.trim();
              const apiKey = document.getElementById('apiKeyInput').value.trim();

              let added = 0;
              modelIds.forEach((modelId) => {
                  const key = entryKey(modelId, clientType, apiKey, baseUrl);
                  if (known.has(key)) {
                      return;
                  }

                  const option = document.createElement('button');
                  option.type = 'button';
                  option.setAttribute('role', 'option');
                  option.setAttribute('aria-selected', 'false');
                  option.className = 'combo-option';
                  option.setAttribute('data-combobox-option', '');
                  option.dataset.value = modelId;
                  option.dataset.label = modelId;
                  option.dataset.description = clientType ? clientType + (baseUrl ? ' · ' + endpointHost(baseUrl) : '') : 'listed';
                  option.dataset.listed = 'true';
                  if (clientType) {
                      option.dataset.clientType = clientType;
                  }
                  if (baseUrl) {
                      option.dataset.baseUrl = baseUrl;
                  }
                  if (apiKey) {
                      option.dataset.apiKey = apiKey;
                  }
                  option.onclick = () => selectComboboxOption('modelCombobox', option);

                  const label = document.createElement('span');
                  label.textContent = modelId;
                  option.appendChild(label);
                  menu.insertBefore(option, customOption);
                  known.add(key);
                  added += 1;
              });

              return added;
          }

          async function listModels() {
              const button = document.getElementById('listModelsButton');
              const status = document.getElementById('listModelsStatus');
              const error = document.getElementById('listModelsError');

              button.disabled = true;
              status.textContent = 'Listing…';
              error.classList.add('hidden');
              try {
                  const response = await fetch('/api/models', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ config: getConfig() })
                  });
                  const data = await response.json();
                  if (!response.ok) {
                      throw new Error(data.error || 'Request failed');
                  }

                  const added = addListedModels(data.models);
                  status.textContent = data.models.length + ' models, ' + added + ' added';
              } catch (err) {
                  status.textContent = 'Failed';
                  error.textContent = err.message || String(err);
                  error.classList.remove('hidden');
              } finally {
                  button.disabled = false;
              }
          }

          function getExtraHeaders() {
              const input = document.getElementById('extraHeadersInput');
              const raw = input.value.trim();
              input.classList.remove('invalid');
              if (!raw) {
                  return null;
              }
              try {
                  const parsed = JSON.parse(raw);
                  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                      return parsed;
                  }
              } catch (error) {
                  // the invalid marker below covers both a parse failure and a non-object
              }
              input.classList.add('invalid');
              return null;
          }

          // the tools as typed, or null when the field is empty or not JSON, which marks it
          function validateTools() {
              const input = document.getElementById('toolsInput');
              const raw = input.value.trim();
              let tools = null;
              let valid = true;
              if (raw) {
                  try {
                      tools = JSON.parse(raw);
                  } catch (error) {
                      valid = false;
                  }
              }
              input.classList.toggle('invalid', !valid);
              document.getElementById('toolsError').classList.toggle('hidden', valid);
              return tools;
          }

          function getConfig() {
              const config = {
                  model: getSelectedModel()
              };

              const apiKey = document.getElementById('apiKeyInput').value.trim();
              if (apiKey) {
                  config.api_key = apiKey;
              }

              const clientType = getSelectedClientType();
              if (clientType) {
                  config.client_type = clientType;
              }

              // the endpoint filled in for the client type is where it goes anyway, so it stays out of
              // the request: a base URL sent without a key refuses the environment's OpenAI and
              // Anthropic keys
              const baseUrl = document.getElementById('baseUrlInput').value.trim();
              if (baseUrl && baseUrl !== filledBaseUrl) {
                  config.base_url = baseUrl;
              }

              const extraHeaders = getExtraHeaders();
              if (extraHeaders) {
                  config.default_headers = extraHeaders;
              }

              const thinkingLevel = document.getElementById('thinkingLevelSelect').value;
              if (thinkingLevel) {
                  config.thinking_level = thinkingLevel;
              }

              const thinkingSummary = document.getElementById('thinkingSummaryCheckbox').value;
              if (thinkingSummary) {
                  config.thinking_summary = JSON.parse(thinkingSummary);
              }

              const toolChoice = document.getElementById('toolChoiceSelect').value;
              if (toolChoice && toolChoice !== 'auto') {
                  config.tool_choice = toolChoice;
              }

              const systemPrompt = document.getElementById('systemPromptInput').value.trim();
              if (systemPrompt) {
                  config.system_prompt = systemPrompt;
              }

              const tools = validateTools();
              if (tools) {
                  config.tools = tools;
              }

              const traceId = document.getElementById('traceIdInput').value.trim();
              if (traceId) {
                  config.trace_id = traceId;
              }

              return config;
          }

          const CONFIG_STORAGE_KEY = 'mmsp.playground.config';
          // saved as typed rather than as parsed values, so an unfinished JSON edit survives too
          const CONFIG_TEXT_INPUTS = [
              'apiKeyInput', 'baseUrlInput', 'extraHeadersInput', 'systemPromptInput', 'toolsInput', 'traceIdInput'
          ];
          const CONFIG_COMBOBOXES = [
              ['thinkingLevelCombobox', 'thinkingLevelSelect'],
              ['thinkingSummaryCombobox', 'thinkingSummaryCheckbox'],
              ['toolChoiceCombobox', 'toolChoiceSelect']
          ];
          let restoringConfig = false;

          function comboboxOption(comboboxId, value) {
              return document.querySelector('#' + comboboxId + ' [data-combobox-option][data-value="' + value + '"]');
          }

          function saveConfig() {
              if (restoringConfig) {
                  return;
              }

              const saved = { model: getSelectedModel(), client_type: getSelectedClientType() };
              CONFIG_TEXT_INPUTS.forEach((id) => {
                  saved[id] = document.getElementById(id).value;
              });
              CONFIG_COMBOBOXES.forEach(([, valueId]) => {
                  saved[valueId] = document.getElementById(valueId).value;
              });
              try {
                  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(saved));
              } catch (error) {
                  // a browser that refuses storage still runs the playground, just without the memory
              }
          }

          function restoreConfig() {
              let saved = null;
              try {
                  saved = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || 'null');
              } catch (error) {
                  saved = null;
              }
              if (!saved) {
                  return;
              }

              restoringConfig = true;
              try {
                  CONFIG_COMBOBOXES.forEach(([comboboxId, valueId]) => {
                      const option = comboboxOption(comboboxId, saved[valueId] || '');
                      if (option) {
                          selectComboboxOption(comboboxId, option);
                      }
                  });

                  // a model the menu does not list — one that was listed, or typed in — comes back as a custom entry
                  const modelOption = saved.model ? comboboxOption('modelCombobox', saved.model) : null;
                  if (modelOption) {
                      selectComboboxOption('modelCombobox', modelOption);
                  } else if (saved.model) {
                      document.getElementById('customModelInput').value = saved.model;
                      selectComboboxOption('modelCombobox', comboboxOption('modelCombobox', '__custom__'));
                      // the custom option focuses its id field on selection, which a page load should not do
                      document.getElementById('customModelInput').blur();
                  }
                  if (typeof saved.client_type === 'string') {
                      setClientType(saved.client_type);
                      handleClientTypeChange();
                  }
                  // a base URL typed over the filled default is kept on the model it was typed for
                  CONFIG_TEXT_INPUTS.forEach((id) => {
                      if (typeof saved[id] === 'string') {
                          document.getElementById(id).value = saved[id];
                      }
                  });
                  if (document.getElementById('baseUrlInput').value.trim() !== filledBaseUrl) {
                      handleBaseUrlInput();
                  }
                  updateBaseUrlTag();
                  handleApiKeyInput();
                  validateTools();
                  getExtraHeaders();
                  updateHeader();
              } finally {
                  restoringConfig = false;
              }
          }

          // follows the stream only while the reader is at the bottom, so scrolling up to read stays put
          function isNearBottom() {
              const container = document.getElementById('messagesContainer');
              return container.scrollHeight - container.scrollTop - container.clientHeight < 80;
          }

          function scrollToBottom(force = false) {
              const container = document.getElementById('messagesContainer');
              if (force || stickToBottom) {
                  container.scrollTop = container.scrollHeight;
              }
          }

          let stickToBottom = true;
          document.getElementById('messagesContainer').addEventListener('scroll', () => {
              stickToBottom = isNearBottom();
          });

          function showThread() {
              document.getElementById('emptyState').classList.add('hidden');
              document.getElementById('thread').classList.remove('hidden');
          }

          function addMessageCard(role, content, metadata = null, images = [], timestamp = null, tookMs = null) {
              const thread = document.getElementById('thread');
              showThread();

              const card = document.createElement('div');
              const isUser = role === 'user';
              card.className = \`msg \${isUser ? 'msg-user' : 'msg-assistant'}\`;

              let html = '';
              if (isUser) {
                  html += \`<div class="msg-head"><span class="msg-timestamp" title="\${timestamp ? formatTimestamp(timestamp) : ''}">\${formatClock(timestamp)}</span></div>\`;
                  html += '<div class="bubble">';
                  if (images && images.length > 0) {
                      html += '<div class="bubble-images">';
                      images.forEach((img, idx) => {
                          html += \`<img src="\${img}" alt="Image \${idx + 1}">\`;
                      });
                      html += '</div>';
                  }
                  html += \`<div class="message-content">\${escapeHtml(content || '')}</div></div>\`;
              } else {
                  html += \`<div class="msg-head"><span class="msg-model">\${escapeHtml(getSelectedModel())}</span><span class="msg-took">\${tookMs !== null ? formatDuration(tookMs) : ''}</span><span class="msg-timestamp">\${timestamp ? formatClock(timestamp) : ''}</span></div>\`;
                  html += \`<div class="message-content">\${escapeHtml(content || '')}</div>\`;
              }

              if (metadata) {
                  html += renderMetadata(metadata);
              }

              card.innerHTML = html;
              thread.appendChild(card);
              scrollToBottom(true);

              return card;
          }

          function renderMetadata(metadata, tookMs = null, copyable = false) {
              let metadataHtml = '<div class="msg-foot">';
              if (metadata.finish_reason) {
                  metadataHtml += \`<span class="reason reason-\${escapeHtml(metadata.finish_reason)}" title="Finish reason">\${escapeHtml(metadata.finish_reason)}</span>\`;
              }
              const parts = [];
              if (metadata.cached_tokens) parts.push(\`<span>Cached <b>\${formatCount(metadata.cached_tokens)}</b></span>\`);
              if (metadata.prompt_tokens) parts.push(\`<span>Prompt <b>\${formatCount(metadata.prompt_tokens)}</b></span>\`);
              if (metadata.thoughts_tokens) parts.push(\`<span>Thoughts <b>\${formatCount(metadata.thoughts_tokens)}</b></span>\`);
              if (metadata.response_tokens) parts.push(\`<span>Response <b>\${formatCount(metadata.response_tokens)}</b></span>\`);
              if (metadata.total_tokens) parts.push(\`<span>Total <b>\${formatCount(metadata.total_tokens)}</b></span>\`);
              if (parts.length) {
                  metadataHtml += \`<span class="usage" title="Token usage">\${parts.join('')}</span>\`;
              }
              if (tookMs !== null) {
                  metadataHtml += \`<span class="usage"><span>Took <b>\${formatDuration(tookMs)}</b></span></span>\`;
              }
              if (copyable) {
                  metadataHtml += \`<button type="button" class="icon-btn copy-btn" onclick="copyMessage(this)" aria-label="Copy the text" title="Copy the text">\${ICONS.copy}</button>\`;
              }
              metadataHtml += '</div>';
              return metadataHtml;
          }

          async function copyMessage(button) {
              const card = button.closest('.msg');
              const text = Array.from(card.querySelectorAll('.text-content')).map((node) => node.textContent).join('\\n\\n');
              try {
                  await navigator.clipboard.writeText(text);
                  button.innerHTML = ICONS.check;
                  setTimeout(() => {
                      button.innerHTML = ICONS.copy;
                  }, 1400);
              } catch (error) {
                  console.error('Copy failed:', error);
              }
          }

          // shown until the first delta arrives, with the time the model has taken so far
          function showPending(contentDiv) {
              const pending = document.createElement('div');
              pending.className = 'pending';
              pending.innerHTML = \`<span class="pending-grid" aria-hidden="true">\${'<i></i>'.repeat(9)}</span><span class="shimmer">Waiting for the model</span><span class="elapsed">0.0 s</span>\`;
              contentDiv.appendChild(pending);
              const started = performance.now();
              const elapsed = pending.querySelector('.elapsed');
              const timer = setInterval(() => {
                  elapsed.textContent = \`\${((performance.now() - started) / 1000).toFixed(1)} s\`;
              }, 100);
              return {
                  clear() {
                      clearInterval(timer);
                      pending.remove();
                  }
              };
          }

          function setStreamingControls(streaming) {
              const sendButton = document.getElementById('sendButton');
              const stopButton = document.getElementById('stopButton');
              sendButton.classList.toggle('hidden', streaming);
              stopButton.disabled = !streaming;
              stopButton.classList.toggle('hidden', !streaming);
              updateSendState();
          }

          function updateSendState() {
              const input = document.getElementById('messageInput');
              document.getElementById('sendButton').disabled = isStreaming || (!input.value.trim() && selectedImages.length === 0);
          }

          function stopGeneration() {
              if (!isStreaming) return;

              fetch('/api/abort', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                      session_id: sessionId
                  }),
                  keepalive: true
              }).catch(error => {
                  console.error('Error interrupting chat:', error);
              });

              if (currentAbortController) {
                  currentAbortController.abort();
              }
          }

          function markInterrupted(contentDiv) {
              const interruptedDiv = document.createElement('div');
              interruptedDiv.className = 'interrupted';
              interruptedDiv.textContent = 'Interrupted';
              contentDiv.appendChild(interruptedDiv);
          }

          function showError(contentDiv, message) {
              const errorDiv = document.createElement('div');
              errorDiv.className = 'error-banner';
              errorDiv.textContent = message;
              contentDiv.appendChild(errorDiv);
          }

          async function sendMessage() {
              const input = document.getElementById('messageInput');
              const message = input.value.trim();

              if ((!message && selectedImages.length === 0) || isStreaming) return;

              isStreaming = true;
              currentAbortController = new AbortController();
              setStreamingControls(true);
              input.value = '';
              resizeMessageInput();

              const currentImages = [...selectedImages];
              selectedImages = [];
              updateImagePreview();

              const userSendTime = Date.now();
              addMessageCard('user', message, null, currentImages, userSendTime);

              const assistantCard = addMessageCard('assistant', '');
              const contentDiv = assistantCard.querySelector('.message-content');
              const pending = showPending(contentDiv);
              // items never interleave in a stream, so every delta belongs to the one item still open
              let openItem = null;
              // a spoken response streams as many small chunks that only play as one clip
              let audioStream = null;
              // where the next item's time starts: the request, then the end of the item before it
              let itemMark = performance.now();

              try {
                  const config = getConfig();
                  const content_items = [];

                  if (message) {
                      content_items.push({ type: 'text.done', text: message });
                  }

                  currentImages.forEach(img => {
                      content_items.push({ type: 'image_url.done', image_url: img });
                  });

                  const response = await fetch('/api/chat', {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                          message: {
                              role: 'user',
                              content_items: content_items
                          },
                          config: config,
                          session_id: sessionId
                      }),
                      signal: currentAbortController.signal
                  });

                  if (!response.ok || !response.body) {
                      let errorMessage = \`Request failed with status \${response.status}\`;
                      try {
                          const errorPayload = await response.clone().json();
                          if (errorPayload && errorPayload.error) {
                              errorMessage = errorPayload.error;
                          }
                      } catch (e) {
                          const errorText = await response.text();
                          if (errorText) {
                              errorMessage = errorText;
                          }
                      }
                      throw new Error(errorMessage);
                  }

                  const reader = response.body.getReader();
                  const decoder = new TextDecoder();
                  let metadata = null;
                  let lastCreatedAt = null;
                  let buffer = '';

                  while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;

                      const chunk = decoder.decode(value);
                      buffer += chunk;
                      if (!buffer.endsWith('\\n\\n')) continue;

                      const lines = buffer.split('\\n');
                      buffer = '';
                      for (const line of lines) {
                          if (line.startsWith('data: ')) {
                              const data = line.slice(6);
                              if (data === '[DONE]') continue;

                              try {
                                  const event = JSON.parse(data);

                                  if (event.error) {
                                      pending.clear();
                                      showError(contentDiv, \`Error: \${event.error}\`);
                                      continue;
                                  }

                                  if (event.event_type === 'stop') {
                                      const usage = event.usage_metadata;
                                      const inputTokens = (usage.cached_tokens || 0) + (usage.prompt_tokens || 0);
                                      const outputTokens = (usage.thoughts_tokens || 0) + (usage.response_tokens || 0);
                                      const totalTokens = inputTokens + outputTokens;
                                      metadata = {
                                          cached_tokens: usage.cached_tokens || 0,
                                          prompt_tokens: usage.prompt_tokens || 0,
                                          thoughts_tokens: usage.thoughts_tokens || 0,
                                          response_tokens: usage.response_tokens || 0,
                                          total_tokens: totalTokens,
                                          finish_reason: event.finish_reason
                                      };
                                      lastCreatedAt = event.created_at;
                                      continue;
                                  }

                                  if (event.content_items.length) {
                                      pending.clear();
                                  }

                                  // a delta event carries a fragment of the open item or its done item, whose complete
                                  // content replaces the fragments shown so far; an image or an embedding shows once
                                  // done, and thinking inline data not at all
                                  for (const item of event.content_items) {
                                      if (item.type === 'text.delta' || item.type === 'text.done') {
                                          openItem = openItem || openStreamItem(contentDiv, 'text', itemMark);
                                          openItem.text = item.type === 'text.done' ? item.text : openItem.text + item.text;
                                          openItem.container.textContent = openItem.text;
                                      } else if (item.type === 'thinking.delta' || item.type === 'thinking.done') {
                                          openItem = openItem || openStreamItem(contentDiv, 'thinking', itemMark);
                                          openItem.text = item.type === 'thinking.done' ? item.thinking : openItem.text + item.thinking;
                                          openItem.container.innerHTML = renderThinking(openItem.text);
                                      } else if (item.type === 'tool_call.delta' || item.type === 'tool_call.done') {
                                          openItem = openItem || openStreamItem(contentDiv, 'tool_call', itemMark);
                                          // only the first delta names the call, and only the done item has parsed arguments
                                          openItem.name = item.name || openItem.name;
                                          openItem.text = item.type === 'tool_call.done' ? JSON.stringify(item.arguments, null, 2) : openItem.text + item.arguments;
                                          openItem.root.querySelector('.tool-name').textContent = openItem.name;
                                          openItem.container.textContent = item.type === 'tool_call.done' ? openItem.text : prettyArguments(openItem.text);
                                      } else if (item.type === 'inline_data.delta' && isAudioMimeType(item.mime_type)) {
                                          audioStream = audioStream || { mimeType: '', chunks: [], bytes: 0, container: null, finalized: false };
                                          appendAudioChunk(contentDiv, item, audioStream);
                                      } else if (item.type === 'inline_data.done' && isAudioMimeType(item.mime_type)) {
                                          audioStream.chunks = [item.data];
                                          finalizeAudioStream(audioStream, true);
                                          audioStream = null;
                                      } else if (item.type === 'inline_data.done') {
                                          contentDiv.insertAdjacentHTML('beforeend', renderInlineData(item));
                                      } else if (item.type === 'embedding.done') {
                                          contentDiv.insertAdjacentHTML('beforeend', renderEmbedding(item));
                                      }

                                      if (item.type.endsWith('.done')) {
                                          finishStreamItem(openItem);
                                          openItem = null;
                                          itemMark = performance.now();
                                      }
                                  }

                                  scrollToBottom();
                              } catch (e) {
                                  console.error('Error parsing event:', e);
                              }
                          }
                      }
                  }

                  if (lastCreatedAt) {
                      const timestampEl = assistantCard.querySelector('.msg-timestamp');
                      if (timestampEl) {
                          timestampEl.textContent = formatClock(lastCreatedAt);
                          timestampEl.title = formatTimestamp(lastCreatedAt);
                      }
                  }

                  const endTime = Date.now();
                  const responseTimeMs = endTime - userSendTime;
                  lastMessageTimestamp = endTime;
                  const tookEl = assistantCard.querySelector('.msg-took');
                  if (tookEl) {
                      tookEl.textContent = formatDuration(responseTimeMs);
                  }

                  if (metadata) {
                      const metadataHtml = renderMetadata(metadata, responseTimeMs, Boolean(contentDiv.querySelector('.text-content')));
                      // appended rather than re-parsed into the card, which would restart a playing clip
                      assistantCard.insertAdjacentHTML('beforeend', metadataHtml);
                  }

              } catch (error) {
                  if (error.name === 'AbortError') {
                      if (audioStream) {
                          finalizeAudioStream(audioStream);
                      }
                      markInterrupted(contentDiv);
                  } else {
                      showError(contentDiv, \`Error: \${error.message}\`);
                      console.error('Error:', error);
                  }
                  lastMessageTimestamp = Date.now();
              } finally {
                  pending.clear();
                  finishStreamItem(openItem);
                  isStreaming = false;
                  currentAbortController = null;
                  setStreamingControls(false);
                  scrollToBottom();
                  input.focus();
              }
          }

          function resetThread() {
              sessionId = Math.random().toString(36).substring(7);
              lastMessageTimestamp = null;
              document.getElementById('thread').innerHTML = '';
              document.getElementById('thread').classList.add('hidden');
              document.getElementById('emptyState').classList.remove('hidden');
          }

          function clearChat() {
              const hasMessages = document.getElementById('thread').children.length > 0;
              if (isStreaming) {
                  stopGeneration();
              }
              if (hasMessages && !confirm('Start a new chat? This conversation will be cleared.')) {
                  return;
              }
              fetch('/api/clear', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                      session_id: sessionId
                  })
              }).then(() => {
                  resetThread();
                  document.getElementById('messageInput').focus();
              }).catch(error => {
                  console.error('Error clearing chat:', error);
              });
          }

          document.getElementById('messageInput').addEventListener('keydown', function(e) {
              if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                  e.preventDefault();
                  sendMessage();
              }
          });

          const textarea = document.getElementById('messageInput');
          function resizeMessageInput() {
              const maxHeight = 200;
              textarea.style.height = 'auto';
              const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
              textarea.style.height = nextHeight + 'px';
              textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
              updateSendState();
          }
          textarea.addEventListener('input', resizeMessageInput);

          // images pasted or dropped onto the composer attach like picked ones
          textarea.addEventListener('paste', (event) => {
              const files = Array.from(event.clipboardData ? event.clipboardData.files : []);
              if (files.length) {
                  event.preventDefault();
                  addImageFiles(files);
              }
          });
          const composer = document.getElementById('composer');
          composer.addEventListener('dragover', (event) => {
              event.preventDefault();
              composer.classList.add('dragging');
          });
          composer.addEventListener('dragleave', () => composer.classList.remove('dragging'));
          composer.addEventListener('drop', (event) => {
              event.preventDefault();
              composer.classList.remove('dragging');
              if (event.dataTransfer && event.dataTransfer.files.length) {
                  addImageFiles(event.dataTransfer.files);
              }
          });

          document.getElementById('configPanel').addEventListener('input', saveConfig);
          // setting up the page selects its defaults, which is not a change to save over the stored one
          restoringConfig = true;
          populateClientTypes();
          handleModelSelectChange();
          restoringConfig = false;
          restoreConfig();
          updateHeader();
          resizeMessageInput();

          updateThemeToggle();
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeToggle);
          window.addEventListener('resize', updateAllSegmentThumbs);
          // the thumbs measure their segments, which the web font changes once it loads
          document.fonts.ready.then(updateAllSegmentThumbs);
          updateAllSegmentThumbs();
          if (!isNarrowScreen()) {
              textarea.focus();
          }
      </script>
  </body>
  </html>
  `;

  app.get("/", (_req: Request, res: Response) => {
    res.send(
      CHAT_TEMPLATE.replace("__PLAYGROUND_DEFAULTS__", playgroundDefaults()),
    );
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    const { message, config, session_id } = req.body as {
      message: UniMessage;
      config: PlaygroundConfig;
      session_id: string;
    };

    if (!message) {
      return res.status(400).json({ error: "No message provided" });
    }
    const sessionId = session_id || "default";

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const abortController = new AbortController();
    sessionAbortControllers.get(sessionId)?.abort();
    sessionAbortControllers.set(sessionId, abortController);
    let completed = false;
    res.on("close", () => {
      if (!completed) {
        abortController.abort();
      }
    });

    try {
      const clientOptions = getClientOptions(config || {});
      if (
        !sessionClients.has(sessionId) ||
        clientOptionsChanged(sessionClientOptions.get(sessionId), clientOptions)
      ) {
        sessionClients.set(sessionId, new AutoLLMClient(clientOptions));
        sessionClientOptions.set(sessionId, clientOptions);
      }

      const client = sessionClients.get(sessionId)!;
      const requestConfig = getRequestConfig(config || {});

      for await (const event of client.streamingResponseStateful({
        message,
        config: requestConfig,
        signal: abortController.signal,
      })) {
        const serializedEvent = serializeForJson(event);
        res.write(`data: ${JSON.stringify(serializedEvent)}\n\n`);
      }

      completed = true;
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      if (abortController.signal.aborted) {
        completed = true;
        if (!res.writableEnded && !res.destroyed) {
          res.write("data: [DONE]\n\n");
          res.end();
        }
        return;
      }

      // a failed response has no stop event, so the page gets the error as an event of its own,
      // named by its class when it carries no message, since the page shows no empty error
      const errorEvent = {
        error:
          error instanceof Error
            ? error.message || error.constructor.name
            : String(error),
      };
      completed = true;
      res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } finally {
      if (sessionAbortControllers.get(sessionId) === abortController) {
        sessionAbortControllers.delete(sessionId);
      }
    }
  });

  app.post("/api/abort", (req: Request, res: Response) => {
    const { session_id } = req.body as { session_id?: string };
    const sessionId = session_id || "default";
    const abortController = sessionAbortControllers.get(sessionId);
    if (!abortController) {
      return res.json({ status: "idle" });
    }

    abortController.abort();
    return res.json({ status: "aborted" });
  });

  app.post("/api/clear", (req: Request, res: Response) => {
    const { session_id } = req.body as { session_id: string };
    const sessionId = session_id || "default";

    const abortController = sessionAbortControllers.get(sessionId);
    if (abortController) {
      abortController.abort();
      sessionAbortControllers.delete(sessionId);
    }

    if (sessionClients.has(sessionId)) {
      const client = sessionClients.get(sessionId)!;
      client.clearHistory();
      sessionClients.delete(sessionId);
      sessionClientOptions.delete(sessionId);
    }

    res.json({ status: "success" });
  });

  app.post("/api/models", async (req: Request, res: Response) => {
    const { config } = req.body as { config?: PlaygroundConfig };

    try {
      const client = new AutoLLMClient(getClientOptions(config || {}));
      res.json({ models: await client.listModels() });
    } catch (error) {
      // a rejected key, an unreachable base URL, or a client that cannot list
      res.status(400).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return app;
}

/**
 * Start the playground web server.
 *
 * @param host - Host address to bind to
 * @param port - Port number to listen on
 */
export function startPlaygroundServer(
  host: string = "127.0.0.1",
  port: number = 25751,
): void {
  // the playground exists to show what a model and its endpoint actually send, so unknown
  // stream output fails loudly here unless the caller says otherwise
  process.env.MMSP_DEBUG = process.env.MMSP_DEBUG ?? "1";
  const app = createChatApp();
  app.listen(port, host, () => {
    console.log(`Starting LLM Playground at http://${host}:${port}`);
    console.log(`Tracer at http://${host}:${port}/tracer/`);
    console.log(`MMSP server page at http://${host}:${port}/server/`);
  });
}
