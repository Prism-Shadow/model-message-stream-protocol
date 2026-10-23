// The catalog's latency and throughput cells from a row's entry in the probe's latest.json: built
// with the page, and drawn again by its script when the status-data branch has a newer run.

import { formatMs, formatTps, statusAnchor, type StatusWords, type TargetLatest } from "./status";

export type MetricWords = StatusWords & { tps: string };

export interface MetricCells {
  latency: string;
  throughput: string;
}

const DASH = '<span class="text-gray-300 dark:text-gray-600">—</span>';
const empty = (title: string) => `<span class="text-gray-300 dark:text-gray-600" title="${title}">—</span>`;

// a channel the probe reached; one without a key was skipped, so the catalog counts it as not probed
export function isProbed(target: TargetLatest | undefined): target is TargetLatest {
  return target !== undefined && target.status !== "nokey";
}

// the two cells of a row as HTML; nothing of the model id goes in, only numbers and the page's words
export function metricCells(target: TargetLatest | undefined, words: MetricWords, statusPage: string, key: string): MetricCells {
  if (!target) return { latency: empty(words.none), throughput: empty(words.none) };
  if (target.status === "nokey") return { latency: empty(words.nokey), throughput: empty(words.nokey) };
  const link = (body: string) =>
    `<a class="catalog-metric" href="${statusPage}#${statusAnchor(key)}" title="${words[target.status]}">${body}</a>`;
  // an up channel's numbers are its status; a dot only where it says something else
  const dot = target.status === "up" ? "" : `<span class="status-dot" data-status="${target.status}"></span>`;
  const latency =
    target.ttft_ms !== null
      ? formatMs(target.ttft_ms)
      : target.status === "down"
        ? `<span class="status-word font-sans">${words.down}</span>`
        : DASH;
  return {
    latency: link(dot + latency),
    throughput: link(target.tps === null ? DASH : `${formatTps(target.tps)} ${words.tps}`),
  };
}
