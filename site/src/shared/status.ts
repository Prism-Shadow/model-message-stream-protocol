// The daily status probe's data, as the pages read it in the browser: the files the status
// workflow commits to the status-data branch (.github/status/README.md describes them). Every
// entry is keyed by its registry triple, `${client}|${base_url}|${model}`. Without the files, the
// pages stay as they were built: every entry not probed.

export const STATUS_DATA_URL = "https://raw.githubusercontent.com/Prism-Shadow/model-message-stream-protocol/status-data/";
export const STATUS_RUN_URL = "https://github.com/Prism-Shadow/model-message-stream-protocol/actions/runs/";
export const HISTORY_DAYS = 90;

export type Status = "up" | "degraded" | "down" | "nokey";

export interface Usage {
  cached_tokens: number;
  prompt_tokens: number;
  thoughts_tokens: number;
  response_tokens: number;
}

export interface TargetLatest {
  model: string;
  client: string;
  base_url: string;
  status: Status;
  ok: number;
  ttft_ms: number | null;
  tps: number | null;
  usage: Usage;
  cost_usd: number | null;
  error: string | null;
  // when this target was last probed: a dispatch may probe some targets only; null without a key
  checked_at: string | null;
}

export interface Latest {
  generated_at: string;
  run_id: string;
  samples: number;
  targets: Record<string, TargetLatest>;
}

export interface Day {
  status: Status;
  ttft_ms: number | null;
  tps: number | null;
  cost_usd: number | null;
}

export interface History {
  days: number;
  targets: Record<string, Record<string, Day>>;
}

export interface Month {
  runs: number;
  total_usd: number;
  // a target without a registry price is absent
  targets: Record<string, number>;
}

export interface Monthly {
  months: Record<string, Month>;
}

export interface StatusWords {
  up: string;
  degraded: string;
  down: string;
  nokey: string;
  none: string;
}

// ?status=<origin> points a page served from this machine at hand-written files, to see it
// hydrate before the first run; a published page always reads the branch
export function statusBase(): string {
  const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const wanted = local ? new URLSearchParams(location.search).get("status") : null;
  if (!wanted) return STATUS_DATA_URL;
  return wanted.endsWith("/") ? wanted : `${wanted}/`;
}

// the same override, for a link to the other page of the pair
export function statusQuery(): string {
  return statusBase() === STATUS_DATA_URL ? "" : `?status=${encodeURIComponent(statusBase())}`;
}

const loaded = new Map<string, Promise<unknown>>();
function load<T>(name: string): Promise<T | null> {
  if (!loaded.has(name)) {
    loaded.set(
      name,
      fetch(statusBase() + name, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
    );
  }
  return loaded.get(name) as Promise<T | null>;
}

export const loadLatest = () => load<Latest>("latest.json");
export const loadHistory = () => load<History>("history.json");
export const loadMonthly = () => load<Monthly>("monthly.json");

// the id of a target's block on the status page, which the catalog links to
export function statusAnchor(key: string): string {
  return key
    .toLowerCase()
    .replace(/[a-z]+:\/\//, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const STATUS_RANK: Record<Status, number> = { up: 0, degraded: 1, down: 2, nokey: 3 };

export function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

export function formatTps(tps: number | null): string {
  return tps === null ? "—" : String(Math.round(tps));
}

export function formatUsd(usd: number | null | undefined): string {
  if (usd === null || usd === undefined) return "—";
  if (usd === 0) return "$0";
  return `$${usd >= 1 ? usd.toFixed(2) : Number(usd.toPrecision(2)).toString()}`;
}

export function ago(iso: string, locale: string): string {
  const seconds = (Date.parse(iso) - Date.now()) / 1000;
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, "minute");
}

// the last HISTORY_DAYS UTC dates, oldest first, as history.json names its days
export function lastDays(count = HISTORY_DAYS): string[] {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: count }, (_, index) => new Date(today - (count - 1 - index) * 86_400_000).toISOString().slice(0, 10));
}

// a status as a flat dot and its word
export function statusLabel(status: Status | null, words: StatusWords): HTMLElement {
  const label = document.createElement("span");
  label.className = "status-label";
  label.dataset.status = status ?? "none";
  const dot = document.createElement("span");
  dot.className = "status-dot";
  const word = document.createElement("span");
  word.className = "status-word";
  word.textContent = status ? words[status] : words.none;
  label.append(dot, word);
  return label;
}
