// The streams the overview page plays: one input, sent to three models, and the events each
// one streamed back, replayed event by event. The same functions render the finished state at
// build time and every step in the browser.

export interface DemoItem {
  type: string;
  [field: string]: unknown;
}

export interface DemoEvent {
  event_type: "delta" | "stop";
  item?: DemoItem;
  usage_metadata?: Record<string, number | null>;
  finish_reason?: string;
}

export interface Scenario {
  id: string;
  // the model id, the one thing that changes between the scenarios
  model: string;
  label: string;
  events: DemoEvent[];
}

// the words of the player, in the page's language
export interface PlayerWords {
  nothing: string;
  running: string;
  streaming: string;
  finish: string;
  usage: string;
  tokens: string;
  cached: string;
  prompt: string;
  thoughts: string;
  response: string;
}

// what every scenario sends: the same message and the same tool, to a different model
export const INPUT = {
  message: {
    role: "user",
    content_items: [{ type: "text.done", text: "What's the weather in Paris?" }],
  },
};

const delta = (item: DemoItem): DemoEvent => ({ event_type: "delta", item });
const stop = (finish_reason: string, usage_metadata: Record<string, number | null>): DemoEvent => ({
  event_type: "stop",
  finish_reason,
  usage_metadata,
});

export const SCENARIOS: Scenario[] = [
  {
    id: "claude",
    model: "claude-opus-5-5",
    label: "Claude",
    events: [
      delta({ type: "thinking.delta", thinking: "The user wants" }),
      delta({ type: "thinking.delta", thinking: " the weather in Paris." }),
      delta({ type: "thinking.delta", thinking: "", fidelity: { signature: "EuYBCkYIBxgC…" } }),
      delta({
        type: "thinking.done",
        thinking: "The user wants the weather in Paris.",
        fidelity: { signature: "EuYBCkYIBxgC…" },
      }),
      delta({ type: "tool_call.delta", name: "get_weather", arguments: "", tool_call_id: "toolu_01A3" }),
      delta({ type: "tool_call.delta", name: "", arguments: '{"location": ', tool_call_id: "" }),
      delta({ type: "tool_call.delta", name: "", arguments: '"Paris"}', tool_call_id: "" }),
      delta({
        type: "tool_call.done",
        name: "get_weather",
        arguments: { location: "Paris" },
        tool_call_id: "toolu_01A3",
      }),
      stop("tool_call", { cached_tokens: 0, prompt_tokens: 412, thoughts_tokens: 31, response_tokens: 27 }),
    ],
  },
  {
    id: "gpt",
    model: "gpt-6.1-sol",
    label: "GPT",
    events: [
      delta({ type: "thinking.delta", thinking: "**Checking the weather**" }),
      delta({ type: "thinking.delta", thinking: " I need the current conditions in Paris." }),
      delta({
        type: "thinking.delta",
        thinking: "",
        fidelity: { encrypted_content: "gAAAAABo9…" },
      }),
      delta({
        type: "thinking.done",
        thinking: "**Checking the weather** I need the current conditions in Paris.",
        fidelity: { encrypted_content: "gAAAAABo9…" },
      }),
      delta({ type: "tool_call.delta", name: "get_weather", arguments: "", tool_call_id: "call_x7Kq" }),
      delta({ type: "tool_call.delta", name: "", arguments: '{"location":', tool_call_id: "" }),
      delta({ type: "tool_call.delta", name: "", arguments: '"Paris"}', tool_call_id: "" }),
      delta({
        type: "tool_call.done",
        name: "get_weather",
        arguments: { location: "Paris" },
        tool_call_id: "call_x7Kq",
      }),
      stop("tool_call", { cached_tokens: 256, prompt_tokens: 138, thoughts_tokens: 64, response_tokens: 19 }),
    ],
  },
  {
    id: "gemini",
    model: "gemini-3.8-flash",
    label: "Gemini",
    events: [
      delta({ type: "thinking.delta", thinking: "Paris weather:" }),
      delta({ type: "thinking.delta", thinking: " call the tool.", fidelity: { signature: "CqEBAXCw…" } }),
      delta({
        type: "thinking.done",
        thinking: "Paris weather: call the tool.",
        fidelity: { signature: "CqEBAXCw…" },
      }),
      delta({
        type: "tool_call.delta",
        name: "get_weather",
        arguments: '{"location": "Paris"}',
        tool_call_id: "fc_9d2e",
      }),
      delta({
        type: "tool_call.done",
        name: "get_weather",
        arguments: { location: "Paris" },
        tool_call_id: "fc_9d2e",
      }),
      stop("tool_call", { cached_tokens: 0, prompt_tokens: 97, thoughts_tokens: 22, response_tokens: 12 }),
    ],
  },
];

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const json = (value: unknown): string => escapeHtml(JSON.stringify(value));

// the one field a kind grows, as the protocol defines it
const GROWS: Record<string, string> = {
  text: "text",
  thinking: "thinking",
  tool_call: "arguments",
};

function preview(item: DemoItem): string {
  const [kind, phase] = item.type.split(".");
  const parts: string[] = [];
  if (kind === "tool_call" && item.name) {
    parts.push(`${escapeHtml(String(item.name))} ${escapeHtml(String(item.tool_call_id))}`);
  }
  const grown = item[GROWS[kind]];
  if (phase === "done" || grown !== "") {
    parts.push(json(grown));
  }
  if (item.fidelity) {
    parts.push(`fidelity ${json(item.fidelity)}`);
  }
  return parts.join("  ");
}

const KEY = "text-gray-400 dark:text-gray-500";

/**
 * The code that sends the input, in TypeScript: the model id is the one thing that changes
 * between the scenarios.
 */
export function inputCode(scenario: Scenario): string {
  const text = INPUT.message.content_items[0].text;
  return `import { AutoLLMClient } from "@prismshadow/mmsp";

const client = new AutoLLMClient({ model: "${scenario.model}" });

for await (const event of client.streamingResponseStateful({
  message: {
    role: "user",
    content_items: [{ type: "text.done", text: "${text}" }],
  },
  config: { tools: [getWeather] },
})) {
  console.log(event);
}`;
}

const ROW = "grid grid-cols-[3.25rem_7.5rem_1fr] items-baseline gap-x-2 px-2.5 py-1 text-[12.5px] leading-5";

// fragments in gray, a complete item in ink on a faint ground, the stop event under a rule
export function renderEvent(event: DemoEvent): string {
  if (event.event_type === "stop") {
    return (
      `<li class="${ROW} mono mt-1 border-t border-gray-300 pt-1.5 text-gray-900 dark:border-gray-700 dark:text-gray-100">` +
      `<span class="font-medium">stop</span><span>${escapeHtml(String(event.finish_reason))}</span>` +
      `<span class="truncate text-gray-500 dark:text-gray-400">usage_metadata ${json(event.usage_metadata)}</span></li>`
    );
  }
  const item = event.item as DemoItem;
  const done = item.type.endsWith(".done");
  const tone = done
    ? "rounded bg-white font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    : "text-gray-500 dark:text-gray-400";
  return (
    `<li class="${ROW} mono ${tone}"><span>delta</span><span>${item.type}</span>` +
    `<span class="truncate">${preview(item)}</span></li>`
  );
}

// the four counts of usage_metadata, in the order they add up: the input in gray, the output
// in the one accent
const USAGE: [keyof PlayerWords, string, string][] = [
  ["cached", "cached_tokens", "bg-gray-400 dark:bg-gray-500"],
  ["prompt", "prompt_tokens", "bg-gray-400 dark:bg-gray-500"],
  ["thoughts", "thoughts_tokens", "bg-brand-500"],
  ["response", "response_tokens", "bg-brand-500"],
];

/**
 * The stop event as a reader wants it: the finish reason as a pill, and the usage as a bar per
 * count, scaled to the largest, with the total beside it.
 */
export function renderStop(event: DemoEvent, words: PlayerWords): string {
  const usage = event.usage_metadata ?? {};
  const counts = USAGE.map(([word, field, color]) => ({ word, color, value: usage[field] ?? 0 }));
  const largest = Math.max(1, ...counts.map((count) => count.value));
  const total = counts.reduce((sum, count) => sum + count.value, 0);
  const finish = String(event.finish_reason);
  const bars = counts
    .map((count) => {
      // a count too small for its share of the bar still shows
      const width = count.value === 0 ? "0%" : `${Math.max(1.5, (100 * count.value) / largest)}%`;
      return (
        `<div class="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-x-2">` +
        `<span class="truncate font-sans text-gray-500 dark:text-gray-400">${words[count.word]}</span>` +
        `<span class="h-2.5 overflow-hidden rounded-sm bg-gray-100 dark:bg-gray-800"><span class="block h-full rounded-sm ${count.color} transition-[width] duration-700 ease-out" style="width: ${width}" data-bar="${width}"></span></span>` +
        `<span class="mono text-right tabular-nums text-gray-700 dark:text-gray-300">${count.value}</span></div>`
      );
    })
    .join("");
  const row = (name: string, pill: string) =>
    `<div class="flex items-center justify-between gap-2"><span class="${KEY}">${name}</span>${pill}</div>`;
  // the finish reason is the response's one status, so it alone gets a tag
  return (
    row(
      words.finish,
      `<span class="rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-900 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100">${escapeHtml(finish)}</span>`,
    ) +
    `<div class="mt-3">` +
    row(words.usage, `<span class="font-sans text-gray-700 dark:text-gray-300"><span class="mono tabular-nums">${total}</span> ${words.tokens}</span>`) +
    `<div class="mt-2 space-y-1.5">${bars}</div></div>`
  );
}

/**
 * The assistant message after the first `count` events: the done items that arrived, the item
 * still streaming, which is not part of the message until its done item arrives, and once the
 * stop event has arrived, the finish reason and the usage.
 */
export function renderMessage(events: DemoEvent[], count: number, words: PlayerWords): string {
  const done: DemoItem[] = [];
  let open: { kind: string; value: string } | null = null;
  let stopped: DemoEvent | null = null;
  for (const event of events.slice(0, count)) {
    if (event.event_type === "stop") {
      stopped = event;
      continue;
    }
    const item = event.item as DemoItem;
    const [kind, phase] = item.type.split(".");
    if (phase === "done") {
      done.push(item);
      open = null;
    } else {
      open = { kind, value: (open?.kind === kind ? open.value : "") + String(item[GROWS[kind]]) };
    }
  }

  const rows = done.map(
    (item) =>
      `<li class="rounded border border-gray-200 bg-white px-2.5 py-1.5 dark:border-gray-800 dark:bg-gray-950">` +
      `<span class="font-medium text-gray-900 dark:text-gray-100">${item.type}</span>` +
      `<span class="mt-0.5 block break-all text-gray-700 dark:text-gray-300">${preview(item)}</span></li>`,
  );
  if (open !== null) {
    rows.push(
      `<li class="rounded border border-dashed border-gray-300 px-2.5 py-1.5 text-gray-500 dark:border-gray-700 dark:text-gray-400">` +
        `<span>${open.kind}, ${words.streaming}</span>` +
        `<span class="mt-0.5 block break-all">${json(open.value)}</span></li>`,
    );
  }
  if (rows.length === 0) {
    rows.push(`<li class="px-0.5 py-1.5 text-gray-400 dark:text-gray-500">${words.nothing}</li>`);
  }
  const meta =
    stopped === null
      ? `<p class="mt-3 px-0.5 text-gray-400 dark:text-gray-500">${words.running}</p>`
      : `<div class="mt-3 border-t border-gray-200 pt-3 dark:border-gray-800" data-stop>${renderStop(stopped, words)}</div>`;
  return `<ul class="space-y-1.5">${rows.join("")}</ul>${meta}`;
}
