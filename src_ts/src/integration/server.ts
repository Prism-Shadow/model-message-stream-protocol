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
 * `POST /v1/stream` streams one stateless response of the model its body names, routed as
 * AutoLLMClient routes it (CLIENT_TYPE, else the model id's family) with the vendor keys of the
 * server's environment. `GET /v1/models` lists the models it can route. The protocol is
 * described in `wire`.
 */

import { timingSafeEqual } from "crypto";
import express, { Express, NextFunction, Request, Response } from "express";
import { AutoLLMClient } from "../autoClient";
import { UniConfig, UniMessage } from "../types";
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  KEEPALIVE_SECONDS,
  MODELS_PATH,
  STREAM_PATH,
  decodeWire,
  encodeWire,
  toWireError,
} from "../wire";

// The vendor key each official client reads, and an id of its family to construct it with.
const OFFICIAL_KEYS: Record<string, [string, string]> = {
  "openai-official": ["OPENAI_API_KEY", "gpt-"],
  "anthropic-official": ["ANTHROPIC_API_KEY", "claude-"],
  "gemini-official": ["GEMINI_API_KEY", "gemini-"],
  "zai-official": ["ZAI_API_KEY", "glm-"],
  "moonshot-official": ["MOONSHOT_API_KEY", "kimi-"],
  "deepseek-official": ["DEEPSEEK_API_KEY", "deepseek-"],
  "minimax-official": ["MINIMAX_API_KEY", "minimax-"],
};

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
 * Create the Express application of the MMSP server.
 *
 * @param options - `apiKey`, the key every `/v1/` request must carry as a bearer token; without
 *   it, MMSP_SERVER_API_KEY, and without that the server is open
 * @returns Express application instance
 */
export function createServerApp(options: { apiKey?: string } = {}): Express {
  if ((process.env.CLIENT_TYPE || "").trim().toLowerCase() === "mmsp") {
    throw new Error(
      "CLIENT_TYPE=mmsp would route the MMSP server to an MMSP server; unset it or name another client type.",
    );
  }
  const apiKey = options.apiKey || process.env.MMSP_SERVER_API_KEY;

  const app = express();
  // the key is checked before the body is read, so a request without it is refused unparsed
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!apiKey || !req.path.startsWith("/v1/")) {
      return next();
    }
    const given = Buffer.from(req.get("Authorization") ?? "");
    const expected = Buffer.from(`Bearer ${apiKey}`);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
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

    let client: AutoLLMClient;
    try {
      client = new AutoLLMClient({ model });
    } catch (error) {
      // an unknown family or client type, or a vendor key missing from the environment
      return invalid(
        error instanceof Error
          ? error.message || error.constructor.name
          : String(error),
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
      for await (const event of client.streamingResponse({
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

  app.get(MODELS_PATH, async (_req: Request, res: Response) => {
    try {
      const models: string[] = [];
      if (process.env.CLIENT_TYPE) {
        // a named client lists everything its endpoint serves
        models.push(...(await new AutoLLMClient({ model: "" }).listModels()));
      } else {
        // a client deduced from a family keeps the ids that route back to it
        for (const [keyEnv, family] of Object.values(OFFICIAL_KEYS)) {
          if (process.env[keyEnv]) {
            models.push(
              ...(await new AutoLLMClient({ model: family }).listModels()),
            );
          }
        }
      }
      res.json({ models });
    } catch (error) {
      // one vendor failing fails the listing: a misconfigured key is the operator's to see
      res.status(502).json({ error: toWireError(error) });
    }
  });

  return app;
}

/**
 * Start the MMSP server.
 *
 * @param host - Host address to bind to
 * @param port - Port number to listen on
 * @param apiKey - The key every request must carry; without it, MMSP_SERVER_API_KEY
 */
export function startServer(
  host: string = DEFAULT_HOST,
  port: number = DEFAULT_PORT,
  apiKey?: string,
): void {
  const app = createServerApp({ apiKey });
  app.listen(port, host, () => {
    console.log(`Starting MMSP server at http://${host}:${port}`);
  });
}

if (require.main === module) {
  // npm run server -- --host 0.0.0.0 --port 25752 --api-key KEY
  const flags: Record<string, string> = {};
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 2) {
    flags[args[index]] = args[index + 1];
  }
  const unknown = Object.keys(flags).filter(
    (flag) => !["--host", "--port", "--api-key"].includes(flag),
  );
  if (unknown.length > 0) {
    console.error(
      `Unknown option ${unknown[0]}. Options: --host HOST, --port PORT, --api-key KEY.`,
    );
    process.exit(2);
  }
  startServer(
    flags["--host"],
    flags["--port"] ? Number(flags["--port"]) : undefined,
    flags["--api-key"],
  );
}
