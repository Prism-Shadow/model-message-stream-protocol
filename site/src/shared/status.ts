

// The daily status probe's data: the files the status workflow commits to the status-data branch
// (.github/status/README.md describes them). The pages are built with them (status-build.ts) and
// read them again in the browser, to catch up with a run newer than the build. Every entry is
// keyed by its registry triple, `${client}+${base_url}+${model}`; files written before 2026-10-23
// joined it with `|`, and withCurrentKeys() rewrites those keys as they are read. A file comes from
// raw.githubusercontent.com, or where raw does not answer (from mainland China, for one) from the
// GitHub contents API, which allows 60 anonymous requests an hour per IP. A check run by hand is
// followed through the same API: the workflow's runs, the branch's head commit, then that
// commit's files.

const REPO = "Prism-Shadow/model-message-stream-protocol";
export const STATUS_DATA_URL = `https://raw.githubusercontent.com/${REPO}/status-data/`;
export const STATUS_RUN_URL = `https://github.com/${REPO}/actions/runs/`;
export const STATUS_WORKFLOW_URL = `https://github.com/${REPO}/actions/workflows/status.yml`;
export const STATUS_BRANCH_API = `https://api.github.com/repos/${REPO}/branches/status-data`;
export const STATUS_RUNS_API = `https://api.github.com/repos/${REPO}/actions/workflows/status.yml/runs?per_page=5`;
// the files as of one commit: raw.githubusercontent.com may cache a branch's files for minutes, a
// commit's never change
export const statusCommitBase = (sha: string) => `https://raw.githubusercontent.com/${REPO}/${sha}/`;
// the days history.json keeps; every earlier day is in history/YYYY.json
export const HISTORY_DAYS = 365;
const SVG = "http://www.w3.org/2000/svg";

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
  // the samples that answered, of how many, and the last error: days written before the probe
  // recorded them lack them
  ok?: number;
  samples?: number;
  error?: string | null;
}

export interface History {
  days: number;
  targets: Record<string, Record<string, Day>>;
}

// history/YYYY.json: every day of one UTC year, never pruned
export interface HistoryYear {
  year: string;
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

const contentsApi = (name: string, ref: string) => `https://api.github.com/repos/${REPO}/contents/${name}?ref=${ref}`;
// the branch, or the commit a base pins; null for a local ?status= override
const refOf = (base: string) => (base === STATUS_DATA_URL ? "status-data" : (base.match(/\/([0-9a-f]{40})\/$/)?.[1] ?? null));

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) });
  return response.ok ? ((await response.json()) as T) : null;
}

// a key written before 2026-10-23 joined the triple with "|"
const currentKey = (key: string) => key.replaceAll("|", "+");
const rekey = <V>(targets: Record<string, V>) => Object.fromEntries(Object.entries(targets).map(([key, value]) => [currentKey(key), value]));

// a status file with every target keyed as today: the targets of latest.json and history.json, and
// of each month of monthly.json
export function withCurrentKeys<T>(data: T): T {
  if (!data || typeof data !== "object") return data;
  const { targets, months } = data as { targets?: Record<string, unknown>; months?: Record<string, Month> };
  return {
    ...data,
    ...(targets && { targets: rekey(targets) }),
    ...(months && {
      months: Object.fromEntries(Object.entries(months).map(([name, month]) => [name, month?.targets ? { ...month, targets: rekey(month.targets) } : month])),
    }),
  };
}

const loaded = new Map<string, Promise<unknown>>();
function load<T>(name: string, base = statusBase()): Promise<T | null> {
  const url = base + name;
  if (!loaded.has(url)) {
    const ref = refOf(base);
    // a missing file is null at once; a connection that fails or hangs tries the API instead
    const file = fetchJson<T>(url)
      .catch(() => (ref ? fetchJson<T>(contentsApi(name, ref), { accept: "application/vnd.github.raw+json" }) : null))
      .catch(() => null)
      .then(withCurrentKeys);
    loaded.set(url, file);
    // a file that did not arrive is asked for again next time
    void file.then((data) => data === null && loaded.delete(url));
  }
  return loaded.get(url) as Promise<T | null>;
}

export const loadLatest = (base?: string) => load<Latest>("latest.json", base);
export const loadHistory = (base?: string) => load<History>("history.json", base);
export const loadHistoryYear = (year: string, base?: string) => load<HistoryYear>(`history/${year}.json`, base);
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

// when status.yml runs the probe: one fixed UTC time a day, its only cron being "M H * * *"; null
// for any other schedule, which the page then does not try to predict
export interface DailySchedule {
  hour: number;
  minute: number;
}

export function dailySchedule(workflow: string): DailySchedule | null {
  const crons = [...workflow.matchAll(/^\s*-?\s*cron:\s*(.*)$/gm)].map((match) =>
    match[1]
      .replace(/\s+#.*$/, "")
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2"),
  );
  if (crons.length !== 1) return null;
  const fields = crons[0].split(/\s+/);
  if (fields.length !== 5 || fields.slice(2).some((field) => field !== "*") || !fields.slice(0, 2).every((field) => /^\d{1,2}$/.test(field))) return null;
  const [minute, hour] = fields.map(Number);
  return minute < 60 && hour < 24 ? { hour, minute } : null;
}

// the first time the schedule comes round after `now`
export function nextRun({ hour, minute }: DailySchedule, now = new Date()): Date {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute);
  return new Date(today > now.getTime() ? today : today + 86_400_000);
}

// today's UTC date, as history.json names its days
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// the `count` UTC dates that end on `end`, oldest first
export function windowDays(end: string, count: number): string[] {
  const last = Date.parse(`${end}T00:00:00Z`);
  return Array.from({ length: count }, (_, index) => new Date(last - (count - 1 - index) * 86_400_000).toISOString().slice(0, 10));
}

// the last `count` UTC dates, oldest first
export function lastDays(count = HISTORY_DAYS): string[] {
  return windowDays(todayUtc(), count);
}

// each state's shape on a 16-unit square: filled in the state's colour, the glyph cut out in
// --status-cut; a day nobody probed is a ring
type Shape = [tag: "circle" | "path", attributes: Record<string, string>][];
const DISC: Shape[number] = ["circle", { cx: "8", cy: "8", r: "7.5", fill: "currentColor" }];
const CUT = { fill: "none", "stroke-width": "1.75", "stroke-linecap": "round", style: "stroke: var(--status-cut)" };
const ICONS: Record<Status | "none", Shape> = {
  up: [DISC, ["path", { d: "M4.75 8.25 7 10.5l4.25-5", ...CUT, "stroke-linejoin": "round" }]],
  degraded: [
    ["path", { d: "M7.1 1.9a1 1 0 0 1 1.8 0l6.1 11.6a1 1 0 0 1-.9 1.5H1.9a1 1 0 0 1-.9-1.5z", fill: "currentColor" }],
    ["path", { d: "M8 6v3.6", ...CUT }],
    ["circle", { cx: "8", cy: "12.1", r: "1", style: "fill: var(--status-cut)" }],
  ],
  down: [DISC, ["path", { d: "m5.5 5.5 5 5m0-5-5 5", ...CUT }]],
  nokey: [DISC, ["path", { d: "M5 8h6", ...CUT }]],
  none: [["circle", { cx: "8", cy: "8", r: "6.75", fill: "none", stroke: "currentColor", "stroke-width": "1.5" }]],
};

// a status as its icon, for beside a word or a name that says the rest
export function statusIcon(status: Status | "none", size = "h-4 w-4"): SVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("class", `status-icon ${size}`);
  svg.setAttribute("aria-hidden", "true");
  svg.dataset.status = status;
  for (const [tag, attributes] of ICONS[status]) {
    const shape = document.createElementNS(SVG, tag);
    for (const [name, value] of Object.entries(attributes)) shape.setAttribute(name, value);
    svg.append(shape);
  }
  return svg;
}

// a status as its icon and its word
export function statusLabel(status: Status | null, words: StatusWords): HTMLElement {
  const label = document.createElement("span");
  label.className = "status-label";
  label.dataset.status = status ?? "none";
  const word = document.createElement("span");
  word.className = "status-word";
  word.textContent = status ? words[status] : words.none;
  label.append(statusIcon(status ?? "none"), word);
  return label;
}
