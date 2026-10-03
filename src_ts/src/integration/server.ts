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
 * client_type })` and named by its `server_model_id`; an empty or absent `base_url` or
 * `client_type` is left to AutoLLMClient. `POST /v1/stream` streams the model a request names,
 * `GET /v1/models` lists them in OpenAI's shape, `GET /v1/metrics` reports what the server has
 * served (ServerMetrics), and `/` is the dashboard that shows it. Requests to `/v1/` carry one of
 * the `api_keys` as a bearer token, or none when the list is empty. The table comes from a JSON
 * file (`loadServerConfig`) or from code, and a client's base URL is `http://host:port/v1`. The
 * protocol is described in `wire`.
 */

import { timingSafeEqual } from "crypto";
import express, { Express, NextFunction, Request, Response } from "express";
import * as fs from "fs";
import http from "http";
import { AddressInfo } from "net";
import { performance } from "perf_hooks";
import { parseArgs } from "util";
import { AutoLLMClient } from "../autoClient";
import { LLMClient } from "../baseClient";
import { UniConfig, UniMessage, UsageMetadata } from "../types";
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  KEEPALIVE_SECONDS,
  METRICS_PATH,
  MODELS_PATH,
  STREAM_PATH,
  decodeWire,
  encodeWire,
  serverBaseUrl,
  serverDashboardUrl,
  toWireError,
} from "../wire";
import { DASHBOARD_TEMPLATE } from "./dashboardPage";

/**
 * One row of the models table: an upstream model and the id clients name it by. Keys are the
 * config file's; `base_url` and `client_type` may be empty or absent.
 */
export interface ModelRow {
  /** The upstream model id, as AutoLLMClient takes it */
  model_id: string;
  /** The upstream key */
  api_key: string;
  /** The id clients name */
  server_model_id: string;
  /** Empty or absent: the client's default endpoint (its variable, else the vendor's) */
  base_url?: string;
  /** Empty or absent: the official client the model id names */
  client_type?: string;
}

export interface ServerConfig {
  models: ModelRow[];
  api_keys: string[];
}

// the columns of a row, in the order a config file writes them
export const COLUMNS = [
  "model_id",
  "base_url",
  "api_key",
  "server_model_id",
  "client_type",
] as const;
const REQUIRED_COLUMNS = ["model_id", "api_key", "server_model_id"] as const;
const OPTIONAL_COLUMNS = ["base_url", "client_type"] as const;

// a config may name these from the environment; the ids are always taken as written
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
 * Refuse a config that is not an object with a models list, or whose api_keys is not a list.
 */
function checkConfigShape(
  config: unknown,
  prefix: string,
): asserts config is Record<string, unknown> & { models: unknown[] } {
  if (!isObject(config) || !Array.isArray(config.models)) {
    throw new Error(
      `${prefix}the config must be a JSON object with a models list.`,
    );
  }
  if (config.api_keys !== undefined && !Array.isArray(config.api_keys)) {
    throw new Error(`${prefix}api_keys must be a list.`);
  }
}

/**
 * Check a config's shape and resolve the environment references of its cells.
 *
 * `config` is what a config file or a request body holds: `{"models": [...], "api_keys": [...]}`.
 * A `base_url`, `api_key` or `client_type` cell of a row, or an entry of `api_keys`, that starts
 * with `$` is read from the environment (`$NAME` and `${NAME}` both name NAME). `source` prefixes
 * every message (the file's path for loadServerConfig); empty, the messages carry no prefix. The
 * rows are checked by createServerApp, as rows from code are.
 *
 * @param config - The parsed config
 * @param source - Where the config comes from, for the messages
 * @returns `{ models, api_keys }` with those cells replaced, `api_keys` defaulting to []; the
 *   input is not modified
 * @throws Error when the config is not an object with a models list, api_keys is not a list, or
 *   a reference names a variable that is unset or empty
 */
export function resolveServerConfig(
  config: unknown,
  source = "",
): ServerConfig {
  const prefix = source ? `${source}: ` : "";
  checkConfigShape(config, prefix);
  const apiKeys = (config.api_keys ?? []) as unknown[];

  const resolve = (cell: unknown, where: string): unknown => {
    if (typeof cell !== "string" || !cell.startsWith("$")) {
      return cell;
    }
    const value = process.env[cell.slice(1).replace(/^\{(.*)\}$/, "$1")];
    // an empty variable is as good as none: no upstream takes an empty key or endpoint
    if (!value) {
      throw new Error(
        `${prefix}${where} references ${cell}, which is not set in the environment.`,
      );
    }
    return value;
  };
  const models = config.models.map((row: unknown, i) => {
    // a row that is not an object is left for createServerApp to refuse
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
    models: models as ModelRow[],
    api_keys: apiKeys.map((key, i) =>
      resolve(key, `api_keys[${i}]`),
    ) as string[],
  };
}

/**
 * Read a config file as written: parsed and shape-checked, its `$VAR` cells unresolved, every key
 * kept (the playground keeps `host` and `port` in the file too).
 *
 * @param path - The JSON file: `{"models": [...], "api_keys": [...]}`
 * @returns The parsed config
 * @throws The fs error for a missing file (`code === "ENOENT"`); Error, prefixed with the path,
 *   when the file is not JSON or not a config
 */
export function readServerConfig(path: string): Record<string, unknown> {
  const text = fs.readFileSync(path, "utf-8");
  let config: unknown;
  try {
    config = JSON.parse(text);
  } catch (error) {
    throw new Error(`${path}: not valid JSON: ${(error as Error).message}`);
  }
  checkConfigShape(config, `${path}: `);
  return config;
}

/**
 * Read the server's config file, with its environment references resolved.
 *
 * @param path - The JSON file: `{"models": [...], "api_keys": [...]}`
 * @returns The config as resolveServerConfig returns it
 */
export function loadServerConfig(path: string): ServerConfig {
  return resolveServerConfig(readServerConfig(path), path);
}

/**
 * Print where the server listens, what it serves, where its dashboard is, and whether it is open.
 *
 * @param host - The host it listens on
 * @param port - The port it listens on
 * @param modelIds - The ids it serves, in table order
 * @param open - Whether it accepts every request, having no keys
 */
export function announceServer(
  host: string,
  port: number,
  modelIds: string[],
  open: boolean,
): void {
  console.log(`Starting MMSP server at ${serverBaseUrl(host, port)}`);
  console.log(`Serving models: ${modelIds.join(", ")}`);
  console.log(`Dashboard at ${serverDashboardUrl(host, port)}`);
  if (open) {
    console.log("Open server: api_keys is empty, every request is accepted");
  }
}

// how many of the latest successes the latency percentiles are taken over, per model and in total
export const LATENCY_WINDOW = 1000;

export type RequestOutcome = "success" | "failure" | "disconnect";
export type RefusalKind = "unauthorized" | "invalid_request" | "unknown_model";

/**
 * One request the server streams, from begin to finish.
 */
export interface RequestSample {
  modelId: string;
  /** `now()` at begin */
  started: number;
  /** `now()` at the first event, null until then */
  firstEvent: number | null;
  done: boolean;
}

interface Counters {
  requests: number;
  successes: number;
  failures: number;
  disconnects: number;
  firstEventMs: number[];
  totalMs: number[];
  tokens: {
    prompt: number;
    cached: number;
    thoughts: number;
    response: number;
  };
  lastRequestAt: number | null;
}

interface ModelCounters extends Counters {
  lastOutcome: RequestOutcome | null;
  lastError: { at: number; message: string | null } | null;
}

function newCounters(): Counters {
  return {
    requests: 0,
    successes: 0,
    failures: 0,
    disconnects: 0,
    firstEventMs: [],
    totalMs: [],
    tokens: { prompt: 0, cached: 0, thoughts: 0, response: 0 },
    lastRequestAt: null,
  };
}

/**
 * The nearest-rank percentile of a list of samples, null for none.
 */
function percentile(samples: number[], p: number): number | null {
  if (samples.length === 0) {
    return null;
  }
  const values = [...samples].sort((a, b) => a - b);
  return values[Math.ceil((p / 100) * values.length) - 1];
}

/**
 * What the server has served since it started, per `server_model_id` and in total.
 *
 * A request is counted when its model is found; it ends as a success (the stream reached its
 * end), a failure (it raised) or a disconnect (the client went away), and is in flight until then.
 * Refusals before a model is found are counted apart. The latency percentiles are taken over the
 * last LATENCY_WINDOW successes.
 */
export class ServerMetrics {
  /** Unix seconds at construction, whole */
  readonly startedAt: number;
  private readonly total: Counters = newCounters();
  private readonly models = new Map<string, ModelCounters>();
  private readonly refusals: Record<RefusalKind, number> = {
    unauthorized: 0,
    invalid_request: 0,
    unknown_model: 0,
  };

  /**
   * @param modelIds - The server's model ids, in table order
   * @param now - A monotonic clock in seconds, for the latencies
   * @param clock - Unix time in seconds, for the timestamps
   */
  constructor(
    modelIds: string[],
    private readonly now: () => number = () => performance.now() / 1000,
    private readonly clock: () => number = () => Date.now() / 1000,
  ) {
    this.startedAt = Math.floor(clock());
    for (const id of modelIds) {
      this.models.set(id, {
        ...newCounters(),
        lastOutcome: null,
        lastError: null,
      });
    }
  }

  // unix seconds with millisecond precision
  private timestamp(): number {
    return Math.round(this.clock() * 1000) / 1000;
  }

  begin(modelId: string): RequestSample {
    const at = this.timestamp();
    for (const counters of [this.models.get(modelId)!, this.total]) {
      counters.requests += 1;
      counters.lastRequestAt = at;
    }
    return { modelId, started: this.now(), firstEvent: null, done: false };
  }

  firstEvent(sample: RequestSample): void {
    if (sample.firstEvent === null) {
      sample.firstEvent = this.now();
    }
  }

  /**
   * End a request; a request already ended is left as it is.
   */
  finish(
    sample: RequestSample,
    outcome: RequestOutcome,
    options: { error?: string | null; usage?: UsageMetadata | null } = {},
  ): void {
    if (sample.done) {
      return;
    }
    sample.done = true;
    const model = this.models.get(sample.modelId)!;
    const finished = this.now();
    for (const counters of [model, this.total]) {
      if (outcome === "success") {
        counters.successes += 1;
        counters.totalMs.push(Math.round((finished - sample.started) * 1000));
        if (sample.firstEvent !== null) {
          counters.firstEventMs.push(
            Math.round((sample.firstEvent - sample.started) * 1000),
          );
        }
        for (const series of [counters.totalMs, counters.firstEventMs]) {
          if (series.length > LATENCY_WINDOW) {
            series.shift();
          }
        }
        const usage = options.usage;
        if (usage) {
          for (const [bucket, field] of [
            ["prompt", "prompt_tokens"],
            ["cached", "cached_tokens"],
            ["thoughts", "thoughts_tokens"],
            ["response", "response_tokens"],
          ] as const) {
            const tokens = usage[field];
            if (tokens != null) {
              counters.tokens[bucket] += tokens;
            }
          }
        }
      } else if (outcome === "failure") {
        counters.failures += 1;
      } else {
        counters.disconnects += 1;
      }
    }
    model.lastOutcome = outcome;
    if (outcome === "failure") {
      model.lastError = {
        at: this.timestamp(),
        message: options.error ?? null,
      };
    }
  }

  refused(kind: RefusalKind): void {
    this.refusals[kind] += 1;
  }

  /**
   * The counts as `GET /v1/metrics` reports them.
   */
  snapshot(): Record<string, unknown> {
    const series = (counters: Counters) => {
      const { requests, successes, failures, disconnects } = counters;
      // disconnects are the client's doing, not a failure of the server
      const decided = successes + failures;
      return {
        requests,
        successes,
        failures,
        disconnects,
        in_flight: requests - successes - failures - disconnects,
        success_rate: decided === 0 ? null : rate(successes, decided),
        latency_ms: {
          first_event: {
            p50: percentile(counters.firstEventMs, 50),
            p90: percentile(counters.firstEventMs, 90),
          },
          total: {
            p50: percentile(counters.totalMs, 50),
            p90: percentile(counters.totalMs, 90),
          },
        },
        tokens: { ...counters.tokens },
      };
    };
    return {
      started_at: this.startedAt,
      uptime_s: Math.floor(this.clock()) - this.startedAt,
      ...series(this.total),
      refused: { ...this.refusals },
      last_request_at: this.total.lastRequestAt,
      models: [...this.models].map(([id, counters]) => ({
        id,
        ...series(counters),
        last_request_at: counters.lastRequestAt,
        last_outcome: counters.lastOutcome,
        last_error: counters.lastError && { ...counters.lastError },
      })),
    };
  }
}

/**
 * `part / whole` to four decimals, rounded half to even as Python's round() rounds it, so that
 * both servers report the same rate.
 */
function rate(part: number, whole: number): number {
  const scaled = part * 10000;
  let quotient = Math.floor(scaled / whole);
  const twice = 2 * (scaled - quotient * whole);
  if (twice > whole || (twice === whole && quotient % 2 === 1)) {
    quotient += 1;
  }
  return quotient / 10000;
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
    for (const column of REQUIRED_COLUMNS) {
      const cell = row[column];
      if (typeof cell !== "string" || !cell) {
        throw new Error(`models[${i}]: ${column} must be a non-empty string.`);
      }
    }
    for (const column of OPTIONAL_COLUMNS) {
      const cell = row[column];
      if (cell !== undefined && cell !== null && typeof cell !== "string") {
        throw new Error(`models[${i}]: ${column} must be a string.`);
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
  if (!Array.isArray(apiKeys)) {
    throw new Error("api_keys must be a list of non-empty strings.");
  }
  for (const [i, key] of apiKeys.entries()) {
    if (typeof key !== "string" || !key) {
      throw new Error(`api_keys[${i}] must be a non-empty string.`);
    }
  }

  const upstreams = new Map<string, LLMClient>();
  for (const [i, row] of (models as ModelRow[]).entries()) {
    try {
      upstreams.set(
        row.server_model_id,
        new AutoLLMClient({
          model: row.model_id,
          apiKey: row.api_key,
          baseUrl: row.base_url || undefined,
          clientType: row.client_type || undefined,
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
  const metrics = new ServerMetrics([...upstreams.keys()]);
  const created = metrics.startedAt;

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
      metrics.refused("unauthorized");
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
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      if (err.status === 413 || err.type === "entity.too.large") {
        return res
          .status(413)
          .json(errorBody("InvalidRequestError", "Request body is too large."));
      }
      if (err.type === "entity.parse.failed") {
        if (req.path === STREAM_PATH) {
          metrics.refused("invalid_request");
        }
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
    const invalid = (message: string) => {
      metrics.refused("invalid_request");
      return res.status(400).json(errorBody("InvalidRequestError", message));
    };
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
      metrics.refused("unknown_model");
      return res
        .status(404)
        .json(
          errorBody(
            "NotFoundError",
            `The model '${model}' does not exist; GET /v1/models lists the models this server serves.`,
          ),
        );
    }

    const sample = metrics.begin(model);
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
        metrics.finish(sample, "disconnect");
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

    let usage: UsageMetadata | null = null;
    try {
      // decoded here, so that a message the client cannot read is an error event like any other
      const requestMessages = (messages as UniMessage[]).map(decodeWire);
      for await (const event of upstream.streamingResponse({
        messages: requestMessages,
        config: config as UniConfig,
        signal: abortController.signal,
      })) {
        metrics.firstEvent(sample);
        if (event.event_type === "stop") {
          usage = event.usage_metadata;
        }
        write(`data: ${JSON.stringify(encodeWire(event))}\n\n`);
      }

      metrics.finish(sample, "success", { usage });
      completed = true;
      clearTimeout(keepAlive);
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      completed = true;
      clearTimeout(keepAlive);
      // the client went away, and nobody reads what would follow
      if (abortController.signal.aborted) {
        metrics.finish(sample, "disconnect");
        return;
      }
      metrics.finish(sample, "failure", {
        error:
          error instanceof Error
            ? error.message || error.constructor.name
            : String(error),
      });

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

  app.get(METRICS_PATH, (_req: Request, res: Response) => {
    res.json(metrics.snapshot());
  });

  // public: the page holds no data, and asks for a key when /v1/metrics wants one
  app.get("/", (_req: Request, res: Response) => {
    res.type("html").send(DASHBOARD_TEMPLATE);
  });

  // a JSON answer where Express would send its HTML page, naming the routes there are
  app.use((req: Request, res: Response) => {
    res
      .status(404)
      .json(
        errorBody(
          "NotFoundError",
          `No route for ${req.method} ${req.path}; the server serves POST /v1/stream, GET /v1/models, GET /v1/metrics and the dashboard at /.`,
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
    announceServer(
      host,
      bound,
      app.locals.serverModelIds as string[],
      !options.apiKeys?.length,
    );
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
