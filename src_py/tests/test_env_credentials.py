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
import threading
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import pytest

from mmsp import ApiKeyRequiredError, AutoLLMClient
from mmsp.credentials import (
    CLIENT_CREDENTIALS,
    COMPATIBLE_CLIENT_TYPES,
    OFFICIAL_CLIENT_TYPES,
    EnvironmentCredential,
    environment_credential,
)


# Each case builds a client under a controlled environment and reads the credential its vendor
# SDK instance ends up holding; nothing here reaches the network, and the cases at the end read
# what a request to a local server actually carries. The OpenAI and Anthropic SDKs fill every
# credential they are handed as None from their own environment variables, so a client that hands
# them None sends whatever those variables hold to its own host.
_CREDENTIAL_ENV = [
    "CLIENT_TYPE",
    "OPENAI_API_KEY",
    "OPENAI_BASE_URL",
    "DEEPSEEK_API_KEY",
    "DEEPSEEK_BASE_URL",
    "ZAI_API_KEY",
    "ZAI_BASE_URL",
    "MOONSHOT_API_KEY",
    "MOONSHOT_BASE_URL",
    "MINIMAX_API_KEY",
    "MINIMAX_BASE_URL",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_BEDROCK_BASE_URL",
    "GEMINI_API_KEY",
    "GEMINI_BASE_URL",
    "GOOGLE_API_KEY",
    "GOOGLE_GEMINI_BASE_URL",
    "MMSP_API_KEY",
    "MMSP_BASE_URL",
    "VLLM_API_KEY",
    "VLLM_BASE_URL",
    "OPENAI_ORG_ID",
    "OPENAI_PROJECT_ID",
    "OPENAI_ADMIN_KEY",
    "OPENAI_WEBHOOK_SECRET",
    "OPENAI_CUSTOM_HEADERS",
    # the Python Bedrock client refuses AWS keys while this is set
    "AWS_BEARER_TOKEN_BEDROCK",
]


@pytest.fixture(autouse=True)
def _controlled_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in _CREDENTIAL_ENV:
        monkeypatch.delenv(name, raising=False)


def _routed_client_name(client: AutoLLMClient) -> str:
    return type(client._client).__name__  # noqa: SLF001


def _sdk(client: AutoLLMClient) -> Any:
    return client._client._client  # noqa: SLF001


def _anthropic_auth_headers(client: AutoLLMClient) -> dict[str, str]:
    """The headers the Anthropic SDK attaches to every request it sends."""
    return {name.lower(): value for name, value in _sdk(client).auth_headers.items()}


@dataclass
class VendorCase:
    expected_client: str
    model: str
    key_env: str


# The vendor clients built on the OpenAI SDK: each reads its own variable and nothing else.
VENDOR_CASES = [
    VendorCase(expected_client="DeepSeekOfficialClient", model="deepseek-v4-flash", key_env="DEEPSEEK_API_KEY"),
    VendorCase(expected_client="ZAIOfficialClient", model="glm-5.3", key_env="ZAI_API_KEY"),
    VendorCase(expected_client="MoonshotOfficialClient", model="kimi-k3", key_env="MOONSHOT_API_KEY"),
    VendorCase(expected_client="MiniMaxOfficialClient", model="MiniMax-M3", key_env="MINIMAX_API_KEY"),
]
VENDOR_IDS = [case.expected_client for case in VENDOR_CASES]


def _missing_key_message(case: VendorCase) -> str:
    return re.escape(f"{case.key_env} is required for {case.expected_client}: pass api_key or set {case.key_env}.")


@pytest.mark.parametrize("case", VENDOR_CASES, ids=VENDOR_IDS)
def test_vendor_client_refuses_to_build_on_openai_api_key_alone(case: VendorCase, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-openai-PROBE")

    with pytest.raises(ApiKeyRequiredError, match=_missing_key_message(case)):
        AutoLLMClient(model=case.model)


@pytest.mark.parametrize("case", VENDOR_CASES, ids=VENDOR_IDS)
def test_vendor_client_without_any_key_names_its_own_variable(case: VendorCase):
    with pytest.raises(ApiKeyRequiredError, match=_missing_key_message(case)) as exc_info:
        AutoLLMClient(model=case.model)

    assert isinstance(exc_info.value, ValueError)
    assert (exc_info.value.client, exc_info.value.api_key_env, exc_info.value.base_url) == (
        case.expected_client,
        case.key_env,
        None,
    )


@pytest.mark.parametrize("case", VENDOR_CASES, ids=VENDOR_IDS)
def test_vendor_client_uses_its_own_variable_not_openai_api_key(case: VendorCase, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-openai-PROBE")
    monkeypatch.setenv(case.key_env, "sk-vendor-PROBE")

    client = AutoLLMClient(model=case.model)

    assert _routed_client_name(client) == case.expected_client
    assert _sdk(client).api_key == "sk-vendor-PROBE"


@pytest.mark.parametrize("case", VENDOR_CASES, ids=VENDOR_IDS)
def test_vendor_client_uses_an_explicit_key_over_both_variables(case: VendorCase, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-openai-PROBE")
    monkeypatch.setenv(case.key_env, "sk-vendor-PROBE")

    client = AutoLLMClient(model=case.model, api_key="sk-explicit-PROBE")

    assert _sdk(client).api_key == "sk-explicit-PROBE"


def _google_credential(client: AutoLLMClient) -> tuple[str | None, str | None]:
    api_client = _sdk(client)._api_client  # noqa: SLF001
    return api_client.api_key, api_client._http_options.base_url  # noqa: SLF001


def _openai_held(client: AutoLLMClient) -> tuple[str | None, str]:
    return _sdk(client).api_key, str(_sdk(client).base_url)


def _anthropic_held(client: AutoLLMClient) -> tuple[str | None, str]:
    return _anthropic_auth_headers(client).get("x-api-key"), str(_sdk(client).base_url)


def _google_held(client: AutoLLMClient) -> tuple[str | None, str]:
    api_key, base_url = _google_credential(client)
    return api_key, str(base_url)


def _mmsp_held(client: AutoLLMClient) -> tuple[str | None, str]:
    authorization = _sdk(client).headers.get("authorization")
    return authorization.removeprefix("Bearer ") if authorization else None, str(_sdk(client).base_url)


@dataclass
class ClientCase:
    model: str
    # what the built client holds: the key its SDK sends and the endpoint it calls
    held: Callable[[AutoLLMClient], tuple[str | None, str]]


# One case per client type: a model it serves and how to read back what its SDK holds.
CLIENT_CASES = {
    "openai-official": ClientCase("gpt-6-astra", _openai_held),
    "anthropic-official": ClientCase("claude-sonnet-5", _anthropic_held),
    "google-official": ClientCase("gemini-3.8-flash", _google_held),
    "zai-official": ClientCase("glm-5.3", _openai_held),
    "moonshot-official": ClientCase("kimi-k3", _openai_held),
    "deepseek-official": ClientCase("deepseek-v4-flash", _openai_held),
    "minimax-official": ClientCase("MiniMax-M3", _openai_held),
    "openai-responses": ClientCase("gpt-5.6", _openai_held),
    "openai-chat": ClientCase("gpt-5.6", _openai_held),
    "openai-chat-vllm-adapter": ClientCase("Qwen/Qwen3.6-35B-A3B", _openai_held),
    "openai-embedding": ClientCase("text-embedding-3-large", _openai_held),
    "ant-messages": ClientCase("claude-sonnet-5", _anthropic_held),
    "google-genai": ClientCase("gemini-3.8-flash", _google_held),
    "mmsp": ClientCase("gpt-5.5", _mmsp_held),
}
CLIENT_TYPES = list(CLIENT_CREDENTIALS)
REFUSING_CLIENT_TYPES = [name for name, credentials in CLIENT_CREDENTIALS.items() if not credentials.open_server]

_OTHER_BASE_URL = "https://gateway.example/v1"
_ENV_BASE_URL = "https://env.example/v1"


def _endpoint(url: str) -> str:
    """An endpoint as the rule compares it: the host's case and trailing slashes ignored."""
    return url.lower().rstrip("/")


def _respelled(url: str) -> str:
    """The same endpoint spelled otherwise: the host in capitals, with a trailing slash."""
    respelled = re.sub(r"^([a-z]+://)([^/]+)", lambda match: match.group(1) + match.group(2).upper(), url)
    return respelled if respelled.endswith("/") else f"{respelled}/"


def _held(client_type: str, **options: str) -> tuple[str | None, str]:
    case = CLIENT_CASES[client_type]
    api_key, base_url = case.held(AutoLLMClient(model=case.model, client_type=client_type, **options))
    return api_key, _endpoint(base_url)


def test_every_client_type_has_a_row_of_client_credentials_and_a_case_here():
    client_types = sorted([*OFFICIAL_CLIENT_TYPES, *COMPATIBLE_CLIENT_TYPES])

    assert sorted(CLIENT_CREDENTIALS) == client_types
    assert sorted(CLIENT_CASES) == client_types


# Each scenario reads what environment_credential says the client does, then builds the client and
# checks that it does exactly that.
@pytest.mark.parametrize("client_type", CLIENT_TYPES)
def test_a_key_passed_in_goes_to_the_base_url_passed_in(client_type: str, monkeypatch: pytest.MonkeyPatch):
    credentials = CLIENT_CREDENTIALS[client_type]
    monkeypatch.setenv(credentials.api_key_env, "sk-env-PROBE")
    monkeypatch.setenv(credentials.base_url_env, _ENV_BASE_URL)

    held = _held(client_type, api_key="sk-explicit-PROBE", base_url=_OTHER_BASE_URL)

    assert held == ("sk-explicit-PROBE", _endpoint(_OTHER_BASE_URL))


@pytest.mark.parametrize("client_type", CLIENT_TYPES)
def test_a_key_passed_in_without_a_base_url_goes_to_the_endpoint_of_its_base_url_variable(
    client_type: str, monkeypatch: pytest.MonkeyPatch
):
    credentials = CLIENT_CREDENTIALS[client_type]
    monkeypatch.setenv(credentials.api_key_env, "sk-env-PROBE")
    monkeypatch.setenv(credentials.base_url_env, _ENV_BASE_URL)

    assert _held(client_type, api_key="sk-explicit-PROBE") == ("sk-explicit-PROBE", _endpoint(_ENV_BASE_URL))


@pytest.mark.parametrize("client_type", CLIENT_TYPES)
def test_no_key_and_no_base_url_take_both_from_the_environment(client_type: str, monkeypatch: pytest.MonkeyPatch):
    credentials = CLIENT_CREDENTIALS[client_type]
    monkeypatch.setenv(credentials.api_key_env, "sk-env-PROBE")
    monkeypatch.setenv(credentials.base_url_env, _ENV_BASE_URL)

    assert environment_credential(client_type) == EnvironmentCredential(
        "env", credentials.api_key_env, credentials.base_url_env
    )
    assert _held(client_type) == ("sk-env-PROBE", _endpoint(_ENV_BASE_URL))


@pytest.mark.parametrize("client_type", CLIENT_TYPES)
def test_no_key_no_base_url_and_no_base_url_variable_send_the_environments_key_to_the_default_endpoint(
    client_type: str, monkeypatch: pytest.MonkeyPatch
):
    credentials = CLIENT_CREDENTIALS[client_type]
    monkeypatch.setenv(credentials.api_key_env, "sk-env-PROBE")

    assert _held(client_type) == ("sk-env-PROBE", _endpoint(credentials.default_base_url))


@pytest.mark.parametrize("client_type", REFUSING_CLIENT_TYPES)
def test_the_default_endpoint_spelled_otherwise_takes_the_environments_key_and_ignores_the_base_url_variable(
    client_type: str, monkeypatch: pytest.MonkeyPatch
):
    credentials = CLIENT_CREDENTIALS[client_type]
    monkeypatch.setenv(credentials.api_key_env, "sk-env-PROBE")
    monkeypatch.setenv(credentials.base_url_env, _ENV_BASE_URL)
    passed = _respelled(credentials.default_base_url)

    assert environment_credential(client_type, passed) == EnvironmentCredential("env", credentials.api_key_env, None)
    assert _held(client_type, base_url=passed) == ("sk-env-PROBE", _endpoint(credentials.default_base_url))


@pytest.mark.parametrize("client_type", REFUSING_CLIENT_TYPES)
def test_another_endpoint_passed_without_a_key_is_refused_before_any_request_naming_both_fixes(
    client_type: str, monkeypatch: pytest.MonkeyPatch
):
    credentials = CLIENT_CREDENTIALS[client_type]
    monkeypatch.setenv(credentials.api_key_env, "sk-env-PROBE")
    monkeypatch.setenv(credentials.base_url_env, _ENV_BASE_URL)
    fixes = (
        f"Pass api_key, or drop base_url and set {credentials.api_key_env}, plus {credentials.base_url_env} "
        f"for an endpoint other than {credentials.default_base_url}."
    )

    assert environment_credential(client_type, _OTHER_BASE_URL) == EnvironmentCredential(
        "required", credentials.api_key_env, credentials.base_url_env
    )
    with pytest.raises(ApiKeyRequiredError, match=re.escape(fixes)) as refusal:
        AutoLLMClient(model=CLIENT_CASES[client_type].model, client_type=client_type, base_url=_OTHER_BASE_URL)
    assert (
        refusal.value.client_type,
        refusal.value.api_key_env,
        refusal.value.base_url_env,
        refusal.value.base_url,
    ) == (client_type, credentials.api_key_env, credentials.base_url_env, _OTHER_BASE_URL)


@dataclass
class AnthropicCase:
    expected_client: str
    model: str
    client_type: str | None = None
    # ant-messages sends its key through both header conventions, claude-5 as x-api-key only
    key_as_bearer: bool = False


ANTHROPIC_CASES = [
    AnthropicCase(expected_client="AnthropicOfficialClient", model="claude-sonnet-5"),
    AnthropicCase(
        expected_client="AntMessagesClient", model="claude-sonnet-5", client_type="ant-messages", key_as_bearer=True
    ),
]
ANTHROPIC_IDS = [case.expected_client for case in ANTHROPIC_CASES]


def _key_headers(key: str, key_as_bearer: bool) -> dict[str, str]:
    return {"x-api-key": key, "authorization": f"Bearer {key}"} if key_as_bearer else {"x-api-key": key}


@pytest.mark.parametrize("case", ANTHROPIC_CASES, ids=ANTHROPIC_IDS)
def test_anthropic_client_sends_a_configured_key_without_anthropic_auth_token(
    case: AnthropicCase, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "tok-env-PROBE")

    client = AutoLLMClient(
        model=case.model,
        client_type=case.client_type,
        api_key="sk-row-KEY",
        base_url="https://proxy.example/anthropic",
    )

    assert _routed_client_name(client) == case.expected_client
    assert _anthropic_auth_headers(client) == _key_headers("sk-row-KEY", case.key_as_bearer)


@pytest.mark.parametrize("case", ANTHROPIC_CASES, ids=ANTHROPIC_IDS)
def test_anthropic_client_reads_anthropic_api_key_and_base_url_but_not_auth_token(
    case: AnthropicCase, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-PROBE")
    monkeypatch.setenv("ANTHROPIC_BASE_URL", "https://gateway.example/anthropic/")
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "tok-env-PROBE")

    client = AutoLLMClient(model=case.model, client_type=case.client_type)

    assert str(_sdk(client).base_url) == "https://gateway.example/anthropic/"
    assert _anthropic_auth_headers(client) == _key_headers("sk-ant-PROBE", case.key_as_bearer)


@pytest.mark.parametrize("case", ANTHROPIC_CASES, ids=ANTHROPIC_IDS)
def test_anthropic_client_without_a_key_does_not_send_anthropic_auth_token(
    case: AnthropicCase, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "tok-env-PROBE")

    client = AutoLLMClient(model=case.model, client_type=case.client_type)

    assert _anthropic_auth_headers(client) == {}


def test_claude5_client_on_bedrock_sends_no_anthropic_credential_to_aws(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-PROBE")
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "tok-env-PROBE")

    client = AutoLLMClient(
        model="claude-sonnet-5", api_key="AKIAEXAMPLE,secret-EXAMPLE", base_url="bedrock://us-east-1"
    )

    assert type(_sdk(client)).__name__ == "AsyncAnthropicBedrock"
    assert _anthropic_auth_headers(client) == {}


# The mmsp client, which MMSP_API_KEY and MMSP_BASE_URL belong to; it holds an httpx client of its own.
def test_mmsp_client_with_a_base_url_and_no_key_sends_no_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("MMSP_API_KEY", "mm-env-PROBE")

    # an open server needs no key, and MMSP_API_KEY is not sent to another endpoint
    client = AutoLLMClient(model="gpt-5.5", client_type="mmsp", base_url="https://gateway.example/mmsp")

    assert environment_credential("mmsp", "https://gateway.example/mmsp") == EnvironmentCredential("keyless")
    assert "authorization" not in _sdk(client).headers
    assert str(_sdk(client).base_url) == "https://gateway.example/mmsp/"


def test_mmsp_client_with_the_default_endpoint_and_no_key_sends_no_key_either(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("MMSP_API_KEY", "mm-env-PROBE")

    client = AutoLLMClient(model="gpt-5.5", client_type="mmsp", base_url="http://127.0.0.1:25752/v1")

    assert environment_credential("mmsp", "http://127.0.0.1:25752/v1") == EnvironmentCredential("keyless")
    assert "authorization" not in _sdk(client).headers


def test_mmsp_client_without_a_key_or_a_base_url_sends_no_key_to_the_local_server():
    client = AutoLLMClient(model="gpt-5.5", client_type="mmsp")

    assert "authorization" not in _sdk(client).headers
    assert str(_sdk(client).base_url) == "http://127.0.0.1:25752/v1/"


# The vLLM adapter, which VLLM_API_KEY and VLLM_BASE_URL belong to. vLLM serves without a key unless
# it is started with one, so the adapter calls its server keyless when it has none, with the
# placeholder EMPTY because the OpenAI SDK sends a key with every request.
_VLLM_MODEL = "Qwen/Qwen3.6-35B-A3B"
_VLLM = "openai-chat-vllm-adapter"


@pytest.fixture
def _openai_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-openai-PROBE")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://openai-env.example/v1")


@pytest.mark.usefixtures("_openai_env")
def test_vllm_adapter_without_a_key_or_a_base_url_calls_the_local_server_keyless_and_reads_nothing_of_openais():
    client = AutoLLMClient(model=_VLLM_MODEL, client_type=_VLLM)

    assert environment_credential(_VLLM) == EnvironmentCredential("env", "VLLM_API_KEY", "VLLM_BASE_URL")
    assert _openai_held(client) == ("EMPTY", "http://127.0.0.1:8000/v1/")


@pytest.mark.usefixtures("_openai_env")
def test_vllm_adapter_with_vllm_api_key_set_and_no_base_url_sends_it_to_the_local_server(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setenv("VLLM_API_KEY", "vllm-env-PROBE")

    client = AutoLLMClient(model=_VLLM_MODEL, client_type=_VLLM)

    assert _openai_held(client) == ("vllm-env-PROBE", "http://127.0.0.1:8000/v1/")


# VLLM_API_KEY is not sent to an endpoint named in code, the default one included
@pytest.mark.usefixtures("_openai_env")
@pytest.mark.parametrize("base_url", ["https://gpu-box.example/v1", "http://127.0.0.1:8000/v1"])
def test_vllm_adapter_with_a_base_url_and_no_key_calls_it_keyless_rather_than_refusing(
    base_url: str, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("VLLM_API_KEY", "vllm-env-PROBE")

    client = AutoLLMClient(model=_VLLM_MODEL, client_type=_VLLM, base_url=base_url)

    assert environment_credential(_VLLM, base_url) == EnvironmentCredential("keyless")
    assert _openai_held(client) == ("EMPTY", f"{base_url}/")


class _AuthorizationRecorder(BaseHTTPRequestHandler):
    """Records the Authorization header of a model listing and answers it in OpenAI's shape."""

    authorization: str | None = None

    def do_GET(self) -> None:  # noqa: N802 - the name is BaseHTTPRequestHandler's
        type(self).authorization = self.headers.get("Authorization")
        body = json.dumps({"object": "list", "data": [{"id": _VLLM_MODEL}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args: object) -> None:
        """Keep the request log out of the test output."""


@pytest.fixture
def vllm_server() -> Iterator[str]:
    _AuthorizationRecorder.authorization = None
    server = ThreadingHTTPServer(("127.0.0.1", 0), _AuthorizationRecorder)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/v1"
    finally:
        server.shutdown()
        server.server_close()


@pytest.mark.asyncio
@pytest.mark.usefixtures("_openai_env")
async def test_vllm_adapter_sends_the_server_vllm_base_url_names_the_placeholder_not_openai_api_key(
    vllm_server: str, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("VLLM_BASE_URL", vllm_server)

    client = AutoLLMClient(model=_VLLM_MODEL, client_type=_VLLM)

    assert await client.list_models() == [_VLLM_MODEL]
    assert _AuthorizationRecorder.authorization == "Bearer EMPTY"


@pytest.mark.asyncio
@pytest.mark.usefixtures("_openai_env")
async def test_vllm_adapter_sends_the_server_vllm_base_url_names_vllm_api_key_when_it_is_set(
    vllm_server: str, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("VLLM_BASE_URL", vllm_server)
    monkeypatch.setenv("VLLM_API_KEY", "vllm-env-PROBE")

    client = AutoLLMClient(model=_VLLM_MODEL, client_type=_VLLM)

    assert await client.list_models() == [_VLLM_MODEL]
    assert _AuthorizationRecorder.authorization == "Bearer vllm-env-PROBE"


@pytest.mark.asyncio
@pytest.mark.usefixtures("_openai_env")
async def test_vllm_adapter_sends_a_base_url_passed_without_a_key_the_placeholder_not_vllm_api_key(
    vllm_server: str, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("VLLM_API_KEY", "vllm-env-PROBE")

    client = AutoLLMClient(model=_VLLM_MODEL, client_type=_VLLM, base_url=vllm_server)

    assert await client.list_models() == [_VLLM_MODEL]
    assert _AuthorizationRecorder.authorization == "Bearer EMPTY"


# The rest of OpenAI's environment: the OpenAI SDK fills the organization, the project, the admin key
# and the webhook secret it is handed as None from OPENAI_ORG_ID, OPENAI_PROJECT_ID, OPENAI_ADMIN_KEY
# and OPENAI_WEBHOOK_SECRET, and adds every header OPENAI_CUSTOM_HEADERS lists. Like the key, it goes
# only to the endpoint the environment's key goes to.
class _HeaderRecorder(BaseHTTPRequestHandler):
    """Records the headers of a model listing and answers it in OpenAI's shape."""

    headers_received: dict[str, str] | None = None

    def do_GET(self) -> None:  # noqa: N802 - the name is BaseHTTPRequestHandler's
        type(self).headers_received = {name.lower(): value for name, value in self.headers.items()}
        body = json.dumps({"object": "list", "data": [{"id": "m1"}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args: object) -> None:
        """Keep the request log out of the test output."""


@pytest.fixture
def header_server(monkeypatch: pytest.MonkeyPatch) -> Iterator[str]:
    _HeaderRecorder.headers_received = None
    monkeypatch.setenv("OPENAI_ORG_ID", "org-env-PROBE")
    monkeypatch.setenv("OPENAI_PROJECT_ID", "proj-env-PROBE")
    monkeypatch.setenv("OPENAI_ADMIN_KEY", "admin-env-PROBE")
    monkeypatch.setenv("OPENAI_WEBHOOK_SECRET", "whsec-env-PROBE")
    server = ThreadingHTTPServer(("127.0.0.1", 0), _HeaderRecorder)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/v1"
    finally:
        server.shutdown()
        server.server_close()


async def _sent(client: AutoLLMClient) -> dict[str, str | None]:
    """What reached the server of OpenAI's environment, and the key that came with it."""
    await client.list_models()
    headers = _HeaderRecorder.headers_received
    assert headers is not None
    return {
        "authorization": headers.get("authorization"),
        "organization": headers.get("openai-organization"),
        "project": headers.get("openai-project"),
        "custom": headers.get("x-env-probe"),
    }


def _none_of_it(authorization: str) -> dict[str, str | None]:
    return {"authorization": authorization, "organization": None, "project": None, "custom": None}


# Every client built on the OpenAI SDK, at an endpoint that is not OpenAI's default one.
@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("client_type", "model"),
    [
        ("openai-official", "gpt-6-astra"),
        ("openai-responses", "gpt-5.6"),
        ("openai-chat", "gpt-5.6"),
        ("openai-embedding", "text-embedding-3-large"),
        ("deepseek-official", "deepseek-v4-flash"),
        ("zai-official", "glm-5.3"),
        ("moonshot-official", "kimi-k3"),
        ("minimax-official", "MiniMax-M3"),
    ],
)
async def test_an_openai_sdk_client_at_another_endpoint_sends_none_of_openais_environment(
    client_type: str, model: str, header_server: str, monkeypatch: pytest.MonkeyPatch
):
    # an Authorization header in OPENAI_CUSTOM_HEADERS does not replace the client's key either
    monkeypatch.setenv("OPENAI_CUSTOM_HEADERS", "X-Env-Probe: from-env\nAuthorization: Bearer env-auth-PROBE")

    client = AutoLLMClient(model=model, client_type=client_type, api_key="sk-explicit-PROBE", base_url=header_server)

    assert await _sent(client) == _none_of_it("Bearer sk-explicit-PROBE")


@pytest.mark.asyncio
async def test_the_vllm_adapter_calls_its_server_keyless_with_none_of_openais_environment(
    header_server: str, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("OPENAI_CUSTOM_HEADERS", "X-Env-Probe: from-env")

    client = AutoLLMClient(model=_VLLM_MODEL, client_type=_VLLM, base_url=header_server)

    assert await _sent(client) == _none_of_it("Bearer EMPTY")


@pytest.mark.asyncio
async def test_another_vendors_client_at_the_endpoint_its_own_variable_names_sends_none_of_openais_environment(
    header_server: str, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("OPENAI_CUSTOM_HEADERS", "X-Env-Probe: from-env")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-deepseek-PROBE")
    monkeypatch.setenv("DEEPSEEK_BASE_URL", header_server)

    client = AutoLLMClient(model="deepseek-v4-flash")

    assert await _sent(client) == _none_of_it("Bearer sk-deepseek-PROBE")


@pytest.mark.asyncio
async def test_an_openai_client_at_the_endpoint_openais_environment_names_still_sends_all_of_it(
    header_server: str, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("OPENAI_CUSTOM_HEADERS", "X-Env-Probe: from-env")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-env-PROBE")
    monkeypatch.setenv("OPENAI_BASE_URL", header_server)

    client = AutoLLMClient(model="gpt-5.6", client_type="openai-chat")

    assert await _sent(client) == {
        "authorization": "Bearer sk-env-PROBE",
        "organization": "org-env-PROBE",
        "project": "proj-env-PROBE",
        "custom": "from-env",
    }
