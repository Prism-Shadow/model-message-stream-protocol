# Copyright 2025 Prism Shadow. and/or its affiliates
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import json
import re
import socket
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

import pytest
from flask.testing import FlaskClient
from werkzeug.test import TestResponse

from mmsp.abort_signal import AbortSignal
from mmsp.integration import playground
from mmsp.integration.playground import create_chat_app
from mmsp.integration.server import SERVER_TEMPLATE, load_server_config


# The rows build real upstream clients, whose constructors reach no network, and the server listens
# on a port the system picks; nothing here reaches a vendor. Every start reads the saved config, so
# the tests save a table first, to a file of their own.


@pytest.fixture(autouse=True)
def _local_server(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    # the live checks reach the started server directly, whatever proxy the environment names
    monkeypatch.setenv("no_proxy", "127.0.0.1")
    monkeypatch.setenv("MMSP_SERVER_CONFIG", str(tmp_path / "server.json"))
    yield
    playground._stop_mmsp_server()


@pytest.fixture
def config_path(tmp_path: Path) -> Path:
    return tmp_path / "server.json"


@pytest.fixture
def client():
    with create_chat_app().test_client() as client:
        yield client


def _row(**overrides: str) -> dict[str, str]:
    return {
        "model_id": "gpt-5.5",
        "base_url": "http://127.0.0.1:1/v1",
        "api_key": "sk-test",
        "server_model_id": "gpt-5.5",
        "client_type": "openai-chat",
        **overrides,
    }


def _save(client: FlaskClient, models: list[Any], api_keys: list[Any] | None = None, **listen: Any) -> TestResponse:
    body = {"models": models, "api_keys": api_keys or [], "host": "127.0.0.1", "port": 0, **listen}
    response = client.put("/server/api/config", json=body)
    assert response.status_code == 200, response.get_json()
    return response


def _start(client: FlaskClient) -> TestResponse:
    return client.post("/server/api/start", json={})


def _restart(client: FlaskClient) -> TestResponse:
    return client.post("/server/api/restart", json={})


def _status(client: FlaskClient) -> dict[str, Any]:
    response = client.get("/server/api/status")
    assert response.status_code == 200
    return response.get_json()


def _metrics(client: FlaskClient) -> dict[str, Any]:
    response = client.get("/server/api/metrics")
    assert response.status_code == 200
    return response.get_json()


_WINDOW_ERROR = "window must be an integer number of seconds from 10 to 5184000."


def _model_ids(base_url: str, headers: dict[str, str] | None = None) -> list[str]:
    request = urllib.request.Request(base_url + "/models", headers=headers or {})
    with urllib.request.urlopen(request, timeout=5) as response:
        return [model["id"] for model in json.load(response)["data"]]


def test_server_page_is_served(client: FlaskClient):
    response = client.get("/server/")

    assert response.status_code == 200
    assert SERVER_TEMPLATE.count("__PLAYGROUND_DEFAULTS__") == 1
    assert b"<title>MMSP Server</title>" in response.data
    assert b'<span class="brand-sub">Server</span>' in response.data
    for element_id in (
        "modelRows",
        "addRowButton",
        "apiKeyRows",
        "addKeyButton",
        "keysNote",
        "hostInput",
        "portInput",
        "serverToggle",
        "serverToggleLabel",
        "statusDot",
        "statusText",
        "statusUrl",
        "statusMeta",
        "statusOpen",
        "statusUptime",
        "statusStreaming",
        "serverError",
        "themeToggle",
        "saveButton",
        "applyButton",
        "copyUrlButton",
        "tableHead",
        "saveKey",
        "configPath",
        "listenState",
        "tabs",
        "tabOverview",
        "tabModels",
        "tabSettings",
        "panelOverview",
        "panelModels",
        "panelSettings",
        "checklist",
        "checklistSave",
        "dashboard",
        "rangeControl",
        "rangeWrap",
        "rangeCustom",
        "rangeCustomLabel",
        "rangePopover",
        "rangeFrom",
        "rangeTo",
        "rangeSince",
        "rangeError",
        "rangeApply",
        "fileCard",
        "fileNote",
        "fileView",
        "fileReveal",
        "fileCopy",
        "tiles",
        "tileRequests",
        "tileSuccess",
        "tileLatencyP50",
        "tileLatencyP90",
        "tileTokens",
        "tileTps",
        "modelCards",
        "requestsChart",
        "latencyChart",
        "errorList",
        "chartTip",
        "openBanner",
        "openBannerUrl",
        "openBannerAction",
        "startDialog",
        "startDialogTitle",
        "startDialogUrl",
        "startDialogModels",
        "startDialogKeys",
        "startDialogNote",
        "startDialogWarning",
        "startDialogCancel",
        "startDialogConfirm",
        "testAllButton",
    ):
        assert f'id="{element_id}"'.encode() in response.data, element_id
    for text in (
        "addRow(",
        "removeRow(",
        "addKey(",
        "removeKey(",
        "handleModelIdInput(",
        "handleRowClientType(",
        "toggleKeyVisibility(this)",
        "collectConfig()",
        "saveDraft()",
        "restoreTable()",
        "loadServerConfig()",
        "saveServerConfig()",
        "restartServer()",
        "renderStates()",
        "rowKey(",
        "configKey(",
        "refreshStatus()",
        "renderStatus(",
        "toggleServer()",
        "startServer()",
        "stopServer()",
        "markRow(",
        "fetchMetrics()",
        "renderMetrics(",
        "renderActions()",
        "renderRow(",
        "toggleRow(",
        "handleShortcut(",
        "showTab(",
        "handleTabKeydown(",
        "setRange(",
        "setCustomRange(",
        "applyCustomRange(",
        "toggleRangePopover(",
        "handleRangeKeydown(",
        "renderFile(",
        "maskKeys(",
        "renderJson(",
        "copyFile(",
        "toggleFileKeys(",
        "formatStamp(",
        "formatDay(",
        "renderOverview(",
        "renderTiles(",
        "renderModelCards(",
        "openModel(",
        "handleCardKeydown(",
        "renderRequestsChart(",
        "renderLatencyChart(",
        "renderErrors(",
        "renderChecklist(",
        "sparkline(",
        "mergeBuckets(",
        "attachTooltip(",
        "formatCompact(",
        "formatTps(",
        "?window=",
        "?from=",
        "&columns=",
        'data-range="2592000"',
        'data-range="custom"',
        'type="datetime-local"',
        'role="dialog"',
        ">15 min<",
        ">30 d<",
        "Not saved yet",
        "Show keys",
        "tokens_out",
        "generation_ms",
        "Apply to serve",
        "Start to serve",
        'class="models-grid"',
        'role="tablist"',
        'role="tabpanel"',
        'aria-label="Range"',
        "mmsp.playground.server",
        "mmsp.playground.server.range",
        "mmsp.playground.theme",
        "/server/api",
        "/server/api/metrics",
        '"openai-official"',
        "setTheme('dark')",
        ">Auto<",
        'placeholder="Default"',
        'data-state="unsaved"',
        "testRow(",
        "testAll()",
        "runTest(",
        "postJson('/test'",
        "openStartDialog(",
        "confirmStartDialog()",
        "closeStartDialog()",
        "handleDialogKeydown(",
        "handleDialogClose()",
        "addKeyFromBanner()",
        "<dialog",
        "Start the server?",
        "Apply the saved file?",
        "Add a key",
        "Model id and key first",
        "TEST_LABELS",
        "Passed",
        "no usage reported",
    ):
        assert text.encode() in response.data, text
    # the state words are set by the script
    assert re.search(rb"STATE_LABELS = \{[^}]*'Live'", response.data)
    for text in (
        # the server hands the page its client types and their default endpoints
        "__PLAYGROUND_DEFAULTS__",
        # a client type no longer fills the base URL
        "filledBaseUrl",
        "restoreDraft()",
        "In effect",
        "<select",
        "0.6",
        # p50 and p90 are two values, never a range (formatRangeLabel names a time range), and the header
        # names no models
        "formatRange(",
        "p50–p90",
        "statusModels",
        "overviewRows",
        "Dashboard at",
        # 15 minutes is the shortest range, and the server's arrays cover the whole range; the old label
        # in its tags, since "5 min" is part of "15 min"
        'data-range="300"',
        ">5 min<",
        "windowColumns(",
        # the file is a card of its own
        "file-line",
        # the page asks with its own dialog, never the browser's
        "confirm(",
        "alert(",
    ):
        assert text.encode() not in response.data, text


def test_status_is_stopped_before_a_start(client: FlaskClient):
    assert _status(client) == {"running": False}


def test_config_is_absent_before_a_save(client: FlaskClient, config_path: Path):
    response = client.get("/server/api/config")

    assert response.status_code == 200
    assert response.get_json() == {"path": str(config_path), "exists": False, "config": None, "text": None}
    assert list(response.get_json()) == ["path", "exists", "config", "text"]


def test_save_writes_the_cli_config_file_and_reads_it_back(
    client: FlaskClient, config_path: Path, monkeypatch: pytest.MonkeyPatch
):
    auto_row = {"model_id": "claude-sonnet-5-5", "api_key": "$PROBE_UPSTREAM_KEY", "server_model_id": "claude"}
    # a column the CLI does not read is not saved
    typed_row = {**_row(), "note": "dropped"}

    response = client.put(
        "/server/api/config",
        json={
            "models": [auto_row, typed_row],
            "api_keys": ["$PROBE_SERVER_KEY"],
            "host": "127.0.0.1",
            "port": 25760.0,
        },
    )

    saved = {
        "models": [
            auto_row,
            {
                "model_id": "gpt-5.5",
                "base_url": "http://127.0.0.1:1/v1",
                "api_key": "sk-test",
                "server_model_id": "gpt-5.5",
                "client_type": "openai-chat",
            },
        ],
        "api_keys": ["$PROBE_SERVER_KEY"],
        "host": "127.0.0.1",
        "port": 25760,
    }
    text = config_path.read_text(encoding="utf-8")
    assert response.status_code == 200
    # the text it wrote, which the File card shows
    assert response.get_json() == {"path": str(config_path), "exists": True, "config": saved, "text": text}
    assert list(response.get_json()["config"]["models"][1]) == [
        "model_id",
        "base_url",
        "api_key",
        "server_model_id",
        "client_type",
    ]
    assert text == json.dumps(saved, ensure_ascii=False, indent=2) + "\n"
    assert client.get("/server/api/config").get_json() == response.get_json()

    # the file is the CLI's: it resolves the references and leaves host and port to the flags
    monkeypatch.setenv("PROBE_UPSTREAM_KEY", "sk-probe")
    monkeypatch.setenv("PROBE_SERVER_KEY", "srv")
    assert load_server_config(config_path) == {
        "models": [{**auto_row, "api_key": "sk-probe"}, saved["models"][1]],
        "api_keys": ["srv"],
    }

    # absent keys, host and port take their defaults
    defaults = client.put("/server/api/config", json={"models": []})
    assert defaults.status_code == 200
    assert defaults.get_json()["config"] == {"models": [], "api_keys": [], "host": "127.0.0.1", "port": 25752}


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ([], "Request body must be a JSON object."),
        ({"models": "x"}, "the config must be a JSON object with a models list."),
        ({"models": [], "api_keys": "k"}, "api_keys must be a list."),
        ({"models": ["x"]}, "models[0] must be an object."),
        ({"models": [_row(), {**_row(), "client_type": None}]}, "models[1]: client_type must be a string."),
        ({"models": [], "api_keys": ["k", 1]}, "api_keys[1] must be a string."),
        ({"models": [], "host": ""}, "host must be a non-empty string."),
        ({"models": [], "host": 5}, "host must be a non-empty string."),
        ({"models": [], "port": "abc"}, "port must be an integer between 0 and 65535."),
        ({"models": [], "port": 70000}, "port must be an integer between 0 and 65535."),
        ({"models": [], "port": True}, "port must be an integer between 0 and 65535."),
    ],
)
def test_save_refuses_a_malformed_body(client: FlaskClient, config_path: Path, body: Any, message: str):
    response = client.put("/server/api/config", json=body)

    assert response.status_code == 400
    assert response.get_json() == {"error": message}
    assert not config_path.exists()


def test_save_reports_an_unreadable_file(client: FlaskClient, config_path: Path):
    config_path.write_text("not json", encoding="utf-8")

    unreadable = client.get("/server/api/config")
    refused = _start(client)

    message = f"{config_path}: not valid JSON: Expecting value: line 1 column 1 (char 0)"
    assert unreadable.status_code == 200
    assert unreadable.get_json() == {
        "path": str(config_path),
        "exists": True,
        "config": None,
        "text": "not json",
        "error": message,
    }
    assert list(unreadable.get_json()) == ["path", "exists", "config", "text", "error"]
    assert (refused.status_code, refused.get_json()) == (400, {"error": message})

    config_path.write_text("[]", encoding="utf-8")
    assert client.get("/server/api/config").get_json()["error"] == (
        f"{config_path}: the config must be a JSON object with a models list."
    )

    # a file the CLI wrote: no host or port, which take their defaults
    config_path.write_text(json.dumps({"models": [_row()]}), encoding="utf-8")
    assert client.get("/server/api/config").get_json()["config"] == {
        "models": [_row()],
        "api_keys": [],
        "host": "127.0.0.1",
        "port": 25752,
    }

    # a host or a port the page could not have saved is refused at start
    config_path.write_text(json.dumps({"models": [_row()], "port": "abc"}), encoding="utf-8")
    refused = _start(client)
    assert (refused.status_code, refused.get_json()) == (
        400,
        {"error": "port must be an integer between 0 and 65535."},
    )
    assert _status(client) == {"running": False}


def test_save_reports_a_file_it_cannot_write(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    # the directory the file would go in is a file
    (tmp_path / "taken").write_text("", encoding="utf-8")
    path = tmp_path / "taken" / "server.json"
    monkeypatch.setenv("MMSP_SERVER_CONFIG", str(path))

    with create_chat_app().test_client() as client:
        response = client.put("/server/api/config", json={"models": [_row()]})

    assert response.status_code == 500
    assert response.get_json()["error"].startswith(f"Cannot write {path}: ")


def test_start_without_a_saved_config_is_refused(client: FlaskClient, config_path: Path):
    response = _start(client)

    assert response.status_code == 400
    assert response.get_json() == {"error": f"No saved config at {config_path}; save the table first."}
    assert _status(client) == {"running": False}


def test_start_serves_the_saved_table_and_stop_closes_it(client: FlaskClient):
    saved = _save(
        client,
        [_row(), _row(model_id="claude-sonnet-5-5", server_model_id="claude", client_type="ant-messages")],
    ).get_json()["config"]

    response = _start(client)

    assert response.status_code == 200
    status = response.get_json()
    assert list(status) == ["running", "host", "port", "base_url", "models", "open", "config"]
    port = status["port"]
    assert status["running"] is True
    assert port > 0
    assert status["base_url"] == f"http://127.0.0.1:{port}/v1"
    assert status["models"] == ["gpt-5.5", "claude"]
    assert status["open"] is True
    # the config as saved, with the port it names rather than the one the system chose
    assert status["config"] == saved
    assert _model_ids(status["base_url"]) == ["gpt-5.5", "claude"]
    with urllib.request.urlopen(status["base_url"] + "/metrics", timeout=5) as metrics:
        assert metrics.status == 200
        assert [model["id"] for model in json.load(metrics)["models"]] == ["gpt-5.5", "claude"]
    assert _status(client) == status

    stopped = client.post("/server/api/stop", json={})
    assert stopped.status_code == 200
    assert stopped.get_json() == {"running": False}
    assert _status(client) == {"running": False}
    with pytest.raises(urllib.error.URLError):
        _model_ids(status["base_url"])


def test_metrics_are_read_in_process(client: FlaskClient, tmp_path: Path):
    assert _metrics(client) == {"running": False}
    # the query is read first, also when nothing runs
    refused = client.get("/server/api/metrics?window=x")
    assert (refused.status_code, refused.get_json()) == (400, {"error": _WINDOW_ERROR})
    # a server with a key, which the page does not hold
    _save(
        client,
        [_row(), _row(model_id="claude-sonnet-5-5", server_model_id="claude", client_type="ant-messages")],
        api_keys=["srv"],
    )
    status = _start(client).get_json()
    key = {"Authorization": "Bearer srv"}

    metrics = _metrics(client)

    assert metrics["running"] is True
    assert [model["id"] for model in metrics["models"]] == status["models"]
    assert metrics["requests"] == 0
    # running first, then the snapshot in the order GET /v1/metrics reports it
    served = urllib.request.Request(status["base_url"] + "/metrics", headers=key)
    with urllib.request.urlopen(served, timeout=5) as response:
        assert list(metrics) == ["running", *json.load(response)]

    unknown = urllib.request.Request(
        status["base_url"] + "/stream",
        data=json.dumps({"model": "nope", "messages": []}).encode(),
        headers={**key, "Content-Type": "application/json"},
    )
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        urllib.request.urlopen(unknown, timeout=5)
    assert exc_info.value.code == 404
    assert _metrics(client)["refused"] == {"unauthorized": 0, "invalid_request": 0, "unknown_model": 1}
    assert "window" not in _metrics(client)

    windowed = client.get("/server/api/metrics?window=300")
    assert windowed.status_code == 200
    assert list(windowed.get_json()) == [*_metrics(client), "window"]
    window = windowed.get_json()["window"]
    assert window["seconds"] == 300
    assert sum(window["total"]["series"]["refused"]) == 1
    refused = client.get("/server/api/metrics?window=x")
    assert (refused.status_code, refused.get_json()) == (400, {"error": _WINDOW_ERROR})
    mixed = client.get("/server/api/metrics?from=1&to=2&window=3")
    assert (mixed.status_code, mixed.get_json()) == (400, {"error": "window cannot be combined with from and to."})

    # a restart serves a new server, counted from zero, which continues the history
    _restart(client)
    assert _metrics(client)["refused"]["unknown_model"] == 0
    assert client.get("/server/api/metrics?window=300").get_json()["window"]["total"]["refused"] == 1

    # stopped, the page reads the history the server wrote beside the config
    client.post("/server/api/stop", json={})
    stopped = _metrics(client)
    assert list(stopped) == ["running", "since", "errors"]
    assert (stopped["running"], stopped["errors"]) == (False, [])
    assert isinstance(stopped["since"], int)
    history = client.get("/server/api/metrics?window=300").get_json()
    assert list(history) == ["running", "since", "errors", "window"]
    assert history["window"]["total"]["refused"] == 1
    assert (tmp_path / "server-metrics.json").exists()


def test_metrics_history_is_absent_until_the_server_counted_something(client: FlaskClient, tmp_path: Path):
    _save(client, [_row()])
    _start(client)
    client.post("/server/api/stop", json={})

    assert _metrics(client) == {"running": False}
    assert not (tmp_path / "server-metrics.json").exists()


def test_start_and_stop_print_the_console_lines(client: FlaskClient, capsys: pytest.CaptureFixture[str]):
    _save(client, [_row(), _row(model_id="claude-sonnet-5-5", server_model_id="claude", client_type="ant-messages")])
    capsys.readouterr()

    port = _start(client).get_json()["port"]
    started = capsys.readouterr().out
    client.post("/server/api/stop", json={})
    stopped = capsys.readouterr().out

    assert started == (
        f"Starting MMSP server at http://127.0.0.1:{port}/v1\n"
        "Serving models: gpt-5.5, claude\n"
        "Open server: api_keys is empty, every request is accepted\n"
    )
    assert stopped == f"Stopped MMSP server at http://127.0.0.1:{port}/v1\n"
    # stopping a stopped server says nothing
    client.post("/server/api/stop", json={})
    assert capsys.readouterr().out == ""


def test_start_while_running_is_refused(client: FlaskClient):
    _save(client, [_row()])
    first = _start(client)
    assert first.status_code == 200
    _save(client, [_row(model_id="gpt-5.6", server_model_id="gpt-5.6")])

    second = _start(client)

    assert second.status_code == 409
    assert second.get_json() == {"error": "The server is running; stop it first."}
    assert _model_ids(first.get_json()["base_url"]) == ["gpt-5.5"]
    assert _status(client) == first.get_json()


def test_stop_when_stopped_is_fine(client: FlaskClient):
    response = client.post("/server/api/stop", json={})

    assert response.status_code == 200
    assert response.get_json() == {"running": False}


def test_restart_applies_the_saved_table(client: FlaskClient, capsys: pytest.CaptureFixture[str]):
    _save(client, [_row()])
    first = _start(client).get_json()
    saved = _save(client, [_row(model_id="gpt-5.6", server_model_id="gpt-5.6")], api_keys=["srv"]).get_json()
    capsys.readouterr()

    response = _restart(client)

    assert response.status_code == 200
    status = response.get_json()
    assert status["models"] == ["gpt-5.6"]
    assert status["open"] is False
    assert status["config"] == saved["config"]
    assert _status(client) == status
    assert _model_ids(status["base_url"], {"Authorization": "Bearer srv"}) == ["gpt-5.6"]
    with pytest.raises(urllib.error.URLError):
        _model_ids(first["base_url"])
    assert capsys.readouterr().out == (
        f"Stopped MMSP server at {first['base_url']}\n"
        f"Starting MMSP server at {status['base_url']}\n"
        "Serving models: gpt-5.6\n"
    )


def test_restart_keeps_the_old_server_when_the_new_table_is_refused(
    client: FlaskClient, monkeypatch: pytest.MonkeyPatch
):
    _save(client, [_row()])
    running = _start(client).get_json()

    _save(client, [_row(client_type="nope")])
    unknown = _restart(client)
    monkeypatch.delenv("NOPE_KEY", raising=False)
    _save(client, [_row(api_key="$NOPE_KEY")])
    unset = _restart(client)
    _save(client, [_row(), _row()])
    duplicate = _restart(client)

    assert unknown.status_code == 400
    assert unknown.get_json()["error"].startswith("models[0] 'gpt-5.5': Unknown client type")
    assert (unset.status_code, unset.get_json()) == (
        400,
        {"error": "models[0].api_key references $NOPE_KEY, which is not set in the environment."},
    )
    assert (duplicate.status_code, duplicate.get_json()) == (
        400,
        {"error": "models[1]: server_model_id 'gpt-5.5' is already used by models[0]."},
    )
    assert _status(client) == running
    assert _model_ids(running["base_url"]) == ["gpt-5.5"]


def test_restart_that_cannot_listen_leaves_the_server_stopped(client: FlaskClient):
    _save(client, [_row()])
    _start(client)

    with socket.socket() as taken:
        taken.bind(("127.0.0.1", 0))
        taken.listen(1)
        port = taken.getsockname()[1]
        _save(client, [_row()], port=port)

        response = _restart(client)

    assert response.status_code == 400
    assert response.get_json()["error"].startswith(f"Cannot listen on 127.0.0.1:{port}: ")
    # the status says the old server is gone; its port is free for any test running beside this one
    assert _status(client) == {"running": False}


def test_restart_when_stopped_starts(client: FlaskClient):
    _save(client, [_row()])

    response = _restart(client)

    assert response.status_code == 200
    assert response.get_json()["running"] is True
    assert _model_ids(response.get_json()["base_url"]) == ["gpt-5.5"]
    assert _status(client) == response.get_json()


def test_start_names_the_row_the_server_refuses(client: FlaskClient):
    _save(client, [_row(client_type="nope")])
    unknown = _start(client)
    assert unknown.status_code == 400
    assert unknown.get_json()["error"].startswith("models[0] 'gpt-5.5': Unknown client type")

    _save(client, [{name: value for name, value in _row().items() if name != "api_key"}])
    keyless = _start(client)
    assert keyless.status_code == 400
    assert keyless.get_json() == {"error": "models[0]: api_key must be a non-empty string."}

    _save(client, [_row()], api_keys=[""])
    empty_key = _start(client)
    assert (empty_key.status_code, empty_key.get_json()) == (400, {"error": "api_keys[0] must be a non-empty string."})

    _save(client, [])
    empty = _start(client)
    assert (empty.status_code, empty.get_json()) == (
        400,
        {"error": "models is empty: the server needs at least one model row."},
    )
    assert _status(client) == {"running": False}


def test_start_resolves_environment_references(client: FlaskClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("PROBE_UPSTREAM_KEY", "sk-probe")
    monkeypatch.setenv("PROBE_SERVER_KEY", "srv")
    saved = _save(client, [_row(api_key="$PROBE_UPSTREAM_KEY")], api_keys=["${PROBE_SERVER_KEY}"]).get_json()

    response = _start(client)

    assert response.status_code == 200
    base_url = response.get_json()["base_url"]
    assert response.get_json()["open"] is False
    # the status keeps the references as typed
    assert response.get_json()["config"] == saved["config"]
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        _model_ids(base_url)
    assert exc_info.value.code == 401
    assert _model_ids(base_url, {"Authorization": "Bearer srv"}) == ["gpt-5.5"]

    client.post("/server/api/stop", json={})
    monkeypatch.delenv("NOPE_KEY", raising=False)
    _save(client, [_row(api_key="$NOPE_KEY")])
    unset = _start(client)
    assert unset.status_code == 400
    assert unset.get_json() == {
        "error": "models[0].api_key references $NOPE_KEY, which is not set in the environment."
    }
    assert _status(client) == {"running": False}


def test_start_reports_a_port_in_use(client: FlaskClient):
    with socket.socket() as taken:
        taken.bind(("127.0.0.1", 0))
        taken.listen(1)
        port = taken.getsockname()[1]
        _save(client, [_row()], port=port)

        response = _start(client)

    assert response.status_code == 400
    message = response.get_json()["error"]
    assert message.startswith(f"Cannot listen on 127.0.0.1:{port}: ")
    assert "in use" in message.lower()
    assert _status(client) == {"running": False}


def test_start_builds_an_auto_row(client: FlaskClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("CLIENT_TYPE", raising=False)
    _save(client, [{"model_id": "gpt-5.5", "api_key": "sk-test", "server_model_id": "gpt-5.5"}])

    response = _start(client)

    assert response.status_code == 200
    assert response.get_json()["models"] == ["gpt-5.5"]
    assert response.get_json()["config"]["models"] == [
        {"model_id": "gpt-5.5", "api_key": "sk-test", "server_model_id": "gpt-5.5"}
    ]
    assert _model_ids(response.get_json()["base_url"]) == ["gpt-5.5"]


def _test_body(client: FlaskClient, **row: Any) -> TestResponse:
    return client.post("/server/api/test", json={"model": row})


def _probe_client(
    captured: dict[str, Any], events: list[dict[str, Any]] | None = None, error: Exception | None = None
):
    """A client class that records how it was built and asked, then streams `events` or raises `error`."""

    class ProbeClient:
        def __init__(self, model, api_key=None, base_url=None, client_type=None, default_headers=None):
            captured["options"] = {
                "model": model,
                "api_key": api_key,
                "base_url": base_url,
                "client_type": client_type,
            }
            captured["default_headers"] = default_headers

        async def streaming_response(self, messages, config, signal=None):
            captured["messages"] = messages
            captured["config"] = config
            captured["signal"] = signal
            for event in events or []:
                yield event
            if error is not None:
                raise error

    return ProbeClient


def _event(event_type: str, items: list[dict[str, Any]], usage: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "role": "assistant",
        "event_type": event_type,
        "content_items": items,
        "usage_metadata": usage,
        "finish_reason": "stop" if event_type == "stop" else None,
    }


_USAGE = {"cached_tokens": None, "prompt_tokens": 3, "thoughts_tokens": None, "response_tokens": 1}
_ANSWER = [_event("delta", [{"type": "text.delta", "text": "1 2 3"}]), _event("stop", [], _USAGE)]


def test_test_reports_a_reachable_upstream(client: FlaskClient, monkeypatch: pytest.MonkeyPatch):
    captured: dict[str, Any] = {}
    monkeypatch.setattr(playground, "AutoLLMClient", _probe_client(captured, _ANSWER))

    response = _test_body(client, **_row())

    assert response.status_code == 200
    body = response.get_json()
    assert list(body) == ["ok", "first_token_ms", "total_ms", "tokens_out", "tps"]
    assert body["ok"] is True
    assert isinstance(body["first_token_ms"], int) and isinstance(body["total_ms"], int)
    assert body["tokens_out"] == 1
    assert isinstance(body["tps"], float)
    # built as create_server_app builds a row; the served id is not the upstream's business
    assert captured["options"] == {
        "model": "gpt-5.5",
        "api_key": "sk-test",
        "base_url": "http://127.0.0.1:1/v1",
        "client_type": "openai-chat",
    }
    assert captured["default_headers"] is None
    assert captured["messages"] == [
        {"role": "user", "content_items": [{"type": "text.done", "text": playground.TEST_PROMPT}]}
    ]
    assert captured["config"] == {"max_tokens": 512}
    assert isinstance(captured["signal"], AbortSignal)


def test_test_reports_missing_usage(client: FlaskClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(playground, "AutoLLMClient", _probe_client({}, [_ANSWER[0], _event("stop", [], None)]))

    body = _test_body(client, **_row()).get_json()

    assert body["ok"] is True
    assert isinstance(body["first_token_ms"], int)
    assert body["tokens_out"] is None and body["tps"] is None


def test_test_times_the_first_token_not_an_early_stop(client: FlaskClient, monkeypatch: pytest.MonkeyPatch):
    # Anthropic reports usage in a stop event at message_start, before any token; a stream of no tokens has no rate
    early_stop = [_event("stop", [], _USAGE), _event("stop", [], _USAGE)]
    monkeypatch.setattr(playground, "AutoLLMClient", _probe_client({}, early_stop))

    body = _test_body(client, **_row()).get_json()

    assert body["ok"] is True
    assert body["first_token_ms"] is None
    assert body["tokens_out"] == 1 and body["tps"] is None


def test_test_reports_an_upstream_failure(client: FlaskClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        playground, "AutoLLMClient", _probe_client({}, error=RuntimeError("Error code: 401 - bad key"))
    )
    response = _test_body(client, **_row())
    assert (response.status_code, response.get_json()) == (200, {"ok": False, "error": "Error code: 401 - bad key"})

    # a client's own timeout is the client's message, named by its class when it carries none
    monkeypatch.setattr(playground, "AutoLLMClient", _probe_client({}, error=TimeoutError()))
    assert _test_body(client, **_row()).get_json() == {"ok": False, "error": "TimeoutError"}


def test_test_resolves_environment_references(client: FlaskClient, monkeypatch: pytest.MonkeyPatch):
    captured: dict[str, Any] = {}
    monkeypatch.setattr(playground, "AutoLLMClient", _probe_client(captured, _ANSWER))
    monkeypatch.setenv("PROBE_UPSTREAM_KEY", "sk-probe")

    assert _test_body(client, **_row(api_key="$PROBE_UPSTREAM_KEY")).get_json()["ok"] is True
    assert captured["options"]["api_key"] == "sk-probe"

    captured.clear()
    monkeypatch.delenv("NOPE_KEY", raising=False)
    response = _test_body(client, **_row(api_key="$NOPE_KEY"))
    assert response.status_code == 200
    assert response.get_json() == {
        "ok": False,
        "error": "api_key references $NOPE_KEY, which is not set in the environment.",
    }
    assert captured == {}


def test_test_names_a_client_that_cannot_build(client: FlaskClient):
    body = _test_body(client, **_row(client_type="nope")).get_json()

    assert body["ok"] is False
    assert body["error"].startswith("Unknown client type 'nope'")


def test_test_times_out(monkeypatch: pytest.MonkeyPatch):
    captured: dict[str, Any] = {}

    class SilentClient:
        def __init__(self, model, api_key=None, base_url=None, client_type=None, default_headers=None):
            pass

        async def streaming_response(self, messages, config, signal=None):
            captured["signal"] = signal
            await signal.wait()
            raise RuntimeError("aborted")
            yield  # an async generator, as a client's stream is

    monkeypatch.setattr(playground, "AutoLLMClient", SilentClient)

    assert playground._test_upstream(_row(), timeout_s=0.05) == {"ok": False, "error": "No answer within 0.05 s."}
    assert captured["signal"].aborted


class _NeverBuilt:
    def __init__(self, *args: Any, **kwargs: Any):
        raise AssertionError("a refused body builds no client")


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ([], "Request body must be a JSON object."),
        ({"model": "x"}, "model must be an object."),
        ({"model": {**_row(), "client_type": 5}}, "client_type must be a string."),
        ({"model": {k: v for k, v in _row().items() if k != "api_key"}}, "api_key must be a non-empty string."),
        ({"model": {**_row(), "model_id": ""}}, "model_id must be a non-empty string."),
    ],
)
def test_test_refuses_a_malformed_body(client: FlaskClient, monkeypatch: pytest.MonkeyPatch, body: Any, message: str):
    monkeypatch.setattr(playground, "AutoLLMClient", _NeverBuilt)

    response = client.post("/server/api/test", json=body)

    assert response.status_code == 400
    assert response.get_json() == {"error": message}
