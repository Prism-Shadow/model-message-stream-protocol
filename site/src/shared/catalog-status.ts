// The catalog's latency and throughput cells from a row's entry in the probe's latest.json: built
// with the page, and drawn again by its script when the status-data branch has a newer run. The
// table's headers carry the units, so its cells hold bare numbers; the kit dialog, which has no
// headers, shows the same figures with their units.

import { formatMs, formatTps, statusAnchor, type Latest, type StatusWords, type TargetLatest } from "./status";

export type MetricWords = StatusWords & { tps: string };

// the unit of the price columns, which follows the USD / CNY switch
export const PRICE_UNITS = { USD: "$/M", CNY: "¥/M" } as const;
export const LATENCY_UNIT = "s";

// files written before 2026-10-23 joined the triple with `|`; the status-data branch keeps them
// until the probe's next run rewrites them, so a build or a reader in between gets either form
export function withCurrentKeys(latest: Latest | null): Latest | null {
  if (!latest) return null;
  const targets = Object.entries(latest.targets).map(([key, target]) => [key.replaceAll("|", "+"), target] as const);
  return { ...latest, targets: Object.fromEntries(targets) };
}

export interface MetricCells {
  latency: string;
  throughput: string;
}

const DASH = '<span class="text-gray-300 dark:text-gray-600">—</span>';
const empty = (title: string) => `<span class="text-gray-300 dark:text-gray-600" title="${title}">—</span>`;

// a channel the probe reached; one without a key was skipped, so the catalog treats it as not probed
export function isProbed(target: TargetLatest | undefined): target is TargetLatest {
  return target !== undefined && target.status !== "nokey";
}

// a time to first token in seconds: two decimals under 10 s, one from there, rounded on whole
// milliseconds because 835 / 1000 is 0.83499… in binary and toFixed would read it as 0.83
export function formatSeconds(ms: number): string {
  return ms < 10_000 ? (Math.round(ms / 10) / 100).toFixed(2) : (Math.round(ms / 100) / 10).toFixed(1);
}

// the two cells of a row as HTML, bare numbers or, with units, as the kit dialog shows them;
// nothing of the model id goes in, only numbers and the page's words
export function metricCells(
  target: Pick<TargetLatest, "status" | "ttft_ms" | "tps"> | undefined,
  words: MetricWords,
  statusPage: string,
  key: string,
  units = false,
): MetricCells {
  if (!target) return { latency: empty(words.none), throughput: empty(words.none) };
  if (target.status === "nokey") return { latency: empty(words.nokey), throughput: empty(words.nokey) };
  const link = (body: string) =>
    `<a class="catalog-metric" href="${statusPage}#${statusAnchor(key)}" title="${words[target.status]}">${body}</a>`;
  // an up channel's numbers are its status; a dot only where it says something else
  const dot = target.status === "up" ? "" : `<span class="status-dot" data-status="${target.status}"></span>`;
  const latency =
    target.ttft_ms !== null
      ? units
        ? formatMs(target.ttft_ms)
        : formatSeconds(target.ttft_ms)
      : target.status === "down"
        ? `<span class="status-word font-sans">${words.down}</span>`
        : DASH;
  const throughput = target.tps === null ? DASH : units ? `${formatTps(target.tps)} ${words.tps}` : formatTps(target.tps);
  return { latency: link(dot + latency), throughput: link(throughput) };
}
