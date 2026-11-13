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

"""The web tool clients against a local server: what each request carries and what its answer becomes."""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Iterator

import pytest
from stream_grammar import assert_stream_grammar

from mmsp import AutoLLMClient, UnsupportedContentError, UnsupportedOperationError, UnsupportedParameterError


# Answers in the shape the live endpoints returned them (api_captures/webtool/), trimmed to one page.
_ANSWERS: dict[str, Any] = {
    "/v1/tools/search": {
        "results": [
            {
                "rerank_score": 2.4,
                "title": "DeepSeek V4",
                "url": "https://example.com/v4",
                "snippet": "A short snippet.",
                "summary": "The long summary.",
                "content": "",
                "site_name": None,
                "site_icon": None,
                "date": None,
                "authority": 3,
            }
        ]
    },
    "/v1/tools/fetch": {"title": "Example Domain", "content": "# Example Domain"},
    "/search": {
        "code": 200,
        "status": 20000,
        "data": [
            {
                "title": "Jina",
                "url": "https://jina.ai/",
                "description": "A description.",
                "content": "",
                "usage": {"tokens": 10000},
            }
        ],
        "meta": {"usage": {"tokens": 10000}},
    },
    "/": {
        "code": 200,
        "status": 20000,
        "data": {
            "title": "Example Domain",
            "description": "",
            "url": "https://example.com/",
            "content": "This domain is for use in examples.",
            "usage": {"tokens": 28},
        },
        "meta": {"usage": {"tokens": 28}},
    },
}


class _ToolServer(BaseHTTPRequestHandler):
    """Records every request and answers it as the endpoint of its path does."""

    requests: list[dict[str, Any]] = []

    def do_POST(self) -> None:  # noqa: N802 - the name is BaseHTTPRequestHandler's
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        type(self).requests.append(
            {"path": self.path, "headers": {name.lower(): value for name, value in self.headers.items()}, "body": body}
        )
        answer = json.dumps(_ANSWERS[self.path]).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(answer)))
        self.end_headers()
        self.wfile.write(answer)

    def log_message(self, *args: object) -> None:
        """Keep the request log out of the test output."""


@pytest.fixture
def tool_server() -> Iterator[str]:
    _ToolServer.requests = []
    server = ThreadingHTTPServer(("127.0.0.1", 0), _ToolServer)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()


def _text(text: str) -> dict[str, Any]:
    return {"role": "user", "content_items": [{"type": "text.done", "text": text}]}


async def _run(model: str, base_url: str, messages: list[dict[str, Any]], config: dict[str, Any]) -> list[Any]:
    client = AutoLLMClient(model=model, api_key="sk-PROBE", base_url=base_url)
    events = [event async for event in client.streaming_response(messages=messages, config=config)]
    assert_stream_grammar(events)
    return events


def _webdata(events: list[Any]) -> list[list[dict[str, str]]]:
    return [item["webdata"] for event in events for item in event["content_items"] if item["type"] == "webtool.done"]


@pytest.mark.asyncio
async def test_deepseek_search_sends_one_request_per_message_and_reads_each_results_summary(tool_server: str):
    events = await _run(
        "deepseek-search", tool_server, [_text("DeepSeek V4"), _text("MMSP")], {"webtool_config": {"count": 3}}
    )

    assert [(request["path"], request["body"]) for request in _ToolServer.requests] == [
        ("/v1/tools/search", {"query": "DeepSeek V4", "count": 3}),
        ("/v1/tools/search", {"query": "MMSP", "count": 3}),
    ]
    assert _ToolServer.requests[0]["headers"]["authorization"] == "Bearer sk-PROBE"
    page = {"title": "DeepSeek V4", "content": "The long summary.", "url": "https://example.com/v4"}
    assert _webdata(events) == [[page], [page]]
    # DeepSeek bills each request
    assert events[-1]["usage_metadata"]["prompt_tokens"] == 2
    assert events[-1]["finish_reason"] == "stop"


@pytest.mark.asyncio
async def test_deepseek_fetch_sends_the_url_alone_and_the_page_takes_the_url_sent(tool_server: str):
    events = await _run(
        "deepseek-fetch", tool_server, [_text("https://example.com")], {"webtool_config": {"count": 3}}
    )

    assert [(request["path"], request["body"]) for request in _ToolServer.requests] == [
        ("/v1/tools/fetch", {"url": "https://example.com"})
    ]
    assert _webdata(events) == [
        [{"title": "Example Domain", "content": "# Example Domain", "url": "https://example.com"}]
    ]
    assert events[-1]["usage_metadata"]["prompt_tokens"] == 1


@pytest.mark.asyncio
async def test_jina_search_asks_for_the_descriptions_only_and_counts_the_tokens_jina_bills(tool_server: str):
    events = await _run("jina-search", tool_server, [_text("Jina"), _text("Reader")], {"webtool_config": {"count": 5}})

    assert [(request["path"], request["body"]) for request in _ToolServer.requests] == [
        ("/search", {"q": "Jina", "num": 5}),
        ("/search", {"q": "Reader", "num": 5}),
    ]
    headers = _ToolServer.requests[0]["headers"]
    assert (headers["x-respond-with"], headers["accept"]) == ("no-content", "application/json")
    page = {"title": "Jina", "content": "A description.", "url": "https://jina.ai/"}
    assert _webdata(events) == [[page], [page]]
    assert events[-1]["usage_metadata"]["prompt_tokens"] == 20000


@pytest.mark.asyncio
async def test_jina_fetch_reads_the_page_with_its_body(tool_server: str):
    events = await _run("jina-fetch", tool_server, [_text("https://example.com")], {})

    assert [(request["path"], request["body"]) for request in _ToolServer.requests] == [
        ("/", {"url": "https://example.com"})
    ]
    assert "x-respond-with" not in _ToolServer.requests[0]["headers"]
    assert _webdata(events) == [
        [{"title": "Example Domain", "content": "This domain is for use in examples.", "url": "https://example.com/"}]
    ]
    assert events[-1]["usage_metadata"]["prompt_tokens"] == 28


@pytest.mark.parametrize("model", ["deepseek-search", "jina-fetch"])
@pytest.mark.asyncio
async def test_a_web_tool_refuses_what_it_cannot_send_before_any_request(model: str, tool_server: str):
    client = AutoLLMClient(model=model, api_key="sk-PROBE", base_url=tool_server)
    image = {"role": "user", "content_items": [{"type": "image_url.done", "image_url": "https://example.com/a.png"}]}

    with pytest.raises(UnsupportedContentError):
        [event async for event in client.streaming_response(messages=[image], config={})]
    with pytest.raises(UnsupportedParameterError):
        [event async for event in client.streaming_response(messages=[_text("x")], config={"fast_mode": True})]
    with pytest.raises(UnsupportedOperationError):
        await client.list_models()
    assert _ToolServer.requests == []


@pytest.mark.parametrize("client_type", ["deepseek-webtool", "jina-webtool"])
def test_a_web_tool_refuses_an_id_that_names_neither_a_search_nor_a_fetch(client_type: str):
    with pytest.raises(UnsupportedOperationError):
        AutoLLMClient(model="web-reader", client_type=client_type, api_key="sk-PROBE")
