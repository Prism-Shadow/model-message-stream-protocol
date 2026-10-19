# Claude replay omits a thinking item that carries no signature

- **Date:** 2026-10-19
- **Type:** fix
- **Scope:** `anthropic_official`, `tests`

[中文版](2026-10-19-claude-unsigned-thinking-replay.zh.md)

## What changed

- `anthropic-official` leaves out of the request a `thinking.done` item whose `fidelity` carries no `signature`, such as a thinking item another provider produced, and replays the rest of its turn. Python raised `KeyError` on such an item, and TypeScript sent a `thinking` block without `signature`, which the API refused with a 400 (`thinking.signature: Field required`).
- A `thinking.done` item that carries a signature, redacted thinking included, is replayed as before.
- Added offline tests in Python and TypeScript: an unsigned thinking item before a tool call is left out, while a signed one in a later turn is kept.
