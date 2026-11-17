# The older SDK lines' offline tests run beside the live tests

- **Date:** 2026-11-17
- **Type:** process
- **Scope:** `ci`
- **PR:** [#338](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/338)

[中文版](2026-11-17-parallel-sdk-lines.zh.md)

## What changed

- The Python offline tests on `anthropic[bedrock]<2` and `==0.87.0`, and on `google-genai<3` and `==2.23.0`, moved out of the Python test job into `.github/workflows/pytest-sdk-lines.yml`, one job per line, which CI and the publication gate start beside the Python tests.
- They call no model, yet they had run after the live tests inside the job the TypeScript tests wait for, adding about 2 minutes to every run. **CI passed** and both publish jobs require them as before.
