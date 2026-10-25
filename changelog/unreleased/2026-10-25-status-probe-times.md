# The status card leads with the last and next probe

- **Date:** 2026-10-25
- **Type:** feature
- **Scope:** `site`

[中文版](2026-10-25-status-probe-times.zh.md)

## What changed

- The overall card of `/status/` and `/zh/status/` showed under its band two labelled values, Last probe and Next probe (expected), each a local time such as `Oct 25, 17:18` with its relative time beside it, said again every minute, and the full date, time and time zone in its tooltip. The last probe linked to its run on GitHub; the next came from the schedule of `status.yml` and was labelled expected. Both read `—` until a probe had run, and the next stayed `—` when the workflow had no single daily schedule. Both held their place from the first paint.
- The month's probe cost and run count, which the card had shown at `text-2xl` on its right, became a small gray footnote at the bottom of the card, such as `Probe cost this month $0.031 · 3 runs`. The earlier months, listed under it before, moved into its tooltip, newest first, each with its cost and run count.
- `site/src/shared/i18n.ts` replaced the status strings `checked`, `next` and `month` with `lastProbe`, `nextProbe` and `cost`, in English and Chinese.
- The card reserved the room of its band's words and of the footnote from the build, so it no longer grew when the script filled them in.
