# The playground and the tracer are redesigned

- **Date:** 2026-09-30
- **Type:** feature
- **Scope:** `integration`

[中文版](2026-09-30-playground-redesign.zh.md)

## What changed

- The settings move into a sidebar, a drawer on narrow screens. The chat is a centered column with a floating composer, and a top bar names the model and client type in use.
- The page follows the system's light or dark theme, and a toggle in the sidebar overrides it.
- Stream items read by kind:
  - Thinking is a collapsible trace, "Thought for 2.3 s", open while it streams.
  - Each tool call is a card with its name and pretty-printed arguments.
  - Images, audio and embeddings get cards of their own.
  - The footer shows the finish reason as a colored pill, the token counts, the time taken and a copy button.
- Until the first delta arrives, an indicator counts the seconds.
- Thinking summary and tool choice are segmented controls.
- The model menu gains a filter for long listed catalogs, and every menu takes the arrow keys.
- Images can be pasted or dropped onto the composer.
- An invalid Tools or Extra headers field is marked as you type.
- A thinking item that carries only a signature is no longer shown.
- The page no longer loads Tailwind at runtime. Its only outside requests are the Inter and JetBrains Mono fonts.
- The tracer takes the same look and theme, and a theme picked in one page carries to the other.
  - Folders and traces are a list with icons, sizes and times, sorted by name or by modified time.
  - A trace opens with its model, message count and save time. The configuration folds its system prompt and tools.
  - Each message is a collapsible card with a role pill, its round and the time since the message before.
  - Items read as in the playground, a thinking item with only fidelity is labeled so, and the footer shows the finish reason and token counts.
  - A rail beside the trace marks the round in view.
