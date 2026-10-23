# CI coverage

`ci.yml` compares the complete PR diff with its base using `dorny/paths-filter`. `plan.py` selects clients for both Python and TypeScript. Each selected language workflow runs lint, offline tests, and the selected live model cases; TypeScript also builds. The languages run sequentially because they share API quotas.

| Change or event | Live model coverage |
| --- | --- |
| `src_py/mmsp/<client>/` or `src_ts/src/<client>/` | That client and its transitive dependents |
| `models.json` entries | Changed client groups, including removed entries |
| Shared code, test logic, dependencies, lockfiles, CI, or an unclassified path | All configured clients |
| Only docs, `site/`, artwork, or agent instructions | None |
| The status probe, `.github/status/` or `status.yml` ([its README](../status/README.md)) | None; lint and offline tests still run |
| PR to `main`, push to `main`, manual CI run | All configured clients |
| Package publication, including manual publication | All configured clients; both languages must pass before either package publishes |

All CI model runs set `RUN_SLOW_TEST=0`, including full coverage and publication gates. Full coverage means every client's default cases; cases marked `slow` remain opt-in for local runs. Missing keys for selected non-slow cases fail collection instead of silently dropping coverage. Fork PRs run offline checks only because repository secrets are unavailable. `mmsp` needs a user-provided server and remains optional through `MMSP_API_KEY`, `MMSP_BASE_URL`, and `MMSP_MODEL`; the vLLM adapter currently has offline coverage only.

Use **CI passed** as the required PR check. It runs even when no language jobs are needed and fails if selection or any required language job fails or is cancelled. Existing branch rules requiring the old standalone test job names must be updated to this check.

## Model catalog

`models.json` is shared by both test suites and grouped by the implementation client. Each case has `name`, `api_key_env`, optional `provider`, `client_type`, `base_url`, `slow`, and capability flags matching the Python `Model` fields. Omitted capabilities retain the test defaults. Use an explicit `client_type` for gateway model IDs without a known family. Group OpenAI embeddings under `openai-embedding`, including cases that use implicit official routing.

Add or update model cases here without changing the shared assertions in `test_client.py` or `client.test.ts`. `depends_on` records implementation dependencies, such as `openai-chat-vllm-adapter` depending on `openai-chat`. A new client group triggers full validation.

Local tests keep their existing key-gated, non-slow default. Both languages accept the same environment variables:

```sh
# Set before running pytest or npm test.
export MMSP_TEST_CLIENTS='["deepseek-official"]'
export RUN_SLOW_TEST=0
export MMSP_REQUIRE_KEYS=1
```

`MMSP_TEST_CLIENTS='["*"]'` selects all clients; `MMSP_TEST_CLIENTS='[]'` runs offline tests only. Set `RUN_SLOW_TEST=1` locally to additionally include slow cases. Unknown client names and invalid selection JSON fail. `MMSP_REQUIRE_KEYS=1` requires every selected case's key after slow-case filtering; omit it for local key-gated runs.

Check the planner without API access:

```sh
python3 -m unittest discover -s .github/ci -p 'test_*.py'
CHANGED_FILES='["src_py/mmsp/deepseek_official/client.py"]' python3 .github/ci/plan.py
```
