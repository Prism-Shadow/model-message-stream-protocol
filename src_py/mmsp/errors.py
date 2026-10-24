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
from typing import Any

from .credentials import CLIENT_CREDENTIALS
from .types import FinishReason, UsageMetadata


def _preview_tool_call_arguments(raw: str) -> str:
    max_length = 160
    if len(raw) <= max_length:
        return raw

    edge_length = 72
    return f"{raw[:edge_length]}...[truncated]...{raw[-edge_length:]}"


class MMSPError(ValueError):
    """Base class for errors raised by MMSP clients."""


class UnsupportedParameterError(MMSPError):
    """Raised when a UniConfig parameter value is not supported by the target model client.

    Thinking levels never raise this by design: every client maps each ThinkingLevel from
    a fixed table, and a level the model lacks runs at another level it accepts. Parameters
    such as temperature and tool_choice may reject unsupported values with this error.
    """

    def __init__(self, client: str, parameter: str, message: str) -> None:
        self.client = client
        self.parameter = parameter
        super().__init__(message)


class ApiKeyRequiredError(MMSPError):
    """Raised at construction when a client has no key it may use.

    Either the client is given a base URL without a key and the environment's key may not go there
    (only the client's default endpoint and the endpoint `base_url_env` names take `api_key_env`, see
    environment_credential in `credentials`), or, with `base_url` None, the client cannot call its
    endpoint without a key and is given none, neither passed nor in `api_key_env`.
    """

    def __init__(self, client: str, client_type: str, base_url: str | None) -> None:
        credentials = CLIENT_CREDENTIALS[client_type]
        self.client = client
        self.client_type = client_type
        self.api_key_env = credentials.api_key_env
        self.base_url_env = credentials.base_url_env
        self.base_url = base_url
        if base_url is None:
            message = f"{self.api_key_env} is required for {client}: pass api_key or set {self.api_key_env}."
        else:
            message = (
                f"api_key is required for {client} with base_url {base_url}: "
                f"{self.api_key_env} is sent only to {credentials.default_base_url} or to the endpoint "
                f"{self.base_url_env} names. Pass api_key, or drop base_url and set {self.api_key_env}, plus "
                f"{self.base_url_env} for an endpoint other than {credentials.default_base_url}."
            )
        super().__init__(message)


class UnsupportedOperationError(MMSPError):
    """Raised when a client cannot perform an operation at all, whatever it is passed.

    Distinct from UnsupportedParameterError, which rejects a UniConfig parameter value:
    this one reports a capability the routed client does not have, such as listing models
    through an SDK client that carries no models endpoint.
    """

    def __init__(self, client: str, operation: str, message: str) -> None:
        self.client = client
        self.operation = operation
        super().__init__(message)


class EmptyResponseError(MMSPError):
    """Raised when a completed response carries no non-thinking content and no tool calls.

    Models occasionally finish a turn with thinking output only (reasoning models in
    particular); replaying such an assistant message on the next turn fails with a 400
    error, so the response is rejected as soon as the stream completes.
    """

    def __init__(self, client: str, finish_reason: str | None, usage_metadata: UsageMetadata | None = None) -> None:
        self.client = client
        self.finish_reason = finish_reason
        # the tokens the rejected response still cost, since no stop event carries them
        self.usage_metadata = usage_metadata
        super().__init__(f"{client} returned no content other than thinking (finish_reason={finish_reason!r}).")


class IncompleteStreamError(MMSPError):
    """Raised when the provider's stream ends before its usage or its finish reason arrived.

    The stream was cut short, so the request is worth retrying. It is raised in place of the stop
    event, after the items that did arrive, and carries the usage or finish reason that did, so the
    tokens can still be counted.
    """

    def __init__(
        self,
        client: str,
        missing: tuple[str, ...],
        finish_reason: FinishReason | None,
        usage_metadata: UsageMetadata | None,
    ) -> None:
        self.client = client
        self.missing = missing
        self.finish_reason = finish_reason
        self.usage_metadata = usage_metadata
        super().__init__(f"{client}'s stream ended without {' and '.join(missing)}.")


class StreamProtocolError(MMSPError):
    """Raised when a client produces a stream that breaks the streaming protocol.

    Examples are a content item that is not a delta, a second different fidelity within one
    item, a tool call whose first delta lacks its name or id, or a delta event carrying usage
    or a finish reason.

    It always reports a bug in the client rather than in the provider's output, so it is
    raised in every mode instead of being repaired into a stream that breaks the contract.
    """

    def __init__(self, client: str, message: str) -> None:
        self.client = client
        super().__init__(f"{client} broke the streaming protocol: {message}")


class ToolCallArgumentParseError(MMSPError):
    def __init__(self, client: str, tool_name: str, tool_call_id: str, raw_arguments: str, reason: str) -> None:
        self.client = client
        self.tool_name = tool_name
        self.tool_call_id = tool_call_id
        self.raw_arguments_length = len(raw_arguments)
        self.raw_arguments_preview = _preview_tool_call_arguments(raw_arguments)
        super().__init__(
            f'Invalid streamed tool call arguments from {client} for tool "{tool_name}" '
            f'(tool_call_id="{tool_call_id}", length={self.raw_arguments_length}, '
            f"preview={self.raw_arguments_preview!r}): {reason}"
        )


class UpstreamError(MMSPError):
    """Raised by the mmsp client for anything its server reported.

    A refusal before the stream (`status` is the HTTP status) or an error event inside it (`status`
    is the upstream's own when the error carries one); `error_type` is the server-side class name;
    `error` the object as sent.
    """

    def __init__(
        self,
        client: str,
        status: int | None,
        error_type: str | None,
        message: str,
        error: dict[str, Any] | None = None,
    ) -> None:
        self.client = client
        self.status = status
        self.error_type = error_type
        self.error = dict(error) if error else {}
        super().__init__(message)


class RoutingError(MMSPError):
    """Raised by AutoLLMClient when neither the client type nor the model id names a client."""

    def __init__(self, model: str, client_type: str | None, message: str) -> None:
        self.model = model
        self.client_type = client_type
        super().__init__(message)


class InvalidMessageError(MMSPError):
    """Raised when a message cannot be sent as it is.

    An item of an unknown kind, a tool result without tool_call_id, an image that is not valid base64
    or cannot be fetched, a TTS script without its speaker labels, or a message with nothing the wire
    can carry.
    """

    def __init__(
        self,
        client: str,
        message: str,
        item_type: str | None = None,
        message_index: int | None = None,
    ) -> None:
        self.client = client
        self.item_type = item_type
        self.message_index = message_index
        super().__init__(message)


class UnsupportedContentError(MMSPError):
    """Raised when a well-formed item is one the model cannot take.

    An image on a text-only model, a non-text item for embeddings or speech. Distinct from
    UnsupportedParameterError, which rejects a UniConfig value.
    """

    def __init__(self, client: str, item_type: str, message: str) -> None:
        self.client = client
        self.item_type = item_type
        super().__init__(message)


class UnknownEventError(MMSPError):
    """Raised with MMSP_DEBUG set when a client does not recognize a wire event.

    Without MMSP_DEBUG the event is skipped (MMSP-RFC-0003).
    """

    def __init__(self, client: str, event: str) -> None:
        self.client = client
        # a preview, cut as tool call arguments are: an unknown frame may carry a whole image
        self.event = _preview_tool_call_arguments(event)
        super().__init__(f"{client} does not recognize the event {self.event}")


class ProviderStreamError(MMSPError, RuntimeError):
    """Raised when a provider reports an error inside an open stream.

    Gemini Interactions' `error` event is one; the error carries the provider's code and message.
    """

    def __init__(self, client: str, code: int | str | None, message: str) -> None:
        self.client = client
        self.code = code
        super().__init__(message)


class ConcurrentCallError(MMSPError):
    """Raised when streaming_response_stateful is called while another stateful call on the same client has not ended.

    Two turns cannot be recorded in one history at once.
    """

    def __init__(self, client: str) -> None:
        self.client = client
        super().__init__(f"{client} has a stateful call in flight; wait for its stop event or its error.")


def parse_tool_call_arguments(
    raw_arguments: str | None,
    client: str,
    tool_name: str,
    tool_call_id: str,
) -> dict[str, Any]:
    raw = raw_arguments or "{}"
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError) as exc:
        raise ToolCallArgumentParseError(client, tool_name, tool_call_id, raw, str(exc)) from exc

    if not isinstance(parsed, dict):
        raise ToolCallArgumentParseError(client, tool_name, tool_call_id, raw, "Expected a JSON object.")

    return parsed
