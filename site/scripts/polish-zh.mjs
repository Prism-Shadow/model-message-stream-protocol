#!/usr/bin/env node
/**
 * Polish the Chinese of a site page through a DeepSeek model on the TokenDance gateway, with
 * the English page beside it as the source of every fact. Modeled on penguin-harness's
 * .agents/skills/penguin-harness-dev/scripts/polish-release-prose.mjs.
 *
 * Usage: node scripts/polish-zh.mjs <page>.zh.md [--model <id>] [--write]
 *   Reads <page>.zh.md and <page>.en.md, prints the polished Chinese (or rewrites the file with
 *   --write). Code blocks and HTML lines are restored from the original; an answer that changes
 *   inline code, a link target or the document's shape is refused. The key comes from TOKENDANCE_API_KEY or the file named by TOKENDANCE_KEY_FILE,
 *   never from an argument, so it stays out of shell history.
 */
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "https://tokendance.space/gateway/v1/chat/completions";

const INSTRUCTION = `You are editing the Chinese documentation of MMSP, the Model Message Stream Protocol: an open-source Python and TypeScript SDK that gives every model provider one message format and one streaming grammar. The readers are Chinese developers. The Chinese was translated from the English page, and it reads like a translation. Make it read as if a Chinese engineer wrote it.

You get two documents: the English original, the source of every fact, and the current Chinese. Return the improved Chinese only.

What to fix:
- Translationese. English word order, long attributive chains of "的", "它" and "其" standing in for every subject, "被" passives, "进行", "一个" in front of every noun, "对于……来说", "通过……的方式", sentences that start with a clause the English started with.
- Stiff word choices. Say it the way a Chinese developer says it in a design doc or a code review: short sentences, the subject stated once, the verb up front.
- Split a sentence that carries three ideas. Merge two that carry one.

What to keep:
- Every fact of the English: names, numbers, versions, paths, flags, defaults, limits, error names, conditions and consequences. A clause stating a default, a limit, a scope or a reason is a fact even without a number. Never add a fact the English does not have.
- Code, identifiers, field names, model ids, environment variables and URLs, exactly. English terms Chinese developers use as-is stay in English: agent, token, skill, fidelity, delta, stop, base URL, API key, SDK, Python, TypeScript, tracer, playground.
- Glossary, used consistently: content item 内容项; stream 流; event 事件; message 消息; tool call 工具调用; tool result 工具结果; thinking 思考; provider 服务商; vendor 厂商; endpoint 端点; wire protocol 协议; official client 官方客户端; compatible client 兼容客户端; stateful 有状态; grammar 文法; usage 用量; finish reason 结束原因.
- Typography: full-width Chinese punctuation (，。：；、？（）), one space between Chinese and Latin letters or digits, no space between Chinese and full-width punctuation.
- Code, exactly: every fenced code block, every line that begins with "<", every inline code span and every link target stays character for character as the current Chinese has it, comments inside code included.
- Structure, exactly: the frontmatter keys, heading levels and order, list items as list items, tables with the same rows and columns.
- A sentence that already reads naturally stays as it is. Polishing is not rewriting.

Return only the Chinese Markdown document. No preamble, no commentary, no fence around the whole document.`;

if (typeof INSTRUCTION !== "string") {
  throw new Error("INSTRUCTION is not a string: check for an unescaped backtick in it");
}

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--") && arg.endsWith(".zh.md"));
if (!file) {
  console.error("usage: polish-zh.mjs <page>.zh.md [--model <id>] [--write]");
  process.exit(2);
}
const model = args.includes("--model") ? args[args.indexOf("--model") + 1] : "deepseek-v3.2";
const write = args.includes("--write");

const keyFile = process.env.TOKENDANCE_KEY_FILE;
const key = process.env.TOKENDANCE_API_KEY ?? (keyFile ? readFileSync(keyFile, "utf8").trim() : "");
if (!key) {
  console.error("no key: set TOKENDANCE_API_KEY or TOKENDANCE_KEY_FILE");
  process.exit(2);
}

const chinese = readFileSync(file, "utf8");
const english = readFileSync(file.replace(/\.zh\.md$/, ".en.md"), "utf8");

const res = await fetch(BASE, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model,
    messages: [
      { role: "system", content: INSTRUCTION },
      { role: "user", content: `English original:\n\n${english}\n\n---\n\nCurrent Chinese:\n\n${chinese}` },
    ],
    temperature: 0.3,
  }),
});
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  process.exit(1);
}
const data = await res.json();
const out = (data.choices?.[0]?.message?.content ?? "").trim().replace(/^```(?:markdown|md)?\n([\s\S]*)\n```$/, "$1");
if (!out) {
  console.error("empty completion");
  process.exit(1);
}

// Blocks and HTML lines are put back from the original by position: a model told to keep them
// still rewrote a number inside a JSON example and put the English comments back into code.
const BLOCK = /^```[\s\S]*?^```$|^<.*$/gm;
const originals = chinese.match(BLOCK) ?? [];
const answered = out.match(BLOCK) ?? [];
if (answered.length !== originals.length) {
  console.error(`${file}: the answer has ${answered.length} code blocks and HTML lines, not ${originals.length}; nothing written`);
  process.exit(1);
}
let next = 0;
const restored = out.replace(BLOCK, () => originals[next++]);

// inline code and link targets may move within a sentence, but each must survive, unchanged
const spans = (text) =>
  [...text.replace(BLOCK, "").matchAll(/`[^`\n]+`|\]\([^)\s]+\)/g)].map((match) => match[0]).sort();
const before = spans(chinese);
const after = spans(restored);
const lost = before.filter((span) => after.filter((s) => s === span).length < before.filter((s) => s === span).length);
// a word the English sets as code may become code in the Chinese too
const englishSpans = new Set(spans(english));
const added = after.filter(
  (span) =>
    before.filter((s) => s === span).length < after.filter((s) => s === span).length && !englishSpans.has(span),
);
if (lost.length > 0 || added.length > 0) {
  console.error(`${file}: the answer changed inline code or a link; nothing written`);
  for (const span of new Set(lost)) console.error(`  lost ${span}`);
  for (const span of new Set(added)) console.error(`  added ${span}`);
  if (process.env.POLISH_DEBUG) writeFileSync(process.env.POLISH_DEBUG, restored);
  process.exit(1);
}

// the shape of the document: headings, list items, table rows and frontmatter keys, in order
const shape = (text) =>
  text
    .split("\n")
    .map((line) => line.match(/^(#+ |- |\d+\. |\| |---|[a-z_]+:)/)?.[1] ?? "")
    .filter(Boolean)
    .join("|");
if (shape(restored) !== shape(chinese)) {
  console.error(`${file}: the answer changed the document's structure; nothing written`);
  process.exit(1);
}

process.stderr.write(`${file}: model=${model} usage=${JSON.stringify(data.usage ?? {})}\n`);
const text = restored.endsWith("\n") ? restored : `${restored}\n`;
if (write) {
  writeFileSync(file, text);
} else {
  process.stdout.write(text);
}
