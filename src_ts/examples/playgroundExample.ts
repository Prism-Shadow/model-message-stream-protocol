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
 * Example demonstrating the MMSP Playground.
 *
 * This example shows how to start the playground server for interactive
 * chat with LLMs. The playground supports:
 * - Config editing (model, API key, base URL)
 * - Streaming chat responses
 * - Message cards with token usage and finish reasons
 * - Integrated tracer at /tracer
 */

import { startPlaygroundServer } from "../src/integration/playground";

console.log("=".repeat(60));
console.log("MMSP LLM Playground");
console.log("=".repeat(60));
console.log("\nStarting web server...");
console.log("\nOpen http://127.0.0.1:25751 in your browser to start chatting!");
console.log("Open http://127.0.0.1:25751/tracer/ to browse traces.");
console.log("Press Ctrl+C to stop the server.\n");

startPlaygroundServer("127.0.0.1", 25751);
