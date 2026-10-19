"""Offline regression coverage for CI selection, including conservative fallbacks."""

import copy
import json
import unittest
from pathlib import Path

from plan import CATALOG_PATH, select_clients


ROOT = Path(__file__).resolve().parents[2]
CATALOG = json.loads((ROOT / CATALOG_PATH).read_text(encoding="utf-8"))


class SelectionTests(unittest.TestCase):
    def test_each_client_in_both_languages(self):
        for root, filename in (
            ("src_py/mmsp", "client.py"),
            ("src_ts/src", "client.ts"),
        ):
            for client in CATALOG:
                with self.subTest(root=root, client=client):
                    path = f"{root}/{client.replace('-', '_')}/{filename}"
                    selected = select_clients([path], CATALOG, CATALOG)
                    self.assertTrue(selected["checks"])
                    expected = {client}
                    if client == "openai-chat":
                        expected.add("openai-chat-vllm-adapter")
                    self.assertEqual(set(selected["clients"]), expected)

    def test_multiple_clients_and_renames(self):
        # A rename must account for both its deleted path and its added path.
        paths = [
            "src_py/mmsp/ant_messages/old.py",
            "src_ts/src/openai_responses/new.ts",
        ]
        self.assertEqual(
            select_clients(paths, CATALOG, CATALOG)["clients"],
            ["ant-messages", "openai-responses"],
        )

    def test_shared_and_unknown_changes_run_all(self):
        for path in (
            "src_py/mmsp/base_client.py",
            "src_ts/src/streamItems.ts",
            "src_py/mmsp/types.py",
            "src_ts/src/utils.ts",
            "src_py/mmsp/auto_client.py",
            "src_ts/src/registry.ts",
            "src_py/tests/test_client.py",
            "src_ts/tests/client.test.ts",
            "src_py/tests/conftest.py",
            "src_py/pyproject.toml",
            "src_ts/package-lock.json",
            "src_py/uv.lock",
            "src_ts/jest.config.js",
            ".github/workflows/ci.yml",
            ".github/workflows/pytest.yml",
            ".github/workflows/jest.yml",
            ".github/workflows/publish.yml",
            ".github/ci/plan.py",
            "src_py/mmsp/new_client/client.py",
        ):
            with self.subTest(path=path):
                self.assertEqual(select_clients([path], CATALOG, CATALOG)["clients"], ["*"])

    def test_documentation_only_skips_checks(self):
        paths = [
            "README.md",
            "site/src/pages/index.astro",
            "llmsdk_docs/gpt6/README.md",
            "changelog/unreleased/a.md",
        ]
        self.assertEqual(select_clients(paths, CATALOG, CATALOG)["checks"], False)
        self.assertEqual(select_clients(paths, CATALOG, CATALOG)["clients"], [])

    def test_documentation_does_not_hide_code_changes(self):
        paths = ["site/package-lock.json", "README.md", "src_py/mmsp/base_client.py"]
        self.assertEqual(select_clients(paths, CATALOG, CATALOG)["clients"], ["*"])

    def test_full_overrides_empty_or_documentation_diff(self):
        for paths in ([], ["README.md"], ["src_py/mmsp/deepseek_official/client.py"]):
            with self.subTest(paths=paths):
                result = select_clients(paths, CATALOG, CATALOG, full=True)
                self.assertTrue(result["checks"])
                self.assertEqual(result["clients"], ["*"])

    def test_catalog_edits_select_only_changed_groups(self):
        for client, group in CATALOG.items():
            if not group["models"]:
                continue
            for change in ("add", "remove", "edit"):
                with self.subTest(client=client, change=change):
                    updated = copy.deepcopy(CATALOG)
                    if change == "add":
                        updated[client]["models"].append({"name": "new-model", "api_key_env": "TEST_KEY"})
                    elif change == "remove":
                        updated[client]["models"].pop()
                    else:
                        updated[client]["models"][0]["name"] = "updated-model"
                    expected = {client}
                    if client == "openai-chat":
                        expected.add("openai-chat-vllm-adapter")
                    self.assertEqual(
                        set(select_clients([CATALOG_PATH], updated, CATALOG)["clients"]),
                        expected,
                    )

    def test_catalog_formatting_only_keeps_offline_checks(self):
        result = select_clients([CATALOG_PATH], CATALOG, CATALOG)
        self.assertTrue(result["checks"])
        self.assertEqual(result["clients"], [])

    def test_missing_catalog_or_new_client_runs_all(self):
        self.assertEqual(select_clients([CATALOG_PATH], CATALOG, None)["clients"], ["*"])
        updated = {**CATALOG, "new-client": {"models": []}}
        self.assertEqual(select_clients([CATALOG_PATH], updated, CATALOG)["clients"], ["*"])

    def test_transitive_dependents(self):
        catalog = {"a": {}, "b": {"depends_on": ["a"]}, "c": {"depends_on": ["b"]}}
        self.assertEqual(
            select_clients(["src_py/mmsp/a/client.py"], catalog, catalog)["clients"],
            ["a", "b", "c"],
        )

    def test_catalog_covers_every_client_directory(self):
        for root in ("src_py/mmsp", "src_ts/src"):
            directories = {
                p.name.replace("_", "-") for p in (ROOT / root).iterdir() if p.is_dir() and list(p.glob("client.*"))
            }
            self.assertEqual(directories, set(CATALOG))
        for client, group in CATALOG.items():
            self.assertLessEqual(set(group.get("depends_on", [])), set(CATALOG) - {client})
            for model in group["models"]:
                self.assertTrue(model["name"])
                self.assertTrue(model["api_key_env"].endswith("_API_KEY"))


if __name__ == "__main__":
    unittest.main()
