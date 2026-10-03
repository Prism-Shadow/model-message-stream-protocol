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
 * MMSP server: MMSP over HTTP, for clients that speak MMSP rather than a vendor's protocol.
 *
 * The server serves the rows of its models table. Each row is an upstream model, built once with
 * `new AutoLLMClient({ model: model_id, apiKey: api_key, baseUrl: base_url, clientType:
 * client_type })` and named by its `server_model_id`. `POST /v1/stream` streams the model a
 * request names, and `GET /v1/models` lists them in OpenAI's shape. Requests carry one of the
 * `api_keys` as a bearer token, or none when the list is empty. The table comes from a JSON file
 * (`loadServerConfig`) or from code, and a client's base URL is `http://host:port/v1`. The
 * protocol is described in `wire`.
 */

import { timingSafeEqual } from "crypto";
import express, { Express, NextFunction, Request, Response } from "express";
import * as fs from "fs";
import http from "http";
import { AddressInfo } from "net";
import { parseArgs } from "util";
import { AutoLLMClient } from "../autoClient";
import { LLMClient } from "../baseClient";
import { UniConfig, UniMessage } from "../types";
import {
  API_PREFIX,
  DEFAULT_HOST,
  DEFAULT_PORT,
  KEEPALIVE_SECONDS,
  MODELS_PATH,
  STREAM_PATH,
  decodeWire,
  encodeWire,
  toWireError,
} from "../wire";

/**
 * One row of the models table: an upstream model and the id clients name it by. Keys are the
 * config file's; every column is required.
 */
export interface ModelRow {
  /** The upstream model id, as AutoLLMClient takes it */
  model_id: string;
  /** The upstream endpoint */
  base_url: string;
  /** The upstream key */
  api_key: string;
  /** The id clients name */
  server_model_id: string;
  /** The upstream client type, one of AutoLLMClient's */
  client_type: string;
}

export interface ServerConfig {
  models: ModelRow[];
  api_keys: string[];
}

const COLUMNS = [
  "model_id",
  "base_url",
  "api_key",
  "server_model_id",
  "client_type",
] as const;

// a config file may name these from the environment; the ids are always taken as written
const ENVIRONMENT_COLUMNS = ["base_url", "api_key", "client_type"] as const;

function errorBody(
  type: string,
  message: string,
): { error: { type: string; message: string } } {
  return { error: { type, message } };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Read the server's config file, with its environment references resolved.
 *
 * A `base_url`, `api_key` or `client_type` cell of a row, or an entry of `api_keys`, that starts
 * with `$` is read from the environment: `$NAME` and `${NAME}` both name NAME. The rows are not
 * validated here; createServerApp does that, for rows from a file and from code alike.
 *
 * @param path - The JSON file: `{"models": [...], "api_keys": [...]}`
 * @returns The parsed config, `api_keys` empty when the file has none
 */
export function loadServerConfig(path: string): ServerConfig {
  const text = fs.readFileSync(path, "utf-8");
  let config: unknown;
  try {
    config = JSON.parse(text);
  } catch (error) {
    throw new Error(`${path}: not valid JSON: ${(error as Error).message}`);
  }
  if (!isObject(config) || !Array.isArray(config.models)) {
    throw new Error(
      `${path}: the config must be a JSON object with a models list.`,
    );
  }
  const apiKeys = config.api_keys === undefined ? [] : config.api_keys;
  if (!Array.isArray(apiKeys)) {
    throw new Error(`${path}: api_keys must be a list.`);
  }

  const resolve = (cell: unknown, where: string): unknown => {
    if (typeof cell !== "string" || !cell.startsWith("$")) {
      return cell;
    }
    const value = process.env[cell.slice(1).replace(/^\{(.*)\}$/, "$1")];
    // an empty variable is as good as none: no upstream takes an empty key or endpoint
    if (!value) {
      throw new Error(
        `${path}: ${where} references ${cell}, which is not set in the environment.`,
      );
    }
    return value;
  };
  const models = config.models.map((row: unknown, i) => {
    if (!isObject(row)) {
      return row;
    }
    const resolved = { ...row };
    for (const column of ENVIRONMENT_COLUMNS) {
      if (column in row) {
        resolved[column] = resolve(row[column], `models[${i}].${column}`);
      }
    }
    return resolved;
  });
  return {
    ...config,
    models: models as ModelRow[],
    api_keys: apiKeys.map((key, i) =>
      resolve(key, `api_keys[${i}]`),
    ) as string[],
  };
}

/**
 * Create the Express application of the MMSP server.
 *
 * The whole table is validated, then every row's upstream client is built, before any route
 * exists: a bad row stops the server at start rather than on a request.
 *
 * @param options - `models`, the rows the server serves, taken as written; `apiKeys`, the keys a
 *   `/v1/` request may carry as a bearer token, none for an open server
 * @returns Express application instance
 */
export function createServerApp(options: {
  models: ModelRow[];
  apiKeys?: string[];
}): Express {
  const models: unknown = options.models;
  if (!Array.isArray(models)) {
    throw new Error("models must be a list of model rows.");
  }
  if (models.length === 0) {
    throw new Error(
      "models is empty: the server needs at least one model row.",
    );
  }
  const seen = new Map<string, number>();
  for (const [i, row] of models.entries()) {
    if (!isObject(row)) {
      throw new Error(`models[${i}] must be an object.`);
    }
    for (const column of COLUMNS) {
      const cell = row[column];
      if (typeof cell !== "string" || !cell) {
        throw new Error(`models[${i}]: ${column} must be a non-empty string.`);
      }
    }
    const serverModelId = row.server_model_id as string;
    const used = seen.get(serverModelId);
    if (used !== undefined) {
      throw new Error(
        `models[${i}]: server_model_id '${serverModelId}' is already used by models[${used}].`,
      );
    }
    seen.set(serverModelId, i);
  }
  const apiKeys: unknown = options.apiKeys ?? [];
  if (
    !Array.isArray(apiKeys) ||
    !apiKeys.every((key) => typeof key === "string" && key)
  ) {
    throw new Error("api_keys must be a list of non-empty strings.");
  }

  const upstreams = new Map<string, LLMClient>();
  for (const [i, row] of (models as ModelRow[]).entries()) {
    try {
      // the client type is always named, so AutoLLMClient neither deduces a family nor reads
      // CLIENT_TYPE
      upstreams.set(
        row.server_model_id,
        new AutoLLMClient({
          model: row.model_id,
          apiKey: row.api_key,
          baseUrl: row.base_url,
          clientType: row.client_type,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message || error.constructor.name
          : String(error);
      throw new Error(`models[${i}] '${row.server_model_id}': ${message}`);
    }
  }
  const created = Math.floor(Date.now() / 1000);

  const app = express();
  // Express would match /V1/stream to /v1/stream, past the key check below
  app.set("case sensitive routing", true);
  app.locals.serverModelIds = [...upstreams.keys()];
  const expected = (apiKeys as string[]).map((key) =>
    Buffer.from(`Bearer ${key}`),
  );
  // the key is checked before the body is read, so a request without one is refused unparsed
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (expected.length === 0 || !req.path.startsWith("/v1/")) {
      return next();
    }
    const given = Buffer.from(req.get("Authorization") ?? "");
    // constant-time per key, so the time a refusal takes tells nothing about the keys
    if (
      !expected.some(
        (candidate) =>
          candidate.length === given.length &&
          timingSafeEqual(candidate, given),
      )
    ) {
      return res
        .status(401)
        .json(errorBody("AuthenticationError", "Invalid or missing API key."));
    }
    next();
  });
  app.use(express.json({ limit: "50mb" }));
  app.use(
    (
      err: { status?: number; type?: string },
      _req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      if (err.status === 413 || err.type === "entity.too.large") {
        return res
          .status(413)
          .json(errorBody("InvalidRequestError", "Request body is too large."));
      }
      if (err.type === "entity.parse.failed") {
        return res
          .status(400)
          .json(
            errorBody(
              "InvalidRequestError",
              "Request body must be a JSON object.",
            ),
          );
      }
      next(err);
    },
  );

  app.post(STREAM_PATH, async (req: Request, res: Response) => {
    const invalid = (message: string) =>
      res.status(400).json(errorBody("InvalidRequestError", message));
    // express leaves an empty object behind for a body of another content type
    const body: unknown = req.is("application/json") ? req.body : null;
    if (!isObject(body)) {
      return invalid("Request body must be a JSON object.");
    }
    const { model, messages } = body;
    const config = body.config ?? {};
    if (typeof model !== "string" || !model) {
      return invalid("model must be a non-empty string.");
    }
    if (!Array.isArray(messages)) {
      return invalid("messages must be a list of messages.");
    }
    if (!isObject(config)) {
      return invalid("config must be an object.");
    }

    const upstream = upstreams.get(model);
    if (upstream === undefined) {
      return res
        .status(404)
        .json(
          errorBody(
            "NotFoundError",
            `The model '${model}' does not exist; GET /v1/models lists the models this server serves.`,
          ),
        );
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // a comment while the model is silent, so that no proxy or client times out a long thought
    let keepAlive: ReturnType<typeof setTimeout> | undefined;
    const abortController = new AbortController();
    let completed = false;
    res.on("close", () => {
      clearTimeout(keepAlive);
      if (!completed) {
        abortController.abort();
      }
    });

    const write = (chunk: string) => {
      res.write(chunk);
      clearTimeout(keepAlive);
      keepAlive = setTimeout(
        write,
        KEEPALIVE_SECONDS * 1000,
        ": keep-alive\n\n",
      );
    };
    keepAlive = setTimeout(write, KEEPALIVE_SECONDS * 1000, ": keep-alive\n\n");

    try {
      // decoded here, so that a message the client cannot read is an error event like any other
      const requestMessages = (messages as UniMessage[]).map(decodeWire);
      for await (const event of upstream.streamingResponse({
        messages: requestMessages,
        config: config as UniConfig,
        signal: abortController.signal,
      })) {
        write(`data: ${JSON.stringify(encodeWire(event))}\n\n`);
      }

      completed = true;
      clearTimeout(keepAlive);
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      completed = true;
      clearTimeout(keepAlive);
      // the client went away, and nobody reads what would follow
      if (abortController.signal.aborted) {
        return;
      }

      // the status went out with the first event, so the error travels as an event of its own
      res.write(`data: ${JSON.stringify({ error: toWireError(error) })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  app.get(MODELS_PATH, (_req: Request, res: Response) => {
    res.json({
      object: "list",
      data: [...upstreams.keys()].map((id) => ({
        id,
        object: "model",
        created,
        owned_by: "mmsp",
      })),
    });
  });

  // a JSON answer where Express would send its HTML page, naming the routes there are
  app.use((req: Request, res: Response) => {
    res
      .status(404)
      .json(
        errorBody(
          "NotFoundError",
          `No route for ${req.method} ${req.path}; the server serves POST /v1/stream and GET /v1/models.`,
        ),
      );
  });

  return app;
}

/**
 * Start the MMSP server.
 *
 * @param options - `models` and `apiKeys` as createServerApp takes them; `host`, the address to
 *   bind to; `port`, the port to listen on
 * @returns The listening server, for the caller to close
 */
export function startServer(options: {
  models: ModelRow[];
  apiKeys?: string[];
  host?: string;
  port?: number;
}): http.Server {
  const app = createServerApp({
    models: options.models,
    apiKeys: options.apiKeys,
  });
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const server = app.listen(port, host, () => {
    // the bound port, so that port 0 prints the one the system chose
    const { port: bound } = server.address() as AddressInfo;
    console.log(`Starting MMSP server at http://${host}:${bound}${API_PREFIX}`);
    console.log(
      `Serving models: ${(app.locals.serverModelIds as string[]).join(", ")}`,
    );
    if (!options.apiKeys?.length) {
      console.log("Open server: api_keys is empty, every request is accepted");
    }
  });
  return server;
}

if (require.main === module) {
  // npm run server -- --config mmsp-server.json
  const USAGE =
    "Usage: npm run server -- --config PATH [--host HOST] [--port PORT]";
  let values: { config?: string; host?: string; port?: string; help?: boolean };
  try {
    ({ values } = parseArgs({
      options: {
        config: { type: "string" },
        host: { type: "string" },
        port: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    }));
  } catch (error) {
    console.error(`${(error as Error).message}\n${USAGE}`);
    process.exit(2);
  }
  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const configPath = values.config || process.env.MMSP_SERVER_CONFIG;
  if (!configPath) {
    console.error(
      `A config file is required: pass --config PATH or set MMSP_SERVER_CONFIG.\n${USAGE}`,
    );
    process.exit(2);
  }
  const config = loadServerConfig(configPath);
  startServer({
    models: config.models,
    apiKeys: config.api_keys,
    host: values.host,
    port: values.port === undefined ? undefined : Number(values.port),
  });
}
