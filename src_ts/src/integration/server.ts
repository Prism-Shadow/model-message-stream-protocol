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
 * `GET /v1/models` lists them in OpenAI's shape, and `GET /v1/metrics` reports what the server has
 * served since it started, and with `?window=N` the last N seconds in 10 s buckets
 * (ServerMetrics), which the playground's server page draws while it runs the server. Requests to `/v1/` carry one of the `api_keys` as a bearer token, or none when the
 * list is empty. The table comes from a JSON file (`loadServerConfig`) or from code, and a
 * client's base URL is `http://host:port/v1`. The protocol is described in `wire`. The module
 * also holds the playground's server page, `SERVER_TEMPLATE`, which `playground.ts` serves at
 * `/server/`.
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
  toWireError,
} from "../wire";

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
 * Print where the server listens, what it serves, and whether it is open.
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
  if (open) {
    console.log("Open server: api_keys is empty, every request is accepted");
  }
}

// how many of the latest successes the since-start latency percentiles are taken over, per model
// and in total
export const LATENCY_WINDOW = 1000;
// the seconds of a time bucket, aligned to multiples of BUCKET_S of the wall clock
export const BUCKET_S = 10;
// buckets older than this are dropped: two hours, 720 per series
export const SERIES_RETENTION_S = 7200;
// the latencies a bucket keeps per measure, its first ones; its percentiles are over them
export const BUCKET_SAMPLES = 64;
// the latest failures a snapshot lists
export const ERRORS_KEPT = 20;

export const WINDOW_ERROR = `window must be an integer number of seconds from ${BUCKET_S} to ${SERIES_RETENTION_S}.`;

export type RequestOutcome = "success" | "failure" | "disconnect";
export type RefusalKind = "unauthorized" | "invalid_request" | "unknown_model";

/**
 * One request the server streams, from begin to finish.
 */
export interface RequestSample {
  modelId: string;
  /** `now()` at begin */
  started: number;
  /** The wall-clock bucket the request began in, which everything it produces is counted into */
  bucket: number;
  /** `now()` at the first event, null until then */
  firstEvent: number | null;
  done: boolean;
}

/**
 * What the requests that began in one BUCKET_S stretch of the wall clock produced.
 */
interface Bucket {
  requests: number;
  successes: number;
  failures: number;
  disconnects: number;
  /** Counted on the total only, in the bucket of the moment of the refusal */
  refused: number;
  /** Thinking plus response tokens of the successes */
  tokensOut: number;
  thoughts: number;
  response: number;
  generationMs: number;
  totalMs: number[];
  firstEventMs: number[];
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
  tokensOut: number;
  generationMs: number;
  lastRequestAt: number | null;
  /** Keyed by bucket start, unix seconds */
  buckets: Map<number, Bucket>;
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
    tokensOut: 0,
    generationMs: 0,
    lastRequestAt: null,
    buckets: new Map(),
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
 * Output tokens per second of generation, to one decimal rounded half up as the Python server
 * rounds it; null before a success.
 */
function tps(tokensOut: number, generationMs: number): number | null {
  return generationMs === 0
    ? null
    : Math.round((tokensOut * 10000) / generationMs) / 10;
}

/**
 * The success rate of the decided requests; disconnects are the client's doing, not a failure of
 * the server.
 */
function successRate(successes: number, failures: number): number | null {
  const decided = successes + failures;
  return decided === 0 ? null : rate(successes, decided);
}

/**
 * The buckets of `start <= key < end` summed, with the percentiles over their samples together.
 */
function summary(
  buckets: Map<number, Bucket>,
  start: number,
  end: number,
  withRefused = false,
): Record<string, unknown> {
  const sum: Bucket = {
    requests: 0,
    successes: 0,
    failures: 0,
    disconnects: 0,
    refused: 0,
    tokensOut: 0,
    thoughts: 0,
    response: 0,
    generationMs: 0,
    totalMs: [],
    firstEventMs: [],
  };
  for (const [key, bucket] of buckets) {
    if (key < start || key >= end) {
      continue;
    }
    sum.requests += bucket.requests;
    sum.successes += bucket.successes;
    sum.failures += bucket.failures;
    sum.disconnects += bucket.disconnects;
    sum.refused += bucket.refused;
    sum.tokensOut += bucket.tokensOut;
    sum.thoughts += bucket.thoughts;
    sum.response += bucket.response;
    sum.generationMs += bucket.generationMs;
    sum.totalMs.push(...bucket.totalMs);
    sum.firstEventMs.push(...bucket.firstEventMs);
  }
  return {
    requests: sum.requests,
    successes: sum.successes,
    failures: sum.failures,
    disconnects: sum.disconnects,
    in_flight: sum.requests - sum.successes - sum.failures - sum.disconnects,
    success_rate: successRate(sum.successes, sum.failures),
    ...(withRefused ? { refused: sum.refused } : {}),
    tokens_out: sum.tokensOut,
    thoughts: sum.thoughts,
    response: sum.response,
    generation_ms: sum.generationMs,
    tps: tps(sum.tokensOut, sum.generationMs),
    latency_ms: {
      first_event: {
        p50: percentile(sum.firstEventMs, 50),
        p90: percentile(sum.firstEventMs, 90),
      },
      total: {
        p50: percentile(sum.totalMs, 50),
        p90: percentile(sum.totalMs, 90),
      },
    },
  };
}

/**
 * One array per measure, index `i` the bucket `start + i * BUCKET_S`; a missing bucket counts
 * zero and has no percentiles.
 */
function columns(
  buckets: Map<number, Bucket>,
  start: number,
  end: number,
  withRefused = false,
): Record<string, (number | null)[]> {
  const slots = Array.from(
    { length: Math.floor((end - start) / BUCKET_S) },
    (_, i) => buckets.get(start + i * BUCKET_S),
  );
  const count = (field: keyof Omit<Bucket, "totalMs" | "firstEventMs">) =>
    slots.map((bucket) => bucket?.[field] ?? 0);
  const rank = (field: "totalMs" | "firstEventMs", p: number) =>
    slots.map((bucket) => percentile(bucket?.[field] ?? [], p));
  return {
    requests: count("requests"),
    successes: count("successes"),
    failures: count("failures"),
    disconnects: count("disconnects"),
    ...(withRefused ? { refused: count("refused") } : {}),
    tokens_out: count("tokensOut"),
    thoughts: count("thoughts"),
    response: count("response"),
    generation_ms: count("generationMs"),
    tps: slots.map((bucket) =>
      tps(bucket?.tokensOut ?? 0, bucket?.generationMs ?? 0),
    ),
    p50: rank("totalMs", 50),
    p90: rank("totalMs", 90),
    first_event_p50: rank("firstEventMs", 50),
    first_event_p90: rank("firstEventMs", 90),
  };
}

/**
 * What the server has served since it started, per `server_model_id` and in total, and over time
 * in BUCKET_S buckets kept for SERIES_RETENTION_S.
 *
 * A request is counted when its model is found; it ends as a success (the stream reached its
 * end), a failure (it raised) or a disconnect (the client went away), and is in flight until then.
 * Refusals before a model is found are counted apart. The since-start latency percentiles are
 * taken over the last LATENCY_WINDOW successes. Everything a request produces is counted into the
 * bucket it began in, so a bucket's requests are its outcomes plus what is still streaming.
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
  // newest first
  private readonly errors: {
    at: number;
    model: string;
    message: string | null;
  }[] = [];

  /**
   * @param modelIds - The server's model ids, in table order
   * @param now - A monotonic clock in seconds, for the latencies
   * @param clock - Unix time in seconds, for the timestamps and the buckets
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

  // the start of the bucket the wall clock is in, from whole seconds as the Python server takes it
  private bucketStart(): number {
    return Math.floor(Math.floor(this.clock()) / BUCKET_S) * BUCKET_S;
  }

  /**
   * A series' bucket at `start`, created when absent; a creation drops the buckets that have aged
   * out of SERIES_RETENTION_S.
   */
  private bucket(counters: Counters, start: number): Bucket {
    let bucket = counters.buckets.get(start);
    if (bucket === undefined) {
      const cutoff = this.bucketStart() - SERIES_RETENTION_S;
      for (const key of counters.buckets.keys()) {
        if (key <= cutoff) {
          counters.buckets.delete(key);
        }
      }
      bucket = {
        requests: 0,
        successes: 0,
        failures: 0,
        disconnects: 0,
        refused: 0,
        tokensOut: 0,
        thoughts: 0,
        response: 0,
        generationMs: 0,
        totalMs: [],
        firstEventMs: [],
      };
      counters.buckets.set(start, bucket);
    }
    return bucket;
  }

  begin(modelId: string): RequestSample {
    const at = this.timestamp();
    const bucket = this.bucketStart();
    for (const counters of [this.models.get(modelId)!, this.total]) {
      counters.requests += 1;
      counters.lastRequestAt = at;
      this.bucket(counters, bucket).requests += 1;
    }
    return {
      modelId,
      started: this.now(),
      bucket,
      firstEvent: null,
      done: false,
    };
  }

  firstEvent(sample: RequestSample): void {
    if (sample.firstEvent === null) {
      sample.firstEvent = this.now();
    }
  }

  /**
   * End a request; a request already ended is left as it is. A request begun in a bucket that
   * has aged out since changes the since-start counts only.
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
    const kept = sample.bucket > this.bucketStart() - SERIES_RETENTION_S;
    if (outcome === "success") {
      const totalMs = Math.round((this.now() - sample.started) * 1000);
      const firstEventMs =
        sample.firstEvent === null
          ? null
          : Math.round((sample.firstEvent - sample.started) * 1000);
      // at least a millisecond, so that a stream whose first event is its stop event keeps the
      // ratio defined
      const generationMs = Math.max(totalMs - (firstEventMs ?? 0), 1);
      const usage = options.usage;
      const thoughts = usage?.thoughts_tokens ?? 0;
      const response = usage?.response_tokens ?? 0;
      for (const counters of [model, this.total]) {
        counters.successes += 1;
        counters.totalMs.push(totalMs);
        if (firstEventMs !== null) {
          counters.firstEventMs.push(firstEventMs);
        }
        for (const series of [counters.totalMs, counters.firstEventMs]) {
          if (series.length > LATENCY_WINDOW) {
            series.shift();
          }
        }
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
        counters.tokensOut += thoughts + response;
        counters.generationMs += generationMs;
        if (kept) {
          const bucket = this.bucket(counters, sample.bucket);
          bucket.successes += 1;
          bucket.tokensOut += thoughts + response;
          bucket.thoughts += thoughts;
          bucket.response += response;
          bucket.generationMs += generationMs;
          if (bucket.totalMs.length < BUCKET_SAMPLES) {
            bucket.totalMs.push(totalMs);
          }
          if (
            firstEventMs !== null &&
            bucket.firstEventMs.length < BUCKET_SAMPLES
          ) {
            bucket.firstEventMs.push(firstEventMs);
          }
        }
      }
    } else {
      for (const counters of [model, this.total]) {
        if (outcome === "failure") {
          counters.failures += 1;
        } else {
          counters.disconnects += 1;
        }
        if (kept) {
          const bucket = this.bucket(counters, sample.bucket);
          if (outcome === "failure") {
            bucket.failures += 1;
          } else {
            bucket.disconnects += 1;
          }
        }
      }
    }
    model.lastOutcome = outcome;
    if (outcome === "failure") {
      const at = this.timestamp();
      const message = options.error ?? null;
      model.lastError = { at, message };
      this.errors.unshift({ at, model: sample.modelId, message });
      this.errors.splice(ERRORS_KEPT);
    }
  }

  refused(kind: RefusalKind): void {
    this.refusals[kind] += 1;
    this.bucket(this.total, this.bucketStart()).refused += 1;
  }

  /**
   * The counts as `GET /v1/metrics` reports them.
   */
  snapshot(): Record<string, unknown> {
    const counts = (counters: Counters) => ({
      requests: counters.requests,
      successes: counters.successes,
      failures: counters.failures,
      disconnects: counters.disconnects,
      in_flight:
        counters.requests -
        counters.successes -
        counters.failures -
        counters.disconnects,
      success_rate: successRate(counters.successes, counters.failures),
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
      tokens_out: counters.tokensOut,
      generation_ms: counters.generationMs,
      tps: tps(counters.tokensOut, counters.generationMs),
    });
    return {
      started_at: this.startedAt,
      uptime_s: Math.floor(this.clock()) - this.startedAt,
      ...counts(this.total),
      refused: { ...this.refusals },
      last_request_at: this.total.lastRequestAt,
      errors: this.errors.map((error) => ({ ...error })),
      models: [...this.models].map(([id, counters]) => ({
        id,
        ...counts(counters),
        last_request_at: counters.lastRequestAt,
        last_outcome: counters.lastOutcome,
        last_error: counters.lastError && { ...counters.lastError },
      })),
    };
  }

  /**
   * The last `seconds` in BUCKET_S buckets, in total and per model, with the window before it for
   * comparison.
   *
   * The current bucket is the last one, partial; nothing before the server's first bucket is
   * listed, so a server younger than the window has shorter arrays and a later `start`.
   * `previous` is null unless the whole window before lies inside the server's life.
   */
  window(seconds: number): Record<string, unknown> {
    const end = this.bucketStart() + BUCKET_S;
    const first = Math.floor(this.startedAt / BUCKET_S) * BUCKET_S;
    // on a bucket boundary, so that the columns and the sums cover the same requests
    const span = Math.ceil(seconds / BUCKET_S) * BUCKET_S;
    const start = Math.max(end - span, first);
    const previousStart = end - 2 * span;
    return {
      seconds,
      bucket_s: BUCKET_S,
      start,
      end,
      total: {
        ...summary(this.total.buckets, start, end, true),
        series: columns(this.total.buckets, start, end, true),
      },
      models: [...this.models].map(([id, counters]) => ({
        id,
        ...summary(counters.buckets, start, end),
        series: columns(counters.buckets, start, end),
      })),
      previous:
        previousStart >= first
          ? summary(this.total.buckets, previousStart, start, true)
          : null,
    };
  }
}

/**
 * The seconds a `?window=` parameter names, or null when it names none of BUCKET_S to
 * SERIES_RETENTION_S.
 *
 * @param value - The parsed query value; of a repeated parameter the first counts, as Flask reads it
 */
export function parseWindow(value: unknown): number | null {
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== "string" || !/^[0-9]+$/.test(text)) {
    return null;
  }
  const seconds = Number(text);
  return seconds >= BUCKET_S && seconds <= SERIES_RETENTION_S ? seconds : null;
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
  app.locals.metrics = metrics;
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

  // what the server has served since it started, and with ?window=N the last N seconds in 10 s
  // buckets; a bad window is not a refusal, which counts stream requests
  app.get(METRICS_PATH, (req: Request, res: Response) => {
    if (req.query.window === undefined) {
      return res.json(metrics.snapshot());
    }
    const seconds = parseWindow(req.query.window);
    if (seconds === null) {
      return res
        .status(400)
        .json(errorBody("InvalidRequestError", WINDOW_ERROR));
    }
    res.json({ ...metrics.snapshot(), window: metrics.window(seconds) });
  });

  // a JSON answer where Express would send its HTML page, naming the routes there are
  app.use((req: Request, res: Response) => {
    res
      .status(404)
      .json(
        errorBody(
          "NotFoundError",
          `No route for ${req.method} ${req.path}; the server serves POST /v1/stream, GET /v1/models and GET /v1/metrics.`,
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

// -- SERVER_TEMPLATE begin: the playground's server page, one HTML document, written whole by embed.mjs; edit server.html --
export const SERVER_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <title>MMSP Server</title>
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
            --shadow-card-hover: 0 0 0 1px var(--ring-strong), 0 1px 2px rgba(20, 22, 28, 0.04);
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
                --shadow-card-hover: 0 0 0 1px var(--ring-strong), 0 1px 2px rgba(0, 0, 0, 0.3);
                --shadow-menu: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 16px 36px -10px rgba(0, 0, 0, 0.7);
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
            --shadow-card-hover: 0 0 0 1px var(--ring-strong), 0 1px 2px rgba(0, 0, 0, 0.3);
            --shadow-menu: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 16px 36px -10px rgba(0, 0, 0, 0.7);
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

        /* top bar */

        .topbar {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            align-items: center;
            gap: 16px;
            height: 56px;
            padding: 0 20px;
            background: var(--bg);
            box-shadow: 0 1px 0 var(--ring);
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: none;
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
            font-size: 15px;
            font-weight: 600;
            letter-spacing: -0.01em;
        }

        .brand-sub {
            color: var(--subtle);
            font-size: 13px;
        }

        .topbar-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
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

        .ghost-btn:disabled {
            color: var(--muted);
            background: none;
            opacity: 0.5;
        }

        .segmented {
            position: relative;
            display: flex;
            padding: 3px;
            border-radius: 9px;
            background: var(--raised);
            box-shadow: inset 0 0 0 1px var(--ring);
        }

        .segmented button, .segmented a {
            position: relative;
            z-index: 1;
            display: grid;
            place-items: center;
            min-width: 0;
            height: 26px;
            padding: 0 10px;
            border-radius: 6px;
            color: var(--muted);
            font-size: 12.5px;
            font-weight: 500;
            white-space: nowrap;
            transition: color 0.15s, background-color 0.15s;
        }

        .segmented button:hover, .segmented a:hover {
            color: var(--text);
        }

        .segmented [aria-checked="true"], .segmented [aria-current="true"] {
            color: var(--text);
        }

        .segmented a[aria-current="true"] {
            background: var(--surface);
            box-shadow: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.12);
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

        .theme-toggle button {
            width: 29px;
            padding: 0;
        }

        /* groups and controls */

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

        .control.code {
            font-family: var(--mono);
            font-size: 12px;
            line-height: 18px;
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

        /* Auto is a word, the client types are ids */
        .combo-button [data-combobox-label]:not(.mono) {
            font-family: var(--font);
            font-size: 13px;
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

        .menu-heading {
            padding: 8px 8px 4px;
            color: var(--subtle);
            font-size: 11.5px;
            font-weight: 500;
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

        /* the server page */

        .page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 28px 20px 64px;
        }

        [role="tabpanel"][hidden] {
            display: none !important;
        }

        /* the dot, the status word and the buttons share one center line, 20px down */
        .status {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            min-height: 40px;
        }

        .status-dot {
            flex: none;
            width: 8px;
            height: 8px;
            margin-top: 16px;
            border-radius: 50%;
            background: var(--subtle);
        }

        .status-dot[data-state="running"] {
            background: var(--green);
        }

        .status-text {
            display: flex;
            flex: 1 1 0;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 4px 12px;
            min-width: 0;
            padding-top: 8px;
            font-size: 15px;
            font-weight: 600;
        }

        .status-text .mono {
            color: var(--muted);
            font-size: 13px;
            font-weight: 400;
            overflow-wrap: anywhere;
        }

        .status-url {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        /* the second line: open, uptime, streaming */
        .status-meta {
            display: flex;
            flex-basis: 100%;
            flex-wrap: wrap;
            gap: 4px 0;
            color: var(--muted);
            font-size: 13px;
            font-weight: 400;
        }

        .status-meta > span:not(.hidden) ~ span:not(.hidden)::before {
            content: "·";
            margin: 0 10px;
            color: var(--subtle);
        }

        .icon-btn.small {
            width: 24px;
            height: 24px;
            border-radius: 6px;
            color: var(--subtle);
        }

        /* the chat page's shimmer, on the status word while a start, an apply or a stop is on its way */
        #statusText.loading {
            background: linear-gradient(90deg, var(--subtle) 0%, var(--subtle) 35%, var(--text) 50%, var(--subtle) 65%, var(--subtle) 100%);
            background-size: 250% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: shimmer 1.8s linear infinite;
        }

        @keyframes shimmer {
            from {
                background-position: 100% 0;
            }

            to {
                background-position: -150% 0;
            }
        }

        /* right-aligned with Apply left of Save: when Apply goes after a click, what slides under the pointer is
           a disabled Save, never Stop */
        .actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            margin: 4px 0 0 auto;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 32px;
            padding: 0 12px;
            border-radius: 8px;
            background: var(--accent);
            color: var(--on-accent);
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            transition: opacity 0.15s, background-color 0.15s;
        }

        .btn:hover {
            opacity: 0.9;
        }

        /* Stop is a ring: a running server has a filled button only while Apply waits */
        .btn.secondary {
            background: var(--surface);
            color: var(--text);
            box-shadow: 0 0 0 1px var(--ring-strong);
        }

        .btn:disabled {
            opacity: 0.5;
        }

        .kbd {
            margin-left: 2px;
            padding: 0 5px;
            border-radius: 4px;
            box-shadow: 0 0 0 1px var(--ring);
            color: var(--subtle);
            font: 500 11px/18px var(--mono);
        }

        /* the Saved flash reads at full strength, though the button is disabled again by then */
        #saveButton[data-flash="true"] {
            color: var(--text);
            opacity: 1;
        }

        #serverError {
            margin: 10px 0 0 20px;
            font-size: 12.5px;
        }

        /* tabs: underline, the accent under the open one */
        .tabs {
            display: flex;
            gap: 24px;
            margin: 20px 0 24px;
            box-shadow: inset 0 -1px 0 var(--ring);
        }

        .tabs [role="tab"] {
            position: relative;
            height: 36px;
            padding: 0 2px;
            color: var(--muted);
            font-size: 13px;
            font-weight: 500;
            transition: color 0.15s;
        }

        .tabs [role="tab"]:hover, .tabs [role="tab"][aria-selected="true"] {
            color: var(--text);
        }

        .tabs [role="tab"][aria-selected="true"]::after {
            content: "";
            position: absolute;
            right: 0;
            bottom: 0;
            left: 0;
            height: 2px;
            border-radius: 1px;
            background: var(--accent);
        }

        .tabs [role="tab"]:focus-visible {
            border-radius: 6px;
            outline-offset: -2px;
        }

        /* cards: the surface and its ring, one radius everywhere */
        .card {
            min-width: 0;
            background: var(--surface);
            border-radius: 12px;
            box-shadow: var(--shadow-card);
        }

        .card-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-height: 48px;
            padding: 0 20px;
            box-shadow: inset 0 -1px 0 var(--ring);
        }

        .card-title {
            font-size: 13px;
            font-weight: 600;
        }

        .card-head .ghost-btn {
            margin-right: -8px;
        }

        /* the overview is one column; the running part shows between the checklist and the cards by order */
        #panelOverview {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .dashboard {
            display: contents;
        }

        #checklist {
            order: 0;
        }

        .toolbar {
            order: 1;
            display: flex;
            justify-content: flex-end;
        }

        .tiles {
            order: 2;
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 12px;
        }

        .models-grid {
            order: 3;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
            align-items: stretch;
        }

        .models-grid:empty {
            display: none;
        }

        .charts {
            order: 4;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .dashboard[data-stale="true"] .tiles, .dashboard[data-stale="true"] .chart-card {
            opacity: 0.5;
            transition: opacity 0.15s;
        }

        .toolbar .segmented button {
            padding: 0 12px;
        }

        /* tiles: a label, the number, its change, a line of context and a trend */
        .tile {
            display: grid;
            grid-template-rows: auto auto auto 28px;
            gap: 6px;
            padding: 14px 16px 12px;
        }

        .tile-label {
            color: var(--muted);
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
        }

        .tile-row {
            display: flex;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 2px 10px;
            min-width: 0;
        }

        .tile-value {
            font-size: 24px;
            font-weight: 600;
            letter-spacing: -0.02em;
            line-height: 1.1;
            white-space: nowrap;
        }

        .tile-value[data-empty="true"] {
            color: var(--subtle);
            font-weight: 400;
        }

        .tile-delta {
            color: var(--muted);
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
        }

        .tile-delta[data-good="true"] {
            color: var(--green);
        }

        .tile-delta[data-good="false"] {
            color: var(--red);
        }

        .tile-foot {
            color: var(--subtle);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .spark {
            display: block;
            width: 100%;
            height: 28px;
            overflow: visible;
        }

        .spark path {
            fill: none;
            stroke: var(--subtle);
            stroke-width: 1.5;
            stroke-linejoin: round;
            stroke-linecap: round;
        }

        .spark .end {
            fill: var(--accent);
        }

        .spark .pt {
            fill: var(--subtle);
        }

        /* model cards */
        .model-card {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 16px 20px 14px;
            cursor: pointer;
            transition: box-shadow 0.15s;
        }

        @media (hover: hover) {
            .model-card:hover {
                box-shadow: var(--shadow-card-hover);
            }
        }

        .model-card:focus-visible {
            outline-offset: 2px;
        }

        .model-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-width: 0;
        }

        .model-head .served {
            min-width: 0;
            color: var(--text);
            font-size: 14px;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .model-card .upstream {
            margin-top: -6px;
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Last holds words ("failed 3 min ago"), so its column is the widest */
        .model-stats {
            display: grid;
            grid-template-columns: minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 1.3fr);
            gap: 10px 12px;
            padding-top: 10px;
            box-shadow: inset 0 1px 0 var(--ring);
        }

        .model-stats .stat {
            display: flex;
            flex-direction: column;
            gap: 1px;
            min-width: 0;
        }

        .model-stats b {
            font-size: 15px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .model-stats b.words {
            font-size: 12px;
            font-weight: 500;
            line-height: 22px;
        }

        .model-stats b[data-empty="true"] {
            color: var(--subtle);
            font-weight: 400;
        }

        .model-stats span {
            color: var(--subtle);
            font-size: 11px;
        }

        .model-note {
            margin: 0;
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .model-hint {
            margin: auto 0 0;
            padding-top: 10px;
            box-shadow: inset 0 1px 0 var(--ring);
            color: var(--subtle);
            font-size: 12px;
        }

        /* charts: one axis each, hairline grid, columns at most 24px with 2px of surface between segments */
        .chart-card .chart {
            position: relative;
            height: 212px;
            padding: 12px 20px 8px 12px;
        }

        .chart svg {
            display: block;
            width: 100%;
            height: 100%;
            overflow: visible;
        }

        .chart svg:focus-visible {
            border-radius: 4px;
            outline: 2px solid var(--accent);
            outline-offset: 4px;
        }

        .grid line {
            stroke: var(--ring);
            stroke-width: 1;
            shape-rendering: crispEdges;
        }

        .axis text {
            fill: var(--subtle);
            font: 11px var(--mono);
            font-variant-numeric: tabular-nums;
        }

        .bar.ok {
            fill: var(--accent);
        }

        .bar.fail {
            fill: var(--red);
        }

        .bar.drop {
            fill: var(--subtle);
        }

        .hit {
            fill: transparent;
        }

        .line {
            fill: none;
            stroke-width: 2;
            stroke-linejoin: round;
            stroke-linecap: round;
        }

        .line.p90, .dot.p90 {
            stroke: var(--accent);
        }

        .line.p50, .dot.p50 {
            stroke: var(--muted);
        }

        .dot.p90 {
            fill: var(--accent);
        }

        .dot.p50 {
            fill: var(--muted);
        }

        .dot {
            stroke-width: 0;
        }

        .cross {
            stroke: var(--ring-strong);
            stroke-width: 1;
            shape-rendering: crispEdges;
        }

        .legend {
            display: flex;
            gap: 14px;
            color: var(--muted);
            font-size: 12px;
        }

        .key::before {
            content: "";
            display: inline-block;
            width: 8px;
            height: 8px;
            margin-right: 6px;
            border-radius: 2px;
            vertical-align: 0;
        }

        .key.ok::before {
            background: var(--accent);
        }

        .key.fail::before {
            background: var(--red);
        }

        .key.drop::before {
            background: var(--subtle);
        }

        .key.line::before {
            width: 12px;
            height: 2px;
            border-radius: 1px;
            vertical-align: 3px;
        }

        .key.line.p90::before {
            background: var(--accent);
        }

        .key.line.p50::before {
            background: var(--muted);
        }

        .chart-tip {
            position: fixed;
            z-index: 20;
            min-width: 150px;
            padding: 8px 10px;
            pointer-events: none;
            background: var(--surface);
            border-radius: 8px;
            box-shadow: var(--shadow-menu);
            font-size: 12px;
        }

        .chart-tip .when {
            margin-bottom: 4px;
            color: var(--subtle);
            font-family: var(--mono);
            font-size: 11px;
        }

        .chart-tip .r {
            display: flex;
            align-items: center;
            gap: 8px;
            line-height: 20px;
        }

        .chart-tip .r i {
            flex: none;
            width: 10px;
            height: 2px;
            border-radius: 1px;
            background: transparent;
        }

        .chart-tip .r i.ok, .chart-tip .r i.p90 {
            background: var(--accent);
        }

        .chart-tip .r i.fail {
            background: var(--red);
        }

        .chart-tip .r i.drop {
            background: var(--subtle);
        }

        .chart-tip .r i.p50 {
            background: var(--muted);
        }

        .chart-tip .r b {
            min-width: 48px;
            font-family: var(--mono);
            font-weight: 500;
            font-variant-numeric: tabular-nums;
        }

        .chart-tip .r span {
            color: var(--muted);
        }

        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip: rect(0 0 0 0);
            white-space: nowrap;
        }

        /* errors */
        .errors {
            margin: 0;
            padding: 6px 20px 10px;
            list-style: none;
        }

        .errors li {
            display: grid;
            grid-template-columns: 70px minmax(80px, 160px) minmax(0, 1fr);
            gap: 12px;
            padding: 8px 0;
            font-size: 12.5px;
        }

        .errors li + li {
            box-shadow: inset 0 1px 0 var(--ring);
        }

        .errors .time {
            color: var(--subtle);
        }

        .errors .model {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .errors .message {
            color: var(--muted);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .errors li.none {
            display: block;
            padding: 14px 0;
            color: var(--subtle);
        }

        /* the checklist while stopped */
        .checklist .steps {
            margin: 0;
            padding: 4px 20px 8px;
            list-style: none;
        }

        .step {
            display: grid;
            grid-template-columns: 24px minmax(0, 1fr) auto;
            gap: 14px;
            align-items: center;
            padding: 14px 0;
        }

        .step + .step {
            box-shadow: inset 0 1px 0 var(--ring);
        }

        .step-mark {
            display: grid;
            place-items: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            box-shadow: inset 0 0 0 1.5px var(--ring-strong);
            color: var(--muted);
            font-size: 12px;
            font-weight: 600;
        }

        .step[data-done="true"] .step-mark {
            background: var(--green);
            box-shadow: none;
            color: var(--on-accent);
        }

        .step-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }

        .step-text b {
            font-size: 13px;
            font-weight: 600;
        }

        .step-text span {
            color: var(--muted);
            font-size: 12px;
        }

        .step[data-done="true"] .step-text b {
            color: var(--muted);
            font-weight: 500;
        }

        /* the Models tab: rows that open to edit */
        .table {
            --cols: minmax(140px, 1fr) minmax(180px, 2fr) 96px 20px;
            padding: 4px 12px 8px;
        }

        .table-head {
            display: grid;
            grid-template-columns: var(--cols) 32px;
            gap: 8px;
            padding: 8px;
            color: var(--subtle);
            font-size: 12px;
            font-weight: 500;
        }

        /* a row scrolled to (a refusal under it) stops below the sticky top bar */
        .row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 32px;
            column-gap: 8px;
            align-items: center;
            scroll-margin-top: 72px;
        }

        .row + .row {
            border-top: 1px solid var(--ring);
        }

        /* the editor follows the summary in the tab order and Remove comes last, though Remove sits beside the summary */
        .row > .remove-btn {
            grid-row: 1;
            grid-column: 2;
        }

        .summary {
            display: grid;
            grid-template-columns: var(--cols);
            gap: 8px;
            align-items: center;
            min-height: 44px;
            padding: 10px 8px;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.15s;
        }

        /* only where a pointer hovers: on a touch screen a tapped row would keep the tint */
        @media (hover: hover) {
            .summary:hover {
                background: var(--hover);
            }
        }

        .summary:focus-visible {
            outline-offset: -2px;
        }

        .summary .cell {
            min-width: 0;
        }

        .served {
            color: var(--text);
            font-size: 13px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .served[data-empty="true"] {
            color: var(--subtle);
        }

        .upstream {
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .row-chevron {
            display: grid;
            place-items: center;
            color: var(--subtle);
        }

        .row-chevron svg {
            transition: transform 0.2s var(--ease);
        }

        .row[data-open="true"] .row-chevron svg {
            transform: rotate(180deg);
        }

        .row-note {
            grid-column: 1 / -1;
            margin: -4px 0 10px 8px;
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .row-note.err {
            color: var(--red);
            white-space: normal;
            overflow-wrap: anywhere;
        }

        /* only opacity and a 4px rise: the layout itself never animates */
        .editor {
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px 16px;
            padding: 4px 8px 16px;
            animation: editor-in 0.18s var(--ease);
        }

        @keyframes editor-in {
            from {
                opacity: 0;
                transform: translateY(-4px);
            }
        }

        .field {
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 0;
        }

        .field > span {
            color: var(--muted);
            font-size: 12px;
            font-weight: 500;
        }

        .key-wrap {
            position: relative;
            min-width: 0;
        }

        .key-wrap .control {
            padding-right: 36px;
        }

        .key-eye {
            position: absolute;
            top: 50%;
            right: 4px;
            display: grid;
            place-items: center;
            width: 26px;
            height: 26px;
            margin-top: -13px;
            border-radius: 6px;
            color: var(--subtle);
            transition: color 0.15s, background-color 0.15s;
        }

        .key-eye:hover {
            color: var(--text);
            background: var(--hover);
        }

        .remove-btn {
            align-self: start;
            margin-top: 6px;
            color: var(--subtle);
        }

        /* wider than its field, so every client type and both headings fit on one line */
        .row [data-combobox-menu] {
            right: auto;
            width: max(100%, 300px);
        }

        /* Settings */
        .settings {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            align-items: start;
        }

        .card-body {
            padding: 12px 20px 16px;
        }

        .key-row {
            grid-template-columns: 96px minmax(0, 1fr) 32px;
            padding: 6px 0;
        }

        .key-row > .remove-btn {
            grid-column: 3;
            align-self: center;
            margin-top: 0;
        }

        #keysNote {
            margin: 0;
            padding: 6px 0;
        }

        .listen-row {
            display: grid;
            grid-template-columns: auto minmax(120px, 1fr) auto 96px auto;
            gap: 8px 10px;
            align-items: center;
        }

        .file-line {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .file-line .mono {
            min-width: 0;
            overflow-wrap: anywhere;
        }

        /* a state is a dot and its word, everywhere: amber ring unsaved, neutral saved, green live */
        .state {
            display: inline-flex;
            flex: none;
            align-items: center;
            gap: 6px;
            color: var(--muted);
            font-size: 12px;
            white-space: nowrap;
        }

        .state::before {
            content: "";
            flex: none;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            box-shadow: inset 0 0 0 1.5px var(--amber);
        }

        .state[data-state="saved"]::before {
            box-shadow: none;
            background: var(--subtle);
        }

        .state[data-state="live"]::before {
            box-shadow: none;
            background: var(--green);
        }

        @media (max-width: 1100px) {
            .tiles {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .models-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 900px) {
            .status {
                flex-wrap: wrap;
            }

            .actions {
                width: 100%;
                margin: 8px 0 0 20px;
            }

            .kbd {
                display: none;
            }

            .tabs {
                gap: 18px;
            }

            .settings {
                grid-template-columns: 1fr;
            }

            .chart-card .chart {
                height: 196px;
            }

            .errors li {
                grid-template-columns: 62px minmax(0, 1fr);
            }

            .errors .message {
                grid-column: 1 / -1;
            }

            .table-head {
                display: none;
            }

            .summary {
                grid-template-columns: minmax(0, 1fr) auto 20px;
                row-gap: 4px;
            }

            .summary .state {
                grid-row: 1;
                grid-column: 2;
            }

            .summary .row-chevron {
                grid-row: 1;
                grid-column: 3;
            }

            .summary .upstream {
                grid-column: 1 / -1;
            }

            /* a line that would only repeat the served id goes */
            .summary .upstream:empty, .summary .upstream[data-same="true"] {
                display: none;
            }

            .editor {
                grid-template-columns: 1fr;
            }

            .listen-row {
                grid-template-columns: auto 1fr;
            }

            .listen-row .state {
                grid-column: 1 / -1;
            }
        }

        @media (max-width: 700px) {
            .tiles {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }

            .tile-value {
                font-size: 22px;
            }

            .models-grid {
                grid-template-columns: 1fr;
                gap: 12px;
            }

            .model-card {
                padding: 14px 16px 12px;
            }
        }

        @media (max-width: 640px) {
            .topbar {
                gap: 10px;
                padding: 0 12px;
            }

            .label-wide {
                display: none;
            }

            .page {
                padding: 20px 12px 48px;
            }

            .tile {
                padding: 12px 14px;
            }

            .card-head {
                padding: 0 14px;
            }

            .card-body {
                padding: 10px 14px 14px;
            }

            .table, .errors, .checklist .steps {
                padding-right: 6px;
                padding-left: 6px;
            }

            .errors, .checklist .steps {
                padding-right: 14px;
                padding-left: 14px;
            }

            .chart-card .chart {
                padding: 12px 10px 8px 4px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                transition-duration: 0.01ms !important;
            }
        }
    </style>
</head>
<body>
    <header class="topbar">
        <a class="brand" href="/server/"><svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M15.5 0H25a7 7 0 0 1 7 7v9.5H15.5Z" class="mark-bg"></path><path d="M0 15.5h16.5V32H7a7 7 0 0 1-7-7Z" class="mark-bg"></path><path d="M0 16V7a7 7 0 0 1 7-7h9v16Z" fill="#477dfb"></path><path d="M16 16h16v9a7 7 0 0 1-7 7h-9Z" fill="#477dfb"></path><g fill="#fff" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="10.5" font-weight="700" text-anchor="middle" dominant-baseline="central"><text x="8.5" y="8.5">M</text><text x="23.5" y="8.5">M</text><text x="8.5" y="23.5">S</text><text x="23.5" y="23.5">P</text></g></svg><span class="brand-name">MMSP</span><span class="brand-sub">Server</span></a>
        <div class="topbar-actions">
            <a href="https://github.com/Prism-Shadow/model-message-stream-protocol" target="_blank" rel="noopener noreferrer" class="ghost-btn" title="GitHub"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"></path></svg><span class="label-wide">GitHub</span></a>
            <div class="segmented theme-toggle" id="themeToggle" role="radiogroup" aria-label="Theme">
                <span class="seg-thumb" aria-hidden="true"></span>
                <button type="button" role="radio" aria-checked="false" aria-label="Light theme" title="Light" data-theme-choice="light" onclick="setTheme('light')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg></button>
                <button type="button" role="radio" aria-checked="false" aria-label="Dark theme" title="Dark" data-theme-choice="dark" onclick="setTheme('dark')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path></svg></button>
            </div>
        </div>
    </header>
    <main class="page">
        <section class="status" id="statusBar">
            <span class="status-dot" id="statusDot" data-state="stopped" aria-hidden="true"></span>
            <div class="status-text" role="status">
                <span id="statusText">Stopped</span>
                <span id="statusUrlWrap" class="status-url hidden">
                    <span id="statusUrl" class="mono"></span>
                    <button type="button" id="copyUrlButton" class="icon-btn small" title="Copy" aria-label="Copy base URL" onclick="copyBaseUrl()"><svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><svg class="copied-icon hidden" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg></button>
                </span>
                <span class="status-meta hidden" id="statusMeta"><span id="statusOpen" class="hidden" title="No keys: open to every request">open</span><span id="statusUptime"></span><span id="statusStreaming" class="hidden"></span></span>
            </div>
            <div class="actions">
                <button type="button" id="applyButton" class="btn hidden" onclick="restartServer()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg><span id="applyLabel">Apply</span></button>
                <button type="button" id="saveButton" class="ghost-btn" onclick="saveServerConfig()" disabled><svg class="save-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><path d="M17 21v-8H7v8M7 3v5h8"></path></svg><svg class="saved-icon hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg><span id="saveLabel">Save</span><kbd id="saveKey" class="kbd" aria-hidden="true">⌘S</kbd></button>
                <button type="button" id="serverToggle" class="btn" data-state="stopped" onclick="toggleServer()" disabled title="Save first">
                    <svg id="serverToggleStart" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8Z"></path></svg>
                    <svg id="serverToggleStop" class="hidden" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"></rect></svg>
                    <span id="serverToggleLabel">Start</span>
                </button>
            </div>
        </section>
        <p id="serverError" class="field-error hidden" role="alert"></p>

        <nav class="tabs" id="tabs" role="tablist" aria-label="Sections">
            <button type="button" role="tab" id="tabOverview" aria-selected="true" aria-controls="panelOverview" data-tab="overview" onclick="showTab('overview')" onkeydown="handleTabKeydown(event)">Overview</button>
            <button type="button" role="tab" id="tabModels" aria-selected="false" aria-controls="panelModels" data-tab="models" tabindex="-1" onclick="showTab('models')" onkeydown="handleTabKeydown(event)">Models</button>
            <button type="button" role="tab" id="tabSettings" aria-selected="false" aria-controls="panelSettings" data-tab="settings" tabindex="-1" onclick="showTab('settings')" onkeydown="handleTabKeydown(event)">Settings</button>
        </nav>

        <section id="panelOverview" role="tabpanel" aria-labelledby="tabOverview">
            <div class="card checklist" id="checklist">
                <div class="card-head"><span class="card-title">Start the server</span></div>
                <ol class="steps">
                    <li class="step" data-done="false"><span class="step-mark">1</span><span class="step-text"><b>Add a model</b><span>Model id, served id and key.</span></span><button type="button" class="ghost-btn" onclick="showTab('models', true)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>Model</span></button></li>
                    <li class="step" data-done="false"><span class="step-mark">2</span><span class="step-text"><b>Save</b><span>Writes the file Start reads.</span></span><button type="button" class="ghost-btn" id="checklistSave" onclick="saveServerConfig()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><path d="M17 21v-8H7v8M7 3v5h8"></path></svg><span>Save</span></button></li>
                    <li class="step" data-done="false"><span class="step-mark">3</span><span class="step-text"><b>Start</b><span>Serves the file; the numbers appear here.</span></span></li>
                </ol>
            </div>
            <div class="dashboard hidden" id="dashboard" data-stale="false">
                <div class="toolbar">
                    <div class="segmented" id="rangeControl" role="radiogroup" aria-label="Range">
                        <span class="seg-thumb" aria-hidden="true"></span>
                        <button type="button" role="radio" aria-checked="false" data-range="300" onclick="setRange(300)">5 min</button>
                        <button type="button" role="radio" aria-checked="true" data-range="900" onclick="setRange(900)">15 min</button>
                        <button type="button" role="radio" aria-checked="false" data-range="3600" onclick="setRange(3600)">1 h</button>
                    </div>
                </div>
                <div class="tiles" id="tiles">
                    <div class="card tile" id="tileRequests"><span class="tile-label">Requests</span><div class="tile-row"><b class="tile-value">–</b><span class="tile-delta"></span></div><span class="tile-foot"></span><svg class="spark" aria-hidden="true"></svg></div>
                    <div class="card tile" id="tileSuccess"><span class="tile-label">Success</span><div class="tile-row"><b class="tile-value">–</b><span class="tile-delta"></span></div><span class="tile-foot"></span><svg class="spark" aria-hidden="true"></svg></div>
                    <div class="card tile" id="tileLatencyP50"><span class="tile-label">Latency p50</span><div class="tile-row"><b class="tile-value">–</b><span class="tile-delta"></span></div><span class="tile-foot"></span><svg class="spark" aria-hidden="true"></svg></div>
                    <div class="card tile" id="tileLatencyP90"><span class="tile-label">Latency p90</span><div class="tile-row"><b class="tile-value">–</b><span class="tile-delta"></span></div><span class="tile-foot"></span><svg class="spark" aria-hidden="true"></svg></div>
                    <div class="card tile" id="tileTokens"><span class="tile-label">Tokens out</span><div class="tile-row"><b class="tile-value">–</b><span class="tile-delta"></span></div><span class="tile-foot"></span><svg class="spark" aria-hidden="true"></svg></div>
                    <div class="card tile" id="tileTps"><span class="tile-label" title="Output tokens per second of generation (thinking + response)">TPS</span><div class="tile-row"><b class="tile-value">–</b><span class="tile-delta"></span></div><span class="tile-foot"></span><svg class="spark" aria-hidden="true"></svg></div>
                </div>
                <div class="charts">
                    <div class="card chart-card">
                        <div class="card-head"><span class="card-title">Requests</span><span class="legend"><span class="key ok">ok</span><span class="key fail">failed</span><span class="key drop">dropped</span></span></div>
                        <div class="chart" id="requestsChart"></div>
                    </div>
                    <div class="card chart-card">
                        <div class="card-head"><span class="card-title">Latency</span><span class="legend"><span class="key line p90">p90</span><span class="key line p50">p50</span></span></div>
                        <div class="chart" id="latencyChart"></div>
                    </div>
                    <div class="card">
                        <div class="card-head"><span class="card-title">Errors</span></div>
                        <ul class="errors" id="errorList"></ul>
                    </div>
                </div>
            </div>
            <div class="models-grid" id="modelCards"></div>
            <div class="chart-tip hidden" id="chartTip" role="tooltip"></div>
        </section>

        <section id="panelModels" role="tabpanel" aria-labelledby="tabModels" hidden>
            <div class="card">
                <div class="card-head"><span class="card-title">Models</span><button type="button" id="addRowButton" class="ghost-btn" onclick="addRow()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>Model</span></button></div>
                <div class="table" id="modelTable">
                    <div class="table-head" id="tableHead" aria-hidden="true"><span>Served as</span><span>Model</span><span>State</span><span></span><span></span></div>
                    <div id="modelRows" role="list"></div>
                </div>
            </div>
        </section>

        <section id="panelSettings" role="tabpanel" aria-labelledby="tabSettings" hidden>
            <div class="settings">
                <div class="card">
                    <div class="card-head"><span class="card-title">Keys</span><button type="button" id="addKeyButton" class="ghost-btn" onclick="addKey()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>Key</span></button></div>
                    <div class="card-body">
                        <div id="apiKeyRows" role="list"></div>
                        <p id="keysNote" class="field-note">None: open to every request.</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-head"><span class="card-title">Listen</span></div>
                    <div class="card-body">
                        <div class="listen-row">
                            <label class="field-label" for="hostInput">Host</label>
                            <input id="hostInput" class="control code" type="text" value="127.0.0.1" placeholder="127.0.0.1" spellcheck="false" autocomplete="off" oninput="saveDraft()">
                            <label class="field-label" for="portInput">Port</label>
                            <input id="portInput" class="control code" type="number" min="0" max="65535" value="25752" placeholder="25752" oninput="saveDraft()">
                            <span class="state" id="listenState" data-state="unsaved">Unsaved</span>
                        </div>
                    </div>
                </div>
            </div>
            <p class="file-line field-note"><span>File</span><span id="configPath" class="mono"></span></p>
        </section>
    </main>

    <script>
        // the client types the playground knows, official and compatible, for the client type menus
        const PLAYGROUND = __PLAYGROUND_DEFAULTS__;
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
        const DRAFT_KEY = 'mmsp.playground.server';
        const RANGE_KEY = 'mmsp.playground.server.range';
        const API = '/server/api';
        const METRICS = '/server/api/metrics';
        const DEFAULT_HOST = '127.0.0.1';
        const DEFAULT_PORT = 25752;
        // a row's cells in the order the server's config lists them; the last two may be left out
        const COLUMNS = ['model_id', 'base_url', 'api_key', 'server_model_id', 'client_type'];
        const OPTIONAL_COLUMNS = ['base_url', 'client_type'];
        const METRICS_MS = 3000;
        const RANGES = [300, 900, 3600];
        const TABS = ['overview', 'models', 'settings'];
        const PANELS = { overview: 'panelOverview', models: 'panelModels', settings: 'panelSettings' };
        // the plot inside a chart card: gutters for the y labels and the time axis, column width and gap
        const CHART = { left: 44, right: 8, top: 8, bottom: 20, maxBar: 24, gap: 2, minSlot: 8 };
        // window columns that add up when buckets merge; percentiles merge to their peak, TPS is recomputed
        const SUMMED = ['requests', 'successes', 'failures', 'disconnects', 'refused', 'tokens_out', 'thoughts', 'response', 'generation_ms'];
        const STATE_LABELS = { live: 'Live', saved: 'Saved', unsaved: 'Unsaved' };
        const OUTCOME_WORDS = { success: 'ok', failure: 'failed', disconnect: 'dropped' };
        const CHEVRON_ICON = '<svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>';
        const REMOVE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>';
        const CHECK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
        const EYE_BUTTON = '<button type="button" class="key-eye" data-visible="false" aria-label="Show key" title="Show key" onclick="toggleKeyVisibility(this)">'
            + '<svg class="eye-on hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
            + '<svg class="eye-off" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.7 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.3 4.3"></path><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a10.9 10.9 0 0 0 5.4-1.4"></path><path d="M9.9 9.9A3 3 0 0 0 14.1 14.1"></path><path d="M3 3l18 18"></path></svg>'
            + '</button>';
        // set while the saved table is laid out again, which is not the user typing
        let restoring = false;
        let saved = null; // the GET /config body
        let status = { running: false };
        // stopped, starting, running, applying or stopping: what the buttons offer
        let phase = 'stopped';
        let metrics = null; // the last /api/metrics body while the server runs
        let series = null; // its window: the range in 10 s buckets
        let range = 900;
        let tab = 'overview';
        let tip = null; // the tooltip shown: which chart, which column, where
        let pollTimer = null;
        // bumped by every poll and by a stop, so an answer that arrives late is dropped
        let metricsSeq = 0;
        let saving = false;
        let flashTimer = null;
        let copyTimer = null;
        let resizeTimer = null;
        let nextRowId = 1;
        let nextKeyId = 1;

        function $(id) {
            return document.getElementById(id);
        }

        function updateSegmentThumb(root) {
            const thumb = root && root.querySelector('.seg-thumb');
            const checked = root && root.querySelector('[aria-checked="true"]');
            if (!thumb || !checked || !checked.offsetWidth) {
                return;
            }
            thumb.style.width = checked.offsetWidth + 'px';
            thumb.style.transform = 'translateX(' + checked.offsetLeft + 'px)';
        }

        function updateThemeToggle() {
            const stored = document.documentElement.dataset.theme;
            const theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.querySelectorAll('#themeToggle [data-theme-choice]').forEach(function (button) {
                button.setAttribute('aria-checked', button.dataset.themeChoice === theme ? 'true' : 'false');
            });
            updateSegmentThumb(document.getElementById('themeToggle'));
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

            // the arrows need somewhere to start: the selected option, else the first
            const selected = menu.querySelector('[data-combobox-option][aria-selected="true"]') || visibleOptions(menu)[0];
            if (selected) {
                selected.scrollIntoView({ block: 'nearest' });
                selected.focus();
            }
        }

        function selectComboboxOption(comboboxId, option) {
            const root = document.getElementById(comboboxId);
            root.querySelector('[data-combobox-value]').value = option.dataset.value || '';
            const label = root.querySelector('[data-combobox-label]');
            label.textContent = option.dataset.label;
            label.classList.toggle('mono', !!option.dataset.value);

            root.querySelectorAll('[data-combobox-option]').forEach((item) => {
                item.setAttribute('aria-selected', item === option ? 'true' : 'false');
            });

            const wasOpen = root.querySelector('[data-combobox-button][aria-expanded="true"]');
            closeCombobox(comboboxId);
            if (wasOpen) {
                wasOpen.focus();
            }
            if (comboboxId.startsWith('clientType-')) {
                handleRowClientType(comboboxId.slice('clientType-'.length));
            }
        }

        function handleComboboxKeydown(event, comboboxId) {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                event.preventDefault();
                toggleCombobox(comboboxId);
            } else if (event.key === 'Escape') {
                // an open menu takes the Escape, so the editor around it stays open
                if (!document.getElementById(comboboxId + '-menu').classList.contains('hidden')) {
                    event.preventDefault();
                }
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

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }
            if (!target.closest('[data-combobox]')) {
                closeComboboxes();
            }
        });

        function clientTypeOption(comboboxId, value, label, description) {
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
            option.onclick = () => selectComboboxOption(comboboxId, option);
            return option;
        }

        function populateClientTypes(comboboxId) {
            const menu = document.getElementById(comboboxId + '-menu');
            const auto = clientTypeOption(comboboxId, '', 'Auto', 'The official client the model id names');
            auto.setAttribute('aria-selected', 'true');
            menu.appendChild(auto);
            [['Official: the vendor’s own API', PLAYGROUND.official], ['Compatible: any endpoint serving the protocol', PLAYGROUND.compatible]].forEach(([title, types]) => {
                const header = document.createElement('div');
                header.className = 'menu-heading';
                header.textContent = title;
                menu.appendChild(header);
                types.forEach((type) => menu.appendChild(clientTypeOption(comboboxId, type, type, CLIENT_TYPE_DESCRIPTIONS[type] || '')));
            });
        }

        function modelRows() {
            return Array.from(document.getElementById('modelRows').children);
        }

        function keyInputs() {
            return Array.from(document.querySelectorAll('#apiKeyRows [data-key]'));
        }

        function rowCell(row, column) {
            return row.querySelector('[data-column="' + column + '"]');
        }

        // a type the menu does not list (written into the file by hand) is kept, listed after Auto, so the
        // row still equals its saved form and the server can name it
        function setRowClientType(rowId, type) {
            const menu = document.getElementById('clientType-' + rowId + '-menu');
            let option = visibleOptions(menu).find((item) => item.dataset.value === type);
            if (!option) {
                option = clientTypeOption('clientType-' + rowId, type, type, '');
                menu.insertBefore(option, menu.querySelector('.menu-heading'));
            }
            selectComboboxOption('clientType-' + rowId, option);
        }
        function addRow(cells) {
            const rowId = 'r' + nextRowId++;
            const row = document.createElement('div');
            row.className = 'row';
            row.setAttribute('role', 'listitem');
            row.dataset.rowId = rowId;
            row.dataset.open = 'false';
            row.innerHTML = \`
                <div class="summary" role="button" tabindex="0" aria-expanded="false" aria-controls="editor-\${rowId}" aria-label="Edit" onclick="toggleRow('\${rowId}')" onkeydown="handleSummaryKeydown(event, '\${rowId}')">
                    <span class="cell served mono" data-label="Served as" data-empty="true">–</span>
                    <span class="cell upstream mono" data-label="Model"></span>
                    <span class="state" data-state="unsaved">Unsaved</span>
                    <span class="row-chevron" aria-hidden="true">\${CHEVRON_ICON}</span>
                </div>
                <p class="row-note mono hidden"></p>
                <div class="editor hidden" id="editor-\${rowId}">
                    <label class="field"><span>Model id</span><input class="control code" data-column="model_id" type="text" placeholder="claude-sonnet-5-5" aria-label="Model id" spellcheck="false" autocomplete="off" oninput="handleModelIdInput(this)"></label>
                    <label class="field"><span>Served as</span><input class="control code" data-column="server_model_id" type="text" placeholder="claude" aria-label="Served as" spellcheck="false" autocomplete="off" oninput="handleServerIdInput(this)"></label>
                    <div class="field"><span>API key</span><div class="key-wrap"><input class="control code key" data-column="api_key" type="password" placeholder="$ANTHROPIC_API_KEY" aria-label="API key" autocomplete="off" oninput="handleCellInput(this)">\${EYE_BUTTON}</div></div>
                    <div class="field">
                        <span>Client type</span>
                        <div id="clientType-\${rowId}" data-combobox>
                            <input type="hidden" data-combobox-value data-column="client_type" value="">
                            <button type="button" role="combobox" aria-expanded="false" aria-controls="clientType-\${rowId}-menu" aria-label="Client type" class="control code combo-button" onclick="toggleCombobox('clientType-\${rowId}')" onkeydown="handleComboboxKeydown(event, 'clientType-\${rowId}')" data-combobox-button><span data-combobox-label>Auto</span>\${CHEVRON_ICON}</button>
                            <div id="clientType-\${rowId}-menu" class="hidden" role="listbox" aria-label="Client type" data-combobox-menu onkeydown="handleMenuKeydown(event, 'clientType-\${rowId}')"></div>
                        </div>
                    </div>
                    <label class="field"><span>Base URL</span><input class="control code" data-column="base_url" type="url" placeholder="Default" aria-label="Base URL" spellcheck="false" autocomplete="off" oninput="handleCellInput(this)"></label>
                </div>
                <button type="button" class="icon-btn remove-btn" onclick="removeRow('\${rowId}')" aria-label="Remove model" title="Remove">\${REMOVE_ICON}</button>
            \`;
            $('modelRows').appendChild(row);
            populateClientTypes('clientType-' + rowId);

            const serverId = rowCell(row, 'server_model_id');
            serverId.dataset.auto = 'true';
            if (cells) {
                const text = (column) => (typeof cells[column] === 'string' ? cells[column] : '');
                rowCell(row, 'model_id').value = text('model_id');
                setRowClientType(rowId, text('client_type'));
                rowCell(row, 'base_url').value = text('base_url');
                rowCell(row, 'api_key').value = text('api_key');
                serverId.value = text('server_model_id');
                serverId.dataset.auto = text('server_model_id') === text('model_id') ? 'true' : 'false';
            } else if (!restoring) {
                toggleRow(rowId, true);
                rowCell(row, 'model_id').focus();
            }
            saveDraft();
            return row;
        }

        function removeRow(rowId) {
            const row = document.querySelector('#modelRows [data-row-id="' + rowId + '"]');
            if (row) {
                row.remove();
            }
            saveDraft();
        }

        // one editor open at a time: opening a row closes the others
        function toggleRow(rowId, open) {
            const row = document.querySelector('#modelRows [data-row-id="' + rowId + '"]');
            if (!row) {
                return;
            }
            const next = open === undefined ? row.dataset.open !== 'true' : !!open;
            modelRows().forEach((item) => {
                const isOpen = item === row ? next : next ? false : item.dataset.open === 'true';
                item.dataset.open = isOpen ? 'true' : 'false';
                item.querySelector('.summary').setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                item.querySelector('.editor').classList.toggle('hidden', !isOpen);
            });
            closeComboboxes();
        }

        function handleSummaryKeydown(event, rowId) {
            if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
                event.preventDefault();
                toggleRow(rowId);
            }
        }

        function updateKeysNote() {
            $('keysNote').classList.toggle('hidden', $('apiKeyRows').children.length > 0);
        }

        function addKey(value) {
            const keyId = 'k' + nextKeyId++;
            const row = document.createElement('div');
            row.className = 'row key-row';
            row.setAttribute('role', 'listitem');
            row.dataset.keyId = keyId;
            row.innerHTML = \`
                <span class="state" data-state="unsaved">Unsaved</span>
                <div class="key-wrap"><input class="control code key" data-key type="password" placeholder="$MMSP_SERVER_API_KEY" aria-label="Key" autocomplete="off" oninput="handleCellInput(this)">\${EYE_BUTTON}</div>
                <button type="button" class="icon-btn remove-btn" onclick="removeKey('\${keyId}')" aria-label="Remove key" title="Remove">\${REMOVE_ICON}</button>
            \`;
            $('apiKeyRows').appendChild(row);
            const input = row.querySelector('[data-key]');
            input.value = typeof value === 'string' ? value : '';
            updateKeysNote();
            if (!restoring) {
                input.focus();
            }
            saveDraft();
        }

        function removeKey(keyId) {
            const row = document.querySelector('#apiKeyRows [data-key-id="' + keyId + '"]');
            if (row) {
                row.remove();
            }
            updateKeysNote();
            saveDraft();
        }

        // only Served as follows the model id: an empty client type and base URL are the defaults
        function handleModelIdInput(input) {
            const row = input.closest('.row');
            const serverId = rowCell(row, 'server_model_id');
            if (serverId.dataset.auto !== 'false') {
                serverId.value = input.value;
            }
            clearRing(row);
            saveDraft();
        }

        function handleServerIdInput(input) {
            input.dataset.auto = input.value ? 'false' : 'true';
            clearRing(input.closest('.row'));
            saveDraft();
        }

        function handleCellInput(input) {
            clearRing(input.closest('.row'));
            saveDraft();
        }

        function handleRowClientType(rowId) {
            const row = document.querySelector('#modelRows [data-row-id="' + rowId + '"]');
            if (!row) {
                return;
            }
            clearRing(row);
            saveDraft();
        }

        function toggleKeyVisibility(button) {
            const input = button.parentElement.querySelector('input');
            const visible = button.dataset.visible !== 'true';
            const label = visible ? 'Hide key' : 'Show key';
            button.dataset.visible = visible ? 'true' : 'false';
            button.setAttribute('aria-label', label);
            button.setAttribute('title', label);
            button.querySelector('.eye-on').classList.toggle('hidden', !visible);
            button.querySelector('.eye-off').classList.toggle('hidden', visible);
            input.type = visible ? 'text' : 'password';
        }

        function rowCells(row) {
            return Object.fromEntries(COLUMNS.map((column) => [column, rowCell(row, column).value]));
        }

        // a row as it is saved: trimmed cells in COLUMNS order, an empty client type or base URL left out
        function normalizeRow(row) {
            const normalized = {};
            COLUMNS.forEach((column) => {
                const value = row && typeof row[column] === 'string' ? row[column].trim() : '';
                if (value || !OPTIONAL_COLUMNS.includes(column)) {
                    normalized[column] = value;
                }
            });
            return normalized;
        }

        // rows are told apart by content, not position: removing a row moves every index after it
        function rowKey(row) {
            return JSON.stringify(normalizeRow(row));
        }

        function configKey(config) {
            const value = config || {};
            return JSON.stringify({
                models: (Array.isArray(value.models) ? value.models : []).map(normalizeRow),
                api_keys: (Array.isArray(value.api_keys) ? value.api_keys : []).map((key) => (typeof key === 'string' ? key.trim() : '')),
                host: value.host,
                port: value.port
            });
        }

        // empty keys stay in, so the server can name them by index
        function collectConfig() {
            const port = $('portInput').value.trim();
            return {
                models: modelRows().map((row) => normalizeRow(rowCells(row))),
                api_keys: keyInputs().map((input) => input.value.trim()),
                host: $('hostInput').value.trim() || DEFAULT_HOST,
                port: port === '' ? DEFAULT_PORT : Number(port)
            };
        }

        function rowState(key, savedKeys, runningKeys) {
            if (runningKeys.has(key)) {
                return 'live';
            }
            return savedKeys.has(key) ? 'saved' : 'unsaved';
        }

        function setState(element, state) {
            element.dataset.state = state;
            element.textContent = STATE_LABELS[state];
        }

        function isDirty() {
            const savedConfig = saved && saved.config;
            return !savedConfig || configKey(collectConfig()) !== configKey(savedConfig);
        }

        function renderStates() {
            const savedConfig = saved && saved.config;
            const runningConfig = status.running ? status.config : null;
            const rowKeys = (config) => new Set(config && Array.isArray(config.models) ? config.models.map(rowKey) : []);
            const apiKeys = (config) => new Set(config && Array.isArray(config.api_keys) ? config.api_keys.map((key) => (typeof key === 'string' ? key.trim() : '')) : []);
            const listenKeys = (config) => new Set(config ? [JSON.stringify([config.host, config.port])] : []);
            const savedRows = rowKeys(savedConfig);
            const runningRows = rowKeys(runningConfig);
            modelRows().forEach((row) => setState(row.querySelector('.state'), rowState(rowKey(rowCells(row)), savedRows, runningRows)));
            const savedKeys = apiKeys(savedConfig);
            const runningKeys = apiKeys(runningConfig);
            keyInputs().forEach((input) => setState(input.closest('.row').querySelector('.state'), rowState(input.value.trim(), savedKeys, runningKeys)));
            const current = collectConfig();
            setState($('listenState'), rowState(JSON.stringify([current.host, current.port]), listenKeys(savedConfig), listenKeys(runningConfig)));
            const byId = new Map(metrics && Array.isArray(metrics.models) ? metrics.models.map((entry) => [entry.id, entry]) : []);
            modelRows().forEach((row) => renderRow(row, byId));
            renderActions();
            renderChecklist();
            renderModelCards(series);
        }

        function upstreamText(cells) {
            return [cells.model_id, cells.client_type, cells.base_url && hostOf(cells.base_url)].filter((part) => part).join(' · ');
        }

        // the summary line of a row on Models: the served id, where it goes, its state, and its last error
        function renderRow(row, byId) {
            const cells = normalizeRow(rowCells(row));
            const served = row.querySelector('.served');
            served.textContent = cells.server_model_id || '–';
            served.dataset.empty = cells.server_model_id ? 'false' : 'true';
            served.title = cells.server_model_id;
            const upstream = row.querySelector('.upstream');
            upstream.textContent = upstreamText(cells);
            upstream.title = upstream.textContent;
            upstream.dataset.same = upstream.textContent === cells.model_id && cells.model_id === cells.server_model_id ? 'true' : 'false';
            row.querySelector('.summary').setAttribute('aria-label', cells.server_model_id ? 'Edit ' + cells.server_model_id : 'Edit');

            // a refusal shown under the row stays until the next action; otherwise the note is the last error
            const entry = metrics && cells.server_model_id ? byId.get(cells.server_model_id) : undefined;
            const note = row.querySelector('.row-note');
            if (!note.classList.contains('err')) {
                const message = entry && entry.last_error ? entry.last_error.message || '' : '';
                note.textContent = message;
                note.title = message;
                note.classList.toggle('hidden', !message);
            }
        }

        function isBlankRow(row) {
            const cells = normalizeRow(rowCells(row));
            return !cells.model_id && !cells.server_model_id && !cells.api_key;
        }

        // the steps done so far; Start is never done here, the card shows only while stopped
        function renderChecklist() {
            const complete = modelRows().some((row) => {
                const cells = normalizeRow(rowCells(row));
                return cells.model_id && cells.server_model_id && cells.api_key;
            });
            const steps = document.querySelectorAll('#checklist .step');
            [complete, !!(saved && saved.config) && !isDirty(), false].forEach((done, index) => {
                const mark = steps[index].querySelector('.step-mark');
                if (steps[index].dataset.done !== String(done) || !mark.firstChild) {
                    steps[index].dataset.done = done ? 'true' : 'false';
                    if (done) {
                        mark.innerHTML = CHECK_ICON;
                    } else {
                        mark.textContent = String(index + 1);
                    }
                }
            });
            $('checklistSave').disabled = !isDirty();
        }

        // one filled button at a time: Start while stopped, Apply while the saved table waits; Stop is a ring
        function renderActions() {
            const savable = !!(saved && saved.config);
            const pending = !!(status.running && savable && status.config && configKey(saved.config) !== configKey(status.config));
            const apply = $('applyButton');
            apply.classList.toggle('hidden', !(phase === 'applying' || (phase === 'running' && pending)));
            apply.disabled = phase === 'applying';
            $('applyLabel').textContent = phase === 'applying' ? 'Applying…' : 'Apply';
            $('saveButton').disabled = saving || phase === 'starting' || phase === 'applying' || !isDirty();
            const toggle = $('serverToggle');
            const live = phase === 'running' || phase === 'applying' || phase === 'stopping';
            toggle.classList.toggle('secondary', live);
            toggle.dataset.state = live ? 'running' : 'stopped';
            toggle.disabled = phase === 'starting' || phase === 'applying' || phase === 'stopping' || (phase === 'stopped' && !savable);
            $('serverToggleLabel').textContent = { stopped: 'Start', starting: 'Starting…', running: 'Stop', applying: 'Stop', stopping: 'Stopping…' }[phase];
            $('serverToggleStart').classList.toggle('hidden', live);
            $('serverToggleStop').classList.toggle('hidden', !live);
            if (phase === 'stopped' && !savable) {
                toggle.setAttribute('title', 'Save first');
            } else {
                toggle.removeAttribute('title');
            }
        }

        // the draft is kept only while it differs from the saved file, so a reload after Save reads the file
        function saveDraft() {
            if (restoring) {
                return;
            }
            const draft = {
                models: modelRows().map(rowCells),
                api_keys: keyInputs().map((input) => input.value),
                host: $('hostInput').value,
                port: $('portInput').value
            };
            try {
                if (isDirty()) {
                    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                } else {
                    localStorage.removeItem(DRAFT_KEY);
                }
            } catch (error) {
                // a browser that refuses storage keeps the table for this page only
            }
            renderStates();
        }

        function restoreTable() {
            let draft = null;
            try {
                draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
            } catch (error) {
                draft = null;
            }
            if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
                draft = null;
            }
            const source = draft || (saved && saved.config) || null;
            restoring = true;
            try {
                (source && Array.isArray(source.models) ? source.models : []).forEach((row) => addRow(row && typeof row === 'object' ? row : {}));
                (source && Array.isArray(source.api_keys) ? source.api_keys : []).forEach((key) => addKey(String(key)));
                if (source && typeof source.host === 'string') {
                    $('hostInput').value = source.host;
                }
                if (source && (typeof source.port === 'string' || typeof source.port === 'number')) {
                    $('portInput').value = String(source.port);
                }
                // an empty table opens its one empty row, so a first visit starts at the fields
                const rows = modelRows();
                if (!rows.length) {
                    toggleRow(addRow().dataset.rowId, true);
                } else if (rows.length === 1) {
                    const cells = normalizeRow(rowCells(rows[0]));
                    if (!cells.model_id && !cells.server_model_id && !cells.api_key) {
                        toggleRow(rows[0].dataset.rowId, true);
                    }
                }
            } finally {
                restoring = false;
            }
            renderStates();
        }

        async function sendJson(method, path, body) {
            const response = await fetch(API + path, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            let answer = {};
            try {
                answer = await response.json();
            } catch (error) {
                // a body that is not JSON leaves only the status to report
            }
            return { response, answer };
        }

        function postJson(path, body) {
            return sendJson('POST', path, body);
        }

        async function loadServerConfig() {
            try {
                const response = await fetch(API + '/config', { cache: 'no-store' });
                if (!response.ok) {
                    return;
                }
                const body = await response.json();
                saved = body;
                $('configPath').textContent = body.path || '';
                if (body.error) {
                    showError(body.error);
                }
            } catch (error) {
                // the playground is out of reach: the page compares against what it last read
            }
        }

        async function saveServerConfig() {
            if (saving) {
                return;
            }
            saving = true;
            hideError();
            try {
                const { response, answer } = await sendJson('PUT', '/config', collectConfig());
                if (response.ok) {
                    saved = answer;
                    $('configPath').textContent = answer.path || '';
                    if (answer.config) {
                        $('hostInput').value = answer.config.host;
                        $('portInput').value = String(answer.config.port);
                    }
                    saveDraft();
                    flashSaved();
                } else {
                    const message = answer.error || ('HTTP ' + response.status);
                    showError(message, markRow(message, 'page'));
                }
            } catch (error) {
                showError(error.message);
            } finally {
                saving = false;
                renderStates();
            }
        }

        function flashSaved() {
            const button = $('saveButton');
            button.dataset.flash = 'true';
            $('saveLabel').textContent = 'Saved';
            button.querySelector('.save-icon').classList.add('hidden');
            button.querySelector('.saved-icon').classList.remove('hidden');
            clearTimeout(flashTimer);
            flashTimer = setTimeout(() => {
                delete button.dataset.flash;
                $('saveLabel').textContent = 'Save';
                button.querySelector('.save-icon').classList.remove('hidden');
                button.querySelector('.saved-icon').classList.add('hidden');
            }, 1500);
        }

        async function refreshStatus() {
            try {
                const response = await fetch(API + '/status', { cache: 'no-store' });
                if (response.ok) {
                    renderStatus(await response.json());
                }
            } catch (error) {
                // the playground is out of reach: the view keeps what it last knew
            }
        }

        async function refreshAll() {
            await loadServerConfig();
            await refreshStatus();
        }

        function setLoading(word) {
            $('statusText').textContent = word;
            $('statusText').classList.add('loading');
        }

        function renderStatus(next) {
            status = next && typeof next === 'object' ? next : { running: false };
            const running = !!status.running;
            phase = running ? 'running' : 'stopped';
            $('statusDot').dataset.state = running ? 'running' : 'stopped';
            $('statusText').textContent = running ? 'Running' : 'Stopped';
            $('statusText').classList.remove('loading');
            $('statusUrl').textContent = running ? status.base_url : '';
            $('statusUrlWrap').classList.toggle('hidden', !running);
            $('statusMeta').classList.toggle('hidden', !running);
            $('statusOpen').classList.toggle('hidden', !(running && status.open));
            $('dashboard').classList.toggle('hidden', !running);
            $('checklist').classList.toggle('hidden', running);
            if (running) {
                requestAnimationFrame(paintRange);
                startPolling();
            } else {
                stopPolling();
                metrics = null;
                series = null;
                renderMetrics(null);
            }
            renderStates();
        }

        function startPolling() {
            if (pollTimer === null) {
                pollTimer = setInterval(() => {
                    if (!document.hidden) {
                        fetchMetrics();
                    }
                }, METRICS_MS);
            }
            fetchMetrics();
        }

        function stopPolling() {
            clearInterval(pollTimer);
            pollTimer = null;
            metricsSeq += 1;
        }

        async function fetchMetrics() {
            const seq = ++metricsSeq;
            let body = null;
            try {
                const response = await fetch(METRICS + '?window=' + range, { cache: 'no-store' });
                if (response.ok) {
                    body = await response.json();
                }
            } catch (error) {
                // out of reach for a moment: the last numbers stay
                body = null;
            }
            if (seq !== metricsSeq) {
                return;
            }
            $('dashboard').dataset.stale = 'false';
            if (!body || !status.running) {
                return;
            }
            // the server went away under the page (stopped from another tab): read the status again
            if (!body.running) {
                refreshStatus();
                return;
            }
            metrics = body;
            series = body.window || null;
            renderMetrics(metrics);
            renderStates();
        }

        // the header line (open, uptime, streaming), then the Overview
        function renderMetrics(m) {
            if (!m) {
                $('statusUptime').textContent = '';
                $('statusStreaming').classList.add('hidden');
                resetOverview();
                return;
            }
            $('statusOpen').classList.toggle('hidden', !status.open);
            $('statusUptime').textContent = 'up ' + formatUptime(m.uptime_s);
            $('statusStreaming').textContent = formatCount(m.in_flight) + ' streaming';
            $('statusStreaming').classList.toggle('hidden', !(m.in_flight > 0));
            renderOverview(series);
        }

        // a stopped server leaves no numbers behind for the next start to show first
        function resetOverview() {
            hideTip();
            document.querySelectorAll('#tiles .tile').forEach((tile) => {
                setTile(tile.id, '–', { text: '', good: null }, '', [], 'count');
            });
            $('requestsChart').replaceChildren();
            $('latencyChart').replaceChildren();
            $('errorList').replaceChildren();
        }

        function showTab(name, withRow) {
            tab = TABS.includes(name) ? name : 'overview';
            document.querySelectorAll('#tabs [role="tab"]').forEach((button) => {
                const selected = button.dataset.tab === tab;
                button.setAttribute('aria-selected', selected ? 'true' : 'false');
                button.tabIndex = selected ? 0 : -1;
            });
            TABS.forEach((item) => {
                $(PANELS[item]).hidden = item !== tab;
            });
            if (location.hash.slice(1) !== tab) {
                history.replaceState(null, '', '#' + tab);
            }
            closeComboboxes();
            hideTip();
            // the checklist's + Model: the blank row if there is one, else a new one, open and focused
            if (withRow) {
                const blank = modelRows().find(isBlankRow);
                if (blank) {
                    toggleRow(blank.dataset.rowId, true);
                    rowCell(blank, 'model_id').focus();
                } else {
                    addRow();
                }
            }
            // charts measure their width, so they draw once their tab is visible
            if (tab === 'overview') {
                paintRange();
                renderOverview(series);
            }
        }

        function handleTabKeydown(event) {
            const index = TABS.indexOf(tab);
            const next = {
                ArrowRight: TABS[(index + 1) % TABS.length],
                ArrowLeft: TABS[(index + TABS.length - 1) % TABS.length],
                Home: TABS[0],
                End: TABS[TABS.length - 1]
            }[event.key];
            if (!next) {
                return;
            }
            event.preventDefault();
            showTab(next);
            document.querySelector('#tabs [data-tab="' + next + '"]').focus();
        }

        // the range scopes every number on Overview; the last render waits at half strength for the answer
        function setRange(seconds) {
            if (!RANGES.includes(seconds)) {
                return;
            }
            range = seconds;
            try {
                localStorage.setItem(RANGE_KEY, String(seconds));
            } catch (error) {
                // the choice holds for this page only
            }
            paintRange();
            if (status.running) {
                $('dashboard').dataset.stale = 'true';
                fetchMetrics();
            }
        }

        function paintRange() {
            document.querySelectorAll('#rangeControl [data-range]').forEach((button) => {
                button.setAttribute('aria-checked', Number(button.dataset.range) === range ? 'true' : 'false');
            });
            updateSegmentThumb($('rangeControl'));
        }

        function renderOverview(w) {
            if (!w || tab !== 'overview' || !status.running) {
                return;
            }
            renderTiles(w);
            renderModelCards(w);
            renderRequestsChart(w);
            renderLatencyChart(w);
            renderErrors(w);
        }

        // a window's columns padded on the left to the whole range: a server younger than the range has no
        // buckets before its start, and those stay null so nothing is drawn there
        function windowColumns(w, source) {
            const n = Math.round(w.seconds / w.bucket_s);
            const columns = {};
            Object.keys(source || {}).forEach((key) => {
                const values = Array.isArray(source[key]) ? source[key].slice(-n) : [];
                columns[key] = Array(n - values.length).fill(null).concat(values);
            });
            if (!columns.requests) {
                columns.requests = Array(n).fill(null);
            }
            return columns;
        }

        // the smallest k dividing n with n / k at most maxBars
        function mergeFactor(n, maxBars) {
            for (let k = 1; k <= n; k += 1) {
                if (n % k === 0 && n / k <= maxBars) {
                    return k;
                }
            }
            return n;
        }

        // k buckets into one: counts add up, percentiles keep their peak, TPS comes from the merged sums
        function mergeBuckets(columns, k) {
            const merged = {};
            Object.keys(columns).forEach((key) => {
                const values = columns[key];
                const out = [];
                for (let i = 0; i < values.length; i += k) {
                    const part = values.slice(i, i + k).filter((value) => value != null);
                    if (!part.length) {
                        out.push(null);
                    } else if (SUMMED.includes(key)) {
                        out.push(part.reduce((sum, value) => sum + value, 0));
                    } else {
                        out.push(Math.max(...part));
                    }
                }
                merged[key] = out;
            });
            if (merged.tokens_out && merged.generation_ms) {
                merged.tps = merged.tokens_out.map((tokens, i) => (merged.generation_ms[i] ? Math.round((tokens * 10000) / merged.generation_ms[i]) / 10 : null));
            }
            return merged;
        }

        // the change against the previous window: an arrow and an amount, or nothing when there is no comparison
        function delta(kind, current, previous) {
            if (current == null || previous == null || current === previous || (kind === 'pct' && previous === 0)) {
                return { text: '', up: null };
            }
            const diff = current - previous;
            let amount;
            if (kind === 'pct') {
                const pct = Math.abs((diff / previous) * 100);
                amount = (pct < 10 ? pct.toFixed(1) : String(Math.round(pct))) + '%';
            } else if (kind === 'pt') {
                amount = Math.abs(diff * 100).toFixed(1) + ' pt';
            } else {
                amount = formatMs(Math.abs(diff));
            }
            if (/^0(\\.0)?( |%)/.test(amount)) {
                return { text: '', up: null };
            }
            return { text: (diff > 0 ? '↑ ' : '↓ ') + amount, up: diff > 0 };
        }

        function setTile(id, value, change, foot, values, mode, title) {
            const tile = $(id);
            const valueEl = tile.querySelector('.tile-value');
            valueEl.textContent = value;
            valueEl.dataset.empty = value === '–' ? 'true' : 'false';
            if (title) {
                valueEl.setAttribute('title', title);
            } else {
                valueEl.removeAttribute('title');
            }
            const deltaEl = tile.querySelector('.tile-delta');
            deltaEl.textContent = change.text;
            if (change.text && change.good !== null && change.good !== undefined) {
                deltaEl.dataset.good = change.good ? 'true' : 'false';
            } else {
                delete deltaEl.dataset.good;
            }
            if (change.text && change.title) {
                deltaEl.setAttribute('title', change.title);
            } else {
                deltaEl.removeAttribute('title');
            }
            const footEl = tile.querySelector('.tile-foot');
            footEl.textContent = foot;
            footEl.setAttribute('title', foot);
            sparkline(tile.querySelector('.spark'), values, { mode });
        }

        function renderTiles(w) {
            const t = w.total;
            const p = w.previous;
            const n = Math.round(w.seconds / w.bucket_s);
            const spark = mergeBuckets(windowColumns(w, t.series), mergeFactor(n, 60));
            const vs = 'vs previous ' + rangeLabel(w.seconds);
            // a delta is neutral for volumes, good or bad for rates and latencies
            const judged = (kind, current, previous, upIsGood) => {
                const d = delta(kind, current, previous);
                return { text: d.text, good: upIsGood === null || d.up === null ? null : d.up === upIsGood, title: vs };
            };
            const latency = t.latency_ms || { first_event: {}, total: {} };
            const before = p && p.latency_ms ? p.latency_ms.total : {};
            // the rate over the part of the range the server has lived
            const minutes = Math.max((w.end - w.start) / 60, 1 / 6);
            const rates = spark.successes.map((ok, i) => (ok == null || ok + spark.failures[i] === 0 ? null : ok / (ok + spark.failures[i])));
            setTile('tileRequests', formatCount(t.requests), judged('pct', t.requests, p && p.requests, null),
                (t.requests / minutes).toFixed(1) + '/min' + (t.refused > 0 ? ' · ' + formatCount(t.refused) + ' refused' : ''), spark.requests, 'count');
            setTile('tileSuccess', formatRate(t.success_rate), judged('pt', t.success_rate, p && p.success_rate, true),
                formatCount(t.successes) + ' ok · ' + formatCount(t.failures) + ' failed · ' + formatCount(t.disconnects) + ' dropped', rates, 'level');
            setTile('tileLatencyP50', formatMs(latency.total.p50), judged('ms', latency.total.p50, before.p50, false),
                'first event p50 ' + formatMs(latency.first_event.p50), spark.p50, 'level');
            setTile('tileLatencyP90', formatMs(latency.total.p90), judged('ms', latency.total.p90, before.p90, false),
                'first event p90 ' + formatMs(latency.first_event.p90), spark.p90, 'level');
            setTile('tileTokens', formatCompact(t.tokens_out), judged('pct', t.tokens_out, p && p.tokens_out, null),
                formatCompact(t.thoughts) + ' thinking · ' + formatCompact(t.response) + ' response', spark.tokens_out, 'count', formatCount(t.tokens_out));
            setTile('tileTps', formatTps(t.tps), judged('pct', t.tps, p && p.tps, true),
                formatUptime((t.generation_ms || 0) / 1000) + ' generating', spark.tps, 'level');
        }

        // a trend in the quiet colour with the latest value in the accent; gaps where a bucket has no value,
        // a lone value drawn as a point so a sparse trend still shows
        function sparkline(svg, values, options) {
            const width = svg.clientWidth || svg.getBoundingClientRect().width;
            const height = svg.clientHeight || 28;
            const list = Array.isArray(values) ? values : [];
            const present = list.filter((value) => value != null);
            if (!width || list.length < 2 || !present.length) {
                svg.replaceChildren();
                return;
            }
            const pad = 3;
            let low = options.mode === 'count' ? 0 : Math.min(...present);
            let high = Math.max(...present);
            if (high === low) {
                if (options.mode === 'count') {
                    high = low + 1;
                } else {
                    low -= 1;
                    high += 1;
                }
            }
            const x = (i) => (pad + (i / (list.length - 1)) * (width - 2 * pad)).toFixed(1);
            const y = (value) => (height - pad - ((value - low) / (high - low)) * (height - 2 * pad)).toFixed(1);
            let d = '';
            let points = '';
            let last = -1;
            list.forEach((value, i) => {
                if (value == null) {
                    return;
                }
                const alone = (i === 0 || list[i - 1] == null) && (i === list.length - 1 || list[i + 1] == null);
                if (alone) {
                    points += '<circle class="pt" cx="' + x(i) + '" cy="' + y(value) + '" r="1.5"></circle>';
                }
                d += (i > 0 && list[i - 1] != null ? 'L' : 'M') + x(i) + ' ' + y(value);
                last = i;
            });
            svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
            svg.innerHTML = '<path d="' + d + '"></path>' + points + '<circle class="end" cx="' + x(last) + '" cy="' + y(list[last]) + '" r="2.5"></circle>';
        }

        // one card per model row, in page order, updated in place so focus survives the 3 s poll
        function renderModelCards(w) {
            const grid = $('modelCards');
            const rows = modelRows().filter((row) => !isBlankRow(row));
            const wanted = new Set(rows.map((row) => row.dataset.rowId));
            Array.from(grid.children).forEach((card) => {
                if (!wanted.has(card.dataset.rowId)) {
                    card.remove();
                }
            });
            const entries = new Map(w && Array.isArray(w.models) ? w.models.map((entry) => [entry.id, entry]) : []);
            const since = new Map(metrics && Array.isArray(metrics.models) ? metrics.models.map((entry) => [entry.id, entry]) : []);
            rows.forEach((row, index) => {
                const card = grid.querySelector('[data-row-id="' + row.dataset.rowId + '"]') || buildModelCard(row.dataset.rowId);
                if (grid.children[index] !== card) {
                    grid.insertBefore(card, grid.children[index] || null);
                }
                fillModelCard(card, row, w, entries, since);
            });
        }

        function buildModelCard(rowId) {
            const card = document.createElement('div');
            card.className = 'card model-card';
            card.setAttribute('role', 'button');
            card.tabIndex = 0;
            card.dataset.rowId = rowId;
            card.onclick = () => openModel(rowId);
            card.onkeydown = (event) => handleCardKeydown(event, rowId);
            card.innerHTML = '<div class="model-head"><span class="served mono"></span><span class="state" data-state="unsaved">Unsaved</span></div>'
                + '<span class="upstream mono"></span>'
                + '<div class="model-stats">'
                + ['Requests', 'Success', 'Last', 'p50', 'p90', 'TPS'].map((label) => '<div class="stat"><b class="mono' + (label === 'Last' ? ' words' : '') + '">–</b><span>' + label + '</span></div>').join('')
                + '</div><svg class="spark" aria-hidden="true"></svg><p class="model-note mono hidden"></p><p class="model-hint hidden"></p>';
            return card;
        }

        function fillModelCard(card, row, w, entries, since) {
            const cells = normalizeRow(rowCells(row));
            const state = row.querySelector('.state').dataset.state;
            const name = cells.server_model_id || cells.model_id;
            card.dataset.state = state;
            card.setAttribute('aria-label', 'Open ' + (name || '–') + ' in Models');
            const served = card.querySelector('.served');
            served.textContent = cells.server_model_id || '–';
            served.title = cells.server_model_id;
            setState(card.querySelector('.state'), state);
            const upstream = card.querySelector('.upstream');
            upstream.textContent = upstreamText(cells);
            upstream.title = upstream.textContent;

            const live = state === 'live';
            const hint = card.querySelector('.model-hint');
            hint.textContent = state === 'saved' ? (status.running ? 'Apply to serve' : 'Start to serve') : 'Save first';
            hint.classList.toggle('hidden', live);
            card.querySelector('.model-stats').classList.toggle('hidden', !live);
            const spark = card.querySelector('.spark');
            spark.classList.toggle('hidden', !live);
            const note = card.querySelector('.model-note');
            if (!live) {
                note.classList.add('hidden');
                return;
            }
            const entry = entries.get(cells.server_model_id);
            const latest = since.get(cells.server_model_id);
            const now = metrics ? metrics.started_at + metrics.uptime_s : 0;
            const latency = entry && entry.latency_ms ? entry.latency_ms.total : {};
            const last = latest && latest.last_outcome && latest.last_request_at != null
                ? OUTCOME_WORDS[latest.last_outcome] + ' ' + formatAgo(Math.max(0, now - latest.last_request_at))
                : '–';
            const values = [
                entry ? formatCount(entry.requests) : '–',
                entry ? formatRate(entry.success_rate) : '–',
                last,
                formatMs(latency.p50),
                formatMs(latency.p90),
                entry ? formatTps(entry.tps) : '–'
            ];
            card.querySelectorAll('.model-stats b').forEach((b, i) => {
                b.textContent = values[i];
                b.dataset.empty = values[i] === '–' ? 'true' : 'false';
                b.title = values[i];
            });
            if (entry && entry.series && w) {
                const n = Math.round(w.seconds / w.bucket_s);
                sparkline(spark, mergeBuckets(windowColumns(w, { requests: entry.series.requests }), mergeFactor(n, 30)).requests, { mode: 'count' });
            } else {
                spark.replaceChildren();
            }
            const message = latest && latest.last_error ? latest.last_error.message || '' : '';
            note.textContent = message;
            note.title = message;
            note.classList.toggle('hidden', !message);
        }

        function openModel(rowId) {
            showTab('models');
            toggleRow(rowId, true);
            const row = document.querySelector('#modelRows [data-row-id="' + rowId + '"]');
            if (row) {
                row.scrollIntoView({ block: 'nearest' });
                row.querySelector('.summary').focus({ preventScroll: true });
            }
        }

        function handleCardKeydown(event, rowId) {
            if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
                event.preventDefault();
                openModel(rowId);
            }
        }

        // the drawing area of a chart container: its box minus padding, the plot inside the gutters
        function chartGeometry(container, columns) {
            const style = getComputedStyle(container);
            const width = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            const height = container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
            const plotW = width - CHART.left - CHART.right;
            const plotH = height - CHART.top - CHART.bottom;
            return { width, height, plotW, plotH, base: CHART.top + plotH, slot: plotW / Math.max(columns, 1), left: CHART.left, top: CHART.top };
        }

        // 1, 2, 2.5, 5 or 10 times a power of ten, the first at least v (2.5 only from 25 up, so ticks stay whole)
        function niceMax(v) {
            if (!(v > 0)) {
                return 1;
            }
            const scale = Math.pow(10, Math.floor(Math.log10(v)));
            for (const step of [1, 2, 2.5, 5, 10]) {
                if (step === 2.5 && step * scale < 10) {
                    continue;
                }
                if (step * scale >= v) {
                    return step * scale;
                }
            }
            return 10 * scale;
        }

        // round local minutes: the first step giving at most six labels that do not crowd the axis
        function timeTicks(from, to, plotW) {
            const limit = Math.max(2, Math.min(6, Math.floor(plotW / 64)));
            const offset = -new Date(from * 1000).getTimezoneOffset() * 60;
            for (const step of [60, 120, 300, 600, 900, 1800, 3600]) {
                const ticks = [];
                for (let t = Math.ceil((from + offset) / step) * step - offset; t <= to; t += step) {
                    ticks.push(t);
                }
                if (ticks.length <= limit) {
                    return ticks;
                }
            }
            return [];
        }

        // the frame every chart shares: three hairlines (0, half, top), their labels, the time labels
        function chartFrame(g, max, label, from, seconds, whole) {
            const levels = [0, max / 2, max].filter((v) => !whole || Number.isInteger(v));
            let grid = '';
            let axis = '';
            levels.forEach((v) => {
                const y = (g.base - (v / max) * g.plotH).toFixed(1);
                grid += '<line x1="' + g.left + '" x2="' + (g.left + g.plotW).toFixed(1) + '" y1="' + y + '" y2="' + y + '"></line>';
                axis += '<text x="' + (g.left - 8) + '" y="' + y + '" dy="0.35em" text-anchor="end">' + label(v) + '</text>';
            });
            timeTicks(from, from + seconds, g.plotW).forEach((t) => {
                const x = g.left + ((t - from) / seconds) * g.plotW;
                if (x - 18 < 0 || x + 18 > g.width) {
                    return;
                }
                axis += '<text x="' + x.toFixed(1) + '" y="' + (g.base + 15) + '" text-anchor="middle">' + formatTick(t) + '</text>';
            });
            return '<g class="grid">' + grid + '</g><g class="axis">' + axis + '</g>';
        }

        // a column segment; the top one of a stack gets a rounded end, 4px, less on a narrow column so it stays a column
        function segment(cls, x, y, width, height, rounded) {
            const r = rounded ? Math.min(4, width / 3, height) : 0;
            const f = (v) => v.toFixed(1);
            if (!r) {
                return '<rect class="bar ' + cls + '" x="' + f(x) + '" y="' + f(y) + '" width="' + f(width) + '" height="' + f(height) + '"></rect>';
            }
            return '<path class="bar ' + cls + '" d="M' + f(x) + ' ' + f(y + height) + 'V' + f(y + r) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(x + r) + ' ' + f(y)
                + 'H' + f(x + width - r) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(x + width) + ' ' + f(y + r) + 'V' + f(y + height) + 'Z"></path>';
        }

        function hits(g, columns) {
            return columns.map((column, i) => (column.absent ? '' : '<rect class="hit" x="' + (g.left + i * g.slot).toFixed(1) + '" y="' + g.top + '" width="' + g.slot.toFixed(1) + '" height="' + g.plotH.toFixed(1) + '"></rect>')).join('');
        }

        // a new drawing in place of the old; a keyboard user's focus stays on the chart
        function paintChart(container, html) {
            const focused = container.contains(document.activeElement);
            container._swapping = true;
            container.innerHTML = html;
            if (focused) {
                container.querySelector('svg').focus({ preventScroll: true });
            }
            container._swapping = false;
        }

        // the chart as a table for a screen reader; a table ignores a 1px height, so a clipped box holds it
        function tableTwin(caption, heads, rows) {
            return '<div class="sr-only"><table><caption>' + caption + '</caption><thead><tr>' + heads.map((head) => '<th>' + head + '</th>').join('') + '</tr></thead><tbody>'
                + rows.map((cells) => '<tr>' + cells.map((cell) => '<td>' + cell + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
        }

        // outcomes over time: ok, failed and dropped stacked from the baseline, columns merged to fit the width
        function renderRequestsChart(w) {
            const container = $('requestsChart');
            const n = Math.round(w.seconds / w.bucket_s);
            const probe = chartGeometry(container, n);
            if (!(probe.plotW > 0)) {
                return;
            }
            const k = mergeFactor(n, Math.min(60, Math.max(30, Math.floor(probe.plotW / CHART.minSlot))));
            const t = w.total.series || {};
            const merged = mergeBuckets(windowColumns(w, { requests: t.requests, successes: t.successes, failures: t.failures, disconnects: t.disconnects }), k);
            const span = k * w.bucket_s;
            const from = w.end - w.seconds;
            const columns = merged.requests.map((requests, i) => ({
                start: from + i * span,
                end: from + (i + 1) * span,
                absent: requests == null,
                requests: requests || 0,
                successes: merged.successes[i] || 0,
                failures: merged.failures[i] || 0,
                disconnects: merged.disconnects[i] || 0
            }));
            const g = chartGeometry(container, columns.length);
            const max = niceMax(Math.max(0, ...columns.map((c) => c.successes + c.failures + c.disconnects)));
            const barW = Math.min(CHART.maxBar, g.slot - CHART.gap);
            let marks = '';
            columns.forEach((c, i) => {
                const parts = [['ok', c.successes], ['fail', c.failures], ['drop', c.disconnects]].filter((part) => part[1] > 0);
                const x = g.left + i * g.slot + (g.slot - barW) / 2;
                let cursor = g.base;
                parts.forEach(([cls, value], j) => {
                    const gap = j > 0 ? CHART.gap : 0;
                    // a single request stays visible however tall the scale
                    const height = Math.max((value / max) * g.plotH, 2 + gap);
                    marks += segment(cls, x, cursor - height, barW, height - gap, j === parts.length - 1);
                    cursor -= height;
                });
            });
            const total = w.total;
            const label = 'Requests per ' + formatSpan(span) + ' over the last ' + rangeLabel(w.seconds) + ': ' + total.requests + ' requests, '
                + total.successes + ' ok, ' + total.failures + ' failed, ' + total.disconnects + ' dropped';
            paintChart(container, '<svg role="img" tabindex="0" aria-label="' + label + '" viewBox="0 0 ' + g.width + ' ' + g.height + '">'
                + chartFrame(g, max, formatCompact, from, w.seconds, true) + marks + '<g>' + hits(g, columns) + '</g></svg>'
                + tableTwin('Requests', ['Time', 'ok', 'failed', 'dropped', 'streaming'], columns.filter((c) => !c.absent).map((c) => [formatClock(c.start), c.successes, c.failures, c.disconnects, streamingOf(c)])));
            attachTooltip(container, columns, formatRequestsTip, g);
        }

        function streamingOf(c) {
            return Math.max(0, c.requests - c.successes - c.failures - c.disconnects);
        }

        // p90, the headline, in the accent over p50 in the muted ink; one point per bucket, a gap where none
        function renderLatencyChart(w) {
            const container = $('latencyChart');
            const n = Math.round(w.seconds / w.bucket_s);
            const g = chartGeometry(container, n);
            if (!(g.plotW > 0)) {
                return;
            }
            const t = windowColumns(w, w.total.series || {});
            const from = w.end - w.seconds;
            const columns = t.requests.map((requests, i) => ({
                start: from + i * w.bucket_s,
                end: from + (i + 1) * w.bucket_s,
                absent: requests == null,
                p50: t.p50 ? t.p50[i] : null,
                p90: t.p90 ? t.p90[i] : null,
                successes: t.successes ? t.successes[i] || 0 : 0
            }));
            const peak = Math.max(0, ...columns.map((c) => c.p90 || 0), ...columns.map((c) => c.p50 || 0));
            const max = peak ? niceMax(peak) : 1000;
            const line = (key) => {
                let d = '';
                let dots = '';
                columns.forEach((c, i) => {
                    if (c[key] == null) {
                        return;
                    }
                    const x = (g.left + (i + 0.5) * g.slot).toFixed(1);
                    const y = (g.base - (c[key] / max) * g.plotH).toFixed(1);
                    const joined = i > 0 && columns[i - 1][key] != null;
                    if (!joined && (i === columns.length - 1 || columns[i + 1][key] == null)) {
                        dots += '<circle class="dot ' + key + '" cx="' + x + '" cy="' + y + '" r="3"></circle>';
                    }
                    d += (joined ? 'L' : 'M') + x + ' ' + y;
                });
                return (d ? '<path class="line ' + key + '" d="' + d + '"></path>' : '') + dots;
            };
            const summary = w.total.latency_ms ? w.total.latency_ms.total : {};
            const label = 'Latency over the last ' + rangeLabel(w.seconds) + ': p50 ' + formatMs(summary.p50) + ', p90 ' + formatMs(summary.p90);
            paintChart(container, '<svg role="img" tabindex="0" aria-label="' + label + '" viewBox="0 0 ' + g.width + ' ' + g.height + '">'
                + chartFrame(g, max, formatAxisMs, from, w.seconds, false) + line('p50') + line('p90') + '<g>' + hits(g, columns) + '</g></svg>'
                + tableTwin('Latency', ['Time', 'p50', 'p90', 'ok'], columns.filter((c) => !c.absent).map((c) => [formatClock(c.start), formatMs(c.p50), formatMs(c.p90), c.successes])));
            attachTooltip(container, columns, formatLatencyTip, g);
        }

        // the chart's columns for its tooltip; the listeners are wired once per container and read them
        function attachTooltip(container, columns, format, g) {
            container._chart = { columns, format, g };
            if (!container._wired) {
                container._wired = true;
                container.addEventListener('pointermove', (event) => {
                    const chart = container._chart;
                    const svg = container.querySelector('svg');
                    if (!chart || !svg) {
                        return;
                    }
                    const x = event.clientX - svg.getBoundingClientRect().left;
                    const index = Math.floor((x - chart.g.left) / chart.g.slot);
                    if (x < chart.g.left || index < 0 || index >= chart.columns.length || chart.columns[index].absent) {
                        hideTip();
                        return;
                    }
                    showTip(container, index, event.clientX, event.clientY);
                });
                container.addEventListener('pointerleave', hideTip);
                container.addEventListener('focusin', () => {
                    if (!container._swapping) {
                        showTip(container, lastPresent(container._chart));
                    }
                });
                container.addEventListener('focusout', () => {
                    if (!container._swapping) {
                        hideTip();
                    }
                });
                container.addEventListener('keydown', (event) => {
                    const chart = container._chart;
                    if (!chart) {
                        return;
                    }
                    const current = tip && tip.chart === container.id ? tip.index : chart.columns.length;
                    let index = null;
                    if (event.key === 'ArrowLeft') {
                        index = stepPresent(chart, current, -1);
                    } else if (event.key === 'ArrowRight') {
                        index = stepPresent(chart, current, 1);
                    } else if (event.key === 'Home') {
                        index = stepPresent(chart, -1, 1);
                    } else if (event.key === 'End') {
                        index = lastPresent(chart, 1);
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        hideTip();
                        return;
                    }
                    if (index !== null) {
                        event.preventDefault();
                        showTip(container, index);
                    }
                });
            }
            // a tooltip open on this chart follows the new numbers in place
            if (tip && tip.chart === container.id) {
                showTip(container, Math.min(tip.index, columns.length - 1), tip.x, tip.y);
            }
        }

        function lastPresent(chart) {
            return stepPresent(chart, chart.columns.length, -1);
        }

        function stepPresent(chart, from, direction) {
            for (let i = from + direction; i >= 0 && i < chart.columns.length; i += direction) {
                if (!chart.columns[i].absent) {
                    return i;
                }
            }
            return from >= 0 && from < chart.columns.length ? from : null;
        }

        // the crosshair at the column, the readout beside the pointer (or above the column from the keyboard)
        function showTip(container, index, clientX, clientY) {
            const chart = container._chart;
            const svg = container.querySelector('svg');
            if (!chart || !svg || index === null || index < 0 || !chart.columns[index] || chart.columns[index].absent) {
                hideTip();
                return;
            }
            const g = chart.g;
            const x = g.left + (index + 0.5) * g.slot;
            let cross = svg.querySelector('.cross');
            if (!cross) {
                cross = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                cross.setAttribute('class', 'cross');
                svg.insertBefore(cross, svg.lastChild);
            }
            cross.setAttribute('x1', x.toFixed(1));
            cross.setAttribute('x2', x.toFixed(1));
            cross.setAttribute('y1', g.top);
            cross.setAttribute('y2', g.base.toFixed(1));

            const readout = chart.format(chart.columns[index]);
            const el = $('chartTip');
            const when = document.createElement('div');
            when.className = 'when';
            when.textContent = readout.when;
            const rows = readout.rows.map(([value, label, key]) => {
                const row = document.createElement('div');
                row.className = 'r';
                const mark = document.createElement('i');
                mark.className = key;
                const b = document.createElement('b');
                b.textContent = value;
                const span = document.createElement('span');
                span.textContent = label;
                row.append(mark, b, span);
                return row;
            });
            el.replaceChildren(when, ...rows);
            el.classList.remove('hidden');
            const box = svg.getBoundingClientRect();
            const atX = clientX === undefined ? box.left + x : clientX;
            const atY = clientY === undefined ? box.top + g.top + 24 : clientY;
            tip = { chart: container.id, index, x: clientX, y: clientY };
            const width = el.offsetWidth;
            const height = el.offsetHeight;
            let left = atX + 12;
            if (left + width > window.innerWidth - 8) {
                left = Math.max(8, atX - 12 - width);
            }
            const top = Math.min(Math.max(8, atY - height / 2), window.innerHeight - height - 8);
            el.style.left = left + 'px';
            el.style.top = top + 'px';
        }

        // a scroll moves a keyboard tooltip with its chart; a pointer's goes, the pointer is elsewhere now
        function handleScroll() {
            if (tip && tip.x === undefined) {
                showTip($(tip.chart), tip.index);
            } else if (tip) {
                hideTip();
            }
        }

        function hideTip() {
            tip = null;
            const el = $('chartTip');
            if (el) {
                el.classList.add('hidden');
            }
            document.querySelectorAll('.chart .cross').forEach((cross) => cross.remove());
        }

        function formatRequestsTip(c) {
            const rows = [[formatCount(c.successes), 'ok', 'ok'], [formatCount(c.failures), 'failed', 'fail'], [formatCount(c.disconnects), 'dropped', 'drop']];
            if (streamingOf(c) > 0) {
                rows.push([formatCount(streamingOf(c)), 'streaming', '']);
            }
            return { when: formatClock(c.start) + '–' + formatClock(c.end), rows };
        }

        function formatLatencyTip(c) {
            return { when: formatClock(c.start) + '–' + formatClock(c.end), rows: [[formatMs(c.p90), 'p90', 'p90'], [formatMs(c.p50), 'p50', 'p50'], [formatCount(c.successes), 'ok', '']] };
        }

        // the range's failures, newest first, from the latest twenty the server keeps
        function renderErrors(w) {
            const list = $('errorList');
            const errors = (metrics && Array.isArray(metrics.errors) ? metrics.errors : []).filter((error) => error.at >= w.start);
            if (!errors.length) {
                const none = document.createElement('li');
                none.className = 'none';
                none.textContent = 'None in the last ' + rangeLabel(w.seconds);
                list.replaceChildren(none);
                return;
            }
            list.replaceChildren(...errors.map((error) => {
                const item = document.createElement('li');
                const time = document.createElement('span');
                time.className = 'mono time';
                time.textContent = formatClock(error.at);
                const model = document.createElement('span');
                model.className = 'mono model';
                model.textContent = error.model || '';
                model.title = error.model || '';
                const message = document.createElement('span');
                message.className = 'message';
                message.textContent = error.message || '–';
                message.title = error.message || '';
                item.append(time, model, message);
                return item;
            }));
        }

        function handleResize() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                paintRange();
                renderOverview(series);
                renderModelCards(series);
            }, 150);
        }

        function toggleServer() {
            return status.running ? stopServer() : startServer();
        }

        // Start and Apply run the saved file, so the body is empty and unsaved edits stay unsaved
        async function startServer() {
            hideError();
            phase = 'starting';
            renderActions();
            setLoading('Starting…');
            try {
                const { response, answer } = await postJson('/start', {});
                if (response.ok) {
                    renderStatus(answer);
                } else {
                    const message = answer.error || ('HTTP ' + response.status);
                    showError(message, markRow(message, 'saved'));
                    // started from another tab: the button becomes Stop
                    if (response.status === 409) {
                        refreshAll();
                    }
                }
            } catch (error) {
                showError(error.message);
            } finally {
                if (phase === 'starting') {
                    renderStatus(status);
                }
            }
        }

        // a refused table leaves the old server running; a failed bind leaves none, so the status is read again
        async function restartServer() {
            hideError();
            phase = 'applying';
            renderActions();
            setLoading('Applying…');
            try {
                const { response, answer } = await postJson('/restart', {});
                if (response.ok) {
                    renderStatus(answer);
                } else {
                    const message = answer.error || ('HTTP ' + response.status);
                    showError(message, markRow(message, 'saved'));
                    await refreshStatus();
                }
            } catch (error) {
                showError(error.message);
            } finally {
                if (phase === 'applying') {
                    renderStatus(status);
                }
            }
        }

        async function stopServer() {
            hideError();
            phase = 'stopping';
            renderActions();
            setLoading('Stopping…');
            try {
                const { response, answer } = await postJson('/stop', {});
                if (response.ok) {
                    renderStatus({ running: false });
                } else {
                    showError(answer.error || ('HTTP ' + response.status));
                }
            } catch (error) {
                showError(error.message);
            } finally {
                if (phase === 'stopping') {
                    renderStatus(status);
                }
            }
        }

        function hideError() {
            const error = $('serverError');
            error.textContent = '';
            error.classList.add('hidden');
            document.querySelectorAll('.invalid').forEach((item) => item.classList.remove('invalid'));
            document.querySelectorAll('.row-note.err').forEach((note) => {
                note.classList.remove('err');
                note.textContent = '';
                note.classList.add('hidden');
            });
            renderStates();
        }

        // a refusal that names a model row is shown under that row, on Models; anything else under the header
        function showError(message, target) {
            if (target && target.dataset && target.dataset.rowId) {
                showTab('models');
                const note = target.querySelector('.row-note');
                note.textContent = message;
                note.removeAttribute('title');
                note.classList.add('err');
                note.classList.remove('hidden');
                target.scrollIntoView({ block: 'nearest' });
                return;
            }
            const error = $('serverError');
            error.textContent = message;
            error.classList.remove('hidden');
        }

        function clearRing(row) {
            row.classList.remove('invalid');
            row.querySelectorAll('.invalid').forEach((item) => item.classList.remove('invalid'));
        }

        // the server names a row by its index, and mostly the cell too: that cell is ringed and its editor opened,
        // on the tab that holds it. A save names the index of the page's table; a start or apply the index of the
        // saved file, which the page finds again by content, as the table may have changed since. Returns the row
        // or key it found.
        function markRow(message, source) {
            const config = source === 'saved' && saved && saved.config ? saved.config : null;
            const key = /^api_keys\\[(\\d+)\\]/.exec(message);
            if (key) {
                const index = Number(key[1]);
                let input = null;
                if (source === 'saved') {
                    const wanted = config && Array.isArray(config.api_keys) ? config.api_keys[index] : undefined;
                    input = typeof wanted === 'string' ? keyInputs().find((item) => item.value.trim() === wanted.trim()) : null;
                } else {
                    input = keyInputs()[index] || null;
                }
                if (input) {
                    showTab('settings');
                    input.classList.add('invalid');
                }
                return input;
            }
            const model = /^models\\[(\\d+)\\](?:(?:: |\\.)(model_id|base_url|api_key|server_model_id|client_type)\\b)?/.exec(message);
            if (!model) {
                return null;
            }
            const index = Number(model[1]);
            let row = null;
            if (source === 'saved') {
                const wanted = config && Array.isArray(config.models) ? config.models[index] : undefined;
                row = wanted && typeof wanted === 'object' ? modelRows().find((item) => rowKey(rowCells(item)) === rowKey(wanted)) || null : null;
            } else {
                row = modelRows()[index] || null;
            }
            if (!row) {
                return null;
            }
            // the client's own refusal of a type names no cell, but it can only mean that one
            const column = model[2] || (/Unknown client type/.test(message) ? 'client_type' : null);
            if (column) {
                showTab('models');
                const cell = column === 'client_type' ? row.querySelector('[data-combobox-button]') : rowCell(row, column);
                cell.classList.add('invalid');
                toggleRow(row.dataset.rowId, true);
            }
            return row;
        }

        // Ctrl/Cmd+S saves from anywhere, inputs included; Escape closes the editor the focus is in
        function handleShortcut(event) {
            const key = (event.key || '').toLowerCase();
            if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key === 's') {
                event.preventDefault();
                if (phase !== 'starting' && phase !== 'applying') {
                    saveServerConfig();
                }
                return;
            }
            if (key === 'escape' && !event.defaultPrevented) {
                const active = document.activeElement;
                const editor = active && active.closest ? active.closest('.editor') : null;
                if (editor) {
                    const row = editor.closest('.row');
                    toggleRow(row.dataset.rowId, false);
                    row.querySelector('.summary').focus();
                }
            }
        }

        function shortcutLabel() {
            return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘S' : 'Ctrl+S';
        }

        async function copyBaseUrl() {
            const button = $('copyUrlButton');
            try {
                await navigator.clipboard.writeText(status.base_url || '');
            } catch (error) {
                // no clipboard (an insecure origin, a refused permission): the URL stays selectable
                return;
            }
            button.setAttribute('title', 'Copied');
            button.querySelector('.copy-icon').classList.add('hidden');
            button.querySelector('.copied-icon').classList.remove('hidden');
            clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
                button.setAttribute('title', 'Copy');
                button.querySelector('.copy-icon').classList.remove('hidden');
                button.querySelector('.copied-icon').classList.add('hidden');
            }, 1500);
        }

        function hostOf(url) {
            try {
                return new URL(url).host;
            } catch (error) {
                return url;
            }
        }

        function formatMs(ms) {
            if (ms == null) {
                return '–';
            }
            return ms < 1000 ? ms + ' ms' : (ms / 1000).toFixed(1) + ' s';
        }

        function formatRate(rate) {
            return rate == null ? '–' : (rate * 100).toFixed(1) + '%';
        }

        function formatCount(n) {
            return n == null ? '–' : n.toLocaleString('en-US');
        }

        function formatAgo(seconds) {
            if (seconds == null) {
                return '–';
            }
            if (seconds < 60) {
                return Math.floor(seconds) + ' s ago';
            }
            if (seconds < 3600) {
                return Math.floor(seconds / 60) + ' min ago';
            }
            if (seconds < 86400) {
                return Math.floor(seconds / 3600) + ' h ago';
            }
            return Math.floor(seconds / 86400) + ' d ago';
        }

        function formatUptime(seconds) {
            const s = Math.max(0, Math.floor(seconds));
            if (s < 60) {
                return s + ' s';
            }
            if (s < 3600) {
                return Math.floor(s / 60) + ' min';
            }
            if (s < 86400) {
                return Math.floor(s / 3600) + ' h ' + Math.floor((s % 3600) / 60) + ' min';
            }
            return Math.floor(s / 86400) + ' d ' + Math.floor((s % 86400) / 3600) + ' h';
        }

        function formatTps(v) {
            return v == null ? '–' : v.toFixed(1);
        }

        function formatCompact(n) {
            if (n == null) {
                return '–';
            }
            if (n < 10000) {
                return formatCount(n);
            }
            return n < 1e6 ? (n / 1e3).toFixed(1) + 'K' : (n / 1e6).toFixed(2) + 'M';
        }

        // an axis label in milliseconds: 500 ms, 1 s, 1.5 s
        function formatAxisMs(ms) {
            return ms < 1000 ? ms + ' ms' : Number((ms / 1000).toFixed(1)) + ' s';
        }

        function pad2(n) {
            return String(n).padStart(2, '0');
        }

        function formatClock(unix) {
            const d = new Date(unix * 1000);
            return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
        }

        function formatTick(unix) {
            const d = new Date(unix * 1000);
            return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
        }

        function formatSpan(seconds) {
            return seconds < 60 ? seconds + ' s' : seconds / 60 + ' min';
        }

        function rangeLabel(seconds) {
            return seconds >= 3600 ? seconds / 3600 + ' h' : seconds / 60 + ' min';
        }

        try {
            const stored = Number(localStorage.getItem(RANGE_KEY));
            if (RANGES.includes(stored)) {
                range = stored;
            }
        } catch (error) {
            // the default range it is
        }
        (async () => {
            await loadServerConfig();
            restoreTable();
            await refreshStatus();
        })();
        showTab(TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview');
        updateThemeToggle();
        $('saveKey').textContent = shortcutLabel();
        $('saveButton').setAttribute('title', shortcutLabel());
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeToggle);
        document.fonts.ready.then(() => {
            updateThemeToggle();
            paintRange();
        });
        document.addEventListener('keydown', handleShortcut);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                refreshAll();
            }
        });
        window.addEventListener('resize', handleResize);
        window.addEventListener('hashchange', () => {
            const next = location.hash.slice(1);
            if (TABS.includes(next) && next !== tab) {
                showTab(next);
            }
        });
        document.addEventListener('scroll', handleScroll, true);
    </script>
</body>
</html>
`;
// -- SERVER_TEMPLATE end --
