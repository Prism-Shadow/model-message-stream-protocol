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
import threading
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import anthropic
import pytest

from mmsp import AutoLLMClient


@dataclass
class BodyCase:
    name: str
    client_type: str
    model: str
    # None is the local server itself; a bedrock:// URL reaches it through ANTHROPIC_BEDROCK_BASE_URL
    base_url: str | None
    api_key: str
    config: dict[str, Any]
    # a None value means the body carries no such field
    expected: dict[str, Any]
    # fields the client leaves to the SDK, whose default for them differs between SDK versions
    unpinned: list[str] = field(default_factory=list)


# The SDK lines disagree on what reaches the request body: 1.0 dropped temperature from
# messages.create, and 2.0 moved Bedrock's default anthropic_version to the new API version.
BODY_CASES = [
    BodyCase(
        name="ant-messages-temperature",
        client_type="ant-messages",
        model="claude-sonnet-5",
        base_url=None,
        api_key="test-key",
        config={"temperature": 0.5},
        expected={"temperature": 0.5},
    ),
    BodyCase(
        name="ant-messages-default",
        client_type="ant-messages",
        model="claude-sonnet-5",
        base_url=None,
        api_key="test-key",
        config={},
        expected={"temperature": None},
    ),
    BodyCase(
        name="anthropic-official-api",
        client_type="anthropic-official",
        model="claude-sonnet-4-6",
        base_url=None,
        api_key="test-key",
        config={},
        expected={"anthropic_version": None},
    ),
    BodyCase(
        name="anthropic-official-bedrock-legacy-version",
        client_type="anthropic-official",
        model="global.anthropic.claude-sonnet-4-6",
        base_url="bedrock://us-east-1",
        api_key="AKIAEXAMPLE,secret-EXAMPLE",
        config={},
        expected={"anthropic_version": "bedrock-2023-05-31"},
    ),
    BodyCase(
        name="anthropic-official-bedrock-sdk-version",
        client_type="anthropic-official",
        model="global.anthropic.claude-opus-5-5",
        base_url="bedrock://us-east-1",
        api_key="AKIAEXAMPLE,secret-EXAMPLE",
        config={},
        expected={},
        unpinned=["anthropic_version"],
    ),
]


class _BodyHandler(BaseHTTPRequestHandler):
    """Records the JSON body of a request and refuses it, so no stream has to be parsed."""

    received_body: dict[str, Any] = {}

    def do_POST(self) -> None:  # noqa: N802 - the name is BaseHTTPRequestHandler's
        length = int(self.headers.get("Content-Length", "0"))
        type(self).received_body = json.loads(self.rfile.read(length) or b"{}")
        body = json.dumps({"type": "error", "error": {"type": "invalid_request_error", "message": "recorded"}})
        self.send_response(400)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body.encode())

    def log_message(self, *args: object) -> None:
        """Keep the request log out of the test output."""


@pytest.fixture
def body_server(monkeypatch: pytest.MonkeyPatch):
    for name in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL", "AWS_BEARER_TOKEN_BEDROCK"):
        monkeypatch.delenv(name, raising=False)
    server = ThreadingHTTPServer(("127.0.0.1", 0), _BodyHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_address[1]}"
    monkeypatch.setenv("ANTHROPIC_BEDROCK_BASE_URL", url)
    try:
        yield url
    finally:
        server.shutdown()
        server.server_close()


@pytest.mark.asyncio
@pytest.mark.parametrize("case", BODY_CASES, ids=[case.name for case in BODY_CASES])
async def test_request_body_on_every_sdk_version(case: BodyCase, body_server: str):
    _BodyHandler.received_body = {}
    client = AutoLLMClient(
        model=case.model, api_key=case.api_key, base_url=case.base_url or body_server, client_type=case.client_type
    )
    messages = [{"role": "user", "content_items": [{"type": "text.done", "text": "Hi"}]}]

    with pytest.raises(anthropic.BadRequestError):
        async for _ in client.streaming_response(messages=messages, config=case.config):
            pass

    body = _BodyHandler.received_body
    assert body["messages"]
    assert {name: body.get(name) for name in case.expected} == case.expected
    model_config = client._client.transform_uni_config_to_model_config(case.config)  # noqa: SLF001
    for name in case.unpinned:
        assert name not in model_config and name not in model_config.get("extra_body", {})
