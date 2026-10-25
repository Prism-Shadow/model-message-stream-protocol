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

import asyncio
import copy
import time
from abc import ABC, abstractmethod
from contextlib import aclosing, suppress
from typing import Any, AsyncIterator

from .abort_signal import AbortSignal
from .errors import (
    ConcurrentCallError,
    EmptyResponseError,
    IncompleteStreamError,
    InvalidMessageError,
    StreamProtocolError,
)
from .legacy import normalize_legacy_messages
from .stream_items import StreamItems
from .types import ContentItem, FinishReason, UniConfig, UniEvent, UniMessage, UsageMetadata


def _stamp_created_at(messages: list[UniMessage]) -> None:
    """Stamp each message that has no created_at with the time it is sent, on the caller's own object."""
    for message in messages:
        if message.get("created_at") is None:
            message["created_at"] = int(time.time() * 1000)


class LLMClient(ABC):
    """
    Abstract base class for LLM clients.

    All model-specific clients must inherit from this class and implement
    the required abstract methods for complete SDK abstraction.
    """

    _model: str
    _history: list[UniMessage]
    # the stateful call that holds the history until its stop event, its end or its abort, if any
    _in_flight: dict[str, AbortSignal | None] | None = None

    @abstractmethod
    def transform_uni_config_to_model_config(self, config: UniConfig) -> Any:
        """Transform universal configuration to model-specific configuration."""

    @abstractmethod
    def transform_uni_message_to_model_input(self, messages: list[UniMessage]) -> Any:
        """
        Transform universal messages to the model's input format (Gemini's Content list, OpenAI's
        messages array).
        """

    @abstractmethod
    def transform_model_output_to_uni_event(self, model_output: Any) -> UniEvent:
        """
        Transform one event of the provider's stream into a universal event, which the base class
        turns into the public stream.

        content_items holds the deltas the wire event carries, in wire order, and never a done item:
        the base class closes an item when the next one begins or the stream ends. The deltas of one
        item are contiguous and carry the same `fidelity.item_id`, the provider's id for the item
        where it has one, which never reaches the public stream. Its event_type is "stop" on the
        wire events that report usage_metadata and/or finish_reason, in pieces the base class merges
        field by field, and "delta" otherwise; a "delta" event carries neither. It is an empty delta
        event when the wire event carries nothing universal.
        """

    def concat_uni_events_to_uni_message(self, events: list[UniEvent]) -> UniMessage:
        """
        Concatenate a stream of universal events into a single universal message.

        Args:
            events: List of universal events from streaming response

        Returns:
            Complete universal message dictionary: every done item in stream order, with the
            usage, finish reason and timestamp of the stop event
        """
        content_items: list[ContentItem] = []
        stop_event: UniEvent | None = None
        for event in events:
            if event["event_type"] == "stop":
                stop_event = event
                continue

            for item in event["content_items"]:
                if item["type"].endswith(".done"):
                    content_items.append(item)

        return {
            "role": "assistant",
            "content_items": content_items,
            "usage_metadata": stop_event["usage_metadata"] if stop_event else None,
            "finish_reason": stop_event["finish_reason"] if stop_event else None,
            "created_at": stop_event.get("created_at") if stop_event else None,
        }

    @abstractmethod
    async def _streaming_response_internal(
        self,
        messages: list[UniMessage],
        config: UniConfig,
    ) -> AsyncIterator[UniEvent]:
        """
        Internal method to handle streaming response.

        Each model client implements it to send the request and yield one universal event per event
        of the provider's stream; streaming_response turns them into the public stream.
        """

    @abstractmethod
    async def list_models(self) -> list[str]:
        """List the model ids the configured endpoint serves, in the order the endpoint returned them."""

    async def streaming_response(
        self,
        messages: list[UniMessage],
        config: UniConfig,
        signal: AbortSignal | None = None,
    ) -> AsyncIterator[UniEvent]:
        """
        Generate content in streaming mode (stateless).

        Args:
            messages: List of universal message dictionaries containing conversation history
            config: Universal configuration dict
            signal: Optional abort signal used to cancel the active request

        Yields:
            Delta events, each carrying one delta or done item, then exactly one stop event
            carrying the usage and the finish reason

        Raises:
            InvalidMessageError: A message has no content items, before anything is sent.
            UnsupportedParameterError: The trace_id leads outside the tracer's cache directory, before
                anything is sent.
        """
        client_name = self.__class__.__name__
        _stamp_created_at(messages)
        request_messages = normalize_legacy_messages(messages)
        for index, message in enumerate(request_messages):
            if not message["content_items"]:
                raise InvalidMessageError(
                    client_name, f"message {index} has nothing {client_name} can send", message_index=index
                )

        tracer = None
        if config.get("trace_id"):
            from .integration.tracer import Tracer

            # refused before the request, so that a trace the tracer would not save spends no tokens
            tracer = Tracer()
            tracer.resolve_trace_path(config["trace_id"], client_name)

        if signal is not None:
            signal.throw_if_aborted()

        # a client yields deltas only: every one goes out as it arrives, in an event of its own, and
        # StreamItems closes each item with its done item when the next item begins or the stream
        # ends; the usage and finish reason of the client's stop events merge into the one public stop
        stream = self._streaming_response_internal(request_messages, config)
        items = StreamItems(client_name)
        done_items: list[ContentItem] = []
        usage_metadata: UsageMetadata | None = None
        finish_reason: FinishReason | None = None

        # An abort ends the stream wherever it lands. One waiter per stream watches the signal. When
        # it fires while a read is pending, it cancels the task reading, whichever task that is;
        # otherwise the client's generator rests at a yield, so it is closed there and the provider's
        # request ends now rather than at the caller's next read. `closing` keeps the waiter off a
        # generator the finally below is already closing: a second aclose() would find it running.
        abort_task: asyncio.Task[None] | None = None
        reading_task: asyncio.Task[Any] | None = None
        close_task: asyncio.Task[None] | None = None
        closing = False
        if signal is not None:
            abort_task = asyncio.create_task(signal.wait())

            def on_abort(task: asyncio.Task[None]) -> None:
                nonlocal close_task
                if task.cancelled() or not signal.aborted or closing:
                    return

                if reading_task is None:
                    close_task = asyncio.create_task(stream.aclose())
                else:
                    reading_task.cancel(signal.reason)

            abort_task.add_done_callback(on_abort)

        try:
            while True:
                try:
                    if signal is not None:
                        # a caller may read each event in a task of its own (the MMSP server and the
                        # playground do), so the abort cancels whichever task reads now
                        reading_task = asyncio.current_task()
                        signal.throw_if_aborted()

                    event = await anext(stream)
                except StopAsyncIteration:
                    break
                except asyncio.CancelledError:
                    # re-raised from the signal, so the caller gets its reason whatever the client raised
                    if signal is not None and signal.aborted:
                        signal.throw_if_aborted()
                    raise
                finally:
                    reading_task = None

                if event["event_type"] == "delta" and (
                    event["usage_metadata"] is not None or event["finish_reason"] is not None
                ):
                    raise StreamProtocolError(client_name, "a delta event carries usage_metadata or finish_reason")

                # yielded one by one, so the deltas of an event reach the caller even when a later one fails
                for delta in event["content_items"]:
                    for item in items.delta(delta):
                        if item["type"].endswith(".done"):
                            done_items.append(item)

                        yield {
                            "role": "assistant",
                            "event_type": "delta",
                            "content_items": [item],
                            "usage_metadata": None,
                            "finish_reason": None,
                            "created_at": int(time.time() * 1000),
                        }

                if event["usage_metadata"] is not None:
                    if usage_metadata is None:
                        usage_metadata = {
                            "cached_tokens": None,
                            "prompt_tokens": None,
                            "thoughts_tokens": None,
                            "response_tokens": None,
                        }
                    for usage_field in ("cached_tokens", "prompt_tokens", "thoughts_tokens", "response_tokens"):
                        if event["usage_metadata"].get(usage_field) is not None:
                            usage_metadata[usage_field] = event["usage_metadata"][usage_field]

                if event["finish_reason"]:
                    finish_reason = event["finish_reason"]
        finally:
            closing = True
            if abort_task is not None and not abort_task.done():
                abort_task.cancel()
                with suppress(asyncio.CancelledError):
                    await abort_task
            # the abort may have scheduled the close already; a second aclose() would find the generator running
            if close_task is not None:
                await close_task
            else:
                await stream.aclose()

        # an abort that lands as the provider's stream ends is still an abort: no done items, no stop
        if signal is not None:
            signal.throw_if_aborted()

        # the item still streaming is done
        for item in items.end():
            done_items.append(item)
            yield {
                "role": "assistant",
                "event_type": "delta",
                "content_items": [item],
                "usage_metadata": None,
                "finish_reason": None,
                "created_at": int(time.time() * 1000),
            }

        missing = []
        if usage_metadata is None:
            missing.append("usage_metadata")
        if finish_reason is None:
            missing.append("finish_reason")
        if missing:
            raise IncompleteStreamError(client_name, tuple(missing), finish_reason, usage_metadata)

        # replaying a thinking-only assistant message on the next turn fails with a 400 error
        if all(item["type"] in ("thinking.done", "inline_thinking.done") for item in done_items):
            raise EmptyResponseError(client_name, finish_reason, usage_metadata)

        stop_event: UniEvent = {
            "role": "assistant",
            "event_type": "stop",
            "content_items": [],
            "usage_metadata": usage_metadata,
            "finish_reason": finish_reason,
            "created_at": int(time.time() * 1000),
        }

        # saved before the stop is yielded: a caller may stop iterating as soon as it sees it
        if tracer is not None:
            assistant_message: UniMessage = {
                "role": "assistant",
                "content_items": done_items,
                "usage_metadata": stop_event["usage_metadata"],
                "finish_reason": stop_event["finish_reason"],
                "created_at": stop_event["created_at"],
            }
            tracer.save_history(self._model, request_messages + [assistant_message], config["trace_id"], config)

        yield stop_event

    async def streaming_response_stateful(
        self,
        message: UniMessage,
        config: UniConfig,
        signal: AbortSignal | None = None,
    ) -> AsyncIterator[UniEvent]:
        """
        Generate content in streaming mode (stateful).

        Args:
            message: Latest universal message dictionary to add to conversation
            config: Universal configuration dict
            signal: Optional abort signal used to cancel the active request

        Yields:
            Universal events from the streaming response

        Raises:
            ConcurrentCallError: Another stateful call on this client has not ended.
        """
        # two calls each sending the history as it was when they began would record their turns in
        # the order they finished, the later one generated without the earlier; an aborted call
        # records nothing, so it holds the client no longer
        in_flight = self._in_flight
        if in_flight is not None and (in_flight["signal"] is None or not in_flight["signal"].aborted):
            raise ConcurrentCallError(self.__class__.__name__)

        # a fresh dict per call, so that the late close of an earlier call cannot release this one
        call: dict[str, AbortSignal | None] = {"signal": signal}
        self._in_flight = call
        try:
            [message] = normalize_legacy_messages([message])

            events: list[UniEvent] = []
            # closed with this generator, so that closing it closes the provider's request before returning
            async with aclosing(
                self.streaming_response(messages=self._history + [message], config=config, signal=signal)
            ) as stream:
                async for event in stream:
                    events.append(event)
                    if event["event_type"] == "stop":
                        # an abort that lands as the stop arrives still records nothing: a newer call may
                        # hold the client by now
                        if signal is not None:
                            signal.throw_if_aborted()

                        # recorded before the stop is yielded: a caller may stop iterating as soon as it sees
                        # it, and the turn has ended then, so the next one may begin before this generator
                        # is closed
                        self._history.append(copy.deepcopy(message))
                        self._history.append(copy.deepcopy(self.concat_uni_events_to_uni_message(events)))
                        self._in_flight = None
                    yield event
        finally:
            if self._in_flight is call:
                self._in_flight = None

    def clear_history(self) -> None:
        """Clear the message history."""
        self._history = []

    def get_history(self) -> list[UniMessage]:
        """Get a deep copy of the current message history."""
        return copy.deepcopy(self._history)

    def set_history(self, history: list[UniMessage]) -> None:
        """Replace the message history with a deep copy of the provided history.

        Args:
            history: List of universal message dictionaries to set as the new history
        """
        self._history = copy.deepcopy(normalize_legacy_messages(history))
