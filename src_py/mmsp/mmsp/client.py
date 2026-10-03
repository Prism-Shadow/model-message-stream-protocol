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
from typing import Any, AsyncIterator

import httpx

from ..abort_signal import AbortSignal, run_with_abort
from ..base_client import LLMClient
from ..errors import UpstreamError
from ..types import UniConfig, UniEvent, UniMessage
from ..utils import resolve_credentials
from ..wire import DEFAULT_BASE_URL, MODELS_ROUTE, STREAM_ROUTE, decode_wire, encode_wire


async def _sse_data(lines: AsyncIterator[str]) -> AsyncIterator[str]:
    """The data of each server-sent event.

    The `data:` lines of a block are joined with newlines and dispatched at the blank line that ends
    the block; other lines (comments, other fields) are ignored.
    """
    data: list[str] = []
    async for line in lines:
        line = line.rstrip("\r")
        if line == "":
            if data:
                yield "\n".join(data)
                data = []
        elif line.startswith("data:"):
            data.append(line[5:].removeprefix(" "))
    if data:
        yield "\n".join(data)


def _error_payload(body: bytes, status: int) -> dict[str, Any]:
    """The error object of a response the server refused, or one made of its status and text."""
    try:
        payload = json.loads(body)
    except ValueError:
        payload = None
    if isinstance(payload, dict) and isinstance(payload.get("error"), dict):
        return payload["error"]
    return {"type": "HTTPError", "message": f"HTTP {status}: {body.decode('utf-8', errors='replace')[:200]}"}


def _upstream_error(error: dict[str, Any], status: int | None) -> UpstreamError:
    """The UpstreamError an error the server reported is raised as: a refusal's status, else the error's own."""
    return UpstreamError(
        "MmspClient",
        status if status is not None else error.get("status"),
        error.get("type"),
        error.get("message") or error.get("type") or "unknown error",
        error,
    )


class MmspClient(LLMClient):
    """A client of an MMSP server: what `curl -N` shows on /v1/stream is what it yields, bytes decoded."""

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        base_url: str | None = None,
        default_headers: dict[str, str] | None = None,
    ):
        """
        Initialize MMSP client with model, API key, and base URL.

        The default endpoint is http://127.0.0.1:25752/v1; a base URL passed in or read from MMSP_BASE_URL
        ends with /v1 too, as OpenAI's and vLLM's do.
        """
        self._model = model
        api_key, base_url = resolve_credentials(
            self.__class__.__name__, api_key, base_url, "MMSP_API_KEY", "MMSP_BASE_URL"
        )
        headers = dict(default_headers or {})
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        self._client = httpx.AsyncClient(
            base_url=base_url or DEFAULT_BASE_URL,
            headers=headers,
            # a stream is open-ended between events, for as long as the model thinks, so no read timeout
            timeout=httpx.Timeout(connect=30.0, read=None, write=30.0, pool=30.0),
        )
        self._history: list[UniMessage] = []

    def transform_uni_config_to_model_config(self, config: UniConfig) -> dict[str, Any]:
        """
        Transform universal configuration to the request config of an MMSP server.

        Args:
            config: Universal configuration dict

        Returns:
            The same configuration, which the server hands to the model's upstream client
        """
        return dict(config)

    def transform_uni_message_to_model_input(self, messages: list[UniMessage]) -> list[dict[str, Any]]:
        """
        Transform universal messages to the messages of an MMSP server request.

        Args:
            messages: List of universal message dictionaries

        Returns:
            The same messages, with their bytes as base64 text
        """
        return [encode_wire(message) for message in messages]

    def transform_model_output_to_uni_event(self, model_output: dict[str, Any]) -> UniEvent:
        """
        Transform one event of the server's stream into a universal event.

        The event is the server's public stream event as sent, deltas and done items alike; only the
        data of its inline items is decoded from base64 back to bytes.

        Args:
            model_output: One event of the server's stream, parsed from JSON

        Returns:
            Universal event dictionary
        """
        return decode_wire(model_output)

    async def _streaming_response_internal(
        self,
        messages: list[UniMessage],
        config: UniConfig,
    ) -> AsyncIterator[UniEvent]:
        """One request; the server's events as they arrive, an error it reports raised as UpstreamError."""
        body = {
            "model": self._model,
            "messages": self.transform_uni_message_to_model_input(messages),
            "config": self.transform_uni_config_to_model_config(config),
        }
        # httpx's json= would escape CJK text
        content = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers = {"Content-Type": "application/json", "Accept": "text/event-stream"}
        async with self._client.stream("POST", STREAM_ROUTE, content=content, headers=headers) as response:
            if response.status_code != 200:
                raise _upstream_error(
                    _error_payload(await response.aread(), response.status_code), response.status_code
                )

            async for data in _sse_data(response.aiter_lines()):
                if data == "[DONE]":
                    return

                wire = json.loads(data)
                if "error" in wire:
                    raise _upstream_error(wire["error"], None)

                yield self.transform_model_output_to_uni_event(wire)

    async def streaming_response(
        self,
        messages: list[UniMessage],
        config: UniConfig,
        signal: AbortSignal | None = None,
    ) -> AsyncIterator[UniEvent]:
        """
        The server's public stream, forwarded; `signal` ends it between events or mid-read.

        The server's upstream client already closed the items, stamped the events and saved any trace,
        so nothing is rebuilt here.

        Args:
            messages: List of universal message dictionaries containing conversation history
            config: Universal configuration dict
            signal: Optional abort signal used to cancel the active request

        Yields:
            The events of the server's public stream, in order
        """
        if signal is not None:
            signal.throw_if_aborted()
        stream = self._streaming_response_internal(messages, config)
        try:
            while True:
                try:
                    # StopAsyncIteration crosses run_with_abort's task intact: only StopIteration is barred
                    event = await (anext(stream) if signal is None else run_with_abort(anext(stream), signal))
                except StopAsyncIteration:
                    break
                yield event
        finally:
            await stream.aclose()

    async def list_models(self) -> list[str]:
        """
        The model ids the server's table names, read from its OpenAI-shaped listing.

        Returns:
            list[str]: The model ids, in the order the server returned them.
        """
        response = await self._client.get(MODELS_ROUTE)
        if response.status_code != 200:
            raise _upstream_error(_error_payload(response.content, response.status_code), response.status_code)
        return [model["id"] for model in response.json()["data"]]
