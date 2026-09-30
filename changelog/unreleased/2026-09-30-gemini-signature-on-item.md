# Gemini records a thought signature on the item it signs

- **Date:** 2026-09-30
- **Type:** fix
- **Scope:** `gemini_official`, `stream_items`
- **Breaking:** no

[中文版](2026-09-30-gemini-signature-on-item.zh.md)

## What changed

- An Interactions API thought step's signature signs the step after it. `gemini-official` now records it in the `fidelity` of that step's text, image or tool call, as `gemini-generate-content` already does. Before, it went on the thinking item. Without a thought summary, the default, every response then streamed a `thinking.done` with empty `thinking` that held only the signature.
- A thought summary is now an unsigned `thinking.done`, followed by the signed item.
- On replay, a signed item right behind an unsigned thought signs that thought step, so the request matches what the API streamed. Histories recorded before this change replay unchanged.
- Stream assembly: fidelity sent alone ahead of an item's content now waits for that content. Content of the same kind goes out behind it, as before. Content of another kind carries it on its first delta. With no content under its id, it goes out as an item of the kind that carried it, as before. Other clients stream the same items as before.

## Compatibility

- Code that read a Gemini signature from a `thinking.done` finds it on the next item's `fidelity`. Code that passes `fidelity` back unchanged needs nothing.
