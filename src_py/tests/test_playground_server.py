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
import socket
import urllib.error
import urllib.request
from typing import Any

import pytest
from flask.testing import FlaskClient
from werkzeug.test import TestResponse

from mmsp.integration import playground
from mmsp.integration.playground import create_chat_app


# The rows build real upstream clients, whose constructors reach no network, and the server listens
# on a port the system picks; nothing here reaches a vendor.


@pytest.fixture(autouse=True)
def _local_server(monkeypatch: pytest.MonkeyPatch):
    # the live checks reach the started server directly, whatever proxy the environment names
    monkeypatch.setenv("no_proxy", "127.0.0.1")
    yield
    playground._stop_mmsp_server()


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


def _start(client: FlaskClient, **body: Any) -> TestResponse:
    return client.post("/server/api/start", json={"host": "127.0.0.1", "port": 0, **body})


def _status(client: FlaskClient) -> dict[str, Any]:
    response = client.get("/server/api/status")
    assert response.status_code == 200
    return response.get_json()


def _model_ids(base_url: str, headers: dict[str, str] | None = None) -> list[str]:
    request = urllib.request.Request(base_url + "/models", headers=headers or {})
    with urllib.request.urlopen(request, timeout=5) as response:
        return [model["id"] for model in json.load(response)["data"]]


def test_server_page_is_served(client: FlaskClient):
    response = client.get("/server/")

    assert response.status_code == 200
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
        "statusModels",
        "serverError",
        "keyVisibilityToggle",
        "themeToggle",
    ):
        assert f'id="{element_id}"'.encode() in response.data, element_id
    for text in (
        "addRow(",
        "removeRow(",
        "addKey(",
        "removeKey(",
        "handleModelIdInput(",
        "handleRowClientType(",
        "toggleKeyVisibility()",
        "collectConfig()",
        "saveDraft()",
        "restoreDraft()",
        "refreshStatus()",
        "renderStatus(",
        "toggleServer()",
        "startServer()",
        "stopServer()",
        "markRow(",
        "mmsp.playground.server",
        "mmsp.playground.theme",
        "/server/api",
        '"openai-official"',
        "setTheme('dark')",
    ):
        assert text.encode() in response.data, text
    # the server hands the page its client types and their default endpoints
    assert b"__PLAYGROUND_DEFAULTS__" not in response.data
    assert b"<select" not in response.data
    assert b"0.6" not in response.data


def test_status_is_stopped_before_a_start(client: FlaskClient):
    assert _status(client) == {"running": False}


def test_start_serves_the_table_and_stop_closes_it(client: FlaskClient):
    response = _start(
        client,
        models=[_row(), _row(model_id="claude-sonnet-5-5", server_model_id="claude", client_type="ant-messages")],
    )

    assert response.status_code == 200
    status = response.get_json()
    assert list(status) == ["running", "host", "port", "base_url", "models", "open"]
    port = status["port"]
    assert status["running"] is True
    assert port > 0
    assert status["base_url"] == f"http://127.0.0.1:{port}/v1"
    assert status["models"] == ["gpt-5.5", "claude"]
    assert status["open"] is True
    assert _model_ids(status["base_url"]) == ["gpt-5.5", "claude"]
    assert _status(client) == status

    stopped = client.post("/server/api/stop", json={})
    assert stopped.status_code == 200
    assert stopped.get_json() == {"running": False}
    assert _status(client) == {"running": False}
    with pytest.raises(urllib.error.URLError):
        _model_ids(status["base_url"])


def test_start_while_running_is_refused(client: FlaskClient):
    first = _start(client, models=[_row()])
    assert first.status_code == 200

    second = _start(client, models=[_row(model_id="gpt-5.6", server_model_id="gpt-5.6")])

    assert second.status_code == 409
    assert second.get_json() == {"error": "The server is running; stop it first."}
    assert _model_ids(first.get_json()["base_url"]) == ["gpt-5.5"]
    assert _status(client) == first.get_json()


def test_stop_when_stopped_is_fine(client: FlaskClient):
    response = client.post("/server/api/stop", json={})

    assert response.status_code == 200
    assert response.get_json() == {"running": False}


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ([], "Request body must be a JSON object."),
        ({"models": "x"}, "the config must be a JSON object with a models list."),
        ({"models": [], "api_keys": "k"}, "api_keys must be a list."),
        ({"models": []}, "models is empty: the server needs at least one model row."),
        ({"models": [_row()], "port": "abc"}, "port must be an integer between 0 and 65535."),
        ({"models": [_row()], "port": 70000}, "port must be an integer between 0 and 65535."),
        ({"models": [_row()], "port": True}, "port must be an integer between 0 and 65535."),
        ({"models": [_row()], "host": ""}, "host must be a non-empty string."),
    ],
)
def test_start_refuses_a_malformed_body(client: FlaskClient, body: Any, message: str):
    response = client.post("/server/api/start", json=body)

    assert response.status_code == 400
    assert response.get_json() == {"error": message}
    assert _status(client) == {"running": False}


def test_start_names_the_row_the_server_refuses(client: FlaskClient):
    unknown = _start(client, models=[_row(client_type="nope")])
    assert unknown.status_code == 400
    assert unknown.get_json()["error"].startswith("models[0] 'gpt-5.5': Unknown client type")

    keyless = _start(client, models=[{name: value for name, value in _row().items() if name != "api_key"}])
    assert keyless.status_code == 400
    assert keyless.get_json() == {"error": "models[0]: api_key must be a non-empty string."}
    assert _status(client) == {"running": False}


def test_start_resolves_environment_references(client: FlaskClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("PROBE_UPSTREAM_KEY", "sk-probe")
    monkeypatch.setenv("PROBE_SERVER_KEY", "srv")

    response = _start(client, models=[_row(api_key="$PROBE_UPSTREAM_KEY")], api_keys=["${PROBE_SERVER_KEY}"])

    assert response.status_code == 200
    base_url = response.get_json()["base_url"]
    assert response.get_json()["open"] is False
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        _model_ids(base_url)
    assert exc_info.value.code == 401
    assert _model_ids(base_url, {"Authorization": "Bearer srv"}) == ["gpt-5.5"]

    client.post("/server/api/stop", json={})
    monkeypatch.delenv("NOPE_KEY", raising=False)
    unset = _start(client, models=[_row(api_key="$NOPE_KEY")])
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

        response = _start(client, models=[_row()], port=port)

    assert response.status_code == 400
    message = response.get_json()["error"]
    assert message.startswith(f"Cannot listen on 127.0.0.1:{port}: ")
    assert "in use" in message.lower()
    assert _status(client) == {"running": False}
