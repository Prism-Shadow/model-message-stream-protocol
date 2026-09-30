# Gemini puts a summary-less thought signature on the item it signs

- **Date:** 2026-09-30
- **Type:** fix
- **Scope:** `gemini_official`
- **Breaking:** no

[中文版](2026-09-30-gemini-signature-on-item.zh.md)

## What changed

- Without a thought summary, every Interactions API response opens with a thought step that holds only a signature. `gemini-official` used to stream it as a `thinking.done` item with empty `thinking`. The signature now goes in the `fidelity` of the text, image or tool call the next step opens, as `gemini-generate-content` already records it.
- A thought step with a summary keeps its signature on its own thinking item, as before.
- Histories that hold the old empty thinking items still replay unchanged.

## Compatibility

- Code that read the signature from an empty `thinking.done` finds it on the next item's `fidelity`. Code that passes `fidelity` back unchanged needs nothing.
