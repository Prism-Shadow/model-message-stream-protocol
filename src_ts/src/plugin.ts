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
 * Plugins: what one endpoint, or one vendor's models, need of a client beyond the protocol it
 * speaks.
 *
 * A compatible client speaks its protocol in its transforms as its reference client does; a field
 * an endpoint names otherwise, a shape it streams otherwise or a count it reports wrong lives in a
 * plugin of the client's `plugins/` folder instead, enabled where it matches (MMSP-RFC-0009 §9).
 */

import type { UniConfig, UniEvent } from "./types";

/**
 * The handling one endpoint, or one vendor's models, need of a client.
 *
 * A subclass declares `hosts`, the base-URL hosts it runs on, each matching itself and its
 * subdomains, and `models`, a regular expression searched in the model id without regard to case;
 * the client enables it where every one it declares matches. Its hooks change their argument in
 * place, turning the endpoint's wire into the shape the transforms read and back.
 */
export class ClientPlugin {
  static readonly hosts: readonly string[] = [];
  static readonly models: string | null = null;

  readonly model: string;
  readonly baseUrl: string;
  // the client's SDK object, through which a request of the plugin's own goes, to the client's
  // endpoint with the client's credential
  sdk: unknown;

  constructor(model: string, baseUrl: string, sdk: unknown) {
    this.model = model;
    this.baseUrl = baseUrl;
    this.sdk = sdk;
  }

  /**
   * Whether a client of this model id and base URL runs the plugin.
   */
  static matches(model: string, baseUrl: string): boolean {
    if (this.hosts.length === 0 && this.models === null) return false;

    let host = "";
    try {
      host = new URL(baseUrl).hostname.toLowerCase();
    } catch {
      host = "";
    }
    if (
      this.hosts.length > 0 &&
      !this.hosts.some((name) => host === name || host.endsWith(`.${name}`))
    ) {
      return false;
    }

    return this.models === null || new RegExp(this.models, "i").test(model);
  }

  /**
   * Change the arguments of the SDK call, the wire messages among them, before it is sent.
   */
  async onRequest(
    _config: UniConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _request: Record<string, any>,
    _signal?: AbortSignal,
  ): Promise<void> {}

  /**
   * Change one wire event before the event transform reads it.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onWireEvent(_wireEvent: any): void {}

  /**
   * Change the UniEvent the event transform made of a wire event.
   */
  onEvent(_event: UniEvent): void {}
}

/**
 * A plugin class as a client's `PLUGINS` lists it.
 */
export type PluginClass = {
  new (model: string, baseUrl: string, sdk: unknown): ClientPlugin;
  matches(model: string, baseUrl: string): boolean;
};

/**
 * The plugins a client of this model id and base URL runs, in the order listed.
 */
export function enabledPlugins(
  plugins: readonly PluginClass[],
  model: string,
  baseUrl: string,
  sdk: unknown,
): ClientPlugin[] {
  return plugins
    .filter((plugin) => plugin.matches(model, baseUrl))
    .map((plugin) => new plugin(model, baseUrl, sdk));
}
