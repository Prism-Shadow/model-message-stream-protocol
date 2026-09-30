// The streams the overview page plays: recorded shapes, replayed event by event. The same
// functions render the finished state at build time and every step in the browser.

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
  label: string;
  model: string;
  prompt: string;
  events: DemoEvent[];
}

const delta = (item: DemoItem): DemoEvent => ({ event_type: "delta", item });

export const SCENARIOS: Scenario[] = [
  {
    id: "text",
    label: "Text",
    model: "gpt-5.6-sol",
    prompt: "Say 'Hello, World!'",
    events: [
      delta({ type: "text.delta", text: "Hello" }),
      delta({ type: "text.delta", text: "," }),
      delta({ type: "text.delta", text: " World" }),
      delta({ type: "text.delta", text: "!" }),
      delta({ type: "text.done", text: "Hello, World!" }),
      {
        event_type: "stop",
        usage_metadata: {
          cached_tokens: 0,
          prompt_tokens: 12,
          thoughts_tokens: 0,
          response_tokens: 8,
        },
        finish_reason: "stop",
      },
    ],
  },
  {
    id: "tool",
    label: "Thinking, then a tool call",
    model: "claude-opus-5",
    prompt: "What's the weather in Paris?",
    events: [
      delta({ type: "thinking.delta", thinking: "Let me" }),
      delta({ type: "thinking.delta", thinking: " check" }),
      delta({ type: "thinking.delta", thinking: "", fidelity: { signature: "EuYB..." } }),
      delta({
        type: "thinking.done",
        thinking: "Let me check",
        fidelity: { signature: "EuYB..." },
      }),
      delta({
        type: "tool_call.delta",
        name: "get_weather",
        arguments: "",
        tool_call_id: "toolu_1",
      }),
      delta({ type: "tool_call.delta", name: "", arguments: '{"location": ', tool_call_id: "" }),
      delta({ type: "tool_call.delta", name: "", arguments: '"Paris"}', tool_call_id: "" }),
      delta({
        type: "tool_call.done",
        name: "get_weather",
        arguments: { location: "Paris" },
        tool_call_id: "toolu_1",
      }),
      {
        event_type: "stop",
        usage_metadata: {
          cached_tokens: 0,
          prompt_tokens: 412,
          thoughts_tokens: 31,
          response_tokens: 27,
        },
        finish_reason: "tool_call",
      },
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

const ROW =
  "grid grid-cols-[3.25rem_7.5rem_1fr] items-baseline gap-x-2 border-l-2 px-2.5 py-1 text-[12.5px] leading-5";

export function renderEvent(event: DemoEvent): string {
  if (event.event_type === "stop") {
    return (
      `<li class="${ROW} mono border-gray-900 bg-gray-100 font-medium dark:border-white dark:bg-gray-800">` +
      `<span>stop</span><span>${escapeHtml(String(event.finish_reason))}</span>` +
      `<span class="truncate font-normal text-gray-600 dark:text-gray-300">usage_metadata ${json(event.usage_metadata)}</span></li>`
    );
  }
  const item = event.item as DemoItem;
  const done = item.type.endsWith(".done");
  const tone = done
    ? "border-brand-500 bg-brand-50 dark:bg-brand-950/60"
    : "border-transparent text-gray-600 dark:text-gray-400";
  return (
    `<li class="${ROW} mono ${tone}"><span>delta</span>` +
    `<span class="${done ? "font-medium text-brand-700 dark:text-brand-300" : ""}">${item.type}</span>` +
    `<span class="truncate">${preview(item)}</span></li>`
  );
}

/**
 * The assistant message after the first `count` events: the done items that arrived, and the
 * item still streaming, which is not part of the message until its done item arrives.
 */
export function renderMessage(events: DemoEvent[], count: number): string {
  const done: DemoItem[] = [];
  let open: { kind: string; value: string } | null = null;
  let stop: DemoEvent | null = null;
  for (const event of events.slice(0, count)) {
    if (event.event_type === "stop") {
      stop = event;
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
      `<li class="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 dark:border-gray-800 dark:bg-gray-950">` +
      `<span class="font-medium text-brand-700 dark:text-brand-300">${item.type}</span>` +
      `<span class="mt-0.5 block break-all text-gray-700 dark:text-gray-300">${preview(item)}</span></li>`,
  );
  if (open !== null) {
    rows.push(
      `<li class="rounded-md border border-dashed border-gray-300 px-2.5 py-1.5 text-gray-500 dark:border-gray-700 dark:text-gray-400">` +
        `<span>${open.kind}, still streaming</span>` +
        `<span class="mt-0.5 block break-all">${json(open.value)}</span></li>`,
    );
  }
  if (rows.length === 0) {
    rows.push(`<li class="px-0.5 py-1.5 text-gray-400 dark:text-gray-500">Nothing yet.</li>`);
  }
  const meta =
    stop === null
      ? `<p class="mt-2 px-0.5 text-gray-400 dark:text-gray-500">The response is still running.</p>`
      : `<p class="mt-2 px-0.5 break-all text-gray-700 dark:text-gray-300">finish_reason ${json(stop.finish_reason)}<br />usage_metadata ${json(stop.usage_metadata)}</p>`;
  return `<ul class="space-y-1.5">${rows.join("")}</ul>${meta}`;
}
