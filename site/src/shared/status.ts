

// The daily status probe's data, as the pages read it in the browser: the files the status
// workflow commits to the status-data branch (.github/status/README.md describes them). Every
// entry is keyed by its registry triple, `${client}|${base_url}|${model}`. Without the files, the
// pages stay as they were built: every entry not probed. A check run by hand is followed through
// the GitHub API, anonymously: the workflow's runs, the branch's head commit, then that commit's
// files.

const REPO = "Prism-Shadow/model-message-stream-protocol";
export const STATUS_DATA_URL = `https://raw.githubusercontent.com/${REPO}/status-data/`;
export const STATUS_RUN_URL = `https://github.com/${REPO}/actions/runs/`;
export const STATUS_WORKFLOW_URL = `https://github.com/${REPO}/actions/workflows/status.yml`;
export const STATUS_BRANCH_API = `https://api.github.com/repos/${REPO}/branches/status-data`;
export const STATUS_RUNS_API = `https://api.github.com/repos/${REPO}/actions/workflows/status.yml/runs?per_page=5`;
// the files as of one commit: raw.githubusercontent.com may cache a branch's files for minutes, a
// commit's never change
export const statusCommitBase = (sha: string) => `https://raw.githubusercontent.com/${REPO}/${sha}/`;
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
function load<T>(name: string, base = statusBase()): Promise<T | null> {
  const url = base + name;
  if (!loaded.has(url)) {
    const file = fetch(url, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    loaded.set(url, file);
    // a file that did not arrive is asked for again next time
    void file.then((data) => data === null && loaded.delete(url));
  }
  return loaded.get(url) as Promise<T | null>;
}

export const loadLatest = (base?: string) => load<Latest>("latest.json", base);
export const loadHistory = (base?: string) => load<History>("history.json", base);
export const loadMonthly = (base?: string) => load<Monthly>("monthly.json", base);

async function github<T>(url: string): Promise<{ status: number; body?: T } | undefined> {
  try {
    const response = await fetch(url, { cache: "no-cache", headers: { accept: "application/vnd.github+json" } });
    return { status: response.status, body: response.ok ? ((await response.json()) as T) : undefined };
  } catch {
    return undefined;
  }
}

// the head commit of the status-data branch: null while the branch does not exist, undefined when
// the API does not answer (offline, or past its anonymous 60 requests an hour)
export async function statusHead(): Promise<string | null | undefined> {
  const answer = await github<{ commit: { sha: string } }>(STATUS_BRANCH_API);
  if (answer?.status === 404) return null;
  return answer?.body?.commit.sha;
}

export interface WorkflowRun {
  id: number;
  // queued, in_progress or completed, or a state on the way to them, such as waiting or pending
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}

// the status workflow's latest runs, newest first; undefined when the API does not answer
export async function statusRuns(): Promise<WorkflowRun[] | undefined> {
  return (await github<{ workflow_runs: WorkflowRun[] }>(STATUS_RUNS_API))?.body?.workflow_runs;
}

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
